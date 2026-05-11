export type TokenKind = "keyword" | "name" | "value" | "operator" | "comment" | "plain";
export type Token = { kind: TokenKind; text: string };
