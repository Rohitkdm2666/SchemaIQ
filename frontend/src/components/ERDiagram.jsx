import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
const NODE_W = 160
const NODE_H = 130
const HEADER_H = 28

export default function ERDiagram({ nodes, links, onNodeClick, svgRef: externalRef }) {
  const internalRef = useRef(null)
  const svgRef = externalRef || internalRef
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const W = wrap.clientWidth
    const H = wrap.clientHeight

    // Deep clone data so D3 can mutate it
    const d3nodes = (nodes || []).map(n => ({ ...n }))
    const d3links = (links || []).map(l => ({ ...l }))

    // ── SVG setup ──────────────────────────────────────────
    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H)

    svg.selectAll('*').remove()

    // Dot grid background
    const defs = svg.append('defs')

    defs.append('pattern')
      .attr('id', 'dot-grid')
      .attr('width', 28).attr('height', 28)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('circle')
      .attr('cx', 14).attr('cy', 14).attr('r', 0.9)
      .attr('fill', 'rgba(255,255,255,0.06)')

    svg.append('rect')
      .attr('width', W).attr('height', H)
      .attr('fill', 'url(#dot-grid)')

    // Arrow markers for each link color
    const markerColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#9b59b6', '#e74c3c', '#8e44ad', '#d35400']
    markerColors.forEach((color, i) => {
      defs.append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10).attr('refY', 0)
        .attr('markerWidth', 7).attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
        .attr('opacity', 0.8)
    })

    // Glow filter
    const glow = defs.append('filter').attr('id', 'glow')
    glow.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'blur')
    const merge = glow.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Main group (zoom target)
    const g = svg.append('g').attr('class', 'zoom-group')

    // ── Zoom & pan ─────────────────────────────────────────
    const zoom = d3.zoom()
      .scaleExtent([0.25, 3])
      .on('zoom', e => g.attr('transform', e.transform))

    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(W * 0.08, H * 0.08).scale(0.88))
      .on('dblclick.zoom', null)

    // Expose resetZoom
    svgRef.current.__resetZoom = () =>
      svg.transition().duration(600)
        .call(zoom.transform, d3.zoomIdentity.translate(W * 0.08, H * 0.08).scale(0.88))

    svgRef.current.__zoomIn = () => svg.transition().duration(300).call(zoom.scaleBy, 1.25)
    svgRef.current.__zoomOut = () => svg.transition().duration(300).call(zoom.scaleBy, 0.8)

    // ── Force simulation ───────────────────────────────────
    const sim = d3.forceSimulation(d3nodes)
      .force('link', d3.forceLink(d3links).id(d => d.id).distance(280).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.05))
      .force('collide', d3.forceCollide().radius(120).strength(1))
      .force('x', d3.forceX(W / 2).strength(0.02))
      .force('y', d3.forceY(H / 2).strength(0.02))
      .alphaDecay(0.05)      // settles in ~2s
      .alphaMin(0.001)
      .velocityDecay(0.85)   // very high friction — barely any drift after placement

    simRef.current = sim

    // ── Draw links ─────────────────────────────────────────
    const linkGroup = g.append('g').attr('class', 'links')

    const linkLine = linkGroup.selectAll('path.link')
      .data(d3links).enter().append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', (d, i) => markerColors[i % markerColors.length])
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '6,3')
      .attr('stroke-opacity', 0.65)
      .attr('marker-end', (d, i) => `url(#arrow-${i % markerColors.length})`)

    // Link labels (via field name + cardinality)
    const linkLabel = linkGroup.selectAll('g.linklabel')
      .data(d3links).enter().append('g').attr('class', 'linklabel')

    linkLabel.append('rect')
      .attr('rx', 4).attr('ry', 4)
      .attr('fill', '#0f0f17')
      .attr('stroke', '#252540')
      .attr('stroke-width', 1)
      .attr('width', 72).attr('height', 32)
      .attr('x', 4).attr('y', -16)

    linkLabel.append('text')
      .attr('text-anchor', 'start').attr('dy', -3)
      .attr('x', 10)
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 9)
      .attr('fill', '#f0828a')
      .text(d => d.via)

    linkLabel.append('text')
      .attr('text-anchor', 'start').attr('dy', 11)
      .attr('x', 10)
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 8)
      .attr('fill', '#666680')
      .text(d => d.card)

    // ── Draw nodes ─────────────────────────────────────────
    const nodeGroup = g.append('g').attr('class', 'nodes')

    const nodeEl = nodeGroup.selectAll('g.node')
      .data(d3nodes).enter().append('g')
      .attr('class', 'node')
      .attr('cursor', 'grab')
      .style('filter', 'none')
      .on('mouseenter', function (e, d) {
        d3.select(this).style('filter', 'url(#glow)')
        setTooltip({ x: e.clientX, y: e.clientY, data: d })
      })
      .on('mousemove', function (e) {
        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
      })
      .on('mouseleave', function () {
        d3.select(this).style('filter', 'none')
        setTooltip(null)
      })
      .on('click', function (e, d) {
        e.stopPropagation()
        setSelected(prev => prev === d.id ? null : d.id)
        if (onNodeClick) onNodeClick(d)
      })

    // Shadow rect (depth effect)
    nodeEl.append('rect')
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 10).attr('ry', 10)
      .attr('x', 3).attr('y', 3)
      .attr('fill', 'rgba(0,0,0,0.4)')

    // Main card body
    nodeEl.append('rect')
      .attr('class', 'node-bg')
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 10).attr('ry', 10)
      .attr('fill', '#111118')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)

    // Colored header bg
    nodeEl.append('rect')
      .attr('width', NODE_W).attr('height', HEADER_H)
      .attr('rx', 10).attr('ry', 10)
      .attr('fill', d => d.color)
      .attr('opacity', 0.2)

    nodeEl.append('rect')
      .attr('width', NODE_W).attr('height', 10)
      .attr('y', HEADER_H - 10)
      .attr('fill', d => d.color)
      .attr('opacity', 0.2)

    // Top accent line
    nodeEl.append('rect')
      .attr('width', NODE_W).attr('height', 3)
      .attr('rx', 2)
      .attr('fill', d => d.color)
      .attr('opacity', 0.9)

    // Table name
    nodeEl.append('text')
      .attr('x', NODE_W / 2).attr('y', HEADER_H - 9)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .attr('fill', '#f0828a')
      .text(d => d.label)

    // Row count badge
    nodeEl.append('text')
      .attr('x', NODE_W / 2).attr('y', NODE_H - 8)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 8)
      .attr('fill', '#444458')
      .text(d => `${d.rows} rows`)

    // Fields list
    nodeEl.each(function (d) {
      const el = d3.select(this)
      const visibleFields = d.fields.slice(0, 4)
      visibleFields.forEach((f, i) => {
        const isPK = f.includes('(PK)')
        const isFK = f.includes('(FK)')
        const fieldColor = isPK ? '#27ae60' : isFK ? '#3498db' : '#888898'
        const prefix = isPK ? '🔑 ' : isFK ? '🔗 ' : '   '
        el.append('text')
          .attr('x', 10)
          .attr('y', HEADER_H + 16 + i * 17)
          .attr('font-family', 'Space Mono, monospace')
          .attr('font-size', 9)
          .attr('fill', fieldColor)
          .text(prefix + f.replace(' (PK)', '').replace(' (FK)', '').slice(0, 16))
      })
      if (d.fields.length > 4) {
        el.append('text')
          .attr('x', 10)
          .attr('y', HEADER_H + 16 + 4 * 17)
          .attr('font-family', 'Space Mono, monospace')
          .attr('font-size', 8)
          .attr('fill', '#444458')
          .text(`+${d.fields.length - 4} more`)
      }
    })

    // ── Drag ───────────────────────────────────────────────
    const drag = d3.drag()
      .on('start', (e, d) => {
        if (!e.active) sim.alphaTarget(0.02).restart() // very gentle — only moves dragged node
        d.fx = d.x; d.fy = d.y
        d3.select(e.sourceEvent.target.closest('.node')).attr('cursor', 'grabbing')
      })
      .on('drag', (e, d) => {
        d.fx = e.x; d.fy = e.y
      })
      .on('end', (e, d) => {
        if (!e.active) sim.alphaTarget(0)
        // Pin node in place after drag — stops it drifting back
        d.fx = e.x; d.fy = e.y
        d3.select(e.sourceEvent.target.closest('.node')).attr('cursor', 'grab')
      })

    nodeEl.call(drag)

    // Click on SVG background = deselect
    svg.on('click', () => setSelected(null))

    // Freeze all nodes once simulation cools down
    sim.on('end', () => {
      d3nodes.forEach(d => { d.fx = d.x; d.fy = d.y })
    })

    // ── Tick ───────────────────────────────────────────────

    // Returns the exit point on a node's cardinal edge toward the target
    function edgePoint(src, tgt, isSource) {
      const sx = src.x + NODE_W / 2
      const sy = src.y + NODE_H / 2
      const tx = tgt.x + NODE_W / 2
      const ty = tgt.y + NODE_H / 2
      const dx = tx - sx
      const dy = ty - sy
      const horizontal = Math.abs(dx) >= Math.abs(dy)

      if (isSource) {
        if (horizontal) return dx > 0
          ? { x: src.x + NODE_W, y: src.y + NODE_H / 2 }
          : { x: src.x, y: src.y + NODE_H / 2 }
        return dy > 0
          ? { x: src.x + NODE_W / 2, y: src.y + NODE_H }
          : { x: src.x + NODE_W / 2, y: src.y }
      } else {
        if (horizontal) return dx > 0
          ? { x: tgt.x, y: tgt.y + NODE_H / 2 }
          : { x: tgt.x + NODE_W, y: tgt.y + NODE_H / 2 }
        return dy > 0
          ? { x: tgt.x + NODE_W / 2, y: tgt.y }
          : { x: tgt.x + NODE_W / 2, y: tgt.y + NODE_H }
      }
    }

    // Rounded L-shaped path with cubic bezier corners
    // Returns { d: svgPathString, labelPt: {x,y} }
    function orthogonalPath(p1, p2) {
      const R = 12  // corner radius
      const dx = Math.abs(p2.x - p1.x)
      const dy = Math.abs(p2.y - p1.y)

      // Straight lines — no bend needed
      if (dx < 4) return { d: `M${p1.x},${p1.y} L${p2.x},${p2.y}`, labelPt: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } }
      if (dy < 4) return { d: `M${p1.x},${p1.y} L${p2.x},${p2.y}`, labelPt: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } }

      // Midpoint for the bend (horizontal first, then vertical)
      const mx = p1.x + (p2.x - p1.x) / 2

      // Corner 1: at (mx, p1.y)  — horizontal segment meets vertical
      // Corner 2: at (mx, p2.y)  — vertical segment meets horizontal
      const r1 = Math.min(R, dx / 2, dy / 2)

      // Signs for direction
      const signX = p2.x > p1.x ? 1 : -1
      const signY = p2.y > p1.y ? 1 : -1

      // Approach corner 1 from left/right, leave going down/up
      const c1x = mx - signX * r1
      const c1y = p1.y
      const c1ex = mx
      const c1ey = p1.y + signY * r1

      // Approach corner 2 from up/down, leave going right/left
      const c2x = mx
      const c2y = p2.y - signY * r1
      const c2ex = mx + signX * r1
      const c2ey = p2.y

      const d = [
        `M${p1.x},${p1.y}`,
        `L${c1x},${c1y}`,
        `Q${mx},${p1.y} ${c1ex},${c1ey}`,   // rounded corner 1
        `L${c2x},${c2y}`,
        `Q${mx},${p2.y} ${c2ex},${c2ey}`,   // rounded corner 2
        `L${p2.x},${p2.y}`,
      ].join(' ')

      // Label sits on the vertical segment midpoint (away from both nodes)
      const labelPt = { x: mx + 10, y: (c1ey + c2y) / 2 }

      return { d, labelPt }
    }

    sim.on('tick', () => {
      linkLine.attr('d', d => {
        const p1 = edgePoint(d.source, d.target, true)
        const p2 = edgePoint(d.source, d.target, false)
        return orthogonalPath(p1, p2).d
      })

      linkLabel.attr('transform', d => {
        const p1 = edgePoint(d.source, d.target, true)
        const p2 = edgePoint(d.source, d.target, false)
        const { labelPt } = orthogonalPath(p1, p2)
        return `translate(${labelPt.x},${labelPt.y})`
      })

      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)

      nodeEl.selectAll('.node-bg')
        .attr('stroke-width', d => selected === d.id ? 3 : 2)
        .attr('stroke', d => selected === d.id ? '#ffffff' : d.color)
    })

    return () => {
      sim.stop()
      svg.selectAll('*').remove()
    }
  }, [nodes, links])

  // Update selected highlight without re-running full simulation
  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current)
      .selectAll('.node .node-bg')
      .attr('stroke-width', d => selected === d?.id ? 3 : 2)
      .attr('stroke', d => d ? (selected === d.id ? '#fff' : d.color) : '#666')
  }, [selected])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 16, top: tooltip.y - 10,
          background: '#0f0f17', border: `1px solid ${tooltip.data.color}`,
          borderRadius: 10, padding: '12px 16px',
          pointerEvents: 'none', zIndex: 1000,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${tooltip.data.color}22`,
          minWidth: 160,
        }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#f0828a', marginBottom: 8 }}>{tooltip.data.label}</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#444458', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rows</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: '#e8e8f0', marginTop: 2 }}>{tooltip.data.rows}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#444458', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cols</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: '#e8e8f0', marginTop: 2 }}>{tooltip.data.cols}</div>
            </div>
          </div>
          {tooltip.data.pk && (
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#27ae60', background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.3)', borderRadius: 5, padding: '3px 8px', display: 'inline-block' }}>
              PK: {tooltip.data.pk}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Expose control helpers so parent can call them
ERDiagram.zoomIn = (ref) => ref.current?.__zoomIn?.()
ERDiagram.zoomOut = (ref) => ref.current?.__zoomOut?.()
ERDiagram.reset = (ref) => ref.current?.__resetZoom?.()