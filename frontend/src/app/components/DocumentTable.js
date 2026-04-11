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

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)]">เอกสารทั้งหมด</span>
          {documents.length > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
              {documents.length}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
        >
          <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          รีเฟรช
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--muted)]">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--card-border)]" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[var(--accent)]" />
          </div>
          <p className="text-sm">กำลังโหลดเอกสาร…</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--muted)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">ยังไม่มีเอกสาร</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">อัปโหลดเอกสารเพื่อเริ่มต้นใช้งาน</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)] dark:bg-slate-800/30">
                <th className="px-6 py-3 border-b border-[var(--card-border)]">ไฟล์</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)]">ประเภท</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)]">ผู้ขาย</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)]">ผู้ซื้อ</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)] text-right">ยอดก่อน VAT</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)] text-right">VAT</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)] text-right">ยอดรวม</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)]">สถานะ</th>
                <th className="px-4 py-3 border-b border-[var(--card-border)] whitespace-nowrap">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {documents.map((doc, i) => (
                <>
                  <tr
                    key={doc.id}
                    onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
                    className={`group cursor-pointer transition-colors hover:bg-[var(--accent-soft)]/30 animate-fade-in`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                          <svg className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <span className="max-w-[160px] truncate font-medium text-[var(--foreground)]" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {doc.document_type ?? <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 max-w-[130px] truncate" title={doc.seller}>
                      {doc.seller ?? <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 max-w-[130px] truncate" title={doc.buyer}>
                      {doc.buyer ?? <span className="text-[var(--muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm text-[var(--muted)]">{fmt(doc.subtotal)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm text-[var(--muted)]">{fmt(doc.vat)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold text-[var(--foreground)]">{fmt(doc.total)}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--muted)] whitespace-nowrap">
                      {fmtDate(doc.created_at)}
                    </td>
                  </tr>
                  {expanded === doc.id && doc.reason && (
                    <tr key={`${doc.id}-reason`} className="animate-fade-in">
                      <td colSpan={9} className="px-6 py-3 bg-amber-50 dark:bg-amber-950/20">
                        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          <span><strong>หมายเหตุ:</strong> {doc.reason}</span>
                        </div>
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
