import { Action, ActionPanel, Toast, showToast } from "@raycast/api";

import { copyImageToClipboard, pasteImageDirectly } from "../lib/clipboard";
import { MemeResult } from "../types";

interface MemeActionsProps {
  meme: MemeResult;
}

export function MemeActions({ meme }: MemeActionsProps) {
  async function handleCopy() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Copying meme…" });
    try {
      await copyImageToClipboard(meme.previewUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Copied to clipboard!";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Copy failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function handlePaste() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Pasting meme…" });
    try {
      await pasteImageDirectly(meme.previewUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Pasted!";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Paste failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <ActionPanel>
      <Action title="Copy Meme" onAction={handleCopy} />
      <Action
        title="Paste Meme Directly"
        onAction={handlePaste}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
      />
    </ActionPanel>
  );
}
