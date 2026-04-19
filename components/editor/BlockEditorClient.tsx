"use client";

import dynamic from "next/dynamic";
import type { Block } from "@blocknote/core";

const BlockEditor = dynamic(() => import("@/components/editor/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-3xl px-4 py-8 text-gray-400">Cargando editor…</div>
  ),
});

type Props = {
  pageId: string;
  initialTitle?: string;
  initialContent?: Block[];
};

export default function BlockEditorClient({ pageId, initialTitle, initialContent }: Props) {
  return <BlockEditor pageId={pageId} initialTitle={initialTitle} initialContent={initialContent} />;
}
