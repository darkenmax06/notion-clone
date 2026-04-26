"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldType } from "@prisma/client";
import { ChevronDown, Plus } from "lucide-react";
import type { FieldRow, RecordRow } from "./DatabaseView";
import { cn } from "@/lib/utils";

type Props = {
  fields: FieldRow[];
  records: RecordRow[];
  onSelectRecord: (recordId: string) => void;
  onAddRecord: () => void;
};

function getTitleField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((field) => field.type === FieldType.TEXT) ?? fields[0];
}

function defaultInlineFieldIds(fields: FieldRow[], titleFieldId: string | undefined): string[] {
  return fields
    .filter((field) => field.id !== titleFieldId)
    .slice(0, 3)
    .map((field) => field.id);
}

function formatValue(field: FieldRow, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Sin valor";

  if (field.type === FieldType.CHECKBOX) return value === true ? "Completado" : "Pendiente";
  if (field.type === FieldType.DATE) return String(value).slice(0, 10);
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return String(value);
}

export default function ListView({ fields, records, onSelectRecord, onAddRecord }: Props) {
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const titleField = useMemo(() => getTitleField(fields), [fields]);
  const [inlineFieldIds, setInlineFieldIds] = useState<string[]>(() =>
    defaultInlineFieldIds(fields, titleField?.id)
  );

  useEffect(() => {
    setInlineFieldIds((prev) => {
      const valid = prev.filter((fieldId) => fieldId !== titleField?.id && fields.some((field) => field.id === fieldId));
      if (valid.length > 0) return valid.slice(0, 3);
      return defaultInlineFieldIds(fields, titleField?.id);
    });
  }, [fields, titleField?.id]);

  const inlineFields = useMemo(
    () => fields.filter((field) => inlineFieldIds.includes(field.id) && field.id !== titleField?.id).slice(0, 3),
    [fields, inlineFieldIds, titleField?.id]
  );

  function toggleInlineField(fieldId: string) {
    setInlineFieldIds((prev) => {
      if (prev.includes(fieldId)) return prev.filter((id) => id !== fieldId);
      if (prev.length >= 3) return prev;
      return [...prev, fieldId];
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-2 dark:border-gray-800">
        <div className="relative">
          <button
            onClick={() => setShowFieldMenu((value) => !value)}
            className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Campos inline ({inlineFields.length}/3)
            <ChevronDown size={12} />
          </button>

          {showFieldMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFieldMenu(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[240px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {fields
                  .filter((field) => field.id !== titleField?.id)
                  .map((field) => (
                    <label
                      key={field.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={inlineFieldIds.includes(field.id)}
                        onChange={() => toggleInlineField(field.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                      <span>{field.name}</span>
                    </label>
                  ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onAddRecord}
          className="ml-auto flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={12} />
          Nuevo
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {records.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Sin registros en la vista Lista.
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record) => {
              const title = titleField ? String(record.values[titleField.id] ?? "Sin titulo") : "Sin titulo";
              return (
                <button
                  key={record.id}
                  onClick={() => onSelectRecord(record.id)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition",
                    "hover:border-indigo-300 hover:bg-indigo-50/20 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
                  )}
                  data-testid={`list-row-${record.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
                  </div>
                  {inlineFields.map((field) => (
                    <div key={field.id} className="min-w-[120px] max-w-[180px]">
                      <p className="truncate text-[11px] uppercase tracking-wide text-gray-400">{field.name}</p>
                      <p className="truncate text-xs text-gray-600 dark:text-gray-300">
                        {formatValue(field, record.values[field.id])}
                      </p>
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
