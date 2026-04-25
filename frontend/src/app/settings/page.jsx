'use client'

import { useState } from 'react'

function Section({ title, desc, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>
        {desc && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e2e8f0', borderRadius: 7,
  padding: '8px 11px', fontSize: 13.5, color: '#0f172a',
  outline: 'none', background: '#fff',
}

export default function SettingsPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saved, setSaved]       = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (!username || !password || password !== confirm) return
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setUsername(''); setPassword(''); setConfirm('')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>การตั้งค่า</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>จัดการผู้ใช้งานและการตั้งค่าระบบ</p>
      </div>

      {/* Add admin */}
      <Section title="เพิ่มผู้ดูแลระบบ" desc="สร้างบัญชีผู้ใช้ใหม่สำหรับเข้าใช้งานระบบ">
        <form onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Field label="Username">
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="กรอก username"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="กรอก password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </Field>
            <Field label="ยืนยัน Password">
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="ยืนยัน password"
                style={{ ...inputStyle, borderColor: confirm && password !== confirm ? '#fca5a5' : '#e2e8f0' }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = confirm && password !== confirm ? '#fca5a5' : '#e2e8f0'}
              />
            </Field>
          </div>

          {confirm && password !== confirm && (
            <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>Password ไม่ตรงกัน</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              disabled={!username || !password || password !== confirm}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white', border: 'none', borderRadius: 7,
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                opacity: (!username || !password || password !== confirm) ? 0.5 : 1,
              }}
            >
              เพิ่มผู้ใช้งาน
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ เพิ่มผู้ใช้งานสำเร็จ</span>
            )}
          </div>
        </form>
      </Section>

      {/* Info */}
      <Section title="ข้อมูลระบบ" desc="เวอร์ชันและการตั้งค่าปัจจุบัน">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'ระบบ', value: 'Financial OCR' },
            { label: 'เวอร์ชัน', value: '1.0.0' },
            { label: 'Backend', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010' },
            { label: 'Frontend', value: 'Next.js 16' },
          ].map(item => (
            <div key={item.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 13.5, color: '#374151', fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
