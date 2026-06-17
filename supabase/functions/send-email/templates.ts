// templates.ts — Meridian transactional email templates, ported from the design
// reference design_handoff_emails/emails.js. Email-safe (table layout, inline
// styles, web-safe font fallbacks). Sample values are replaced with merge vars.
//
// Each entry: { audience, subject(d), html(d), recipient(d), dedupeKey?(d) }.

const C = {
  paper: "#FBFAF7", paper2: "#F4F1EA", line: "#E4DCCF", ink: "#211A14",
  inkSoft: "#4A4036", muted: "#6E6357", faint: "#938878", accent: "#BD5A33",
  accentDeep: "#9E4825", good: "#3F6B4E",
};
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,500;0,600;1,500&family=Hanken+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">';
const SERIF = "'Newsreader',Georgia,'Times New Roman',serif";
const SANS = "'Hanken Grotesk',Arial,Helvetica,sans-serif";

type Data = Record<string, unknown>;
const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n: unknown) =>
  n == null || n === "" ? "—"
    : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: unknown) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  return isNaN(+dt) ? esc(d) : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function btn(label: string, url: string) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr>'
    + '<td style="background:' + C.accent + ';border-radius:999px;">'
    + '<a href="' + (url || "#") + '" style="display:inline-block;padding:14px 32px;font-family:' + SANS + ';font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">' + label + ' &rarr;</a>'
    + "</td></tr></table>";
}
function btn2(label: string, url: string) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr>'
    + '<td style="border:1.5px solid ' + C.line + ';border-radius:999px;">'
    + '<a href="' + (url || "#") + '" style="display:inline-block;padding:12px 28px;font-family:' + SANS + ';font-size:14px;font-weight:700;color:' + C.ink + ';text-decoration:none;border-radius:999px;">' + label + '</a>'
    + "</td></tr></table>";
}
function detail(rows: Array<[string, string, string?]>, opts: { title?: string } = {}) {
  const body = rows.map((r) => {
    const hl = r[2] === "hl";
    return "<tr>"
      + '<td style="font-family:' + SANS + ";font-size:13px;color:" + C.muted + ";padding:7px 0;border-bottom:1px solid " + C.line + ';">' + r[0] + "</td>"
      + '<td align="right" style="font-family:' + (hl ? SERIF : SANS) + ";font-size:" + (hl ? "18px" : "13.5px") + ";color:" + (hl ? C.accentDeep : C.ink) + ";font-weight:" + (hl ? "500" : "700") + ";padding:7px 0;border-bottom:1px solid " + C.line + ';">' + r[1] + "</td>"
      + "</tr>";
  }).join("");
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;background:' + C.paper2 + ";border:1px solid " + C.line + ';border-radius:12px;">'
    + '<tr><td style="padding:8px 18px;">' + (opts.title ? '<div style="font-family:' + SANS + ";font-size:10px;letter-spacing:2px;text-transform:uppercase;color:" + C.faint + ';padding:8px 0 2px;font-weight:700;">' + opts.title + "</div>" : "")
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' + body + "</table></td></tr></table>";
}

