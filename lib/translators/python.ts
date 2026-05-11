import type { Node } from "../parser";
import { parse } from "../parser";
import {
  field, indent, joinLines, interleave, namedChildren, textOf, fallback,
  capitalizeFirst, kw, nm, val, op, cm, plain, NL, lineAwareBlock, type Token,
} from "./util";

const OPS: Record<string, string> = {
  "==": "is equal to",
  "!=": "is not equal to",
  "<": "is less than",
  ">": "is greater than",
  "<=": "is less than or equal to",
  ">=": "is greater than or equal to",
  and: "and",
  or: "or",
  not: "not",
  "+": "plus",
  "-": "minus",
  "*": "times",
  "/": "divided by",
  "%": "modulo",
};

function expr(node: Node): Token[] {
  switch (node.type) {
    case "identifier":
      return [nm(node.text)];
    case "integer":
    case "float":
      return [val(node.text)];
    case "true":
    case "false":
    case "none":
      return [val(node.text)];
    case "string":
      return [val(node.text)];
    case "binary_operator":
    case "comparison_operator":
    case "boolean_operator": {
      const opNode =
        field(node, "operator") ??
        node.children.find((c) => c && !c.isNamed()) ??
        null;
      const opText = opNode ? opNode.text : "";
      const opWord = OPS[opText] ?? opText;
      const parts = namedChildren(node).map(expr);
      return interleave(parts, [plain(" "), op(opWord), plain(" ")]);
    }
    case "unary_operator": {
      const arg = field(node, "argument");
      const opN = field(node, "operator");
      return [op(OPS[opN?.text ?? ""] ?? opN?.text ?? ""), plain(" "), ...(arg ? expr(arg) : [])];
    }
    case "call": {
      const fn = field(node, "function");
      const args = field(node, "arguments");
      const argTokens = args ? interleave(namedChildren(args).map(expr), [plain(", ")]) : [];
      const fnText = fn ? fn.text : "";
      if (fnText === "print")
        return argTokens.length ? [kw("print "), ...argTokens] : [kw("print "), plain("a blank line")];
      if (fnText === "input")
        return [kw("read user input"), ...(argTokens.length ? [plain(" after prompting with "), ...argTokens] : [])];
      if (fnText === "len") return [plain("the length of "), ...argTokens];
      if (fnText === "range") return [plain("the numbers in the range "), ...argTokens];
      return [kw("call "), nm(fnText), plain(" with "), ...(argTokens.length ? argTokens : [plain("no arguments")])];
    }
    case "attribute": {
      const obj = field(node, "object");
      const attr = field(node, "attribute");
      return [plain("the "), nm(textOf(attr)), plain(" of "), ...(obj ? expr(obj) : [plain("?")])];
    }
    case "subscript": {
      const value = field(node, "value");
      const sub = field(node, "subscript");
      return [...(value ? expr(value) : [plain("?")]), plain(" at position "), ...(sub ? expr(sub) : [plain("?")])];
    }
    case "list":
      return [plain("the list ["), ...interleave(namedChildren(node).map(expr), [plain(", ")]), plain("]")];
    case "dictionary":
      return [plain("the dictionary {"), ...interleave(namedChildren(node).map(expr), [plain(", ")]), plain("}")];
    case "pair": {
      const k = field(node, "key");
      const v = field(node, "value");
      return [...(k ? expr(k) : []), plain(" → "), ...(v ? expr(v) : [])];
    }
    case "parenthesized_expression":
      return interleave(namedChildren(node).map(expr), [plain(" ")]);
    default:
      return [plain(node.text)];
  }
}

