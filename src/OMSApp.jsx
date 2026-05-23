import { useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   MERIDIAN STUDIO — Academic Order Management System
   Warm professional · Structured but approachable
   Pages: Landing · Calculator · OMS (Admin / Client / Writer)
───────────────────────────────────────────────────────────────────────────── */

// ── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  // Warm sidebar — deep charcoal with warmth, not cold black
  side:        "#1C1917",   // warm near-black
  sideMid:     "#292524",   // card hover in sidebar
  sideActive:  "#312E2B",   // active item bg
  sideText:    "#A8A29E",   // muted sidebar text
  sideBorder:  "rgba(255,255,255,0.06)",

  // Content surfaces — warm cream, not cold white
  canvas:      "#FAF9F7",   // page background
  surface:     "#FFFFFF",   // cards
  surfaceWarm: "#F5F3EF",   // alternate surface, input bg
  border:      "#E7E4DF",   // warm grey border
  borderMid:   "#D6D2CB",   // slightly stronger

  // Typography
  ink:         "#1C1917",   // main text — warm near-black
  inkMid:      "#57534E",   // secondary text
  inkLight:    "#A8A29E",   // tertiary, placeholders

  // Accent — Capella maroon, used sparingly
  accent:      "#8B1A1F",
  accentHover: "#7A1519",
  accentSoft:  "#FDF3F3",   // very light maroon tint
  accentMid:   "#FDEAEA",

  // Status — warm, readable
  sNew:     { dot:"#60A5FA", bg:"#EFF6FF", text:"#1D4ED8" },
  sBrief:   { dot:"#FBBF24", bg:"#FFFBEB", text:"#92400E" },
  sWrite:   { dot:"#A78BFA", bg:"#F5F3FF", text:"#5B21B6" },
  sReview:  { dot:"#F472B6", bg:"#FDF2F8", text:"#9D174D" },
  sRevise:  { dot:"#F87171", bg:"#FEF2F2", text:"#991B1B" },
  sDone:    { dot:"#34D399", bg:"#ECFDF5", text:"#065F46" },
  sClosed:  { dot:"#9CA3AF", bg:"#F9FAFB", text:"#374151" },

  // Pay
  pUnpaid:  { bg:"#FEF2F2", text:"#991B1B", border:"#FECACA" },
  pPartial: { bg:"#FFFBEB", text:"#92400E", border:"#FDE68A" },
  pPaid:    { bg:"#ECFDF5", text:"#065F46", border:"#A7F3D0" },
};

const F = {
  display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  body:    "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono:    "'DM Mono', 'Courier New', monospace",
};

// ── DATA MAPS ─────────────────────────────────────────────────────────────────
const STATUSES = {
  new:      { label:"New Order",        c: "sNew"    },
  brief:    { label:"Brief Received",   c: "sBrief"  },
  writing:  { label:"Writing",          c: "sWrite"  },
  review:   { label:"In Review",        c: "sReview" },
  revision: { label:"Revision",         c: "sRevise" },
  delivered:{ label:"Delivered",        c: "sDone"   },
  closed:   { label:"Closed",           c: "sClosed" },
};
function sc(s) { return C[STATUSES[s]?.c] || C.sNew; }

const PAY_CFG = {
  unpaid:  { label:"Unpaid",        ...C.pUnpaid  },
  partial: { label:"Deposit Paid",  ...C.pPartial },
  paid:    { label:"Paid in Full",  ...C.pPaid    },
};

const PIPELINE_STAGES = ["new","brief","writing","review","revision","delivered"];

// ── SEED DATA ─────────────────────────────────────────────────────────────────
const CLIENTS = [
  { id:"c1", initials:"KW", name:"Kelli Williams",  email:"kelli@email.com",  phone:"+1 281 677 0283", school:"Capella University", program:"DNP – Flex Path",  joined:"Nov 2025", status:"active" },
  { id:"c2", initials:"MC", name:"Martha Chen",     email:"martha@email.com", phone:"+1 346 555 0192", school:"Capella University", program:"DNP – Flex Path",  joined:"Nov 2025", status:"active" },
  { id:"c3", initials:"DO", name:"Darius Okafor",   email:"darius@email.com", phone:"+1 713 444 0231", school:"Walden University",  program:"MSN – PMHNP",     joined:"Oct 2025", status:"active" },
];

const WRITERS = [
  { id:"w1", initials:"AN", name:"Alex N.",   email:"alex@team.internal",   specialty:"Nursing / DNP",        active:2 },
  { id:"w2", initials:"JM", name:"Jordan M.", email:"jordan@team.internal", specialty:"Psychology / MSN",     active:1 },
];

const ORDERS_SEED = [
  { id:"MS-041", clientId:"c1", writerId:"w1", school:"Capella University", program:"DNP – Flex Path", course:"NHS-FPX 8002", title:"Collaboration, Communication & Case Analysis", status:"delivered", pay:"paid",    due:"2025-11-20", created:"2025-11-05", priority:"normal", files:[{name:"NHS8002_Brief.pdf",kind:"brief"},{name:"NHS8002_Final.docx",kind:"final"}],   notes:"Distinguished grade. Client very pleased.", log:[{on:"2025-11-05",msg:"Order created"},{on:"2025-11-06",msg:"Brief uploaded by client"},{on:"2025-11-13",msg:"Assigned to Alex N."},{on:"2025-11-17",msg:"Final delivered"}] },
  { id:"MS-042", clientId:"c1", writerId:"w1", school:"Capella University", program:"DNP – Flex Path", course:"NURS-FPX 8010", title:"Policy & Advocacy in DNP Practice",           status:"writing", pay:"partial", due:"2025-12-10", created:"2025-11-22", priority:"normal", files:[{name:"8010_Rubric.pdf",kind:"brief"}],                                                  notes:"", log:[{on:"2025-11-22",msg:"Order created"},{on:"2025-11-23",msg:"Brief received"},{on:"2025-11-24",msg:"Writing started"}] },
  { id:"MS-043", clientId:"c2", writerId:"w2", school:"Capella University", program:"DNP – Flex Path", course:"NHS-FPX 8002", title:"Collaboration, Communication & Case Analysis", status:"review",  pay:"partial", due:"2025-12-08", created:"2025-11-23", priority:"high",   files:[{name:"Martha_Brief.pdf",kind:"brief"},{name:"Martha_Draft.docx",kind:"draft"}],       notes:"", log:[{on:"2025-11-23",msg:"Order created"},{on:"2025-11-24",msg:"Brief received"},{on:"2025-11-27",msg:"Draft submitted for review"}] },
  { id:"MS-044", clientId:"c1", writerId:null,  school:"Capella University", program:"DNP – Flex Path", course:"NURS-FPX 9100", title:"Doctoral Project I – Defining the Project",  status:"new",     pay:"unpaid",  due:"2025-12-20", created:"2025-11-25", priority:"normal", files:[],                                                                                       notes:"Awaiting brief and deposit confirmation.", log:[{on:"2025-11-25",msg:"Order created by admin"}] },
  { id:"MS-045", clientId:"c3", writerId:"w2", school:"Walden University",  program:"MSN – PMHNP",    course:"NURS 6630",     title:"Psychotherapy Across the Lifespan",           status:"brief",   pay:"partial", due:"2025-12-15", created:"2025-11-26", priority:"normal", files:[{name:"NURS6630_Brief.pdf",kind:"brief"}],                                              notes:"", log:[{on:"2025-11-26",msg:"Order created"},{on:"2025-11-27",msg:"Brief received from Darius"}] },
  { id:"MS-046", clientId:"c2", writerId:"w1", school:"Capella University", program:"DNP – Flex Path", course:"NURS-FPX 8030", title:"Evidence-Based Practice & Applied Research",  status:"revision",pay:"partial", due:"2025-12-05", created:"2025-11-18", priority:"urgent", files:[{name:"8030_v1.docx",kind:"final"},{name:"Faculty_Notes.pdf",kind:"revision"}],         notes:"Faculty requests more citations in section 3.", log:[{on:"2025-11-18",msg:"Order created"},{on:"2025-11-21",msg:"Writing started"},{on:"2025-11-28",msg:"Delivered"},{on:"2025-11-29",msg:"Revision requested"}] },
];

// ── PRICING DATA (calculator only) ────────────────────────────────────────────
const PRICING_DATA = {
  "Capella University": {
    "DNP – Flex Path": {
      rateCore: 25, rateProject: 30,
      courses: [
        { code:"NHS-FPX 8002",  name:"Collaboration, Communication & Case Analysis", type:"core",    pages:32 },
        { code:"NHS-FPX 8040",  name:"Nursing Informatics & Healthcare Technologies", type:"core",    pages:32 },
        { code:"NURS-FPX 8010", name:"Policy & Advocacy in DNP Practice",             type:"core",    pages:32 },
        { code:"NURS-FPX 8012", name:"Population Health Management",                  type:"core",    pages:32 },
        { code:"NURS-FPX 8014", name:"Advanced Nursing Leadership",                   type:"core",    pages:32 },
        { code:"NURS-FPX 8030", name:"Evidence-Based Practice & Applied Research",    type:"core",    pages:32 },
        { code:"NURS-FPX 8045", name:"Financial & Business Aspects of Healthcare",    type:"core",    pages:32 },
        { code:"RSCH-FPX 7864", name:"Quantitative Design & Analysis",                type:"core",    pages:32 },
        { code:"NURS-FPX 9100", name:"Doctoral Project I – Defining the Project",     type:"project", pages:30 },
        { code:"NURS-FPX 9901", name:"Doctoral Project II – Logic Model & IRB",       type:"project", pages:35 },
        { code:"NURS-FPX 9902", name:"Doctoral Project III – Implementation",         type:"project", pages:40 },
        { code:"NURS-FPX 9903", name:"Doctoral Project IV – Data Analysis",           type:"project", pages:35 },
        { code:"NURS-FPX 9904", name:"Doctoral Project V – Final Report",             type:"project", pages:50 },
      ]
    }
  },
  "Walden University": {
    "MSN – PMHNP": {
      rateCore: 20, rateProject: 25,
      courses: [
        { code:"NURS 6512", name:"Advanced Health Assessment",          type:"core",    pages:28 },
        { code:"NURS 6521", name:"Advanced Pharmacology",               type:"core",    pages:28 },
        { code:"NURS 6630", name:"Psychotherapy Across the Lifespan",   type:"core",    pages:28 },
        { code:"NURS 6640", name:"Psychotherapy with Individuals",      type:"core",    pages:28 },
        { code:"NURS 6650", name:"Psychotherapy with Groups & Families",type:"core",    pages:28 },
      ]
    },
    "MSN – FNP": {
      rateCore: 20, rateProject: 25,
      courses: [
        { code:"NURS 6501", name:"Advanced Pathophysiology",            type:"core",    pages:28 },
        { code:"NURS 6512", name:"Advanced Health Assessment",          type:"core",    pages:28 },
        { code:"NURS 6521", name:"Advanced Pharmacology",               type:"core",    pages:28 },
      ]
    }
  },
  "Chamberlain University": {
    "MSN – NP": {
      rateCore: 20, rateProject: 25,
      courses: [
        { code:"NR 500", name:"Foundational Concepts of Advanced Practice Nursing", type:"core", pages:24 },
        { code:"NR 501", name:"Theoretical Basis for Advanced Nursing Practice",    type:"core", pages:24 },
        { code:"NR 503", name:"Population Health & Epidemiology",                   type:"core", pages:24 },
      ]
    }
  }
};

