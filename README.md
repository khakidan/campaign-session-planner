# campaign-session-planner

A host-agnostic GM knowledge base: Sessions, Scenes, Storylines,
Threads, NPCs, Factions/Groups, Locations, Quests, Events, freeform
Notes, and a universal entity-link/backlink system between all of the
above and whatever game-specific entities the host app owns
(characters, adversaries, encounters, items, etc.).

It was originally built inside the Daggerheart GM Dashboard
(`daggerheart-gm-dashboard-multiuser`) — that repo's
`docs/markdown/campaign_session_notes_app.md` is still the fuller
design rationale (entity model, why BlockNote, the Scenes-vs-Threads-
vs-Storylines distinction, etc.) and is worth reading before extending
this package. This README covers only what changed with the extraction:
how to actually consume it from a host app.

## Architecture: this package owns none of your game data

```text
   YOUR HOST APP                          THIS PACKAGE
  ┌──────────────────────┐   TTRPGHostAdapter   ┌───────────────────────────┐
  │ Characters/Adversaries│ ───────────────────▶ │ Sessions · Scenes         │
  │ Encounters/Items/etc. │                       │ Storylines · Threads      │
  │ (your DB, your auth)  │ ◀─────────────────── │ NPCs · Groups · Locations │
  └──────────────────────┘  CampaignPlannerRepo   │ Quests · Events · Notes   │
                                                    │ EntityLinks               │
                                                    └───────────────────────────┘
```

The package never imports your ORM/DB client, never calls `fetch()`
against your API directly, and never owns routing or auth. Every piece
of I/O goes through two interfaces you implement (`src/types/index.ts`
is the source of truth for both — read it, not this README, for exact
field shapes):

- **`TTRPGHostAdapter`** — read-only lookups into your host-owned
  entities (`getCharacters`, `getAdversaries`, `searchEntities`,
  `openEntity`, ...), so the planner's entity-link picker and reference
  cards can resolve real data without ever storing a copy of it.
- **`CampaignPlannerRepository`** — CRUD for everything the planner
  itself owns (Sessions, Notes, NPCs, etc.), so the package never
  touches your storage layer directly. `subscribeToChanges` is
  optional — omit it and you just don't get live cross-session updates.

See the Daggerheart repo's `src/services/campaignPlannerHostAdapter.ts`
and `src/services/campaignPlannerRepository.ts` for a complete,
real-world reference implementation of both interfaces (Postgres/Prisma
+ Express routes) to copy the shape of, not the content of.

## What a host app must provide

1. **React 19** (`peerDependencies`: `react`/`react-dom` `^19.0.1`).
2. **Import this package's compiled stylesheet once**, anywhere in your
   app's entry point: `import 'campaign-session-planner/dist/index.css';`.
   This carries the `theme.css` color variables (see "Theming & layout
   customization" below) and the package's own structural CSS
   (BlockNote layout overrides). It does **not** include Tailwind
   utility classes or BlockNote's own base stylesheets — see the next
   two points for those.
3. **Tailwind CSS v4**, and — this is the part that's easy to miss —
   **your build must content-scan this package's compiled output**,
   `node_modules/campaign-session-planner/dist/**/*.js` (not its
   `.tsx` source — see `MIGRATION.md` if you're updating from a version
   that pointed at source). The package ships zero compiled Tailwind
   CSS; every visual is a Tailwind utility class string, generated at
   build time by *your* Tailwind pipeline, not this package's. If
   you're on `@tailwindcss/vite` (Tailwind v4's Vite plugin) and this
   package is a normal dependency reachable from your app's module
   graph, this happens automatically — Tailwind v4's Vite plugin scans
   the whole resolved module graph, not just your own `src/`. If your
   host uses a different build tool, or an explicit Tailwind `content:`
   allowlist, you must add this package's `dist/` path to it explicitly
   or its components will render completely unstyled.
