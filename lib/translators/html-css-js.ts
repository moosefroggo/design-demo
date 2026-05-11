import type { Node } from "../parser";
import { parse } from "../parser";
import { translate as htmlTranslate } from "./html";
import { translate as jsTranslate } from "./javascript";
import { translate as cssTranslate } from "./css";
import { namedChildren, kw, plain, NL, type Token } from "./util";

/** Recursively collect all script_element / style_element raw text from the HTML AST. */
function collectEmbedded(node: Node, scripts: string[], styles: string[]) {
  if (node.type === "script_element" || node.type === "style_element") {
    const raw = namedChildren(node).find((c) => c.type === "raw_text");
    if (raw?.text?.trim()) {
      if (node.type === "script_element") scripts.push(raw.text);
      else styles.push(raw.text);
    }
    return; // don't recurse into the content
  }
  for (const child of namedChildren(node)) {
    collectEmbedded(child, scripts, styles);
  }
}

/** Section divider header */
function sectionHeader(label: string): Token[] {
  return [kw(`── ${label} ──`)];
}

export async function translate(source: string): Promise<Token[]> {
  // Parse HTML to find embedded scripts/styles
  const tree = await parse(source, "html");
  const scripts: string[] = [];
  const styles: string[] = [];
  collectEmbedded(tree.rootNode, scripts, styles);

  // Translate everything in parallel
  const [htmlTokens, ...rest] = await Promise.all([
    htmlTranslate(source),
    ...styles.map((s) => cssTranslate(s)),
    ...scripts.map((s) => jsTranslate(s)),
  ]);
  const styleTokensList = rest.slice(0, styles.length);
  const scriptTokensList = rest.slice(styles.length);

  const result: Token[] = [];

  if (htmlTokens.length) {
    result.push(...sectionHeader("HTML Structure"), NL, ...htmlTokens);
  }

  for (let i = 0; i < styleTokensList.length; i++) {
    const tokens = styleTokensList[i];
    if (!tokens.length) continue;
    const label = styles.length > 1 ? `Embedded CSS (${i + 1})` : "Embedded CSS";
    if (result.length) result.push(NL, NL);
    result.push(...sectionHeader(label), NL, ...tokens);
  }

  for (let i = 0; i < scriptTokensList.length; i++) {
    const tokens = scriptTokensList[i];
    if (!tokens.length) continue;
    const label = scripts.length > 1 ? `Embedded JavaScript (${i + 1})` : "Embedded JavaScript";
    if (result.length) result.push(NL, NL);
    result.push(...sectionHeader(label), NL, ...tokens);
  }

  return result;
}
