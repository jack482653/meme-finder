import {
  GiphyItem,
  GiphySearchResponse,
  KlipyItem,
  KlipySearchResponse,
  MemeResult,
  SearchError,
} from "../types";

function fromKlipy(item: KlipyItem): MemeResult {
  return {
    id: item.id,
    title: item.title ?? "",
    thumbnailUrl: item.jpg.sm.url,
    previewUrl: item.gif.md.url,
    sourceApi: "klipy",
  };
}

function fromGiphy(item: GiphyItem): MemeResult {
  return {
    id: item.id,
    title: item.title ?? "",
    thumbnailUrl: item.images.fixed_width_still.url,
    previewUrl: item.images.fixed_width.url,
    sourceApi: "giphy",
  };
}

async function searchKlipy(query: string, limit: number, apiKey: string): Promise<MemeResult[]> {
  const url =
    `https://api.klipy.com/api/v1/${encodeURIComponent(apiKey)}/memes/search` +
    `?q=${encodeURIComponent(query)}&per_page=${limit}&page=1&customer_id=raycast_user`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Klipy responded with ${response.status}`);
  }

  const json = (await response.json()) as KlipySearchResponse;
  return (json.data ?? []).map(fromKlipy);
}

async function searchGiphy(query: string, limit: number, apiKey: string): Promise<MemeResult[]> {
  const url =
    `https://api.giphy.com/v1/gifs/search` +
    `?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g&lang=en`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Giphy responded with ${response.status}`);
  }

  const json = (await response.json()) as GiphySearchResponse;
  return (json.data ?? []).map(fromGiphy);
}

/**
 * Search for memes matching the given keyword.
 * Tries Klipy first; falls back to Giphy on error or empty results.
 *
 * @param query        - User-supplied keyword string
 * @param limit        - Maximum number of results (clamped to 1–20)
 * @param klipyApiKey  - Klipy API key
 * @param giphyApiKey  - Giphy API key (may be empty string)
 * @returns Ordered array of MemeResult ranked by source API relevance
 * @throws SearchError if both APIs fail
 */
export async function searchMemes(
  query: string,
  limit: number,
  klipyApiKey: string,
  giphyApiKey: string,
): Promise<MemeResult[]> {
  if (query.trim() === "") return [];

  const clampedLimit = Math.min(20, Math.max(1, limit));

  // Primary: Klipy
  if (klipyApiKey) {
    try {
      const results = await searchKlipy(query, clampedLimit, klipyApiKey);
      if (results.length > 0) return results;
    } catch (err) {
      console.warn("Klipy search failed, falling back to Giphy:", err);
    }
  }

  // Fallback: Giphy
  if (giphyApiKey) {
    try {
      // Return Giphy results directly (including empty array — empty is not an error)
      return await searchGiphy(query, clampedLimit, giphyApiKey);
    } catch (err) {
      throw new SearchError("Could not load memes. Check your connection and API keys.", err);
    }
  }

  // Klipy returned no results (or failed) and Giphy is not configured — return empty, not an error
  return [];
}
