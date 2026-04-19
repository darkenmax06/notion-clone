"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPage, deletePage, updatePage } from "@/lib/actions/pages";
import { createDatabase, deleteDatabase, updateDatabase } from "@/lib/actions/databases";
import type { PageNode, DatabaseItem } from "./SidebarServer";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FileText,
  Table2,
  Database,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  initialTree: PageNode[];
  initialDatabases: DatabaseItem[];
};

// ---------------------------------------------------------------------------
// Helpers para árbol
// ---------------------------------------------------------------------------

function addNodeToTree(nodes: PageNode[], parentId: string, newNode: PageNode): PageNode[] {
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...(n.children ?? []), newNode] }
      : { ...n, children: n.children ? addNodeToTree(n.children, parentId, newNode) : n.children }
  );
}

function updateNodeTitle(nodes: PageNode[], id: string, title: string): PageNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, title }
      : { ...n, children: n.children ? updateNodeTitle(n.children, id, title) : n.children }
  );
}

// ---------------------------------------------------------------------------
// SidebarClient
// ---------------------------------------------------------------------------

export function SidebarClient({ initialTree, initialDatabases }: Props) {
  const [tree, setTree] = useState<PageNode[]>(initialTree);
  const [databases, setDatabases] = useState<DatabaseItem[]>(initialDatabases);
  const [isPending, startTransition] = useTransition();
  const [dbSectionOpen, setDbSectionOpen] = useState(true);
  const [renamingDbId, setRenamingDbId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const dbInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Crear página — update optimista inmediato, sin router.refresh()
  // ---------------------------------------------------------------------------
  async function handleCreatePage(parentId: string | null = null) {
    startTransition(async () => {
      const result = await createPage({ parentId });
      if (result.success) {
        const newNode: PageNode = {
          id: result.page.id,
          title: result.page.title,
          icon: result.page.icon ?? null,
          parentId,
          position: result.page.position,
          children: [],
        };

        setTree((prev) =>
          parentId === null
            ? [...prev, newNode]
            : addNodeToTree(prev, parentId, newNode)
        );

        router.push(`/page/${result.page.id}`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Crear base de datos — update optimista inmediato
  // ---------------------------------------------------------------------------
  async function handleCreateDatabase() {
    startTransition(async () => {
      const result = await createDatabase({ title: "Base de datos sin título" });
      if (result.success) {
        setDatabases((prev) => [
          ...prev,
          {
            id: result.database.id,
            title: result.database.title,
            icon: result.database.icon ?? null,
          },
        ]);
        router.push(`/db/${result.database.id}`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Rename DB
  // ---------------------------------------------------------------------------
  function startRenameDb(db: DatabaseItem) {
    setRenamingDbId(db.id);
    setRenameDraft(db.title);
    setTimeout(() => dbInputRef.current?.select(), 20);
  }

  async function commitRenameDb(id: string) {
    const title = renameDraft.trim() || "Sin título";
    setDatabases((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
    setRenamingDbId(null);
    await updateDatabase(id, { title });
  }

  function cancelRenameDb() {
    setRenamingDbId(null);
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          NotionLocal
        </span>
        <button
          onClick={() => handleCreatePage(null)}
          disabled={isPending}
          title="Nueva página raíz"
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <Plus size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {/* Pages */}
        {tree.length === 0 ? (
          <p className="px-2 py-4 text-xs text-gray-400">Sin páginas. Crea una con +</p>
        ) : (
          tree.map((node) => (
            <PageTreeNode
              key={node.id}
              node={node}
              depth={0}
              onCreateChild={handleCreatePage}
              onDelete={(id) => {
                startTransition(async () => {
                  await deletePage({ id });
                  router.refresh();
                });
              }}
              onRename={(id, title) => setTree((prev) => updateNodeTitle(prev, id, title))}
            />
          ))
        )}

        {/* Databases */}
        <div className="mt-4">
          <button
            onClick={() => setDbSectionOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 dark:text-gray-500 dark:hover:bg-gray-800"
          >
            <span className="flex items-center gap-1">
              <Database size={12} />
              Bases de datos
            </span>
            <div className="flex items-center gap-1">
              <span
                role="button"
                title="Nueva base de datos"
                onClick={(e) => { e.stopPropagation(); handleCreateDatabase(); }}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <Plus size={12} />
              </span>
              {dbSectionOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
          </button>

          {dbSectionOpen && (
            <div className="mt-1">
              {databases.length === 0 && (
                <p className="px-4 py-2 text-xs text-gray-400">Sin bases de datos</p>
              )}
              {databases.map((db) => (
                <div
                  key={db.id}
                  className="group flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  {renamingDbId === db.id ? (
                    <input
                      ref={dbInputRef}
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => commitRenameDb(db.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRenameDb(db.id);
                        if (e.key === "Escape") cancelRenameDb();
                      }}
                      className="flex-1 rounded border border-blue-400 bg-white px-1 text-sm text-gray-900 outline-none dark:bg-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                  ) : (
                    <>
                      <Link
                        href={`/db/${db.id}`}
                        className="flex flex-1 items-center gap-1.5 truncate text-gray-700 dark:text-gray-300"
                      >
                        {db.icon ? (
                          <span className="text-base">{db.icon}</span>
                        ) : (
                          <Table2 size={14} className="shrink-0 text-gray-400" />
                        )}
                        <span className="truncate text-sm">{db.title || "Sin título"}</span>
                      </Link>
                      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                        <button
                          onClick={() => startRenameDb(db)}
                          title="Renombrar"
                          className="rounded p-0.5 text-gray-400 hover:text-blue-500"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              await deleteDatabase(db.id);
                              setDatabases((prev) => prev.filter((d) => d.id !== db.id));
                            })
                          }
                          title="Eliminar base de datos"
                          className="rounded p-0.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// PageTreeNode
// ---------------------------------------------------------------------------

function PageTreeNode({
  node,
  depth,
  onCreateChild,
  onDelete,
  onRename,
}: {
  node: PageNode;
  depth: number;
  onCreateChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChildren = node.children && node.children.length > 0;

  function startRename() {
    setDraft(node.title);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.select(), 20);
  }

  async function commitRename() {
    const title = draft.trim() || "Sin título";
    setIsRenaming(false);
    onRename(node.id, title);
    await updatePage({ id: node.id, title });
  }

  return (
    <div>
      <div
        className={cn("group flex items-center gap-1 rounded py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-800")}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: "8px" }}
      >
        <button onClick={() => setExpanded((v) => !v)} className="shrink-0 text-gray-400">
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-[14px]" />
          )}
        </button>

        {isRenaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setIsRenaming(false); setDraft(node.title); }
            }}
            className="flex-1 rounded border border-blue-400 bg-white px-1 text-sm text-gray-900 outline-none dark:bg-gray-900 dark:text-gray-100"
            autoFocus
          />
        ) : (
          <>
            <Link
              href={`/page/${node.id}`}
              className="flex flex-1 items-center gap-1.5 truncate text-gray-700 dark:text-gray-300"
            >
              {node.icon ? (
                <span>{node.icon}</span>
              ) : (
                <FileText size={14} className="shrink-0 text-gray-400" />
              )}
              <span className="truncate">{node.title || "Sin título"}</span>
            </Link>

            <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                onClick={startRename}
                title="Renombrar"
                className="rounded p-0.5 text-gray-400 hover:text-blue-500"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => onCreateChild(node.id)}
                title="Añadir subpágina"
                className="rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => onDelete(node.id)}
                title="Eliminar página"
                className="rounded p-0.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <PageTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}
