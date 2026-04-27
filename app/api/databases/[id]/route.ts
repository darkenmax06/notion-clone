import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ViewType } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const db = await prisma.database.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { position: "asc" } },
        records: {
          where: { isDeleted: false },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!db) return NextResponse.json({ error: "Base de datos no encontrada" }, { status: 404 });

    const relationFieldIds = db.fields
      .filter((field) => field.type === "RELATION")
      .map((field) => field.id);

    const recordRelations =
      relationFieldIds.length > 0
        ? await prisma.recordRelation.findMany({
            where: {
              fieldId: { in: relationFieldIds },
              sourceRecord: { databaseId: id, isDeleted: false },
              targetRecord: { isDeleted: false },
            },
            select: {
              sourceRecordId: true,
              targetRecordId: true,
              fieldId: true,
            },
          })
        : [];

    return NextResponse.json({ database: { ...db, recordRelations } });
  } catch (error) {
    console.error("[GET /api/databases/[id]]", error);
    return NextResponse.json({ error: "Error al obtener base de datos" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  icon: z.string().max(10).nullable().optional(),
  viewType: z.nativeEnum(ViewType).optional(),
  kanbanGroupFieldId: z.string().nullable().optional(),
  galleryImageFieldId: z.string().nullable().optional(),
  timelineStartFieldId: z.string().nullable().optional(),
  timelineEndFieldId: z.string().nullable().optional(),
});

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateSchema.parse(body);

    const existing = await prisma.database.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Base de datos no encontrada" }, { status: 404 });

    const db = await prisma.database.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.viewType !== undefined && { viewType: data.viewType }),
        ...(data.kanbanGroupFieldId !== undefined && { kanbanGroupFieldId: data.kanbanGroupFieldId }),
        ...(data.galleryImageFieldId !== undefined && { galleryImageFieldId: data.galleryImageFieldId }),
        ...(data.timelineStartFieldId !== undefined && { timelineStartFieldId: data.timelineStartFieldId }),
        ...(data.timelineEndFieldId !== undefined && { timelineEndFieldId: data.timelineEndFieldId }),
      },
    });

    return NextResponse.json({ database: db });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[PUT /api/databases/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar base de datos" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const existing = await prisma.database.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Base de datos no encontrada" }, { status: 404 });

    await prisma.database.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/databases/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar base de datos" }, { status: 500 });
  }
}
