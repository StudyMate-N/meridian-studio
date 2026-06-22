/* Icon set — single stroke style, currentColor. <Icon name="..." size={18} /> */

const P = {
  grid:   "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  chat:   "M4 5h16v10H9l-4 4v-4H4z",
  user:   "M5 20a7 7 0 0 1 14 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  plus:   "M12 5v14M5 12h14",
  right:  "M9 5l7 7-7 7",
  left:   "M15 5l-7 7 7 7",
  down:   "M5 9l7 7 7-7",
  up:     "M5 15l7-7 7 7",
  download: "M12 3v12M7 11l5 5 5-5M5 21h14",
  trash:  "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  check:  "M5 12.5l4.5 4.5L19 7",
  clock:  "M12 7v5l3.5 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  alert:  "M12 8v5M12 16.5v.5M12 3l9 16H3z",
  pencil: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  card:   "M3 7h18v11H3zM3 11h18",
  doc:    "M7 3h7l4 4v14H7zM14 3v4h4",
  send:   "M4 12l16-7-7 16-2-7z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4-4",
  x:      "M6 6l12 12M18 6L6 18",
  menu:   "M4 7h16M4 12h16M4 17h16",
  sparkle:"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z",
  arrow:  "M5 12h14M13 6l6 6-6 6",
  logout: "M9 5H5v14h4M16 8l4 4-4 4M20 12H9",
  files:  "M3 7l2-2h5l2 2h7v12H3zM3 7v12",
  bell:   "M6 16V10a6 6 0 0 1 12 0v6l2 2H4zM10 20a2 2 0 0 0 4 0",
  star:   "M12 4l2.3 4.7 5.2.8-3.7 3.7.9 5.1L12 16l-4.6 2.4.9-5.1L4.6 9.5l5.2-.8z",
  dollar: "M12 4v16M8.5 16.5c0 1.7 1.6 2.5 3.5 2.5s3.5-.7 3.5-2.6c0-3.8-7-2-7-5.4 0-1.7 1.6-2.5 3.5-2.5s3.5.9 3.5 2.4",
  book:   "M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2zM5 4v18",
  chevR:  "M9 6l6 6-6 6",
  paperclip: "M19 11l-7.5 7.5a4 4 0 0 1-5.6-5.6L13 5.5a2.6 2.6 0 0 1 3.7 3.7l-7 7a1.2 1.2 0 0 1-1.8-1.7l6.7-6.7",
  refresh: "M20 11a8 8 0 0 0-14-4M4 5v3h3M4 13a8 8 0 0 0 14 4M20 19v-3h-3",
  phone: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  info: "M12 11v5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  smile: "M9 10h.01M15 10h.01M8.5 14a4.5 4.5 0 0 0 7 0M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  mic: "M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  shield: "M12 3l7 2.6v5.4c0 4.2-3 7.2-7 9-4-1.8-7-4.8-7-9V5.6z",
  shieldcheck: "M12 3l7 2.6v5.4c0 4.2-3 7.2-7 9-4-1.8-7-4.8-7-9V5.6zM9 11.5l2 2 4-4",
  lock: "M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5zM12 14v3",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  package: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  eye: "M1.5 12c2-4 6-7 10.5-7s8.5 3 10.5 7c-2 4-6 7-10.5 7s-8.5-3-10.5-7zM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  wallet: "M3 8h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3zM3 8V6h13M16.5 13h.01",
  briefcase: "M4 8h16v12H4zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16",
  power: "M12 4v8M7.5 7a7 7 0 1 0 9 0",
  edit3: "M12 20h9M4 20l1-4 11-11 3 3-11 11z",
  users: "M16 19a5 5 0 0 0-8 0M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19a4 4 0 0 0-5-3.5M18 10.5a3 3 0 0 0 0-5.5",
  gear: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  filter: "M3 5h18l-7 8v5l-4 2v-7z",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14",
  columns: "M4 5h16v14H4zM9.3 5v14M14.6 5v14",
  panelLeft: "M4 5h16v14H4zM9.5 5v14",
  inbox: "M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6zM5 5l-2 8M19 5l2 8",
  wifiOff: "M3 3l18 18M9 17a4.2 4.2 0 0 1 6 0M5 12.5a10 10 0 0 1 5-2.7M19 12.5a10 10 0 0 0-4-2.6M12 21h.01",
};

export function Icon({ name, size = 18, stroke = 1.7, style, className }) {
  const d = P[name];
  if (name === "dot") {
    return <svg width={size} height={size} viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="5" fill="currentColor" /></svg>;
  }
  if (name === "whatsapp") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style} className={className}>
        <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm5.6 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-3.2-.8-2.7-1.1-4.4-3.9-4.5-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5c-.2.2-.3.4-.1.6.1.3.7 1.1 1.5 1.8 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.6-.7c.2-.3.4-.2.6-.1l1.9.9c.2.1.4.2.4.3.1.1.1.6 0 1.2z"/>
      </svg>
    );
  }
  if (name === "ticks") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
        <path d="M2 12.5l4 4 8.5-9" /><path d="M9.5 16.5l1 1 8.5-9" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         style={style} className={className}>
      <path d={d} />
    </svg>
  );
}

export default Icon;
