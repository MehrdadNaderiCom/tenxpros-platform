"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor, Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

/**
 * Rich editor for Partner Academy lessons. Outputs HTML (sanitized server-side on
 * save) and initializes from the stored lesson HTML. Callouts render as
 * <div class="callout callout-{tone}"> so the public lesson renderer and the
 * server sanitizer (allowlisted classes) style them consistently.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lessonCallout: { setLessonCallout: () => ReturnType };
  }
}

const TONE_CLASS: Record<string, string> = {
  info: "callout callout-info",
  tip: "callout callout-tip",
  warning: "callout callout-warning",
  success: "callout callout-success",
};

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const tone = String(node.attrs.tone ?? "info");
  const border: Record<string, string> = { info: "#0EA5E9", tip: "#6366F1", warning: "#F59E0B", success: "#10B981" };
  const bg: Record<string, string> = { info: "#F0F9FF", tip: "#EEF2FF", warning: "#FFFBEB", success: "#ECFDF5" };
  return (
    <NodeViewWrapper className="my-3">
      <div style={{ background: bg[tone] ?? bg.info, borderLeft: `4px solid ${border[tone] ?? border.info}`, borderRadius: 6, padding: "10px 14px" }}>
        <div contentEditable={false} className="mb-1">
          <select
            value={tone}
            onChange={(e) => updateAttributes({ tone: e.target.value })}
            className="rounded border border-neutral-200 bg-white/70 px-1 py-0.5 text-[11px] text-slate-600"
          >
            <option value="info">Info</option>
            <option value="tip">Tip</option>
            <option value="warning">Watch out</option>
            <option value="success">Good</option>
          </select>
        </div>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

const LessonCallout = Node.create({
  name: "lessonCallout",
  group: "block",
  content: "paragraph+",
  defining: true,
  addAttributes() {
    return { tone: { default: "info" } };
  },
  parseHTML() {
    return [{ tag: "div.callout" }];
  },
  renderHTML({ node }) {
    const tone = String(node.attrs.tone ?? "info");
    return ["div", mergeAttributes({ class: TONE_CLASS[tone] ?? TONE_CLASS.info }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
  addCommands() {
    return {
      setLessonCallout:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, content: [{ type: "paragraph" }] }),
    };
  },
});

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
  Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
  Image.configure({ inline: false }),
  LessonCallout,
];

const CONTENT_CLASS =
  "[&_.ProseMirror]:min-h-[420px] [&_.ProseMirror]:outline-none [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 [&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-navy-900 [&_p]:my-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-700 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-sm [&_li]:text-slate-700 [&_blockquote]:border-l-2 [&_blockquote]:border-gold-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_a]:text-navy-600 [&_a]:underline [&_strong]:text-navy-900 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded [&_hr]:my-4 [&_hr]:border-neutral-300";

export function LessonEditor({ name = "bodyHtml", initialHtml }: { name?: string; initialHtml?: string }) {
  const [html, setHtml] = useState<string>(initialHtml ?? "");
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: initialHtml || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    onCreate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: { attributes: { class: "px-4 py-3" } },
  });

  return (
    <div className="rounded-md border border-neutral-300 bg-white">
      <Toolbar editor={editor} />
      <div className={CONTENT_CLASS}>
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
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) {
      window.alert("Links must start with http(s)://, mailto:, or / (a site path).");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = () => {
    const src = window.prompt("Image URL (https://... or a /uploads path)");
    if (!src) return;
    if (!/^(https:\/\/|\/)/i.test(src)) {
      window.alert("Image URL must start with https:// or / (a site path).");
      return;
    }
    const alt = window.prompt("Alt text (describe the image for accessibility)") || "";
    editor.chain().focus().insertContent({ type: "image", attrs: { src, alt } }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 p-1.5">
      <Btn label="Bold" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></Btn>
      <Btn label="Italic" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><em>I</em></Btn>
      <Sep />
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
      <Btn label="Heading 4" active={editor.isActive("heading", { level: 4 })} on={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>H4</Btn>
      <Sep />
      <Btn label="Bullet list" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()}>{"• List"}</Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} on={() => editor.chain().focus().toggleBlockquote().run()}>Quote</Btn>
      <Sep />
      <Btn label="Link" active={editor.isActive("link")} on={setLink}>Link</Btn>
      <Btn label="Remove link" on={() => editor.chain().focus().unsetLink().run()}>Unlink</Btn>
      <Sep />
      <Btn label="Insert image" on={insertImage}>Image</Btn>
      <Btn label="Insert callout" on={() => editor.chain().focus().setLessonCallout().run()}>Callout</Btn>
      <Btn label="Divider" on={() => editor.chain().focus().setHorizontalRule().run()}>Divider</Btn>
      <Sep />
      <Btn label="Undo" on={() => editor.chain().focus().undo().run()}>Undo</Btn>
      <Btn label="Redo" on={() => editor.chain().focus().redo().run()}>Redo</Btn>
    </div>
  );
}