function statement(node: Node): Token[] {
  switch (node.type) {
    case "expression_statement": {
      const inner = node.namedChild(0);
      if (!inner) return [];
      if (inner.type === "assignment") return statement(inner);
      if (inner.type === "call") return [...capitalizeFirst(expr(inner)), plain(".")];
      return [kw("Evaluate "), ...expr(inner), plain(".")];
    }
    case "assignment": {
      const left = field(node, "left");
      const right = field(node, "right");
      return [kw("Set "), ...(left ? expr(left) : [plain("?")]), plain(" to "), ...(right ? expr(right) : [plain("?")]), plain(".")];
    }
    case "augmented_assignment": {
      const left = field(node, "left");
      const right = field(node, "right");
      const opN = field(node, "operator");
      const word = OPS[opN?.text.replace("=", "") ?? ""] ?? "by";
      return [kw("Increase "), ...(left ? expr(left) : [plain("?")]), plain(" "), op(word), plain(" "), ...(right ? expr(right) : [plain("?")]), plain(".")];
    }
    case "if_statement": {
      const cond = field(node, "condition");
      const cons = field(node, "consequence");
      const tokens: Token[] = [kw("If "), ...(cond ? expr(cond) : [plain("?")]), plain(", then:")];
      if (cons) { tokens.push(NL); tokens.push(...indent(blockWithLeadingComments(node, cons))); }
      for (const alt of node.children) {
        if (!alt) continue;
        if (alt.type === "elif_clause") {
          const c = field(alt, "condition");
          const b = field(alt, "consequence");
          tokens.push(NL, kw("Otherwise"), plain(", if "), ...(c ? expr(c) : [plain("?")]), plain(", then:"));
          if (b) { tokens.push(NL); tokens.push(...indent(blockWithLeadingComments(alt, b))); }
        } else if (alt.type === "else_clause") {
          const b = field(alt, "body");
          tokens.push(NL, kw("Otherwise"), plain(":"));
          if (b) { tokens.push(NL); tokens.push(...indent(blockWithLeadingComments(alt, b))); }
        }
      }
      return tokens;
    }
    case "for_statement": {
      const left = field(node, "left");
      const right = field(node, "right");
      const body = field(node, "body");
      return [
        kw("For each "), ...(left ? expr(left) : [plain("?")]), plain(" in "), ...(right ? expr(right) : [plain("?")]), plain(":"),
        ...(body ? [NL, ...indent(blockWithLeadingComments(node, body))] : []),
      ];
    }
    case "while_statement": {
      const cond = field(node, "condition");
      const body = field(node, "body");
      return [
        kw("While "), ...(cond ? expr(cond) : [plain("?")]), plain(":"),
        ...(body ? [NL, ...indent(blockWithLeadingComments(node, body))] : []),
      ];
    }
    case "function_definition": {
      const name = field(node, "name");
      const params = field(node, "parameters");
      const body = field(node, "body");
      const paramList = params ? namedChildren(params).map(textOf).join(", ") : "";
      return [
        kw("Define "), plain("a function called "), nm(textOf(name)), plain(" that takes "), plain(paramList || "no parameters"), plain(":"),
        ...(body ? [NL, ...indent(blockWithLeadingComments(node, body))] : []),
      ];
    }
    case "return_statement": {
      const child = node.namedChild(0);
      return child ? [kw("Return "), ...expr(child), plain(".")] : [kw("Return"), plain(".")];
    }
    case "break_statement":
      return [kw("Stop "), plain("the current loop.")];
    case "continue_statement":
      return [kw("Skip "), plain("to the next iteration of the loop.")];
    case "comment":
      return [cm(node.text)];
    case "import_statement":
    case "import_from_statement":
      return [kw("Import"), plain(`: ${node.text}.`)];
    default:
      return fallback(node);
  }
}

function block(node: Node): Token[] {
  return joinLines(namedChildren(node).map(statement).filter((t) => t.length > 0));
}

/**
 * tree-sitter (Python) attaches the first comment inside a block to the
 * *parent* node (function_definition, if_statement, etc.) rather than to
 * the block child.  This helper gathers those leading comments from
 * `parent` and merges them with the block's own children so nothing is lost.
 */
function blockWithLeadingComments(parent: Node, body: Node | null): Token[] {
  const leading = namedChildren(parent)
    .filter((c) => c.type === "comment")
    .map((c) => [cm(c.text)] as Token[]);
  const bodyLines = body
    ? namedChildren(body).map(statement).filter((t) => t.length > 0)
    : [];
  return joinLines([...leading, ...bodyLines]);
}

export async function translate(source: string): Promise<Token[]> {
  const tree = await parse(source, "python");
  return lineAwareBlock(tree.rootNode, statement, source.split("\n").length);
}
