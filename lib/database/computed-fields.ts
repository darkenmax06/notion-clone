import { Parser } from "expr-eval";
import type { FieldType } from "@prisma/client";
import { getFieldOptionsObject, type RollupFunction } from "@/lib/database/field-options";

export type ComputedField = {
  id: string;
  name: string;
  type: FieldType;
  options: unknown;
  position: number;
};

export type ComputedRecord = {
  id: string;
  position: number;
  values: Record<string, unknown>;
};

export type RelationDatabaseRecord = {
  id: string;
  position: number;
  values: Record<string, unknown>;
};

export type RelationDatabaseField = {
  id: string;
  name: string;
  type: FieldType;
  position: number;
  options: unknown;
};

export type RelationDatabase = {
  id: string;
  title: string;
  titleFieldId: string | null;
  fields: RelationDatabaseField[];
  records: RelationDatabaseRecord[];
};

const parser = new Parser({
  operators: {
    assignment: false,
  },
});

parser.functions.if = (condition: unknown, truthy: unknown, falsy: unknown) =>
  Boolean(condition) ? truthy : falsy;

parser.functions.days_between = (startValue: unknown, endValue: unknown) => {
  const start = toDateOrNull(startValue);
  const end = toDateOrNull(endValue);
  if (!start || !end) return 0;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
};

function toDateOrNull(value: unknown): Date | null {
  const raw = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  const result = new Date(year, month - 1, day);
  return Number.isNaN(result.getTime()) ? null : result;
}

function sanitizeVariableName(input: string): string {
  const normalized = input
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_");
  if (!normalized) return "field";
  return /^[0-9]/.test(normalized) ? `f_${normalized}` : normalized;
}

function normalizeFormulaValue(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return 0;

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && String(value).trim() !== "") return asNumber;
  return String(value);
}

export function evaluateFormulaExpression(
  expression: string,
  fields: ComputedField[],
  values: Record<string, unknown>
): unknown {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const fieldsByName = new Map<string, ComputedField>();
  fields.forEach((field) => {
    fieldsByName.set(field.name.trim().toLowerCase(), field);
  });

  const variables: Record<string, unknown> = {};
  const fieldVariableMap = new Map<string, string>();
  let counter = 0;

  const rewrittenExpression = trimmed.replace(/\{([^}]+)\}/g, (_match, rawFieldName: string) => {
    const key = rawFieldName.trim().toLowerCase();
    const field = fieldsByName.get(key);
    if (!field) return "0";

    const mapKey = field.id;
    if (!fieldVariableMap.has(mapKey)) {
      const suggested = sanitizeVariableName(field.name || `field_${counter + 1}`);
      const variable = `${suggested}_${counter}`;
      counter += 1;
      fieldVariableMap.set(mapKey, variable);
      variables[variable] = normalizeFormulaValue(values[field.id]);
    }

    return fieldVariableMap.get(mapKey)!;
  });

  const normalizedFunctions = rewrittenExpression
    .replace(/\bIF\s*\(/gi, "if(")
    .replace(/\bDAYS_BETWEEN\s*\(/gi, "days_between(");
  const normalizedStringLiterals = normalizedFunctions.replace(
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    (_match, content: string) => `'${content.replace(/'/g, "\\'")}'`
  );

  try {
    return parser.evaluate(normalizedStringLiterals, variables as any);
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function computeRollupValue(
  field: ComputedField,
  values: Record<string, unknown>,
  fieldsById: Map<string, ComputedField>,
  relationDatabasesById: Map<string, RelationDatabase>
): unknown {
  const options = getFieldOptionsObject(field.options);
  const relationFieldId = options.relationFieldId;
  const targetFieldId = options.targetFieldId;
  const fn = (options.function ?? "count") as RollupFunction;

  if (!relationFieldId) return null;

  const relationField = fieldsById.get(relationFieldId);
  if (!relationField || relationField.type !== "RELATION") return null;

  const relationOptions = getFieldOptionsObject(relationField.options);
  const relationDatabaseId = relationOptions.relationDatabaseId;
  if (!relationDatabaseId) return null;

  const relationDatabase = relationDatabasesById.get(relationDatabaseId);
  if (!relationDatabase) return null;

  const relatedRecordIds = toStringArray(values[relationFieldId]);
  const relatedRecords = relationDatabase.records.filter((record) =>
    relatedRecordIds.includes(record.id)
  );

  if (fn === "count") return relatedRecords.length;
  if (!targetFieldId) return null;

  const numericValues = relatedRecords
    .map((record) => Number(record.values[targetFieldId]))
    .filter((value) => !Number.isNaN(value));

  if (numericValues.length === 0) return null;

  switch (fn) {
    case "sum":
      return numericValues.reduce((acc, value) => acc + value, 0);
    case "avg":
      return numericValues.reduce((acc, value) => acc + value, 0) / numericValues.length;
    case "min":
      return Math.min(...numericValues);
    case "max":
      return Math.max(...numericValues);
    default:
      return null;
  }
}

export function computeRuntimeValues(
  records: ComputedRecord[],
  fields: ComputedField[],
  relationDatabases: RelationDatabase[]
): ComputedRecord[] {
  const relationDatabasesById = new Map(relationDatabases.map((db) => [db.id, db]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const sortedByPosition = [...fields].sort((a, b) => a.position - b.position);
  const rollupFields = sortedByPosition.filter((field) => field.type === "ROLLUP");
  const formulaFields = sortedByPosition.filter((field) => field.type === "FORMULA");

  return records.map((record) => {
    const values = { ...record.values };

    rollupFields.forEach((field) => {
      values[field.id] = computeRollupValue(field, values, fieldsById, relationDatabasesById);
    });

    formulaFields.forEach((field) => {
      const options = getFieldOptionsObject(field.options);
      values[field.id] = evaluateFormulaExpression(options.expression ?? "", sortedByPosition, values);
    });

    return { ...record, values };
  });
}

export function getRecordTitleForDatabase(db: RelationDatabase, record: RelationDatabaseRecord): string {
  const fallback = `Registro ${record.position + 1}`;
  if (!db.titleFieldId) return fallback;
  const raw = String(record.values[db.titleFieldId] ?? "").trim();
  return raw || fallback;
}
