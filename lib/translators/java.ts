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
  "&&": "and",
  "||": "or",
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
    case "decimal_integer_literal":
    case "decimal_floating_point_literal":
      return [val(node.text)];
    case "string_literal":
      return [val(node.text)];
    case "true":
    case "false":
    case "null_literal":
      return [val(node.text)];
    case "binary_expression": {
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
    case "method_invocation": {
      const obj = field(node, "object");
      const name = field(node, "name");
      const args = field(node, "arguments");
      const argTokens = args ? interleave(namedChildren(args).map(expr), [plain(", ")]) : [];
      const rawTarget = obj ? `${textOf(obj)}.${textOf(name)}` : textOf(name);
      if (rawTarget === "System.out.println" || rawTarget === "System.out.print")
        return [kw("print "), ...(argTokens.length ? argTokens : [plain("a blank line")])];
      return [kw("call "), nm(rawTarget), plain(" with "), ...(argTokens.length ? argTokens : [plain("no arguments")])];
    }
    case "field_access": {
      const obj = field(node, "object");
      const name = field(node, "field");
      return [plain("the "), nm(textOf(name)), plain(" of "), ...(obj ? expr(obj) : [plain("?")])];
    }
    case "array_access": {
      const arr = field(node, "array");
      const idx = field(node, "index");
      return [...(arr ? expr(arr) : [plain("?")]), plain(" at position "), ...(idx ? expr(idx) : [plain("?")])];
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
      if (inner.type === "method_invocation") return [...capitalizeFirst(expr(inner)), plain(".")];
      if (inner.type === "assignment_expression") return statement(inner);
      return [kw("Evaluate "), ...expr(inner), plain(".")];
    }
    case "local_variable_declaration":
    case "field_declaration": {
      const type = field(node, "type");
      return joinLines(
        namedChildren(node)
          .filter((c) => c.type === "variable_declarator")
          .map((d) => {
            const name = field(d, "name");
            const value = field(d, "value");
            return value
              ? [kw("Set "), nm(textOf(name)), plain(` (a ${textOf(type)}) to `), ...expr(value), plain(".")]
              : [kw("Declare "), plain(`a ${textOf(type)} called `), nm(textOf(name)), plain(".")];
          })
      );
    }
    case "assignment_expression": {
      const left = field(node, "left");
      const right = field(node, "right");
      return [kw("Set "), ...(left ? expr(left) : [plain("?")]), plain(" to "), ...(right ? expr(right) : [plain("?")]), plain(".")];
    }
    case "if_statement": {
      const cond = field(node, "condition");
      const cons = field(node, "consequence");
      const alt = field(node, "alternative");
      const tokens: Token[] = [kw("If "), ...(cond ? expr(cond) : [plain("?")]), plain(", then:")];
      if (cons) { tokens.push(NL); tokens.push(...indent(block(cons))); }
      if (alt) {
        if (alt.type === "if_statement") {
          const sub = statement(alt);
          tokens.push(NL, kw("Otherwise"), plain(", "), ...sub.slice(0, 1).map((t) => ({ ...t, text: t.text.toLowerCase() })), ...sub.slice(1));
        } else {
          tokens.push(NL, kw("Otherwise"), plain(":"));
          tokens.push(NL); tokens.push(...indent(block(alt)));
        }
      }
      return tokens;
    }
    case "for_statement": {
      const init = field(node, "init");
      const cond = field(node, "condition");
      const upd = field(node, "update");
      const body = field(node, "body");
      return [
        kw("For loop "), plain("starting with "), val(init ? init.text : "?"), plain(", while "), val(cond ? cond.text : "?"), plain(", after each step "), val(upd ? upd.text : "?"), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "enhanced_for_statement": {
      const name = field(node, "name");
      const value = field(node, "value");
      const body = field(node, "body");
      return [
        kw("For each "), nm(textOf(name)), plain(" in "), ...(value ? expr(value) : [plain("?")]), plain(":"),
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
    case "method_declaration": {
      const name = field(node, "name");
      const params = field(node, "parameters");
      const body = field(node, "body");
      const paramList = params ? params.text.replace(/[()]/g, "") : "";
      return [
        kw("Define "), plain("a method called "), nm(textOf(name)), plain(" that takes "), plain(paramList || "no parameters"), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "class_declaration": {
      const name = field(node, "name");
      const body = field(node, "body");
      return [
        kw("Define "), plain("a class called "), nm(textOf(name)), plain(":"),
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
    case "block":
      return block(node);
    case "line_comment":
    case "block_comment":
      return [cm(node.text)];
    case "import_declaration":
      return [kw("Import"), plain(`: ${node.text.replace(/;$/, "")}.`)];
    case "package_declaration":
      return [plain("Belongs to package: "), val(node.text.replace(/^package\s+|;$/g, "")), plain(".")];
    default:
      return fallback(node);
  }
}

function block(node: Node): Token[] {
  return joinLines(namedChildren(node).map(statement).filter((t) => t.length > 0));
}

export async function translate(source: string): Promise<Token[]> {
  const tree = await parse(source, "java");
  return lineAwareBlock(tree.rootNode, statement, source.split("\n").length);
}
