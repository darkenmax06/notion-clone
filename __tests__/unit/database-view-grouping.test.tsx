import { render, screen, fireEvent } from "@testing-library/react";
import { FieldType } from "@prisma/client";
import DatabaseView, { type FieldRow, type RecordRow } from "@/components/views/DatabaseView";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/lib/actions/databases", () => ({
  createField: jest.fn(),
  updateField: jest.fn(),
  deleteField: jest.fn(),
  updateDatabase: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@/lib/actions/records", () => ({
  createRecord: jest.fn().mockResolvedValue({ success: true, record: { id: "new", position: 99 } }),
  updateRecord: jest.fn().mockResolvedValue({ success: true }),
  deleteRecord: jest.fn().mockResolvedValue({ success: true }),
}));

const fields: FieldRow[] = [
  { id: "field-title", name: "Tarea", type: FieldType.TEXT, position: 0, options: [] },
  {
    id: "field-status",
    name: "Estado",
    type: FieldType.SELECT,
    position: 1,
    options: [
      { value: "Pendiente", color: "#ef4444" },
      { value: "Completado", color: "#22c55e" },
    ],
  },
];

const records: RecordRow[] = [
  {
    id: "rec-1",
    position: 0,
    values: {
      "field-title": "Documento",
      "field-status": "Pendiente",
    },
  },
  {
    id: "rec-2",
    position: 1,
    values: {
      "field-title": "QA",
      "field-status": "Completado",
    },
  },
];

describe("DatabaseView table grouping", () => {
  it("groups table rows by selected field", () => {
    render(
      <DatabaseView
        database={{
          id: "db-1",
          title: "Tareas",
          icon: null,
          viewType: "TABLE",
        }}
        fields={fields}
        records={records}
      />
    );

    const selector = screen.getByTestId("table-group-selector");
    fireEvent.change(selector, { target: { value: "field-status" } });

    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completado").length).toBeGreaterThan(0);
  });
});
