import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  id: string;
  title: string;
  icon: string | null;
};

type Props = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: Props) {
  if (items.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-400 px-4 py-2">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.id} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={14} className="shrink-0" />}
            {isLast ? (
              <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                {item.icon && <span className="mr-1">{item.icon}</span>}
                {item.title || "Sin título"}
              </span>
            ) : (
              <Link
                href={`/page/${item.id}`}
                className="hover:text-gray-700 dark:hover:text-gray-200 truncate max-w-[150px]"
              >
                {item.icon && <span className="mr-1">{item.icon}</span>}
                {item.title || "Sin título"}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
