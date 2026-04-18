import { prisma } from "@/lib/prisma";
import { SidebarClient } from "./SidebarClient";

export type PageNode = {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  position: number;
  children?: PageNode[];
};

export type DatabaseItem = {
  id: string;
  title: string;
  icon: string | null;
};

function buildTree(pages: Omit<PageNode, "children">[]): PageNode[] {
  const map = new Map<string, PageNode>();
  const roots: PageNode[] = [];

  for (const page of pages) {
    map.set(page.id, { ...page, children: [] });
  }

  for (const page of pages) {
    const node = map.get(page.id)!;
    if (page.parentId && map.has(page.parentId)) {
      map.get(page.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default async function SidebarServer() {
  const [pages, databases] = await Promise.all([
    prisma.page.findMany({
      where: { isDeleted: false },
      orderBy: [{ parentId: "asc" }, { position: "asc" }],
      select: { id: true, title: true, icon: true, parentId: true, position: true },
    }),
    prisma.database.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, icon: true },
    }),
  ]);

  const tree = buildTree(pages);

  return <SidebarClient initialTree={tree} initialDatabases={databases} />;
}
