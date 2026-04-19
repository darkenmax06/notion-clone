"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { cn } from "@/lib/utils";

type SearchResult = {
  pages: Array<{ id: string; title: string; icon: string | null }>;
  databases: Array<{ id: string; title: string; icon: string | null }>;
};

type FlatResult = {
  id: string;
  title: string;
  icon: string | null;
  kind: "page" | "database";
};

export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ pages: [], databases: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useKeyboardShortcuts({
    "meta+k": (e) => { e.preventDefault(); setOpen(true); },
    "ctrl+k": (e) => { e.preventDefault(); setOpen(true); },
  });

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults({ pages: [], databases: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Búsqueda con debounce de 200 ms
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ pages: [], databases: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data: SearchResult = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const flat: FlatResult[] = [
    ...results.pages.map((p) => ({ ...p, kind: "page" as const })),
    ...results.databases.map((d) => ({ ...d, kind: "database" as const })),
  ];

  function navigate(item: FlatResult) {
    setOpen(false);
    router.push(item.kind === "page" ? `/page/${item.id}` : `/db/${item.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "Escape":
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (flat[selectedIndex]) navigate(flat[selectedIndex]);
        break;
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas y bases de datos…"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100 dark:placeholder-gray-500"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <p className="py-8 text-center text-sm text-gray-400">Buscando…</p>
          )}

          {!loading && query.length >= 2 && flat.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              Sin resultados para &quot;{query}&quot;
            </p>
          )}

          {!loading && flat.length > 0 && (
            <div className="py-2">
              {results.pages.length > 0 && (
                <section>
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Páginas
                  </p>
                  {results.pages.map((page, i) => (
                    <button
                      key={page.id}
                      onClick={() => navigate({ ...page, kind: "page" })}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50",
                        selectedIndex === i && "bg-gray-50"
                      )}
                    >
                      <span className="text-base">{page.icon ?? "📄"}</span>
                      <span className="flex-1 truncate text-gray-900">{page.title}</span>
                      <span className="text-xs text-gray-400">Página</span>
                    </button>
                  ))}
                </section>
              )}

              {results.databases.length > 0 && (
                <section>
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Bases de datos
                  </p>
                  {results.databases.map((db, i) => (
                    <button
                      key={db.id}
                      onClick={() => navigate({ ...db, kind: "database" })}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50",
                        selectedIndex === results.pages.length + i && "bg-gray-50"
                      )}
                    >
                      <span className="text-base">{db.icon ?? "🗄️"}</span>
                      <span className="flex-1 truncate text-gray-900">{db.title}</span>
                      <span className="text-xs text-gray-400">Base de datos</span>
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="py-6 text-center text-sm text-gray-400">
              <p>Empieza a escribir para buscar</p>
              <p className="mt-1 text-xs text-gray-300">
                ↑↓ navegar · Enter abrir · Esc cerrar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
