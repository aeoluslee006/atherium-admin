import AtheriumBottomNav from './AtheriumBottomNav'

const RAIL = {
  width: 168,
  bg: '#151929',
  border: 'rgba(201,168,76,0.15)',
  accent: '#C9A84C',
  accentText: '#E8D08A',
  textFaint: '#5A6478',
}

export default function AtheriumNavRail({ children }) {
  return (
    <div style={{
      width: RAIL.width, background: RAIL.bg, borderRight: `1px solid ${RAIL.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
    }}>
      <div style={{ padding: '14px 12px 10px', borderBottom: `1px solid ${RAIL.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, flexShrink: 0,
            background: 'linear-gradient(135deg, #8B6914, #C9A84C)',
            clipPath: 'polygon(50% 0%,0% 100%,15% 100%,50% 20%,85% 100%,100% 100%)',
          }} />
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 600, color: RAIL.accent, letterSpacing: 1.5 }}>ATHERIUM</div>
            <div style={{ fontSize: 8, color: RAIL.textFaint, letterSpacing: 1, textTransform: 'uppercase' }}>Holdings</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {children}
      </div>

      <div style={{ padding: '8px 0 10px', borderTop: `1px solid ${RAIL.border}`, flexShrink: 0 }}>
        <AtheriumBottomNav compact />
      </div>
    </div>
  )
}
