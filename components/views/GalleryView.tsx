"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldType } from "@prisma/client";
import { ChevronDown, Image as ImageIcon, Plus } from "lucide-react";
import type { FieldRow, RecordRow } from "./DatabaseView";
import { cn } from "@/lib/utils";

type Props = {
  fields: FieldRow[];
  records: RecordRow[];
  imageFieldId: string | null;
  onImageFieldChange: (fieldId: string | null) => Promise<void> | void;
  onSelectRecord: (recordId: string) => void;
  onAddRecord: () => void;
};

function getTitleField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((field) => field.type === FieldType.TEXT) ?? fields[0];
}

function getImageFields(fields: FieldRow[]): FieldRow[] {
  return fields.filter((field) => field.type === FieldType.URL || field.type === FieldType.TEXT);
}

function formatValue(field: FieldRow, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Sin valor";

  if (field.type === FieldType.CHECKBOX) {
    return value === true ? "Si" : "No";
  }

  if (field.type === FieldType.DATE) {
    return String(value).slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }

  if (typeof value === "object" && value !== null) {
    const maybeName = (value as { name?: unknown }).name;
    if (typeof maybeName === "string") return maybeName;
  }

  return String(value);
}

function getDefaultVisibleFields(
  fields: FieldRow[],
  titleFieldId: string | undefined,
  imageFieldId: string | null
): string[] {
  return fields
    .filter((field) => field.id !== titleFieldId && field.id !== imageFieldId)
    .slice(0, 3)
    .map((field) => field.id);
}

export default function GalleryView({
  fields,
  records,
  imageFieldId,
  onImageFieldChange,
  onSelectRecord,
  onAddRecord,
}: Props) {
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showFieldsMenu, setShowFieldsMenu] = useState(false);
  const [brokenImageRecordIds, setBrokenImageRecordIds] = useState<Record<string, true>>({});

  const titleField = useMemo(() => getTitleField(fields), [fields]);
  const imageFields = useMemo(() => getImageFields(fields), [fields]);
  const activeImageField = useMemo(
    () => imageFields.find((field) => field.id === imageFieldId) ?? imageFields[0],
    [imageFields, imageFieldId]
  );

  const [visibleFieldIds, setVisibleFieldIds] = useState<string[]>(() =>
    getDefaultVisibleFields(fields, titleField?.id, activeImageField?.id ?? null)
  );

  useEffect(() => {
    setVisibleFieldIds((prev) => {
      const valid = prev.filter(
        (fieldId) =>
          fields.some((field) => field.id === fieldId) &&
          fieldId !== titleField?.id &&
          fieldId !== activeImageField?.id
      );
      if (valid.length > 0) return valid;
      return getDefaultVisibleFields(fields, titleField?.id, activeImageField?.id ?? null);
    });
  }, [fields, titleField?.id, activeImageField?.id]);

  useEffect(() => {
    setBrokenImageRecordIds({});
  }, [activeImageField?.id]);

  const visibleFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          visibleFieldIds.includes(field.id) &&
          field.id !== titleField?.id &&
          field.id !== activeImageField?.id
      ),
    [fields, visibleFieldIds, titleField?.id, activeImageField?.id]
  );

  function toggleField(fieldId: string) {
    setVisibleFieldIds((prev) => {
      if (prev.includes(fieldId)) return prev.filter((id) => id !== fieldId);
      return [...prev, fieldId];
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-2 dark:border-gray-800">
        <div className="relative">
          <button
            onClick={() => setShowImageMenu((value) => !value)}
            className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            data-testid="gallery-image-selector"
          >
            Imagen: <span className="font-semibold">{activeImageField?.name ?? "Sin campo"}</span>
            <ChevronDown size={12} />
          </button>

          {showImageMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowImageMenu(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <button
                  onClick={() => {
                    onImageFieldChange(null);
                    setShowImageMenu(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800",
                    !activeImageField && "font-semibold text-indigo-600 dark:text-indigo-400"
                  )}
                >
                  Sin imagen
                </button>
                {imageFields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => {
                      onImageFieldChange(field.id);
                      setShowImageMenu(false);
                    }}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800",
                      activeImageField?.id === field.id && "font-semibold text-indigo-600 dark:text-indigo-400"
                    )}
                    data-testid={`gallery-image-option-${field.id}`}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFieldsMenu((value) => !value)}
            className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Campos ({visibleFields.length})
            <ChevronDown size={12} />
          </button>

          {showFieldsMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFieldsMenu(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[230px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {fields
                  .filter((field) => field.id !== titleField?.id && field.id !== activeImageField?.id)
                  .map((field) => (
                    <label
                      key={field.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={visibleFieldIds.includes(field.id)}
                        onChange={() => toggleField(field.id)}
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

      <div className="flex-1 overflow-auto p-6">
        {records.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Sin registros para mostrar en Galeria.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {records.map((record) => {
              const title = titleField ? String(record.values[titleField.id] ?? "Sin titulo") : "Sin titulo";
              const imageValue = activeImageField ? String(record.values[activeImageField.id] ?? "").trim() : "";
              const hasImage = imageValue.length > 0 && !brokenImageRecordIds[record.id];

              return (
                <button
                  key={record.id}
                  onClick={() => onSelectRecord(record.id)}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                  data-testid={`gallery-card-${record.id}`}
                >
                  <div className="relative h-44 bg-gray-100 dark:bg-gray-800">
                    {hasImage ? (
                      <img
                        src={imageValue}
                        alt={title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={() =>
                          setBrokenImageRecordIds((prev) => ({
                            ...prev,
                            [record.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <ImageIcon size={22} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
                    {visibleFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-gray-400">{field.name}</span>
                        <span className="truncate text-gray-600 dark:text-gray-300">
                          {formatValue(field, record.values[field.id])}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
