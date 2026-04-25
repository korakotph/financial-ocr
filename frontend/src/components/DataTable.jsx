'use client'

export default function DataTable({ columns, data, onRowClick }) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14,
      }}>
        ไม่มีข้อมูล
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (onRowClick) e.currentTarget.style.background = 'transparent' }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '11px 16px', color: '#374151' }}>
                    {row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
