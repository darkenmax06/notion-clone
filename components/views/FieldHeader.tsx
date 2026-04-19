"use client";

import { useState, useRef, useEffect } from "react";
import { FieldType } from "@prisma/client";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { FieldTypeIcon } from "./FieldTypeIcon";
import { cn } from "@/lib/utils";

type Props = {
  field: { id: string; name: string; type: FieldType };
  onRename: (fieldId: string, name: string) => void;
  onDelete: (fieldId: string) => void;
};

export function FieldHeader({ field, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== field.name) onRename(field.id, trimmed);
    else setDraft(field.name);
    setEditing(false);
  }

  return (
    <th className="group relative whitespace-nowrap border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
      <div className="flex items-center gap-1.5">
        <FieldTypeIcon type={field.type} />

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setDraft(field.name); setEditing(false); }
            }}
            className="w-full border-0 bg-transparent text-xs text-gray-900 outline-none dark:text-gray-100"
          />
        ) : (
          <span className="flex-1 truncate">{field.name}</span>
        )}

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
              "opacity-0 group-hover:opacity-100",
            )}
          >
            <MoreHorizontal size={12} />
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-5 z-20 w-36 rounded border border-gray-200 bg-white py-1 shadow-md dark:border-gray-700 dark:bg-gray-800">
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { setMenuOpen(false); setEditing(true); }}
              >
                <Pencil size={12} /> Renombrar
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { setMenuOpen(false); onDelete(field.id); }}
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </th>
  );
}
