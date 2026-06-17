import { useEffect } from 'react'
import './HomePage.css'
import './InfoPage.css'

const WA_NUM = import.meta.env.VITE_WHATSAPP_NUMBER || '12057279363'
const CONTACT_EMAIL = 'hello@primemeridian.academy'
const LAST_UPDATED = 'June 2026'

// ── ICONS (subset reused from the homepage look) ────────────────────────────────
const Ico = {
  arrow: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M5 12h14M13 5l7 7-7 7" /></svg>,
  back: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M19 12H5M11 19l-7-7 7-7" /></svg>,
  spark: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6.3 6.3 4.5 4.5M19.5 19.5l-1.8-1.8M6.3 17.7 4.5 19.5M19.5 4.5l-1.8 1.8" /><circle cx="12" cy="12" r="3.2" /></svg>,
  wa: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false" {...p}><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1c-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2" /></svg>,
  mail: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
}

function openConcierge() {
  if (typeof window !== 'undefined' && window.MeridianOpenConcierge) window.MeridianOpenConcierge()
  else if (typeof window !== 'undefined') window.open(`https://wa.me/${WA_NUM}`, '_blank')
}

// ── BLOCK RENDERER ──────────────────────────────────────────────────────────────
// Content is described as a flat list of blocks so every page stays consistent.
function Block({ b }) {
  if (b.h) return <h2 className="ip-h2">{b.h}</h2>
  if (b.p) return <p className="ip-p">{b.p}</p>
  if (b.note) return <p className="ip-note">{b.note}</p>
  if (b.ul) return <ul className="ip-ul">{b.ul.map((li, i) => <li key={i}>{li}</li>)}</ul>
  return null
}

// A clearly-visible inline placeholder for anything company-specific we must not invent.
function P({ children }) {
  return <span className="ip-todo">[ to set: {children} ]</span>
}

