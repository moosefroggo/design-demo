import type { Node } from "../parser";
import { parse } from "../parser";
import { indent, joinLines, interleave, namedChildren, textOf, nm, val, cm, plain, NL, lineAwareBlock, type Token } from "./util";

const TAG_DESCRIPTIONS: Record<string, string> = {
  html: "the HTML document",
  head: "the head section (metadata)",
  body: "the body (visible page content)",
  h1: "a top-level heading",
  h2: "a second-level heading",
  h3: "a third-level heading",
  h4: "a fourth-level heading",
  h5: "a fifth-level heading",
  h6: "a sixth-level heading",
  p: "a paragraph",
  a: "a link",
  img: "an image",
  ul: "an unordered (bulleted) list",
  ol: "an ordered (numbered) list",
  li: "a list item",
  div: "a generic container",
  span: "an inline span of content",
  button: "a button",
  input: "an input field",
  form: "a form",
  label: "a label",
  table: "a table",
  tr: "a table row",
  td: "a table cell",
  th: "a table header cell",
  nav: "a navigation section",
  header: "a header section",
  footer: "a footer section",
  main: "the main content",
  section: "a section",
  article: "an article",
  title: "the page title",
  meta: "page metadata",
  link: "a link to an external resource",
  script: "a script",
  style: "an embedded stylesheet",
};

function describeAttrs(attrs: Node[]): Token[] {
  if (!attrs.length) return [];
  const parts = attrs.map((a): Token[] => {
    const name = a.childForFieldName("name") ?? a.namedChild(0);
    const value = a.childForFieldName("value") ?? a.namedChild(1);
    return value ? [nm(textOf(name)), plain("="), val(textOf(value))] : [nm(textOf(name))];
  });
  return [plain(" (with "), ...interleave(parts, [plain(", ")]), plain(")")];
}

function elementDescription(node: Node): Token[] {
  const startTag = node.namedChild(0);
  if (!startTag) return [];
  const tagName = startTag.childForFieldName("name") ?? startTag.namedChild(0);
  const tag = textOf(tagName).toLowerCase();
  const attrs = startTag ? namedChildren(startTag).filter((c) => c.type === "attribute") : [];
  const description = TAG_DESCRIPTIONS[tag] ?? `a <${tag}> element`;

  const inner: Token[][] = [];
  for (const child of namedChildren(node)) {
    if (child === startTag) continue;
    if (child.type === "end_tag") continue;
    if (child.type === "element") inner.push(elementDescription(child));
    else if (child.type === "text") {
      const t = child.text.trim();
      if (t) inner.push([plain('Text: "'), val(t), plain('"')]);
    } else if (child.type === "script_element" || child.type === "style_element") {
      inner.push([plain(`Embedded ${child.type === "script_element" ? "script" : "stylesheet"}.`)]);
    }
  }

  const cap = description.length ? description[0].toUpperCase() + description.slice(1) : description;
  const attrTokens = describeAttrs(attrs);

  if (inner.length) {
    return [plain(cap), ...attrTokens, plain(":"), NL, ...indent(joinLines(inner))];
  }
  return [plain(cap), ...attrTokens, plain(".")];
}

function topLevel(node: Node): Token[] {
  switch (node.type) {
    case "element":
      return elementDescription(node);
    case "doctype":
      return [plain("Declares the document as HTML.")];
    case "comment":
      return [];
    default:
      return [];
  }
}

export async function translate(source: string): Promise<Token[]> {
  const tree = await parse(source, "html");
  return lineAwareBlock(tree.rootNode, topLevel, source.split("\n").length);
}
