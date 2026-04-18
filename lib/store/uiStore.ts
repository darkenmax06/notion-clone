"use client";

import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  activePageId: string | null;
  toggleSidebar: () => void;
  setActivePageId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activePageId: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActivePageId: (id) => set({ activePageId: id }),
}));
