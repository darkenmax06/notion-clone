import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; fieldId: string }> };

const UpdateFieldSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
    )
    .optional(),
});

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { fieldId } = await params;
    const body = await request.json();
    const data = UpdateFieldSchema.parse(body);

    const existing = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!existing) return NextResponse.json({ error: "Campo no encontrado" }, { status: 404 });

    const field = await prisma.field.update({
      where: { id: fieldId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.options !== undefined && { options: data.options }),
      },
    });

    return NextResponse.json({ field });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[PUT /api/databases/[id]/fields/[fieldId]]", error);
    return NextResponse.json({ error: "Error al actualizar campo" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { fieldId } = await params;

    const existing = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!existing) return NextResponse.json({ error: "Campo no encontrado" }, { status: 404 });

    await prisma.field.delete({ where: { id: fieldId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/databases/[id]/fields/[fieldId]]", error);
    return NextResponse.json({ error: "Error al eliminar campo" }, { status: 500 });
  }
}