// ── ATOMS ─────────────────────────────────────────────────────────────────────
function Pip({ status }) {
  const col = sc(status);
  const label = STATUSES[status]?.label || status;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      fontSize:11, fontWeight:600, fontFamily:F.body,
      color:col.text, background:col.bg,
      padding:"3px 10px", borderRadius:99, letterSpacing:"0.1px" }}>
      <span style={{ width:5, height:5, borderRadius:"50%",
        background:col.dot, flexShrink:0 }} />
      {label}
    </span>
  );
}

function PayTag({ pay }) {
  const p = PAY_CFG[pay] || PAY_CFG.unpaid;
  return (
    <span style={{ fontSize:11, fontWeight:700, fontFamily:F.body,
      color:p.text, background:p.bg,
      border:`1px solid ${p.border}`,
      padding:"2px 8px", borderRadius:4, letterSpacing:"0.3px" }}>
      {p.label}
    </span>
  );
}

function Ava({ initials, size=32, warm=false }) {
  const bg = warm ? "#78716C" : C.accent;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%",
      background:bg, color:"#fff", display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size*0.34, fontWeight:700,
      fontFamily:F.body, flexShrink:0, letterSpacing:"0.5px" }}>
      {initials}
    </div>
  );
}

function PFlag({ p }) {
  if (!p || p==="normal") return null;
  return (
    <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.8px",
      fontFamily:F.body, textTransform:"uppercase",
      color: p==="urgent" ? "#991B1B" : "#92400E",
      background: p==="urgent" ? "#FEF2F2" : "#FFFBEB",
      border: `1px solid ${p==="urgent" ? "#FECACA" : "#FDE68A"}`,
      padding:"1px 7px", borderRadius:3 }}>
      {p}
    </span>
  );
}

function Btn({ children, variant="accent", onClick, style={}, size="md", disabled=false }) {
  const v = {
    accent:   { bg:C.accent,      color:"#fff",      border:"none"                      },
    outline:  { bg:"transparent", color:C.accent,     border:`1.5px solid ${C.accent}`   },
    soft:     { bg:C.surfaceWarm, color:C.inkMid,     border:`1.5px solid ${C.border}`   },
    ghost:    { bg:"transparent", color:C.inkMid,     border:`1.5px solid ${C.border}`   },
    danger:   { bg:"#FEF2F2",     color:"#991B1B",    border:"1.5px solid #FECACA"       },
    sideAccent:{bg:C.accent,      color:"#fff",        border:"none"                     },
  }[variant] || {};
  const pad = size==="sm" ? "5px 12px" : size==="lg" ? "12px 26px" : "8px 17px";
  const fs  = size==="sm" ? 12 : size==="lg" ? 14 : 13;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:pad, fontSize:fs, fontWeight:600, fontFamily:F.body,
        background:v.bg, color:v.color, border:v.border||"none",
        borderRadius:8, cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?0.4:1, letterSpacing:"0.15px", lineHeight:1,
        transition:"opacity 0.14s, transform 0.1s", ...style }}
      onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.opacity="0.82"; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type="text", placeholder="", as="input" }) {
  const shared = {
    width:"100%", padding:"9px 13px",
    border:`1.5px solid ${C.border}`, borderRadius:8,
    fontSize:13, fontFamily:F.body, color:C.ink,
    background:C.surface, outline:"none", boxSizing:"border-box",
    transition:"border-color 0.15s",
  };
  return (
    <div style={{ marginBottom:16 }}>
      {label && <div style={{ fontSize:12, fontWeight:600, color:C.inkMid,
        marginBottom:5, fontFamily:F.body, letterSpacing:"0.2px" }}>{label}</div>}
      {as==="textarea"
        ? <textarea value={value} onChange={e=>onChange(e.target.value)}
            placeholder={placeholder} rows={3}
            style={{ ...shared, resize:"vertical" }}
            onFocus={e=>e.target.style.borderColor=C.accent}
            onBlur={e=>e.target.style.borderColor=C.border} />
        : <input value={value} onChange={e=>onChange(e.target.value)}
            type={type} placeholder={placeholder}
            style={shared}
            onFocus={e=>e.target.style.borderColor=C.accent}
            onBlur={e=>e.target.style.borderColor=C.border} />
      }
    </div>
  );
}

function Drop({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <div style={{ fontSize:12, fontWeight:600, color:C.inkMid,
        marginBottom:5, fontFamily:F.body }}>{label}</div>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 13px", border:`1.5px solid ${C.border}`,
          borderRadius:8, fontSize:13, fontFamily:F.body,
          color:C.ink, background:C.surface, outline:"none" }}>
        {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
      </select>
    </div>
  );
}

function Rule() {
  return <div style={{ height:1, background:C.border, margin:"18px 0" }} />;
}

