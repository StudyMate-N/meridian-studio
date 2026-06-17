// SERVER ONLY — never import in client-side components.
// Branded transactional email templates (Atelier system) for the payments flow.
// Visual design + copy are from the vendor handoff (files (6).zip) and preserved
// verbatim; the only adaptation is that method names are passed as `methodLabel`
// strings rather than looked up from a fixed enum, so the live method keys
// (westernUnion / taptap / skrill / wise / payoneer …) all work.
//
// All templates return { subject, htmlBody, textBody }. Send both parts.

export type EmailTemplate = { subject: string; htmlBody: string; textBody: string };
type Row = { key: string; value: string };

// ─────────────────────────────────────────────────────────────────────────────
// SHARED — HTML EMAIL SHELL (Atelier brand system)
// Colors: parchment #f7f4ee · terracotta #b05a38 · ink #2c2825 · dark #1a1614
// Type: Playfair Display (headings) · Source Serif 4 (body) · DM Mono (labels)
// ─────────────────────────────────────────────────────────────────────────────
function emailShell(contentHtml: string, footerNote = "This is a transactional email from Meridian Studio."): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;1,300&family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background-color:#f0ede6;font-family:'Source Serif 4',Georgia,serif;font-weight:300;color:#2c2825;-webkit-font-smoothing:antialiased}
    .ew{max-width:620px;margin:0 auto;padding:32px 16px 48px}
    .hd{background-color:#1a1614;padding:28px 36px 24px;border-radius:2px 2px 0 0}
    .hd-meta{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.18em;color:#9a8e82;text-transform:uppercase;margin-bottom:12px}
    .hd-logo{font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:600;color:#f7f4ee;letter-spacing:.04em}
    .hd-logo span{color:#c87941}
    .hd-tag{font-family:'DM Mono',monospace;font-size:8.5px;letter-spacing:.22em;color:#6b5f55;text-transform:uppercase;margin-top:5px}
    .card{background-color:#f7f4ee;border-left:3px solid #b05a38;border-radius:0 0 2px 2px}
    .bp{padding:28px 36px}
    .ft{background-color:#1a1614;padding:18px 36px;border-radius:0 0 2px 2px}
    .ft-brand{font-family:'Playfair Display',Georgia,serif;font-size:12px;color:#f7f4ee;margin-bottom:4px}
    .ft-contact{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.08em;color:#6b5f55;line-height:1.8}
    .ft-contact a{color:#9a8e82;text-decoration:none}
    .ft-div{border:none;border-top:1px solid #2e2825;margin:14px 0}
    .ft-disc{font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.06em;color:#4a3f37;line-height:1.7}
    @media(max-width:480px){.bp{padding:20px}.hd{padding:20px}.ft{padding:16px 20px}}
  </style>
</head>
<body>
<div class="ew">
  <div class="hd">
    <div class="hd-meta">Meridian Studio · Academic Coaching &amp; Study Support</div>
    <div class="hd-logo">M<span>·</span>S</div>
    <div class="hd-tag">Transactional Notice</div>
  </div>
  <div class="card">
    <div class="bp">${contentHtml}</div>
    <div class="ft">
      <div class="ft-brand">Meridian Studio</div>
      <div class="ft-contact">
        <a href="mailto:billing@primemeridian.academy">billing@primemeridian.academy</a><br />
        <a href="https://primemeridian.academy">primemeridian.academy</a>
      </div>
      <hr class="ft-div" />
      <div class="ft-disc">${footerNote}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

function invoiceBand(invoiceNumber: string, issuedDate: string, totalDue: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eee9e0;border-radius:2px;margin-bottom:24px">
      <tr>
        <td style="padding:20px 0 18px">
          <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#9a8e82;margin-bottom:3px">Invoice</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:600;color:#2c2825">${invoiceNumber}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:#9a8e82;margin-top:5px;letter-spacing:.06em">Issued ${issuedDate} · Due on receipt</div>
        </td>
        <td style="padding:20px 0 18px;text-align:right">
          <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#9a8e82;margin-bottom:3px">Amount Due</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:600;color:#b05a38">${totalDue}</div>
        </td>
      </tr>
    </table>`;
}

function paymentRowsTable(rows: Row[]): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:22px">
      ${rows.map(r => `
        <tr>
          <td style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.06em;color:#9a8e82;text-transform:uppercase;width:38%;padding:7px 12px 7px 0;border-bottom:1px solid #ece7de;vertical-align:top">${r.key}</td>
          <td style="font-family:'Source Serif 4',Georgia,serif;font-weight:400;color:#2c2825;font-size:13.5px;padding:7px 0;border-bottom:1px solid #ece7de;vertical-align:top">${r.value}</td>
        </tr>`).join('')}
    </table>`;
}

function calloutBlock(label: string, bodyHtml: string): string {
  return `
    <div style="background:#f2ede4;border-left:2px solid #c87941;padding:14px 16px;margin-bottom:22px;border-radius:0 2px 2px 0">
      <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#c87941;margin-bottom:7px">${label}</div>
      <div style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;font-weight:300;color:#2c2825;line-height:1.7">${bodyHtml}</div>
    </div>`;
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '');

// ═════════════════════════════════════════════════════════════════════════════
// 1A. DIRECT PAYMENT DETAILS — western_union | mpesa | sendwave | taptap | skrill
// ═════════════════════════════════════════════════════════════════════════════
export function DIRECT_PAYMENT_DETAILS_EMAIL(params: {
  firstName: string; invoiceNumber: string; totalDue: string; issuedDate: string;
  methodLabel: string; paymentRows: Row[];
}): EmailTemplate {
  const content = `
    ${invoiceBand(params.invoiceNumber, params.issuedDate, params.totalDue)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:300;color:#2c2825;margin-bottom:10px;line-height:1.6">Hi ${params.firstName},</p>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13.5px;font-weight:300;color:#4a3f37;line-height:1.7;margin-bottom:24px">
      Here are your payment details for invoice <strong>${params.invoiceNumber}</strong>.
      Please review and send payment at your earliest convenience.
    </p>
    <hr style="border:none;border-top:1px solid #ddd6cc;margin-bottom:22px" />
    <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#b05a38;margin-bottom:14px">Payment Method · ${params.methodLabel}</div>
    ${paymentRowsTable(params.paymentRows)}
    <div style="background:#eee9e0;border:1px solid #ddd6cc;border-radius:2px;padding:14px 18px;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#9a8e82;margin-bottom:5px">Payment Reference</div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:600;color:#2c2825;letter-spacing:.03em">${params.invoiceNumber}</div>
      <div style="font-family:'Source Serif 4',Georgia,serif;font-size:12px;color:#6b5f55;margin-top:5px;font-style:italic">Include this reference number when sending payment.</div>
    </div>
    ${calloutBlock('After Sending', `
      Return to your <strong>Meridian Studio portal</strong> and click
      <strong style="color:#1a1614">"I've sent payment"</strong> to notify us.
      We'll verify and confirm your order within a few hours.
    `)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;font-weight:300;color:#6b5f55;line-height:1.7;font-style:italic">
      If you have any questions, reply to this email or message us through the portal.
    </p>`;

  const textBody = `Hi ${params.firstName},

Here are your payment details for invoice ${params.invoiceNumber} (${params.totalDue}).

PAYMENT METHOD: ${params.methodLabel}

${params.paymentRows.map(r => `${r.key.padEnd(20)} ${stripTags(r.value)}`).join('\n')}

REFERENCE: ${params.invoiceNumber}
Please include this reference when sending payment.

Once you've sent payment, return to your Meridian Studio portal and click
"I've sent payment" to notify us. We'll verify and confirm within a few hours.

— Meridian Studio
billing@primemeridian.academy`;

  return {
    subject: `Payment details for invoice ${params.invoiceNumber} — Meridian Studio`,
    htmlBody: emailShell(content, `This is a transactional email sent in connection with your active order at Meridian Studio. You requested payment details for invoice ${params.invoiceNumber}. Do not share your payment reference or personal details with third parties.`),
    textBody,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1B. INDIRECT — ADMIN ACTION REQUIRED (wise | payoneer)
// ═════════════════════════════════════════════════════════════════════════════
export function ADMIN_INDIRECT_PAYMENT_REQUIRED_EMAIL(params: {
  clientName: string; clientEmail: string; invoiceNumber: string; totalDue: string;
  issuedDate: string; methodLabel: string; orderSubject: string; dashboardUrl: string;
}): EmailTemplate {
  const rows: Row[] = [
    { key: 'Client', value: params.clientName },
    { key: 'Client Email', value: params.clientEmail },
    { key: 'Invoice', value: params.invoiceNumber },
    { key: 'Amount', value: params.totalDue },
    { key: 'Method', value: params.methodLabel },
    { key: 'Order', value: params.orderSubject },
    { key: 'Issued', value: params.issuedDate },
  ];
  const content = `
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:400;color:#2c2825;margin-bottom:20px;line-height:1.6">
      <strong>${params.clientName}</strong> has selected <strong>${params.methodLabel}</strong> as their payment method for invoice <strong>${params.invoiceNumber}</strong>.
      A payment link must be generated manually before the client can proceed.
    </p>
    ${paymentRowsTable(rows)}
    ${calloutBlock('Action Required', `
      <ol style="margin:0;padding-left:18px;line-height:2">
        <li>Open <strong>${params.methodLabel}</strong> and create a payment request for <strong>${params.totalDue}</strong>.</li>
        <li>Copy the payment link generated by ${params.methodLabel}.</li>
        <li>Return to the <a href="${params.dashboardUrl}" style="color:#b05a38;text-decoration:underline">Admin Dashboard</a> for invoice ${params.invoiceNumber}.</li>
        <li>Paste the link into <strong>"Send payment link"</strong> and submit.</li>
        <li>The system will automatically forward the link to <strong>${params.clientEmail}</strong>.</li>
      </ol>
    `)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:12px;font-weight:300;color:#9a8e82;line-height:1.7;font-style:italic">
      The client has been informed their payment details are being prepared. Do not send the link directly — paste it through the dashboard so the system can log and track it.
    </p>`;

  const textBody = `${params.clientName} has selected ${params.methodLabel} for invoice ${params.invoiceNumber} (${params.totalDue}).

Client:  ${params.clientName} <${params.clientEmail}>
Invoice: ${params.invoiceNumber}
Amount:  ${params.totalDue}
Method:  ${params.methodLabel}
Order:   ${params.orderSubject}

ACTION REQUIRED
1. Open ${params.methodLabel} and create a payment request for ${params.totalDue}.
2. Copy the payment link.
3. Go to the Admin Dashboard for invoice ${params.invoiceNumber}: ${params.dashboardUrl}
4. Paste the link into "Send payment link" and submit.
5. The system forwards it to ${params.clientEmail} automatically.

— Meridian Studio System`;

  return {
    subject: `Action required — ${params.methodLabel} payment link needed · ${params.invoiceNumber}`,
    htmlBody: emailShell(content, `Internal admin notification. Invoice ${params.invoiceNumber} is awaiting a ${params.methodLabel} payment link.`),
    textBody,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1B-HOLD. CLIENT HOLDING EMAIL — indirect method selected (wise | payoneer)
// ═════════════════════════════════════════════════════════════════════════════
export function CLIENT_PAYMENT_LINK_PENDING_EMAIL(params: {
  firstName: string; invoiceNumber: string; totalDue: string; issuedDate: string; methodLabel: string;
}): EmailTemplate {
  const content = `
    ${invoiceBand(params.invoiceNumber, params.issuedDate, params.totalDue)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:300;color:#2c2825;margin-bottom:10px;line-height:1.6">Hi ${params.firstName},</p>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13.5px;font-weight:300;color:#4a3f37;line-height:1.7;margin-bottom:24px">
      We've received your request to pay invoice <strong>${params.invoiceNumber}</strong> via <strong>${params.methodLabel}</strong>.
      Our team is preparing your payment link and will send it to you shortly — typically within a few hours.
    </p>
    <hr style="border:none;border-top:1px solid #ddd6cc;margin-bottom:22px" />
    ${calloutBlock('What to Expect', `
      You'll receive a follow-up email with your <strong>${params.methodLabel} payment link</strong>.
      Once you receive it, simply open the link and complete payment directly on the ${params.methodLabel} platform.
      No reference number is needed — the link is pre-filled with your invoice amount.
    `)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;font-weight:300;color:#6b5f55;line-height:1.7;font-style:italic">
      If you haven't received your payment link within 24 hours, reply to this email and we'll sort it out right away.
    </p>`;

  const textBody = `Hi ${params.firstName},

We've received your request to pay invoice ${params.invoiceNumber} (${params.totalDue}) via ${params.methodLabel}.

Our team is preparing your payment link and will send it shortly — typically within a few hours.
You'll get a follow-up email with the ${params.methodLabel} link; just open it and pay (the amount is pre-filled).

If you haven't received it within 24 hours, reply to this email.

— Meridian Studio
billing@primemeridian.academy`;

  return {
    subject: `Your ${params.methodLabel} payment link is being prepared — ${params.invoiceNumber}`,
    htmlBody: emailShell(content, `This is a transactional email for invoice ${params.invoiceNumber} at Meridian Studio.`),
    textBody,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1C. INDIRECT PAYMENT LINK DELIVERY (admin pasted the platform link)
// ═════════════════════════════════════════════════════════════════════════════
export function INDIRECT_PAYMENT_LINK_EMAIL(params: {
  firstName: string; invoiceNumber: string; totalDue: string; issuedDate: string;
  methodLabel: string; paymentLinkUrl: string; linkExpiresAt?: string;
}): EmailTemplate {
  const expiryNote = params.linkExpiresAt
    ? `<br /><span style="color:#9a8e82;font-size:11px">This link expires on ${params.linkExpiresAt}.</span>` : '';
  const content = `
    ${invoiceBand(params.invoiceNumber, params.issuedDate, params.totalDue)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:300;color:#2c2825;margin-bottom:10px;line-height:1.6">Hi ${params.firstName},</p>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13.5px;font-weight:300;color:#4a3f37;line-height:1.7;margin-bottom:24px">
      Your <strong>${params.methodLabel}</strong> payment link for invoice <strong>${params.invoiceNumber}</strong> is ready.
      Click the button below to complete your payment of <strong>${params.totalDue}</strong> directly on ${params.methodLabel}.
    </p>
    <hr style="border:none;border-top:1px solid #ddd6cc;margin-bottom:22px" />
    <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#b05a38;margin-bottom:16px">Payment Method · ${params.methodLabel}</div>
    <div style="text-align:center;margin-bottom:8px">
      <a href="${params.paymentLinkUrl}" style="display:inline-block;background-color:#1a1614;color:#f7f4ee;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:2px">Pay ${params.totalDue} via ${params.methodLabel} →</a>
    </div>
    <div style="text-align:center;margin-bottom:24px;font-family:'DM Mono',monospace;font-size:9px;color:#9a8e82;letter-spacing:.04em">${params.paymentLinkUrl}${expiryNote}</div>
    <div style="background:#eee9e0;border:1px solid #ddd6cc;border-radius:2px;padding:14px 18px;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#9a8e82;margin-bottom:5px">Invoice Reference</div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:600;color:#2c2825;letter-spacing:.03em">${params.invoiceNumber}</div>
      <div style="font-family:'Source Serif 4',Georgia,serif;font-size:12px;color:#6b5f55;margin-top:5px;font-style:italic">The invoice amount is pre-filled in the ${params.methodLabel} link — no need to enter it manually.</div>
    </div>
    ${calloutBlock('After Paying', `
      Once your payment is complete, return to your <strong>Meridian Studio portal</strong> and click
      <strong style="color:#1a1614">"I've sent payment"</strong> to notify us. We'll confirm receipt and activate your order promptly.
    `)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;font-weight:300;color:#6b5f55;line-height:1.7;font-style:italic">
      If the link has expired or you encounter any issues, reply to this email and we'll send a fresh one right away.
    </p>`;

  const textBody = `Hi ${params.firstName},

Your ${params.methodLabel} payment link for invoice ${params.invoiceNumber} (${params.totalDue}) is ready.

Pay directly on ${params.methodLabel}:
${params.paymentLinkUrl}${params.linkExpiresAt ? `\nThis link expires on ${params.linkExpiresAt}.` : ''}

The invoice amount is pre-filled — no need to enter it manually.
REFERENCE: ${params.invoiceNumber}

After paying, return to your portal and click "I've sent payment" to notify us.

— Meridian Studio
billing@primemeridian.academy`;

  return {
    subject: `Your ${params.methodLabel} payment link — invoice ${params.invoiceNumber}`,
    htmlBody: emailShell(content, `This is a transactional email containing a payment link for invoice ${params.invoiceNumber} at Meridian Studio. Do not share this link with others.`),
    textBody,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. ADMIN — CLIENT DECLARED PAYMENT (both flows converge)
// ═════════════════════════════════════════════════════════════════════════════
export function ADMIN_PAYMENT_DECLARED_EMAIL(params: {
  clientName: string; invoiceNumber: string; totalDue: string; methodLabel: string;
  isIndirect: boolean; declaredAt: string; orderSubject: string; dashboardUrl: string;
}): EmailTemplate {
  const rows: Row[] = [
    { key: 'Client', value: params.clientName },
    { key: 'Invoice', value: params.invoiceNumber },
    { key: 'Amount', value: params.totalDue },
    { key: 'Method', value: `${params.methodLabel}${params.isIndirect ? ' (link-based)' : ''}` },
    { key: 'Order', value: params.orderSubject },
    { key: 'Declared At', value: params.declaredAt },
  ];
  const verifyNote = params.isIndirect
    ? `Verify the incoming payment on your <strong>${params.methodLabel}</strong> account, then confirm or flag in the <a href="${params.dashboardUrl}" style="color:#b05a38;text-decoration:underline">Admin Dashboard</a>.`
    : `Verify the payment (e.g. Western Union MTCN or M-Pesa confirmation), then confirm or flag in the <a href="${params.dashboardUrl}" style="color:#b05a38;text-decoration:underline">Admin Dashboard</a>. The client's order is on hold pending your confirmation.`;
  const content = `
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:400;color:#2c2825;margin-bottom:20px;line-height:1.6">
      <strong>${params.clientName}</strong> has declared payment for invoice <strong>${params.invoiceNumber}</strong>.
    </p>
    ${paymentRowsTable(rows)}
    ${calloutBlock('Action Required', verifyNote)}`;

  const textBody = `${params.clientName} has declared payment for invoice ${params.invoiceNumber}.

Client:      ${params.clientName}
Invoice:     ${params.invoiceNumber}
Amount:      ${params.totalDue}
Method:      ${params.methodLabel}${params.isIndirect ? ' (link-based)' : ''}
Order:       ${params.orderSubject}
Declared At: ${params.declaredAt}

Verify and confirm in the Admin Dashboard: ${params.dashboardUrl}

— Meridian Studio System`;

  return {
    subject: `Payment declared — ${params.invoiceNumber} · ${params.clientName}`,
    htmlBody: emailShell(content, `Internal admin notification from the Meridian Studio portal system.`),
    textBody,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. PAYMENT CONFIRMED — CLIENT (both flows converge)
// ═════════════════════════════════════════════════════════════════════════════
export function PAYMENT_CONFIRMED_EMAIL(params: {
  firstName: string; invoiceNumber: string; totalPaid: string; confirmedDate: string;
  orderSubject: string; portalUrl: string;
}): EmailTemplate {
  const rows: Row[] = [
    { key: 'Invoice', value: params.invoiceNumber },
    { key: 'Amount Paid', value: params.totalPaid },
    { key: 'Confirmed', value: params.confirmedDate },
    { key: 'Order', value: params.orderSubject },
  ];
  const content = `
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:300;color:#2c2825;margin-bottom:10px;line-height:1.6">Hi ${params.firstName},</p>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13.5px;font-weight:300;color:#4a3f37;line-height:1.7;margin-bottom:24px">
      We've confirmed receipt of your payment for invoice <strong>${params.invoiceNumber}</strong>.
      Your order is now active and our team is on it.
    </p>
    ${paymentRowsTable(rows)}
    ${calloutBlock("What's Next", `
      Track your order's progress in the <a href="${params.portalUrl}" style="color:#b05a38;text-decoration:underline">Meridian Studio portal</a>.
      We'll notify you when your work is ready for review.
    `)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;font-weight:300;color:#6b5f55;line-height:1.7;font-style:italic">Thank you for choosing Meridian Studio.</p>`;

  const textBody = `Hi ${params.firstName},

We've confirmed receipt of your payment for invoice ${params.invoiceNumber}.

Invoice:   ${params.invoiceNumber}
Amount:    ${params.totalPaid}
Confirmed: ${params.confirmedDate}
Order:     ${params.orderSubject}

Track your order in the portal: ${params.portalUrl}

Thank you for choosing Meridian Studio.

— Meridian Studio
billing@primemeridian.academy`;

  return {
    subject: `Payment confirmed — ${params.invoiceNumber} · Meridian Studio`,
    htmlBody: emailShell(content, `This is a transactional email confirming payment for invoice ${params.invoiceNumber} at Meridian Studio.`),
    textBody,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3B. PAYMENT FLAGGED — CLIENT (admin could not verify the declaration)
// (Not in the vendor set; added in the same brand style so the flag flow stays
//  consistent with the rest of the system.)
// ═════════════════════════════════════════════════════════════════════════════
export function CLIENT_PAYMENT_FLAGGED_EMAIL(params: {
  firstName: string; invoiceNumber: string; totalDue: string; methodLabel: string;
  adminNote?: string; portalUrl: string;
}): EmailTemplate {
  const content = `
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:300;color:#2c2825;margin-bottom:10px;line-height:1.6">Hi ${params.firstName},</p>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13.5px;font-weight:300;color:#4a3f37;line-height:1.7;margin-bottom:22px">
      We weren't able to verify your payment for invoice <strong>${params.invoiceNumber}</strong> (${params.totalDue}) via <strong>${params.methodLabel}</strong>.
      This is usually a small mismatch — a missing reference, a pending transfer, or an amount that hasn't cleared yet.
    </p>
    ${calloutBlock('What to Do', `
      Please double-check your transfer${params.adminNote ? ` — <em>"${params.adminNote}"</em>` : ''}.
      Once it's on its way, return to your <a href="${params.portalUrl}" style="color:#b05a38;text-decoration:underline">Meridian Studio portal</a>
      and click <strong style="color:#1a1614">"I've sent payment"</strong> again, or message us and we'll help sort it out.
    `)}
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;font-weight:300;color:#6b5f55;line-height:1.7;font-style:italic">
      No need to worry — your order is held safely until this is resolved.
    </p>`;

  const textBody = `Hi ${params.firstName},

We weren't able to verify your payment for invoice ${params.invoiceNumber} (${params.totalDue}) via ${params.methodLabel}.
This is usually a small mismatch — a missing reference, a pending transfer, or an amount that hasn't cleared.
${params.adminNote ? `\nNote from our team: "${params.adminNote}"\n` : ''}
Please double-check your transfer, then return to your portal and click "I've sent payment" again,
or message us and we'll help: ${params.portalUrl}

Your order is held safely until this is resolved.

— Meridian Studio
billing@primemeridian.academy`;

  return {
    subject: `Action needed — payment not yet confirmed · ${params.invoiceNumber}`,
    htmlBody: emailShell(content, `This is a transactional email regarding invoice ${params.invoiceNumber} at Meridian Studio.`),
    textBody,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. NEW CLIENT WELCOME + MAGIC LINK (admin-triggered on first delivery)
// ═════════════════════════════════════════════════════════════════════════════
export function NEW_CLIENT_WELCOME_EMAIL(params: {
  firstName: string; email: string; magicLinkUrl: string; portalUrl: string;
}): EmailTemplate {
  const content = `
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;font-weight:300;color:#2c2825;margin-bottom:10px;line-height:1.6">Welcome to Meridian Studio, ${params.firstName}.</p>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13.5px;font-weight:300;color:#4a3f37;line-height:1.7;margin-bottom:24px">
      Your portal account is ready. Use the link below to access your dashboard, track orders, and manage your account — no password required.
    </p>
    <hr style="border:none;border-top:1px solid #ddd6cc;margin-bottom:22px" />
    <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#9a8e82;margin-bottom:10px">Your Access Details</div>
    ${paymentRowsTable([
      { key: 'Email', value: params.email },
      { key: 'Login Method', value: 'Magic link (sent to your email)' },
    ])}
    <div style="text-align:center;margin-bottom:8px">
      <a href="${params.magicLinkUrl}" style="display:inline-block;background-color:#1a1614;color:#f7f4ee;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;padding:13px 28px;border-radius:2px">Access My Portal →</a>
    </div>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:12px;font-weight:300;color:#9a8e82;line-height:1.7;text-align:center;font-style:italic;margin-top:10px">
      This link expires in 24 hours. To log in again, visit
      <a href="${params.portalUrl}" style="color:#b05a38">${params.portalUrl}</a> and request a new magic link.
    </p>`;

  const textBody = `Welcome to Meridian Studio, ${params.firstName}.

Your portal account is ready. Use the link below to access your dashboard:
${params.magicLinkUrl}

Email:        ${params.email}
Login Method: Magic link (sent to your email)

This link expires in 24 hours. To log in again, visit: ${params.portalUrl}

— Meridian Studio
billing@primemeridian.academy`;

  return {
    subject: `Welcome to Meridian Studio — your portal is ready`,
    htmlBody: emailShell(content, `You are receiving this because an account was created for ${params.email} at Meridian Studio.`),
    textBody,
  };
}
