export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { permanentlyDeletePage, restorePage } from "@/lib/actions/pages";
import { FileText, RotateCcw, Trash2 } from "lucide-react";

export default async function TrashPage() {
  const deletedPages = await prisma.page.findMany({
    where: { isDeleted: true, isTemplate: false },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      icon: true,
      updatedAt: true,
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Papelera</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Restaura paginas eliminadas o borralas de forma permanente.
        </p>
      </div>

      {deletedPages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay paginas eliminadas.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {deletedPages.map((page) => (
            <li
              key={page.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {page.icon ? (
                    <span className="text-base">{page.icon}</span>
                  ) : (
                    <FileText size={15} className="text-gray-400" />
                  )}
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                    {page.title || "Sin titulo"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Eliminada: {new Date(page.updatedAt).toLocaleString("es-ES")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <form
                  action={async () => {
                    "use server";
                    await restorePage({ id: page.id });
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <RotateCcw size={12} />
                    Restaurar
                  </button>
                </form>

                <form
                  action={async () => {
                    "use server";
                    await permanentlyDeletePage({ id: page.id });
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                  >
                    <Trash2 size={12} />
                    Eliminar permanente
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
