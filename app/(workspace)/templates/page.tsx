export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createPageFromTemplate, getTemplates } from "@/lib/actions/pages";
import { LayoutTemplate } from "lucide-react";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Templates</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Usa plantillas del sistema o plantillas guardadas desde cualquier pagina.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay templates disponibles.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className="flex min-h-40 flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{template.icon ?? "📄"}</span>
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {template.title}
                    </h2>
                  </div>
                  {template.isSystem && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Sistema
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {template.isSystem
                    ? "Plantilla base incluida en la aplicacion."
                    : "Plantilla personalizada guardada por el usuario."}
                </p>
              </div>

              <form
                action={async () => {
                  "use server";
                  const result = await createPageFromTemplate({ templateId: template.id, parentId: null });
                  redirect(`/page/${result.page.id}`);
                }}
                className="mt-4"
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600"
                >
                  <LayoutTemplate size={12} />
                  Usar template
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
