"use client";

import { useEffect, useRef } from "react";
import {
  parseRichText,
  RICH_TEXT_FONTS,
  RICH_TEXT_SIZES,
  richTextSizeCommand,
  richTextSizeFromCommand,
  type RichTextBlock,
  type RichTextDocument,
  type RichTextInline,
  type RichTextMark,
} from "../../lib/rich-text";

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6"]);
const IGNORED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "SVG",
  "IMG",
]);

function cleanFontFamily(value: string | null): string | undefined {
  if (!value) return undefined;

  const family = value.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
  return RICH_TEXT_FONTS.find(
    (font) => font.toLowerCase() === family.toLowerCase()
  );
}

function cleanColor(value: string): string | undefined {
  if (/^#[\da-f]{6}$/i.test(value)) return value.toLowerCase();

  const rgb = value.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );
  if (!rgb) return undefined;

  const channels = rgb.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) return undefined;

  return `#${rgb
    .slice(1)
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function elementMarks(element: HTMLElement): RichTextMark[] {
  const marks: RichTextMark[] = [];
  const tag = element.tagName;
  const fontWeight = element.style.fontWeight;
  const textDecoration =
    `${element.style.textDecoration} ${element.style.textDecorationLine}`;

  if (
    tag === "B" ||
    tag === "STRONG" ||
    fontWeight === "bold" ||
    (Number(fontWeight) >= 600 && Number.isFinite(Number(fontWeight)))
  ) {
    marks.push({ type: "bold" });
  }
  if (tag === "I" || tag === "EM" || element.style.fontStyle === "italic") {
    marks.push({ type: "italic" });
  }
  if (tag === "U" || textDecoration.split(/\s+/).includes("underline")) {
    marks.push({ type: "underline" });
  }

  const fontFamily = cleanFontFamily(
    element.style.fontFamily || element.getAttribute("face")
  );
  if (fontFamily) marks.push({ type: "fontFamily", value: fontFamily }  );

  const fontSize = element.style.fontSize;
  const recognizedFontSize = RICH_TEXT_SIZES.find((size) => size === fontSize);
  if (recognizedFontSize) {
    marks.push({ type: "fontSize", value: recognizedFontSize });
  } else {
    const keywordSizes: Record<string, string> = {
      small: "12px",
      medium: "16px",
      large: "18px",
      "x-large": "24px",
      "xx-large": "32px",
    };
    const commandSize = element.getAttribute("size");
    const mappedSize =
      keywordSizes[fontSize] ??
      (commandSize ? richTextSizeFromCommand(commandSize) : undefined);
    if (mappedSize) marks.push({ type: "fontSize", value: mappedSize });
  }

  const color = cleanColor(element.style.color || element.getAttribute("color") || "");
  if (color) marks.push({ type: "color", value: color });

  return marks;
}

function readInline(
  node: Node,
  inheritedMarks: RichTextMark[],
  output: RichTextInline[]
) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text) output.push({ type: "text", text, marks: inheritedMarks });
    return;
  }

  if (!(node instanceof HTMLElement)) return;
  if (IGNORED_TAGS.has(node.tagName)) return;
  if (node.tagName === "BR") {
    output.push({ type: "break" });
    return;
  }

  const marks = [...inheritedMarks, ...elementMarks(node)];
  node.childNodes.forEach((child) => readInline(child, marks, output));
}

function mergeAdjacentText(children: RichTextInline[]): RichTextInline[] {
  return children.reduce<RichTextInline[]>((merged, child) => {
    const previous = merged[merged.length - 1];
    if (
      child.type === "text" &&
      previous?.type === "text" &&
      JSON.stringify(previous.marks) === JSON.stringify(child.marks)
    ) {
      previous.text += child.text;
    } else {
      merged.push(child);
    }

    return merged;
  }, []);
}

function readEditorDocument(root: HTMLElement): RichTextDocument {
  const blocks: RichTextBlock[] = [];
  let looseContent: RichTextInline[] = [];

  const flushLooseContent = () => {
    if (looseContent.length) {
      blocks.push({
        type: "paragraph",
        children: mergeAdjacentText(looseContent),
      });
      looseContent = [];
    }
  };

  root.childNodes.forEach((node) => {
    if (
      node instanceof HTMLElement &&
      BLOCK_TAGS.has(node.tagName)
    ) {
      flushLooseContent();
      const children: RichTextInline[] = [];
      readInline(node, [], children);
      blocks.push({
        type: "paragraph",
        children: mergeAdjacentText(children),
      });
      return;
    }

    readInline(node, [], looseContent);
  });

  flushLooseContent();

  if (!blocks.length) {
    blocks.push({ type: "paragraph", children: [] });
  }

  return { version: 1, blocks };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function documentToEditorHtml(document: RichTextDocument): string {
  return document.blocks
    .map((block) => {
      const content = block.children
        .map((child) => {
          if (child.type === "break") return "<br>";

          return child.marks.reduceRight((text, mark) => {
            switch (mark.type) {
              case "bold":
                return `<strong>${text}</strong>`;
              case "italic":
                return `<em>${text}</em>`;
              case "underline":
                return `<u>${text}</u>`;
              case "fontFamily":
                return `<span style="font-family: '${mark.value}'">${text}</span>`;
              case "fontSize":
                return `<span style="font-size: ${mark.value}">${text}</span>`;
              case "color":
                return `<span style="color: ${mark.value}">${text}</span>`;
            }
          }, escapeHtml(child.text));
        })
        .join("");

      return `<p>${content || "<br>"}</p>`;
    })
    .join("");
}

function contentIsEmpty(document: RichTextDocument) {
  return document.blocks.every((block) =>
    block.children.every(
      (child) => child.type === "break" || !child.text.trim()
    )
  );
}

export default function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  minHeight = "8rem",
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  minHeight?: string;
  required?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedValue = useRef<string | null>(null);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    if (lastEmittedValue.current === value) {
      lastEmittedValue.current = null;
      return;
    }

    const document = parseRichText(value);
    editorRef.current.innerHTML = value
      ? documentToEditorHtml(document)
      : "";
  }, [value]);

  function guardarSeleccion() {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  }

  function restaurarSeleccion() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selectionRef.current) return;

    editor.focus();
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }

  function aplicarComando(comando: string, valor?: string) {
    restaurarSeleccion();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(comando, false, valor);
    if (editorRef.current) {
      const documentValue = readEditorDocument(editorRef.current);
      const serialized = contentIsEmpty(documentValue)
        ? ""
        : JSON.stringify(documentValue);
      if (!serialized) editorRef.current.innerHTML = "";
      lastEmittedValue.current = serialized;
      onChange(serialized);
    }
    guardarSeleccion();
  }

  function cambiarValor(comando: string, valor: string) {
    aplicarComando(comando, valor);
  }

  function emitirContenido() {
    if (!editorRef.current) return;
    const documentValue = readEditorDocument(editorRef.current);
    const serialized = contentIsEmpty(documentValue)
      ? ""
      : JSON.stringify(documentValue);
    if (!serialized) editorRef.current.innerHTML = "";
    lastEmittedValue.current = serialized;
    onChange(serialized);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8D0C5] bg-white focus-within:border-[#C56835] focus-within:ring-2 focus-within:ring-[#C56835]/10">
      <div
        aria-label={`Herramientas de formato para ${label}`}
        className="flex flex-wrap items-center gap-2 border-b border-[#D8D0C5] bg-[#FCFAF7] p-2"
      >
        <button
          type="button"
          aria-label="Negrita"
          title="Negrita"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => aplicarComando("bold")}
          className="h-9 min-w-9 rounded-lg px-2 font-bold text-[#3F4635] hover:bg-[#E8E9DF]"
        >
          B
        </button>
        <button
          type="button"
          aria-label="Cursiva"
          title="Cursiva"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => aplicarComando("italic")}
          className="h-9 min-w-9 rounded-lg px-2 italic text-[#3F4635] hover:bg-[#E8E9DF]"
        >
          I
        </button>
        <button
          type="button"
          aria-label="Subrayado"
          title="Subrayado"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => aplicarComando("underline")}
          className="h-9 min-w-9 rounded-lg px-2 underline text-[#3F4635] hover:bg-[#E8E9DF]"
        >
          U
        </button>

        <select
          aria-label="Tipo de letra"
          defaultValue=""
          onMouseDown={guardarSeleccion}
          onChange={(event) => {
            if (event.target.value) {
              cambiarValor("fontName", event.target.value);
              event.target.value = "";
            }
          }}
          className="h-9 max-w-36 rounded-lg border border-[#D8D0C5] bg-white px-2 text-xs text-[#3F4635]"
        >
          <option value="" disabled>
            Fuente
          </option>
          {RICH_TEXT_FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>

        <select
          aria-label="Tamaño de letra"
          defaultValue=""
          onMouseDown={guardarSeleccion}
          onChange={(event) => {
            if (event.target.value) {
              cambiarValor(
                "fontSize",
                richTextSizeCommand(event.target.value)
              );
              event.target.value = "";
            }
          }}
          className="h-9 rounded-lg border border-[#D8D0C5] bg-white px-2 text-xs text-[#3F4635]"
        >
          <option value="" disabled>
            Tamaño
          </option>
          {RICH_TEXT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size.replace("px", "")}
            </option>
          ))}
        </select>

        <label className="flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-[#3F4635] hover:bg-[#E8E9DF]">
          Color
          <input
            aria-label="Color de letra"
            type="color"
            defaultValue="#3F4635"
            onMouseDown={guardarSeleccion}
            onChange={(event) => cambiarValor("foreColor", event.target.value)}
            className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>

      <div
        ref={editorRef}
        role="textbox"
        aria-label={label}
        aria-required={required}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitirContenido}
        onKeyUp={guardarSeleccion}
        onMouseUp={guardarSeleccion}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          emitirContenido();
        }}
        className="rich-text-editor-content px-4 py-3 text-sm leading-6 text-[#3F4635] outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}
