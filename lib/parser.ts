import Parser from "web-tree-sitter";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type LangKey = "python" | "javascript" | "java" | "html" | "css" | "bash";
export type Node = Parser.SyntaxNode;

let parserInitPromise: Promise<void> | null = null;
const languageCache = new Map<LangKey, Parser.Language>();

async function ensureParserInit() {
  if (!parserInitPromise) {
    parserInitPromise = (async () => {
      const runtimePath = join(process.cwd(), "public", "wasm", "tree-sitter.wasm");
      const wasmBinary = await readFile(runtimePath);
      await Parser.init({ wasmBinary });
    })().catch((err) => {
      parserInitPromise = null;
      throw err;
    });
  }
  return parserInitPromise;
}

async function loadLanguage(lang: LangKey): Promise<Parser.Language> {
  const cached = languageCache.get(lang);
  if (cached) return cached;
  const wasmPath = join(process.cwd(), "public", "wasm", `tree-sitter-${lang}.wasm`);
  const bytes = await readFile(wasmPath);
  const language = await Parser.Language.load(new Uint8Array(bytes));
  languageCache.set(lang, language);
  return language;
}

export async function parse(source: string, lang: LangKey): Promise<Parser.Tree> {
  await ensureParserInit();
  const language = await loadLanguage(lang);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser.parse(source);
}
