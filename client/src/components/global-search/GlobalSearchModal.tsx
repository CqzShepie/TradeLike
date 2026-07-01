import { AlertCircle, Briefcase, FileText, Loader2, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { GlobalSearchResult } from "../../contexts/globalSearchState";

export interface GlobalSearchModalProps {
  isOpen: boolean;
  query: string;
  results: GlobalSearchResult[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (result: GlobalSearchResult) => void;
}

export function GlobalSearchModal({
  isOpen,
  query,
  results,
  isLoading,
  error,
  onClose,
  onQueryChange,
  onSelect,
}: GlobalSearchModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex(current => Math.min(current + 1, Math.max(results.length - 1, 0)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(current => Math.max(current - 1, 0));
        return;
      }

      if (event.key === "Enter" && results[selectedIndex]) {
        event.preventDefault();
        onSelect(results[selectedIndex]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onSelect, results, selectedIndex]);

  const emptyState = useMemo(() => {
    if (isLoading || error || query.trim().length < 2 || results.length > 0) {
      return null;
    }

    return (
      <div className="px-6 py-8 text-center text-sm text-slate-500">
        No matches found
      </div>
    );
  }, [error, isLoading, query, results.length]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 pt-20 backdrop-blur-sm"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-label="Global search"
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-14 items-center gap-3 border-b border-slate-200 px-4">
          <Search aria-hidden="true" className="h-5 w-5 text-slate-500" />
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Search customers, jobs, and quotes"
          />
          {isLoading ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-600" />
          ) : null}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close search"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                index === selectedIndex ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => onSelect(result)}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                {getResultIcon(result.type)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {result.title}
                  </span>
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {getTypeLabel(result.type)}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm text-slate-600">
                  {result.subtitle}
                </span>
                {result.body ? (
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">
                    {result.body}
                  </span>
                ) : null}
              </span>
            </button>
          ))}

          {emptyState}
        </div>
      </section>
    </div>
  );
}

function getTypeLabel(type: string) {
  switch (type) {
    case "customer":
      return "Customer";
    case "job":
      return "Job";
    case "quote":
      return "Quote";
    default:
      return "Result";
  }
}

function getResultIcon(type: string) {
  switch (type) {
    case "customer":
      return <UserRound aria-hidden="true" className="h-4 w-4" />;
    case "job":
      return <Briefcase aria-hidden="true" className="h-4 w-4" />;
    case "quote":
      return <FileText aria-hidden="true" className="h-4 w-4" />;
    default:
      return <Search aria-hidden="true" className="h-4 w-4" />;
  }
}
