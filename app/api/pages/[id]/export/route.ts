import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// BlockNote JSON → Markdown (best-effort)
// ---------------------------------------------------------------------------

type BlockNoteInlineContent = { type: string; text?: string };
type BlockNoteBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInlineContent[];
  children?: BlockNoteBlock[];
};

function inlineToText(content: BlockNoteInlineContent[] = []): string {
  return content.map((c) => c.text ?? "").join("");
}

function blockToMarkdown(block: BlockNoteBlock, depth = 0): string {
  const indent = "  ".repeat(depth);
  const text = inlineToText(block.content);

  switch (block.type) {
    case "heading": {
      const level = Number(block.props?.level ?? 1);
      return `${"#".repeat(level)} ${text}`;
    }
    case "paragraph":
      return text || "";
    case "bulletListItem":
      return `${indent}- ${text}`;
    case "numberedListItem":
      return `${indent}1. ${text}`;
    case "checkListItem":
      return `${indent}- [${block.props?.checked ? "x" : " "}] ${text}`;
    case "codeBlock":
      return `\`\`\`\n${text}\n\`\`\``;
    case "quote":
      return `> ${text}`;
    case "table":
      return text;
    default:
      return text;
  }
}

function blocknoteToMarkdown(blocks: BlockNoteBlock[]): string {
  return blocks
    .map((b) => {
      const line = blockToMarkdown(b);
      const children =
        b.children && b.children.length > 0
          ? "\n" + blocknoteToMarkdown(b.children)
          : "";
      return line + children;
    })
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;

  try {
    const page = await prisma.page.findUnique({
      where: { id, isDeleted: false },
      select: { title: true, icon: true, content: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const blocks = Array.isArray(page.content)
      ? (page.content as BlockNoteBlock[])
      : [];

    const body = blocknoteToMarkdown(blocks);
    const icon = page.icon ? `${page.icon} ` : "";
    const content = `# ${icon}${page.title}\n\n${body}`;

    const slug = page.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.md"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
