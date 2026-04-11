"use client";
import { useRef, useState } from "react";

export default function UploadSection({ onResult }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function uploadFile(file) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      onResult(data);
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
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
        Upload Document
      </h2>

      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 transition-colors
          ${dragging
            ? "border-[var(--accent)] bg-blue-50 dark:bg-blue-950/20"
            : "border-[var(--card-border)] hover:border-[var(--accent)] hover:bg-slate-50 dark:hover:bg-slate-800/30"
          }
          ${loading ? "pointer-events-none opacity-60" : ""}
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
          <>
            <Spinner />
            <p className="text-sm text-[var(--muted)]">Analyzing document…</p>
          </>
        ) : (
          <>
            <UploadIcon />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Drop a file here or <span className="text-[var(--accent)]">browse</span>
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Supports images (JPG, PNG) and PDF
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="h-10 w-10 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
