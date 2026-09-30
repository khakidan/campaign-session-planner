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
- **Individual editor fields** — every entity editor (`NoteEditor`,
  `NpcEditor`, `SessionEditor`, etc., each also exported directly — see
  "Building a fully custom editor" below) takes a `renderFields` prop
  that replaces its own top field block (Title/Type/Status and similar
  — never the content editor, entity links, or Save/Cancel/Delete,
  which stay fixed). It receives `values`, `onChange`, and
  `defaultFields` (the shipped block, pre-rendered) — wrap
  `defaultFields` to add a field alongside the shipped ones without
  reimplementing anything, or ignore it to render your own fields in
  whatever order/subset you want:
  ```tsx
  <NoteEditor
    {...otherProps}
    renderFields={({ defaultFields, values, onChange }) => (
      <>
        {defaultFields}
        <MyPriorityField
          value={myPriority}
          onChange={setMyPriority} // your own state — see the note below
        />
      </>
    )}
  />
  ```
  Through `CampaignSessionPlanner` itself, these are one prop, keyed by
  kind (`CampaignSessionPlannerRenderFields`), so you only ever have to
  override the kinds you actually want to change:
  ```tsx
  <CampaignSessionPlanner
    {...otherProps}
    renderFields={{
      note: ({ defaultFields }) => (
        <>
          {defaultFields}
          <MyPriorityField />
        </>
      ),
      // scene, npc, group, location, session, storyline, thread, quest,
      // event — each independent and optional.
    }}
  />
  ```
  **A custom field's data is yours to store.** This package's entities
  (`Note`, `Npc`, etc.) have no generic "extra fields" bag, and adding
  one would be a real `CampaignPlannerRepository` schema change — so a
  custom field's value lives in your own component state (or your own
  side table, keyed by the entity's id) and is saved through your own
  mechanism, entirely independent of this package's `onSave`. The
  `values`/`onChange` passed into `renderFields` are only ever this
  package's own typed form values (`NoteFormValues` and so on) — they
  never carry fields this package doesn't know about.

## Building a fully custom editor

If `renderFields` isn't enough — you want a fundamentally different
layout for one entity kind, not just a different field block — every
per-kind editor component (`NoteEditor`, `NpcEditor`, `GroupEditor`,
`LocationEditor`, `SceneEditor`, `SessionEditor`, `StorylineEditor`,
`ThreadEditor`, `QuestEditor`, `EventEditor`) is exported directly, so
you can mount one yourself outside `CampaignSessionPlanner` — same
validation, same BlockNote content field, same entity-linking, same
Save/Cancel/Delete, in whatever page/layout you build around it.

For a screen built from scratch entirely, the lower-level pieces these
editors themselves are built from are exported too:
`BlockNoteFreeformField` (the rich-text content field with `[[`/`@`
linking), `EntityLinksPanel`/`EntityLinkPicker` (the "Linked Entities"
UI and its search-and-link picker), and the starter-template exports
from `src/lib/entityTemplates.ts` (`TEMPLATE_DEFAULTS`,
`TEMPLATE_LABELS`, each named template, and the `heading`/`section`/
`checklistSection` helpers they're built from). Combined with the
already-exported hooks (`useNotes`, `useEntityLinks`, etc.), this is
the same set of building blocks `CampaignSessionPlanner` itself
composes — nothing about it is held back from a host that wants to
assemble its own screen instead of using the shipped one.

## Run Mode: reference support while actually running a session

This package is a reference tool, not where you manage your players —
that's your own app's job (initiative, character sheets, combat).
`SessionRunPanel` and `QuickCaptureComposer` are small, non-modal
pieces meant to sit *alongside* your own live-session screen, not
replace or navigate away from it — the same principle
`SessionSafetyControls` already follows.

```tsx
<YourLiveSessionScreen>
  {/* Your own initiative tracker, character sheets, combat UI. */}
  <aside>
    <SessionRunPanel
      repository={repository}
      campaignId={campaignId}
      onOpenPlannerEntity={(ref) => quickReferenceDrawer.push(ref)}
      onOpenHostEntity={(type, id) => /* open your own page for it */}
    />
    <QuickCaptureComposer repository={repository} campaignId={campaignId} />
  </aside>
</YourLiveSessionScreen>
```

`SessionRunPanel` renders nothing unless a Session has
`status === 'Running'`. It shows that Session's Scenes as a prev/next
strip, the active Scene's content read-only, and its linked entities as
tappable chips — wiring `onOpenPlannerEntity` to
`useQuickReferenceDrawer().push()` is the natural choice, so tapping a
chip opens it in the Drawer instead of navigating anywhere.

`QuickCaptureComposer` is a type dropdown plus one text field — two
taps to record a `Player Theory`/`Unresolved Question`/etc. mid-scene
without pulling up the full `NoteEditor`. It creates a real `Note`
through the same `CampaignPlannerRepository` everything else uses. If
you want it to show up immediately in `CampaignSessionPlanner`'s own
Notes list without the GM switching away and back, implement
`CampaignPlannerRepository.subscribeToChanges` — `CampaignSessionPlanner`
already reloads all its lists when that fires; this needs nothing
extra from you beyond having it wired at all.

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

## Testing

`npm test` runs the full jsdom-based suite (fast, no real browser
needed) — this is what you want day to day.

`npm run test:browser` runs a second, separate suite
(`vitest.browser.config.ts`) in real Chromium via Playwright, currently
just `EntityReferenceInlineContent.browser.test.tsx` — the one thing
jsdom genuinely can't drive (BlockNote's `[[`/`@` typed-trigger path,
which depends on real browser geometry APIs). One-time setup on a new
machine: `npx playwright install chromium` (standard Playwright setup,
nothing specific to this repo). You don't need this for most changes —
only if you're touching `EntityReferenceInlineContent.tsx` or
`BlockNoteFreeformField.tsx`'s `[[`/`@` wiring itself.

## Known gaps / things to know before extending this further

- **Single game-system assumption isn't hardcoded, but isn't exercised
  either.** `TTRPGHostAdapter.getGameSystem()` exists so the planner
  could theoretically branch UI copy/behavior per system in the future,
  but nothing in this package reads it yet — every string in the UI is
  currently generic TTRPG terminology (GM, NPC, session, etc.), not
  Daggerheart-specific.
