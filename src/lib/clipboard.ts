import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

import { closeMainWindow } from "@raycast/api";

import { ClipboardError } from "../types";

const execFileAsync = promisify(execFile);

function extensionFromUrl(url: string): string {
  const match = url.split("?")[0].match(/\.(\w+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

/**
 * Download the image at `url` to a temporary file and return the local path.
 */
export async function downloadToTemp(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new ClipboardError("Failed to download meme image: network error", err);
  }

  if (!response.ok) {
    throw new ClipboardError(`Failed to download meme image: server returned ${response.status}`);
  }

  const contentType = response.headers.get("Content-Type");
  const ext = contentType?.split("/")?.[1]?.split("+")?.[0] ?? extensionFromUrl(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `meme-${Date.now()}.${ext}`);

  try {
    fs.writeFileSync(tmpPath, buffer);
  } catch (err) {
    throw new ClipboardError("Failed to write meme image to disk", err);
  }

  return tmpPath;
}

/**
 * Put raw image data on the macOS clipboard so apps can paste it inline.
 * GIF and PNG are written directly; other formats (WebP, etc.) are converted
 * to PNG via sips first.
 * Returns a cleanup path if a temporary conversion file was created.
 */
async function putImageOnClipboard(srcPath: string): Promise<string | undefined> {
  const ext = srcPath.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "gif") {
    const script = `set the clipboard to (read (POSIX file ${JSON.stringify(srcPath)}) as «class GIFf»)`;
    await execFileAsync("osascript", ["-e", script]);
    return undefined;
  }

  if (ext === "png") {
    const script = `set the clipboard to (read (POSIX file ${JSON.stringify(srcPath)}) as «class PNGf»)`;
    await execFileAsync("osascript", ["-e", script]);
    return undefined;
  }

  // WebP and other formats: convert to PNG first
  const pngPath = `${srcPath}.png`;
  await execFileAsync("sips", ["-s", "format", "png", srcPath, "--out", pngPath]);
  const script = `set the clipboard to (read (POSIX file ${JSON.stringify(pngPath)}) as «class PNGf»)`;
  await execFileAsync("osascript", ["-e", script]);
  return pngPath;
}

/**
 * Download the image at `url` and copy it to the system clipboard as raw
 * PNG data so it pastes inline in Slack and macOS Messages.
 *
 * @throws ClipboardError if download or clipboard write fails
 */
export async function copyImageToClipboard(url: string): Promise<void> {
  const tmpPath = await downloadToTemp(url);
  let convertedPath: string | undefined;

  try {
    convertedPath = await putImageOnClipboard(tmpPath);
  } catch (err) {
    throw new ClipboardError("Failed to copy meme to clipboard", err);
  } finally {
    fs.unlink(tmpPath, () => {});
    if (convertedPath) fs.unlink(convertedPath, () => {});
  }
}

/**
 * Download the image at `url` and paste it directly into the focused app.
 *
 * @throws ClipboardError if download or paste fails
 */
export async function pasteImageDirectly(url: string): Promise<void> {
  const tmpPath = await downloadToTemp(url);
  let convertedPath: string | undefined;

  try {
    await closeMainWindow();
    convertedPath = await putImageOnClipboard(tmpPath);
    // Simulate ⌘V in the now-focused app
    await execFileAsync("osascript", [
      "-e",
      'tell application "System Events" to keystroke "v" using {command down}',
    ]);
  } catch (err) {
    throw new ClipboardError("Failed to paste meme", err);
  } finally {
    fs.unlink(tmpPath, () => {});
    if (convertedPath) fs.unlink(convertedPath, () => {});
  }
}
