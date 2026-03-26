import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Clipboard } from "@raycast/api";

import { ClipboardError } from "../types";

function extensionFromUrl(url: string): string {
  const match = url.split("?")[0].match(/\.(\w+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

/**
 * Download the image at `url` to a temporary file and return the local path.
 * Used for both clipboard copy and Quick Look preview.
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
 * Download the image at `url` and copy it to the system clipboard as raw
 * image data (not a URL), so it pastes inline in Slack and macOS Messages.
 *
 * @throws ClipboardError if download or clipboard write fails
 */
export async function copyImageToClipboard(url: string): Promise<void> {
  const tmpPath = await downloadToTemp(url);

  try {
    await Clipboard.copy({ file: tmpPath });
  } catch (err) {
    throw new ClipboardError("Failed to copy meme to clipboard", err);
  }
}

/**
 * Download the image at `url` and paste it directly into the focused app,
 * bypassing the clipboard.
 *
 * @throws ClipboardError if download or paste fails
 */
export async function pasteImageDirectly(url: string): Promise<void> {
  const tmpPath = await downloadToTemp(url);

  try {
    await Clipboard.paste({ file: tmpPath });
  } catch (err) {
    throw new ClipboardError("Failed to paste meme", err);
  }
}
