/* ============================================================
   PortalApp — client workspace root (ES module, wired to Supabase).
   Auth gate + recovery, live orders/messages, brief + support hooks.
   Replaces the legacy monolithic PortalApp.
   ============================================================ */
import React from "react";
import { supabase } from "../lib/supabase.js";
import { BriefFlow } from "../HomePage.jsx";
import SupportChat from "../SupportChat.jsx";
import Concierge from "../Concierge.jsx";
import "../portal.css";        // keeps SupportChat's `.app`-scoped styles available
import "./kit/theme.css";

import { Icon } from "./kit/icons.jsx";
import { MM } from "./kit/model.js";
import { Avatar, Button } from "./kit/components.jsx";
import { Sidebar } from "./nav.jsx";
import {
  OrdersTabs, OrdersPanel, ClientDashboard,
  EmptyState, DashboardSkeleton, ErrorState, greeting,
} from "./dashboard.jsx";
import { InvoiceView, PaymentMethodModal } from "./billing.jsx";
import { OrderDetail } from "./orderDetail.jsx";
import { Messages } from "./messages.jsx";
import { AuthScreen } from "./auth.jsx";

const { useState, useEffect, useMemo, useRef } = React;

/* ---- helpers ---------------------------------------------- */
const fmtDate = (ts) => { if (!ts) return null; try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return ts; } };
const fmtMsgTime = (ts) => { try { const d = new Date(ts), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; } };
const initialsOf = (name, email) => { if (name) return name.replace(/^Dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase(); return (email?.[0] || "?").toUpperCase(); };
// Never greet the user with a raw email address. Accounts created without a name
// default profiles.name to the email — fall back to a tidied email local part.
const friendlyName = (name, email) => {
  const n = (name || "").trim();
  if (n && !n.includes("@")) return n;
  const local = ((email || n).split("@")[0] || "").replace(/[._-]+/g, " ").trim();
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
};

const orderEstimate = (o) => o.estimate_usd ?? o.quote_total ?? 0;
const orderDeposit = (o) => o.deposit_usd ?? o.quote_deposit ?? 0;

function mapOrder(o) {
  const quote_total = o.quote_total ?? orderEstimate(o) ?? 0;
  const quote_deposit = o.quote_deposit ?? orderDeposit(o) ?? 0;
  return {
    ...o,
    title: o.title || o.program || o.scope_label || "Order",
    scope: o.scope_label || o.scope_id || "—",
    level: o.level_label || o.level || "—",
    due_at: o.due_date,             // raw — keeps relative-day math + sorting honest
    due_date: fmtDate(o.due_date),
    payment_status: o.payment_status || "unpaid",
    writer: o.writer || (o.writer_name ? { name: o.writer_name } : null),
    quote_total, quote_deposit,
    estimate_usd: orderEstimate(o),
    unread: 0, words: null, pages: null,
  };
}

const SEEN_KEY = "ms_seen";
const loadSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { return {}; } };
const saveSeen = (m) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch {} };

/* ---- Toast ------------------------------------------------- */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "var(--roast)", color: "#F1EBDD", padding: "13px 20px", borderRadius: 999,
      fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 10, zIndex: 3000,
      boxShadow: "var(--shadow-pop)", animation: "rise .25s ease both" }}>
      <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--st-done)", display: "grid", placeItems: "center" }}>
        <Icon name="check" size={14} stroke={2.5} /></span>
      {msg}
    </div>
  );
}

/* ---- Dashboard header — one state-aware sentence ----------- */
function DashHeader({ stats, name }) {
  const sub = stats.action > 0
    ? `${stats.action} item${stats.action > 1 ? "s" : ""} below need${stats.action > 1 ? "" : "s"} you.`
    : (stats.progress + stats.revision) > 0
      ? "Everything's moving — nothing needed from you right now."
      : stats.done > 0 ? "All work delivered." : "Welcome to your workspace.";
  return (
    <div style={{ marginBottom: 26 }}>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(34px, 4vw, 46px)", fontWeight: 500,
        letterSpacing: "-0.025em", margin: 0, lineHeight: 1.04 }}>
        {greeting()}{name ? ", " : ""}<span className="italic" style={{ color: "var(--accent)" }}>{name ? name.split(" ")[0] + "." : ""}</span>
      </h1>
      <p style={{ fontSize: 15.5, color: "var(--ink-2)", margin: "12px 0 0" }}>{sub}</p>
    </div>
  );
}