// ── PAGE CONTENT ────────────────────────────────────────────────────────────────
// Each entry: title, lede, and an array of blocks. Plain language, grounded only in
// the known business model; company-specific facts are bracketed with <P>.
const PAGES = {
  contact: {
    title: 'Contact us',
    lede: "We're a small, responsive team. Whatever you need — a quote, a question about a brief, or help with your workspace — here's how to reach a real person.",
    custom: 'contact',
    blocks: [],
  },

  integrity: {
    title: 'Integrity policy',
    lede: 'Meridian exists to help you produce original work you genuinely understand and can defend. Integrity is not a feature we add at the end — it is the model.',
    blocks: [
      { h: 'Every brief is screened for originality' },
      { p: 'Before an expert begins, your brief is reviewed against your rubric and your goals. Throughout the work, drafts are checked for originality so that what you receive is written from scratch for your specific assignment — never recycled, never resold.' },
      { h: '0% AI generation — guaranteed' },
      { p: 'Every deliverable is written by a credentialed human expert. We do not use AI to generate your work. The only place AI appears in our process is the intake assistant that helps scope your assignment before a person ever touches it.' },
      { h: 'Reports on every deliverable' },
      { p: 'Each final deliverable ships with a plagiarism (similarity) report and an AI-detection report, so you can see the results yourself before you submit anything. No guesswork, no surprises in a Turnitin check.' },
      { h: 'A coaching, editing and research-design model' },
      { p: 'We provide the same kind of support a university writing center, private tutor or research advisor offers: structural guidance, model work, detailed edits, and methodology coaching. The aim is always work you understand and can defend in your own voice — not a paper handed off with no learning attached.' },
      { h: 'Credentialed experts only' },
      { p: 'Fewer than one in nine applicants meet our bar. Every specialist holds an advanced or terminal degree in the field they support and is verified for credentials, citation-style mastery and subject expertise.' },
      { h: 'Your responsibilities' },
      { p: "Academic-integrity rules vary by institution and instructor. You are responsible for knowing and following your school's policies on outside assistance and for how you use the materials we provide. Our work is built to be learned from and defended as your own understanding." },
      { note: "Questions about how a deliverable should be used? Ask the concierge before you submit — we'd always rather you check first." },
    ],
  },

  terms: {
    title: 'Terms of Service',
    lede: 'These terms govern your use of Meridian Studio. By scoping a brief, creating an account or engaging an expert, you agree to them.',
    blocks: [
      { h: '1. What we provide' },
      { p: 'Meridian provides academic support: coaching, expert editing, model work, research design and methodology guidance, delivered by credentialed specialists. We provide learning support and model materials — we do not produce work for you to submit as your own in violation of your institution’s rules, and we are not a ghostwriting service for graded submissions.' },
      { h: '2. Your account' },
      { p: 'You are responsible for the accuracy of the information you provide, for keeping your login credentials secure, and for all activity under your account. Let us know promptly if you believe your account has been accessed without your permission.' },
      { h: '3. Academic integrity is yours to uphold' },
      { p: "You are solely responsible for knowing and complying with your institution's academic-integrity and outside-assistance policies, and for how you use any materials we deliver. Our deliverables are intended as learning, research and editing support." },
      { h: '4. Quotes, scope and payment' },
      { p: 'Every engagement is quoted up front and the rate is locked before work begins. A 50% deposit starts the work and the balance is due on final approval. Payment is arranged off-platform through the methods we confirm with you; we do not store full payment-card details on our site.' },
      { h: '5. Revisions' },
      { p: 'We work to a revision-first standard: if a deliverable does not meet the agreed scope and instructions, we revise it. Revision terms and any refund considerations are set out in our Refund policy.' },
      { h: '6. On-time pledge' },
      { p: 'We agree deadlines in advance. If we miss an agreed deadline, the remedy described in our public on-time pledge applies.' },
      { h: '7. Limitation of liability' },
      { p: 'Meridian provides academic support on a best-effort, good-faith basis and does not guarantee any particular grade, outcome or admission decision. To the maximum extent permitted by law, our total liability for any claim arising from an engagement is limited to the amount you paid for that engagement.' },
      { h: '8. Governing law' },
      { p: <>These terms are entered into with <P>legal entity name and registered address</P> and are governed by the laws of <P>governing jurisdiction</P>, without regard to conflict-of-law principles.</> },
      { h: '9. Changes to these terms' },
      { p: 'We may update these terms from time to time. The "last updated" date below reflects the current version; continued use of the service after an update constitutes acceptance of the revised terms.' },
    ],
  },

  privacy: {
    title: 'Privacy policy',
    lede: 'This policy explains what we collect, how we use it, who we share it with, and the choices you have. We collect only what we need to scope your work and run your account.',
    blocks: [
      { h: 'What we collect' },
      { ul: [
        'Account details — your name, email, and (optionally) WhatsApp number.',
        'Brief content — the assignment details, rubric text and requirements you share so we can scope and complete the work.',
        'Uploaded files — any documents you attach to a brief or order.',
        'Usage basics — standard technical information needed to operate and secure the service.',
      ] },
      { h: 'How your data is stored' },
      { p: 'Account, brief and order data is stored in our Supabase backend. Access is controlled at the database level with row-level security so each role only sees the data it needs.' },
      { h: 'The three-lens access model' },
      { p: 'We deliberately isolate who can see what. Experts working on your brief never see your name or contact details — they see only the academic substance of the work. Clients never see expert payout data. Administrative staff see what is required to run the service. This separation is enforced in the database, not just by policy.' },
      { h: 'Third parties we rely on' },
      { ul: [
        'Supabase — database, authentication and file storage.',
        'Resend — transactional email (quotes, confirmations and account messages).',
        'Payment providers — to process deposits and balances through the methods we confirm with you.',
      ] },
      { p: 'These providers process data only to deliver their service to us. We do not sell your personal information.' },
      { h: 'How long we keep it' },
      { p: <>We retain account and order records for as long as your account is active and as needed to provide the service, then for <P>data-retention duration for account and order records</P>. Uploaded files are retained for <P>file-retention duration</P>. You can ask us to delete your data sooner, subject to any records we are legally required to keep.</> },
      { h: 'Your rights' },
      { p: 'You can request access to the personal data we hold about you, ask us to correct it, or ask us to delete it. To exercise any of these rights, contact us using the details below.' },
      { h: 'Contact' },
      { p: <>For any privacy question, or to exercise your rights, email {CONTACT_EMAIL}. Our data-protection contact is <P>DPO / data-protection contact name and email, if different from {CONTACT_EMAIL}</P>.</> },
    ],
  },

  refund: {
    title: 'Refund policy',
    lede: 'We stand behind our work. Our first commitment is to make a deliverable right; refunds exist for the cases where that is not possible.',
    blocks: [
      { h: 'Revision first' },
      { p: 'If a deliverable does not meet the scope and instructions we agreed, tell us. We will revise it until it matches the brief. Most concerns are resolved this way, and revisions within the agreed scope are part of every engagement.' },
      { h: 'When a refund applies' },
      { p: 'A refund may apply when a deliverable cannot be brought in line with the agreed scope through revision, or where we are unable to deliver the agreed work. Refunds are assessed against the original brief and the agreed scope, not against grades or outcomes, which we cannot guarantee.' },
      { h: 'The refund window' },
      { p: <>Refund requests must be made within <P>refund window — e.g. number of days after delivery</P>, and are subject to <P>any specific conditions or exclusions, e.g. for rush or fully-approved work</P>.</> },
      { h: 'How to request a refund' },
      { p: 'Start a request through the concierge or the contact channels on our Contact page. Tell us your order reference and what is wrong against the brief, and we will respond quickly with the next step — usually a revision plan or, where appropriate, a refund.' },
      { note: 'Deposits start the work and are applied to your engagement; any refund of a deposit is handled under the conditions above.' },
    ],
  },

  confidentiality: {
    title: 'Confidentiality',
    lede: 'Your identity and your work stay protected. Confidentiality is built into how our system is designed, not bolted on as a promise.',
    blocks: [
      { h: 'Your identity is protected by design' },
      { p: 'We use a role-based "lens" model enforced by database row-level security (RLS). The expert who completes your brief works from the academic content alone — they do not see your name, email or contact details. Your identity is never exposed to the people doing the work.' },
      { h: 'Careful file handling' },
      { p: 'Files you upload are stored securely and used only to scope and complete your specific brief. They are made available to the people working on your order and to no one else.' },
      { h: 'Expert confidentiality commitments' },
      { p: 'Every specialist works under a confidentiality commitment. Your brief, your materials and the fact that you engaged us are treated as private. Work is produced for you alone and is never reused or resold.' },
      { h: 'Data isolation between roles' },
      { p: 'The same separation that hides your identity from experts also hides commercial and payout data from clients, and keeps each account’s data isolated from every other account. These boundaries are enforced at the database level, so access is restricted by design rather than by trust.' },
      { note: 'Want to understand exactly how this works for your engagement? Ask the concierge — we’re happy to walk you through it.' },
    ],
  },
}