function Label({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.1px",
      textTransform:"uppercase", color:C.inkLight,
      fontFamily:F.body, marginBottom:14,
      paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function Sidebar({ role, view, setView, setRole }) {
  const navs = {
    admin:  [
      { id:"home",     icon:"⊞", label:"Dashboard" },
      { id:"pipeline", icon:"⊟", label:"Pipeline"  },
      { id:"orders",   icon:"≡",  label:"Orders"    },
      { id:"clients",  icon:"◎",  label:"Clients"   },
      { id:"writers",  icon:"◈",  label:"Writers"   },
      { id:"billing",  icon:"◇",  label:"Billing"   },
      { id:"settings", icon:"⚙",  label:"Settings"  },
    ],
    client: [
      { id:"home",    icon:"⊞", label:"Overview"  },
      { id:"orders",  icon:"≡",  label:"My Orders" },
      { id:"profile", icon:"◎",  label:"Profile"   },
    ],
    writer: [
      { id:"home",     icon:"⊞", label:"Dashboard"  },
      { id:"queue",    icon:"≡",  label:"My Queue"   },
      { id:"done",     icon:"✓",  label:"Completed"  },
    ],
  };
  const items = navs[role] || navs.admin;
  const me = role==="admin" ? { initials:"NB", name:"Nurb B.", role:"Admin" }
           : role==="client" ? { initials:"KW", name:"Kelli W.", role:"Client" }
           : { initials:"AN", name:"Alex N.", role:"Writer" };

  return (
    <aside style={{ width:214, background:C.side, display:"flex",
      flexDirection:"column", height:"100vh", flexShrink:0 }}>
      {/* Brand */}
      <div style={{ padding:"22px 18px 16px", borderBottom:`1px solid ${C.sideBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:C.accent,
            borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(139,26,31,0.4)" }}>
            <span style={{ color:"#fff", fontSize:16, fontWeight:700, fontFamily:F.display }}>M</span>
          </div>
          <div>
            <div style={{ color:"#FAFAF9", fontSize:14, fontWeight:600,
              fontFamily:F.display, letterSpacing:"0.2px" }}>Meridian</div>
            <div style={{ color:C.sideText, fontSize:9, letterSpacing:"2px",
              textTransform:"uppercase", fontFamily:F.body }}>Studio</div>
          </div>
        </div>
      </div>

      {/* Role switcher */}
      <div style={{ padding:"10px 10px 6px" }}>
        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:7,
          padding:3, display:"flex", gap:2 }}>
          {["admin","client","writer"].map(r=>(
            <button key={r} onClick={()=>{ setRole(r); setView("home"); }}
              style={{ flex:1, padding:"5px 0", fontSize:10, fontWeight:700,
                letterSpacing:"0.6px", textTransform:"uppercase", fontFamily:F.body,
                background: role===r ? C.accent : "transparent",
                color: role===r ? "#fff" : C.sideText,
                border:"none", borderRadius:5, cursor:"pointer", transition:"all 0.14s" }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"6px 8px", overflowY:"auto" }}>
        {items.map(item=>{
          const active = view===item.id;
          return (
            <button key={item.id} onClick={()=>setView(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center",
                gap:10, padding:"9px 12px", marginBottom:1,
                borderRadius:7, border:"none", cursor:"pointer",
                background: active ? C.sideActive : "transparent",
                transition:"background 0.12s" }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=C.sideMid; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize:13, color: active ? "#FAFAF9" : C.sideText,
                width:16, textAlign:"center", flexShrink:0 }}>{item.icon}</span>
              <span style={{ fontSize:13, fontWeight: active ? 600 : 400,
                fontFamily:F.body, color: active ? "#FAFAF9" : C.sideText }}>
                {item.label}
              </span>
              {active && <span style={{ marginLeft:"auto", width:4, height:4,
                borderRadius:"50%", background:C.accent }} />}
            </button>
          );
        })}
      </nav>

      {/* Me */}
      <div style={{ padding:"14px 18px", borderTop:`1px solid ${C.sideBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Ava initials={me.initials} size={30} warm />
          <div>
            <div style={{ color:"#FAFAF9", fontSize:12, fontWeight:600, fontFamily:F.body }}>{me.name}</div>
            <div style={{ color:C.sideText, fontSize:10, fontFamily:F.body }}>{me.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── PAGE HEADER ───────────────────────────────────────────────────────────────
function PageHead({ title, sub, actions }) {
  return (
    <div style={{ padding:"24px 28px 0",
      display:"flex", justifyContent:"space-between",
      alignItems:"flex-end", flexWrap:"wrap", gap:12, marginBottom:24 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:600, fontFamily:F.display,
          color:C.ink, margin:0, letterSpacing:"-0.3px", lineHeight:1.2 }}>
          {title}
        </h1>
        {sub && <p style={{ fontSize:13, color:C.inkLight, margin:"4px 0 0",
          fontFamily:F.body }}>{sub}</p>}
      </div>
      {actions && <div style={{ display:"flex", gap:8 }}>{actions}</div>}
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function Stat({ label, value, note, highlight=false }) {
  return (
    <div style={{ background: highlight ? C.accent : C.surface,
      border:`1px solid ${highlight ? "transparent" : C.border}`,
      borderRadius:10, padding:"18px 22px",
      boxShadow: highlight ? "0 4px 16px rgba(139,26,31,0.2)" : "0 1px 4px rgba(28,25,23,0.04)" }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1px",
        textTransform:"uppercase", fontFamily:F.body, marginBottom:8,
        color: highlight ? "rgba(255,255,255,0.6)" : C.inkLight }}>
        {label}
      </div>
      <div style={{ fontSize:30, fontWeight:600, fontFamily:F.display,
        color: highlight ? "#fff" : C.ink, lineHeight:1, letterSpacing:"-0.5px" }}>
        {value}
      </div>
      {note && <div style={{ fontSize:12, fontFamily:F.body, marginTop:5,
        color: highlight ? "rgba(255,255,255,0.5)" : C.inkLight }}>{note}</div>}
    </div>
  );
}

// ── KANBAN ────────────────────────────────────────────────────────────────────
function Kanban({ orders, clients, onOpen }) {
  return (
    <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:12 }}>
      {PIPELINE_STAGES.map(stage=>{
        const col    = sc(stage);
        const staged = orders.filter(o=>o.status===stage);
        return (
          <div key={stage} style={{ minWidth:210, flex:"0 0 210px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10,
              padding:"7px 11px", background:col.bg, borderRadius:7,
              border:`1px solid ${col.bg}` }}>
              <span style={{ width:7, height:7, borderRadius:"50%",
                background:col.dot, flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:700, color:col.text,
                fontFamily:F.body, flex:1 }}>{STATUSES[stage].label}</span>
              <span style={{ fontSize:11, color:col.text, opacity:0.6,
                fontFamily:F.body }}>{staged.length}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {staged.map(order=>{
                const client = clients.find(c=>c.id===order.clientId);
                return (
                  <div key={order.id} onClick={()=>onOpen(order)}
                    style={{ background:C.surface,
                      border:`1px solid ${C.border}`,
                      borderLeft:`3px solid ${col.dot}`,
                      borderRadius:8, padding:"11px 13px",
                      cursor:"pointer", transition:"all 0.14s" }}
                    onMouseEnter={e=>{
                      e.currentTarget.style.boxShadow="0 4px 16px rgba(28,25,23,0.1)";
                      e.currentTarget.style.transform="translateY(-1px)";
                    }}
                    onMouseLeave={e=>{
                      e.currentTarget.style.boxShadow="none";
                      e.currentTarget.style.transform="translateY(0)";
                    }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:6 }}>
                      <span style={{ fontSize:10, fontFamily:F.mono,
                        color:C.accent, fontWeight:600 }}>{order.id}</span>
                      <PFlag p={order.priority} />
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.ink,
                      fontFamily:F.mono, marginBottom:4 }}>{order.course}</div>
                    <div style={{ fontSize:11, color:C.inkMid, fontFamily:F.body,
                      lineHeight:1.4, marginBottom:10,
                      display:"-webkit-box", WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {order.title}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center" }}>
                      {client && (
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <Ava initials={client.initials} size={18} />
                          <span style={{ fontSize:10, color:C.inkMid, fontFamily:F.body }}>
                            {client.name.split(" ")[0]}
                          </span>
                        </div>
                      )}
                      {order.due && (
                        <span style={{ fontSize:10, color:C.inkLight, fontFamily:F.body }}>
                          {order.due}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {staged.length===0 && (
                <div style={{ padding:"20px 0", textAlign:"center",
                  fontSize:12, color:C.inkLight, fontFamily:F.body }}>
                  —
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ORDER DRAWER ──────────────────────────────────────────────────────────────
function Drawer({ order, clients, writers, isAdmin, onClose, onSave }) {
  const [status,   setStatus]   = useState(order.status);
  const [pay,      setPay]      = useState(order.pay);
  const [writerId, setWriterId] = useState(order.writerId||"");
  const [priority, setPriority] = useState(order.priority);
  const [notes,    setNotes]    = useState(order.notes);

  const client = clients.find(c=>c.id===order.clientId);
  const writer = writers.find(w=>w.id===order.writerId);
  const kindIcons = { brief:"📄", draft:"📝", final:"✅", revision:"🔄" };

  const statusOpts   = Object.entries(STATUSES).map(([v,d])=>({ v, l:d.label }));
  const payOpts      = Object.entries(PAY_CFG).map(([v,d])=>({ v, l:d.label }));
  const writerOpts   = [{ v:"", l:"Unassigned" }, ...writers.map(w=>({ v:w.id, l:w.name }))];
  const priorityOpts = [{v:"normal",l:"Normal"},{v:"high",l:"High"},{v:"urgent",l:"Urgent"}];

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0,
        background:"rgba(28,25,23,0.4)", zIndex:400, backdropFilter:"blur(2px)" }} />
      <div style={{ position:"fixed", top:0, right:0, width:460, height:"100vh",
        background:C.surface, zIndex:401, display:"flex", flexDirection:"column",
        boxShadow:"-8px 0 40px rgba(28,25,23,0.14)", overflowY:"auto" }}>

        {/* Drawer top */}
        <div style={{ background:C.side, padding:"20px 24px",
          borderBottom:`1px solid ${C.sideBorder}` }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:10, fontFamily:F.mono, color:C.accent,
                letterSpacing:"1px", marginBottom:5 }}>{order.id}</div>
              <div style={{ fontSize:17, fontWeight:600, fontFamily:F.display,
                color:"#FAFAF9", lineHeight:1.25, marginBottom:4 }}>
                {order.course}
              </div>
              <div style={{ fontSize:12, color:"rgba(250,250,249,0.45)",
                fontFamily:F.body, lineHeight:1.4 }}>{order.title}</div>
              <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
                <Pip status={status} />
                <PFlag p={priority} />
              </div>
            </div>
            <button onClick={onClose}
              style={{ background:"transparent", border:"none",
                color:"rgba(250,250,249,0.35)", fontSize:20,
                cursor:"pointer", padding:4, lineHeight:1 }}>✕</button>
          </div>
        </div>

        <div style={{ flex:1, padding:22, overflowY:"auto" }}>
          {/* Client strip */}
          {client && (
            <div style={{ display:"flex", alignItems:"center", gap:12,
              background:C.surfaceWarm, borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
              <Ava initials={client.initials} size={36} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, fontFamily:F.body, color:C.ink }}>
                  {client.name}
                </div>
                <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body }}>
                  {client.school} · {client.program}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:C.inkLight, fontFamily:F.body }}>Due</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.ink,
                  fontFamily:F.body }}>{order.due||"TBD"}</div>
              </div>
            </div>
          )}

          {/* Files */}
          <Label>Files</Label>
          {order.files.length===0
            ? <div style={{ fontSize:13, color:C.inkLight, fontFamily:F.body,
                marginBottom:20 }}>No files attached yet.</div>
            : <div style={{ marginBottom:20 }}>
                {order.files.map((f,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"9px 13px", background:C.surfaceWarm,
                    borderRadius:7, marginBottom:6, border:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:15 }}>{kindIcons[f.kind]||"📎"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500,
                        fontFamily:F.body, color:C.ink }}>{f.name}</div>
                      <div style={{ fontSize:11, color:C.inkLight,
                        fontFamily:F.body, textTransform:"capitalize" }}>{f.kind}</div>
                    </div>
                    <Btn size="sm" variant="soft">↓</Btn>
                  </div>
                ))}
              </div>
          }
          <label style={{ display:"flex", alignItems:"center", gap:8,
            padding:"9px 14px", border:`1.5px dashed ${C.borderMid}`,
            borderRadius:8, cursor:"pointer", marginBottom:20,
            fontSize:13, color:C.inkMid, fontFamily:F.body }}>
            <span style={{ fontSize:16 }}>📎</span>
            <span>Upload file</span>
            <input type="file" style={{ display:"none" }} />
          </label>

          {/* Admin controls */}
          {isAdmin && (
            <>
              <Rule />
              <Label>Manage Order</Label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Drop label="Status"   value={status}   onChange={setStatus}   options={statusOpts}   />
                <Drop label="Payment"  value={pay}      onChange={setPay}      options={payOpts}      />
                <Drop label="Writer"   value={writerId} onChange={setWriterId} options={writerOpts}   />
                <Drop label="Priority" value={priority} onChange={setPriority} options={priorityOpts} />
              </div>
            </>
          )}

          <Rule />
          <Label>Notes</Label>
          <Field as="textarea" value={notes} onChange={setNotes}
            placeholder={isAdmin ? "Internal notes…" : ""} />

          <Rule />
          <Label>Activity</Label>
          <div>
            {[...order.log].reverse().map((ev,i)=>(
              <div key={i} style={{ display:"flex", gap:12,
                marginBottom:12, alignItems:"flex-start" }}>
                <div style={{ position:"relative", flexShrink:0 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%",
                    background: i===0 ? C.accent : C.borderMid, marginTop:3 }} />
                  {i < order.log.length-1 && (
                    <div style={{ position:"absolute", left:3, top:10,
                      width:1, height:"calc(100% + 8px)", background:C.border }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize:13, fontFamily:F.body, color:C.ink, lineHeight:1.4 }}>{ev.msg}</div>
                  <div style={{ fontSize:11, color:C.inkLight, fontFamily:F.body, marginTop:1 }}>{ev.on}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`,
            display:"flex", gap:10, justifyContent:"flex-end",
            background:C.surface }}>
            <Btn variant="ghost" onClick={onClose}>Discard</Btn>
            <Btn onClick={()=>{ onSave({...order,status,pay,writerId,notes,priority}); onClose(); }}>
              Save Changes
            </Btn>
          </div>
        )}
      </div>
    </>
  );
}

// ── NEW ORDER MODAL ───────────────────────────────────────────────────────────
function NewOrderModal({ clients, writers, isAdmin, defaultClient, onAdd, onClose }) {
  const [step,      setStep]     = useState(1);
  const [clientId,  setClientId] = useState(defaultClient||clients[0]?.id||"");
  const [school,    setSchool]   = useState("Capella University");
  const [program,   setProgram]  = useState("DNP – Flex Path");
  const [course,    setCourse]   = useState("");
  const [title,     setTitle]    = useState("");
  const [due,       setDue]      = useState("");
  const [priority,  setPriority] = useState("normal");
  const [writerId,  setWriterId] = useState("");
  const [notes,     setNotes]    = useState("");

  const schoolList   = Object.keys(PRICING_DATA);
  const programList  = Object.keys(PRICING_DATA[school]||{});
  const clientOpts   = clients.map(c=>({ v:c.id, l:c.name }));
  const writerOpts   = [{v:"",l:"Unassigned"},...writers.map(w=>({v:w.id,l:w.name}))];
  const priorityOpts = [{v:"normal",l:"Normal"},{v:"high",l:"High"},{v:"urgent",l:"Urgent"}];
  const stepLabels   = ["Program","Assignment","Review"];

  function submit() {
    onAdd({
      id:`MS-${String(Date.now()).slice(-4)}`,
      clientId: isAdmin ? clientId : defaultClient,
      writerId: writerId||null,
      school, program, course, title,
      status:"new", pay:"unpaid",
      due, created:new Date().toISOString().slice(0,10),
      priority, notes, files:[],
      log:[{ on:new Date().toISOString().slice(0,10), msg:"Order created" }],
    });
    onClose();
  }

  const canNext1 = school && program;
  const canNext2 = course.trim() && title.trim();

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0,
        background:"rgba(28,25,23,0.45)", zIndex:500, backdropFilter:"blur(2px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)", width:500,
        background:C.surface, borderRadius:12, zIndex:501,
        boxShadow:"0 24px 64px rgba(28,25,23,0.18)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:C.side, padding:"18px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, fontFamily:F.body, color:C.accent,
                letterSpacing:"1.8px", textTransform:"uppercase", marginBottom:4 }}>
                New Order · Step {step} of 3
              </div>
              <div style={{ fontSize:17, fontWeight:600, fontFamily:F.display,
                color:"#FAFAF9" }}>{stepLabels[step-1]}</div>
            </div>
            <button onClick={onClose}
              style={{ background:"transparent", border:"none",
                color:"rgba(250,250,249,0.35)", fontSize:20, cursor:"pointer" }}>✕</button>
          </div>
          {/* Progress */}
          <div style={{ display:"flex", gap:4, marginTop:14 }}>
            {[1,2,3].map(n=>(
              <div key={n} style={{ flex:1, height:3, borderRadius:2,
                background: n<=step ? C.accent : "rgba(255,255,255,0.1)",
                transition:"background 0.3s" }} />
            ))}
          </div>
        </div>

        <div style={{ padding:24 }}>
          {step===1 && (
            <>
              {isAdmin && <Drop label="Client" value={clientId} onChange={setClientId} options={clientOpts} />}
              <Drop label="School"   value={school}   onChange={v=>{ setSchool(v); setProgram(Object.keys(PRICING_DATA[v]||{})[0]||""); }} options={schoolList} />
              <Drop label="Program"  value={program}  onChange={setProgram}  options={programList} />
              {isAdmin && <Drop label="Assign Writer" value={writerId} onChange={setWriterId} options={writerOpts} />}
              <Drop label="Priority" value={priority} onChange={setPriority} options={priorityOpts} />
            </>
          )}
          {step===2 && (
            <>
              <Field label="Course Code"       value={course} onChange={setCourse} placeholder="e.g. NHS-FPX 8002" />
              <Field label="Assignment Title"  value={title}  onChange={setTitle}  placeholder="e.g. Collaboration, Communication & Case Analysis" />
              <Field label="Due Date"          value={due}    onChange={setDue}    type="date" />
              <Field label="Notes / Instructions" as="textarea" value={notes} onChange={setNotes} placeholder="Any specific requirements…" />
            </>
          )}
          {step===3 && (
            <div style={{ background:C.surfaceWarm, borderRadius:8, padding:18 }}>
              {[
                ["Client",   clients.find(c=>c.id===clientId)?.name || "—"],
                ["School",   school],
                ["Program",  program],
                ["Course",   course||"—"],
                ["Title",    title||"—"],
                ["Due",      due||"Not set"],
                ["Priority", priority],
                ["Writer",   writers.find(w=>w.id===writerId)?.name||"Unassigned"],
              ].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                  padding:"7px 0", borderBottom:`1px solid ${C.border}`,
                  fontSize:13, fontFamily:F.body }}>
                  <span style={{ color:C.inkLight }}>{k}</span>
                  <span style={{ fontWeight:600, color:C.ink,
                    textAlign:"right", maxWidth:300 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            {step>1 && <Btn variant="ghost" onClick={()=>setStep(s=>s-1)}>← Back</Btn>}
            <Btn variant="soft" onClick={onClose}>Cancel</Btn>
            {step<3
              ? <Btn onClick={()=>setStep(s=>s+1)}
                  disabled={step===1 ? !canNext1 : !canNext2}>
                  Continue →
                </Btn>
              : <Btn onClick={submit}>Create Order</Btn>
            }
          </div>
        </div>
      </div>
    </>
  );
}

// ── VIEWS ─────────────────────────────────────────────────────────────────────
function AdminHome({ orders, clients, writers, onOpen, onNew }) {
  const active    = orders.filter(o=>!["delivered","closed"].includes(o.status));
  const urgent    = orders.filter(o=>o.priority==="urgent");
  const unassigned= orders.filter(o=>!o.writerId && o.status!=="closed");
  const today     = new Date().toISOString().slice(0,10);
  const overdue   = orders.filter(o=>o.due && o.due<today && !["delivered","closed"].includes(o.status));

  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title="Dashboard"
        sub={new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
        actions={<Btn onClick={onNew}>+ New Order</Btn>} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:30 }}>
        <Stat label="Active Orders"  value={active.length}      note={`of ${orders.length} total`} />
        <Stat label="Urgent"         value={urgent.length}      note="need attention"       highlight={urgent.length>0} />
        <Stat label="Unassigned"     value={unassigned.length}  note="need a writer" />
        <Stat label="Overdue"        value={overdue.length}     note="past due date"        highlight={overdue.length>0} />
      </div>

      <Label>Work Pipeline</Label>
      <Kanban orders={orders} clients={clients} onOpen={onOpen} />

      <div style={{ marginTop:28 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:14 }}>
          <Label>Recent Orders</Label>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:10, overflow:"hidden",
          boxShadow:"0 1px 4px rgba(28,25,23,0.05)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:C.surfaceWarm }}>
                {["Order","Client","Course","Status","Writer","Due","Payment"].map(h=>(
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left",
                    fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                    textTransform:"uppercase", color:C.inkLight,
                    fontFamily:F.body, borderBottom:`1px solid ${C.border}`,
                    whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0,5).map(o=>{
                const cl = clients.find(c=>c.id===o.clientId);
                const wr = writers.find(w=>w.id===o.writerId);
                return (
                  <tr key={o.id} onClick={()=>onOpen(o)}
                    style={{ cursor:"pointer", borderBottom:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.surfaceWarm}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"11px 16px", fontFamily:F.mono, fontSize:12,
                      color:C.accent, fontWeight:600 }}>{o.id}</td>
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {cl && <Ava initials={cl.initials} size={24} />}
                        <span style={{ fontSize:13, fontFamily:F.body, color:C.ink }}>{cl?.name||"—"}</span>
                      </div>
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:12,
                      fontFamily:F.mono, color:C.inkMid }}>{o.course}</td>
                    <td style={{ padding:"11px 16px" }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <PFlag p={o.priority} /><Pip status={o.status} />
                      </div>
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:12,
                      fontFamily:F.body, color:C.inkMid }}>
                      {wr ? <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <Ava initials={wr.initials} size={20} warm />{wr.name}
                      </div> : <span style={{ color:C.inkLight }}>Unassigned</span>}
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:12,
                      fontFamily:F.body, color:C.inkMid,
                      whiteSpace:"nowrap" }}>{o.due||"—"}</td>
                    <td style={{ padding:"11px 16px" }}><PayTag pay={o.pay} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OrdersView({ orders, clients, writers, onOpen, onNew }) {
  const [q,      setQ]      = useState("");
  const [fStatus,setFStatus]= useState("all");
  const [fClient,setFClient]= useState("all");
  const [fPri,   setFPri]   = useState("all");

  const filtered = orders.filter(o=>{
    if(fStatus!=="all" && o.status!==fStatus) return false;
    if(fClient!=="all" && o.clientId!==fClient) return false;
    if(fPri!=="all"    && o.priority!==fPri)    return false;
    if(q && ![o.id,o.course,o.title].some(x=>x.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const sOpts = [{v:"all",l:"All Statuses"},...Object.entries(STATUSES).map(([v,d])=>({v,l:d.label}))];
  const cOpts = [{v:"all",l:"All Clients"},...clients.map(c=>({v:c.id,l:c.name}))];
  const pOpts = [{v:"all",l:"All Priority"},{v:"urgent",l:"Urgent"},{v:"high",l:"High"},{v:"normal",l:"Normal"}];

  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title="Orders" sub={`${orders.length} total · ${filtered.length} shown`}
        actions={<Btn onClick={onNew}>+ New Order</Btn>} />

      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:10, padding:"14px 18px", marginBottom:18,
        display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end",
        boxShadow:"0 1px 4px rgba(28,25,23,0.05)" }}>
        <div style={{ flex:"1 1 200px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.inkLight,
            marginBottom:4, fontFamily:F.body, letterSpacing:"0.5px",
            textTransform:"uppercase" }}>Search</div>
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Order ID, course, title…"
            style={{ width:"100%", padding:"8px 12px", border:`1.5px solid ${C.border}`,
              borderRadius:7, fontSize:13, fontFamily:F.body,
              outline:"none", color:C.ink, background:C.surface, boxSizing:"border-box" }} />
        </div>
        {[[fStatus,setFStatus,sOpts,"Status"],[fClient,setFClient,cOpts,"Client"],[fPri,setFPri,pOpts,"Priority"]].map(([val,set,opts,lbl])=>(
          <div key={lbl} style={{ flex:"1 1 130px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.inkLight,
              marginBottom:4, fontFamily:F.body, letterSpacing:"0.5px",
              textTransform:"uppercase" }}>{lbl}</div>
            <select value={val} onChange={e=>set(e.target.value)}
              style={{ width:"100%", padding:"8px 12px",
                border:`1.5px solid ${C.border}`, borderRadius:7,
                fontSize:13, fontFamily:F.body, color:C.ink, background:C.surface }}>
              {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        ))}
        <Btn size="sm" variant="ghost" onClick={()=>{ setQ(""); setFStatus("all"); setFClient("all"); setFPri("all"); }}>
          Reset
        </Btn>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:10, overflow:"hidden",
        boxShadow:"0 1px 4px rgba(28,25,23,0.05)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.surfaceWarm }}>
              {["Order","Client","Course","Status","Writer","Due","Payment"].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left",
                  fontSize:11, fontWeight:700, letterSpacing:"0.8px",
                  textTransform:"uppercase", color:C.inkLight,
                  fontFamily:F.body, borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o=>{
              const cl = clients.find(c=>c.id===o.clientId);
              const wr = writers.find(w=>w.id===o.writerId);
              return (
                <tr key={o.id} onClick={()=>onOpen(o)}
                  style={{ cursor:"pointer", borderBottom:`1px solid ${C.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surfaceWarm}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"11px 16px", fontFamily:F.mono,
                    fontSize:12, color:C.accent, fontWeight:600 }}>{o.id}</td>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {cl && <Ava initials={cl.initials} size={24} />}
                      <div>
                        <div style={{ fontSize:13, fontFamily:F.body, color:C.ink, fontWeight:500 }}>{cl?.name||"—"}</div>
                        <div style={{ fontSize:11, fontFamily:F.body, color:C.inkLight }}>{cl?.school}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ fontSize:12, fontFamily:F.mono, color:C.ink, fontWeight:600 }}>{o.course}</div>
                    <div style={{ fontSize:11, fontFamily:F.body, color:C.inkLight,
                      maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {o.title}
                    </div>
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                      <PFlag p={o.priority} /><Pip status={o.status} />
                    </div>
                  </td>
                  <td style={{ padding:"11px 16px", fontSize:13, fontFamily:F.body, color:C.inkMid }}>
                    {wr
                      ? <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <Ava initials={wr.initials} size={20} warm />{wr.name}
                        </div>
                      : <span style={{ color:C.inkLight, fontSize:12 }}>Unassigned</span>
                    }
                  </td>
                  <td style={{ padding:"11px 16px", fontSize:12,
                    fontFamily:F.body, color:C.inkMid, whiteSpace:"nowrap" }}>{o.due||"—"}</td>
                  <td style={{ padding:"11px 16px" }}><PayTag pay={o.pay} /></td>
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={7} style={{ padding:40, textAlign:"center",
                color:C.inkLight, fontFamily:F.body, fontSize:14 }}>
                No orders match your filters
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientsView({ clients, orders }) {
  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title="Clients" sub={`${clients.length} active clients`} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(290px,1fr))", gap:16 }}>
        {clients.map(client=>{
          const mine   = orders.filter(o=>o.clientId===client.id);
          const active = mine.filter(o=>!["delivered","closed"].includes(o.status));
          return (
            <div key={client.id}
              style={{ background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:10, padding:22, cursor:"pointer",
                boxShadow:"0 1px 4px rgba(28,25,23,0.04)",
                transition:"border-color 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.boxShadow="0 4px 16px rgba(139,26,31,0.1)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="0 1px 4px rgba(28,25,23,0.04)"; }}>
              <div style={{ display:"flex", gap:14, marginBottom:16 }}>
                <Ava initials={client.initials} size={46} />
                <div>
                  <div style={{ fontSize:16, fontWeight:600, fontFamily:F.display, color:C.ink }}>{client.name}</div>
                  <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body, marginTop:2 }}>{client.email}</div>
                  <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body }}>{client.phone}</div>
                </div>
              </div>
              <Rule />
              <div style={{ fontSize:12, fontFamily:F.body, color:C.inkMid, marginBottom:12 }}>
                <strong style={{ color:C.ink }}>{client.school}</strong><br/>{client.program}
              </div>
              <div style={{ display:"flex", gap:20 }}>
                <div>
                  <div style={{ fontSize:10, color:C.inkLight, fontFamily:F.body, textTransform:"uppercase", letterSpacing:"0.5px" }}>Orders</div>
                  <div style={{ fontSize:20, fontWeight:600, fontFamily:F.display, color:C.ink }}>{mine.length}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.inkLight, fontFamily:F.body, textTransform:"uppercase", letterSpacing:"0.5px" }}>Active</div>
                  <div style={{ fontSize:20, fontWeight:600, fontFamily:F.display, color:C.accent }}>{active.length}</div>
                </div>
                <div style={{ marginLeft:"auto", alignSelf:"flex-end" }}>
                  <div style={{ fontSize:11, color:C.inkLight, fontFamily:F.body }}>Since {client.joined}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WritersView({ writers, orders }) {
  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title="Writers" sub={`${writers.length} team members`} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:16 }}>
        {writers.map(w=>{
          const mine   = orders.filter(o=>o.writerId===w.id);
          const active = mine.filter(o=>!["delivered","closed"].includes(o.status));
          const done   = mine.filter(o=>["delivered","closed"].includes(o.status));
          return (
            <div key={w.id} style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:10, padding:22,
              boxShadow:"0 1px 4px rgba(28,25,23,0.04)" }}>
              <div style={{ display:"flex", gap:14, marginBottom:16 }}>
                <Ava initials={w.initials} size={46} warm />
                <div>
                  <div style={{ fontSize:16, fontWeight:600, fontFamily:F.display, color:C.ink }}>{w.name}</div>
                  <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body, marginTop:2 }}>{w.email}</div>
                  <div style={{ fontSize:12, color:C.accent, fontFamily:F.body, fontWeight:600, marginTop:2 }}>{w.specialty}</div>
                </div>
              </div>
              <Rule />
              <div style={{ display:"flex", gap:24, marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.5px", color:C.inkLight, fontFamily:F.body }}>Active</div>
                  <div style={{ fontSize:22, fontWeight:600, fontFamily:F.display, color:C.ink }}>{active.length}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.5px", color:C.inkLight, fontFamily:F.body }}>Done</div>
                  <div style={{ fontSize:22, fontWeight:600, fontFamily:F.display, color:C.ink }}>{done.length}</div>
                </div>
              </div>
              {active.map(o=>(
                <div key={o.id} style={{ display:"flex", justifyContent:"space-between",
                  padding:"6px 0", borderBottom:`1px solid ${C.border}`,
                  fontSize:12, fontFamily:F.body }}>
                  <span style={{ color:C.inkMid, fontFamily:F.mono }}>{o.course}</span>
                  <Pip status={o.status} />
                </div>
              ))}
              {active.length===0 && <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body }}>No active assignments</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BillingView({ orders, clients }) {
  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title="Billing" sub="Payment records across all clients" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
        <Stat label="Total Value"    value="$18,400" note="all orders" />
        <Stat label="Collected"      value="$12,200" note="deposits + balances" highlight />
        <Stat label="Outstanding"    value="$6,200"  note="pending collection" />
      </div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:10, padding:22, boxShadow:"0 1px 4px rgba(28,25,23,0.04)" }}>
        <Label>Client Ledger</Label>
        {clients.map((cl,i)=>{
          const mine = orders.filter(o=>o.clientId===cl.id);
          const paid   = mine.filter(o=>o.pay==="paid").length;
          const partial= mine.filter(o=>o.pay==="partial").length;
          const unpaid = mine.filter(o=>o.pay==="unpaid").length;
          return (
            <div key={cl.id} style={{ display:"flex", alignItems:"center", gap:16,
              padding:"14px 0", borderBottom: i<clients.length-1 ? `1px solid ${C.border}` : "none" }}>
              <Ava initials={cl.initials} size={36} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, fontFamily:F.body, color:C.ink }}>{cl.name}</div>
                <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body }}>{cl.school} · {mine.length} orders</div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {paid>0    && <PayTag pay="paid"    />}
                {partial>0 && <PayTag pay="partial" />}
                {unpaid>0  && <PayTag pay="unpaid"  />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [rC, setRC] = useState("25");
  const [rP, setRP] = useState("30");
  function save() { setSaved(true); setTimeout(()=>setSaved(false),2200); }
  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title="Settings" sub="System configuration" />
      <div style={{ maxWidth:520 }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:10, padding:24, marginBottom:14,
          boxShadow:"0 1px 4px rgba(28,25,23,0.04)" }}>
          <Label>Writing Rates</Label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Core Coursework ($/page)" value={rC} onChange={setRC} type="number" />
            <Field label="Doctoral Project ($/page)" value={rP} onChange={setRP} type="number" />
          </div>
          <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body, marginBottom:14 }}>
            These rates power the public pricing calculator. Changes apply to new calculator quotes only.
          </div>
          <Btn onClick={save}>{saved ? "✓ Saved" : "Save Rates"}</Btn>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:10, padding:24, boxShadow:"0 1px 4px rgba(28,25,23,0.04)" }}>
          <Label>Supported Schools & Programs</Label>
          <div style={{ fontSize:13, color:C.inkMid, fontFamily:F.body, lineHeight:1.7 }}>
            Capella University · Walden University · Chamberlain University · Rasmussen University<br/>
            <span style={{ color:C.inkLight, fontSize:12 }}>Contact your developer to add new schools or programs.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client views
function ClientHomeView({ client, orders, onOpen, onNew }) {
  const mine   = orders.filter(o=>o.clientId===client.id);
  const active = mine.filter(o=>!["delivered","closed"].includes(o.status));
  const done   = mine.filter(o=>["delivered","closed"].includes(o.status));
  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead
        title={`Hello, ${client.name.split(" ")[0]}`}
        sub={`${client.school} · ${client.program}`}
        actions={<Btn onClick={onNew}>+ New Order</Btn>} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
        <Stat label="Active Orders" value={active.length} />
        <Stat label="Completed"     value={done.length} />
        <Stat label="School"        value={client.school.split(" ")[0]} note={client.program} />
      </div>
      {active.length>0 && (
        <>
          <Label>In Progress</Label>
          {active.map(o=>(
            <div key={o.id} onClick={()=>onOpen(o)}
              style={{ background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:10, padding:"14px 20px", marginBottom:10,
                cursor:"pointer", display:"flex", alignItems:"center", gap:16,
                boxShadow:"0 1px 4px rgba(28,25,23,0.04)", transition:"all 0.14s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="translateY(0)"; }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontFamily:F.mono, color:C.accent,
                  fontWeight:600, marginBottom:4 }}>{o.id} · {o.course}</div>
                <div style={{ fontSize:14, fontWeight:500, fontFamily:F.body, color:C.ink }}>{o.title}</div>
                <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body, marginTop:2 }}>Due: {o.due||"TBD"}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <PFlag p={o.priority} />
                <Pip status={o.status} />
              </div>
            </div>
          ))}
        </>
      )}
      {mine.length===0 && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:10, padding:52, textAlign:"center",
          boxShadow:"0 1px 4px rgba(28,25,23,0.04)" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:18, fontWeight:600, fontFamily:F.display,
            color:C.ink, marginBottom:6 }}>No orders yet</div>
          <div style={{ fontSize:13, color:C.inkLight, fontFamily:F.body, marginBottom:22 }}>
            Place your first order to get started
          </div>
          <Btn onClick={onNew}>Place First Order</Btn>
        </div>
      )}
    </div>
  );
}