/* ---- Intake hero — Descript-style, sits at the top of orders -- */
function DashHero({ onStart, compact }) {
  const [hover, setHover] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [text, setText] = React.useState("");
  const fileRef = React.useRef(null);
  const start = () => onStart(text);
  const active = focus || hover || drag;
  return (
    <section className="mer-hero" style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r-lg)",
      border: "1px solid var(--line)", background: "linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 46%, var(--surface-2) 100%)",
      padding: compact ? "16px 18px" : "30px 28px 26px", marginBottom: compact ? 22 : 30,
      textAlign: compact ? "left" : "center", boxShadow: "var(--shadow-card)" }}>
      {compact ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", flex: "0 0 28px" }}><Icon name="sparkle" size={15} /></span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>What do you need help with?</span>
        </div>
      ) : (
        <>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center" }}><Icon name="sparkle" size={18} /></span>
          </div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 500,
            letterSpacing: "-0.02em", margin: "0 0 18px", color: "var(--ink)" }}>What do you need help with?</h2>
        </>
      )}
      <div className="mer-hero-input"
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onStart(f); }}
        style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: compact ? "none" : 640, margin: compact ? 0 : "0 auto 16px",
          background: drag ? "var(--accent-soft)" : "var(--surface)", border: `1px solid ${active ? "var(--accent)" : "var(--line-2)"}`,
          borderRadius: 14, padding: "8px 8px 8px 16px", textAlign: "left",
          boxShadow: active ? "var(--shadow-pop)" : "var(--shadow-card)", transition: "all .15s" }}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf" multiple style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onStart(f); e.target.value = ""; }} />
        <button type="button" onClick={() => fileRef.current && fileRef.current.click()} title="Upload a rubric or assignment file" aria-label="Upload a file"
          style={{ background: "transparent", border: "none", padding: 0, display: "inline-flex", cursor: "pointer", flex: "0 0 auto" }}>
          <Icon name="paperclip" size={17} style={{ color: drag ? "var(--accent)" : "var(--muted)" }} />
        </button>
        <input className="mer-hero-ph" value={text} onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          onKeyDown={(e) => { if (e.key === "Enter") start(); }}
          placeholder={drag ? "Drop your rubric to begin…" : "Describe your assignment, or drop a rubric here…"}
          aria-label="Describe your assignment"
          style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: "var(--ink)", background: "transparent",
            border: "none", outline: "none", fontFamily: "var(--sans)", padding: "6px 0" }} />
        <span style={{ flex: "0 0 auto" }}><Button size="sm" variant="primary" iconRight="right" onClick={start}>Get started</Button></span>
      </div>
      {compact && (
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>
          Our AI drafts your brief from a rubric or a sentence — you review and approve before anything is sent.
        </div>
      )}
    </section>
  );
}

