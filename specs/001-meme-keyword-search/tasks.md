---
description: "Task list for Meme Finder Raycast Extension"
---

# Tasks: Meme Finder Raycast Extension

**Input**: Design documents from `/specs/001-meme-keyword-search/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all implementation tasks

## Path Conventions

Single project at repository root:
- Source: `src/`, `src/lib/`, `src/components/`
- Tests: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup

**Purpose**: Scaffold project and configure tooling. All must complete before Phase 2.

- [X]  T001 Scaffold extension via Raycast "Create Extension" command → select Grid template → name `meme-finder` → output to repo root; then `pnpm install`
- [X]  T002 [P] Create `.npmrc` at repo root with `use-node-version=22.16.0`
- [X]  T003 Update `package.json` — add `"format": "prettier --write \"src/**/*.{ts,tsx}\""` script; install devDeps: `pnpm add -D prettier @trivago/prettier-plugin-sort-imports`
- [X]  T004 [P] Create `.prettierrc.json` with config: `trailingComma: "all"`, `singleQuote: false`, `arrowParens: "always"`, `semi: true`, `importOrder: ["^@raycast/(.*)$","^react$","<THIRD_PARTY_MODULES>","^[./]"]`, `importOrderSortSpecifiers: true`, plugin `@trivago/prettier-plugin-sort-imports`
- [X]  T005 [P] Create `.prettierignore` with entries: `build`, `coverage`, `node_modules`
- [X]  T006 Configure Jest: install `pnpm add -D jest @types/jest ts-jest`; create `jest.config.ts` with `preset: "ts-jest"`, `testEnvironment: "node"`, `testMatch: ["**/tests/**/*.test.ts"]`

**Checkpoint**: `pnpm dev` launches in Raycast, `pnpm format` runs without error, `pnpm test` runs without error.

---

## Phase 2: Foundational

**Purpose**: Shared types that ALL user stories depend on. MUST complete before Phase 3.

**⚠️ CRITICAL**: No user story work can begin until `src/types.ts` is complete.

- [X]  T007 Define all TypeScript types in `src/types.ts`:
  - `MemeResult` interface (id, title, thumbnailUrl, previewUrl, sourceApi)
  - `UserPreferences` interface (maxResults, klipyApiKey, giphyApiKey)
  - `KlipyItem`, `KlipySearchResponse` interfaces (raw API shapes)
  - `GiphyImages`, `GiphyItem`, `GiphySearchResponse` interfaces (raw API shapes)
  - `SearchError extends Error` class with `cause?: unknown`
  - `ClipboardError extends Error` class with `cause?: unknown`

**Checkpoint**: `pnpm build` compiles `src/types.ts` with zero TypeScript errors.

---

## Phase 3: User Story 1 — Search and Copy (Priority: P1) 🎯 MVP

**Goal**: User types keyword → sees meme grid → selects one → image copied to clipboard inline.

**Independent Test**: Open Raycast → activate extension → type "this is fine" → grid appears within 2s → press ↵ on a result → paste `⌘V` into Slack → confirm meme appears as inline image (not a URL).

### Implementation for User Story 1

- [X]  T008 [P] [US1] Implement `src/lib/api.ts`:
  - Export `searchMemes(query: string, limit: number): Promise<MemeResult[]>`
  - Guard: if `query.trim() === ""` return `[]` immediately, no API call
  - Clamp limit: `Math.min(20, Math.max(1, limit))`
  - Primary: fetch `https://api.klipy.com/api/v1/{klipyApiKey}/memes/search?q={query}&per_page={limit}&page=1&customer_id=raycast_user`; map `KlipyItem[]` → `MemeResult[]` via `fromKlipy()`
  - Fallback: on non-2xx or thrown error from Klipy (or empty array), fetch Giphy `https://api.giphy.com/v1/gifs/search?api_key={giphyApiKey}&q={query}&limit={limit}&rating=g`; map `GiphyItem[]` → `MemeResult[]` via `fromGiphy()`
  - If Giphy also fails: throw `SearchError("Could not load memes. Check your connection.", cause)`
  - Include `fromKlipy()` and `fromGiphy()` mapper functions in the same file
  - Read API keys via `getPreferenceValues<UserPreferences>()` (placeholder until US2 wires preferences)

