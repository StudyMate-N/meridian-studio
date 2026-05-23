// ── Design Tokens ────────────────────────────────────────────────────────────
export const T = {
  bg:        '#F7F6F3',
  surface:   '#FFFFFF',
  alt:       '#F2F1EE',
  border:    '#E8E5E0',
  borderMid: '#D4D0CA',
  side:      '#111418',
  sideBorder:'rgba(255,255,255,0.07)',
  sideText:  'rgba(255,255,255,0.5)',
  ink:       '#111418',
  inkMid:    '#57534E',
  inkLight:  '#A8A29E',
  accent:    '#B91C1C',
  accentSoft:'#FEF2F2',
  green:     '#065F46',
  greenBg:   '#ECFDF5',
  greenBord: '#A7F3D0',
};

export const F = {
  serif: 'Cormorant Garamond, Georgia, serif',
  sans:  'DM Sans, system-ui, sans-serif',
  mono:  'DM Mono, monospace',
};

// ── Status Configs ────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  new:           { label: 'New',        dot: '#60A5FA', bg: '#EFF6FF', text: '#1D4ED8' },
  brief_received:{ label: 'Brief In',   dot: '#FBBF24', bg: '#FFFBEB', text: '#92400E' },
  assigned:      { label: 'Assigned',   dot: '#C084FC', bg: '#FAF5FF', text: '#6B21A8' },
  writing:       { label: 'Writing',    dot: '#A78BFA', bg: '#F5F3FF', text: '#5B21B6' },
  in_review:     { label: 'In Review',  dot: '#F472B6', bg: '#FDF2F8', text: '#9D174D' },
  delivered:     { label: 'Delivered',  dot: '#34D399', bg: '#ECFDF5', text: '#065F46' },
  revision:      { label: 'Revision',   dot: '#F87171', bg: '#FEF2F2', text: '#991B1B' },
  closed:        { label: 'Closed',     dot: '#9CA3AF', bg: '#F9FAFB', text: '#374151' },
};

export const STATUS_ORDER = ['new','brief_received','assigned','writing','in_review','delivered','revision'];

export const PAYMENT_CONFIG = {
  unpaid:      { label: 'Unpaid',       bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  deposit_paid:{ label: 'Deposit Paid', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  paid_in_full:{ label: 'Paid in Full', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
};

export const PRIORITY_CONFIG = {
  normal: { label: 'Normal', bg: '#F9FAFB', text: '#374151' },
  high:   { label: 'High',   bg: '#FFFBEB', text: '#92400E' },
  urgent: { label: 'Urgent', bg: '#FEF2F2', text: '#991B1B' },
};

export const FILE_KIND_CONFIG = {
  brief:    { label: 'Brief',    bg: '#EFF6FF', text: '#1D4ED8' },
  rubric:   { label: 'Rubric',   bg: '#FAF5FF', text: '#6B21A8' },
  draft:    { label: 'Draft',    bg: '#F5F3FF', text: '#5B21B6' },
  final:    { label: 'Final',    bg: '#ECFDF5', text: '#065F46' },
  revision: { label: 'Revision', bg: '#FEF2F2', text: '#991B1B' },
  other:    { label: 'Other',    bg: '#F9FAFB', text: '#374151' },
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
