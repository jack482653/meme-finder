import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Clipboard } from "@raycast/api";

import { copyImageToClipboard, downloadToTemp, pasteImageDirectly } from "../../src/lib/clipboard";
import { ClipboardError } from "../../src/types";

jest.mock("fs");
jest.mock("os");
jest.mock("path");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedPath = path as jest.Mocked<typeof path>;

const FAKE_TMP = "/tmp";
const FAKE_URL = "https://example.com/meme.gif";
const FAKE_ARRAY_BUFFER = new ArrayBuffer(4);

function mockFetchSuccess(contentType = "image/gif") {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === "Content-Type" ? contentType : null) },
    arrayBuffer: async () => FAKE_ARRAY_BUFFER,
  });
}

function mockFetchFailure(status = 404) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    headers: { get: () => null },
    arrayBuffer: async () => FAKE_ARRAY_BUFFER,
  });
}

function mockFetchNetworkError() {
  global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));
}

beforeEach(() => {
  mockedOs.tmpdir.mockReturnValue(FAKE_TMP);
  mockedPath.join.mockImplementation((...args) => args.join("/"));
  mockedFs.writeFileSync.mockReturnValue(undefined);
  jest.spyOn(Date, "now").mockReturnValue(12345);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("downloadToTemp", () => {
  it("downloads image and writes to temp file, returning the path", async () => {
    mockFetchSuccess();
    const result = await downloadToTemp(FAKE_URL);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("meme-12345"),
      expect.any(Buffer),
    );
    expect(result).toContain("meme-12345");
  });

  it("throws ClipboardError on non-ok fetch response", async () => {
    mockFetchFailure(403);
    await expect(downloadToTemp(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
    await expect(downloadToTemp(FAKE_URL)).rejects.toThrow("403");
  });

  it("throws ClipboardError on network error", async () => {
    mockFetchNetworkError();
    await expect(downloadToTemp(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
    await expect(downloadToTemp(FAKE_URL)).rejects.toThrow("network error");
  });

  it("throws ClipboardError when writeFileSync throws", async () => {
    mockFetchSuccess();
    mockedFs.writeFileSync.mockImplementationOnce(() => {
      throw new Error("ENOSPC: no space left");
    });
    await expect(downloadToTemp(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
  });
});

describe("copyImageToClipboard", () => {
  it("downloads image and calls Clipboard.copy with file path", async () => {
    mockFetchSuccess();
    await copyImageToClipboard(FAKE_URL);
    expect(Clipboard.copy).toHaveBeenCalledWith({ file: expect.stringContaining("meme-12345") });
  });

  it("throws ClipboardError when Clipboard.copy throws", async () => {
    mockFetchSuccess();
    (Clipboard.copy as jest.Mock).mockRejectedValueOnce(new Error("Permission denied"));
    await expect(copyImageToClipboard(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
  });

  it("throws ClipboardError when download fails", async () => {
    mockFetchFailure(500);
    await expect(copyImageToClipboard(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
    expect(Clipboard.copy).not.toHaveBeenCalled();
  });
});

describe("pasteImageDirectly", () => {
  it("downloads image and calls Clipboard.paste with file path", async () => {
    mockFetchSuccess();
    await pasteImageDirectly(FAKE_URL);
    expect(Clipboard.paste).toHaveBeenCalledWith({ file: expect.stringContaining("meme-12345") });
  });

  it("throws ClipboardError when Clipboard.paste throws", async () => {
    mockFetchSuccess();
    (Clipboard.paste as jest.Mock).mockRejectedValueOnce(new Error("Paste failed"));
    await expect(pasteImageDirectly(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
  });
});
