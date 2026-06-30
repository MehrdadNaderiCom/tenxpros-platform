"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { EmailButton } from "@/components/admin/newsletter/button-node";
import { Callout } from "@/components/admin/newsletter/callout-node";

// Image with an optional explicit width and a required alt, for email.
const EmailImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      alt: { default: "" },
    };
  },
});

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3] } }),
  Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
  EmailImage.configure({ inline: false }),
  EmailButton,
  Callout,
];

const CONTENT_CLASS =
  "[&_.ProseMirror]:min-h-[320px] [&_.ProseMirror]:outline-none [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 [&_p]:my-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-700 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-sm [&_li]:text-slate-700 [&_blockquote]:border-l-2 [&_blockquote]:border-gold-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_a]:text-navy-600 [&_a]:underline [&_strong]:text-navy-900 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded [&_hr]:my-4 [&_hr]:border-neutral-300";

export function NewsletterEditor({ name = "bodyJson", initialJson }: { name?: string; initialJson?: string }) {
  const initial = (() => {
    if (!initialJson) return undefined;
    try {
      return JSON.parse(initialJson);
    } catch {
      return undefined;
    }
  })();
  const [json, setJson] = useState<string>(initialJson ?? "");
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: initial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
    onCreate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
    editorProps: { attributes: { class: "px-4 py-3" } },
  });

  return (
    <div className="rounded-md border border-neutral-300 bg-white">
      <Toolbar editor={editor} />
      <div className={CONTENT_CLASS}>
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={json} />
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

const Sep = () => <span className="mx-1 h-5 w-px bg-neutral-200" />;

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="h-11 border-b border-neutral-200" />;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://... or mailto:...)", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      window.alert("Links must start with http(s):// or mailto:");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = () => {
    const src = window.prompt("Image URL (must start with https://)");
    if (!src) return;
    if (!/^https:\/\//i.test(src)) {
      window.alert("Image URL must start with https://");
      return;
    }
    const alt = window.prompt("Alt text (describe the image for accessibility and spam filters)") || "";
    const widthRaw = window.prompt("Width in pixels (optional, e.g. 480; blank for full width)") || "";
    const width = Number(widthRaw);
    editor
      .chain()
      .focus()
      .insertContent({ type: "image", attrs: { src, alt, width: Number.isFinite(width) && width > 0 ? Math.round(width) : null } })
      .run();
  };

  const insertButton = () => {
    const label = window.prompt("Button text", "Apply now");
    if (label === null) return;
    const href = window.prompt("Button link (https://...)", "https://tenxpros.com");
    if (href === null) return;
    if (!/^https?:\/\//i.test(href)) {
      window.alert("Button link must start with http(s)://");
      return;
    }
    const align = window.prompt("Align (left, center, right)", "left") || "left";
    editor.chain().focus().setEmailButton({ label, href, align: ["left", "center", "right"].includes(align) ? align : "left" }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 p-1.5">
      <Btn label="Bold" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></Btn>
      <Btn label="Italic" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><em>I</em></Btn>
      <Sep />
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
      <Sep />
      <Btn label="Bullet list" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()}>{"• List"}</Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} on={() => editor.chain().focus().toggleBlockquote().run()}>{"“Quote”"}</Btn>
      <Sep />
      <Btn label="Link" active={editor.isActive("link")} on={setLink}>Link</Btn>
      <Btn label="Remove link" on={() => editor.chain().focus().unsetLink().run()}>Unlink</Btn>
      <Sep />
      <Btn label="Insert image" on={insertImage}>Image</Btn>
      <Btn label="Insert button" on={insertButton}>Button</Btn>
      <Btn label="Insert callout" on={() => editor.chain().focus().setCallout().run()}>Callout</Btn>
      <Btn label="Divider" on={() => editor.chain().focus().setHorizontalRule().run()}>Divider</Btn>
      <Sep />
      <Btn label="Undo" on={() => editor.chain().focus().undo().run()}>Undo</Btn>
      <Btn label="Redo" on={() => editor.chain().focus().redo().run()}>Redo</Btn>
    </div>
  );
}
