/* ============================================================
   WriterApp — expert workspace root (ES module, wired to Supabase).
   Auth + recovery, writer self-heal, assignment + INVITATION intake
   (experts never claim/browse), the per-part submission lifecycle,
   M-Pesa payout, and the loading/empty/error states.
   ============================================================ */
import React from "react";
import { supabase } from "../lib/supabase.js";
import SupportChat from "../SupportChat.jsx";
import "../portal.css";
import "../workspace/kit/theme.css";
import "./expert-theme.css";

import { Icon } from "../workspace/kit/icons.jsx";
import { Avatar } from "../workspace/kit/components.jsx";
import { NotifBell } from "../workspace/kit/notifications.jsx";
import { EM } from "./expert-model.js";
import { ExpSidebar } from "./expert-nav.jsx";
import { MyWork, ExpDashboard } from "./expert-mywork.jsx";
import { AssignmentDetail } from "./expert-detail.jsx";
import { Earnings, Availability, Profile, ExpAuth, NotExpert } from "./expert-screens.jsx";
import { WorkSkeleton, EmptyWork, LoadError } from "./expert-states.jsx";
import { FilePreviewModal, BriefModal } from "./expert-modals.jsx";

const { useState, useEffect, useMemo, useRef } = React;

function useNarrow(bp = 900) {
  const [narrow, setNarrow] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => { const onR = () => setNarrow(window.innerWidth < bp); onR(); window.addEventListener("resize", onR); return () => window.removeEventListener("resize", onR); }, [bp]);
  return narrow;
}

const fmtDate = (ts) => { if (!ts) return null; try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return ts; } };
const timeOf = (ts) => { try { return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
const initialsOf = (name) => (name || "?").replace(/^Dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
function clientCode(id) { let h = 0; const s = String(id || ""); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return "CLT-" + (1000 + (h % 9000)); }

// requirements text → scannable array
const reqArray = (t) => {
  const arr = String(t || "").split(/\r?\n|•|•|;/).map((s) => s.replace(/^\s*[-*\d.)]+\s*/, "").trim()).filter(Boolean);
  return arr.length ? arr : (String(t || "").trim() ? [String(t).trim()] : []);
};
// derive "Standard · 5 days" from a due date
function deadlineTier(due) {
  if (!due) return null;
  const d = new Date(due), now = new Date();
  const days = Math.max(0, Math.ceil((d - now) / 86400000));
  const tier = days <= 2 ? "Express" : days <= 5 ? "Standard" : "Relaxed";
  return `${tier} · ${days} day${days === 1 ? "" : "s"}`;
}

// A real brief sometimes lands entirely in `title` (title + requirements + a
// flattened rubric, all mashed). Split a SHORT display title from the full brief
// text so cards + the detail header stay compact, while the full brief still
// flows to BriefBody (which parses it). Clean titles pass through untouched.
function splitTitle(rawTitle, notes) {
  const t = (rawTitle || "").trim();
  const isBlob = t.length > 90 || /\bRequirements?\s*:|\bRubric\s*:/i.test(t);
  if (!isBlob) return { title: t, brief: notes || "" };
  let lead = t.replace(/^Title:\s*/i, "").split(/\s*(?:Requirements?\s*:|Rubric\s*:)/i)[0].trim();
  if (lead.length > 90) { const m = lead.match(/^(.{20,90}?[.?!])(?:\s|$)/); if (m) lead = m[1].trim(); }
  if (lead.length > 90) lead = lead.slice(0, 88).replace(/\s+\S*$/, "").trim() + "…";
  return { title: lead, brief: (notes && notes.trim()) ? notes : t };
}

function mapPart(p) {
  const pages = p.pages != null ? p.pages : null;
  return { id: p.id, order_id: p.order_id, idx: p.idx || 1, title: p.title || "Part", pages,
    words: pages != null ? pages * 250 : null, citation: p.citation || "—",
    due_date: fmtDate(p.due_date) || "—", due_at: p.due_date || null, status: p.status || "assigned", requirements: reqArray(p.requirements) };
}
function mapAssign(o, parts) {
  const ps = (parts || []).filter((p) => p.order_id === o.id).sort((a, b) => (a.idx || 0) - (b.idx || 0)).map(mapPart);
  const pages = o.pages != null ? o.pages : null;
  const status = ps.length ? EM.bundleStatus(ps) : o.status;
  const ti = splitTitle(o.title, o.notes);
  return {
    ...o,
    title: ti.title || (o.scope_label ? `${o.scope_label} · ${o.program}` : o.program) || "Assignment",
    notes: ti.brief,
    client_code: clientCode(o.client_id || o.id),
    due_date: ["delivered", "closed"].includes(status) ? ("Delivered " + (fmtDate(o.updated_at) || fmtDate(o.due_date) || "")) : fmtDate(o.due_date),
    due_at: o.due_date || null,   // raw — keeps the deadline countdown honest
    deadline_tier: deadlineTier(o.due_date),
    discipline: o.discipline || o.program,
    pages, words: pages != null ? pages * 250 : null, format: o.format || "Word (.docx)",
    citation: o.citation || null, requirements: reqArray(o.requirements),
    parts: ps.length ? ps : undefined, status, unread: 0,
  };
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--roast)", color: "#F1EBDD", padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 10, zIndex: 3000, boxShadow: "var(--shadow-pop)", maxWidth: "90vw", animation: "fadeIn .2s ease" }}>
      <span style={{ width: 22, height: 22, borderRadius: 99, background: toast.type === "error" ? "var(--st-action)" : "var(--accent)", display: "grid", placeItems: "center", flex: "0 0 22px" }}><Icon name={toast.type === "error" ? "alert" : "check"} size={14} stroke={2.5} /></span>
      {toast.m}
    </div>
  );
}

