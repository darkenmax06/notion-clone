import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCsvCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(
  fields: Array<{ id: string; name: string }>,
  records: Array<{ values: Record<string, unknown> }>
): string {
  const header = fields.map((f) => escapeCsvCell(f.name)).join(",");
  const rows = records.map((r) =>
    fields.map((f) => escapeCsvCell(r.values[f.id])).join(",")
  );
  return [header, ...rows].join("\n");
}

function buildMarkdown(
  title: string,
  fields: Array<{ id: string; name: string }>,
  records: Array<{ values: Record<string, unknown> }>
): string {
  const header = `# ${title}\n\n`;
  const colHeader = `| ${fields.map((f) => f.name).join(" | ")} |`;
  const separator = `| ${fields.map(() => "---").join(" | ")} |`;
  const rows = records.map(
    (r) => `| ${fields.map((f) => String(r.values[f.id] ?? "")).join(" | ")} |`
  );
  return header + [colHeader, separator, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  try {
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

    if (!db) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fields = db.fields.map((f) => ({ id: f.id, name: f.name }));
    const records = db.records.map((r) => ({
      values: (r.values ?? {}) as Record<string, unknown>,
    }));

    const slug = db.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (format === "md") {
      const content = buildMarkdown(db.title, fields, records);
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}.md"`,
        },
      });
    }

    // Default: CSV
    const content = buildCsv(fields, records);
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
