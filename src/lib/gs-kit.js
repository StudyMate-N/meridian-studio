/* ════════════════════════════════════════════════════════════
   MERIDIAN — Getting Started · shared kit (Clay system)
   Ported from the design prototype into the live app. Renders a full
   onboarding + pricing walk-through into any element via
   renderDirection(el, 'a'|'b'). State is scoped per root (WeakMap) so
   multiple instances can coexist. No iframes, no ID collisions.
   ════════════════════════════════════════════════════════════ */

// ── inline SVG icons (stroke, currentColor) ──────────────
const I = {
  arrow: (s = 15) => `<svg class="ar" viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8h10M8.5 4l4 4-4 4"/></svg>`,
  check: (s = 15) => `<svg viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>`,
  info: (s = 15) => `<svg viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.4"/><path d="M8 7.2v3.4M8 5.1v.1" stroke-linecap="round"/></svg>`,
  up: (s = 16) => `<svg viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12V4M4.5 7.5L8 4l3.5 3.5M3 13h10"/></svg>`,
  lock: (s = 15) => `<svg viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.2" y="7" width="9.6" height="6.4" rx="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7"/></svg>`,
  chev: (s = 16) => `<svg class="cbc-chev" viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`,
  chevSm: (s = 13) => `<svg class="pm-chev" viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`,
  self: (s = 18) => `<svg viewBox="0 0 20 20" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="10" cy="6.4" r="2.8"/><path d="M4.4 15.6a5.6 5.6 0 0111.2 0"/></svg>`,
  remote: (s = 18) => `<svg viewBox="0 0 20 20" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.4" y="3.6" width="15.2" height="9.6" rx="1.4"/><path d="M7 16.4h6M10 13.2v3.2"/></svg>`,
};

// ── data ──────────────────────────────────────────────────
const courses = [
  { code: "NHS-FPX 8002", name: "Collaboration & Case Analysis", assmt: "4 assessments", pp: 27, cost: 729, sec: "core" },
  { code: "NHS-FPX 8040", name: "21st-Century Leadership", assmt: "3 written + poster", pp: 15, cost: 405, sec: "core" },
  { code: "NURS-FPX 8010", name: "Executive Leadership", assmt: "4 assessments", pp: 23, cost: 634, sec: "core" },
  { code: "RSCH-FPX 7864", name: "Quantitative Design & Analysis", assmt: "4 reports + SPSS", pp: 16, cost: 432, sec: "core" },
  { code: "NURS-FPX 8030", name: "Evidence-Based Practice", assmt: "5 assessments", pp: 26, cost: 702, sec: "core" },
  { code: "NURS-FPX 8012", name: "Nursing Technology & HIT", assmt: "5 assessments", pp: 20, cost: 540, sec: "core" },
  { code: "NURS-FPX 8014", name: "Global Population Health", assmt: "4 assessments", pp: 20, cost: 540, sec: "core" },
  { code: "NURS-FPX 8045", name: "Doctoral Writing & Professional Practice", assmt: "7 assessments · signature", pp: 40, cost: 1146, sec: "writing" },
  { code: "NURS-FPX 9100", name: "Defining the Doctoral Project", assmt: "2 deliverables", pp: 17, cost: 512, sec: "project" },
  { code: "NURS-FPX 9901", name: "Doctoral Project I — Planning", assmt: "Logic model + IRB", pp: 10, cost: 310, sec: "project" },
  { code: "NURS-FPX 9902", name: "Doctoral Project II — Implementation", assmt: "Literature synthesis", pp: 13, cost: 388, sec: "project" },
  { code: "NURS-FPX 9903", name: "Doctoral Project III — Results", assmt: "Data analysis", pp: 15, cost: 465, sec: "project" },
  { code: "NURS-FPX 9904", name: "Doctoral Project IV — Final Report", assmt: "Final report", pp: 65, cost: 2015, sec: "project" },
];
const secMeta = {
  core: { l: "Core courses", r: "$27 / pg" },
  writing: { l: "Doctoral writing", r: "blended" },
  project: { l: "DNP project courses", r: "$31 / pg" },
};
const payMethods = [
  { id: "wise", nm: "Wise", nt: "USD · fast", c: "#163300", bg: "#E4EFE0" },
  { id: "mpesa", nm: "M-Pesa", nt: "Kenya · instant", c: "#1B5E20", bg: "#DCEBD7" },
  { id: "sw", nm: "Sendwave", nt: "Instant", c: "#2C3E80", bg: "#E3E6F2" },
  { id: "wu", nm: "Western Union", nt: "Global", c: "#9A5A14", bg: "#F3E7D4" },
  { id: "pio", nm: "Pioneer", nt: "USD · EUR", c: "#2B4C82", bg: "#E1E8F2" },
];
const tiers = {
  single: { tag: "Pay as you go", name: "Single assignment", desc: "One paper at a time. Full payment upfront — no deposit split.", price: "$27–31", unit: "/pg", pnote: "per page · paid in full",
    sumName: "Single assignment", sumSub: "Priced at midpoint page count", total: "Per paper", dep: "Paid in full upfront", depA: ["100%", "Paid upfront"], depB: null, hideTotal: true },
  core: { tag: "Most popular", name: "Core courses bundle", desc: "All 7 core courses + doctoral writing. Project courses invoiced separately as they begin.", price: "$5,128", unit: "", pnote: "8 courses · 50% to start",
    sumName: "Core courses + doctoral writing", sumSub: "8 courses · NHS-FPX 8002 → NURS-FPX 8045", total: "$5,128", dep: "Deposit: $2,564", depA: ["50%", "Deposit to start"], depB: ["50%", "On completion"], hideTotal: false },
  full: { tag: "Full program", name: "All 13 courses", desc: "Everything locked in. Project invoices issued individually as each course begins.", price: "$8,818", unit: "", pnote: "13 courses · 50% to start",
    sumName: "Full program — all 13 courses", sumSub: "Project invoices issued per course as they begin", total: "$8,818", dep: "Deposit: $4,409", depA: ["50%", "Deposit to start"], depB: ["50%", "On completion"], hideTotal: false },
};
const WS = "/workspace";    // account + payment-tracking destination
const BRIEF = "/workspace"; // brief-upload destination (non-Capella → custom quote)

