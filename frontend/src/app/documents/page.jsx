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

const DATA_COLUMNS = [
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
  const [fetchError, setFetchError] = useState(false)

  // Selection
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  function loadDocs() {
    setLoading(true)
    setFetchError(false)
    setSelected(new Set())
    fetch(`${API}/summary`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setFetchError(true); setLoading(false) })
  }

  useEffect(() => { loadDocs() }, [])

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

  // เลือกทั้งหมดในหน้าปัจจุบัน
  const pageIds = pageDocs.map(d => d.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const somePageSelected = pageIds.some(id => selected.has(id))

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected(prev => { const s = new Set(prev); pageIds.forEach(id => s.delete(id)); return s })
    } else {
      setSelected(prev => { const s = new Set(prev); pageIds.forEach(id => s.add(id)); return s })
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function deleteSelected() {
    setDeleting(true)
    setConfirmDelete(false)
    try {
      await Promise.all(
        [...selected].map(id =>
          fetch(`${API}/api/document/${id}`, { method: 'DELETE' })
        )
      )
    } finally {
      setDeleting(false)
      loadDocs()
    }
  }

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
            {loading ? 'กำลังโหลด...' : fetchError ? 'โหลดข้อมูลไม่สำเร็จ' : `${filtered.length} จาก ${docs.length} เอกสาร`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              style={{
                background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                cursor: deleting ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'กำลังลบ...' : `🗑 ลบที่เลือก (${selected.size})`}
            </button>
          )}
          <button
            onClick={loadDocs}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 14px', fontSize: 13, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ↻ รีเฟรช
          </button>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>ยืนยันการลบ</div>
            <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20 }}>
              คุณต้องการลบ <strong style={{ color: '#dc2626' }}>{selected.size} เอกสาร</strong> ที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: '8px 18px', background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={deleteSelected}
                style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ลบเอกสาร
              </button>
            </div>
          </div>
        </div>
      )}

      {fetchError && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span>ไม่สามารถโหลดรายการเอกสารได้ — กรุณาตรวจสอบการเชื่อมต่อและกด รีเฟรช</span>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
          <input
            placeholder="ค้นหาไฟล์ / ประเภท / ผู้ขาย / ผู้ซื้อ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...selectStyle, width: '100%', boxSizing: 'border-box', paddingLeft: 32 }}
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">สถานะทั้งหมด</option>
          <option value="NORMAL">NORMAL</option>
          <option value="ABNORMAL">ABNORMAL</option>
          <option value="ERROR">ERROR</option>
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">ประเภทเอกสารทั้งหมด</option>
          {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ✕ ล้าง
          </button>
        )}

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
                  {/* Checkbox column */}
                  <th style={{ padding: '10px 12px 10px 16px', width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#6366f1' }}
                    />
                  </th>
                  {DATA_COLUMNS.map(col => (
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
                {pageDocs.map(doc => {
                  const isSelected = selected.has(doc.id)
                  return (
                    <tr
                      key={doc.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s', background: isSelected ? '#eef2ff' : 'transparent' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#eef2ff' : 'transparent' }}
                    >
                      <td style={{ padding: '11px 12px 11px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(doc.id)}
                          style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#6366f1' }}
                        />
                      </td>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {selected.size > 0
              ? `เลือก ${selected.size} รายการ · แสดง ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} จาก ${filtered.length} รายการ`
              : `แสดง ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} จาก ${filtered.length} รายการ`
            }
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
