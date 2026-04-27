"use client";

import { useMemo, useRef, useEffect, useState, type RefObject } from "react";
import { Download, Paperclip, Upload, UserCircle2, X } from "lucide-react";
import { FieldType } from "@prisma/client";
import {
  getSelectOptions,
  type FieldOptions,
  type FileCellValue,
  type SelectOption,
} from "@/lib/database/field-options";

export type { SelectOption, FileCellValue };

export type RelationCandidate = {
  id: string;
  label: string;
};

type Props = {
  fieldId: string;
  type: FieldType;
  value: unknown;
  options?: FieldOptions;
  relationCandidates?: RelationCandidate[];
  isEditing: boolean;
  isReadOnly?: boolean;
  onStartEdit: () => void;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  onUploadFile?: (file: File) => Promise<FileCellValue | null>;
};

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

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

function isFileCellValue(value: unknown): value is FileCellValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const asRecord = value as Record<string, unknown>;
  return typeof asRecord.name === "string" && typeof asRecord.url === "string";
}

function getInitials(label: string): string {
  const words = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return "?";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function TableCell({
  fieldId,
  type,
  value,
  options,
  relationCandidates = [],
  isEditing,
  isReadOnly = false,
  onStartEdit,
  onSave,
  onCancel,
  onUploadFile,
}: Props) {
  const selectOptions = useMemo(() => getSelectOptions(options), [options]);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<unknown>(value);
  const [relationQuery, setRelationQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setDraft(value);
    setRelationQuery("");
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

  async function handleFilePick(file: File | null) {
    if (!file || !onUploadFile) return;
    try {
      setIsUploading(true);
      const uploaded = await onUploadFile(file);
      if (uploaded) onSave(uploaded);
      else onCancel();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (!isEditing) {
    return (
      <div
        className="h-full min-h-[32px] cursor-pointer px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => {
          if (!isReadOnly && type !== "ROLLUP" && type !== "FORMULA") {
            onStartEdit();
          }
        }}
      >
        <CellDisplay
          fieldId={fieldId}
          type={type}
          value={value}
          options={selectOptions}
          relationCandidates={relationCandidates}
        />
      </div>
    );
  }

  if (type === "CHECKBOX") {
    return (
      <div className="flex items-center px-2 py-1">
        <input
          type="checkbox"
          checked={Boolean(draft)}
          onChange={(e) => onSave(e.target.checked)}
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
        ref={inputRef as RefObject<HTMLSelectElement>}
        value={String(draft ?? "")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="h-full w-full border-0 bg-blue-50 px-2 py-1 text-sm text-gray-900 outline-none dark:bg-blue-900/20 dark:text-gray-100"
      >
        <option value="">- ninguno -</option>
        {selectOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value}
          </option>
        ))}
      </select>
    );
  }

  if (type === "RELATION") {
    const selectedIds = Array.isArray(draft)
      ? draft.filter((item): item is string => typeof item === "string")
      : [];
    const query = relationQuery.trim().toLowerCase();
    const filteredCandidates =
      query.length > 0
        ? relationCandidates.filter((candidate) => candidate.label.toLowerCase().includes(query))
        : relationCandidates;

    return (
      <div className="space-y-2 bg-blue-50 px-2 py-2 text-xs dark:bg-blue-900/20">
        <input
          ref={inputRef as RefObject<HTMLInputElement>}
          type="text"
          value={relationQuery}
          onChange={(e) => setRelationQuery(e.target.value)}
          placeholder="Buscar registro..."
          className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none dark:border-blue-700 dark:bg-gray-900 dark:text-gray-100"
        />

        <div className="max-h-28 overflow-y-auto rounded border border-blue-100 bg-white dark:border-blue-800 dark:bg-gray-900">
          {filteredCandidates.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-gray-400">Sin coincidencias</p>
          ) : (
            filteredCandidates.map((candidate) => (
              <label
                key={candidate.id}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(candidate.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDraft([...selectedIds, candidate.id]);
                    } else {
                      setDraft(selectedIds.filter((id) => id !== candidate.id));
                    }
                  }}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                <span className="truncate">{candidate.label}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={commit}
            className="rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    );
  }

  if (type === "FILE") {
    const currentFile = isFileCellValue(draft) ? draft : null;
    return (
      <div className="space-y-2 bg-blue-50 px-2 py-2 text-xs dark:bg-blue-900/20">
        {currentFile ? (
          <div className="flex items-center gap-2 rounded border border-blue-100 bg-white px-2 py-1 dark:border-blue-800 dark:bg-gray-900">
            <Paperclip size={12} className="text-gray-400" />
            <span className="truncate">{currentFile.name}</span>
            <a
              href={currentFile.url}
              target="_blank"
              rel="noreferrer"
              className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              title="Descargar"
            >
              <Download size={12} />
            </a>
            <button
              onClick={() => onSave(null)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
              title="Quitar archivo"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">Sin archivo adjunto</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            void handleFilePick(file);
          }}
        />

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="rounded px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cerrar
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !onUploadFile}
            className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload size={11} />
            {isUploading ? "Subiendo..." : currentFile ? "Reemplazar" : "Subir"}
          </button>
        </div>
      </div>
    );
  }

  const inputType =
    type === "NUMBER" ? "number"
    : type === "DATE" ? "date"
    : type === "TIME" ? "time"
    : "text";

  return (
    <input
      ref={inputRef as RefObject<HTMLInputElement>}
      type={inputType}
      value={type === "DATE" ? formatDateInput(draft) : String(draft ?? "")}
      onChange={(e) => {
        if (type === "NUMBER") {
          setDraft(e.target.value === "" ? null : Number(e.target.value));
        } else {
          setDraft(e.target.value);
        }
      }}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="h-full w-full border-0 bg-blue-50 px-2 py-1 text-sm text-gray-900 outline-none dark:bg-blue-900/20 dark:text-gray-100"
    />
  );
}

function CellDisplay({
  fieldId,
  type,
  value,
  options,
  relationCandidates,
}: {
  fieldId: string;
  type: FieldType;
  value: unknown;
  options: SelectOption[];
  relationCandidates: RelationCandidate[];
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300 dark:text-gray-600">-</span>;
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
    const opt = options.find((option) => option.value === value);
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

  if (type === "RELATION") {
    const selectedIds = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

    if (selectedIds.length === 0) {
      return <span className="text-gray-300 dark:text-gray-600">-</span>;
    }

    const labelById = new Map(relationCandidates.map((candidate) => [candidate.id, candidate.label]));

    return (
      <div className="flex flex-wrap gap-1">
        {selectedIds.map((id) => (
          <span
            key={`${fieldId}-${id}`}
            className="inline-flex max-w-[140px] items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          >
            <span className="truncate">{labelById.get(id) ?? id}</span>
          </span>
        ))}
      </div>
    );
  }

  if (type === "DATE") {
    const str = String(value);
    return <span className="text-sm text-gray-700 dark:text-gray-300">{formatDateDisplay(str)}</span>;
  }

  if (type === "TIME") {
    return <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">{String(value)}</span>;
  }

  if (type === "PERSON") {
    const label = String(value).trim();
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200">
        <UserCircle2 size={14} className="text-gray-400" />
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
          {getInitials(label)}
        </span>
        <span className="truncate">{label}</span>
      </span>
    );
  }

  if (type === "FILE") {
    if (!isFileCellValue(value)) {
      return <span className="text-sm text-gray-800 dark:text-gray-200">{String(value)}</span>;
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
        <Paperclip size={13} className="text-gray-400" />
        <span className="max-w-[140px] truncate">{value.name}</span>
        <a
          href={value.url}
          target="_blank"
          rel="noreferrer"
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          onClick={(event) => event.stopPropagation()}
          title="Descargar"
        >
          <Download size={12} />
        </a>
      </span>
    );
  }

  return <span className="text-sm text-gray-800 dark:text-gray-200">{String(value)}</span>;
}