// Institutions. Only Capella's DNP FlexPath rate sheet is published today;
// every other school routes to a brief upload for a tailored quote.
const institutions = [
  { id: "capella", name: "Capella University", note: "Showing the full Capella DNP · NURS-FPX / NHS-FPX FlexPath rate sheet below.", populated: true },
  { id: "walden", name: "Walden University", populated: false },
  { id: "wgu", name: "Western Governors University", populated: false },
  { id: "gcu", name: "Grand Canyon University", populated: false },
  { id: "chamberlain", name: "Chamberlain University", populated: false },
  { id: "phoenix", name: "University of Phoenix", populated: false },
  { id: "purdue", name: "Purdue Global", populated: false },
  { id: "south", name: "South University", populated: false },
  { id: "other", name: "Another school — not listed", populated: false },
];

// ── content blocks ────────────────────────────────────────
function url(path) {
  return `<div class="mock-bar"><span class="tdot" style="background:#E0655C"></span><span class="tdot" style="background:#E5B23A"></span><span class="tdot" style="background:#5FB970"></span><span class="mock-url">studio.meridian.academy ${path}</span></div>`;
}
function step(cls, n, title, desc, extra) {
  return `<div class="step ${cls}"><div class="s-num">${n}</div><div class="s-body"><div class="s-title">${title}</div><div class="s-desc">${desc}</div>${extra || ""}</div></div>`;
}
function submissionHTML() {
  const aMock1 = `<div class="mock">${url("/ new order")}<div class="mock-body"><div class="mock-lbl">Upload assignment brief</div><div class="drop"><div class="di">${I.up()}</div><div class="dt">Drop your brief or rubric here</div><div class="ds">PDF · DOCX · any format</div></div></div></div>`;
  const aMock2 = `<div class="mock">${url("/ confirm order")}<div class="mock-body"><div class="mock-lbl">Auto-populated — review &amp; confirm</div><div class="fields"><div class="field"><div class="fl">Course</div><div class="fv">NURS-FPX 8030</div></div><div class="field"><div class="fl">Assessment</div><div class="fv">Assessment 3 of 5</div></div><div class="field"><div class="fl">Pages</div><div class="fv">26 pages</div></div><div class="field"><div class="fl">Deadline</div><div class="fv">Dec 14, 2025</div></div></div><button class="mock-cta">Confirm order</button></div></div>`;
  const aNotif = `<div class="notif"><div class="ni">${I.check(15)}</div><div><div class="nt">Your paper is ready</div><div class="nb">NURS-FPX 8030 · Assessment 3 — sign in to download.</div></div></div>`;
  const aDone = `<div class="callout good"><span class="ci">${I.check()}</span><span class="tx"><strong>You stay in control.</strong> We write — you submit, from your own account.</span></div>`;
  const tabA = `<div class="tab-panel on" data-panel="a"><div class="steps">
    ${step("a", 1, "Upload your brief to your workspace", "Sign in to your client workspace and upload the assignment brief. That's your only manual step.", aMock1)}
    ${step("a", 2, "The workspace fills everything in", "The system reads your brief and populates every detail. Review, adjust if needed, and confirm.", aMock2)}
    ${step("a", 3, "We write it — you're notified when it's ready", "Your paper lands in your workspace. Email the moment it's done.", aNotif)}
    ${step("a", 4, "You submit through your program portal", "Log into your own account, on your own device, and submit. Your IP, your account — nothing unusual.", aDone)}
  </div></div>`;

  const bIntro = `<div class="callout info"><span class="ci">${I.info()}</span><span class="tx">We work from <em>your</em> device — your program sees your IP address, your device, your account. Set-up takes one app, installed once.</span></div>`;
  const tvWin = `<div><div class="tool-lbl">TeamViewer</div><div class="twin"><div class="twin-bar tv"><span class="tn">TeamViewer Remote</span><span class="tdd"><i></i><i></i><i></i></span></div><div class="twin-body"><div class="tbox"><div class="tbl">Your ID</div><div class="tbv">712 384 905</div></div><div class="tbox pw"><div class="tbl">Password</div><div class="tbv">4h7k2m</div></div><div class="thint tv">${I.arrow(13)} Send both to us on WhatsApp</div></div></div></div>`;
  const adWin = `<div><div class="tool-lbl">AnyDesk</div><div class="twin"><div class="twin-bar ad"><span class="tn">AnyDesk</span><span class="tdd"><i></i><i></i><i></i></span></div><div class="twin-body"><div class="tbox"><div class="tbl">Your address</div><div class="tbv">839 217 460</div></div><div class="tbox pw"><div class="tbl">Session password</div><div class="tbv">k9p2x</div></div><div class="thint ad">${I.arrow(13)} Send both to us on WhatsApp</div></div></div></div>`;
  const bLock = `<div class="callout warn"><span class="ci">${I.lock()}</span><span class="tx"><strong>You stay in control.</strong> The password resets every session, and closing the app disconnects us instantly. We only connect when you ask.</span></div>`;
  const bDone = `<div class="callout good"><span class="ci">${I.check()}</span><span class="tx">Truly done-for-you. You don't open your program portal or watch the clock — we confirm on WhatsApp the moment it's submitted.</span></div>`;
  const tabB = `<div class="tab-panel" data-panel="b">${bIntro}<div class="steps" style="margin-top:10px">
    ${step("b", 1, "Install one app on your laptop — once", "Choose TeamViewer or AnyDesk — both free and globally trusted. Install it once on your school laptop; it never needs repeating.", `<div class="tools">${tvWin}${adWin}</div>`)}
    ${step("b", 2, "We connect, complete the work, and submit", "We connect to your device, complete the assessment inside your account, and submit.", bLock)}
    ${step("b", 3, "Submission confirmed — invoice settled", "Once submission is confirmed, your balance settles through your chosen payment method.", bDone)}
  </div></div>`;

  const cIntro = `<div class="callout info"><span class="ci">${I.info()}</span><span class="tx">Set up remote access once — then decide per assignment whether to submit yourself or have us handle it. No commitment, no restrictions.</span></div>`;
  const cCards = `<div class="hcards"><div class="hcard"><span class="badge tone-good">${I.self()} Self-submit</span><div class="ht">You download and submit</div><div class="hb">Best when you want to review first, or you're free to log in yourself.</div></div><div class="hcard"><span class="badge tone-info">${I.remote()} Remote mode</span><div class="ht">We connect and submit</div><div class="hb">Best when you're at work, on placement, or simply want to switch off.</div></div></div>`;
  const tabC = `<div class="tab-panel" data-panel="c">${cIntro}<div class="steps" style="margin-top:10px">
    ${step("c", 1, "One-time remote setup", "Install TeamViewer or AnyDesk and send us your ID and password on WhatsApp. Under five minutes, done once.")}
    ${step("c", 2, "Upload your brief through the workspace", "Every order starts with a brief upload. The system handles the admin automatically.")}
    ${step("c", 3, "Per assignment — you choose how it's submitted", "Tell us on WhatsApp each time. That's the only decision you make.", cCards)}
  </div></div>`;

  const seg = `<div class="seg" role="tablist">
    <button class="on s-a" data-act="tab" data-tab="a"><span class="sk">Option A</span>I submit myself</button>
    <button class="s-b" data-act="tab" data-tab="b"><span class="sk">Option B</span>We handle it</button>
    <button class="s-c" data-act="tab" data-tab="c"><span class="sk">Option C</span>Flexible hybrid</button>
  </div>`;
  const outcome = `<div class="outcome"><div class="ok">${I.check(20)}</div><div><div class="ot">Whichever you pick — your program sees your IP, your device, your account.</div><div class="os">No flags, no risk. The only difference is who presses submit.</div></div></div>`;
  return seg + tabA + tabB + tabC + outcome;
}
function tiersHTML() {
  return `<div class="tiers">${["single", "core", "full"].map(k => {
    const t = tiers[k];
    return `<button class="tier${k === "core" ? " sel" : ""}" data-act="tier" data-tier="${k}">
      <span class="radio"><i></i></span>
      <div class="ttag">${t.tag}</div>
      <div class="tname">${t.name}</div>
      <div class="tdesc">${t.desc}</div>
      <div class="tprice">${t.price}${t.unit ? `<small>${t.unit}</small>` : ""}</div>
      <div class="tpnote">${t.pnote}</div>
    </button>`;
  }).join("")}</div>`;
}
function cbcHTML() {
  return `<div class="cbc">
    <button class="cbc-trigger" data-act="cbc">
      <div><div class="cbc-eyebrow"><span class="cbc-pulse"></span>Or pay course by course</div>
        <div class="cbc-title">Pick exactly what you need.</div>
        <div class="cbc-sub">Each course is independently payable — 50% deposit per course, remainder on completion.</div></div>
      ${I.chev()}
    </button>
    <div class="cbc-body" data-cbc-body>
      <div class="cbc-head"><div class="ch-t">Full program — course by course</div><div class="ch-n">Request an invoice on any row</div></div>
      <div data-cbc-rows></div>
    </div>
  </div>`;
}
function cbcRowsHTML() {
  let html = "", last = "";
  courses.forEach(c => {
    if (c.sec !== last) {
      if (c.sec === "project") html += `<div class="c-note">Project courses are invoiced individually as each begins — not charged upfront.</div>`;
      html += `<div class="c-sec"><span>${secMeta[c.sec].l}</span><span class="csr">${secMeta[c.sec].r}</span></div>`;
      last = c.sec;
    }
    const isP = c.sec === "project";
    html += `<div class="c-row${isP ? " proj" : ""}">
      <div class="cl"><div class="ccode">${c.code}</div><div class="cname">${c.name}</div><div class="cmeta">${c.assmt} · ${c.pp} pp avg</div></div>
      <div class="cr"><div class="cprice${isP ? " dim" : ""}">${isP ? "Billed when due" : "$" + c.cost.toLocaleString()}</div>
      <button class="inv-btn${isP ? " ghost" : ""}" data-act="inv" data-code="${c.code}" data-cost="${c.cost}" data-proj="${isP}">${isP ? "Notify me" : "Request invoice"}</button></div>
    </div>`;
  });
  return html;
}
function payHTML() {
  return `<div class="pm">
    <button class="pm-trigger" data-act="pm"><span>Accepted payment methods — Wise · M-Pesa · Sendwave · Western Union · Pioneer</span>${I.chevSm()}</button>
    <div class="pm-body" data-pm-body><div class="pm-grid">${payMethods.map(m =>
      `<div class="pm-chip"><div class="pm-ic" style="background:${m.bg};color:${m.c}">${m.nm.slice(0, 2).toUpperCase()}</div><div><div class="pm-nm">${m.nm}</div><div class="pm-nt">${m.nt}</div></div></div>`).join("")}</div></div>
  </div>`;
}
function depHTML() {
  return `<div class="dep" data-dep><div class="dep-cell" data-dep-a><div class="dv" data-sum="depAv"></div><div class="dl" data-sum="depAl"></div></div><div class="dep-cell" data-dep-b><div class="dv" data-sum="depBv"></div><div class="dl" data-sum="depBl"></div></div></div>`;
}
function totalHTML() {
  return `<div class="total" data-total><div class="tl"><div class="tl-lbl">Selected package</div><div class="tl-name" data-sum="name"></div><div class="tl-sub" data-sum="sub"></div></div><div class="tr"><div class="tr-total" data-sum="total"></div><div class="tr-dep" data-sum="dep"></div></div></div>`;
}
function billingHTML() {
  return `<div class="bnote"><span class="bi">${I.info(16)}</span><span class="bt"><strong>How billing works.</strong> A 50% deposit starts the work; the balance is invoiced on completion. Every deposit, payment and balance is tracked inside your client workspace — sign in any time to see where you stand.</span></div>`;
}
function footnoteHTML() {
  return `<p class="fn">All costs shown at midpoint page count; final billing reflects actual pages submitted. Poster presentations, IRB forms, SPSS outputs and implementation logs are quoted separately. Signature assessments require faculty review. All prices in USD.</p>`;
}
function instHTML() {
  return `<div class="inst">
    <div class="inst-lbl">First — confirm your institution &amp; program</div>
    <div class="inst-field">
      <select class="inst-select" data-act="inst" aria-label="Select your institution">
        ${institutions.map(i => `<option value="${i.id}"${i.id === "capella" ? " selected" : ""}>${i.name}</option>`).join("")}
      </select>
      <span class="inst-caret">${I.chevSm(15)}</span>
    </div>
    <div class="inst-note" data-inst-note></div>
  </div>`;
}
function quoteCardHTML() {
  return `<div class="quote-card">
    <div class="qc-ic">${I.up(20)}</div>
    <div class="qc-body">
      <div class="qc-h">Pricing for <span data-inst-name>your school</span> is on its way.</div>
      <div class="qc-p">We publish rate sheets program by program, and yours isn't live yet. Upload your brief and we'll send a tailored quote — usually within a few hours — then you can start right away.</div>
      <a class="btn btn-accent btn-lg" href="${BRIEF}">Upload your brief for a quote ${I.arrow()}</a>
    </div>
  </div>`;
}