interface Shell {
  subject: string; preheader?: string; kicker?: string; eyebrow?: string;
  title: string; body: string; cta?: string; ctaUrl?: string; note?: string;
  cta2?: string; ctaUrl2?: string; footer?: string; internal?: boolean;
}
function shell(o: Shell) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only">' + FONTS
    + "<title>" + o.subject + "</title></head>"
    + '<body style="margin:0;padding:0;background:' + C.paper2 + ';-webkit-font-smoothing:antialiased;">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + C.paper2 + ';">' + (o.preheader || "") + "</div>"
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.paper2 + ';padding:30px 12px;"><tr><td align="center">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:' + C.paper + ";border:1px solid " + C.line + ';border-radius:16px;overflow:hidden;">'
    + '<tr><td style="background:' + C.ink + ';padding:20px 30px;">'
    + '<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
    + '<td style="padding-right:13px;vertical-align:middle;"><div style="width:40px;height:40px;background:' + C.accent + ';border-radius:9px;text-align:center;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;line-height:40px;">M</div></td>'
    + '<td style="vertical-align:middle;"><div style="font-family:' + SERIF + ';font-size:20px;color:#fff;line-height:1;">Meridian Studio</div>'
    + '<div style="font-family:' + SANS + ';font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(246,241,233,.6);margin-top:4px;">' + (o.kicker || "Academic support") + "</div></td>"
    + "</tr></table></td></tr>"
    + '<tr><td style="padding:36px 36px 4px;">'
    + (o.eyebrow ? '<div style="font-family:' + SANS + ";font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:" + C.accent + ';font-weight:700;margin-bottom:14px;">' + o.eyebrow + "</div>" : "")
    + '<h1 style="margin:0;font-family:' + SERIF + ";font-weight:500;font-size:30px;line-height:1.12;letter-spacing:-0.5px;color:" + C.ink + ';">' + o.title + "</h1>"
    + '<div style="font-family:' + SANS + ";font-size:15px;line-height:1.65;color:" + C.inkSoft + ';margin-top:16px;">' + o.body + "</div>"
    + (o.cta ? btn(o.cta, o.ctaUrl || "#") : "")
    + (o.cta2 ? btn2(o.cta2, o.ctaUrl2 || "#") : "")
    + (o.note ? '<div style="font-family:' + SERIF + ";font-style:italic;font-size:14px;color:" + C.muted + ';line-height:1.5;margin-top:14px;">' + o.note + "</div>" : "")
    + "</td></tr>"
    + '<tr><td style="padding:30px 36px 28px;"><div style="border-top:1px solid ' + C.line + ";padding-top:18px;font-family:" + SANS + ";font-size:12px;line-height:1.6;color:" + C.faint + ';">'
    + (o.footer || "Meridian Studio — confidential academic support.")
    + '<div style="margin-top:10px;"><a href="https://wa.me/12057279363" style="color:' + C.accent + ';text-decoration:none;font-weight:600;">Message us on WhatsApp</a>' + (o.internal ? "" : ' &nbsp;·&nbsp; <a href="https://primemeridian.academy/workspace" style="color:' + C.faint + ';text-decoration:underline;">Manage email preferences</a>') + "</div>"
    + "</div></td></tr>"
    + "</table>"
    + '<div style="font-family:' + SANS + ';font-size:11px;color:#A89E90;margin-top:16px;">&copy; 2026 Meridian Studio &nbsp;·&nbsp; Academic partners, est. 2019</div>'
    + "</td></tr></table></body></html>";
}

const STUDENT = "Meridian Studio — confidential academic support. You're receiving this because you have an account or order with us.";
const EXPERT = "You're receiving this as a verified Meridian expert. Student identities are always anonymized.";
const INTERNAL = "Internal notification · Meridian Studio admin.";

export interface Template {
  audience: "student" | "expert" | "system";
  subject: (d: Data) => string;
  html: (d: Data) => string;
  recipient: (d: Data) => string;
  dedupeKey?: (d: Data) => string;
}

