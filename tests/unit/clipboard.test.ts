import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { closeMainWindow } from "@raycast/api";

import { copyImageToClipboard, downloadToTemp, pasteImageDirectly } from "../../src/lib/clipboard";
import { ClipboardError } from "../../src/types";

jest.mock("child_process", () => ({
  execFile: jest.fn((_cmd: string, _args: string[], cb: (err: Error | null, res: string) => void) =>
    cb(null, ""),
  ),
}));
jest.mock("fs");
jest.mock("os");
jest.mock("path");

const mockedExecFile = childProcess.execFile as unknown as jest.Mock;
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
  mockedExecFile.mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null, res: string) => void) => cb(null, ""),
  );
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
  it("converts to PNG via sips and copies via osascript, then cleans up both temp files", async () => {
    mockFetchSuccess();
    await copyImageToClipboard(FAKE_URL);

    expect(mockedExecFile).toHaveBeenCalledWith(
      "sips",
      expect.arrayContaining(["-s", "format", "png"]),
      expect.any(Function),
    );
    expect(mockedExecFile).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-e"]),
      expect.any(Function),
    );
    // Both tmpPath and pngPath cleaned up
    expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
  });

  it("cleans up temp files even when osascript throws", async () => {
    mockFetchSuccess();
    mockedExecFile
      .mockImplementationOnce((_cmd: string, _args: string[], cb: (err: Error | null, res: string) => void) =>
        cb(null, ""),
      ) // sips succeeds
      .mockImplementationOnce((_cmd: string, _args: string[], cb: (err: Error | null) => void) =>
        cb(new Error("osascript error")),
      ); // osascript fails
    await expect(copyImageToClipboard(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
    expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
  });

  it("throws ClipboardError when download fails", async () => {
    mockFetchFailure(500);
    await expect(copyImageToClipboard(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
    expect(mockedExecFile).not.toHaveBeenCalled();
  });
});

describe("pasteImageDirectly", () => {
  it("closes window, puts image on clipboard and simulates paste, then cleans up", async () => {
    mockFetchSuccess();
    await pasteImageDirectly(FAKE_URL);

    expect(closeMainWindow).toHaveBeenCalled();
    expect(mockedExecFile).toHaveBeenCalledWith(
      "sips",
      expect.arrayContaining(["-s", "format", "png"]),
      expect.any(Function),
    );
    expect(mockedExecFile).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-e"]),
      expect.any(Function),
    );
    expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
  });

  it("cleans up temp files even when osascript throws", async () => {
    mockFetchSuccess();
    mockedExecFile
      .mockImplementationOnce((_cmd: string, _args: string[], cb: (err: Error | null, res: string) => void) =>
        cb(null, ""),
      ) // sips succeeds
      .mockImplementationOnce((_cmd: string, _args: string[], cb: (err: Error | null) => void) =>
        cb(new Error("paste failed")),
      ); // osascript fails
    await expect(pasteImageDirectly(FAKE_URL)).rejects.toBeInstanceOf(ClipboardError);
    expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
  });
});