- [X]  T009 [P] [US1] Implement `src/lib/clipboard.ts`:
  - Export `copyImageToClipboard(url: string): Promise<void>`
  - Detect file extension from URL (default to `"jpg"`)
  - `fetch(url)` → on non-ok response throw `ClipboardError("Failed to download meme image")`
  - `Buffer.from(await response.arrayBuffer())` → `fs.writeFileSync(path.join(os.tmpdir(), \`meme-\${Date.now()}.\${ext}\`), buffer)`
  - `await Clipboard.copy({ file: tmpPath })`
  - Wrap clipboard write errors in `ClipboardError`
  - Imports: `fs`, `os`, `path` from Node stdlib; `Clipboard` from `@raycast/api`

- [X] T010 [US1] Implement `src/components/MemeActions.tsx` (depends on T008, T009):
  - Props: `meme: MemeResult`
  - Export default `MemeActions` component returning `<ActionPanel>`
  - Primary action `<Action title="Copy Meme" onAction={handleCopy} />` bound to `↵`
  - Secondary action `<Action title="Paste Meme Directly" onAction={handlePaste} />` bound to `⌘↵`
  - `handleCopy`: `showToast(Animated, "Copying meme…")` → `copyImageToClipboard(meme.previewUrl)` → `toast.style = Success` / on error `toast.style = Failure; toast.message = err.message`
  - `handlePaste`: same download pattern but use `Clipboard.paste({ file: tmpPath })` instead of `copy`

- [X] T011 [US1] Implement `src/search-meme.tsx` — main Grid command (depends on T010):
  - `useState` for `query: string`, `results: MemeResult[]`, `isLoading: boolean`, `error: string | null`
  - `useCallback` for `handleSearch(text: string)`: set `isLoading=true`, call `searchMemes(text, DEFAULT_LIMIT)`, set results or error, set `isLoading=false`
  - `DEFAULT_LIMIT = 9` (hardcoded in Phase 3; replaced by preference in Phase 4)
  - `<Grid columns={DEFAULT_LIMIT > 6 ? 3 : DEFAULT_LIMIT > 3 ? 2 : 1} isLoading={isLoading} onSearchTextChange={handleSearch} throttle searchBarPlaceholder="Search memes…">`
  - Map `results` to `<Grid.Item key={m.id} title={m.title || "Meme"} content={{ source: m.thumbnailUrl }} actions={<MemeActions meme={m} />} />`
  - Show empty state with "No results — try a different keyword" when `results.length === 0` and `query` is non-empty and not loading
  - Show `showToast(Failure, error)` when `error` is non-null

### Unit Tests for User Story 1

- [X] T012 [P] [US1] Write `tests/unit/api.test.ts` (depends on T008):
  - Mock global `fetch` with `jest.fn()`
  - Test: `searchMemes("", 9)` returns `[]` without calling fetch
  - Test: `searchMemes("pikachu", 9)` with Klipy 200 → returns mapped `MemeResult[]`
  - Test: Klipy returns empty array → calls Giphy → returns Giphy results
  - Test: Klipy throws → calls Giphy → returns Giphy results
  - Test: Both fail → throws `SearchError`
  - Test: `limit=0` clamped to 1; `limit=99` clamped to 20

- [X] T013 [P] [US1] Write `tests/unit/clipboard.test.ts` (depends on T009):
  - Mock `fetch`, `fs.writeFileSync`, `Clipboard.copy` from `@raycast/api`
  - Test: successful copy — fetch called, file written to os.tmpdir(), Clipboard.copy called with `{ file }`
  - Test: fetch non-ok response → throws `ClipboardError`
  - Test: Clipboard.copy throws → throws `ClipboardError`

