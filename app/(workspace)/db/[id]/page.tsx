export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DatabaseView, { type FieldRow, type RecordRow } from "@/components/views/DatabaseView";
import type { SelectOption } from "@/components/views/TableCell";
import type { ViewType } from "@/components/views/ViewSelector";

type Props = { params: Promise<{ id: string }> };

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

  const fields: FieldRow[] = db.fields.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    position: f.position,
    options: Array.isArray(f.options) ? (f.options as SelectOption[]) : [],
  }));

  const records: RecordRow[] = db.records.map((r) => ({
    id: r.id,
    position: r.position,
    values: (r.values ?? {}) as Record<string, unknown>,
  }));

  return (
    <main className="flex min-h-screen flex-col">
      <DatabaseView
        database={{
          id: db.id,
          title: db.title,
          icon: db.icon,
          viewType: db.viewType as ViewType,
          kanbanGroupFieldId: db.kanbanGroupFieldId,
        }}
        fields={fields}
        records={records}
      />
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const db = await prisma.database.findUnique({ where: { id }, select: { title: true } });
  return { title: db?.title ?? "Base de datos" };
}
