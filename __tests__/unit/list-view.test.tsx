import { render, screen, fireEvent } from "@testing-library/react";
import { FieldType } from "@prisma/client";
import ListView from "@/components/views/ListView";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

const fields: FieldRow[] = [
  {
    id: "field-title",
    name: "Tarea",
    type: FieldType.TEXT,
    position: 0,
    options: [],
  },
  {
    id: "field-status",
    name: "Estado",
    type: FieldType.SELECT,
    position: 1,
    options: [{ value: "Pendiente", color: "#ef4444" }],
  },
  {
    id: "field-due",
    name: "Vence",
    type: FieldType.DATE,
    position: 2,
    options: [],
  },
];

const records: RecordRow[] = [
  {
    id: "rec-1",
    position: 0,
    values: {
      "field-title": "Preparar demo",
      "field-status": "Pendiente",
      "field-due": "2026-05-01",
    },
  },
];

describe("ListView", () => {
  it("renders list rows with title and inline fields", () => {
    render(
      <ListView
        fields={fields}
        records={records}
        onSelectRecord={jest.fn()}
        onAddRecord={jest.fn()}
      />
    );

    expect(screen.getByTestId("list-row-rec-1")).toBeInTheDocument();
    expect(screen.getByText("Preparar demo")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("2026-05-01")).toBeInTheDocument();
  });

  it("calls onSelectRecord when row is clicked", () => {
    const onSelectRecord = jest.fn();
    render(
      <ListView
        fields={fields}
        records={records}
        onSelectRecord={onSelectRecord}
        onAddRecord={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("list-row-rec-1"));
    expect(onSelectRecord).toHaveBeenCalledWith("rec-1");
  });

  it("shows empty state when no records", () => {
    render(
      <ListView
        fields={fields}
        records={[]}
        onSelectRecord={jest.fn()}
        onAddRecord={jest.fn()}
      />
    );

    expect(screen.getByText(/sin registros en la vista lista/i)).toBeInTheDocument();
  });
});
