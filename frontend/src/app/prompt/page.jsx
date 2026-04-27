'use client'

import { useEffect, useState, useRef } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'

const FIELD_GROUPS = [
  { icon: '📄', title: 'ข้อมูลเอกสาร',    desc: 'ประเภท เลขที่ วันที่ สกุลเงิน เงื่อนไข และวิธีชำระเงิน' },
  { icon: '🏢', title: 'ผู้ขาย / ผู้ซื้อ', desc: 'ชื่อ สาขา ที่อยู่ เลขประจำตัวผู้เสียภาษี เบอร์โทร อีเมล' },
  { icon: '📦', title: 'รายการสินค้า',    desc: 'รหัส ชื่อ จำนวน หน่วย ราคาต่อหน่วย ส่วนลด ยอดรวมต่อรายการ' },
  { icon: '💰', title: 'ยอดเงิน',         desc: 'ยอดก่อน VAT ส่วนลด VAT ภาษีหัก ณ ที่จ่าย ค่าบริการ ยอดสุทธิ' },
  { icon: '🏦', title: 'ข้อมูลธนาคาร',   desc: 'ธนาคาร ชื่อบัญชี เลขที่บัญชี' },
]

const DOC_TYPE_LABELS = {
  TAX_INVOICE:    'ใบกำกับภาษี',
  INVOICE:        'ใบแจ้งหนี้',
  RECEIPT:        'ใบเสร็จรับเงิน',
  DELIVERY_ORDER: 'ใบส่งของ',
  QUOTATION:      'ใบเสนอราคา',
  PURCHASE_ORDER: 'ใบสั่งซื้อ',
  CREDIT_NOTE:    'ใบลดหนี้',
  DEBIT_NOTE:     'ใบเพิ่มหนี้',
}

const FIELDS_REF = [
  { group: 'เอกสาร',        fields: ['document_type', 'document_number', 'document_date', 'due_date', 'reference_number', 'currency', 'payment_terms', 'payment_method'] },
  { group: 'ผู้ขาย / ผู้ซื้อ', fields: ['name', 'branch', 'tax_id', 'address', 'phone', 'email'] },
  { group: 'รายการสินค้า',  fields: ['code', 'name', 'description', 'quantity', 'unit', 'unit_price', 'discount', 'amount'] },
  { group: 'ยอดเงิน',       fields: ['gross_subtotal', 'discount', 'subtotal', 'vat_rate', 'vat_amount', 'withholding_tax', 'service_charge', 'total', 'amount_in_words'] },
  { group: 'อื่นๆ',         fields: ['bank_account', 'notes', 'confidence_note'] },
]

const DOC_TYPES = ['TAX_INVOICE', 'INVOICE', 'RECEIPT', 'DELIVERY_ORDER', 'QUOTATION', 'PURCHASE_ORDER', 'CREDIT_NOTE', 'DEBIT_NOTE', 'UNKNOWN']

function SideSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '9px 12px', background: '#f8fafc',
          border: 'none', borderBottom: open ? '1px solid #f1f5f9' : 'none',
          fontSize: 11, fontWeight: 700, color: '#374151',
          textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
        }}
      >
        <span>{title}</span>
        <span style={{ color: '#94a3b8', fontSize: 9, marginLeft: 6 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '10px 12px' }}>{children}</div>}
    </div>
  )
}

