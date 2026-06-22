/* ============================================================
   AdminApp — Ops Console root (ES module, wired to Supabase).
   Role-gated auth + recovery, the existing data hooks, the QC
   drawer, and admin actions. Replaces the legacy AdminApp/Layout.
   ============================================================ */
import React from "react";
import { supabase } from "../../lib/supabase.js";
import "../../portal.css";              // keeps SupportChat-style `.app` rules available if needed
import "../../workspace/kit/theme.css";
import "./admin-theme.css";

import { Icon } from "../../workspace/kit/icons.jsx";
import { Button } from "../../workspace/kit/components.jsx";
import { useOrders } from "../hooks/useOrders.js";
import { useClients } from "../hooks/useClients.js";
import { useWriters } from "../hooks/useWriters.js";
import { useBriefs } from "../hooks/useBriefs.js";
import { useInvoices } from "../hooks/useInvoices.js";
import { AM } from "./admin-model.js";
import { AdSidebar, ADMIN_NAV } from "./shell.jsx";
import { OrderDrawer } from "./drawer.jsx";
import { CmdPalette } from "./cmdk.jsx";
import { AdDashboard, AdOrders, AdBriefs, AdClients, AdWriters, AdSupport, AdBilling, AdEmails, NewOrderModal } from "./pages.jsx";

const { useState, useEffect, useMemo, useRef } = React;
const fmtDate = (ts) => { if (!ts) return null; try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return ts; } };
function mapOrder(o) { return { ...o, title: o.title || o.program || o.scope_label || "Order", due_date: fmtDate(o.due_date), due_at: o.due_date || null, pages: o.pages ?? null }; }

