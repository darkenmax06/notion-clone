"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, ChevronDown } from "lucide-react";
import { FieldType } from "@prisma/client";
import type { FieldRow, RecordRow } from "./DatabaseView";
import type { SelectOption } from "./TableCell";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  fields: FieldRow[];
  records: RecordRow[];
  groupFieldId: string | null;
  onGroupFieldChange: (fieldId: string) => Promise<void>;
  onUpdateRecord: (recordId: string, values: Record<string, unknown>) => Promise<void>;
  onAddRecord: (groupValue: string, groupFieldId: string) => Promise<void>;
};

type KanbanColumn = {
  id: string;         // option value (or UNCATEGORIZED_ID)
  droppableId: string; // "col::" + id — unique droppable key
  label: string;
  color: string;
  records: RecordRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNCATEGORIZED_ID = "__uncategorized__";

// Prefix that can't collide with cuid record IDs
const COL_PREFIX = "col::";

function getSelectFields(fields: FieldRow[]): FieldRow[] {
  return fields.filter((f) => f.type === FieldType.SELECT);
}

function resolveGroupField(fields: FieldRow[], groupFieldId: string | null): FieldRow | undefined {
  if (groupFieldId) {
    const found = fields.find((f) => f.id === groupFieldId && f.type === FieldType.SELECT);
    if (found) return found;
  }
  return fields.find((f) => f.type === FieldType.SELECT);
}

function getTitleField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((f) => f.type === FieldType.TEXT);
}

function buildColumns(records: RecordRow[], groupField: FieldRow): KanbanColumn[] {
  const options: SelectOption[] = groupField.options ?? [];

  const columns: KanbanColumn[] = options.map((opt) => ({
    id: opt.value,
    droppableId: `${COL_PREFIX}${opt.value}`,
    label: opt.value,
    color: opt.color,
    records: records.filter((r) => r.values[groupField.id] === opt.value),
  }));

  const uncategorized = records.filter(
    (r) => !options.some((o) => o.value === r.values[groupField.id])
  );

  if (uncategorized.length > 0) {
    columns.push({
      id: UNCATEGORIZED_ID,
      droppableId: `${COL_PREFIX}${UNCATEGORIZED_ID}`,
      label: "Sin categoría",
      color: "#94a3b8",
      records: uncategorized,
    });
  }

  return columns;
}

// ---------------------------------------------------------------------------
// Group field selector
// ---------------------------------------------------------------------------

