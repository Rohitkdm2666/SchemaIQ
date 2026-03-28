import { useEffect, useState, useRef } from 'react'
import { Panel, PanelHeader, PanelBody, Button, Tag, Spinner, PageHeader } from '../components/ui.jsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download, RefreshCw, Lightbulb, Activity, Layers, Database } from 'lucide-react'

const EMPTY_INSIGHTS = {
  overview_text: '',
  table_relationships_text: '',
  niche_columns: [],
  alternate_methods: [],
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState(EMPTY_INSIGHTS)
  const [error, setError] = useState('')
  const hasLoaded = useRef(false)

  const loadInsights = async (force = false) => {
    const isForce = force === true
    if (loading && !isForce && insights.overview_text) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`http://localhost:8001/api/insights?refresh=${isForce}`)
      const data = await res.json()
      setInsights({ ...EMPTY_INSIGHTS, ...data })
    } catch (err) {
      setError(err.message || 'Failed to sync insights')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const timestamp = new Date().toLocaleString()
    
    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(192, 57, 43) // SchemaIQ Red
    doc.text("SchemaIQ Architectural Insights", 14, 20)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text(`Generated: ${timestamp} · SchemaIQ Autonomous IT Agent`, 14, 28)
    
    let currentY = 40

    // Section 1: Narrative
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40)
    doc.text("1. Schema Narrative", 14, currentY)
    currentY += 8
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60)
    const overviewLines = doc.splitTextToSize(insights.overview_text || 'No narrative available.', 180)
    doc.text(overviewLines, 14, currentY)
    currentY += (overviewLines.length * 5) + 12

    // Section 2: Data Flow & Cardinality
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40)
    doc.text("2. Data Flow & Cardinality", 14, currentY)
    currentY += 8
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60)
    const relLines = doc.splitTextToSize(insights.table_relationships_text || 'No relationship data available.', 180)
    doc.text(relLines, 14, currentY)
    currentY += (relLines.length * 5) + 12

    // Section 3: Scalability Optimization
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40)
    doc.text("3. Scalability Optimizations", 14, currentY)
    currentY += 8
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    if (insights.alternate_methods?.length > 0) {
      insights.alternate_methods.forEach((method, i) => {
        if (currentY > 270) { doc.addPage(); currentY = 20; }
        doc.text(`• ${method}`, 14, currentY)
        currentY += 6
      })
    } else {
      doc.text("No specific optimizations identified.", 14, currentY)
    }
    currentY += 6

    // Section 4: Signal Detection
    if (currentY > 150) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40)
    doc.text("4. High-Entropy Signal Detection", 14, currentY)
    currentY += 8

    const nicheData = (insights.niche_columns || []).map(item => [
      `${item.table}.${item.column}`,
      item.why_niche,
      item.use_case
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Signal Target (Table.Col)', 'Architectural Value', 'Analysis Goal']],
      body: nicheData,
      theme: 'grid',
      headStyles: { fillColor: [192, 57, 43], fontStyle: 'bold', textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3, textColor: [60, 60, 60] },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 70 },
        2: { cellWidth: 70 }
      }
    })

    doc.save(`SchemaIQ_Architectural_Insights_${new Date().getTime()}.pdf`)
  }

  useEffect(() => {
    if (!hasLoaded.current) {
      loadInsights()
      hasLoaded.current = true
    }
  }, [])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Header Section */}
      <PageHeader 
        title="Architectural Insights" 
        sub="Standard deep-schema analysis for table semantics and relational integrity."
      >
        <Button variant="primary" onClick={handleExportPDF} disabled={loading || !insights.overview_text}>
          <Download size={14} /> Export PDF
        </Button>
        <Button variant="ghost" onClick={() => loadInsights(true)} disabled={loading}>
          {loading ? <Spinner size={14} /> : <><RefreshCw size={14} /> Sync Data</>}
        </Button>
      </PageHeader>

      {loading ? (
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 16,
          color: '#666680',
          fontFamily: "'Space Mono', monospace",
          fontSize: 12
        }}>
          <Spinner size={32} />
          <span>Synchronizing with schema metadata...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          
          {/* Overview Section */}
          <Panel style={{ gridColumn: 'span 2', background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="Schema Narrative">
              <Lightbulb size={18} color="#c0392b" />
            </PanelHeader>
            <PanelBody>
              <div style={{ 
                fontSize: 14, 
                color: '#b0b0c8', 
                lineHeight: 1.8, 
                whiteSpace: 'pre-wrap',
                maxWidth: '90%'
              }}>
                {insights.overview_text || 'No architectural overview available for this schema.'}
              </div>
            </PanelBody>
          </Panel>

          {/* Relationships Section */}
          <Panel style={{ background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="Data Flow & Cardinality">
              <Activity size={18} color="#c0392b" />
            </PanelHeader>
            <PanelBody>
              <div style={{ 
                fontSize: 13, 
                color: '#b0b0c8', 
                lineHeight: 1.7, 
                whiteSpace: 'pre-wrap'
              }}>
                {insights.table_relationships_text || 'Relational mapping currently unavailable.'}
              </div>
            </PanelBody>
          </Panel>

          {/* Alternate Methods Section */}
          <Panel style={{ background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="Scalability Optimization">
              <Layers size={18} color="#c0392b" />
            </PanelHeader>
            <PanelBody>
              {insights.alternate_methods?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {insights.alternate_methods.map((method, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ 
                        fontFamily: "'Space Mono', monospace", 
                        fontSize: 10, 
                        color: '#c0392b', 
                        padding: '2px 6px', 
                        background: 'rgba(192,57,43,0.1)', 
                        borderRadius: 4,
                        marginTop: 2
                      }}>
                        0{idx + 1}
                      </div>
                      <div style={{ fontSize: 13, color: '#b0b0c8', lineHeight: 1.5 }}>
                        {method}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666680', fontSize: 12 }}>No optimization vectors identified.</div>
              )}
            </PanelBody>
          </Panel>

          {/* Niche Columns Section */}
          <Panel style={{ gridColumn: 'span 2', background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="High-Entropy Signal Detection">
              <Database size={18} color="#c0392b" />
            </PanelHeader>
            <PanelBody>
              {insights.niche_columns?.length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                  gap: 16 
                }}>
                  {insights.niche_columns.map((item, idx) => (
                    <div key={idx} style={{ 
                      background: '#16161f', 
                      border: '1px solid #1e1e2e', 
                      borderRadius: 12, 
                      padding: '16px',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#c0392b'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
                    >
                      <div style={{ 
                        fontFamily: "'Space Mono', monospace", 
                        fontSize: 11, 
                        color: '#f0828a', 
                        background: 'rgba(240,130,138,0.05)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        display: 'inline-block',
                        marginBottom: 12
                      }}>
                        {item.table}.{item.column}
                      </div>
                      <div style={{ fontSize: 12, color: '#666680', lineHeight: 1.6 }}>
                        <strong style={{ color: '#b0b0c8', fontWeight: 600 }}>Architecture Value:</strong> {item.why_niche}
                      </div>
                      <div style={{ fontSize: 12, color: '#666680', lineHeight: 1.6, marginTop: 8 }}>
                        <strong style={{ color: '#b0b0c8', fontWeight: 600 }}>Analysis Target:</strong> {item.use_case}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666680', fontSize: 12, padding: '20px 0' }}>No high-entropy columns flagged in the primary scan.</div>
              )}
            </PanelBody>
          </Panel>

          {error && (
            <div style={{ gridColumn: 'span 2', color: '#e74c3c', fontFamily: 'Space Mono', fontSize: 12, padding: 12, background: 'rgba(192,57,43,0.05)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.2)' }}>
              Diagnostic Error: {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