/* ---- Profile — editable name, contact, password, prefs ----- */
function Profile({ user, profile, stats, totalOrders, onSignOut, go, onProfileSaved, notify }) {
  const email = profile?.email || user?.email || "";
  const [name, setName] = React.useState(profile?.name || "");
  const [phone, setPhone] = React.useState(profile?.phone || "");
  const [saving, setSaving] = React.useState(false);
  const [pwBusy, setPwBusy] = React.useState(false);
  const [marketing, setMarketing] = React.useState(profile?.email_prefs?.marketing !== false);
  React.useEffect(() => { setName(profile?.name || ""); setPhone(profile?.phone || ""); setMarketing(profile?.email_prefs?.marketing !== false); }, [profile?.id]);
  const dirty = name.trim() !== (profile?.name || "") || phone.trim() !== (profile?.phone || "") || marketing !== (profile?.email_prefs?.marketing !== false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: name.trim() || null, phone: phone.trim() || null,
      email_prefs: { ...(profile?.email_prefs || {}), marketing },
    }).eq("id", user.id);
    setSaving(false);
    if (error) { notify && notify("Could not save — please try again."); return; }
    onProfileSaved && onProfileSaved({ name: name.trim() || null, phone: phone.trim() || null, email_prefs: { ...(profile?.email_prefs || {}), marketing } });
    notify && notify("Profile updated.");
  }
  async function changePassword() {
    setPwBusy(true);
    try { await supabase.functions.invoke("send-recovery", { body: { email, surface: "client" } }); } catch {}
    setPwBusy(false);
    notify && notify("We've emailed you a secure link to set a new password.");
  }

  const field = (label, value, set, type = "text", placeholder = "") => (
    <label style={{ display: "block" }}>
      <span className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 10.5, marginBottom: 7 }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)}
        style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--surface)",
          fontFamily: "var(--sans)", fontSize: 14.5, color: "var(--ink)", outline: "none" }} />
    </label>
  );

  return (
    <div style={{ maxWidth: 680, animation: "rise .3s ease both" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 24px" }}>Profile</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 18, background: "var(--surface)",
        border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 22, marginBottom: 18 }}>
        <Avatar initials={initialsOf(name || profile?.name, email)} size={60} tone="accent" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600 }}>{name || friendlyName(profile?.name, email)}</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{email}</div>
        </div>
      </div>

      {/* details */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, margin: "0 0 16px" }}>Your details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="mer-prof-grid">
          {field("Name", name, setName, "text", "Your name")}
          {field("WhatsApp / phone", phone, setPhone, "tel", "+1 555 123 4567")}
        </div>
        <label style={{ display: "block", marginTop: 14 }}>
          <span className="mono" style={{ display: "block", color: "var(--ink-2)", fontSize: 10.5, marginBottom: 7 }}>Email</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--muted)", fontSize: 14 }}>
            <Icon name="lock" size={14} /> {email}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12 }}>Contact support to change</span>
          </div>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer", fontSize: 14, color: "var(--ink)" }}>
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          Send me occasional product updates and tips
        </label>
        <div style={{ marginTop: 18 }}>
          <Button variant="primary" icon="check" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>

      {/* security + account */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
        <button onClick={changePassword} disabled={pwBusy} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 20px",
          background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: "var(--ink)", fontWeight: 500, textAlign: "left" }}>
          <Icon name="lock" size={17} style={{ color: "var(--muted)" }} /> Change password
          <span style={{ flex: 1 }} /><span style={{ fontSize: 12.5, color: "var(--muted)" }}>{pwBusy ? "Sending…" : "Emails a secure link"}</span>
        </button>
        <button onClick={() => go("support")} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 20px",
          background: "transparent", border: "none", borderTop: "1px solid var(--line)", cursor: "pointer", fontSize: 15, color: "var(--ink)", fontWeight: 500, textAlign: "left" }}>
          <Icon name="chat" size={17} style={{ color: "var(--muted)" }} /> Contact support
          <span style={{ flex: 1 }} /><Icon name="chevR" size={17} style={{ color: "var(--faint)" }} />
        </button>
        <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 20px",
          background: "transparent", border: "none", borderTop: "1px solid var(--line)", cursor: "pointer", fontSize: 15, color: "var(--accent)", fontWeight: 500, textAlign: "left" }}>
          <Icon name="logout" size={17} /> Sign out<span style={{ flex: 1 }} />
        </button>
      </div>
    </div>
  );
}

