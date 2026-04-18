import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Block } from "@blocknote/core";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import BlockEditorClient from "@/components/editor/BlockEditorClient";

async function getAncestors(pageId: string): Promise<BreadcrumbItem[]> {
  const ancestors: BreadcrumbItem[] = [];
  let currentId: string | null = pageId;

  while (currentId) {
    const node: { id: string; title: string; icon: string | null; parentId: string | null } | null =
      await prisma.page.findUnique({
      where: { id: currentId, isDeleted: false },
      select: { id: true, title: true, icon: true, parentId: true },
    });
    if (!node) break;
    ancestors.unshift({ id: node.id, title: node.title, icon: node.icon });
    currentId = node.parentId;
  }

  return ancestors;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PageDetail({ params }: Props) {
  const { id } = await params;

  const [page, breadcrumbs] = await Promise.all([
    prisma.page.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        title: true,
        icon: true,
        cover: true,
        content: true,
      },
    }),
    getAncestors(id),
  ]);

  if (!page) notFound();

  return (
    <main className="flex min-h-screen flex-col">
      {page.cover && (
        <div
          className="h-40 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${page.cover})` }}
        />
      )}

      <Breadcrumb items={breadcrumbs} />

      <div className="mx-auto w-full max-w-3xl px-4 pt-10">
        {page.icon && <div className="mb-2 text-5xl">{page.icon}</div>}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          {page.title}
        </h1>
      </div>

      <BlockEditorClient
        pageId={page.id}
        initialContent={(page.content as Block[] | null) ?? undefined}
      />
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: page?.title ?? "Página" };
}
