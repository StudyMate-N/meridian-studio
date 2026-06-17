/* Concierge.jsx — Meridian "Ask Meridian" Concierge.
   A 1:1 React transcription of the v3 design's concierge: the design's exact DOM
   structure, inline styles, class names (v2-cc*), keyframes, data arrays, copy and
   interaction logic — with the real backend grafted on in place of the prototype's
   stubs:
     • AI transport  → POST to the `concierge` Supabase Edge Function (callAI)
     • Router        → ROUTER_SYSTEM + langSystem, applyRoute → matching card
     • Order lookup  → supabase orders table (auth-gated, demo fallback)
     • Escalation    → inserts support_conversations + support_messages
     • Window hooks  → MeridianOpenConcierge / __merConcierge / MeridianOpenBrief / MeridianScopeResult
     • Persistence   → localStorage key meridian:concierge:v4 (fresh seed for everyone)
   Render <Concierge /> once near the app root. */
import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase.js'
import { MM } from './workspace/kit/model.js'
import './concierge.css'

/* ── rate model (LEVELS/SCOPES/TIERS — ported verbatim from the design) ── */
const LEVELS = {
  ug:  { name: 'Undergraduate',       rate: 14, proj: null },
  ms:  { name: "Master's",            rate: 19, proj: null },
  adv: { name: 'Advanced / Pro',      rate: 23, proj: 26 },
  dnp: { name: 'Doctoral · Practice', rate: 27, proj: 31 },
  phd: { name: 'Doctoral · Research', rate: 30, proj: 36 },
}
const SCOPES = {
  one:    { name: 'One assignment',    def: 5,   proj: false },
  course: { name: 'A full course',     def: 28,  proj: false },
  term:   { name: 'A full term',       def: 60,  proj: false },
  cap:    { name: 'Capstone / thesis', def: 80,  proj: true },
  diss:   { name: 'Dissertation',      def: 180, proj: true },
  prog:   { name: 'Whole program',     def: 180, proj: false },
}
const TIERS = [
  { tag: 'UG',  name: 'Undergraduate',       sub: "Associate · Bachelor's",      rate: '$14', proj: 0 },
  { tag: 'MS',  name: "Master's",            sub: 'MA · MS · MBA · MSN',          rate: '$19', proj: 0 },
  { tag: 'ADV', name: 'Advanced / Pro',      sub: 'NP · JD · PsyD · Specialist',  rate: '$23', proj: '$26' },
  { tag: 'DOC', name: 'Doctoral · Practice', sub: 'DNP · EdD · Capstone',         rate: '$27', proj: '$31' },
  { tag: 'PHD', name: 'Doctoral · Research',  sub: 'PhD · Dissertation',           rate: '$30', proj: '$36' },
]
const SAMPLE = 'NURS 8302 — DNP Capstone Proposal (Walden University). Develop a 12–15 page evidence-based practice proposal for a behavioral-health clinical problem. Include a problem statement, PICOT question, literature synthesis (minimum 10 peer-reviewed sources from the last 5 years), proposed intervention and evaluation plan. APA 7th edition, level-1 and level-2 headings. Due in 6 days. Submit via Turnitin, similarity under 15%.'
const EXPERTS = [
  { initials: 'AM', name: 'Dr. A. Mensah', degree: 'PhD', rating: '4.9', field: 'Psychiatric Nursing', avBg: 'var(--accent)', blurb: 'Twelve years in graduate nursing and evidence-based practice. APA 7 and systematic-review specialist.' },
  { initials: 'LC', name: 'Dr. L. Chachoute', degree: 'PhD', rating: '4.8', field: 'Public Health', avBg: '#0F7E84', blurb: 'Epidemiology researcher and academic editor. Precise, deadline-reliable, meticulous with rubrics.' },
  { initials: 'JR', name: 'Prof. J. Reed', degree: 'DBA', rating: '4.9', field: 'Business & Strategy', avBg: '#3C6699', blurb: 'Former b-school faculty. Turns vague prompts into defensible, well-argued analysis.' },
]

/* ── multilingual chrome (LANGS — ported verbatim) ── */
const CC_WELCOME = "Hi — I’m the Meridian Concierge. I can scope an assignment for an instant price, check on an order, introduce the expert who’d fit you, or connect you with a real person. What do you need?"
const CAP_ICON = { scope: 'sparkF', order: 'search', experts: 'users', pricing: 'wallet', human: 'phone' }
const LANG_ORDER = ['en', 'fr', 'sw']
const LANG_NAME = { en: 'English', fr: 'French', sw: 'Swahili' }
const LANGS = {
  en: { name: 'EN', status: 'Online · replies in seconds', typing: 'Typing…', input: 'Ask anything, or paste your rubric…', film: 'How Meridian works · 0:30',
    welcome: CC_WELCOME,
    caps: [ { id: 'scope', label: 'Scope an assignment', sub: 'Instant price in seconds' }, { id: 'order', label: 'Check on an order', sub: 'Live status & deadline' }, { id: 'experts', label: 'Meet the experts', sub: 'See who’d fit your work' }, { id: 'pricing', label: 'Pricing & deadlines', sub: 'From $14/page' }, { id: 'human', label: 'Talk to a person', sub: 'A real human, fast' } ],
    sugg: [ { label: 'Scope my work', value: 'cap:scope' }, { label: 'Is this allowed?', value: 'Is using Meridian allowed at my school?' }, { label: 'Check my order', value: 'cap:order' } ] },
  fr: { name: 'FR', status: 'En ligne · réponse en quelques secondes', typing: 'Saisie…', input: 'Posez une question ou collez votre consigne…', film: 'Le fonctionnement de Meridian · 0:30',
    welcome: 'Bonjour — je suis le concierge Meridian. Je peux cadrer un devoir pour un prix instantané, suivre une commande, vous présenter l’expert qui vous convient, ou vous mettre en relation avec une vraie personne. Que puis-je faire ?',
    caps: [ { id: 'scope', label: 'Cadrer un devoir', sub: 'Prix instantané' }, { id: 'order', label: 'Suivre une commande', sub: 'Statut en direct' }, { id: 'experts', label: 'Voir les experts', sub: 'Qui vous convient' }, { id: 'pricing', label: 'Tarifs & délais', sub: 'Dès 14 $/page' }, { id: 'human', label: 'Parler à une personne', sub: 'Un humain, rapidement' } ],
    sugg: [ { label: 'Cadrer mon devoir', value: 'cap:scope' }, { label: 'Est-ce autorisé ?', value: 'Est-ce autorisé dans mon école ?' }, { label: 'Suivre ma commande', value: 'cap:order' } ] },
  sw: { name: 'SW', status: 'Mtandaoni · hujibu kwa sekunde', typing: 'Anaandika…', input: 'Uliza chochote, au bandika maelekezo yako…', film: 'Jinsi Meridian inavyofanya kazi · 0:30',
    welcome: 'Habari — mimi ni Meridian Concierge. Naweza kukadiria kazi yako kwa bei ya papo hapo, kuangalia oda yako, kukutambulisha kwa mtaalam anayekufaa, au kukuunganisha na mtu halisi. Nikusaidie vipi?',
    caps: [ { id: 'scope', label: 'Kadiria kazi', sub: 'Bei ya papo hapo' }, { id: 'order', label: 'Angalia oda', sub: 'Hali ya moja kwa moja' }, { id: 'experts', label: 'Kutana na wataalam', sub: 'Anayekufaa' }, { id: 'pricing', label: 'Bei & makataa', sub: 'Kuanzia $14/ukurasa' }, { id: 'human', label: 'Ongea na mtu', sub: 'Mtu halisi, haraka' } ],
    sugg: [ { label: 'Kadiria kazi yangu', value: 'cap:scope' }, { label: 'Inaruhusiwa?', value: 'Je, Meridian inaruhusiwa shuleni?' }, { label: 'Angalia oda yangu', value: 'cap:order' } ] },
}