/* ---- Auth surfaces ---------------------------------------- */
const fld = { width: "100%", padding: "13px 15px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--surface)", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" };

function AdAuth({ recovery, onRecovered }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false);
  async function submit() {
    if (recovery) {
      if (pw.length < 6) { setErr("Use at least 6 characters."); return; }
      setErr(""); setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: pw });
      setLoading(false); if (error) { setErr(error.message); return; } onRecovered && onRecovered(); return;
    }
    if (!/.+@.+\..+/.test(email.trim())) { setErr("Enter a valid email."); return; }
    if (!pw) { setErr("Enter your password."); return; }
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
    setLoading(false);
    if (error) setErr(/invalid login/i.test(error.message) ? "That email and password don’t match." : error.message);
  }
  async function forgot() {
    if (!/.+@.+\..+/.test(email.trim())) { setErr("Enter your admin email above first."); return; }
    setErr(""); setLoading(true);
    const { data, error } = await supabase.functions.invoke("send-recovery", { body: { email: email.trim().toLowerCase(), surface: "admin" } });
    setLoading(false);
    if (error) { setErr("Could not send the reset link — please try again."); return; }
    if (data?.sent) setSent(true);
    else if (data?.notAdmin) setErr("That email isn’t registered as an admin account.");
    else setErr("Could not send the reset link — please try again.");
  }
  return (
    <div style={{ height: "100vh", width: "100%", display: "grid", placeItems: "center", background: "var(--paper)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 410, animation: "rise .35s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 24, color: "var(--on-accent)" }}>M</div>
          <div><div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1, whiteSpace: "nowrap" }}>Meridian Studio</div><div className="mono" style={{ color: "var(--accent)", fontSize: 9, marginTop: 4, letterSpacing: ".14em" }}>Ops Console</div></div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 30, boxShadow: "var(--shadow-card)" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px" }}>{recovery ? "Set a new password" : "Admin sign in"}</h1>
          <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "0 0 22px" }}>{recovery ? "Choose a new admin password." : "Authorized operators only."}</p>
          {sent ? (
            <div style={{ background: "var(--st-done-bg)", border: "1px solid var(--st-done-edge)", borderRadius: 12, padding: "16px 18px", color: "var(--st-done)", fontSize: 14, lineHeight: 1.55 }}><b>Check your inbox</b><br />We sent a reset link to {email}.</div>
          ) : (
            <>
              {!recovery && <label style={{ display: "block", marginBottom: 16 }}><span className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>Email</span><input type="email" style={fld} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@…" autoFocus /></label>}
              <label style={{ display: "block", marginBottom: 16 }}><span className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 11, marginBottom: 8 }}>{recovery ? "New password" : "Password"}</span><input type="password" style={fld} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoFocus={recovery} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} /></label>
              {!recovery && <div style={{ textAlign: "right", marginTop: -4, marginBottom: 16 }}><button onClick={forgot} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>Forgot password?</button></div>}
              {err && <div style={{ color: "var(--st-action)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
              <Button full variant="primary" disabled={loading} onClick={submit}>{loading ? "Please wait…" : recovery ? "Update password" : "Sign in"}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdDenied({ onSignOut }) {
  return (
    <div style={{ height: "100vh", width: "100%", display: "grid", placeItems: "center", background: "var(--paper)", padding: 20 }}>
      <div style={{ maxWidth: 420, textAlign: "center", animation: "rise .35s ease both" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "#F6E0DE", color: "#B23B3B", display: "grid", placeItems: "center", margin: "0 auto 22px" }}><Icon name="lock" size={30} /></div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Access denied</h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 24px" }}>This account doesn't have admin access. Only operators with the <b>admin</b> role can open the console.</p>
        <Button variant="ghost" onClick={onSignOut}>Sign out</Button>
      </div>
    </div>
  );
}

/* ---- Console (mounts hooks only when authorized) ---------- */
function AdminConsole({ user, onSignOut }) {
  const { orders: rawOrders, toast, setToast, refetch: refetchOrders } = useOrders();
  const { clients, refetch: refetchClients } = useClients();
  const { writers, refetch: refetchWriters } = useWriters();
  const { briefs, refetch: refetchBriefs } = useBriefs();
  const { invoices, refetch: refetchInvoices } = useInvoices();

  const [route, setRoute] = useState("dashboard");
  const [drawer, setDrawer] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [railed, setRailedState] = useState(() => { try { return localStorage.getItem("meridian:admin:rail") === "1"; } catch { return false; } });
  const setRailed = (v) => { setRailedState(v); try { localStorage.setItem("meridian:admin:rail", v ? "1" : "0"); } catch {} };
  const [notifs, setNotifs] = useState([]);
  const [readIds, setReadIds] = useState(() => new Set());
  const [workSet, setWorkSet] = useState(() => new Set());
  const [applications, setApplications] = useState([]);
  const [supportWaiting, setSupportWaiting] = useState(0);
  const [busy, setBusy] = useState(false);

  const orders = useMemo(() => rawOrders.map((o) => ({ ...mapOrder(o), hasWork: workSet.has(o.id) })), [rawOrders, workSet]);

  // work-file presence for the QC "ready/no files" indicator
  useEffect(() => {
    const ids = rawOrders.map((o) => o.id);
    if (!ids.length) { setWorkSet(new Set()); return; }
    supabase.from("order_files").select("order_id, kind").in("order_id", ids).in("kind", AM.WORK_KINDS)
      .then(({ data }) => setWorkSet(new Set((data || []).map((r) => r.order_id))));
  }, [rawOrders]);

  // applications + support waiting (badges)
  useEffect(() => {
    supabase.from("writer_applications").select("*").neq("status", "onboarded").neq("status", "declined").order("created_at", { ascending: false })
      .then(({ data }) => setApplications(data || [])).catch?.(() => {});
    supabase.from("support_conversations").select("id, status").eq("status", "waiting")
      .then(({ data }) => setSupportWaiting((data || []).length));
  }, []);

  // Briefs badge = only those still awaiting conversion (a brief whose order
  // already exists is "tracked", not pending), so the count isn't inflated by the
  // brief+order pair every submission creates.
  const counts = { orders: orders.filter((o) => o.status === "in_review").length, briefs: briefs.filter((b) => !AM.orderForBrief(b, orders)).length, support: supportWaiting };

  // notifications derived
  const derivedNotifs = useMemo(() => {
    const out = [];
    orders.filter((o) => o.status === "in_review").forEach((o) => out.push({ id: "qc-" + o.id, icon: "shield", tone: "warn", title: "Ready for QC", body: `${o.ref} was submitted for review.`, at: "", route: "orders" }));
    briefs.forEach((b) => out.push({ id: "brief-" + b.id, icon: "doc", tone: "new", title: "New brief", body: `${b.topic || "A brief"} awaiting conversion.`, at: "", route: "briefs" }));
    applications.forEach((a) => out.push({ id: "app-" + a.id, icon: "users", tone: "info", title: "New application", body: `${a.name} applied.`, at: "", route: "writers" }));
    return out;
  }, [orders, briefs, applications]);
  const notifs2 = derivedNotifs.map((n) => readIds.has(n.id) ? { ...n, read: true } : n);
  const setNotifs2 = (items) => setReadIds((prev) => { const s = new Set(prev); items.forEach((i) => { if (i.read) s.add(i.id); }); return s; });

  const notify = (m) => { setToast({ message: m }); setTimeout(() => setToast(null), 2600); };
  const go = (r) => { setRoute(r); const sc = document.querySelector(".mer-scroll"); if (sc) sc.scrollTop = 0; };
  const openDrawer = (o) => setDrawer(o);

  // Global ⌘K / Ctrl+K toggles the command palette (Esc handled in the palette).
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); setCmdkOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const onSaved = (id, patch) => setDrawer((d) => d && d.id === id ? { ...d, ...patch } : d);

  async function convertBrief(b) {
    // Idempotency: a submitted brief already auto-creates its order, so don't make
    // a duplicate. If we can already see that order, just point the admin to it.
    const existing = AM.orderForBrief(b, orders);
    if (existing) { notify(`Order ${existing.ref} already exists for this brief.`); return; }
    setBusy(true);
    try {
      const { data: ref } = await supabase.rpc("generate_order_ref");
      // orders requires NOT-NULL level / level_label / program / scope_id / scope_label.
      const LEVEL_SLUG = { Undergraduate: "undergrad", Graduate: "graduate", Doctoral: "dnp" };
      const SCOPE_SLUG = { "One assignment": "one_assignment", "Full program": "full_program" };
      const slugify = (s) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const bLevelLabel = b.level || b.level_label || "Graduate";
      const bScopeLabel = b.scope || b.scope_label || "One assignment";
      const bProgram = b.discipline || b.program || "—";
      const row = { ref: ref || ("MS-" + Math.floor(10000 + (b.id ? String(b.id).length * 137 : 1) % 89999)),
        program: bProgram,
        level: b.level_id || LEVEL_SLUG[bLevelLabel] || slugify(bLevelLabel) || "graduate",
        level_label: bLevelLabel,
        scope_id: b.scope_id || SCOPE_SLUG[bScopeLabel] || slugify(bScopeLabel) || "one_assignment",
        scope_label: bScopeLabel,
        title: b.title || b.topic || null, discipline: bProgram, pages: b.pages || null,
        citation: b.citation || null, requirements: b.requirements || null,
        status: "brief_received", payment_status: "unpaid", priority: "normal",
        client_email: b.client_email || null, client_name: b.client_name || null, notes: b.topic || b.notes || null };
      const { error } = await supabase.from("orders").insert(row);
      if (error) { console.error(error); notify("Could not convert — please try again."); setBusy(false); return; }
      try { await supabase.from("briefs").delete().eq("id", b.id); } catch (e) { /* leave brief if not deletable */ }
      refetchBriefs();
      notify(`Converted to ${row.ref}`);
    } catch (e) { console.error(e); notify("Could not convert — please try again."); }
    setBusy(false);
  }

  // ── New order — create on behalf of a client and (optionally) assign ───────
  // Mirrors convertBrief's column mapping + the generate_order_ref RPC, plus the
  // extra fields the New Order form collects (client_id, quote, writer, payment).
  // Returns true on success so the modal can close.
  async function createOrder(payload) {
    const { client, title, program, level, scope, value, due, expertId, payment, instructions, spec, attachments } = payload;
    if (!client) { notify("Pick a client for the order"); return false; }
    if (!(title || "").trim()) { notify("Add an order title"); return false; }
    setBusy(true);
    try {
      const { data: ref } = await supabase.rpc("generate_order_ref");
      const orderRef = ref || ("MS-" + Math.floor(10000 + Math.random() * 89999));
      const quoteTotal = Number(value) || 0;
      // orders has NOT-NULL level / level_label / program / scope_id / scope_label
      // (001 schema). The form supplies display labels; map them to the slugs the
      // rest of the system uses, and never pass null into a NOT-NULL column.
      const LEVEL_SLUG = { Undergraduate: "undergrad", Graduate: "graduate", Doctoral: "dnp" };
      const SCOPE_SLUG = { "One assignment": "one_assignment", "Full program": "full_program" };
      const slugify = (s) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const levelLabel = (level || "").trim() || "Graduate";
      const scopeLabel = (scope || "").trim() || "One assignment";
      const programVal = (program || "").trim() || "—";
      const buildRow = (extra) => ({
        ref: orderRef,
        program: programVal,
        level: LEVEL_SLUG[levelLabel] || slugify(levelLabel) || "graduate",
        level_label: levelLabel,
        scope_id: SCOPE_SLUG[scopeLabel] || slugify(scopeLabel) || "one_assignment",
        scope_label: scopeLabel,
        title: title.trim(),
        discipline: programVal,
        pages: null,
        citation: (spec && spec.cite) || null,
        requirements: (spec && spec.summary) || null,
        client_email: client.email || null,
        client_name: client.name || null,
        notes: (instructions || "").trim() || null,
        status: expertId ? "assigned" : "new",
        payment_status: payment || "unpaid",
        priority: "normal",
        ...extra,
      });
      const full = buildRow({ client_id: client.id || null, quote_total: quoteTotal, quote_deposit: Math.round(quoteTotal * 0.5), writer_id: expertId || null });
      let insert = await supabase.from("orders").insert(full).select("id, ref").single();
      // 42703 = undefined_column → retry without the columns this DB may not have
      // (matches convertBrief's column-fallback pattern).
      if (insert.error && insert.error.code === "42703") {
        const fallback = buildRow({});
        insert = await supabase.from("orders").insert(fallback).select("id, ref").single();
      }
      if (insert.error) { console.error(insert.error); notify("Could not create the order — please try again."); setBusy(false); return false; }
      const orderId = insert.data?.id;
      // attachments → order-files bucket + order_files rows (kind 'brief')
      if (orderId && attachments && attachments.length) {
        for (const a of attachments) {
          if (!a.file) continue;   // text-only intake entries carry no File handle
          const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${(a.name || "file").replace(/[^\w.\-]+/g, "_")}`;
          const { error: upErr } = await supabase.storage.from("order-files").upload(path, a.file);
          if (upErr) { console.error(upErr); continue; }
          await supabase.from("order_files").insert({ order_id: orderId, uploaded_by: user.id, file_name: a.name, file_path: path, kind: "brief", size_bytes: a.size_bytes ?? null, version: null });
        }
      }
      await refetchOrders();
      notify(`${insert.data?.ref || orderRef} created for ${client.name || client.email}`);
      setBusy(false);
      return true;
    } catch (e) { console.error(e); notify("Could not create the order — please try again."); setBusy(false); return false; }
  }

  // ── payments: confirm / flag / submit_link / send_welcome (via edge fn) ────
  async function invoiceAction(inv, action, note, extra) {
    setBusy(true);
    try {
      const body = { action, invoice_id: inv?.id, note, ...(extra || {}) };
      const { data, error } = await supabase.functions.invoke("payments", { body });
      if (error) {
        let msg = "Could not update the payment — try again.";
        try { const ctx = await error.context?.json?.(); if (ctx?.message) msg = ctx.message; } catch {}
        notify(msg); setBusy(false); return false;
      }
      const ref = inv?.invoice_number || "";
      notify(
        action === "confirm" ? `Payment confirmed — ${ref}`
        : action === "submit_link" ? `Payment link sent to the client — ${ref}`
        : action === "send_welcome" ? "Welcome email sent."
        : `Flagged ${ref}`);
      refetchInvoices();
      setBusy(false); return true;
    } catch (e) { console.error(e); notify("Could not update the payment — try again."); setBusy(false); return false; }
  }

  async function setClientType(client, type) {
    const { error } = await supabase.from("profiles").update({ client_type: type }).eq("id", client.id);
    if (error) { notify("Could not update the client type."); return; }
    notify(`${client.name || client.email} is now a ${type} client`);
  }

  async function addClient(arg, nameArg) {
    // Back-compat: accept either (email, name) or a single options object.
    const opts = typeof arg === "string" ? { email: arg, name: nameArg } : (arg || {});
    const { email, name, school, program, client_type, sendEmail } = opts;
    try {
      const { data, error } = await supabase.functions.invoke("onboard-client", { body: { email, name, school, program, client_type, sendEmail } });
      if (error || !data?.ok) return { ok: false, error: "Could not add the client." };
      return { ok: true, emailed: data.emailed };
    } catch (e) { console.error(e); return { ok: false, error: "Could not add the client." }; }
  }
  async function onboardExpert({ email, name, specialty, mpesa_number, sendEmail, appId }) {
    if (!email) return { ok: false, error: "No email on file." };
    try {
      const { data, error } = await supabase.functions.invoke("onboard-expert", { body: { email, name, specialty, mpesa_number, sendEmail } });
      if (error) {
        let detail = error.message || "request failed";
        try { const b = await error.context.json(); detail = b.detail || b.error || detail; } catch {}
        return { ok: false, error: "Onboarding failed — " + detail };
      }
      if (!data?.ok) return { ok: false, error: "Onboarding failed — " + (data?.detail || data?.error || "unknown") };
      if (appId) { await supabase.from("writer_applications").update({ status: "onboarded" }).eq("id", appId); setApplications((p) => p.filter((x) => x.id !== appId)); }
      refetchWriters();
      return { ok: true, emailed: data.emailed };
    } catch (e) { console.error(e); return { ok: false, error: "Could not onboard." }; }
  }
  async function appAction(id, status) { await supabase.from("writer_applications").update({ status }).eq("id", id); setApplications((p) => p.filter((x) => x.id !== id)); }
  async function toggleActive(w) { await supabase.from("writers").update({ active: !(w.active !== false) }).eq("id", w.id); refetchWriters(); }
  async function toggleVerified(w) { await supabase.from("writers").update({ mpesa_verified: !w.mpesa_verified }).eq("id", w.id); notify(w.mpesa_verified ? `${w.name}'s M-Pesa un-verified` : `${w.name}'s M-Pesa verified ✓`); refetchWriters(); }
  // Deactivate (reversible) / reactivate / hard-delete a user via the admin-only
  // delete-user edge function. Returns { ok, blocked, info } so the UI can show
  // the active-work block inline.
  async function userAction(userId, role, action, label, ordersMode) {
    try {
      const { error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId, role, action, orders_mode: ordersMode || undefined } });
      if (error) {
        let info = null; try { info = await error.context?.json?.(); } catch {}
        if (info?.error === "active_work") {
          const bits = [info.activeOrders ? `${info.activeOrders} active order${info.activeOrders > 1 ? "s" : ""}` : "", info.openInvoices ? `${info.openInvoices} open invoice${info.openInvoices > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
          notify(`Can't delete ${label} — ${bits}. Reassign / close / settle first.`);
          return { ok: false, blocked: true, info };
        }
        notify("Action failed — please try again.");
        return { ok: false };
      }
      notify(action === "delete" ? `${label} deleted` : action === "deactivate" ? `${label} deactivated` : `${label} reactivated`);
      if (role === "expert") refetchWriters(); else refetchClients();
      return { ok: true };
    } catch (e) { console.error(e); notify("Action failed — please try again."); return { ok: false }; }
  }

  let body;
  if (route === "dashboard") body = <AdDashboard orders={orders} openDrawer={openDrawer} />;
  else if (route === "orders") body = <AdOrders orders={orders} invoices={invoices} clients={clients} writers={writers} openDrawer={openDrawer} onInvoiceAction={invoiceAction} onCreateOrder={createOrder} onNewOrder={() => setShowNewOrder(true)} notify={notify} busy={busy} />;
  else if (route === "briefs") body = <AdBriefs briefs={briefs} orders={orders} onConvert={convertBrief} busy={busy} />;
  else if (route === "clients") body = <AdClients clients={clients} orders={orders} onAddClient={addClient} onSetType={setClientType} onUserAction={userAction} />;
  else if (route === "writers") body = <AdWriters writers={writers} applications={applications} onOnboardExpert={onboardExpert} onAppAction={appAction} onToggleActive={toggleActive} onToggleVerified={toggleVerified} onUserAction={userAction} />;
  else if (route === "support") body = <AdSupport adminName={user?.name || user?.email} orders={orders} openDrawer={openDrawer} />;
  else if (route === "billing") body = <AdBilling orders={orders} />;
  else if (route === "emails") body = <AdEmails notify={notify} />;

  const sideProps = { route, go, counts, adminUser: user, onSignOut, notifs: notifs2, setNotifs: setNotifs2,
    onNewOrder: () => setShowNewOrder(true), openCmd: () => setCmdkOpen(true), railed, setRailed };

  return (
    <div className="mer-root ops-root mer-app" style={{ display: "flex", flexDirection: "row" }}>
      <div className="mer-sidebar-desktop"><AdSidebar {...sideProps} /></div>

      <div className="mer-mobilebar" style={{ display: "none", height: 56, flex: "0 0 56px", background: "var(--roast)", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <button onClick={() => setNavOpen(true)} aria-label="Open menu" style={{ background: "transparent", border: "none", color: "#F1EBDD", display: "inline-flex" }}><Icon name="menu" size={24} /></button>
        <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "#F1EBDD" }}>Ops Console</span>
      </div>
      {navOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1500, display: "flex" }}>
          <div onClick={() => setNavOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(20,16,10,.5)" }} />
          <div style={{ position: "relative", height: "100%", animation: "drawerIn .2s ease both" }}><AdSidebar {...sideProps} onClose={() => setNavOpen(false)} /></div>
        </div>
      )}

      <main className="mer-scroll scroll" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto" }}>
        <div className="mer-content" style={{ padding: "34px 38px 64px", maxWidth: 1240, width: "100%", margin: "0 auto" }}>{body}</div>
      </main>

      <CmdPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} go={go} openDrawer={openDrawer}
        orders={orders} clients={clients} writers={writers} notify={notify} />

      {showNewOrder && <NewOrderModal clients={clients || []} writers={writers || []} orders={orders}
        onCreate={createOrder} onClose={() => setShowNewOrder(false)} notify={notify} />}

      {drawer && <OrderDrawer o={drawer} writers={writers} user={user} profile={user}
        invoice={invoices.find((i) => i.order_id === drawer.id) || null}
        clientType={(clients.find((c) => c.id === drawer.client_id) || {}).client_type || "general"}
        onInvoiceAction={invoiceAction}
        onSaved={onSaved} onClose={() => setDrawer(null)} notify={notify} />}

      {toast && (
        <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", background: "var(--roast)", color: "#F1EBDD", padding: "13px 20px", borderRadius: 999, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 10, zIndex: 4000, boxShadow: "var(--shadow-pop)", animation: "rise .25s ease both" }}>
          <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--accent)", display: "grid", placeItems: "center" }}><Icon name="check" size={14} stroke={2.5} /></span>{toast.message}
        </div>
      )}
    </div>
  );
}

