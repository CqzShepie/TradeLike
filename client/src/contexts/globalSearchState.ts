import { createContext } from "react";

export interface GlobalSearchResult {
  type: "customer" | "job" | "quote" | string;
  id: number;
  title: string;
  subtitle: string;
  body: string;
  url: string;
  sortDate?: string | null;
  score: number;
}

export interface GlobalSearchContextValue {
  isOpen: boolean;
  query: string;
  results: GlobalSearchResult[];
  isLoading: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
}

export const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);
