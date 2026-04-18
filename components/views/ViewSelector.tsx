"use client";

import { Table2, LayoutGrid, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewType = "TABLE" | "KANBAN" | "CALENDAR";

const VIEWS: { type: ViewType; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { type: "TABLE", label: "Tabla", Icon: Table2 },
  { type: "KANBAN", label: "Kanban", Icon: LayoutGrid },
  { type: "CALENDAR", label: "Calendario", Icon: Calendar },
];

type Props = {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
};

export function ViewSelector({ activeView, onViewChange }: Props) {
  return (
    <div className="flex items-center gap-1 px-6 pb-2 border-b border-gray-100 dark:border-gray-800">
      {VIEWS.map(({ type, label, Icon }) => (
        <button
          key={type}
          onClick={() => onViewChange(type)}
          data-testid={`view-${type.toLowerCase()}`}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors",
            activeView === type
              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-800/50 dark:hover:text-gray-300"
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
