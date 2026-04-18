"use client";

import { useRef, useEffect, useState } from "react";
import { FieldType } from "@prisma/client";

export type SelectOption = { value: string; color: string };

type Props = {
  type: FieldType;
  value: unknown;
  options?: SelectOption[];
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: unknown) => void;
  onCancel: () => void;
};

export function TableCell({ type, value, options = [], isEditing, onStartEdit, onSave, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const [draft, setDraft] = useState<unknown>(value);

  useEffect(() => {
    setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  function commit() {
    onSave(draft ?? null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") onCancel();
  }

  if (!isEditing) {
    return (
      <div
        className="h-full min-h-[32px] cursor-pointer px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={onStartEdit}
      >
        <CellDisplay type={type} value={value} options={options} />
      </div>
    );
  }

  if (type === "CHECKBOX") {
    return (
      <div className="flex items-center px-2 py-1">
        <input
          type="checkbox"
          checked={Boolean(draft)}
          onChange={(e) => {
            onSave(e.target.checked);
          }}
          className="h-4 w-4 rounded border-gray-300"
          autoFocus
          onBlur={onCancel}
        />
      </div>
    );
  }

  if (type === "SELECT") {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={String(draft ?? "")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="h-full w-full border-0 bg-blue-50 px-2 py-1 text-sm outline-none dark:bg-blue-900/20"
      >
        <option value="">— ninguno —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value}
          </option>
        ))}
      </select>
    );
  }

  const inputType =
    type === "NUMBER" ? "number"
    : type === "DATE" ? "date"
    : type === "TIME" ? "time"
    : "text";

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={inputType}
      value={type === "DATE" ? formatDateInput(draft) : String(draft ?? "")}
      onChange={(e) => setDraft(type === "NUMBER" ? Number(e.target.value) : e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="h-full w-full border-0 bg-blue-50 px-2 py-1 text-sm outline-none dark:bg-blue-900/20"
    />
  );
}

// ---------------------------------------------------------------------------
// Display (read-only)
// ---------------------------------------------------------------------------

function CellDisplay({ type, value, options }: { type: FieldType; value: unknown; options: SelectOption[] }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300 dark:text-gray-600">—</span>;
  }

  if (type === "CHECKBOX") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        readOnly
        className="h-4 w-4 rounded border-gray-300"
      />
    );
  }

  if (type === "SELECT") {
    const opt = options.find((o) => o.value === value);
    if (!opt) return <span className="text-sm">{String(value)}</span>;
    return (
      <span
        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: opt.color }}
      >
        {opt.value}
      </span>
    );
  }

  if (type === "DATE") {
    const str = String(value);
    if (!str) return null;
    return <span className="text-sm text-gray-700 dark:text-gray-300">{formatDateDisplay(str)}</span>;
  }

  if (type === "TIME") {
    return <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">{String(value)}</span>;
  }

  return <span className="text-sm text-gray-800 dark:text-gray-200">{String(value)}</span>;
}

// Parse YYYY-MM-DD components directly — avoids UTC-vs-local timezone shift
// that causes SSR/client hydration mismatches with new Date("YYYY-MM-DD").
const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatDateInput(value: unknown): string {
  const str = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : "";
}

function formatDateDisplay(str: string): string {
  const parts = str.slice(0, 10).split("-");
  if (parts.length !== 3) return str;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return str;
  return `${String(d).padStart(2, "0")} ${MONTHS_ES[m - 1]} ${y}`;
}
