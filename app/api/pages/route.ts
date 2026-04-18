// app/api/pages/route.ts — GET (listar) y POST (crear)
// SERVER ONLY — Route Handler, nunca se ejecuta en el cliente

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// GET /api/pages — devuelve el árbol plano de páginas no eliminadas
export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      where: { isDeleted: false },
      orderBy: [{ parentId: "asc" }, { position: "asc" }],
      select: {
        id: true,
        title: true,
        icon: true,
        cover: true,
        parentId: true,
        position: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("[GET /api/pages]", error);
    return NextResponse.json({ error: "Error al obtener páginas" }, { status: 500 });
  }
}

// POST /api/pages — crear una nueva página
const CreateSchema = z.object({
  title: z.string().min(1).max(500).optional().default("Sin título"),
  parentId: z.string().cuid().nullable().optional(),
  icon: z.string().max(10).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateSchema.parse(body);

    const lastSibling = await prisma.page.findFirst({
      where: { parentId: data.parentId ?? null, isDeleted: false },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const page = await prisma.page.create({
      data: {
        title: data.title,
        icon: data.icon,
        parentId: data.parentId ?? null,
        position: (lastSibling?.position ?? -1) + 1,
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[POST /api/pages]", error);
    return NextResponse.json({ error: "Error al crear página" }, { status: 500 });
  }
}
