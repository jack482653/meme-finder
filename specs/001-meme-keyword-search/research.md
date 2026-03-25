# Research: Meme Keyword Search (Raycast Extension)

**Phase 0 Output** | Branch: `001-meme-keyword-search` | Date: 2026-03-24

---

## Decision 1: Meme Search API

**Decision**: Klipy as primary API; Giphy as fallback.

**Rationale**:
- Klipy has a dedicated `/memes/search` endpoint (not just GIFs) — uniquely suited to this use case
- Free tier: 100 req/min (vs Giphy's 100 req/hour) — far more generous for personal use
- Instant self-serve API key at `partner.klipy.com`
- Built explicitly as a Tenor successor by ex-Tenor team; stable long-term

**Alternatives considered**:
- **Tenor**: Registration closed Jan 2026; full shutdown Q3 2026. DO NOT USE.
- **Giphy**: Good fallback (100 req/hour free, instant key). Kept as secondary option.
- **Imgflip**: Template generator only — searches blank meme templates, not existing memes. Wrong tool.
- **Reddit JSON API**: Title-based search only, expiring signed image URLs, 10 req/min unauthenticated. Not suitable.

**Key API endpoints**:
```
Klipy memes search:
GET https://api.klipy.com/api/v1/{APP_KEY}/memes/search
  ?q=<keyword>&per_page=<N>&page=1&customer_id=raycast_user

Klipy response image URLs:
  thumbnail: data[i].jpg.sm.url   (static JPEG — use in Grid)
  preview:   data[i].gif.md.url   (animated GIF — use in preview action)

Giphy fallback:
GET https://api.giphy.com/v1/gifs/search
  ?api_key=<KEY>&q=<keyword>&limit=<N>&rating=g

Giphy response image URLs:
  thumbnail: data[i].images.fixed_width_still.url  (static PNG)
  full GIF:  data[i].images.fixed_width.url
```

---

## Decision 2: Raycast Extension Scaffolding

**Decision**: Use Raycast's built-in "Create Extension" command with the Grid template.

**Rationale**:
- No CLI scaffold (`npm create raycast-extension` does not exist)
- The in-app "Create Extension" command writes the full project structure and installs deps
- Grid template is the right starting point for an image search extension

**Dev workflow**:
```
npm run dev    # hot-reload dev mode
npm run build  # type-check + production build
npm run lint   # ESLint
```

---

## Decision 3: Image Grid Implementation

**Decision**: Use `<Grid columns={N} throttle onSearchTextChange isLoading>` with `<Grid.Item content={{ source: thumbnailUrl }}>`.

**Key API facts**:
- `Grid.ItemSize` is **deprecated** — use `columns` (integer 1–8) directly
- `content` accepts `{ source: url }` — Raycast fetches and renders the image as thumbnail
- Use `throttle` prop to debounce `onSearchTextChange` and avoid hammering the API on every keystroke
- `isLoading` shows a spinner below the search bar during fetch

```tsx
<Grid
  columns={limit}
  isLoading={isLoading}
  onSearchTextChange={setQuery}
  throttle
  searchBarPlaceholder="Search memes..."
>
  {memes.map((meme) => (
    <Grid.Item
      key={meme.id}
      title={meme.title}
      content={{ source: meme.thumbnailUrl }}
      actions={<ActionPanel>...</ActionPanel>}
    />
  ))}
</Grid>
```

---

## Decision 4: Clipboard Copy — Image Data (Critical Gotcha)

**Decision**: Download image to a temp file, then call `Clipboard.copy({ file: tmpPath })`.

**Rationale**:
`Clipboard.copy` does NOT accept raw bytes, base64, or URLs. The only supported `Content` types are
`{ text }`, `{ file }`, and `{ html }`. To paste as an inline image (not a link) in Slack and
macOS Messages, the image MUST be written to disk first.

**Implementation**:
```typescript
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Clipboard } from "@raycast/api";

export async function copyImageToClipboard(url: string, ext = "jpg"): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `meme-${Date.now()}.${ext}`);
  fs.writeFileSync(tmpPath, buffer);
  await Clipboard.copy({ file: tmpPath });
}
```

**Alternative**: `Clipboard.paste({ file: tmpPath })` writes content directly into the focused app
at cursor position — bypassing the clipboard. Can be offered as a secondary action.

---

## Decision 5: User Preference for N (Result Count)

**Decision**: Use `type: "textfield"` preference with `parseInt()` at runtime. Raycast has no `"number"` preference type.

**Package.json manifest**:
```json
{
  "preferences": [
    {
      "name": "maxResults",
      "type": "textfield",
      "required": false,
      "default": "9",
      "title": "Number of Results",
      "description": "How many meme results to show per search (1–20)"
    }
  ]
}
```

**Runtime**:
```typescript
const { maxResults } = getPreferenceValues<{ maxResults: string }>();
const limit = Math.min(20, Math.max(1, parseInt(maxResults, 10) || 9));
```

Preferences are persisted automatically by Raycast — no manual storage needed.

---

## Decision 6: Toast / Feedback Pattern

**Decision**: Use `showToast` with Animated → Success/Failure transition.

```typescript
import { showToast, Toast } from "@raycast/api";

async function handleCopy(url: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying meme…" });
  try {
    await copyImageToClipboard(url);
    toast.style = Toast.Style.Success;
    toast.title = "Copied to clipboard!";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Copy failed";
    toast.message = String(err);
  }
}
```

---

## Decision 7: Tech Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Language | TypeScript 5.8 | Strict mode |
| React | bundled by Raycast | Only `@types/react@19` as devDep |
| Raycast API | `@raycast/api ^1.103.0` | |
| Raycast Utils | `@raycast/utils ^2.2.2` | `useFetch`, `showFailureToast` |
| HTTP | Node `fetch` (global) | No CORS restrictions in Node worker |
| Temp files | Node `fs` + `os.tmpdir()` | No extra deps needed |
| Testing | `@raycast/utils` test utilities + Jest | Unit-test pure logic functions |
| Linting | ESLint + `@raycast/eslint-config ^2.0.4` | |

**No CORS restrictions**: Extensions run in a Node.js worker thread — no browser sandbox.
All `fetch()` calls go directly to external servers.

---

## All NEEDS CLARIFICATION Resolved

| Item | Resolution |
|------|-----------|
| Meme API provider | Klipy (primary), Giphy (fallback) |
| Clipboard copy mechanism | Download to temp file → `Clipboard.copy({ file })` |
| N preference type | `"textfield"` + parseInt, defaulting to 9 |
| Raycast version compatibility | `@raycast/api ^1.103.0`, TS 5.8, React 19 types |
| CORS / network access | Not an issue — Node.js worker, no sandbox |