**Checkpoint**: `pnpm test` passes all unit tests. Manual test: keyword → grid → copy → inline paste in Slack and macOS Messages. SC-001 (<15s), SC-002 (<2s), SC-003 (inline image) verified.

---

## Phase 4: User Story 2 — Configurable N (Priority: P2)

**Goal**: User sets N in Raycast Preferences; result count changes and persists across restarts.

**Independent Test**: Open Raycast → `⌘,` → Meme Finder → change "Number of Results" to 5 → search → confirm exactly 5 results. Quit and reopen Raycast → search again → confirm still 5 results.

### Implementation for User Story 2

- [X] T014 [US2] Add preferences schema to `package.json` under the command's `preferences` array (depends on T003):
  - `{ "name": "klipyApiKey", "type": "password", "required": true, "title": "Klipy API Key", "description": "Get yours free at partner.klipy.com" }`
  - `{ "name": "giphyApiKey", "type": "password", "required": false, "title": "Giphy API Key (fallback)", "description": "Optional. Get at developers.giphy.com" }`
  - `{ "name": "maxResults", "type": "textfield", "required": false, "default": "9", "title": "Number of Results", "description": "Results per search (1–20). Default: 9" }`

- [X] T015 [US2] Update `src/search-meme.tsx` to read preferences (depends on T014):
  - Add `const { maxResults } = getPreferenceValues<UserPreferences>()`
  - Derive `const limit = Math.min(20, Math.max(1, parseInt(maxResults, 10) || 9))`
  - Replace hardcoded `DEFAULT_LIMIT = 9` with `limit`
  - Pass `limit` to `searchMemes()` and to `<Grid columns={...}>`
  - Column count formula: `columns = limit <= 3 ? limit : limit <= 6 ? 3 : limit <= 12 ? 4 : 5`

**Checkpoint**: Change N in Preferences → result count matches. Restart Raycast → N is remembered. SC-005 verified.

---

## Phase 5: User Story 3 — Preview Before Copying (Priority: P3)

**Goal**: User can view a full-size meme before committing to copy it.

**Independent Test**: Search "surprised pikachu" → press `⌘Y` on a result → full-size animated GIF opens in Quick Look overlay → press `Space` to dismiss → grid is unchanged.

### Implementation for User Story 3

- [ ] T016 [P] [US3] ⏸ DEFERRED (post-MVP — violates Principle V): Add Quick Look support to `src/search-meme.tsx`:
  - Download `meme.previewUrl` to a temp file when the item is focused (or lazily on Quick Look trigger)
  - Add `quickLook={{ name: meme.title || "Meme", path: localTempPath }}` prop to `<Grid.Item>`
  - Note: `quickLook.path` requires a local file path — reuse the same `os.tmpdir()` temp-file pattern from `clipboard.ts`; extract a shared `downloadToTemp(url): Promise<string>` helper into `src/lib/clipboard.ts`

- [ ] T017 [P] [US3] ⏸ DEFERRED (post-MVP — violates Principle V): Add `<Action.ToggleQuickLook>` to `src/components/MemeActions.tsx`:
  - Add `<Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />` inside the `<ActionPanel>`
  - Place after Copy and Paste actions

**Checkpoint**: US3 acceptance scenarios pass: Quick Look opens, copy from preview works, dismiss returns to grid.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality gate before the extension is usable day-to-day.

