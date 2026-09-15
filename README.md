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
2. **Tailwind CSS v4**, and — this is the part that's easy to miss —
   **your build must content-scan this package's `.tsx` files.** The
   package ships zero compiled CSS; every visual is a Tailwind utility
   class string, generated at build time by *your* Tailwind pipeline,
   not this package's. If you're on `@tailwindcss/vite` (Tailwind v4's
   Vite plugin) and this package is a normal dependency reachable from
   your app's module graph (an npm workspace, a git submodule under
   your own `packages/`, or a `file:` dependency), this happens
   automatically — Tailwind v4's Vite plugin scans the whole resolved
   module graph, not just your own `src/`. If your host uses a
   different build tool, or an explicit Tailwind `content:` allowlist,
   you must add this package's path to it explicitly or its components
   will render completely unstyled.
3. **`@base-ui/react`** and the `@blocknote/*` packages are real
   `dependencies` of this package (not peer deps) — `npm install` pulls
   them in automatically. They can coexist fine alongside a different
   primitives library your host already uses (e.g. `radix-ui`) — no
   conflict, just extra bytes.
4. Two mount points, both fed the *same* `repository`/`hostAdapter`
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
cd ../..
git add packages/campaign-session-planner
git commit -m "Update campaign-session-planner submodule"
```

## Known gaps / things to know before extending this further

- **No build step.** `package.json`'s `main`/`types` point straight at
  `src/index.ts` — this works because every consumer so far is a
  Vite/esbuild-based bundler that transpiles TypeScript from a
  workspace member directly. If a future host's toolchain doesn't do
  that (e.g. a plain `tsc`+Node consumer with no bundler), add a real
  build step (`tsup` or Vite library mode) emitting `dist/` + `.d.ts`
  before that host can consume it.
- **No tests live in this package.** Its only test coverage today is
  in the Daggerheart host repo's `tests/`, exercising it through that
  host's wiring (`tests/components/CampaignSessionPlanner.test.tsx`).
  A regression here won't be caught until whichever host app's test
  suite happens to run next.
- **Single game-system assumption isn't hardcoded, but isn't exercised
  either.** `TTRPGHostAdapter.getGameSystem()` exists so the planner
  could theoretically branch UI copy/behavior per system in the future,
  but nothing in this package reads it yet — every string in the UI is
  currently generic TTRPG terminology (GM, NPC, session, etc.), not
  Daggerheart-specific.
