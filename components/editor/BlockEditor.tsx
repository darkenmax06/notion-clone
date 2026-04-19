"use client";
// components/editor/BlockEditor.tsx
// CLIENT COMPONENT — BlockNote con dynamic import (ssr: false) y autosave debounce
// Importar este componente con dynamic() en las páginas para evitar SSR errors

import { useEffect, useRef, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { Block } from "@blocknote/core";
import { updatePage } from "@/lib/actions/pages";

type Props = {
  pageId: string;
  initialContent?: Block[] | null;
  onTitleChange?: (title: string) => void;
};

// Tiempo de espera (ms) antes de guardar tras el último cambio
const AUTOSAVE_DELAY = 1000;

export default function BlockEditor({ pageId, initialContent, onTitleChange }: Props) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

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

        await updatePage({
          id: pageId,
          content: blocks,
          ...(titleText && { title: titleText }),
        });

        if (titleText && onTitleChange) {
          onTitleChange(titleText);
        }
      }, AUTOSAVE_DELAY);
    },
    [pageId, onTitleChange]
  );

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <BlockNoteView
        editor={editor}
        onChange={() => scheduleSave(editor.document)}
        theme="light"
      />
    </div>
  );
}
