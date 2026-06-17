// Meridian Concierge — server-side AI proxy (Supabase Edge Function, Deno).
// Keeps the Anthropic key server-side. The browser widget (src/Concierge.jsx)
// POSTs { prompt } (and optional system) and receives { text }.
//
// Deploy:  supabase functions deploy concierge --no-verify-jwt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Hardening: CORS restricted to the marketing origin(s); best-effort per-IP
// rate limit; prompt/system length caps. (Rate limit is in-memory, so it is a
// soft guard that resets on cold start — pair with a CAPTCHA for stronger
// protection if abuse appears.)

const ALLOWED_ORIGINS = new Set([
  "https://primemeridian.academy",
  "https://www.primemeridian.academy",
  "http://localhost:5173",
  "http://localhost:3000",
]);

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 700;
const PROMPT_CAP = 8000;
const SYSTEM_CAP = 6000;

// ── best-effort per-IP rate limit (sliding window, in-memory) ───────────────
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // crude memory guard
  return arr.length > RL_MAX;
}

function corsFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const CORS = corsFor(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, CORS);

  // Reject browser calls from disallowed origins. (Server-to-server callers have
  // no Origin header and are allowed through to the rate limiter.)
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "forbidden_origin" }, 403, CORS);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429, CORS);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "missing_key" }, 500, CORS);

  let body: { prompt?: string; system?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, CORS);
  }

  const prompt = (body.prompt || "").toString().slice(0, PROMPT_CAP);
  if (!prompt.trim()) return json({ error: "empty_prompt" }, 400, CORS);
  const system = body.system ? body.system.toString().slice(0, SYSTEM_CAP) : "";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "upstream", status: res.status, detail }, 502, CORS);
    }

    const data = await res.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim()
      : "";
    return json({ text }, 200, CORS);
  } catch (e) {
    return json({ error: "fetch_failed", detail: String(e) }, 502, CORS);
  }
});

function json(obj: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