// ════════ FULL DIRECTION MARKUPS ════════
function navHTML() {
  return `<nav class="nav">
    <div class="nav-inner wrap col">
      <a class="brand" href="${WS}" aria-label="Meridian Studio">
        <span class="mk" aria-hidden="true">M</span>
        <span class="wm">
          <span class="nm">Meridian Studio</span>
          <span class="tg">Academic writing · Est. 2019</span>
        </span>
      </a>
      <div class="nav-right">
        <a class="signin" href="${WS}">Sign in</a>
        <a class="btn btn-accent btn-sm" href="${WS}?mode=signup">Create account ${I.arrow(13)}</a>
      </div>
    </div>
  </nav>`;
}

function directionAHTML() {
  return `${navHTML()}
  <div class="col">
    <div class="mast">
      <div class="kicker"><span class="bar"></span>Getting started · a walk-through</div>
      <h1>Everything it takes<br>to <em>work with us.</em></h1>
      <p class="lede">We handle your doctoral assessments — the writing, the formatting, the submitting — so you can stay focused on what matters. Two steps: choose how submissions are handled, then choose how to pay.</p>
    </div>

    <div class="spine-sec">
      <div class="spine-mark"><div class="n">1</div></div>
      <div class="spine-body">
        <div class="kicker sec-kicker"><span class="bar"></span>Step one · Submission</div>
        <h2 class="sec-h">How would you like<br><em>submissions handled?</em></h2>
        <p class="sec-intro">Three options, same outcome — different levels of involvement. Whichever you choose, your program sees your own account and device.</p>
        ${submissionHTML()}
      </div>
    </div>

    <div class="spine-sec">
      <div class="spine-mark"><div class="n">2</div></div>
      <div class="spine-body">
        <div class="kicker sec-kicker"><span class="bar"></span>Step two · Pricing</div>
        <h2 class="sec-h">What it costs —<br><em>and how you'll pay.</em></h2>
        <p class="sec-intro">Choose a bundle or go course by course. Every figure is shown at the midpoint — no surprises later.</p>
        ${instHTML()}
        <div data-when-priced>${tiersHTML()}${cbcHTML()}${depHTML()}${payHTML()}${totalHTML()}${billingHTML()}</div>
        <div data-when-unpriced style="display:none">${quoteCardHTML()}</div>
        <div class="acts-block">
          <div class="ab-kicker">Ready when you are</div>
          <div class="ab-h">Create your account<br><em>and start today.</em></div>
          <div class="ab-s">
            <span data-when-priced>Lock in your <span data-sum="name">selected package</span> and upload your first brief. Already with us? Jump straight to payment tracking.</span>
            <span data-when-unpriced style="display:none">Upload your brief and we'll send a tailored quote for <span data-inst-name>your school</span> — usually within a few hours, then start right away.</span>
          </div>
          <div class="acts-row">
            <a class="act act-primary" href="${WS}?mode=signup">Create your account &amp; start ${I.arrow()}</a>
            <a class="act act-secondary" href="${WS}">Track an order &amp; payments ${I.arrow()}</a>
          </div>
          <div class="acts-micro">${I.lock(13)} Secure email &amp; password sign-in · stays signed in for 30 days</div>
        </div>
        ${footnoteHTML()}
      </div>
    </div>
  </div>`;
}

