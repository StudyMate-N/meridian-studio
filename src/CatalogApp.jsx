import { useState, useEffect, useRef, Fragment } from "react";
import { supabase } from "./lib/supabase.js";

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

const T = {
  bg:"#F7F6F3", surface:"#FFFFFF", alt:"#F2F1EE",
  border:"#E8E5E0", borderMid:"#D4D0CA",
  side:"#111418", sideBorder:"rgba(255,255,255,0.07)", sideText:"rgba(255,255,255,0.5)",
  ink:"#111418", inkMid:"#57534E", inkLight:"#A8A29E",
  accent:"#B91C1C", accentSoft:"#FEF2F2", accentMid:"#FECACA",
  green:"#065F46", greenBg:"#ECFDF5", greenBord:"#A7F3D0",
};
const F = { serif:"Cormorant Garamond,Georgia,serif", sans:"DM Sans,system-ui,sans-serif", mono:"DM Mono,monospace" };

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

function TInput({ label, value, onChange, type="text", placeholder="", req=false, err=false, min="" }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      {label && <FL text={label} req={req} />}
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder} min={min||undefined}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:"100%", padding:"10px 13px", boxSizing:"border-box",
          border:`1.5px solid ${err?T.accent:f?T.inkMid:T.border}`,
          borderRadius:8, fontSize:14, fontFamily:F.sans,
          color:T.ink, background:T.surface, outline:"none" }} />
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

