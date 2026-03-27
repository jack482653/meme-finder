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

/** Convert any image file to PNG using macOS sips. Returns the new path. */
async function toPng(srcPath: string): Promise<string> {
  const pngPath = `${srcPath}.png`;
  await execFileAsync("sips", ["-s", "format", "png", srcPath, "--out", pngPath]);
  return pngPath;
}

/** Put raw PNG image data on the macOS clipboard so apps can paste it inline. */
async function putImageOnClipboard(pngPath: string): Promise<void> {
  const script = `set the clipboard to (read (POSIX file ${JSON.stringify(pngPath)}) as «class PNGf»)`;
  await execFileAsync("osascript", ["-e", script]);
}

/**
 * Download the image at `url` and copy it to the system clipboard as raw
 * PNG data so it pastes inline in Slack and macOS Messages.
 *
 * @throws ClipboardError if download or clipboard write fails
 */
export async function copyImageToClipboard(url: string): Promise<void> {
  const tmpPath = await downloadToTemp(url);
  let pngPath: string | undefined;

  try {
    pngPath = await toPng(tmpPath);
    await putImageOnClipboard(pngPath);
  } catch (err) {
    throw new ClipboardError("Failed to copy meme to clipboard", err);
  } finally {
    fs.unlink(tmpPath, () => {});
    if (pngPath) fs.unlink(pngPath, () => {});
  }
}

/**
 * Download the image at `url` and paste it directly into the focused app.
 *
 * @throws ClipboardError if download or paste fails
 */
export async function pasteImageDirectly(url: string): Promise<void> {
  const tmpPath = await downloadToTemp(url);
  let pngPath: string | undefined;

  try {
    pngPath = await toPng(tmpPath);
    await closeMainWindow();
    // Put image on clipboard then simulate ⌘V in the now-focused app
    const script = [
      `set the clipboard to (read (POSIX file ${JSON.stringify(pngPath)}) as «class PNGf»)`,
      `delay 0.1`,
      `tell application "System Events" to keystroke "v" using {command down}`,
    ].join("\n");
    await execFileAsync("osascript", ["-e", script]);
  } catch (err) {
    throw new ClipboardError("Failed to paste meme", err);
  } finally {
    fs.unlink(tmpPath, () => {});
    if (pngPath) fs.unlink(pngPath, () => {});
  }
}
