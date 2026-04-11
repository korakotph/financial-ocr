"use client";
import { useRef, useState } from "react";

export default function UploadSection({ onResult }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function uploadFile(file) {
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      onResult(data);
      setFileName(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFiles(files) {
    if (files?.[0]) uploadFile(files[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-[var(--card-border)] px-6 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
          <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-[var(--foreground)]">อัปโหลดเอกสาร</span>
      </div>

      <div className="p-6">
        {/* Drop zone */}
        <div
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={dragging ? {
            background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
            borderColor: "var(--accent)",
          } : {}}
          className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-14 transition-all duration-200
            ${dragging
              ? "shadow-inner dark:bg-indigo-950/20"
              : "border-[var(--card-border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
            }
            ${loading ? "pointer-events-none" : ""}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {loading ? (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-soft)]" />
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[var(--accent)]" />
                <svg className="h-6 w-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--foreground)]">กำลังวิเคราะห์เอกสาร…</p>
                {fileName && <p className="mt-0.5 text-xs text-[var(--muted)] truncate max-w-[200px]">{fileName}</p>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${dragging ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white"}`}>
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  วางไฟล์ที่นี่ หรือ{" "}
                  <span className="text-[var(--accent)] underline underline-offset-2">เลือกไฟล์</span>
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">รองรับ JPG, PNG และ PDF</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400 animate-fade-in">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
