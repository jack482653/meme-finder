import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Clipboard, closeMainWindow } from "@raycast/api";

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
const FAKE_GIF_URL = "https://example.com/meme.gif";
const FAKE_PNG_URL = "https://example.com/meme.png";
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
  jest.useFakeTimers();
  mockedExecFile.mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null, res: string) => void) => cb(null, ""),
  );
  mockedOs.tmpdir.mockReturnValue(FAKE_TMP);
  mockedPath.join.mockImplementation((...args) => args.join("/"));
  mockedFs.writeFileSync.mockReturnValue(undefined);
  jest.spyOn(Date, "now").mockReturnValue(12345);
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetAllMocks();
});

describe("downloadToTemp", () => {
  it("downloads image and writes to temp file, returning the path", async () => {
    mockFetchSuccess();
    const result = await downloadToTemp(FAKE_GIF_URL);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("meme-12345"),
      expect.any(Buffer),
    );
    expect(result).toContain("meme-12345");
  });

  it("throws ClipboardError on non-ok fetch response", async () => {
    mockFetchFailure(403);
    await expect(downloadToTemp(FAKE_GIF_URL)).rejects.toBeInstanceOf(ClipboardError);
    await expect(downloadToTemp(FAKE_GIF_URL)).rejects.toThrow("403");
  });

  it("throws ClipboardError on network error", async () => {
    mockFetchNetworkError();
    await expect(downloadToTemp(FAKE_GIF_URL)).rejects.toBeInstanceOf(ClipboardError);
    await expect(downloadToTemp(FAKE_GIF_URL)).rejects.toThrow("network error");
  });

  it("throws ClipboardError when writeFileSync throws", async () => {
    mockFetchSuccess();
    mockedFs.writeFileSync.mockImplementationOnce(() => {
      throw new Error("ENOSPC: no space left");
    });
    await expect(downloadToTemp(FAKE_GIF_URL)).rejects.toBeInstanceOf(ClipboardError);
  });
});

describe("copyImageToClipboard — GIF", () => {
  it("uses Clipboard.copy({ file }) and schedules delayed cleanup", async () => {
    mockFetchSuccess("image/gif");
    await copyImageToClipboard(FAKE_GIF_URL);

    expect(Clipboard.copy).toHaveBeenCalledWith({ file: expect.stringContaining("meme-12345.gif") });
    // No immediate unlink
    expect(mockedFs.unlink).not.toHaveBeenCalled();
    // After delay, cleanup runs
    jest.runAllTimers();
    expect(mockedFs.unlink).toHaveBeenCalledWith(
      expect.stringContaining("meme-12345.gif"),
      expect.any(Function),
    );
  });

  it("cleans up immediately if Clipboard.copy throws", async () => {
    mockFetchSuccess("image/gif");
    (Clipboard.copy as jest.Mock).mockRejectedValueOnce(new Error("denied"));
    await expect(copyImageToClipboard(FAKE_GIF_URL)).rejects.toBeInstanceOf(ClipboardError);
    expect(mockedFs.unlink).toHaveBeenCalledWith(
      expect.stringContaining("meme-12345.gif"),
      expect.any(Function),
    );
  });
});

describe("copyImageToClipboard — PNG", () => {
  it("copies PNG via osascript inline, cleans up immediately", async () => {
    mockFetchSuccess("image/png");
    await copyImageToClipboard(FAKE_PNG_URL);

    expect(Clipboard.copy).not.toHaveBeenCalled();
    expect(mockedExecFile).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-e"]),
      expect.any(Function),
    );
    expect(mockedFs.unlink).toHaveBeenCalledTimes(1);
  });

  it("converts WebP to PNG via sips before copying", async () => {
    mockFetchSuccess("image/webp");
    await copyImageToClipboard("https://example.com/meme.webp");

    expect(mockedExecFile).toHaveBeenCalledWith(
      "sips",
      expect.arrayContaining(["-s", "format", "png"]),
      expect.any(Function),
    );
    expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
  });

  it("throws ClipboardError when download fails", async () => {
    mockFetchFailure(500);
    await expect(copyImageToClipboard(FAKE_GIF_URL)).rejects.toBeInstanceOf(ClipboardError);
    expect(Clipboard.copy).not.toHaveBeenCalled();
  });
});

describe("pasteImageDirectly — GIF", () => {
  it("copies file, closes window, simulates ⌘V, schedules cleanup", async () => {
    mockFetchSuccess("image/gif");
    await pasteImageDirectly(FAKE_GIF_URL);

    expect(Clipboard.copy).toHaveBeenCalledWith({ file: expect.stringContaining("meme-12345.gif") });
    expect(closeMainWindow).toHaveBeenCalled();
    expect(mockedExecFile).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-e"]),
      expect.any(Function),
    );
    expect(mockedFs.unlink).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(mockedFs.unlink).toHaveBeenCalledTimes(1);
  });
});

describe("pasteImageDirectly — PNG", () => {
  it("copies via osascript, closes window, simulates ⌘V, cleans up", async () => {
    mockFetchSuccess("image/png");
    await pasteImageDirectly(FAKE_PNG_URL);

    expect(Clipboard.copy).not.toHaveBeenCalled();
    expect(closeMainWindow).toHaveBeenCalled();
    const osascriptCalls = mockedExecFile.mock.calls.filter((c) => c[0] === "osascript");
    expect(osascriptCalls).toHaveLength(2); // clipboard write + keystroke
    expect(mockedFs.unlink).toHaveBeenCalledTimes(1);
  });
});
