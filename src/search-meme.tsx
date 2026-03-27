import "cross-fetch/polyfill";

import { Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useRef, useState } from "react";

import { searchMemes } from "./lib/api";
import { MemeActions } from "./components/MemeActions";
import { MemeResult, SearchError, UserPreferences } from "./types";

function getLimit(preferences: UserPreferences): number {
  return Math.min(20, Math.max(1, parseInt(preferences.maxResults, 10) || 9));
}

function getColumns(limit: number): number {
  if (limit <= 2) return limit;
  if (limit <= 6) return 3;
  if (limit <= 12) return 4;
  return 5;
}

export default function SearchMeme() {
  const preferences = getPreferenceValues<UserPreferences>();
  const limit = getLimit(preferences);

  const [results, setResults] = useState<MemeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track current search to ignore stale responses
  const searchIdRef = useRef(0);

  const handleSearch = useCallback(
    async (query: string) => {
      if (query.trim() === "") {
        setResults([]);
        setIsLoading(false);
        return;
      }

      const currentId = ++searchIdRef.current;
      setIsLoading(true);

      try {
        const memes = await searchMemes(
          query,
          limit,
          preferences.klipyApiKey,
          preferences.giphyApiKey,
        );
        if (currentId !== searchIdRef.current) return; // stale
        setResults(memes);
      } catch (err) {
        if (currentId !== searchIdRef.current) return;
        // Preserve previous results so the grid stays visible on transient errors
        const message = err instanceof SearchError ? err.message : "Search failed";
        await showToast({ style: Toast.Style.Failure, title: message });
      } finally {
        if (currentId === searchIdRef.current) setIsLoading(false);
      }
    },
    [limit, preferences.klipyApiKey, preferences.giphyApiKey],
  );

  return (
    <Grid
      columns={getColumns(limit)}
      isLoading={isLoading}
      onSearchTextChange={handleSearch}
      throttle
      searchBarPlaceholder="Search memes…"
    >
      {results.length === 0 && !isLoading ? (
        <Grid.EmptyView title="No results" description="Try a different keyword" />
      ) : (
        results.map((meme) => (
          <Grid.Item
            key={meme.id}
            title={meme.title || "Meme"}
            content={{ source: meme.thumbnailUrl }}
            actions={<MemeActions meme={meme} />}
          />
        ))
      )}
    </Grid>
  );
}
