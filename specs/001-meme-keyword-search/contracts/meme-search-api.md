# Contract: Meme Search API Adapter

**Type**: Internal module contract (the adapter layer between Raycast UI and external meme APIs)
**Date**: 2026-03-24

---

## Interface

The extension exposes a single async function that the UI layer calls. It is API-agnostic —
the caller does not need to know whether results came from Klipy or Giphy.

```typescript
/**
 * Search for memes matching the given keyword.
 * Tries Klipy first; falls back to Giphy on error or empty results.
 *
 * @param query   - User-supplied keyword string (non-empty, trimmed)
 * @param limit   - Maximum number of results to return (1–20)
 * @returns       - Ordered array of MemeResult, ranked by source API relevance score
 * @throws        - SearchError if both APIs fail
 */
export async function searchMemes(query: string, limit: number): Promise<MemeResult[]>
```

---

## Behaviour Contract

| Scenario | Expected behaviour |
|----------|-------------------|
| `query` is empty or whitespace | Return `[]` immediately, do NOT call any API |
| `query` is non-empty, Klipy succeeds | Return up to `limit` MemeResult from Klipy |
| Klipy returns empty array | Fall through to Giphy |
| Klipy throws / returns non-2xx | Log warning, fall through to Giphy |
| Giphy also fails | Throw `SearchError` with human-readable message |
| `limit` outside 1–20 | Clamp to valid range silently |
| Network unavailable | Throw `SearchError("No internet connection")` |

---

## Error Type

```typescript
export class SearchError extends Error {
  constructor(
    message: string,            // Human-readable, safe to show in UI
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SearchError";
  }
}
```

---

## Clipboard Contract

```typescript
/**
 * Download the image at `url` and copy it to the system clipboard
 * as raw image data (not a URL), so it pastes inline in Slack / Messages.
 *
 * @param url   - HTTPS URL of the image to copy (JPEG or GIF)
 * @throws      - ClipboardError if download or clipboard write fails
 */
export async function copyImageToClipboard(url: string): Promise<void>

export class ClipboardError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ClipboardError";
  }
}
```

---

## External API Contracts (reference)

### Klipy — Meme Search

```
GET https://api.klipy.com/api/v1/{APP_KEY}/memes/search
  ?q={encoded_keyword}
  &per_page={limit}
  &page=1
  &customer_id=raycast_user

Authorization: APP_KEY embedded in URL path (no header needed)
```

**Success response** (`200 OK`):
```json
{
  "data": [
    {
      "id": "string",
      "title": "string | null",
      "jpg": { "sm": { "url": "https://static.klipy.com/..." } },
      "gif": {
        "md": { "url": "https://static.klipy.com/..." },
        "hd": { "url": "https://static.klipy.com/..." }
      }
    }
  ]
}
```

**Rate limit**: 100 req/min (free tier)
**API key source**: `https://partner.klipy.com/`

---

### Giphy — GIF Search (fallback)

```
GET https://api.giphy.com/v1/gifs/search
  ?api_key={GIPHY_KEY}
  &q={encoded_keyword}
  &limit={limit}
  &rating=g
  &lang=en
```

**Success response** (`200 OK`):
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "images": {
        "fixed_width_still": { "url": "https://media.giphy.com/..." },
        "fixed_width":       { "url": "https://media.giphy.com/..." }
      }
    }
  ]
}
```

**Rate limit**: 100 req/hour (free beta key)
**API key source**: `https://developers.giphy.com/`
