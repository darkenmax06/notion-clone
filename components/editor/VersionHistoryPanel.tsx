"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, RotateCcw } from "lucide-react";
import { getPageVersions, restorePageVersion } from "@/lib/actions/pages";

type Version = {
  id: string;
  title: string;
  createdAt: Date | string;
};

type Props = {
  pageId: string;
  onClose: () => void;
};

export default function VersionHistoryPanel({ pageId, onClose }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getPageVersions({ pageId }).then((v) => {
      setVersions(v);
      setLoading(false);
    });
  }, [pageId]);

  async function handleRestore(versionId: string) {
    setRestoringId(versionId);
    await restorePageVersion({ versionId, pageId });
    router.refresh();
    onClose();
  }

  function formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Historial de versiones
        </h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="Cerrar historial"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-400">Cargando versiones…</p>
        ) : versions.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Sin versiones guardadas</p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="rounded-lg border border-gray-100 p-3 dark:border-gray-700"
              >
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {v.title || "Sin título"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{formatDate(v.createdAt)}</p>
                <button
                  onClick={() => handleRestore(v.id)}
                  disabled={restoringId === v.id}
                  className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-900/20"
                >
                  <RotateCcw size={11} />
                  {restoringId === v.id ? "Restaurando…" : "Restaurar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
