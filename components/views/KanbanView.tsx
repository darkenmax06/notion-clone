"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
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
import { Plus, GripVertical, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
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
  onUpdateGroupFieldOptions?: (fieldId: string, options: SelectOption[]) => Promise<void>;
};

type KanbanColumn = {
  id: string;
  droppableId: string;
  label: string;
  color: string;
  records: RecordRow[];
};

type Subgroup = {
  key: string;
  label: string;
  records: RecordRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNCATEGORIZED_ID = "__uncategorized__";
const COL_PREFIX = "col::";
const DEFAULT_COLUMN_COLORS = [
  "#6366f1",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
];

function getSelectFields(fields: FieldRow[]): FieldRow[] {
  return fields.filter((field) => field.type === FieldType.SELECT);
}

function resolveGroupField(fields: FieldRow[], groupFieldId: string | null): FieldRow | undefined {
  if (groupFieldId) {
    const found = fields.find((field) => field.id === groupFieldId && field.type === FieldType.SELECT);
    if (found) return found;
  }
  return fields.find((field) => field.type === FieldType.SELECT);
}

function getTitleField(fields: FieldRow[]): FieldRow | undefined {
  return fields.find((field) => field.type === FieldType.TEXT);
}

function getSubgroupFields(fields: FieldRow[], groupFieldId: string | undefined): FieldRow[] {
  return fields.filter((field) => field.id !== groupFieldId);
}

function subgroupLabel(field: FieldRow | null, value: unknown): string {
  if (!field) return "Sin subgrupo";

  if (field.type === FieldType.CHECKBOX) {
    return value === true ? "Marcado" : "No marcado";
  }

  if (field.type === FieldType.DATE) {
    return String(value ?? "").slice(0, 10) || "Sin fecha";
  }

  const raw = String(value ?? "").trim();
  return raw || "Sin valor";
}

function subgroupKey(field: FieldRow | null, value: unknown): string {
  if (!field) return "__default__";

  if (field.type === FieldType.CHECKBOX) {
    return value === true ? "__checked__" : "__unchecked__";
  }

  if (field.type === FieldType.DATE) {
    return String(value ?? "").slice(0, 10) || "__empty__";
  }

  return String(value ?? "").trim() || "__empty__";
}

function buildSubgroups(records: RecordRow[], field: FieldRow | null): Subgroup[] {
  if (!field) {
    return [{ key: "__all__", label: "", records }];
  }

  const grouped = new Map<string, Subgroup>();

  records.forEach((record) => {
    const value = record.values[field.id];
    const key = subgroupKey(field, value);

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: subgroupLabel(field, value),
        records: [],
      });
    }

    grouped.get(key)!.records.push(record);
  });

  return Array.from(grouped.values());
}

