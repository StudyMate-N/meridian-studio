import { useState, useEffect, useRef, useId, Fragment } from "react";
import { supabase } from "./lib/supabase.js";
import Logomark from "./components/Logomark.jsx";

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const LEVELS = [
  { id:"undergrad",   label:"Undergraduate",   abbr:"UG",  sub:"Associate · Bachelor's",     rW:12, rP:null, hue:"#2563EB", hueSoft:"#EFF6FF", rateContext:"Foundational essays, case studies, and discussion posts. Standard citations, clear rubric alignment." },
  { id:"graduate",    label:"Graduate",         abbr:"GR",  sub:"MSN · MSW · MBA",            rW:18, rP:null, hue:"#7C3AED", hueSoft:"#F5F3FF", rateContext:"Analytical papers with peer-reviewed synthesis. Graduate rubric standards and clinical reasoning depth." },
  { id:"masters_adv", label:"Advanced Masters", abbr:"AM",  sub:"PMHNP · FNP · CRNA",         rW:20, rP:25,   hue:"#B45309", hueSoft:"#FFFBEB", rateContext:"Speciality clinical focus, APRN-level documentation, advanced practice frameworks and evidence integration." },
  { id:"dnp",         label:"DNP",              abbr:"DNP", sub:"Doctor of Nursing Practice", rW:25, rP:30,   hue:"#B91C1C", hueSoft:"#FEF2F2", rateContext:"Doctoral synthesis, IRB navigation, logic models, implementation science. Secondary and dean's review standards." },
  { id:"phd",         label:"PhD",              abbr:"PhD", sub:"Doctor of Philosophy",       rW:28, rP:35,   hue:"#047857", hueSoft:"#ECFDF5", rateContext:"Original research, theoretical frameworks, dissertation-grade literature synthesis. Highest academic rigour." },
];

const PROGRAMS = {
  undergrad:   ["Chamberlain University — BSN","Walden University — BSN (RN to BSN)","Rasmussen University — BSN","Grand Canyon University — BSN","Other"],
  graduate:    ["Walden University — MSN General","Rasmussen University — MSN Leadership","Chamberlain University — MSN","South University — MSN","Other"],
  masters_adv: ["Walden University — MSN PMHNP","Walden University — MSN FNP","Chamberlain University — MSN NP","Capella University — MSN PMHNP","South University — MSN PMHNP","Other"],
  dnp:         ["Capella University — DNP Flex Path","Walden University — DNP","Chamberlain University — DNP","Other"],
  phd:         ["Capella University — PhD Nursing","Walden University — PhD Psychology","Walden University — PhD Public Health","Northcentral University — PhD","Other"],
};

const SCOPE_TIERS = [
  { id:"single",   title:"Single piece",    summary:"One assignment or one full course.",          icon:"1",
    options:[
      { id:"single_assign", label:"One assignment",  detail:"A single paper for one course.",                           orderNote:"We'll confirm the specific assignment after reviewing your brief.", hasProject:false, bundle:false },
      { id:"single_course", label:"One full course", detail:"Every assessment within a single course, start to finish.", orderNote:"All assessments covered. Briefs per assignment help us plan.", hasProject:false, bundle:false },
    ]},
  { id:"partial",  title:"Partial program", summary:"Several courses bundled together.",           icon:"½",
    options:[
      { id:"half_program", label:"First half of program", detail:"Opening core courses — a meaningful commitment without going all-in upfront.", orderNote:"Covers your first block of core courses. 10% bundle saving applies.", hasProject:false, bundle:true },
      { id:"core_only",    label:"All core coursework",   detail:"Every writing-based course in the program. No doctoral project.",              orderNote:"Full core coverage. 10% bundle saving applies.",                   hasProject:false, bundle:true },
    ]},
  { id:"complete", title:"Full program",    summary:"Project work, or entire program end-to-end.", icon:"∞",
    options:[
      { id:"project_only", label:"Doctoral project / capstone only", detail:"The complete project sequence from proposal through final manuscript.", orderNote:"All project phases at the project rate. 10% bundle saving applies.",        hasProject:true, bundle:true, doctoral:true },
      { id:"full_program", label:"Entire program",                   detail:"All core coursework plus the complete doctoral project or capstone.",  orderNote:"Core at writing rate + project at project rate. 10% bundle saving.", hasProject:true, bundle:true, doctoral:true, featured:true },
    ]},
];

const ALL_SCOPES = SCOPE_TIERS.flatMap(t => t.options.map(o => ({ ...o, tierId:t.id, tierTitle:t.title })));

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
const T = {
  bg:"#F7F6F3", surface:"#FFFFFF", alt:"#F2F1EE",
  border:"#E8E5E0", borderMid:"#D4D0CA",
  side:"#111418", sideBorder:"rgba(255,255,255,0.07)", sideText:"rgba(255,255,255,0.5)",
  ink:"#111418", inkMid:"#57534E", inkLight:"#6E6A65",
  accent:"#B91C1C", accentSoft:"#FEF2F2", accentMid:"#FECACA",
  green:"#065F46", greenBg:"#ECFDF5", greenBord:"#A7F3D0",
};
const F = { serif:"Cormorant Garamond,Georgia,serif", sans:"DM Sans,system-ui,sans-serif", mono:"DM Mono,monospace" };

// ── BADGE CONFIG MAPS ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  new:         { label:"New",         bg:"#F7F6F3", color:"#57534E", border:"#E8E5E0" },
  in_progress: { label:"In Progress", bg:"#EFF6FF", color:"#1D4ED8", border:"#BFDBFE" },
  review:      { label:"Review",      bg:"#FFFBEB", color:"#92400E", border:"#FDE68A" },
  delivered:   { label:"Delivered",   bg:"#ECFDF5", color:"#065F46", border:"#A7F3D0" },
  revision:    { label:"Revision",    bg:"#FFF7ED", color:"#9A3412", border:"#FED7AA" },
  cancelled:   { label:"Cancelled",   bg:"#FEF2F2", color:"#991B1B", border:"#FECACA" },
};
const PAY_CFG = {
  unpaid:       { label:"Unpaid",       bg:"#FEF2F2", color:"#991B1B", border:"#FECACA" },
  deposit_paid: { label:"Deposit Paid", bg:"#FFFBEB", color:"#92400E", border:"#FDE68A" },
  paid:         { label:"Paid",         bg:"#ECFDF5", color:"#065F46", border:"#A7F3D0" },
};
const KIND_CFG = {
  brief:    { label:"Brief",    bg:"#EFF6FF", color:"#1D4ED8", border:"#BFDBFE" },
  draft:    { label:"Draft",    bg:"#FFFBEB", color:"#92400E", border:"#FDE68A" },
  final:    { label:"Final",    bg:"#ECFDF5", color:"#065F46", border:"#A7F3D0" },
  revision: { label:"Revision", bg:"#FFF7ED", color:"#9A3412", border:"#FED7AA" },
  other:    { label:"Other",    bg:"#F7F6F3", color:"#57534E", border:"#E8E5E0" },
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function fmtBytes(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1048576).toFixed(1)} MB`;
}

// ── SHARED COMPONENTS ──────────────────────────────────────────────────────────
function Btn({ children, onClick, variant="primary", size="md", disabled=false, full=false, sx={} }) {
  const v = {
    primary:{ background:T.accent,     color:"#fff",   border:"none" },
    dark:   { background:T.side,       color:"#fff",   border:"none" },
    soft:   { background:T.alt,        color:T.inkMid, border:`1px solid ${T.border}` },
    ghost:  { background:"transparent",color:T.inkMid, border:`1px solid ${T.border}` },
  }[variant]||{};
  const pd = size==="lg"?"12px 24px":size==="sm"?"5px 11px":"9px 18px";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:pd, fontSize:size==="lg"?14:13, fontWeight:600, fontFamily:F.sans,
        ...v, borderRadius:8, cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?0.4:1, width:full?"100%":"auto",
        transition:"all 0.15s", ...sx }}>
      {children}
    </button>
  );
}

function FL({ text, req }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.7px", textTransform:"uppercase",
      color:T.inkLight, fontFamily:F.sans, marginBottom:6 }}>
      {text}{req&&<span style={{ color:T.accent, marginLeft:2 }}>*</span>}
    </div>
  );
}

function TInput({ label, value, onChange, type="text", placeholder="", req=false, err=false, min="", errorMsg="" }) {
  const [f, setF] = useState(false);
  const rid = useId();
  const errId = rid + "-err";
  const showErr = err && errorMsg;
  return (
    <div style={{ marginBottom:14 }}>
      {label && (
        <label htmlFor={rid} style={{ display:"block", fontSize:11, fontWeight:700,
          letterSpacing:"0.7px", textTransform:"uppercase", color:T.inkLight,
          fontFamily:F.sans, marginBottom:6 }}>
          {label}{req && <span style={{ color:T.accent, marginLeft:2 }} aria-hidden="true">*</span>}
        </label>
      )}
      <input id={rid} value={value} onChange={e=>onChange(e.target.value)} type={type}
        placeholder={placeholder} min={min||undefined}
        aria-required={req||undefined} aria-invalid={err||undefined}
        aria-describedby={showErr ? errId : undefined}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:"100%", padding:"10px 13px", boxSizing:"border-box",
          border:`1.5px solid ${err?T.accent:f?T.inkMid:T.border}`,
          borderRadius:8, fontSize:14, fontFamily:F.sans,
          color:T.ink, background:T.surface, outline:"none" }} />
      {showErr && <div id={errId} role="alert" style={{ color:T.accent, fontSize:12, marginTop:6 }}>{errorMsg}</div>}
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${options.length},1fr)`,
      gap:4, padding:4, background:T.alt, borderRadius:9 }}>
      {options.map(o => (
        <button key={o.v} onClick={()=>onChange(o.v)}
          style={{ padding:"8px 10px", borderRadius:6, border:"none",
            background:value===o.v?T.surface:"transparent",
            color:value===o.v?T.ink:T.inkLight,
            fontSize:12, fontWeight:value===o.v?600:500, fontFamily:F.sans,
            cursor:"pointer", transition:"all 0.15s" }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function FileZone({ file, onFile }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  return (
    <div onClick={()=>ref.current.click()}
      onDragOver={e=>{ e.preventDefault(); setDrag(true); }}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{ e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
      style={{ border:`2px dashed ${drag?T.accent:file?T.green:T.borderMid}`,
        borderRadius:10, padding:"18px 20px", textAlign:"center",
        cursor:"pointer", background:file?T.greenBg:drag?T.accentSoft:T.bg,
        transition:"all 0.15s", marginBottom:14 }}>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx,.zip"
        style={{ display:"none" }} onChange={e=>onFile(e.target.files[0])} />
      {file
        ? <><div style={{ fontSize:20, marginBottom:4 }}>✅</div>
            <div style={{ fontSize:13, fontWeight:600, color:T.green, fontFamily:F.sans }}>{file.name}</div>
            <div style={{ fontSize:11, color:T.green, opacity:0.7, marginTop:2 }}>Click to replace</div></>
        : <><div style={{ fontSize:20, marginBottom:6 }}>📎</div>
            <div style={{ fontSize:13, fontWeight:600, color:T.inkMid, fontFamily:F.sans }}>Drop file here or click to upload</div>
            <div style={{ fontSize:11, color:T.inkLight, marginTop:3 }}>PDF · DOCX · ZIP</div></>}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0" }}>
      <div style={{ flex:1, height:1, background:T.border }} />
      {label && <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1px",
        textTransform:"uppercase", color:T.inkLight, fontFamily:F.sans, whiteSpace:"nowrap" }}>{label}</div>}
      <div style={{ flex:1, height:1, background:T.border }} />
    </div>
  );
}

function RadioDot({ on, hue }) {
  return (
    <div style={{ width:14, height:14, borderRadius:"50%", flexShrink:0, marginTop:2,
      border:`1.5px solid ${on?hue:T.borderMid}`, background:on?hue:T.surface,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      {on && <div style={{ width:4, height:4, borderRadius:"50%", background:"#fff" }} />}
    </div>
  );
}

function Badge({ children, color, bg, border }) {
  return (
    <div style={{ padding:"1px 6px", borderRadius:4, fontSize:9, fontWeight:700,
      background:bg, color, border:`1px solid ${border}` }}>
      {children}
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const s = { success:{ bg:T.greenBg, color:T.green, border:T.greenBord },
               error:  { bg:T.accentSoft, color:T.accent, border:T.accentMid },
               info:   { bg:T.surface, color:T.ink, border:T.border } }[toast.type] ||
             { bg:T.surface, color:T.ink, border:T.border };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:s.bg, border:`1px solid ${s.border}`, color:s.color,
      padding:"12px 16px", borderRadius:10, fontSize:13, fontFamily:F.sans,
      fontWeight:500, boxShadow:"0 4px 20px rgba(17,20,24,0.12)", maxWidth:320,
      lineHeight:1.5, cursor:"pointer" }} onClick={onClose}>
      {toast.message}
    </div>
  );
}

// ── BADGE COMPONENTS ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.new;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:5,
      padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:600,
      background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:c.color, flexShrink:0 }} />
      {c.label}
    </div>
  );
}

