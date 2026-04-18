import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CalendarView from "@/components/views/CalendarView";
import { FieldType } from "@prisma/client";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

// Capture events passed to the Calendar mock for assertion
let capturedEvents: Array<{
  title: string; start: Date; end: Date; allDay?: boolean; recordId: string;
}> = [];

jest.mock("react-big-calendar", () => ({
  Calendar: jest.fn(({ events, onSelectSlot, onSelectEvent, selectable }: {
    events: typeof capturedEvents;
    onSelectSlot?: (slot: { start: Date }) => void;
    onSelectEvent?: (event: { recordId: string }) => void;
    selectable?: boolean;
  }) => {
    capturedEvents = events;
    return (
      <div data-testid="rbc-calendar">
        {events.map((e, i) => (
          <button key={i} data-testid={`rbc-event-${i}`} data-allday={String(e.allDay ?? true)}
            onClick={() => onSelectEvent?.({ recordId: e.recordId })}>
            {e.title}
          </button>
        ))}
        {selectable && (
          <button data-testid="rbc-slot"
            onClick={() => onSelectSlot?.({ start: new Date("2026-04-20T00:00:00") })}>
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

const nameField: FieldRow  = { id: "f-name",  name: "Evento",      type: FieldType.TEXT,   position: 0, options: [] };
const dateField: FieldRow  = { id: "f-date",  name: "Fecha",       type: FieldType.DATE,   position: 1, options: [] };
const startTF: FieldRow    = { id: "f-start", name: "Hora inicio", type: FieldType.TIME,   position: 2, options: [] };
const endTF: FieldRow      = { id: "f-end",   name: "Hora fin",    type: FieldType.TIME,   position: 3, options: [] };
const typeField: FieldRow  = {
  id: "f-type", name: "Tipo", type: FieldType.SELECT, position: 4,
  options: [{ value: "Reunión", color: "#6366f1" }, { value: "Entrega", color: "#ef4444" }],
};

const records: RecordRow[] = [
  { id: "r1", position: 0, values: { "f-name": "Kick-off",    "f-date": "2026-04-12", "f-start": "09:00", "f-end": "10:00", "f-type": "Reunión" } },
  { id: "r2", position: 1, values: { "f-name": "Demo",        "f-date": "2026-04-25", "f-start": "15:00", "f-end": "16:30", "f-type": "Entrega" } },
  { id: "r3", position: 2, values: { "f-name": "Todo el día", "f-date": "2026-04-24" } },
  { id: "r4", position: 3, values: { "f-name": "Sin fecha"  } },
];

const defaultProps = {
  fields: [nameField, dateField, startTF, endTF, typeField],
  records,
  onAddRecord: jest.fn().mockResolvedValue(undefined),
  onSelectRecord: jest.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CalendarView", () => {
  beforeEach(() => { jest.clearAllMocks(); capturedEvents = []; });

  it("renders the calendar container", () => {
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByTestId("rbc-calendar")).toBeInTheDocument();
  });

  it("excludes records without a date", () => {
    render(<CalendarView {...defaultProps} />);
    expect(screen.queryByText("Sin fecha")).not.toBeInTheDocument();
  });

  it("shows 'requires DATE field' when no DATE field exists", () => {
    render(<CalendarView {...defaultProps} fields={[nameField]} />);
    expect(screen.getByText(/requiere al menos un campo de tipo/i)).toBeInTheDocument();
  });

  it("calls onSelectRecord when an event is clicked", () => {
    render(<CalendarView {...defaultProps} />);
    fireEvent.click(screen.getByTestId("rbc-event-0"));
    expect(defaultProps.onSelectRecord).toHaveBeenCalledWith("r1");
  });

  it("calls onAddRecord when a slot is clicked", async () => {
    render(<CalendarView {...defaultProps} />);
    fireEvent.click(screen.getByTestId("rbc-slot"));
    await waitFor(() => expect(defaultProps.onAddRecord).toHaveBeenCalledWith(expect.any(Date)));
  });

  it("renders the quick-add button and calls onAddRecord", async () => {
    render(<CalendarView {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-quick-add"));
    await waitFor(() => expect(defaultProps.onAddRecord).toHaveBeenCalledTimes(1));
  });

  // -------------------------------------------------------------------------
  // Start + End time
  // -------------------------------------------------------------------------

  it("marks events with a start time as allDay=false", () => {
    render(<CalendarView {...defaultProps} />);
    const kickoff = capturedEvents.find((e) => e.title === "Kick-off");
    expect(kickoff?.allDay).toBe(false);
  });

  it("marks events without time as allDay=true", () => {
    render(<CalendarView {...defaultProps} />);
    const todo = capturedEvents.find((e) => e.title === "Todo el día");
    expect(todo?.allDay).toBe(true);
  });

  it("sets start hour correctly from Hora inicio field", () => {
    render(<CalendarView {...defaultProps} />);
    const kickoff = capturedEvents.find((e) => e.title === "Kick-off");
    expect(kickoff?.start.getHours()).toBe(9);
    expect(kickoff?.start.getMinutes()).toBe(0);
  });

  it("sets end hour correctly from Hora fin field", () => {
    render(<CalendarView {...defaultProps} />);
    const kickoff = capturedEvents.find((e) => e.title === "Kick-off");
    expect(kickoff?.end.getHours()).toBe(10);
    expect(kickoff?.end.getMinutes()).toBe(0);
  });

  it("uses Hora inicio + Hora fin to compute correct duration (1.5h)", () => {
    render(<CalendarView {...defaultProps} />);
    const demo = capturedEvents.find((e) => e.title === "Demo");
    const diffMs = demo!.end.getTime() - demo!.start.getTime();
    expect(diffMs).toBe(90 * 60 * 1000); // 1.5h
  });

  it("defaults to +1h duration when only Hora inicio is present", () => {
    const fields = [nameField, dateField, startTF]; // no endTF
    const recs: RecordRow[] = [
      { id: "x1", position: 0, values: { "f-name": "Solo inicio", "f-date": "2026-04-12", "f-start": "09:00" } },
    ];
    render(<CalendarView fields={fields} records={recs} onAddRecord={jest.fn()} onSelectRecord={jest.fn()} />);
    const ev = capturedEvents.find((e) => e.title === "Solo inicio");
    const diffMs = ev!.end.getTime() - ev!.start.getTime();
    expect(diffMs).toBe(60 * 60 * 1000);
  });

  it("shows Hora inicio and Hora fin labels in info bar", () => {
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText(/Inicio:/)).toBeInTheDocument();
    expect(screen.getByText(/Fin:/)).toBeInTheDocument();
  });

  it("shows badge with 'duración' when both time fields present", () => {
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText(/duración/i)).toBeInTheDocument();
  });

  it("shows badge without 'duración' when only start time present", () => {
    render(<CalendarView {...defaultProps} fields={[nameField, dateField, startTF]} />);
    expect(screen.queryByText(/duración/i)).not.toBeInTheDocument();
    expect(screen.getByText(/hora exacta/i)).toBeInTheDocument();
  });

  it("shows color field name when SELECT field is present", () => {
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText(/Color:/)).toBeInTheDocument();
  });
});
