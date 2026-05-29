// Shared brand lockup — used in the homepage nav and the workspace header
// so the two surfaces feel like one product. Inline-styled so it renders
// identically inside the .hp-scoped homepage and the inline-styled workspace.

const SERIF = 'Cormorant Garamond, Georgia, serif';
const MONO  = 'DM Mono, monospace';

export default function Logomark({ linkToHome = true, onNavigate }) {
  const lockup = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span aria-hidden="true" style={{
        width: 38, height: 38, borderRadius: '50%', background: '#8B1A1F',
        color: '#fff', display: 'grid', placeItems: 'center',
        fontFamily: SERIF, fontWeight: 600, fontSize: 24, lineHeight: 1, paddingBottom: 2,
      }}>M</span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: SERIF, fontSize: 22, letterSpacing: '-0.01em', color: '#1C1917' }}>
          Meridian Studio
        </span>
        <span aria-hidden="true" style={{
          fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#57534E', marginTop: 4,
        }}>
          Academic writing · Est. 2019
        </span>
      </span>
    </span>
  );

  if (!linkToHome) return lockup;

  return (
    <a href="/" aria-label="Meridian Studio — home"
      onClick={onNavigate}
      style={{ display: 'inline-flex', textDecoration: 'none', color: 'inherit' }}>
      {lockup}
    </a>
  );
}
