# Quickstart: Meme Finder Raycast Extension

**Branch**: `001-meme-keyword-search` | **Date**: 2026-03-24

---

## Prerequisites

- macOS with [Raycast](https://www.raycast.com/) installed (free)
- pnpm installed (`npm install -g pnpm`) — Node.js version is managed via `.npmrc`
- API keys (free, instant):
  - **Klipy**: Register at https://partner.klipy.com/ → Dashboard → Get App Key
  - **Giphy** (fallback): Register at https://developers.giphy.com/ → Create App → Beta Key

---

## 1. Scaffold the Extension

Open Raycast and run the **"Create Extension"** command:

1. Press `⌘ Space` → type "Create Extension" → hit `↵`
2. Choose template: **Grid**
3. Name: `meme-finder`
4. Set the output directory to this repo root

Then in terminal:

```bash
cd meme-finder
pnpm install
```

**Node.js version** is pinned automatically via `.npmrc`:

```ini
use-node-version=22.16.0
```

pnpm will download and use the correct version without any manual `nvm use`.

---

## 2. Configure API Keys

API keys are stored in Raycast Preferences — never hard-coded. Add them to `package.json`:

```json
{
  "preferences": [
    {
      "name": "klipyApiKey",
      "type": "password",
      "required": true,
      "title": "Klipy API Key",
      "description": "Get yours free at partner.klipy.com"
    },
    {
      "name": "giphyApiKey",
      "type": "password",
      "required": false,
      "title": "Giphy API Key (fallback)",
      "description": "Optional. Get at developers.giphy.com"
    },
    {
      "name": "maxResults",
      "type": "textfield",
      "required": false,
      "default": "9",
      "title": "Number of Results",
      "description": "Results per search (1–20). Default: 9"
    }
  ]
}
```

The first time you run the extension, Raycast will prompt you to fill in the keys.

---

## 3. Project Structure

```
meme-finder/
├── package.json          # Raycast manifest + dependencies
├── src/
│   ├── search-meme.tsx   # Main command (Grid UI)
│   ├── components/
│   │   └── MemeActions.tsx   # ActionPanel for copy / paste
│   ├── lib/
│   │   ├── api.ts            # searchMemes() — Klipy + Giphy adapter
│   │   └── clipboard.ts      # copyImageToClipboard()
│   └── types.ts              # MemeResult, UserPreferences, errors
├── assets/
│   └── extension-icon.png
└── specs/                # Design artifacts (this directory)
```

---

## 4. Prettier Setup

Add `.prettierrc.json` to the project root:

```json
{
  "trailingComma": "all",
  "singleQuote": false,
  "arrowParens": "always",
  "semi": true,
  "importOrder": [
    "^@raycast/(.*)$",
    "^react$",
    "<THIRD_PARTY_MODULES>",
    "^[./]"
  ],
  "importOrderSortSpecifiers": true,
  "plugins": ["@trivago/prettier-plugin-sort-imports"]
}
```

Add `.prettierignore`:

```
build
coverage
node_modules
```

Install the plugin and add a `format` script:

```bash
pnpm add -D prettier @trivago/prettier-plugin-sort-imports
```

In `package.json` scripts:

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

---

## 5. Run in Dev Mode

```bash
pnpm dev
```

Raycast picks up the extension automatically. Open Raycast, type the command name
(`meme-finder` or whatever you named it), and start searching.

---

## 6. Using the Extension

1. `⌘ Space` — open Raycast
2. Type `meme` (or your command name) → `↵` to open the extension
3. Type a keyword (e.g. `this is fine`) — results appear as a grid
4. Navigate with arrow keys or mouse
5. Press `↵` on any meme → copied to clipboard + toast confirms
6. Switch to Slack / macOS Messages → `⌘ V` → image pastes inline

**Optional actions** (shown in Action Panel `⌘ K`):
- **Copy** (`↵`) — copy image to clipboard
- **Paste** (`⌘ ↵`) — paste directly into focused app without clipboard

---

## 7. Configure N Results

`⌘ ,` in Raycast (or Raycast → Preferences → Extensions → Meme Finder) →
change **"Number of Results"** to any value between 1 and 20.

---

## 8. Build for Distribution

```bash
pnpm build
```

To submit to the Raycast store: https://developers.raycast.com/basics/publish-an-extension

For personal use, `npm run dev` is sufficient — the extension stays installed locally.
