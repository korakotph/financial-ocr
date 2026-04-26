'use client'

import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'

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

  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [clearing, setClearing]               = useState(false)
  const [clearDone, setClearDone]             = useState(false)

  async function handleClearAll() {
    setClearing(true)
    setConfirmClearAll(false)
    try {
      await fetch(`${API}/api/documents`, { method: 'DELETE' })
      setClearDone(true)
      setTimeout(() => setClearDone(false), 3000)
    } finally {
      setClearing(false)
    }
  }

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

      {/* Confirm clear all dialog */}
      {confirmClearAll && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>ยืนยันการลบข้อมูลทั้งหมด</div>
            <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20 }}>
              คุณต้องการ<strong style={{ color: '#dc2626' }}> ลบเอกสารทั้งหมด </strong>ในระบบหรือไม่?<br />การกระทำนี้ไม่สามารถย้อนกลับได้
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmClearAll(false)}
                style={{ padding: '8px 18px', background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleClearAll}
                style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <Section title="โซนอันตราย" desc="การกระทำที่ไม่สามารถย้อนกลับได้">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>ลบเอกสารทั้งหมด</div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>ลบข้อมูลเอกสารทุกรายการออกจากฐานข้อมูล</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {clearDone && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ ลบข้อมูลทั้งหมดเรียบร้อยแล้ว</span>}
            <button
              onClick={() => setConfirmClearAll(true)}
              disabled={clearing}
              style={{
                padding: '8px 20px',
                background: clearing ? '#f1f5f9' : '#fee2e2',
                color: clearing ? '#94a3b8' : '#dc2626',
                border: `1px solid ${clearing ? '#e2e8f0' : '#fecaca'}`,
                borderRadius: 7, fontSize: 13.5, fontWeight: 600,
                cursor: clearing ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {clearing ? 'กำลังลบ...' : '🗑 ลบเอกสารทั้งหมด'}
            </button>
          </div>
        </div>
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
