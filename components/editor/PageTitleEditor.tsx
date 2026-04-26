"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Clock,
  ImageIcon,
  LayoutTemplate,
  MoreHorizontal,
  Smile,
  Star,
  Trash2,
} from "lucide-react";
import { savePageAsTemplate, toggleFavorite, updatePage } from "@/lib/actions/pages";
import { useUIStore } from "@/lib/store/uiStore";
import VersionHistoryPanel from "./VersionHistoryPanel";

const COVER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#1e293b",
];

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
];

function getCoverStyle(cover: string): React.CSSProperties {
  if (cover.startsWith("linear-gradient") || cover.startsWith("radial-gradient")) {
    return { background: cover };
  }
  if (cover.startsWith("#")) {
    return { backgroundColor: cover };
  }
  return {
    backgroundImage: `url(${cover})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

type Props = {
  pageId: string;
  initialTitle: string;
  icon?: string | null;
  initialCover?: string | null;
  isFullWidth?: boolean;
  isFavorite?: boolean;
};

export default function PageTitleEditor({
  pageId,
  initialTitle,
  icon: initialIcon,
  initialCover,
  isFullWidth: initialIsFullWidth = false,
  isFavorite: initialIsFavorite = false,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon ?? "");
  const [cover, setCover] = useState<string | null>(initialCover ?? null);
  const [isFav, setIsFav] = useState(initialIsFavorite);
  const [isFullWidth, setIsFullWidth] = useState(initialIsFullWidth);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingIcon, setEditingIcon] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const [iconDraft, setIconDraft] = useState(initialIcon ?? "");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const setPageIsFullWidth = useUIStore((s) => s.setPageIsFullWidth);

  useEffect(() => {
    setTitle(initialTitle);
    setTitleDraft(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    setIcon(initialIcon ?? "");
    setIconDraft(initialIcon ?? "");
  }, [initialIcon]);

  useEffect(() => {
    setCover(initialCover ?? null);
  }, [initialCover]);

  useEffect(() => {
    setIsFav(initialIsFavorite);
  }, [initialIsFavorite]);

  useEffect(() => {
    setIsFullWidth(initialIsFullWidth);
    setPageIsFullWidth(initialIsFullWidth);
  }, [initialIsFullWidth, setPageIsFullWidth]);

  useEffect(() => {
    if (!showOptions) return;
    function handleClickOutside(event: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOptions]);

  async function commitTitle() {
    const newTitle = titleDraft.trim() || "Sin titulo";
    setTitle(newTitle);
    setEditingTitle(false);
    await updatePage({ id: pageId, title: newTitle });
    router.refresh();
  }

  async function commitIcon(value?: string) {
    const normalizedIcon = (value ?? iconDraft).trim();
    const nextIcon = normalizedIcon.length > 0 ? normalizedIcon : null;
    setIcon(nextIcon ?? "");
    setEditingIcon(false);
    await updatePage({ id: pageId, icon: nextIcon });
    router.refresh();
  }

  function startEditTitle() {
    setTitleDraft(title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 20);
  }

  function startEditIcon() {
    setIconDraft(icon);
    setEditingIcon(true);
    setTimeout(() => iconInputRef.current?.focus(), 20);
  }

  async function handleSetCover(newCover: string | null) {
    setCover(newCover);
    setShowCoverPicker(false);
    setCoverUrlDraft("");
    await updatePage({ id: pageId, cover: newCover });
    router.refresh();
  }

  async function handleToggleFavorite() {
    const nextValue = !isFav;
    setIsFav(nextValue);
    await toggleFavorite({ id: pageId });
    router.refresh();
  }

  async function handleToggleFullWidth() {
    const nextValue = !isFullWidth;
    setIsFullWidth(nextValue);
    setPageIsFullWidth(nextValue);
    setShowOptions(false);
    await updatePage({ id: pageId, isFullWidth: nextValue });
  }

  async function handleSaveAsTemplate() {
    setIsSavingTemplate(true);
    try {
      await savePageAsTemplate({ pageId });
      router.refresh();
    } finally {
      setIsSavingTemplate(false);
      setShowOptions(false);
    }
  }

  const titleContainerClass = isFullWidth ? "max-w-full px-16" : "max-w-3xl px-4";

  return (
    <div className="w-full">
      {cover ? (
        <div className="group relative h-40 w-full" style={getCoverStyle(cover)}>
          <div className="absolute bottom-2 right-4 hidden gap-2 group-hover:flex">
            <button
              onClick={() => setShowCoverPicker(true)}
              className="rounded bg-black/30 px-2 py-1 text-xs text-white hover:bg-black/50"
            >
              Cambiar
            </button>
            <button
              onClick={() => handleSetCover(null)}
              className="flex items-center gap-1 rounded bg-black/30 px-2 py-1 text-xs text-white hover:bg-black/50"
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          </div>
        </div>
      ) : null}

      {showCoverPicker && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/10 pt-32"
          onClick={() => setShowCoverPicker(false)}
        >
          <div
            className="w-[360px] rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Colores</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleSetCover(color)}
                  className="h-7 w-7 rounded-full border-2 border-transparent hover:border-blue-400"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Gradientes</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {COVER_GRADIENTS.map((gradient) => (
                <button
                  key={gradient}
                  onClick={() => handleSetCover(gradient)}
                  className="h-7 w-14 rounded border-2 border-transparent hover:border-blue-400"
                  style={{ background: gradient }}
                  title="Aplicar gradiente"
                />
              ))}
            </div>

            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">URL de imagen</p>
            <div className="flex gap-2">
              <input
                value={coverUrlDraft}
                onChange={(e) => setCoverUrlDraft(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                onClick={() => {
                  if (!coverUrlDraft.trim()) return;
                  void handleSetCover(coverUrlDraft.trim());
                }}
                className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`group mx-auto w-full pt-10 ${titleContainerClass}`}>
        <div className="mb-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {!cover && (
            <button
              onClick={() => setShowCoverPicker(true)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <ImageIcon size={12} />
              Anadir portada
            </button>
          )}

          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${
              isFav ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"
            }`}
            title={isFav ? "Quitar de favoritos" : "Anadir a favoritos"}
          >
            <Star size={12} fill={isFav ? "currentColor" : "none"} />
            Favorito
          </button>

          <div className="relative ml-auto" ref={optionsRef}>
            <button
              onClick={() => setShowOptions((value) => !value)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              title="Opciones de pagina"
            >
              <MoreHorizontal size={12} />
              Opciones
            </button>

            {showOptions && (
              <div className="absolute right-0 top-8 z-40 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <button
                  onClick={handleToggleFullWidth}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <ArrowLeftRight size={14} />
                  {isFullWidth ? "Vista normal" : "Ancho completo"}
                </button>
                <button
                  onClick={() => {
                    setShowHistory(true);
                    setShowOptions(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Clock size={14} />
                  Historial
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={isSavingTemplate}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <LayoutTemplate size={14} />
                  {isSavingTemplate ? "Guardando..." : "Guardar como template"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-3">
          {editingIcon ? (
            <div className="flex items-center gap-2">
              <input
                ref={iconInputRef}
                value={iconDraft}
                onChange={(e) => setIconDraft(e.target.value)}
                onBlur={() => {
                  void commitIcon();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitIcon();
                  if (e.key === "Escape") {
                    setEditingIcon(false);
                    setIconDraft(icon);
                  }
                }}
                placeholder="Emoji..."
                maxLength={8}
                className="w-28 rounded border border-blue-400 bg-white px-2 py-1 text-center text-2xl text-gray-900 outline-none dark:bg-gray-900 dark:text-gray-100"
                autoFocus
              />
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  void commitIcon("");
                }}
                className="text-xs text-gray-400 underline hover:text-red-500"
              >
                Quitar
              </button>
            </div>
          ) : icon ? (
            <button onClick={startEditIcon} title="Cambiar icono" className="text-5xl hover:opacity-70">
              {icon}
            </button>
          ) : (
            <button
              onClick={startEditIcon}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-gray-800"
            >
              <Smile size={14} />
              Anadir icono
            </button>
          )}
        </div>

        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              void commitTitle();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitTitle();
              if (e.key === "Escape") {
                setEditingTitle(false);
                setTitleDraft(title);
              }
            }}
            className="w-full border-b-2 border-blue-400 bg-transparent text-4xl font-bold text-gray-900 outline-none dark:text-gray-100"
            autoFocus
          />
        ) : (
          <h1
            onClick={startEditTitle}
            title="Clic para renombrar"
            className="cursor-text text-4xl font-bold text-gray-900 transition-opacity hover:opacity-75 dark:text-gray-100"
          >
            {title}
          </h1>
        )}
      </div>

      {showHistory && <VersionHistoryPanel pageId={pageId} onClose={() => setShowHistory(false)} />}
    </div>
  );
}
