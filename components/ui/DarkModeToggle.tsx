"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  // Evita flash de hidratación — no renderiza hasta que cliente conozca el tema
  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="fixed right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition-transform hover:scale-110 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
