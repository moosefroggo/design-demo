import { NextResponse } from "next/server";
import { convert, LANGUAGES, type Language } from "../../../lib/convert";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  let body: { code?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }

  const code = typeof body.code === "string" ? body.code : "";
  const language = body.language as Language;

  if (!LANGUAGES.includes(language)) {
    return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400, headers: CORS });
  }
  if (!code.trim()) {
    return NextResponse.json({ tokens: [] }, { headers: CORS });
  }

  try {
    const tokens = await convert(code, language);
    return NextResponse.json({ tokens }, { headers: CORS });
  } catch (err) {
    console.error("Conversion error:", err);
    const message =
      err instanceof Error && err.message
        ? err.message
        : typeof err === "string"
          ? err
          : `Conversion failed: ${String(err)}`;
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