// ORDER MODAL
function OrderModal({ level, program, scope, onClose, onPlaced }) {
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
      // 1. Generate a server-side unique ref
      const { data: refData } = await supabase.rpc("generate_order_ref");
      if (refData) ref = refData;

      // 2. Insert order into Supabase
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
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 3. Upload brief to Supabase Storage if provided
      if (brief && order) {
        const path = `${order.id}/${Date.now()}-${brief.name}`;
        const { error: upErr } = await supabase.storage
          .from("order-files")
          .upload(path, brief);
        if (!upErr) {
          await supabase.from("order_files").insert({
            order_id:   order.id,
            file_name:  brief.name,
            file_path:  path,
            kind:       "brief",
            size_bytes: brief.size,
          });
        }
      }

      // 4. Log creation event
      if (order) {
        await supabase.from("order_log").insert({
          order_id:   order.id,
          actor_name: name,
          event:      "Order created",
        });
      }
    } catch (err) {
      console.warn("Supabase write failed, falling back to WhatsApp-only:", err);
    }

    // 5. Build and open WhatsApp message (always runs — Supabase is never a blocker)
    const msg = [
      "📋 *New Order — Meridian Studio*","",
      `*Name:* ${name}`,`*WhatsApp:* ${phone}`,
      email?`*Email:* ${email}`:null,"",
      `*Level:* ${level?.label}`,`*Program:* ${program}`,
      `*Scope:* ${scope?.label}`,`*Due:* ${due}`,
      `*Access:* ${access==="portal"?"Upload via portal":"Dedicated device + TeamViewer"}`,
      `*Payment:* ${pay}`,
      brief?`*Brief:* ${brief.name} (uploading separately via portal)`:null,
      notes?`*Notes:* ${notes}`:null,"",
      scope?.orderNote,
      "",`*Ref:* ${ref}`,
    ].filter(Boolean).join("\n");
    const waNum = import.meta.env.VITE_WHATSAPP_NUMBER || "12057279363";
    const url   = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;
    const win   = window.open(url, "_blank");
    setOid(ref);
    if (!win || win.closed || typeof win.closed === "undefined") setBlockedUrl(url);
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
            <div style={{ fontSize:30, fontWeight:600, fontFamily:F.serif,
              color:"#fff", marginBottom:10 }}>
              {fn ? `You're all set, ${fn}.` : "Order received."}
            </div>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", maxWidth:360,
              lineHeight:1.8, marginBottom:28, fontFamily:F.sans }}>
              WhatsApp is opening with your order details. We'll review your brief
              and confirm the quote within a few hours.
            </div>
            <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:10, padding:"14px 28px", marginBottom:28 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase",
                color:"rgba(255,255,255,0.3)", fontFamily:F.sans, marginBottom:4 }}>Order Reference</div>
              <div style={{ fontSize:20, fontWeight:600, fontFamily:F.mono, color:hue }}>{oid}</div>
            </div>
            {blockedUrl && (
              <a href={blockedUrl} target="_blank" rel="noreferrer"
                style={{ display:"block", marginBottom:16, padding:"12px 20px",
                  background:"rgba(185,28,28,0.2)", border:"1px solid rgba(185,28,28,0.35)",
                  borderRadius:8, color:hue, fontSize:13, fontWeight:600,
                  textAlign:"center", textDecoration:"none", fontFamily:F.sans }}>
                WhatsApp didn't open — tap here to send your order →
              </a>
            )}
            {brief && (
              <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:8, padding:"10px 16px", marginBottom:18,
                fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6, textAlign:"left" }}>
                📎 <strong style={{ color:"rgba(255,255,255,0.7)" }}>Attach your file:</strong>{" "}
                Send <em>{brief.name}</em> directly in the WhatsApp conversation so your writer receives it.
              </div>
            )}
            <Btn variant="ghost" onClick={onClose}
              sx={{ background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.7)", border:"none" }}>
              Close
            </Btn>
          </div>
        ) : (<>
          {/* Header */}
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
                  justifyContent:"center", color:"rgba(255,255,255,0.6)", fontSize:16, cursor:"pointer" }}>
                ✕
              </button>
            </div>
            <div style={{ marginTop:14, padding:"10px 14px",
              background:"rgba(255,255,255,0.05)", borderRadius:8,
              display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", fontFamily:F.sans,
                  letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:2 }}>Writing rate</div>
                <div style={{ fontSize:16, fontWeight:600, fontFamily:F.mono, color:hue }}>
                  ${level?.rW}/page
                </div>
              </div>
              {level?.rP && scope?.hasProject && (<>
                <div style={{ width:1, height:24, background:"rgba(255,255,255,0.1)" }} />
                <div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", fontFamily:F.sans,
                    letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:2 }}>Project rate</div>
                  <div style={{ fontSize:16, fontWeight:600, fontFamily:F.mono, color:hue }}>
                    ${level?.rP}/page
                  </div>
                </div>
              </>)}
              <div style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,0.25)",
                fontFamily:F.sans, fontStyle:"italic" }}>
                Quote confirmed after brief review
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex:1, padding:"22px 24px", overflowY:"auto" }}>
            {scope?.orderNote && (
              <div style={{ background:level?.hueSoft||T.accentSoft,
                border:`1px solid ${T.accentMid}`, borderRadius:8,
                padding:"10px 14px", marginBottom:20,
                fontSize:12, color:T.inkMid, fontFamily:F.sans, lineHeight:1.6 }}>
                {scope.orderNote}
              </div>
            )}

            <Divider label="Your Details" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <TInput label="Full Name" value={name} onChange={setName}
                placeholder="Jane Doe" req err={errs.name} />
              <TInput label="WhatsApp" value={phone} onChange={setPhone}
                placeholder="+1 281 677 0283" req err={errs.phone} />
            </div>
            <TInput label="Email (optional)" value={email} onChange={setEmail}
              type="email" placeholder="you@email.com" />
            {(errs.name||errs.phone) && (
              <div style={{ fontSize:11, color:T.accent, marginTop:-8, marginBottom:14, fontFamily:F.sans }}>
                Name and WhatsApp are required.
              </div>
            )}

            <Divider label="Assignment" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <TInput label="Due Date" value={due} onChange={setDue}
                type="date" req err={errs.due} min={new Date().toISOString().slice(0,10)} />
              <div style={{ marginBottom:14 }}>
                <FL text="Course Access" />
                <Seg value={access} onChange={setAccess}
                  options={[{v:"portal",l:"Upload brief"},{v:"device",l:"Dedicated device"}]} />
              </div>
            </div>
            {access==="device" && (
              <div style={{ background:T.alt, border:`1px solid ${T.border}`,
                borderRadius:8, padding:"10px 14px", marginBottom:14,
                fontSize:12, color:T.inkMid, fontFamily:F.sans, lineHeight:1.6 }}>
                We'll coordinate a dedicated school device with TeamViewer.
                We never access your institutional portal from our own equipment.
              </div>
            )}
            <FL text="Brief / Rubric" />
            <FileZone file={brief} onFile={setBrief} />
            <div style={{ marginBottom:14 }}>
              <FL text="Special Instructions (optional)" />
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
                placeholder="Faculty preferences, continuation from prior work, specific requirements…"
                style={{ width:"100%", padding:"10px 13px", boxSizing:"border-box",
                  border:`1.5px solid ${T.border}`, borderRadius:8,
                  fontSize:13, fontFamily:F.sans, color:T.ink,
                  background:T.surface, outline:"none", resize:"vertical" }} />
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
                      color:pay===m?hue:T.inkMid,
                      cursor:"pointer", fontFamily:F.sans, transition:"all 0.12s" }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize:12, color:T.inkMid, lineHeight:1.65,
              background:T.alt, border:`1px solid ${T.border}`,
              borderRadius:8, padding:"10px 14px", fontFamily:F.sans }}>
              50% deposit secures your slot. Balance paid on delivery.
              Confirmed quote arrives via WhatsApp within a few hours.
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}`,
            background:T.surface, flexShrink:0 }}>
            {errs.due && (
              <div style={{ fontSize:11, color:T.accent, marginBottom:8, fontFamily:F.sans }}>
                Please set a due date to continue.
              </div>
            )}
            <Btn variant="dark" size="lg" full onClick={submit} disabled={loading}
              sx={{ background:loading?T.inkMid:T.side }}>
              {loading ? "Opening WhatsApp…" : fn ? `Confirm Order, ${fn} →` : "Confirm Order →"}
            </Btn>
            <div style={{ fontSize:11, color:T.inkLight, textAlign:"center",
              marginTop:8, fontFamily:F.sans }}>
              Press Esc to close · Quote confirmed before any work begins
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

// CATALOG PAGE
function CatalogPage({ onGoDesk }) {
  const [lvId,  setLvId]  = useState("dnp");
  const [prog,  setProg]  = useState(PROGRAMS.dnp[0]);
  const [scope, setScope] = useState(null);
  const [showR, setShowR] = useState(false);
  const [modal, setModal] = useState(false);

  const lv   = LEVELS.find(l=>l.id===lvId);
  const prgs = PROGRAMS[lvId]||[];
  const sc   = ALL_SCOPES.find(s=>s.id===scope);
  const hue  = lv.hue;
  const maxW = Math.max(...LEVELS.map(l=>l.rW));
  const maxP = Math.max(...LEVELS.map(l=>l.rP||0));

  function chgLv(id) { setLvId(id); setScope(null); setProg(PROGRAMS[id]?.[0]||""); }

  const steps = [{l:"Level",done:true},{l:"Program",done:true},{l:"Scope",done:!!scope}];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      fontFamily:F.sans, background:T.bg }}>

      {/* Appbar */}
      <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
        padding:"0 28px", height:56, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:"50%",
            background:`conic-gradient(from 220deg, ${hue}, #111418)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:700, color:"#fff", transition:"background 0.3s" }}>M</div>
          <span style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.3px" }}>Meridian Studio</span>
          <span style={{ color:T.borderMid, fontWeight:300, margin:"0 4px" }}>/</span>
          <span style={{ fontSize:13, color:T.inkLight }}>Order catalog</span>
        </div>
        <nav style={{ display:"flex", gap:20, alignItems:"center", fontSize:13 }}>
          {["Catalog","My orders","How it works"].map((item,i) => (
            <span key={item} onClick={i===1?()=>onGoDesk("orders"):undefined}
              style={{ color:i===0?T.ink:T.inkLight,
                fontWeight:i===0?600:400,
                borderBottom:i===0?`2px solid ${hue}`:"2px solid transparent",
                paddingBottom:2, cursor:"pointer" }}>
              {item}
            </span>
          ))}
          <button onClick={onGoDesk}
            style={{ padding:"6px 14px", borderRadius:99, border:`1px solid ${T.border}`,
              background:T.surface, fontSize:12, color:T.inkMid,
              cursor:"pointer", fontFamily:F.sans, fontWeight:500 }}>
            Sign in
          </button>
        </nav>
      </header>

      {/* Main */}
      <main style={{ flex:1, overflowY:"auto", padding:"28px 28px 120px",
        maxWidth:1040, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>

        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24, fontSize:12 }}>
          {steps.map((s,i) => (
            <Fragment key={s.l}>
              {i>0 && <div style={{ width:20, height:1, background:T.border }} />}
              <div style={{ display:"flex", alignItems:"center", gap:6,
                padding:"5px 12px", borderRadius:99,
                border:`1px solid ${s.done?T.greenBord:i===2&&!scope?T.ink:T.border}`,
                background:s.done?T.greenBg:i===2&&!scope?T.ink:T.surface,
                color:s.done?T.green:i===2&&!scope?"#fff":T.inkLight, fontWeight:500 }}>
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

        {/* Heading */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:30, fontWeight:600, letterSpacing:"-0.5px",
            fontFamily:F.serif, color:T.ink, marginBottom:6 }}>
            What can we help you with?
          </h1>
          <p style={{ fontSize:14, color:T.inkMid, maxWidth:560, lineHeight:1.6 }}>
            Tell us your level, program, and scope. We'll send a confirmed quote
            via WhatsApp once we've reviewed your brief.
          </p>
        </div>

        {/* Context card */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`,
          borderRadius:14, padding:"20px 22px", marginBottom:20,
          boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
            textTransform:"uppercase", color:T.inkLight, marginBottom:12 }}>
            Your context
          </div>

          {/* Level pills */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
            {LEVELS.map(l => {
              const on = l.id===lvId;
              return (
                <button key={l.id} onClick={()=>chgLv(l.id)}
                  style={{ display:"flex", alignItems:"center", gap:8,
                    padding:"7px 12px 7px 8px", borderRadius:99, cursor:"pointer",
                    border:`1px solid ${on?l.hue:T.border}`,
                    background:on?l.hue+"18":T.surface,
                    transition:"all 0.12s", fontFamily:F.sans }}>
                  <div style={{ width:22, height:22, borderRadius:"50%",
                    background:on?l.hue:T.alt, color:on?"#fff":T.inkLight,
                    fontSize:9, fontWeight:700, letterSpacing:"0.3px",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {l.abbr}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:on?600:500,
                    color:on?l.hue:T.inkMid }}>{l.label}</span>
                  {on && <span style={{ fontSize:11, color:l.hue, opacity:0.7, marginLeft:2 }}>· {l.sub}</span>}
                </button>
              );
            })}
          </div>

          {/* Program + rates */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:14, alignItems:"end" }}>
            <div>
              <div style={{ fontSize:12, color:T.inkLight, marginBottom:6 }}>School & program</div>
              <select value={prog} onChange={e=>{ setProg(e.target.value); setScope(null); }}
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

          {/* Rate bars */}
          {showR && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
              {[{k:"Writing",f:"rW",max:maxW},{k:"Project",f:"rP",max:maxP}].map(({k,f,max}) => (
                <div key={k} style={{ background:T.alt, border:`1px solid ${T.border}`,
                  borderRadius:9, padding:"12px 14px" }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.8px",
                    textTransform:"uppercase", color:T.inkLight, marginBottom:10 }}>
                    {k} rate — all levels
                  </div>
                  {LEVELS.map(l => {
                    const r=l[f]||0, pct=max>0?(r/max)*100:0, on=l.id===lvId;
                    return (
                      <div key={l.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                        <div style={{ width:80, fontSize:10, fontFamily:F.sans,
                          color:on?l.hue:T.inkMid, fontWeight:on?700:400 }}>{l.label}</div>
                        <div style={{ flex:1, height:5, background:T.border, borderRadius:3, overflow:"hidden" }}>
                          {r>0 && <div style={{ width:`${pct}%`, height:"100%",
                            background:on?l.hue:T.borderMid, borderRadius:3 }} />}
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
          <div style={{ marginTop:12, fontSize:12, color:T.inkLight,
            fontFamily:F.sans, lineHeight:1.55, fontStyle:"italic" }}>
            {lv.rateContext}
          </div>
        </div>

        {/* Scope grid */}
        <div>
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
                  style={{ background:T.surface,
                    border:`1px solid ${tierSel?hue+"55":T.border}`,
                    borderRadius:14, padding:"18px 18px 14px",
                    boxShadow:tierSel?`0 8px 28px ${hue}18`:"0 1px 3px rgba(17,20,24,0.03)",
                    display:"flex", flexDirection:"column", gap:12,
                    transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"flex-start",
                    justifyContent:"space-between", gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                      background:iconBg, color:iconClr,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:14, fontWeight:700 }}>
                      {tier.icon}
                    </div>
                    {tier.id==="complete" && (
                      <div style={{ padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700,
                        letterSpacing:"0.5px", textTransform:"uppercase",
                        background:hue, color:"#fff" }}>
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
                            border:`1px solid ${on?hue:T.border}`,
                            background:on?hue+"08":T.alt,
                            transition:"all 0.12s",
                            display:"flex", alignItems:"flex-start", gap:9 }}>
                          <RadioDot on={on} hue={hue} />
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12.5, fontWeight:600,
                              color:on?hue:T.ink, marginBottom:2, lineHeight:1.3 }}>
                              {opt.label}
                            </div>
                            <div style={{ fontSize:11, color:T.inkLight, lineHeight:1.5 }}>
                              {opt.detail}
                            </div>
                            <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
                              {opt.bundle  && <Badge color={T.green} bg={T.greenBg}  border={T.greenBord}>10% bundle</Badge>}
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

      {/* Sticky CTA bar */}
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
              fontFamily:F.sans, transition:"all 0.15s",
              boxShadow:sc?"0 4px 12px rgba(17,20,24,0.15)":"none" }}>
            {sc ? "Continue →" : "Pick a scope"}
          </button>
        </div>
      </div>

      {modal && <OrderModal level={lv} program={prog} scope={sc} onClose={()=>setModal(false)} />}
    </div>
  );
}

// WORKSPACE PAGE
function WorkspacePage({ onGoCatalog, onAdmin, defaultNav="new", user=null }) {
  const [lvId,  setLvId]  = useState("dnp");
  const [prog,  setProg]  = useState(PROGRAMS.dnp[0]);
  const [scope, setScope] = useState(null);
  const [showR, setShowR] = useState(false);
  const [modal, setModal] = useState(false);
  const [nav,   setNav]   = useState(defaultNav);
  const [sessionOrders,  setSessionOrders]  = useState([]);
  const [dbOrders,       setDbOrders]       = useState([]);
  const [dbLoading,      setDbLoading]      = useState(false);
  const [signInEmail,    setSignInEmail]    = useState("");
  const [signInSent,     setSignInSent]     = useState(false);
  const [signInLoading,  setSignInLoading]  = useState(false);
  const [signInErr,      setSignInErr]      = useState("");

  // Load orders from Supabase when user logs in
  useEffect(() => {
    if (!user) { setDbOrders([]); return; }
    setDbLoading(true);
    supabase
      .from("orders")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setDbOrders(data || []); setDbLoading(false); });
  }, [user]);

  async function handleSignIn() {
    if (!signInEmail.trim()) return;
    setSignInLoading(true);
    setSignInErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: signInEmail.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setSignInErr(error.message); setSignInLoading(false); }
    else { setSignInSent(true); setSignInLoading(false); }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const lv   = LEVELS.find(l=>l.id===lvId);
  const prgs = PROGRAMS[lvId]||[];
  const sc   = ALL_SCOPES.find(s=>s.id===scope);
  const hue  = lv.hue;
  const maxW = Math.max(...LEVELS.map(l=>l.rW));
  const maxP = Math.max(...LEVELS.map(l=>l.rP||0));

  function chgLv(id) { setLvId(id); setScope(null); setProg(PROGRAMS[id]?.[0]||""); }

  const navItems = ["new","orders","messages","rates","how"].map((id,i) => ({
    id, label:["New order","My orders","Messages","Rate sheet","How it works"][i]
  }));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"220px 1fr",
      height:"100%", fontFamily:F.sans, background:T.bg }}>

      {/* Sidebar */}
      <aside style={{ background:T.side, display:"flex", flexDirection:"column",
        padding:"18px 14px", gap:18,
        borderRight:`1px solid ${T.sideBorder}`, height:"100%", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"4px 6px" }}>
          <div style={{ width:26, height:26, borderRadius:7, background:hue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:700, color:"#fff", transition:"background 0.2s" }}>M</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>Meridian</div>
          <div style={{ fontSize:11, color:T.sideText, marginLeft:"auto" }}>Studio</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:"1px", textTransform:"uppercase",
            color:"rgba(255,255,255,0.3)", padding:"4px 8px 8px" }}>Workspace</div>
          {navItems.map(item => (
            <div key={item.id} onClick={()=>setNav(item.id)}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 9px",
                borderRadius:6, fontSize:13,
                fontWeight:nav===item.id?600:500,
                color:nav===item.id?"#fff":T.sideText,
                background:nav===item.id?"rgba(255,255,255,0.09)":"rgba(255,255,255,0.03)",
                cursor:"pointer", transition:"all 0.12s" }}>
              <div style={{ width:6, height:6, borderRadius:"50%",
                background:nav===item.id?hue:"rgba(255,255,255,0.2)", flexShrink:0 }} />
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ marginTop:"auto", padding:"10px 12px", borderRadius:8,
          background:"rgba(255,255,255,0.04)", border:`1px solid ${T.sideBorder}` }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4,
            fontWeight:600, letterSpacing:"0.6px", textTransform:"uppercase" }}>Session</div>
          {user ? (<>
            <div style={{ fontSize:12, color:"#fff", marginBottom:2, wordBreak:"break-all" }}>
              {user.email}
            </div>
            <button onClick={handleSignOut}
              style={{ fontSize:10, color:"rgba(255,255,255,0.4)", background:"transparent",
                border:"none", cursor:"pointer", fontFamily:F.sans, fontWeight:500,
                padding:"4px 0 0", display:"block" }}>
              Sign out
            </button>
          </>) : (<>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:4 }}>
              Guest session
            </div>
            <button onClick={()=>setNav("orders")}
              style={{ fontSize:10, color:hue, background:"transparent",
                border:"none", cursor:"pointer", fontFamily:F.sans, fontWeight:600, padding:0 }}>
              Sign in →
            </button>
          </>)}
          <button onClick={onGoCatalog}
            style={{ fontSize:10, color:"rgba(255,255,255,0.35)", background:"transparent",
              border:"none", cursor:"pointer", fontFamily:F.sans, fontWeight:500,
              padding:"8px 0 0", display:"block" }}>
            ← Back to catalog
          </button>
          {onAdmin && (
            <button onClick={onAdmin}
              style={{ fontSize:10, color:"rgba(255,255,255,0.22)", background:"transparent",
                border:"none", cursor:"pointer", fontFamily:F.sans, fontWeight:500,
                padding:"6px 0 0", display:"block" }}>
              Staff access →
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div style={{ display:"flex", flexDirection:"column", overflowY:"auto" }}>
        <div style={{ padding:"22px 28px 28px", display:"flex", flexDirection:"column", gap:18 }}>

          {/* Breadcrumb */}
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:T.inkLight }}>
            <span style={{ cursor:"pointer" }} onClick={onGoCatalog}>Catalog</span>
            <span style={{ color:T.border }}>/</span>
            <span style={{ color:T.ink, fontWeight:500 }}>
              {navItems.find(n=>n.id===nav)?.label || "Workspace"}
            </span>
          </div>

          {/* ── NEW ORDER panel ── */}
          {nav==="new" && (<>
            <div>
              <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.4px",
                color:T.ink, marginBottom:3 }}>Configure your order</h1>
              <p style={{ fontSize:13, color:T.inkLight }}>
                Tell us your situation. We'll send a confirmed quote via WhatsApp once we review your brief.
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:18, alignItems:"start" }}>

              {/* Left */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Level card */}
                <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:10, boxShadow:"0 1px 2px rgba(17,20,24,0.04)" }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`,
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                      textTransform:"uppercase", color:T.inkLight,
                      display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:18, height:18, borderRadius:"50%",
                        background:T.ink, color:"#fff", fontSize:10, fontWeight:700,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>1</span>
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
                              background:on?l.hue+"08":T.surface,
                              boxShadow:on?`inset 0 0 0 1px ${l.hue}30`:"none",
                              transition:"all 0.12s", fontFamily:F.sans }}>
                            <div style={{ display:"inline-flex", padding:"2px 6px", borderRadius:4,
                              background:on?l.hue:T.alt, color:on?"#fff":T.inkLight,
                              fontSize:9, fontWeight:700, letterSpacing:"0.4px", marginBottom:7 }}>
                              {l.abbr}
                            </div>
                            <div style={{ fontSize:13, fontWeight:600,
                              color:on?l.hue:T.ink, marginBottom:2, lineHeight:1.2 }}>{l.label}</div>
                            <div style={{ fontSize:11, color:T.inkLight, lineHeight:1.3 }}>{l.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                    {showR && (
                      <div style={{ marginTop:12, padding:"12px 14px",
                        background:T.alt, border:`1px solid ${T.border}`, borderRadius:8 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px",
                          textTransform:"uppercase", color:T.inkLight, marginBottom:8 }}>
                          Per-page rates · Writing / Project
                        </div>
                        {LEVELS.map(l => {
                          const on = l.id===lvId;
                          return (
                            <div key={l.id} style={{ display:"flex", alignItems:"center",
                              gap:10, padding:"4px 0", fontSize:11 }}>
                              <div style={{ width:90, color:on?l.hue:T.inkMid, fontWeight:on?600:400 }}>{l.label}</div>
                              <div style={{ flex:1, height:5, background:T.border, borderRadius:3, overflow:"hidden" }}>
                                <div style={{ width:`${(l.rW/maxW)*100}%`, height:"100%",
                                  background:on?l.hue:T.borderMid, borderRadius:3 }} />
                              </div>
                              <div style={{ width:52, fontFamily:F.mono, textAlign:"right",
                                color:on?l.hue:T.inkLight, fontWeight:on?600:400 }}>
                                ${l.rW}/pg
                              </div>
                              <div style={{ flex:1, height:5, background:T.border, borderRadius:3,
                                overflow:"hidden", opacity:l.rP?1:0.3 }}>
                                {l.rP && <div style={{ width:`${(l.rP/maxP)*100}%`, height:"100%",
                                  background:on?l.hue:T.borderMid, borderRadius:3 }} />}
                              </div>
                              <div style={{ width:52, fontFamily:F.mono, textAlign:"right",
                                color:on?l.hue:T.inkLight, fontWeight:on?600:400 }}>
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
                <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:10, boxShadow:"0 1px 2px rgba(17,20,24,0.04)" }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                      textTransform:"uppercase", color:T.inkLight,
                      display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:18, height:18, borderRadius:"50%",
                        background:T.ink, color:"#fff", fontSize:10, fontWeight:700,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>2</span>
                      School & program
                    </div>
                  </div>
                  <div style={{ padding:"14px 16px" }}>
                    <select value={prog} onChange={e=>{ setProg(e.target.value); setScope(null); }}
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
                <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:10, boxShadow:"0 1px 2px rgba(17,20,24,0.04)" }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                      textTransform:"uppercase", color:T.inkLight,
                      display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:18, height:18, borderRadius:"50%",
                        background:T.ink, color:"#fff", fontSize:10, fontWeight:700,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>3</span>
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
                                  background:on?hue+"08":T.surface,
                                  transition:"all 0.12s",
                                  display:"flex", alignItems:"flex-start", gap:10 }}>
                                <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0, marginTop:2,
                                  border:`1.5px solid ${on?hue:T.borderMid}`, background:on?hue:T.surface,
                                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  {on && <div style={{ width:5, height:5, borderRadius:"50%", background:"#fff" }} />}
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:13, fontWeight:600, color:on?hue:T.ink,
                                    marginBottom:3, lineHeight:1.3 }}>{opt.label}</div>
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

              {/* Right rail */}
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
                    {[["Level",lv.label],["Program",prog]].map(([l,v]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                        <span style={{ color:"rgba(255,255,255,0.4)" }}>{l}</span>
                        <span style={{ color:"#fff", fontWeight:500, textAlign:"right", maxWidth:"60%" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ margin:"8px 16px 0", padding:"10px 12px",
                    background:"rgba(255,255,255,0.04)", border:`1px solid ${T.sideBorder}`, borderRadius:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"baseline", fontSize:12, padding:"4px 0" }}>
                      <span style={{ color:"rgba(255,255,255,0.5)" }}>Writing</span>
                      <span style={{ color:hue, fontWeight:600, fontFamily:F.mono, fontSize:13 }}>${lv.rW}/pg</span>
                    </div>
                    {lv.rP && (
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"baseline", fontSize:12, padding:"4px 0" }}>
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
                      borderRadius:8, fontSize:11, color:"#34D399",
                      fontWeight:500, display:"flex", alignItems:"center", gap:8 }}>
                      ✓ 10% bundle saving applies to final quote
                    </div>
                  )}
                  <div style={{ padding:"14px 16px 16px" }}>
                    <button onClick={()=>{ if(sc) setModal(true); }} disabled={!sc}
                      style={{ width:"100%", padding:"11px", fontSize:13, fontWeight:600,
                        background:sc?hue:"rgba(255,255,255,0.08)",
                        color:sc?"#fff":"rgba(255,255,255,0.3)",
                        border:"none", borderRadius:8,
                        cursor:sc?"pointer":"not-allowed", fontFamily:F.sans, transition:"all 0.15s" }}>
                      {sc ? "Proceed to order →" : "Choose a scope"}
                    </button>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)",
                      marginTop:8, textAlign:"center", lineHeight:1.5 }}>
                      Upload your brief next · 50% deposit · Balance on delivery
                    </div>
                  </div>
                </div>
                <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:10, padding:"12px 14px",
                  display:"flex", alignItems:"center", gap:10 }}>
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

          {/* ── MY ORDERS panel ── */}
          {nav==="orders" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.4px",
                  color:T.ink, marginBottom:3 }}>My Orders</h1>
                <p style={{ fontSize:13, color:T.inkLight }}>Orders placed in this session.</p>
              </div>
              {/* Not signed in → sign-in prompt */}
              {!user && !signInSent && (
                <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:36, maxWidth:440,
                  boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
                  <div style={{ fontSize:18, fontWeight:600, fontFamily:F.serif,
                    color:T.ink, marginBottom:6 }}>Sign in to track your orders</div>
                  <div style={{ fontSize:13, color:T.inkLight, lineHeight:1.7, marginBottom:20 }}>
                    Enter your email and we'll send a magic link — no password needed.
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <FL text="Email address" />
                    <input value={signInEmail} onChange={e=>setSignInEmail(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&handleSignIn()}
                      type="email" placeholder="you@email.com"
                      style={{ width:"100%", padding:"10px 13px", boxSizing:"border-box",
                        border:`1.5px solid ${T.border}`, borderRadius:8, fontSize:14,
                        fontFamily:F.sans, color:T.ink, background:T.surface, outline:"none" }} />
                  </div>
                  {signInErr && (
                    <div style={{ fontSize:12, color:T.accent, marginBottom:10, fontFamily:F.sans }}>
                      {signInErr}
                    </div>
                  )}
                  <Btn full onClick={handleSignIn} disabled={signInLoading}>
                    {signInLoading ? "Sending…" : "Send magic link →"}
                  </Btn>
                </div>
              )}

              {/* Magic link sent */}
              {!user && signInSent && (
                <div style={{ background:T.greenBg, border:`1px solid ${T.greenBord}`,
                  borderRadius:12, padding:36, maxWidth:440, textAlign:"center" }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>✉️</div>
                  <div style={{ fontSize:17, fontWeight:600, fontFamily:F.serif, color:T.ink, marginBottom:8 }}>
                    Check your email
                  </div>
                  <div style={{ fontSize:13, color:T.inkMid, lineHeight:1.7 }}>
                    We sent a magic link to <strong>{signInEmail}</strong>.<br/>
                    Click it to sign in and see your orders.
                  </div>
                </div>
              )}

              {/* Signed in — show orders from Supabase */}
              {user && (
                dbLoading ? (
                  <div style={{ padding:40, textAlign:"center", color:T.inkLight,
                    fontFamily:F.sans, fontSize:13 }}>Loading your orders…</div>
                ) : (dbOrders.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {dbOrders.map(o => (
                      <div key={o.id} style={{ background:T.surface, border:`1px solid ${T.border}`,
                        borderRadius:10, padding:"16px 20px",
                        boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"flex-start", marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:10, fontFamily:F.mono, color:T.accent,
                              fontWeight:700, letterSpacing:"1px", marginBottom:4 }}>{o.ref}</div>
                            <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>{o.scope_label}</div>
                            <div style={{ fontSize:12, color:T.inkLight, marginTop:2 }}>
                              {o.level_label} · {o.program}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:11, color:T.inkLight }}>Due</div>
                            <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>
                              {o.due_date || "TBD"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                          padding:"4px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                          background: o.status==="delivered"?T.greenBg:T.alt,
                          color: o.status==="delivered"?T.green:T.inkMid,
                          border:`1px solid ${o.status==="delivered"?T.greenBord:T.border}` }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", flexShrink:0,
                            background: o.status==="delivered"?T.green:T.inkLight }} />
                          {o.status.replace(/_/g," ")}
                        </div>
                      </div>
                    ))}
                    {sessionOrders.filter(so=>!dbOrders.find(db=>db.ref===so.ref)).map(o => (
                      <div key={o.ref} style={{ background:T.surface, border:`1px solid ${T.border}`,
                        borderRadius:10, padding:"16px 20px" }}>
                        <div style={{ fontSize:10, fontFamily:F.mono, color:T.accent,
                          fontWeight:700, marginBottom:4 }}>{o.ref}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>{o.scopeLabel}</div>
                        <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6,
                          padding:"6px 10px", background:T.greenBg,
                          border:`1px solid ${T.greenBord}`, borderRadius:7,
                          fontSize:12, color:T.green, fontWeight:500 }}>
                          ✓ Submitted — pending confirmation
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                    borderRadius:12, padding:52, textAlign:"center",
                    boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
                    <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
                    <div style={{ fontSize:18, fontWeight:600, fontFamily:F.serif,
                      color:T.ink, marginBottom:6 }}>No orders yet</div>
                    <div style={{ fontSize:13, color:T.inkLight, marginBottom:22 }}>
                      Place your first order from the New Order tab.
                    </div>
                    <Btn onClick={()=>setNav("new")}>Place an Order →</Btn>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── MESSAGES panel ── */}
          {nav==="messages" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.4px",
                  color:T.ink, marginBottom:3 }}>Messages</h1>
                <p style={{ fontSize:13, color:T.inkLight }}>Reach out to our team directly on WhatsApp.</p>
              </div>
              <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                borderRadius:12, padding:36, textAlign:"center", maxWidth:480,
                boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
                <div style={{ fontSize:42, marginBottom:14 }}>💬</div>
                <div style={{ fontSize:18, fontWeight:600, fontFamily:F.serif,
                  color:T.ink, marginBottom:8 }}>Chat with us on WhatsApp</div>
                <div style={{ fontSize:13, color:T.inkLight, lineHeight:1.75, marginBottom:24, maxWidth:340, margin:"0 auto 24px" }}>
                  Questions about an order? Need a quick quote? Our team typically replies within 10 minutes.
                </div>
                <a href="https://wa.me/12057279363" target="_blank" rel="noreferrer"
                  style={{ display:"inline-block", padding:"12px 28px",
                    background:T.side, color:"#fff", borderRadius:10,
                    fontFamily:F.sans, fontWeight:600, fontSize:13, textDecoration:"none" }}>
                  Open WhatsApp →
                </a>
              </div>
            </div>
          )}

          {/* ── RATE SHEET panel ── */}
          {nav==="rates" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.4px",
                  color:T.ink, marginBottom:3 }}>Rate Sheet</h1>
                <p style={{ fontSize:13, color:T.inkLight }}>Current per-page rates by academic level.</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                {LEVELS.map(l => (
                  <div key={l.id} style={{ background:T.surface, border:`1px solid ${T.border}`,
                    borderRadius:10, padding:"16px 20px",
                    display:"flex", alignItems:"center", gap:16,
                    boxShadow:"0 1px 3px rgba(17,20,24,0.04)" }}>
                    <div style={{ width:42, height:42, borderRadius:10, flexShrink:0,
                      background:l.hue+"15", border:`1px solid ${l.hue}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:l.hue, fontWeight:700, fontSize:11 }}>
                      {l.abbr}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>{l.label}</div>
                      <div style={{ fontSize:12, color:T.inkLight, marginTop:1 }}>{l.sub}</div>
                    </div>
                    <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, color:T.inkLight, marginBottom:2 }}>Writing</div>
                        <div style={{ fontSize:17, fontWeight:700, fontFamily:F.mono, color:l.hue }}>
                          ${l.rW}/pg
                        </div>
                      </div>
                      {l.rP && (
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:10, color:T.inkLight, marginBottom:2 }}>Project</div>
                          <div style={{ fontSize:17, fontWeight:700, fontFamily:F.mono, color:T.accent }}>
                            ${l.rP}/pg
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding:"14px 18px", background:T.alt, border:`1px solid ${T.border}`,
                borderRadius:10, fontSize:12, color:T.inkMid, lineHeight:1.75 }}>
                50% deposit secures your slot · Balance paid on delivery ·
                10% bundle discount when booking all core courses or all doctoral project phases ·
                Final quote confirmed after brief review
              </div>
            </div>
          )}

          {/* ── HOW IT WORKS panel ── */}
          {nav==="how" && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.4px",
                  color:T.ink, marginBottom:3 }}>How It Works</h1>
                <p style={{ fontSize:13, color:T.inkLight }}>From first contact to final delivery.</p>
              </div>
              {[
                { n:1, title:"Select your level, program & scope",
                  body:"Use the catalog to pick your academic level, school, and how much of your program you need covered. Each option shows the relevant per-page rate upfront." },
                { n:2, title:"Submit your brief",
                  body:"Fill in your contact details, due date, and attach your rubric or assignment instructions. The more detail you provide, the faster we can confirm your quote." },
                { n:3, title:"Quote confirmation via WhatsApp",
                  body:"We review your brief and send a confirmed, itemised quote within a few hours. A 50% deposit secures your slot in the schedule." },
                { n:4, title:"Work begins",
                  body:"Your assigned writer starts immediately after deposit confirmation. You'll receive progress updates via WhatsApp throughout." },
                { n:5, title:"Delivery & balance payment",
                  body:"Completed work is delivered before your due date. The remaining 50% balance is due on delivery." },
              ].map((step, i) => (
                <div key={step.n} style={{ display:"flex", gap:16, marginBottom:22 }}>
                  <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:T.side,
                      color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:13, fontWeight:700 }}>
                      {step.n}
                    </div>
                    {i < 4 && <div style={{ width:1, flex:1, minHeight:16, background:T.border, marginTop:4 }} />}
                  </div>
                  <div style={{ paddingTop:4, paddingBottom:i<4?16:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:5 }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize:13, color:T.inkMid, lineHeight:1.7 }}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {modal && <OrderModal level={lv} program={prog} scope={sc} onClose={()=>setModal(false)}
        onPlaced={o=>setSessionOrders(p=>[...p,o])} />}
    </div>
  );
}

// ROOT — exported as CatalogApp so the top-level App.jsx can route between this and the OMS
export default function CatalogApp({ onAdmin }) {
  const [page,       setPage]       = useState("catalog");
  const [defaultNav, setDefaultNav] = useState("new");
  const [user,       setUser]       = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function goDesk(nav="new") { setDefaultNav(nav); setPage("workspace"); }

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
      fontFamily:F.sans, background:T.bg }}>
      {page==="catalog"
        ? <CatalogPage   onGoDesk={goDesk} />
        : <WorkspacePage onGoCatalog={()=>{ setPage("catalog"); setDefaultNav("new"); }}
                         onAdmin={onAdmin} defaultNav={defaultNav} user={user} />}
    </div>
  );
}
