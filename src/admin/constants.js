// ── Design Tokens (Clay design system) ───────────────────────────────────────
export const T = {
  bg:        '#F4F1EA',  // paper-2 canvas
  surface:   '#FBFAF7',  // paper — cards
  alt:       '#EDE8DD',  // paper-3
  border:    '#E4DCCF',  // line
  borderMid: '#D6CCBC',  // line-2
  side:      '#211A14',  // ink sidebar
  sideBorder:'rgba(246,241,233,0.10)',
  sideText:  'rgba(246,241,233,0.58)',
  ink:       '#211A14',
  inkMid:    '#6E6357',  // muted
  inkLight:  '#938878',  // muted-2
  accent:    '#BD5A33',  // terracotta
  accentSoft:'#FBF1EA',
  green:     '#3F6B4E',
  greenBg:   '#EAF2EC',
  greenBord: '#BBD9C5',
};

export const F = {
  serif: 'Newsreader, Georgia, serif',
  sans:  'Hanken Grotesk, system-ui, sans-serif',
  mono:  'Spline Sans Mono, monospace',
};

// ── Status Configs ────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  new:           { label: 'New',        dot: '#7FA8BD', bg: '#ECF1F4', text: '#3A5A6E' },
  brief_received:{ label: 'Brief In',   dot: '#C99A48', bg: '#F6EEDD', text: '#8A6A2F' },
  assigned:      { label: 'Assigned',   dot: '#9E86B8', bg: '#EFEAF2', text: '#5E4E73' },
  writing:       { label: 'Writing',    dot: '#BD5A33', bg: '#FBF1EA', text: '#9E4825' },
  in_review:     { label: 'In Review',  dot: '#C99A48', bg: '#F6EEDD', text: '#8A6A2F' },
  delivered:     { label: 'Delivered',  dot: '#6FA383', bg: '#EAF2EC', text: '#3F6B4E' },
  revision:      { label: 'Revision',   dot: '#C8674A', bg: '#F6E9E4', text: '#9A4528' },
  closed:        { label: 'Closed',     dot: '#A99E8E', bg: '#EEEAE2', text: '#6E6357' },
};

export const STATUS_ORDER = ['new','brief_received','assigned','writing','in_review','delivered','revision'];

export const PAYMENT_CONFIG = {
  unpaid:      { label: 'Unpaid',       bg: '#F6E9E4', text: '#9A4528', border: '#E3C6BB' },
  deposit_paid:{ label: 'Deposit Paid', bg: '#F6EEDD', text: '#8A6A2F', border: '#E3CE9F' },
  paid_in_full:{ label: 'Paid in Full', bg: '#EAF2EC', text: '#3F6B4E', border: '#BBD9C5' },
};

export const PRIORITY_CONFIG = {
  normal: { label: 'Normal', bg: '#EEEAE2', text: '#6E6357' },
  high:   { label: 'High',   bg: '#F6EEDD', text: '#8A6A2F' },
  urgent: { label: 'Urgent', bg: '#F6E9E4', text: '#9A4528' },
};

export const FILE_KIND_CONFIG = {
  brief:    { label: 'Brief',    bg: '#ECF1F4', text: '#3A5A6E' },
  rubric:   { label: 'Rubric',   bg: '#EFEAF2', text: '#5E4E73' },
  draft:    { label: 'Draft',    bg: '#F6EEDD', text: '#8A6A2F' },
  final:    { label: 'Final',    bg: '#EAF2EC', text: '#3F6B4E' },
  revision: { label: 'Revision', bg: '#F6E9E4', text: '#9A4528' },
  other:    { label: 'Other',    bg: '#EEEAE2', text: '#6E6357' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function fmtBytes(n) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1048576).toFixed(1)} MB`;
}

export function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

export function fmtMoney(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
