import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { GlobalSearchModal } from "../components/global-search";
import { apiClient } from "../services/apiClient";
import { GlobalSearchContext } from "./globalSearchState";
import type { GlobalSearchContextValue, GlobalSearchResult } from "./globalSearchState";

interface SearchResponse {
  query: string;
  types: string[];
  elasticPowered: boolean;
  results: GlobalSearchResult[];
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const search = useCallback(async (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (trimmedQuery.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<SearchResponse>(
        `/search?q=${encodeURIComponent(trimmedQuery)}&types=customers,jobs,quotes`
      );

      if (requestIdRef.current === requestId) {
        setResults(response.results);
      }
    } catch (searchError) {
      if (requestIdRef.current === requestId) {
        setResults([]);
        setError(searchError instanceof Error ? searchError.message : "Search is unavailable.");
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void search(query);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [isOpen, query, search]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(current => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo<GlobalSearchContextValue>(() => ({
    isOpen,
    query,
    results,
    isLoading,
    error,
    open,
    close,
    setQuery,
    search,
  }), [close, error, isLoading, isOpen, open, query, results, search]);

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <GlobalSearchModal
        isOpen={isOpen}
        query={query}
        results={results}
        isLoading={isLoading}
        error={error}
        onClose={close}
        onQueryChange={setQuery}
        onSelect={result => {
          close();
          window.location.assign(result.url);
        }}
      />
    </GlobalSearchContext.Provider>
  );
}
