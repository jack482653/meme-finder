# Meme Finder

A [Raycast](https://raycast.com) extension that lets you search for memes by keyword and copy them as inline images — so they paste directly into Slack, macOS Messages, or any messaging app without becoming links.

## Features

- **Keyword search** — type any phrase and get a grid of matching memes
- **Copy to clipboard** (`↵`) — copies the meme as a raw image so it pastes inline
- **Paste directly** (`⌘↵`) — pastes the meme into the currently focused app immediately
- **Configurable result count** — set how many results to show via Raycast Preferences
- **Klipy + Giphy fallback** — primary results from Klipy; falls back to Giphy automatically

## Requirements

- [Raycast](https://raycast.com) (macOS)
- A free [Klipy API key](https://partner.klipy.com) (required)
- A free [Giphy API key](https://developers.giphy.com) (optional, used as fallback)

## Installation

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/jack482653/meme-finder.git
   cd meme-finder
   pnpm install
   pnpm build
   ```

2. Open Raycast, run **Import Extension**, and point it at this directory.

3. Enter your API keys when prompted (or via `⌘,` → Meme Finder preferences).

## Development

```bash
pnpm dev      # live-reload in Raycast
pnpm build    # production build
pnpm test     # run unit + integration tests
pnpm lint     # ESLint
pnpm format   # Prettier
```

## Configuration

| Preference | Type | Default | Description |
|---|---|---|---|
| Klipy API Key | password | — | Required. Get yours free at [partner.klipy.com](https://partner.klipy.com) |
| Giphy API Key | password | — | Optional fallback. Get at [developers.giphy.com](https://developers.giphy.com) |
| Number of Results | text | `9` | Results per search (1–20) |
