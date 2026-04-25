'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'

function fmt(seconds) {
  if (seconds == null) return '—'
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`
  return `${seconds.toFixed(2)} s`
}

function pct(v) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function MetricCard({ label, value, sub, color = '#1d4ed8' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ConfusionMatrix({ tp, tn, fp, fn }) {
  const cell = (v, bg, label) => (
    <td style={{ background: bg, padding: '10px 16px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4 }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{v ?? '—'}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
    </td>
  )
  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 10px', color: '#94a3b8', fontSize: 11 }} />
            <th style={{ padding: '4px 10px', color: '#94a3b8', fontSize: 11 }}>Pred Success</th>
            <th style={{ padding: '4px 10px', color: '#94a3b8', fontSize: 11 }}>Pred Failure</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '4px 10px', color: '#64748b', fontSize: 11, fontWeight: 600 }}>Actual Success</td>
            {cell(tp, '#dcfce7', 'TP')}
            {cell(fn, '#fee2e2', 'FN')}
          </tr>
          <tr>
            <td style={{ padding: '4px 10px', color: '#64748b', fontSize: 11, fontWeight: 600 }}>Actual Failure</td>
            {cell(fp, '#fee2e2', 'FP')}
            {cell(tn, '#dcfce7', 'TN')}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function BleuBar({ score }) {
  const w = Math.round((score ?? 0) * 100)
  const color = w >= 80 ? '#16a34a' : w >= 50 ? '#ca8a04' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 48 }}>{pct(score)}</span>
    </div>
  )
}

const TABS = [
  { key: 'overview',     label: 'ภาพรวม' },
  { key: 'rounds',       label: 'แต่ละ Round' },
  { key: 'bleu',         label: 'BLEU Score' },
  { key: 'inconsistent', label: 'ไฟล์ไม่สม่ำเสมอ' },
]

export default function ReportsPage() {
  const [files, setFiles]       = useState([])
  const [selected, setSelected] = useState(null)
  const [report, setReport]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState('overview')

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

  const cfg     = report?.config || {}
  const cvb     = report?.consistency_vs_baseline || []
  const avgC    = report?.average_consistency || {}
  const bleu    = report?.bleu_scores || {}
  const incon   = report?.inconsistent_files || {}
  const inconList = Array.isArray(incon)
    ? incon.map(i => [i.file, i])
    : Object.entries(incon)

  const bleuRounds = Object.entries(bleu)
  const avgBleu = bleuRounds.length
    ? bleuRounds.reduce((s, [, v]) => s + (v.avg ?? 0), 0) / bleuRounds.length
    : null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Consistency Reports</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>วิเคราะห์ความสม่ำเสมอของระบบ OCR และ BLEU score</p>
      </div>

      {/* File selector */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>ไฟล์รายงาน:</label>
        <select
          value={selected || ''}
          onChange={e => setSelected(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 13, flex: 1, maxWidth: 340, background: '#fff', color: '#0f172a', outline: 'none' }}
        >
          {files.length === 0 && <option>ยังไม่มีรายงาน</option>}
          {files.map(f => <option key={f.filename} value={f.filename}>{f.filename}</option>)}
        </select>
        <button
          onClick={() => fetch(`${API}/reports`).then(r => r.json()).then(d => setFiles(Array.isArray(d) ? d : []))}
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}
        >
          Refresh
        </button>
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</div>}

      {!loading && !report && files.length === 0 && (
        <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 8 }}>ยังไม่มีรายงาน</div>
          <code style={{ fontSize: 12, background: '#e2e8f0', padding: '3px 8px', borderRadius: 4, color: '#374151' }}>
            python eval_test.py --rounds 5 --sample 100
          </code>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <MetricCard label="Rounds"          value={cfg.rounds ?? '—'}            color="#374151" />
            <MetricCard label="Files / Round"   value={cfg.files_per_round ?? '—'}   color="#374151" />
            <MetricCard label="Avg Accuracy"    value={pct(avgC.accuracy)}            color="#16a34a" />
            <MetricCard label="Avg F1-score"    value={pct(avgC.f1)}                  color="#6366f1" />
            {avgBleu != null && (
              <MetricCard
                label="Avg BLEU Score"
                value={pct(avgBleu)}
                sub="ความสม่ำเสมอของข้อความ"
                color={avgBleu >= 0.8 ? '#16a34a' : avgBleu >= 0.5 ? '#ca8a04' : '#dc2626'}
              />
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 18px', fontWeight: tab === t.key ? 700 : 400,
                  color: tab === t.key ? '#6366f1' : '#64748b',
                  borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5,
                  marginBottom: -2,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {tab === 'overview' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                สรุปแต่ละ Round (vs Round 1 Baseline)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Round', 'Files', 'Accuracy', 'Precision', 'Recall', 'F1', 'BLEU', 'Avg Time'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cvb.map(item => (
                      <tr key={item.round} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>R{item.round}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#64748b' }}>{item.common_files}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{pct(item.metrics?.accuracy)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#374151' }}>{pct(item.metrics?.precision)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#374151' }}>{pct(item.metrics?.recall)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>{pct(item.metrics?.f1)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#ca8a04', fontWeight: 600 }}>
                          {bleu[item.round] ? pct(bleu[item.round].avg) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#94a3b8' }}>{fmt(item.timing?.avg)}</td>
                      </tr>
                    ))}
                    {cvb.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>ไม่มีข้อมูล (ต้องการ ≥ 2 rounds)</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Per Round */}
          {tab === 'rounds' && (
            <div>
              {cvb.map(item => (
                <div key={item.round} style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 14 }}>
                    Round {item.round}
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>{item.common_files} ไฟล์</span>
                  </div>
                  <ConfusionMatrix
                    tp={item.metrics?.tp} tn={item.metrics?.tn}
                    fp={item.metrics?.fp} fn={item.metrics?.fn}
                  />
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <MetricCard label="Accuracy"  value={pct(item.metrics?.accuracy)}  color="#16a34a" />
                    <MetricCard label="Precision" value={pct(item.metrics?.precision)} color="#2563eb" />
                    <MetricCard label="Recall"    value={pct(item.metrics?.recall)}    color="#9333ea" />
                    <MetricCard label="F1-score"  value={pct(item.metrics?.f1)}        color="#ea580c" />
                    {bleu[item.round] && (
                      <MetricCard label="BLEU Score" value={pct(bleu[item.round].avg)} color="#ca8a04" sub="text consistency" />
                    )}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                    เวลา/ไฟล์ — min: {fmt(item.timing?.min)} | max: {fmt(item.timing?.max)} | avg: {fmt(item.timing?.avg)}
                  </div>
                </div>
              ))}
              {cvb.length === 0 && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  ต้องการ ≥ 2 rounds เพื่อเปรียบเทียบ
                </div>
              )}
            </div>
          )}

          {/* Tab: BLEU */}
          {tab === 'bleu' && (
            <div>
              {bleuRounds.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ marginBottom: 8, fontWeight: 600, color: '#64748b' }}>ไม่มีข้อมูล BLEU</div>
                  <div style={{ fontSize: 13 }}>รัน eval_test.py เวอร์ชันใหม่ (รองรับ BLEU) เพื่อดูผลลัพธ์</div>
                </div>
              ) : (
                <>
                  {/* BLEU explanation */}
                  <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 13, color: '#3730a3' }}>
                    <strong>BLEU Score</strong> วัดความคล้ายคลึงของข้อความที่ AI สกัดออกมาระหว่างแต่ละ round
                    เทียบกับ Round 1 เป็น baseline โดยใช้ n-gram precision (BLEU-2)
                    ยิ่งสูงยิ่งดี — สะท้อนว่า AI ตอบคำถามเดิมด้วยข้อความที่สม่ำเสมอแค่ไหน
                  </div>

                  {/* Per-round BLEU bars */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      BLEU Score แต่ละ Round
                    </div>
                    <div style={{ padding: 20 }}>
                      {bleuRounds.map(([rn, data]) => (
                        <div key={rn} style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Round {rn}</span>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{Object.keys(data.per_file || {}).length} ไฟล์</span>
                          </div>
                          <BleuBar score={data.avg} />
                        </div>
                      ))}
                      {avgBleu != null && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>ค่าเฉลี่ยรวม</div>
                          <BleuBar score={avgBleu} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Per-file BLEU for last comparison round */}
                  {bleuRounds.length > 0 && (() => {
                    const [lastRound, lastData] = bleuRounds[bleuRounds.length - 1]
                    const perFile = Object.entries(lastData.per_file || {})
                      .sort((a, b) => a[1] - b[1])
                    if (perFile.length === 0) return null
                    return (
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          BLEU ต่ำสุด 20 ไฟล์ (Round {lastRound})
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>ไฟล์</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', width: 240 }}>BLEU Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {perFile.slice(0, 20).map(([fname, score]) => (
                                <tr key={fname} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '10px 16px', color: '#374151', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fname}</td>
                                  <td style={{ padding: '10px 16px', width: 240 }}><BleuBar score={score} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}

          {/* Tab: Inconsistent */}
          {tab === 'inconsistent' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                ไฟล์ที่ผลลัพธ์ไม่สม่ำเสมอ ({inconList.length} ไฟล์)
              </div>
              {inconList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                  ✓ ทุกไฟล์ให้ผลลัพธ์เหมือนกันทุก round
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>ไฟล์</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Baseline (R1)</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>การเปลี่ยนแปลง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inconList.map(([fname, val]) => {
                        // Handle both old format (array: {file, labels, statuses}) and new (dict: [{round, baseline, this_round}])
                        const changes = Array.isArray(val) ? val : (val?.labels ? [] : val)
                        const baselineLabel = Array.isArray(val)
                          ? (changes[0]?.baseline ?? '—')
                          : (val?.labels?.[0] === 1 ? 'success' : 'failure')
                        return (
                          <tr key={fname} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 16px', color: '#374151', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fname}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{
                                background: baselineLabel === 'success' ? '#dcfce7' : '#fee2e2',
                                color: baselineLabel === 'success' ? '#166534' : '#991b1b',
                                borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                              }}>{baselineLabel}</span>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {Array.isArray(changes) && changes.map((c, i) => (
                                <span key={i} style={{ marginRight: 6 }}>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>R{c.round}: </span>
                                  <span style={{
                                    background: c.this_round === 'success' ? '#dcfce7' : '#fee2e2',
                                    color: c.this_round === 'success' ? '#166534' : '#991b1b',
                                    borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                                  }}>{c.this_round}</span>
                                </span>
                              ))}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
