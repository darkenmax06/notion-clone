import { FieldType } from "@prisma/client";
import {
  computeRuntimeValues,
  evaluateFormulaExpression,
  type ComputedField,
  type RelationDatabase,
} from "@/lib/database/computed-fields";

const field = (
  id: string,
  name: string,
  type: FieldType,
  position: number,
  options: unknown = {}
): ComputedField => ({
  id,
  name,
  type,
  position,
  options,
});

describe("computed fields runtime", () => {
  it("computes rollup avg and formula days_between", () => {
    const fields: ComputedField[] = [
      field("f-title", "Titulo", "TEXT", 0),
      field("f-start", "Inicio", "DATE", 1),
      field("f-end", "Fin", "DATE", 2),
      field("f-relation", "Contactos", "RELATION", 3, { relationDatabaseId: "db-contacts" }),
      field("f-rollup", "Tarifa media", "ROLLUP", 4, {
        relationFieldId: "f-relation",
        targetFieldId: "c-rate",
        function: "avg",
      }),
      field("f-formula", "Duracion", "FORMULA", 5, {
        expression: "DAYS_BETWEEN({Inicio}, {Fin})",
      }),
    ];

    const relationDb: RelationDatabase = {
      id: "db-contacts",
      title: "Contactos",
      titleFieldId: "c-name",
      fields: [
        field("c-name", "Nombre", "TEXT", 0),
        field("c-rate", "Tarifa", "NUMBER", 1),
      ],
      records: [
        { id: "c1", position: 0, values: { "c-name": "Ana", "c-rate": 100 } },
        { id: "c2", position: 1, values: { "c-name": "Luis", "c-rate": 80 } },
      ],
    };

    const records = [
      {
        id: "r1",
        position: 0,
        values: {
          "f-title": "Tarea A",
          "f-start": "2026-04-01",
          "f-end": "2026-04-05",
          "f-relation": ["c1", "c2"],
        },
      },
    ];

    const result = computeRuntimeValues(records, fields, [relationDb]);
    expect(result[0].values["f-rollup"]).toBe(90);
    expect(result[0].values["f-formula"]).toBe(4);
  });

  it("supports IF with double-quoted strings", () => {
    const fields: ComputedField[] = [
      field("f-done", "Completado", "CHECKBOX", 0),
      field("f-status", "Estado", "FORMULA", 1, {
        expression: 'IF({Completado}, "✓", "")',
      }),
    ];

    const result = computeRuntimeValues(
      [{ id: "r1", position: 0, values: { "f-done": true } }],
      fields,
      []
    );

    expect(result[0].values["f-status"]).toBe("✓");
  });

  it("returns null for invalid formulas", () => {
    const fields: ComputedField[] = [field("f-a", "A", "NUMBER", 0)];
    const value = evaluateFormulaExpression("IF({A}", fields, { "f-a": 10 });
    expect(value).toBeNull();
  });
});

