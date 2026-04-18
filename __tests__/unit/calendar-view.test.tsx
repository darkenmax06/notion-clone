import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CalendarView from "@/components/views/CalendarView";
import { FieldType } from "@prisma/client";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

// Mock react-big-calendar — complex DOM/resize observer interactions
jest.mock("react-big-calendar", () => ({
  Calendar: jest.fn(({ events, onSelectSlot, onSelectEvent, selectable }: {
    events: Array<{ title: string; start: Date; end: Date; recordId: string }>;
    onSelectSlot?: (slot: { start: Date }) => void;
    onSelectEvent?: (event: { recordId: string }) => void;
    selectable?: boolean;
  }) => (
    <div data-testid="rbc-calendar">
      {events.map((e, i) => (
        <button
          key={i}
          data-testid={`rbc-event-${i}`}
          onClick={() => onSelectEvent?.({ recordId: e.recordId })}
        >
          {e.title}
        </button>
      ))}
      {selectable && (
        <button
          data-testid="rbc-slot"
          onClick={() => onSelectSlot?.({ start: new Date("2026-04-20") })}
        >
          slot
        </button>
      )}
    </div>
  )),
  dateFnsLocalizer: jest.fn(() => ({})),
  Views: { MONTH: "month", WEEK: "week", DAY: "day", AGENDA: "agenda" },
}));

// Mock CSS import
jest.mock("react-big-calendar/lib/css/react-big-calendar.css", () => ({}), { virtual: true });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const dateField: FieldRow = {
  id: "field-date",
  name: "Fecha",
  type: FieldType.DATE,
  position: 1,
  options: [],
};

const nameField: FieldRow = {
  id: "field-name",
  name: "Evento",
  type: FieldType.TEXT,
  position: 0,
  options: [],
};

const typeField: FieldRow = {
  id: "field-type",
  name: "Tipo",
  type: FieldType.SELECT,
  position: 2,
  options: [
    { value: "Reunión", color: "#6366f1" },
    { value: "Entrega", color: "#ef4444" },
  ],
};

const records: RecordRow[] = [
  {
    id: "rec-1",
    position: 0,
    values: { "field-name": "Kick-off", "field-date": "2026-04-12", "field-type": "Reunión" },
  },
  {
    id: "rec-2",
    position: 1,
    values: { "field-name": "Entrega Phase 4", "field-date": "2026-04-22", "field-type": "Entrega" },
  },
  {
    id: "rec-3",
    position: 2,
    values: { "field-name": "Sin fecha" },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CalendarView", () => {
  const onAddRecord = jest.fn().mockResolvedValue(undefined);
  const onSelectRecord = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it("renders the calendar container", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, typeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    expect(screen.getByTestId("rbc-calendar")).toBeInTheDocument();
  });

  it("passes only records with a valid date as events", () => {
    render(
      <CalendarView
        fields={[nameField, dateField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    // rec-1 and rec-2 have dates, rec-3 does not
    expect(screen.getByText("Kick-off")).toBeInTheDocument();
    expect(screen.getByText("Entrega Phase 4")).toBeInTheDocument();
    expect(screen.queryByText("Sin fecha")).not.toBeInTheDocument();
  });

  it("calls onSelectRecord when an event is clicked", () => {
    render(
      <CalendarView
        fields={[nameField, dateField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    fireEvent.click(screen.getByTestId("rbc-event-0"));
    expect(onSelectRecord).toHaveBeenCalledWith("rec-1");
  });

  it("calls onAddRecord with a date when a slot is clicked", async () => {
    render(
      <CalendarView
        fields={[nameField, dateField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    fireEvent.click(screen.getByTestId("rbc-slot"));

    await waitFor(() => {
      expect(onAddRecord).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  it("shows 'requires DATE field' message when no DATE field exists", () => {
    render(
      <CalendarView
        fields={[nameField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    expect(screen.getByText(/requiere al menos un campo de tipo/i)).toBeInTheDocument();
    expect(screen.getByText(/Date/i)).toBeInTheDocument();
  });

  it("shows the date field name in the info text", () => {
    render(
      <CalendarView
        fields={[nameField, dateField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    expect(screen.getByText(/Fecha/)).toBeInTheDocument();
  });

  it("shows select field name when SELECT field is present", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, typeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    expect(screen.getByText(/Tipo/)).toBeInTheDocument();
  });

  it("renders the quick-add button", () => {
    render(
      <CalendarView
        fields={[nameField, dateField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    expect(screen.getByTestId("calendar-quick-add")).toBeInTheDocument();
  });

  it("calls onAddRecord when quick-add button is clicked", async () => {
    render(
      <CalendarView
        fields={[nameField, dateField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );

    fireEvent.click(screen.getByTestId("calendar-quick-add"));

    await waitFor(() => {
      expect(onAddRecord).toHaveBeenCalledTimes(1);
    });
  });
});
