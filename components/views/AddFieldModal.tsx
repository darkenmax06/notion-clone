"use client";

import { useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { FieldType } from "@prisma/client";
import {
  getFieldOptionsObject,
  type FieldOptions,
  type RollupFunction,
  type SelectOption,
} from "@/lib/database/field-options";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "TEXT", label: "Texto" },
  { value: "NUMBER", label: "Numero" },
  { value: "DATE", label: "Fecha" },
  { value: "TIME", label: "Hora" },
  { value: "SELECT", label: "Seleccion" },
  { value: "MULTI_SELECT", label: "Multi seleccion" },
  { value: "CHECKBOX", label: "Casilla" },
  { value: "URL", label: "URL" },
  { value: "EMAIL", label: "Email" },
  { value: "RELATION", label: "Relacion" },
  { value: "ROLLUP", label: "Rollup" },
  { value: "FORMULA", label: "Formula" },
  { value: "PERSON", label: "Persona" },
  { value: "FILE", label: "Archivo" },
];

const PRESET_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];
const ROLLUP_FUNCTIONS: { value: RollupFunction; label: string }[] = [
  { value: "count", label: "COUNT" },
  { value: "sum", label: "SUM" },
  { value: "avg", label: "AVG" },
  { value: "min", label: "MIN" },
  { value: "max", label: "MAX" },
];

type FieldMeta = {
  id: string;
  name: string;
  type: FieldType;
  options: FieldOptions;
};

type DatabaseMeta = {
  id: string;
  title: string;
  fields: Array<{ id: string; name: string; type: FieldType }>;
};

type Props = {
  fields: FieldMeta[];
  databases: DatabaseMeta[];
  onClose: () => void;
  onCreate: (name: string, type: FieldType, options: FieldOptions) => void;
};

function isNumericField(type: FieldType): boolean {
  return type === "NUMBER" || type === "ROLLUP" || type === "FORMULA";
}

