"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

/**
 * Rich-text editor for newsletter bodies, built on TipTap (ProseMirror). Outputs
 * clean HTML into a hidden field so the server action receives ready-to-send
 * markup. Full toolbar: headings, bold/italic, lists, quote, links, undo/redo.
 */
export function NewsletterEditor({ name = "body", initialHtml = "" }: { name?: string; initialHtml?: string }) {
  const [html, setHtml] = useState(initialHtml);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener", target: "_blank" } }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: { attributes: { class: "min-h-[280px] px-4 py-3 outline-none" } },
  });

  return (
    <div className="rounded-md border border-neutral-300 bg-white">
      <Toolbar editor={editor} />
      <div className="[&_.ProseMirror]:min-h-[280px] [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 [&_p]:my-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-700 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-sm [&_li]:text-slate-700 [&_blockquote]:border-l-2 [&_blockquote]:border-gold-500 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_a]:text-navy-600 [&_a]:underline [&_strong]:text-navy-900">
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function Btn({ on, active, label, children }: { on: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      aria-label={label}
      title={label}
      className={`h-8 min-w-8 rounded px-2 text-sm font-medium transition ${active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="h-11 border-b border-neutral-200" />;
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 p-1.5">
      <Btn label="Bold" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></Btn>
      <Btn label="Italic" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><em>I</em></Btn>
      <span className="mx-1 h-5 w-px bg-neutral-200" />
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
      <span className="mx-1 h-5 w-px bg-neutral-200" />
      <Btn label="Bullet list" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()}>{"• List"}</Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} on={() => editor.chain().focus().toggleBlockquote().run()}>{"“Quote”"}</Btn>
      <span className="mx-1 h-5 w-px bg-neutral-200" />
      <Btn label="Link" active={editor.isActive("link")} on={setLink}>Link</Btn>
      <Btn label="Remove link" on={() => editor.chain().focus().unsetLink().run()}>Unlink</Btn>
      <span className="mx-1 h-5 w-px bg-neutral-200" />
      <Btn label="Undo" on={() => editor.chain().focus().undo().run()}>Undo</Btn>
      <Btn label="Redo" on={() => editor.chain().focus().redo().run()}>Redo</Btn>
    </div>
  );
}
