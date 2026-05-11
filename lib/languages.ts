export const LANGUAGES = ["python", "javascript", "java", "html", "css", "html-css-js", "bash"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
  html: "HTML",
  css: "CSS",
  "html-css-js": "HTML + CSS + JS (combined)",
  bash: "Bash / Command line",
};