/* offline fallback so order-lookup works before auth / data resolves */
const DEMO_ORDERS = [
  { ref: 'MS-3038', title: 'Evidence-Based Care Plan Analysis', level_label: 'Graduate', pages: 6, citation: 'APA 7', status: 'writing', due_date: '2026-06-18', quote_total: 340, writer_name: 'Dr. Lena Chachoute' },
  { ref: 'MS-3041', title: 'Comparative Analysis of Keynesian and Monetarist Policy', level_label: "Master's", pages: 8, citation: 'Harvard', status: 'revision', due_date: '2026-06-17', quote_total: 232, writer_name: 'Dr. Lena Chachoute' },
  { ref: 'MS-3052', title: 'Systematic Review: Telehealth Adoption in Rural Primary Care', level_label: 'Doctoral', pages: 12, citation: 'APA 7', status: 'in_review', due_date: '2026-06-20', quote_total: 560, writer_name: 'Dr. Lena Chachoute' },
]

/* ── router system prompt (ported verbatim) ── */
const CC_ROUTER = 'You are the routing brain of the Meridian Concierge for Meridian Studio, a legitimate academic SUPPORT service (coaching, editing, research help, model work) from undergraduate to PhD across 40+ disciplines. Decide how to handle the student’s LATEST message and return ONLY minified JSON, no prose, with keys: '
  + '"reply" (string: a warm, helpful response under 45 words, plain text, no markdown), '
  + '"action" (one of "scope","order","experts","pricing","film","human","none"), '
  + '"brief" (string or null: if action is "scope", the assignment description to price — use and lightly expand the student’s own words), '
  + '"ref" (string or null: an order id like "MS-3041" if they mention one), '
  + '"suggestions" (array of up to 3 very short follow-up chips, max ~24 chars each). '
  + 'Routing: use "scope" when they describe an assignment or ask what it costs with enough detail; "pricing" for general price questions with no assignment; "order" when they ask about an existing order or give an MS-#### ref; "experts" to see who would work on it; "film" when they ask how it works / the process / for a walkthrough; "human" when they want a person/agent/WhatsApp/email; otherwise "none". '
  + 'PRICING RULE: never state large totals — only say support starts from $14/page or a single per-page rate; exact totals come from a scope or brief. Default citation APA 7; 50% deposit to start, balance on delivery; same expert throughout; delivered before deadline; unlimited revisions; originality + AI screened; confidential. It is legitimate help students learn from and can defend, like a writing center or tutor. Never promise grades. If sensitive or off-topic, set action "human" and gently redirect.'

const langSystem = code => {
  if (code === 'en') return CC_ROUTER
  return CC_ROUTER + 'IMPORTANT: write the "reply" field and all "suggestions" in ' + (LANG_NAME[code] || 'English') + '.'
}

/* ── real AI transport — POST to the concierge Edge Function ── */
const WA = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'
const FN_URL = (import.meta.env.VITE_SUPABASE_URL || '') + '/functions/v1/concierge'
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
async function callAI(prompt, system) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ prompt, system }),
  })
  if (!res.ok) throw new Error('ai_http_' + res.status)
  const data = await res.json()
  const text = (data && data.text || '').trim()
  if (!text) throw new Error('ai_empty')
  return text
}

const money = n => '$' + Math.round(n).toLocaleString('en-US')

/* ── icon set (ported verbatim from the design's I()) ── */
const PATHS = {
  arrow: 'M5 12h14M13 6l6 6-6 6', check: 'M5 12.5l4.5 4.5L19 7', x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16', star: 'M12 3l2.6 5.5L20 9.3l-4 4 1 6-5-2.8L7 19.3l1-6-4-4 5.4-.8z',
  user: 'M5 20a7 7 0 0 1 14 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', shield: 'M12 3l7 2.6v5.4c0 4.2-3 7.2-7 9-4-1.8-7-4.8-7-9V5.6z',
  clock: 'M12 7v5l3.5 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  spark: 'M12 3v3M12 18v3M5 12H2M22 12h-3M6.3 6.3 4.5 4.5M19.5 19.5l-1.8-1.8M6.3 17.7 4.5 19.5M19.5 4.5l-1.8 1.8', sparkF: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14', send: 'M22 3L11 14M22 3l-7 19-4-8-8-4z', refresh: 'M20 11a8 8 0 0 0-14-4M4 5v3h3M4 13a8 8 0 0 0 14 4M20 19v-3h-3',
  chat: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-3.3-.5L3 21l1.3-4a8 8 0 0 1-1-4A8.4 8.4 0 0 1 12 4a8.4 8.4 0 0 1 9 7.5z', sealc: 'M9 12l2 2 4-4M12 3l7 2.6v5.4c0 4.2-3 7.2-7 9-4-1.8-7-4.8-7-9V5.6z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35', users: 'M16 20a5 5 0 0 0-10 0M11 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17.5 12a3 3 0 0 0 0-6M20.5 20a4.5 4.5 0 0 0-3-4.2',
  wallet: 'M3 8h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3zM3 8V6h13M16.5 13h.01', phone: 'M6 3h3l2 5-2 1a9 9 0 0 0 4 4l1-2 5 2v3a2 2 0 0 1-2 2A14 14 0 0 1 4 5a2 2 0 0 1 2-2z',
  chev: 'M9 6l6 6-6 6', plus: 'M12 5v14M5 12h14', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3c2.4 2.6 3.6 5.7 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.7-3.6-9s1.2-6.4 3.6-9z', expand: 'M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5', compress: 'M9 4v5H4M15 20v-5h5M20 9h-5V4M4 15h5v5', clip: 'M21 11l-8.5 8.5a4 4 0 0 1-6-6L14 5a2.5 2.5 0 0 1 3.6 3.6L9 17a1 1 0 0 1-1.4-1.4l7.8-7.8',
  play: 'M8 5v14l11-7z', wa: 'M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5z',
}
function I(name, size = 18, color = 'currentColor', stroke = 1.8) {
  const fill = (name === 'star' || name === 'sparkF' || name === 'play' || name === 'wa')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={fill ? 'none' : color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: '0 0 auto' }}>
      <path d={PATHS[name]} />
    </svg>
  )
}

/* short "Dr. X Last" → "X. Last" for order card expert row */
const shortName = n => { const p = String(n || '').replace(/^(Dr|Prof)\.?\s+/i, '').split(/\s+/); return p.length ? (p[0][0] + '. ' + p[p.length - 1]) : '' }