function directionBHTML() {
  return `<header class="pnav">
    <div class="pnav-inner">
      <a class="brand" href="${WS}"><span class="mk" aria-hidden="true">M</span><span class="wm"><span class="nm">Meridian Studio</span><span class="tg">Getting started</span></span></a>
      <div class="pnav-right"><a class="btn btn-ghost" href="${WS}">Sign in</a><a class="btn btn-accent" href="${WS}?mode=signup">Create account ${I.arrow(14)}</a></div>
    </div>
  </header>
  <div class="wrap">
    <section class="hero">
      <div class="eyebrow" style="margin-bottom:14px">Welcome to Meridian · here's how it works</div>
      <h1>Everything it takes to <em>work with us.</em></h1>
      <p class="lede">We handle your doctoral assessments — writing, formatting, and submitting — so you can stay focused on what matters. Two short steps below: choose how submissions are handled, then how you'd like to pay.</p>
      <div class="pills"><span class="pill"><b>01</b> How submission works</span><span class="pill"><b>02</b> What it costs</span><span class="pill"><b>03</b> Create your account</span></div>
    </section>
    <div class="body-grid">
      <main>
        <section class="panel">
          <div class="panel-head"><span class="pix">01</span><h2>How submissions are <em>handled.</em></h2></div>
          <p class="panel-intro">Three options, same outcome — different levels of involvement. Whichever you choose, your program sees your own account and device.</p>
          ${submissionHTML()}
        </section>
        <section class="panel">
          <div class="panel-head"><span class="pix">02</span><h2>What it costs.</h2></div>
          <p class="panel-intro">Choose a bundle or go course by course. Every figure is shown at the midpoint, so there are no surprises later. Your live selection is summarised on the right.</p>
          ${instHTML()}
          <div data-when-priced>${tiersHTML()}${cbcHTML()}${payHTML()}${billingHTML()}</div>
          <div data-when-unpriced style="display:none">${quoteCardHTML()}</div>
          ${footnoteHTML()}
        </section>
      </main>
      <aside class="rail">
        <div class="sum-card">
          <div class="sum-top"><div class="sum-eyebrow">Your selection</div><div data-when-priced><div class="sum-name" data-sum="name"></div><div class="sum-sub" data-sum="sub"></div></div><div data-when-unpriced style="display:none"><div class="sum-name" data-inst-name>Your school</div><div class="sum-sub">Tailored quote on brief upload</div></div></div>
          <div data-when-priced>
            <div class="sum-fig" data-total><div class="fig-row"><span class="fk">Program total</span><span class="fv" data-sum="total"></span></div><div class="fig-row"><span class="fk">To start today</span><span class="fd" data-sum="dep"></span></div></div>
            ${depHTML()}
          </div>
          <div class="sum-note" data-when-unpriced style="display:none"><div class="sum-note-h">Custom quote</div><div class="sum-note-p">We'll price <span data-inst-name>your school</span> as soon as you upload your brief.</div></div>
          <div class="sum-acts">
            <a class="btn btn-accent btn-lg" href="${WS}?mode=signup">Create your account &amp; start ${I.arrow()}</a>
            <a class="btn btn-ghost" href="${WS}">Track an order &amp; payments</a>
            <div class="sum-micro">${I.lock(12)}<span>Secure email &amp; password sign-in. Your deposit, payments and balance live in your workspace.</span></div>
          </div>
        </div>
      </aside>
    </div>
  </div>`;
}

