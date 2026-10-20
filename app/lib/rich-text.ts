export type RichTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "fontFamily"; value: string }
  | { type: "fontSize"; value: string }
  | { type: "color"; value: string };

export type RichTextInline =
  | { type: "text"; text: string; marks: RichTextMark[] }
  | { type: "break" };

export interface RichTextBlock {
  type: "paragraph";
  children: RichTextInline[];
}

export interface RichTextDocument {
  version: 1;
  blocks: RichTextBlock[];
}

export const RICH_TEXT_FONTS = [
  "Arial",
  "Georgia",
  "Tahoma",
  "Times New Roman",
  "Verdana",
] as const;

export const RICH_TEXT_SIZES = [
  "12px",
  "16px",
  "18px",
  "24px",
  "32px",
] as const;

const FONT_SIZE_COMMANDS: Record<string, string> = {
  "12px": "2",
  "16px": "3",
  "18px": "4",
  "24px": "5",
  "32px": "6",
};

const COMMAND_FONT_SIZES: Record<string, string> = {
  "1": "12px",
  "2": "12px",
  "3": "16px",
  "4": "18px",
  "5": "24px",
  "6": "32px",
  "7": "32px",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validMarks(value: unknown): RichTextMark[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((mark): RichTextMark[] => {
    if (!isRecord(mark)) return [];

    if (
      mark.type === "bold" ||
      mark.type === "italic" ||
      mark.type === "underline"
    ) {
      return [{ type: mark.type }];
    }

    if (mark.type === "fontFamily" && typeof mark.value === "string") {
      const font = RICH_TEXT_FONTS.find((candidate) => candidate === mark.value);
      return font ? [{ type: "fontFamily", value: font }] : [];
    }

    if (mark.type === "fontSize" && typeof mark.value === "string") {
      const size = RICH_TEXT_SIZES.find((candidate) => candidate === mark.value);
      return size ? [{ type: "fontSize", value: size }] : [];
    }

    if (
      mark.type === "color" &&
      typeof mark.value === "string" &&
      /^#[\da-f]{6}$/i.test(mark.value)
    ) {
      return [{ type: "color", value: mark.value }];
    }

    return [];
  });
}

function parseDocument(value: unknown): RichTextDocument | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.blocks)) {
    return null;
  }

  const blocks = value.blocks.flatMap((block): RichTextBlock[] => {
    if (
      !isRecord(block) ||
      block.type !== "paragraph" ||
      !Array.isArray(block.children)
    ) {
      return [];
    }

    const children = block.children.flatMap((child): RichTextInline[] => {
      if (!isRecord(child)) return [];
      if (child.type === "break") return [{ type: "break" }];
      if (child.type !== "text" || typeof child.text !== "string") return [];

      return [
        {
          type: "text",
          text: child.text,
          marks: validMarks(child.marks),
        },
      ];
    });

    return [{ type: "paragraph", children }];
  });

  return { version: 1, blocks };
}

export function parseRichText(value: string | null | undefined): RichTextDocument {
  const text = value ?? "";

  try {
    const document = parseDocument(JSON.parse(text) as unknown);
    if (document) return document;
  } catch {
    // Older content is stored as plain text and is rendered as paragraphs.
  }

  return {
    version: 1,
    blocks: text.split(/\r\n?|\n/).map((line) => ({
      type: "paragraph",
      children: line ? [{ type: "text", text: line, marks: [] }] : [],
    })),
  };
}

export function richTextToPlainText(value: string | null | undefined): string {
  return parseRichText(value)
    .blocks.map((block) =>
      block.children
        .map((child) => (child.type === "break" ? "\n" : child.text))
        .join("")
    )
    .join("\n");
}

export function hasRichTextContent(value: string | null | undefined): boolean {
  return richTextToPlainText(value).trim().length > 0;
}

export function richTextSizeCommand(value: string): string {
  return FONT_SIZE_COMMANDS[value] ?? "3";
}

export function richTextSizeFromCommand(value: string): string | undefined {
  return COMMAND_FONT_SIZES[value];
}
