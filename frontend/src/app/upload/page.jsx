'use client'

import { useState, useRef } from 'react'

const API = 'http://localhost:8000'

const STATUS_COLOR = {
  success:           { bg: '#dcfce7', text: '#166534' },
  ocr_failed:        { bg: '#fef9c3', text: '#854d0e' },
  llm_output_invalid:{ bg: '#fef9c3', text: '#854d0e' },
  timeout:           { bg: '#fee2e2', text: '#991b1b' },
  error:             { bg: '#fee2e2', text: '#991b1b' },
  llm_error:         { bg: '#fee2e2', text: '#991b1b' },
  uploading:         { bg: '#e0f2fe', text: '#075985' },
}

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || { bg: '#f3f4f6', text: '#374151' }
  return (
    <span style={{
      background: c.bg, color: c.text,
      borderRadius: 20, padding: '2px 12px', fontSize: 12, fontWeight: 600,
    }}>{status}</span>
  )
}

function ResultCard({ item }) {
  const [open, setOpen] = useState(false)
  const analysis = item.result?.analysis || {}
  const data = analysis.data || {}
  const amount = data.amount || {}

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 8,
      marginBottom: 10, overflow: 'hidden', background: '#fff',
    }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', cursor: 'pointer',
          background: item.error ? '#fff7f7' : '#fff',
        }}
        onClick={() => !item.uploading && setOpen(o => !o)}
      >
        <span style={{ fontSize: 20 }}>
          {item.uploading ? '⏳' : item.error ? '❌' : analysis.status === 'success' ? '✅' : '⚠️'}
        </span>
        <span style={{ flex: 1, fontSize: 13, wordBreak: 'break-all' }}>{item.filename}</span>
        {item.uploading
          ? <span style={{ fontSize: 12, color: '#6b7280' }}>Uploading...</span>
          : item.error
            ? <span style={{ fontSize: 12, color: '#dc2626' }}>{item.error}</span>
            : <StatusBadge status={analysis.status} />
        }
        {!item.uploading && !item.error && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
        )}
      </div>

      {/* Detail */}
      {open && !item.uploading && !item.error && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', fontSize: 13 }}>
          {analysis.status === 'success' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><b>Type:</b> {data.document_type || '-'}</div>
              <div><b>Doc No:</b> {data.document_number || '-'}</div>
              <div><b>Seller:</b> {data.seller?.name || '-'}</div>
              <div><b>Buyer:</b> {data.buyer?.name || '-'}</div>
              <div><b>Subtotal:</b> {amount.subtotal?.toLocaleString() ?? '-'}</div>
              <div><b>VAT:</b> {amount.vat_amount?.toLocaleString() ?? '-'}</div>
              <div><b>Total:</b> {amount.total?.toLocaleString() ?? '-'}</div>
              <div><b>ID:</b> <span style={{ color: '#9ca3af', fontSize: 11 }}>{item.result?.id}</span></div>
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>
              <b>Status:</b> {analysis.status}
              {analysis.reason && <span> — {analysis.reason}</span>}
              {analysis.raw && (
                <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: 'pre-wrap', color: '#374151' }}>
                  {typeof analysis.raw === 'string' ? analysis.raw.slice(0, 500) : JSON.stringify(analysis.raw, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function UploadPage() {
  const [items, setItems]     = useState([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  function updateItem(filename, patch) {
    setItems(prev => prev.map(it => it.filename === filename ? { ...it, ...patch } : it))
  }

  async function uploadFile(file) {
    const filename = file.name
    setItems(prev => [...prev, { filename, uploading: true }])

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/analyze`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      updateItem(filename, { uploading: false, result })
    } catch (e) {
      updateItem(filename, { uploading: false, error: e.message })
    }
  }

  function handleFiles(fileList) {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    Array.from(fileList)
      .filter(f => allowed.includes(f.type))
      .forEach(uploadFile)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const done    = items.filter(i => !i.uploading && !i.error)
  const success = done.filter(i => i.result?.analysis?.status === 'success').length
  const failed  = done.length - success

  return (
    <div className="content">
      <h1 style={{ marginBottom: 4 }}>Upload Documents</h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 20 }}>
        อัพโหลดภาพใบแจ้งหนี้ / Invoice เพื่อ OCR และวิเคราะห์ด้วย AI
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
          borderRadius: 12, padding: '48px 24px', textAlign: 'center',
          cursor: 'pointer', background: dragging ? '#eef2ff' : '#fafafa',
          transition: 'all 0.2s', marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
          วาง ไฟล์ที่นี่ หรือ คลิกเพื่อเลือกไฟล์
        </div>
        <div style={{ color: '#9ca3af', fontSize: 13 }}>
          รองรับ JPG, PNG, PDF — อัพโหลดได้หลายไฟล์พร้อมกัน
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Summary bar */}
      {items.length > 0 && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
        }}>
          {[
            { label: 'Total',     value: items.length,                    color: '#374151' },
            { label: 'Uploading', value: items.filter(i=>i.uploading).length, color: '#0369a1' },
            { label: 'Success',   value: success,                         color: '#16a34a' },
            { label: 'Failed',    value: failed,                          color: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '10px 20px', minWidth: 100,
            }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
          <button
            onClick={() => setItems([])}
            style={{
              marginLeft: 'auto', alignSelf: 'center',
              background: '#f3f4f6', border: '1px solid #d1d5db',
              borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13,
            }}
          >Clear all</button>
        </div>
      )}

      {/* Results list */}
      {items.map(item => <ResultCard key={item.filename} item={item} />)}
    </div>
  )
}
