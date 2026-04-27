"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Paperclip, Upload, X } from "lucide-react";
import { FieldType } from "@prisma/client";
import { FieldTypeIcon } from "./FieldTypeIcon";
import type { RelationCandidate, FileCellValue } from "./TableCell";
import type { FieldRow } from "./DatabaseView";
import { getSelectOptions } from "@/lib/database/field-options";

type Props = {
  record: { id: string; values: Record<string, unknown> };
  fields: FieldRow[];
  relationCandidatesByFieldId: Map<string, RelationCandidate[]>;
  onClose: () => void;
  onSave: (recordId: string, values: Record<string, unknown>) => void | Promise<void>;
  onUploadFile?: (file: File) => Promise<FileCellValue | null>;
};

function isFileCellValue(value: unknown): value is FileCellValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const asRecord = value as Record<string, unknown>;
  return typeof asRecord.name === "string" && typeof asRecord.url === "string";
}

export function RecordDetailPanel({
  record,
  fields,
  relationCandidatesByFieldId,
  onClose,
  onSave,
  onUploadFile,
}: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(record.values);

  useEffect(() => {
    setValues(record.values);
  }, [record.id, record.values]);

  function handleChange(fieldId: string, value: unknown) {
    const next = { ...values, [fieldId]: value };
    setValues(next);
    void onSave(record.id, next);
  }

  return (
    <div className="fixed inset-0 z-30 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detalle del registro</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 p-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <FieldTypeIcon type={field.type} />
                {field.name}
              </label>
              <FieldEditor
                field={field}
                value={values[field.id]}
                relationCandidates={relationCandidatesByFieldId.get(field.id) ?? []}
                onChange={(value) => handleChange(field.id, value)}
                onUploadFile={onUploadFile}
              />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  relationCandidates,
  onChange,
  onUploadFile,
}: {
  field: FieldRow;
  value: unknown;
  relationCandidates: RelationCandidate[];
  onChange: (value: unknown) => void;
  onUploadFile?: (file: File) => Promise<FileCellValue | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const baseClass =
    "w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

  if (field.type === "ROLLUP" || field.type === "FORMULA") {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
        {value === null || value === undefined || value === "" ? "-" : String(value)}
      </div>
    );
  }

  if (field.type === "CHECKBOX") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    );
  }

  if (field.type === "SELECT") {
    const options = getSelectOptions(field.options);
    return (
      <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={baseClass}>
        <option value="">- ninguno -</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "RELATION") {
    const selectedIds = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

    return (
      <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/40">
        <div className="max-h-36 space-y-1 overflow-y-auto">
          {relationCandidates.map((candidate) => (
            <label key={candidate.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={selectedIds.includes(candidate.id)}
                onChange={(event) => {
                  if (event.target.checked) onChange([...selectedIds, candidate.id]);
                  else onChange(selectedIds.filter((id) => id !== candidate.id));
                }}
                className="h-3.5 w-3.5 rounded border-gray-300"
              />
              <span className="truncate">{candidate.label}</span>
            </label>
          ))}
          {relationCandidates.length === 0 && (
            <p className="text-xs text-gray-400">No hay registros para relacionar.</p>
          )}
        </div>
      </div>
    );
  }

  if (field.type === "FILE") {
    const currentFile = isFileCellValue(value) ? value : null;
    return (
      <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/40">
        {currentFile ? (
          <div className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900">
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
              onClick={() => onChange(null)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
              title="Quitar archivo"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Sin archivo adjunto</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0] ?? null;
            if (!file || !onUploadFile) return;
            try {
              setIsUploading(true);
              const uploaded = await onUploadFile(file);
              if (uploaded) onChange(uploaded);
            } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !onUploadFile}
          className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Upload size={12} />
          {isUploading ? "Subiendo..." : currentFile ? "Reemplazar" : "Subir archivo"}
        </button>
      </div>
    );
  }

  if (field.type === "DATE") {
    const iso = value ? String(value).slice(0, 10) : "";
    return (
      <input
        type="date"
        value={iso}
        onChange={(event) => onChange(event.target.value)}
        className={baseClass}
      />
    );
  }

  if (field.type === "NUMBER") {
    return (
      <input
        type="number"
        value={value !== null && value !== undefined ? String(value) : ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        className={baseClass}
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className={baseClass}
    />
  );
}

