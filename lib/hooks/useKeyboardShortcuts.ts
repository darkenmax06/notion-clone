"use client";

import { useEffect, useRef } from "react";

type ShortcutHandler = (e: KeyboardEvent) => void;
type ShortcutMap = Record<string, ShortcutHandler>;

/**
 * Registra atajos de teclado globales en document.
 * Las claves del mapa siguen el formato: "meta+k", "ctrl+k", "shift+s", etc.
 * Usa ref para evitar stale closures al actualizar handlers entre renders.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const parts: string[] = [];
      if (e.metaKey) parts.push("meta");
      if (e.ctrlKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      parts.push(e.key.toLowerCase());
      const key = parts.join("+");

      shortcutsRef.current[key]?.(e);
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