export default function WriterApp() {
  const params = useMemo(() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } }, []);
  const narrow = useNarrow(900);

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [writer, setWriter] = useState(null);
  const [writerChecked, setWriterChecked] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [filesByOrder, setFilesByOrder] = useState({});
  const [msgsByOrder, setMsgsByOrder] = useState({});
  const [perf, setPerf] = useState(null);        // writer_performance() — rating/on-time/acceptance/rework
  const [activity, setActivity] = useState([]);  // recent order_log events for the dashboard feed
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [route, setRoute] = useState("dashboard");
  const [workFilter, setWorkFilter] = useState(null); // null | 'active' | 'revision' | 'in_review' | 'delivered'
  const [current, setCurrent] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [authPreview, setAuthPreview] = useState(false);
  const [filePreview, setFilePreview] = useState(null); // { file, url, loading } — in-app file preview modal
  const [briefInvite, setBriefInvite] = useState(null); // invitation order shown in the brief modal
  const [readIds, setReadIds] = useState(() => new Set());
  const toastTimer = useRef();

  const recoveryRequested = useMemo(() => { try { return params.get("type") === "recovery"; } catch { return false; } }, [params]);
  const recoveryHandledRef = useRef(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => { document.title = "Expert workspace — Meridian Studio"; }, []);
  useEffect(() => { if (!narrow) setDrawerOpen(false); }, [narrow]);
  useEffect(() => { setDrawerOpen(false); }, [route]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && recoveryRequested && !recoveryHandledRef.current)) setRecovery(true);
      setUser(session?.user ?? null); setAuthChecked(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthChecked(true); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setWriter(null); setWriterChecked(false); setAssignments([]); setInvitations([]); return; }
    let active = true;
    let ch = null, poll = null, t = null;
    (async () => {
      let { data } = await supabase.from("writers").select("*").eq("profile_id", user.id).maybeSingle();
      if (!data) { try { await supabase.rpc("claim_writer_profile"); } catch { /* ignore */ } ({ data } = await supabase.from("writers").select("*").eq("profile_id", user.id).maybeSingle()); }
      if (!active) return;
      setWriter(data); setWriterChecked(true);
      if (!data) return;
      loadAll(data);
      if (!active) return;   // unmounted mid-load — don't leak a channel/interval
      // Stay in sync with admin/client actions: realtime (snappy) + a 15s poll
      // fallback (matches the admin hooks; survives a dropped socket). RLS scopes
      // realtime to this writer's rows, so table-level subscriptions only deliver
      // events for their own orders. An admin status change, file upload, message,
      // (re)assignment, due-date or pay edit now shows without a manual reload.
      const bump = () => { clearTimeout(t); t = setTimeout(() => { if (active) loadAll(data); }, 400); };
      ch = supabase.channel("exp-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `writer_id=eq.${data.id}` }, bump)
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `invited_writer_id=eq.${data.id}` }, bump)
        .on("postgres_changes", { event: "*", schema: "public", table: "order_parts" }, bump)
        .on("postgres_changes", { event: "*", schema: "public", table: "order_files" }, bump)
        .on("postgres_changes", { event: "*", schema: "public", table: "order_messages" }, bump)
        .subscribe();
      poll = setInterval(() => { if (active) loadAll(data); }, 15000);
    })();
    return () => { active = false; clearTimeout(t); if (ch) supabase.removeChannel(ch); if (poll) clearInterval(poll); };
  }, [user?.id]);

  const inFlightRef = useRef(false);
  async function loadAll(w) {
    if (inFlightRef.current) return;   // don't let realtime + poll stack overlapping reloads
    inFlightRef.current = true;
    setLoading(true); setLoadErr(false);
    try {
      const [{ data: orders, error: oErr }, { data: inv }, { data: perfRows }] = await Promise.all([
        supabase.from("orders").select("id, ref, title, program, discipline, scope_label, level, level_label, due_date, updated_at, status, citation, pages, requirements, notes, priority, client_id, writer_id, estimate_usd, rate_project").eq("writer_id", w.id).order("created_at", { ascending: false }),
        supabase.rpc("writer_invitations"),
        supabase.rpc("writer_performance"),
      ]);
      if (oErr) throw oErr;
      setPerf((perfRows && perfRows[0]) || null);
      const ids = (orders || []).map((o) => o.id);
      const [{ data: parts }, { data: fileRows }, { data: msgRows }, { data: logRows }] = await Promise.all([
        ids.length ? supabase.from("order_parts").select("*").in("order_id", ids) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from("order_files").select("*").in("order_id", ids).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from("order_messages").select("order_id, sender_id, body, created_at, is_internal").in("order_id", ids).eq("is_internal", false).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from("order_log").select("event, created_at, order_id").in("order_id", ids).order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
      ]);
      setActivity(logRows || []);

      const mapped = (orders || []).map((o) => mapAssign(o, parts));
      // unread
      const unreadMap = {};
      (msgRows || []).forEach((r) => { if (r.sender_id === w.profile_id || r.sender_id === user?.id) return; unreadMap[r.order_id] = (unreadMap[r.order_id] || 0) + 1; });
      mapped.forEach((o) => { o.unread = unreadMap[o.id] || 0; });
      setAssignments(mapped);

      // files keyed by order, carrying part_id + normalized uploader
      const fbo = {};
      (fileRows || []).forEach((r) => {
        (fbo[r.order_id] = fbo[r.order_id] || []).push({
          id: r.id, name: r.file_name, path: r.file_path, kind: r.kind, part_id: r.part_id,
          size: r.size_bytes != null ? fmtBytes(r.size_bytes) : "", at: fmtDay(r.created_at), version: r.version, score: r.score,
          uploaded_by: (r.uploaded_by === user?.id) ? "me" : "student",
        });
      });
      setFilesByOrder(fbo);

      // chat threads keyed by order
      const mbo = {};
      (msgRows || []).forEach((r) => { (mbo[r.order_id] = mbo[r.order_id] || []).push({ id: r.id, from: r.sender_id === user?.id ? "you" : "them", body: r.body, time: timeOf(r.created_at) }); });
      setMsgsByOrder(mbo);

      setInvitations((inv || []).map((o) => mapAssign(o, [])));
    } catch (e) { console.error("loadAll", e); setLoadErr(true); }
    setLoading(false);
    inFlightRef.current = false;
  }

  const buckets = useMemo(() => EM.earningsBuckets(assignments), [assignments]);
  const stats = {
    active: assignments.filter((o) => ["assigned", "writing"].includes(o.status)).length,
    revision: assignments.filter((o) => o.status === "revision").length,
    review: assignments.filter((o) => o.status === "in_review").length,
    delivered: assignments.filter((o) => ["delivered", "closed"].includes(o.status)).length,
    upcoming: buckets.upcoming, monthEarnedNum: buckets.paid, monthEarned: EM.money(buckets.paid),
  };
  const unread = assignments.reduce((a, o) => a + (o.unread || 0), 0);

  // notifications (derived, same pattern as before)
  const notifs = useMemo(() => {
    const out = [];
    invitations.forEach((o) => out.push({ id: "inv-" + o.id, icon: "mail", tone: "action", title: "New invitation", body: `${o.ref} · ${o.program || "assignment"} — confirm or decline.`, at: "", route: "work" }));
    assignments.forEach((o) => {
      if (o.status === "revision") out.push({ id: "rev-" + o.id, icon: "refresh", tone: "rev", title: "Revision requested", body: `${o.ref} needs changes.`, at: "", route: "work" });
      else if (o.status === "assigned") out.push({ id: "new-" + o.id, icon: "briefcase", tone: "info", title: "New assignment", body: `${o.ref} · ${o.program} is ready to start.`, at: "", route: "work" });
      if (o.unread > 0) out.push({ id: "msg-" + o.id, icon: "chat", tone: "info", title: "New message", body: `${o.client_code} messaged you.`, at: "", route: "work" });
    });
    return out.map((n) => readIds.has(n.id) ? { ...n, read: true } : n);
  }, [assignments, invitations, readIds]);
  const setNotifs = (items) => setReadIds((prev) => { const s = new Set(prev); items.forEach((i) => { if (i.read) s.add(i.id); }); return s; });

  const notify = (m, type = "success") => { setToast({ m, type }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600); };

  const go = (r) => { if (r === "support") { setSupportOpen(true); return; } setRoute(r); setCurrent(null); };
  const openAssign = (o) => {
    setAssignments((prev) => prev.map((x) => x.id === o.id ? { ...x, unread: 0 } : x));
    setCurrent({ ...o, unread: 0 }); setRoute("detail");
  };
  // Invitation "Review brief first" → in-app brief modal (was a full-page route).
  // The full invite detail page (route:"invite") stays available for reuse.
  const previewInvite = (o) => setBriefInvite(o);

  const detailFiles = current ? (filesByOrder[current.id] || []) : [];
  const detailMsgs = current ? (msgsByOrder[current.id] || []) : [];

  // Keep an open assignment detail in sync with live reloads — if admin changes
  // status/due/pages/pay while the expert is viewing it, reflect it without a
  // back-and-forth. (Files + chat already track filesByOrder/msgsByOrder above.)
  useEffect(() => {
    if (!current || route !== "detail") return;
    const fresh = assignments.find((o) => o.id === current.id);
    if (fresh && (fresh.status !== current.status || fresh.due_date !== current.due_date
      || fresh.pages !== current.pages || fresh.rate_project !== current.rate_project)) {
      setCurrent({ ...fresh, unread: 0 });
    }
  }, [assignments]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startWork(target) {
    setBusy(true);
    const { data, error } = target.partId
      ? await supabase.rpc("writer_set_part_status", { p_part: target.partId, p_status: "writing" })
      : await supabase.rpc("writer_set_status", { p_order: target.orderId, p_status: "writing" });
    setBusy(false);
    if (error || !data) { notify("Could not update.", "error"); return; }
    notify("Work started."); if (writer) loadAll(writer);
  }

  async function addFile(slot, fileList, target, score) {
    const list = Array.from(fileList || []).filter(Boolean);
    if (!list.length) return;
    setBusy(true);
    let ok = 0;
    for (const file of list) {
      const path = `${target.orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("order-files").upload(path, file);
      if (upErr) { console.error(upErr); continue; }
      const { error: insErr } = await supabase.from("order_files").insert({
        order_id: target.orderId, part_id: target.partId || null, uploaded_by: user.id,
        file_name: file.name, file_path: path, kind: slot.kind, size_bytes: file.size, version: null,
        score: (slot.score && score != null && score !== "" && !isNaN(Number(score))) ? Number(score) : null,
      });
      if (insErr) { console.error(insErr); continue; }
      ok++;
    }
    setBusy(false);
    const noun = slot.kind === "final" ? "Final document" : slot.kind === "ai_report" ? "AI report" : slot.kind === "plag_report" ? "Originality report" : "Files";
    notify(ok > 1 ? `${ok} files attached.` : ok === 1 ? `${noun} attached.` : "Upload failed — please try again.", ok ? "success" : "error");
    if (writer) loadAll(writer);
  }

  async function removeFile(f) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-order-file", { body: { file_id: f.id } });
      if (error || !data?.ok) { notify(data?.error === "locked" ? "Files are locked once submitted." : "Could not remove that file.", "error"); setBusy(false); return; }
      notify("File removed."); if (writer) loadAll(writer);
    } catch (e) { console.error(e); notify("Could not remove that file.", "error"); }
    setBusy(false);
  }

  async function submit(target) {
    const all = filesByOrder[target.orderId] || [];
    const unitFiles = target.partId ? all.filter((f) => f.part_id === target.partId) : all.filter((f) => !f.part_id);
    if (!EM.hasFinal(unitFiles, "me")) { notify("Attach your final document first.", "error"); return; }
    setBusy(true);
    const round = "v" + (new Set(unitFiles.filter((f) => f.version).map((f) => f.version)).size + 1);
    const toVersion = unitFiles.filter((f) => f.uploaded_by === "me" && !f.version);
    for (const f of toVersion) { await supabase.from("order_files").update({ version: round }).eq("id", f.id); }
    const { data, error } = target.partId
      ? await supabase.rpc("writer_set_part_status", { p_part: target.partId, p_status: "in_review" })
      : await supabase.rpc("writer_set_status", { p_order: target.orderId, p_status: "in_review" });
    setBusy(false);
    if (error || !data) { notify("Could not submit — please try again.", "error"); return; }
    notify("Submitted — QC will review before the student sees it."); if (writer) loadAll(writer);
  }

  async function send(text) {
    const b = (text || "").trim(); if (!b || !current) return;
    const orderId = current.id;
    setMsgsByOrder((p) => ({ ...p, [orderId]: [...(p[orderId] || []), { id: "tmp" + Date.now(), from: "you", body: b, time: "now" }] }));
    await supabase.from("order_messages").insert({ order_id: orderId, sender_id: user.id, sender_name: writer.name, body: b, is_internal: false });
  }

  async function respond(o, accept) {
    setBusy(true);
    const { data, error } = await supabase.rpc("writer_respond_invitation", { p_order: o.id, p_accept: accept });
    setBusy(false);
    if (error || !data) { notify("That invitation is no longer available.", "error"); if (writer) loadAll(writer); return; }
    notify(accept ? `Confirmed ${o.ref || "assignment"} — the client has been notified.` : "Invitation declined.");
    if (route === "invite") { setCurrent(null); setRoute("work"); }
    if (writer) loadAll(writer);
  }

  async function toggleAvail(next) {
    if (!writer) return;
    const val = typeof next === "boolean" ? next : !writer.accepting;
    setWriter((w) => ({ ...w, accepting: val }));
    await supabase.from("writers").update({ accepting: val }).eq("id", writer.id);
  }
  async function saveProfile(patch) {
    if (!writer) return;
    const { data } = await supabase.from("writers").update(patch).eq("id", writer.id).select().single();
    if (data) setWriter(data);
  }
  // In-app file preview — open the modal immediately (loading), then fill in the
  // signed URL so the real file embeds inside the prototype frame (no new tab).
  async function onPreview(f) {
    if (!f.path) return;
    setFilePreview({ file: f, url: null, loading: true });
    const { data } = await supabase.storage.from("order-files").createSignedUrl(f.path, 120);
    setFilePreview((cur) => (cur && cur.file === f) ? { file: f, url: data?.signedUrl || null, loading: false } : cur);
  }
  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setWriter(null); setWriterChecked(false); setRoute("work"); setCurrent(null);
  }

  if (!authChecked) return <div className="mer-root exp-root" style={{ display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>Loading…</div>;
  if (recovery) return <div className="mer-root exp-root"><ExpAuth recovery onRecovered={() => { recoveryHandledRef.current = true; try { window.history.replaceState({}, "", "/expert"); } catch { /* ignore */ } setRecovery(false); }} notify={notify} /></div>;
  if (authPreview) return <div className="mer-root exp-root" style={{ height: "100vh" }}><ExpAuth notify={notify} /></div>;
  if (!user) return <div className="mer-root exp-root"><ExpAuth notify={notify} /></div>;
  if (!writerChecked) return <div className="mer-root exp-root" style={{ display: "grid", placeItems: "center", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13 }}>Loading your workspace…</div>;
  if (!writer) return <div className="mer-root exp-root"><NotExpert user={user} onClaim={async () => { try { await supabase.rpc("claim_writer_profile"); } catch { /* ignore */ } const { data } = await supabase.from("writers").select("*").eq("profile_id", user.id).maybeSingle(); setWriter(data); if (data) loadAll(data); }} onSignOut={signOut} /></div>;

  const wNav = { ...writer, initials: initialsOf(writer.name) };
  const navProps = { route: (route === "detail" || route === "invite") ? "work" : route, go, stats, unread: unread + invitations.length, setWorkFilter, accepting: !!writer.accepting, setAccepting: toggleAvail, writer: wNav, onSignOut: signOut, notifs, setNotifs };

  let body;
  if (route === "dashboard") {
    if (loading) body = <WorkSkeleton />;
    else if (loadErr) body = <LoadError onRetry={() => loadAll(writer)} onSupport={() => setSupportOpen(true)} />;
    else body = <ExpDashboard writer={wNav} assignments={assignments} invitations={invitations} accepting={!!writer.accepting} setAccepting={toggleAvail} stats={stats} perf={perf} activity={activity} open={openAssign} respond={respond} previewInvite={previewInvite} go={go} />;
  } else if (route === "work") {
    if (loading) body = <WorkSkeleton />;
    else if (loadErr) body = <LoadError onRetry={() => loadAll(writer)} onSupport={() => setSupportOpen(true)} />;
    else if (assignments.length === 0 && invitations.length === 0) body = <EmptyWork writer={wNav} accepting={!!writer.accepting} setAccepting={toggleAvail} />;
    else body = <MyWork writer={wNav} assignments={assignments} invitations={invitations} accepting={!!writer.accepting} stats={stats} workFilter={workFilter} setWorkFilter={setWorkFilter} open={openAssign} respond={respond} previewInvite={previewInvite} go={go} />;
  } else if (route === "detail" && current) {
    body = <AssignmentDetail a={current} files={detailFiles} msgs={detailMsgs} narrow={narrow} onBack={() => go("work")} onStart={startWork} onAddFile={addFile} onRemoveFile={removeFile} onSubmit={submit} onSend={send} onPreview={onPreview} busy={busy} />;
  } else if (route === "invite" && current) {
    body = <AssignmentDetail a={current} files={detailFiles} msgs={[]} narrow={narrow} onBack={() => go("work")} onPreview={onPreview} preview onRespond={respond} busy={busy} />;
  } else if (route === "earnings") body = <Earnings assignments={assignments} writer={writer} onSave={saveProfile} notify={notify} />;
  else if (route === "availability") body = <Availability writer={writer} accepting={!!writer.accepting} setAccepting={toggleAvail} onSave={saveProfile} notify={notify} />;
  else if (route === "profile") body = <Profile writer={wNav} />;

  return (
    <div className="mer-root exp-root mer-app" style={{ display: "flex", flexDirection: narrow ? "column" : "row" }}>
      {narrow && (
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--roast)", borderBottom: "1px solid rgba(0,0,0,.3)", flex: "0 0 auto", zIndex: 40 }}>
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" style={{ background: "transparent", border: "none", color: "var(--side-ink)", display: "inline-flex", cursor: "pointer", padding: 4 }}><Icon name="menu" size={22} /></button>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 16, color: "var(--on-accent)", flex: "0 0 30px" }}>M</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, color: "var(--side-ink)", lineHeight: 1 }}>Expert Workspace</div>
          <div style={{ flex: 1 }} />
          {notifs && <NotifBell items={notifs} setItems={setNotifs} dark go={go} />}
          <Avatar initials={wNav.initials} size={30} tone="accent" />
        </header>
      )}

      {!narrow && <ExpSidebar {...navProps} />}

      {narrow && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(24,33,31,.5)", zIndex: 50, animation: "fadeIn .18s ease" }} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 270, maxWidth: "82vw", zIndex: 60, boxShadow: "0 18px 60px -10px rgba(0,0,0,.5)", animation: "slideIn .26s cubic-bezier(.22,1,.36,1)" }}>
            <ExpSidebar {...navProps} onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <main className="mer-scroll scroll" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto" }}>
        <div className="mer-content" style={{ padding: narrow ? "24px 18px 56px" : "36px 40px 64px", maxWidth: 1080, width: "100%", margin: "0 auto" }}>{body}</div>
      </main>

      {filePreview && (
        <FilePreviewModal file={filePreview.file} url={filePreview.url} loading={filePreview.loading} onClose={() => setFilePreview(null)} />
      )}
      {briefInvite && (
        <BriefModal o={briefInvite} busy={busy}
          onClose={() => setBriefInvite(null)}
          onRespond={(o, accept) => { setBriefInvite(null); respond(o, accept); }} />
      )}

      <Toast toast={toast} />
      {supportOpen && <SupportChat user={user} name={writer.name} surface="writer" onClose={() => setSupportOpen(false)} />}
    </div>
  );
}

const fmtBytes = (b) => b == null ? "" : b < 1024 ? b + " B" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";
const fmtDay = (ts) => { if (!ts) return ""; try { const d = new Date(ts), n = new Date(); return d.toDateString() === n.toDateString() ? "today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; } };
