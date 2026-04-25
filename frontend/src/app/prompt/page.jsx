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

export default function PromptPage() {
  const [text, setText]         = useState('')
  const [original, setOriginal] = useState('')
  const [status, setStatus]     = useState(null)
  const [lines, setLines]       = useState(1)
  const textareaRef             = useRef()

  useEffect(() => {
    fetch(`${API}/prompt`)
      .then(r => r.json())
      .then(d => { const p = d.prompt ?? ''; setText(p); setOriginal(p) })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => { setLines(text.split('\n').length) }, [text])

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
    saved:     { color: '#15803d', bg: '#dcfce7', icon: '✓', text: 'บันทึกแล้ว — มีผลกับเอกสารที่อัพโหลดใหม่' },
    error:     { color: '#b91c1c', bg: '#fee2e2', icon: '✕', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
    resetting: { color: '#6366f1', bg: '#eef2ff', icon: '↺', text: 'กำลังรีเซ็ต...' },
  }[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Prompt Editor</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>ปรับ prompt ที่ AI ใช้วิเคราะห์เอกสาร — มีผลทันทีกับเอกสารที่อัพโหลดใหม่</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {isDirty && <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>● มีการแก้ไข</span>}
          <button
            onClick={handleReset}
            disabled={!!status}
            style={{
              background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
              borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600,
              cursor: status ? 'not-allowed' : 'pointer', opacity: status ? 0.6 : 1,
            }}
          >
            ↺ Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || !!status || missingVar}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
              border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13,
              fontWeight: 600, cursor: (!isDirty || !!status || missingVar) ? 'not-allowed' : 'pointer',
              opacity: (!isDirty || !!status || missingVar) ? 0.6 : 1,
            }}
          >
            {status === 'saving' ? 'กำลังบันทึก...' : '💾 บันทึก (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* Status / warning bars */}
      {statusBar && (
        <div style={{ background: statusBar.bg, color: statusBar.color, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 10, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{statusBar.icon}</span><span>{statusBar.text}</span>
        </div>
      )}
      {missingVar && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 10, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span>Prompt ต้องมี <code style={{ background: '#ffedd5', padding: '1px 5px', borderRadius: 3 }}>{'{OCR_TEXT}'}</code> เพื่อให้ระบบแทรกข้อความ OCR</span>
        </div>
      )}

      {/* Main: editor + sidebar */}
      <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0 }}>

        {/* Editor column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Editor */}
          <div style={{ flex: 1, display: 'flex', border: '1px solid #2d2d4e', borderRadius: 10, overflow: 'hidden', background: '#1e1e2e', minHeight: 0 }}>
            {/* Line numbers */}
            <div style={{ padding: '14px 0', background: '#1a1a2e', borderRight: '1px solid #2d2d4e', userSelect: 'none', flexShrink: 0, minWidth: 48, textAlign: 'right', overflowY: 'hidden' }}>
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: '21px', color: '#4a4a6a', paddingRight: 10 }}>{i + 1}</div>
              ))}
            </div>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#cdd6f4', fontFamily: "'Consolas','Monaco','Courier New',monospace",
                fontSize: 13, lineHeight: '21px', padding: 14,
                resize: 'none', whiteSpace: 'pre', overflowWrap: 'normal',
              }}
            />
          </div>

          {/* Footer stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#94a3b8', marginTop: 7, flexShrink: 0 }}>
            <span>{lines} บรรทัด · {text.length.toLocaleString()} ตัวอักษร · ~{tokenEstimate.toLocaleString()} tokens</span>
            <span style={{ color: isDirty ? '#f59e0b' : '#94a3b8' }}>
              {isDirty ? `แก้ไข ${Math.abs(text.length - original.length)} ตัวอักษร` : 'ไม่มีการเปลี่ยนแปลง'}
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

          {/* Placeholder insert */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ตัวแปร (Variables)
            </div>
            <div style={{ padding: 12 }}>
              <div
                onClick={() => insertAtCursor('{OCR_TEXT}')}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 7, background: text.includes('{OCR_TEXT}') ? '#f0fdf4' : '#fff7ed', border: `1px solid ${text.includes('{OCR_TEXT}') ? '#bbf7d0' : '#fed7aa'}` }}
              >
                <div>
                  <code style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{'{OCR_TEXT}'}</code>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ตำแหน่งแทรกข้อความ OCR</div>
                </div>
                <span style={{ fontSize: 11, color: text.includes('{OCR_TEXT}') ? '#15803d' : '#c2410c', fontWeight: 600 }}>
                  {text.includes('{OCR_TEXT}') ? '✓' : '⚠'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
                คลิกที่ตัวแปรเพื่อแทรก ณ ตำแหน่งเคอร์เซอร์
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Keyboard Shortcuts
            </div>
            <div style={{ padding: '10px 14px' }}>
              {[
                { key: 'Ctrl+S', desc: 'บันทึก prompt' },
                { key: 'Tab',    desc: 'เยื้อง 2 spaces' },
                { key: 'Ctrl+Z', desc: 'Undo' },
                { key: 'Ctrl+A', desc: 'เลือกทั้งหมด' },
              ].map(({ key, desc }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{desc}</span>
                  <kbd style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 7px', color: '#374151', fontFamily: 'monospace' }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Fields reference */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ฟิลด์ที่สกัด
            </div>
            <div style={{ padding: '10px 14px' }}>
              {FIELDS_REF.map(g => (
                <div key={g.group} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 5 }}>{g.group}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {g.fields.map(f => (
                      <code key={f} style={{ fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 6px', color: '#374151' }}>{f}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document types */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ประเภทเอกสาร
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {DOC_TYPES.map(t => (
                <span key={t} style={{ fontSize: 11, background: '#eef2ff', color: '#4f46e5', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>💡 เคล็ดลับ</div>
            {[
              'ระบุ "Respond ONLY in valid JSON" เพื่อป้องกัน AI ตอบนอก JSON',
              'ใส่ตัวอย่าง output schema ที่ครบถ้วนเพื่อให้ AI เข้าใจโครงสร้าง',
              'ระบุ null สำหรับฟิลด์ที่ไม่มีข้อมูล แทนการเดา',
              'การแก้ไข prompt ไม่ต้องรีสตาร์ท backend',
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 5, paddingLeft: 12, position: 'relative', lineHeight: 1.5 }}>
                <span style={{ position: 'absolute', left: 0 }}>·</span>{tip}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
