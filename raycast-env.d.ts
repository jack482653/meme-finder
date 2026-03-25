/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-meme` command */
  export type SearchMeme = ExtensionPreferences & {
  /** Klipy API Key - Get yours free at partner.klipy.com */
  "klipyApiKey": string,
  /** Giphy API Key (fallback) - Optional fallback. Get at developers.giphy.com */
  "giphyApiKey"?: string,
  /** Number of Results - Results per search (1–20). Default: 9 */
  "maxResults": string
}
}

declare namespace Arguments {
  /** Arguments passed to the `search-meme` command */
  export type SearchMeme = {}
}

