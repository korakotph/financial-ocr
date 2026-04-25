'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const STATUS = {
  NORMAL:   { bg: '#dcfce7', color: '#15803d' },
  ABNORMAL: { bg: '#fee2e2', color: '#dc2626' },
  ERROR:    { bg: '#f1f5f9', color: '#64748b' },
}

function Badge({ status }) {
  const s = STATUS[status?.toUpperCase()] || STATUS.ERROR
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {status || 'ERROR'}
    </span>
  )
}

function fmt(v) {
  if (v == null) return '—'
  const n = parseFloat(v)
  return isNaN(n) ? v : n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function DocumentsPage() {
  const router = useRouter()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API}/summary`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setDocs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = docs.filter(d =>
    !search ||
    d.filename?.toLowerCase().includes(search.toLowerCase()) ||
    d.document_type?.toLowerCase().includes(search.toLowerCase()) ||
    d.seller?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>เอกสาร</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {loading ? 'กำลังโหลด...' : `${docs.length} เอกสาร`}
          </p>
        </div>
        <input
          placeholder="ค้นหาไฟล์ / ประเภท / ผู้ขาย..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '7px 12px', fontSize: 13, width: 240,
            outline: 'none', color: '#374151',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            {search ? 'ไม่พบเอกสารที่ค้นหา' : 'ยังไม่มีเอกสาร — อัปโหลดเพื่อเริ่มต้น'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  {['ชื่อไฟล์', 'ประเภท', 'ผู้ขาย', 'ผู้ซื้อ', 'ยอดรวม (฿)', 'สถานะ', 'วันที่'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: h === 'ยอดรวม (฿)' ? 'right' : 'left',
                      fontSize: 11, fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px', color: '#1e293b', fontWeight: 500, maxWidth: 200 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.filename || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', color: '#64748b' }}>{doc.document_type || '—'}</td>
                    <td style={{ padding: '11px 16px', color: '#64748b', maxWidth: 140 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.seller || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', color: '#64748b', maxWidth: 140 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.buyer || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>
                      {fmt(doc.total)}
                    </td>
                    <td style={{ padding: '11px 16px' }}><Badge status={doc.status} /></td>
                    <td style={{ padding: '11px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmtDate(doc.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
