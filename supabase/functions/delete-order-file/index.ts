// delete-order-file — let an expert remove a file they uploaded while the order is
// still editable (experts have no DELETE via RLS, so this runs with the service
// role after verifying ownership + stage). Admins may delete any file, any time.
//
// Deploy: supabase functions deploy delete-order-file

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

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Files can be pulled while the order is still being worked on — not after it's
// submitted for review / delivered (the student & QC may already have them).
const EDITABLE = new Set(["assigned", "writing", "revision"]);

Deno.serve(async (req) => {
  const CORS = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, CORS);

  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json(403, { error: "forbidden" }, CORS);
  const { data: { user } } = await admin.auth.getUser(bearer);
  if (!user) return json(403, { error: "forbidden" }, CORS);

  let body: { file_id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }, CORS); }
  const fileId = (body.file_id ?? "").trim();
  if (!fileId) return json(400, { error: "missing_file_id" }, CORS);

  const { data: f } = await admin.from("order_files")
    .select("id, file_path, uploaded_by, order_id").eq("id", fileId).maybeSingle();
  if (!f) return json(404, { error: "not_found" }, CORS);

  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  // Authorize: admin, or the uploader while the order is still editable.
  if (!isAdmin) {
    if (f.uploaded_by !== user.id) return json(403, { error: "not_owner" }, CORS);
    const { data: ord } = await admin.from("orders").select("status").eq("id", f.order_id).single();
    if (!EDITABLE.has(ord?.status ?? "")) return json(200, { ok: false, error: "locked" }, CORS);
  }

  await admin.storage.from("order-files").remove([f.file_path]);
  await admin.from("order_files").delete().eq("id", f.id);
  return json(200, { ok: true }, CORS);
});

function json(status: number, body: unknown, CORS: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}
