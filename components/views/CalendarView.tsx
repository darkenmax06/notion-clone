"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, type Event, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Plus } from "lucide-react";
import { FieldType } from "@prisma/client";
import type { FieldRow, RecordRow } from "./DatabaseView";
import "react-big-calendar/lib/css/react-big-calendar.css";

// ---------------------------------------------------------------------------
// Localizer
// ---------------------------------------------------------------------------

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  fields: FieldRow[];
  records: RecordRow[];
  onAddRecord: (date: Date) => Promise<void>;
  onSelectRecord: (recordId: string) => void;
};

type CalendarEvent = Event & {
  recordId: string;
  color: string;
  resource: RecordRow;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((f) => f.type === FieldType.DATE);
}

/** Returns [startTimeField, endTimeField] from all TIME fields in order. */
function getTimeFields(fields: FieldRow[]): [FieldRow | undefined, FieldRow | undefined] {
  const timeFields = fields.filter((f) => f.type === FieldType.TIME);
  return [timeFields[0], timeFields[1]];
}

function getTitleField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((f) => f.type === FieldType.TEXT);
}

function getSelectField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((f) => f.type === FieldType.SELECT);
}

function parseTime(str: string): { hours: number; minutes: number } | null {
  const m = str.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { hours: parseInt(m[1], 10), minutes: parseInt(m[2], 10) };
}

/** Build a local Date from a YYYY-MM-DD string + optional HH:MM string. */
function buildDate(dateStr: string, timeStr?: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const date = new Date(y, mo - 1, d); // local noon as default
  if (timeStr) {
    const t = parseTime(timeStr);
    if (t) date.setHours(t.hours, t.minutes, 0, 0);
    else date.setHours(12, 0, 0, 0);
  } else {
    date.setHours(12, 0, 0, 0);
  }
  return date;
}

function buildEvents(
  records: RecordRow[],
  dateField: FieldRow,
  startTimeField: FieldRow | undefined,
  endTimeField: FieldRow | undefined,
  titleField: FieldRow | undefined,
  selectField: FieldRow | undefined
): CalendarEvent[] {
  return records
    .filter((r) => {
      const raw = r.values[dateField.id];
      return raw && String(raw).length >= 10;
    })
    .map((r) => {
      const dateRaw      = String(r.values[dateField.id]).slice(0, 10);
      const startTimeRaw = startTimeField ? String(r.values[startTimeField.id] ?? "") : "";
      const endTimeRaw   = endTimeField   ? String(r.values[endTimeField.id]   ?? "") : "";

      const hasStartTime = Boolean(startTimeRaw && parseTime(startTimeRaw));
      const hasEndTime   = Boolean(endTimeRaw   && parseTime(endTimeRaw));

      let start: Date;
      let end: Date;
      let allDay: boolean;

      if (hasStartTime) {
        start = buildDate(dateRaw, startTimeRaw);
        if (hasEndTime) {
          end = buildDate(dateRaw, endTimeRaw);
          // guard: end must be after start
          if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
        } else {
          end = new Date(start.getTime() + 60 * 60 * 1000); // default +1h
        }
        allDay = false;
      } else {
        // no time → full-day event
        start  = buildDate(dateRaw);
        end    = start;
        allDay = true;
      }

      const title = titleField
        ? String(r.values[titleField.id] ?? "Sin título")
        : "Sin título";

      const statusValue = selectField ? String(r.values[selectField.id] ?? "") : "";
      const color =
        selectField?.options?.find((o) => o.value === statusValue)?.color ?? "#6366f1";

      return { recordId: r.id, title, start, end, allDay, color, resource: r } as CalendarEvent;
    });
}

// ---------------------------------------------------------------------------
// CalendarView
// ---------------------------------------------------------------------------

export default function CalendarView({ fields, records, onAddRecord, onSelectRecord }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<string>(Views.MONTH);

  const dateField   = useMemo(() => getDateField(fields),    [fields]);
  const [startTimeField, endTimeField] = useMemo(() => getTimeFields(fields), [fields]);
  const titleField  = useMemo(() => getTitleField(fields),  [fields]);
  const selectField = useMemo(() => getSelectField(fields), [fields]);

  const events = useMemo(
    () => dateField
      ? buildEvents(records, dateField, startTimeField, endTimeField, titleField, selectField)
      : [],
    [records, dateField, startTimeField, endTimeField, titleField, selectField]
  );

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => { onAddRecord(start); },
    [onAddRecord]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => { onSelectRecord(event.recordId); },
    [onSelectRecord]
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => ({
      style: {
        backgroundColor: event.color,
        border: "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "12px",
        padding: "1px 6px",
      },
    }),
    []
  );

  if (!dateField) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-gray-400">
        <p className="text-sm">
          La vista Calendario requiere al menos un campo de tipo{" "}
          <strong>Date</strong>. Añade uno en la vista Tabla.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6">
      {/* Info bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs text-gray-400">
          Eventos del campo <strong>{dateField.name}</strong>
          {startTimeField && (
            <>
              {" "}· Inicio: <strong>{startTimeField.name}</strong>
            </>
          )}
          {endTimeField && (
            <>
              {" "}· Fin: <strong>{endTimeField.name}</strong>
            </>
          )}
          {selectField && (
            <>
              {" "}· Color: <strong>{selectField.name}</strong>
            </>
          )}
        </p>

        {startTimeField && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
            {endTimeField
              ? "Vista semana/día muestra hora exacta con duración"
              : "Vista semana/día muestra hora exacta"}
          </span>
        )}

        <button
          onClick={() => onAddRecord(currentDate)}
          className="ml-auto flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
          data-testid="calendar-quick-add"
        >
          <Plus size={12} />
          Añadir
        </button>
      </div>

      {/* Calendar */}
      <div
        className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        style={{ minHeight: 500 }}
        data-testid="calendar-container"
      >
        <Calendar
          localizer={localizer}
          events={events}
          date={currentDate}
          view={currentView as "month" | "week" | "day" | "agenda"}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent as (event: Event) => void}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eventPropGetter={eventStyleGetter as any}
          messages={{
            next: "›",
            previous: "‹",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
            agenda: "Agenda",
            noEventsInRange: "Sin eventos en este rango.",
            showMore: (total) => `+${total} más`,
          }}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
