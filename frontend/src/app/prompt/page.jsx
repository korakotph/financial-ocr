'use client'

import { useEffect, useState, useRef } from 'react'

const API = 'http://localhost:8000'

export default function PromptPage() {
  const [text, setText]       = useState('')
  const [original, setOriginal] = useState('')
  const [status, setStatus]   = useState(null) // null | 'saving' | 'saved' | 'error' | 'resetting'
  const [lines, setLines]     = useState(1)
  const textareaRef           = useRef()

  useEffect(() => {
    fetch(`${API}/prompt`)
      .then(r => r.json())
      .then(d => { setText(d.prompt); setOriginal(d.prompt) })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    setLines(text.split('\n').length)
  }, [text])

  const isDirty = text !== original

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
      setText(d.prompt)
      setOriginal(d.prompt)
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

  const statusBar = {
    saving:    { color: '#0369a1', bg: '#e0f2fe', text: 'กำลังบันทึก...' },
    saved:     { color: '#15803d', bg: '#dcfce7', text: '✓ บันทึกแล้ว — จะมีผลกับเอกสารที่อัพโหลดใหม่' },
    error:     { color: '#b91c1c', bg: '#fee2e2', text: '✕ เกิดข้อผิดพลาด กรุณาลองใหม่' },
    resetting: { color: '#6366f1', bg: '#eef2ff', text: 'กำลังรีเซ็ต...' },
  }[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <h1>Prompt Editor</h1>
          <p>แก้ไข prompt ที่ใช้วิเคราะห์เอกสาร — มีผลทันทีกับเอกสารที่อัพโหลดใหม่</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isDirty && (
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>● มีการแก้ไข</span>
          )}
          <button className="btn btn-secondary" onClick={handleReset} disabled={!!status}>
            ↺ Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!isDirty || !!status}
            style={{ opacity: (!isDirty || !!status) ? 0.6 : 1 }}
          >
            {status === 'saving' ? 'กำลังบันทึก...' : '💾 บันทึก (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      {statusBar && (
        <div style={{
          background: statusBar.bg, color: statusBar.color,
          padding: '8px 16px', borderRadius: 8, fontSize: 13,
          fontWeight: 500, marginBottom: 12, flexShrink: 0,
        }}>
          {statusBar.text}
        </div>
      )}

      {/* Tips */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, flexShrink: 0,
      }}>
        {[
          { tag: '{OCR_TEXT}', desc: 'ตำแหน่งที่จะแทรกข้อความ OCR' },
          { tag: 'Ctrl+S',     desc: 'บันทึก' },
          { tag: 'Tab',        desc: 'เยื้องบรรทัด' },
        ].map(t => (
          <div key={t.tag} style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 6, padding: '4px 10px', fontSize: 12,
          }}>
            <code style={{ color: '#6366f1', fontWeight: 700 }}>{t.tag}</code>
            <span style={{ color: '#64748b', marginLeft: 6 }}>— {t.desc}</span>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{
        flex: 1, display: 'flex', border: '1px solid #e2e8f0',
        borderRadius: 10, overflow: 'hidden', background: '#1e1e2e',
        minHeight: 0,
      }}>
        {/* Line numbers */}
        <div style={{
          padding: '14px 0', background: '#1a1a2e', borderRight: '1px solid #2d2d4e',
          userSelect: 'none', flexShrink: 0, minWidth: 48, textAlign: 'right',
        }}>
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: '21px', color: '#4a4a6a', paddingRight: 10 }}>
              {i + 1}
            </div>
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
            color: '#cdd6f4', fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: 13, lineHeight: '21px', padding: 14,
            resize: 'none', whiteSpace: 'pre', overflowWrap: 'normal',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 12, color: '#94a3b8', marginTop: 8, flexShrink: 0,
      }}>
        <span>{lines} บรรทัด · {text.length} ตัวอักษร</span>
        <span>prompt.txt · แก้ไขแล้วรีสตาร์ท backend ไม่จำเป็น</span>
      </div>
    </div>
  )
}
