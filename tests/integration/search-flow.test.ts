/**
 * Integration test: keyword → API → MemeResult[] → clipboard write
 *
 * Covers the full data-flow boundary between searchMemes and copyImageToClipboard
 * without hitting real external APIs. fetch and fs are mocked at the boundary;
 * all internal mapping and error logic runs for real.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Clipboard } from "@raycast/api";

import { searchMemes } from "../../src/lib/api";
import { copyImageToClipboard } from "../../src/lib/clipboard";
import { SearchError } from "../../src/types";

jest.mock("fs");
jest.mock("os");
jest.mock("path");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedPath = path as jest.Mocked<typeof path>;

const KLIPY_KEY = "test-klipy-key";
const GIPHY_KEY = "test-giphy-key";

const KLIPY_ITEM = {
  id: "k1",
  title: "This is Fine",
  jpg: { sm: { url: "https://cdn.klipy.com/thumb.jpg" } },
  gif: { md: { url: "https://cdn.klipy.com/preview.gif" } },
};

const GIPHY_ITEM = {
  id: "g1",
  title: "Surprised Pikachu",
  images: {
    fixed_width_still: { url: "https://media.giphy.com/thumb.gif" },
    fixed_width: { url: "https://media.giphy.com/preview.gif" },
  },
};

function mockKlipySuccess() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: [KLIPY_ITEM] }),
  });
}

function mockKlipyEmptyThenGiphySuccess() {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [GIPHY_ITEM] }),
    });
}

function mockBothFail() {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
}

function mockImageDownload() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(4),
  });
  mockedOs.tmpdir.mockReturnValue("/tmp");
  mockedPath.join.mockImplementation((...args) => args.join("/"));
  mockedFs.writeFileSync.mockReturnValue(undefined);
}

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(99999);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("search → results (Klipy primary)", () => {
  it("maps Klipy response to MemeResult[]", async () => {
    mockKlipySuccess();
    const results = await searchMemes("this is fine", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "k1",
      title: "This is Fine",
      sourceApi: "klipy",
      thumbnailUrl: "https://cdn.klipy.com/thumb.jpg",
      previewUrl: "https://cdn.klipy.com/preview.gif",
    });
  });

  it("falls back to Giphy when Klipy returns empty", async () => {
    mockKlipyEmptyThenGiphySuccess();
    const results = await searchMemes("pikachu", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: "g1", sourceApi: "giphy" });
  });

  it("throws SearchError when both APIs fail", async () => {
    mockBothFail();
    await expect(searchMemes("test", 9, KLIPY_KEY, GIPHY_KEY)).rejects.toBeInstanceOf(SearchError);
  });
});

describe("results → clipboard (copy flow)", () => {
  it("downloads preview URL and calls Clipboard.copy with local file", async () => {
    mockKlipySuccess();
    const results = await searchMemes("this is fine", 9, KLIPY_KEY, GIPHY_KEY);
    expect(results.length).toBeGreaterThan(0);

    mockImageDownload();
    await copyImageToClipboard(results[0].previewUrl);

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("meme-99999"),
      expect.any(Buffer),
    );
    expect(Clipboard.copy).toHaveBeenCalledWith({
      file: expect.stringContaining("meme-99999"),
    });
  });
});
