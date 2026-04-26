"use client";
// components/editor/BlockEditor.tsx
// CLIENT COMPONENT — BlockNote con dynamic import (ssr: false) y autosave debounce
// Importar este componente con dynamic() en las páginas para evitar SSR errors

import { useEffect, useRef, useCallback, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { Block } from "@blocknote/core";
import { savePageVersion, updatePage } from "@/lib/actions/pages";

type Props = {
  pageId: string;
  initialTitle?: string;
  initialContent?: Block[] | null;
  isFullWidth?: boolean;
  onTitleChange?: (title: string) => void;
};

// Tiempo de espera (ms) antes de guardar tras el último cambio
const AUTOSAVE_DELAY = 1000;
const VERSION_SAVE_INTERVAL = 30_000;

export default function BlockEditor({
  pageId,
  initialTitle,
  initialContent,
  isFullWidth = false,
  onTitleChange,
}: Props) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const lastVersionSavedAtRef = useRef<number>(0);
  // true cuando el usuario ya puso un título propio (distinto del default)
  const titleIsCustomRef = useRef(!!initialTitle && initialTitle !== "Sin título");

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains("dark"));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Inicializar BlockNote con contenido existente o vacío
  const editor = useCreateBlockNote({
    initialContent: initialContent ?? undefined,
  });

  // Autosave con debounce: cancela el timer anterior y programa uno nuevo
  const scheduleSave = useCallback(
    (blocks: Block[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        const serialized = JSON.stringify(blocks);

        // Evitar guardar si no hubo cambios reales
        if (serialized === lastSavedRef.current) return;
        lastSavedRef.current = serialized;

        // Extraer título del primer bloque de tipo heading o paragraph
        const firstBlock = blocks[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = firstBlock?.content as any;
        const titleText: string =
          Array.isArray(content)
            ? content
                .flatMap((c: { type: string; text?: string }) =>
                  c.type === "text" ? [c.text ?? ""] : []
                )
                .join("")
            : "";

        const shouldUpdateTitle = titleText && !titleIsCustomRef.current;
        const pageTitle = titleText || initialTitle || "Sin título";

        await updatePage({
          id: pageId,
          content: blocks,
          ...(shouldUpdateTitle && { title: titleText }),
        });

        if (shouldUpdateTitle && onTitleChange) {
          onTitleChange(titleText);
        }

        const now = Date.now();
        if (now - lastVersionSavedAtRef.current >= VERSION_SAVE_INTERVAL) {
          lastVersionSavedAtRef.current = now;
          await savePageVersion({
            pageId,
            title: pageTitle,
            content: blocks,
          });
        }
      }, AUTOSAVE_DELAY);
    },
    [pageId, onTitleChange, initialTitle]
  );

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className={`mx-auto w-full py-8 ${isFullWidth ? "max-w-full px-16" : "max-w-3xl px-4"}`}>
      <BlockNoteView
        editor={editor}
        onChange={() => scheduleSave(editor.document)}
        theme={isDark ? "dark" : "light"}
      />
    </div>
  );
}
