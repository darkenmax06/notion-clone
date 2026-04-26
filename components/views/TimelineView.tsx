"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldType } from "@prisma/client";
import { CalendarRange } from "lucide-react";
import type { FieldRow, RecordRow } from "./DatabaseView";
import { cn } from "@/lib/utils";

type Props = {
  fields: FieldRow[];
  records: RecordRow[];
  startFieldId: string | null;
  endFieldId: string | null;
  onStartFieldChange: (fieldId: string | null) => Promise<void> | void;
  onEndFieldChange: (fieldId: string | null) => Promise<void> | void;
  onUpdateRecord: (recordId: string, values: Record<string, unknown>) => Promise<void>;
  onSelectRecord: (recordId: string) => void;
};

type ZoomMode = "week" | "month";

type TimelineItem = {
  record: RecordRow;
  title: string;
  start: Date;
  end: Date;
};

type HeaderSegment = {
  label: string;
  startOffset: number;
  spanDays: number;
};

function parseDate(value: unknown): Date | null {
  const raw = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;

  const result = new Date(year, month - 1, day);
  if (Number.isNaN(result.getTime())) return null;
  result.setHours(0, 0, 0, 0);
  return result;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function diffInDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
}

function getTitleField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((field) => field.type === FieldType.TEXT) ?? fields[0];
}

function getDateFields(fields: FieldRow[]): FieldRow[] {
  return fields.filter((field) => field.type === FieldType.DATE);
}

function buildTimelineItems(
  records: RecordRow[],
  titleField: FieldRow | undefined,
  startField: FieldRow,
  endField: FieldRow
): TimelineItem[] {
  return records
    .map((record) => {
      const start = parseDate(record.values[startField.id]);
      const endRaw = parseDate(record.values[endField.id]);
      if (!start || !endRaw) return null;

      const end = endRaw < start ? start : endRaw;
      const title = titleField ? String(record.values[titleField.id] ?? "Sin titulo") : "Sin titulo";

      return { record, title, start, end };
    })
    .filter((item): item is TimelineItem => item !== null);
}

function resolveDateRange(items: TimelineItem[], zoom: ZoomMode): { start: Date; end: Date } {
  const padding = zoom === "week" ? 7 : 30;

  if (items.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { start: addDays(today, -padding), end: addDays(today, padding) };
  }

  const start = new Date(Math.min(...items.map((item) => item.start.getTime())));
  const end = new Date(Math.max(...items.map((item) => item.end.getTime())));

  return { start: addDays(start, -padding), end: addDays(end, padding) };
}

function buildHeaderSegments(rangeStart: Date, rangeEnd: Date, zoom: ZoomMode): HeaderSegment[] {
  const segments: HeaderSegment[] = [];
  let cursor = new Date(rangeStart);

  while (cursor <= rangeEnd) {
    const segmentStart = new Date(cursor);
    let segmentEnd: Date;

    if (zoom === "week") {
      segmentEnd = addDays(segmentStart, 6);
      if (segmentEnd > rangeEnd) segmentEnd = new Date(rangeEnd);
      const endLabel = segmentEnd.toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
      const startLabel = segmentStart.toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
      segments.push({
        label: `${startLabel} - ${endLabel}`,
        startOffset: diffInDays(rangeStart, segmentStart),
        spanDays: diffInDays(segmentStart, segmentEnd) + 1,
      });
    } else {
      const monthEnd = new Date(segmentStart.getFullYear(), segmentStart.getMonth() + 1, 0);
      segmentEnd = monthEnd > rangeEnd ? new Date(rangeEnd) : monthEnd;
      segments.push({
        label: segmentStart.toLocaleDateString("es-DO", { month: "long", year: "numeric" }),
        startOffset: diffInDays(rangeStart, segmentStart),
        spanDays: diffInDays(segmentStart, segmentEnd) + 1,
      });
    }

    cursor = addDays(segmentEnd, 1);
  }

  return segments;
}

