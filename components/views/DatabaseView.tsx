"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FieldType } from "@prisma/client";
import { Plus, Trash2, ExternalLink, Download, ChevronDown, Smile } from "lucide-react";
import { createField, updateField, deleteField, updateDatabase } from "@/lib/actions/databases";
import { createRecord, updateRecord, deleteRecord, setRecordRelations } from "@/lib/actions/records";
import { TableCell, type RelationCandidate, type FileCellValue } from "./TableCell";
import { FieldHeader } from "./FieldHeader";
import { FilterSortBar, type FilterRule, type SortConfig } from "./FilterSortBar";
import { RecordDetailPanel } from "./RecordDetailPanel";
import { AddFieldModal } from "./AddFieldModal";
import { ViewSelector, type ViewType } from "./ViewSelector";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import GalleryView from "./GalleryView";
import ListView from "./ListView";
import TimelineView from "./TimelineView";
import { cn } from "@/lib/utils";
import {
  computeRuntimeValues,
  getRecordTitleForDatabase,
  type RelationDatabase,
} from "@/lib/database/computed-fields";
import {
  getFieldOptionsObject,
  type FieldOptions,
} from "@/lib/database/field-options";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldRow = {
  id: string;
  name: string;
  type: FieldType;
  position: number;
  options: FieldOptions;
};

export type RecordRow = {
  id: string;
  position: number;
  values: Record<string, unknown>;
};

type Props = {
  database: {
    id: string;
    title: string;
    icon: string | null;
    viewType?: ViewType;
    kanbanGroupFieldId?: string | null;
    galleryImageFieldId?: string | null;
    timelineStartFieldId?: string | null;
    timelineEndFieldId?: string | null;
  };
  fields: FieldRow[];
  records: RecordRow[];
  relationDatabases?: RelationDatabase[];
};

type TableGroup = {
  key: string;
  label: string;
  records: RecordRow[];
};

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

function toComparableString(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(" ");
  if (typeof value === "object" && value !== null) {
    const maybeName = (value as { name?: unknown }).name;
    if (typeof maybeName === "string") return maybeName;
    return JSON.stringify(value);
  }
  return String(value ?? "");
}

function applyFilters(records: RecordRow[], filters: FilterRule[]): RecordRow[] {
  if (filters.length === 0) return records;
  return records.filter((record) =>
    filters.every((rule) => {
      const val = record.values[rule.fieldId];
      const str = toComparableString(val).toLowerCase();
      const ruleVal = rule.value.toLowerCase();
      switch (rule.operator) {
        case "contains": return str.includes(ruleVal);
        case "not_contains": return !str.includes(ruleVal);
        case "equals": return str === ruleVal;
        case "gt": return Number(val) > Number(rule.value);
        case "lt": return Number(val) < Number(rule.value);
        case "before": return new Date(String(val)) < new Date(rule.value);
        case "after": return new Date(String(val)) > new Date(rule.value);
        case "is": return str === ruleVal;
        case "is_not": return str !== ruleVal;
        case "is_checked": return val === true;
        case "is_not_checked": return val !== true;
        default: return true;
      }
    })
  );
}

function applySort(records: RecordRow[], sortConfig: SortConfig | null): RecordRow[] {
  if (!sortConfig) return records;
  return [...records].sort((a, b) => {
    const av = a.values[sortConfig.fieldId];
    const bv = b.values[sortConfig.fieldId];
    const as = toComparableString(av);
    const bs = toComparableString(bv);
    const cmp = as.localeCompare(bs, undefined, { numeric: true });
    return sortConfig.direction === "asc" ? cmp : -cmp;
  });
}

function normalizeGroupKey(field: FieldRow, value: unknown): string {
  if (field.type === FieldType.CHECKBOX) {
    return value === true ? "__checked__" : "__unchecked__";
  }

  if (field.type === FieldType.DATE) {
    const date = String(value ?? "").slice(0, 10);
    return date || "__empty__";
  }

  const raw = String(value ?? "").trim();
  return raw || "__empty__";
}

