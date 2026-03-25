export interface MemeResult {
  id: string;
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  sourceApi: "klipy" | "giphy";
}

export interface UserPreferences {
  klipyApiKey: string;
  giphyApiKey: string;
  maxResults: string;
}

// Raw Klipy API shapes (subset used)
export interface KlipyItem {
  id: string;
  title?: string;
  jpg: { sm: { url: string } };
  gif: { md: { url: string }; hd: { url: string } };
}

export interface KlipySearchResponse {
  data: KlipyItem[];
}

// Raw Giphy API shapes (subset used)
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

export class SearchError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SearchError";
  }
}

export class ClipboardError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ClipboardError";
  }
}