// ── per-root state + apply ────────────────────────────────
const S = new WeakMap();
function applyTier(root) {
  const st = S.get(root) || { tier: "core" };
  const t = tiers[st.tier];
  const set = (role, val) => root.querySelectorAll(`[data-sum="${role}"]`).forEach(e => e.textContent = val);
  set("name", t.sumName); set("sub", t.sumSub); set("total", t.total); set("dep", t.hideTotal ? "" : t.dep);
  set("depAv", t.depA[0]); set("depAl", t.depA[1]);
  root.querySelectorAll("[data-total]").forEach(e => e.style.display = t.hideTotal ? "none" : "");
  root.querySelectorAll("[data-dep-b]").forEach(e => {
    if (t.depB) { e.style.display = ""; e.querySelector('[data-sum="depBv"]').textContent = t.depB[0]; e.querySelector('[data-sum="depBl"]').textContent = t.depB[1]; }
    else e.style.display = "none";
  });
  root.querySelectorAll("[data-tier]").forEach(b => b.classList.toggle("sel", b.dataset.tier === st.tier));
}
function applyInstitution(root) {
  const sel = root.querySelector('[data-act="inst"]');
  if (!sel) return;
  const inst = institutions.find(i => i.id === sel.value) || institutions[0];
  const priced = !!inst.populated;
  root.querySelectorAll("[data-when-priced]").forEach(e => e.style.display = priced ? "" : "none");
  root.querySelectorAll("[data-when-unpriced]").forEach(e => e.style.display = priced ? "none" : "");
  root.querySelectorAll("[data-inst-name]").forEach(e => e.textContent = inst.name);
  const note = root.querySelector("[data-inst-note]");
  if (note) note.textContent = priced ? (inst.note || "") : "";
  if (priced) applyTier(root);
}