/* status info — palette-local colors (ported verbatim from the design) */
function statusInfo(status) {
  const map = {
    new:            { l: 'Under review',    pct: 12,  c: 'var(--accent-deep)', b: 'var(--accent-tint)' },
    brief_received: { l: 'Under review',    pct: 18,  c: 'var(--accent-deep)', b: 'var(--accent-tint)' },
    assigned:       { l: 'Expert assigned', pct: 36,  c: 'var(--accent-deep)', b: 'var(--accent-tint)' },
    writing:        { l: 'In progress',     pct: 62,  c: 'var(--accent-deep)', b: 'var(--accent-tint)' },
    in_review:      { l: 'In QC review',    pct: 84,  c: '#8A6D1F',            b: '#F5ECD2' },
    revision:       { l: 'In revision',     pct: 72,  c: '#8A6D1F',            b: '#F5ECD2' },
    delivered:      { l: 'Completed',       pct: 100, c: 'var(--good)',        b: 'var(--good-bg)' },
    closed:         { l: 'Completed',       pct: 100, c: 'var(--good)',        b: 'var(--good-bg)' },
  }
  return map[status] || map.new
}
function dueText(raw) { try { const r = MM.relDue(raw); if (r) return r.text } catch (e) {} return '' }

/* ── heuristic brief parsing (ported verbatim from the design heuristic()/normalize()) ── */
function normalize(j) {
  const ALIAS = { undergraduate: 'ug', undergrad: 'ug', bachelor: 'ug', bachelors: 'ug', associate: 'ug', masters: 'ms', master: 'ms', graduate: 'ms', grad: 'ms', doctoral: 'phd', doctorate: 'phd', phd: 'phd', dnp: 'dnp', edd: 'dnp' }
  const level = LEVELS[j.level] ? j.level : (ALIAS[String(j.level || '').toLowerCase()] || 'ms')
  const scope = SCOPES[j.scope] ? j.scope : 'one'
  let pages = parseInt(j.pages, 10); if (!pages || pages < 1) pages = SCOPES[scope].def; pages = Math.max(1, Math.min(pages, 400))
  let days = parseInt(j.deadline_days, 10); if (!days || days < 1) days = 7; days = Math.min(days, 120)
  const L = LEVELS[level], S = SCOPES[scope]
  const perPage = (S.proj && L.proj != null) ? L.proj : L.rate
  const mult = days <= 2 ? 1.6 : (days <= 7 ? 1.15 : 1.0)
  const estimate = Math.round(pages * perPage * mult)
  const reqs = (Array.isArray(j.requirements) ? j.requirements : []).filter(Boolean).slice(0, 4).map(x => String(x).slice(0, 130))
  return {
    lowConfidence: false,
    discipline: (j.discipline ? String(j.discipline).slice(0, 40).replace(/^\s*([a-z])/, (m, c) => c.toUpperCase()) : '') || 'General studies', level, levelName: L.name, scope, scopeName: S.name,
    pages, citation: j.citation || 'APA 7', days,
    deadlineLabel: days <= 1 ? 'in 24 hours' : (days <= 2 ? 'in 2 days' : (days >= 21 ? ('in ~' + Math.round(days / 7) + ' weeks') : 'in ' + days + ' days')),
    perPage: Math.round(perPage * mult), estimate, big: pages >= 60, requirements: reqs,
  }
}
function heuristic(text) {
  const t = (text || '').toLowerCase()
  const words = t.split(/\s+/).filter(Boolean).length
  let level = 'ms', levelFound = false
  if (/\b(phd|ph\.?d|dissertation|doctoral research)\b/.test(t)) { level = 'phd'; levelFound = true }
  else if (/\b(dnp|edd|ed\.?d|capstone|practice doctorate|doctoral)\b/.test(t)) { level = 'dnp'; levelFound = true }
  else if (/\b(np\b|jd\b|j\.?d|psyd|psy\.?d|specialist|advanced practice|nurse practitioner)\b/.test(t)) { level = 'adv'; levelFound = true }
  else if (/\b(master'?s?|msc|m\.?s|mba|msn|\bma\b|graduate|grad)\b/.test(t)) { level = 'ms'; levelFound = true }
  else if (/\b(undergrad|undergraduate|bachelor|associate|freshman|sophomore|101)\b/.test(t)) { level = 'ug'; levelFound = true }
  let scope = 'one', scopeFound = false
  if (/dissertation/.test(t)) { scope = 'diss'; scopeFound = true }
  else if (/capstone|thesis/.test(t)) { scope = 'cap'; scopeFound = true }
  else if (/whole program|entire program|full program/.test(t)) { scope = 'prog'; scopeFound = true }
  else if (/full term|semester/.test(t)) { scope = 'term'; scopeFound = true }
  else if (/full course|whole course|entire course/.test(t)) { scope = 'course'; scopeFound = true }
  let pages = null, pagesFound = false
  let m = t.match(/(\d{1,3})\s*(?:(?:to|[-–])\s*\d{1,3}\s*)?(?:pages?|pgs?|pp\b)/)
  if (m) { pages = parseInt(m[1], 10); pagesFound = true }
  if (!pages) { const w = t.match(/(\d{2,5})\s*-?\s*words?/); if (w) { pages = Math.max(1, Math.round(parseInt(w[1], 10) / 275)); pagesFound = true } }
  if (!pages) pages = SCOPES[scope].def
  let citation = 'APA 7', citeFound = false
  const cm = t.match(/\b(apa\s*7?|mla|harvard|chicago|ama|ieee|oscola|vancouver|turabian)\b/)
  if (cm) { citeFound = true; const c = cm[1]; if (/apa/.test(c)) citation = 'APA 7'; else if (/harvard/.test(c)) citation = 'Harvard'; else if (/chicago/.test(c)) citation = 'Chicago'; else if (/vancouver/.test(c)) citation = 'Vancouver'; else if (/oscola/.test(c)) citation = 'OSCOLA'; else if (/turabian/.test(c)) citation = 'Turabian'; else citation = c.toUpperCase() }
  let days = 7, dlFound = false
  let dm = t.match(/(?:in|within|due in|deadline)\D{0,8}(\d{1,3})\s*days?/) || t.match(/\b(\d{1,3})\s*days?\b/)
  let wk = t.match(/(\d{1,2})\s*weeks?/)
  let hr = t.match(/(\d{1,2})\s*(?:hours?|hrs?)\b/)
  if (dm) { days = parseInt(dm[1], 10); dlFound = true }
  else if (hr) { days = parseInt(hr[1], 10) <= 24 ? 1 : 2; dlFound = true }
  else if (wk) { days = parseInt(wk[1], 10) * 7; dlFound = true }
  else if (/\b(today|tonight|asap|by midnight|same day|few hours)\b/.test(t)) { days = 1; dlFound = true }
  else if (/\b(tomorrow|next day|24\s*h)\b/.test(t)) { days = 1; dlFound = true }
  else if (/\b(overdue|was due|past due)\b/.test(t)) { days = 1; dlFound = true }
  else if (/next month|one month|a month|30 days/.test(t)) { days = 30; dlFound = true }
  else if (/next week/.test(t)) { days = 7; dlFound = true }
  else if (/this week|few days|couple of days|couple days/.test(t)) { days = 4; dlFound = true }
  const DISC = [['nurs|nursing|dnp|rn|clinical|patient|health', 'Nursing & Health Sciences'], ['mba|business|management|marketing|strategy|finance|accounting', 'Business & MBA'], ['psych|cbt|behavioral|cognitive', 'Psychology'], ['educat|edd|teaching|curriculum|pedagog', 'Education'], ['engineer|mechanical|civil|electrical', 'Engineering'], ['comput|software|data science|machine learning|programming', 'Computer Science'], ['law|legal|jd |criminal justice|jurispr', 'Law'], ['social work|sociolog', 'Social Work'], ['public health|epidemiolog|mph', 'Public Health'], ['statistic|biostat|regression', 'Data & Statistics'], ['econ|economic', 'Economics'], ['philosoph|ethics|literature|history|humanit', 'Humanities']]
  let discipline = 'General studies', discFound = false
  for (const [re, name] of DISC) { if (new RegExp(re).test(t)) { discipline = name; discFound = true; break } }
  const signals = (levelFound ? 1 : 0) + (pagesFound ? 1 : 0) + (citeFound ? 1 : 0) + (dlFound ? 1 : 0) + (discFound ? 1 : 0) + (scopeFound ? 1 : 0)
  if (signals < 2 && words < 25) return { lowConfidence: true }
  const reqs = []
  const sentences = (text || '').split(/[\n.;•]+/).map(s => s.trim()).filter(Boolean)
  for (const s of sentences) {
    if (/(include|required|minimum|at least|must|sources|references|cite|format|heading|turnitin|similarity|picot|abstract|appendix|peer-reviewed)/i.test(s) && s.length > 8 && s.length < 130) reqs.push(s.replace(/^[-–\s]+/, ''))
    if (reqs.length >= 4) break
  }
  if (!reqs.length) { reqs.push(citation + ' formatting throughout'); reqs.push('Original, fully referenced work') }
  return normalize({ discipline, level, scope, pages, citation, deadline_days: days, requirements: reqs })
}
/* AI parse → real Edge Function; heuristic fallback (replaces window.claude.complete) */
async function aiParse(text) {
  try {
    const sys = 'You parse a student’s assignment description into a structured academic brief. Return ONLY minified JSON with keys: discipline (string), level (one of: ug, ms, adv, dnp, phd), scope (one of: one, course, term, cap, diss, prog), pages (integer), citation (string e.g. "APA 7"), deadline_days (integer), requirements (array of up to 4 short strings). Infer sensibly from context. No prose, JSON only.'
    const out = await callAI('Assignment:\n' + text, sys)
    const a = out.indexOf('{'), b = out.lastIndexOf('}')
    if (a >= 0 && b > a) { const r = normalize(JSON.parse(out.slice(a, b + 1))); if (r && !r.lowConfidence) return r }
  } catch (e) { /* fall back */ }
  return heuristic(text)
}

const LS = 'meridian:concierge:v4'

export default function Concierge() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [lang, setLang] = useState('en')
  const [msgs, setMsgs] = useState([])
  const [sugg, setSugg] = useState(null)
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState(null) // null | 'scope' | 'order'
  const [toast, setToast] = useState('')
  const scrollRef = useRef(null)
  const fileRef = useRef(null)
  const escalated = useRef(false)
  const toastTimer = useRef(null)
  const L = LANGS[lang] || LANGS.en

  const showToast = m => { setToast(m); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 2800) }

  /* persistence — key bumped to v4 so old state is discarded on first load */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d && d.lang && LANGS[d.lang]) setLang(d.lang)
      if (d && Array.isArray(d.msgs) && d.msgs.length) { setMsgs(d.msgs); setExpanded(!!d.expanded); setSugg(d.sugg || null) }
    } catch (e) {}
  }, [])
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ msgs, sugg, lang, expanded })) } catch (e) {} }, [msgs, sugg, lang, expanded])
  useEffect(() => { const el = scrollRef.current; if (el) requestAnimationFrame(() => { try { el.scrollTop = el.scrollHeight } catch (e) {} }) }, [msgs, typing, sugg, open])

  /* ── message helpers (ccPush / ccThink / ccBot — ported) ── */
  function ccPush(msg) { setMsgs(s => s.concat([Object.assign({ at: Date.now(), _id: 'm' + s.length + '_' + Math.random().toString(36).slice(2, 6) }, msg)])) }
  function ccSetSugg(list) { setSugg((list && list.length) ? list : null) }
  function ccThink(fn, delay) { setTyping(true); setSugg(null); setTimeout(() => { setTyping(false); fn() }, delay || 560) }
  function ccBot(text, after) { ccThink(() => { ccPush({ role: 'bot', type: 'text', body: text }); if (after) after() }) }
  function lastEstimate() { for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].type === 'estimate') return msgs[i].result } return null }

  /* welcome SEED sequence: film → welcome → capability launcher → suggestion chips */
  function ccSeed(lc) {
    const LL = LANGS[lc || lang] || L
    ccThink(() => {
      ccPush({ role: 'bot', type: 'film', caption: LL.film })
      ccPush({ role: 'bot', type: 'text', body: LL.welcome })
      ccPush({ role: 'bot', type: 'actions' })
      ccSetSugg(LL.sugg)
    }, 460)
  }
  function openConcierge() { setOpen(true); if (!msgs.length) ccSeed() }
  function ccReset() { escalated.current = false; setMode(null); setInput(''); setMsgs([]); setSugg(null); setTyping(false); setTimeout(() => ccSeed(), 0) }
  function ccCycleLang() {
    const i = LANG_ORDER.indexOf(lang); const next = LANG_ORDER[(i + 1) % LANG_ORDER.length]
    escalated.current = false; setMode(null); setInput(''); setLang(next); setMsgs([]); setSugg(null)
    setTimeout(() => ccSeed(next), 0); showToast('Concierge language: ' + LANGS[next].name)
  }
  function ccToggleExpand() { setExpanded(x => !x) }

  /* window integration — re-bound each render, cleaned up on unmount */
  useEffect(() => {
    window.MeridianOpenConcierge = openConcierge
    window.__merConcierge = openConcierge
    return () => {
      if (window.MeridianOpenConcierge === openConcierge) delete window.MeridianOpenConcierge
      if (window.__merConcierge === openConcierge) delete window.__merConcierge
    }
  })

  /* ── capability launcher (ccCap — ported) ── */
  function ccCap(id) {
    setSugg(null)
    const lbl = (L.caps.find(c => c.id === id) || {}).label || id
    if (id === 'scope') { ccPush({ role: 'you', type: 'text', body: lbl }); setMode('scope'); ccBot('Sure — paste your rubric or describe it in a sentence: your level, length, citation style and deadline. I’ll price it instantly.', () => ccSetSugg([{ label: 'Attach my rubric', value: '__attach' }, { label: 'Load a sample rubric', value: '__sample' }])) }
    else if (id === 'order') { ccPush({ role: 'you', type: 'text', body: lbl }); setMode('order'); ccBot('Happy to. What’s your order reference? It looks like MS-3041 — you’ll find it in your confirmation email.', () => ccSetSugg([{ label: 'Talk to a person', value: '__human' }])) }
    else if (id === 'experts') { ccPush({ role: 'you', type: 'text', body: lbl }); ccThink(() => { ccPush({ role: 'bot', type: 'text', body: 'Every expert holds an advanced degree and clears a screen under 9% pass. A few who fit common briefs:' }); ccPush({ role: 'bot', type: 'experts' }); ccSetSugg([{ label: 'Scope my work', value: 'cap:scope' }, { label: 'Talk to a person', value: '__human' }]) }) }
    else if (id === 'pricing') { ccPush({ role: 'you', type: 'text', body: lbl }); ccThink(() => { ccPush({ role: 'bot', type: 'text', body: 'Support starts at $14/page and scales with your level and deadline — never with how stuck you are.' }); ccPush({ role: 'bot', type: 'pricing' }); ccSetSugg([{ label: 'Scope my work', value: 'cap:scope' }, { label: 'How deadlines change price', value: 'How does my deadline affect the price?' }]) }) }
    else if (id === 'human') handleHuman()
  }

  /* ── suggestion-chip click (ccSuggClick — ported) ── */
  function ccSuggClick(s) {
    setSugg(null)
    const v = s.value || s.label
    if (v === 'cap:scope') return ccCap('scope')
    if (v === 'cap:order') return ccCap('order')
    if (v === 'cap:experts') return ccCap('experts')
    if (v === 'cap:pricing') return ccCap('pricing')
    if (v === '__human') return handleHuman()
    if (v === '__attach') { setMode('scope'); return fileRef.current && fileRef.current.click() }
    if (v === '__sample') { ccPush({ role: 'you', type: 'text', body: 'Scope this sample rubric' }); setMode(null); return scopeInChat(SAMPLE) }
    if (v === '__start') { const r = lastEstimate(); if (r) startBrief(r); return }
    if (v === '__tweak') { const r = lastEstimate(); if (r) loadIntoScoper(r); return }
    ccPush({ role: 'you', type: 'text', body: s.label })
    if (mode === 'order') { setMode(null); return lookupOrder(v) }
    routeMessage(v)
  }

  /* file attach — scope a rubric */
  function onFile(file) {
    if (!file) return
    ccPush({ role: 'you', type: 'text', body: '📎 ' + file.name })
    setMode(null)
    const name = file.name.toLowerCase()
    if (/\.(txt|md|rtf|csv)$/i.test(name) || (file.type && file.type.startsWith('text'))) {
      ccBot('Got your rubric — reading it now.', () => {
        const r = new FileReader()
        r.onload = () => scopeInChat(String(r.result || '').trim())
        r.onerror = () => { ccPush({ role: 'bot', type: 'text', body: 'Hmm, I couldn’t read that one. Tell me the basics and I’ll scope it.' }); setMode('scope'); ccSetSugg([{ label: 'Talk to a person', value: '__human' }]) }
        r.readAsText(file)
      })
    } else {
      ccBot('Got your file! I’ll read it in full when you start the brief. Meanwhile, tell me your level, length and deadline for an instant price.', () => { setMode('scope'); ccSetSugg([{ label: 'Talk to a person', value: '__human' }]) })
    }
  }
  function ccUploadRubric() { setMode('scope'); if (fileRef.current) fileRef.current.click() }

  /* ── send free text (ccSendText — ported) ── */
  function ccSendText() {
    const text = (input || '').trim(); if (!text) return
    ccPush({ role: 'you', type: 'text', body: text })
    const m = mode; setInput(''); setSugg(null); setMode(null)
    if (m === 'scope') return scopeInChat(text)
    if (m === 'order') return lookupOrder(text)
    routeMessage(text)
  }

  /* scope in chat (ported) */
  function scopeInChat(text) {
    setTyping(true); setSugg(null)
    const fail = () => { setTyping(false); setMode('scope'); ccPush({ role: 'bot', type: 'text', body: 'I couldn’t quite read the scope. Tell me your level, page count, citation style and deadline — e.g. “Master’s nursing essay, 8 pages, APA, due in a week.”' }); ccSetSugg([{ label: 'Load a sample rubric', value: '__sample' }, { label: 'Talk to a person', value: '__human' }]) }
    Promise.resolve(aiParse(text)).then(r => {
      setTyping(false)
      if (!r || r.lowConfidence) return fail()
      ccPush({ role: 'bot', type: 'text', body: 'Here’s your instant scope — adjust anything before you start.' })
      ccPush({ role: 'bot', type: 'estimate', result: r })
      ccSetSugg([{ label: 'Start this brief', value: '__start' }, { label: 'Tweak in the scoper', value: '__tweak' }, { label: 'Talk to a person', value: '__human' }])
    }).catch(() => {
      const h = heuristic(text); setTyping(false)
      if (h && !h.lowConfidence) { ccPush({ role: 'bot', type: 'text', body: 'Here’s your instant scope — adjust anything before you start.' }); ccPush({ role: 'bot', type: 'estimate', result: h }); ccSetSugg([{ label: 'Start this brief', value: '__start' }, { label: 'Tweak in the scoper', value: '__tweak' }]) }
      else fail()
    })
  }

  /* "Start this brief" → MeridianOpenBrief */
  function startBrief(r) {
    const pre = { levelId: r.level, scopeId: r.scope, pages: r.pages, dlId: r.deadline || r.days, title: r.title || 'Your assignment', discipline: r.discipline, citation: r.citation }
    setOpen(false)
    if (typeof window !== 'undefined' && window.MeridianOpenBrief) window.MeridianOpenBrief(pre)
    else window.location.href = '/#pricing'
  }
  /* "Adjust" / "Tweak in the scoper" → MeridianScopeResult (fallback MeridianOpenBrief) */
  function loadIntoScoper(r) {
    if (!r) return
    setOpen(false)
    const pre = { discipline: r.discipline, level: r.level, levelName: r.levelName, scope: r.scope, scopeName: r.scopeName, pages: r.pages, citation: r.citation, days: r.days, deadlineId: r.deadline, deadlineLabel: r.deadlineLabel, perPage: r.perPage, estimate: r.estimate, title: r.title }
    if (typeof window !== 'undefined' && window.MeridianScopeResult) { window.MeridianScopeResult(pre); showToast('Loaded into the scoper — fine-tune any field') }
    else if (typeof window !== 'undefined' && window.MeridianOpenBrief) window.MeridianOpenBrief({ levelId: r.level, scopeId: r.scope, pages: r.pages, dlId: r.days, title: r.title, discipline: r.discipline, citation: r.citation })
    else window.location.href = '/#intake'
  }

  /* ── order lookup (real Supabase, auth-gated, demo fallback) ── */
  function parseRef(input) {
    const m = String(input || '').toUpperCase().match(/MS[\s-]?(\d{3,4})/) || String(input || '').match(/\b(\d{3,4})\b/)
    return m ? ('MS-' + m[1].replace(/\D/g, '')) : null
  }
  async function lookupOrder(input) {
    const ref = parseRef(input)
    setTyping(true); setSugg(null)
    if (!ref) {
      setTimeout(() => { setTyping(false); setMode('order'); ccPush({ role: 'bot', type: 'text', body: 'I didn’t catch a reference. It looks like MS-3041 — what’s yours?' }); ccSetSugg([{ label: 'Talk to a person', value: '__human' }]) }, 500)
      return
    }
    let order = null, needsAuth = false
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth || !auth.user) needsAuth = true
      else {
        const { data } = await supabase.from('orders').select('ref, title, level_label, pages, citation, status, due_date, quote_total, writer:writers!orders_writer_id_fkey(name)').eq('ref', ref).limit(1)
        if (data && data[0]) { order = data[0]; if (order.writer && order.writer.name) order.writer_name = order.writer.name }
      }
    } catch (e) {}
    if (!order && !needsAuth) order = DEMO_ORDERS.find(o => o.ref === ref) || null
    setTyping(false)
    if (needsAuth) {
      ccPush({ role: 'bot', type: 'text', body: 'I can pull up ' + ref + ' once you’re signed in — that keeps your order private. Sign in to your workspace, or I can connect you with a person who can help right now.' })
      ccPush({ role: 'bot', type: 'order', signin: true })
      ccSetSugg([{ label: 'Talk to a person', value: '__human' }]); return
    }
    if (!order) {
      setMode('order')
      ccPush({ role: 'bot', type: 'text', body: 'I couldn’t find ' + ref + ' on your account. Double-check the reference — it looks like MS-3041 — or I can connect you with a person.' })
      ccSetSugg([{ label: 'Talk to a person', value: '__human' }]); return
    }
    ccPush({ role: 'bot', type: 'text', body: 'Found it — here’s where ' + ref + ' stands right now:' })
    ccPush({ role: 'bot', type: 'order', order })
    ccSetSugg([{ label: 'Message my expert', value: '__human' }, { label: 'Check another order', value: 'cap:order' }])
  }

  /* ── escalate to a human (real: support_conversations + support_messages) ── */
  function handleHuman() {
    ccThink(() => {
      ccPush({ role: 'bot', type: 'text', body: 'Connecting you with our team now — a real person will pick up this chat shortly. Prefer WhatsApp updates too? Tap below.' })
      ccPush({ role: 'bot', type: 'handoff' })
      escalate()
      ccSetSugg([{ label: 'Scope my work meanwhile', value: 'cap:scope' }, { label: 'See pricing', value: 'cap:pricing' }])
    })
  }
  async function escalate() {
    if (escalated.current) return
    escalated.current = true
    try {
      const transcript = (msgs || []).filter(m => m.body)
      const firstQ = (transcript.find(m => m.role === 'you') || {}).body || 'Concierge enquiry'
      let name = 'Website visitor', email = null
      try { const { data: auth } = await supabase.auth.getUser(); if (auth && auth.user) { email = auth.user.email; name = (auth.user.user_metadata && auth.user.user_metadata.name) || email || name } } catch (e) {}
      const { data: conv, error } = await supabase.from('support_conversations')
        .insert({ name, surface: 'client', subject: firstQ.slice(0, 60), status: 'waiting', last_message_at: new Date().toISOString() })
        .select('id').single()
      if (error || !conv) return
      const rows = transcript.map(m => ({ conversation_id: conv.id, role: m.role === 'you' ? 'client' : 'concierge', sender_name: m.role === 'you' ? name : 'Concierge', body: m.body }))
      if (rows.length) await supabase.from('support_messages').insert(rows)
    } catch (e) {}
  }

  /* ── AI router (real Edge Function transport; heuristic fallback) ── */
  async function routeMessage(text) {
    setTyping(true); setSugg(null)
    let route = null
    try {
      const hist = msgs.slice(-6).map(m => (m.role === 'you' ? 'Student: ' : 'Concierge: ') + (m.body || ('[' + (m.type || 'card') + ']'))).join('\n')
      const out = await callAI('Conversation so far:\n' + hist + '\n\nLatest student message: ' + text + '\n\nJSON:', langSystem(lang))
      const a = out.indexOf('{'), b = out.lastIndexOf('}')
      if (a >= 0 && b > a) route = JSON.parse(out.slice(a, b + 1))
    } catch (e) { route = null }
    if (!route || !route.action) route = heuristicRoute(text)
    applyRoute(route, text)
  }
  function heuristicRoute(text) {
    const t = (text || '').toLowerCase()
    if (/\b(how (it|does|do you|this) work|how does meridian|walk me through|explain how|the process|step by step|show me how)\b/.test(t)) return { action: 'film', reply: '' }
    if (/ms[\s-]?\d{3,4}/.test(t) || /\b(my order|order status|track|where is my|status of|my brief)\b/.test(t)) { const m = t.match(/ms[\s-]?(\d{3,4})/); return { action: 'order', reply: '', ref: m ? ('MS-' + m[1]) : null } }
    if (/\b(human|real person|a person|someone|agent|representative|talk to|speak to|whatsapp|call me|phone|email me|contact)\b/.test(t)) return { action: 'human', reply: '' }
    if (/\b(expert|writer|tutor|who will|who would|qualif|degree|phd holder|credential)\b/.test(t)) return { action: 'experts', reply: '' }
    const h = heuristic(text)
    if (h && !h.lowConfidence) return { action: 'scope', reply: 'Here’s your instant scope — adjust anything before you start.', brief: text }
    if (/\b(price|pricing|cost|how much|rate|per page|per-page|estimate|fee|charge|expensive|cheap|deposit|payment)\b/.test(t)) return { action: 'pricing', reply: '' }
    if (/\b(allowed|legal|cheat|plagiar|integrity|caught|safe|confidential|detect)\b/.test(t)) return { action: 'none', reply: 'Think of us like a writing center or private tutor — coaching, editing and model research you learn from and can defend. Everything is human-written, screened for originality and AI, and kept confidential. We never promise grades.' }
    return { action: 'none', reply: '' }
  }
  function applyRoute(route, text) {
    const act = (route && route.action) || 'none'
    const reply = (route && route.reply) || ''
    const suggs = (route && Array.isArray(route.suggestions) && route.suggestions.length) ? route.suggestions.slice(0, 3).map(x => ({ label: String(x).slice(0, 40), value: String(x) })) : null
    setTyping(false)
    if (reply) ccPush({ role: 'bot', type: 'text', body: reply })
    if (act === 'scope') {
      const brief = (route && route.brief && route.brief.length > 6) ? route.brief : text
      Promise.resolve(aiParse(brief)).then(r => {
        if (r && !r.lowConfidence) { ccPush({ role: 'bot', type: 'estimate', result: r }); ccSetSugg([{ label: 'Start this brief', value: '__start' }, { label: 'Tweak in the scoper', value: '__tweak' }, { label: 'Talk to a person', value: '__human' }]) }
        else { if (!reply) ccPush({ role: 'bot', type: 'text', body: 'Tell me your level, length, citation style and deadline and I’ll price it exactly.' }); setMode('scope'); ccSetSugg([{ label: 'Load a sample rubric', value: '__sample' }]) }
      }).catch(() => { setMode('scope') })
      return
    }
    if (act === 'order') {
      if (route && route.ref && /\d/.test(route.ref)) return lookupOrder(route.ref)
      setMode('order'); if (!reply) ccPush({ role: 'bot', type: 'text', body: 'Happy to check — what’s your order reference? It looks like MS-3041.' })
      ccSetSugg([{ label: 'Talk to a person', value: '__human' }]); return
    }
    if (act === 'experts') { if (!reply) ccPush({ role: 'bot', type: 'text', body: 'Every expert holds an advanced degree and clears a screen under 9% pass. A few who fit common briefs:' }); ccPush({ role: 'bot', type: 'experts' }); ccSetSugg(suggs || [{ label: 'Scope my work', value: 'cap:scope' }, { label: 'Talk to a person', value: '__human' }]); return }
    if (act === 'pricing') { ccPush({ role: 'bot', type: 'pricing' }); ccSetSugg(suggs || [{ label: 'Scope my work', value: 'cap:scope' }, { label: 'How deadlines change price', value: 'How does my deadline affect the price?' }]); return }
    if (act === 'film') { if (!reply) ccPush({ role: 'bot', type: 'text', body: 'Here’s the 30-second version — describe your assignment, get matched to one expert, and get it back before your deadline, screened and documented.' }); ccPush({ role: 'bot', type: 'film', caption: 'How Meridian works · 0:30' }); ccSetSugg(suggs || [{ label: 'Scope my work', value: 'cap:scope' }, { label: 'See pricing', value: 'cap:pricing' }]); return }
    if (act === 'human') return handleHuman()
    if (!reply) ccPush({ role: 'bot', type: 'text', body: 'Happy to help. I can scope an assignment for an instant price, check an order, introduce an expert, or connect you with a person — which would you like?' })
    ccSetSugg(suggs || L.sugg)
  }

  /* ── per-message render (ccRenderItem markup — transcribed) ── */
  function CCItem({ m }) {
    const you = m.role === 'you'
    const rowStyle = { display: 'flex', flexDirection: 'column', alignItems: you ? 'flex-end' : 'flex-start' }
    const arrow = I('arrow', 15, '#fff')

    if (!m.type || m.type === 'text') {
      const bubbleStyle = {
        maxWidth: '86%', padding: '11px 14px', borderRadius: you ? '16px 16px 5px 16px' : '16px 16px 16px 5px',
        fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: you ? 'var(--accent)' : 'var(--paper)', color: you ? '#fff' : 'var(--ink)',
        border: you ? 'none' : '1px solid var(--line)', boxShadow: you ? '0 8px 18px -12px rgba(189,90,51,.7)' : '0 1px 2px rgba(33,26,20,.04)',
      }
      return <div className="v2-ccmsg" style={rowStyle}><div style={bubbleStyle}>{linkify(m.body || '')}</div></div>
    }

    if (m.type === 'actions') {
      return (
        <div className="v2-ccmsg" style={rowStyle}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {L.caps.map(c => (
              <button key={c.id} onClick={() => ccCap(c.id)} className="v2-ccact" style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '11px 13px', borderRadius: 13, border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-tint)', color: 'var(--accent-deep)', display: 'grid', placeItems: 'center', flex: '0 0 34px' }}>{I(CAP_ICON[c.id], 17, 'var(--accent-deep)')}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{c.label}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{c.sub}</span>
                </span>
                {I('chev', 16, 'var(--faint)')}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (m.type === 'estimate') {
      const r = m.result || {}
      const facts = [
        { k: 'Discipline', v: r.discipline }, { k: 'Level', v: r.levelName },
        { k: 'Length', v: (r.pages || 1) + ' pages' }, { k: 'Citation', v: r.citation },
        { k: 'Deadline', v: r.deadlineLabel }, { k: 'Scope', v: r.scopeName },
      ]
      return (
        <div className="v2-ccmsg" style={rowStyle}>
          <div style={{ width: '100%', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px 16px 16px 6px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(33,26,20,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
              <span style={{ color: 'var(--good)', display: 'inline-flex' }}>{I('sealc', 17, 'var(--good)', 1.9)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Your instant scope</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)' }}>
              {facts.map((f, i) => (
                <div key={i} style={{ background: 'var(--paper)', padding: '9px 13px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3 }}>{f.k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{f.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'var(--ink)', color: 'var(--paper)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(246,241,233,.55)' }}>Estimate</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 23, fontWeight: 600, lineHeight: 1.15 }}>{'from ' + money(r.estimate || 0)}</div>
                <div style={{ fontSize: 11, color: 'rgba(246,241,233,.6)', marginTop: 1 }}>{money(r.perPage || 0) + '/page · 50% deposit'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '12px 14px' }}>
              <button onClick={() => startBrief(r)} className="v2-ccbtn" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Start this brief {arrow}</button>
              <button onClick={() => loadIntoScoper(r)} style={{ padding: '11px 15px', borderRadius: 11, border: '1.5px solid var(--line-2)', background: 'var(--paper)', color: 'var(--ink-soft)', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Adjust</button>
            </div>
          </div>
        </div>
      )
    }

    if (m.type === 'experts') {
      return (
        <div className="v2-ccmsg" style={rowStyle}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EXPERTS.map(e => (
              <div key={e.initials} style={{ display: 'flex', gap: 11, padding: 13, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--paper)' }}>
                <span style={{ width: 42, height: 42, borderRadius: 12, background: e.avBg, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, flex: '0 0 42px' }}>{e.initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{e.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: 'var(--muted)' }}>{I('star', 11, 'var(--accent)', 0)} {e.rating}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--accent-deep)', margin: '3px 0 5px' }}>{e.degree + ' · ' + e.field}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{e.blurb}</div>
                </div>
              </div>
            ))}
            <button onClick={() => ccCap('scope')} className="v2-ccbtn" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Match me with an expert {arrow}</button>
          </div>
        </div>
      )
    }

    if (m.type === 'order') {
      if (m.signin) {
        return (
          <div className="v2-ccmsg" style={rowStyle}>
            <div style={{ width: '100%', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px 16px 16px 6px', padding: 15, boxShadow: '0 1px 2px rgba(33,26,20,.05)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Order lookup</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>Sign in to see live status, your expert and your deadline.</div>
              <a href="/workspace" className="v2-ccbtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Sign in to my workspace {arrow}</a>
            </div>
          </div>
        )
      }
      const o = m.order || {}; const si = statusInfo(o.status)
      const metaLine = [o.level_label, (o.pages ? o.pages + 'pg' : null), o.citation].filter(Boolean).join(' · ')
      const due = dueText(o.due_date) || 'scheduling'
      const expert = o.writer_name ? ('with ' + shortName(o.writer_name)) : 'Matching expert'
      const hasPrice = o.quote_total != null
      return (
        <div className="v2-ccmsg" style={rowStyle}>
          <div style={{ width: '100%', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px 16px 16px 6px', padding: 15, boxShadow: '0 1px 2px rgba(33,26,20,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{o.ref || m.ref}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: si.c, background: si.b, padding: '3px 9px', borderRadius: 99 }}>{si.l}</span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4 }}>{o.title || 'Your order'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 13 }}>{metaLine}</div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--paper-3)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', width: si.pct + '%', background: 'var(--accent)', borderRadius: 99, transition: 'width .5s cubic-bezier(.2,.7,.3,1)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-soft)' }}>{I('clock', 13, 'var(--muted)')} {due}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-soft)' }}>{I('user', 13, 'var(--muted)')} {expert}</span>
              {hasPrice && <span style={{ marginLeft: 'auto', fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--accent-deep)' }}>{money(o.quote_total)}</span>}
            </div>
          </div>
        </div>
      )
    }

    if (m.type === 'pricing') {
      return (
        <div className="v2-ccmsg" style={rowStyle}>
          <div style={{ width: '100%', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px 16px 16px 6px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(33,26,20,.05)' }}>
            <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Pricing by level · per page</div>
            {TIERS.map(t => (
              <div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.sub}</div>
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: 'var(--accent-deep)' }}>{t.proj ? (t.rate + ' · ' + t.proj) : t.rate}</div>
              </div>
            ))}
            <div style={{ padding: '11px 14px', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>Final price scales with your deadline. 50% deposit to start, balance on delivery.</div>
            <div style={{ padding: '0 14px 13px' }}>
              <button onClick={() => ccCap('scope')} className="v2-ccbtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Scope my work {arrow}</button>
            </div>
          </div>
        </div>
      )
    }

    if (m.type === 'film') {
      return (
        <div className="v2-ccmsg" style={rowStyle}>
          <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--ink)', boxShadow: '0 1px 2px rgba(33,26,20,.05)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
              <video src="/meridian/film.mp4" controls playsInline preload="metadata" poster="/meridian/cc-welcome.png" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '10px 13px', fontSize: 12.5, fontWeight: 600, color: 'var(--paper)' }}>{m.caption || L.film}</div>
          </div>
        </div>
      )
    }

    if (m.type === 'handoff') {
      return (
        <div className="v2-ccmsg" style={rowStyle}>
          <div style={{ width: '100%', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px 16px 16px 6px', padding: 15, boxShadow: '0 1px 2px rgba(33,26,20,.05)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Talk to a person</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>Our team is on it</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 13 }}>Typically replies within the hour</div>
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer" className="v2-ccbtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>{I('wa', 16, '#fff')} Message on WhatsApp</a>
          </div>
        </div>
      )
    }
    return null
  }

  /* link "whatsapp" → wa.me */
  function linkify(text) {
    if (!text || typeof text !== 'string') return text
    const parts = text.split(/(whatsapp)/gi)
    if (parts.length === 1) return text
    return parts.map((p, i) => /^whatsapp$/i.test(p)
      ? <a key={i} href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>{p}</a>
      : p)
  }

  /* ── shared inline-style constants (ported verbatim) ── */
  const ccHdrBtn = { width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--paper-2)', color: 'var(--ink-soft)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: '0 0 30px', transition: 'background .15s,color .15s' }
  const ccIconBtn = { width: 38, height: 38, borderRadius: 11, border: '1px solid var(--line-2)', background: 'var(--paper)', color: 'var(--ink-soft)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: '0 0 38px', transition: 'background .15s,color .15s' }
  const ccPill = { fontSize: 12.5, color: 'var(--ink-soft)', background: 'var(--paper-2)', border: '1px solid var(--line-2)', borderRadius: 99, padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--sans)' }
  const hasInput = (input || '').trim()
  const ccSendStyle = { width: 40, height: 40, borderRadius: 13, border: 'none', background: hasInput ? 'var(--accent)' : 'var(--paper-3)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: '0 0 40px', transition: 'background .2s' }
  /* panel base style constant `b` (ported verbatim) + width/height per expand state */
  const panelStyle = {
    position: 'fixed', right: 22, bottom: 22, display: 'flex', flexDirection: 'column',
    background: 'var(--paper)', border: '1px solid var(--line)', boxShadow: '0 40px 90px -28px rgba(33,26,20,.55)',
    zIndex: 3500, overflow: 'hidden', borderRadius: 22, animation: 'v2-ccpop .3s cubic-bezier(.2,.7,.3,1) both',
    ...(expanded ? { width: 'min(720px,94vw)', height: 'min(80vh,780px)' } : { width: 408, height: 'min(640px,82vh)' }),
  }

  const statusText = typing ? L.typing : L.status

  return (
    <div className="v2-root">
      {open ? (
        <div className="v2-cc" style={panelStyle}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px 13px 15px', borderBottom: '1px solid var(--line)', background: 'linear-gradient(180deg,var(--accent-soft),var(--paper))', position: 'relative', zIndex: 2 }}>
            <span style={{ position: 'relative', width: 38, height: 38, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 38px', boxShadow: '0 8px 18px -8px rgba(189,90,51,.75)' }}>
              {I('sparkF', 16, '#fff')}
              <span style={{ position: 'absolute', right: -2, bottom: -2, width: 11, height: 11, borderRadius: 99, background: 'var(--good-bright)', border: '2px solid var(--paper)' }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>Meridian Concierge</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--good)', boxShadow: '0 0 0 3px var(--good-bg)' }} />{statusText}
              </div>
            </div>
            <button onClick={ccCycleLang} title="Language" className="v2-cchdr" style={{ height: 30, padding: '0 9px', borderRadius: 9, border: 'none', background: 'var(--paper-2)', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flex: '0 0 auto', transition: 'background .15s,color .15s' }}>{I('globe', 13, 'var(--ink-soft)')}{L.name}</button>
            <button onClick={ccReset} title="New chat" className="v2-cchdr" style={ccHdrBtn}>{I('plus', 16, 'var(--ink-soft)')}</button>
            <button onClick={ccToggleExpand} title="Expand" className="v2-cchdr v2-cc-expand" style={ccHdrBtn}>{I(expanded ? 'compress' : 'expand', 15, 'var(--ink-soft)')}</button>
            <button onClick={() => setOpen(false)} title="Close" className="v2-cchdr" style={ccHdrBtn}>{I('x', 17, 'var(--ink-soft)')}</button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="v2-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 15px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--paper-2)' }}>
            {msgs.map(m => <CCItem key={m._id} m={m} />)}
            {typing && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '12px 15px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px 14px 14px 5px' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--faint)', animation: 'v2-pulse 1s ease-in-out infinite' }} />
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--faint)', animation: 'v2-pulse 1s ease-in-out .2s infinite' }} />
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--faint)', animation: 'v2-pulse 1s ease-in-out .4s infinite' }} />
              </div>
            )}
          </div>

          {/* suggestions */}
          {sugg && sugg.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', padding: '11px 14px 2px', background: 'var(--paper)' }}>
              {sugg.map((s, i) => <button key={i} onClick={() => ccSuggClick(s)} style={ccPill}>{s.label}</button>)}
            </div>
          )}

          {/* input */}
          <form onSubmit={e => { e.preventDefault(); ccSendText() }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', background: 'var(--paper)', borderTop: '1px solid var(--line)' }}>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf" hidden onChange={e => onFile(e.target.files[0])} />
            <button type="button" onClick={ccUploadRubric} title="Attach a rubric" className="v2-cchdr" style={ccIconBtn}>{I('clip', 18, 'var(--ink-soft)')}</button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ccSendText() } }} placeholder={L.input} style={{ flex: 1, minWidth: 0, padding: '11px 14px', borderRadius: 13, border: '1.5px solid var(--line-2)', background: 'var(--paper-2)', fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--ink)', outline: 'none' }} />
            <button type="submit" style={ccSendStyle}>{I('send', 17, hasInput ? '#fff' : 'var(--faint)')}</button>
          </form>
        </div>
      ) : (
        <button onClick={openConcierge} className="v2-cc v2-ccbtn" style={{ position: 'fixed', right: 22, bottom: 22, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 20px 14px 16px', borderRadius: 999, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 18px 40px -14px rgba(189,90,51,.6)', zIndex: 3400 }}>{I('chat', 20, '#fff')} Ask Meridian</button>
      )}
      {toast && (
        <div role="status" style={{ position: 'fixed', right: 22, bottom: 92, zIndex: 3600, background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, padding: '10px 16px', borderRadius: 12, boxShadow: '0 18px 40px -18px rgba(33,26,20,.6)', animation: 'v2-rise .26s cubic-bezier(.2,.7,.3,1) both', maxWidth: 320 }}>{toast}</div>
      )}
    </div>
  )
}
