import type { Node } from "../parser";
import { parse } from "../parser";
import {
  field, indent, joinLines, interleave, namedChildren, textOf, fallback,
  kw, nm, val, cm, plain, NL, lineAwareBlock, type Token,
} from "./util";

const COMMAND_DESCRIPTIONS: Record<string, (args: string[]) => Token[]> = {
  cd: (a) => [kw("Change directory "), plain("to "), val(a[0] ?? "the home directory"), plain(".")],
  ls: (a) => [kw("List "), plain("the contents of "), val(a[0] ?? "the current directory"), plain(".")],
  pwd: () => [kw("Print "), plain("the current working directory.")],
  mkdir: (a) => [kw("Create "), plain("a directory called "), val(a.join(" ")), plain(".")],
  rmdir: (a) => [kw("Remove "), plain("the directory "), val(a.join(" ")), plain(".")],
  rm: (a) => [kw("Remove "), val(a.join(" ")), plain(".")],
  cp: (a) => [kw("Copy "), val(a[0] ?? "?"), plain(" to "), val(a[1] ?? "?"), plain(".")],
  mv: (a) => [kw("Move "), val(a[0] ?? "?"), plain(" to "), val(a[1] ?? "?"), plain(".")],
  touch: (a) => [kw("Create "), plain("an empty file called "), val(a.join(" ")), plain(".")],
  cat: (a) => [kw("Display "), plain("the contents of "), val(a.join(" ")), plain(".")],
  echo: (a) => [kw("Print "), val(`"${a.join(" ")}"`), plain(".")],
  grep: (a) => [kw("Search "), plain("for "), val(a[0] ?? "?"), plain(" in "), val(a.slice(1).join(" ") || "the input"), plain(".")],
  find: (a) => [kw("Find "), plain("files in "), val(a[0] ?? "the current directory"), plain(" matching "), val(a.slice(1).join(" ") || "any pattern"), plain(".")],
  chmod: (a) => [kw("Change "), plain("permissions of "), val(a.slice(1).join(" ")), plain(" to "), val(a[0] ?? "?"), plain(".")],
  chown: (a) => [kw("Change "), plain("owner of "), val(a.slice(1).join(" ")), plain(" to "), val(a[0] ?? "?"), plain(".")],
  curl: (a) => [kw("Fetch "), val(a.join(" ")), plain(" over the network.")],
  wget: (a) => [kw("Download "), val(a.join(" ")), plain(".")],
  ssh: (a) => [kw("Connect "), plain("via SSH to "), val(a.join(" ")), plain(".")],
  git: (a) => [kw("Run git"), plain(": "), val(a.join(" ")), plain(".")],
  npm: (a) => [kw("Run npm"), plain(": "), val(a.join(" ")), plain(".")],
  pip: (a) => [kw("Run pip"), plain(": "), val(a.join(" ")), plain(".")],
  python: (a) => [kw("Run Python "), plain("with "), val(a.join(" ")), plain(".")],
  node: (a) => [kw("Run Node.js "), plain("with "), val(a.join(" ")), plain(".")],
  export: (a) => [kw("Set "), plain("environment variable "), val(a.join(" ")), plain(".")],
};

function describeCommand(node: Node): Token[] {
  const children = namedChildren(node);
  const cmdNode = children.find((c) => c.type === "command_name") ?? children[0];
  const cmd = cmdNode ? cmdNode.text : "";
  const args = children.filter((c) => c !== cmdNode).map((c) => c.text);
  const handler = COMMAND_DESCRIPTIONS[cmd];
  if (handler) return handler(args);
  return [
    plain("Run the command "), nm(cmd),
    ...(args.length ? [plain(" with arguments "), ...interleave(args.map((a) => [val(a)]), [plain(" ")])] : []),
    plain("."),
  ];
}

function statement(node: Node): Token[] {
  switch (node.type) {
    case "command":
      return describeCommand(node);
    case "variable_assignment": {
      const name = field(node, "name");
      const value = field(node, "value");
      return [kw("Set "), plain("the variable "), nm(textOf(name)), plain(" to "), val(textOf(value)), plain(".")];
    }
    case "pipeline": {
      const parts = namedChildren(node).map(statement);
      return interleave(parts, [NL, plain("Then pipe the result into:"), NL]);
    }
    case "redirected_statement": {
      const body = node.namedChild(0);
      const tail = node.text.replace(body?.text ?? "", "").trim();
      return [...(body ? statement(body) : []), plain(` (with redirection: ${tail})`)];
    }
    case "if_statement": {
      const cond = field(node, "condition");
      const tokens: Token[] = [kw("If "), plain(cond ? cond.text.trim() : "?"), plain(", then:")];
      const body: Token[][] = [];
      const elifLines: Token[][] = [];
      const elseLines: Token[][] = [];
      let inElse = false;
      for (const child of namedChildren(node)) {
        if (child === cond) continue;
        if (child.type === "elif_clause") {
          const c = field(child, "condition");
          const header: Token[] = [kw("Otherwise"), plain(", if "), plain(c ? c.text.trim() : "?"), plain(", then:")];
          const subLines = namedChildren(child)
            .filter((sc) => sc !== c)
            .map(statement)
            .filter((t) => t.length > 0);
          elifLines.push(header);
          subLines.forEach((l) => elifLines.push([plain("  "), ...l]));
        } else if (child.type === "else_clause") {
          inElse = true;
          for (const sc of namedChildren(child)) {
            const t = statement(sc);
            if (t.length) elseLines.push(t);
          }
        } else if (!inElse) {
          const t = statement(child);
          if (t.length) body.push(t);
        }
      }
      if (body.length) { tokens.push(NL); tokens.push(...indent(joinLines(body))); }
      if (elifLines.length) { tokens.push(NL); tokens.push(...joinLines(elifLines)); }
      if (elseLines.length) {
        tokens.push(NL, kw("Otherwise"), plain(":"));
        tokens.push(NL); tokens.push(...indent(joinLines(elseLines)));
      }
      return tokens;
    }
    case "for_statement": {
      const variable = field(node, "variable");
      const value = field(node, "value");
      const body = field(node, "body");
      return [
        kw("For each "), nm(textOf(variable)), plain(" in "), val(value ? value.text : "?"), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "while_statement": {
      const cond = field(node, "condition");
      const body = field(node, "body");
      return [
        kw("While "), plain(cond ? cond.text.trim() : "?"), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "function_definition": {
      const name = field(node, "name");
      const body = field(node, "body");
      return [
        kw("Define "), plain("a function called "), nm(textOf(name)), plain(":"),
        ...(body ? [NL, ...indent(block(body))] : []),
      ];
    }
    case "comment":
      return [cm(node.text)];
    default:
      return fallback(node);
  }
}

function block(node: Node): Token[] {
  return joinLines(namedChildren(node).map(statement).filter((t) => t.length > 0));
}

export async function translate(source: string): Promise<Token[]> {
  const tree = await parse(source, "bash");
  return lineAwareBlock(tree.rootNode, statement, source.split("\n").length);
}
