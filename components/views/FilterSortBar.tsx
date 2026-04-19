"use client";

import { useState } from "react";
import { Filter, ArrowUpDown, X, Plus } from "lucide-react";
import { FieldType } from "@prisma/client";
import { cn } from "@/lib/utils";

export type FilterOperator =
  | "contains"
  | "equals"
  | "not_contains"
  | "gt"
  | "lt"
  | "before"
  | "after"
  | "is"
  | "is_not"
  | "is_checked"
  | "is_not_checked";

export type FilterRule = {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: string;
};

export type SortConfig = {
  fieldId: string;
  direction: "asc" | "desc";
};

type FieldMeta = { id: string; name: string; type: FieldType };

type Props = {
  fields: FieldMeta[];
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  sortConfig: SortConfig | null;
  onSortChange: (sort: SortConfig | null) => void;
};

const OPERATORS_BY_TYPE: Record<FieldType, { value: FilterOperator; label: string }[]> = {
  TEXT: [
    { value: "contains", label: "contiene" },
    { value: "not_contains", label: "no contiene" },
    { value: "equals", label: "es igual a" },
  ],
  NUMBER: [
    { value: "equals", label: "=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
  ],
  DATE: [
    { value: "equals", label: "es" },
    { value: "before", label: "antes de" },
    { value: "after", label: "después de" },
  ],
  SELECT: [
    { value: "is", label: "es" },
    { value: "is_not", label: "no es" },
  ],
  MULTI_SELECT: [
    { value: "is", label: "contiene" },
    { value: "is_not", label: "no contiene" },
  ],
  CHECKBOX: [
    { value: "is_checked", label: "marcado" },
    { value: "is_not_checked", label: "no marcado" },
  ],
  URL: [
    { value: "contains", label: "contiene" },
    { value: "equals", label: "es igual a" },
  ],
  EMAIL: [
    { value: "contains", label: "contiene" },
    { value: "equals", label: "es igual a" },
  ],
  TIME: [
    { value: "equals", label: "es" },
    { value: "before", label: "antes de" },
    { value: "after", label: "después de" },
  ],
};

export function FilterSortBar({ fields, filters, onFiltersChange, sortConfig, onSortChange }: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  function addFilter() {
    if (fields.length === 0) return;
    const field = fields[0];
    const ops = OPERATORS_BY_TYPE[field.type];
    onFiltersChange([
      ...filters,
      { id: crypto.randomUUID(), fieldId: field.id, operator: ops[0].value, value: "" },
    ]);
  }

  function updateFilter(id: string, patch: Partial<FilterRule>) {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: string) {
    onFiltersChange(filters.filter((f) => f.id !== id));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
      {/* Filter button */}
      <button
        onClick={() => { setShowFilters((v) => !v); setShowSort(false); }}
        className={cn(
          "flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
          filters.length > 0 && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        )}
      >
        <Filter size={12} />
        Filtrar {filters.length > 0 && `(${filters.length})`}
      </button>

      {/* Sort button */}
      <button
        onClick={() => { setShowSort((v) => !v); setShowFilters(false); }}
        className={cn(
          "flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
          sortConfig && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        )}
      >
        <ArrowUpDown size={12} />
        Ordenar {sortConfig && `↑↓`}
      </button>

      {/* Clear all */}
      {(filters.length > 0 || sortConfig) && (
        <button
          onClick={() => { onFiltersChange([]); onSortChange(null); }}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
        >
          <X size={12} /> Limpiar
        </button>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="w-full space-y-2 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          {filters.map((rule) => {
            const field = fields.find((f) => f.id === rule.fieldId);
            const ops = field ? OPERATORS_BY_TYPE[field.type] : [];
            const needsValue = rule.operator !== "is_checked" && rule.operator !== "is_not_checked";

            return (
              <div key={rule.id} className="flex flex-wrap items-center gap-2">
                <select
                  value={rule.fieldId}
                  onChange={(e) => {
                    const newField = fields.find((f) => f.id === e.target.value);
                    if (!newField) return;
                    const newOps = OPERATORS_BY_TYPE[newField.type];
                    updateFilter(rule.id, { fieldId: e.target.value, operator: newOps[0].value, value: "" });
                  }}
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>

                <select
                  value={rule.operator}
                  onChange={(e) => updateFilter(rule.id, { operator: e.target.value as FilterOperator })}
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {ops.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {needsValue && (
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateFilter(rule.id, { value: e.target.value })}
                    placeholder="valor…"
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                )}

                <button onClick={() => removeFilter(rule.id)} className="text-red-400 hover:text-red-600">
                  <X size={12} />
                </button>
              </div>
            );
          })}

          <button
            onClick={addFilter}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Plus size={12} /> Añadir filtro
          </button>
        </div>
      )}

      {/* Sort panel */}
      {showSort && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <select
            value={sortConfig?.fieldId ?? ""}
            onChange={(e) => {
              if (!e.target.value) { onSortChange(null); return; }
              onSortChange({ fieldId: e.target.value, direction: sortConfig?.direction ?? "asc" });
            }}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">— sin orden —</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {sortConfig && (
            <select
              value={sortConfig.direction}
              onChange={(e) => onSortChange({ ...sortConfig, direction: e.target.value as "asc" | "desc" })}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="asc">Ascendente ↑</option>
              <option value="desc">Descendente ↓</option>
            </select>
          )}
        </div>
      )}
    </div>
  );
}
