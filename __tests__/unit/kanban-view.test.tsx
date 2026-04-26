import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import KanbanView from "@/components/views/KanbanView";
import { FieldType } from "@prisma/client";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

// Mock dnd-kit - DOM pointer events aren't available in jsdom
jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: class {},
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn((...args: unknown[]) => args),
  closestCorners: jest.fn(),
  useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
  }),
  verticalListSortingStrategy: {},
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: jest.fn(() => "") } },
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const statusField: FieldRow = {
  id: "field-status",
  name: "Estado",
  type: FieldType.SELECT,
  position: 1,
  options: [
    { value: "Pendiente", color: "#ef4444" },
    { value: "En progreso", color: "#f59e0b" },
    { value: "Completado", color: "#22c55e" },
  ],
};

const priorityField: FieldRow = {
  id: "field-priority",
  name: "Prioridad",
  type: FieldType.SELECT,
  position: 2,
  options: [
    { value: "Alta", color: "#ef4444" },
    { value: "Media", color: "#f59e0b" },
    { value: "Baja", color: "#3b82f6" },
  ],
};

const nameField: FieldRow = {
  id: "field-name",
  name: "Tarea",
  type: FieldType.TEXT,
  position: 0,
  options: [],
};

const dateField: FieldRow = {
  id: "field-date",
  name: "Fecha",
  type: FieldType.DATE,
  position: 3,
  options: [],
};

const records: RecordRow[] = [
  {
    id: "rec-1",
    position: 0,
    values: { "field-name": "Tarea A", "field-status": "Pendiente", "field-date": "2026-04-20" },
  },
  {
    id: "rec-2",
    position: 1,
    values: { "field-name": "Tarea B", "field-status": "En progreso" },
  },
  {
    id: "rec-3",
    position: 2,
    values: { "field-name": "Tarea C", "field-status": "Completado" },
  },
  {
    id: "rec-4",
    position: 3,
    values: { "field-name": "Sin status" },
  },
];

const defaultProps = {
  fields: [nameField, statusField, dateField],
  records,
  groupFieldId: null,
  onGroupFieldChange: jest.fn().mockResolvedValue(undefined),
  onUpdateRecord: jest.fn().mockResolvedValue(undefined),
  onAddRecord: jest.fn().mockResolvedValue(undefined),
  onUpdateGroupFieldOptions: jest.fn().mockResolvedValue(undefined),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KanbanView", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders a column for each SELECT option", () => {
    render(<KanbanView {...defaultProps} />);

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("En progreso")).toBeInTheDocument();
    expect(screen.getByText("Completado")).toBeInTheDocument();
  });

  it("renders an uncategorized column for records without status", () => {
    render(<KanbanView {...defaultProps} />);
    expect(screen.getByText("Sin categoria")).toBeInTheDocument();
  });

  it("shows record titles inside cards", () => {
    render(<KanbanView {...defaultProps} />);
    expect(screen.getByText("Tarea A")).toBeInTheDocument();
    expect(screen.getByText("Tarea B")).toBeInTheDocument();
    expect(screen.getByText("Tarea C")).toBeInTheDocument();
  });

  it("shows date value on card when DATE field is present", () => {
    render(<KanbanView {...defaultProps} />);
    expect(screen.getByText("2026-04-20")).toBeInTheDocument();
  });

  it("calls onAddRecord when + button in column is clicked", async () => {
    render(<KanbanView {...defaultProps} />);
    const addButtons = screen.getAllByTitle(/Anadir a/i);
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(defaultProps.onAddRecord).toHaveBeenCalledTimes(1);
    });
  });

  it("shows 'requires SELECT field' message when no SELECT field exists", () => {
    render(<KanbanView {...defaultProps} fields={[nameField]} />);
    expect(screen.getByText(/requiere al menos un campo de tipo/i)).toBeInTheDocument();
  });

  it("shows 'Sin registros' placeholder in empty columns", () => {
    render(<KanbanView {...defaultProps} records={[]} />);
    const empties = screen.getAllByText("Sin registros");
    expect(empties.length).toBe(statusField.options.length);
  });

  it("shows the group selector when there are multiple SELECT fields", () => {
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
      />
    );
    expect(screen.getByTestId("kanban-group-selector")).toBeInTheDocument();
  });

  it("calls onGroupFieldChange with selected field ID", async () => {
    const onGroupFieldChange = jest.fn().mockResolvedValue(undefined);
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
        groupFieldId="field-status"
        onGroupFieldChange={onGroupFieldChange}
      />
    );
    fireEvent.click(screen.getByTestId("kanban-group-selector"));
    fireEvent.click(screen.getByTestId("group-option-field-priority"));

    await waitFor(() => {
      expect(onGroupFieldChange).toHaveBeenCalledWith("field-priority");
    });
  });

  it("supports creating a new column option from board toolbar", async () => {
    const onUpdateGroupFieldOptions = jest.fn().mockResolvedValue(undefined);
    render(
      <KanbanView
        {...defaultProps}
        onUpdateGroupFieldOptions={onUpdateGroupFieldOptions}
      />
    );

    fireEvent.click(screen.getByTestId("kanban-add-column-toggle"));
    fireEvent.change(screen.getByTestId("kanban-new-column-name"), {
      target: { value: "Bloqueado" },
    });
    fireEvent.click(screen.getByTestId("kanban-create-column"));

    await waitFor(() => {
      expect(onUpdateGroupFieldOptions).toHaveBeenCalledTimes(1);
    });

    const [fieldId, options] = onUpdateGroupFieldOptions.mock.calls[0];
    expect(fieldId).toBe("field-status");
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "Bloqueado" }),
      ])
    );
  });

  it("can collapse a column", () => {
    render(<KanbanView {...defaultProps} />);

    const collapseButtons = screen.getAllByTitle("Colapsar columna");
    fireEvent.click(collapseButtons[0]);

    expect(screen.queryByText("Tarea A")).not.toBeInTheDocument();
  });

  it("shows subgroup selector and can select a subgroup field", () => {
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
      />
    );

    expect(screen.getByText("Subgrupo:")).toBeInTheDocument();
    const subgroupSelect = screen.getByRole("combobox", { name: /subgrupo/i });
    fireEvent.change(subgroupSelect, { target: { value: "field-priority" } });

    expect(screen.getAllByText("Sin valor").length).toBeGreaterThan(0);
  });
});
