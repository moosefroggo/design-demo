import type { Node } from "../parser";
import { parse } from "../parser";
import {
  field, indent, joinLines, interleave, namedChildren, textOf, fallback,
  capitalizeFirst, kw, nm, val, op, plain, NL, cm, lineAwareBlock, type Token,
} from "./util";

const OPS: Record<string, string> = {
  "===": "is equal to",
  "==": "is equal to",
  "!==": "is not equal to",
  "!=": "is not equal to",
  "<": "is less than",
  ">": "is greater than",
  "<=": "is less than or equal to",
  ">=": "is greater than or equal to",
  "&&": "and",
  "||": "or",
  "!": "not",
  "+": "plus",
  "-": "minus",
  "*": "times",
  "/": "divided by",
  "%": "modulo",
};

function expr(node: Node): Token[] {
  switch (node.type) {
    case "identifier":
    case "property_identifier":
      return [nm(node.text)];
    case "number":
      return [val(node.text)];
    case "string":
    case "template_string":
      return [val(node.text)];
    case "true":
    case "false":
    case "null":
    case "undefined":
      return [val(node.text)];
    case "binary_expression":
    case "logical_expression": {
      const left = field(node, "left");
      const right = field(node, "right");
      const opN = field(node, "operator");
      const word = OPS[opN?.text ?? ""] ?? opN?.text ?? "";
      return [
        ...(left ? expr(left) : [plain("?")]),
        plain(" "), op(word), plain(" "),
        ...(right ? expr(right) : [plain("?")]),
      ];
    }
    case "unary_expression": {
      const arg = field(node, "argument");
      const opN = field(node, "operator");
      return [op(OPS[opN?.text ?? ""] ?? opN?.text ?? ""), plain(" "), ...(arg ? expr(arg) : [])];
    }
    case "call_expression": {
      const fn = field(node, "function");
      const args = field(node, "arguments");
      const argTokens = args ? interleave(namedChildren(args).map(expr), [plain(", ")]) : [];
      const fnText = fn ? fn.text : "";
      if (fnText === "console.log")
        return argTokens.length ? [kw("print "), ...argTokens] : [kw("print "), plain("a blank line")];
      if (fnText === "alert") return [kw("show an alert "), plain("with "), ...argTokens];
      return [kw("call "), nm(fnText), plain(" with "), ...(argTokens.length ? argTokens : [plain("no arguments")])];
    }
    case "member_expression": {
      const obj = field(node, "object");
      const prop = field(node, "property");
      return [plain("the "), nm(textOf(prop)), plain(" of "), ...(obj ? expr(obj) : [plain("?")])];
    }
    case "subscript_expression": {
      const obj = field(node, "object");
      const idx = field(node, "index");
      return [...(obj ? expr(obj) : [plain("?")]), plain(" at position "), ...(idx ? expr(idx) : [plain("?")])];
    }
    case "array":
      return [plain("the list ["), ...interleave(namedChildren(node).map(expr), [plain(", ")]), plain("]")];
    case "object":
      return [plain("the object {"), ...interleave(namedChildren(node).map(expr), [plain(", ")]), plain("}")];
    case "pair": {
      const k = field(node, "key");
      const v = field(node, "value");
      return [...(k ? expr(k) : []), plain(" → "), ...(v ? expr(v) : [])];
    }
    case "parenthesized_expression":
      return interleave(namedChildren(node).map(expr), [plain(" ")]);
    case "arrow_function":
      return arrowFn(node);
    default:
      return [plain(node.text)];
  }
}

function arrowFn(node: Node): Token[] {
  const params = field(node, "parameters") ?? field(node, "parameter");
  const body = field(node, "body");
  const paramList = params ? params.text.replace(/[()]/g, "") : "";
  return [
    plain("a function taking "),
    plain(paramList || "no parameters"),
    plain(" that returns "),
    ...(body ? expr(body) : [plain("?")]),
  ];
}