export const TEMPLATES: Record<string, Template> = {
  magiclink: {
    audience: "student",
    recipient: (d) => String(d.to ?? ""),
    subject: () => "Your Meridian sign-in link",
    html: (d) => shell({
      subject: "Your sign-in link", kicker: "Secure sign-in", eyebrow: "Sign in",
      preheader: "Tap to sign in — expires in 15 minutes.",
      title: "Here's your secure link.",
      body: "Hi " + esc(d.first_name || "there") + " — tap below to sign in to your Meridian workspace. No password needed; this link works once and expires in 15 minutes.",
      cta: "Sign in to Meridian", ctaUrl: String(d.magic_link || "#"),
      note: "Didn't request this? You can safely ignore this email — your account stays secure.",
      footer: STUDENT,
    }),
  },

  revision_requested: {
    audience: "expert",
    recipient: (d) => String(d.to ?? ""),
    subject: (d) => "Revision requested — " + esc(d.ref),
    html: (d) => shell({
      subject: "Revision requested", kicker: "For experts", eyebrow: "Action needed",
      preheader: "A submission needs a revision before it reaches the student.",
      title: "A revision is requested.",
      body: "Your submission for <b>" + esc(d.ref) + "</b> has been sent back for revision after QC review."
        + (d.note ? "<br><br><b>Feedback from the team:</b><br>" + esc(d.note) : "")
        + "<br><br>Open the assignment, make the changes, and re-submit for review. The student only ever receives approved work — nothing reaches them until QC signs off.",
      cta: "Open the assignment", ctaUrl: "https://primemeridian.academy/expert",
      note: "Questions on the feedback? Message the team right from your workspace.",
      footer: EXPERT,
    }),
  },

  writer_welcome: {
    audience: "expert",
    recipient: (d) => String(d.to ?? ""),
    subject: () => "Welcome to the Meridian expert team",
    html: (d) => shell({
      subject: "Welcome to Meridian", kicker: "For experts", eyebrow: "You're in",
      preheader: "Your expert workspace is ready — sign in to get started.",
      title: "Welcome to the team" + (d.first_name ? ", " + esc(d.first_name) : "") + ".",
      body: "Your application has been approved and your Meridian expert workspace is ready. Sign in to set up your profile, set your availability, and start receiving assignments matched to your field."
        + "<br><br>Use the temporary password from your onboarding email to sign in, then set your own. Add your specialties and payout details in your profile so we can match you with the right work.",
      cta: "Open your expert workspace", ctaUrl: "https://primemeridian.academy/expert",
      note: "Welcome aboard — we're glad to have your expertise on the team.",
      footer: EXPERT,
    }),
  },

  admin_password_reset: {
    audience: "student",
    recipient: (d) => String(d.to ?? ""),
    subject: () => "Reset your Meridian admin password",
    html: (d) => shell({
      subject: "Reset your admin password", kicker: "Admin access", eyebrow: "Password reset",
      preheader: "Set a new password for the Meridian admin panel.",
      title: "Reset your password.",
      body: "We received a request to reset the password for your Meridian <b>admin</b> account. Tap below to choose a new one — it opens the admin panel's set-password screen, and the link expires within the hour.",
      cta: "Set a new password", ctaUrl: String(d.reset_url || "#"),
      note: "Didn't request this? You can safely ignore this email — your account stays secure.",
      footer: INTERNAL, internal: true,
    }),
  },

  brief_received: {
    audience: "student",
    recipient: (d) => String(d.to ?? ""),
    subject: (d) => "We've got your order — " + esc(d.ref),
    html: (d) => shell({
      subject: "We've got your order", kicker: "Academic support", eyebrow: "Order received",
      preheader: "We're assigning your expert. Your invoice lands within 30 min – 2 hrs.",
      title: "We've got your order.",
      body: "Thanks, " + esc(d.first_name || "there") + ". We're assigning a degree-holding expert in your field right now — your fixed, no-surprises invoice will land within 30 minutes to 2 hours. Support starts from $14/page; we'll confirm your exact price before any work begins."
        + detail([["Reference", esc(d.ref)], ["Discipline", esc(d.discipline)], ["Scope", esc(d.scope)], ["Length", "~" + esc(d.pages) + " pages"]], { title: "Your brief" }),
      cta: "Track it in your workspace", ctaUrl: String(d.portal_url || "#"),
      note: "We'll never start work — or charge a cent — until you approve your quote.",
      footer: STUDENT,
    }),
  },

  quote_ready: {
    audience: "student",
    recipient: (d) => String(d.to ?? ""),
    dedupeKey: (d) => "quote:" + d.order_id,
    subject: (d) => "Your quote is ready — " + esc(d.ref),
    html: (d) => shell({
      subject: "Your quote is ready", kicker: "Academic support", eyebrow: "Your quote",
      preheader: "Approve your deposit to begin. Balance due only on delivery.",
      title: "Your quote is ready.",
      body: "We've scoped your brief against your rubric — here's your fixed price. A 50% deposit starts the work; the balance is due only once you're happy on delivery."
        + detail([["Reference", esc(d.ref)], ["Delivery", "Before " + fmtDate(d.due_date)], ["Total", money(d.total)], ["Deposit to begin (50%)", money(d.deposit), "hl"]]),
      cta: "Approve &amp; pay deposit", ctaUrl: String(d.pay_url || "#"),
      note: "Questions on the quote first? Just reply or message us on WhatsApp.",
      footer: STUDENT,
    }),
  },

  expert_assigned: {
    audience: "student",
    recipient: (d) => String(d.to ?? ""),
    subject: (d) => "Meet your expert for " + esc(d.ref),
    html: (d) => shell({
      subject: "Meet your expert", kicker: "Academic support", eyebrow: "You've been matched",
      preheader: "You've been matched — and they'll stay with you.",
      title: "Meet your expert.",
      body: "Good news, " + esc(d.first_name || "there") + " — your work is in expert hands. <b style=\"color:#211A14;\">" + esc(d.expert_name) + "</b> (" + esc(d.expert_field) + ") will support this project, and the same expert stays with you start to finish. Say hello any time in your order thread."
        + detail([["Expert", esc(d.expert_name)], ["Field", esc(d.expert_field)], ["Your order", esc(d.ref)]]),
      cta: "Open the conversation", ctaUrl: String(d.thread_url || "#"),
      footer: STUDENT,
    }),
  },

  delivered: {
    audience: "student",
    recipient: (d) => String(d.to ?? ""),
    dedupeKey: (d) => "delivered:" + d.order_id,
    subject: (d) => "Your work is ready — " + esc(d.ref),
    html: (d) => {
      const list = (Array.isArray(d.files) ? d.files : []) as Array<{ name?: string; kind?: string }>;
      const kindLabel = (k?: string) =>
        k === "final" ? "Final document" : k === "ai_report" ? "AI-detection report"
          : k === "plag_report" ? "Originality report" : "Document";
      const rows: Array<[string, string, string?]> = list.length
        ? list.map((f) => [esc(f.name), kindLabel(f.kind)] as [string, string])
        : [["In this package", "Final · AI report · Originality report"]];
      return shell({
        subject: "Your work is ready", kicker: "Academic support", eyebrow: "Delivered",
        preheader: "Your completed work is ready to download in your workspace.",
        title: "Your work is ready" + (d.first_name ? ", " + esc(d.first_name) : "") + ".",
        body: "Your expert has delivered, ahead of deadline. For your privacy and security, your completed work — together with the AI-detection and originality reports — is kept in your workspace, not attached to this email. Log in to review and download everything, and submit with total confidence."
          + detail(rows, { title: "Ready in your workspace" })
          + detail([["Reference", esc(d.ref)], ["Balance due", money(d.balance), "hl"]])
          + (d.temp_password
              ? detail([["Workspace", "primemeridian.academy/workspace"], ["Email", esc(d.login_email || d.to)], ["Temporary password", esc(d.temp_password)]], { title: "Your login" })
                + '<div style="font-family:' + SANS + ";font-size:13px;line-height:1.6;color:" + C.muted + ';margin-top:10px;">These details are just for you — sign in with them, then set your own password from your profile. The button below takes you straight there.</div>'
              : ""),
        cta: "Log in to download your files", ctaUrl: String(d.review_url || "https://primemeridian.academy/workspace"),
        note: "Not quite right? Revisions within scope are always free — just message your expert.",
        footer: STUDENT,
      });
    },
  },

  application_received: {
    audience: "expert",
    recipient: (d) => String(d.to ?? ""),
    subject: () => "Your application to write with Meridian",
    html: (d) => shell({
      subject: "Application received", kicker: "For experts", eyebrow: "Application received",
      preheader: "Received — we'll reach out on WhatsApp within 48 hours.",
      title: "Thanks for applying.",
      body: "We've received your application to join Meridian's expert network" + (d.field ? " in " + esc(d.field) : "") + ". Our team reviews credentials, field expertise, and citation proficiency by hand — fewer than 1 in 9 make it through. We'll reach out on WhatsApp within 48 hours.",
      note: "In the meantime, have your degree verification and a writing sample ready.",
      footer: EXPERT,
    }),
  },

  assignment_offer: {
    audience: "expert",
    recipient: (d) => String(d.to ?? ""),
    subject: () => "New assignment offer — matched to you",
    html: (d) => shell({
      subject: "A new assignment for you", kicker: "For experts", eyebrow: "New assignment",
      preheader: "Anonymized brief, matched to your field.",
      title: "A new assignment for you.",
      body: "We've matched a brief to your specialties. The student is anonymized — you'll see everything you need to do the work, never their identity."
        + detail([["Student", esc(d.client_code)], ["Discipline", esc(d.discipline)], ["Level", esc(d.level)], ["Deadline", fmtDate(d.deadline)], ["You earn", money(d.pay), "hl"]]),
      cta: "View &amp; accept", ctaUrl: String(d.accept_url || "#"),
      footer: EXPERT,
    }),
  },

  payout: {
    audience: "expert",
    recipient: (d) => String(d.to ?? ""),
    dedupeKey: (d) => "payout:" + d.payout_id,
    subject: () => "You've been paid",
    html: (d) => shell({
      subject: "You've been paid", kicker: "For experts", eyebrow: "Payout",
      preheader: "Your payout is on its way.",
      title: "You've been paid.",
      body: "Your payout has been sent — nice work. Here are the details for your records."
        + detail([["Amount", money(d.amount), "hl"], ["Period", esc(d.period || "—")], ["Method", esc(d.method || "—")]]),
      cta: "View earnings", ctaUrl: "https://primemeridian.academy/expert",
      footer: EXPERT,
    }),
  },

  // Admin invited this expert to an order — they confirm or decline in the portal.
  expert_invitation: {
    audience: "expert",
    recipient: (d) => String(d.to ?? ""),
    subject: (d) => "You're invited to an assignment — " + esc(d.client_code || ""),
    html: (d) => shell({
      subject: "An invitation for you", kicker: "For experts", eyebrow: "Invitation",
      preheader: "A new assignment has been matched to you — confirm or decline.",
      title: "You've been invited to an assignment.",
      body: "The Meridian team picked you for a new brief. The student is anonymized — review the details and confirm if you can take it on. If you can't, just decline and we'll reassign; the student is never told either way."
        + detail([["Student", esc(d.client_code)], ["Discipline", esc(d.discipline)], ["Level", esc(d.level)], ["Deadline", fmtDate(d.deadline)], ["You earn", money(d.pay), "hl"]]),
      cta: "Confirm or decline", ctaUrl: String(d.accept_url || "https://primemeridian.academy/expert"),
      note: "Confirming starts the clock and lets the student know work has begun. No reply needed if you pass.",
      footer: EXPERT,
    }),
  },

  // Expert confirmed an invitation — reassure the client that work has started.
  work_started: {
    audience: "student",
    recipient: (d) => String(d.to ?? ""),
    subject: (d) => "Work has begun on your order — " + esc(d.ref),
    html: (d) => shell({
      subject: "Work has begun", kicker: "Academic support", eyebrow: "In progress",
      preheader: "Your expert has confirmed and started work on your order.",
      title: "Work has begun" + (d.first_name ? ", " + esc(d.first_name) : "") + ".",
      body: "Good news — your expert has confirmed your assignment and started work. "
        + (d.expert_name ? "<b style=\"color:#211A14;\">" + esc(d.expert_name) + "</b> stays with you from here to delivery. " : "")
        + "You can message them any time in your order thread, and we'll email you the moment your work is ready."
        + detail([["Your order", esc(d.ref)], ["Expert", esc(d.expert_name || "Assigned")], ["Status", "In progress"]]),
      cta: "Open your workspace", ctaUrl: String(d.thread_url || "https://primemeridian.academy/workspace"),
      footer: STUDENT,
    }),
  },

  // An invited expert declined — internal-only nudge to reassign. Client never sees this.
  assignment_rejected: {
    audience: "system",
    recipient: (d) => String(d.to ?? Deno.env.get("ADMIN_ALERT_TO") ?? ""),
    subject: (d) => "Expert declined — reassign " + esc(d.ref),
    html: (d) => shell({
      subject: "Expert declined", kicker: "Studio admin", eyebrow: "Needs reassignment", internal: true,
      preheader: "An invited expert declined — pick another to keep things moving.",
      title: "An expert declined an assignment.",
      body: esc(d.expert_name || "An expert") + " declined the invitation for this order. The student has <b>not</b> been notified. Open the order and invite another expert."
        + detail([["Reference", esc(d.ref)], ["Discipline", esc(d.program)], ["Level", esc(d.level)], ["Deadline", fmtDate(d.due_date)]]),
      cta: "Reassign in admin", ctaUrl: String(d.admin_url || "https://primemeridian.academy/admin"),
      footer: INTERNAL,
    }),
  },

  new_brief_alert: {
    audience: "system",
    recipient: (d) => String(d.to ?? Deno.env.get("ADMIN_ALERT_TO") ?? ""),
    subject: (d) => "🔔 New brief — " + esc(d.ref),
    html: (d) => shell({
      subject: "New brief", kicker: "Studio admin", eyebrow: "Needs assignment", internal: true,
      preheader: "A new brief needs an expert assigned.",
      title: "New brief just landed.",
      body: "A student submitted a brief and it's waiting for an expert. Review the rubric and assign a specialist to start the clock."
        + detail([["Reference", esc(d.ref)], ["Client", esc(d.client)], ["Discipline", esc(d.discipline)], ["Scope", esc(d.scope)], ["Deadline", esc(d.deadline)]]),
      cta: "Open in admin", ctaUrl: String(d.admin_url || "#"),
      footer: INTERNAL,
    }),
  },
};
