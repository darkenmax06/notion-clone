import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ pages: [], databases: [] });
  }

  const pattern = `%${q}%`;

  try {
    // Búsqueda con pg_trgm: similaridad + ILIKE para cobertura total
    const [pages, databases] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; title: string; icon: string | null }>>`
        SELECT id, title, icon
        FROM "Page"
        WHERE "isDeleted" = false
          AND (title ILIKE ${pattern} OR similarity(title, ${q}) > 0.1)
        ORDER BY similarity(title, ${q}) DESC, title
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ id: string; title: string; icon: string | null }>>`
        SELECT id, title, icon
        FROM "Database"
        WHERE (title ILIKE ${pattern} OR similarity(title, ${q}) > 0.1)
        ORDER BY similarity(title, ${q}) DESC, title
        LIMIT 10
      `,
    ]);

    return NextResponse.json({ pages, databases });
  } catch {
    // Fallback a Prisma ILIKE si pg_trgm no está disponible
    try {
      const [pages, databases] = await Promise.all([
        prisma.page.findMany({
          where: { isDeleted: false, title: { contains: q, mode: "insensitive" } },
          select: { id: true, title: true, icon: true },
          take: 10,
          orderBy: { title: "asc" },
        }),
        prisma.database.findMany({
          where: { title: { contains: q, mode: "insensitive" } },
          select: { id: true, title: true, icon: true },
          take: 10,
          orderBy: { title: "asc" },
        }),
      ]);
      return NextResponse.json({ pages, databases });
    } catch {
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
  }
}
