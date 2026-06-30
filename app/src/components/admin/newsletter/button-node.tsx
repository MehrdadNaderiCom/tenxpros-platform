"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emailButton: {
      setEmailButton: (attrs: { href: string; label: string; align?: string }) => ReturnType;
    };
  }
}

function ButtonView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const href = String(node.attrs.href ?? "");
  const label = String(node.attrs.label ?? "Open");
  const align = String(node.attrs.align ?? "left");

  const edit = () => {
    const nextLabel = window.prompt("Button text", label);
    if (nextLabel === null) return;
    const nextHref = window.prompt("Button link (https://...)", href);
    if (nextHref === null) return;
    const nextAlign = window.prompt("Align (left, center, right)", align) || align;
    updateAttributes({ label: nextLabel, href: nextHref, align: ["left", "center", "right"].includes(nextAlign) ? nextAlign : align });
  };

  return (
    <NodeViewWrapper className="my-2" data-drag-handle>
      <span contentEditable={false} style={{ display: "flex", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start", alignItems: "center", gap: 8 }}>
        <a
          href={href}
          onClick={(e) => e.preventDefault()}
          style={{ background: "#0B1F3A", color: "#fff", borderRadius: 8, padding: "10px 24px", fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block", boxShadow: selected ? "0 0 0 2px #B58A3C" : "none" }}
        >
          {label || "Button"}
        </a>
        <button type="button" onClick={edit} className="text-xs text-slate-500 hover:text-navy-900">edit</button>
        <button type="button" onClick={() => deleteNode()} className="text-xs text-red-600 hover:text-red-700">remove</button>
      </span>
    </NodeViewWrapper>
  );
}

export const EmailButton = Node.create({
  name: "button",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: "https://" },
      label: { default: "Open" },
      align: { default: "left" },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-email-button]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes({ "data-email-button": "", href: HTMLAttributes.href }), String(HTMLAttributes.label ?? "Open")];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonView);
  },

  addCommands() {
    return {
      setEmailButton:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
