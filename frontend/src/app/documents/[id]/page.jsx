'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'

const STATUS = {
  NORMAL:   { bg: '#dcfce7', color: '#15803d', label: 'ปกติ' },
  ABNORMAL: { bg: '#fee2e2', color: '#dc2626', label: 'ผิดปกติ' },
  ERROR:    { bg: '#f1f5f9', color: '#64748b', label: 'ข้อผิดพลาด' },
}

function Badge({ status }) {
  const s = STATUS[status?.toUpperCase()] || STATUS.ERROR
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 600,
    }}>
      {s.label} ({status || 'ERROR'})
    </span>
  )
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>
        {value ?? <span style={{ color: '#cbd5e1' }}>—</span>}
      </div>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid #e2e8f0', borderRadius: 6,
          padding: '6px 10px', fontSize: 13.5, color: '#0f172a',
          outline: 'none', background: '#fff',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
      {children}
    </div>
  )
}

function fmt(v) {
  if (v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? v : n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ฿'
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export default function DocumentDetail({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [doc, setDoc]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/document/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setDoc(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [id])

  function startEdit() {
    setDraft(deepClone(doc.analysis))
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(null)
    setEditing(false)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/document/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: draft }),
      })
      if (!res.ok) throw new Error()
      setDoc(prev => ({ ...prev, analysis: draft }))
      setEditing(false)
      setDraft(null)
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch {
      setSaveMsg('error')
      setTimeout(() => setSaveMsg(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  function setPath(obj, path, value) {
    const keys = path.split('.')
    const clone = deepClone(obj)
    let cur = clone
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null) cur[keys[i]] = {}
      cur = cur[keys[i]]
    }
    cur[keys[keys.length - 1]] = value
    return clone
  }

  function onDraftChange(path, value) {
    setDraft(prev => setPath(prev, path, value))
  }

  const analysis = (editing ? draft : doc?.analysis) ?? {}
  const data     = analysis.data ?? {}
  const amount   = data.amount ?? {}
  const seller   = data.seller ?? {}
  const buyer    = data.buyer ?? {}
  const items    = data.items ?? []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: 7,
            padding: '6px 10px', cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            {loading ? 'กำลังโหลด...' : doc?.filename || `เอกสาร #${id}`}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Document ID: {id}</p>
        </div>
        {doc && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {saveMsg === 'saved' && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ บันทึกแล้ว</span>}
          {saveMsg === 'error' && <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>✕ บันทึกไม่สำเร็จ</span>}
          <Badge status={analysis.status === 'success' ? 'NORMAL' : (analysis.status || 'ERROR').toUpperCase()} />
          {!editing ? (
            <button
              onClick={startEdit}
              style={{
                background: '#eef2ff', color: '#6366f1', border: 'none',
                borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✏️ แก้ไข
            </button>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                style={{
                  background: '#f1f5f9', color: '#64748b', border: 'none',
                  borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </>
          )}
        </div>}
      </div>

      {loading && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</div>
      )}

      {error && (
        <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 12, padding: 24, color: '#dc2626' }}>
          ไม่สามารถโหลดข้อมูลเอกสารได้
        </div>
      )}

      {doc && !loading && (
        <>
          {/* Document info */}
          <Section title="ข้อมูลเอกสาร">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0 24px' }}>
              {editing ? (
                <>
                  <EditField label="ประเภทเอกสาร" value={data.document_type} onChange={v => onDraftChange('data.document_type', v)} />
                  <EditField label="เลขที่เอกสาร"  value={data.document_number} onChange={v => onDraftChange('data.document_number', v)} />
                  <EditField label="วันที่เอกสาร"   value={data.document_date} onChange={v => onDraftChange('data.document_date', v)} />
                </>
              ) : (
                <>
                  <Field label="ประเภทเอกสาร" value={data.document_type} />
                  <Field label="เลขที่เอกสาร"  value={data.document_number} />
                  <Field label="วันที่เอกสาร"   value={data.document_date} />
                  <Field label="วันที่อัปโหลด"  value={doc.created_at ? new Date(doc.created_at).toLocaleDateString('th-TH') : null} />
                </>
              )}
            </div>
          </Section>

          {/* Seller / Buyer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Section title="ผู้ขาย">
              {editing ? (
                <>
                  <EditField label="ชื่อ"    value={seller.name}    onChange={v => onDraftChange('data.seller.name', v)} />
                  <EditField label="ที่อยู่" value={seller.address} onChange={v => onDraftChange('data.seller.address', v)} />
                  <EditField label="เลขผู้เสียภาษี" value={seller.tax_id} onChange={v => onDraftChange('data.seller.tax_id', v)} />
                </>
              ) : (
                <>
                  <Field label="ชื่อ"    value={seller.name} />
                  <Field label="ที่อยู่" value={seller.address} />
                  <Field label="เลขผู้เสียภาษี" value={seller.tax_id} />
                </>
              )}
            </Section>
            <Section title="ผู้ซื้อ">
              {editing ? (
                <>
                  <EditField label="ชื่อ"    value={buyer.name}    onChange={v => onDraftChange('data.buyer.name', v)} />
                  <EditField label="ที่อยู่" value={buyer.address} onChange={v => onDraftChange('data.buyer.address', v)} />
                  <EditField label="เลขผู้เสียภาษี" value={buyer.tax_id} onChange={v => onDraftChange('data.buyer.tax_id', v)} />
                </>
              ) : (
                <>
                  <Field label="ชื่อ"    value={buyer.name} />
                  <Field label="ที่อยู่" value={buyer.address} />
                  <Field label="เลขผู้เสียภาษี" value={buyer.tax_id} />
                </>
              )}
            </Section>
          </div>

          {/* Amount summary */}
          <Section title="ยอดเงิน">
            {editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0 24px' }}>
                <EditField label="ยอดก่อน VAT" value={amount.subtotal}   onChange={v => onDraftChange('data.amount.subtotal', v)}   type="number" />
                <EditField label="VAT"          value={amount.vat_amount} onChange={v => onDraftChange('data.amount.vat_amount', v)} type="number" />
                <EditField label="ยอดรวม"       value={amount.total}      onChange={v => onDraftChange('data.amount.total', v)}      type="number" />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'ยอดก่อน VAT', value: fmt(amount.subtotal),   color: '#374151' },
                  { label: 'VAT',          value: fmt(amount.vat_amount), color: '#374151' },
                  { label: 'ยอดรวม',       value: fmt(amount.total),      color: '#4f46e5', large: true },
                ].map(a => (
                  <div key={a.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{a.label}</div>
                    <div style={{ fontSize: a.large ? 22 : 18, fontWeight: 700, color: a.color, fontFamily: 'monospace' }}>
                      {a.value ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Line items */}
          {items.length > 0 && (
            <Section title={`รายการสินค้า (${items.length})`}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'รายการ', 'จำนวน', 'หน่วย', 'ราคาต่อหน่วย', 'รวม'].map((h, i) => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: i >= 3 ? 'right' : 'left', color: '#64748b', fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>{i + 1}</td>
                      <td style={{ padding: '8px', color: '#1e293b' }}>{it.description || it.name || '—'}</td>
                      <td style={{ padding: '8px', color: '#374151' }}>{it.quantity ?? '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#374151' }}>{it.unit || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(it.unit_price)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{fmt(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Anomaly reason */}
          {analysis.reason && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, display: 'flex', gap: 10, color: '#92400e' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>พบความผิดปกติ</div>
                <div style={{ fontSize: 13 }}>{analysis.reason}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
