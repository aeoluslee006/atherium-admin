const TABS = [
  { id: 'admin', label: 'Admin', page: 'dashboard', emoji: '⚙️' },
  { id: 'calendar', label: 'Calendar', page: 'calendar', emoji: '📅' },
  { id: 'stickers', label: 'Stickers', page: 'stickers', emoji: '📌' },
]

export default function AtheriumBottomNav({ compact = false, activeView = 'admin', onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 2 : 3 }}>
      {TABS.map(tab => {
        const isActive = activeView === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate?.(tab.page)}
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
