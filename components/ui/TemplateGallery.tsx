"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, LayoutTemplate, X } from "lucide-react";
import { createPage, createPageFromTemplate, getTemplates } from "@/lib/actions/pages";

type Template = {
  id: string;
  title: string;
  icon: string | null;
  isSystem: boolean;
};

type Props = {
  open: boolean;
  parentId?: string | null;
  onClose: () => void;
  onCreated?: (pageId: string) => void;
};

export default function TemplateGallery({ open, parentId = null, onClose, onCreated }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getTemplates()
      .then((items) => setTemplates(items))
      .finally(() => setLoading(false));
  }, [open]);

  async function createBlankPage() {
    setCreatingId("blank");
    try {
      const result = await createPage({ title: "Sin titulo", parentId });
      if (!result.success) return;
      onCreated?.(result.page.id);
      router.push(`/page/${result.page.id}`);
      router.refresh();
      onClose();
    } finally {
      setCreatingId(null);
    }
  }

  async function createFromTemplate(templateId: string) {
    setCreatingId(templateId);
    try {
      const result = await createPageFromTemplate({ templateId, parentId });
      if (!result.success) return;
      onCreated?.(result.page.id);
      router.push(`/page/${result.page.id}`);
      router.refresh();
      onClose();
    } finally {
      setCreatingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria de templates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Crea una pagina vacia o usa una plantilla reutilizable.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Cerrar galeria"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => {
              void createBlankPage();
            }}
            disabled={creatingId !== null}
            className="flex h-28 flex-col justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
          >
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <FilePlus2 size={16} />
              <span className="text-sm font-medium">Pagina vacia</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Empieza desde cero.
            </p>
            {creatingId === "blank" && <span className="text-xs text-blue-500">Creando...</span>}
          </button>

          {loading ? (
            <div className="col-span-full rounded-lg border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Cargando templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full rounded-lg border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No hay templates disponibles.
            </div>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  void createFromTemplate(template.id);
                }}
                disabled={creatingId !== null}
                className="flex h-28 flex-col justify-between rounded-lg border border-gray-200 p-3 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <span className="text-lg">{template.icon ?? "📄"}</span>
                    <span className="text-sm font-medium">{template.title}</span>
                  </div>
                  {template.isSystem ? (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Sistema
                    </span>
                  ) : (
                    <LayoutTemplate size={12} className="text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {template.isSystem ? "Template del sistema" : "Template personalizado"}
                </p>
                {creatingId === template.id && <span className="text-xs text-blue-500">Creando...</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