function ClientOrdersView({ client, orders, onOpen, onNew }) {
  const mine = orders.filter(o=>o.clientId===client.id);
  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title="My Orders" sub={`${mine.length} orders`}
        actions={<Btn onClick={onNew}>+ New Order</Btn>} />
      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:10, overflow:"hidden",
        boxShadow:"0 1px 4px rgba(28,25,23,0.04)" }}>
        {mine.length===0
          ? <div style={{ padding:48, textAlign:"center",
              color:C.inkLight, fontFamily:F.body }}>No orders yet.</div>
          : mine.map((o,i)=>(
            <div key={o.id} onClick={()=>onOpen(o)}
              style={{ padding:"14px 20px",
                borderBottom: i<mine.length-1 ? `1px solid ${C.border}` : "none",
                cursor:"pointer", display:"flex", alignItems:"center", gap:16,
                transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surfaceWarm}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontFamily:F.mono,
                  color:C.accent, fontWeight:600, marginBottom:3 }}>{o.id}</div>
                <div style={{ fontSize:14, fontWeight:500,
                  fontFamily:F.body, color:C.ink }}>{o.course}</div>
                <div style={{ fontSize:12, color:C.inkLight,
                  fontFamily:F.body }}>{o.title}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Pip status={o.status} />
                <span style={{ fontSize:12, color:C.inkLight, fontFamily:F.body }}>
                  {o.due||"—"}
                </span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function WriterHomeView({ writer, orders, onOpen }) {
  const mine   = orders.filter(o=>o.writerId===writer.id);
  const active = mine.filter(o=>!["delivered","closed"].includes(o.status));
  return (
    <div style={{ padding:"0 28px 40px" }}>
      <PageHead title={`Hello, ${writer.name}`} sub={writer.specialty} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
        <Stat label="Assigned"  value={active.length} highlight={active.length>0} />
        <Stat label="Completed" value={mine.filter(o=>["delivered","closed"].includes(o.status)).length} />
        <Stat label="Specialty" value={writer.specialty.split(" / ")[0]} note={writer.specialty.split(" / ")[1]||""} />
      </div>
      <Label>My Queue</Label>
      {active.length===0
        ? <div style={{ padding:40, textAlign:"center", color:C.inkLight, fontFamily:F.body, fontSize:14 }}>Queue is clear.</div>
        : active.map(o=>{
            const col = sc(o.status);
            return (
              <div key={o.id} onClick={()=>onOpen(o)}
                style={{ background:C.surface, border:`1px solid ${C.border}`,
                  borderLeft:`3px solid ${col.dot}`,
                  borderRadius:10, padding:"14px 20px", marginBottom:10,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:16,
                  transition:"all 0.14s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="translateY(0)"; }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontFamily:F.mono, color:C.accent, fontWeight:600, marginBottom:4 }}>{o.id} · {o.course}</div>
                  <div style={{ fontSize:14, fontWeight:500, fontFamily:F.body, color:C.ink }}>{o.title}</div>
                  <div style={{ fontSize:12, color:C.inkLight, fontFamily:F.body, marginTop:2 }}>Due: {o.due||"TBD"}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <PFlag p={o.priority} />
                  <Pip status={o.status} />
                </div>
              </div>
            );
          })
      }
    </div>
  );
}

// ── PUBLIC CALCULATOR ─────────────────────────────────────────────────────────
function Calculator({ onBack }) {
  const [school,  setSchool]  = useState("Capella University");
  const [program, setProgram] = useState("DNP – Flex Path");
  const [selected, setSelected] = useState({});
  const [customPages, setCustomPages] = useState({});

  const prog = PRICING_DATA[school]?.[program];
  const core    = prog?.courses.filter(c=>c.type==="core")    || [];
  const project = prog?.courses.filter(c=>c.type==="project") || [];

  function toggleCourse(code) {
    setSelected(prev => {
      const next = {...prev};
      next[code] ? delete next[code] : next[code] = true;
      return next;
    });
  }

  function pages(c) { return parseInt(customPages[c.code])||c.pages; }
  function rate(c)  { return c.type==="project" ? prog.rateProject : prog.rateCore; }
  function cost(c)  { return pages(c)*rate(c); }

  const selectedCourses = prog?.courses.filter(c=>selected[c.code]) || [];
  const subtotal = selectedCourses.reduce((s,c)=>s+cost(c),0);
  const allCore    = core.every(c=>selected[c.code]);
  const allProject = project.every(c=>selected[c.code]);
  const discount = (allCore    ? core.reduce((s,c)=>s+cost(c),0)*0.10    : 0)
                 + (allProject ? project.reduce((s,c)=>s+cost(c),0)*0.10 : 0);
  const total = subtotal - discount;

  function CourseRow({ c }) {
    const sel = !!selected[c.code];
    const col = c.type==="project" ? C.accent : C.inkMid;
    return (
      <div onClick={()=>toggleCourse(c.code)}
        style={{ display:"flex", alignItems:"center", gap:12,
          padding:"10px 14px", borderRadius:8, cursor:"pointer",
          marginBottom:4, transition:"background 0.12s",
          background: sel ? (c.type==="project" ? C.accentMid : C.surfaceWarm) : "transparent",
          border:`1px solid ${sel ? (c.type==="project" ? "#FCCFCF" : C.borderMid) : "transparent"}` }}>
        {/* Checkbox */}
        <div style={{ width:17, height:17, borderRadius:4, flexShrink:0,
          background: sel ? C.accent : C.surface,
          border:`2px solid ${sel ? C.accent : C.borderMid}`,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {sel && <span style={{ color:"#fff", fontSize:10, fontWeight:800, lineHeight:1 }}>✓</span>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:12, fontWeight:700, fontFamily:F.mono,
            color: sel ? C.accent : C.ink }}>{c.code} </span>
          <span style={{ fontSize:12, color:C.inkMid, fontFamily:F.body }}>{c.name}</span>
        </div>
        {/* Custom pages input */}
        {sel && (
          <div onClick={e=>e.stopPropagation()}
            style={{ display:"flex", alignItems:"center", gap:4 }}>
            <input type="number" value={customPages[c.code]||c.pages}
              onChange={e=>setCustomPages(p=>({...p,[c.code]:e.target.value}))}
              style={{ width:54, padding:"3px 6px", border:`1px solid ${C.borderMid}`,
                borderRadius:5, fontSize:12, fontFamily:F.body,
                textAlign:"center", outline:"none" }} />
            <span style={{ fontSize:11, color:C.inkLight, fontFamily:F.body }}>pp</span>
          </div>
        )}
        <span style={{ fontSize:12, fontWeight:600, fontFamily:F.body,
          color: sel ? col : C.inkLight, minWidth:48, textAlign:"right" }}>
          {sel ? `$${cost(c).toLocaleString()}` : `~$${(c.pages*rate(c)).toLocaleString()}`}
        </span>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.canvas, fontFamily:F.body }}>
      {/* Top bar */}
      <div style={{ background:C.side, borderBottom:`1px solid ${C.sideBorder}`,
        padding:"16px 32px", display:"flex", alignItems:"center",
        justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, background:C.accent,
            borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:15, fontWeight:700, fontFamily:F.display }}>M</span>
          </div>
          <span style={{ color:"#FAFAF9", fontSize:14, fontWeight:600,
            fontFamily:F.display }}>Meridian Studio</span>
          <span style={{ color:C.sideText, fontSize:13, fontFamily:F.body,
            marginLeft:6 }}>/ Pricing Calculator</span>
        </div>
        <Btn variant="outline" onClick={onBack}
          style={{ borderColor:"rgba(255,255,255,0.2)", color:"rgba(250,250,249,0.7)" }}>
          ← Back
        </Btn>
      </div>

      <div style={{ maxWidth:820, margin:"0 auto", padding:"40px 24px" }}>
        {/* Hero text */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <h1 style={{ fontSize:36, fontWeight:600, fontFamily:F.display,
            color:C.ink, margin:"0 0 10px", letterSpacing:"-0.5px" }}>
            Pricing Calculator
          </h1>
          <p style={{ fontSize:15, color:C.inkMid, margin:0, fontFamily:F.body, lineHeight:1.6 }}>
            Select your school and program, then choose the courses or project phases you need.
          </p>
        </div>

        {/* School + Program */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:12, padding:24, marginBottom:16,
          boxShadow:"0 2px 8px rgba(28,25,23,0.06)" }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.8px",
            textTransform:"uppercase", color:C.inkLight,
            fontFamily:F.body, marginBottom:16 }}>1 · Your Program</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Drop label="School" value={school}
              onChange={v=>{ setSchool(v); setProgram(Object.keys(PRICING_DATA[v]||{})[0]||""); setSelected({}); }}
              options={Object.keys(PRICING_DATA)} />
            <Drop label="Program" value={program}
              onChange={v=>{ setProgram(v); setSelected({}); }}
              options={Object.keys(PRICING_DATA[school]||{})} />
          </div>
          {prog && (
            <div style={{ display:"flex", gap:10, marginTop:4, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, fontFamily:F.body, color:C.inkMid,
                background:C.surfaceWarm, padding:"4px 12px", borderRadius:20,
                border:`1px solid ${C.border}` }}>
                Core: <strong style={{ color:C.ink }}>${prog.rateCore}/page</strong>
              </span>
              <span style={{ fontSize:12, fontFamily:F.body, color:C.inkMid,
                background:C.accentSoft, padding:"4px 12px", borderRadius:20,
                border:`1px solid ${C.accentMid}` }}>
                Doctoral Project: <strong style={{ color:C.accent }}>${prog.rateProject}/page</strong>
              </span>
              <span style={{ fontSize:12, fontFamily:F.body, color:C.inkMid,
                background:C.surfaceWarm, padding:"4px 12px", borderRadius:20,
                border:`1px solid ${C.border}` }}>
                10% bundle discount when selecting all core or all project phases
              </span>
            </div>
          )}
        </div>

        {prog && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:12, padding:24, marginBottom:16,
            boxShadow:"0 2px 8px rgba(28,25,23,0.06)" }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.8px",
              textTransform:"uppercase", color:C.inkLight,
              fontFamily:F.body, marginBottom:16 }}>2 · Select Courses & Phases</div>

            {/* Core */}
            {core.length>0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.ink,
                    fontFamily:F.body }}>Core Coursework
                    <span style={{ color:C.inkLight, fontWeight:400, marginLeft:6 }}>
                      · ${prog.rateCore}/page
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn size="sm" variant="outline"
                      onClick={()=>setSelected(prev=>({ ...prev,...Object.fromEntries(core.map(c=>[c.code,true])) }))}>
                      All Core
                    </Btn>
                    <Btn size="sm" variant="soft"
                      onClick={()=>setSelected(prev=>{ const n={...prev}; core.forEach(c=>delete n[c.code]); return n; })}>
                      Clear
                    </Btn>
                  </div>
                </div>
                {core.map(c=><CourseRow key={c.code} c={c} />)}
                {allCore && (
                  <div style={{ marginTop:8, padding:"7px 14px",
                    background:"#ECFDF5", borderRadius:6,
                    fontSize:12, color:"#065F46", fontWeight:600, fontFamily:F.body }}>
                    ✓ Full Core Bundle — 10% discount will be applied
                  </div>
                )}
              </div>
            )}

            {/* Project */}
            {project.length>0 && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.ink,
                    fontFamily:F.body }}>Doctoral Project
                    <span style={{ color:C.inkLight, fontWeight:400, marginLeft:6 }}>
                      · ${prog.rateProject}/page · sequential phases
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <Btn size="sm" variant="outline"
                      onClick={()=>setSelected(prev=>({ ...prev,...Object.fromEntries(project.map(c=>[c.code,true])) }))}>
                      All Phases
                    </Btn>
                    <Btn size="sm" variant="soft"
                      onClick={()=>setSelected(prev=>{ const n={...prev}; project.forEach(c=>delete n[c.code]); return n; })}>
                      Clear
                    </Btn>
                  </div>
                </div>
                {project.map((c,i)=>(
                  <div key={c.code} style={{ display:"flex", alignItems:"stretch", gap:0 }}>
                    {project.length>1 && (
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                        width:20, flexShrink:0, marginRight:4, paddingTop:12 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%",
                          background: selected[c.code] ? C.accent : C.borderMid,
                          flexShrink:0, zIndex:1 }} />
                        {i<project.length-1 && (
                          <div style={{ flex:1, width:1,
                            background: selected[c.code] && selected[project[i+1].code] ? C.accent : C.border,
                            minHeight:8 }} />
                        )}
                      </div>
                    )}
                    <div style={{ flex:1 }}>
                      <CourseRow c={c} />
                    </div>
                  </div>
                ))}
                {allProject && (
                  <div style={{ marginTop:8, padding:"7px 14px",
                    background:"#ECFDF5", borderRadius:6,
                    fontSize:12, color:"#065F46", fontWeight:600, fontFamily:F.body }}>
                    ✓ Full Project Bundle — 10% discount will be applied
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quote */}
        {selectedCourses.length>0 && (
          <div style={{ background:C.surface, border:`2px solid ${C.accent}`,
            borderRadius:12, padding:24,
            boxShadow:"0 4px 20px rgba(139,26,31,0.1)" }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.8px",
              textTransform:"uppercase", color:C.inkLight,
              fontFamily:F.body, marginBottom:16 }}>3 · Your Quote</div>
            {selectedCourses.map(c=>(
              <div key={c.code} style={{ display:"flex", justifyContent:"space-between",
                padding:"7px 0", borderBottom:`1px solid ${C.border}`,
                fontSize:13, fontFamily:F.body }}>
                <span style={{ color:C.inkMid }}>
                  <strong style={{ color:C.ink, fontFamily:F.mono }}>{c.code}</strong>
                  <span style={{ color:C.inkLight, fontSize:12, marginLeft:6 }}>
                    ({pages(c)} pp × ${rate(c)})
                  </span>
                </span>
                <span style={{ fontWeight:600, color:C.ink }}>${cost(c).toLocaleString()}</span>
              </div>
            ))}
            {discount>0 && (
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:"8px 0", fontSize:13, fontFamily:F.body,
                color:"#065F46", fontWeight:600 }}>
                <span>Bundle discount</span>
                <span>−${discount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between",
              padding:"14px 0 0", marginTop:4,
              borderTop:`2px solid ${C.ink}` }}>
              <span style={{ fontSize:16, fontWeight:600,
                fontFamily:F.body, color:C.ink }}>Total</span>
              <span style={{ fontSize:28, fontWeight:600, fontFamily:F.display,
                color:C.accent, letterSpacing:"-0.5px" }}>
                ${total.toLocaleString()}
              </span>
            </div>
            <div style={{ marginTop:10, padding:"10px 14px",
              background:C.surfaceWarm, borderRadius:8,
              fontSize:12, color:C.inkMid, fontFamily:F.body }}>
              Deposit (50%): <strong style={{ color:C.ink }}>${(total/2).toLocaleString()}</strong>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              Balance on delivery: <strong style={{ color:C.ink }}>${(total/2).toLocaleString()}</strong>
            </div>
          </div>
        )}

        {selectedCourses.length===0 && prog && (
          <div style={{ textAlign:"center", padding:"28px 0",
            color:C.inkLight, fontSize:14, fontFamily:F.body }}>
            Select courses above to build your quote
          </div>
        )}
      </div>
    </div>
  );
}

