"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updatePage } from "@/lib/actions/pages";

type Props = {
  pageId: string;
  initialTitle: string;
  icon?: string | null;
};

export default function PageTitleEditor({ pageId, initialTitle, icon }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function commit() {
    const newTitle = draft.trim() || "Sin título";
    setTitle(newTitle);
    setEditing(false);
    await updatePage({ id: pageId, title: newTitle });
    router.refresh();
  }

  function startEdit() {
    setDraft(title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 20);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-10">
      {icon && <div className="mb-2 text-5xl">{icon}</div>}

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setDraft(title); }
          }}
          className="w-full bg-transparent text-4xl font-bold text-gray-900 outline-none border-b-2 border-blue-400 dark:text-gray-100"
          autoFocus
        />
      ) : (
        <h1
          onClick={startEdit}
          title="Clic para renombrar"
          className="cursor-text text-4xl font-bold text-gray-900 hover:opacity-75 dark:text-gray-100"
        >
          {title}
        </h1>
      )}
    </div>
  );
}
