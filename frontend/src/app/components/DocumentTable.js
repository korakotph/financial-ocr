"use client";
import { useState } from "react";
import StatusBadge from "./StatusBadge";

function fmt(value) {
  if (value == null) return <span className="text-[var(--muted)]">—</span>;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DocumentTable({ documents, onRefresh, loading }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--muted)]">
        <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading documents…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
          Documents
          {documents.length > 0 && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {documents.length}
            </span>
          )}
        </h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <RefreshIcon />
          Refresh
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--muted)]">
          <DocumentIcon />
          <p className="text-sm">No documents yet. Upload one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                <th className="px-6 py-3">File</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">VAT</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <>
                  <tr
                    key={doc.id}
                    onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
                    className="cursor-pointer border-b border-[var(--card-border)] transition-colors last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-6 py-3 font-medium max-w-[180px] truncate" title={doc.filename}>
                      {doc.filename}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {doc.document_type ?? <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate" title={doc.seller}>
                      {doc.seller ?? <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate" title={doc.buyer}>
                      {doc.buyer ?? <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(doc.subtotal)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(doc.vat)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(doc.total)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)] whitespace-nowrap">
                      {fmtDate(doc.created_at)}
                    </td>
                  </tr>
                  {expanded === doc.id && doc.reason && (
                    <tr key={`${doc.id}-detail`} className="bg-amber-50 dark:bg-amber-950/20">
                      <td colSpan={9} className="px-6 py-3 text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-semibold">Note: </span>{doc.reason}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
