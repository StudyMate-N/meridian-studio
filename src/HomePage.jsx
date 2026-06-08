import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
import Concierge from './Concierge.jsx'
import './HomePage.css'

const WA_NUM = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Ico = {
  arrow:   (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  star:    (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.8 5.8 20.3 7.1 13.6l-5-4.6 6.8-.8z"/></svg>,
  check:   (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  x:       (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  loop:    (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>,
  shield:  (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  users:   (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-1a4 4 0 0 0-3-3.8M16 4.2A3.2 3.2 0 0 1 16 10.4"/></svg>,
  compass: (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 10.5 10.5 8.5 15.5 13.5 13.5"/></svg>,
  seal:    (p) => <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 2l2.4 1.8 3-.2 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L3.2 16l.9-2.9-.9-2.9 2.4-1.7 1-2.8 3 .2z"/><polyline points="9 12 11 14 15 10"/></svg>,
  wa:      (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2"/></svg>,
  spark:   (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6.3 6.3 4.5 4.5M19.5 19.5l-1.8-1.8M6.3 17.7 4.5 19.5M19.5 4.5l-1.8 1.8"/><circle cx="12" cy="12" r="3.2"/></svg>,
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const DISCIPLINES = [
  'Nursing & Health Sciences', 'Business & MBA', 'Psychology', 'Education & EdD',
  'Engineering', 'Computer Science', 'Law & Criminal Justice', 'Social Work',
  'Public Health', 'Data & Statistics', 'Humanities', 'Doctoral Research',
]

const LEVELS = [
  { id: 'ug',  badge: 'UG',  name: 'Undergraduate',       dg: "Associate · Bachelor's",      rate: 14, proj: null },
  { id: 'ms',  badge: 'MS',  name: "Master's",            dg: 'MA · MS · MBA · MSN',          rate: 19, proj: null },
  { id: 'adv', badge: 'ADV', name: 'Advanced / Pro',      dg: 'NP · JD · PsyD · Specialist',  rate: 23, proj: 26  },
  { id: 'dnp', badge: 'DOC', name: 'Doctoral · Practice', dg: 'DNP · EdD · Capstone',         rate: 27, proj: 31  },
  { id: 'phd', badge: 'PHD', name: 'Doctoral · Research', dg: 'PhD · Dissertation',           rate: 30, proj: 36  },
]

const SCOPES = [
  { id: 'one',    label: 'One assignment',     bundle: 0,  lo: 3,   hi: 8,   def: 5,   proj: false },
  { id: 'course', label: 'A full course',      bundle: 6,  lo: 18,  hi: 45,  def: 28,  proj: false },
  { id: 'term',   label: 'A full term',        bundle: 9,  lo: 45,  hi: 90,  def: 60,  proj: false },
  { id: 'cap',    label: 'Capstone / thesis',  bundle: 0,  lo: 60,  hi: 120, def: 80,  proj: true  },
  { id: 'diss',   label: 'Dissertation',       bundle: 0,  lo: 150, hi: 250, def: 180, proj: true  },
  { id: 'prog',   label: 'Your whole program', bundle: 15, lo: 120, hi: 300, def: 180, proj: false },
]

const DEADLINES = [
  { id: 'relaxed',  label: 'Relaxed',  sub: '10+ days',  mult: 0.92 },
  { id: 'standard', label: 'Standard', sub: '3–7 days',   mult: 1.0  },
  { id: 'rush',     label: 'Rush',     sub: '24–48 hrs',  mult: 1.35 },
]

const CITATIONS = ['APA 7', 'MLA 9', 'Chicago', 'Harvard', 'Other / not sure']

const HOW = [
  { n: '01', t: 'Tell us your', it: 'goal.',    b: 'Pick your level, discipline, and scope — from a single assignment to a full dissertation. Share the rubric. Your estimate appears instantly.', meta: 'Under a minute' },
  { n: '02', t: 'Meet your',    it: 'expert.',  b: 'We match you with a vetted specialist who holds a degree in your field. They confirm the plan and lock your quote — no surprise add-ons.', meta: 'Confirmed in 4 hours' },
  { n: '03', t: 'Learn &',      it: 'submit.',  b: 'Get model work, edits, and guidance you can actually understand and build on. Unlimited revisions until you\'re confident. Delivered before deadline.', meta: 'Always before deadline' },
]

const OLD_WAY = [
  'Anonymous page-mills who vanish after payment',
  'Generic AI output anyone could generate for free',
  "Work you can't explain — and can't defend",
  "One-size copy, no idea who actually wrote it",
]

const NEW_WAY = [
  'A named, degree-holding expert in your exact field',
  'Coaching, editing & research you learn from',
  "Original, integrity-screened work that's yours to own",
  'A partner for one paper — or your whole program',
]

const ASSURE = [
  { ic: 'users',   t: 'Same expert, every time',       b: 'You keep the one specialist who knows your field, your school, and your standards — across a single paper or your entire program. Continuity is the whole advantage.' },
  { ic: 'loop',    t: 'Revisions until you\'re sure',  b: "Free, unlimited revisions within scope. We refine until the work is something you fully understand and would happily defend." },
  { ic: 'shield',  t: 'Original & integrity-first',    b: 'Every deliverable is screened for plagiarism and AI-generation, and you get the report with it. Support that holds up to any scrutiny.' },
  { ic: 'compass', t: "You'll understand every line",  b: "We walk you through the work in plain language so you can explain and defend it yourself. That's the point — you leave more capable, not more dependent." },
]

const OUTCOMES = [
  { n: '4.9★', l: 'Average student rating' },
  { n: '98%',  l: 'Delivered before deadline' },
  { n: '100%', l: 'Briefs reviewed personally' },
  { n: '40+',  l: 'Disciplines covered' },
]

const TESTI = [
  { q: ['Three weeks from my capstone defense I was drowning. My expert didn\'t just hand me a paper — they ', { hl: 'walked me through the methodology' }, ' until I could defend every line. I passed with distinction.'], nm: 'Dana R.', dg: 'DNP Candidate · Capella', av: 'D' },
  { q: ['Honestly, I assumed this was just another essay-mill and nearly closed the tab. Two drafts in, my expert was explaining ', { hl: 'my own methodology better than I could' }, '. I stopped doubting — my GPA went 3.1 to 3.8.'], nm: 'Marcus L.', dg: 'MBA · Walden', av: 'M' },
  { q: ['English is my second language and grad school felt impossible. They helped me ', { hl: 'find my own academic voice' }, ' instead of replacing it — my advisor called my last paper my strongest yet.'], nm: 'Priya S.', dg: 'MSW · Online', av: 'P' },
]

const EXPERTS = [
  { nm: 'Dr. A. Mensah',  fl: 'Psychiatric Nursing',   deg: 'PhD'  },
  { nm: 'Dr. L. Okonkwo', fl: 'Business Strategy',     deg: 'DBA'  },
  { nm: 'M. Hartley',     fl: 'Educational Research',  deg: 'EdD'  },
  { nm: 'Dr. S. Reyes',   fl: 'Clinical Psychology',   deg: 'PsyD' },
]

const FAQ = [
  { q: 'Is using Meridian allowed?', a: 'Academic support has always existed — writing centres, tutors, study groups. Meridian is simply a more expert, more accountable version of that. You\'re not outsourcing your brain; you\'re getting a subject-matter expert in your corner. We screen everything for originality and never hand over work you couldn\'t stand behind and explain yourself.' },
  { q: 'What subjects and levels do you cover?', a: 'All of them. Our network spans 40+ disciplines — nursing and health sciences, business, psychology, education, engineering, computer science, law, social work and more — from undergraduate assignments to PhD dissertations. If we can\'t match you with a true specialist, we\'ll tell you up front.' },
  { q: 'Who actually does the work?', a: 'A vetted expert who holds an advanced degree in your specific field. Every writer passes credential verification, a discipline test, and APA/MLA/Chicago proficiency checks. You keep the same expert across a course or program so they know your standards.' },
  { q: 'How fast can you turn things around?', a: 'We confirm your quote within four hours. Standard delivery runs 3–7 days depending on scope; rush options can deliver in as little as 24 hours. Whatever we agree, it lands before your deadline — guaranteed.' },
  { q: 'How does payment work?', a: 'Fifty percent to begin, fifty percent on delivery once you\'ve reviewed the work. No subscriptions, no hidden fees, and the quote we lock is the price you pay.' },
  { q: 'Is it really confidential?', a: "Completely. We never share your identity or your school's. Uploads are encrypted, billing is discreet, and every team member is bound by a strict confidentiality agreement." },
]

// ── HELPERS ───────────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.ms .reveal')
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('in'))
      return
    }
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [])
}

function money(n) { return '$' + (Math.round(n / 10) * 10).toLocaleString() }

const STRIPE = {
  backgroundImage: 'repeating-linear-gradient(135deg, var(--paper-3) 0 11px, var(--paper-2) 11px 22px)',
}

// ── BRAND ─────────────────────────────────────────────────────────────────────
function Brand() {
  return (
    <a href="#top" className="brand" aria-label="Meridian Studio — home">
      <span className="mk" aria-hidden="true">M</span>
      <span className="wm">
        <span className="nm">Meridian Studio</span>
        <span className="tg">Academic partners · Est. 2019</span>
      </span>
    </a>
  )
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav({ onBrief }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : '' }, [open])
  const links = [['#how','How it works'],['#pricing','Pricing'],['#disciplines','Disciplines'],['#assurance','Our promise'],['#experts','Experts']]
  const close = () => setOpen(false)
  return (
    <header className={'nav' + (scrolled ? ' scrolled' : '')} role="banner">
      <div className="wrap nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Primary">
          {links.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
        </nav>
        <div className="nav-right">
          <a href="/workspace" className="signin">Sign in</a>
          <button className="btn btn-accent" onClick={() => onBrief()}>
            Start your brief {Ico.arrow()}
          </button>
          <button
            className={'burger' + (open ? ' open' : '')}
            aria-label="Menu" aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div className={'mobile-menu' + (open ? ' open' : '')}>
        {links.map(([h, l]) => <a key={h} href={h} onClick={close}>{l}</a>)}
        <a href="#apply" onClick={close}>Write for us</a>
        <a href="/workspace" onClick={close}>Sign in</a>
        <button
          className="btn btn-accent btn-lg m-cta"
          onClick={() => { close(); onBrief() }}
          style={{ display: 'inline-flex' }}
        >
          Start your brief {Ico.arrow()}
        </button>
      </div>
    </header>
  )
}

// ── HERO ──────────────────────────────────────────────────────────────────────
function Hero({ onBrief }) {
  return (
    <section className="hero" id="top" aria-labelledby="hero-h">
      <div className="wrap hero-grid">
        <div className="hero-left reveal">
          <div className="kicker hero-eyebrow"><span className="bar"></span>Academic support for a new era</div>
          <h1 id="hero-h">
            Your field.<br />Your level.<br />An expert who <span className="italic u">knows it.</span>
          </h1>
          <p className="hero-lede">
            Meridian pairs you with an <b>advanced-degree expert in your exact field</b> for
            coaching, editing, and research support — across every discipline and degree level.
            Real understanding. Work you can defend.
          </p>
          <p className="hero-punch">Help that <span className="italic">holds up.</span></p>
          <div className="hero-ctas">
            <a href="#pricing" className="btn btn-accent btn-lg">Get your estimate {Ico.arrow()}</a>
            <button className="btn btn-ghost btn-lg" onClick={() => onBrief()}>Start your brief</button>
          </div>
          <div className="hero-proof">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="rate">4.9</div>
              <div>
                <div className="stars" aria-label="4.9 out of 5">
                  {[0,1,2,3,4].map(i => <span key={i}>{Ico.star()}</span>)}
                </div>
                <div className="small">Verified student reviews</div>
              </div>
            </div>
            <div className="vr" aria-hidden="true"></div>
            <div className="small"><b style={{ color: 'var(--ink)', fontSize: '15px' }}>Same expert</b><br />start to finish</div>
            <div className="vr" aria-hidden="true"></div>
            <div className="small"><b style={{ color: 'var(--ink)', fontSize: '15px' }}>Every brief</b><br />personally reviewed</div>
          </div>
        </div>

        <div className="hero-visual reveal" style={{ transitionDelay: '.1s' }}>
          <div className="dossier">
            <div className="d-top">
              <span className="d-live"><span className="dot"></span>Live engagement</span>
              <span>MS · file 04</span>
            </div>
            <div className="d-title">DNP Capstone — Behavioral Health</div>
            <div className="d-rows">
              <div className="d-row"><span className="l">Matched expert</span><span className="v">Dr. A. Mensah · PhD</span></div>
              <div className="d-row"><span className="l">Discipline</span><span className="v">Psychiatric Nursing</span></div>
              <div className="d-row"><span className="l">Integrity screen</span><span className="v ok">Passed · 0% AI</span></div>
              <div className="d-row"><span className="l">Status</span><span className="v ok">On track · 2 days early</span></div>
            </div>
            <div className="d-foot">
              <span className="avp" aria-hidden="true"><span>A</span><span>L</span><span>S</span></span>
              <span className="txt">Hand-matched to a specialist in your exact field — and they stay with you.</span>
            </div>
          </div>
          <div className="hero-badge">
            <span className="seal" aria-hidden="true">{Ico.seal()}</span>
            <div>
              <div className="b-n">100%</div>
              <div className="b-l">On-time guarantee</div>
            </div>
          </div>
        </div>
      </div>

      <Disciplines />
    </section>
  )
}

// ── DISCIPLINES MARQUEE ───────────────────────────────────────────────────────
function Disciplines() {
  const items = [...DISCIPLINES, ...DISCIPLINES]
  return (
    <div className="disc" id="disciplines" aria-label="Disciplines covered">
      <div className="wrap disc-inner">
        <div className="disc-label">Specialists across every field</div>
        <div className="disc-mask">
          <div className="disc-track">
            {items.map((d, i) => (
              <span className="it" key={i}><span className="d" aria-hidden="true"></span>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ERA ───────────────────────────────────────────────────────────────────────
function Era() {
  return (
    <section className="era" aria-labelledby="era-h">
      <div className="wrap">
        <div className="era-head reveal">
          <div className="kicker"><span className="bar"></span>A new standard</div>
          <h2 id="era-h">Anyone can generate words.<br />We help you <span className="italic">earn the grade.</span></h2>
          <p className="era-sub">
            The era of anonymous essay-mills and copy-paste AI is over — schools see straight
            through it, and so do you. The future of academic help is human, accountable, and
            built to make you better. That's the only way we've ever worked.
          </p>
        </div>
        <div className="era-cols reveal" style={{ transitionDelay: '.08s' }}>
          <div className="era-col old">
            <div className="col-tag"><span className="sq"></span>The old way</div>
            <h3>Buy pages. Hope it passes.</h3>
            <ul className="era-list">
              {OLD_WAY.map((t, i) => <li key={i}><span className="mk">{Ico.x()}</span>{t}</li>)}
            </ul>
          </div>
          <div className="era-col new">
            <div className="col-tag"><span className="sq"></span>The Meridian way</div>
            <h3>Partner with an expert. Own the work.</h3>
            <ul className="era-list">
              {NEW_WAY.map((t, i) => <li key={i}><span className="mk">{Ico.check()}</span>{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
function How() {
  return (
    <section className="sec" id="how" aria-labelledby="how-h">
      <div className="wrap">
        <div className="sec-head reveal">
          <div className="h-main">
            <div className="kicker"><span className="bar"></span>How it works</div>
            <h2 id="how-h">Three steps. <span className="italic">One less worry.</span></h2>
          </div>
          <p className="sec-lede">From first click to final submission, you always know exactly where things stand.</p>
        </div>
        <div className="how-grid">
          {HOW.map((s, i) => (
            <div className="how-step reveal" key={s.n} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="h-n">{s.n}</div>
              <h3>{s.t} <span className="italic">{s.it}</span></h3>
              <p>{s.b}</p>
              <div className="h-meta"><span className="dot" aria-hidden="true"></span>{s.meta}</div>
            </div>
          ))}
        </div>
        <div className="how-bring reveal">
          <span className="hb-label">All you bring</span>
          <span className="hb-items">
            <span>Your rubric or prompt</span><span className="hb-dot"></span>
            <span>Your deadline</span><span className="hb-dot"></span>
            <span>Your course details</span>
          </span>
          <span className="hb-note">Our intake reads the rest from your file.</span>
        </div>
      </div>
    </section>
  )
}

// ── CALCULATOR ────────────────────────────────────────────────────────────────
function Calc({ onBrief }) {
  const [levelId, setLevelId] = useState('dnp')
  const [scopeId, setScopeId] = useState('cap')
  const [pages, setPages] = useState(80)
  const [dlId, setDlId] = useState('standard')
  const level = useMemo(() => LEVELS.find(l => l.id === levelId), [levelId])
  const scope = useMemo(() => SCOPES.find(s => s.id === scopeId), [scopeId])
  const dl = useMemo(() => DEADLINES.find(d => d.id === dlId), [dlId])
  const lvlRef = useRef(null)
  const scopeRef = useRef(null)
  const useProjRate = scope.proj && level.proj != null
  const rate = useProjRate ? level.proj : level.rate
  const calc = (pg) => rate * pg * dl.mult * (1 - scope.bundle / 100)
  const total = calc(pages)

  function pickScope(sc) { setScopeId(sc.id); setPages(sc.def) }

  function radioKey(e, items, currentId, ref, onPick) {
    const idx = items.findIndex(i => i.id === currentId)
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next = (idx + 1) % items.length }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); next = (idx - 1 + items.length) % items.length }
    else return
    onPick(items[next])
    ref.current?.querySelectorAll('[role="radio"]')?.[next]?.focus()
  }

  return (
    <section className="calc" id="pricing" aria-labelledby="calc-h">
      <div className="wrap">
        <div className="sec-head reveal">
          <div className="h-main">
            <div className="kicker"><span className="bar"></span>Transparent estimate</div>
            <h2 id="calc-h">See what your <span className="italic">support costs.</span></h2>
          </div>
          <p className="sec-lede">An honest estimate up front — page count, deadline and all. No surprise add-ons; your final quote is locked before any work begins.</p>
        </div>

        <div className="calc-grid">
          <div className="calc-panel">
            <div className="calc-block reveal">
              <div className="cb-h" id="lvl-lbl"><span className="step">A —</span> Academic level</div>
              <div className="lvl-grid" role="radiogroup" aria-labelledby="lvl-lbl" ref={lvlRef}>
                {LEVELS.map(lv => {
                  const on = lv.id === levelId
                  return (
                    <button key={lv.id} role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                      className={'lvl-card' + (on ? ' on' : '')}
                      onClick={() => setLevelId(lv.id)}
                      onKeyDown={e => radioKey(e, LEVELS, levelId, lvlRef, lv2 => setLevelId(lv2.id))}>
                      <span className="badge">{lv.badge}</span>
                      <div className="nm">{lv.name}</div>
                      <div className="dg">{lv.dg}</div>
                      <div className="rt"><span>${lv.rate}/pg</span>{lv.proj && <span>· ${lv.proj}/pg project</span>}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="calc-block reveal" style={{ transitionDelay: '.06s' }}>
              <div className="cb-h" id="scope-lbl"><span className="step">B —</span> Scope of support</div>
              <div className="scope-grid" role="radiogroup" aria-labelledby="scope-lbl" ref={scopeRef}>
                {SCOPES.map(sc => {
                  const on = sc.id === scopeId
                  return (
                    <button key={sc.id} role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                      aria-label={sc.label}
                      className={'scope-row' + (on ? ' on' : '')}
                      onClick={() => pickScope(sc)}
                      onKeyDown={e => radioKey(e, SCOPES, scopeId, scopeRef, pickScope)}>
                      <span className="radio" aria-hidden="true"></span>
                      <span className="sl">{sc.label}</span>
                      {sc.bundle > 0 && <span className="sv">−{sc.bundle}%</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="calc-block reveal" style={{ transitionDelay: '.1s' }}>
              <div className="cb-h"><span className="step">C —</span> Estimated length</div>
              <div className="pages-row">
                <input type="range" className="pages-range" min={scope.lo} max={scope.hi} value={pages}
                  aria-label="Estimated page count"
                  onChange={e => setPages(Number(e.target.value))} />
                <div className="pages-val"><span className="pv-n">{pages}</span><span className="pv-l">pages</span></div>
              </div>
              <div className="pages-hint">Typical {scope.label.toLowerCase()}: {scope.lo}–{scope.hi} pages. Drag to match your brief.</div>
            </div>

            <div className="calc-block reveal" style={{ transitionDelay: '.14s' }}>
              <div className="cb-h"><span className="step">D —</span> Deadline</div>
              <div className="dl-seg" role="radiogroup" aria-label="Deadline">
                {DEADLINES.map(d => {
                  const on = d.id === dlId
                  const delta = Math.round((d.mult - 1) * 100)
                  return (
                    <button key={d.id} role="radio" aria-checked={on}
                      className={'dl-opt' + (on ? ' on' : '')}
                      onClick={() => setDlId(d.id)}>
                      <span className="dl-n">{d.label}</span>
                      <span className="dl-s">{d.sub}</span>
                      <span className="dl-m">{delta === 0 ? 'base rate' : (delta > 0 ? `+${delta}%` : `${delta}%`)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="quote reveal" aria-live="polite" aria-atomic="true" style={{ transitionDelay: '.1s' }}>
            <div className="q-top">
              <span className="live"><span className="dot"></span>Live estimate</span>
              <span>MS-Q01</span>
            </div>
            <div className="q-scope">{scope.label}</div>
            <div className="q-big">
              <span className="qfrom">from</span>
              <span className="amt">${rate}</span>
              <span className="stk">
                <span className="t">USD / page</span>
                <span>{useProjRate ? 'project rate' : 'support rate'}</span>
                <span>{level.name}</span>
              </span>
            </div>
            <div className="q-rows">
              <div className="q-row"><span className="l">Estimated length</span><span className="v">{pages} pages</span></div>
              <div className="q-row"><span className="l">Deadline</span><span className="v">{dl.label} · {dl.sub}{dl.mult !== 1 ? ` (${dl.mult > 1 ? '+' : ''}${Math.round((dl.mult - 1) * 100)}%)` : ''}</span></div>
              {scope.bundle > 0 && <div className="q-row save"><span className="l">Bundle saving</span><span className="v">−{scope.bundle}%</span></div>}
              <div className="q-row total"><span className="l">Estimated total</span><span className="v">~{money(total)}</span></div>
            </div>
            <p className="q-foot">Just an estimate — your fixed quote is confirmed free within four hours of your brief, and never exceeds it without your say-so.</p>
            <button className="q-cta" onClick={() => onBrief({ levelId, scopeId, pages, dlId })}>
              <span>Start your brief</span>{Ico.arrow()}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── ASSURANCE ─────────────────────────────────────────────────────────────────
function Assurance() {
  return (
    <section className="assure" id="assurance" aria-labelledby="assure-h">
      <div className="wrap">
        <div className="assure-head reveal">
          <div className="kicker"><span className="bar"></span>Your success, assured</div>
          <h2 id="assure-h">We don't just promise.<br />We <span className="italic">put it in writing.</span></h2>
          <p>The reason students stay with Meridian for an entire program isn't the writing — it's the certainty. Four guarantees back every single engagement.</p>
        </div>
        <div className="assure-grid">
          {ASSURE.map((a, i) => (
            <div className="assure-card reveal" key={a.t} style={{ transitionDelay: `${i * 0.06}s` }}>
              <div className="ic" aria-hidden="true">{Ico[a.ic]()}</div>
              <h3>{a.t}</h3>
              <p>{a.b}</p>
            </div>
          ))}
        </div>
        <div className="assure-pledge reveal">
          <span className="seal" aria-hidden="true">{Ico.seal()}</span>
          <p className="pt">"If we ever miss a deadline we agreed to, your next engagement is free. We've only had to honor it a handful of times — and we intend to keep it that way."</p>
          <div className="sig">The Meridian<br />on-time pledge</div>
        </div>
      </div>
    </section>
  )
}

// ── OUTCOMES ──────────────────────────────────────────────────────────────────
function Outcomes() {
  return (
    <section className="outcomes" aria-label="Results">
      <div className="wrap outcomes-grid">
        {OUTCOMES.map(o => (
          <div className="outcome reveal" key={o.l}>
            <div className="n">{o.n}</div>
            <div className="l">{o.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── TESTIMONIALS ──────────────────────────────────────────────────────────────
function Testimonials() {
  return (
    <section className="sec" id="stories" aria-labelledby="testi-h">
      <div className="wrap">
        <div className="sec-head reveal">
          <div className="h-main">
            <div className="kicker"><span className="bar"></span>Student stories</div>
            <h2 id="testi-h">They came for help.<br />They <span className="italic">left more capable.</span></h2>
          </div>
          <p className="sec-lede">Outcomes from students across disciplines who stayed with the same expert.</p>
        </div>
        <div className="testi-grid">
          {TESTI.map((t, i) => (
            <figure className="testi reveal" key={t.nm} style={{ transitionDelay: `${i * 0.07}s` }}>
              <div className="stars" aria-label="5 out of 5">
                {[0,1,2,3,4].map(s => <span key={s}>{Ico.star()}</span>)}
              </div>
              <blockquote>
                "{t.q.map((seg, j) => typeof seg === 'string'
                  ? <span key={j}>{seg}</span>
                  : <span key={j} className="hl">{seg.hl}</span>
                )}"
              </blockquote>
              <figcaption className="who">
                <span className="av" aria-hidden="true">{t.av}</span>
                <span>
                  <span className="nm" style={{ display: 'block' }}>{t.nm}</span>
                  <span className="dg">{t.dg}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── EXPERTS ───────────────────────────────────────────────────────────────────
function Experts() {
  return (
    <section className="sec experts" id="experts" aria-labelledby="experts-h">
      <div className="wrap experts-grid">
        <div className="experts-left reveal">
          <div className="kicker"><span className="bar"></span>Who you work with</div>
          <h2 id="experts-h">Real degrees.<br />Real <span className="italic">expertise.</span></h2>
          <p>Every Meridian expert holds an advanced degree in the field they support and clears credential checks, a discipline exam, and a citation-style audit. Fewer than 1 in 9 applicants make it through.</p>
          <a href="#apply" className="tlink ex-cta">Meet the bar — write for us {Ico.arrow()}</a>
        </div>
        <div className="ex-cards reveal" style={{ transitionDelay: '.08s' }}>
          {EXPERTS.map(e => (
            <article className="ex-card" key={e.nm}>
              <div className="ph" style={STRIPE}>
                <span className="ph-deg">{e.deg}</span>
                <span className="ph-mono">portrait · expert headshot</span>
              </div>
              <div className="meta">
                <div className="nm">{e.nm}</div>
                <div className="fl">{e.fl}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <section className="sec" id="faq" aria-labelledby="faq-h">
      <div className="wrap faq-grid">
        <div className="reveal">
          <div className="kicker"><span className="bar"></span>Good questions</div>
          <h2 id="faq-h" style={{ fontSize: 'clamp(34px,4vw,52px)', marginTop: 20, letterSpacing: '-0.025em' }}>
            The things<br />everyone <span className="italic">asks first.</span>
          </h2>
          <p style={{ marginTop: 24, color: 'var(--muted)', fontSize: 16 }}>
            Still unsure? Message us on WhatsApp — a real person answers, usually within the hour.
          </p>
        </div>
        <div className="faq-list reveal" style={{ transitionDelay: '.06s' }}>
          {FAQ.map((f, i) => {
            const isOpen = openIdx === i
            return (
              <div className={'faq-item' + (isOpen ? ' open' : '')} key={i}>
                <button className="faq-q" aria-expanded={isOpen} onClick={() => setOpenIdx(isOpen ? -1 : i)}>
                  <span>{f.q}</span>
                  <span className="ico" aria-hidden="true"></span>
                </button>
                <div className="faq-a" style={{ maxHeight: isOpen ? '320px' : '0' }}>
                  <div className="inner">{f.a}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── APPLY ─────────────────────────────────────────────────────────────────────
function Apply() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [degree, setDegree] = useState('PhD')
  const [field, setField] = useState('')
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const crit = [
    "Master's, doctoral, or terminal degree in your field",
    'Active clinical, research, or industry background',
    'APA / MLA / Chicago proficiency',
    'Competitive per-page rates, paid on time',
  ]

  async function submit(e) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) { setErr('Name and WhatsApp number are required.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.from('writer_applications').insert({
      name: name.trim(),
      phone: phone.trim(),
      degree,
      specialty: field.trim() || null,
    })
    setLoading(false)
    if (error) { setErr('Submission failed. Please try again.'); console.error(error) }
    else setSent(true)
  }

  return (
    <section className="apply" id="apply" aria-labelledby="apply-h">
      <div className="wrap apply-grid">
        <div className="apply-left reveal">
          <div className="kicker"><span className="bar"></span>For writers</div>
          <h2 id="apply-h">Join a team that takes<br /><span className="italic">quality seriously.</span></h2>
          <p>If you hold an advanced degree and want flexible, well-paid academic work with students who value your expertise, we'd like to meet you.</p>
          <ul className="apply-crit">
            {crit.map(c => <li key={c}><span className="mk" aria-hidden="true">{Ico.check()}</span>{c}</li>)}
          </ul>
        </div>
        <div className="apply-right reveal" style={{ transitionDelay: '.08s' }}>
          {sent ? (
            <div className="apply-ok" role="status">
              <span className="ck" aria-hidden="true">{Ico.check({ width: 28, height: 28 })}</span>
              <h3>Application received.</h3>
              <p>Thank you. We'll review your background and reach out via WhatsApp within 48 hours.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate aria-labelledby="apply-form-ttl">
              <p className="f-eyebrow">Expression of interest</p>
              <div className="f-ttl" id="apply-form-ttl">Tell us about you.</div>
              <div className="field">
                <label htmlFor="ap-name">Full name *</label>
                <input id="ap-name" type="text" placeholder="Dr. Janelle Okafor"
                  value={name} onChange={e => setName(e.target.value)} aria-required="true" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ap-phone">WhatsApp *</label>
                  <input id="ap-phone" type="tel" placeholder="+1 555 123 4567"
                    value={phone} onChange={e => setPhone(e.target.value)} aria-required="true" />
                </div>
                <div className="field">
                  <label htmlFor="ap-deg">Highest degree</label>
                  <select id="ap-deg" value={degree} onChange={e => setDegree(e.target.value)}>
                    <option>{"Master's"}</option>
                    <option>DNP / EdD</option>
                    <option>PhD</option>
                    <option>JD</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="ap-field">Field of expertise</label>
                <input id="ap-field" type="text" placeholder="e.g. Clinical Psychology, Corporate Finance"
                  value={field} onChange={e => setField(e.target.value)} />
              </div>
              {err && <div role="alert" style={{ color: 'var(--accent-deep)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
              <button type="submit" className="btn btn-ink"
                style={{ width: '100%', marginTop: 10, justifyContent: 'space-between', padding: '16px 22px' }}
                disabled={loading}>
                {loading ? 'Submitting…' : <><span>Submit expression of interest</span>{Ico.arrow()}</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

// ── FINAL CTA ─────────────────────────────────────────────────────────────────
function Final({ onBrief }) {
  return (
    <section className="final" aria-labelledby="final-h">
      <div className="wrap narrow">
        <div className="reveal">
          <div className="kicker" style={{ justifyContent: 'center', marginBottom: 24 }}>
            <span className="bar"></span>Your program, handled
          </div>
          <h2 id="final-h">Stop carrying it<br /><span className="italic">alone.</span></h2>
          <p>Get a transparent estimate in under a minute, then meet the expert who'll see you through. No commitment until your quote is locked.</p>
          <div className="final-ctas">
            <button className="btn btn-accent btn-lg" onClick={() => onBrief()}>
              Start your brief {Ico.arrow()}
            </button>
            <a href="#pricing" className="btn btn-ghost btn-lg">See pricing first</a>
          </div>
          <div className="final-meta">APA 7 default · 50/50 payment · Confidential · Delivered before deadline</div>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer({ onBrief }) {
  return (
    <footer className="footer" role="contentinfo">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <div className="mk" aria-hidden="true">M</div>
            <div className="nm">Meridian Studio</div>
            <p>Expert academic support for students across every discipline and degree level. Human, accountable, and built to help you succeed.</p>
          </div>
          <div className="foot-col">
            <h4>Service</h4>
            <ul>
              <li><a href="#pricing">Pricing estimate</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#disciplines">Disciplines</a></li>
              <li><a href="#assurance">Our promise</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#experts">Our experts</a></li>
              <li><a href="#stories">Student stories</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#apply">Write for us</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Account</h4>
            <ul>
              <li><a href="/workspace">Sign in</a></li>
              <li><a href="/workspace">My orders</a></li>
              <li><button className="foot-brief-link" onClick={() => onBrief()}>Start a brief</button></li>
            </ul>
          </div>
        </div>
        <div className="foot-bot">
          <span className="cp">© MMXXVI · Meridian Studio · All rights reserved</span>
          <a href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noreferrer" className="wa-btn">
            {Ico.wa()}<span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

// ── BRIEF FLOW MODAL ──────────────────────────────────────────────────────────
function BriefFlow({ open, onClose, prefill }) {
  const [step, setStep] = useState('input')
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [f, setF] = useState({
    title: '', discipline: 'Nursing & Health Sciences', level: 'dnp', scope: 'cap',
    pages: 80, citation: 'APA 7', deadline: 'standard', requirements: '',
    name: '', whatsapp: '', notes: '', wantsCall: false,
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open && prefill) {
      setF(p => ({
        ...p,
        level: prefill.levelId || p.level,
        scope: prefill.scopeId || p.scope,
        pages: prefill.pages || p.pages,
        deadline: prefill.dlId || p.deadline,
      }))
    }
    if (open) { setStep('input'); setErr('') }
  }, [open])

  useEffect(() => { document.body.style.overflow = open ? 'hidden' : '' }, [open])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const level = useMemo(() => LEVELS.find(l => l.id === f.level) || LEVELS[0], [f.level])
  const scope = useMemo(() => SCOPES.find(s => s.id === f.scope) || SCOPES[0], [f.scope])
  const dl    = useMemo(() => DEADLINES.find(d => d.id === f.deadline) || DEADLINES[1], [f.deadline])
  const rate  = (scope.proj && level.proj != null) ? level.proj : level.rate
  const total = rate * f.pages * dl.mult * (1 - scope.bundle / 100)

  function goReview() { setErr(''); setStep('review') }

  async function submitBrief(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.whatsapp.trim()) {
      setErr('Please add your name and WhatsApp number so your expert can reach you.')
      return
    }
    setErr(''); setSubmitting(true)
    const { error } = await supabase.from('briefs').insert({
      title: f.title || null,
      discipline: f.discipline,
      level: f.level,
      scope: f.scope,
      pages: f.pages,
      citation: f.citation,
      deadline: f.deadline,
      requirements: f.requirements || null,
      estimate_usd: Math.round(total / 10) * 10,
      wants_call: f.wantsCall,
      name: f.name.trim(),
      whatsapp: f.whatsapp.trim(),
      notes: f.notes || null,
    })
    setSubmitting(false)
    if (error) { setErr('Submission failed — please try again.'); console.error(error) }
    else setStep('done')
  }

  const waText = encodeURIComponent(
    `Hi Meridian — I'd like to start a brief.\n\nTitle: ${f.title || '(untitled)'}\nDiscipline: ${f.discipline}\nLevel: ${level.name}\nScope: ${scope.label}\nLength: ~${f.pages} pages\nCitation: ${f.citation}\nDeadline: ${dl.label} (${dl.sub})\nEstimate: ${money(total)}${f.wantsCall ? '\n\nI\'d like a free 15-min scoping call first.' : ''}`
  )

  if (!open) return null
  const stepN = step === 'input' ? 1 : step === 'review' ? 2 : 3

  return (
    <div className="bf-overlay" role="dialog" aria-modal="true" aria-label="Start your brief"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bf-panel">
        <div className="bf-head">
          <div className="bf-steps" aria-hidden="true">
            {['Upload', 'Review', 'Confirm'].map((s, i) => (
              <span key={s} className={'bf-stp' + (i + 1 === stepN ? ' on' : '') + (i + 1 < stepN ? ' done' : '')}>
                <span className="n">{i + 1 < stepN ? Ico.check({ width: 12, height: 12 }) : i + 1}</span>{s}
              </span>
            ))}
          </div>
          <button className="bf-x" aria-label="Close" onClick={onClose}>{Ico.x({ width: 18, height: 18 })}</button>
        </div>

        {/* STEP 1 — INPUT */}
        {step === 'input' && (
          <div className="bf-body">
            <div className="bf-kick">{Ico.spark()} Brief intake</div>
            <h3 className="bf-h">Paste your rubric.<br />We'll <span className="italic">build the brief.</span></h3>
            <p className="bf-sub">Paste your assignment prompt or rubric below. We'll pre-fill the key details and you can adjust anything before it's sent.</p>
            <textarea className="bf-ta" placeholder="Paste your rubric or assignment prompt here…" value={raw} onChange={e => setRaw(e.target.value)} />
            {err && <div className="bf-err" role="alert">{err}</div>}
            <div className="bf-actions">
              <button className="btn btn-accent btn-lg" onClick={goReview}>Continue to review {Ico.arrow()}</button>
            </div>
            <div className="bf-inline">
              <button className="bf-link" onClick={goReview}>Skip — fill in manually</button>
            </div>
            <p className="bf-fine">Your brief is private and used only to scope your work. We screen every deliverable for originality.</p>
          </div>
        )}

        {/* STEP 2 — REVIEW */}
        {step === 'review' && (
          <form className="bf-body bf-review" onSubmit={submitBrief}>
            <h3 className="bf-h">Check your <span className="italic">brief.</span></h3>
            {raw && <div className="bf-note">{Ico.spark()}<span>Review and adjust the fields below before we send your brief.</span></div>}
            <div className="bf-grid">
              <div className="bf-main">
                <label className="bf-field full"><span>Assignment title</span>
                  <input type="text" value={f.title} placeholder="e.g. DNP Capstone Proposal"
                    onChange={e => set('title', e.target.value)} /></label>
                <label className="bf-field"><span>Discipline</span>
                  <select value={f.discipline} onChange={e => set('discipline', e.target.value)}>
                    {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
                  </select></label>
                <label className="bf-field"><span>Academic level</span>
                  <select value={f.level} onChange={e => set('level', e.target.value)}>
                    {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select></label>
                <label className="bf-field"><span>Scope</span>
                  <select value={f.scope} onChange={e => {
                    const sc = SCOPES.find(x => x.id === e.target.value)
                    set('scope', e.target.value)
                    if (sc) set('pages', sc.def)
                  }}>
                    {SCOPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select></label>
                <label className="bf-field"><span>Length (pages)</span>
                  <input type="number" min="1" value={f.pages}
                    onChange={e => set('pages', Math.max(1, Number(e.target.value) || 1))} /></label>
                <label className="bf-field"><span>Citation style</span>
                  <select value={f.citation} onChange={e => set('citation', e.target.value)}>
                    {CITATIONS.map(c => <option key={c}>{c}</option>)}
                  </select></label>
                <label className="bf-field"><span>Deadline</span>
                  <select value={f.deadline} onChange={e => set('deadline', e.target.value)}>
                    {DEADLINES.map(d => <option key={d.id} value={d.id}>{d.label} · {d.sub}</option>)}
                  </select></label>
                <label className="bf-field full"><span>Key requirements</span>
                  <textarea rows="3" value={f.requirements} placeholder="One requirement per line"
                    onChange={e => set('requirements', e.target.value)} /></label>
                {(f.scope === 'cap' || f.scope === 'diss' || f.scope === 'prog') && (
                  <button type="button" className={'bf-call full' + (f.wantsCall ? ' on' : '')}
                    onClick={() => set('wantsCall', !f.wantsCall)}>
                    <span className="bf-call-ck" aria-hidden="true">{f.wantsCall && Ico.check({ width: 12, height: 12 })}</span>
                    <span><b>This is a big one — book a free 15-min scoping call first.</b><br />Best for capstones, dissertations &amp; full programs. We'll map the work before you commit a cent.</span>
                  </button>
                )}
                <div className="bf-divider"><span>Where do we send your quote?</span></div>
                <label className="bf-field"><span>Your name *</span>
                  <input type="text" value={f.name} placeholder="First name is fine"
                    onChange={e => set('name', e.target.value)} /></label>
                <label className="bf-field"><span>WhatsApp *</span>
                  <input type="tel" value={f.whatsapp} placeholder="+1 555 123 4567"
                    onChange={e => set('whatsapp', e.target.value)} /></label>
              </div>
              <aside className="bf-side">
                <div className="bf-est">
                  <div className="bf-est-top">Live estimate</div>
                  <div className="bf-est-amt">{money(total)}</div>
                  <div className="bf-est-rows">
                    <div><span>{level.name}</span><span>${rate}/pg</span></div>
                    <div><span>{f.pages} pages</span><span>{scope.label}</span></div>
                    <div><span>{dl.label}</span><span>{dl.mult !== 1 ? `${dl.mult > 1 ? '+' : ''}${Math.round((dl.mult - 1) * 100)}%` : 'base'}</span></div>
                    {scope.bundle > 0 && <div className="sv"><span>Bundle</span><span>−{scope.bundle}%</span></div>}
                  </div>
                  <p className="bf-est-note">Estimate only. A specialist confirms your exact quote within 4 hours — you approve it before anything begins.</p>
                </div>
              </aside>
            </div>
            {err && <div className="bf-err" role="alert">{err}</div>}
            <div className="bf-actions between">
              <button type="button" className="bf-link" onClick={() => setStep('input')}>← Back</button>
              <button type="submit" className="btn btn-accent btn-lg" disabled={submitting}>
                {submitting ? 'Sending…' : <><span>Send my brief</span>{Ico.arrow()}</>}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 — DONE */}
        {step === 'done' && (
          <div className="bf-body bf-done">
            <span className="bf-done-ck" aria-hidden="true">{Ico.check({ width: 30, height: 30 })}</span>
            <h3 className="bf-h" style={{ textAlign: 'center' }}>
              Brief received{f.name ? `, ${f.name.split(' ')[0]}` : ''}.
            </h3>
            <p className="bf-sub" style={{ textAlign: 'center' }}>
              {f.wantsCall
                ? <>A specialist in <b>{f.discipline}</b> will reach out by WhatsApp within four hours to book your free 15-minute scoping call — no commitment.</>
                : <>A specialist in <b>{f.discipline}</b> is reviewing it now. You'll have your locked quote — and your matched expert — within four hours, by WhatsApp.</>}
            </p>
            <div className="bf-summary">
              <div><span>Title</span><b>{f.title || 'Untitled brief'}</b></div>
              <div><span>Level · scope</span><b>{level.name} · {scope.label}</b></div>
              <div><span>Length · deadline</span><b>{f.pages} pages · {dl.label}</b></div>
              <div><span>Estimate</span><b>{money(total)}</b></div>
            </div>
            <div className="bf-actions" style={{ justifyContent: 'center' }}>
              <a className="btn btn-accent btn-lg"
                href={`https://wa.me/${WA_NUM}?text=${waText}`}
                target="_blank" rel="noreferrer">
                {Ico.wa()} Send it on WhatsApp now
              </a>
              <button className="btn btn-ghost btn-lg" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [briefOpen, setBriefOpen] = useState(false)
  const [briefPrefill, setBriefPrefill] = useState(null)
  useReveal()
  useEffect(() => { document.title = 'Meridian Studio — Built to help you succeed.' }, [])

  function openBrief(prefill) {
    setBriefPrefill(prefill || null)
    setBriefOpen(true)
  }

  // Expose a stable global so the Concierge widget can open the brief modal
  // pre-seeded from an AI-parsed rubric or guided estimate.
  useEffect(() => {
    window.MeridianOpenBrief = openBrief
    return () => { if (window.MeridianOpenBrief === openBrief) delete window.MeridianOpenBrief }
  }, [])

  return (
    <div className="ms">
      <a href="#main" className="skip">Skip to content</a>
      <Nav onBrief={openBrief} />
      <main id="main">
        <Hero onBrief={openBrief} />
        <Era />
        <How />
        <Calc onBrief={openBrief} />
        <Assurance />
        <Outcomes />
        <Testimonials />
        <Experts />
        <FaqSection />
        <Apply />
        <Final onBrief={openBrief} />
      </main>
      <Footer onBrief={openBrief} />
      <BriefFlow open={briefOpen} onClose={() => setBriefOpen(false)} prefill={briefPrefill} />
      <Concierge />
    </div>
  )
}
