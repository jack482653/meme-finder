import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

import { Clipboard, closeMainWindow } from "@raycast/api";

import { ClipboardError } from "../types";

const execFileAsync = promisify(execFile);

// How long to keep temp GIF files on disk after clipboard copy so the
// destination app (e.g. Slack) has time to read the file before cleanup.
const GIF_CLEANUP_DELAY_MS = 60_000;

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
 * Copy a static image (PNG / WebP / etc.) to the clipboard as raw image data
 * so it pastes inline in apps. WebP is converted to PNG via sips first.
 * Returns a converted file path if one was created (caller must clean up).
 */
async function copyStaticImageToClipboard(srcPath: string): Promise<string | undefined> {
  const ext = srcPath.split(".").pop()?.toLowerCase() ?? "";

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
 * Download the image at `url` and copy it to the system clipboard.
 *
 * - GIF: copied as a file reference so Slack/Messages upload it as animated GIF.
 *   The temp file is deleted after a delay to give the destination app time to
 *   read it.
 * - PNG / other: copied as raw image data for true inline paste.
 *
 * @throws ClipboardError if download or clipboard write fails
 */
export async function copyImageToClipboard(url: string): Promise<void> {
  const tmpPath = await downloadToTemp(url);
  const ext = tmpPath.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "gif") {
    try {
      await Clipboard.copy({ file: tmpPath });
    } catch (err) {
      fs.unlink(tmpPath, () => {});
      throw new ClipboardError("Failed to copy meme to clipboard", err);
    }
    // Delay cleanup so the destination app can read the file before it's gone
    setTimeout(() => fs.unlink(tmpPath, () => {}), GIF_CLEANUP_DELAY_MS);
    return;
  }

  let convertedPath: string | undefined;
  try {
    convertedPath = await copyStaticImageToClipboard(tmpPath);
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
  const ext = tmpPath.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "gif") {
    try {
      await Clipboard.copy({ file: tmpPath });
      await closeMainWindow();
      await execFileAsync("osascript", [
        "-e",
        'tell application "System Events" to keystroke "v" using {command down}',
      ]);
    } catch (err) {
      fs.unlink(tmpPath, () => {});
      throw new ClipboardError("Failed to paste meme", err);
    }
    setTimeout(() => fs.unlink(tmpPath, () => {}), GIF_CLEANUP_DELAY_MS);
    return;
  }

  let convertedPath: string | undefined;
  try {
    await closeMainWindow();
    convertedPath = await copyStaticImageToClipboard(tmpPath);
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
