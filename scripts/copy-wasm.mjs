import { mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "wasm");
mkdirSync(dest, { recursive: true });

const grammarSrc = join(root, "node_modules", "tree-sitter-wasms", "out");
const grammars = ["python", "javascript", "java", "html", "css", "bash"];
for (const g of grammars) {
  const file = `tree-sitter-${g}.wasm`;
  copyFileSync(join(grammarSrc, file), join(dest, file));
}

const runtimeSrc = join(root, "node_modules", "web-tree-sitter", "tree-sitter.wasm");
copyFileSync(runtimeSrc, join(dest, "tree-sitter.wasm"));

console.log(`Copied ${grammars.length} grammars + runtime to ${dest}`);