export function AddFieldModal({ fields, databases, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FieldType>("TEXT");
  const [selectOptions, setSelectOptions] = useState<SelectOption[]>([]);
  const [relationDatabaseId, setRelationDatabaseId] = useState<string>("");
  const [rollupRelationFieldId, setRollupRelationFieldId] = useState<string>("");
  const [rollupTargetFieldId, setRollupTargetFieldId] = useState<string>("");
  const [rollupFunction, setRollupFunction] = useState<RollupFunction>("count");
  const [formulaExpression, setFormulaExpression] = useState("");

  const relationFields = useMemo(
    () => fields.filter((field) => field.type === "RELATION"),
    [fields]
  );

  const selectedRollupRelationField = useMemo(
    () => relationFields.find((field) => field.id === rollupRelationFieldId) ?? null,
    [relationFields, rollupRelationFieldId]
  );

  const selectedRollupDatabase = useMemo(() => {
    if (!selectedRollupRelationField) return null;
    const relationOptions = getFieldOptionsObject(selectedRollupRelationField.options);
    if (!relationOptions.relationDatabaseId) return null;
    return databases.find((db) => db.id === relationOptions.relationDatabaseId) ?? null;
  }, [selectedRollupRelationField, databases]);

  const rollupTargetFields = useMemo(() => {
    if (!selectedRollupDatabase) return [];
    return selectedRollupDatabase.fields.filter((field) => isNumericField(field.type));
  }, [selectedRollupDatabase]);

  const needsSelectOptions = type === "SELECT" || type === "MULTI_SELECT";
  const needsRelationConfig = type === "RELATION";
  const needsRollupConfig = type === "ROLLUP";
  const needsFormulaConfig = type === "FORMULA";

  function resetConfigStates(nextType: FieldType) {
    if (nextType !== "SELECT" && nextType !== "MULTI_SELECT") setSelectOptions([]);
    if (nextType !== "RELATION") setRelationDatabaseId("");
    if (nextType !== "ROLLUP") {
      setRollupRelationFieldId("");
      setRollupTargetFieldId("");
      setRollupFunction("count");
    }
    if (nextType !== "FORMULA") setFormulaExpression("");
  }

  function addOption() {
    setSelectOptions((prev) => [
      ...prev,
      { value: "", color: PRESET_COLORS[prev.length % PRESET_COLORS.length] },
    ]);
  }

  function updateOption(index: number, patch: Partial<SelectOption>) {
    setSelectOptions((prev) => prev.map((option, idx) => (idx === index ? { ...option, ...patch } : option)));
  }

  function removeOption(index: number) {
    setSelectOptions((prev) => prev.filter((_, idx) => idx !== index));
  }

  function buildOptionsPayload(): FieldOptions {
    if (type === "SELECT" || type === "MULTI_SELECT") {
      return selectOptions.filter((option) => option.value.trim().length > 0);
    }
    if (type === "RELATION") {
      return { relationDatabaseId: relationDatabaseId || null };
    }
    if (type === "ROLLUP") {
      return {
        relationFieldId: rollupRelationFieldId || undefined,
        targetFieldId: rollupFunction === "count" ? undefined : rollupTargetFieldId || undefined,
        function: rollupFunction,
      };
    }
    if (type === "FORMULA") {
      return { expression: formulaExpression.trim() };
    }
    return {};
  }

  function canSubmit(): boolean {
    if (!name.trim()) return false;
    if (needsRelationConfig && !relationDatabaseId) return false;
    if (needsRollupConfig && !rollupRelationFieldId) return false;
    if (needsRollupConfig && rollupFunction !== "count" && !rollupTargetFieldId) return false;
    if (needsFormulaConfig && !formulaExpression.trim()) return false;
    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit()) return;
    onCreate(name.trim(), type, buildOptionsPayload());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
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
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              placeholder="Nombre del campo"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Tipo</label>
            <select
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as FieldType;
                setType(nextType);
                resetConfigStates(nextType);
              }}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {FIELD_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          {needsSelectOptions && (
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">Opciones</label>
              {selectOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={option.color}
                    onChange={(event) => updateOption(index, { color: event.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border-0"
                  />
                  <input
                    value={option.value}
                    onChange={(event) => updateOption(index, { value: event.target.value })}
                    placeholder={`Opcion ${index + 1}`}
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <button type="button" onClick={() => removeOption(index)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Plus size={12} /> Anadir opcion
              </button>
            </div>
          )}

          {needsRelationConfig && (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Base de datos destino</label>
              <select
                value={relationDatabaseId}
                onChange={(event) => setRelationDatabaseId(event.target.value)}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Seleccionar base de datos</option>
                {databases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {needsRollupConfig && (
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">Campo relation</label>
              <select
                value={rollupRelationFieldId}
                onChange={(event) => {
                  setRollupRelationFieldId(event.target.value);
                  setRollupTargetFieldId("");
                }}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Seleccionar relation</option>
                {relationFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>

              <label className="block text-xs text-gray-500">Funcion</label>
              <select
                value={rollupFunction}
                onChange={(event) => setRollupFunction(event.target.value as RollupFunction)}
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                {ROLLUP_FUNCTIONS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>

              {rollupFunction !== "count" && (
                <>
                  <label className="block text-xs text-gray-500">Campo objetivo (numerico)</label>
                  <select
                    value={rollupTargetFieldId}
                    onChange={(event) => setRollupTargetFieldId(event.target.value)}
                    className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="">Seleccionar campo</option>
                    {rollupTargetFields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {needsFormulaConfig && (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Expresion</label>
              <textarea
                value={formulaExpression}
                onChange={(event) => setFormulaExpression(event.target.value)}
                rows={4}
                placeholder='Ej: {Monto} * 0.18 o IF({Completado}, "OK", "Pendiente")'
                className="w-full resize-y rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
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
              disabled={!canSubmit()}
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

