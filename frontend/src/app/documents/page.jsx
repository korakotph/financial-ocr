'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const STATUS_MAP = {
  NORMAL:   { bg: '#dcfce7', color: '#15803d' },
  ABNORMAL: { bg: '#fee2e2', color: '#dc2626' },
  ERROR:    { bg: '#f1f5f9', color: '#64748b' },
}

function Badge({ status }) {
  const s = STATUS_MAP[status?.toUpperCase()] || STATUS_MAP.ERROR
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
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

const COLUMNS = [
  { key: 'filename',      label: 'ชื่อไฟล์',    sortable: true,  align: 'left'  },
  { key: 'document_type', label: 'ประเภท',      sortable: true,  align: 'left'  },
  { key: 'seller',        label: 'ผู้ขาย',      sortable: true,  align: 'left'  },
  { key: 'buyer',         label: 'ผู้ซื้อ',      sortable: true,  align: 'left'  },
  { key: 'total',         label: 'ยอดรวม (฿)',  sortable: true,  align: 'right' },
  { key: 'status',        label: 'สถานะ',       sortable: true,  align: 'left'  },
  { key: 'created_at',    label: 'วันที่',       sortable: true,  align: 'left'  },
  { key: '_action',       label: '',            sortable: false, align: 'left'  },
]

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ color: '#cbd5e1', marginLeft: 4, fontSize: 10 }}>⇅</span>
  return <span style={{ color: '#6366f1', marginLeft: 4, fontSize: 10 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function DocumentsPage() {
  const router = useRouter()
  const [docs, setDocs]       = useState([])
  const [loading, setLoading] = useState(true)

  // Filter
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter]   = useState('ALL')

  // Sort
  const [sortKey, setSortKey]   = useState('created_at')
  const [sortDir, setSortDir]   = useState('desc')

  // Pagination
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    fetch(`${API}/summary`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setPage(1) }, [search, statusFilter, typeFilter, sortKey, sortDir, pageSize])

  const docTypes = useMemo(() => {
    const s = new Set(docs.map(d => d.document_type).filter(Boolean))
    return [...s].sort()
  }, [docs])

  const filtered = useMemo(() => {
    let result = docs

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.filename?.toLowerCase().includes(q) ||
        d.document_type?.toLowerCase().includes(q) ||
        d.seller?.toLowerCase().includes(q) ||
        d.buyer?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'ALL') result = result.filter(d => d.status === statusFilter)
    if (typeFilter   !== 'ALL') result = result.filter(d => d.document_type === typeFilter)

    result = [...result].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (sortKey === 'total') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0 }
      else if (sortKey === 'created_at') { va = va ? new Date(va) : 0; vb = vb ? new Date(vb) : 0 }
      else { va = va ?? ''; vb = vb ?? '' }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [docs, search, statusFilter, typeFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageDocs   = filtered.slice((page - 1) * pageSize, page * pageSize)

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function clearFilters() {
    setSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL')
  }

  const hasFilters = search || statusFilter !== 'ALL' || typeFilter !== 'ALL'

  const selectStyle = {
    border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px',
    fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>เอกสาร</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {loading ? 'กำลังโหลด...' : `${filtered.length} จาก ${docs.length} เอกสาร`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
          <input
            placeholder="ค้นหาไฟล์ / ประเภท / ผู้ขาย / ผู้ซื้อ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', paddingLeft: 32 }}
          />
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">สถานะทั้งหมด</option>
          <option value="NORMAL">NORMAL</option>
          <option value="ABNORMAL">ABNORMAL</option>
          <option value="ERROR">ERROR</option>
        </select>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">ประเภทเอกสารทั้งหมด</option>
          {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ✕ ล้าง
          </button>
        )}

        {/* Page size */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>แถวต่อหน้า</span>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} style={selectStyle}>
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            {hasFilters ? 'ไม่พบเอกสารที่ตรงกับตัวกรอง' : 'ยังไม่มีเอกสาร — อัปโหลดเพื่อเริ่มต้น'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                      style={{
                        padding: '10px 16px', textAlign: col.align,
                        fontSize: 11, fontWeight: 700, color: sortKey === col.key ? '#6366f1' : '#94a3b8',
                        textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                        cursor: col.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                    >
                      {col.label}
                      {col.sortable && <SortIcon active={sortKey === col.key} dir={sortDir} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageDocs.map(doc => (
                  <tr
                    key={doc.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px', color: '#1e293b', fontWeight: 500, maxWidth: 200 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename || '—'}</span>
                    </td>
                    <td style={{ padding: '11px 16px', color: '#64748b' }}>{doc.document_type || '—'}</td>
                    <td style={{ padding: '11px 16px', color: '#64748b', maxWidth: 140 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.seller || '—'}</span>
                    </td>
                    <td style={{ padding: '11px 16px', color: '#64748b', maxWidth: 140 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.buyer || '—'}</span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>{fmt(doc.total)}</td>
                    <td style={{ padding: '11px 16px' }}><Badge status={doc.status} /></td>
                    <td style={{ padding: '11px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(doc.created_at)}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <button
                        onClick={() => router.push(`/documents/${doc.id}`)}
                        style={{ background: '#eef2ff', color: '#6366f1', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        รายละเอียด →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            แสดง {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} จาก {filtered.length} รายการ
          </span>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <PagBtn label="«" disabled={page === 1}          onClick={() => setPage(1)} />
            <PagBtn label="‹" disabled={page === 1}          onClick={() => setPage(p => p - 1)} />

            {pageNumbers(page, totalPages).map((n, i) =>
              n === '…' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: 13 }}>…</span>
              ) : (
                <PagBtn key={n} label={n} active={n === page} onClick={() => setPage(n)} />
              )
            )}

            <PagBtn label="›" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
            <PagBtn label="»" disabled={page === totalPages} onClick={() => setPage(totalPages)} />
          </div>
        </div>
      )}
    </div>
  )
}

function PagBtn({ label, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 8px',
        borderRadius: 7, fontSize: 13, fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#6366f1' : '#fff',
        color: active ? '#fff' : disabled ? '#cbd5e1' : '#374151',
        border: '1px solid',
        borderColor: active ? '#6366f1' : '#e2e8f0',
        transition: 'all 0.1s',
      }}
    >
      {label}
    </button>
  )
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total)
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total)
  }
  return pages
}
