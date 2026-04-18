import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const databases = await prisma.database.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        icon: true,
        pageId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { records: { where: { isDeleted: false } } } },
      },
    });
    return NextResponse.json({ databases });
  } catch (error) {
    console.error("[GET /api/databases]", error);
    return NextResponse.json({ error: "Error al obtener bases de datos" }, { status: 500 });
  }
}

const CreateSchema = z.object({
  title: z.string().min(1).max(500).optional().default("Base de datos sin título"),
  icon: z.string().max(10).optional(),
  pageId: z.string().cuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateSchema.parse(body);

    const db = await prisma.database.create({
      data: {
        title: data.title,
        icon: data.icon,
        pageId: data.pageId ?? null,
        fields: {
          create: [{ name: "Nombre", type: "TEXT", position: 0 }],
        },
      },
      include: { fields: true },
    });

    return NextResponse.json({ database: db }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[POST /api/databases]", error);
    return NextResponse.json({ error: "Error al crear base de datos" }, { status: 500 });
  }
}
