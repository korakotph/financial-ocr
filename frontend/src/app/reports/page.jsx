'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'

function fmt(seconds) {
  if (seconds == null) return '-'
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`
  return `${seconds.toFixed(2)} s`
}

function pct(v) {
  if (v == null) return '-'
  return `${(v * 100).toFixed(1)}%`
}

function MetricCard({ label, value, sub, color = '#1d4ed8' }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '16px 20px', flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ConfusionMatrix({ tp, tn, fp, fn }) {
  const cell = (v, bg, label) => (
    <td style={{
      background: bg, padding: '12px 18px', textAlign: 'center',
      border: '1px solid #e5e7eb', borderRadius: 4,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
    </td>
  )
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 12px', color: '#6b7280', fontSize: 12 }}></th>
            <th style={{ padding: '6px 12px', color: '#6b7280', fontSize: 12 }}>Predicted Success</th>
            <th style={{ padding: '6px 12px', color: '#6b7280', fontSize: 12 }}>Predicted Failure</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '6px 12px', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Actual Success</td>
            {cell(tp, '#dcfce7', 'TP')}
            {cell(fn, '#fee2e2', 'FN')}
          </tr>
          <tr>
            <td style={{ padding: '6px 12px', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Actual Failure</td>
            {cell(fp, '#fee2e2', 'FP')}
            {cell(tn, '#dcfce7', 'TN')}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function RoundCard({ round, metrics, timing, isBaseline }) {
  const m = metrics || {}
  const t = timing || {}
  return (
    <div style={{
      background: '#fff', border: `2px solid ${isBaseline ? '#6366f1' : '#e5e7eb'}`,
      borderRadius: 10, padding: 20, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Round {round}</span>
        {isBaseline && (
          <span style={{
            background: '#6366f1', color: '#fff', fontSize: 11,
            borderRadius: 20, padding: '2px 10px',
          }}>Baseline</span>
        )}
      </div>

      {isBaseline ? (
        <div style={{ color: '#6b7280', fontSize: 13 }}>
          <div>Min: {fmt(t.min)} &nbsp;|&nbsp; Max: {fmt(t.max)} &nbsp;|&nbsp; Avg: {fmt(t.avg)} &nbsp;|&nbsp; Total: {fmt(t.total)}</div>
        </div>
      ) : (
        <>
          <ConfusionMatrix tp={m.tp} tn={m.tn} fp={m.fp} fn={m.fn} />
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <MetricCard label="Accuracy"  value={pct(m.accuracy)}  color="#16a34a" />
            <MetricCard label="Precision" value={pct(m.precision)} color="#2563eb" />
            <MetricCard label="Recall"    value={pct(m.recall)}    color="#9333ea" />
            <MetricCard label="F1-score"  value={pct(m.f1)}        color="#ea580c" />
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
            Time/file — Min: {fmt(t.min)} &nbsp;|&nbsp; Max: {fmt(t.max)} &nbsp;|&nbsp; Avg: {fmt(t.avg)}
          </div>
        </>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [files, setFiles]       = useState([])
  const [selected, setSelected] = useState(null)
  const [report, setReport]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState('rounds')

  useEffect(() => {
    fetch(`${API}/reports`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setFiles(list)
        if (list.length > 0) setSelected(list[0].filename)
      })
      .catch(() => setFiles([]))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    setReport(null)
    fetch(`${API}/reports/${selected}`)
      .then(r => r.json())
      .then(data => { setReport(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selected])

  const cfg      = report?.config || {}
  const rounds   = report?.per_round || []
  const baseline = rounds[0]
  const avgC     = report?.average_consistency || {}
  const incon    = report?.inconsistent_files || {}
  const inconList = Object.entries(incon)
  const cvb      = report?.consistency_vs_baseline || []

  const tabs = [
    { key: 'rounds',  label: 'Per Round' },
    { key: 'average', label: 'Average' },
    { key: 'files',   label: `Inconsistent (${inconList.length})` },
  ]

  return (
    <div className="content">
      <h1 style={{ marginBottom: 4 }}>Consistency Report</h1>
      <p style={{ color: '#6b7280', marginBottom: 20, marginTop: 0 }}>
        Compare each round against Round 1 baseline
      </p>

      {/* File selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <label style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Report file:</label>
        <select
          value={selected || ''}
          onChange={e => setSelected(e.target.value)}
          style={{
            border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px',
            fontSize: 14, minWidth: 280, background: '#fff',
          }}
        >
          {files.length === 0 && <option>No reports found</option>}
          {files.map(f => (
            <option key={f.filename} value={f.filename}>{f.filename}</option>
          ))}
        </select>
        <button
          onClick={() => fetch(`${API}/reports`).then(r=>r.json()).then(d => setFiles(Array.isArray(d) ? d : []))}

          style={{
            background: '#f3f4f6', border: '1px solid #d1d5db',
            borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
          }}
        >Refresh</button>
      </div>

      {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}

      {report && !loading && (
        <>
          {/* Config summary */}
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24,
          }}>
            <MetricCard label="Rounds"         value={cfg.rounds}          color="#374151" />
            <MetricCard label="Files / Round"  value={cfg.files_per_round} color="#374151" />
            <MetricCard
              label="Baseline Success"
              value={baseline?.results
                ? `${Object.values(baseline.results).filter(v=>v.label===1).length} / ${Object.keys(baseline.results).length}`
                : '-'}
              color="#16a34a"
            />
            <MetricCard
              label="Avg Consistency"
              value={pct(avgC.accuracy)}
              sub={`F1: ${pct(avgC.f1)}`}
              color="#6366f1"
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 20px', fontWeight: tab === t.key ? 700 : 400,
                  color: tab === t.key ? '#6366f1' : '#6b7280',
                  borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                  marginBottom: -2,
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* Tab: Per Round */}
          {tab === 'rounds' && (
            <div>
              {/* Baseline */}
              <RoundCard
                round={1}
                metrics={null}
                timing={baseline?.timing}
                isBaseline
              />
              {/* Comparison rounds */}
              {cvb.map(item => (
                <RoundCard
                  key={item.round}
                  round={item.round}
                  metrics={item.metrics}
                  timing={item.timing}
                  isBaseline={false}
                />
              ))}
            </div>
          )}

          {/* Tab: Average */}
          {tab === 'average' && (
            <div>
              <div style={{
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 10, padding: 24, marginBottom: 16,
              }}>
                <h3 style={{ marginTop: 0 }}>Average Consistency (Rounds 2–{cfg.rounds} vs Round 1)</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                  <MetricCard label="Accuracy"  value={pct(avgC.accuracy)}  color="#16a34a" />
                  <MetricCard label="Precision" value={pct(avgC.precision)} color="#2563eb" />
                  <MetricCard label="Recall"    value={pct(avgC.recall)}    color="#9333ea" />
                  <MetricCard label="F1-score"  value={pct(avgC.f1)}        color="#ea580c" />
                </div>

                <h3>Per-Round Metrics</h3>
                <table className="table" style={{ fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th>Round</th>
                      <th>Files</th>
                      <th>Accuracy</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1</th>
                      <th>Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cvb.map(item => (
                      <tr key={item.round}>
                        <td style={{ textAlign: 'center' }}>{item.round}</td>
                        <td style={{ textAlign: 'center' }}>{item.common_files}</td>
                        <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{pct(item.metrics?.accuracy)}</td>
                        <td style={{ textAlign: 'center' }}>{pct(item.metrics?.precision)}</td>
                        <td style={{ textAlign: 'center' }}>{pct(item.metrics?.recall)}</td>
                        <td style={{ textAlign: 'center' }}>{pct(item.metrics?.f1)}</td>
                        <td style={{ textAlign: 'center' }}>{fmt(item.timing?.avg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Inconsistent files */}
          {tab === 'files' && (
            <div style={{
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 10, padding: 24,
            }}>
              {inconList.length === 0 ? (
                <div style={{ color: '#16a34a', fontWeight: 600 }}>
                  All files gave identical results in every round.
                </div>
              ) : (
                <>
                  <p style={{ color: '#6b7280', marginTop: 0 }}>
                    {inconList.length} file(s) changed result compared to Round 1 baseline
                  </p>
                  <table className="table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th>File</th>
                        <th>Baseline (R1)</th>
                        <th>Changes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inconList.map(([fname, changes]) => (
                        <tr key={fname}>
                          <td style={{ wordBreak: 'break-all', maxWidth: 300 }}>{fname}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              background: changes[0]?.baseline === 'success' ? '#dcfce7' : '#fee2e2',
                              color: changes[0]?.baseline === 'success' ? '#166534' : '#991b1b',
                              borderRadius: 20, padding: '2px 10px', fontSize: 12,
                            }}>
                              {changes[0]?.baseline || '-'}
                            </span>
                          </td>
                          <td>
                            {changes.map((c, i) => (
                              <span key={i} style={{ marginRight: 6 }}>
                                <span style={{ color: '#6b7280', fontSize: 12 }}>R{c.round}: </span>
                                <span style={{
                                  background: c.this_round === 'success' ? '#dcfce7' : '#fee2e2',
                                  color: c.this_round === 'success' ? '#166534' : '#991b1b',
                                  borderRadius: 20, padding: '2px 8px', fontSize: 12,
                                }}>
                                  {c.this_round}
                                </span>
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </>
      )}

      {!loading && !report && files.length === 0 && (
        <div style={{
          background: '#f9fafb', border: '1px dashed #d1d5db',
          borderRadius: 10, padding: 40, textAlign: 'center', color: '#6b7280',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No reports yet</div>
          <div style={{ fontSize: 13 }}>
            Run <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 4 }}>
              python eval_test.py --rounds 5 --sample 100
            </code> to generate a report
          </div>
        </div>
      )}
    </div>
  )
}