/* ---- App --------------------------------------------------- */
export default function PortalApp() {
  const params = useMemo(() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } }, []);

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  const [route, setRoute] = useState("dashboard");
  const [ordersTab, setOrdersTab] = useState("action");    // action | progress | done
  const [order, setOrder] = useState(null);
  const [orderIntent, setOrderIntent] = useState(null);   // 'invoice' | 'files' | null
  const [msgInitial, setMsgInitial] = useState(null);
  const [toast, setToast] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefPrefill, setBriefPrefill] = useState(null);
  const [packages, setPackages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [methodModal, setMethodModal] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [density, setDensity] = useState(() => { try { return localStorage.getItem("ms_density") || "comfy"; } catch { return "comfy"; } });
  const setDensityPref = (d) => { setDensity(d); try { localStorage.setItem("ms_density", d); } catch {} };
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("ms_sidebar_collapsed") === "1"; } catch { return false; } });
  const setCollapsedPref = (v) => { setCollapsed(v); try { localStorage.setItem("ms_sidebar_collapsed", v ? "1" : "0"); } catch {} };
  const toastTimer = useRef();

  // recovery (PKCE marker fallback + event)
  const recoveryRequested = useMemo(() => { try { return params.get("type") === "recovery"; } catch { return false; } }, [params]);
  const recoveryHandledRef = useRef(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => { document.title = "My Orders — Meridian Studio"; }, []);

  // auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && recoveryRequested && !recoveryHandledRef.current)) setRecovery(true);
      setUser(session?.user ?? null); setAuthChecked(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthChecked(true); });
    return () => subscription.unsubscribe();
  }, []);

  // load profile + orders when user changes (+ orders realtime)
  const claimedRef = useRef(false);
  useEffect(() => {
    if (!user) { setProfile(null); setOrders([]); setLastMessages({}); claimedRef.current = false; return; }
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
    reload();
    // An admin edit (assigning a writer, issuing an invoice) fires several
    // postgres_changes events in a burst; debounce them into a single refetch so
    // realtime doesn't trigger a reload storm with overlapping responses.
    let t = null;
    const bump = () => { clearTimeout(t); t = setTimeout(() => reload(), 400); };
    const ch = supabase.channel("ws-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, bump)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [user?.id]);

  async function reload() {
    if (!user) return;
    setOrdersLoading(true); setOrdersError(false);
    // Link any orders placed with this email before sign-in. This only matters
    // ONCE per session — running it on every realtime refetch was a needless
    // write on each admin edit. supabase-js returns { error } (it does NOT throw
    // on an RPC error), so capture it and retry once; only stop retrying once it
    // actually succeeds, so a transient failure re-attempts on the next refetch.
    if (!claimedRef.current) {
      let claimErr = null;
      try { ({ error: claimErr } = await supabase.rpc("claim_my_orders")); } catch (e) { claimErr = e; }
      if (claimErr) { try { ({ error: claimErr } = await supabase.rpc("claim_my_orders")); } catch (e) { claimErr = e; } }
      if (!claimErr) claimedRef.current = true;
    }
    const { data, error } = await supabase
      .from("orders")
      .select("id, ref, title, program, scope_id, scope_label, level, level_label, has_project, is_bundle, rate_writing, rate_project, estimate_usd, deposit_usd, quote_total, quote_deposit, priority, client_name, client_email, due_date, status, payment_status, created_at, writer_id, notes, writer:writers!orders_writer_id_fkey(id, name, specialty)")
      .order("created_at", { ascending: false });
    if (error) { console.error("loadOrders", error); setOrdersError(true); setOrdersLoading(false); return; }
    const mapped = (data || []).map(mapOrder);
    const msgMap = await loadMessages(mapped, user.id);
    mapped.forEach((o) => { o.unread = msgMap[o.id]?.unread || 0; });
    setLastMessages(msgMap); setOrders(mapped); setOrdersLoading(false);
    loadPackages(mapped);
    // invoices (general clients) — drives card CTAs, the invoice page, and the cap
    try {
      const { data: inv } = await supabase.from("invoices").select("*").eq("client_id", user.id);
      setInvoices(inv || []);
    } catch { setInvoices([]); }
  }

  // "Ready for you" — ONE card per released order: its latest delivered package.
  // Fresh = delivered within 14 days OR not yet opened/downloaded (ms_files_seen).
  const FILES_SEEN_KEY = "ms_files_seen";
  const loadFilesSeen = () => { try { return JSON.parse(localStorage.getItem(FILES_SEEN_KEY) || "{}"); } catch { return {}; } };
  const markFilesSeen = (orderId) => { try { const m = loadFilesSeen(); m[orderId] = new Date().toISOString(); localStorage.setItem(FILES_SEEN_KEY, JSON.stringify(m)); } catch {} };
  const KIND_LABEL = { final: "Final document", ai_report: "AI-use report", plag_report: "Originality report", originality_report: "Originality report" };
  async function loadPackages(list) {
    try {
      const released = list.filter((o) => MM.filesVisible(o));
      if (!released.length) { setPackages([]); return; }
      const byId = Object.fromEntries(released.map((o) => [o.id, o]));
      const { data } = await supabase.from("order_files")
        .select("id, order_id, file_name, file_path, kind, version, created_at")
        .in("order_id", released.map((o) => o.id))
        .in("kind", MM.SUBMISSION_KINDS)
        .order("created_at", { ascending: false });
      const seen = loadFilesSeen();
      const out = [];
      for (const o of released) {
        const files = (data || []).filter((f) => f.order_id === o.id);
        if (!files.length) continue;
        const { submissions } = MM.buildFileView(files);
        const latest = submissions[0];
        if (!latest || !latest.files.length) continue;
        const deliveredRaw = latest.files[0].created_at;
        const fresh = (Date.now() - new Date(deliveredRaw).getTime()) < 14 * 86400000;
        const unseen = !seen[o.id] || new Date(deliveredRaw) > new Date(seen[o.id]);
        if (!fresh && !unseen) continue;
        const kinds = [...new Set(latest.files.map((f) => KIND_LABEL[f.kind]).filter(Boolean))];
        out.push({
          order: o,
          finalFile: latest.files.find((f) => f.kind === "final") || latest.files[0],
          version: latest.version || 1,
          deliveredAt: fmtDate(deliveredRaw),
          contents: kinds.join(" · "),
        });
      }
      setPackages(out.slice(0, 4));
    } catch { setPackages([]); }
  }

  // real download — signed URL, marks the package as seen
  async function downloadFile(f) {
    if (!f || !f.file_path) { notify("Preparing your download…"); return; }
    const { data } = await supabase.storage.from("order-files").createSignedUrl(f.file_path, 120);
    if (data?.signedUrl) { window.open(data.signedUrl, "_blank", "noopener"); markFilesSeen(f.order_id); }
    else notify("Could not start the download — try again.");
  }

  async function loadMessages(list, uid) {
    const ids = list.map((o) => o.id);
    if (!ids.length) return {};
    const { data } = await supabase.from("order_messages")
      .select("order_id, sender_id, sender_name, body, created_at")
      .in("order_id", ids).eq("is_internal", false)
      .order("created_at", { ascending: true });
    const seen = loadSeen();
    const map = {};
    (data || []).forEach((r) => {
      const m = map[r.order_id] || { unread: 0 };
      m.from = r.sender_id === uid ? "me" : "them";
      m.body = r.body; m.ts = fmtMsgTime(r.created_at);
      if (r.sender_id !== uid && (!seen[r.order_id] || new Date(r.created_at) > new Date(seen[r.order_id]))) m.unread = (m.unread || 0) + 1;
      map[r.order_id] = m;
    });
    return map;
  }

  // attach each order's invoice + the client type so cards/copy are state-aware
  const clientType = profile?.client_type || "general";
  const ordersView = useMemo(() => {
    const byOrder = Object.fromEntries(invoices.map((i) => [i.order_id, i]));
    return orders.map((o) => ({ ...o, invoice: byOrder[o.id] || null, client_type: clientType }));
  }, [orders, invoices, clientType]);
  const openInvoices = useMemo(() => invoices.filter((i) => MM.OPEN_INVOICE_STATES.includes(i.status)), [invoices]);
  const capReached = clientType === "general" && openInvoices.length >= 3;

  const stats = useMemo(() => {
    const activeDue = orders
      .filter((o) => !MM.isReleased(o) && o.due_at)
      .map((o) => new Date(o.due_at))
      .filter((d) => !isNaN(+d))
      .sort((a, b) => a - b);
    const invoiceBalance = openInvoices.reduce((a, i) => a + Number(i.total_due || 0), 0);
    // `revision` is its own client lens — pull it out of the generic "progress"
    // bucket so the sidebar + tabs can show "In revision" distinctly.
    const revisionOrders = orders.filter((o) => o.status === "revision");
    const progressOrders = orders.filter((o) => MM.bucketOf(o) === "progress" && o.status !== "revision");
    // Sub-label data for the dashboard stat cards (matches the prototype).
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const progDue = progressOrders.concat(revisionOrders)
      .map((o) => MM.relDue(o.due_at)).filter(Boolean).sort((a, b) => a.days - b.days)[0];
    const doneOrders = orders.filter((o) => MM.bucketOf(o) === "delivered");
    return {
      progress: progressOrders.length,
      revision: revisionOrders.length,
      action: orders.filter((o) => MM.bucketOf(o) === "action").length,
      done: doneOrders.length,
      readyCount: doneOrders.filter((o) => o.status === "delivered").length,
      invoicesToPay: openInvoices.length,
      progDue: progDue ? cap(progDue.text) : null,
      balance: clientType === "custom" ? 0
        : invoiceBalance > 0 ? Math.round(invoiceBalance)
        : orders.filter((o) => o.payment_status === "unpaid").reduce((a, o) => a + (MM.balance(o) || o.quote_total || 0), 0),
      nextDue: activeDue[0] ? activeDue[0].toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
      unpaidPulse: openInvoices.length > 0,
    };
  }, [orders, openInvoices, clientType]);
  const unread = orders.reduce((a, o) => a + (o.unread || 0), 0);

  // land on the most relevant tab once orders first load (then leave it alone)
  const tabPickedRef = useRef(false);
  useEffect(() => {
    if (tabPickedRef.current || ordersLoading || !orders.length) return;
    tabPickedRef.current = true;
    setOrdersTab(stats.action > 0 ? "action" : stats.progress > 0 ? "progress" : stats.revision > 0 ? "revision" : "done");
  }, [ordersLoading, orders.length, stats.action, stats.progress, stats.revision]);

  const notify = (m) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 2600); };
  const scrollTop = () => { const sc = document.querySelector(".mer-scroll"); if (sc) sc.scrollTop = 0; };

  // Accepts an optional typed sentence from the hero — it pre-fills the brief's
  // rubric box (click events from plain buttons are ignored). An unpaid balance
  // shows a warning banner but never blocks a new brief (the public brief flow
  // always allows it too — keep the two surfaces consistent).
  const goNewBrief = (arg) => {
    let prefill = null;
    if (typeof File !== "undefined" && arg instanceof File) prefill = { file: arg };
    else if (typeof arg === "string" && arg.trim()) prefill = { text: arg.trim() };
    setBriefPrefill(prefill);
    setBriefOpen(true);
  };
  const openSupport = () => setSupportOpen(true);
  // Consolidated invoice page — first-time payers pick a method first.
  const goInvoice = () => {
    if (clientType === "custom") return;
    if (!profile?.default_payment_method) { setMethodModal(true); return; }
    setRoute("invoice"); setOrder(null); scrollTop();
  };
  // sidebar "My orders" items + the in-page pills drive ONE filter (real tabs)
  const goTab = (key) => { setMsgInitial(null); setRoute("orders"); setOrder(null); setOrdersTab(key); scrollTop(); };
  const go = (r) => {
    if (r === "new") return goNewBrief();
    if (r === "support") return openSupport();
    if (r === "invoice") return goInvoice();
    setMsgInitial(null); setRoute(r); setOrder(null); scrollTop();
  };
  const openOrder = (o, intent) => {
    const seen = loadSeen(); seen[o.id] = new Date().toISOString(); saveSeen(seen);
    if (intent === "files") markFilesSeen(o.id);
    setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, unread: 0 } : x));
    setOrder({ ...o, unread: 0 }); setOrderIntent(intent || null); setRoute("detail"); scrollTop();
  };

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setOrders([]); setLastMessages({});
    setRoute("orders"); setOrder(null);
  }

  // global open-hooks the rest of the system expects
  useEffect(() => {
    window.MeridianOpenBrief = goNewBrief;
    // The <Concierge /> component registers window.MeridianOpenConcierge itself.
  }, []);

  if (!authChecked) {
    return <div className="mer-root" style={{ display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>Loading…</div>;
  }
  if (recovery) {
    return <div className="mer-root"><AuthScreen recovery onRecovered={() => { recoveryHandledRef.current = true; try { window.history.replaceState({}, "", "/workspace"); } catch {} setRecovery(false); }} /></div>;
  }
  if (!user) {
    return <div className="mer-root"><AuthScreen signup={params.get("mode") === "signup"} notify={notify} /></div>;
  }

  const fullHeight = route === "messages";
  const allReleased = orders.length > 0 && orders.every((o) => MM.isReleased(o));
  let body;
  const capBanner = capReached ? (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "16px 20px",
      marginBottom: 26, borderRadius: "var(--r-lg)", background: "var(--st-action-bg)", border: "1px solid var(--st-action-edge)" }}>
      <Icon name="alert" size={20} style={{ color: "var(--st-action)", flex: "0 0 auto" }} />
      <span style={{ flex: 1, minWidth: 220, fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>
        You have {openInvoices.length} unpaid invoice{openInvoices.length === 1 ? "" : "s"} totalling {stats.balance ? "$" + stats.balance : "a balance"}. You can still start a new brief — please settle your balance soon.
      </span>
      <Button variant="primary" iconRight="right" onClick={goInvoice}>Pay now</Button>
    </div>
  ) : null;

  if (route === "dashboard") {
    body = (
      <>
        <DashHeader stats={stats} name={friendlyName(profile?.name, user.email)} />
        {ordersLoading ? <DashboardSkeleton />
          : ordersError ? <ErrorState onRetry={reload} />
          : orders.length === 0 ? (
              <>
                <DashHero onStart={goNewBrief} />
                <EmptyState
                  title="Welcome — let's get started."
                  body="Drop your rubric or describe your assignment above. Our AI drafts the brief, you review and approve, and we match you with an expert. No payment until your invoice is ready."
                  cta="Start your first brief"
                  onStart={goNewBrief}
                  padding="38px 24px"
                />
              </>
            )
          : <>
              <DashHero onStart={goNewBrief} compact />
              {capBanner}
              <ClientDashboard stats={stats} orders={orders} packages={packages} open={openOrder} onDownload={downloadFile}
                onPay={goInvoice} onNewBrief={goNewBrief} go={go} goTab={goTab} clientType={clientType} />
            </>}
      </>
    );
  } else if (route === "orders") {
    body = (
      <>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px, 3.4vw, 38px)", fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 22px", lineHeight: 1.05 }}>My orders</h1>
        {ordersLoading ? <DashboardSkeleton />
          : ordersError ? <ErrorState onRetry={reload} />
          : orders.length === 0 ? <EmptyState />
          : <>
              {capBanner}
              <OrdersTabs tab={ordersTab} setTab={setOrdersTab} stats={stats} />
              <OrdersPanel tab={ordersTab} orders={ordersView} packages={packages} open={openOrder} onDownload={downloadFile} onPay={goInvoice} />
            </>}
      </>
    );
  } else if (route === "invoice") {
    body = <InvoiceView invoices={invoices} profile={profile} user={user} back={() => go("orders")} notify={notify}
      onChangeMethod={() => setMethodModal(true)} onDeclared={reload} />;
  } else if (route === "detail" && order) {
    body = <OrderDetail o={order} user={user} profile={profile} initialIntent={orderIntent} back={() => go("orders")} notify={notify} go={go} />;
  } else if (route === "messages") {
    body = <Messages orders={orders} lastMessages={lastMessages} user={user} profile={profile} initialId={msgInitial} onSupport={openSupport} notify={notify} />;
  } else if (route === "profile") {
    body = <Profile user={user} profile={profile} stats={stats} totalOrders={orders.length} onSignOut={signOut} go={go}
      notify={notify} onProfileSaved={(patch) => setProfile((p) => ({ ...(p || {}), ...patch }))} />;
  }

  const navProps = { user: { name: friendlyName(profile?.name, user.email) || user.email, email: user.email, initials: initialsOf(profile?.name, user.email) },
    route: route === "detail" ? "orders" : route, ordersTab, go, goTab, goInvoice, stats, unread,
    clientType, capReached, openSupport, onSignOut: signOut, density, setDensity: setDensityPref };

  return (
    <div className="mer-root mer-app" data-density={density} style={{ display: "flex", flexDirection: "row" }}>
      {!collapsed && <div className="mer-sidebar-desktop"><Sidebar {...navProps} onCollapse={() => setCollapsedPref(true)} /></div>}

      {/* desktop: floating reopen button when the sidebar is collapsed */}
      {collapsed && (
        <button onClick={() => setCollapsedPref(false)} aria-label="Open sidebar" title="Open sidebar"
          className="mer-sidebar-reopen"
          style={{ position: "fixed", top: 18, left: 18, zIndex: 60, width: 40, height: 40, borderRadius: 11,
            border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-2)",
            display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "var(--shadow-card)" }}>
          <Icon name="panelLeft" size={18} />
        </button>
      )}

      {/* mobile top bar */}
      <div className="mer-mobilebar" style={{ display: "none", height: 58, flex: "0 0 58px",
        background: "var(--roast)", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <button onClick={() => setDrawer(true)} aria-label="Open menu" style={{ position: "relative", background: "transparent", border: "none", color: "var(--side-ink)", display: "inline-flex" }}>
          <Icon name="menu" size={24} />
          {stats.action > 0 && <span style={{ position: "absolute", top: -4, right: -7, minWidth: 17, height: 17, padding: "0 4px",
            borderRadius: 99, background: "var(--accent)", color: "var(--on-accent)", fontSize: 10.5, fontWeight: 700,
            display: "grid", placeItems: "center" }}>{stats.action}</span>}
        </button>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "grid",
          placeItems: "center", fontFamily: "var(--serif)", color: "var(--on-accent)", fontWeight: 600 }}>M</div>
        <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: "var(--side-ink)" }}>Meridian Studio</span>
        <div style={{ flex: 1 }} />
        <button onClick={goNewBrief} aria-label="Start a new brief" style={{ width: 38, height: 38, borderRadius: 99, border: "none",
          background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center" }}><Icon name="plus" size={20} /></button>
      </div>

      {/* mobile drawer */}
      {drawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1500, display: "flex" }}>
          <div onClick={() => setDrawer(false)} style={{ position: "absolute", inset: 0, background: "rgba(20,16,10,.5)", animation: "fadeIn .2s ease" }} />
          <div style={{ position: "relative", height: "100%", animation: "drawerIn .2s ease both" }}>
            <Sidebar {...navProps} onClose={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* content */}
      <main className="mer-scroll scroll" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: fullHeight ? "hidden" : "auto",
        display: "flex", flexDirection: "column" }}>
        <div className="mer-content" style={{ padding: fullHeight ? "26px 30px" : "40px 46px 64px",
          maxWidth: route === "dashboard" || route === "orders" || route === "messages" ? 1180 : 1240, width: "100%", margin: "0 auto",
          flex: fullHeight ? 1 : "0 0 auto", minHeight: fullHeight ? 0 : "auto",
          display: fullHeight ? "flex" : "block", flexDirection: "column" }}>
          {body}
        </div>
      </main>

      <Toast msg={toast} />

      {briefOpen && (
        <div className="ms">
          <BriefFlow open={briefOpen} prefill={briefPrefill} onClose={() => { setBriefOpen(false); reload(); }} />
        </div>
      )}
      {methodModal && <PaymentMethodModal profile={{ ...profile, id: user.id }} notify={notify}
        onClose={() => setMethodModal(false)}
        onSaved={(m) => { setProfile((p) => ({ ...p, default_payment_method: m })); setMethodModal(false); setRoute("invoice"); scrollTop(); }} />}
      {supportOpen && <SupportChat user={user} name={profile?.name} surface="client" onClose={() => setSupportOpen(false)} />}
      <Concierge />
    </div>
  );
}