// ── PAGE ────────────────────────────────────────────────────────────────────────
export default function InfoPage({ page }) {
  const data = PAGES[page] || PAGES.contact

  useEffect(() => {
    try { window.scrollTo(0, 0) } catch {}
    document.title = `${data.title} | Meridian Studio`
  }, [data.title])

  return (
    <div className="ms ip">
      {/* NAV LOCKUP — logo + tagline, back-to-home, scope CTA */}
      <header className="nav scrolled ip-nav" role="banner">
        <div className="wrap nav-inner">
          <a href="/" className="brand" aria-label="Meridian Studio — home">
            <span className="mk" aria-hidden="true">M</span>
            <span className="wm">
              <span className="nm">Meridian Studio</span>
              <span className="tg">Academic Partners · Est. 2019</span>
            </span>
          </a>
          <div className="nav-spacer" />
          <a href="/" className="ip-back">{Ico.back()} Back to home</a>
          <a href="/#intake" className="btn btn-accent nav-cta">Scope my work {Ico.arrow()}</a>
        </div>
      </header>

      <main id="main" className="ip-main">
        <div className="wrap narrow ip-wrap">
          <a href="/" className="ip-back ip-back-top">{Ico.back()} Back to home</a>
          <h1 className="ip-title">{data.title}</h1>
          <p className="ip-updated">Last updated {LAST_UPDATED}</p>
          {data.lede && <p className="ip-lede">{data.lede}</p>}

          <article className="ip-body">
            {data.custom === 'contact'
              ? <ContactBody />
              : data.blocks.map((b, i) => <Block key={i} b={b} />)}
          </article>
        </div>
      </main>

      <InfoFooter />
    </div>
  )
}

// ── CONTACT BODY (functional channels) ───────────────────────────────────────────
function ContactBody() {
  return (
    <>
      <div className="ip-contact-grid">
        <div className="ip-contact-card">
          <span className="ip-cc-ic" aria-hidden="true">{Ico.spark()}</span>
          <h3>Ask Meridian</h3>
          <p>Our concierge can scope your assignment, answer questions and start a brief — the fastest way to get going.</p>
          <button type="button" className="btn btn-ink" onClick={openConcierge}>{Ico.spark()} Open the concierge</button>
        </div>
        <div className="ip-contact-card">
          <span className="ip-cc-ic" aria-hidden="true">{Ico.wa()}</span>
          <h3>WhatsApp</h3>
          <p>Prefer to chat? Message us on WhatsApp and a real person will reply.</p>
          <a className="btn btn-ink" href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noreferrer">{Ico.wa()} Chat on WhatsApp</a>
        </div>
        <div className="ip-contact-card">
          <span className="ip-cc-ic" aria-hidden="true">{Ico.mail()}</span>
          <h3>Email</h3>
          <p>For anything detailed, email us and we'll follow up with everything you need.</p>
          <a className="btn btn-ink" href={`mailto:${CONTACT_EMAIL}`}>{Ico.mail()} {CONTACT_EMAIL}</a>
        </div>
      </div>
      <p className="ip-note">Typical response time: within a few hours during the day, and always within 24 hours. For active briefs, your assigned expert and the concierge are the quickest routes.</p>
    </>
  )
}

// ── FOOTER (mirrors the homepage footer, links to the info routes) ───────────────
const FOOT_COLS = [
  { head: 'Product', links: [
    ['/#how', 'How it works'],
    ['/#coverage', 'Pricing'],
    ['/#experts', 'Meet the experts'],
    ['/#apply', 'Become an expert'],
  ] },
  { head: 'Company', links: [
    ['/getting-started', 'About'],
    ['/integrity', 'Integrity policy'],
    ['/contact', 'Contact'],
    ['/#apply', 'Careers'],
  ] },
  { head: 'Legal', links: [
    ['/terms', 'Terms'],
    ['/privacy', 'Privacy'],
    ['/refund', 'Refund policy'],
    ['/confidentiality', 'Confidentiality'],
  ] },
]

function InfoFooter() {
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
                <li key={l}><a href={h}>{l}</a></li>
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
