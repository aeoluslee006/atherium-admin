export default function SidebarUserChip({ userEmail = 'Admin' }) {
  return (
    <div style={s.userChip}>
      <div style={s.avatar}>{(userEmail[0] || 'A').toUpperCase()}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={s.email}>{userEmail}</div>
        <div style={s.role}>Super Owner</div>
      </div>
    </div>
  )
}

const s = {
  userChip: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, color: 'var(--night)',
  },
  email: {
    fontSize: 12, color: 'var(--text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  role: { fontSize: 10, color: 'var(--muted)' },
}
