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
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)" }}
        className="px-6 py-5 shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Financial OCR</h1>
              <p className="text-xs text-indigo-200">AI-powered document analysis</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-white">ระบบพร้อมใช้งาน</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
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
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="พบความผิดปกติ"
            value={abnormalCount}
            color="bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
          />
        </div>

        <UploadSection onResult={handleNewResult} />
        <DocumentTable documents={documents} onRefresh={fetchDocuments} loading={tableLoading} />
      </main>
    </div>
  );
}
