import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CalendarView from "@/components/views/CalendarView";
import { FieldType } from "@prisma/client";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

// Mock react-big-calendar — complex DOM/resize observer interactions
let capturedEvents: Array<{ title: string; start: Date; end: Date; allDay?: boolean; recordId: string }> = [];

jest.mock("react-big-calendar", () => ({
  Calendar: jest.fn(({ events, onSelectSlot, onSelectEvent, selectable }: {
    events: Array<{ title: string; start: Date; end: Date; allDay?: boolean; recordId: string }>;
    onSelectSlot?: (slot: { start: Date }) => void;
    onSelectEvent?: (event: { recordId: string }) => void;
    selectable?: boolean;
  }) => {
    capturedEvents = events;
    return (
      <div data-testid="rbc-calendar">
        {events.map((e, i) => (
          <button
            key={i}
            data-testid={`rbc-event-${i}`}
            data-allday={String(e.allDay ?? true)}
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
    );
  }),
  dateFnsLocalizer: jest.fn(() => ({})),
  Views: { MONTH: "month", WEEK: "week", DAY: "day", AGENDA: "agenda" },
}));

jest.mock("react-big-calendar/lib/css/react-big-calendar.css", () => ({}), { virtual: true });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const nameField: FieldRow = {
  id: "field-name",
  name: "Evento",
  type: FieldType.TEXT,
  position: 0,
  options: [],
};

const dateField: FieldRow = {
  id: "field-date",
  name: "Fecha",
  type: FieldType.DATE,
  position: 1,
  options: [],
};

const timeField: FieldRow = {
  id: "field-time",
  name: "Hora",
  type: FieldType.TIME,
  position: 2,
  options: [],
};

const typeField: FieldRow = {
  id: "field-type",
  name: "Tipo",
  type: FieldType.SELECT,
  position: 3,
  options: [
    { value: "Reunión", color: "#6366f1" },
    { value: "Entrega", color: "#ef4444" },
  ],
};

const records: RecordRow[] = [
  {
    id: "rec-1",
    position: 0,
    values: { "field-name": "Kick-off", "field-date": "2026-04-12", "field-time": "09:00", "field-type": "Reunión" },
  },
  {
    id: "rec-2",
    position: 1,
    values: { "field-name": "Entrega Phase 4", "field-date": "2026-04-22", "field-time": "17:00", "field-type": "Entrega" },
  },
  {
    id: "rec-3",
    position: 2,
    values: { "field-name": "Evento sin hora", "field-date": "2026-04-24" },
  },
  {
    id: "rec-4",
    position: 3,
    values: { "field-name": "Sin fecha" },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CalendarView", () => {
  const onAddRecord = jest.fn().mockResolvedValue(undefined);
  const onSelectRecord = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    capturedEvents = [];
  });

  it("renders the calendar container", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField, typeField]}
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
    // rec-4 has no date, so 3 events
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
    await waitFor(() => expect(onAddRecord).toHaveBeenCalledTimes(1));
  });

  // -------------------------------------------------------------------------
  // TIME field integration
  // -------------------------------------------------------------------------

  it("shows 'Hora desde' label in the info text when TIME field present", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    expect(screen.getByText(/Hora desde/i)).toBeInTheDocument();
  });

  it("shows 'Vista semana/día muestra hora exacta' badge when TIME field present", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    expect(screen.getByText(/hora exacta/i)).toBeInTheDocument();
  });

  it("does NOT show the TIME badge when no TIME field", () => {
    render(
      <CalendarView
        fields={[nameField, dateField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    expect(screen.queryByText(/hora exacta/i)).not.toBeInTheDocument();
  });

  it("marks events with a TIME value as allDay=false", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    const kickoff = capturedEvents.find((e) => e.title === "Kick-off");
    expect(kickoff).toBeDefined();
    expect(kickoff?.allDay).toBe(false);
  });

  it("marks events without a TIME value as allDay=true", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    const sinHora = capturedEvents.find((e) => e.title === "Evento sin hora");
    expect(sinHora).toBeDefined();
    expect(sinHora?.allDay).toBe(true);
  });

  it("sets start hour correctly from TIME field (09:00 → hour 9)", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    const kickoff = capturedEvents.find((e) => e.title === "Kick-off");
    expect(kickoff?.start.getHours()).toBe(9);
    expect(kickoff?.start.getMinutes()).toBe(0);
  });

  it("sets end = start + 1 hour for timed events", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    const kickoff = capturedEvents.find((e) => e.title === "Kick-off");
    const diffMs = kickoff!.end.getTime() - kickoff!.start.getTime();
    expect(diffMs).toBe(60 * 60 * 1000);
  });

  it("handles 17:00 time correctly", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    const entrega = capturedEvents.find((e) => e.title === "Entrega Phase 4");
    expect(entrega?.start.getHours()).toBe(17);
    expect(entrega?.allDay).toBe(false);
  });

  it("shows SELECT field name in info text when present", () => {
    render(
      <CalendarView
        fields={[nameField, dateField, timeField, typeField]}
        records={records}
        onAddRecord={onAddRecord}
        onSelectRecord={onSelectRecord}
      />
    );
    expect(screen.getByText(/Tipo/)).toBeInTheDocument();
  });
});
