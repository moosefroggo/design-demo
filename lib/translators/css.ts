import type { Node } from "../parser";
import { parse } from "../parser";
import { indent, joinLines, namedChildren, textOf, nm, val, cm, plain, NL, lineAwareBlock, type Token } from "./util";

const PROPERTY_DESCRIPTIONS: Record<string, (v: string) => Token[]> = {
  color: (v) => [plain("Set the text color to "), val(v), plain(".")],
  "background-color": (v) => [plain("Set the background color to "), val(v), plain(".")],
  background: (v) => [plain("Set the background to "), val(v), plain(".")],
  "font-size": (v) => [plain("Set the font size to "), val(v), plain(".")],
  "font-family": (v) => [plain("Use the "), val(v), plain(" font family.")],
  "font-weight": (v) => [plain("Set the font weight to "), val(v), plain(".")],
  "text-align": (v) => [plain("Align the text "), val(v), plain(".")],
  margin: (v) => [plain("Set the outer margin to "), val(v), plain(".")],
  padding: (v) => [plain("Set the inner padding to "), val(v), plain(".")],
  width: (v) => [plain("Set the width to "), val(v), plain(".")],
  height: (v) => [plain("Set the height to "), val(v), plain(".")],
  display: (v) => [plain("Display as "), val(v), plain(".")],
  border: (v) => [plain("Add a border of "), val(v), plain(".")],
  "border-radius": (v) => [plain("Round the corners by "), val(v), plain(".")],
};

function describeRule(node: Node): Token[] {
  const selectors = namedChildren(node)
    .filter((c) => c.type === "selectors" || c.type.endsWith("_selector"))
    .map(textOf)
    .join(" ")
    .trim();

  const blockNode = namedChildren(node).find((c) => c.type === "block");
  const declarations: Token[][] = [];
  if (blockNode) {
    for (const decl of namedChildren(blockNode)) {
      if (decl.type !== "declaration") continue;
      const propNode = decl.namedChild(0);
      const prop = textOf(propNode).toLowerCase();
      const value = decl.text.replace(/^[^:]*:\s*/, "").replace(/;$/, "").trim();
      const desc = PROPERTY_DESCRIPTIONS[prop];
      declarations.push(desc ? desc(value) : [plain("Set "), nm(prop), plain(" to "), val(value), plain(".")]);
    }
  }

  if (!selectors) return joinLines(declarations);
  const head: Token[] = [plain('For elements matching "'), nm(selectors), plain('":')];
  return declarations.length ? [...head, NL, ...indent(joinLines(declarations))] : head;
}

function topLevel(node: Node): Token[] {
  switch (node.type) {
    case "rule_set":
      return describeRule(node);
    case "comment":
      return [];
    case "media_statement":
      return [
        plain(`Apply the following rules conditionally (${node.text.split("{")[0].trim()}):`),
        NL,
        ...indent(
          joinLines(
            namedChildren(node)
              .filter((c) => c.type === "block")
              .flatMap(namedChildren)
              .map(topLevel)
              .filter((t) => t.length > 0)
          )
        ),
      ];
    case "import_statement":
      return [plain(`Import the stylesheet ${node.text}.`)];
    default:
      return [];
  }
}

export async function translate(source: string): Promise<Token[]> {
  const tree = await parse(source, "css");
  return lineAwareBlock(tree.rootNode, topLevel, source.split("\n").length);
}
