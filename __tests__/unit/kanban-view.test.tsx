import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import KanbanView from "@/components/views/KanbanView";
import { FieldType } from "@prisma/client";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

// Mock dnd-kit — DOM pointer events aren't available in jsdom
jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: class {},
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn((...args: unknown[]) => args),
  closestCorners: jest.fn(),
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

  it("renders an 'Uncategorized' column for records without status", () => {
    render(<KanbanView {...defaultProps} />);
    expect(screen.getByText("Sin categoría")).toBeInTheDocument();
  });

  it("shows record titles inside cards", () => {
    render(<KanbanView {...defaultProps} />);
    expect(screen.getByText("Tarea A")).toBeInTheDocument();
    expect(screen.getByText("Tarea B")).toBeInTheDocument();
    expect(screen.getByText("Tarea C")).toBeInTheDocument();
  });

  it("shows record count badge in column header", () => {
    render(<KanbanView {...defaultProps} />);
    const badges = screen.getAllByText("1");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows date value on card when DATE field is present", () => {
    render(<KanbanView {...defaultProps} />);
    expect(screen.getByText("2026-04-20")).toBeInTheDocument();
  });

  it("calls onAddRecord when + button in column is clicked", async () => {
    render(<KanbanView {...defaultProps} />);
    const addButtons = screen.getAllByTitle(/Añadir a/);
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

  // -------------------------------------------------------------------------
  // Group field selector
  // -------------------------------------------------------------------------

  it("does NOT show the group selector when there is only one SELECT field", () => {
    render(<KanbanView {...defaultProps} />);
    expect(screen.queryByTestId("kanban-group-selector")).not.toBeInTheDocument();
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

  it("displays the active group field name in the selector button", () => {
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
        groupFieldId="field-status"
      />
    );
    expect(screen.getByTestId("kanban-group-selector")).toHaveTextContent("Estado");
  });

  it("opens the dropdown and shows all SELECT field options", () => {
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
      />
    );
    fireEvent.click(screen.getByTestId("kanban-group-selector"));
    expect(screen.getByTestId("group-option-field-status")).toBeInTheDocument();
    expect(screen.getByTestId("group-option-field-priority")).toBeInTheDocument();
  });

  it("calls onGroupFieldChange with the selected field ID", async () => {
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

  it("uses groupFieldId prop to select the active group field", () => {
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
        groupFieldId="field-priority"
      />
    );
    // Columns should now come from priorityField options
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByText("Baja")).toBeInTheDocument();
  });

  it("falls back to first SELECT field when groupFieldId is null", () => {
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
        groupFieldId={null}
      />
    );
    // statusField is first SELECT, so its options appear
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("falls back to first SELECT field when groupFieldId points to non-existent field", () => {
    render(
      <KanbanView
        {...defaultProps}
        fields={[nameField, statusField, priorityField, dateField]}
        groupFieldId="field-nonexistent"
      />
    );
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });
});