function groupLabel(field: FieldRow, value: unknown): string {
  if (field.type === FieldType.CHECKBOX) {
    return value === true ? "Marcado" : "No marcado";
  }

  if (field.type === FieldType.DATE) {
    const date = String(value ?? "").slice(0, 10);
    return date || "Sin fecha";
  }

  const raw = String(value ?? "").trim();
  return raw || "Sin valor";
}

function buildTableGroups(records: RecordRow[], field: FieldRow): TableGroup[] {
  const groups = new Map<string, TableGroup>();

  records.forEach((record) => {
    const value = record.values[field.id];
    const key = normalizeGroupKey(field, value);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: groupLabel(field, value),
        records: [],
      });
    }

    groups.get(key)!.records.push(record);
  });

  return Array.from(groups.values());
}

// ---------------------------------------------------------------------------
// DatabaseView
// ---------------------------------------------------------------------------

export default function DatabaseView({
  database,
  fields: initialFields,
  records: initialRecords,
  relationDatabases = [],
}: Props) {
  const [fields, setFields] = useState<FieldRow[]>(initialFields);
  const [records, setRecords] = useState<RecordRow[]>(initialRecords);
  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldId: string } | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>(database.viewType ?? "TABLE");
  const [kanbanGroupFieldId, setKanbanGroupFieldId] = useState<string | null>(
    database.kanbanGroupFieldId ?? null
  );
  const [galleryImageFieldId, setGalleryImageFieldId] = useState<string | null>(
    database.galleryImageFieldId ?? null
  );
  const [timelineStartFieldId, setTimelineStartFieldId] = useState<string | null>(
    database.timelineStartFieldId ?? null
  );
  const [timelineEndFieldId, setTimelineEndFieldId] = useState<string | null>(
    database.timelineEndFieldId ?? null
  );
  const [tableGroupFieldId, setTableGroupFieldId] = useState<string | null>(null);
  const [collapsedTableGroups, setCollapsedTableGroups] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(database.title);
  const [editingIcon, setEditingIcon] = useState(false);
  const [iconState, setIconState] = useState(database.icon ?? "");
  const [iconDraft, setIconDraft] = useState(database.icon ?? "");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Sync from server props when router.refresh() brings latest values
  useEffect(() => { setTitleDraft(database.title); }, [database.title]);
  useEffect(() => { setIconState(database.icon ?? ""); }, [database.icon]);
  useEffect(() => { setActiveView(database.viewType ?? "TABLE"); }, [database.viewType]);
  useEffect(() => { setKanbanGroupFieldId(database.kanbanGroupFieldId ?? null); }, [database.kanbanGroupFieldId]);
  useEffect(() => { setGalleryImageFieldId(database.galleryImageFieldId ?? null); }, [database.galleryImageFieldId]);
  useEffect(() => { setTimelineStartFieldId(database.timelineStartFieldId ?? null); }, [database.timelineStartFieldId]);
  useEffect(() => { setTimelineEndFieldId(database.timelineEndFieldId ?? null); }, [database.timelineEndFieldId]);

  async function commitTitleRename() {
    const title = titleDraft.trim() || "Sin titulo";
    setEditingTitle(false);
    setTitleDraft(title);
    await updateDatabase(database.id, { title });
    router.refresh();
  }

  async function commitIconEdit(value?: string) {
    const icon = (value ?? iconDraft).trim();
    setIconState(icon);
    setEditingIcon(false);
    await updateDatabase(database.id, { icon: icon || null });
    router.refresh();
  }

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.position - b.position),
    [fields]
  );

  const relationDatabaseById = useMemo(
    () => new Map(relationDatabases.map((relationDb) => [relationDb.id, relationDb])),
    [relationDatabases]
  );

  const relationCandidatesByFieldId = useMemo(() => {
    const map = new Map<string, RelationCandidate[]>();

    sortedFields.forEach((field) => {
      if (field.type !== "RELATION") return;
      const options = getFieldOptionsObject(field.options);
      const relationDatabaseId = options.relationDatabaseId;
      if (!relationDatabaseId) {
        map.set(field.id, []);
        return;
      }
      const relationDb = relationDatabaseById.get(relationDatabaseId);
      if (!relationDb) {
        map.set(field.id, []);
        return;
      }
      map.set(
        field.id,
        relationDb.records.map((record) => ({
          id: record.id,
          label: getRecordTitleForDatabase(relationDb, record),
        }))
      );
    });

    return map;
  }, [sortedFields, relationDatabaseById]);

  const runtimeRecords = useMemo(
    () => computeRuntimeValues(records, sortedFields, relationDatabases),
    [records, sortedFields, relationDatabases]
  );

  const displayRecords = useMemo(
    () => applySort(applyFilters(runtimeRecords, filters), sortConfig),
    [runtimeRecords, filters, sortConfig]
  );

  const selectedRecord = useMemo(
    () => runtimeRecords.find((record) => record.id === selectedRecordId) ?? null,
    [runtimeRecords, selectedRecordId]
  );

  const tableGroupableFields = useMemo(
    () =>
      sortedFields.filter(
        (field) =>
          field.type === FieldType.SELECT ||
          field.type === FieldType.CHECKBOX ||
          field.type === FieldType.DATE
      ),
    [sortedFields]
  );

  const activeTableGroupField = useMemo(
    () => tableGroupableFields.find((field) => field.id === tableGroupFieldId) ?? null,
    [tableGroupableFields, tableGroupFieldId]
  );

  const tableGroups = useMemo(
    () => (activeTableGroupField ? buildTableGroups(displayRecords, activeTableGroupField) : []),
    [displayRecords, activeTableGroupField]
  );

  useEffect(() => {
    if (tableGroupFieldId && !tableGroupableFields.some((field) => field.id === tableGroupFieldId)) {
      setTableGroupFieldId(null);
      setCollapsedTableGroups({});
    }
  }, [tableGroupFieldId, tableGroupableFields]);

  // ---------------------------------------------------------------------------
  // View change - persist to DB
  // ---------------------------------------------------------------------------

  async function handleViewChange(view: ViewType) {
    setActiveView(view);
    await updateDatabase(database.id, { viewType: view as import("@prisma/client").ViewType });
  }

  async function handleKanbanGroupFieldChange(fieldId: string) {
    setKanbanGroupFieldId(fieldId);
    await updateDatabase(database.id, { kanbanGroupFieldId: fieldId });
  }

  async function handleGalleryImageFieldChange(fieldId: string | null) {
    setGalleryImageFieldId(fieldId);
    await updateDatabase(database.id, { galleryImageFieldId: fieldId });
  }

  async function handleTimelineStartFieldChange(fieldId: string | null) {
    setTimelineStartFieldId(fieldId);
    await updateDatabase(database.id, { timelineStartFieldId: fieldId });
  }

  async function handleTimelineEndFieldChange(fieldId: string | null) {
    setTimelineEndFieldId(fieldId);
    await updateDatabase(database.id, { timelineEndFieldId: fieldId });
  }

  async function handleTableGroupFieldChange(fieldId: string | null) {
    setTableGroupFieldId(fieldId);
    setCollapsedTableGroups({});
  }

  const relationFieldIds = useMemo(
    () => new Set(sortedFields.filter((field) => field.type === "RELATION").map((field) => field.id)),
    [sortedFields]
  );

  const computedFieldIds = useMemo(
    () =>
      new Set(
        sortedFields
          .filter((field) => field.type === "ROLLUP" || field.type === "FORMULA")
          .map((field) => field.id)
      ),
    [sortedFields]
  );

  async function persistRecordValues(recordId: string, values: Record<string, unknown>) {
    const persistableValues: Record<string, unknown> = { ...values };
    const relationUpdates: Array<{ fieldId: string; targetRecordIds: string[] }> = [];

    sortedFields.forEach((field) => {
      if (computedFieldIds.has(field.id)) {
        delete persistableValues[field.id];
        return;
      }

      if (relationFieldIds.has(field.id)) {
        const rawValue = values[field.id];
        const ids = Array.isArray(rawValue)
          ? rawValue.filter((item): item is string => typeof item === "string")
          : [];
        relationUpdates.push({ fieldId: field.id, targetRecordIds: ids });
        delete persistableValues[field.id];
      }
    });

    await Promise.all([
      updateRecord(recordId, database.id, persistableValues),
      ...relationUpdates.map((update) =>
        setRecordRelations(recordId, database.id, update.fieldId, update.targetRecordIds)
      ),
    ]);
  }

  async function handleUploadFile(file: File): Promise<FileCellValue | null> {
    const payload = new FormData();
    payload.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        console.error("Upload failed", await response.text());
        return null;
      }

      const data = (await response.json()) as FileCellValue;
      if (!data?.url || !data?.name) return null;
      return data;
    } catch (error) {
      console.error("Upload failed", error);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Record handlers
  // ---------------------------------------------------------------------------

  async function handleAddRecord(groupValue?: string, groupFieldId?: string) {
    startTransition(async () => {
      const result = await createRecord(database.id);
      if (result.success) {
        const initialValues: Record<string, unknown> = {};
        if (groupFieldId && groupValue !== undefined) {
          initialValues[groupFieldId] = groupValue;
        }
        const newRecord = { ...result.record, values: initialValues };
        setRecords((prev) => [...prev, newRecord]);

        if (groupFieldId && groupValue !== undefined && Object.keys(initialValues).length > 0) {
          await updateRecord(result.record.id, database.id, initialValues);
        }
      }
    });
  }

  async function handleAddRecordFromCalendar(date: Date) {
    const dateField = sortedFields.find((field) => field.type === FieldType.DATE);
    startTransition(async () => {
      const result = await createRecord(database.id);
      if (result.success) {
        const initialValues: Record<string, unknown> = {};
        if (dateField) {
          initialValues[dateField.id] = date.toISOString().slice(0, 10);
        }
        setRecords((prev) => [...prev, { ...result.record, values: initialValues }]);
        if (dateField) {
          await updateRecord(result.record.id, database.id, initialValues);
        }
        setSelectedRecordId(result.record.id);
      }
    });
  }

  async function handleSaveCell(recordId: string, fieldId: string, value: unknown) {
    setEditingCell(null);
    const record = records.find((item) => item.id === recordId);
    if (!record) return;
    const nextValues = { ...record.values, [fieldId]: value };

    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId ? { ...record, values: nextValues } : record
      )
    );

    await persistRecordValues(recordId, nextValues);
  }

  async function handleSaveRecord(recordId: string, values: Record<string, unknown>) {
    setRecords((prev) =>
      prev.map((record) => (record.id === recordId ? { ...record, values } : record))
    );
    await persistRecordValues(recordId, values);
  }

  async function handleDeleteRecord(recordId: string) {
    startTransition(async () => {
      setRecords((prev) => prev.filter((record) => record.id !== recordId));
      await deleteRecord(recordId, database.id);
    });
  }

  // ---------------------------------------------------------------------------
  // Field handlers
  // ---------------------------------------------------------------------------

  async function handleCreateField(name: string, type: FieldType, options: FieldOptions) {
    startTransition(async () => {
      const result = await createField(database.id, { name, type, options });
      if (result.success) {
        setFields((prev) => [...prev, result.field as unknown as FieldRow]);
        router.refresh();
      }
    });
  }

  async function handleRenameField(fieldId: string, name: string) {
    setFields((prev) => prev.map((field) => (field.id === fieldId ? { ...field, name } : field)));
    await updateField(fieldId, database.id, { name });
  }

  async function handleUpdateFieldOptions(fieldId: string, options: FieldOptions) {
    setFields((prev) => prev.map((field) => (field.id === fieldId ? { ...field, options } : field)));
    await updateField(fieldId, database.id, { options });
  }

  async function handleDeleteField(fieldId: string) {
    startTransition(async () => {
      setFields((prev) => prev.filter((field) => field.id !== fieldId));
      setTableGroupFieldId((prev) => (prev === fieldId ? null : prev));

      const resetDatabasePatch: {
        kanbanGroupFieldId?: string | null;
        galleryImageFieldId?: string | null;
        timelineStartFieldId?: string | null;
        timelineEndFieldId?: string | null;
      } = {};

      if (kanbanGroupFieldId === fieldId) {
        setKanbanGroupFieldId(null);
        resetDatabasePatch.kanbanGroupFieldId = null;
      }

      if (galleryImageFieldId === fieldId) {
        setGalleryImageFieldId(null);
        resetDatabasePatch.galleryImageFieldId = null;
      }

      if (timelineStartFieldId === fieldId) {
        setTimelineStartFieldId(null);
        resetDatabasePatch.timelineStartFieldId = null;
      }

      if (timelineEndFieldId === fieldId) {
        setTimelineEndFieldId(null);
        resetDatabasePatch.timelineEndFieldId = null;
      }

      if (Object.keys(resetDatabasePatch).length > 0) {
        await updateDatabase(database.id, resetDatabasePatch);
      }

      await deleteField(fieldId, database.id);
    });
  }

  function renderTableRow(record: RecordRow) {
    return (
      <tr
        key={record.id}
        className={cn(
          "group border-b border-gray-100 dark:border-gray-800",
          "hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
        )}
      >
        <td className="w-8 border-r border-gray-100 px-1 dark:border-gray-800">
          <button
            onClick={() => setSelectedRecordId(record.id)}
            title="Ver detalle"
            className="rounded p-0.5 text-gray-300 opacity-0 hover:text-blue-500 group-hover:opacity-100"
          >
            <ExternalLink size={12} />
          </button>
        </td>

        {sortedFields.map((field) => (
          <td
            key={field.id}
            className="border-r border-gray-100 p-0 dark:border-gray-800"
            style={{ minWidth: 140 }}
          >
            <TableCell
              fieldId={field.id}
              type={field.type}
              value={record.values[field.id]}
              options={field.options}
              relationCandidates={relationCandidatesByFieldId.get(field.id) ?? []}
              isReadOnly={field.type === "ROLLUP" || field.type === "FORMULA"}
              isEditing={
                editingCell?.recordId === record.id &&
                editingCell?.fieldId === field.id
              }
              onStartEdit={() => setEditingCell({ recordId: record.id, fieldId: field.id })}
              onSave={(value) => handleSaveCell(record.id, field.id, value)}
              onCancel={() => setEditingCell(null)}
              onUploadFile={field.type === "FILE" ? handleUploadFile : undefined}
            />
          </td>
        ))}

        <td className="px-2">
          <button
            onClick={() => handleDeleteRecord(record.id)}
            className="rounded p-0.5 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
            title="Eliminar fila"
          >
            <Trash2 size={12} />
          </button>
        </td>
      </tr>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4">
        {/* Editable icon */}
        {editingIcon ? (
          <div className="flex items-center gap-2">
            <input
              ref={iconInputRef}
              value={iconDraft}
              onChange={(e) => setIconDraft(e.target.value)}
              onBlur={() => commitIconEdit()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitIconEdit();
                if (e.key === "Escape") { setEditingIcon(false); setIconDraft(iconState); }
              }}
              placeholder="Emoji..."
              maxLength={8}
              className="w-20 rounded border border-blue-400 bg-white px-2 py-1 text-center text-2xl text-gray-900 outline-none dark:bg-gray-900 dark:text-gray-100"
              autoFocus
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); commitIconEdit(""); }}
              className="text-xs text-gray-400 underline hover:text-red-500"
            >
              Quitar
            </button>
          </div>
        ) : iconState ? (
          <button
            onClick={() => { setIconDraft(iconState); setEditingIcon(true); setTimeout(() => iconInputRef.current?.focus(), 20); }}
            title="Cambiar icono"
            className="text-3xl transition-opacity hover:opacity-70"
          >
            {iconState}
          </button>
        ) : (
          <button
            onClick={() => { setIconDraft(""); setEditingIcon(true); setTimeout(() => iconInputRef.current?.focus(), 20); }}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <Smile size={14} /> Anadir icono
          </button>
        )}

        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitleRename();
              if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(database.title); }
            }}
            className="flex-1 border-b-2 border-blue-400 bg-transparent text-2xl font-bold text-gray-900 outline-none dark:text-gray-100"
            autoFocus
          />
        ) : (
          <h1
            className="flex-1 cursor-text text-2xl font-bold text-gray-900 hover:opacity-80 dark:text-gray-100"
            title="Clic para renombrar"
            onClick={() => {
              setTitleDraft(database.title);
              setEditingTitle(true);
              setTimeout(() => titleInputRef.current?.select(), 20);
            }}
          >
            {titleDraft}
          </h1>
        )}

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu((value) => !value)}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Download size={13} />
            Exportar
            <ChevronDown size={13} />
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <a
                  href={`/api/databases/${database.id}/export?format=csv`}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Download size={12} /> Exportar CSV
                </a>
                <a
                  href={`/api/databases/${database.id}/export?format=md`}
                  download
                  onClick={() => setShowExportMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Download size={12} /> Exportar Markdown
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* View selector */}
      <ViewSelector activeView={activeView} onViewChange={handleViewChange} />

      {/* Filter / Sort bar - only in TABLE view */}
      {activeView === "TABLE" && (
        <FilterSortBar
          fields={sortedFields}
          filters={filters}
          onFiltersChange={setFilters}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
        />
      )}

      {/* Group toolbar - only in TABLE view */}
      {activeView === "TABLE" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          <label className="text-xs text-gray-500">
            Agrupar por:
            <select
              value={tableGroupFieldId ?? ""}
              onChange={(e) => handleTableGroupFieldChange(e.target.value || null)}
              className="ml-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              data-testid="table-group-selector"
            >
              <option value="">Sin agrupar</option>
              {tableGroupableFields.map((field) => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          </label>

          {activeTableGroupField && tableGroups.length > 0 && (
            <button
              onClick={() => {
                const hasExpanded = tableGroups.some((group) => !collapsedTableGroups[group.key]);
                const nextState: Record<string, boolean> = {};
                tableGroups.forEach((group) => { nextState[group.key] = hasExpanded; });
                setCollapsedTableGroups(nextState);
              }}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {tableGroups.some((group) => !collapsedTableGroups[group.key]) ? "Colapsar grupos" : "Expandir grupos"}
            </button>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TABLE view                                                        */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "TABLE" && (
        <div className="flex-1 overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 border-b border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" />

                {sortedFields.map((field) => (
                  <FieldHeader
                    key={field.id}
                    field={field}
                    onRename={handleRenameField}
                    onDelete={handleDeleteField}
                  />
                ))}

                <th className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <button
                    onClick={() => setShowAddField(true)}
                    className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <Plus size={12} /> Campo
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {activeTableGroupField ? (
                tableGroups.map((group) => {
                  const isCollapsed = collapsedTableGroups[group.key] === true;
                  return (
                    <Fragment key={group.key}>
                      <tr className="bg-gray-50/70 dark:bg-gray-900/60">
                        <td colSpan={sortedFields.length + 2} className="border-b border-gray-100 px-2 py-1.5 dark:border-gray-800">
                          <button
                            onClick={() =>
                              setCollapsedTableGroups((prev) => ({
                                ...prev,
                                [group.key]: !prev[group.key],
                              }))
                            }
                            className="flex w-full items-center gap-2 text-left text-xs text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                          >
                            <ChevronDown size={13} className={cn("transition-transform", isCollapsed && "-rotate-90")} />
                            <span className="font-semibold">{group.label}</span>
                            <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                              {group.records.length}
                            </span>
                          </button>
                        </td>
                      </tr>
                      {!isCollapsed && group.records.map((record) => renderTableRow(record))}
                    </Fragment>
                  );
                })
              ) : (
                displayRecords.map((record) => renderTableRow(record))
              )}

              <tr>
                <td colSpan={sortedFields.length + 2} className="border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleAddRecord()}
                    disabled={isPending}
                    className="flex w-full items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-60 dark:hover:bg-gray-800/30"
                  >
                    <Plus size={12} /> Nueva fila
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          {displayRecords.length === 0 && records.length > 0 && (
            <p className="px-6 py-4 text-xs text-gray-400">
              Ningun registro coincide con los filtros activos.
            </p>
          )}
          {records.length === 0 && (
            <p className="px-6 py-4 text-xs text-gray-400">
              Sin registros. Haz clic en "Nueva fila" para comenzar.
            </p>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* KANBAN view                                                       */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "KANBAN" && (
        <KanbanView
          fields={sortedFields}
          records={runtimeRecords}
          groupFieldId={kanbanGroupFieldId}
          onGroupFieldChange={handleKanbanGroupFieldChange}
          onUpdateRecord={handleSaveRecord}
          onAddRecord={handleAddRecord}
          onUpdateGroupFieldOptions={handleUpdateFieldOptions}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CALENDAR view                                                     */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "CALENDAR" && (
        <CalendarView
          fields={sortedFields}
          records={runtimeRecords}
          onAddRecord={handleAddRecordFromCalendar}
          onSelectRecord={setSelectedRecordId}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* GALLERY view                                                      */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "GALLERY" && (
        <GalleryView
          fields={sortedFields}
          records={runtimeRecords}
          imageFieldId={galleryImageFieldId}
          onImageFieldChange={handleGalleryImageFieldChange}
          onSelectRecord={setSelectedRecordId}
          onAddRecord={() => { void handleAddRecord(); }}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* LIST view                                                         */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "LIST" && (
        <ListView
          fields={sortedFields}
          records={runtimeRecords}
          onSelectRecord={setSelectedRecordId}
          onAddRecord={() => { void handleAddRecord(); }}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TIMELINE view                                                     */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "TIMELINE" && (
        <TimelineView
          fields={sortedFields}
          records={runtimeRecords}
          startFieldId={timelineStartFieldId}
          endFieldId={timelineEndFieldId}
          onStartFieldChange={handleTimelineStartFieldChange}
          onEndFieldChange={handleTimelineEndFieldChange}
          onUpdateRecord={handleSaveRecord}
          onSelectRecord={setSelectedRecordId}
        />
      )}

      {/* Record detail panel - all views */}
      {selectedRecord && (
        <RecordDetailPanel
          record={selectedRecord}
          fields={sortedFields}
          relationCandidatesByFieldId={relationCandidatesByFieldId}
          onClose={() => setSelectedRecordId(null)}
          onSave={handleSaveRecord}
          onUploadFile={handleUploadFile}
        />
      )}

      {/* Add field modal - only from TABLE view */}
      {showAddField && (
        <AddFieldModal
          fields={sortedFields}
          databases={relationDatabases.map((db) => ({
            id: db.id,
            title: db.title,
            fields: db.fields.map((field) => ({
              id: field.id,
              name: field.name,
              type: field.type,
            })),
          }))}
          onClose={() => setShowAddField(false)}
          onCreate={handleCreateField}
        />
      )}
    </div>
  );
}
