import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  values: z.record(z.unknown()),
});

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { values } = UpdateSchema.parse(body);

    const existing = await prisma.record.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    const record = await prisma.record.update({
      where: { id },
      data: { values },
    });

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[PUT /api/records/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar registro" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const existing = await prisma.record.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    await prisma.record.update({ where: { id }, data: { isDeleted: true } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/records/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar registro" }, { status: 500 });
  }
}
