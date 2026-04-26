"use client";

import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  activePageId: string | null;
  pageIsFullWidth: boolean;
  toggleSidebar: () => void;
  setActivePageId: (id: string | null) => void;
  setPageIsFullWidth: (v: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activePageId: null,
  pageIsFullWidth: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActivePageId: (id) => set({ activePageId: id }),
  setPageIsFullWidth: (v) => set({ pageIsFullWidth: v }),
}));
