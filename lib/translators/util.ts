import type { Node } from "../parser";
import type { Token, TokenKind } from "../tokens";

export type { Token, TokenKind };

export const kw = (text: string): Token => ({ kind: "keyword", text });
export const nm = (text: string): Token => ({ kind: "name", text });
export const val = (text: string): Token => ({ kind: "value", text });
export const op = (text: string): Token => ({ kind: "operator", text });
export const cm = (text: string): Token => ({ kind: "comment", text });
export const plain = (text: string): Token => ({ kind: "plain", text });
export const NL: Token = { kind: "plain", text: "\n" };

export function indent(tokens: Token[], prefix = "  "): Token[] {
  if (!tokens.length) return [];
  const out: Token[] = [plain(prefix)];
  for (const tok of tokens) {
    out.push(tok);
    if (tok.text === "\n") out.push(plain(prefix));
  }
  if (out[out.length - 1]?.text === prefix) out.pop();
  return out;
}

export function joinLines(lines: Token[][]): Token[] {
  const nonempty = lines.filter((l) => l.length > 0);
  return nonempty.reduce<Token[]>((acc, line, i) => (i === 0 ? line : [...acc, NL, ...line]), []);
}

export function interleave(arrays: Token[][], sep: Token[]): Token[] {
  return arrays.reduce<Token[]>((acc, arr, i) => (i === 0 ? arr : [...acc, ...sep, ...arr]), []);
}

export function capitalizeFirst(tokens: Token[]): Token[] {
  if (!tokens.length) return tokens;
  const [first, ...rest] = tokens;
  return [{ ...first, text: first.text ? first.text[0].toUpperCase() + first.text.slice(1) : first.text }, ...rest];
}

export function field(node: Node, name: string): Node | null {
  return node.childForFieldName(name);
}

export function namedChildren(node: Node): Node[] {
  // Use .children (not .namedChildren) so "extra" nodes like comments are
  // included — tree-sitter marks comments as extras, which means they appear
  // in .children but are silently dropped from .namedChildren.
  // Note: in this build of web-tree-sitter, isNamed is a method not a getter,
  // so it must be called with () — otherwise the filter always passes.
  return (node.children as Node[]).filter((c) => c && (c.isNamed as unknown as () => boolean)());
}

export function textOf(node: Node | null | undefined): string {
  return node ? node.text : "";
}

export function fallback(node: Node): Token[] {
  const src = node.text.trim();
  return src ? [plain("Run the code: "), val(src)] : [];
}

/**
 * Walk `root`'s named children with `stmtFn`, inserting blank NL tokens
 * so each top-level statement lands on the same line number it occupied
 * in the source.  Pads the end to `totalSourceLines` so the output always
 * has the same height as the input — preventing layout shift during animation.
 */
export function lineAwareBlock(
  root: Node,
  stmtFn: (n: Node) => Token[],
  totalSourceLines: number,
): Token[] {
  const result: Token[] = [];
  let currentLine = 0; // which output line the cursor is currently at (end of last content)

  for (const child of namedChildren(root)) {
    const tokens = stmtFn(child);
    if (!tokens.length) continue;

    const targetLine = child.startPosition.row;

    // How many NLs to insert before this statement
    const padding = Math.max(result.length > 0 ? 1 : 0, targetLine - currentLine);
    for (let i = 0; i < padding; i++) {
      result.push(NL);
      currentLine++;
    }

    result.push(...tokens);
    // Internal NLs within the statement advance the cursor further
    currentLine += tokens.filter((t) => t.text === "\n").length;
  }

  // Pad the tail so output line count == source line count
  while (currentLine < totalSourceLines - 1) {
    result.push(NL);
    currentLine++;
  }

  return result;
}
