import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ database: db });
  } catch (error) {
    console.error("[GET /api/databases/[id]]", error);
    return NextResponse.json({ error: "Error al obtener base de datos" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  icon: z.string().max(10).nullable().optional(),
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
