import type { ReactNode } from "react";
import {
  parseRichText,
  type RichTextInline,
  type RichTextMark,
} from "../lib/rich-text";

function applyMark(content: ReactNode, mark: RichTextMark, key: string) {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{content}</strong>;
    case "italic":
      return <em key={key}>{content}</em>;
    case "underline":
      return <u key={key}>{content}</u>;
    case "fontFamily":
      return (
        <span key={key} style={{ fontFamily: mark.value }}>
          {content}
        </span>
      );
    case "fontSize":
      return (
        <span key={key} style={{ fontSize: mark.value }}>
          {content}
        </span>
      );
    case "color":
      return (
        <span key={key} style={{ color: mark.value }}>
          {content}
        </span>
      );
  }
}

function renderInline(inline: RichTextInline, key: string) {
  if (inline.type === "break") return <br key={key} />;

  return inline.marks.reduceRight<ReactNode>(
    (content, mark, index) => applyMark(content, mark, `${key}-${index}`),
    <span key={key}>{inline.text}</span>
  );
}

export default function RichText({
  value,
  className = "",
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const document = parseRichText(value);

  return (
    <div className={`rich-text-content ${className}`}>
      {document.blocks.map((block, blockIndex) => (
        <p key={blockIndex}>
          {block.children.map((child, childIndex) =>
            renderInline(child, `${blockIndex}-${childIndex}`)
          )}
        </p>
      ))}
    </div>
  );
}
