"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePage, updatePage } from "@/lib/actions/pages";
import { createDatabase, deleteDatabase, updateDatabase } from "@/lib/actions/databases";
import TemplateGallery from "@/components/ui/TemplateGallery";
import type { DatabaseItem, FavoriteItem, PageNode } from "./SidebarServer";
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  LayoutTemplate,
  Pencil,
  Plus,
  Star,
  Table2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  initialTree: PageNode[];
  initialDatabases: DatabaseItem[];
  initialFavorites: FavoriteItem[];
  initialTrashCount: number;
};

function addNodeToTree(nodes: PageNode[], parentId: string, newNode: PageNode): PageNode[] {
  return nodes.map((node) =>
    node.id === parentId
      ? { ...node, children: [...(node.children ?? []), newNode] }
      : {
          ...node,
          children: node.children ? addNodeToTree(node.children, parentId, newNode) : node.children,
        }
  );
}

function updateNodeTitle(nodes: PageNode[], id: string, title: string): PageNode[] {
  return nodes.map((node) =>
    node.id === id
      ? { ...node, title }
      : {
          ...node,
          children: node.children ? updateNodeTitle(node.children, id, title) : node.children,
        }
  );
}

export function SidebarClient({
  initialTree,
  initialDatabases,
  initialFavorites,
  initialTrashCount,
}: Props) {
  const [tree, setTree] = useState<PageNode[]>(initialTree);
  const [databases, setDatabases] = useState<DatabaseItem[]>(initialDatabases);
  const [favorites, setFavorites] = useState<FavoriteItem[]>(initialFavorites);
  const [trashCount, setTrashCount] = useState(initialTrashCount);
  const [isPending, startTransition] = useTransition();
  const [dbSectionOpen, setDbSectionOpen] = useState(true);
  const [renamingDbId, setRenamingDbId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateParentId, setTemplateParentId] = useState<string | null>(null);
  const dbInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  useEffect(() => {
    setDatabases(initialDatabases);
  }, [initialDatabases]);

  useEffect(() => {
    setFavorites(initialFavorites);
  }, [initialFavorites]);

  useEffect(() => {
    setTrashCount(initialTrashCount);
  }, [initialTrashCount]);

  function openTemplateGallery(parentId: string | null = null) {
    setTemplateParentId(parentId);
    setTemplateModalOpen(true);
  }

  async function handleCreateDatabase() {
    startTransition(async () => {
      const result = await createDatabase({ title: "Base de datos sin titulo" });
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

  function startRenameDb(db: DatabaseItem) {
    setRenamingDbId(db.id);
    setRenameDraft(db.title);
    setTimeout(() => dbInputRef.current?.select(), 20);
  }

  async function commitRenameDb(id: string) {
    const title = renameDraft.trim() || "Sin titulo";
    setDatabases((prev) => prev.map((db) => (db.id === id ? { ...db, title } : db)));
    setRenamingDbId(null);
    await updateDatabase(id, { title });
    router.refresh();
  }

  function cancelRenameDb() {
    setRenamingDbId(null);
  }

  return (
    <>
      <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">NotionLocal</span>
          <button
            onClick={() => openTemplateGallery(null)}
            disabled={isPending}
            title="Nueva pagina raiz"
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Plus size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <div className="mb-3 space-y-1">
            <Link
              href="/templates"
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <LayoutTemplate size={14} className="text-gray-400" />
              Plantillas
            </Link>
            <Link
              href="/trash"
              className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <span className="flex items-center gap-2">
                <Trash2 size={14} className="text-gray-400" />
                Papelera
              </span>
              {trashCount > 0 && (
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {trashCount}
                </span>
              )}
            </Link>
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-center gap-1 px-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              <Star size={11} />
              Favoritos
            </div>
            {favorites.length === 0 ? (
              <p className="px-2 py-1 text-xs text-gray-400">Sin favoritos</p>
            ) : (
              favorites.map((page) => (
                <Link
                  key={page.id}
                  href={`/page/${page.id}`}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {page.icon ? (
                    <span>{page.icon}</span>
                  ) : (
                    <FileText size={14} className="text-gray-400" />
                  )}
                  <span className="truncate">{page.title || "Sin titulo"}</span>
                </Link>
              ))
            )}
          </div>

          <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-gray-500">Paginas</div>
          {tree.length === 0 ? (
            <p className="px-2 py-3 text-xs text-gray-400">Sin paginas. Crea una con +</p>
          ) : (
            tree.map((node) => (
              <PageTreeNode
                key={node.id}
                node={node}
                depth={0}
                onCreateChild={(parentId) => openTemplateGallery(parentId)}
                onDelete={(id) => {
                  startTransition(async () => {
                    await deletePage({ id });
                    setTrashCount((count) => count + 1);
                    router.refresh();
                  });
                }}
                onRename={(id, title) => setTree((prev) => updateNodeTitle(prev, id, title))}
              />
            ))
          )}

          <div className="mt-4">
            <button
              onClick={() => setDbSectionOpen((value) => !value)}
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
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleCreateDatabase();
                  }}
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
                        onBlur={() => {
                          void commitRenameDb(db.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitRenameDb(db.id);
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
                          <span className="truncate text-sm">{db.title || "Sin titulo"}</span>
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
                                setDatabases((prev) => prev.filter((item) => item.id !== db.id));
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

      <TemplateGallery
        open={templateModalOpen}
        parentId={templateParentId}
        onClose={() => {
          setTemplateModalOpen(false);
          setTemplateParentId(null);
        }}
        onCreated={(pageId) => {
          if (!templateParentId) {
            setTree((prev) => [
              ...prev,
              {
                id: pageId,
                title: "Sin titulo",
                icon: null,
                parentId: null,
                position: prev.length,
                children: [],
              },
            ]);
          } else {
            const newNode: PageNode = {
              id: pageId,
              title: "Sin titulo",
              icon: null,
              parentId: templateParentId,
              position: 0,
              children: [],
            };
            setTree((prev) => addNodeToTree(prev, templateParentId, newNode));
          }
        }}
      />
    </>
  );
}

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
  const router = useRouter();
  const hasChildren = Boolean(node.children && node.children.length > 0);

  function startRename() {
    setDraft(node.title);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.select(), 20);
  }

  async function commitRename() {
    const title = draft.trim() || "Sin titulo";
    setIsRenaming(false);
    onRename(node.id, title);
    await updatePage({ id: node.id, title });
    router.refresh();
  }

  return (
    <div>
      <div
        className={cn("group flex items-center gap-1 rounded py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-800")}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: "8px" }}
      >
        <button onClick={() => setExpanded((value) => !value)} className="shrink-0 text-gray-400">
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
            onBlur={() => {
              void commitRename();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitRename();
              if (e.key === "Escape") {
                setIsRenaming(false);
                setDraft(node.title);
              }
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
              {node.icon ? <span>{node.icon}</span> : <FileText size={14} className="shrink-0 text-gray-400" />}
              <span className="truncate">{node.title || "Sin titulo"}</span>
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
                title="Anadir subpagina"
                className="rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => onDelete(node.id)}
                title="Eliminar pagina"
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
