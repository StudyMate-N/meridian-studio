import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
import Concierge from './Concierge.jsx'
import './HomePage.css'

const WA_NUM = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'

// AI intake — proxied through the `concierge` Supabase Edge Function so the
// Anthropic key stays server-side.
const FN_URL = (import.meta.env.VITE_SUPABASE_URL || '') + '/functions/v1/concierge'
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
async function callAI(prompt) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) throw new Error('ai_http_' + res.status)
  const data = await res.json()
  const text = (data && data.text || '').trim()
  if (!text) throw new Error('ai_empty')
  return text
}

const SAMPLE_RUBRIC = `NURS 8302 — DNP Capstone Proposal (Walden University). Develop a 12–15 page evidence-based practice proposal for a behavioral-health clinical problem. Include a problem statement, PICOT question, literature synthesis (minimum 10 peer-reviewed sources from the last 5 years), proposed intervention and evaluation plan. APA 7th edition, level-1 and level-2 headings. Due in 6 days. Submit via Turnitin, similarity under 15%.`

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Ico = {
  arrow:   (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  star:    (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.8 5.8 20.3 7.1 13.6l-5-4.6 6.8-.8z"/></svg>,
  check:   (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  x:       (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  loop:    (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>,
  shield:  (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  users:   (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-1a4 4 0 0 0-3-3.8M16 4.2A3.2 3.2 0 0 1 16 10.4"/></svg>,
  user:    (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M5 20a7 7 0 0 1 14 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,
  clock:   (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>,
  compass: (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 10.5 10.5 8.5 15.5 13.5 13.5"/></svg>,
  seal:    (p) => <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 2l2.4 1.8 3-.2 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L3.2 16l.9-2.9-.9-2.9 2.4-1.7 1-2.8 3 .2z"/><polyline points="9 12 11 14 15 10"/></svg>,
  sealc:   (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M9 12l2 2 4-4M12 3l7 2.6v5.4c0 4.2-3 7.2-7 9-4-1.8-7-4.8-7-9V5.6z"/></svg>,
  wa:      (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2"/></svg>,
  spark:   (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6.3 6.3 4.5 4.5M19.5 19.5l-1.8-1.8M6.3 17.7 4.5 19.5M19.5 4.5l-1.8 1.8"/><circle cx="12" cy="12" r="3.2"/></svg>,
  sparkF:  (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>,
  upload:  (p) => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 16V4M7 9l5-5 5 5"/></svg>,
  refresh: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M20 11a8 8 0 0 0-14-4M4 5v3h3M4 13a8 8 0 0 0 14 4M20 19v-3h-3"/></svg>,
  chev:    (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  play:    (p) => <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M8 5v14l11-7z"/></svg>,
  copy:    (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  lock:    (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const DISCIPLINES = [
  'Nursing & Health Sciences', 'Business & MBA', 'Psychology', 'Education & EdD',
  'Engineering', 'Computer Science', 'Law & Criminal Justice', 'Social Work',
  'Public Health', 'Data & Statistics', 'Humanities', 'Doctoral Research',
]

const LEVELS = [
  { id: 'ug',  badge: 'UG',  name: 'Undergraduate',       dg: "Associate · Bachelor's",      sub: 'Undergrad',       rate: 14, proj: null },
  { id: 'ms',  badge: 'MS',  name: "Master's",            dg: 'MA · MS · MBA · MSN',          sub: "Master's",        rate: 19, proj: null },
  { id: 'adv', badge: 'ADV', name: 'Advanced / Pro',      dg: 'NP · JD · PsyD · Specialist',  sub: 'NP / JD / PsyD',  rate: 23, proj: 26  },
  { id: 'dnp', badge: 'DOC', name: 'Doctoral · Practice', dg: 'DNP · EdD · Capstone',         sub: 'DNP / EdD',       rate: 27, proj: 31  },
  { id: 'phd', badge: 'PHD', name: 'Doctoral · Research', dg: 'PhD · Dissertation',           sub: 'Research',        rate: 30, proj: 36  },
]

const SCOPES = [
  { id: 'one',    label: 'One assignment',     short: 'One assignment',  bundle: 0,  lo: 3,   hi: 8,   def: 5,   proj: false },
  { id: 'course', label: 'A full course',      short: 'Full course',     bundle: 6,  lo: 18,  hi: 45,  def: 28,  proj: false },
  { id: 'term',   label: 'A full term',        short: 'Full term',       bundle: 9,  lo: 45,  hi: 90,  def: 60,  proj: false },
  { id: 'cap',    label: 'Capstone / thesis',  short: 'Capstone / thesis', bundle: 0, lo: 60, hi: 120, def: 80,  proj: true  },
  { id: 'diss',   label: 'Dissertation',       short: 'Dissertation',    bundle: 0,  lo: 150, hi: 250, def: 180, proj: true  },
  { id: 'prog',   label: 'Your whole program', short: 'Whole program',   bundle: 15, lo: 120, hi: 300, def: 180, proj: false },
]

const DEADLINES = [
  { id: 'relaxed',  label: 'Relaxed',  sub: '10+ days',  mult: 0.92 },
  { id: 'standard', label: 'Standard', sub: '3–7 days',   mult: 1.0  },
  { id: 'rush',     label: 'Rush',     sub: '24–48 hrs',  mult: 1.35 },
]

const CITATIONS = ['APA 7', 'MLA', 'Harvard', 'Chicago', 'AMA', 'IEEE', 'Vancouver', 'OSCOLA', 'Turabian']

// AI-intake deadline → fixed bucket (≤2d rush ×1.6, ≤7d standard ×1.15, else relaxed ×1.0)
const INTAKE_EXAMPLES = [
  'DNP capstone, 12 pages, APA 7, due in 6 days',
  'MBA strategy report, 8 pages, Harvard, 2 weeks',
  'Undergrad psychology essay, 5 pages, APA',
]

const HOW = [
  { n: '01', icon: 'spark', t: 'Tell us your goal',  b: 'Paste your rubric or describe it in a sentence. Pick your level, discipline and scope — our intake reader scopes it instantly.', tag: 'Under a minute', img: '/meridian/how-1.png', alt: 'A warm desk with notebook and study lamp' },
  { n: '02', icon: 'user',  t: 'Meet your scholar',  b: 'We match you to a vetted specialist with an advanced degree in your exact field. They analyse the guidelines and lock your flat quote.', tag: 'Estimate in 30 min – 2 hrs', img: '/meridian/how-2.png', alt: 'A study desk seen over the shoulder' },
  { n: '03', icon: 'check',  t: 'Learn & defend',     b: 'Receive drafts, detailed revisions and structural guidance you can learn from — with AI & similarity reports, before your deadline.', tag: 'Always before deadline', img: '/meridian/how-3.png', alt: 'A finished paper with a wax seal' },
]

const TRUST_STATS = [
  { n: '12k+', l: 'Briefs delivered' },
  { n: '4.9',  l: 'Average rating' },
  { n: '96%',  l: 'Delivered on time' },
  { n: '200+', l: 'Vetted experts' },
]

const OLD_WAY = [
  { b: 'Anonymous content mills', t: ' — you never know who is writing or whether they hold any real qualification.' },
  { b: 'Generic AI templates', t: " — easily flagged by Turnitin's AI classifiers and rejected outright." },
  { b: "Work you can't defend", t: " — an isolated paper you can't explain, leaving you exposed in an oral defence." },
  { b: 'Transaction, not partnership', t: ' — ghosted after payment, with no real revision path.' },
]

const NEW_WAY = [
  { b: 'Named, credentialed scholars', t: ' — hand-matched specialists with real advanced degrees in your exact discipline.' },
  { b: 'Interactive learning model', t: ' — edits, model work and coaching so you internalise the material.' },
  { b: 'Dual-layer integrity checks', t: ' — every deliverable ships with plagiarism + AI-detection reports.' },
  { b: 'Continuous program partner', t: ' — the same expert stays with you across chapters and terms.' },
]

const GUARDS = [
  { ic: 'users',  t: 'Same expert, every brief',    b: "You keep the same designated specialist who knows your voice, your school's rubric and your standards — total program continuity." },
  { ic: 'shield', t: 'Original & integrity-first',  b: 'Every draft is scanned for plagiarism and AI footprinting. You get the official report showing 0% AI use before final delivery.' },
  { ic: 'clock',  t: 'The on-time pledge',          b: 'We agree deadlines up front. If we are late by even one minute, your next engagement is completely free. No questions asked.' },
  { ic: 'sealc',  t: 'Complete understanding',      b: "We don't just deliver pages — we walk you through every sentence and method so you can confidently explain and defend your work." },
]

const EST_CHECKS = [
  '50% deposit to begin · 50% on final approval',
  'Zero surprises: the locked rate never increases',
  'Includes integrity report & Turnitin screen',
]

const TESTI = [
  { q: 'My expert understood my DNP capstone better than my own advisor. Delivered early, zero AI flags, and I could defend every line.', nm: 'Grace M.', dg: "Master's, Nursing", av: 'GM', avBg: 'var(--accent)' },
  { q: 'I was drowning before finals. The same person stayed with me through three revisions — like a tutor who genuinely cared.', nm: 'Daniel O.', dg: 'MSc, Economics', av: 'DO', avBg: '#3C6699' },
  { q: 'The originality and AI reports gave me total peace of mind. Rigorous, sourced, and on time.', nm: 'Priya N.', dg: 'MBA', av: 'PN', avBg: '#0F7E84' },
]

// Vetted-experts specialty selector → matched profile card
const SPECIALTIES = [
  { key: 'nursing',    label: 'Nursing & Health Sciences',   initials: 'HC', avBg: 'var(--accent)', name: 'Dr. Helen G. Carter, PhD, DNP', degree: 'PhD in Nursing Research · DNP, Psychiatric Mental Health', rating: '4.95', briefs: '148', bg: 'Over 12 years of nursing practice and capstone mentorship. Specialises in psychiatric nursing methodology, evidence-based project designs and clinical research critique.', institution: 'Vanderbilt University', format: 'APA 7 expert' },
  { key: 'business',   label: 'Business, Finance & MBA',     initials: 'JR', avBg: '#3C6699', name: 'Prof. Jonathan Reed, DBA', degree: 'DBA in Strategy · MBA, Corporate Finance', rating: '4.92', briefs: '131', bg: 'Former business-school faculty. Turns ambiguous prompts into defensible, well-argued strategy and finance analysis with rigorous sourcing.', institution: 'London Business School', format: 'APA 7 · Harvard' },
  { key: 'education',  label: 'Education & EdD',             initials: 'MA', avBg: '#0F7E84', name: 'Dr. Maria Alvarez, PhD, EdD', degree: 'PhD in Education · EdD, Curriculum & Instruction', rating: '4.90', briefs: '119', bg: 'Mixed-methods specialist focused on teacher professional development and program evaluation. Meticulous with dissertation methodology chapters.', institution: 'Columbia Teachers College', format: 'APA 7 expert' },
  { key: 'psychology', label: 'Psychology & Social Work',    initials: 'SO', avBg: '#7A4DA0', name: 'Dr. Samuel Okoye, PhD, MSW', degree: 'PhD in Clinical Psychology · MSW', rating: '4.88', briefs: '104', bg: 'CBT outcomes researcher and academic editor. Strong on psychometrics, ethics and applied social-work practice frameworks.', institution: 'University of Michigan', format: 'APA 7 expert' },
  { key: 'data',       label: 'Data & Statistics (SPSS / R)', initials: 'LC', avBg: '#9E4825', name: 'Dr. Lena Chachoute, PhD', degree: 'PhD in Public Health · Biostatistics', rating: '4.93', briefs: '156', bg: 'Epidemiology researcher and statistician. SPSS and R specialist for regression, modelling and PRISMA-guided systematic reviews.', institution: 'Johns Hopkins University', format: 'APA 7 expert' },
]

const FAQ = [
  { q: 'Is this allowed at my school?', a: "Meridian provides coaching, editing and model research support — the same kind of help a writing center or private tutor offers. Our work is built to learn from and to defend as your own understanding; always follow your school's policies on outside assistance." },
  { q: 'Will it be flagged as AI?', a: 'Every deliverable is written by a human expert — never machine-generated — and ships with an AI-detection and originality report, so you can see the results yourself before you submit.' },
  { q: 'Do I get the same expert throughout?', a: "Yes. You're matched once to a specialist in your field and they stay with you through drafts, revisions and delivery — no rotating freelancers." },
  { q: 'How does payment work?', a: 'A 50% deposit starts the work; the balance is due on delivery. Your estimate is transparent up front and an expert confirms scope before you pay.' },
  { q: 'How fast can you deliver?', a: 'As fast as 24–48 hours for shorter work. Scope your assignment above and the deadline you choose is reflected in the price.' },
]

// Footer columns mirror the design prototype exactly: Product / Company / Legal,
// with the prototype's link labels. Product links point at homepage anchors; the
// Company/Legal info links now resolve to real client routes (see src/InfoPage.jsx
// + the routes wired in App.jsx). A null target falls back to the concierge.
const FOOT_COLS = [
  { head: 'Product', links: [
    ['#how', 'How it works'],
    ['#coverage', 'Pricing'],
    ['#experts', 'Meet the experts'],
    ['#apply', 'Become an expert'],
  ] },
  { head: 'Company', links: [
    ['/getting-started', 'About'],
    ['/integrity', 'Integrity policy'],
    ['/contact', 'Contact'],
    ['#apply', 'Careers'],
  ] },
  { head: 'Legal', links: [
    ['/terms', 'Terms'],
    ['/privacy', 'Privacy'],
    ['/refund', 'Refund policy'],
    ['/confidentiality', 'Confidentiality'],
  ] },
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
function moneyExact(n) { return '$' + Math.round(n).toLocaleString('en-US') }

// Opens the floating Concierge (same hook the floating "Ask Meridian" button uses);
// falls back to WhatsApp if the widget hasn't mounted yet.
function openConcierge() {
  if (window.MeridianOpenConcierge) window.MeridianOpenConcierge()
  else window.open(`https://wa.me/${WA_NUM}`, '_blank')
}

// ── BRAND ─────────────────────────────────────────────────────────────────────
function Brand() {
  return (
    <a href="#top" className="brand" aria-label="Meridian Studio — home">
      <span className="mk" aria-hidden="true">M</span>
      <span className="wm">
        <span className="nm">Meridian Studio</span>
        <span className="tg">Academic Partners · Est. 2019</span>
      </span>
    </a>
  )
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav({ onBrief, onScope }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : '' }, [open])
  const links = [['#how', 'How it works'], ['#coverage', 'Pricing'], ['#experts', 'Experts'], ['#faq', 'FAQ']]
  const close = () => setOpen(false)
  return (
    <header className={'nav' + (scrolled ? ' scrolled' : '')} role="banner">
      <div className="wrap nav-inner">
        <Brand />
        <div className="nav-spacer" />
        <nav className="nav-links" aria-label="Primary">
          {links.map(([h, l]) => <a key={h} href={h} className="v2-link">{l}</a>)}
        </nav>
        <a href="/workspace" className="signin nav-links-only">Sign in</a>
        <button type="button" className="nav-ask nav-links-only"
          aria-label="Ask Meridian — open the concierge" onClick={openConcierge}>
          {Ico.sparkF()} Ask Meridian
        </button>
        <button type="button" className="btn btn-accent nav-cta"
          aria-label="Scope my work — open the intake" onClick={() => onScope()}>
          Scope my work {Ico.arrow()}
        </button>
        <button
          type="button"
          className={'burger' + (open ? ' open' : '')}
          aria-label="Menu" aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          <span></span><span></span><span></span>
        </button>
      </div>
      {open && (
        <div className="nav-drawer">
          {links.map(([h, l]) => <a key={h} href={h} onClick={close}>{l}</a>)}
          <a href="/workspace" onClick={close} className="strong">Sign in</a>
          <button type="button" className="nav-ask drawer-ask"
            onClick={() => { close(); openConcierge() }}>{Ico.spark()} Ask Meridian</button>
          <button type="button" className="btn btn-accent btn-lg drawer-cta"
            onClick={() => { close(); onScope() }}>Scope my work {Ico.arrow()}</button>
        </div>
      )}
    </header>
  )
}

// ── HERO + AI INTAKE CONSOLE ────────────────────────────────────────────────────
function Hero({ onBrief, intakeRef }) {
  // states: 'input' | 'busy' | 'result'
  const [stage, setStage] = useState('input')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [scope, setScope] = useState(null)   // { discipline, level, scope, pages, citation, deadline, requirements[] }
  const [placeholder, setPlaceholder] = useState(INTAKE_EXAMPLES[0])
  const [toast, setToast] = useState('')
  const taRef = useRef(null)
  const toastTimer = useRef(null)
  const liveCount = useMemo(() => 23 + (new Date().getHours() % 7), [])

  // Animated typewriter placeholder — mirrors the design's tickPlaceholder (55ms/char).
  // Only runs while the field is empty and we're on the input stage (not busy/result).
  useEffect(() => {
    if (stage !== 'input' || text) return
    const list = INTAKE_EXAMPLES.concat(['PhD dissertation chapter, 20 pages, Chicago, 3 weeks'])
    let phI = 0, phChar = 0, phDel = false, phPause = 8
    const tick = () => {
      const full = list[phI % list.length]
      if (phPause > 0) { phPause--; setPlaceholder(full + '▋'); return }
      if (!phDel) {
        phChar++; setPlaceholder(full.slice(0, phChar) + '▋')
        if (phChar >= full.length) { phDel = true; phPause = 30 }
      } else {
        phChar--; setPlaceholder(full.slice(0, phChar) + '▋')
        if (phChar <= 0) { phDel = false; phI++; phPause = 5 }
      }
    }
    const id = setInterval(tick, 55)
    return () => clearInterval(id)
  }, [stage, text])

  // Lightweight toast (auto-dismiss after 3.2s).
  function showToast(msg) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3200)
  }
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // expose a focus hook for nav/final "Scope my work" buttons
  useEffect(() => { if (intakeRef) intakeRef.current = () => {
    const el = taRef.current
    if (el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {} setTimeout(() => el.focus(), 350) }
  } }, [intakeRef])

  function computeScope(j) {
    const level = LEVELS.find(l => l.id === j.level) || LEVELS[1]
    const sc = SCOPES.find(s => s.id === j.scope) || SCOPES[0]
    const useProj = sc.proj && level.proj != null
    const baseRate = useProj ? level.proj : level.rate
    // intake deadline multiplier: ≤2d ×1.6 / ≤7d ×1.15 / else ×1.0
    const days = Number.isFinite(j.days) ? j.days : (j.deadline === 'rush' ? 2 : j.deadline === 'standard' ? 5 : 14)
    const mult = days <= 2 ? 1.6 : (days <= 7 ? 1.15 : 1.0)
    const pages = Math.max(1, Math.min(400, Number(j.pages) || sc.def))
    const perPage = Math.round(baseRate * mult)
    const estimate = Math.round(pages * baseRate * mult)
    const deadlineId = days <= 2 ? 'rush' : (days <= 7 ? 'standard' : 'relaxed')
    return {
      discipline: j.discipline || 'General studies',
      level: level.id, levelName: level.name,
      scope: sc.id, scopeName: sc.label,
      pages, citation: j.citation || 'APA 7', days, deadlineId,
      deadlineLabel: days <= 1 ? 'in 24 hours' : (days <= 2 ? 'in 2 days' : (days >= 21 ? ('in ~' + Math.round(days / 7) + ' weeks') : 'in ' + days + ' days')),
      perPage, estimate,
      requirements: Array.isArray(j.requirements) ? j.requirements.slice(0, 4) : [],
    }
  }

  async function scopeIt(srcText) {
    const src = (typeof srcText === 'string' ? srcText : text).trim()
    if (src.length < 8) { setErr('Add a sentence about your assignment — your level, length and deadline help most.'); return }
    setErr(''); setStage('busy')
    const prompt = `You are the intake assistant for Meridian Studio, an academic support service. Read the assignment brief below and return ONLY a JSON object (no prose, no markdown fences) with these keys:
"title": short descriptive title (max 8 words),
"discipline": one of ${JSON.stringify(DISCIPLINES)} — closest match,
"level": one of "ug","ms","adv","dnp","phd",
"scope": one of "one","course","term","cap","diss","prog",
"pages": integer page estimate (convert ~275 words = 1 page if only word count given; if a range, use the midpoint; else null),
"citation": one of "APA 7","MLA","Harvard","Chicago","AMA","IEEE","Vancouver","OSCOLA","Turabian" — closest match, default "APA 7",
"deadline_days": integer number of days until due (if "rush"/24-48h use 2, if within a week use 5, if 10+ days or unstated use 14),
"requirements": array of up to 4 short strings capturing the most important instructions.

BRIEF:
"""${src.slice(0, 6000)}"""`
    try {
      const res = await callAI(prompt)
      const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
      j.days = Number.isFinite(j.deadline_days) ? j.deadline_days : undefined
      setScope({ ...computeScope(j), title: j.title || '' })
      setStage('result')
    } catch (e) {
      setErr("We couldn't read enough to scope this yet. Add your level, page count and deadline — e.g. “Master's nursing essay, 8 pages, APA, due in 1 week” — or ask our concierge.")
      setStage('input')
    }
  }

  function patch(p) {
    setScope(prev => {
      const next = { ...prev, ...p }
      // recompute pricing from edited facts
      return computeScope({
        discipline: next.discipline, level: next.level, scope: next.scope,
        pages: next.pages, citation: next.citation, days: next.days,
        requirements: next.requirements,
      })
    })
  }

  function startBrief() {
    if (!scope) return
    onBrief({
      levelId: scope.level, scopeId: scope.scope, pages: scope.pages,
      dlId: scope.deadlineId, text,
      title: scope.title, discipline: scope.discipline, citation: scope.citation,
      requirements: scope.requirements,
    })
  }

  // Concierge "Adjust"/"Tweak in the scoper": load a scoped result into this
  // scoper, show it as a result, and scroll the intake into view.
  useEffect(() => {
    const load = (pre) => {
      if (!pre) return
      const computed = computeScope({
        discipline: pre.discipline, level: pre.level, scope: pre.scope,
        pages: pre.pages, citation: pre.citation,
        days: Number.isFinite(pre.days) ? pre.days : undefined,
        deadline: pre.deadlineId,
        requirements: pre.requirements,
      })
      setScope({ ...computed, title: pre.title || '' })
      setStage('result')
      requestAnimationFrame(() => {
        const el = taRef.current
        if (el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {} }
      })
    }
    window.MeridianScopeResult = load
    return () => { if (window.MeridianScopeResult === load) delete window.MeridianScopeResult }
  }, [])

  return (
    <section className="hero" id="top" aria-labelledby="hero-h">
      <div className="hero-glow" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div className="hero-left reveal">
          <div className="hero-eyebrow">Academic support for a new era</div>
          <h1 id="hero-h">
            <span className="it">Your research.</span><br />
            <span className="b">Your discipline.</span><br />
            <span className="ac">An expert who knows it.</span>
          </h1>
          <p className="hero-lede">
            We pair graduate, doctoral and advanced-professional students with vetted,
            degree-holding specialists in your exact field — structured coaching, expert
            editing and research design. Original work you understand and can defend.
          </p>
          <div className="hero-ctas">
            <button type="button" className="btn btn-ink btn-lg"
              aria-label="Scope my work" onClick={() => taRef.current?.focus()}>
              Scope my work {Ico.arrow()}
            </button>
            <button type="button" className="btn btn-ghost btn-lg"
              onClick={() => (window.MeridianOpenConcierge ? window.MeridianOpenConcierge() : window.open(`https://wa.me/${WA_NUM}`, '_blank'))}>
              {Ico.spark()} Ask the concierge
            </button>
          </div>
          <div className="hero-stats">
            <div className="hs">
              <div className="hs-top"><span className="hs-n">4.9</span><span className="hs-stars">{[0,1,2,3,4].map(i => <span key={i}>{Ico.star({ width: 12, height: 12 })}</span>)}</span></div>
              <div className="hs-l">Average student rating</div>
            </div>
            <div className="hs">
              <div className="hs-n ac">0%</div>
              <div className="hs-l">AI generated · guaranteed</div>
            </div>
            <div className="hs">
              <div className="hs-n">100%</div>
              <div className="hs-l">On-time pledge</div>
            </div>
          </div>
        </div>

        <div className="hero-visual reveal" style={{ transitionDelay: '.1s' }} id="intake">
          <div className="intake">
            <div className="intake-head">
              <span className="ih-ic" aria-hidden="true">{Ico.sparkF({ width: 16, height: 16 })}</span>
              <div className="ih-meta">
                <div className="ih-t">Scope my work</div>
                <div className="ih-s">Powered by Meridian AI</div>
              </div>
              {stage === 'result' && (
                <button type="button" className="ih-new" onClick={() => { setScope(null); setErr(''); setStage('input') }}>
                  {Ico.refresh()} New
                </button>
              )}
            </div>

            {stage === 'input' && (
              <div className="intake-body">
                <textarea ref={taRef} className="intake-ta" rows={5} value={text}
                  aria-label="Describe your assignment"
                  placeholder={placeholder}
                  onChange={e => { setText(e.target.value); setErr('') }} />
                <div className="intake-examples">
                  {INTAKE_EXAMPLES.map(ex => (
                    <button type="button" key={ex} className="ex-chip" onClick={() => { setText(ex); setErr('') }}>{ex}</button>
                  ))}
                </div>
                <div className="intake-actions">
                  <button type="button" className="intake-scope" onClick={() => scopeIt()}>
                    {Ico.sparkF({ width: 16, height: 16 })} Scope it
                  </button>
                  <button type="button" className="intake-upload" onClick={() => { setText(SAMPLE_RUBRIC); setErr(''); showToast("Sample rubric loaded — hit 'Scope it'") }}>
                    {Ico.upload({ width: 17, height: 17 })} Upload rubric
                  </button>
                </div>
                {err && <div className="intake-err" role="alert">{err}</div>}
              </div>
            )}

            {stage === 'busy' && (
              <div className="intake-body">
                <div className="intake-loading">
                  <span className="il-spin" aria-hidden="true" />
                  <span className="il-t">Reading your brief…</span>
                </div>
                <div className="intake-shimmer">
                  {['70%', '90%', '55%', '80%'].map((w, i) => <span key={i} style={{ width: w }} />)}
                </div>
              </div>
            )}

            {stage === 'result' && scope && (
              <div className="intake-body intake-result">
                <div className="ir-head">
                  <span className="ir-check" aria-hidden="true">{Ico.sealc({ width: 18, height: 18 })}</span>
                  Here's what we understood
                </div>
                <div className="ir-grid">
                  <Fact k="Discipline"><input className="ir-edit" value={scope.discipline} onChange={e => patch({ discipline: e.target.value })} /></Fact>
                  <Fact k="Level">
                    <select className="ir-edit" value={scope.level} onChange={e => patch({ level: e.target.value })}>
                      {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </Fact>
                  <Fact k="Scope">
                    <select className="ir-edit" value={scope.scope} onChange={e => patch({ scope: e.target.value })}>
                      {SCOPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </Fact>
                  <Fact k="Length">
                    <span className="ir-num"><input type="number" min="1" className="ir-edit" value={scope.pages}
                      onChange={e => patch({ pages: parseInt(e.target.value, 10) || 1 })} /><span>pages</span></span>
                  </Fact>
                  <Fact k="Citation">
                    <select className="ir-edit" value={scope.citation} onChange={e => patch({ citation: e.target.value })}>
                      {CITATIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Fact>
                  <Fact k="Deadline">
                    <select className="ir-edit" value={String(scope.days)} onChange={e => patch({ days: parseInt(e.target.value, 10) })}>
                      {(() => {
                        const base = [1, 3, 7, 14, 21, 30]
                        const vals = base.indexOf(scope.days) < 0 ? [scope.days, ...base].sort((a, b) => a - b) : base
                        const label = n => n === 1 ? '24 hours' : n >= 30 ? '1 month' : n >= 21 ? (Math.round(n / 7) + ' weeks') : n >= 14 ? '2 weeks' : (n + ' days')
                        return vals.map(n => <option key={n} value={String(n)}>{label(n)}</option>)
                      })()}
                    </select>
                  </Fact>
                </div>
                {scope.requirements.length > 0 && (
                  <div className="ir-reqs">
                    <div className="ir-reqs-h">Key requirements</div>
                    {scope.requirements.map((r, i) => (
                      <div className="ir-req" key={i}><span className="ir-req-ic">{Ico.check({ width: 14, height: 14 })}</span><span>{r}</span></div>
                    ))}
                  </div>
                )}
                <div className="ir-est">
                  <div>
                    <div className="ir-est-l">Estimate</div>
                    <div className="ir-est-amt">from {moneyExact(scope.estimate)}</div>
                    <div className="ir-est-pp">{moneyExact(scope.perPage)}/page · 50% deposit to start</div>
                  </div>
                  <button type="button" className="ir-start" onClick={startBrief}>Start this brief {Ico.arrow()}</button>
                </div>
                <div className="ir-foot">An expert confirms the final scope before you pay a cent.</div>
              </div>
            )}
          </div>
          <div className="intake-float" aria-hidden="true">
            <span className="dot" /><span>{liveCount} students scoping now</span>
          </div>
          {toast && <div className="intake-toast" role="status">{toast}</div>}
        </div>
      </div>

      <Marquee />
    </section>
  )
}

function Fact({ k, children }) {
  return (
    <div className="ir-fact">
      <div className="ir-fact-k">{k}</div>
      {children}
    </div>
  )
}

// ── DISCIPLINES MARQUEE ───────────────────────────────────────────────────────
function Marquee() {
  const items = [...DISCIPLINES, ...DISCIPLINES]
  return (
    <div className="marq" id="disciplines" aria-label="Disciplines covered">
      <div className="marq-track v2-marqfade">
        {items.map((d, i) => (
          <span className="marq-it" key={i}>{d}<span className="marq-dot" aria-hidden="true" /></span>
        ))}
      </div>
    </div>
  )
}

// ── A NEW STANDARD · COMPARISON ─────────────────────────────────────────────────
function Comparison() {
  return (
    <section className="sec cmp-sec" aria-labelledby="cmp-h">
      <div className="wrap">
        <div className="cmp-head reveal">
          <div className="kicker"><span className="bar" />A new standard</div>
          <h2 id="cmp-h">Anyone can generate sentences.<br /><span className="italic">We help you earn the degree.</span></h2>
          <p>The academic landscape has shifted. Schools use ultra-sensitive AI detectors, and advisors see straight through boilerplate. The era of anonymous essay mills is over — you need human expertise, peer-reviewed rigour and defensible logic.</p>
        </div>
        <div className="cmp-grid reveal" style={{ transitionDelay: '.08s' }}>
          <div className="cmp-card old">
            <div className="cmp-tag">
              <span className="cmp-eyebrow">The old way</span>
              <span className="cmp-pill risk">High risk</span>
            </div>
            <h3>Buy pages. Hope it passes.</h3>
            <div className="cmp-list">
              {OLD_WAY.map((x, i) => (
                <div className="cmp-row" key={i}><span className="cmp-mk x" aria-hidden="true">✕</span><span><b>{x.b}</b>{x.t}</span></div>
              ))}
            </div>
          </div>
          <div className="cmp-card new">
            <div className="cmp-tag">
              <span className="cmp-eyebrow">The Meridian way</span>
              <span className="cmp-pill ok">100% defensible</span>
            </div>
            <h3>Partner with an expert. Own the work.</h3>
            <div className="cmp-list">
              {NEW_WAY.map((x, i) => (
                <div className="cmp-row" key={i}><span className="cmp-mk ok" aria-hidden="true">✓</span><span><b>{x.b}</b>{x.t}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="cmp-stats reveal">
          {TRUST_STATS.map(s => (
            <div className="cmp-stat" key={s.l}><div className="n">{s.n}</div><div className="l">{s.l}</div></div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
function How() {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  function toggleSound() {
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted; setMuted(v.muted)
    if (v.paused) { try { v.play() } catch {} }
  }
  return (
    <section className="sec" id="how" aria-labelledby="how-h">
      <div className="wrap">
        <div className="how-head reveal">
          <div className="h-main">
            <div className="kicker"><span className="bar" />How it works</div>
            <h2 id="how-h">From rubric to ready — <span className="italic">one expert, all the way.</span></h2>
          </div>
          <p className="how-lede">No bidding wars, no rotating freelancers. The AI scopes it; a real specialist owns it from first draft to delivery.</p>
        </div>
        <div className="how-film reveal">
          <video ref={videoRef} src="/meridian/film.mp4" poster="/meridian/film-poster.png"
            autoPlay muted loop playsInline />
          <button type="button" className="how-film-overlay" onClick={toggleSound} aria-label={muted ? 'Tap for sound' : 'Mute'}>
            <span className="hf-play"><span className="hf-play-btn">{Ico.play()}</span>How Meridian works · 30s</span>
            <span className="hf-tag">{muted ? 'Tap for sound' : 'Sound on'}</span>
          </button>
        </div>
        <div className="how-grid">
          {HOW.map((s, i) => (
            <div className="how-card reveal v2-card" key={s.n} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="how-still"><img src={s.img} alt={s.alt} loading="lazy" /></div>
              <div className="how-body">
                <div className="how-top">
                  <span className="how-n">{s.n}</span>
                  <span className="how-ic" aria-hidden="true">{Ico[s.icon]({ width: 19, height: 19 })}</span>
                </div>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
                <span className="how-tag">{Ico.clock({ width: 12, height: 12 })} {s.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── TRANSPARENT ESTIMATOR ───────────────────────────────────────────────────────
function Estimator({ onBrief }) {
  const [levelId, setLevelId] = useState('dnp')
  const [scopeId, setScopeId] = useState('cap')
  const [pages, setPages] = useState(15)
  const [tlId, setTlId] = useState('standard')
  const level = useMemo(() => LEVELS.find(l => l.id === levelId), [levelId])
  const scope = useMemo(() => SCOPES.find(s => s.id === scopeId), [scopeId])
  const tl = useMemo(() => DEADLINES.find(d => d.id === tlId), [tlId])

  const useProjRate = scope.proj && level.proj != null
  const baseRate = useProjRate ? level.proj : level.rate
  const perPage = baseRate * tl.mult * (1 - scope.bundle / 100)
  const pg = Math.max(1, Math.min(100, pages))
  const total = perPage * pg

  function lock() {
    // map the slider/timeline to the brief prefill (estimator timeline ids match DEADLINES)
    onBrief({ levelId, scopeId, pages: pg, dlId: tlId })
  }

  const tlNotes = { relaxed: '10+ days · −8%', standard: '3–7 days · base', rush: '24–48 hrs · +35%' }

  return (
    <section className="estim" id="coverage" aria-labelledby="estim-h">
      <div className="estim-glow" aria-hidden="true" />
      <div className="wrap estim-grid">
        <div className="estim-left reveal">
          <div className="kicker on-ink"><span className="bar" />Transparent estimator</div>
          <h2 id="estim-h">No surprises.<br /><span className="italic">Locked rates only.</span></h2>
          <p>Set your parameters for an honest estimate. Your final quote is reviewed by our team and locked before any work begins.</p>
          <div className="estim-checks">
            {EST_CHECKS.map((c, i) => (
              <div className="estim-check" key={i}><span className="ec-ic">{Ico.check({ width: 16, height: 16 })}</span><span>{c}</span></div>
            ))}
          </div>
        </div>

        <div className="estim-panel reveal" style={{ transitionDelay: '.08s' }}>
          <div className="ep-lbl">A — Academic level</div>
          <div className="ep-levels">
            {LEVELS.map(l => (
              <button type="button" key={l.id} className={'ep-lvl' + (l.id === levelId ? ' on' : '')} onClick={() => setLevelId(l.id)}>
                <span className="ep-lvl-b">{l.badge}</span>
                <span className="ep-lvl-s">{l.sub}</span>
                <span className="ep-lvl-r">${l.rate}</span>
              </button>
            ))}
          </div>

          <div className="ep-lbl">B — Scope of support</div>
          <div className="ep-scopes">
            {SCOPES.map(s => (
              <button type="button" key={s.id} className={'ep-scope' + (s.id === scopeId ? ' on' : '')}
                onClick={() => { setScopeId(s.id); if (pages > s.hi || pages < s.lo) setPages(Math.min(100, s.def)) }}>
                {s.short}{s.bundle > 0 && <span className="ep-scope-note">−{s.bundle}%</span>}
              </button>
            ))}
          </div>

          <div className="ep-pages-h">
            <span className="ep-lbl flat">C — Estimated length</span>
            <span className="ep-pages-n">{pg} {pg === 1 ? 'page' : 'pages'}</span>
          </div>
          <input type="range" className="ep-range" min={1} max={100} value={pg}
            aria-label="Estimated page count" onChange={e => setPages(Number(e.target.value))} />
          <div className="ep-range-scale"><span>1 page (~275 words)</span><span>100 pages</span></div>

          <div className="ep-lbl">D — Timeline &amp; deadline</div>
          <div className="ep-times">
            {DEADLINES.map(d => (
              <button type="button" key={d.id} className={'ep-time' + (d.id === tlId ? ' on' : '')} onClick={() => setTlId(d.id)}>
                <span className="ep-time-n">{d.label}</span>
                <span className="ep-time-s">{tlNotes[d.id]}</span>
              </button>
            ))}
          </div>

          <div className="ep-quote" aria-live="polite">
            <div className="ep-quote-top">
              <div>
                <div className="eq-l">Estimated cost model</div>
                <div className="eq-sum">{level.name} · {scope.label}</div>
                <div className="eq-pp">{pg} {pg === 1 ? 'page' : 'pages'} · ${perPage.toFixed(2)}/page</div>
              </div>
              <div className="ep-quote-amt">
                <div className="eq-l">Estimated total</div>
                <div className="eq-total">{'$' + Math.round(total).toLocaleString('en-US')}</div>
              </div>
            </div>
            <button type="button" className="ep-lock" onClick={lock}>Lock estimate &amp; meet your scholar {Ico.arrow()}</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── VETTED EXPERTS · SELECTOR + PROFILE ─────────────────────────────────────────
function Experts({ onScope }) {
  const [key, setKey] = useState('nursing')
  const sp = useMemo(() => SPECIALTIES.find(s => s.key === key) || SPECIALTIES[0], [key])
  return (
    <section className="sec experts" id="experts" aria-labelledby="experts-h">
      <div className="wrap">
        <div className="experts-head reveal">
          <div className="kicker"><span className="bar" />Vetted academic experts</div>
          <h2 id="experts-h">Fewer than 1 in 9 applicants <span className="italic">match our bar.</span></h2>
          <p>We verify and audit academic credentials, citation-style mastery and subject expertise of every specialist. Choose a field to view a matched profile.</p>
        </div>
        <div className="experts-pick reveal" style={{ transitionDelay: '.08s' }}>
          <div className="exp-tabs" role="tablist" aria-label="Specialties">
            {SPECIALTIES.map(s => (
              <button type="button" key={s.key} role="tab" aria-selected={s.key === key}
                className={'exp-tab' + (s.key === key ? ' on' : '')} onClick={() => setKey(s.key)}>
                <span>{s.label}</span>{Ico.chev({ width: 16, height: 16 })}
              </button>
            ))}
          </div>
          <div className="exp-profile">
            <div className="exp-profile-lbl">Expert profile · matches your brief</div>
            <div className="exp-profile-top">
              <span className="exp-av" style={{ background: sp.avBg }}>{sp.initials}</span>
              <div className="exp-id">
                <div className="exp-name">{sp.name}</div>
                <div className="exp-degree">{sp.degree}</div>
              </div>
              <div className="exp-metrics">
                <div><div className="exp-m-n">{sp.rating}{Ico.star({ width: 13, height: 13 })}</div><div className="exp-m-l">Rating</div></div>
                <div><div className="exp-m-n">{sp.briefs}</div><div className="exp-m-l">Briefs</div></div>
              </div>
            </div>
            <div className="exp-rule" />
            <div className="exp-sub-lbl">Credentials &amp; background</div>
            <p className="exp-bg">{sp.bg}</p>
            <div className="exp-meta-grid">
              <div><div className="exp-sub-lbl">Verified institution</div><div className="exp-meta-v">{sp.institution}</div></div>
              <div><div className="exp-sub-lbl">Formatting proficiency</div><div className="exp-meta-v">{sp.format}</div></div>
            </div>
            <div className="exp-rule" />
            <div className="exp-cta-row">
              <span className="exp-cta-txt">Ready to match with this expert for your capstone, editing or dissertation brief?</span>
              <button type="button" className="btn btn-ink" onClick={() => onScope()}>Match with expert {Ico.arrow()}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── GUARANTEES · PLEDGE ──────────────────────────────────────────────────────────
function Guarantees() {
  return (
    <section className="guards" id="assurance" aria-labelledby="guards-h">
      <div className="guards-glow" aria-hidden="true" />
      <div className="wrap">
        <div className="guards-head reveal">
          <div className="kicker on-ink"><span className="bar" />Our pledge</div>
          <h2 id="guards-h">We don't just promise.<br /><span className="italic">We guarantee.</span></h2>
          <p>Why do students stay with Meridian across an entire program? Because we back every brief with complete certainty — not just good intentions.</p>
        </div>
        <div className="guards-grid">
          {GUARDS.map((g, i) => (
            <div className="guard-card reveal" key={g.t} style={{ transitionDelay: `${i * 0.06}s` }}>
              <span className="guard-ic" aria-hidden="true">{Ico[g.ic]({ width: 21, height: 21 })}</span>
              <h3>{g.t}</h3>
              <p>{g.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── TESTIMONIALS ──────────────────────────────────────────────────────────────
function Testimonials() {
  return (
    <section className="sec" id="stories" aria-labelledby="testi-h">
      <div className="wrap">
        <div className="testi-head reveal">
          <div className="kicker"><span className="bar" />What students say</div>
          <h2 id="testi-h">Trusted at the <span className="italic">hardest moments.</span></h2>
        </div>
        <div className="testi-grid">
          {TESTI.map((t, i) => (
            <figure className="testi reveal v2-card" key={t.nm} style={{ transitionDelay: `${i * 0.07}s` }}>
              <div className="stars" aria-label="5 out of 5">
                {[0,1,2,3,4].map(s => <span key={s}>{Ico.star()}</span>)}
              </div>
              <blockquote>“{t.q}”</blockquote>
              <figcaption className="who">
                <span className="av" aria-hidden="true" style={{ background: t.avBg }}>{t.av}</span>
                <span>
                  <span className="nm">{t.nm}</span>
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

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqSection() {
  // one open at a time (prototype behavior)
  const [open, setOpen] = useState(0)
  return (
    <section className="faq-sec" id="faq" aria-labelledby="faq-h">
      <div className="wrap narrow">
        <div className="faq-head reveal">
          <div className="kicker"><span className="bar" />Questions</div>
          <h2 id="faq-h">Good to know.</h2>
        </div>
        <div className="faq-list reveal" style={{ transitionDelay: '.06s' }}>
          {FAQ.map((f, i) => {
            const isOpen = open === i
            return (
              <div className={'faq-item' + (isOpen ? ' open' : '')} key={i}>
                <button type="button" className="faq-q" aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                  <span>{f.q}</span>
                  <span className="faq-ico" aria-hidden="true">{isOpen ? Ico.check({ width: 16, height: 16 }) : Ico.arrow({ width: 16, height: 16 })}</span>
                </button>
                {isOpen && <div className="faq-a" id={`faq-a-${i}`}>{f.a}</div>}
              </div>
            )
          })}
        </div>
        <div className="faq-foot">
          Still wondering? <button type="button" className="faq-link" onClick={() => (window.MeridianOpenConcierge ? window.MeridianOpenConcierge() : window.open(`https://wa.me/${WA_NUM}`, '_blank'))}>Ask the concierge →</button>
        </div>
      </div>
    </section>
  )
}

// ── WRITERS / APPLY ─────────────────────────────────────────────────────────────
function Apply() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
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
    if (!name.trim()) { setErr('Please add your full name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr('Please add a valid email — it’s how we send your account details if you’re approved.'); return }
    if (!phone.trim()) { setErr('Please add your WhatsApp number.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.from('writer_applications').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
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
          <div className="kicker on-ink"><span className="bar" />For writers</div>
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
              <p>Thank you. We'll review your background and reach out by email or WhatsApp within 48 hours. If you're approved, your expert account details arrive by email.</p>
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
              <div className="field">
                <label htmlFor="ap-email">Email *</label>
                <input id="ap-email" type="email" autoComplete="email" placeholder="you@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} aria-required="true" />
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
function Final({ onScope }) {
  return (
    <section className="final" aria-labelledby="final-h">
      <div className="wrap">
        <div className="final-card reveal">
          <div className="final-glow" aria-hidden="true" />
          <div className="final-inner">
            <h2 id="final-h">Your deadline's coming. <span className="italic">Scope it in seconds.</span></h2>
            <p>Paste your assignment and get an instant, expert-grade plan and price — or ask our concierge anything.</p>
            <div className="final-ctas">
              <button type="button" className="btn btn-accent btn-lg" aria-label="Scope my work" onClick={() => onScope()}>
                Scope my work {Ico.arrow()}
              </button>
              <button type="button" className="btn btn-ghost-ink btn-lg"
                onClick={() => (window.MeridianOpenConcierge ? window.MeridianOpenConcierge() : window.open(`https://wa.me/${WA_NUM}`, '_blank'))}>
                {Ico.sparkF()} Ask Meridian
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="wrap foot-top">
        <div className="foot-brand">
          <div className="foot-mk">
            <span className="mk" aria-hidden="true">M</span>
            <span className="nm">Meridian Studio</span>
          </div>
          <p>AI-guided intake, advanced-degree experts, integrity built in — academic support you can defend.</p>
        </div>
        {FOOT_COLS.map(col => (
          <div className="foot-col" key={col.head}>
            <h4>{col.head}</h4>
            <ul>
              {col.links.map(([h, l]) => (
                <li key={l}>
                  {h
                    ? <a href={h}>{l}</a>
                    : <button type="button" className="foot-brief-link" onClick={openConcierge}>{l}</button>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="wrap foot-bot">
        <span className="cp">© 2026 Meridian Studio · independent academic support, not affiliated with any institution.</span>
        <span className="foot-tagline">Built for students who care about doing it right.</span>
        <a href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noreferrer" className="wa-btn">
          {Ico.wa()}<span>Chat on WhatsApp</span>
        </a>
      </div>
    </footer>
  )
}

// ── BRIEF FLOW MODAL ──────────────────────────────────────────────────────────
export function BriefFlow({ open, onClose, prefill }) {
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [account, setAccount] = useState(null)    // signed-in client → skip name/email
  const [variant, setVariant] = useState(null)    // 'temp' | 'existed' | 'account' — success shape
  const [temp, setTemp] = useState(null)          // { email, password } for new-guest temp sign-in
  const [copied, setCopied] = useState('')        // 'email' | 'pass' — momentary copy feedback

  const [f, setF] = useState({
    title: '', discipline: 'Nursing & Health Sciences', level: 'ms', scope: 'one',
    pages: 0, citation: 'APA 7', deadline: 'standard', requirements: '',
    name: '', email: '', notes: '',
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (prefill) {
      setF(p => ({
        ...p,
        level: prefill.levelId || p.level,
        scope: prefill.scopeId || p.scope,
        pages: prefill.pages || p.pages,
        deadline: prefill.dlId || p.deadline,
        title: prefill.title || p.title,
        discipline: prefill.discipline || p.discipline,
        citation: prefill.citation || p.citation,
        requirements: Array.isArray(prefill.requirements) ? prefill.requirements.join('\n') : (prefill.requirements || p.requirements),
        // The original request / scope text rides along into the order notes.
        notes: prefill.text ? String(prefill.text) : p.notes,
      }))
    }
    setSent(false); setErr(''); setSubmitting(false)
    setVariant(null); setTemp(null); setCopied('')
    // Detect whether the visitor is already a registered, signed-in client.
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          let nm = session.user.user_metadata?.name || ''
          try {
            const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', session.user.id).single()
            if (prof?.name) nm = prof.name
          } catch {}
          setAccount({ id: session.user.id, email: session.user.email, name: nm })
        } else {
          setAccount(null)
        }
      } catch { setAccount(null) }
    })()
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

  // Did we arrive with a real scope (from the hero AI-intake or guided estimator)?
  const hasScope = (f.pages > 0) || !!(prefill && (prefill.levelId || prefill.pages || prefill.title))
  const scopeLine = f.title || `${level.name} · ${scope.label}${f.pages > 0 ? ` · ${f.pages} pages` : ''}`

  // Progressive contact capture: email reveals once a non-empty name is present.
  const nameOk  = f.name.trim().length > 0
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())
  const canSubmit = account ? true : (nameOk && emailOk)

  async function copy(which, value) {
    try { await navigator.clipboard.writeText(value) } catch {}
    setCopied(which)
    setTimeout(() => setCopied(c => (c === which ? '' : c)), 1600)
  }

  async function submitBrief(e) {
    if (e) e.preventDefault()
    if (!account) {
      if (!nameOk) { setErr('Please add your name.'); return }
      if (!emailOk) { setErr('Please add a valid email — it’s how we set up your workspace.'); return }
    }
    setErr(''); setSubmitting(true)
    const email = (account ? account.email : f.email).trim().toLowerCase()
    const submitterName = (account ? (account.name || '') : f.name).trim()
    const estimate = f.pages > 0 ? Math.round(total / 10) * 10 : null
    const requestText = (f.notes || '').trim()
    const base = {
      title: f.title || null,
      discipline: f.discipline,
      level: f.level,
      scope: f.scope,
      pages: f.pages,
      citation: f.citation,
      deadline: f.deadline,
      requirements: f.requirements || null,
      estimate_usd: estimate,
      name: submitterName || null,
      notes: requestText || null,
    }
    // 1) Record the brief — fires the admin alert + client confirmation emails.
    let { error } = await supabase.from('briefs').insert({ ...base, email: email || null })
    if (error && (error.code === '42703' || error.code === 'PGRST204' || /email/i.test(error.message || ''))) {
      const notes = [base.notes, 'Email: ' + email].filter(Boolean).join('\n')
      ;({ error } = await supabase.from('briefs').insert({ ...base, notes }))
    }
    // 2) Create a trackable order so the client sees it in their workspace.
    let createdRef = null
    try {
      const { data: refData } = await supabase.rpc('generate_order_ref')
      const ref = refData || ('MS-' + Date.now().toString().slice(-5))
      createdRef = ref
      const { data: { session } } = await supabase.auth.getSession()
      const orderRow = {
        ref,
        level: level.id,
        level_label: level.name,
        program: f.discipline,
        title: f.title || null,
        discipline: f.discipline || null,
        pages: f.pages ? Number(f.pages) : null,
        citation: f.citation || null,
        requirements: f.requirements || null,
        scope_id: scope.id,
        scope_label: scope.label,
        has_project: !!scope.proj,
        is_bundle: scope.bundle > 0,
        rate_writing: rate,
        rate_project: (scope.proj && level.proj != null) ? level.proj : null,
        estimate_usd: estimate,
        due_date: null,
        notes: [
          f.title && ('Title: ' + f.title),
          f.requirements && ('Requirements: ' + f.requirements),
          requestText && ('Request:\n' + requestText.slice(0, 4000)),
        ].filter(Boolean).join('\n\n') || null,
        client_name: submitterName || null,
        client_email: email || null,
        status: 'new',
        payment_status: 'unpaid',
        client_id: session?.user?.id || null,
      }
      let { error: oErr } = await supabase.from('orders').insert(orderRow)
      if (oErr && (oErr.code === '42703' || /estimate_usd|column/i.test(oErr.message || ''))) {
        // schema lag — drop any newer optional columns and retry with the safe core
        const { estimate_usd, title, discipline, pages, citation, requirements, ...minimal } = orderRow
        await supabase.from('orders').insert(minimal)
      }
    } catch (oe) { console.error('order create failed', oe) }

    // 3) Provision the workspace login.
    if (account) {
      // Signed-in client: the order is already attached to their account.
      setVariant('account')
    } else if (createdRef) {
      // New guest: ask ensure-client-auth to create the account with a SYSTEM-
      // generated temp password (we send NO password) and return it for first
      // sign-in. An existing email comes back created:false (never a password).
      try {
        const { data: prov } = await supabase.functions.invoke('ensure-client-auth', {
          body: { email, ref: createdRef, name: submitterName },
        })
        if (prov?.created && prov?.tempPassword) {
          setTemp({ email, password: prov.tempPassword })
          setVariant('temp')
        } else if (prov?.created) {
          // Account made but no password returned (shouldn't happen) — point to sign-in.
          setVariant('existed')
        } else {
          setVariant('existed')   // email already registered — sign in with usual password
        }
      } catch (se) {
        setVariant('existed')     // best-effort — never blocks the confirmation screen
      }
    }

    setSubmitting(false)
    if (error) { setErr('Submission failed — please try again.'); console.error(error) }
    else setSent(true)
  }

  // "Open my workspace →": for a fresh temp account, sign in with the generated
  // password, claim the order, then land in the workspace; otherwise just navigate.
  async function openWorkspace(e) {
    if (variant === 'temp' && temp) {
      if (e) e.preventDefault()
      try {
        const { error: siErr } = await supabase.auth.signInWithPassword({ email: temp.email, password: temp.password })
        if (!siErr) { try { await supabase.rpc('claim_my_orders') } catch {} }
      } catch {}
      window.location.href = '/workspace'
    }
    // For 'account' the href="/workspace" handles navigation natively.
  }

  if (!open) return null

  const firstName = (account?.name || f.name).trim().split(/\s+/)[0]
  const briefTitle = sent ? 'All set' : 'Start your brief'
  const briefSub = sent
    ? 'Your expert takes it from here.'
    : 'Confirm where to reach you — an expert takes it from here.'

  return (
    <div className="bf-overlay" role="dialog" aria-modal="true" aria-label="Start your brief"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bf-panel bf-lean">
        <div className="bf-lhead">
          <div>
            <div className="bf-ltitle">{briefTitle}</div>
            <div className="bf-lsub">{briefSub}</div>
          </div>
          <button type="button" className="bf-x" aria-label="Close" onClick={onClose}>{Ico.x({ width: 18, height: 18 })}</button>
        </div>

        {/* ── SUCCESS STATE ── */}
        {sent ? (
          <div className="bf-lbody bf-lsuccess">
            <span className="bf-lcheck" aria-hidden="true">{Ico.check({ width: 28, height: 28 })}</span>
            <div className="bf-lwin">You're in{firstName ? `, ${firstName}` : ''}.</div>

            {variant === 'account' ? (
              <p className="bf-ltext">This order's been added to your workspace — sign in any time to track it, message your expert, and pay your deposit.</p>
            ) : variant === 'existed' ? (
              <p className="bf-ltext">You already have an account with <b>{f.email}</b> — sign in at <b>primemeridian.academy/workspace</b> with your usual password to track this order.</p>
            ) : (
              <p className="bf-ltext">Your workspace is ready — sign in to track it, message your expert, and pay your deposit.</p>
            )}

            {variant === 'temp' && temp && (
              <div className="bf-tempbox">
                <div className="bf-templabel">Your temporary sign-in</div>
                <div className="bf-temprow">
                  <span className="bf-tempk">Email</span>
                  <span className="bf-tempv">{temp.email}</span>
                  <button type="button" className="bf-copy" aria-label="Copy email" onClick={() => copy('email', temp.email)}>
                    {copied === 'email' ? Ico.check({ width: 14, height: 14 }) : Ico.copy()}
                  </button>
                </div>
                <div className="bf-temprow bf-temprow-b">
                  <span className="bf-tempk">Password</span>
                  <span className="bf-tempv bf-tempv-pw">{temp.password}</span>
                  <button type="button" className="bf-copy" aria-label="Copy password" onClick={() => copy('pass', temp.password)}>
                    {copied === 'pass' ? Ico.check({ width: 14, height: 14 }) : Ico.copy()}
                  </button>
                </div>
                <div className="bf-tempnote">You'll set your own password on first sign-in. Keep this safe.</div>
              </div>
            )}

            <a className="btn btn-accent btn-lg bf-lprimary" href="/workspace" onClick={openWorkspace}>
              <span>Open my workspace</span>{Ico.arrow()}
            </a>
            <button type="button" className="bf-lghost" onClick={onClose}>Maybe later</button>
          </div>
        ) : (
          /* ── FORM STATE ── */
          <form className="bf-lbody bf-lform" onSubmit={submitBrief}>
            {hasScope && (
              <div className="bf-scopebar">
                <span className="bf-scopeck" aria-hidden="true">{Ico.check({ width: 14, height: 14 })}</span>
                <div className="bf-scopetext">
                  <div className="bf-scopeline">{scopeLine}</div>
                  <div className="bf-scopesub">50% deposit to start · balance on delivery</div>
                </div>
                <div className="bf-scopeest">{f.pages > 0 ? `from ${money(total)}` : 'On review'}</div>
              </div>
            )}

            {account ? (
              <div className="bf-note bf-lnote">
                {Ico.check({ width: 16, height: 16 })}
                <span>Signed in as <b>{account.name || account.email}</b>. We'll add this order to your workspace — no need to re-enter your details.</span>
              </div>
            ) : (
              <>
                <label className="bf-lfield">
                  <span>Your name</span>
                  <input type="text" value={f.name} placeholder="First name is fine"
                    autoComplete="given-name" autoFocus onChange={e => set('name', e.target.value)} />
                </label>
                <div className={'bf-reveal' + (nameOk ? ' on' : '')}>
                  <label className="bf-lfield">
                    <span>Your email</span>
                    <input type="email" value={f.email} placeholder="you@email.com"
                      autoComplete="email" onChange={e => set('email', e.target.value)} />
                  </label>
                </div>
              </>
            )}

            {err && <div className="bf-err" role="alert">{err}</div>}

            <button type="submit" className="btn btn-accent btn-lg bf-lprimary"
              disabled={submitting || !canSubmit}
              style={(submitting || !canSubmit) ? { opacity: .5, cursor: 'default' } : undefined}>
              {submitting ? 'Matching…' : <><span>Match me with an expert</span>{Ico.arrow()}</>}
            </button>

            <div className="bf-confidential">{Ico.lock()} Confidential — no card needed to start.</div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [briefOpen, setBriefOpen] = useState(false)
  const [briefPrefill, setBriefPrefill] = useState(null)
  const intakeFocusRef = useRef(null)
  useReveal()
  useEffect(() => { document.title = 'Expert Academic Support & Tutoring | Meridian Studio' }, [])

  function openBrief(prefill) {
    setBriefPrefill(prefill || null)
    setBriefOpen(true)
  }

  // "Scope my work" CTAs focus the hero AI-intake console.
  function scopeMyWork() {
    if (intakeFocusRef.current) intakeFocusRef.current()
  }

  // Expose a stable global so the Concierge widget can open the brief modal
  // pre-seeded from an AI-parsed rubric or guided estimate.
  useEffect(() => {
    window.MeridianOpenBrief = openBrief
    return () => { if (window.MeridianOpenBrief === openBrief) delete window.MeridianOpenBrief }
  }, [])

  // Open the brief directly when arrived via /#brief.
  useEffect(() => {
    function checkHash() {
      if (window.location.hash === '#brief') {
        openBrief()
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  return (
    <div className="ms">
      <a href="#main" className="skip">Skip to content</a>
      <div className="ribbon">
        <span className="ribbon-ic" aria-hidden="true">{Ico.sealc({ width: 13, height: 13 })}</span>
        <span>Academic integrity guarantee — every brief screened for originality &amp; 0% AI generation</span>
      </div>
      <Nav onBrief={openBrief} onScope={scopeMyWork} />
      <main id="main">
        <Hero onBrief={openBrief} intakeRef={intakeFocusRef} />
        <Comparison />
        <How />
        <Estimator onBrief={openBrief} />
        <Experts onScope={scopeMyWork} />
        <Guarantees />
        <Testimonials />
        <FaqSection />
        <Apply />
        <Final onScope={scopeMyWork} />
      </main>
      <Footer />
      <BriefFlow open={briefOpen} onClose={() => setBriefOpen(false)} prefill={briefPrefill} />
      <Concierge />
    </div>
  )
}
