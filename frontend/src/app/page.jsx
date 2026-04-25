"use client";
import { useCallback, useEffect, useState } from "react";
import UploadSection from "./components/UploadSection";
import DocumentTable from "./components/DocumentTable";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4 shadow-sm`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch(`${API}/summary`);
      if (res.ok) setDocuments(await res.json());
    } catch {
      // silently fail
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  function handleNewResult(result) {
    const analysis = result.analysis ?? {};
    const invoice = analysis.data ?? {};
    const amount = invoice.amount ?? {};
    const seller = invoice.seller ?? {};
    const buyer = invoice.buyer ?? {};

    const row = {
      id: result.id,
      filename: result.filename,
      stored_filename: result.stored_filename,
      created_at: result.created_at,
      document_type: invoice.document_type ?? null,
      seller: seller.name ?? null,
      buyer: buyer.name ?? null,
      subtotal: amount.subtotal ?? null,
      vat: amount.vat_amount ?? null,
      total: amount.total ?? null,
      status: analysis.status === "success" ? "NORMAL" : (analysis.status ?? "ERROR").toUpperCase(),
      reason: analysis.reason ?? null,
    };

    setDocuments((prev) => [row, ...prev]);
  }

  const totalAmount = documents.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0);
  const abnormalCount = documents.filter(d => d.status === "ABNORMAL").length;

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="เอกสารทั้งหมด"
          value={documents.length}
          color="bg-[var(--accent-soft)] text-[var(--accent)]"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
        <StatCard
          label="ยอดรวมทั้งหมด (฿)"
          value={totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          color="bg-emerald-100 text-emerald-600"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="พบความผิดปกติ"
          value={abnormalCount}
          color="bg-red-100 text-red-500"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      <UploadSection onResult={handleNewResult} />
      <DocumentTable documents={documents} onRefresh={fetchDocuments} loading={tableLoading} />

    </div>
  );
}
