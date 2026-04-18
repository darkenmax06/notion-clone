// app/layout.tsx — Root layout (Server Component)
// Envuelve toda la app con sidebar + área de contenido

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SidebarServer from "@/components/sidebar/SidebarServer";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} flex h-screen overflow-hidden bg-white dark:bg-gray-900`}>
        {/* Sidebar jerárquico — Server Component que pasa datos al Client */}
        <SidebarServer />

        {/* Área principal de contenido */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
