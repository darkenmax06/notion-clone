import type { FieldType } from "@prisma/client";

export type SelectOption = {
  value: string;
  color: string;
};

export type FileCellValue = {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type RollupFunction = "count" | "sum" | "avg" | "min" | "max";

export type RelationFieldOptions = {
  relationDatabaseId?: string | null;
};

export type RollupFieldOptions = {
  relationFieldId?: string;
  targetFieldId?: string;
  function?: RollupFunction;
};

export type FormulaFieldOptions = {
  expression?: string;
};

export type FieldOptionsObject = RelationFieldOptions & RollupFieldOptions & FormulaFieldOptions;

export type FieldOptions = SelectOption[] | FieldOptionsObject;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSelectOption(value: unknown): value is SelectOption {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.value === "string" &&
    value.value.trim().length > 0 &&
    typeof value.color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value.color)
  );
}

export function getSelectOptions(options: unknown): SelectOption[] {
  if (!Array.isArray(options)) return [];
  return options.filter(isSelectOption);
}

export function getFieldOptionsObject(options: unknown): FieldOptionsObject {
  if (!isPlainObject(options)) return {};
  return options as FieldOptionsObject;
}

export function normalizeFieldOptions(type: FieldType, options: unknown): FieldOptions {
  if (type === "SELECT" || type === "MULTI_SELECT") {
    return getSelectOptions(options);
  }
  return getFieldOptionsObject(options);
}