function GroupFieldSelector({
  selectFields,
  activeField,
  onChange,
}: {
  selectFields: FieldRow[];
  activeField: FieldRow;
  onChange: (fieldId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (selectFields.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="kanban-group-selector"
        className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        Agrupar por: <span className="font-semibold">{activeField.name}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {selectFields.map((field) => (
              <button
                key={field.id}
                onClick={() => { onChange(field.id); setOpen(false); }}
                data-testid={`group-option-${field.id}`}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
                  field.id === activeField.id && "font-semibold text-indigo-600 dark:text-indigo-400"
                )}
              >
                {field.name}
                {field.id === activeField.id && <span className="ml-auto text-xs text-indigo-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable Card
// ---------------------------------------------------------------------------

function KanbanCard({
  record,
  titleField,
  fields,
  isBeingDragged = false,
}: {
  record: RecordRow;
  titleField: FieldRow | undefined;
  fields: FieldRow[];
  isBeingDragged?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: record.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const title = titleField
    ? String(record.values[titleField.id] ?? "Sin título")
    : "Sin título";

  const dateField = fields.find((f) => f.type === FieldType.DATE);
  const dateValue = dateField ? record.values[dateField.id] : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm",
        "dark:border-gray-700 dark:bg-gray-800",
        isBeingDragged && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-gray-300 opacity-0 group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Arrastrar"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
            {title}
          </p>
          {!!dateValue && (
            <p className="mt-1 text-xs text-gray-400">
              {String(dateValue).slice(0, 10)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Column — droppable + sortable context
// ---------------------------------------------------------------------------

function KanbanColumnComp({
  column,
  titleField,
  fields,
  activeId,
  onAddRecord,
}: {
  column: KanbanColumn;
  titleField: FieldRow | undefined;
  fields: FieldRow[];
  activeId: string | null;
  onAddRecord: () => void;
}) {
  // Register the whole column as a drop target so empty columns accept drops
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.droppableId });
  const cardIds = useMemo(() => column.records.map((r) => r.id), [column.records]);

  return (
    <div
      ref={setDropRef}
      className={cn(
        "flex h-full min-h-[200px] w-72 flex-shrink-0 flex-col rounded-lg transition-colors",
        "bg-gray-50 dark:bg-gray-900/50",
        isOver && "bg-indigo-50 ring-2 ring-inset ring-indigo-300 dark:bg-indigo-900/20 dark:ring-indigo-600"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {column.label}
          </span>
          <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {column.records.length}
          </span>
        </div>
        <button
          onClick={onAddRecord}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
          title={`Añadir a ${column.label}`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.records.map((record) => (
            <KanbanCard
              key={record.id}
              record={record}
              titleField={titleField}
              fields={fields}
              isBeingDragged={activeId === record.id}
            />
          ))}
        </SortableContext>

        {column.records.length === 0 && (
          <div className={cn(
            "flex h-16 items-center justify-center rounded border-2 border-dashed",
            isOver
              ? "border-indigo-300 dark:border-indigo-600"
              : "border-gray-200 dark:border-gray-700"
          )}>
            <p className="text-xs text-gray-400">
              {isOver ? "Soltar aquí" : "Sin registros"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanView
// ---------------------------------------------------------------------------

export default function KanbanView({
  fields,
  records,
  groupFieldId,
  onGroupFieldChange,
  onUpdateRecord,
  onAddRecord,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Optimistic local copy — updates immediately on drop without waiting for server
  const [localRecords, setLocalRecords] = useState<RecordRow[]>(records);

  const selectFields = useMemo(() => getSelectFields(fields), [fields]);
  const groupField   = useMemo(() => resolveGroupField(fields, groupFieldId), [fields, groupFieldId]);
  const titleField   = useMemo(() => getTitleField(fields), [fields]);

  const columns = useMemo(
    () => (groupField ? buildColumns(localRecords, groupField) : []),
    [localRecords, groupField]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeRecord = useMemo(
    () => localRecords.find((r) => r.id === activeId) ?? null,
    [localRecords, activeId]
  );

  function handleDragStart(event: { active: { id: string | number } }) {
    setActiveId(String(event.active.id));
  }

  // Resolve target column from a drop "over" ID.
  // over.id can be:
  //  - "col::<columnId>"  → dragged onto the column droppable area
  //  - "<recordId>"       → dragged onto another card inside a column
  function resolveTargetColumn(overId: string): KanbanColumn | undefined {
    if (overId.startsWith(COL_PREFIX)) {
      const colId = overId.slice(COL_PREFIX.length);
      return columns.find((col) => col.id === colId);
    }
    // dragged onto a card — find which column owns that card
    return columns.find((col) => col.records.some((r) => r.id === overId));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !groupField) return;

    const draggedId = String(active.id);
    const overId    = String(over.id);
    if (draggedId === overId) return;

    const targetColumn = resolveTargetColumn(overId);
    if (!targetColumn) return;

    // Find source column — skip update if same column
    const sourceColumn = columns.find((col) => col.records.some((r) => r.id === draggedId));
    if (sourceColumn?.id === targetColumn.id) return;

    const newGroupValue = targetColumn.id === UNCATEGORIZED_ID ? "" : targetColumn.id;

    // Optimistic UI update
    setLocalRecords((prev) =>
      prev.map((r) =>
        r.id === draggedId
          ? { ...r, values: { ...r.values, [groupField.id]: newGroupValue } }
          : r
      )
    );

    const record = localRecords.find((r) => r.id === draggedId);
    if (record) {
      await onUpdateRecord(draggedId, { ...record.values, [groupField.id]: newGroupValue });
    }
  }

  if (selectFields.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-gray-400">
        <p className="text-sm">
          La vista Kanban requiere al menos un campo de tipo{" "}
          <strong>Select</strong>. Añade uno en la vista Tabla.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-2 dark:border-gray-800">
        {groupField && (
          <GroupFieldSelector
            selectFields={selectFields}
            activeField={groupField}
            onChange={onGroupFieldChange}
          />
        )}
        <p className="ml-auto text-xs text-gray-400">
          Arrastra una tarjeta entre columnas para cambiar <strong>{groupField?.name}</strong>
        </p>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {columns.map((column) => (
            <KanbanColumnComp
              key={column.id}
              column={column}
              titleField={titleField}
              fields={fields}
              activeId={activeId}
              onAddRecord={() =>
                onAddRecord(
                  column.id === UNCATEGORIZED_ID ? "" : column.id,
                  groupField!.id
                )
              }
            />
          ))}

          <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
            {activeRecord && (
              <div className="rotate-1 shadow-xl">
                <KanbanCard
                  record={activeRecord}
                  titleField={titleField}
                  fields={fields}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
