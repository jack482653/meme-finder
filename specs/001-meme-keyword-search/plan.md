# Implementation Plan: Meme Finder Raycast Extension

**Branch**: `001-meme-keyword-search` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-meme-keyword-search/spec.md`

## Summary

Build a Raycast Extension that lets users type a meme keyword, browse the top N results
in a native image grid, and copy a selected meme to the clipboard as raw image data —
so it pastes inline (not as a link) into Slack, macOS Messages, or any messaging app.

Memes are fetched from Klipy (dedicated memes search endpoint, 100 req/min free tier)
with Giphy as fallback. All UI chrome (search bar, grid, keyboard navigation, preferences)
is provided by the Raycast API framework — no custom UI infrastructure needed.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict mode)
**Primary Dependencies**: `@raycast/api ^1.103.0`, `@raycast/utils ^2.2.2`
**Storage**: Raycast Preferences (built-in, zero-config) — no database or file storage
**Testing**: Jest + `@raycast/utils` test utilities; unit tests on pure logic functions
**Target Platform**: macOS (Raycast Extension, Node.js worker thread)
**Project Type**: Raycast Extension (desktop app plugin)
**Package Manager**: pnpm; Node.js version pinned via `.npmrc` (`use-node-version=22.16.0`)
**Formatting**: Prettier with `@trivago/prettier-plugin-sort-imports`; `format` script in package.json
**Performance Goals**: Search results visible within 2 seconds on Wi-Fi (SC-002)
**Constraints**: Clipboard copy MUST use `{ file: path }` not raw bytes or URLs;
  Klipy free tier 100 req/min; Giphy free tier 100 req/hour
**Scale/Scope**: Single-user personal tool; no backend, no auth, no database

## Constitution Check

*GATE: Must pass before implementation begins.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ Pass | Single responsibility per file; no dead code; no extra dependencies |
| II. Testing Standards | ✅ Pass | Tests required for `api.ts` and `clipboard.ts` pure logic before merge |
| III. UX Consistency | ✅ Pass | Raycast provides consistent loading/error/success states via `isLoading` + `showToast` |
| IV. Performance | ✅ Pass | `throttle` prop debounces search; static JPEG thumbnails load fast; 2s target SC-002 |
| V. MVP Simplicity | ✅ Pass | No custom UI beyond Raycast framework; only P1+P2 stories in scope; P3 (preview) as Quick Look action (zero extra code via `quickLook` prop) |

**Complexity Tracking**: No violations. No entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-meme-keyword-search/
├── plan.md              # This file
├── research.md          # Phase 0: API + Raycast decisions
├── data-model.md        # Phase 1: MemeResult, UserPreferences, types
├── quickstart.md        # Phase 1: Setup and usage guide
├── contracts/
│   └── meme-search-api.md   # Phase 1: searchMemes() + clipboard contracts
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
/  (repository root)
├── package.json              # Raycast manifest, dependencies, preferences schema
├── src/
│   ├── search-meme.tsx       # Main command — Grid UI, search state
│   ├── components/
│   │   └── MemeActions.tsx   # ActionPanel: copy, paste, preview
│   ├── lib/
│   │   ├── api.ts            # searchMemes() — Klipy + Giphy adapter
│   │   └── clipboard.ts      # copyImageToClipboard() — download + Clipboard.copy
│   └── types.ts              # MemeResult, UserPreferences, SearchError, ClipboardError
├── tests/
│   ├── unit/
│   │   ├── api.test.ts       # searchMemes(): empty query, fallback, error propagation
│   │   └── clipboard.test.ts # copyImageToClipboard(): download error, file write
│   └── integration/
│       └── search-flow.test.ts  # End-to-end: keyword → results → clipboard
└── assets/
    └── extension-icon.png
```

**Structure Decision**: Single Raycast extension project. No monorepo, no backend,
no separate packages. All logic lives in `src/lib/`; UI in `src/` root and `components/`.

## Implementation Phases

### Phase 1 — Core Search & Copy (P1 User Story)

**Goal**: User can search by keyword and copy a meme to clipboard.

Tasks:
1. Scaffold extension via Raycast "Create Extension" → Grid template
2. Define `types.ts` — `MemeResult`, `UserPreferences`, `SearchError`, `ClipboardError`
3. Implement `lib/api.ts` — `searchMemes(query, limit)` with Klipy primary + Giphy fallback
4. Implement `lib/clipboard.ts` — `copyImageToClipboard(url)` using temp file pattern
5. Implement `search-meme.tsx` — `<Grid>` with `onSearchTextChange`, `throttle`, `isLoading`
6. Implement `MemeActions.tsx` — `ActionPanel` with Copy action + toast feedback
7. Write unit tests for `api.ts` and `clipboard.ts`
8. Manual verification: keyword → grid → copy → paste inline in Slack + macOS Messages

**Done when**: FR-001, FR-002, FR-003, FR-006, FR-007, FR-008 pass; SC-001, SC-002, SC-003 verified.

### Phase 2 — Configurable N (P2 User Story)

**Goal**: User can set and persist N via Raycast Preferences.

Tasks:
1. Add `maxResults` preference to `package.json` (textfield, default "9")
2. Add `klipyApiKey` + `giphyApiKey` as `password` preferences
3. Read and clamp `maxResults` in `search-meme.tsx` via `getPreferenceValues()`
4. Test: change N → verify result count; restart Raycast → verify N persists

**Done when**: FR-004, FR-005 pass; SC-005 verified.

### Phase 3 — Preview (P3 User Story) ⏸ DEFERRED POST-MVP

**Goal**: User can preview a meme full-size before copying.

Tasks:
1. Add `quickLook` prop to `<Grid.Item>` — **requires a local file path, not a URL**.
   The image at `previewUrl` must first be downloaded to `os.tmpdir()` (reuse `downloadToTemp()`
   from `clipboard.ts`), then the local path is passed as `quickLook.path`.
2. Add `Action.ToggleQuickLook` to `MemeActions.tsx`

**Note**: `quickLook.path` is a Raycast constraint — it does not accept remote URLs.
This means each focused Grid.Item triggers an async download, which adds non-trivial
complexity (download state management, error handling per item). Estimated: ~30 LOC.

**Done when**: US3 acceptance scenarios pass.

## Key Implementation Notes

### The Clipboard Gotcha
`Clipboard.copy` accepts `{ file: PathLike }` only — NOT raw bytes or URLs.
Workflow: `fetch(previewUrl)` → `fs.writeFileSync(os.tmpdir()/meme-<ts>.jpg)` → `Clipboard.copy({ file })`.
See `contracts/meme-search-api.md` and `research.md` Decision 4.

### Thumbnail vs Preview URLs
- **Thumbnail** (`thumbnailUrl`): Static JPEG/PNG — use as `<Grid.Item content>`. Fast to load.
- **Preview** (`previewUrl`): Animated GIF — use for clipboard copy and Quick Look. Larger file.

### API Fallback Strategy
`searchMemes()` tries Klipy first. On any non-2xx response or thrown error, it falls through
to Giphy. If Giphy also fails, it throws `SearchError` with a user-friendly message.
The UI catches `SearchError` and shows it via `showToast(Toast.Style.Failure)`.

### No Custom Preferences UI
Raycast renders the preferences form automatically from `package.json`. No custom settings
screen needed — this is the MVP Simplicity principle in action.
