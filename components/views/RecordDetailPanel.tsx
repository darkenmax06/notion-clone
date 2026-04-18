"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FieldType } from "@prisma/client";
import type { SelectOption } from "./TableCell";
import { FieldTypeIcon } from "./FieldTypeIcon";

type FieldRow = {
  id: string;
  name: string;
  type: FieldType;
  options: SelectOption[];
};

type Props = {
  record: { id: string; values: Record<string, unknown> };
  fields: FieldRow[];
  onClose: () => void;
  onSave: (recordId: string, values: Record<string, unknown>) => void;
};

export function RecordDetailPanel({ record, fields, onClose, onSave }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(record.values);

  function handleChange(fieldId: string, value: unknown) {
    const next = { ...values, [fieldId]: value };
    setValues(next);
    onSave(record.id, next);
  }

  return (
    <div className="fixed inset-0 z-30 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
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
                type={field.type}
                value={values[field.id]}
                options={field.options}
                onChange={(v) => handleChange(field.id, v)}
              />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function FieldEditor({
  type,
  value,
  options,
  onChange,
}: {
  type: FieldType;
  value: unknown;
  options: SelectOption[];
  onChange: (v: unknown) => void;
}) {
  const baseClass =
    "w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

  if (type === "CHECKBOX") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    );
  }

  if (type === "SELECT") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
      >
        <option value="">— ninguno —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.value}</option>
        ))}
      </select>
    );
  }

  if (type === "DATE") {
    const iso = value ? String(value).slice(0, 10) : "";
    return (
      <input
        type="date"
        value={iso}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
      />
    );
  }

  if (type === "NUMBER") {
    return (
      <input
        type="number"
        value={value !== null && value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={baseClass}
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className={baseClass}
    />
  );
}
