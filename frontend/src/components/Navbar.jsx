'use client'

export default function Navbar() {
  return (
    <div style={{
      height: 60,
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>

      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
        Financial Document Verification
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 20, padding: '5px 12px',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 700,
          }}>A</div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Admin</span>
        </div>
        <button style={{
          background: 'none', border: '1px solid #e2e8f0',
          borderRadius: 6, padding: '5px 12px',
          fontSize: 13, color: '#64748b', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#374151' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' }}
        >
          Logout
        </button>
      </div>

    </div>
  )
}
