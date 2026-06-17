// attach-brief-file — store the original rubric file(s) on the order (Deno).
//
// The brief intake reads TEXT from an uploaded rubric for the AI, but the admin
// and the expert also need the ORIGINAL file. This endpoint (service role) uploads
// the file to the private order-files bucket and records an order_files row of
// kind 'rubric', tied to the order the brief just created. Works for anonymous
// submissions (no client session) because it runs with the service role.
//
// Abuse is bounded: the file is only ever attached to an order that already exists
// and was created very recently. Payloads are capped well under the platform limit.
//
// Deploy: supabase functions deploy attach-brief-file

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED = new Set([
  "https://primemeridian.academy",
  "https://www.primemeridian.academy",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function cors(origin: string | null) {
  const allow = origin && ALLOWED.has(origin) ? origin : "https://primemeridian.academy";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB decoded ceiling

function safeName(n: string) {
  return (n || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  let body: { ref?: string; order_id?: string; fileName?: string; contentType?: string; dataBase64?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }

  const { ref, order_id, fileName, contentType, dataBase64 } = body;
  if ((!ref && !order_id) || !fileName || !dataBase64) return json(400, { error: "missing_fields" }, CORS);

  // Resolve the order this file belongs to, and only accept recently-created ones.
  const q = db.from("orders").select("id, created_at").limit(1);
  const { data: order } = order_id
    ? await q.eq("id", order_id).single()
    : await q.eq("ref", ref).single();
  if (!order) return json(404, { error: "order_not_found" }, CORS);
  const ageMs = Date.now() - new Date(order.created_at as string).getTime();
  if (ageMs > 1000 * 60 * 60 * 6) return json(403, { error: "order_too_old" }, CORS); // 6h window

  // Decode + size-guard.
  let bytes: Uint8Array;
  try {
    const bin = atob(dataBase64);
    if (bin.length > MAX_BYTES) return json(413, { error: "too_large" }, CORS);
    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return json(400, { error: "bad_base64" }, CORS);
  }

  const path = `${order.id}/rubric-${crypto.randomUUID()}-${safeName(fileName)}`;
  const { error: upErr } = await db.storage.from("order-files").upload(path, bytes, {
    contentType: contentType || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return json(500, { error: upErr.message }, CORS);

  const { error: insErr } = await db.from("order_files").insert({
    order_id: order.id,
    uploaded_by: null,
    file_name: fileName,
    file_path: path,
    kind: "rubric",
    size_bytes: bytes.length,
  });
  if (insErr) return json(500, { error: insErr.message }, CORS);

  return json(200, { ok: true, path }, CORS);
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
