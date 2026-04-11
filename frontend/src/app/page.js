"use client";
import { useCallback, useEffect, useState } from "react";
import UploadSection from "./components/UploadSection";
import DocumentTable from "./components/DocumentTable";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch(`${API}/summary`);
      if (res.ok) setDocuments(await res.json());
    } catch {
      // silently fail — table will show empty state
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  function handleNewResult(result) {
    // Prepend the new document summary row derived from the analyze response
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top bar */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-[var(--foreground)]">
              Financial OCR
            </h1>
            <p className="text-xs text-[var(--muted)]">AI-powered document analysis</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <UploadSection onResult={handleNewResult} />
        <DocumentTable
          documents={documents}
          onRefresh={fetchDocuments}
          loading={tableLoading}
        />
      </main>
    </div>
  );
}
