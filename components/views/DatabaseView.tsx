"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FieldType } from "@prisma/client";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { createField, updateField, deleteField, updateDatabase } from "@/lib/actions/databases";
import { createRecord, updateRecord, deleteRecord } from "@/lib/actions/records";
import { TableCell, type SelectOption } from "./TableCell";
import { FieldHeader } from "./FieldHeader";
import { FilterSortBar, type FilterRule, type SortConfig } from "./FilterSortBar";
import { RecordDetailPanel } from "./RecordDetailPanel";
import { AddFieldModal } from "./AddFieldModal";
import { ViewSelector, type ViewType } from "./ViewSelector";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldRow = {
  id: string;
  name: string;
  type: FieldType;
  position: number;
  options: SelectOption[];
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
  };
  fields: FieldRow[];
  records: RecordRow[];
};

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

function applyFilters(records: RecordRow[], fields: FieldRow[], filters: FilterRule[]): RecordRow[] {
  if (filters.length === 0) return records;
  return records.filter((record) =>
    filters.every((rule) => {
      const val = record.values[rule.fieldId];
      const str = String(val ?? "").toLowerCase();
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
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    const cmp = as.localeCompare(bs, undefined, { numeric: true });
    return sortConfig.direction === "asc" ? cmp : -cmp;
  });
}

// ---------------------------------------------------------------------------
// DatabaseView
// ---------------------------------------------------------------------------

export default function DatabaseView({ database, fields: initialFields, records: initialRecords }: Props) {
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.position - b.position),
    [fields]
  );

  const displayRecords = useMemo(
    () => applySort(applyFilters(records, fields, filters), sortConfig),
    [records, fields, filters, sortConfig]
  );

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );

  // ---------------------------------------------------------------------------
  // View change — persist to DB
  // ---------------------------------------------------------------------------

  async function handleViewChange(view: ViewType) {
    setActiveView(view);
    await updateDatabase(database.id, { viewType: view as import("@prisma/client").ViewType });
  }

  async function handleKanbanGroupFieldChange(fieldId: string) {
    setKanbanGroupFieldId(fieldId);
    await updateDatabase(database.id, { kanbanGroupFieldId: fieldId });
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
    const dateField = sortedFields.find((f) => f.type === FieldType.DATE);
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
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, values: { ...r.values, [fieldId]: value } } : r
      )
    );
    const record = records.find((r) => r.id === recordId);
    if (!record) return;
    await updateRecord(recordId, database.id, { ...record.values, [fieldId]: value });
  }

  async function handleSaveRecord(recordId: string, values: Record<string, unknown>) {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, values } : r))
    );
    await updateRecord(recordId, database.id, values);
  }

  async function handleDeleteRecord(recordId: string) {
    startTransition(async () => {
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      await deleteRecord(recordId, database.id);
    });
  }

  // ---------------------------------------------------------------------------
  // Field handlers
  // ---------------------------------------------------------------------------

  async function handleCreateField(name: string, type: FieldType, options: SelectOption[]) {
    startTransition(async () => {
      const result = await createField(database.id, { name, type, options });
      if (result.success) {
        setFields((prev) => [...prev, result.field as FieldRow]);
      }
    });
  }

  async function handleRenameField(fieldId: string, name: string) {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, name } : f)));
    await updateField(fieldId, database.id, { name });
  }

  async function handleDeleteField(fieldId: string) {
    startTransition(async () => {
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      await deleteField(fieldId, database.id);
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4">
        {database.icon && <span className="text-3xl">{database.icon}</span>}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{database.title}</h1>
      </div>

      {/* View selector */}
      <ViewSelector activeView={activeView} onViewChange={handleViewChange} />

      {/* Filter / Sort bar — only in TABLE view */}
      {activeView === "TABLE" && (
        <FilterSortBar
          fields={sortedFields}
          filters={filters}
          onFiltersChange={setFilters}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TABLE view                                                         */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "TABLE" && (
        <div className="flex-1 overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {/* Expander column */}
                <th className="w-8 border-b border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" />

                {sortedFields.map((field) => (
                  <FieldHeader
                    key={field.id}
                    field={field}
                    onRename={handleRenameField}
                    onDelete={handleDeleteField}
                  />
                ))}

                {/* Add field */}
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
              {displayRecords.map((record) => (
                <tr
                  key={record.id}
                  className={cn(
                    "group border-b border-gray-100 dark:border-gray-800",
                    "hover:bg-gray-50/50 dark:hover:bg-gray-800/30",
                  )}
                >
                  {/* Expand button */}
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
                        type={field.type}
                        value={record.values[field.id]}
                        options={field.options}
                        isEditing={
                          editingCell?.recordId === record.id &&
                          editingCell?.fieldId === field.id
                        }
                        onStartEdit={() => setEditingCell({ recordId: record.id, fieldId: field.id })}
                        onSave={(val) => handleSaveCell(record.id, field.id, val)}
                        onCancel={() => setEditingCell(null)}
                      />
                    </td>
                  ))}

                  {/* Delete row */}
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
              ))}

              {/* Add row */}
              <tr>
                <td
                  colSpan={sortedFields.length + 2}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <button
                    onClick={() => handleAddRecord()}
                    disabled={isPending}
                    className="flex w-full items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800/30"
                  >
                    <Plus size={12} /> Nueva fila
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          {displayRecords.length === 0 && records.length > 0 && (
            <p className="px-6 py-4 text-xs text-gray-400">
              Ningún registro coincide con los filtros activos.
            </p>
          )}
          {records.length === 0 && (
            <p className="px-6 py-4 text-xs text-gray-400">
              Sin registros. Haz clic en &quot;Nueva fila&quot; para comenzar.
            </p>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* KANBAN view                                                        */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "KANBAN" && (
        <KanbanView
          fields={sortedFields}
          records={records}
          groupFieldId={kanbanGroupFieldId}
          onGroupFieldChange={handleKanbanGroupFieldChange}
          onUpdateRecord={handleSaveRecord}
          onAddRecord={handleAddRecord}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CALENDAR view                                                      */}
      {/* ----------------------------------------------------------------- */}
      {activeView === "CALENDAR" && (
        <CalendarView
          fields={sortedFields}
          records={records}
          onAddRecord={handleAddRecordFromCalendar}
          onSelectRecord={setSelectedRecordId}
        />
      )}

      {/* Record detail panel — all views */}
      {selectedRecord && (
        <RecordDetailPanel
          record={selectedRecord}
          fields={sortedFields}
          onClose={() => setSelectedRecordId(null)}
          onSave={handleSaveRecord}
        />
      )}

      {/* Add field modal — only from TABLE view */}
      {showAddField && (
        <AddFieldModal
          onClose={() => setShowAddField(false)}
          onCreate={handleCreateField}
        />
      )}
    </div>
  );
}
