import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { MetricCard, Panel, PanelHeader, PanelBody, Tag, Button, QualityBar } from '../components/ui.jsx'
import { normalizeProfile, computeQualityMetrics } from '../utils/qualityMetrics.js'
import {
  Database,
  List,
  Network,
  Activity,
  Brain,
  BarChart3,
  Map,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Circle,
  Download
} from 'lucide-react'

const statusVariant = { done: 'done', running: 'run', idle: 'idle' }
const statusLabel = {
  done: <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={10} /> DONE</span>,
  running: <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={10} className="animate-spin" /> RUNNING</span>,
  idle: <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Circle size={10} /> IDLE</span>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [ringOffset, setRingOffset] = useState(270)

  const [graphData, setGraphData] = useState({ nodes: [], links: [], colsCount: 0 })
  const [connInfo, setConnInfo] = useState({ status: 'disconnected', url: '', engine: '' })
  const [profileData, setProfileData] = useState(null)
  const [dictData, setDictData] = useState(null)
  const [agents, setAgents] = useState([
    { icon: Database, name: 'Schema Discovery', desc: 'Waiting...', status: 'idle' },
    { icon: BarChart3, name: 'Data Profiling', desc: 'Waiting...', status: 'idle' },
    { icon: Brain, name: 'Business Context', desc: 'Waiting...', status: 'idle' },
    { icon: Map, name: 'Structural Insights', desc: 'Waiting...', status: 'idle' },
  ])
  const [activity, setActivity] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const chartRef = useRef(null)

  const parseUrl = (url) => {
    if (!url) return { db: '' }
    try {
      // For Windows paths: remove proto and normalize slashes
      const clean = url.includes('://') ? url.split('://')[1] : url
      const parts = clean.replace(/\\/g, '/').split('/')
      return { db: parts[parts.length - 1] || 'Database' }
    } catch (e) { return { db: 'Database' } }
  }

  const addActivity = (color, text) => {
    setActivity(prev => [{ color, text, time: 'just now' }, ...prev].slice(0, 8))
  }

  useEffect(() => {
    const runAnalysis = async () => {
      setProfileData(null)
      setGraphData({ nodes: [], links: [] })
      try {
        // Step 1: Connection info
        const connRes = await fetch('http://localhost:8001/api/connection')
        const conn = await connRes.json()
        setConnInfo(conn)
        if (conn.status !== 'connected') return;

        // Step 2: Schema Discovery
        setAgents(prev => prev.map((a, i) => i === 0 ? { ...a, status: 'running', desc: 'Extracting schema...' } : a))
        addActivity('#60a5fa', 'Starting schema extraction...')

        const schemaRes = await fetch('http://localhost:8001/api/schema?infer=true')
        const schemaData = await schemaRes.json()
        const nodes = schemaData.tables || []
        const links = schemaData.relationships || []
        const colsCount = nodes.reduce((sum, n) => sum + (n.columns?.length || 0), 0)
        setGraphData({ nodes, links, colsCount })

        setAgents(prev => prev.map((a, i) =>
          i === 0 ? { ...a, status: 'done', desc: `${nodes.length} tables · ${colsCount} columns mapped` } :
            i === 1 ? { ...a, status: 'running', desc: 'Profiling data quality...' } : a
        ))
        addActivity('#4ade80', `Schema extraction complete — ${nodes.length} tables, ${colsCount} columns mapped.`)

        // Step 3: Data Profiling
        const profileRes = await fetch('http://localhost:8001/api/profile')
        const profile = normalizeProfile(await profileRes.json())
        setProfileData(profile)

        const rows = (profile.tables || []).reduce((s, t) => s + (t.row_count || 0), 0)
        setTotalRows(rows)

        setAgents(prev => prev.map((a, i) =>
          i === 1 ? { ...a, status: 'done', desc: `${rows.toLocaleString()} rows profiled across ${(profile.tables || []).length} tables` } :
            i === 2 ? { ...a, status: 'running', desc: 'Generating business context...' } : a
        ))
        addActivity('#4ade80', `Data profiling complete — ${rows.toLocaleString()} total rows analyzed.`)

        // Step 4: Business Context
        const dictRes = await fetch('http://localhost:8001/api/dictionary/quick')
        const dict = await dictRes.json()
        setDictData(dict)

        setAgents(prev => prev.map((a, i) =>
          i === 2 ? { ...a, status: 'done', desc: `Domain: ${dict.domain_analysis?.primary_domain || 'analyzed'}` } :
            i === 3 ? { ...a, status: 'running', desc: 'Structural analysis...' } : a
        ))
        addActivity('#60a5fa', `Business context generated — domain: ${dict.domain_analysis?.primary_domain || 'general'}.`)

        // Step 5: Structural Insights
        const insightsRes = await fetch('http://localhost:8001/api/insights')
        const insights = await insightsRes.json()

        setAgents(prev => prev.map((a, i) =>
          i === 3 ? { ...a, status: 'done', desc: `${insights.niche_columns?.length || 0} patterns detected` } : a
        ))
        addActivity('#4ade80', `Structural insights complete — architectural narrative generated.`)

      } catch (err) {
        console.error('Dashboard analysis error:', err)
        addActivity('#f87171', `Analysis error: ${err.message}`)
      }
    }

    runAnalysis()
  }, [connInfo.url]) // Trigger analysis when connection URL changes

  // Animate quality ring when profile data arrives
  useEffect(() => {
    if (profileData) {
      const q = computeQualityMetrics(profileData)
      const pct = q.overall / 100
      setTimeout(() => setRingOffset(270.2 * (1 - pct)), 400)
    }
  }, [profileData])

  const quality = profileData ? computeQualityMetrics(profileData) : { overall: 0, completeness: 0, consistency: 0, validity: 0, fkIntegrity: 0, uniqueness: 0, perTable: [] }
  const qualityColor = quality.overall >= 90 ? '#27ae60' : quality.overall >= 70 ? '#f39c12' : '#e74c3c'
  const qualityDelta = quality.overall >= 90 ? '▲ Excellent' : quality.overall >= 70 ? '● Good' : '▼ Needs Work'

  const dbName = connInfo.display_name || parseUrl(connInfo.url).db || 'Dashboard'

  // Build row count chart from profile data
  const rowCountChart = profileData ? (profileData.tables || []).map(t => ({
    name: t.name?.length > 14 ? t.name.slice(0, 14) + '…' : (t.name || 'unknown'),
    rows: Number(t.row_count ?? t.rows ?? t.count ?? 0),
  })).sort((a, b) => b.rows - a.rows).slice(0, 6) : []

  // ── Agnostic Insights Calculations ──────────────────────────
  const typeDistribution = useMemo(() => {
    const counts = { string: 0, numeric: 0, temporal: 0, boolean: 0, other: 0 }
    graphData.nodes.forEach(t => {
      (t.columns || []).forEach(c => {
        const type = (c.type || '').toLowerCase()
        if (type.includes('char') || type.includes('text') || type.includes('string')) counts.string++
        else if (type.includes('int') || type.includes('num') || type.includes('double') || type.includes('float') || type.includes('decimal')) counts.numeric++
        else if (type.includes('date') || type.includes('time') || type.includes('timestamp')) counts.temporal++
        else if (type.includes('bool') || type.includes('bit')) counts.boolean++
        else counts.other++
      })
    })
    return Object.entries(counts).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    })).filter(d => d.value > 0)
  }, [graphData.nodes])

  const radarData = useMemo(() => {
    return (quality.dims || []).map(d => ({ subject: d.label, A: d.pct, fullMark: 100 }))
  }, [quality.dims])

  const COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#27ae60', '#8e44ad']

  // ── PDF Export Handler ──────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!chartRef.current || isExporting) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      // Light Header Bar
      pdf.setFillColor(248, 250, 252)
      pdf.rect(0, 0, 210, 40, 'F')
      pdf.setDrawColor(226, 232, 240)
      pdf.line(0, 40, 210, 40)

      // Branded Header
      pdf.setTextColor(192, 57, 43)
      pdf.setFontSize(22)
      pdf.setFont('helvetica', 'bold')
      pdf.text('SchemaIQ', 20, 22)
      pdf.setTextColor(51, 65, 85)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Data Intelligence Report', 20, 28)

      // Metadata
      pdf.setTextColor(30, 41, 59)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Database: ${dbName}`, 20, 55)
      pdf.setTextColor(100, 116, 139)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 60)
      pdf.line(20, 68, 190, 68)

      // The Chart
      const imgWidth = 170
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 20, 80, imgWidth, imgHeight)

      // Footer
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(8)
      pdf.text('© 2026 SchemaIQ Platform · Autonomous Schema Control', 105, 285, { align: 'center' })
      pdf.save(`SchemaIQ_Row_Distribution_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 animate-fade-up">
        <h1 style={{ fontFamily: 'Space Mono', fontSize: 20, fontWeight: 700, color: '#e8e8f0' }}>
          Database Intelligence Dashboard
        </h1>
        <p style={{ fontSize: 13, color: '#666680', marginTop: 4 }}>
          {dbName} Explorer · {graphData.nodes.length || 0} tables · {totalRows.toLocaleString()} rows · Auto-analyzed by AI agents · Last run just now
        </p>
      </div>

      {/* Metric cards — 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <MetricCard icon={<Database size={22} />} label="Total Tables" value={graphData.nodes.length || '0'} delta="▲ All analyzed" cardColor="#27ae60" delay={50} />
        <MetricCard icon={<List size={22} />} label="Total Columns" value={graphData.colsCount || '0'} delta={`${totalRows.toLocaleString()} total rows`} cardColor="#2980b9" delay={100} />
        <MetricCard icon={<Network size={22} />} label="FK Relationships" value={graphData.links.length || '0'} delta="◉ ER diagram ready" deltaColor="text-yellow-400" cardColor="#f39c12" delay={150} />
        <MetricCard icon={<Activity size={22} />} label="Data Quality Score" value={profileData ? `${quality.overall}%` : '...'} delta={profileData ? qualityDelta : 'Analyzing...'} cardColor="#c0392b" delay={200} />
      </div>

      {/* Row 1 — Row Distribution + Composition + Agents */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        <Panel className="animate-fade-up delay-200">
          <PanelHeader title="Row Distribution" />
          <PanelBody>
            <div ref={chartRef} style={{ background: '#0f0f17' }}>
              {rowCountChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={rowCountChart} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80}
                      tick={{ fill: '#666680', fontSize: 8, fontFamily: 'Space Mono' }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 10 }}
                      itemStyle={{ color: '#e8e8f0' }} labelStyle={{ color: '#f0828a' }}
                      formatter={v => [v.toLocaleString(), 'Rows']}
                    />
                    <Bar dataKey="rows" fill="#c0392b" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444458', fontFamily: 'Space Mono', fontSize: 11 }}>
                  Analyzing Schema...
                </div>
              )}
            </div>
          </PanelBody>
        </Panel>

        {/* Schema Composition Donut */}
        <Panel className="animate-fade-up delay-250">
          <PanelHeader title="Schema Composition" />
          <PanelBody>
            <div style={{ display: 'flex', alignItems: 'center', height: 160 }}>
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    innerRadius={32}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ width: '50%', paddingLeft: 10 }}>
                {typeDistribution.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontSize: 10, color: '#666680', fontFamily: 'Space Mono' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </PanelBody>
        </Panel>

        <Panel className="animate-fade-up delay-250">
          <PanelHeader title="Agent Pipelines">
            <Button variant="ghost" onClick={() => navigate('/agents')}>View All →</Button>
          </PanelHeader>
          <PanelBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
              {agents.map(a => (
                <div key={a.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#16161f', border: '1px solid #1e1e2e',
                  borderRadius: 8, padding: '6px 10px',
                }}>
                  <div style={{ width: 26, height: 26, background: 'rgba(192,57,43,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <a.icon size={13} color="#c0392b" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 10, fontWeight: 700, color: '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  </div>
                  <Tag variant={statusVariant[a.status]}>
                    <span style={{ fontSize: 8 }}>{a.status.toUpperCase()}</span>
                  </Tag>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Row 2 — Radar + Completeness + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        
        {/* Architecture Radar */}
        <Panel className="animate-fade-up delay-300">
          <PanelHeader title="Architecture Integrity" />
          <PanelBody>
            <div style={{ display: 'flex', justifyContent: 'center', height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                  <PolarGrid stroke="#1e1e2e" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#666680', fontSize: 8, fontFamily: 'Space Mono' }} />
                  <Radar name="Quality" dataKey="A" stroke="#c0392b" fill="#c0392b" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </PanelBody>
        </Panel>

        {/* Per-Table Quality */}
        <Panel className="animate-fade-up delay-300">
          <PanelHeader title="Schema Completeness" />
          <PanelBody>
            <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
              {profileData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {quality.perTable.map(t => (
                    <QualityBar key={t.name} label={t.name} pct={t.score} color={t.color} />
                  ))}
                </div>
              ) : (
                <div style={{ color: '#444458', fontFamily: 'Space Mono', fontSize: 12, textAlign: 'center', padding: 20 }}>Profiling...</div>
              )}
            </div>
          </PanelBody>
        </Panel>

        {/* Activity */}
        <Panel className="animate-fade-up delay-350">
          <PanelHeader title="Intelligence Feed" />
          <PanelBody>
            <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
              {activity.length > 0 ? activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < activity.length - 1 ? '1px solid rgba(30,30,46,0.6)' : 'none' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.color, marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 10, color: '#b0b0c8', lineHeight: 1.4 }}>{a.text}</p>
                    <p style={{ fontFamily: 'Space Mono', fontSize: 8, color: '#444458', marginTop: 2 }}>{a.time}</p>
                  </div>
                </div>
              )) : (
                <div style={{ color: '#444458', fontFamily: 'Space Mono', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  Observing...
                </div>
              )}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* QueryBot CTA */}
      <div
        onClick={() => navigate('/querybot')}
        style={{
          background: 'linear-gradient(to right, rgba(192,57,43,0.1), rgba(41,128,185,0.1))',
          border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 12, padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          cursor: 'pointer', transition: 'border-color 0.2s',
        }}
        className="animate-fade-up delay-400"
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.6)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'}
      >
        <div style={{ color: '#f0828a' }}><MessageSquare size={24} /></div>
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: '#f0828a' }}>
            QueryBot — AI Database Assistant
          </div>
          <div style={{ fontSize: 12, color: '#666680', marginTop: 3 }}>
            Ask anything about your {graphData.nodes.length} tables and {totalRows.toLocaleString()} rows of data
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'Space Mono', fontSize: 11, color: '#666680' }}>Open →</div>
      </div>
    </div>
  )
}