import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { MetricCard, Panel, PanelHeader, PanelBody, Tag, Button, QualityBar } from '../components/ui.jsx'
import { MONTHLY_REVENUE, TOP_CATEGORIES, QUALITY_SCORES } from '../data/db.js'

const ACTIVITY = [
  { color: '#4ade80', text: 'Schema extraction completed for orders table — 8 columns mapped.', time: '2 min ago' },
  { color: '#4ade80', text: 'FK relationship detected: order_items.seller_id → sellers.seller_id', time: '4 min ago' },
  { color: '#facc15', text: 'Null values in reviews.review_comment_message — 58.5% null rate.', time: '6 min ago' },
  { color: '#60a5fa', text: 'Business context generated for customers table — 5 columns annotated.', time: '8 min ago' },
  { color: '#4ade80', text: 'Data profiling complete — overall quality score: 94.2%', time: '12 min ago' },
  { color: '#f87171', text: 'Type inconsistency detected in geolocation.geolocation_city.', time: '15 min ago' },
]

const AGENTS = [
  { emoji:'⛁', name:'Schema Extraction', desc:'9 tables · 47 columns extracted', status:'done' },
  { emoji:'⬡', name:'Relationship Mapping', desc:'12 FK relationships detected', status:'done' },
  { emoji:'📊', name:'Data Profiling', desc:'Null rates, freshness scored', status:'done' },
  { emoji:'🧠', name:'Business Context', desc:'Inferring meanings via LLM', status:'running' },
  { emoji:'📖', name:'Data Dictionary', desc:'Generating glossary entries', status:'running' },
  { emoji:'🗺', name:'Visualization', desc:'ER diagram rendering', status:'idle' },
]