4. **`@base-ui/react`** and the `@blocknote/*` packages are real
   `dependencies` of this package (not peer deps) — `npm install` pulls
   them in automatically. They can coexist fine alongside a different
   primitives library your host already uses (e.g. `radix-ui`) — no
   conflict, just extra bytes. This package's own compiled output still
   imports `@blocknote/core`'s and `@blocknote/shadcn`'s *own* base
   stylesheets directly (`@blocknote/core/fonts/inter.css`,
   `@blocknote/shadcn/style.css`) — any bundler that already resolves
   CSS imports from `node_modules` (Vite, Webpack, Parcel, all of them
   by default) picks these up automatically; nothing extra to do.
5. Two mount points, both fed the *same* `repository`/`hostAdapter`
   instances:
   - `<CampaignSessionPlanner campaignId repository hostAdapter
     onOpenHostEntity? />` — the actual planner UI, embedded inside one
     of your existing routes/pages/tabs. It manages its own internal
     list/edit state; it does not want to own your routing.
   - `<QuickReferenceDrawerProvider campaignId repository hostAdapter>`
     — wraps your whole app shell (not just the planner page) so
     `useQuickReferenceDrawer().open(...)` can be called from anywhere
     (a command palette, a keyboard shortcut, a link on an unrelated
     page) to pop the drawer over the current page. Easy to forget when
     porting since it isn't on the obvious "planner page."

## How this package is currently distributed

This is a private, unpublished package (no npm registry). Each host
app includes it as a **git submodule** at `packages/<name>`, and
consumes it as a normal npm workspace member (`"workspaces":
["packages/*"]` in the host's root `package.json`) under the plain
package name `campaign-session-planner` — no scope.

Why a submodule instead of a `file:` dependency pointing at a sibling
folder: a `file:../campaign-session-planner` reference only resolves
on a machine that happens to have both repos checked out side by side
at exactly that relative path. A Docker build's context is scoped to
one repo, so anything outside it (including a sibling folder) is
invisible to `COPY`/`npm ci` inside the image — a submodule instead
places the package's real files *inside* the host repo's own checkout
(under `packages/<name>`, wherever the host's Dockerfile already
expects a workspace package to live), so `git clone
--recurse-submodules` (or `git submodule update --init` after a
plain clone) is the only extra step needed anywhere the host repo is
cloned — a dev machine, CI, or a home server — with zero Dockerfile
changes.

### Adding this package to a new host repo

```bash
cd your-host-app
git submodule add https://github.com/khakidan/campaign-session-planner.git packages/campaign-session-planner
npm install   # workspaces auto-links `campaign-session-planner` into node_modules
```

Then write your own `TTRPGHostAdapter` + `CampaignPlannerRepository`
implementations against your app's real entities and storage, and mount
the two components described above.

### Pulling in upstream changes later

```bash
cd packages/campaign-session-planner
git pull origin main
npm run build    # regenerate dist/ from the new source — see "Build step" below
cd ../..
git add packages/campaign-session-planner
git commit -m "Update campaign-session-planner submodule"
```

The explicit `npm run build` matters: this package's own `"prepare"`
script (which also runs `tsup`) reliably runs the *first* time npm
links a workspace package, but isn't guaranteed to re-run on every
later `npm install` just because the submodule's tracked commit
changed underneath it — npm workspaces symlink the package directory
rather than reinstalling it, so there's no `package.json`/lockfile
change for npm to notice. Running the build explicitly after every pull
avoids depending on that.

Check `MIGRATION.md` after pulling — it lists anything a host app needs to *do* in response to a change (most updates require nothing, but it says so explicitly rather than leaving you to infer it from the diff).

## Theming & layout customization

This package is meant to be wired into any TTRPG-like host and restyled
to match it — it doesn't assume it owns your app's visual identity.

- **Colors** — every component resolves its colors through CSS custom
  properties (`src/theme.css`, imported once from this package's own
  entry point) instead of literal Tailwind color classes. Three
  semantic roles, each a full `50`–`900` Tailwind-style shade scale:
  `--csp-neutral-*` (borders/backgrounds/body text), `--csp-accent-*`
  (the primary/interactive color), `--csp-danger-*` (destructive
  actions/errors). Override any of them in your own stylesheet — no
  Tailwind config, build step, or component change needed on your side:
  ```css
  :root {
    --csp-accent-600: #7c3aed; /* swap the accent from emerald to violet */
  }
  ```
- **Layout** — `CampaignSessionPlanner`'s top tab bar (the single most
  opinionated piece of layout it owns) is overridable via the
  `renderNav` prop. Omit it to keep the shipped horizontal tab bar; pass
  a function to render a sidebar, dropdown, or anything else instead,
  built from the same underlying data (`kinds`, `labels`, `activeKind`,
  `onSelectKind`, `onOpenTemplateSettings` —
  `CampaignSessionPlannerNavProps`) rather than fighting the shipped
  markup/CSS:
  ```tsx
  <CampaignSessionPlanner
    {...otherProps}
    renderNav={({ kinds, labels, activeKind, onSelectKind }) => (
      <MyAppSidebar>
        {kinds.map((kind) => (
          <MyAppSidebarItem key={kind} active={kind === activeKind} onClick={() => onSelectKind(kind)}>
            {labels[kind]}
          </MyAppSidebarItem>
        ))}
      </MyAppSidebar>
    )}
  />
  ```
  Every other editor's field order/markup is currently fixed (not yet
  slotted) — see `ROADMAP.md` if you need to go further than the tab
  bar.

