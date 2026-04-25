'use client'

import { useEffect, useState, useRef } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'

const FIELDS_REF = [
  { group: 'เอกสาร', fields: ['document_type', 'document_number', 'document_date', 'due_date', 'reference_number', 'currency', 'payment_terms', 'payment_method'] },
  { group: 'ผู้ขาย / ผู้ซื้อ', fields: ['name', 'branch', 'tax_id', 'address', 'phone', 'email'] },
  { group: 'รายการสินค้า', fields: ['code', 'name', 'description', 'quantity', 'unit', 'unit_price', 'discount', 'amount'] },
  { group: 'ยอดเงิน', fields: ['gross_subtotal', 'discount', 'subtotal', 'vat_rate', 'vat_amount', 'withholding_tax', 'service_charge', 'total', 'amount_in_words'] },
  { group: 'อื่นๆ', fields: ['bank_account', 'notes', 'confidence_note'] },
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
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          borderBottom: open ? '1px solid #f1f5f9' : 'none',
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
  const tokenEstimate = Math.round(text.length / 4)

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
    if (!confirm('รีเซ็ต prompt กลับเป็นค่าเริ่มต้น?')) return
    setStatus('resetting')
    try {
      const res = await fetch(`${API}/prompt/reset`, { method: 'POST' })
      const d = await res.json()
      const p = d.prompt ?? ''
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
      const el = textareaRef.current
      const s  = el.selectionStart
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
    const s = el.selectionStart
    const e = el.selectionEnd
    const next = text.substring(0, s) + snippet + text.substring(e)
    setText(next)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + snippet.length; el.focus() })
  }

  const statusBar = {
    saving:    { color: '#0369a1', bg: '#e0f2fe', icon: '⏳', text: 'กำลังบันทึก...' },
    saved:     { color: '#15803d', bg: '#dcfce7', icon: '✓',  text: 'บันทึกแล้ว — มีผลกับเอกสารที่อัพโหลดใหม่' },
    error:     { color: '#b91c1c', bg: '#fee2e2', icon: '✕',  text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
    resetting: { color: '#6366f1', bg: '#eef2ff', icon: '↺',  text: 'กำลังรีเซ็ต...' },
  }[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexShrink: 0, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Prompt Editor</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>ปรับ prompt ที่ AI ใช้วิเคราะห์เอกสาร — มีผลทันทีกับเอกสารใหม่</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {isDirty && <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>● มีการแก้ไข</span>}
          <button
            onClick={handleReset}
            disabled={!!status}
            style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: status ? 'not-allowed' : 'pointer', opacity: status ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            ↺ Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || !!status || missingVar}
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: (!isDirty || !!status || missingVar) ? 'not-allowed' : 'pointer', opacity: (!isDirty || !!status || missingVar) ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {status === 'saving' ? 'กำลังบันทึก...' : '💾 บันทึก (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* Status / warning bars */}
      {statusBar && (
        <div style={{ background: statusBar.bg, color: statusBar.color, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{statusBar.icon}</span><span>{statusBar.text}</span>
        </div>
      )}
      {missingVar && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span>Prompt ต้องมี <code style={{ background: '#ffedd5', padding: '1px 5px', borderRadius: 3 }}>{'{OCR_TEXT}'}</code> เพื่อให้ระบบแทรกข้อความ OCR</span>
        </div>
      )}

      {/* Editor toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {lineCount} บรรทัด · {text.length.toLocaleString()} ตัวอักษร · ~{tokenEstimate.toLocaleString()} tokens
        </span>
        {isDirty && <span style={{ fontSize: 11, color: '#f59e0b' }}>· แก้ไข {Math.abs(text.length - original.length)} ตัวอักษร</span>}
        <button
          onClick={() => setWordWrap(v => !v)}
          style={{ marginLeft: 'auto', background: wordWrap ? '#e0e7ff' : '#f1f5f9', color: wordWrap ? '#4338ca' : '#64748b', border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          Word Wrap {wordWrap ? '✓' : ''}
        </button>
      </div>

      {/* Main: editor + sidebar */}
      <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0, overflow: 'hidden' }}>

        {/* Editor */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', border: '1px solid #2d2d4e', borderRadius: 10, overflow: 'hidden', background: '#1e1e2e', minHeight: 0 }}>
            {/* Line numbers — scrollTop synced via ref */}
            <div
              ref={lineNumRef}
              style={{ width: 44, flexShrink: 0, padding: '14px 0 14px', background: '#1a1a2e', borderRight: '1px solid #2d2d4e', userSelect: 'none', overflowY: 'hidden', overflowX: 'hidden' }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: '21px', color: '#4a4a6a', paddingRight: 8, textAlign: 'right' }}>{i + 1}</div>
              ))}
            </div>
            {/* Textarea */}
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
    </div>
  )
}
