"use client";

import SearchModal from "./search/SearchModal";
import DarkModeToggle from "./ui/DarkModeToggle";

export default function GlobalProviders() {
  return (
    <>
      <SearchModal />
      <DarkModeToggle />
    </>
  );
}