/* ---- Root auth gate --------------------------------------- */
export default function AdminApp() {
  const params = useMemo(() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } }, []);
  const recoveryRequested = useMemo(() => { try { return params.get("type") === "recovery"; } catch { return false; } }, [params]);
  const recoveryHandledRef = useRef(false);
  const [state, setState] = useState("loading"); // loading | signin | denied | ready | recovery
  const [user, setUser] = useState(null);

  useEffect(() => { document.title = "Meridian Studio — Admin"; }, []);
  useEffect(() => {
    const timeout = setTimeout(() => setState((s) => s === "loading" ? "signin" : s), 6000);
    checkSession().finally(() => clearTimeout(timeout));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === "PASSWORD_RECOVERY" || (session && recoveryRequested && !recoveryHandledRef.current)) { setState("recovery"); return; }
      if (session) checkSession(); else setState("signin");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState("signin"); return; }
      if (recoveryRequested && !recoveryHandledRef.current) { setState("recovery"); return; }
      const { data: profile, error } = await supabase.from("profiles").select("role, name, email").eq("id", session.user.id).single();
      if (error) { setState("denied"); return; }
      if (profile?.role === "admin") { setUser({ ...session.user, ...profile }); setState("ready"); }
      else setState("denied");
    } catch (e) { console.error(e); setState("signin"); }
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); setState("signin"); }

  if (state === "loading") return <div className="mer-root ops-root" style={{ display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>Loading…</div>;
  if (state === "recovery") return <div className="mer-root ops-root"><AdAuth recovery onRecovered={() => { recoveryHandledRef.current = true; try { window.history.replaceState({}, "", "/admin"); } catch {} checkSession(); }} /></div>;
  if (state === "signin") return <div className="mer-root ops-root"><AdAuth /></div>;
  if (state === "denied") return <div className="mer-root ops-root"><AdDenied onSignOut={signOut} /></div>;
  return <AdminConsole user={user} onSignOut={signOut} />;
}