- [X] T018 [P] Run `pnpm format` — apply Prettier to all `src/**/*.{ts,tsx}` files; verify zero formatting errors
- [X] T019 Run `pnpm lint` — fix any ESLint errors from `@raycast/eslint-config`; zero warnings allowed
- [X] T020 Run `pnpm build` — verify TypeScript strict-mode compilation passes with zero errors; production bundle generated
- [X] T021 [P] Run `pnpm test` — confirm all unit tests pass; confirm ≥80% line coverage on `src/lib/api.ts` and `src/lib/clipboard.ts`
- [X] T022 Manual E2E verification against all Success Criteria:
  - SC-001: Time from `⌘Space` → meme on clipboard ≤ 15 seconds ✓
  - SC-002: Search results visible ≤ 2 seconds on Wi-Fi ✓
  - SC-003: Paste in Slack → inline image (not URL) ✓; paste in macOS Messages → inline image ✓
  - SC-004: Test 5 common keywords ("this is fine", "surprised pikachu", "drake", "distracted boyfriend", "doge") — all return relevant results ✓
  - SC-005: Set N=5, restart Raycast, confirm N=5 persists ✓

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2; T009 and T008 can start in parallel; T010 depends on T008+T009; T011 depends on T010
- **US2 (Phase 4)**: Depends on Phase 3 complete; T014 and T015 are sequential (T015 depends on T014)
- **US3 (Phase 5)**: Depends on Phase 3 complete (uses types and clipboard helper); T016+T017 can start in parallel
- **Polish (Phase 6)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — independently testable
- **US2 (P2)**: Depends on US1 complete (modifies search-meme.tsx) — independently testable once wired
- **US3 (P3)**: Depends on US1 complete (extends Grid.Item and MemeActions) — independently testable

### Within Phase 3 (US1) Execution Order

```
T007 (types) ← already done in Phase 2
    ↓
T008 (api.ts)    T009 (clipboard.ts)    ← parallel
    ↓                  ↓
    └──────────────────┘
              ↓
         T010 (MemeActions.tsx)
              ↓
         T011 (search-meme.tsx)
              ↓
    T012 (api.test.ts)   T013 (clipboard.test.ts)  ← parallel
```

### Parallel Opportunities

- T002, T004, T005 can run in parallel after T001
- T008 and T009 can run in parallel (different files)
- T012 and T013 can run in parallel (different files)
- T016 and T017 can run in parallel (different files)
- T018, T019, T021 can run in parallel in Polish phase

---

## Parallel Execution Examples

### Phase 3 — US1 Core Implementation

```
# Start these together (after T007):
Task T008: "Implement src/lib/api.ts — searchMemes with Klipy+Giphy fallback"
Task T009: "Implement src/lib/clipboard.ts — copyImageToClipboard temp-file pattern"

# After T008 + T009 complete:
Task T010: "Implement src/components/MemeActions.tsx — ActionPanel"
# Then:
Task T011: "Implement src/search-meme.tsx — Grid command"

# After T011, start together:
Task T012: "Write tests/unit/api.test.ts"
Task T013: "Write tests/unit/clipboard.test.ts"
```

### Phase 5 — US3 Preview

```
# Start these together (after US1 complete):
Task T016: "Add quickLook prop + downloadToTemp helper to src/search-meme.tsx + clipboard.ts"
Task T017: "Add Action.ToggleQuickLook to src/components/MemeActions.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only — Phases 1–3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (types)
3. Complete Phase 3: US1 (search + copy)
4. **STOP and VALIDATE**: Manual test keyword → clipboard → paste inline in Slack/Messages
5. If validation passes → ship MVP, use daily

### Incremental Delivery

1. Phase 1+2+3 → US1 working → **daily usable MVP**
2. Add Phase 4 → US2 (configurable N) → test persistence
3. Add Phase 5 → US3 (Quick Look preview) → polish
4. Phase 6 → production-ready build

---

## Notes

- `[P]` = different files, no shared state — safe to run in parallel
- `[Story]` label maps each task to its user story for traceability
- Tests MUST be written after implementation (per plan.md); run `pnpm test` before marking complete
- `Clipboard.copy` accepts `{ file: PathLike }` only — never raw bytes or URLs (see research.md Decision 4)
- `quickLook.path` on `<Grid.Item>` requires a local file path — download to `os.tmpdir()` first
- Raycast has no `"number"` preference type — always use `"textfield"` + `parseInt()` (research.md Decision 5)
- Commit after each phase checkpoint, not after individual tasks