function statement(node: Node): Token[] {
  switch (node.type) {
    case "expression_statement": {
      const inner = node.namedChild(0);
      if (!inner) return [];
      if (inner.type === "assignment_expression") return statement(inner);
      if (inner.type === "call_expression") return [...capitalizeFirst(expr(inner)), plain(".")];
      return [kw("Evaluate "), ...expr(inner), plain(".")];
    }
    case "lexical_declaration":
    case "variable_declaration":
      return joinLines(
        namedChildren(node).map((decl) => {
          const name = field(decl, "name");
          const value = field(decl, "value");
          return value
            ? [kw("Set "), nm(textOf(name)), plain(" to "), ...expr(value), plain(".")]
            : [kw("Declare "), plain("a variable called "), nm(textOf(name)), plain(".")];
        })
      );
    case "assignment_expression": {
      const left = field(node, "left");
      const right = field(node, "right");
      return [kw("Set "), ...(left ? expr(left) : [plain("?")]), plain(" to "), ...(right ? expr(right) : [plain("?")]), plain(".")];
    }
    case "augmented_assignment_expression": {
      const left = field(node, "left");
      const right = field(node, "right");
      const opN = field(node, "operator");
      const word = OPS[opN?.text.replace("=", "") ?? ""] ?? "by";
      return [kw("Increase "), ...(left ? expr(left) : [plain("?")]), plain(" "), op(word), plain(" "), ...(right ? expr(right) : [plain("?")]), plain(".")];
    }
    case "if_statement": {
      const cond = field(node, "condition");
      const cons = field(node, "consequence");
      const alt = field(node, "alternative");
      const tokens: Token[] = [kw("If "), ...(cond ? expr(cond) : [plain("?")]), plain(", then:")];
      if (cons) { tokens.push(NL); tokens.push(...indent(block(cons))); }
      if (alt) {
        if (alt.type === "else_clause") {
          const inner = alt.namedChild(0);
          if (inner && inner.type === "if_statement") {
            const sub = statement(inner);
            tokens.push(NL, kw("Otherwise"), plain(", "), ...sub.slice(0, 1).map((t) => ({ ...t, text: t.text.toLowerCase() })), ...sub.slice(1));
          } else {
            tokens.push(NL, kw("Otherwise"), plain(":"));
            if (inner) { tokens.push(NL); tokens.push(...indent(block(inner))); }
          }
        }
      }
      return tokens;
    }
    case "for_statement": {
      const init = field(node, "initializer");
      const cond = field(node, "condition");
      const upd = field(node, "increment");
      const body = field(node, "body");
      return [
        kw("For loop "), plain("starting with "), val(init ? init.text : "?"), plain(", while "), val(cond ? cond.text : "?"), plain(", after each step "), val(upd ? upd.text : "?"), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "for_in_statement": {
      const left = field(node, "left");
      const right = field(node, "right");
      const body = field(node, "body");
      return [
        kw("For each "), nm(textOf(left)), plain(" in "), ...(right ? expr(right) : [plain("?")]), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "while_statement": {
      const cond = field(node, "condition");
      const body = field(node, "body");
      return [
        kw("While "), ...(cond ? expr(cond) : [plain("?")]), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "function_declaration": {
      const name = field(node, "name");
      const params = field(node, "parameters");
      const body = field(node, "body");
      const paramList = params ? params.text.replace(/[()]/g, "") : "";
      return [
        kw("Define "), plain("a function called "), nm(textOf(name)), plain(" that takes "), plain(paramList || "no parameters"), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
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
    case "statement_block":
      return block(node);
    default:
      return fallback(node);
  }
}

function block(node: Node): Token[] {
  return joinLines(namedChildren(node).map(statement).filter((t) => t.length > 0));
}

export async function translate(source: string): Promise<Token[]> {
  const tree = await parse(source, "javascript");
  return lineAwareBlock(tree.rootNode, statement, source.split("\n").length);
}