const statusVariant = { done:'done', running:'run', idle:'idle' }
const statusLabel   = { done:'✓ DONE', running:'⟳ RUNNING', idle:'○ IDLE' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [ringOffset, setRingOffset] = useState(270)

  useEffect(() => {
    setTimeout(() => setRingOffset(270 * 0.058), 400)
  }, [])

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 animate-fade-up">
        <h1 style={{ fontFamily:'Space Mono', fontSize:20, fontWeight:700, color:'#e8e8f0' }}>
          Database Intelligence Dashboard
        </h1>
        <p style={{ fontSize:13, color:'#666680', marginTop:4 }}>
          Olist Brazilian E-Commerce · 9 tables · Auto-analyzed by AI agents · Last run 2 min ago
        </p>
      </div>

      {/* Metric cards — 4 columns */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <MetricCard icon="⛁" label="Total Tables"        value="9"     delta="▲ All analyzed"      cardColor="#27ae60" delay={50}  />
        <MetricCard icon="≡" label="Total Columns"       value="47"    delta="▲ Fully documented"   cardColor="#2980b9" delay={100} />
        <MetricCard icon="⬡" label="FK Relationships"    value="12"    delta="◉ ER diagram ready"   deltaColor="text-yellow-400" cardColor="#f39c12" delay={150} />
        <MetricCard icon="◎" label="Data Quality Score"  value="94.2%" delta="▲ Excellent"           cardColor="#c0392b" delay={200} />
      </div>

      {/* Row 1 — Revenue chart + Agents */}
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:14 }}>
        <Panel className="animate-fade-up delay-200">
          <PanelHeader title="Monthly Revenue Trend" subtitle="GMV across all orders (BRL)">
            <Button variant="ghost">Export</Button>
          </PanelHeader>
          <PanelBody>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={MONTHLY_REVENUE} margin={{ top:4, right:4, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#c0392b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c0392b" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill:'#666680', fontSize:10, fontFamily:'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background:'#111118', border:'1px solid #1e1e2e', borderRadius:8, fontFamily:'Space Mono', fontSize:11 }}
                  labelStyle={{ color:'#f0828a' }} itemStyle={{ color:'#e8e8f0' }}
                  formatter={v => [`R$ ${(v/1000).toFixed(0)}K`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#c0392b" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </PanelBody>
        </Panel>

        <Panel className="animate-fade-up delay-250">
          <PanelHeader title="AI Agents — Status">
            <Button variant="ghost" onClick={() => navigate('/agents')}>Full View →</Button>
          </PanelHeader>
          <PanelBody>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {AGENTS.map(a => (
                <div key={a.name} style={{
                  display:'flex', alignItems:'center', gap:12,
                  background:'#16161f', border:'1px solid #1e1e2e',
                  borderRadius:8, padding:'8px 14px',
                }}>
                  <div style={{ fontSize:16, width:32, height:32, background:'rgba(192,57,43,0.1)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {a.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'Space Mono', fontSize:11, fontWeight:700, color:'#e8e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.name}</div>
                    <div style={{ fontSize:10, color:'#666680', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.desc}</div>
                  </div>
                  <Tag variant={statusVariant[a.status]}>{statusLabel[a.status]}</Tag>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Row 2 — Categories + Quality + Activity */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>

        {/* Top Categories */}
        <Panel className="animate-fade-up delay-300">
          <PanelHeader title="Top Categories by Sales" />
          <PanelBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={TOP_CATEGORIES.slice(0,6)} layout="vertical" margin={{ top:0, right:8, bottom:0, left:0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120}
                  tick={{ fill:'#666680', fontSize:9, fontFamily:'Space Mono' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v.replace(/_/g,' ').slice(0,14)}
                />
                <Tooltip
                  contentStyle={{ background:'#111118', border:'1px solid #1e1e2e', borderRadius:8, fontFamily:'Space Mono', fontSize:11 }}
                  itemStyle={{ color:'#e8e8f0' }} labelStyle={{ color:'#f0828a' }}
                  formatter={v => [v.toLocaleString(), 'Sales']}
                />
                <Bar dataKey="sales" fill="#c0392b" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </PanelBody>
        </Panel>

        {/* Quality */}
        <Panel className="animate-fade-up delay-300">
          <PanelHeader title="Data Quality Score">
            <Button variant="ghost" onClick={() => navigate('/quality')}>Report →</Button>
          </PanelHeader>
          <PanelBody>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
              <div style={{ position:'relative', width:100, height:100 }}>
                <svg viewBox="0 0 100 100" width="100" height="100" style={{ transform:'rotate(-90deg)' }}>
                  <circle fill="none" stroke="#1e1e2e" strokeWidth="7" cx="50" cy="50" r="43" />
                  <circle fill="none" stroke="#27ae60" strokeWidth="7" cx="50" cy="50" r="43"
                    strokeLinecap="round" strokeDasharray="270.2" strokeDashoffset={ringOffset}
                    style={{ transition:'stroke-dashoffset 1.2s ease' }}
                  />
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:'Space Mono', fontSize:20, fontWeight:700, color:'#27ae60' }}>94.2</span>
                  <span style={{ fontFamily:'Space Mono', fontSize:9, color:'#666680' }}>%</span>
                </div>
              </div>
            </div>
            <QualityBar label="Completeness" pct={97} />
            <QualityBar label="Consistency"  pct={94} />
            <QualityBar label="Validity"     pct={92} color="#f39c12" textColor="text-yellow-400" />
            <QualityBar label="FK Integrity" pct={100} />
            <QualityBar label="Uniqueness"   pct={88} color="#2980b9" textColor="text-blue-400" />
          </PanelBody>
        </Panel>

        {/* Activity */}
        <Panel className="animate-fade-up delay-350">
          <PanelHeader title="Recent Activity" />
          <PanelBody>
            <div style={{ display:'flex', flexDirection:'column' }}>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i < ACTIVITY.length-1 ? '1px solid rgba(30,30,46,0.6)' : 'none' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:a.color, marginTop:5, flexShrink:0 }} />
                  <div>
                    <p style={{ fontSize:11, color:'#b0b0c8', lineHeight:1.5 }}>{a.text}</p>
                    <p style={{ fontFamily:'Space Mono', fontSize:9, color:'#444458', marginTop:3 }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* QueryBot CTA */}
      <div
        onClick={() => navigate('/querybot')}
        style={{
          background:'linear-gradient(to right, rgba(192,57,43,0.1), rgba(41,128,185,0.1))',
          border:'1px solid rgba(192,57,43,0.3)',
          borderRadius:12, padding:'16px 24px',
          display:'flex', alignItems:'center', gap:16,
          cursor:'pointer', transition:'border-color 0.2s',
        }}
        className="animate-fade-up delay-400"
        onMouseEnter={e => e.currentTarget.style.borderColor='rgba(192,57,43,0.6)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='rgba(192,57,43,0.3)'}
      >
        <div style={{ fontSize:24 }}>💬</div>
        <div>
          <div style={{ fontFamily:'Space Mono', fontSize:13, fontWeight:700, color:'#f0828a' }}>
            QueryBot — AI Database Assistant
          </div>
          <div style={{ fontSize:12, color:'#666680', marginTop:3 }}>
            Ask anything: "How many sales did product_id 2405 make between 12–18 March 2026?"
          </div>
        </div>
        <div style={{ marginLeft:'auto', fontFamily:'Space Mono', fontSize:11, color:'#666680' }}>Open →</div>
      </div>
    </div>
  )
}