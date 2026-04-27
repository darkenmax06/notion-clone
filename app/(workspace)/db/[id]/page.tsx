export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DatabaseView, { type FieldRow, type RecordRow } from "@/components/views/DatabaseView";
import type { ViewType } from "@/components/views/ViewSelector";
import {
  normalizeFieldOptions,
  type FieldOptions,
} from "@/lib/database/field-options";
import type { RelationDatabase } from "@/lib/database/computed-fields";

type Props = { params: Promise<{ id: string }> };

function toFieldRow(field: {
  id: string;
  name: string;
  type: import("@prisma/client").FieldType;
  position: number;
  options: unknown;
}): FieldRow {
  return {
    id: field.id,
    name: field.name,
    type: field.type,
    position: field.position,
    options: normalizeFieldOptions(field.type, field.options) as FieldOptions,
  };
}

function toRecordRow(record: {
  id: string;
  position: number;
  values: unknown;
}): RecordRow {
  return {
    id: record.id,
    position: record.position,
    values: (record.values ?? {}) as Record<string, unknown>,
  };
}

export default async function DatabasePage({ params }: Props) {
  const { id } = await params;

  const db = await prisma.database.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { position: "asc" } },
      records: { where: { isDeleted: false }, orderBy: { position: "asc" } },
    },
  });

  if (!db) notFound();

  const relationFieldIds = db.fields
    .filter((field) => field.type === "RELATION")
    .map((field) => field.id);

  const relationRows =
    relationFieldIds.length > 0
      ? await prisma.recordRelation.findMany({
          where: {
            fieldId: { in: relationFieldIds },
            sourceRecord: {
              databaseId: id,
              isDeleted: false,
            },
            targetRecord: {
              isDeleted: false,
            },
          },
          select: {
            sourceRecordId: true,
            fieldId: true,
            targetRecordId: true,
          },
        })
      : [];

  const relationValuesByRecord = new Map<string, Record<string, string[]>>();
  relationRows.forEach((relation) => {
    const current = relationValuesByRecord.get(relation.sourceRecordId) ?? {};
    const existingIds = current[relation.fieldId] ?? [];
    current[relation.fieldId] = [...existingIds, relation.targetRecordId];
    relationValuesByRecord.set(relation.sourceRecordId, current);
  });

  const fields: FieldRow[] = db.fields.map(toFieldRow);
  const records: RecordRow[] = db.records.map((record) => {
    const relationValues = relationValuesByRecord.get(record.id) ?? {};
    return {
      ...toRecordRow(record),
      values: {
        ...((record.values ?? {}) as Record<string, unknown>),
        ...relationValues,
      },
    };
  });

  const allDatabases = await prisma.database.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      fields: { orderBy: { position: "asc" } },
      records: {
        where: { isDeleted: false },
        orderBy: { position: "asc" },
      },
    },
  });

  const relationDatabases: RelationDatabase[] = allDatabases.map((database) => {
    const mappedFields = database.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      position: field.position,
      options: normalizeFieldOptions(field.type, field.options),
    }));

    const titleField = mappedFields.find((field) => field.type === "TEXT") ?? mappedFields[0] ?? null;

    return {
      id: database.id,
      title: database.title,
      titleFieldId: titleField?.id ?? null,
      fields: mappedFields,
      records: database.records.map((record) => ({
        id: record.id,
        position: record.position,
        values: (record.values ?? {}) as Record<string, unknown>,
      })),
    };
  });

  return (
    <main className="flex min-h-screen flex-col">
      <DatabaseView
        database={{
          id: db.id,
          title: db.title,
          icon: db.icon,
          viewType: db.viewType as ViewType,
          kanbanGroupFieldId: db.kanbanGroupFieldId,
          galleryImageFieldId: db.galleryImageFieldId,
          timelineStartFieldId: db.timelineStartFieldId,
          timelineEndFieldId: db.timelineEndFieldId,
        }}
        fields={fields}
        records={records}
        relationDatabases={relationDatabases}
      />
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const db = await prisma.database.findUnique({ where: { id }, select: { title: true } });
  return { title: db?.title ?? "Base de datos" };
}
