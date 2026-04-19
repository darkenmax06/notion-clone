// app/layout.tsx — Root layout (Server Component)
// Envuelve toda la app con sidebar + área de contenido
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import "./globals.css";
import SidebarServer from "@/components/sidebar/SidebarServer";
import GlobalProviders from "@/components/GlobalProviders";

export const metadata: Metadata = {
  title: "NotionLocal",
  description: "Tu clon local de Notion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans flex h-screen overflow-hidden bg-white dark:bg-gray-900">
        {/* Sidebar jerárquico — Server Component que pasa datos al Client */}
        <SidebarServer />

        {/* Área principal de contenido */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </div>

        {/* Providers globales de cliente: SearchModal (⌘K), etc. */}
        <GlobalProviders />
      </body>
    </html>
  );
}
