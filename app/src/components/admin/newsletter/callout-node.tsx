"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType;
    };
  }
}

const BORDER: Record<string, string> = { info: "#0EA5E9", warning: "#F59E0B", success: "#10B981", neutral: "#94A3B8" };
const BG: Record<string, string> = { info: "#F0F9FF", warning: "#FFFBEB", success: "#ECFDF5", neutral: "#F8FAFC" };

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const tone = String(node.attrs.tone ?? "info");
  return (
    <NodeViewWrapper className="my-2">
      <div style={{ background: BG[tone] ?? BG.info, borderLeft: `4px solid ${BORDER[tone] ?? BORDER.info}`, borderRadius: 6, padding: "10px 14px" }}>
        <div contentEditable={false} className="mb-1">
          <select
            value={tone}
            onChange={(e) => updateAttributes({ tone: e.target.value })}
            className="rounded border border-neutral-200 bg-white/70 px-1 py-0.5 text-[11px] text-slate-600"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return { tone: { default: "info" } };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-callout": "" }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, content: [{ type: "paragraph" }] }),
    };
  },
});