function PaymentBadge({ status }) {
  const c = PAY_CFG[status] || PAY_CFG.unpaid;
  return (
    <div style={{ display:"inline-block", padding:"3px 9px", borderRadius:99,
      fontSize:11, fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {c.label}
    </div>
  );
}

function KindBadge({ kind }) {
  const c = KIND_CFG[kind] || KIND_CFG.other;
  return (
    <div style={{ display:"inline-block", padding:"2px 7px", borderRadius:4,
      fontSize:10, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {c.label}
    </div>
  );
}

// ── MESSAGE THREAD ─────────────────────────────────────────────────────────────
function MessageThread({ orderId, user, profile }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    if (!orderId) return;
    supabase.from("order_messages")
      .select("*")
      .eq("order_id", orderId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data || []));

    const ch = supabase.channel(`client-msgs-${orderId}`)
      .on("postgres_changes", {
        event:"INSERT", schema:"public", table:"order_messages",
        filter:`order_id=eq.${orderId}`,
      }, payload => {
        if (!payload.new.is_internal) setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  async function send() {
    if (!body.trim() || !user) return;
    setSending(true);
    await supabase.from("order_messages").insert({
      order_id:    orderId,
      sender_id:   user.id,
      sender_name: profile?.name || user.email,
      body:        body.trim(),
      is_internal: false,
    });
    setBody("");
    setSending(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8, padding:"4px 0" }}>
        {messages.length === 0 && (
          <div style={{ textAlign:"center", color:T.inkLight, fontSize:13, padding:24 }}>
            No messages yet. Send one below.
          </div>
        )}
        {messages.map(m => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
              <div style={{ maxWidth:"72%", padding:"9px 13px",
                background:isMe?T.accent:T.surface, color:isMe?"#fff":T.ink,
                borderRadius:isMe?"12px 12px 3px 12px":"12px 12px 12px 3px",
                border:isMe?"none":`1px solid ${T.border}`,
                boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
                {!isMe && <div style={{ fontSize:10, fontWeight:600, color:T.inkLight, marginBottom:3 }}>
                  {m.sender_name || "Admin"}
                </div>}
                <div style={{ fontSize:13, lineHeight:1.55, wordBreak:"break-word" }}>{m.body}</div>
                <div style={{ fontSize:10, color:isMe?"rgba(255,255,255,0.6)":T.inkLight, marginTop:4, textAlign:"right" }}>
                  {fmtDate(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {user && (
        <div style={{ display:"flex", gap:8, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
          <textarea value={body} onChange={e=>setBody(e.target.value)} rows={2}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}}
            aria-label="Type a message"
            placeholder="Type a message… (Enter to send)"
            style={{ flex:1, padding:"9px 12px", border:`1px solid ${T.border}`,
              borderRadius:8, fontSize:13, fontFamily:F.sans, resize:"none",
              outline:"none", color:T.ink, background:T.surface }} />
          <button onClick={send} disabled={sending||!body.trim()}
            style={{ padding:"0 16px", background:T.side, color:"#fff", border:"none",
              borderRadius:8, cursor:sending||!body.trim()?"not-allowed":"pointer",
              opacity:sending||!body.trim()?0.4:1,
              fontFamily:F.sans, fontSize:13, fontWeight:600, flexShrink:0 }}>
            Send
          </button>
        </div>
      )}
    </div>
  );
}

// ── ORDER DETAIL PANEL ─────────────────────────────────────────────────────────
function OrderDetailPanel({ order, user, profile, onClose, showToast }) {
  const [tab, setTab]           = useState("timeline");
  const [log, setLog]           = useState([]);
  const [files, setFiles]       = useState([]);
  const [payments, setPayments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadKind, setUploadKind] = useState("other");
  const fileRef = useRef();

  useEffect(() => {
    if (!order) return;
    supabase.from("order_log").select("*").eq("order_id", order.id)
      .order("created_at", { ascending:true }).then(({ data }) => setLog(data||[]));
    loadFiles();
    supabase.from("payments").select("*").eq("order_id", order.id)
      .order("confirmed_at", { ascending:true }).then(({ data }) => setPayments(data||[]));
  }, [order?.id]);

  function loadFiles() {
    supabase.from("order_files").select("*").eq("order_id", order.id)
      .order("created_at", { ascending:false }).then(({ data }) => setFiles(data||[]));
  }

  async function downloadFile(filePath, fileName) {
    const { data, error } = await supabase.storage.from("order-files").createSignedUrl(filePath, 3600);
    if (error) { showToast("Could not generate download link.", "error"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = fileName; a.click();
  }

  async function uploadFile(file) {
    if (!file) return;
    setUploading(true);
    const path = `${order.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("order-files").upload(path, file);
    if (upErr) { showToast("Upload failed.", "error"); setUploading(false); return; }
    await supabase.from("order_files").insert({
      order_id: order.id, file_name: file.name, file_path: path,
      kind: uploadKind, size_bytes: file.size,
    });
    await supabase.from("order_log").insert({
      order_id: order.id,
      actor_name: profile?.name || user?.email,
      event: `Client uploaded: ${file.name}`,
    });
    loadFiles();
    showToast("File uploaded.", "success");
    setUploading(false);
  }

  const waNum = import.meta.env.VITE_WHATSAPP_NUMBER || "12057279363";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000,
      background:"rgba(17,20,24,0.55)", backdropFilter:"blur(6px)",
      display:"flex", justifyContent:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ width:"min(560px,100%)", height:"100vh", background:T.surface,
          display:"flex", flexDirection:"column",
          boxShadow:"-12px 0 60px rgba(17,20,24,0.2)" }}>

        {/* Header */}
        <div style={{ background:T.side, padding:"20px 24px", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1, minWidth:0, marginRight:12 }}>
              <div style={{ fontSize:10, fontFamily:F.mono, color:T.accent, fontWeight:700,
                letterSpacing:"1px", marginBottom:5 }}>{order.ref}</div>
              <div style={{ fontSize:17, fontWeight:600, fontFamily:F.serif, color:"#fff",
                lineHeight:1.25, marginBottom:8 }}>{order.scope_label}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <StatusBadge status={order.status} />
                <PaymentBadge status={order.payment_status} />
              </div>
            </div>
            <button onClick={onClose}
              style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:7, width:30, height:30, flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"rgba(255,255,255,0.6)", fontSize:16, cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ display:"flex", gap:20, marginTop:14, flexWrap:"wrap" }}>
            {[["Level", order.level_label], ["Program", order.program], ["Due", fmtDate(order.due_date)]]
              .filter(([,v])=>v).map(([l,v]) => (
              <div key={l}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", textTransform:"uppercase",
                  letterSpacing:"0.6px", marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          {[["timeline","Timeline"],["files","Files"],["messages","Messages"],["payment","Payment"]].map(([id,lbl]) => (
            <button key={id} onClick={()=>setTab(id)}
              style={{ flex:1, padding:"11px 4px", border:"none",
                borderBottom:tab===id?`2px solid ${T.accent}`:"2px solid transparent",
                background:"transparent", color:tab===id?T.accent:T.inkLight,
                fontSize:12, fontWeight:tab===id?600:500,
                cursor:"pointer", fontFamily:F.sans }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {tab==="timeline" && (
            <div>
              {log.length === 0
                ? <div style={{ color:T.inkLight, fontSize:13, textAlign:"center", padding:24 }}>No activity yet.</div>
                : log.map((entry, i) => (
                  <div key={entry.id||i} style={{ display:"flex", gap:12, marginBottom:4 }}>
                    <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:T.greenBg,
                        border:`1.5px solid ${T.greenBord}`, display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:11, color:T.green, fontWeight:700 }}>✓</div>
                      {i < log.length-1 && <div style={{ width:1, flex:1, minHeight:14, background:T.border, margin:"3px 0" }} />}
                    </div>
                    <div style={{ paddingTop:4, paddingBottom:i<log.length-1?14:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:T.ink }}>{entry.event}</div>
                      <div style={{ fontSize:11, color:T.inkLight, marginTop:2 }}>
                        {fmtDate(entry.created_at)}{entry.actor_name ? ` · ${entry.actor_name}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab==="files" && (
            <div>
              {files.length === 0
                ? <div style={{ color:T.inkLight, fontSize:13, textAlign:"center", padding:20 }}>No files yet.</div>
                : <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                    {files.map(f => (
                      <div key={f.id} style={{ display:"flex", alignItems:"center", gap:10,
                        padding:"10px 12px", background:T.alt, border:`1px solid ${T.border}`, borderRadius:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:T.ink,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.file_name}</div>
                          <div style={{ fontSize:11, color:T.inkLight, marginTop:1 }}>
                            {fmtBytes(f.size_bytes)}{f.size_bytes?" · ":""}{fmtDate(f.created_at)}
                          </div>
                        </div>
                        <KindBadge kind={f.kind} />
                        <button onClick={()=>downloadFile(f.file_path, f.file_name)}
                          style={{ padding:"5px 11px", borderRadius:6, border:`1px solid ${T.border}`,
                            background:T.surface, fontSize:12, fontWeight:600, cursor:"pointer",
                            color:T.inkMid, fontFamily:F.sans, flexShrink:0 }}>↓</button>
                      </div>
                    ))}
                  </div>
              }
              <Divider label="Upload a file" />
              <div style={{ marginBottom:10 }}>
                <FL text="File type" />
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {Object.entries(KIND_CFG).map(([k, c]) => (
                    <button key={k} onClick={()=>setUploadKind(k)}
                      style={{ padding:"4px 11px", borderRadius:99, fontSize:11, fontWeight:600,
                        border:`1px solid ${uploadKind===k?c.color:T.border}`,
                        background:uploadKind===k?c.bg:T.surface,
                        color:uploadKind===k?c.color:T.inkMid, cursor:"pointer" }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <input type="file" ref={fileRef} style={{ display:"none" }}
                onChange={e=>{ if(e.target.files[0]) uploadFile(e.target.files[0]); e.target.value=""; }} />
              <Btn variant="soft" onClick={()=>fileRef.current.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "Choose file →"}
              </Btn>
            </div>
          )}

          {tab==="messages" && (
            <div style={{ height:"calc(100vh - 300px)", display:"flex", flexDirection:"column" }}>
              <MessageThread orderId={order.id} user={user} profile={profile} />
            </div>
          )}

          {tab==="payment" && (
            <div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.inkLight,
                  letterSpacing:"0.6px", textTransform:"uppercase", marginBottom:8 }}>Payment Status</div>
                <PaymentBadge status={order.payment_status} />
              </div>
              {payments.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                  {payments.map((p,i) => (
                    <div key={i} style={{ padding:"12px 14px", background:T.alt,
                      border:`1px solid ${T.border}`, borderRadius:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                        <div style={{ fontSize:15, fontWeight:700, fontFamily:F.mono, color:T.ink }}>
                          ${Number(p.amount||0).toFixed(2)}
                        </div>
                        <div style={{ fontSize:12, color:T.inkLight }}>{p.method}</div>
                      </div>
                      <div style={{ fontSize:11, color:T.inkLight, marginTop:3 }}>
                        {p.type} · {fmtDate(p.confirmed_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {order.payment_status === "unpaid" && (
                <div style={{ padding:"14px 16px", background:T.accentSoft,
                  border:`1px solid ${T.accentMid}`, borderRadius:10 }}>
                  <div style={{ fontSize:13, color:T.accent, fontWeight:600, marginBottom:6 }}>
                    Payment pending
                  </div>
                  <div style={{ fontSize:12, color:T.inkMid, lineHeight:1.6, marginBottom:12 }}>
                    50% deposit secures your slot. Contact us via WhatsApp to arrange payment.
                  </div>
                  <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
                    style={{ display:"inline-block", padding:"8px 16px",
                      background:T.side, color:"#fff", borderRadius:8,
                      fontSize:12, fontWeight:600, textDecoration:"none" }}>
                    Pay via WhatsApp →
                  </a>
                </div>
              )}
              {order.payment_status === "deposit_paid" && (
                <div style={{ padding:"12px 14px", background:T.alt,
                  border:`1px solid ${T.border}`, borderRadius:10,
                  fontSize:13, color:T.inkMid, lineHeight:1.6 }}>
                  Deposit received. Balance due on delivery.
                </div>
              )}
              {order.payment_status === "paid" && (
                <div style={{ padding:"12px 14px", background:T.greenBg,
                  border:`1px solid ${T.greenBord}`, borderRadius:10,
                  fontSize:13, color:T.green, fontWeight:600 }}>
                  ✓ Paid in full — thank you!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ORDER MODAL (Fix 1: client_id at submission) ───────────────────────────────
function OrderModal({ level, program, scope, onClose, onPlaced, onViewOrders }) {
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [email,  setEmail]  = useState("");
  const [due,    setDue]    = useState("");
  const [access, setAccess] = useState("portal");
  const [pay,    setPay]    = useState("M-Pesa");
  const [brief,  setBrief]  = useState(null);
  const [notes,  setNotes]  = useState("");
  const [errs,   setErrs]   = useState({});
  const [loading,setLoading]= useState(false);
  const [done,   setDone]   = useState(false);
  const [oid,    setOid]    = useState("");
  const [blockedUrl,setBlockedUrl]= useState(null);
  const hue = level?.hue || T.accent;
  const fn = name.trim().split(" ")[0];

  useEffect(() => {
    const fn = e => { if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  async function submit() {
    const e = {};
    if(!name.trim())  e.name=true;
    if(!phone.trim()) e.phone=true;
    if(!due)          e.due=true;
    setErrs(e);
    if(Object.keys(e).length) return;
    setLoading(true);

    let ref = "MS-"+Date.now().toString().slice(-5);

    try {
      const { data: refData } = await supabase.rpc("generate_order_ref");
      if (refData) ref = refData;

      // Fix 1: get current session to set client_id if already signed in
      const { data: { session } } = await supabase.auth.getSession();

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          ref,
          level:          level?.id,
          level_label:    level?.label,
          program,
          scope_id:       scope?.id,
          scope_label:    scope?.label,
          has_project:    scope?.hasProject || false,
          is_bundle:      scope?.bundle || false,
          rate_writing:   level?.rW,
          rate_project:   level?.rP || null,
          due_date:       due || null,
          access_method:  access,
          payment_method: pay,
          notes:          notes || null,
          client_name:    name,
          client_phone:   phone,
          client_email:   email || null,
          status:         "new",
          payment_status: "unpaid",
          // Fix 1: set client_id if user is already signed in
          client_id:      session?.user?.id || null,
        })
        .select().single();

      if (orderErr) throw orderErr;

      if (brief && order) {
        const path = `${order.id}/${Date.now()}-${brief.name}`;
        const { error: upErr } = await supabase.storage.from("order-files").upload(path, brief);
        if (!upErr) {
          await supabase.from("order_files").insert({
            order_id: order.id, file_name: brief.name,
            file_path: path, kind: "brief", size_bytes: brief.size,
          });
        }
      }

      if (order) {
        await supabase.from("order_log").insert({
          order_id: order.id, actor_name: name, event: "Order created",
        });
      }
    } catch (err) {
      console.warn("Order write failed:", err);
    }

    setOid(ref);
    setLoading(false);
    setDone(true);
    if (onPlaced) onPlaced({ ref, scopeLabel:scope?.label||"Order", level:level?.label, program, due });
  }

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:1000,
        background:"rgba(17,20,24,0.55)", backdropFilter:"blur(6px)",
        display:"flex", justifyContent:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ width:"min(560px,100%)", height:"100vh", background:T.surface,
          display:"flex", flexDirection:"column", overflowY:"auto",
          boxShadow:"-12px 0 60px rgba(17,20,24,0.2)" }}>

        {done ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", padding:40,
            textAlign:"center", background:T.side }}>
            <div style={{ fontSize:48, marginBottom:20 }}>✅</div>
            <div style={{ fontSize:28, fontWeight:600, fontFamily:F.serif, color:"#fff", marginBottom:10 }}>
              {fn ? `Order placed, ${fn}.` : "Order placed."}
            </div>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", maxWidth:360,
              lineHeight:1.8, marginBottom:28, fontFamily:F.sans }}>
              We'll review your brief and confirm the quote within a few hours.
              You can track progress, upload files, and message us from your workspace.
            </div>

            {/* Order ref */}
            <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:10, padding:"14px 28px", marginBottom:28 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase",
                color:"rgba(255,255,255,0.3)", fontFamily:F.sans, marginBottom:4 }}>Order Reference</div>
              <div style={{ fontSize:22, fontWeight:600, fontFamily:F.mono, color:hue }}>{oid}</div>
            </div>

            {/* CTA: go to My Orders */}
            <button onClick={onViewOrders || onClose}
              style={{ width:"100%", maxWidth:280, padding:"12px 0", marginBottom:12,
                background:hue, color:"#fff", border:"none", borderRadius:8,
                fontSize:13, fontWeight:600, fontFamily:F.sans, cursor:"pointer" }}>
              View in My Orders →
            </button>

            {/* Subtle WhatsApp fallback — not auto-opened */}
            <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER||"12057279363"}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:F.sans,
                textDecoration:"none" }}>
              Questions? Message us on WhatsApp
            </a>
          </div>
        ) : (<>
          <div style={{ background:T.side, padding:"20px 24px", flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:9, letterSpacing:"2px", textTransform:"uppercase",
                  color:hue, fontFamily:F.sans, fontWeight:700, marginBottom:5 }}>New Order</div>
                <div style={{ fontSize:17, fontWeight:600, fontFamily:F.serif,
                  color:"#fff", lineHeight:1.25, marginBottom:3 }}>
                  {scope?.label || "Place an Order"}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontFamily:F.sans }}>
                  {[level?.label, program].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button onClick={onClose}
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:7, width:30, height:30, display:"flex", alignItems:"center",
                  justifyContent:"center", color:"rgba(255,255,255,0.6)", fontSize:16, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ marginTop:14, padding:"10px 14px",
              background:"rgba(255,255,255,0.05)", borderRadius:8,
              display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", fontFamily:F.sans,
                  letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:2 }}>Writing rate</div>
                <div style={{ fontSize:16, fontWeight:600, fontFamily:F.mono, color:hue }}>${level?.rW}/page</div>
              </div>
              {level?.rP && scope?.hasProject && (<>
                <div style={{ width:1, height:24, background:"rgba(255,255,255,0.1)" }} />
                <div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", fontFamily:F.sans,
                    letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:2 }}>Project rate</div>
                  <div style={{ fontSize:16, fontWeight:600, fontFamily:F.mono, color:hue }}>${level?.rP}/page</div>
                </div>
              </>)}
              <div style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,0.25)",
                fontFamily:F.sans, fontStyle:"italic" }}>Quote confirmed after brief review</div>
            </div>
          </div>

          <div style={{ flex:1, padding:"22px 24px", overflowY:"auto" }}>
            {scope?.orderNote && (
              <div style={{ background:level?.hueSoft||T.accentSoft, border:`1px solid ${T.accentMid}`,
                borderRadius:8, padding:"10px 14px", marginBottom:20,
                fontSize:12, color:T.inkMid, fontFamily:F.sans, lineHeight:1.6 }}>
                {scope.orderNote}
              </div>
            )}
            <Divider label="Your Details" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <TInput label="Full Name" value={name} onChange={setName} placeholder="Jane Doe" req err={errs.name} />
              <TInput label="WhatsApp" value={phone} onChange={setPhone} placeholder="+1 281 677 0283" req err={errs.phone} />
            </div>
            <TInput label="Email (optional)" value={email} onChange={setEmail} type="email" placeholder="you@email.com" />
            {(errs.name||errs.phone) && (
              <div style={{ fontSize:11, color:T.accent, marginTop:-8, marginBottom:14, fontFamily:F.sans }}>
                Name and WhatsApp are required.
              </div>
            )}
            <Divider label="Assignment" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <TInput label="Due Date" value={due} onChange={setDue} type="date" req err={errs.due}
                min={new Date().toISOString().slice(0,10)} />
              <div style={{ marginBottom:14 }}>
                <FL text="Course Access" />
                <Seg value={access} onChange={setAccess}
                  options={[{v:"portal",l:"Upload brief"},{v:"device",l:"Dedicated device"}]} />
              </div>
            </div>
            {access==="device" && (
              <div style={{ background:T.alt, border:`1px solid ${T.border}`, borderRadius:8,
                padding:"10px 14px", marginBottom:14, fontSize:12, color:T.inkMid, fontFamily:F.sans, lineHeight:1.6 }}>
                We'll coordinate a dedicated school device with TeamViewer.
                We never access your institutional portal from our own equipment.
              </div>
            )}
            <FL text="Brief / Rubric" />
            <FileZone file={brief} onFile={setBrief} />
            <div style={{ marginBottom:14 }}>
              <FL text="Special Instructions (optional)" />
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
                aria-label="Special instructions (optional)"
                placeholder="Faculty preferences, continuation from prior work, specific requirements…"
                style={{ width:"100%", padding:"10px 13px", boxSizing:"border-box",
                  border:`1.5px solid ${T.border}`, borderRadius:8, fontSize:13,
                  fontFamily:F.sans, color:T.ink, background:T.surface, outline:"none", resize:"vertical" }} />
            </div>
            <Divider label="Payment" />
            <div style={{ marginBottom:14 }}>
              <FL text="Preferred Method" />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                {["M-Pesa","Sendwave","Payoneer","Wise","Bank Transfer","Other"].map(m => (
                  <button key={m} onClick={()=>setPay(m)}
                    style={{ padding:"8px 10px", borderRadius:7, fontSize:12, fontWeight:500,
                      border:`1px solid ${pay===m?hue:T.border}`,
                      background:pay===m?level?.hueSoft||T.accentSoft:T.surface,
                      color:pay===m?hue:T.inkMid, cursor:"pointer", fontFamily:F.sans }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize:12, color:T.inkMid, lineHeight:1.65, background:T.alt,
              border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 14px", fontFamily:F.sans }}>
              50% deposit secures your slot. Balance paid on delivery.
              Confirmed quote arrives via WhatsApp within a few hours.
            </div>
          </div>

          <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}`,
            background:T.surface, flexShrink:0 }}>
            {errs.due && (
              <div style={{ fontSize:11, color:T.accent, marginBottom:8, fontFamily:F.sans }}>
                Please set a due date to continue.
              </div>
            )}
            <Btn variant="dark" size="lg" full onClick={submit} disabled={loading}
              sx={{ background:loading?T.inkMid:T.side }}>
              {loading ? "Placing order…" : fn ? `Confirm Order, ${fn} →` : "Confirm Order →"}
            </Btn>
            <div style={{ fontSize:11, color:T.inkLight, textAlign:"center", marginTop:8, fontFamily:F.sans }}>
              Press Esc to close · No payment taken at this stage
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── CATALOG PAGE ───────────────────────────────────────────────────────────────
function CatalogPage({ onGoDesk }) {
  const [lvId,         setLvId]         = useState("dnp");
  const [prog,         setProg]         = useState(PROGRAMS.dnp[0]);
  const [scope,        setScope]        = useState(null);
  const [showR,        setShowR]        = useState(false);
  const [modal,        setModal]        = useState(false);
  const [levelTouched, setLevelTouched] = useState(false);
  const [progTouched,  setProgTouched]  = useState(false);

  const lv   = LEVELS.find(l=>l.id===lvId);
  const prgs = PROGRAMS[lvId]||[];
  const sc   = ALL_SCOPES.find(s=>s.id===scope);
  const hue  = lv.hue;
  const maxW = Math.max(...LEVELS.map(l=>l.rW));
  const maxP = Math.max(...LEVELS.map(l=>l.rP||0));

  const lvlRef = useRef(null);
  function chgLv(id) { setLvId(id); setScope(null); setProg(PROGRAMS[id]?.[0]||""); setLevelTouched(true); }
  function scrollTo(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior:"smooth", block:"start" }); }
  // Arrow-key navigation across the level radiogroup
  function levelKey(e) {
    const idx = LEVELS.findIndex(l=>l.id===lvId);
    let next = idx;
    if (e.key==="ArrowRight"||e.key==="ArrowDown") { e.preventDefault(); next=(idx+1)%LEVELS.length; }
    else if (e.key==="ArrowLeft"||e.key==="ArrowUp") { e.preventDefault(); next=(idx-1+LEVELS.length)%LEVELS.length; }
    else return;
    chgLv(LEVELS[next].id);
    lvlRef.current?.querySelectorAll('[role="radio"]')?.[next]?.focus();
  }
  const steps = [{l:"Level",done:levelTouched,id:"cat-level"},{l:"Program",done:progTouched,id:"cat-prog"},{l:"Scope",done:!!scope,id:"cat-scope"}];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:F.sans, background:T.bg }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
        padding:"0 28px", height:56, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:10 }}>
        <a href="/"
          style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", color:"inherit" }}>
          <div aria-hidden="true" style={{ width:28, height:28, borderRadius:"50%",
            background:`conic-gradient(from 220deg, ${hue}, #111418)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:700, color:"#fff" }}>M</div>
          <span style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.3px" }}>Meridian Studio</span>
          <span aria-hidden="true" style={{ color:T.borderMid, fontWeight:300, margin:"0 4px" }}>/</span>
          <span style={{ fontSize:13, color:T.inkLight }}>Order catalog</span>
        </a>
        <nav aria-label="Catalog" style={{ display:"flex", gap:20, alignItems:"center", fontSize:13 }}>
          <span aria-current="page" style={{ color:T.ink, fontWeight:600,
            borderBottom:`2px solid ${hue}`, paddingBottom:2 }}>Catalog</span>
          <button onClick={()=>onGoDesk("orders")}
            style={{ color:T.inkLight, fontWeight:400, background:"transparent", border:"none",
              borderBottom:"2px solid transparent", paddingBottom:2, cursor:"pointer",
              fontSize:13, fontFamily:F.sans }}>
            My orders
          </button>
          <button onClick={()=>onGoDesk("orders")}
            style={{ padding:"6px 14px", borderRadius:99, border:`1px solid ${T.border}`,
              background:T.surface, fontSize:12, color:T.inkMid,
              cursor:"pointer", fontFamily:F.sans, fontWeight:500 }}>
            Sign in
          </button>
        </nav>
      </header>

      <main id="main-content" style={{ flex:1, overflowY:"auto", padding:"28px 28px 120px",
        maxWidth:1040, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24, fontSize:12 }}>
          {steps.map((s,i) => (
            <Fragment key={s.l}>
              {i>0 && <div style={{ width:20, height:1, background:T.border }} />}
              <div onClick={()=>scrollTo(s.id)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:99,
                border:`1px solid ${s.done?T.greenBord:i===2&&!scope?T.ink:T.border}`,
                background:s.done?T.greenBg:i===2&&!scope?T.ink:T.surface,
                color:s.done?T.green:i===2&&!scope?"#fff":T.inkLight, fontWeight:500,
                cursor:"pointer", userSelect:"none" }}>
                <span style={{ width:16, height:16, borderRadius:"50%", fontSize:9, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:s.done?T.green:i===2&&!scope?"#fff":T.border,
                  color:s.done?"#fff":i===2&&!scope?T.ink:T.inkLight }}>
                  {s.done?"✓":(i+1)}
                </span>
                {s.l}
              </div>
            </Fragment>
          ))}
        </div>

        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:30, fontWeight:600, letterSpacing:"-0.5px",
            fontFamily:F.serif, color:T.ink, marginBottom:6 }}>What can we help you with?</h1>
          <p style={{ fontSize:14, color:T.inkMid, maxWidth:560, lineHeight:1.6 }}>
            Tell us your level, program, and scope. We'll send a confirmed quote
            via WhatsApp once we've reviewed your brief.
          </p>
        </div>

        <div id="cat-level" style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
          padding:"20px 22px", marginBottom:20, boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
          <div id="cat-level-label" style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
            textTransform:"uppercase", color:T.inkLight, marginBottom:12 }}>Your context</div>
          <div role="radiogroup" aria-labelledby="cat-level-label" ref={lvlRef}
            style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
            {LEVELS.map(l => {
              const on = l.id===lvId;
              return (
                <button key={l.id} role="radio" aria-checked={on} tabIndex={on?0:-1}
                  onClick={()=>chgLv(l.id)}
                  onKeyDown={e=>levelKey(e)}
                  style={{ display:"flex", alignItems:"center", gap:8,
                    padding:"7px 12px 7px 8px", borderRadius:99, cursor:"pointer",
                    border:`1px solid ${on?l.hue:T.border}`, background:on?l.hue+"18":T.surface,
                    transition:"all 0.12s", fontFamily:F.sans }}>
                  <div aria-hidden="true" style={{ width:22, height:22, borderRadius:"50%",
                    background:on?l.hue:T.alt, color:on?"#fff":T.inkLight,
                    fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {l.abbr}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:on?600:500, color:on?l.hue:T.inkMid }}>{l.label}</span>
                  {on && <span style={{ fontSize:11, color:l.hue, marginLeft:2 }}>· {l.sub}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:14, alignItems:"end" }}>
            <div>
              <div id="cat-prog" style={{ fontSize:12, color:T.inkLight, marginBottom:6 }}>School & program</div>
              <select value={prog} aria-label="School and program"
                onChange={e=>{ setProg(e.target.value); setProgTouched(true); setScope(null); }}
                style={{ width:"100%", padding:"10px 14px", border:`1px solid ${T.border}`,
                  borderRadius:10, fontSize:13.5, fontFamily:F.sans, color:T.ink,
                  background:T.surface, outline:"none", appearance:"none",
                  backgroundImage:`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>")`,
                  backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center", paddingRight:36 }}>
                {prgs.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>
              <button onClick={()=>setShowR(p=>!p)}
                style={{ fontSize:11, color:hue, fontWeight:600, background:"transparent",
                  border:"none", cursor:"pointer", fontFamily:F.sans, padding:0 }}>
                {showR?"▲ Hide rates":"▼ View rates"}
              </button>
              <div style={{ display:"flex", gap:6 }}>
                <div style={{ padding:"5px 11px", borderRadius:99, fontSize:11,
                  background:hue+"12", color:hue, fontWeight:600, border:`1px solid ${hue}25` }}>
                  Writing ${lv.rW}/pg
                </div>
                {lv.rP && (
                  <div style={{ padding:"5px 11px", borderRadius:99, fontSize:11,
                    background:T.accentSoft, color:T.accent, fontWeight:600, border:`1px solid ${T.accentMid}` }}>
                    Project ${lv.rP}/pg
                  </div>
                )}
              </div>
            </div>
          </div>
          {showR && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
              {[{k:"Writing",f:"rW",max:maxW},{k:"Project",f:"rP",max:maxP}].map(({k,f,max}) => (
                <div key={k} style={{ background:T.alt, border:`1px solid ${T.border}`, borderRadius:9, padding:"12px 14px" }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.8px",
                    textTransform:"uppercase", color:T.inkLight, marginBottom:10 }}>
                    {k} rate — all levels
                  </div>
                  {LEVELS.map(l => {
                    const r=l[f]||0, pct=max>0?(r/max)*100:0, on=l.id===lvId;
                    return (
                      <div key={l.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                        <div style={{ width:80, fontSize:10, color:on?l.hue:T.inkMid, fontWeight:on?700:400 }}>{l.label}</div>
                        <div style={{ flex:1, height:5, background:T.border, borderRadius:3, overflow:"hidden" }}>
                          {r>0 && <div style={{ width:`${pct}%`, height:"100%", background:on?l.hue:T.borderMid, borderRadius:3 }} />}
                        </div>
                        <div style={{ width:52, fontSize:10, fontFamily:F.mono, textAlign:"right",
                          color:on?l.hue:T.inkLight, fontWeight:on?700:400 }}>
                          {r>0?`$${r}/pg`:"—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:12, fontSize:12, color:T.inkLight, fontFamily:F.sans, lineHeight:1.55, fontStyle:"italic" }}>
            {lv.rateContext}
          </div>
        </div>

        <div id="cat-scope">
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
            textTransform:"uppercase", color:T.inkLight, marginBottom:14 }}>
            Pick a scope that fits your situation
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {SCOPE_TIERS.map(tier => {
              const tierSel = tier.options.some(o=>o.id===scope);
              const iconBg  = tier.id==="single"?T.alt:tier.id==="partial"?hue+"20":T.side;
              const iconClr = tier.id==="single"?T.inkMid:tier.id==="partial"?hue:"#fff";
              return (
                <div key={tier.id}
                  style={{ background:T.surface, border:`1px solid ${tierSel?hue+"55":T.border}`,
                    borderRadius:14, padding:"18px 18px 14px",
                    boxShadow:tierSel?`0 8px 28px ${hue}18`:"0 1px 3px rgba(17,20,24,0.03)",
                    display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                      background:iconBg, color:iconClr, display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:14, fontWeight:700 }}>{tier.icon}</div>
                    {tier.id==="complete" && (
                      <div style={{ padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700,
                        letterSpacing:"0.5px", textTransform:"uppercase", background:hue, color:"#fff" }}>
                        Most popular
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:T.ink, marginBottom:3 }}>{tier.title}</div>
                    <div style={{ fontSize:12, color:T.inkLight, lineHeight:1.5 }}>{tier.summary}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {tier.options.map(opt => {
                      const on = opt.id===scope;
                      return (
                        <div key={opt.id} onClick={()=>setScope(opt.id)}
                          style={{ padding:"10px 12px", borderRadius:9, cursor:"pointer",
                            border:`1px solid ${on?hue:T.border}`, background:on?hue+"08":T.alt,
                            display:"flex", alignItems:"flex-start", gap:9 }}>
                          <RadioDot on={on} hue={hue} />
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12.5, fontWeight:600, color:on?hue:T.ink, marginBottom:2 }}>{opt.label}</div>
                            <div style={{ fontSize:11, color:T.inkLight, lineHeight:1.5 }}>{opt.detail}</div>
                            <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
                              {opt.bundle  && <Badge color={T.green} bg={T.greenBg} border={T.greenBord}>10% bundle</Badge>}
                              {opt.doctoral && <Badge color={T.accent} bg={T.accentSoft} border={T.accentMid}>+ Project rate</Badge>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:10,
        background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)",
        borderTop:`1px solid ${T.border}`, padding:"14px 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>
            {sc ? sc.label : "Select a scope to continue"}
          </div>
          <div style={{ fontSize:11.5, color:T.inkLight, marginTop:2 }}>
            {lv.label} · {prog.length>36?prog.slice(0,36)+"…":prog}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", gap:6 }}>
            <div style={{ fontSize:11, color:T.inkMid, padding:"6px 11px",
              background:T.alt, border:`1px solid ${T.border}`, borderRadius:8 }}>
              Writing <span style={{ color:hue, fontWeight:700, fontFamily:F.mono }}>${lv.rW}</span>/pg
            </div>
            {lv.rP && (
              <div style={{ fontSize:11, color:T.inkMid, padding:"6px 11px",
                background:T.alt, border:`1px solid ${T.border}`, borderRadius:8 }}>
                Project <span style={{ color:hue, fontWeight:700, fontFamily:F.mono }}>${lv.rP}</span>/pg
              </div>
            )}
          </div>
          <button onClick={()=>{ if(sc) setModal(true); }} disabled={!sc}
            style={{ padding:"11px 22px", fontSize:13.5, fontWeight:600,
              background:sc?T.side:T.border, color:sc?"#fff":T.inkLight,
              border:"none", borderRadius:10, cursor:sc?"pointer":"not-allowed",
              fontFamily:F.sans, boxShadow:sc?"0 4px 12px rgba(17,20,24,0.15)":"none" }}>
            {sc ? "Continue →" : "Pick a scope"}
          </button>
        </div>
      </div>

      {modal && <OrderModal level={lv} program={prog} scope={sc}
        onClose={()=>{ setModal(false); setScope(null); }}
        onViewOrders={()=>{ setModal(false); setScope(null); onGoDesk("orders"); }} />}
    </div>
  );
}

// ── MY ORDERS TAB ──────────────────────────────────────────────────────────────
function MyOrdersTab({ user, orders, ordersLoading, onViewOrder }) {
  const [signInEmail,   setSignInEmail]   = useState("");
  const [signInSent,    setSignInSent]    = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInErr,     setSignInErr]     = useState("");

  async function handleSignIn() {
    const email = signInEmail.trim();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setSignInErr("Please enter a valid email address.");
      return;
    }
    setSignInLoading(true); setSignInErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/workspace` },
    });
    if (error) { setSignInErr(error.message); setSignInLoading(false); }
    else { setSignInSent(true); setSignInLoading(false); }
  }

  if (!user) {
    return (
      <div>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:600, color:T.ink, marginBottom:3 }}>My Orders</h1>
          <p style={{ fontSize:13, color:T.inkLight }}>Sign in to track your orders.</p>
        </div>
        {!signInSent ? (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:12, padding:36, maxWidth:440 }}>
            <div style={{ fontSize:18, fontWeight:600, fontFamily:F.serif, color:T.ink, marginBottom:6 }}>
              Sign in to track your orders
            </div>
            <div style={{ fontSize:13, color:T.inkLight, lineHeight:1.7, marginBottom:20 }}>
              Enter your email and we'll send a magic link — no password needed.
            </div>
            <TInput label="Email address" value={signInEmail} onChange={setSignInEmail}
              type="email" placeholder="you@email.com" req
              err={!!signInErr} errorMsg={signInErr} />
            <Btn full onClick={handleSignIn} disabled={signInLoading}>
              {signInLoading ? "Sending…" : "Send magic link →"}
            </Btn>
          </div>
        ) : (
          <div role="status" style={{ background:T.greenBg, border:`1px solid ${T.greenBord}`,
            borderRadius:12, padding:36, maxWidth:440, textAlign:"center" }}>
            <div aria-hidden="true" style={{ fontSize:36, marginBottom:12 }}>✉️</div>
            <div style={{ fontSize:17, fontWeight:600, fontFamily:F.serif, color:T.ink, marginBottom:8 }}>
              Check your inbox
            </div>
            <div style={{ fontSize:13, color:T.inkMid, lineHeight:1.7 }}>
              We sent a magic link to <strong>{signInEmail}</strong>.<br/>
              Click it to sign in and see your orders.
            </div>
            <button onClick={()=>{ setSignInSent(false); setSignInErr(""); }}
              style={{ marginTop:20, fontSize:12, color:T.inkLight, background:"transparent",
                border:"none", cursor:"pointer", fontFamily:F.sans, textDecoration:"underline", padding:0 }}>
              Didn't get it? Resend
            </button>
          </div>
        )}
      </div>
    );
  }

  const waNum = import.meta.env.VITE_WHATSAPP_NUMBER || "12057279363";

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:600, color:T.ink, marginBottom:3 }}>My Orders</h1>
        <p style={{ fontSize:13, color:T.inkLight }}>
          {ordersLoading ? "Loading…" : `${orders.length} order${orders.length!==1?"s":""} for ${user.email}`}
        </p>
      </div>
      {ordersLoading ? (
        <div style={{ padding:40, textAlign:"center", color:T.inkLight, fontSize:13 }}>
          Loading your orders…
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`,
          borderRadius:12, padding:52, textAlign:"center", maxWidth:520 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:18, fontWeight:600, fontFamily:F.serif, color:T.ink, marginBottom:10 }}>
            No orders found
          </div>
          <div style={{ fontSize:13, color:T.inkLight, lineHeight:1.7, marginBottom:20, maxWidth:360, margin:"0 auto 20px" }}>
            No orders found for {user.email}.<br/>
            If you placed an order before signing in, it should appear here automatically.
            If it doesn't, contact us via WhatsApp.
          </div>
          <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
            style={{ display:"inline-block", padding:"9px 20px", background:T.side,
              color:"#fff", borderRadius:8, fontSize:13, fontWeight:600, textDecoration:"none" }}>
            Contact via WhatsApp →
          </a>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {orders.map(o => (
            <div key={o.id} style={{ background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:10, padding:"16px 20px",
              boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:10, fontFamily:F.mono, color:T.accent,
                    fontWeight:700, letterSpacing:"1px", marginBottom:4 }}>{o.ref}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>{o.scope_label}</div>
                  <div style={{ fontSize:12, color:T.inkLight, marginTop:2 }}>
                    {[o.level_label, o.program].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontSize:11, color:T.inkLight, marginBottom:2 }}>Due</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>
                    {o.due_date ? fmtDate(o.due_date) : "TBD"}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                  <StatusBadge status={o.status} />
                  <PaymentBadge status={o.payment_status} />
                  {o.order_files?.length > 0 && (
                    <div style={{ fontSize:11, color:T.inkLight, padding:"3px 8px",
                      border:`1px solid ${T.border}`, borderRadius:99 }}>
                      {o.order_files.length} file{o.order_files.length!==1?"s":""}
                    </div>
                  )}
                </div>
                <button onClick={()=>onViewOrder(o)}
                  style={{ fontSize:12, fontWeight:600, color:T.accent, background:"transparent",
                    border:"none", cursor:"pointer", fontFamily:F.sans, whiteSpace:"nowrap",
                    padding:"4px 0" }}>
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MESSAGES TAB ───────────────────────────────────────────────────────────────
function MessagesTab({ user, orders, profile }) {
  const [selOrder, setSelOrder] = useState(null);

  useEffect(() => {
    if (orders.length > 0 && !selOrder) setSelOrder(orders[0]);
  }, [orders]);

  if (!user) {
    return (
      <div>
        <h1 style={{ fontSize:22, fontWeight:600, color:T.ink, marginBottom:8 }}>Messages</h1>
        <div style={{ color:T.inkLight, fontSize:13 }}>Sign in to view messages.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:600, color:T.ink, marginBottom:3 }}>Messages</h1>
        <p style={{ fontSize:13, color:T.inkLight }}>Order-specific conversations with our team.</p>
      </div>
      {orders.length === 0 ? (
        <div style={{ color:T.inkLight, fontSize:13 }}>
          No orders yet — place an order first to start a conversation.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"210px 1fr", gap:16, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {orders.map(o => (
              <div key={o.id} onClick={()=>setSelOrder(o)}
                style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer",
                  background:selOrder?.id===o.id?T.alt:T.surface,
                  border:`1px solid ${selOrder?.id===o.id?T.borderMid:T.border}` }}>
                <div style={{ fontSize:10, fontFamily:F.mono, color:T.accent, fontWeight:700, marginBottom:2 }}>
                  {o.ref}
                </div>
                <div style={{ fontSize:12, fontWeight:500, color:T.ink, marginBottom:5, lineHeight:1.3 }}>
                  {o.scope_label}
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:10, padding:"16px 18px", height:480, display:"flex", flexDirection:"column" }}>
            {selOrder
              ? <MessageThread orderId={selOrder.id} user={user} profile={profile} />
              : <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                  color:T.inkLight, fontSize:13 }}>Select an order to view messages</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── RATE SHEET TAB ─────────────────────────────────────────────────────────────
function RateSheetTab() {
  const [dbRates, setDbRates] = useState(null);

  useEffect(() => {
    supabase.from("settings").select("value").eq("key","rates").single()
      .then(({ data }) => { if (data?.value) setDbRates(data.value); });
  }, []);

  const display = LEVELS.map(l => ({
    ...l,
    rW: dbRates?.[l.id]?.rW ?? l.rW,
    rP: dbRates?.[l.id]?.rP ?? l.rP,
  }));

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:600, color:T.ink, marginBottom:3 }}>Rate Sheet</h1>
        <p style={{ fontSize:13, color:T.inkLight }}>Current per-page rates by academic level.</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {display.map(l => (
          <div key={l.id} style={{ background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:16 }}>
            <div style={{ width:42, height:42, borderRadius:10, flexShrink:0,
              background:l.hue+"15", border:`1px solid ${l.hue}30`,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:l.hue, fontWeight:700, fontSize:11 }}>{l.abbr}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>{l.label}</div>
              <div style={{ fontSize:12, color:T.inkLight, marginTop:1, marginBottom:6 }}>{l.sub}</div>
              <div style={{ fontSize:11, color:T.inkLight, fontStyle:"italic", lineHeight:1.55 }}>
                {l.rateContext}
              </div>
            </div>
            <div style={{ display:"flex", gap:16, alignItems:"center", flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:T.inkLight, marginBottom:2 }}>Writing</div>
                <div style={{ fontSize:17, fontWeight:700, fontFamily:F.mono, color:l.hue }}>${l.rW}/pg</div>
              </div>
              {l.rP && (
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:T.inkLight, marginBottom:2 }}>Project</div>
                  <div style={{ fontSize:17, fontWeight:700, fontFamily:F.mono, color:T.accent }}>${l.rP}/pg</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:"14px 18px", background:T.alt, border:`1px solid ${T.border}`,
        borderRadius:10, fontSize:12, color:T.inkMid, lineHeight:1.75 }}>
        Rates are per page of written content · Final quote confirmed after brief review ·
        10% bundle saving applies to partial and full program scopes ·
        50% deposit secures your slot · Balance paid on delivery
      </div>
    </div>
  );
}

// ── MY PROFILE TAB ─────────────────────────────────────────────────────────────
function MyProfileTab({ user, profile, setProfile, showToast }) {
  const [form, setForm]   = useState({ name:"", phone:"", school:"", program:"" });
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({ name:profile.name||"", phone:profile.phone||"",
                school:profile.school||"", program:profile.program||"" });
      setDirty(false);
    }
  }, [profile]);

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]:value }));
    setDirty(true);
  }

  async function save() {
    setLoading(true);
    const { data, error } = await supabase.from("profiles")
      .update({ name:form.name, phone:form.phone, school:form.school, program:form.program })
      .eq("id", user.id).select().single();
    if (error) {
      showToast("Failed to save profile.", "error");
    } else {
      setProfile(data);
      setDirty(false);
      showToast("Profile updated.", "success");
    }
    setLoading(false);
  }

  if (!user) {
    return (
      <div>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:600, color:T.ink, marginBottom:3 }}>My Profile</h1>
          <p style={{ fontSize:13, color:T.inkLight }}>Manage your account details.</p>
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`,
          borderRadius:12, padding:36, maxWidth:440 }}>
          <div style={{ fontSize:18, fontWeight:600, fontFamily:F.serif, color:T.ink, marginBottom:6 }}>
            Sign in to view your profile
          </div>
          <div style={{ fontSize:13, color:T.inkLight, lineHeight:1.7 }}>
            Your profile is linked to your account. Sign in from the My Orders tab to access it.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:600, color:T.ink, marginBottom:3 }}>My Profile</h1>
        <p style={{ fontSize:13, color:T.inkLight }}>Your account details.</p>
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`,
        borderRadius:12, padding:"24px 28px", maxWidth:520 }}>
        <TInput label="Full Name" value={form.name} onChange={v=>handleChange("name",v)} placeholder="Jane Doe" />
        <TInput label="WhatsApp Number" value={form.phone} onChange={v=>handleChange("phone",v)} placeholder="+1 281 677 0283" />
        <div style={{ marginBottom:14 }}>
          <FL text="Email" />
          <input value={user?.email||""} disabled aria-label="Email (cannot be changed)"
            style={{ width:"100%", padding:"10px 13px", boxSizing:"border-box",
              border:`1.5px solid ${T.border}`, borderRadius:8, fontSize:14,
              fontFamily:F.sans, color:T.inkMid, background:T.alt, outline:"none" }} />
          <div style={{ fontSize:11, color:T.inkLight, marginTop:4 }}>Email cannot be changed here.</div>
        </div>
        <TInput label="School / University" value={form.school} onChange={v=>handleChange("school",v)} placeholder="Walden University" />
        <TInput label="Program" value={form.program} onChange={v=>handleChange("program",v)} placeholder="MSN PMHNP" />
        {profile?.created_at && (
          <div style={{ fontSize:12, color:T.inkLight, marginBottom:18 }}>
            Member since {fmtDate(profile.created_at)}
          </div>
        )}
        <Btn onClick={save} disabled={!dirty||loading}>
          {loading ? "Saving…" : "Save Changes"}
        </Btn>
      </div>
    </div>
  );
}

// ── WORKSPACE PAGE ─────────────────────────────────────────────────────────────
function WorkspacePage({ onGoCatalog, onAdmin, defaultNav="orders", user }) {
  const [nav,           setNav]           = useState(defaultNav);
  const [orders,        setOrders]        = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [profile,       setProfile]       = useState(null);
  const [selOrder,      setSelOrder]      = useState(null);
  const [toast,         setToast]         = useState(null);

  // New order form state
  const [lvId,  setLvId]  = useState("dnp");
  const [prog,  setProg]  = useState(PROGRAMS.dnp[0]);
  const [scope, setScope] = useState(null);
  const [showR, setShowR] = useState(false);
  const [modal, setModal] = useState(false);

  function showToast(message, type="info") {
    setToast({ message, type, id:Date.now() });
    setTimeout(() => setToast(null), 4000);
  }

  async function fetchClientOrders(userId) {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_files(id, file_name, file_path, kind, created_at, size_bytes)")
      .eq("client_id", userId)
      .order("created_at", { ascending:false });
    if (error) showToast("Failed to load orders.", "error");
    else setOrders(data || []);
    setOrdersLoading(false);
  }

  async function fetchProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  }

  useEffect(() => {
    if (!user) { setOrders([]); setProfile(null); return; }
    fetchClientOrders(user.id);
    fetchProfile(user.id);
  }, [user]);

  // Realtime: update order cards when status/payment changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("client-orders-rt-" + user.id)
      .on("postgres_changes", {
        event:"UPDATE", schema:"public", table:"orders",
        filter:`client_id=eq.${user.id}`,
      }, payload => {
        setOrders(prev => prev.map(o => o.id===payload.new.id ? { ...o, ...payload.new } : o));
        showToast(`Order ${payload.new.ref} updated.`, "info");
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  const lv   = LEVELS.find(l=>l.id===lvId);
  const prgs = PROGRAMS[lvId]||[];
  const sc   = ALL_SCOPES.find(s=>s.id===scope);
  const hue  = lv?.hue || T.accent;
  const maxW = Math.max(...LEVELS.map(l=>l.rW));
  const maxP = Math.max(...LEVELS.map(l=>l.rP||0));

  function chgLv(id) { setLvId(id); setScope(null); setProg(PROGRAMS[id]?.[0]||""); }

  async function handleSignOut() { await supabase.auth.signOut(); }

  const navItems = [
    { id:"orders",   label:"My Orders" },
    { id:"messages", label:"Messages" },
    { id:"rates",    label:"Rate Sheet" },
    { id:"profile",  label:"My Profile" },
    { id:"new",      label:"New Order" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column",
      height:"100%", fontFamily:F.sans, background:T.bg }}>
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Shared brand header — connective tissue with the homepage */}
      <header role="banner" style={{ background:"#FAF9F7", borderBottom:"1px solid #E8E5E0",
        padding:"0 20px", height:64, display:"flex", alignItems:"center", flexShrink:0 }}>
        <Logomark />
      </header>

      <div style={{ display:"grid", gridTemplateColumns:"220px 1fr",
        flex:1, minHeight:0, fontFamily:F.sans, background:T.bg }}>

      {/* Sidebar */}
      <aside className="ws-dark" style={{ background:T.side, display:"flex", flexDirection:"column",
        padding:"18px 14px", gap:18, borderRight:`1px solid ${T.sideBorder}`,
        height:"100%", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"4px 6px" }}>
          <div aria-hidden="true" style={{ width:26, height:26, borderRadius:7, background:hue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:700, color:"#fff" }}>M</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>Meridian</div>
          <div style={{ fontSize:11, color:T.sideText, marginLeft:"auto" }}>Studio</div>
        </div>
        <nav aria-label="Workspace" style={{ display:"flex", flexDirection:"column", gap:1 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:"1px", textTransform:"uppercase",
            color:"rgba(255,255,255,0.6)", padding:"4px 8px 8px" }}>Workspace</div>
          {navItems.map(item => (
            <button key={item.id} onClick={()=>setNav(item.id)}
              aria-current={nav===item.id?"page":undefined}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 9px",
                borderRadius:6, fontSize:13, fontWeight:nav===item.id?600:500,
                color:nav===item.id?"#fff":T.sideText, width:"100%", textAlign:"left",
                border:"none", fontFamily:F.sans,
                background:nav===item.id?"rgba(255,255,255,0.09)":"rgba(255,255,255,0.03)",
                cursor:"pointer", transition:"all 0.12s" }}>
              <div aria-hidden="true" style={{ width:6, height:6, borderRadius:"50%",
                background:nav===item.id?hue:"rgba(255,255,255,0.2)", flexShrink:0 }} />
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop:"auto", padding:"10px 12px", borderRadius:8,
          background:"rgba(255,255,255,0.04)", border:`1px solid ${T.sideBorder}` }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginBottom:4,
            fontWeight:600, letterSpacing:"0.6px", textTransform:"uppercase" }}>Session</div>
          {user ? (<>
            <div style={{ fontSize:12, color:"#fff", marginBottom:2, wordBreak:"break-all" }}>{user.email}</div>
            {profile?.name && profile.name !== user.email && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", marginBottom:4 }}>{profile.name}</div>
            )}
            <button onClick={handleSignOut}
              style={{ fontSize:11, color:"rgba(255,255,255,0.7)", background:"transparent",
                border:"none", cursor:"pointer", fontFamily:F.sans, fontWeight:500,
                padding:"6px 0 0", minHeight:24, display:"inline-flex", alignItems:"center" }}>Sign out</button>
          </>) : (<>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>Guest session</div>
            <button onClick={()=>setNav("orders")}
              style={{ fontSize:11, color:"#FCA5A5", background:"transparent",
                border:"none", cursor:"pointer", fontFamily:F.sans, fontWeight:600,
                minHeight:24, display:"inline-flex", alignItems:"center", padding:0 }}>
              Sign in →
            </button>
          </>)}
          <button onClick={onGoCatalog}
            style={{ fontSize:11, color:"rgba(255,255,255,0.7)", background:"transparent",
              border:"none", cursor:"pointer", fontFamily:F.sans, fontWeight:500,
              padding:"8px 0 0", minHeight:24, display:"flex", alignItems:"center" }}>← Back to catalog</button>
        </div>
      </aside>

      {/* Main */}
      <main id="main-content" style={{ display:"flex", flexDirection:"column", overflowY:"auto" }}>
        <div style={{ padding:"22px 28px 60px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12,
            color:T.inkLight, marginBottom:24 }}>
            <button onClick={onGoCatalog}
              style={{ cursor:"pointer", background:"transparent", border:"none",
                color:T.inkLight, fontFamily:F.sans, fontSize:12, padding:0 }}>Catalog</button>
            <span aria-hidden="true" style={{ color:T.border }}>/</span>
            <span style={{ color:T.ink, fontWeight:500 }}>
              {navItems.find(n=>n.id===nav)?.label || "Workspace"}
            </span>
          </div>

          {nav==="orders" && (
            <MyOrdersTab user={user} orders={orders} ordersLoading={ordersLoading}
              onViewOrder={o=>setSelOrder(o)} />
          )}
          {nav==="messages" && <MessagesTab user={user} orders={orders} profile={profile} />}
          {nav==="rates"    && <RateSheetTab />}
          {nav==="profile"  && (
            <MyProfileTab user={user} profile={profile} setProfile={setProfile} showToast={showToast} />
          )}

          {/* New Order tab */}
          {nav==="new" && (<>
            <div style={{ marginBottom:18 }}>
              <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.4px", color:T.ink, marginBottom:3 }}>
                Configure your order
              </h1>
              <p style={{ fontSize:13, color:T.inkLight }}>
                Tell us your situation. We'll send a confirmed quote via WhatsApp once we review your brief.
              </p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:18, alignItems:"start" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {/* Level card */}
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10 }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`,
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                      textTransform:"uppercase", color:T.inkLight, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:18, height:18, borderRadius:"50%", background:T.ink, color:"#fff",
                        fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>1</span>
                      Level
                    </div>
                    <button onClick={()=>setShowR(p=>!p)}
                      style={{ background:"transparent", border:"none", color:hue,
                        fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:F.sans }}>
                      {showR?"▲ Rate sheet":"▼ Rate sheet"}
                    </button>
                  </div>
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
                      {LEVELS.map(l => {
                        const on = l.id===lvId;
                        return (
                          <button key={l.id} onClick={()=>chgLv(l.id)}
                            style={{ padding:"12px 10px", borderRadius:8, textAlign:"left",
                              cursor:"pointer", border:`1px solid ${on?l.hue:T.border}`,
                              background:on?l.hue+"08":T.surface, fontFamily:F.sans }}>
                            <div style={{ display:"inline-flex", padding:"2px 6px", borderRadius:4,
                              background:on?l.hue:T.alt, color:on?"#fff":T.inkLight,
                              fontSize:9, fontWeight:700, marginBottom:7 }}>{l.abbr}</div>
                            <div style={{ fontSize:13, fontWeight:600, color:on?l.hue:T.ink,
                              marginBottom:2, lineHeight:1.2 }}>{l.label}</div>
                            <div style={{ fontSize:11, color:T.inkLight, lineHeight:1.3 }}>{l.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                    {showR && (
                      <div style={{ marginTop:12, padding:"12px 14px", background:T.alt,
                        border:`1px solid ${T.border}`, borderRadius:8 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px",
                          textTransform:"uppercase", color:T.inkLight, marginBottom:8 }}>
                          Per-page rates · Writing / Project
                        </div>
                        {LEVELS.map(l => {
                          const on = l.id===lvId;
                          return (
                            <div key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 0", fontSize:11 }}>
                              <div style={{ width:90, color:on?l.hue:T.inkMid, fontWeight:on?600:400 }}>{l.label}</div>
                              <div style={{ flex:1, height:5, background:T.border, borderRadius:3, overflow:"hidden" }}>
                                <div style={{ width:`${(l.rW/maxW)*100}%`, height:"100%", background:on?l.hue:T.borderMid, borderRadius:3 }} />
                              </div>
                              <div style={{ width:52, fontFamily:F.mono, textAlign:"right", color:on?l.hue:T.inkLight, fontWeight:on?600:400 }}>
                                ${l.rW}/pg
                              </div>
                              <div style={{ flex:1, height:5, background:T.border, borderRadius:3, overflow:"hidden", opacity:l.rP?1:0.3 }}>
                                {l.rP && <div style={{ width:`${(l.rP/maxP)*100}%`, height:"100%", background:on?l.hue:T.borderMid, borderRadius:3 }} />}
                              </div>
                              <div style={{ width:52, fontFamily:F.mono, textAlign:"right", color:on?l.hue:T.inkLight, fontWeight:on?600:400 }}>
                                {l.rP?`$${l.rP}/pg`:"—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Program card */}
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10 }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                      textTransform:"uppercase", color:T.inkLight, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:18, height:18, borderRadius:"50%", background:T.ink, color:"#fff",
                        fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>2</span>
                      School & program
                    </div>
                  </div>
                  <div style={{ padding:"14px 16px" }}>
                    <select value={prog} aria-label="School and program"
                      onChange={e=>{ setProg(e.target.value); setScope(null); }}
                      style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.border}`,
                        borderRadius:8, fontSize:13, fontFamily:F.sans, color:T.ink,
                        background:T.surface, outline:"none", appearance:"none",
                        backgroundImage:`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>")`,
                        backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", paddingRight:32 }}>
                      {prgs.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Scope card */}
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10 }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                      textTransform:"uppercase", color:T.inkLight, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:18, height:18, borderRadius:"50%", background:T.ink, color:"#fff",
                        fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>3</span>
                      Scope
                    </div>
                  </div>
                  <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:14 }}>
                    {SCOPE_TIERS.map(tier => (
                      <div key={tier.id}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:8 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:T.ink }}>{tier.title}</div>
                          <div style={{ fontSize:12, color:T.inkLight }}>{tier.summary}</div>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          {tier.options.map(opt => {
                            const on = opt.id===scope;
                            return (
                              <div key={opt.id} onClick={()=>setScope(opt.id)}
                                style={{ padding:"12px 14px", borderRadius:8, cursor:"pointer",
                                  border:`1px solid ${on?hue:T.border}`,
                                  background:on?hue+"08":T.surface, display:"flex", alignItems:"flex-start", gap:10 }}>
                                <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0, marginTop:2,
                                  border:`1.5px solid ${on?hue:T.borderMid}`, background:on?hue:T.surface,
                                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  {on && <div style={{ width:5, height:5, borderRadius:"50%", background:"#fff" }} />}
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:13, fontWeight:600, color:on?hue:T.ink, marginBottom:3 }}>{opt.label}</div>
                                  <div style={{ fontSize:11.5, color:T.inkLight, lineHeight:1.55 }}>{opt.detail}</div>
                                  <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
                                    {opt.bundle  && <Badge color={T.green} bg={T.greenBg} border={T.greenBord}>10% bundle</Badge>}
                                    {opt.doctoral && <Badge color={T.accent} bg={T.accentSoft} border={T.accentMid}>Includes project</Badge>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order summary rail */}
              <div style={{ position:"sticky", top:22, display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ background:T.side, color:"#fff", borderRadius:10,
                  overflow:"hidden", boxShadow:"0 8px 30px rgba(17,20,24,0.12)" }}>
                  <div style={{ padding:"14px 16px 12px", borderBottom:`1px solid ${T.sideBorder}` }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1px",
                      textTransform:"uppercase", color:hue, marginBottom:6 }}>Order summary</div>
                    <div style={{ fontSize:14, fontWeight:600, lineHeight:1.35, marginBottom:6 }}>
                      {sc ? sc.label : "Choose a scope to continue"}
                    </div>
                    {sc && <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>{sc.tierTitle}</div>}
                  </div>
                  <div style={{ padding:"12px 16px 4px", display:"flex", flexDirection:"column", gap:10 }}>
                    {[["Level",lv?.label],["Program",prog]].map(([l,v]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                        <span style={{ color:"rgba(255,255,255,0.4)" }}>{l}</span>
                        <span style={{ color:"#fff", fontWeight:500, textAlign:"right", maxWidth:"60%" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ margin:"8px 16px 0", padding:"10px 12px",
                    background:"rgba(255,255,255,0.04)", border:`1px solid ${T.sideBorder}`, borderRadius:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", fontSize:12, padding:"4px 0" }}>
                      <span style={{ color:"rgba(255,255,255,0.5)" }}>Writing</span>
                      <span style={{ color:hue, fontWeight:600, fontFamily:F.mono, fontSize:13 }}>${lv?.rW}/pg</span>
                    </div>
                    {lv?.rP && (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", fontSize:12, padding:"4px 0" }}>
                        <span style={{ color:"rgba(255,255,255,0.5)" }}>Project</span>
                        <span style={{ color:hue, fontWeight:600, fontFamily:F.mono, fontSize:13 }}>${lv.rP}/pg</span>
                      </div>
                    )}
                    {sc && (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline",
                        fontSize:12, padding:"8px 0 4px", marginTop:4, borderTop:`1px solid ${T.sideBorder}` }}>
                        <span style={{ color:"rgba(255,255,255,0.5)" }}>Total</span>
                        <span style={{ color:"rgba(255,255,255,0.45)", fontStyle:"italic", fontSize:11 }}>
                          Confirmed after brief
                        </span>
                      </div>
                    )}
                  </div>
                  {sc?.bundle && (
                    <div style={{ margin:"8px 16px 0", padding:"8px 12px",
                      background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)",
                      borderRadius:8, fontSize:11, color:"#34D399", fontWeight:500,
                      display:"flex", alignItems:"center", gap:8 }}>
                      ✓ 10% bundle saving applies to final quote
                    </div>
                  )}
                  <div style={{ padding:"14px 16px 16px" }}>
                    <button onClick={()=>{ if(sc) setModal(true); }} disabled={!sc}
                      style={{ width:"100%", padding:"11px", fontSize:13, fontWeight:600,
                        background:sc?hue:"rgba(255,255,255,0.08)",
                        color:sc?"#fff":"rgba(255,255,255,0.3)",
                        border:"none", borderRadius:8, cursor:sc?"pointer":"not-allowed",
                        fontFamily:F.sans }}>
                      {sc ? "Proceed to order →" : "Choose a scope"}
                    </button>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:8, textAlign:"center", lineHeight:1.5 }}>
                      Upload your brief next · 50% deposit · Balance on delivery
                    </div>
                  </div>
                </div>
                <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:T.alt,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>💬</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>Need to talk first?</div>
                    <div style={{ fontSize:11, color:T.inkLight, marginTop:1 }}>WhatsApp us · usually replies in ~10m</div>
                  </div>
                </div>
              </div>
            </div>
          </>)}
        </div>
      </main>

      {/* Order detail panel */}
      {selOrder && (
        <OrderDetailPanel order={selOrder} user={user} profile={profile}
          onClose={()=>setSelOrder(null)} showToast={showToast} />
      )}

      {/* Toast */}
      <Toast toast={toast} onClose={()=>setToast(null)} />

      {/* New order modal */}
      {modal && (
        <OrderModal level={lv} program={prog} scope={sc}
          onClose={()=>{ setModal(false); setScope(null); }}
          onPlaced={()=>{
            if(user) fetchClientOrders(user.id);
            // After close, land on My Orders
            setNav("orders");
          }} />
      )}
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function CatalogApp({ onAdmin, page: initialPage = 'catalog' }) {
  // Initialise page from prop (set by react-router) or URL param fallback
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "orders") return "workspace";
    return initialPage;
  });
  const [defaultNav, setDefaultNav] = useState("orders");
  const [user, setUser] = useState(null);

  // Fix 5: clean URL if we landed from magic link redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "orders") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Fix 3: claim anonymous orders before surfacing the user, so the
      // subsequent orders fetch sees the updated client_id values.
      if (event === "SIGNED_IN" && session?.user) {
        try {
          await supabase.rpc("claim_my_orders");
        } catch (err) {
          console.warn("claim_my_orders:", err);
        }
      }
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  function goDesk(nav="orders") { setDefaultNav(nav); setPage("workspace"); }

  // Update the document title per route for screen readers / browser history
  useEffect(() => {
    document.title = page === "workspace"
      ? "Workspace — Meridian Studio"
      : "Order — Meridian Studio";
  }, [page]);

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
      fontFamily:F.sans, background:T.bg }}>
      {page==="catalog"
        ? <CatalogPage onGoDesk={goDesk} />
        : <WorkspacePage
            onGoCatalog={()=>{ setPage("catalog"); setDefaultNav("orders"); }}
            onAdmin={onAdmin}
            defaultNav={defaultNav}
            user={user} />}
    </div>
  );
}
