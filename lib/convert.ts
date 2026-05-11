import "server-only";
import { translate as python } from "./translators/python";
import { translate as javascript } from "./translators/javascript";
import { translate as java } from "./translators/java";
import { translate as html } from "./translators/html";
import { translate as css } from "./translators/css";
import { translate as bash } from "./translators/bash";
import { translate as htmlCssJs } from "./translators/html-css-js";
import type { Language } from "./languages";
import type { Token } from "./tokens";

export { LANGUAGES, LANGUAGE_LABELS } from "./languages";
export type { Language } from "./languages";
export type { Token } from "./tokens";

const TRANSLATORS: Record<Language, (src: string) => Promise<Token[]>> = {
  python,
  javascript,
  java,
  html,
  css,
  "html-css-js": htmlCssJs,
  bash,
};

export async function convert(source: string, lang: Language): Promise<Token[]> {
  const fn = TRANSLATORS[lang];
  if (!fn) throw new Error(`Unsupported language: ${lang}`);
  return fn(source);
}
