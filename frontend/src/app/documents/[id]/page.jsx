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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0 24px' }}>
              {editing ? (
                <>
                  <EditField label="ประเภทเอกสาร"   value={data.document_type}    onChange={v => onDraftChange('data.document_type', v)} />
                  <EditField label="เลขที่เอกสาร"    value={data.document_number}  onChange={v => onDraftChange('data.document_number', v)} />
                  <EditField label="วันที่เอกสาร"    value={data.document_date}    onChange={v => onDraftChange('data.document_date', v)} />
                  <EditField label="วันครบกำหนด"     value={data.due_date}          onChange={v => onDraftChange('data.due_date', v)} />
                  <EditField label="เลขอ้างอิง"      value={data.reference_number} onChange={v => onDraftChange('data.reference_number', v)} />
                  <EditField label="สกุลเงิน"        value={data.currency}          onChange={v => onDraftChange('data.currency', v)} />
                  <EditField label="เงื่อนไขการชำระ" value={data.payment_terms}    onChange={v => onDraftChange('data.payment_terms', v)} />
                  <EditField label="วิธีชำระเงิน"    value={data.payment_method}   onChange={v => onDraftChange('data.payment_method', v)} />
                </>
              ) : (
                <>
                  <Field label="ประเภทเอกสาร"   value={data.document_type} />
                  <Field label="เลขที่เอกสาร"    value={data.document_number} />
                  <Field label="วันที่เอกสาร"    value={data.document_date} />
                  <Field label="วันครบกำหนด"     value={data.due_date} />
                  <Field label="เลขอ้างอิง"      value={data.reference_number} />
                  <Field label="สกุลเงิน"        value={data.currency} />
                  <Field label="เงื่อนไขการชำระ" value={data.payment_terms} />
                  <Field label="วิธีชำระเงิน"    value={data.payment_method} />
                  <Field label="วันที่อัปโหลด"   value={doc.created_at ? new Date(doc.created_at).toLocaleDateString('th-TH') : null} />
                </>
              )}
            </div>
          </Section>

          {/* Seller / Buyer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Section title="ผู้ขาย">
              {editing ? (
                <>
                  <EditField label="ชื่อ"            value={seller.name}    onChange={v => onDraftChange('data.seller.name', v)} />
                  <EditField label="สาขา"            value={seller.branch}  onChange={v => onDraftChange('data.seller.branch', v)} />
                  <EditField label="เลขผู้เสียภาษี"  value={seller.tax_id}  onChange={v => onDraftChange('data.seller.tax_id', v)} />
                  <EditField label="ที่อยู่"          value={seller.address} onChange={v => onDraftChange('data.seller.address', v)} />
                  <EditField label="โทรศัพท์"        value={seller.phone}   onChange={v => onDraftChange('data.seller.phone', v)} />
                  <EditField label="อีเมล"           value={seller.email}   onChange={v => onDraftChange('data.seller.email', v)} />
                </>
              ) : (
                <>
                  <Field label="ชื่อ"            value={seller.name} />
                  <Field label="สาขา"            value={seller.branch} />
                  <Field label="เลขผู้เสียภาษี"  value={seller.tax_id} />
                  <Field label="ที่อยู่"          value={seller.address} />
                  <Field label="โทรศัพท์"        value={seller.phone} />
                  <Field label="อีเมล"           value={seller.email} />
                </>
              )}
            </Section>
            <Section title="ผู้ซื้อ">
              {editing ? (
                <>
                  <EditField label="ชื่อ"            value={buyer.name}    onChange={v => onDraftChange('data.buyer.name', v)} />
                  <EditField label="สาขา"            value={buyer.branch}  onChange={v => onDraftChange('data.buyer.branch', v)} />
                  <EditField label="เลขผู้เสียภาษี"  value={buyer.tax_id}  onChange={v => onDraftChange('data.buyer.tax_id', v)} />
                  <EditField label="ที่อยู่"          value={buyer.address} onChange={v => onDraftChange('data.buyer.address', v)} />
                  <EditField label="โทรศัพท์"        value={buyer.phone}   onChange={v => onDraftChange('data.buyer.phone', v)} />
                  <EditField label="อีเมล"           value={buyer.email}   onChange={v => onDraftChange('data.buyer.email', v)} />
                </>
              ) : (
                <>
                  <Field label="ชื่อ"            value={buyer.name} />
                  <Field label="สาขา"            value={buyer.branch} />
                  <Field label="เลขผู้เสียภาษี"  value={buyer.tax_id} />
                  <Field label="ที่อยู่"          value={buyer.address} />
                  <Field label="โทรศัพท์"        value={buyer.phone} />
                  <Field label="อีเมล"           value={buyer.email} />
                </>
              )}
            </Section>
          </div>

          {/* Amount summary */}
          <Section title="ยอดเงิน">
            {editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0 24px' }}>
                <EditField label="ยอดก่อนหักส่วนลด" value={amount.gross_subtotal}                     onChange={v => onDraftChange('data.amount.gross_subtotal', v)} type="number" />
                <EditField label="ส่วนลด"            value={amount.discount?.amount}                  onChange={v => onDraftChange('data.amount.discount.amount', v)} type="number" />
                <EditField label="ยอดก่อน VAT"       value={amount.subtotal}                           onChange={v => onDraftChange('data.amount.subtotal', v)} type="number" />
                <EditField label={`VAT (${amount.vat_rate ?? 7}%)`} value={amount.vat_amount}          onChange={v => onDraftChange('data.amount.vat_amount', v)} type="number" />
                <EditField label="ภาษีหัก ณ ที่จ่าย" value={amount.withholding_tax?.amount}           onChange={v => onDraftChange('data.amount.withholding_tax.amount', v)} type="number" />
                <EditField label="ค่าบริการอื่นๆ"    value={amount.service_charge}                    onChange={v => onDraftChange('data.amount.service_charge', v)} type="number" />
                <EditField label="ยอดรวมสุทธิ"       value={amount.total}                              onChange={v => onDraftChange('data.amount.total', v)} type="number" />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: amount.amount_in_words ? 12 : 0 }}>
                  {[
                    { label: 'ยอดก่อนหักส่วนลด', value: fmt(amount.gross_subtotal),                 color: '#64748b', show: amount.gross_subtotal != null },
                    { label: 'ส่วนลด',            value: fmt(amount.discount?.amount),              color: '#dc2626', show: amount.discount?.amount != null },
                    { label: 'ยอดก่อน VAT',       value: fmt(amount.subtotal),                      color: '#374151', show: true },
                    { label: `VAT ${amount.vat_rate ?? 7}%`, value: fmt(amount.vat_amount),          color: '#374151', show: true },
                    { label: 'ภาษีหัก ณ ที่จ่าย', value: fmt(amount.withholding_tax?.amount),       color: '#9333ea', show: amount.withholding_tax?.amount != null },
                    { label: 'ค่าบริการอื่นๆ',    value: fmt(amount.service_charge),                color: '#374151', show: amount.service_charge != null },
                    { label: 'ยอดรวมสุทธิ',       value: fmt(amount.total),                         color: '#4f46e5', large: true, show: true },
                  ].filter(a => a.show).map(a => (
                    <div key={a.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', minWidth: 130 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{a.label}</div>
                      <div style={{ fontSize: a.large ? 22 : 16, fontWeight: 700, color: a.color, fontFamily: 'monospace' }}>{a.value ?? '—'}</div>
                    </div>
                  ))}
                </div>
                {amount.amount_in_words && (
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    <span style={{ fontWeight: 600 }}>จำนวนเงินเป็นตัวอักษร: </span>{amount.amount_in_words}
                  </div>
                )}
              </>
            )}
          </Section>

          {/* Line items */}
          {items.length > 0 && (
            <Section title={`รายการสินค้า (${items.length})`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      {['#', 'รหัส', 'รายการ / คำอธิบาย', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ส่วนลด', 'รวม'].map((h, i) => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: i >= 5 ? 'right' : 'left', color: '#64748b', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{i + 1}</td>
                        <td style={{ padding: '8px', color: '#94a3b8', fontSize: 12 }}>{it.code || '—'}</td>
                        <td style={{ padding: '8px', color: '#1e293b' }}>
                          <div style={{ fontWeight: 500 }}>{it.name || '—'}</div>
                          {it.description && it.description !== it.name && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{it.description}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px', color: '#374151' }}>{it.quantity ?? '—'}</td>
                        <td style={{ padding: '8px', color: '#64748b' }}>{it.unit || '—'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(it.unit_price)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{it.discount != null ? fmt(it.discount) : '—'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{fmt(it.amount ?? it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Bank account */}
          {(data.bank_account?.bank || data.bank_account?.account_number) && (
            <Section title="บัญชีธนาคาร">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0 24px' }}>
                <Field label="ธนาคาร"        value={data.bank_account?.bank} />
                <Field label="ชื่อบัญชี"     value={data.bank_account?.account_name} />
                <Field label="เลขที่บัญชี"   value={data.bank_account?.account_number} />
              </div>
            </Section>
          )}

          {/* Notes */}
          {data.notes && (
            <Section title="หมายเหตุ">
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{data.notes}</p>
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