// ── LANDING ───────────────────────────────────────────────────────────────────
function Landing({ onEnter, onCalc, onBack }) {
  const features = [
    { icon:"⊞", title:"Hybrid Dashboard",    desc:"Stats at a glance, then your full work pipeline in one view. Everything you need, nothing you don't." },
    { icon:"⊟", title:"Kanban Pipeline",     desc:"Every order moves through clear stages from New to Delivered. See your entire operation at once." },
    { icon:"◎", title:"Client Accounts",     desc:"Each student gets a portal to submit briefs, upload files, and track their order status in real time." },
    { icon:"◈", title:"Writer Management",   desc:"Assign work to your team. See who's carrying what and where capacity is." },
    { icon:"◇", title:"Billing Records",     desc:"Log deposits and balances per order. A clear ledger for every client, no spreadsheet needed." },
    { icon:"◌", title:"Multi-School Ready",  desc:"Capella, Walden, Chamberlain, Rasmussen — and any school you add next. Built to scale." },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.side, fontFamily:F.body }}>
      {/* Nav */}
      <nav style={{ padding:"18px 48px", display:"flex",
        justifyContent:"space-between", alignItems:"center",
        borderBottom:`1px solid ${C.sideBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, background:C.accent, borderRadius:8,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(139,26,31,0.4)" }}>
            <span style={{ color:"#fff", fontSize:18, fontWeight:700, fontFamily:F.display }}>M</span>
          </div>
          <div>
            <div style={{ color:"#FAFAF9", fontSize:16, fontWeight:600,
              fontFamily:F.display, lineHeight:1.1 }}>Meridian</div>
            <div style={{ color:C.sideText, fontSize:9, letterSpacing:"2.5px",
              textTransform:"uppercase", fontFamily:F.body }}>Studio</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          {onBack && (
            <button onClick={onBack}
              style={{ fontSize:12, color:"rgba(250,250,249,0.35)", background:"transparent",
                border:"none", cursor:"pointer", fontFamily:F.body, fontWeight:500,
                letterSpacing:"0.1px" }}>
              ← Back to site
            </button>
          )}
          <Btn variant="outline" onClick={onCalc}
            style={{ borderColor:"rgba(255,255,255,0.2)", color:"rgba(250,250,249,0.75)" }}>
            Pricing Calculator
          </Btn>
          <Btn onClick={onEnter}>Sign In →</Btn>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding:"88px 48px 72px", textAlign:"center", maxWidth:800, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8,
          background:"rgba(139,26,31,0.15)", border:"1px solid rgba(139,26,31,0.3)",
          borderRadius:99, padding:"5px 16px", marginBottom:28 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:C.accent }} />
          <span style={{ fontSize:12, fontWeight:600, letterSpacing:"1px",
            textTransform:"uppercase", color:"rgba(255,255,255,0.6)", fontFamily:F.body }}>
            Academic Service Operations
          </span>
        </div>
        <h1 style={{ fontSize:56, fontWeight:600, fontFamily:F.display,
          color:"#FAFAF9", margin:"0 0 20px", lineHeight:1.08, letterSpacing:"-1.2px" }}>
          Every order.<br />
          <span style={{ color:C.accent }}>Every client.</span><br />
          One place.
        </h1>
        <p style={{ fontSize:17, color:"rgba(250,250,249,0.45)", lineHeight:1.75,
          margin:"0 auto 40px", maxWidth:560, fontFamily:F.body }}>
          Meridian Studio is the operations hub for academic writing services —
          built for operators who run clients, manage writers, and deliver
          complex multi-course work across multiple schools.
        </p>
        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
          <Btn size="lg" onClick={onEnter}>Enter the Studio</Btn>
          <Btn size="lg" variant="outline" onClick={onCalc}
            style={{ borderColor:"rgba(255,255,255,0.2)", color:"rgba(250,250,249,0.75)" }}>
            See Pricing
          </Btn>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding:"0 48px 72px", maxWidth:1040, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {features.map(f=>(
            <div key={f.title}
              style={{ background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:10, padding:24,
                transition:"border-color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.15)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
              <div style={{ fontSize:22, marginBottom:14, color:C.accent }}>{f.icon}</div>
              <div style={{ fontSize:15, fontWeight:600, fontFamily:F.display,
                color:"#FAFAF9", marginBottom:8, letterSpacing:"-0.2px" }}>{f.title}</div>
              <div style={{ fontSize:13, color:"rgba(250,250,249,0.4)",
                lineHeight:1.65, fontFamily:F.body }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:"24px 48px", borderTop:`1px solid ${C.sideBorder}`,
        textAlign:"center" }}>
        <div style={{ fontSize:12, color:"rgba(250,250,249,0.2)", fontFamily:F.body }}>
          Prime Meridian Academy · Doctoral Studio · Built for operators
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function OMSApp({ onBack = null }) {
  const [page,   setPage]   = useState("landing"); // landing | calc | app
  const [role,   setRole]   = useState("admin");
  const [view,   setView]   = useState("home");
  const [orders, setOrders] = useState(ORDERS_SEED);
  const [drawer, setDrawer] = useState(null);
  const [modal,  setModal]  = useState(false);

  const currentClient = CLIENTS[0]; // Kelli (demo)
  const currentWriter = WRITERS[0]; // Alex  (demo)

  function handleNav(id) {
    if(id==="new_order"||id==="profile") {
      if(id==="profile") { setView("profile"); return; }
      setModal(true); return;
    }
    setView(id);
  }

  function handleRoleSwitch(r) {
    setRole(r);
    setView("home");
  }

  function addOrder(o) { setOrders(p=>[o,...p]); }
  function updateOrder(u) { setOrders(p=>p.map(o=>o.id===u.id?u:o)); }

  if(page==="landing") {
    return <Landing onEnter={()=>setPage("app")} onCalc={()=>setPage("calc")} onBack={onBack} />;
  }
  if(page==="calc") {
    return <Calculator onBack={()=>setPage("landing")} />;
  }

  // App
  const isAdmin  = role==="admin";
  const isClient = role==="client";
  const isWriter = role==="writer";

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden",
      fontFamily:F.body, background:C.canvas }}>
      <Sidebar role={role} view={view} setView={handleNav} setRole={handleRoleSwitch} />

      <main style={{ flex:1, overflowY:"auto" }}>
        <div style={{ paddingTop:8 }}>
          {/* ADMIN */}
          {isAdmin && view==="home"     && <AdminHome    orders={orders} clients={CLIENTS} writers={WRITERS} onOpen={setDrawer} onNew={()=>setModal(true)} />}
          {isAdmin && view==="pipeline" && <div style={{padding:"0 28px 40px"}}><PageHead title="Pipeline" sub="Full kanban view" actions={<Btn onClick={()=>setModal(true)}>+ New Order</Btn>}/><Kanban orders={orders} clients={CLIENTS} onOpen={setDrawer}/></div>}
          {isAdmin && view==="orders"   && <OrdersView   orders={orders} clients={CLIENTS} writers={WRITERS} onOpen={setDrawer} onNew={()=>setModal(true)} />}
          {isAdmin && view==="clients"  && <ClientsView  clients={CLIENTS} orders={orders} />}
          {isAdmin && view==="writers"  && <WritersView  writers={WRITERS} orders={orders} />}
          {isAdmin && view==="billing"  && <BillingView  orders={orders} clients={CLIENTS} />}
          {isAdmin && view==="settings" && <SettingsView />}

          {/* CLIENT */}
          {isClient && view==="home"    && <ClientHomeView   client={currentClient} orders={orders} onOpen={setDrawer} onNew={()=>setModal(true)} />}
          {isClient && view==="orders"  && <ClientOrdersView client={currentClient} orders={orders} onOpen={setDrawer} onNew={()=>setModal(true)} />}
          {isClient && view==="profile" && (
            <div style={{padding:"0 28px 40px"}}>
              <PageHead title="My Profile" />
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:28,maxWidth:440}}>
                <div style={{display:"flex",gap:16,marginBottom:20}}>
                  <Ava initials={currentClient.initials} size={52}/>
                  <div>
                    <div style={{fontSize:20,fontWeight:600,fontFamily:F.display,color:C.ink}}>{currentClient.name}</div>
                    <div style={{fontSize:13,color:C.inkLight,fontFamily:F.body,marginTop:2}}>{currentClient.email}</div>
                    <div style={{fontSize:13,color:C.inkLight,fontFamily:F.body}}>{currentClient.phone}</div>
                  </div>
                </div>
                <Rule/>
                <div style={{fontSize:13,fontFamily:F.body,color:C.inkMid,lineHeight:2}}>
                  <div><strong style={{color:C.ink}}>School:</strong> {currentClient.school}</div>
                  <div><strong style={{color:C.ink}}>Program:</strong> {currentClient.program}</div>
                  <div><strong style={{color:C.ink}}>Member since:</strong> {currentClient.joined}</div>
                </div>
              </div>
            </div>
          )}

          {/* WRITER */}
          {isWriter && (view==="home"||view==="queue") && <WriterHomeView writer={currentWriter} orders={orders} onOpen={setDrawer} />}
          {isWriter && view==="done" && (
            <div style={{padding:"0 28px 40px"}}>
              <PageHead title="Completed Work"/>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                {orders.filter(o=>o.writerId===currentWriter.id&&["delivered","closed"].includes(o.status)).map((o,i,arr)=>(
                  <div key={o.id} style={{padding:"13px 20px",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",
                    display:"flex",alignItems:"center",gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontFamily:F.mono,color:C.accent,fontWeight:600}}>{o.id} · {o.course}</div>
                      <div style={{fontSize:13,fontFamily:F.body,color:C.ink}}>{o.title}</div>
                    </div>
                    <Pip status={o.status}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {drawer && (
        <Drawer order={drawer} clients={CLIENTS} writers={WRITERS}
          isAdmin={isAdmin}
          onClose={()=>setDrawer(null)}
          onSave={u=>{ updateOrder(u); setDrawer(null); }} />
      )}

      {modal && (
        <NewOrderModal
          clients={CLIENTS} writers={WRITERS}
          isAdmin={isAdmin}
          defaultClient={isClient ? currentClient.id : CLIENTS[0]?.id}
          onAdd={addOrder}
          onClose={()=>setModal(false)} />
      )}

      {/* Calculator shortcut */}
      <button onClick={()=>setPage("calc")}
        style={{ position:"fixed", bottom:22, right:22,
          background:C.surface, border:`1.5px solid ${C.border}`,
          borderRadius:10, padding:"9px 16px", fontSize:13,
          fontFamily:F.body, fontWeight:600, color:C.inkMid,
          cursor:"pointer", boxShadow:"0 4px 16px rgba(28,25,23,0.1)",
          display:"flex", alignItems:"center", gap:8,
          transition:"all 0.15s" }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.inkMid; }}>
        🧮 <span>Pricing Calculator</span>
      </button>
    </div>
  );
}