function buildColumns(records: RecordRow[], groupField: FieldRow): KanbanColumn[] {
  const options: SelectOption[] = groupField.options ?? [];

  const columns: KanbanColumn[] = options.map((option) => ({
    id: option.value,
    droppableId: `${COL_PREFIX}${option.value}`,
    label: option.value,
    color: option.color,
    records: records.filter((record) => record.values[groupField.id] === option.value),
  }));

  const uncategorized = records.filter(
    (record) => !options.some((option) => option.value === record.values[groupField.id])
  );

  if (uncategorized.length > 0) {
    columns.push({
      id: UNCATEGORIZED_ID,
      droppableId: `${COL_PREFIX}${UNCATEGORIZED_ID}`,
      label: "Sin categoria",
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
        onClick={() => setOpen((value) => !value)}
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
                {field.id === activeField.id && <span className="ml-auto text-xs text-indigo-400">OK</span>}
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
    ? String(record.values[titleField.id] ?? "Sin titulo")
    : "Sin titulo";

  const dateField = fields.find((field) => field.type === FieldType.DATE);
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
        <div className="min-w-0 flex-1">
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
// Kanban Column
// ---------------------------------------------------------------------------

function KanbanColumnComp({
  column,
  titleField,
  fields,
  activeId,
  onAddRecord,
  isCollapsed,
  onToggleCollapsed,
  subgroupField,
  wipLimit,
  onWipLimitChange,
}: {
  column: KanbanColumn;
  titleField: FieldRow | undefined;
  fields: FieldRow[];
  activeId: string | null;
  onAddRecord: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  subgroupField: FieldRow | null;
  wipLimit: number | undefined;
  onWipLimitChange: (value: number | undefined) => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.droppableId });
  const cardIds = useMemo(() => column.records.map((record) => record.id), [column.records]);
  const subgroups = useMemo(() => buildSubgroups(column.records, subgroupField), [column.records, subgroupField]);

  const hasWipLimit = typeof wipLimit === "number" && wipLimit > 0;
  const isOverWip = hasWipLimit && column.records.length > wipLimit;

  return (
    <div
      ref={setDropRef}
      className={cn(
        "flex h-full min-h-[220px] flex-shrink-0 flex-col rounded-lg transition-all",
        isCollapsed ? "w-24" : "w-80",
        "bg-gray-50 dark:bg-gray-900/50",
        isOver && "bg-indigo-50 ring-2 ring-inset ring-indigo-300 dark:bg-indigo-900/20 dark:ring-indigo-600",
        isOverWip && "ring-2 ring-amber-300 dark:ring-amber-600"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <span className={cn("text-sm font-semibold text-gray-700 dark:text-gray-300", isCollapsed && "truncate")}>{column.label}</span>
        <span
          className={cn(
            "rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400",
            isOverWip && "bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          )}
        >
          {column.records.length}
        </span>
        <button
          onClick={onToggleCollapsed}
          className="ml-auto rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
          title={isCollapsed ? "Expandir columna" : "Colapsar columna"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex items-center gap-2 px-3 pb-2">
            <label className="text-[11px] text-gray-400">
              WIP:
              <input
                type="number"
                min={0}
                value={typeof wipLimit === "number" ? String(wipLimit) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    onWipLimitChange(undefined);
                    return;
                  }
                  const parsed = Number(raw);
                  onWipLimitChange(Number.isNaN(parsed) ? undefined : parsed);
                }}
                className="ml-1 w-16 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </label>

            <button
              onClick={onAddRecord}
              className="ml-auto rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
              title={`Anadir a ${column.label}`}
            >
              <Plus size={14} />
            </button>
          </div>

          {isOverWip && (
            <div className="mx-3 mb-2 flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle size={12} />
              Limite WIP excedido ({wipLimit})
            </div>
          )}

          <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
              {subgroups.map((subgroup) => (
                <div key={`${column.id}-${subgroup.key}`} className="space-y-1.5">
                  {subgroupField && (
                    <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
                      <span className="truncate">{subgroup.label}</span>
                      <span>{subgroup.records.length}</span>
                    </div>
                  )}

                  {subgroup.records.map((record) => (
                    <KanbanCard
                      key={record.id}
                      record={record}
                      titleField={titleField}
                      fields={fields}
                      isBeingDragged={activeId === record.id}
                    />
                  ))}
                </div>
              ))}
            </SortableContext>

            {column.records.length === 0 && (
              <div
                className={cn(
                  "flex h-16 items-center justify-center rounded border-2 border-dashed",
                  isOver ? "border-indigo-300 dark:border-indigo-600" : "border-gray-200 dark:border-gray-700"
                )}
              >
                <p className="text-xs text-gray-400">
                  {isOver ? "Soltar aqui" : "Sin registros"}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={onAddRecord}
            className="flex w-full items-center justify-center rounded border border-dashed border-gray-300 px-1 py-1 text-gray-400 hover:border-gray-400 hover:text-gray-600 dark:border-gray-700 dark:hover:border-gray-500"
            title={`Anadir a ${column.label}`}
          >
            <Plus size={12} />
          </button>
        </div>
      )}
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
  onUpdateGroupFieldOptions,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localRecords, setLocalRecords] = useState<RecordRow[]>(records);
  const [subgroupFieldId, setSubgroupFieldId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [wipLimitsByColumn, setWipLimitsByColumn] = useState<Record<string, number | undefined>>({});
  const [showAddColumnForm, setShowAddColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState(DEFAULT_COLUMN_COLORS[0]);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const selectFields = useMemo(() => getSelectFields(fields), [fields]);
  const groupField = useMemo(() => resolveGroupField(fields, groupFieldId), [fields, groupFieldId]);
  const titleField = useMemo(() => getTitleField(fields), [fields]);
  const subgroupFields = useMemo(() => getSubgroupFields(fields, groupField?.id), [fields, groupField?.id]);
  const subgroupField = useMemo(
    () => subgroupFields.find((field) => field.id === subgroupFieldId) ?? null,
    [subgroupFields, subgroupFieldId]
  );

  const columns = useMemo(
    () => (groupField ? buildColumns(localRecords, groupField) : []),
    [localRecords, groupField]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeRecord = useMemo(
    () => localRecords.find((record) => record.id === activeId) ?? null,
    [localRecords, activeId]
  );

  useEffect(() => {
    setCollapsedColumns((prev) => {
      const next: Record<string, boolean> = {};
      columns.forEach((column) => {
        if (prev[column.id]) next[column.id] = true;
      });
      return next;
    });

    setWipLimitsByColumn((prev) => {
      const next: Record<string, number | undefined> = {};
      columns.forEach((column) => {
        next[column.id] = prev[column.id];
      });
      return next;
    });
  }, [columns]);

  function handleDragStart(event: { active: { id: string | number } }) {
    setActiveId(String(event.active.id));
  }

  function resolveTargetColumn(overId: string): KanbanColumn | undefined {
    if (overId.startsWith(COL_PREFIX)) {
      const columnId = overId.slice(COL_PREFIX.length);
      return columns.find((column) => column.id === columnId);
    }

    return columns.find((column) => column.records.some((record) => record.id === overId));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !groupField) return;

    const draggedId = String(active.id);
    const overId = String(over.id);
    if (draggedId === overId) return;

    const targetColumn = resolveTargetColumn(overId);
    if (!targetColumn) return;

    const sourceColumn = columns.find((column) => column.records.some((record) => record.id === draggedId));
    if (sourceColumn?.id === targetColumn.id) return;

    const newGroupValue = targetColumn.id === UNCATEGORIZED_ID ? "" : targetColumn.id;

    setLocalRecords((prev) =>
      prev.map((record) =>
        record.id === draggedId
          ? { ...record, values: { ...record.values, [groupField.id]: newGroupValue } }
          : record
      )
    );

    const record = localRecords.find((item) => item.id === draggedId);
    if (record) {
      await onUpdateRecord(draggedId, { ...record.values, [groupField.id]: newGroupValue });
    }
  }

  async function handleCreateColumn() {
    if (!groupField || !onUpdateGroupFieldOptions) return;

    const trimmedName = newColumnName.trim();
    if (!trimmedName) return;

    const options = groupField.options ?? [];
    const exists = options.some((option) => option.value.toLowerCase() === trimmedName.toLowerCase());
    if (exists) return;

    const nextOptions = [...options, { value: trimmedName, color: newColumnColor }];
    await onUpdateGroupFieldOptions(groupField.id, nextOptions);

    setNewColumnName("");
    setNewColumnColor(DEFAULT_COLUMN_COLORS[nextOptions.length % DEFAULT_COLUMN_COLORS.length]);
    setShowAddColumnForm(false);
  }

  if (selectFields.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-gray-400">
        <p className="text-sm">
          La vista Kanban requiere al menos un campo de tipo <strong>Select</strong>. Anade uno en la vista Tabla.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-2 dark:border-gray-800">
        {groupField && (
          <GroupFieldSelector
            selectFields={selectFields}
            activeField={groupField}
            onChange={onGroupFieldChange}
          />
        )}

        {subgroupFields.length > 0 && (
          <label className="text-xs text-gray-500">
            Subgrupo:
            <select
              value={subgroupFieldId ?? ""}
              onChange={(e) => setSubgroupFieldId(e.target.value || null)}
              className="ml-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">Sin subgrupo</option>
              {subgroupFields.map((field) => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          </label>
        )}

        {groupField && onUpdateGroupFieldOptions && (
          <div className="relative">
            <button
              onClick={() => setShowAddColumnForm((value) => !value)}
              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              data-testid="kanban-add-column-toggle"
            >
              <Plus size={12} /> Nueva columna
            </button>

            {showAddColumnForm && (
              <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <p className="mb-2 text-xs font-medium text-gray-500">Crear opcion en {groupField.name}</p>
                <input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Nombre de columna"
                  className="mb-2 w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  data-testid="kanban-new-column-name"
                />

                <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                  Color:
                  <input
                    type="color"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="h-6 w-8 rounded border border-gray-200 dark:border-gray-700"
                  />
                </div>

                <button
                  onClick={() => { void handleCreateColumn(); }}
                  className="w-full rounded bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  data-testid="kanban-create-column"
                >
                  Guardar columna
                </button>
              </div>
            )}
          </div>
        )}

        <p className="ml-auto text-xs text-gray-400">
          Arrastra tarjetas entre columnas para cambiar <strong>{groupField?.name}</strong>
        </p>
      </div>

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
              isCollapsed={Boolean(collapsedColumns[column.id])}
              onToggleCollapsed={() =>
                setCollapsedColumns((prev) => ({
                  ...prev,
                  [column.id]: !prev[column.id],
                }))
              }
              subgroupField={subgroupField}
              wipLimit={wipLimitsByColumn[column.id]}
              onWipLimitChange={(value) =>
                setWipLimitsByColumn((prev) => ({
                  ...prev,
                  [column.id]: value,
                }))
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