export default function TimelineView({
  fields,
  records,
  startFieldId,
  endFieldId,
  onStartFieldChange,
  onEndFieldChange,
  onUpdateRecord,
  onSelectRecord,
}: Props) {
  const [localRecords, setLocalRecords] = useState<RecordRow[]>(records);
  const [zoom, setZoom] = useState<ZoomMode>("week");
  const [draggingRecordId, setDraggingRecordId] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const dateFields = useMemo(() => getDateFields(fields), [fields]);
  const titleField = useMemo(() => getTitleField(fields), [fields]);
  const activeStartField = useMemo(
    () => dateFields.find((field) => field.id === startFieldId) ?? dateFields[0],
    [dateFields, startFieldId]
  );
  const activeEndField = useMemo(
    () => dateFields.find((field) => field.id === endFieldId) ?? dateFields[1] ?? dateFields[0],
    [dateFields, endFieldId]
  );

  const dayWidth = zoom === "week" ? 28 : 14;

  const timelineItems = useMemo(
    () =>
      activeStartField && activeEndField
        ? buildTimelineItems(localRecords, titleField, activeStartField, activeEndField)
        : [],
    [localRecords, titleField, activeStartField, activeEndField]
  );

  const range = useMemo(() => resolveDateRange(timelineItems, zoom), [timelineItems, zoom]);
  const totalDays = Math.max(diffInDays(range.start, range.end) + 1, 1);
  const timelineWidth = Math.max(totalDays * dayWidth, 680);
  const headerSegments = useMemo(
    () => buildHeaderSegments(range.start, range.end, zoom),
    [range.start, range.end, zoom]
  );

  if (dateFields.length < 2) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-gray-400">
        <p className="text-sm">
          La vista Timeline requiere al menos dos campos de tipo <strong>Date</strong> (inicio y fin).
        </p>
      </div>
    );
  }

  function handleBarDragStart(event: React.MouseEvent, item: TimelineItem) {
    if (event.button !== 0 || !activeStartField || !activeEndField) return;
    event.preventDefault();

    const recordId = item.record.id;
    const initialX = event.clientX;
    const baseStart = item.start;
    const baseEnd = item.end;
    const originalValues = item.record.values;
    let latestStart = toDateKey(baseStart);
    let latestEnd = toDateKey(baseEnd);

    setDraggingRecordId(recordId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = Math.round((moveEvent.clientX - initialX) / dayWidth);
      const shiftedStart = addDays(baseStart, delta);
      const shiftedEnd = addDays(baseEnd, delta);
      latestStart = toDateKey(shiftedStart);
      latestEnd = toDateKey(shiftedEnd);

      setLocalRecords((prev) =>
        prev.map((record) =>
          record.id === recordId
            ? {
                ...record,
                values: {
                  ...record.values,
                  [activeStartField.id]: latestStart,
                  [activeEndField.id]: latestEnd,
                },
              }
            : record
        )
      );
    };

    const handleMouseUp = async () => {
      window.removeEventListener("mousemove", handleMouseMove);
      setDraggingRecordId(null);

      if (latestStart === toDateKey(baseStart) && latestEnd === toDateKey(baseEnd)) return;

      await onUpdateRecord(recordId, {
        ...originalValues,
        [activeStartField.id]: latestStart,
        [activeEndField.id]: latestEnd,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { once: true });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-2 dark:border-gray-800">
        <label className="text-xs text-gray-500">
          Inicio:
          <select
            value={activeStartField?.id ?? ""}
            onChange={(e) => onStartFieldChange(e.target.value || null)}
            className="ml-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            data-testid="timeline-start-field"
          >
            {dateFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-gray-500">
          Fin:
          <select
            value={activeEndField?.id ?? ""}
            onChange={(e) => onEndFieldChange(e.target.value || null)}
            className="ml-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            data-testid="timeline-end-field"
          >
            {dateFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-2 flex overflow-hidden rounded border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setZoom("week")}
            className={cn(
              "px-2 py-1 text-xs",
              zoom === "week"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300"
            )}
          >
            Semana
          </button>
          <button
            onClick={() => setZoom("month")}
            className={cn(
              "px-2 py-1 text-xs",
              zoom === "month"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300"
            )}
          >
            Mes
          </button>
        </div>

        <p className="ml-auto text-xs text-gray-400">
          Arrastra barras para mover fechas de inicio/fin.
        </p>
      </div>

      {timelineItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          No hay registros con fechas validas para mostrar en Timeline.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
              <div className="w-64 border-r border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Registro
              </div>
              <div className="relative h-12" style={{ width: timelineWidth }}>
                {headerSegments.map((segment) => (
                  <div
                    key={`${segment.startOffset}-${segment.label}`}
                    className="absolute top-0 h-full border-r border-gray-200 px-2 py-3 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400"
                    style={{
                      left: segment.startOffset * dayWidth,
                      width: segment.spanDays * dayWidth,
                    }}
                  >
                    <span className="truncate">{segment.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {timelineItems.map((item) => {
              const offsetDays = diffInDays(range.start, item.start);
              const spanDays = Math.max(diffInDays(item.start, item.end) + 1, 1);
              const barLeft = offsetDays * dayWidth;
              const barWidth = Math.max(spanDays * dayWidth - 2, 12);

              return (
                <div key={item.record.id} className="flex border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => onSelectRecord(item.record.id)}
                    className="w-64 truncate border-r border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800/50"
                  >
                    {item.title}
                  </button>
                  <div
                    className="relative h-12"
                    style={{
                      width: timelineWidth,
                      backgroundImage:
                        "linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px)",
                      backgroundSize: `${dayWidth}px 100%`,
                    }}
                  >
                    <button
                      className={cn(
                        "absolute top-2 h-8 rounded-md bg-indigo-500 px-2 text-left text-xs text-white shadow-sm transition",
                        "hover:bg-indigo-600",
                        draggingRecordId === item.record.id && "cursor-grabbing opacity-90",
                        draggingRecordId !== item.record.id && "cursor-grab"
                      )}
                      style={{ left: barLeft + 1, width: barWidth }}
                      onMouseDown={(event) => handleBarDragStart(event, item)}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectRecord(item.record.id);
                      }}
                      data-testid={`timeline-bar-${item.record.id}`}
                    >
                      <span className="line-clamp-1">{item.title}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-gray-100 px-6 py-2 text-xs text-gray-400 dark:border-gray-800">
        <CalendarRange size={12} />
        Rango: {range.start.toLocaleDateString("es-DO")} - {range.end.toLocaleDateString("es-DO")}
      </div>
    </div>
  );
}
