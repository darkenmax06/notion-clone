"use client";

import SearchModal from "./search/SearchModal";

/**
 * Wrapper client-side para providers y UI global.
 * Importado desde el layout (Server Component) — Next.js lo hidrata en cliente.
 */
export default function GlobalProviders() {
  return (
    <>
      <SearchModal />
    </>
  );
}
