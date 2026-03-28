import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel, PanelHeader, PanelBody, Tag, Button, Spinner, PageHeader } from '../components/ui.jsx'
import { Search, CheckCircle2, Brain, Link, RefreshCw } from 'lucide-react'

const TV = { PK: 'pk', FK: 'fk', IDX: 'idx', 'NOT NULL': 'nn', NULLABLE: 'warn' }

function ColCard({ col, isEstimated }) {
  const nullPct = parseFloat(col.nullPct) || 0
  const nullColor = nullPct > 50 ? '#e74c3c' : nullPct > 0 ? '#f39c12' : '#27ae60'
  return (
    <div style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '16px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.5)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#f0828a' }}>{col.name}</span>
        {col.tags.map(t => <Tag key={t} variant={TV[t] || 'default'}>{t}</Tag>)}
      </div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#3498db', marginBottom: 8 }}>{col.type}</div>
      <p style={{ fontSize: 12, color: '#666680', lineHeight: 1.6, marginBottom: 12 }}>{col.desc}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: '#111118', borderRadius: 7, padding: '8px 12px' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#444458', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Null % {isEstimated ? '(Est.)' : ''}</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: nullColor }}>{col.nullPct}</div>
        </div>
        <div style={{ background: '#111118', borderRadius: 7, padding: '8px 12px' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#444458', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Distinct {isEstimated ? '(Est.)' : ''}</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: '#b0b0c8' }}>{col.distinct}</div>
        </div>
      </div>
    </div>
  )
}

