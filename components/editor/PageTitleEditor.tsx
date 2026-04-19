"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Smile } from "lucide-react";
import { updatePage } from "@/lib/actions/pages";

type Props = {
  pageId: string;
  initialTitle: string;
  icon?: string | null;
};

export default function PageTitleEditor({ pageId, initialTitle, icon: initialIcon }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingIcon, setEditingIcon] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const [iconDraft, setIconDraft] = useState(initialIcon ?? "");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function commitTitle() {
    const newTitle = titleDraft.trim() || "Sin título";
    setTitle(newTitle);
    setEditingTitle(false);
    await updatePage({ id: pageId, title: newTitle });
    router.refresh();
  }

  async function commitIcon(value?: string) {
    const newIcon = (value ?? iconDraft).trim();
    setIcon(newIcon);
    setEditingIcon(false);
    await updatePage({ id: pageId, icon: newIcon || undefined });
    router.refresh();
  }

  function startEditTitle() {
    setTitleDraft(title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 20);
  }

  function startEditIcon() {
    setIconDraft(icon);
    setEditingIcon(true);
    setTimeout(() => iconInputRef.current?.focus(), 20);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-10">
      {/* Icono */}
      <div className="mb-3 flex items-center gap-3">
        {editingIcon ? (
          <div className="flex items-center gap-2">
            <input
              ref={iconInputRef}
              value={iconDraft}
              onChange={(e) => setIconDraft(e.target.value)}
              onBlur={() => commitIcon()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitIcon();
                if (e.key === "Escape") { setEditingIcon(false); setIconDraft(icon); }
              }}
              placeholder="Escribe un emoji…"
              maxLength={8}
              className="w-28 rounded border border-blue-400 bg-white px-2 py-1 text-center text-2xl outline-none dark:bg-gray-900"
              autoFocus
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); commitIcon(""); }}
              className="text-xs text-gray-400 underline hover:text-red-500"
            >
              Quitar
            </button>
          </div>
        ) : icon ? (
          <button
            onClick={startEditIcon}
            title="Cambiar icono"
            className="text-5xl transition-opacity hover:opacity-70"
          >
            {icon}
          </button>
        ) : (
          <button
            onClick={startEditIcon}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-gray-800"
          >
            <Smile size={14} />
            Añadir icono
          </button>
        )}
      </div>

      {/* Título */}
      {editingTitle ? (
        <input
          ref={titleInputRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(title); }
          }}
          className="w-full bg-transparent text-4xl font-bold text-gray-900 outline-none border-b-2 border-blue-400 dark:text-gray-100"
          autoFocus
        />
      ) : (
        <h1
          onClick={startEditTitle}
          title="Clic para renombrar"
          className="cursor-text text-4xl font-bold text-gray-900 transition-opacity hover:opacity-75 dark:text-gray-100"
        >
          {title}
        </h1>
      )}
    </div>
  );
}
