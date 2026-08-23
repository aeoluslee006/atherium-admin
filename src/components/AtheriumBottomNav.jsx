import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { id: 'admin', label: 'Admin', path: '/dashboard', emoji: '⚙️' },
  { id: 'calendar', label: 'Calendar', path: '/calendar', emoji: '📅' },
  { id: 'stickers', label: 'Stickers', path: '/stickers', emoji: '📌' },
]

export function getAtheriumActiveView(pathname) {
  if (pathname === '/stickers') return 'stickers'
  if (pathname.startsWith('/calendar')) return 'calendar'
  return 'admin'
}

export default function AtheriumBottomNav({ compact = false }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = getAtheriumActiveView(pathname)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 2 : 3 }}>
      {TABS.map(tab => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: compact ? '5px 8px' : '6px 10px',
              borderRadius: 0, cursor: 'pointer', textAlign: 'left',
              background: isActive ? 'rgba(201,168,76,0.05)' : 'transparent',
              border: 'none',
              borderLeft: `2px solid ${isActive ? '#C9A84C' : 'transparent'}`,
              color: isActive ? '#E8D08A' : '#8892AA',
              fontSize: compact ? 10 : 11,
              fontWeight: isActive ? 600 : 500,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <span style={{ fontSize: 11 }}>{tab.emoji}</span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
