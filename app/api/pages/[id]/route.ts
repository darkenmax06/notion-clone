import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const page = await prisma.page.findUnique({
      where: { id, isDeleted: false },
      include: {
        children: {
          where: { isDeleted: false },
          orderBy: { position: "asc" },
          select: { id: true, title: true, icon: true, position: true },
        },
        databases: {
          select: { id: true, title: true, icon: true },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Página no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("[GET /api/pages/:id]", error);
    return NextResponse.json({ error: "Error al obtener página" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.any().optional(),
  icon: z.string().max(10).optional(),
  cover: z.string().url().optional(),
  position: z.number().int().min(0).optional(),
});

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateSchema.parse(body);

    const page = await prisma.page.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.cover !== undefined && { cover: data.cover }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });

    return NextResponse.json({ page });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[PUT /api/pages/:id]", error);
    return NextResponse.json({ error: "Error al actualizar página" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    await softDeleteTree(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/pages/:id]", error);
    return NextResponse.json({ error: "Error al eliminar página" }, { status: 500 });
  }
}

async function softDeleteTree(pageId: string): Promise<void> {
  const children = await prisma.page.findMany({
    where: { parentId: pageId, isDeleted: false },
    select: { id: true },
  });

  await Promise.all(children.map((c) => softDeleteTree(c.id)));

  await prisma.page.update({
    where: { id: pageId },
    data: { isDeleted: true },
  });
}