export default function SchemaPage() {
  const [searchParams] = useSearchParams()
  const tableParam = searchParams.get('table')
  
  const [activeTable, setActiveTable] = useState('')
  const [filter, setFilter] = useState('')

  const [schemaTables, setSchemaTables] = useState({})
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  const loadSchema = (deepTable = null) => {
    if (deepTable) setScanning(true);
    else setLoading(true);

    const dictionaryUrl = deepTable 
      ? `http://localhost:8001/api/dictionary?tables=${deepTable}&include_profiling=true`
      : 'http://localhost:8001/api/dictionary/quick';

    fetch('http://localhost:8001/api/schema?infer=true')
      .then(r => r.json())
      .then(schemaData => {
        return fetch(dictionaryUrl)
          .then(r => r.json())
          .then(dictData => {
            const tData = {...schemaTables};
            
            if (schemaData.tables) {
              schemaData.tables.forEach(t => {
                const dictTable = dictData.tables?.find(dt => dt.name === t.name);
                if (deepTable && t.name !== deepTable && schemaTables[t.name]) return;

                tData[t.name] = {
                  rows: dictTable ? dictTable.row_count.toLocaleString() : (schemaTables[t.name]?.rows || 'N/A'), 
                  cols: t.columns.length, 
                  pk: t.primary_key ? t.primary_key[0] : null,
                  fks: t.foreign_keys ? t.foreign_keys.map(fk => `${fk.column} → ${fk.references.table}`) : [],
                  summary: dictTable ? dictTable.business_purpose || dictTable.description : 'Loaded dynamically from Schema Intelligence Engine.',
                  isEstimated: !deepTable && !(schemaTables[t.name] && !schemaTables[t.name].isEstimated),
                  columns: t.columns.map(c => {
                    const tags = [];
                    if (t.primary_key && t.primary_key.includes(c.name)) tags.push('PK');
                    if (t.foreign_keys && t.foreign_keys.some(f => f.column === c.name)) tags.push('FK');
                    
                    const dictCol = dictTable?.columns?.find(dc => dc.name === c.name);
                    
                    return {
                      name: c.name, 
                      type: c.type, 
                      tags, 
                      nullPct: dictCol ? `${(dictCol.null_percentage || 0).toFixed(1)}%` : (schemaTables[t.name]?.columns?.find(sc => sc.name === c.name)?.nullPct || 'N/A'), 
                      distinct: dictCol ? (dictCol.unique_count || 'N/A') : (schemaTables[t.name]?.columns?.find(sc => sc.name === c.name)?.distinct || 'N/A'), 
                      desc: dictCol ? (dictCol.description || dictCol.business_context || '') : (schemaTables[t.name]?.columns?.find(sc => sc.name === c.name)?.desc || '')
                    };
                  })
                };
              });
              setSchemaTables(tData);
              
              if (tableParam && tData[tableParam]) {
                setActiveTable(tableParam);
              } else if (schemaData.tables.length > 0 && !activeTable) {
                setActiveTable(schemaData.tables[0].name);
              }
            }
            setLoading(false);
            setScanning(false);
          });
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setScanning(false);
      });
  };

  useEffect(() => {
    loadSchema();
  }, [tableParam])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#666680', gap: 12 }}>
      <Spinner size={18} />
      <span>Loading schema intelligence...</span>
    </div>
  );
  
  if (Object.keys(schemaTables).length === 0) return <div style={{ color: '#e8e8f0', padding: 20 }}>No tables found.</div>;

  const t = schemaTables[activeTable] || Object.values(schemaTables)[0]
  if (!t) return null

  const filteredCols = t.columns.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Schema Explorer" 
        sub={`Browse all ${Object.keys(schemaTables).length} tables · ${scanning ? 'Analysis in progress...' : 'Live from active DB connection'}`}
      />

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left: table list */}
        <div style={{ width: 250, flexShrink: 0 }}>
          <Panel>
            <PanelHeader title={`Tables (${Object.keys(schemaTables).length})`} />
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '72vh', overflowY: 'auto' }}>
              {Object.entries(schemaTables).map(([name, info]) => (
                <button key={name} onClick={() => setActiveTable(name)} style={{
                  background: activeTable === name ? 'rgba(192,57,43,0.08)' : '#16161f',
                  border: `1px solid ${activeTable === name ? '#c0392b' : '#1e1e2e'}`,
                  borderLeft: `3px solid ${activeTable === name ? '#c0392b' : 'transparent'}`,
                  borderRadius: 10, padding: '13px 14px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s', width: '100%',
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#f0828a' }}>{name}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680' }}>{info.cols}c</span>
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', marginBottom: 8 }}>{info.rows} rows</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {info.pk && <Tag variant="pk">PK</Tag>}
                    {info.fks.slice(0, 2).map((_, i) => <Tag key={i} variant="fk">FK</Tag>)}
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Info boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Columns', value: t.cols },
              { label: 'Rows', value: t.rows },
              { label: 'FK Links', value: t.fks.length },
              { label: 'Primary Key', value: t.pk || '—', small: true },
            ].map(b => (
              <div key={b.label} style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: '16px' }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{b.label}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: '#e8e8f0', fontSize: b.small ? 14 : 22 }}>{b.value}</div>
              </div>
            ))}
          </div>

          {/* Columns */}
          <Panel style={{ marginBottom: 14 }}>
            <PanelHeader title={`${activeTable} — Columns`} subtitle={`${t.cols} columns ${t.isEstimated ? '(Estimated)' : '(Deep Scan)'}`}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter columns…"
                  style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#e8e8f0', outline: 'none', fontFamily: "'Space Mono',monospace", width: 160 }}
                />
                <Button 
                  onClick={() => loadSchema(activeTable)} 
                  disabled={scanning} 
                  variant={t.isEstimated ? "outline" : "ghost"}
                  style={{ color: t.isEstimated ? '#3498db' : '#27ae60' }}
                >
                  {scanning ? <RefreshCw size={14} className="animate-spin" /> : (t.isEstimated ? <><Search size={14} style={{ marginRight: 6 }} /> Deep Analysis</> : <><CheckCircle2 size={14} style={{ marginRight: 6 }} /> Full Scan Active</>)}
                </Button>
              </div>
            </PanelHeader>
            <PanelBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {filteredCols.map(col => <ColCard key={col.name} col={col} isEstimated={t.isEstimated} />)}
              </div>
            </PanelBody>
          </Panel>

          {/* AI summary */}
          <Panel>
            <PanelHeader title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Brain size={16} color="#c0392b" /> AI Business Summary</div>}><Tag variant="done">AI Generated</Tag></PanelHeader>
            <PanelBody>
              <p style={{ fontSize: 14, color: '#b0b0c8', lineHeight: 1.8 }}>{t.summary}</p>
              {t.fks.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  {t.fks.map((fk, i) => <Tag key={i} variant="fk"><Link size={10} style={{ marginRight: 4 }} /> {fk}</Tag>)}
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  )
}