## Build step

`package.json`'s `main`/`types`/`exports` point at compiled `dist/`
output (`index.js` ESM + `index.d.ts` + `index.css`), built by `tsup`
(`tsup.config.ts`). `react`/`react-dom`/`@base-ui/react`/`@blocknote/*`
are marked external — never bundled into `dist/index.js` — so a host's
own instances of those are always the ones actually used; bundling any
of them would mean this package's copy and the host's stop being the
same instance, breaking React context/hooks in painful-to-debug ways.

Since this package isn't published to npm (git submodule + npm
workspace — see "How this package is currently distributed"), the
`dist/` output isn't committed to git (`.gitignore`); instead, a
`"prepare"` script (`tsup`) runs automatically whenever `npm install`
links this package as a git/workspace dependency, so a host always
gets a fresh build without a manual step. `npm run dev` (`tsup
--watch`) rebuilds automatically while actively developing this
package itself, e.g. from a shell in `packages/campaign-session-planner`
alongside your host app's own dev server.

This replaced the package pointing `main`/`types` straight at
`src/index.ts` and relying on the host's own bundler to transpile raw
TypeScript from a workspace member directly — which only worked for a
Vite/esbuild-based host. See `MIGRATION.md` for what changed for
existing hosts.

## Local demo

`npm run demo` starts a Vite dev server (`demo/`, `vite.demo.config.ts`)
that mounts `<CampaignSessionPlanner>` against the same fake
repository/host-adapter fixtures the test suite uses (`src/test/
fixtures.ts`), seeded with sample data — no host app needed. Useful for
visually checking a change without wiring up either real host. This
folder is dev-only: it's outside `tsup`'s `src/index.ts` entry point,
so it's never part of the published `dist/` output. It does pull in a
few extra devDependencies just for itself (`vite`,
`@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`) — the
published package still ships zero Tailwind CSS, per "What a host app
must provide" above; this demo just needs its own Tailwind pipeline to
render realistically, the same way any real host does.

## Known gaps / things to know before extending this further

- **Single game-system assumption isn't hardcoded, but isn't exercised
  either.** `TTRPGHostAdapter.getGameSystem()` exists so the planner
  could theoretically branch UI copy/behavior per system in the future,
  but nothing in this package reads it yet — every string in the UI is
  currently generic TTRPG terminology (GM, NPC, session, etc.), not
  Daggerheart-specific.