// ── toast ─────────────────────────────────────────────────
let toastEl, toastTimer;
function toast(msg) {
  if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "gs-toast"; document.body.appendChild(toastEl); }
  toastEl.innerHTML = `<span class="tk">${I.check(15)}</span><span>${msg}</span>`;
  requestAnimationFrame(() => toastEl.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3400);
}

// ── mount (idempotent, per root) ──────────────────────────
function mount(root) {
  if (root.dataset.gsMounted) return;
  root.dataset.gsMounted = "1";
  S.set(root, { tier: "core" });
  root.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el || !root.contains(el)) return;
    const act = el.dataset.act, st = S.get(root);
    if (act === "tab") {
      root.querySelectorAll(".seg button").forEach(b => b.classList.remove("on"));
      el.classList.add("on");
      root.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("on", p.dataset.panel === el.dataset.tab));
    } else if (act === "tier") {
      st.tier = el.dataset.tier; applyTier(root);
    } else if (act === "cbc") {
      const open = el.classList.toggle("open");
      root.querySelector("[data-cbc-body]").classList.toggle("open", open);
      const rows = root.querySelector("[data-cbc-rows]");
      if (open && rows && !rows.children.length) rows.innerHTML = cbcRowsHTML();
    } else if (act === "pm") {
      const open = el.classList.toggle("open");
      root.querySelector("[data-pm-body]").classList.toggle("open", open);
    } else if (act === "inv") {
      if (el.dataset.proj === "true") { toast(`Noted — we'll alert you when ${el.dataset.code} is ready to begin.`); }
      else { el.classList.add("done"); el.innerHTML = "Invoice sent " + I.check(11); toast(`Invoice for ${el.dataset.code} ($${(+el.dataset.cost).toLocaleString()}) is on its way to your email.`); }
    }
  });
  root.addEventListener("change", e => {
    const el = e.target.closest('[data-act="inst"]');
    if (el && root.contains(el)) applyInstitution(root);
  });
  applyInstitution(root);
}

// ── public: render a full direction into an element ───────
export function renderDirection(root, kind = "b") {
  const dir = kind === "a" ? "a" : "b";
  root.className = `gs dir-${dir}`;
  delete root.dataset.gsMounted;
  root.innerHTML = dir === "a" ? directionAHTML() : directionBHTML();
  mount(root);
}

export function teardown(root) {
  if (!root) return;
  delete root.dataset.gsMounted;
  root.innerHTML = "";
}
