# Data Model: Meme Keyword Search

**Phase 1 Output** | Branch: `001-meme-keyword-search` | Date: 2026-03-24

---

## Entities

### MemeResult

The primary result unit displayed in the search grid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier from the source API |
| `title` | `string` | Yes | Human-readable meme name or description |
| `thumbnailUrl` | `string` | Yes | Static image URL for Grid display (JPEG/PNG, small size) |
| `previewUrl` | `string` | Yes | Animated GIF URL for full-size preview action |
| `sourceApi` | `"klipy" \| "giphy"` | Yes | Which API this result came from |

**Validation rules**:
- `thumbnailUrl` and `previewUrl` MUST be non-empty valid HTTPS URLs
- `id` MUST be unique within a single search result set
- `title` MAY be empty string if the API returns no title; display fallback as "Meme"

**Derivation from APIs**:

```typescript
// From Klipy response
function fromKlipy(item: KlipyItem): MemeResult {
  return {
    id: item.id,
    title: item.title ?? "",
    thumbnailUrl: item.jpg.sm.url,
    previewUrl: item.gif.md.url,
    sourceApi: "klipy",
  };
}

// From Giphy response
function fromGiphy(item: GiphyItem): MemeResult {
  return {
    id: item.id,
    title: item.title ?? "",
    thumbnailUrl: item.images.fixed_width_still.url,
    previewUrl: item.images.fixed_width.url,
    sourceApi: "giphy",
  };
}
```

---

### UserPreferences

Persisted by Raycast's Preferences system — no manual storage code required.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxResults` | `string` (parsed as int) | `"9"` | Number of results per search (1–20). Stored as string due to Raycast textfield type. |

**Runtime parsing**:
```typescript
const limit = Math.min(20, Math.max(1, parseInt(preferences.maxResults, 10) || 9));
```

---

### SearchState

Transient UI state — not persisted.

| Field | Type | Description |
|-------|------|-------------|
| `query` | `string` | Current search keyword entered by user |
| `results` | `MemeResult[]` | Results from the most recent successful search |
| `isLoading` | `boolean` | True while a search request is in flight |
| `error` | `string \| null` | Human-readable error message if last search failed |

**State transitions**:

```
idle
  → (user types) → loading
  → (fetch success) → showing results
  → (fetch failure) → error state
  → (user clears input) → idle

showing results
  → (user selects meme) → copying (toast shown)
  → (copy success) → showing results (toast: success)
  → (copy failure) → showing results (toast: failure)
```

---

## Type Definitions (TypeScript)

```typescript
export interface MemeResult {
  id: string;
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  sourceApi: "klipy" | "giphy";
}

export interface UserPreferences {
  maxResults: string;
  klipyApiKey: string;
  giphyApiKey: string;
}

// Raw Klipy API shape (subset used)
export interface KlipyItem {
  id: string;
  title?: string;
  jpg: { sm: { url: string } };
  gif: { md: { url: string }; hd: { url: string } };
}

export interface KlipySearchResponse {
  data: KlipyItem[];
}

// Raw Giphy API shape (subset used)
export interface GiphyImages {
  fixed_width_still: { url: string };
  fixed_width: { url: string };
}

export interface GiphyItem {
  id: string;
  title?: string;
  images: GiphyImages;
}

export interface GiphySearchResponse {
  data: GiphyItem[];
}
```
