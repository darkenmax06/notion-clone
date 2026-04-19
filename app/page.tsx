// app/page.tsx — Página de bienvenida / home (Server Component)
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPage } from "@/lib/actions/pages";
import { FileText, Plus } from "lucide-react";

export default async function HomePage() {
  // Mostrar páginas raíz recientes
  const recentPages = await prisma.page.findMany({
    where: { isDeleted: false, parentId: null },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, icon: true, updatedAt: true },
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          NotionLocal
        </h1>
        <p className="mt-2 text-gray-500">Tu espacio de trabajo personal</p>
      </div>

      {/* Crear nueva página — Server Action en form */}
      <form
        action={async () => {
          "use server";
          await createPage({ title: "Sin título" });
        }}
      >
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Nueva página
        </button>
      </form>

      {/* Páginas recientes */}
      {recentPages.length > 0 && (
        <section className="w-full max-w-lg">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Recientes
          </h2>
          <ul className="space-y-1">
            {recentPages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/page/${page.id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {page.icon ? (
                    <span className="text-lg">{page.icon}</span>
                  ) : (
                    <FileText size={16} className="text-gray-400" />
                  )}
                  <span className="flex-1 truncate">{page.title || "Sin título"}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(page.updatedAt).toLocaleDateString("es-ES")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
