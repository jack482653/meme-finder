import { searchMemes } from "../../src/lib/api";
import { SearchError } from "../../src/types";

const KLIPY_KEY = "test-klipy-key";
const GIPHY_KEY = "test-giphy-key";

const klipySuccessResponse = {
  result: true,
  data: {
    data: [
      {
        id: 1,
        slug: "this-is-fine",
        title: "This Is Fine",
        file: {
          sm: { webp: { url: "https://static.klipy.com/thumb.webp", width: 200, height: 200 }, png: { url: "", width: 200, height: 200 } },
          hd: { png: { url: "https://static.klipy.com/preview.png", width: 400, height: 400 }, webp: { url: "", width: 400, height: 400 } },
        },
      },
    ],
    has_next: false,
    current_page: 1,
  },
};

const giphySuccessResponse = {
  data: [
    {
      id: "giphy-1",
      title: "Surprised Pikachu",
      images: {
        fixed_width_still: { url: "https://media.giphy.com/still.png" },
        fixed_width: { url: "https://media.giphy.com/animated.gif" },
      },
    },
  ],
};

function mockFetchOnce(body: unknown, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function mockFetchError(message: string) {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("searchMemes", () => {
  it("returns [] without calling fetch when query is empty", async () => {
    const results = await searchMemes("", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns [] without calling fetch when query is whitespace", async () => {
    const results = await searchMemes("   ", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns mapped MemeResult[] from Klipy on success", async () => {
    mockFetchOnce(klipySuccessResponse);
    const results = await searchMemes("this is fine", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "1",
      title: "This Is Fine",
      thumbnailUrl: "https://static.klipy.com/thumb.webp",
      previewUrl: "https://static.klipy.com/preview.png",
      sourceApi: "klipy",
    });
  });

  it("falls back to Giphy when Klipy returns empty array", async () => {
    mockFetchOnce({ result: true, data: { data: [], has_next: false, current_page: 1 } }); // Klipy empty
    mockFetchOnce(giphySuccessResponse); // Giphy success
    const results = await searchMemes("pikachu", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results[0].sourceApi).toBe("giphy");
    expect(results[0].id).toBe("giphy-1");
  });

  it("falls back to Giphy when Klipy throws a network error", async () => {
    mockFetchError("Network error");
    mockFetchOnce(giphySuccessResponse);
    const results = await searchMemes("pikachu", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results[0].sourceApi).toBe("giphy");
  });

  it("falls back to Giphy when Klipy returns non-2xx", async () => {
    mockFetchOnce({}, 500); // Klipy 500
    mockFetchOnce(giphySuccessResponse);
    const results = await searchMemes("pikachu", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results[0].sourceApi).toBe("giphy");
  });

  it("throws SearchError when both APIs fail", async () => {
    mockFetchError("Klipy down");
    mockFetchError("Giphy down");
    await expect(searchMemes("meme", 9, KLIPY_KEY, GIPHY_KEY)).rejects.toBeInstanceOf(SearchError);
  });

  it("returns [] when Klipy is empty and Giphy is not configured", async () => {
    mockFetchOnce({ result: true, data: { data: [], has_next: false, current_page: 1 } }); // Klipy empty
    const results = await searchMemes("meme", 9, KLIPY_KEY, "");
    expect(results).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns [] when both APIs return empty results", async () => {
    mockFetchOnce({ result: true, data: { data: [], has_next: false, current_page: 1 } }); // Klipy empty
    mockFetchOnce({ data: [] }); // Giphy empty
    const results = await searchMemes("meme", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results).toEqual([]);
  });

  it("clamps limit=0 to 1", async () => {
    mockFetchOnce(klipySuccessResponse);
    await searchMemes("meme", 0, KLIPY_KEY, GIPHY_KEY);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("per_page=1");
  });

  it("clamps limit=99 to 20", async () => {
    mockFetchOnce(klipySuccessResponse);
    await searchMemes("meme", 99, KLIPY_KEY, GIPHY_KEY);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("per_page=20");
  });

  it("handles missing Klipy key by skipping to Giphy", async () => {
    mockFetchOnce(giphySuccessResponse);
    const results = await searchMemes("meme", 9, "", GIPHY_KEY);
    expect(results[0].sourceApi).toBe("giphy");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
