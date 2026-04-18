"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { FieldType } from "@prisma/client";
import type { SelectOption } from "./TableCell";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "TEXT", label: "Texto" },
  { value: "NUMBER", label: "Número" },
  { value: "DATE", label: "Fecha" },
  { value: "TIME", label: "Hora" },
  { value: "SELECT", label: "Selección" },
  { value: "CHECKBOX", label: "Casilla" },
];

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
];

type Props = {
  onClose: () => void;
  onCreate: (name: string, type: FieldType, options: SelectOption[]) => void;
};

export function AddFieldModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FieldType>("TEXT");
  const [options, setOptions] = useState<SelectOption[]>([]);

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { value: "", color: PRESET_COLORS[prev.length % PRESET_COLORS.length] },
    ]);
  }

  function updateOption(idx: number, patch: Partial<SelectOption>) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), type, options.filter((o) => o.value.trim()));
    onClose();
  }

  const needsOptions = type === "SELECT" || type === "MULTI_SELECT";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nuevo campo</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Nombre</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              placeholder="Nombre del campo"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Tipo</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as FieldType); setOptions([]); }}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">Opciones</label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={opt.color}
                    onChange={(e) => updateOption(i, { color: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border-0"
                  />
                  <input
                    value={opt.value}
                    onChange={(e) => updateOption(i, { value: e.target.value })}
                    placeholder={`Opción ${i + 1}`}
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                  />
                  <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Plus size={12} /> Añadir opción
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Crear campo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
