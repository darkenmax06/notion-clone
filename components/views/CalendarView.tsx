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
  resource: RecordRow;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((f) => f.type === FieldType.DATE);
}

function getTitleField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((f) => f.type === FieldType.TEXT);
}

function getSelectField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((f) => f.type === FieldType.SELECT);
}

function buildEvents(
  records: RecordRow[],
  dateField: FieldRow,
  titleField: FieldRow | undefined,
  selectField: FieldRow | undefined
): CalendarEvent[] {
  return records
    .filter((r) => {
      const raw = r.values[dateField.id];
      return raw && String(raw).length >= 10;
    })
    .map((r) => {
      const raw = String(r.values[dateField.id]).slice(0, 10);
      const date = new Date(raw + "T12:00:00");
      const title = titleField
        ? String(r.values[titleField.id] ?? "Sin título")
        : "Sin título";

      const statusValue = selectField
        ? String(r.values[selectField.id] ?? "")
        : "";
      const statusColor =
        selectField?.options?.find((o) => o.value === statusValue)?.color ??
        "#6366f1";

      return {
        recordId: r.id,
        title,
        start: date,
        end: date,
        allDay: true,
        resource: r,
        color: statusColor,
      } as CalendarEvent;
    });
}

// ---------------------------------------------------------------------------
// CalendarView
// ---------------------------------------------------------------------------

export default function CalendarView({
  fields,
  records,
  onAddRecord,
  onSelectRecord,
}: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<string>(Views.MONTH);

  const dateField = useMemo(() => getDateField(fields), [fields]);
  const titleField = useMemo(() => getTitleField(fields), [fields]);
  const selectField = useMemo(() => getSelectField(fields), [fields]);

  const events = useMemo(
    () =>
      dateField
        ? buildEvents(records, dateField, titleField, selectField)
        : [],
    [records, dateField, titleField, selectField]
  );

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      onAddRecord(start);
    },
    [onAddRecord]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectRecord(event.recordId);
    },
    [onSelectRecord]
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => ({
      style: {
        backgroundColor: (event as CalendarEvent & { color?: string }).color ?? "#6366f1",
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
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs text-gray-400">
          Mostrando eventos del campo <strong>{dateField.name}</strong>
          {selectField && (
            <>
              {" "}
              · Coloreados por <strong>{selectField.name}</strong>
            </>
          )}
        </p>
        <button
          onClick={() => onAddRecord(currentDate)}
          className="ml-auto flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
          data-testid="calendar-quick-add"
        >
          <Plus size={12} />
          Añadir
        </button>
      </div>

      <div
        className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        style={{ minHeight: 500 }}
        data-testid="calendar-container"
      >
        <Calendar
          localizer={localizer}
          events={events}
          date={currentDate}
          view={currentView as Parameters<typeof Calendar>[0]["view"]}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent as (event: Event) => void}
          eventPropGetter={eventStyleGetter as Parameters<typeof Calendar>[0]["eventPropGetter"]}
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
