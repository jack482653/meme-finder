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
export interface KlipyImageVariant {
  url: string;
  width: number;
  height: number;
}

interface KlipySizeVariants {
  gif?: KlipyImageVariant;
  webp: KlipyImageVariant;
  png: KlipyImageVariant;
}

export interface KlipyFile {
  hd: KlipySizeVariants;
  md?: KlipySizeVariants;
  sm: KlipySizeVariants;
}

export interface KlipyItem {
  id: number;
  slug: string;
  title?: string;
  file: KlipyFile;
}

export interface KlipySearchResponse {
  result: boolean;
  data: {
    data: KlipyItem[];
    has_next: boolean;
    current_page: number;
  };
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
