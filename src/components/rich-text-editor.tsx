"use client";

import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Italic, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

export const richTextClasses =
  "text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_p]:mb-2 last:[&_p]:mb-0";

function botaoClasses(ativo: boolean) {
  return cn(
    "flex size-7 items-center justify-center rounded-md border transition-colors",
    ativo ? "border-brand/30 bg-brand text-white" : "border-transparent text-neutral-600 hover:bg-neutral-200",
  );
}

export function RichTextEditor({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(richTextClasses, "min-h-24 rounded-b-lg px-3 py-2 text-sm focus:outline-none"),
      },
    },
  });

  // useEditorState recalcula (e re-renderiza só o necessário) a cada
  // transação — inclui casos como sair da lista ao dar Enter num item
  // vazio, que não muda o texto mas muda o estado ativo dos botões.
  const estado = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed?.isActive("bold") ?? false,
      italic: ed?.isActive("italic") ?? false,
      bulletList: ed?.isActive("bulletList") ?? false,
      orderedList: ed?.isActive("orderedList") ?? false,
      html: ed?.getHTML() ?? defaultValue,
    }),
  });

  return (
    <div className="rounded-lg border border-neutral-300">
      <div className="flex items-center gap-1 border-b border-neutral-200 bg-neutral-50 p-1.5">
        <button
          type="button"
          aria-label="Negrito"
          aria-pressed={estado?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(botaoClasses(!!estado?.bold), "font-bold")}
        >
          N
        </button>
        <button
          type="button"
          aria-label="Itálico"
          aria-pressed={estado?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={botaoClasses(!!estado?.italic)}
        >
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Lista com marcadores"
          aria-pressed={estado?.bulletList}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={botaoClasses(!!estado?.bulletList)}
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Lista numerada"
          aria-pressed={estado?.orderedList}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={botaoClasses(!!estado?.orderedList)}
        >
          <ListOrdered className="size-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={estado?.html ?? defaultValue} readOnly />
    </div>
  );
}
