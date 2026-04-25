"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

function StatCard({ label, value, icon, bg, iconColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: bg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#64748b' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    NORMAL:   { bg: '#dcfce7', color: '#166534' },
    ABNORMAL: { bg: '#fee2e2', color: '#991b1b' },
    ERROR:    { bg: '#fef9c3', color: '#854d0e' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
    }}>{status}</span>
  );
}

function fmt(n) {
  if (n == null) return '—';
  return parseFloat(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/summary`);
      if (res.ok) setDocuments(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const totalAmount = documents.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0);
  const normalCount   = documents.filter(d => d.status === 'NORMAL').length;
  const abnormalCount = documents.filter(d => d.status === 'ABNORMAL').length;
  const errorCount    = documents.filter(d => d.status === 'ERROR').length;
  const recent = documents.slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Dashboard</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>ภาพรวมการวิเคราะห์เอกสารทางการเงิน</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 12px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>ระบบพร้อมใช้งาน</span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard
          label="เอกสารทั้งหมด"
          value={documents.length}
          bg="#eef2ff" iconColor="#6366f1"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
        <StatCard
          label="ยอดรวมทั้งหมด (฿)"
          value={totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          bg="#ecfdf5" iconColor="#10b981"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="ปกติ"
          value={normalCount}
          bg="#dcfce7" iconColor="#16a34a"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="พบความผิดปกติ"
          value={abnormalCount}
          bg="#fee2e2" iconColor="#ef4444"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      {/* Recent documents */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>เอกสารล่าสุด</div>
          <Link href="/documents" style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            ดูทั้งหมด →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>กำลังโหลด...</div>
        ) : recent.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            ยังไม่มีเอกสาร —{' '}
            <Link href="/upload" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>อัพโหลดเอกสาร</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  {['ชื่อไฟล์', 'ประเภท', 'ผู้ขาย', 'ผู้ซื้อ', 'ยอดรวม (฿)', 'สถานะ'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((doc, i) => (
                  <tr
                    key={doc.id ?? i}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '10px 16px', color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.filename ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{doc.document_type ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{doc.seller ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{doc.buyer ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#374151', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {doc.total != null ? fmt(doc.total) : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <StatusBadge status={doc.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Link href="/upload" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: 28 }}>📤</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>อัพโหลดเอกสาร</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>วิเคราะห์ใบแจ้งหนี้ / Invoice ด้วย AI</div>
            </div>
          </div>
        </Link>
        <Link href="/documents" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: 28 }}>📋</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>ดูเอกสารทั้งหมด</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ค้นหาและดูรายละเอียดเอกสาร</div>
            </div>
          </div>
        </Link>
      </div>

    </div>
  );
}
