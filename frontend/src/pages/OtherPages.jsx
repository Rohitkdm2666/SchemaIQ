import { useRef, useState, useEffect } from 'react'
import { Panel, PanelHeader, PanelBody, Tag, Button, MetricCard, QualityBar, Toggle, Input, Select } from '../components/ui.jsx'
import { RELATIONSHIPS, QUALITY_SCORES, ER_LINKS } from '../data/db.js' // ER_LINKS might be empty now
import ERDiagram from '../components/ERDiagram.jsx'
import ClassicERDiagram from '../components/ClassicERDiagram.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { schemaToGraph } from '../utils/schemaToGraph.js'

// ─── shared page header ──────────────────────────────────────────────────────
function PageHeader({ title, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: '#e8e8f0', margin: 0 }}>{title}</h1>
        {sub && <p style={{ fontSize: 14, color: '#666680', marginTop: 6 }}>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24 }}>{children}</div>}
    </div>
  )
}

// ─── shared form label ───────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
      {children}
    </div>
  )
}

// ─── ER DIAGRAM ──────────────────────────────────────────────────────────────
export function ERDiagramPage() {
  const svgRef = useRef(null)
  const canvasRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [diagramMode, setDiagramMode] = useState('modern')

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8001/api/schema?infer=true')
      .then(res => res.json())
      .then(data => {
        setGraphData(schemaToGraph(data))
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load schema", err)
        setLoading(false)
      })
  }, [])

  const handleNodeClick = (node) => setSelected(node.id)

  const toggleFullscreen = () => {
    const el = canvasRef.current
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => { })
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => { })
    }
  }

  // sync state if user presses Escape
  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullscreen(false) }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const markerColors = ['#c0392b', '#2980b9', '#9b59b6', '#27ae60', '#f39c12', '#e74c3c', '#8e44ad', '#666680']
  const LEGEND = graphData.nodes.map((n, i) => ({
    color: markerColors[i % markerColors.length],
    label: n.id
  }))

  const tablesCount = graphData.nodes.length
  const relsCount = graphData.links.length
  const colsCount = graphData.nodes.reduce((acc, n) => acc + (n.columns?.length || 0), 0)

  let validLinks = graphData.links

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 64px)' }}>
      <PageHeader title="Custom ER Diagram Viewer" sub="Smart Layout Engine · Expand/Collapse Nodes · Minimap · Search">
        <div style={{ display: 'flex', background: '#16161f', borderRadius: 8, padding: 4, marginRight: 16 }}>
           <button onClick={() => setDiagramMode('modern')} style={{ background: diagramMode === 'modern' ? '#c0392b' : 'transparent', color: diagramMode === 'modern' ? '#fff' : '#666680', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: 'pointer', transition: '0.2s' }}>Modern Relation</button>
           <button onClick={() => setDiagramMode('classic')} style={{ background: diagramMode === 'classic' ? '#c0392b' : 'transparent', color: diagramMode === 'classic' ? '#fff' : '#666680', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: 'pointer', transition: '0.2s' }}>Classic ER (Chen)</button>
        </div>
        <Button variant="ghost" onClick={() => svgRef.current?.__zoomOut?.()}>－</Button>
        <Button variant="ghost" onClick={() => svgRef.current?.__resetZoom?.()}>⊙ Reset</Button>
        <Button variant="ghost" onClick={() => svgRef.current?.__zoomIn?.()}>＋</Button>
        <Button variant="ghost" onClick={toggleFullscreen}>
          {fullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
        </Button>
        <Button variant="primary" onClick={() => {
          const svg = svgRef.current
          if (!svg) return
          const clone = svg.cloneNode(true)
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
          const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' })
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'schema_er.svg'; a.click()
        }}>⬇ SVG</Button>
      </PageHeader>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#888898' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, opacity: 0.85 }} />
            {l.label}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458' }}>
          💡 Drag nodes · Scroll to zoom · Click to inspect
        </div>
      </div>

      {/* Canvas + sidebar */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Graph Canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1, background: '#0f0f17', border: '1px solid #1e1e2e',
            borderRadius: 16, overflow: 'hidden', position: 'relative',
          }}
        >
          {loading ? (
            <div style={{ color: '#e8e8f0', padding: 20 }}>Loading AI Schema Engine...</div>
          ) : diagramMode === 'modern' ? (
            <ERDiagram svgRef={svgRef} nodes={graphData.nodes} links={graphData.links} onNodeClick={handleNodeClick} />
          ) : (
            <ClassicERDiagram svgRef={svgRef} nodes={graphData.nodes} links={graphData.links} />
          )}
        </div>

        {/* Right panel */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Selected node info */}
          <Panel>
            <PanelHeader title="Selected Table" />
            <PanelBody>
              {selected ? (
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: '#f0828a', marginBottom: 12 }}>{selected}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {validLinks.filter(l => (l.source.id || l.source) === selected || (l.target.id || l.target) === selected).map((l, i) => (
                      <div key={i} style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '9px 12px' }}>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#f0828a' }}>{l.source.id || l.source} → {l.target.id || l.target}</div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', marginTop: 3 }}>{l.via} · {l.card}</div>
                      </div>
                    ))}
                    {validLinks.filter(l => (l.source.id || l.source) === selected || (l.target.id || l.target) === selected).length === 0 && (
                      <div style={{ fontSize: 12, color: '#444458' }}>No FK relationships</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#444458', textAlign: 'center', padding: '16px 0' }}>Click a node to inspect</div>
              )}
            </PanelBody>
          </Panel>

          {/* All relationships */}
          <Panel>
            <PanelHeader title={`FK Relationships (${validLinks.length})`} />
            <PanelBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {validLinks.map((r, i) => (
                  <div key={i} style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#f0828a' }}>{r.source.id || r.source}</span>
                      <span style={{ color: '#444458' }}>→</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#f0828a' }}>{r.target.id || r.target}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Tag variant="info">{r.card}</Tag>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680' }}>via {r.via}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>

          {/* Stats */}
          <Panel>
            <PanelHeader title="Schema Stats" />
            <PanelBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Tables', tablesCount, '#27ae60'], ['Relations', relsCount, '#2980b9'], ['Rows', 'N/A', '#f39c12'], ['Columns', colsCount, '#9b59b6']].map(([l, v, c]) => (
                  <div key={l} style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─── DATA DICTIONARY ─────────────────────────────────────────────────────────
const DICT_TABLES = [
  {
    name: 'customers', rows: '99,441', cols: 5, pk: 'customer_id',
    summary: 'Stores one record per order placement, not per unique person. Use customer_unique_id to track repeat buyers. Primarily used for delivery geolocation and regional segmentation.',
    columns: [
      { name: 'customer_id', type: 'VARCHAR(32)', tags: ['PK', 'NOT NULL'], desc: 'Unique hashed identifier per order.', biz: 'Primary join key across orders and reviews. Anonymized for privacy.' },
      { name: 'customer_unique_id', type: 'VARCHAR(32)', tags: ['NOT NULL'], desc: 'Persistent ID across multiple orders.', biz: 'Use for LTV calculations and repeat purchase tracking.' },
      { name: 'customer_zip_code_prefix', type: 'INT', tags: ['NOT NULL', 'IDX'], desc: 'First 5 digits of postal code.', biz: 'Geo-segmentation. Join to geolocation for lat/lng.' },
      { name: 'customer_city', type: 'VARCHAR(64)', tags: ['NOT NULL'], desc: 'City name from postal code.', biz: 'City-level demand forecasting and regional campaigns.' },
      { name: 'customer_state', type: 'CHAR(2)', tags: ['NOT NULL'], desc: 'Brazilian state abbreviation.', biz: 'State-level tax rules and compliance reporting.' },
    ]
  },
  {
    name: 'orders', rows: '99,441', cols: 8, pk: 'order_id',
    summary: 'Central fact table. Each row is one complete order lifecycle. Connects to customers, order_items, payments, and reviews — the primary join hub of the schema.',
    columns: [
      { name: 'order_id', type: 'VARCHAR(32)', tags: ['PK', 'NOT NULL'], desc: 'Unique order hash ID.', biz: 'Most important join key — referenced by 4 downstream tables.' },
      { name: 'customer_id', type: 'VARCHAR(32)', tags: ['FK', 'NOT NULL'], desc: 'FK to customers.', biz: 'Links orders to customer geographic data.' },
      { name: 'order_status', type: 'VARCHAR(16)', tags: ['NOT NULL'], desc: 'Status: delivered, shipped, processing, canceled.', biz: 'Filter to "delivered" for revenue analysis.' },
      { name: 'order_purchase_timestamp', type: 'TIMESTAMP', tags: ['NOT NULL'], desc: 'UTC timestamp when order was placed.', biz: 'Seasonality analysis and cohort construction.' },
      { name: 'order_approved_at', type: 'TIMESTAMP', tags: ['NULLABLE'], desc: 'Payment approval timestamp.', biz: 'Gap from purchase reflects payment processing lag.' },
      { name: 'order_delivered_carrier_date', type: 'TIMESTAMP', tags: ['NULLABLE'], desc: 'When seller handed to carrier.', biz: 'Measures seller fulfilment speed (SLA compliance).' },
      { name: 'order_delivered_customer_date', type: 'TIMESTAMP', tags: ['NULLABLE'], desc: 'Actual delivery datetime.', biz: 'Compare to estimated for SLA breach rate.' },
      { name: 'order_estimated_delivery_date', type: 'TIMESTAMP', tags: ['NOT NULL'], desc: 'Estimated delivery date at purchase.', biz: 'Ground truth for customer promise — compute on-time rate.' },
    ]
  },
  {
    name: 'products', rows: '32,951', cols: 9, pk: 'product_id',
    summary: 'Product catalogue with physical attributes. Names are hashed for anonymisation. Dimension data is critical for freight cost modelling.',
    columns: [
      { name: 'product_id', type: 'VARCHAR(32)', tags: ['PK', 'NOT NULL'], desc: 'Unique hashed product ID.', biz: 'Join to order_items for sales volume.' },
      { name: 'product_category_name', type: 'VARCHAR(64)', tags: ['NULLABLE'], desc: 'Category in Portuguese. ~0.3% null.', biz: 'Primary dimension for category-level analysis.' },
      { name: 'product_name_lenght', type: 'INT', tags: ['NULLABLE'], desc: 'Char count of name (typo: "lenght").', biz: 'Proxy for listing quality.' },
      { name: 'product_description_lenght', type: 'INT', tags: ['NULLABLE'], desc: 'Char count of description.', biz: 'Richer descriptions correlate with conversion rate.' },
      { name: 'product_photos_qty', type: 'INT', tags: ['NULLABLE'], desc: 'Number of listing photos.', biz: 'More photos improve conversion rates.' },
      { name: 'product_weight_g', type: 'INT', tags: ['NULLABLE'], desc: 'Weight in grams.', biz: 'Key input for freight cost calculation.' },
      { name: 'product_length_cm', type: 'INT', tags: ['NULLABLE'], desc: 'Length in cm.', biz: 'Combined with height and width for volumetric weight.' },
      { name: 'product_height_cm', type: 'INT', tags: ['NULLABLE'], desc: 'Height in cm.', biz: 'Combined with length and width for volumetric weight.' },
      { name: 'product_width_cm', type: 'INT', tags: ['NULLABLE'], desc: 'Width in cm.', biz: 'Combined with length and height for volumetric weight.' },
    ]
  },
]

const TV = { PK: 'pk', FK: 'fk', IDX: 'idx', 'NOT NULL': 'nn', NULLABLE: 'warn' }

export function DictionaryPage() {
  const [dictTables, setDictTables] = useState(DICT_TABLES)
  const [activeTab, setActiveTab] = useState('customers')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('http://localhost:8001/api/schema')
      .then(res => res.json())
      .then(data => {
         if (data.tables && data.tables.length > 0) {
            const parsed = data.tables.map(t => ({
               name: t.name,
               rows: t.row_count || 0,
               cols: t.columns.length,
               pk: t.primary_keys ? t.primary_keys.join(', ') : '',
               summary: 'Dynamically loaded from database schema.',
               columns: t.columns.map(c => ({
                  name: c.name, type: c.type, 
                  tags: [(c.pk ? 'PK' : ''), (!c.notnull ? 'NULLABLE' : 'NOT NULL')].filter(Boolean),
                  desc: 'Auto-extracted column.', biz: 'Pending AI context.'
               }))
            }))
            setDictTables(parsed)
            setActiveTab(parsed[0].name)
         }
      })
      .catch(err => console.error(err))
  }, [])

  const t = dictTables.find(x => x.name === activeTab) || dictTables[0] || { name: 'Loading...', columns: [], rows: 0, cols: 0 }
  const cols = (t.columns || []).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.biz || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader title="AI Data Dictionary" sub="Auto-generated human-readable documentation · Business context from LLM agents">
        <Button variant="ghost">📄 Markdown</Button>
        <Button variant="ghost">📊 CSV</Button>
        <Button variant="primary">⬇ Export All</Button>
      </PageHeader>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {dictTables.map(tb => (
          <button key={tb.name} onClick={() => setActiveTab(tb.name)} style={{
            fontFamily: "'Space Mono',monospace", fontSize: 12, padding: '9px 18px',
            borderRadius: 8, border: `1px solid ${tb.name === activeTab ? '#c0392b' : '#1e1e2e'}`,
            background: tb.name === activeTab ? '#c0392b' : '#16161f',
            color: tb.name === activeTab ? '#fff' : '#666680', cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { if (tb.name !== activeTab) { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#f0828a' } }}
            onMouseLeave={e => { if (tb.name !== activeTab) { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#666680' } }}
          >{tb.name}</button>
        ))}
      </div>

      {/* Header row */}
      <div style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: '14px 14px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: '#f0828a' }}>{t.name}</div>
          <div style={{ fontSize: 13, color: '#666680', marginTop: 4 }}>{t.cols} columns · {t.rows} rows{t.pk ? ` · PK: ${t.pk}` : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search columns…"
            style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#e8e8f0', outline: 'none', fontFamily: "'Space Mono',monospace", width: 180 }}
            onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = '#1e1e2e'}
          />
          <Tag variant="done">AI Documented</Tag>
        </div>
      </div>

      {/* AI summary */}
      <div style={{ background: 'rgba(192,57,43,0.06)', borderLeft: '1px solid rgba(192,57,43,0.2)', borderRight: '1px solid rgba(192,57,43,0.2)', padding: '16px 24px' }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#f0828a' }}>🧠 AI Summary · </span>
        <span style={{ fontSize: 13, color: '#b0b0c8', lineHeight: 1.7 }}>{t.summary}</span>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #1e1e2e', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#16161f' }}>
              {['#', 'Column', 'Type', 'Constraints', 'Description', 'Business Meaning'].map(h => (
                <th key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #1e1e2e', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((c, i) => (
              <tr key={c.name} style={{ borderBottom: '1px solid rgba(30,30,46,0.6)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', padding: '13px 16px' }}>{String(i + 1).padStart(2, '0')}</td>
                <td style={{ padding: '13px 16px' }}><span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#f0828a' }}>{c.name}</span></td>
                <td style={{ padding: '13px 16px' }}><span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#3498db' }}>{c.type}</span></td>
                <td style={{ padding: '13px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.tags.map(tag => <Tag key={tag} variant={TV[tag] || 'default'}>{tag}</Tag>)}
                  </div>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#666680', lineHeight: 1.6, maxWidth: 200 }}>{c.desc}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#b0b0c8', lineHeight: 1.6, maxWidth: 220 }}>{c.biz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── DATA QUALITY ─────────────────────────────────────────────────────────────
const PER_TABLE = [
  { name: 'customers', score: 99.0, color: '#27ae60' }, { name: 'orders', score: 97.1, color: '#27ae60' },
  { name: 'order_items', score: 100, color: '#27ae60' }, { name: 'payments', score: 100, color: '#27ae60' },
  { name: 'products', score: 92.3, color: '#f39c12' }, { name: 'sellers', score: 98.4, color: '#27ae60' },
  { name: 'reviews', score: 74.2, color: '#f39c12' }, { name: 'geolocation', score: 85.1, color: '#f39c12' },
  { name: 'order_payments', score: 100, color: '#27ae60' },
]

const ISSUES = [
  { sev: 'err', title: 'reviews — High null rate in comment fields', desc: 'review_comment_title is 87.3% null. review_comment_message is 58.5% null.' },
  { sev: 'warn', title: 'geolocation — Inconsistent city name casing', desc: 'Mixed uppercase/lowercase entries for the same cities. Normalise with LOWER() before joins.' },
  { sev: 'warn', title: 'products — Typo in column names', desc: '"product_name_lenght" misspelling. Document and alias in SQL views.' },
  { sev: 'warn', title: 'orders — Null delivery timestamps', desc: '~2.9% of orders have null delivered_customer_date (canceled or in-transit orders).' },
  { sev: 'ok', title: 'order_items — No null values detected', desc: 'All 112,650 rows across 7 columns are fully populated. FK integrity confirmed.' },
]
const sevColor = { err: '#e74c3c', warn: '#f39c12', ok: '#27ae60' }
const sevTag = { err: 'err', warn: 'warn', ok: 'done' }
const sevLabel = { err: 'ERROR', warn: 'WARN', ok: 'PASS' }

export function QualityPage() {
  const dims = [
    { label: 'Completeness', pct: 97.1, stroke: '#27ae60' }, { label: 'Consistency', pct: 94.3, stroke: '#27ae60' },
    { label: 'Validity', pct: 91.8, stroke: '#f39c12' }, { label: 'FK Integrity', pct: 100, stroke: '#27ae60' },
    { label: 'Uniqueness', pct: 88.4, stroke: '#2980b9' },
  ]
  const [perTable, setPerTable] = useState(PER_TABLE)
  const [issues, setIssues] = useState(ISSUES)
  const [overallQuality, setOverallQuality] = useState(94.2)

  useEffect(() => {
    fetch('http://localhost:8001/api/profile')
      .then(res => res.json())
      .then(data => {
         if (data.tables) {
            const newTabs = data.tables.map(t => ({
               name: t.table,
               score: t.quality_score,
               color: t.quality_score >= 95 ? '#27ae60' : t.quality_score >= 85 ? '#f39c12' : '#e74c3c'
            }))
            setPerTable(newTabs)
            setOverallQuality(data.overall_quality)
            
            const newIssues = []
            data.tables.forEach(t => {
               (t.anomalies || []).forEach(a => newIssues.push({ sev: 'err', title: `Anomaly in ${t.table}`, desc: a }))
               ;(t.rules || []).forEach(r => newIssues.push({ sev: 'ok', title: `Rule for ${t.table}`, desc: r }))
            })
            if (newIssues.length > 0) setIssues(newIssues.slice(0, 10))
         }
      }).catch(console.error)
  }, [])

  return (
    <div>
      <PageHeader title="Data Quality Report" sub={`Statistical Profiling Agent · Overall score: ${overallQuality}% — Real-time ✅`}>
        <Button variant="primary">⬇ Export Report</Button>
      </PageHeader>

      {/* Dimension rings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
        {dims.map(d => (
          <div key={d.label} style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
          >
            <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 14px' }}>
              <svg viewBox="0 0 90 90" width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                <circle fill="none" stroke="#1e1e2e" strokeWidth="7" cx="45" cy="45" r="37" />
                <circle fill="none" stroke={d.stroke} strokeWidth="7" cx="45" cy="45" r="37"
                  strokeLinecap="round" strokeDasharray="232.5"
                  strokeDashoffset={232.5 * (1 - d.pct / 100)}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 15, fontWeight: 700, color: d.stroke }}>{d.pct}%</span>
              </div>
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Per-table scores */}
        <Panel>
          <PanelHeader title="Quality Score by Table" />
          <PanelBody>
            {perTable.map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#f0828a', minWidth: 130 }}>{t.name}</span>
                <div style={{ flex: 1, height: 6, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${t.score}%`, height: '100%', background: t.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: t.color, minWidth: 46, textAlign: 'right' }}>{t.score}%</span>
                <Tag variant={t.score >= 95 ? 'done' : t.score >= 85 ? 'warn' : 'err'}>{t.score >= 95 ? 'Excellent' : t.score >= 85 ? 'Good' : 'Review'}</Tag>
              </div>
            ))}
          </PanelBody>
        </Panel>

        {/* Issues */}
        <Panel>
          <PanelHeader title={`Quality Issues Detected (${issues.length})`}>
            <Tag variant="warn">Dynamic Profiler</Tag>
          </PanelHeader>
          <PanelBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor[issue.sev], marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#e8e8f0', marginBottom: 5 }}>{issue.title}</div>
                    <p style={{ fontSize: 12, color: '#666680', lineHeight: 1.6 }}>{issue.desc}</p>
                  </div>
                  <Tag variant={sevTag[issue.sev]}>{sevLabel[issue.sev]}</Tag>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Heatmap */}
      <Panel>
        <PanelHeader title="Null Rate Heatmap — Table × Dimension" />
        <PanelBody>
          <div style={{ display: 'grid', gridTemplateColumns: '130px repeat(5,1fr)', gap: 4 }}>
            {['', 'Completeness', 'Consistency', 'Validity', 'Uniqueness', 'FK Integrity'].map((h, i) => (
              <div key={i} style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, padding: '8px 10px', borderRadius: 5, color: '#666680', background: i === 0 ? 'transparent' : '#16161f', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{h}</div>
            ))}
            {[
              ['customers', [99, 98, 100, 97, 100]], ['orders', [97, 96, 98, 100, 100]],
              ['order_items', [100, 100, 100, 100, 100]], ['reviews', [41, 82, 95, 97, 100]],
              ['products', [99.7, 87, 94, 100, 100]], ['geolocation', [100, 62, 96, 78, null]],
            ].map(([name, vals]) => (
              <>{
                [<div key={name} style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#f0828a', display: 'flex', alignItems: 'center', paddingLeft: 4 }}>{name}</div>,
                ...vals.map((v, i) => {
                  const bg = v === null ? '#1a1a26' : v >= 95 ? 'rgba(39,174,96,0.22)' : v >= 80 ? 'rgba(243,156,18,0.18)' : 'rgba(192,57,43,0.22)'
                  const tc = v === null ? '#444458' : v >= 95 ? '#27ae60' : v >= 80 ? '#f39c12' : '#e74c3c'
                  return <div key={i} style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, padding: '9px 6px', borderRadius: 6, textAlign: 'center', background: bg, color: tc }}>{v === null ? 'N/A' : `${v}%`}</div>
                })]
              }</>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </div>
  )
}

// ─── AI AGENTS ────────────────────────────────────────────────────────────────
const AGENTS_DATA = [
  { emoji: '⛁', name: 'Schema Extraction Agent', role: 'Reads database metadata · extracts tables, columns, keys, constraints', color: '#27ae60', status: 'done', pct: 100, time: '1.2s', desc: 'Connects to the database, reads INFORMATION_SCHEMA, extracts DDL for all 9 tables. Outputs structured schema JSON for downstream agents.', outputs: ['9 tables extracted', '47 columns mapped', '12 FK relationships', 'DDL generated'] },
  { emoji: '⬡', name: 'Relationship Mapping Agent', role: 'Detects FK relationships · builds ER structure between tables', color: '#2980b9', status: 'done', pct: 100, time: '0.8s', desc: 'Analyses primary keys, foreign keys, and join paths. Builds a graph of table relationships with cardinality labels.', outputs: ['ER graph built', '12 edges mapped', 'Cardinality labelled', 'Join paths computed'] },
  { emoji: '📊', name: 'Data Profiling Agent', role: 'Null rates · inconsistencies · missing values · data freshness', color: '#f39c12', status: 'done', pct: 100, time: '4.1s', desc: 'Runs statistical profiling across all 47 columns: null rates, distinct counts, type validation, referential integrity checks, freshness scoring.', outputs: ['Null rates computed', 'Type validation done', 'Distinct value counts', 'Quality score: 94.2%'] },
  { emoji: '🧠', name: 'Business Context Agent', role: 'Uses LLM (GPT-4 / Gemini) to infer business meaning', color: '#f0828a', status: 'running', pct: 67, time: '~4s remaining', desc: 'Sends schema metadata + sample data patterns to an LLM. Generates human-readable descriptions and business definitions for each column.', outputs: ['customers ✓', 'orders ✓', 'order_items ✓', 'payments ⟳', 'products pending'] },
  { emoji: '📖', name: 'Data Dictionary Agent', role: 'Generates human-readable descriptions for all database entities', color: '#8e44ad', status: 'running', pct: 40, time: '~6s remaining', desc: 'Aggregates outputs from Schema, Profiling, and Business Context agents. Generates final structured data dictionary.', outputs: ['Markdown draft ⟳', 'HTML export pending', 'CSV export pending'] },
  { emoji: '🗺', name: 'Visualization Agent', role: 'Creates schema diagrams and relationship maps', color: '#666680', status: 'idle', pct: 0, time: 'Queued', desc: 'Renders ER diagrams from the relationship graph using SVG. Generates schema dependency graphs for the interactive dashboard.', outputs: ['Waiting for upstream agents…'] },
]

const PIPELINE = [
  { emoji: '⛁', label: 'Schema\nExtraction', status: 'done' },
  { emoji: '⬡', label: 'Relationship\nMapping', status: 'done' },
  { emoji: '📊', label: 'Data\nProfiling', status: 'done' },
  { emoji: '🧠', label: 'Business\nContext', status: 'running' },
  { emoji: '📖', label: 'Dictionary\nGeneration', status: 'running' },
  { emoji: '🗺', label: 'Visualization', status: 'idle' },
]

const LOG = [
  { t: '18:42:01', agent: '[SCHEMA]', color: '#27ae60', msg: '✓ Connected to olist_db at db.olist.internal:5432' },
  { t: '18:42:01', agent: '[SCHEMA]', color: '#3498db', msg: 'Scanning INFORMATION_SCHEMA.TABLES...' },
  { t: '18:42:02', agent: '[SCHEMA]', color: '#27ae60', msg: '✓ 9 tables, 47 columns extracted' },
  { t: '18:42:02', agent: '[RELMAP]', color: '#3498db', msg: 'Building FK relationship graph...' },
  { t: '18:42:03', agent: '[RELMAP]', color: '#27ae60', msg: '✓ 12 FK edges mapped, cardinality labelled' },
  { t: '18:42:03', agent: '[PROFILE]', color: '#3498db', msg: 'Profiling 47 columns across 9 tables...' },
  { t: '18:42:05', agent: '[PROFILE]', color: '#f39c12', msg: '⚠ reviews.review_comment_title: 87.3% null' },
  { t: '18:42:05', agent: '[PROFILE]', color: '#f39c12', msg: '⚠ geolocation_city: mixed casing detected' },
  { t: '18:42:07', agent: '[PROFILE]', color: '#27ae60', msg: '✓ Quality report: 94.2%' },
  { t: '18:42:07', agent: '[BIZCTX]', color: '#3498db', msg: 'Sending customers schema to GPT-4...' },
  { t: '18:42:09', agent: '[BIZCTX]', color: '#27ae60', msg: '✓ customers — 5 columns annotated' },
  { t: '18:42:10', agent: '[BIZCTX]', color: '#27ae60', msg: '✓ orders — 8 columns annotated' },
  { t: '18:42:12', agent: '[DICT]', color: '#3498db', msg: 'Aggregating all agent outputs...' },
  { t: '18:42:13', agent: '[DICT]', color: '#3498db', msg: 'Generating Markdown data dictionary...' },
]

export function AgentsPage() {
  return (
    <div>
      <PageHeader title="AI Agent Insights" sub="Multi-Agent Engine · 6 specialised agents · LangGraph orchestration">
        <Button variant="ghost">⟳ Re-run All</Button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <MetricCard icon="✓" label="Completed" value="4" delta="▲ agents done" cardColor="#27ae60" delay={0} />
        <MetricCard icon="⟳" label="Running" value="2" delta="● in progress" deltaColor="#f39c12" cardColor="#f39c12" delay={50} />
        <MetricCard icon="⏱" label="Total Runtime" value="14s" delta="▲ 3.2× faster" cardColor="#2980b9" delay={100} />
        <MetricCard icon="🧠" label="LLM Calls" value="47" delta="context-aware" deltaColor="#666680" cardColor="#9b59b6" delay={150} />
      </div>

      {/* Pipeline */}
      <Panel style={{ marginBottom: 16 }}>
        <PanelHeader title="Agent Execution Pipeline"><Tag variant="run">⟳ Running</Tag></PanelHeader>
        <PanelBody>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {PIPELINE.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    border: `2px solid ${step.status === 'done' ? '#27ae60' : step.status === 'running' ? '#f39c12' : '#252540'}`,
                    background: step.status === 'done' ? 'rgba(39,174,96,0.12)' : step.status === 'running' ? 'rgba(243,156,18,0.12)' : '#16161f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    animation: step.status === 'running' ? 'spin 2s linear infinite' : undefined,
                  }}>{step.emoji}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.4, maxWidth: 70 }}>{step.label}</div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step.status === 'done' ? '#27ae60' : '#1e1e2e', margin: '0 8px', marginBottom: 28 }} />
                )}
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {/* Agent cards + log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {AGENTS_DATA.map(a => (
            <Panel key={a.name}>
              <div style={{ height: 3, background: a.color, borderRadius: '14px 14px 0 0' }} />
              <PanelBody>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, background: a.color + '18' }}>{a.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: '#e8e8f0' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: '#666680', marginTop: 4 }}>{a.role}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Tag variant={a.status === 'done' ? 'done' : a.status === 'running' ? 'run' : 'idle'}>{a.status === 'done' ? '✓ DONE' : a.status === 'running' ? '⟳ RUNNING' : '○ IDLE'}</Tag>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', marginTop: 6 }}>{a.time}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#666680', lineHeight: 1.7, marginBottom: 14 }}>{a.desc}</p>
                <div style={{ height: 5, background: '#1e1e2e', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${a.pct}%`, height: '100%', background: a.color, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', marginBottom: 14 }}>
                  <span>Progress</span><span>{a.pct}%</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {a.outputs.map(o => (
                    <span key={o} style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, padding: '4px 10px', borderRadius: 20, border: `1px solid ${o.includes('✓') || a.status === 'done' ? 'rgba(39,174,96,0.35)' : '#252540'}`, background: o.includes('✓') || a.status === 'done' ? 'rgba(39,174,96,0.1)' : '#16161f', color: o.includes('✓') || a.status === 'done' ? '#27ae60' : '#666680' }}>{o}</span>
                  ))}
                </div>
              </PanelBody>
            </Panel>
          ))}
        </div>

        {/* Live log */}
        <Panel style={{ alignSelf: 'start', position: 'sticky', top: 80 }}>
          <PanelHeader title="Live Agent Log"><Tag variant="run">● LIVE</Tag></PanelHeader>
          <div style={{ background: '#0a0a0f', padding: '16px', fontFamily: "'Space Mono',monospace", fontSize: 11, lineHeight: 2, height: 640, overflowY: 'auto' }}>
            {LOG.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: '#333348', flexShrink: 0 }}>{l.t}</span>
                <span style={{ color: l.color, flexShrink: 0, minWidth: 66 }}>{l.agent}</span>
                <span style={{ color: l.color }}>{l.msg}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span style={{ color: '#333348', animation: 'blink 1s step-end infinite' }}>█</span>
              <span style={{ color: '#333348' }}>Waiting…</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ─── DB CONNECTIONS ───────────────────────────────────────────────────────────
export function ConnectionsPage() {
  const [dbData, setDbData] = useState({ tables: 0, cols: 0, rels: 0 })
  const [connInfo, setConnInfo] = useState({ status: 'disconnected', url: '', engine: '' })
  const [customDbUrl, setCustomDbUrl] = useState("")
  const [log, setLog] = useState([
    { color: '#27ae60', msg: '  [ OK ] DB Connection UI Ready' },
  ])
  const [testing, setTesting] = useState(false)

  // NEW STATES FOR FORM BUILDER
  const [inputMode, setInputMode] = useState('form') // 'url' | 'form' | 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const [formDb, setFormDb] = useState({
    engine: 'mysql+pymysql',
    user: 'root',
    password: 'root',
    host: 'localhost',
    port: '3306',
    database: 'practice_company'
  })

  const runFileUpload = async () => {
    if (!selectedFile) {
      setLog(prev => [...prev, { color: '#f39c12', msg: '  [ WARN ] Please select a file first!' }]);
      return;
    }
    setTesting(true);
    setLog([{ color: '#3498db', msg: `[ INFO ] Uploading ${selectedFile.name}...` }]);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('http://localhost:8001/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status === 'uploaded') {
        setLog(prev => [...prev, { color: '#27ae60', msg: `  [ OK ] Successfully loaded ${selectedFile.name} into virtual SQLite memory` }]);
        fetchData(); // Refresh everything
      } else {
        setLog(prev => [...prev, { color: '#e74c3c', msg: `  [ ERR ] ${data.detail || 'Upload failed'}` }]);
      }
    } catch(err) {
      setLog(prev => [...prev, { color: '#e74c3c', msg: `  [ ERR ] Upload failed: ${err.message}` }]);
    }
    setTesting(false);
  }

  const fetchData = () => {
    fetch('http://localhost:8001/api/schema?infer=true')
      .then(res => res.json())
      .then(data => {
        const nodes = data.tables || []
        const links = data.relationships || []
        const colsSum = nodes.reduce((sum, n) => sum + (n.columns?.length || 0), 0)
        setDbData({ tables: nodes.length, cols: colsSum, rels: links.length })
      })
      .catch(err => console.error(err))

    fetch('http://localhost:8001/api/connection')
      .then(res => res.json())
      .then(setConnInfo)
      .catch(console.error)
  }

  useEffect(() => { fetchData() }, [])

  const parseUrl = (url) => {
    if (!url) return { proto: '', user: '', hostPort: '', db: '' }
    try {
      const [proto, rest] = url.split('://')
      let [creds, hostPath] = rest.split('@')
      if (!hostPath) { hostPath = creds; creds = '' }
      const [hostPort, db] = hostPath.split('/')
      const user = creds.split(':')[0] || ''
      return { proto, user, hostPort, db }
    } catch (e) { return { proto: '', user: '', hostPort: '', db: '' } }
  }
  const parsed = parseUrl(connInfo.url)

  const runTest = async () => {
    setTesting(true); 
    setLog([{ color: '#3498db', msg: `[ INFO ] Testing connection/saving DB URL...` }])
    
    // Auto-construct URL if none provided manually
    let finalUrl = customDbUrl || "sqlite:///olist.db"
    
    if (inputMode === 'form') {
      const { engine, user, password, host, port, database } = formDb;
      finalUrl = `${engine}://${user}:${password}@${host}:${port}/${database}`
    }
    
    try {
      const res = await fetch('http://localhost:8001/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_url: finalUrl })
      })
      const data = await res.json()
      if (res.ok && data.status === 'connected') {
        setLog(prev => [...prev, { color: '#27ae60', msg: `  [ OK ] Connection successful to ${finalUrl}` }])
        fetchData() // Refresh everything
      } else {
        setLog(prev => [...prev, { color: '#e74c3c', msg: `  [ ERR ] ${data.detail || 'Connection failed'}` }])
      }
    } catch(err) {
      setLog(prev => [...prev, 
        { color: '#e74c3c', msg: `  [ ERR ] Fetch failed: ${err.message}` },
        { color: '#f39c12', msg: `  [ HINT ] This typically means a driver (e.g. pymysql for MySQL) is missing in the Python backend, crashing the request.` }
      ])
    }
    setTesting(false)
  }

  const engineTypes = {
    postgresql: 'postgresql', mysql: 'mysql', sqlite: 'sqlite'
  }

  const DBS = [
    { emoji: '🐘', name: 'PostgreSQL', desc: 'Full schema introspection, FK detection, constraint mapping.', connected: connInfo.engine === engineTypes.postgresql, latency: '12ms' },
    { emoji: '🐬', name: 'MySQL / MariaDB', desc: 'InnoDB schema extraction and stored procedure analysis.', connected: connInfo.engine === engineTypes.mysql, latency: '18ms' },
    { emoji: '🟦', name: 'SQL Server', desc: 'MSSQL metadata extraction with T-SQL support.', connected: false },
    { emoji: '🪶', name: 'SQLite', desc: 'Lightweight local DB for rapid prototyping.', connected: connInfo.engine === engineTypes.sqlite, latency: '2ms' },
    { emoji: '☁️', name: 'Cloud Warehouses', desc: 'BigQuery, Redshift, Snowflake via JDBC/ODBC.', connected: false, soon: true },
    { emoji: '📁', name: 'Flat Files / CSV', desc: 'Upload CSV or JSON. Auto-infers schema and types.', connected: false },
  ]

  return (
    <div>
      <PageHeader title="Database Connections" sub="Connect relational databases, cloud buffers, or flat files for analysis">
        <Button variant="primary">＋ New Connection</Button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <MetricCard icon="⚡" label="Active Connections" value="1" delta="● Online" cardColor="#27ae60" delay={0} />
        <MetricCard icon="⛁" label="Tables Discovered" value={dbData.tables || "0"} delta="▲ Auto-scanned" cardColor="#2980b9" delay={50} />
        <MetricCard icon="⏱" label="Avg Latency" value="12ms" delta="▲ Excellent" cardColor="#f39c12" delay={100} />
        <MetricCard icon="↻" label="Last Sync" value="2m" delta="ago" deltaColor="#666680" cardColor="#9b59b6" delay={150} />
      </div>

      {/* Engine grid */}
      <Panel style={{ marginBottom: 16 }}>
        <PanelHeader title="Supported Database Engines" />
        <PanelBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {DBS.map(db => (
              <div key={db.name} style={{
                background: '#16161f', borderRadius: 12, padding: '20px',
                border: `1px solid ${db.connected ? 'rgba(39,174,96,0.4)' : '#1e1e2e'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = db.connected ? 'rgba(39,174,96,0.4)' : '#1e1e2e'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{db.emoji}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: '#e8e8f0', marginBottom: 8 }}>{db.name}</div>
                <div style={{ fontSize: 12, color: '#666680', lineHeight: 1.6, marginBottom: 16 }}>{db.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {db.connected ? <Tag variant="done">● CONNECTED</Tag> : db.soon ? <Tag variant="idle">COMING SOON</Tag> : <Tag variant="idle">○ AVAILABLE</Tag>}
                  {db.latency && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#666680' }}>{db.latency}</span>}
                </div>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {/* Config + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Panel>
          <PanelHeader title="Configure Connection" />
          <PanelBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <button 
                  onClick={() => setInputMode('url')} 
                  style={{ background: inputMode === 'url' ? '#c0392b' : 'transparent', color: inputMode === 'url' ? '#fff' : '#666680', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                >Raw URL String</button>
                <button 
                  onClick={() => setInputMode('form')} 
                  style={{ background: inputMode === 'form' ? '#c0392b' : 'transparent', color: inputMode === 'form' ? '#fff' : '#666680', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                >Form Builder</button>
                <button 
                  onClick={() => setInputMode('file')} 
                  style={{ background: inputMode === 'file' ? '#c0392b' : 'transparent', color: inputMode === 'file' ? '#fff' : '#666680', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                >File Upload</button>
              </div>

              {inputMode === 'url' ? (
                <div>
                  <Label>Database URL (Full connection string)</Label>
                  <Input placeholder="e.g. postgresql://user:pass@localhost:5432/db OR sqlite:///data.db" 
                         value={customDbUrl} 
                         onChange={e => setCustomDbUrl(e.target.value)} />
                </div>
              ) : inputMode === 'file' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Label>Upload Database File (.csv or .sql)</Label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, border: '2px dashed #1e1e2e', borderRadius: 12, background: '#16161f', cursor: 'pointer', color: '#666680', fontFamily: "'Space Mono', monospace", fontSize: 13, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#c0392b'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}>
                    <input type="file" accept=".csv,.sql,.sqlite" onChange={e => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                    {selectedFile ? <span style={{ color: '#2980b9' }}>📁 Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span> : <span>Drag & Drop or Click to Select File</span>}
                  </label>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <Label>Engine Builder</Label>
                    <select 
                      value={formDb.engine} 
                      onChange={e => setFormDb({...formDb, engine: e.target.value})}
                      style={{ width: '100%', background: '#16161f', color: '#e8e8f0', border: '1px solid #1e1e2e', borderRadius: 8, padding: '9px', fontSize: 13, fontFamily: "'Space Mono', monospace" }}
                    >
                      <option value="mysql+pymysql">MySQL (PyMySQL)</option>
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL (Native)</option>
                      <option value="mssql+pyodbc">SQL Server</option>
                    </select>
                  </div>
                  <div><Label>Host</Label><Input value={formDb.host} onChange={e => setFormDb({...formDb, host: e.target.value})} /></div>
                  <div><Label>Port</Label><Input value={formDb.port} onChange={e => setFormDb({...formDb, port: e.target.value})} /></div>
                  <div><Label>Username</Label><Input value={formDb.user} onChange={e => setFormDb({...formDb, user: e.target.value})} /></div>
                  <div><Label>Password</Label><Input type="password" value={formDb.password} onChange={e => setFormDb({...formDb, password: e.target.value})} /></div>
                  <div><Label>Database</Label><Input value={formDb.database} onChange={e => setFormDb({...formDb, database: e.target.value})} /></div>
                </div>
              )}
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#666680', marginTop: -6 }}>
                💡 Fast connect using full URL string. Supports MySQL, Postgres, SQLite, CSV.
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Button variant="primary" onClick={inputMode === 'file' ? runFileUpload : runTest}>
                  {testing ? (inputMode === 'file' ? '⟳ Uploading…' : '⟳ Connecting…') : (inputMode === 'file' ? '📁 Upload & Scan' : '⚡ Connect & Scan')}
                </Button>
              </div>
            </div>
          </PanelBody>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Panel>
            <PanelHeader title={`Active Connection — ${parsed.db || 'None'}`}><Tag variant={connInfo.status === 'connected' ? 'done' : 'idle'}>{connInfo.status === 'connected' ? '● LIVE' : '○ OFFLINE'}</Tag></PanelHeader>
            <PanelBody>
              {[['Engine', parsed.proto || connInfo.engine || 'Disconnected'], ['Host', parsed.hostPort || '-'], ['Database', parsed.db || '-'], ['User', parsed.user || '-'], ['Tables', `${dbData.tables || 0} discovered`], ['Latency', '12ms avg'], ['SSL', '✓ Encrypted'], ['Last Sync', '2 minutes ago']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#666680' }}>{k}</span>
                  <span style={{ fontSize: 13, color: '#e8e8f0' }}>{v}</span>
                </div>
              ))}
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Connection Test Log" />
            <div style={{ background: '#0a0a0f', margin: '0', padding: '16px', fontFamily: "'Space Mono',monospace", fontSize: 11, lineHeight: 1.9, height: 200, overflowY: 'auto', borderRadius: '0 0 14px 14px' }}>
              {log.map((l, i) => <div key={i} style={{ color: l.color }}>{l.msg}</div>)}
              {testing && <div style={{ color: '#666680', animation: 'blink 1s step-end infinite' }}>█</div>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [tab, setTab] = useState('general')
  const [toggles, setToggles] = useState({
    darkMode: true, autoRefresh: true, showRows: true, compact: false,
    faiss: true, pinecone: false, retry: true,
    md: true, csv: true, html: true, json: false,
    svg: true, png: true, mermaid: false,
    agentSchema: true, agentRelmap: true, agentProfile: true, agentBiz: true, agentDict: true, agentViz: true,
    notifyAgent: true, notifyQuality: true, notifySchema: true, notifyError: true, emailWeekly: false,
  })
  const toggle = k => setToggles(p => ({ ...p, [k]: !p[k] }))
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const [selModel, setSelModel] = useState(0)

  const TABS = [['general', '⚙ General'], ['ai', '🧠 AI Models'], ['agents', '⬢ Agents'], ['export', '⬇ Export'], ['notifications', '🔔 Notifications'], ['danger', '⚠ Danger']]

  const Row = ({ label, desc, k }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
      <div>
        <div style={{ fontSize: 14, color: '#e8e8f0' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#666680', marginTop: 4 }}>{desc}</div>
      </div>
      <Toggle on={toggles[k]} onToggle={() => toggle(k)} />
    </div>
  )

  const SectionTitle = ({ children }) => (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#e8e8f0', padding: '0 0 12px', borderBottom: '1px solid #1e1e2e', marginBottom: 16 }}>{children}</div>
  )

  return (
    <div>
      <PageHeader title="Settings" sub="Configure AI models, agents, export preferences and platform settings">
        <Button variant="primary" onClick={save}>{saved ? '✓ Saved!' : '💾 Save Changes'}</Button>
      </PageHeader>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Tab nav */}
        <div style={{ width: 190, flexShrink: 0 }}>
          <Panel>
            <div style={{ padding: '8px' }}>
              {TABS.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 8,
                  fontSize: 13,
                  background: tab === id ? 'rgba(192,57,43,0.08)' : 'transparent',
                  color: tab === id ? '#f0828a' : '#666680', cursor: 'pointer', border: `0 solid transparent`,
                  borderLeft: `3px solid ${tab === id ? '#c0392b' : 'transparent'}`,
                  display: 'block', marginBottom: 2, transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (tab !== id) { e.currentTarget.style.color = '#b0b0c8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
                  onMouseLeave={e => { if (tab !== id) { e.currentTarget.style.color = '#666680'; e.currentTarget.style.background = 'transparent' } }}
                >{label}</button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {tab === 'general' && (
            <Panel>
              <PanelHeader title="General Settings" />
              <PanelBody>
                <SectionTitle>Project</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  {[['Project Name', 'Olist E-Commerce Analysis'], ['Description', 'Brazilian marketplace schema analysis — Team Kaizen']].map(([l, v]) => (
                    <div key={l}><Label>{l}</Label><Input defaultValue={v} /></div>
                  ))}
                </div>
                <SectionTitle>Interface</SectionTitle>
                <Row label="Dark Mode" desc="Use dark theme across the dashboard" k="darkMode" />
                <Row label="Auto-refresh Data" desc="Re-scan schema every 30 minutes" k="autoRefresh" />
                <Row label="Show Row Counts" desc="Display live row counts in Schema Explorer" k="showRows" />
                <Row label="Compact Mode" desc="Reduce padding and spacing in tables" k="compact" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'ai' && (
            <Panel>
              <PanelHeader title="AI Model Configuration" />
              <PanelBody>
                <SectionTitle>Primary Intelligence Model</SectionTitle>
                {[
                  { name: 'GPT-4o', desc: 'OpenAI · Best for complex business context generation', tag: 'Recommended', tagV: 'done' },
                  { name: 'Gemini Pro 1.5', desc: 'Google · Fast, good for structured schema understanding', tag: 'Fast', tagV: 'idx' },
                  { name: 'Llama 3 (Local)', desc: 'Meta · Self-hosted, no data leaves your infrastructure', tag: 'Private', tagV: 'fk' },
                ].map((m, i) => (
                  <div key={m.name} onClick={() => setSelModel(i)} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#16161f', borderRadius: 12, padding: '16px', marginBottom: 10, border: `1px solid ${selModel === i ? '#c0392b' : '#1e1e2e'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selModel === i ? '#c0392b' : '#666680'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selModel === i && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c0392b' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: '#e8e8f0' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#666680', marginTop: 4 }}>{m.desc}</div>
                    </div>
                    <Tag variant={m.tagV}>{m.tag}</Tag>
                  </div>
                ))}
                <SectionTitle style={{ marginTop: 20 }}>Vector Store</SectionTitle>
                <Row label="FAISS (Local)" desc="In-memory vector store — fast, no external dependency" k="faiss" />
                <Row label="Pinecone (Cloud)" desc="Persistent cloud vector DB with similarity search" k="pinecone" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'agents' && (
            <Panel>
              <PanelHeader title="Agent Configuration" />
              <PanelBody>
                <SectionTitle>Enable / Disable Agents</SectionTitle>
                <Row label="Schema Extraction Agent" desc="Reads DDL and metadata from connected databases" k="agentSchema" />
                <Row label="Relationship Mapping Agent" desc="Builds FK graph and ER structure" k="agentRelmap" />
                <Row label="Data Profiling Agent" desc="Statistical analysis of all columns" k="agentProfile" />
                <Row label="Business Context Agent" desc="LLM-based business meaning inference" k="agentBiz" />
                <Row label="Data Dictionary Agent" desc="Final documentation generation" k="agentDict" />
                <Row label="Visualization Agent" desc="ER diagram and schema graph rendering" k="agentViz" />
                <SectionTitle style={{ marginTop: 20 }}>Orchestration</SectionTitle>
                <div style={{ marginBottom: 14 }}><Label>Framework</Label>
                  <select style={{ width: '100%', background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e8e8f0', outline: 'none' }}>
                    <option>LangGraph (Default)</option><option>CrewAI</option><option>Custom Python</option>
                  </select>
                </div>
                <Row label="Retry on Failure" desc="Auto-retry failed agent tasks up to 3 times" k="retry" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'export' && (
            <Panel>
              <PanelHeader title="Export Preferences" />
              <PanelBody>
                <SectionTitle>Dictionary Export Formats</SectionTitle>
                <Row label="Markdown (.md)" desc="Human-readable docs, embeddable in GitHub or Notion" k="md" />
                <Row label="CSV" desc="Spreadsheet-compatible flat file" k="csv" />
                <Row label="HTML Report" desc="Standalone browser-viewable report" k="html" />
                <Row label="JSON Schema" desc="Structured format for API consumption" k="json" />
                <SectionTitle style={{ marginTop: 24 }}>ER Diagram Export</SectionTitle>
                <Row label="SVG" desc="Vector format, scales without loss" k="svg" />
                <Row label="PNG (2x)" desc="Rasterised high-res image" k="png" />
                <Row label="Mermaid Syntax" desc="Export as Mermaid.js diagram code" k="mermaid" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'notifications' && (
            <Panel>
              <PanelHeader title="Notification Preferences" />
              <PanelBody>
                <SectionTitle>In-App Notifications</SectionTitle>
                <Row label="Agent Completion" desc="Notify when all agents finish a run" k="notifyAgent" />
                <Row label="Quality Issues" desc="Alert when new data quality issues are detected" k="notifyQuality" />
                <Row label="Schema Changes" desc="Alert when a schema change is detected" k="notifySchema" />
                <Row label="Agent Errors" desc="Notify on any agent task failures" k="notifyError" />
                <SectionTitle style={{ marginTop: 24 }}>Email</SectionTitle>
                <div style={{ marginBottom: 14 }}><Label>Email Address</Label><Input type="email" defaultValue="aditya@kaizen.dev" /></div>
                <Row label="Weekly Summary Report" desc="Receive a weekly email digest of quality scores" k="emailWeekly" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'danger' && (
            <Panel>
              <PanelHeader title="Danger Zone"><Tag variant="err">⚠ Irreversible</Tag></PanelHeader>
              <PanelBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { title: 'Clear All Agent Outputs', desc: 'Deletes all generated data dictionaries, quality reports, and AI annotations. The database connection and schema will remain.', label: 'Clear Outputs' },
                    { title: 'Reset Vector Store', desc: 'Removes all schema embeddings from FAISS / Pinecone. Agents will need to re-embed on next run.', label: 'Reset Vector Store' },
                    { title: 'Delete Project', desc: 'Permanently deletes this project, all connections, outputs, and settings. This cannot be undone.', label: 'Delete Project', primary: true },
                  ].map(d => (
                    <div key={d.title} style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 12, padding: '20px' }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#e74c3c', marginBottom: 8 }}>⚠ {d.title}</div>
                      <p style={{ fontSize: 13, color: '#666680', lineHeight: 1.7, marginBottom: 16 }}>{d.desc}</p>
                      <Button variant="danger">{d.label}</Button>
                    </div>
                  ))}
                </div>
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}