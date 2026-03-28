import "cross-fetch/polyfill";

import { Action, ActionPanel, Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

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

  const [pendingQuery, setPendingQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState<MemeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchIdRef = useRef(0);

  // Fired on every keystroke — only tracks what the user typed, no API call
  const handleSearchChange = useCallback((text: string) => {
    setPendingQuery(text);
    if (text.trim() === "") {
      setActiveQuery("");
      setResults([]);
      setIsLoading(false);
    }
  }, []);

  // Fired when the user explicitly confirms the search (↵ on EmptyView)
  const commitSearch = useCallback(() => {
    setActiveQuery(pendingQuery);
  }, [pendingQuery]);

  // Runs the actual API call whenever activeQuery is committed
  useEffect(() => {
    if (activeQuery.trim() === "") return;

    const currentId = ++searchIdRef.current;
    setIsLoading(true);
    setResults([]);

    searchMemes(activeQuery, limit, preferences.klipyApiKey, preferences.giphyApiKey)
      .then((memes) => {
        if (currentId !== searchIdRef.current) return;
        setResults(memes);
      })
      .catch((err) => {
        if (currentId !== searchIdRef.current) return;
        const message = err instanceof SearchError ? err.message : "Search failed";
        showToast({ style: Toast.Style.Failure, title: message });
      })
      .finally(() => {
        if (currentId === searchIdRef.current) setIsLoading(false);
      });
  }, [activeQuery, limit, preferences.klipyApiKey, preferences.giphyApiKey]);

  // User has typed something new that hasn't been searched yet
  const isSearchPending = pendingQuery.trim() !== "" && pendingQuery !== activeQuery;

  return (
    <Grid
      columns={getColumns(limit)}
      isLoading={isLoading}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search memes…"
    >
      {isSearchPending ? (
        <Grid.EmptyView
          title={`Search for "${pendingQuery}"`}
          description="Press ↵ to search"
          actions={
            <ActionPanel>
              <Action title="Search" onAction={commitSearch} />
            </ActionPanel>
          }
        />
      ) : results.length === 0 && !isLoading ? (
        <Grid.EmptyView title="Type to search" description="Enter a keyword then press ↵" />
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