export default function PromptPage() {
  const [text, setText]         = useState('')
  const [original, setOriginal] = useState('')
  const [status, setStatus]     = useState(null)
  const [wordWrap, setWordWrap] = useState(false)
  const [mode, setMode]         = useState('simple')
  const textareaRef             = useRef()
  const lineNumRef              = useRef()
  const lineCount               = text.split('\n').length

  useEffect(() => {
    fetch(`${API}/prompt`)
      .then(r => r.json())
      .then(d => { const p = d.prompt ?? ''; setText(p); setOriginal(p) })
      .catch(() => setStatus('error'))
  }, [])

  const isDirty       = text !== original
  const missingVar    = !text.includes('{OCR_TEXT}')

  async function handleSave() {
    setStatus('saving')
    try {
      const res = await fetch(`${API}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setOriginal(text)
      setStatus('saved')
      setTimeout(() => setStatus(null), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 3000)
    }
  }

  async function handleReset() {
    if (!confirm('คืนค่าการตั้งค่า AI กลับเป็นค่าเริ่มต้น?')) return
    setStatus('resetting')
    try {
      const res = await fetch(`${API}/prompt/reset`, { method: 'POST' })
      const d   = await res.json()
      const p   = d.prompt ?? ''
      setText(p); setOriginal(p)
      setStatus('saved')
      setTimeout(() => setStatus(null), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 3000)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el  = textareaRef.current
      const s   = el.selectionStart
      const end = el.selectionEnd
      const next = text.substring(0, s) + '  ' + text.substring(end)
      setText(next)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2 })
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  function handleScroll(e) {
    if (lineNumRef.current) lineNumRef.current.scrollTop = e.target.scrollTop
  }

  function insertAtCursor(snippet) {
    const el = textareaRef.current
    if (!el) return
    const s    = el.selectionStart
    const end  = el.selectionEnd
    const next = text.substring(0, s) + snippet + text.substring(end)
    setText(next)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + snippet.length; el.focus() })
  }

  const statusBar = {
    saving:    { color: '#0369a1', bg: '#e0f2fe', icon: '⏳', text: 'กำลังบันทึก...' },
    saved:     { color: '#15803d', bg: '#dcfce7', icon: '✓',  text: 'บันทึกแล้ว — มีผลกับเอกสารที่อัพโหลดใหม่' },
    error:     { color: '#b91c1c', bg: '#fee2e2', icon: '✕',  text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
    resetting: { color: '#6366f1', bg: '#eef2ff', icon: '↺',  text: 'กำลังคืนค่าเริ่มต้น...' },
  }[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', overflow: 'hidden' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexShrink: 0, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>ตั้งค่า AI วิเคราะห์เอกสาร</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>กำหนดวิธีที่ AI อ่านและสกัดข้อมูลจากเอกสาร — มีผลทันทีกับเอกสารที่อัพโหลดใหม่</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {[{ id: 'simple', label: '🧩 โหมดง่าย' }, { id: 'advanced', label: '⚙️ โหมดขั้นสูง' }].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                background: mode === m.id ? '#fff' : 'transparent',
                color: mode === m.id ? '#1e293b' : '#64748b',
                border: mode === m.id ? '1px solid #e2e8f0' : '1px solid transparent',
                borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', boxShadow: mode === m.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Status bar ─── */}
      {statusBar && (
        <div style={{ background: statusBar.bg, color: statusBar.color, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{statusBar.icon}</span><span>{statusBar.text}</span>
        </div>
      )}

      {/* ════════════════════════════════════════
          SIMPLE MODE
      ════════════════════════════════════════ */}
      {mode === 'simple' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>

          {/* Current-status card */}
          <div style={{
            background: isDirty ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${isDirty ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isDirty ? '#92400e' : '#15803d', marginBottom: 4 }}>
                {isDirty ? '⚠️ มีการแก้ไขที่ยังไม่ได้บันทึก' : '✅ การตั้งค่าปัจจุบัน'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {isDirty
                  ? 'คุณมีการแก้ไขใน "โหมดขั้นสูง" ที่ยังไม่ได้บันทึก'
                  : 'AI กำลังทำงานด้วยการตั้งค่าที่บันทึกล่าสุด'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isDirty && (
                <button
                  onClick={handleSave}
                  disabled={!!status || missingVar}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: (!!status || missingVar) ? 'not-allowed' : 'pointer', opacity: (!!status || missingVar) ? 0.6 : 1 }}
                >
                  💾 บันทึก
                </button>
              )}
              <button
                onClick={handleReset}
                disabled={!!status}
                style={{ background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: status ? 'not-allowed' : 'pointer', opacity: status ? 0.6 : 1 }}
              >
                ↺ คืนค่าเริ่มต้น
              </button>
            </div>
          </div>

          {/* What the AI extracts */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 10px' }}>AI จะสกัดข้อมูลอะไรจากเอกสาร?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {FIELD_GROUPS.map(g => (
                <div key={g.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 14px' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{g.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{g.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Document types */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 10px' }}>ประเภทเอกสารที่รองรับ</h2>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                <div key={key} style={{ background: '#eef2ff', borderRadius: 7, padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>{label}</span>
                  <span style={{ fontSize: 10, color: '#818cf8', marginTop: 1 }}>{key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 10px' }}>ขั้นตอนการทำงาน</h2>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              {[
                { icon: '📤', title: 'อัพโหลดเอกสาร',  desc: 'ระบบรับไฟล์ภาพหรือ PDF แล้วแปลงเป็นข้อความด้วย OCR' },
                { icon: '🤖', title: 'AI วิเคราะห์',    desc: 'AI ใช้คำสั่งที่ตั้งไว้เพื่อระบุและสกัดข้อมูลสำคัญออกมา' },
                { icon: '📊', title: 'แสดงผลลัพธ์',    desc: 'ข้อมูลที่สกัดได้จัดเก็บและแสดงผลในรูปแบบตาราง' },
              ].map((s, i, arr) => (
                <div key={s.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 36, height: 36, background: '#eef2ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{i + 1}. {s.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced mode CTA */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>ต้องการปรับแต่งคำสั่ง AI เอง?</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>สลับไปโหมดขั้นสูงเพื่อแก้ไขคำสั่งโดยตรง (สำหรับผู้เชี่ยวชาญ)</div>
            </div>
            <button
              onClick={() => setMode('advanced')}
              style={{ background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              ⚙️ โหมดขั้นสูง →
            </button>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════
          ADVANCED MODE
      ════════════════════════════════════════ */}
      {mode === 'advanced' && (
        <>
          {missingVar && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span>
              <span>Prompt ต้องมี <code style={{ background: '#ffedd5', padding: '1px 5px', borderRadius: 3 }}>{'{OCR_TEXT}'}</code> เพื่อให้ระบบแทรกข้อความ OCR</span>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            {isDirty && <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>● มีการแก้ไข</span>}
            <button
              onClick={handleReset}
              disabled={!!status}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: status ? 'not-allowed' : 'pointer', opacity: status ? 0.6 : 1 }}
            >
              ↺ คืนค่าเริ่มต้น
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || !!status || missingVar}
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: (!isDirty || !!status || missingVar) ? 'not-allowed' : 'pointer', opacity: (!isDirty || !!status || missingVar) ? 0.6 : 1 }}
            >
              {status === 'saving' ? 'กำลังบันทึก...' : '💾 บันทึก (Ctrl+S)'}
            </button>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
              {lineCount} บรรทัด · {text.length.toLocaleString()} ตัวอักษร · ~{Math.round(text.length / 4).toLocaleString()} tokens
            </span>
            {isDirty && <span style={{ fontSize: 11, color: '#f59e0b' }}>· แก้ไข {Math.abs(text.length - original.length)} ตัวอักษร</span>}
            <button
              onClick={() => setWordWrap(v => !v)}
              style={{ background: wordWrap ? '#e0e7ff' : '#f1f5f9', color: wordWrap ? '#4338ca' : '#64748b', border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
            >
              Word Wrap {wordWrap ? '✓' : ''}
            </button>
          </div>

          {/* Editor + Sidebar */}
          <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0, overflow: 'hidden' }}>

            {/* Editor */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', border: '1px solid #2d2d4e', borderRadius: 10, overflow: 'hidden', background: '#1e1e2e', minHeight: 0 }}>
                <div
                  ref={lineNumRef}
                  style={{ width: 44, flexShrink: 0, padding: '14px 0', background: '#1a1a2e', borderRight: '1px solid #2d2d4e', userSelect: 'none', overflowY: 'hidden', overflowX: 'hidden' }}
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} style={{ fontSize: 12, lineHeight: '21px', color: '#4a4a6a', paddingRight: 8, textAlign: 'right' }}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onScroll={handleScroll}
                  spellCheck={false}
                  style={{
                    flex: 1, minWidth: 0,
                    background: 'transparent', border: 'none', outline: 'none',
                    color: '#cdd6f4',
                    fontFamily: "'Consolas','Monaco','Courier New',monospace",
                    fontSize: 13, lineHeight: '21px',
                    padding: '14px 14px 14px 12px',
                    resize: 'none',
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    overflowWrap: wordWrap ? 'break-word' : 'normal',
                    overflowX: wordWrap ? 'hidden' : 'auto',
                    overflowY: 'scroll',
                  }}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ width: 248, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', overflowX: 'hidden' }}>

              <SideSection title="ตัวแปร (Variables)" defaultOpen={true}>
                <div
                  onClick={() => insertAtCursor('{OCR_TEXT}')}
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 7, background: text.includes('{OCR_TEXT}') ? '#f0fdf4' : '#fff7ed', border: `1px solid ${text.includes('{OCR_TEXT}') ? '#bbf7d0' : '#fed7aa'}` }}
                >
                  <div>
                    <code style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{'{OCR_TEXT}'}</code>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>คลิกเพื่อแทรก ณ เคอร์เซอร์</div>
                  </div>
                  <span style={{ fontSize: 12, color: text.includes('{OCR_TEXT}') ? '#15803d' : '#c2410c', fontWeight: 700, marginLeft: 8 }}>
                    {text.includes('{OCR_TEXT}') ? '✓' : '⚠'}
                  </span>
                </div>
              </SideSection>

              <SideSection title="Keyboard Shortcuts">
                {[
                  { key: 'Ctrl+S', desc: 'บันทึก' },
                  { key: 'Tab',    desc: 'เยื้อง 2 spaces' },
                  { key: 'Ctrl+Z', desc: 'Undo' },
                  { key: 'Ctrl+A', desc: 'เลือกทั้งหมด' },
                ].map(({ key, desc }) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{desc}</span>
                    <kbd style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 7px', color: '#374151', fontFamily: 'monospace' }}>{key}</kbd>
                  </div>
                ))}
              </SideSection>

              <SideSection title="ฟิลด์ที่สกัด">
                {FIELDS_REF.map(g => (
                  <div key={g.group} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 4 }}>{g.group}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {g.fields.map(f => (
                        <code key={f} style={{ fontSize: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 5px', color: '#374151' }}>{f}</code>
                      ))}
                    </div>
                  </div>
                ))}
              </SideSection>

              <SideSection title="ประเภทเอกสาร">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {DOC_TYPES.map(t => (
                    <span key={t} style={{ fontSize: 10, background: '#eef2ff', color: '#4f46e5', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </SideSection>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>💡 เคล็ดลับ</div>
                {[
                  'ระบุ "Respond ONLY in valid JSON"',
                  'ใส่ตัวอย่าง output schema ที่ครบถ้วน',
                  'ระบุ null สำหรับฟิลด์ที่ไม่มีข้อมูล',
                  'แก้ไขไม่ต้องรีสตาร์ท backend',
                ].map((tip, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#78350f', marginBottom: 4, paddingLeft: 10, position: 'relative', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0 }}>·</span>{tip}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
