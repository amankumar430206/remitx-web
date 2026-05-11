import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'

interface Corridor {
  from: string
  to: string
  vol: number
  pair: string
  settle: number
}

interface CorridorRenderData extends Corridor {
  fp: [number, number]
  tp: [number, number]
  cp1: [number, number]
  cp2: [number, number]
  d: string
  color: string
  weight: number
}

interface AnimDot {
  id: number
  cd: CorridorRenderData
  t: number
  speed: number
  willSettle: boolean
  el: d3.Selection<SVGCircleElement, unknown, null, undefined>
  done: boolean
}

const CORRIDORS: Corridor[] = [
  { from: 'USA', to: 'IND', vol: 83.1,  pair: 'USD/INR', settle: 0.97 },
  { from: 'USA', to: 'GBR', vol: 61.2,  pair: 'USD/GBP', settle: 0.98 },
  { from: 'USA', to: 'CHN', vol: 112.4, pair: 'USD/CNY', settle: 0.91 },
  { from: 'USA', to: 'PHL', vol: 36.7,  pair: 'USD/PHP', settle: 0.96 },
  { from: 'USA', to: 'BRA', vol: 18.9,  pair: 'USD/BRL', settle: 0.91 },
  { from: 'GBR', to: 'IND', vol: 29.7,  pair: 'GBP/INR', settle: 0.96 },
  { from: 'GBR', to: 'NGR', vol: 21.3,  pair: 'GBP/NGN', settle: 0.89 },
  { from: 'UAE', to: 'IND', vol: 45.8,  pair: 'AED/INR', settle: 0.98 },
  { from: 'UAE', to: 'PAK', vol: 38.2,  pair: 'AED/PKR', settle: 0.95 },
  { from: 'DEU', to: 'IND', vol: 22.1,  pair: 'EUR/INR', settle: 0.96 },
  { from: 'DEU', to: 'TUR', vol: 17.6,  pair: 'EUR/TRY', settle: 0.88 },
  { from: 'SGP', to: 'IDN', vol: 19.4,  pair: 'SGD/IDR', settle: 0.93 },
  { from: 'AUS', to: 'PHL', vol: 12.8,  pair: 'AUD/PHP', settle: 0.97 },
  { from: 'KSA', to: 'EGY', vol: 14.2,  pair: 'SAR/EGP', settle: 0.92 },
  { from: 'CAN', to: 'IND', vol: 22.4,  pair: 'CAD/INR', settle: 0.97 },
]

// [longitude, latitude]
const COORDS: Record<string, [number, number]> = {
  USA: [-100, 40], BRA: [-51, -10], CAN: [-96, 57],
  GBR: [-2, 54],   DEU: [10, 51],   TUR: [35, 39],   NGR: [8, 10],
  EGY: [30, 27],   KSA: [45, 24],   UAE: [54, 24],   PAK: [70, 30],
  IND: [80, 22],   CHN: [105, 35],  SGP: [104, 1],   IDN: [118, -3],
  PHL: [122, 13],  AUS: [135, -26],
}

const ACTIVE_ISO = new Set([
  840, 76, 124, 826, 276, 792, 566, 818,
  682, 784, 586, 356, 156, 702, 360, 608, 36,
])

// Settle-rate → neon accent color (intentionally vivid — dark background only)
function corridorColor(settle: number): string {
  if (settle >= 0.95) return '#00e5a0'   // neon teal — our primary success mapped to dark
  if (settle >= 0.9)  return '#3b82f6'   // our --color-primary
  return '#f59e0b'                        // our --color-warning-fg
}

function bezierPoint(
  p0: [number, number], cp1: [number, number],
  cp2: [number, number], p3: [number, number], t: number,
): [number, number] {
  const m = 1 - t
  return [
    m*m*m*p0[0] + 3*m*m*t*cp1[0] + 3*m*t*t*cp2[0] + t*t*t*p3[0],
    m*m*m*p0[1] + 3*m*m*t*cp1[1] + 3*m*t*t*cp2[1] + t*t*t*p3[1],
  ]
}

export function PaymentCorridorMap({ className = '' }: { className?: string }) {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const dotsRef    = useRef<AnimDot[]>([])
  const dotIdRef   = useRef(0)
  const dotsGRef   = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const corDataRef = useRef<CorridorRenderData[]>([])
  const rafRef     = useRef<number | null>(null)

  const [totalTx, setTotalTx]   = useState(0)
  const [settled, setSettled]   = useState(0)
  const [tooltip, setTooltip]   = useState<CorridorRenderData | null>(null)

  const volMax   = Math.max(...CORRIDORS.map(c => c.vol))
  const totalVol = CORRIDORS.reduce((s, c) => s + c.vol, 0).toFixed(0)
  const avgSettle = ((CORRIDORS.reduce((s, c) => s + c.settle, 0) / CORRIDORS.length) * 100).toFixed(1)

  const setTotalTxRef = useRef(setTotalTx)
  const setSettledRef = useRef(setSettled)

  function spawnDot() {
    const cd = corDataRef.current[Math.floor(Math.random() * corDataRef.current.length)]
    if (!cd || !dotsGRef.current) return
    const willSettle = Math.random() < cd.settle
    const speed = 0.55 + Math.random() * 0.7
    const el = dotsGRef.current.append('circle')
      .attr('r', 2.8).attr('fill', '#fff').attr('opacity', 1)
      .style('filter', 'drop-shadow(0 0 3px #fff)')
    dotsRef.current.push({ id: ++dotIdRef.current, cd, t: 0, speed, willSettle, el, done: false })
    setTotalTxRef.current(n => n + 1)
  }

  useEffect(() => {
    let destroyed = false
    let spawnInterval: ReturnType<typeof setInterval> | null = null

    async function build() {
      const wrap = wrapRef.current
      if (!wrap) return
      const W = wrap.clientWidth || 900
      const H = Math.round(W * 0.52)

      d3.select(wrap).select('svg').remove()

      const svg = d3.select(wrap).append('svg')
        .attr('width', '100%')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .style('display', 'block')

      const projection = d3.geoNaturalEarth1()
        .scale(W / 6.1)
        .translate([W / 2, H / 2])
      const pathGen = d3.geoPath().projection(projection)

      svg.append('path').datum({ type: 'Sphere' } as d3.GeoPermissibleObjects)
        .attr('fill', '#050d1a').attr('d', pathGen)
      svg.append('path').datum(d3.geoGraticule()() as d3.GeoPermissibleObjects)
        .attr('fill', 'none').attr('stroke', '#0d2235').attr('stroke-width', 0.3).attr('d', pathGen)

      let world: Topology<{ countries: GeometryCollection }>
      try {
        world = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r => r.json())
      } catch {
        return
      }
      if (destroyed) return

      const countries = topojson.feature(world, world.objects.countries)
      const borders   = topojson.mesh(world, world.objects.countries, (a, b) => a !== b)

      svg.append('g').selectAll('path')
        .data((countries as GeoJSON.FeatureCollection).features)
        .join('path')
        .attr('fill', d => ACTIVE_ISO.has(+(d as GeoJSON.Feature).id!) ? '#0e2d45' : '#0a1e2e')
        .attr('stroke', '#132d42').attr('stroke-width', 0.4).attr('d', pathGen as never)

      svg.append('path').datum(borders as d3.GeoPermissibleObjects)
        .attr('fill', 'none').attr('stroke', '#0e2d45').attr('stroke-width', 0.4).attr('d', pathGen)

      const corridorData: CorridorRenderData[] = CORRIDORS.map(c => {
        const fp = projection(COORDS[c.from])! as [number, number]
        const tp = projection(COORDS[c.to])!   as [number, number]
        const dx = tp[0] - fp[0], dy = tp[1] - fp[1]
        const dist = Math.sqrt(dx * dx + dy * dy)
        const lift = Math.min(dist * 0.45, 120)
        const mx = (fp[0] + tp[0]) / 2, my = (fp[1] + tp[1]) / 2
        const cp1: [number, number] = [mx - dy * 0.1, my - lift]
        const cp2: [number, number] = [mx + dy * 0.1, my - lift]
        const d = `M${fp[0]},${fp[1]}C${cp1[0]},${cp1[1]},${cp2[0]},${cp2[1]},${tp[0]},${tp[1]}`
        return { ...c, fp, tp, cp1, cp2, d, color: corridorColor(c.settle), weight: 0.5 + (c.vol / volMax) * 2.5 }
      })
      corDataRef.current = corridorData

      const corPaths = svg.append('g').selectAll('path').data(corridorData).join('path')
        .attr('d', d => d.d).attr('fill', 'none')
        .attr('stroke', d => d.color).attr('stroke-width', d => d.weight)
        .attr('stroke-linecap', 'round').attr('opacity', 0.35)
        .style('cursor', 'pointer')
        .on('mouseenter', function (_event, d) {
          corPaths.attr('opacity', 0.06)
          d3.select(this).attr('opacity', 1).attr('stroke-width', d.weight + 2)
          setTooltip(d)
        })
        .on('mouseleave', function () {
          corPaths.attr('opacity', 0.35).attr('stroke-width', d => d.weight)
          setTooltip(null)
        })

      // Pulsing rings at corridor midpoints
      const pingG = svg.append('g')
      const pingIntervals = corridorData.map((cd, i) => {
        const mx = (cd.fp[0] + cd.tp[0]) / 2
        const my = (cd.fp[1] + cd.tp[1]) / 2
        const r  = 3 + (cd.vol / volMax) * 12
        function doPing() {
          if (destroyed) return
          pingG.append('circle')
            .attr('cx', mx).attr('cy', my).attr('r', r * 0.4)
            .attr('fill', 'none').attr('stroke', cd.color).attr('stroke-width', 0.7).attr('opacity', 0.5)
            .transition().duration(2200).ease(d3.easeQuadOut)
            .attr('r', r * 2.2).attr('opacity', 0)
            .on('end', function () { d3.select(this).remove() })
        }
        setTimeout(doPing, i * 200)
        return setInterval(doPing, 2000 + i * 180)
      })

      // Hub nodes
      const hubCounts: Record<string, number> = {}
      CORRIDORS.forEach(c => {
        hubCounts[c.from] = (hubCounts[c.from] || 0) + 1
        hubCounts[c.to]   = (hubCounts[c.to]   || 0) + 1
      })
      const nodeG = svg.append('g')
      Object.entries(COORDS).forEach(([code, lonlat]) => {
        const pos = projection(lonlat)
        if (!pos) return
        const count = hubCounts[code] || 1
        const isHub = count >= 3
        const r     = isHub ? 5.5 : count >= 2 ? 4 : 3
        const color = isHub ? '#00e5a0' : '#3b82f6'
        const g     = nodeG.append('g')
        if (isHub) {
          g.append('circle').attr('cx', pos[0]).attr('cy', pos[1]).attr('r', r + 9)
            .attr('fill', 'rgba(0,229,160,0.05)').attr('stroke', 'rgba(0,229,160,0.18)').attr('stroke-width', 0.7)
        }
        g.append('circle').attr('cx', pos[0]).attr('cy', pos[1]).attr('r', r)
          .attr('fill', color).style('filter', `drop-shadow(0 0 ${isHub ? 7 : 4}px ${color})`)
        g.append('text')
          .attr('x', pos[0]).attr('y', pos[1] - r - 5)
          .attr('text-anchor', 'middle').attr('fill', 'rgba(255,255,255,0.65)')
          .attr('font-size', 8.5).attr('font-family', 'ui-monospace,monospace')
          .attr('font-weight', 700).attr('letter-spacing', 0.5).text(code)
      })

      dotsGRef.current = svg.append('g')

      function animate() {
        if (destroyed) return
        dotsRef.current = dotsRef.current.filter(dot => {
          if (dot.done) { dot.el.remove(); return false }
          dot.t = Math.min(dot.t + 0.014 * dot.speed, 1)
          const pos = bezierPoint(dot.cd.fp, dot.cd.cp1, dot.cd.cp2, dot.cd.tp, dot.t)
          dot.el.attr('cx', pos[0]).attr('cy', pos[1])
          if (dot.t >= 0.96) {
            dot.el.attr('opacity', Math.max(0, 1 - (dot.t - 0.96) / 0.04))
            if (dot.t >= 1) {
              const fc = dot.willSettle ? '#00e5a0' : '#f43f5e'
              dot.el.attr('fill', fc).style('filter', `drop-shadow(0 0 5px ${fc})`)
              if (dot.willSettle) setSettledRef.current(n => n + 1)
              dot.done = true
            }
          }
          return true
        })
        rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)

      spawnInterval = setInterval(() => {
        if (destroyed) return
        spawnDot()
        if (Math.random() > 0.45) spawnDot()
      }, 270)

      return () => pingIntervals.forEach(clearInterval)
    }

    const cleanupPromise = build()
    return () => {
      destroyed = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (spawnInterval)  clearInterval(spawnInterval)
      cleanupPromise?.then?.(fn => fn?.())
    }
  }, [])

  return (
    <div
      className={className}
      style={{
        background: '#050d1a',
        borderRadius: 'var(--radius-lg, 12px)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'ui-monospace, monospace',
        border: '1px solid rgba(59,130,246,0.18)',
        boxShadow: '0 0 80px rgba(59,130,246,0.06), 0 1px 3px rgba(0,0,0,0.4)',
      }}
    >
      <style>{`
        @keyframes rmx-blink {
          0%,100% { opacity:1; box-shadow:0 0 10px #00e5a0; }
          50%      { opacity:0.4; box-shadow:0 0 4px #00e5a0; }
        }
        @keyframes rmx-fadein {
          from { opacity:0; transform:translateY(4px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '18px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, position: 'relative', zIndex: 2 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e5a0', animation: 'rmx-blink 2s infinite' }} />
            <span style={{ color: '#00e5a0', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700 }}>Live Network</span>
          </div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>Payment Corridor Map</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>
            {CORRIDORS.length} corridors · {Object.keys(COORDS).length} countries · real-time
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Volume',  value: `$${totalVol}B`, sub: 'annualized' },
            { label: 'Settlement',    value: `${avgSettle}%`, sub: 'avg success' },
            { label: 'Transactions',  value: totalTx.toLocaleString(), sub: 'this session' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>{m.label}</div>
              <div style={{ color: '#00e5a0', fontSize: 18, fontWeight: 700 }}>{m.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 8 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position: 'absolute', top: 78, left: '50%', transform: 'translateX(-50%)', background: 'rgba(5,13,26,0.97)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 10, padding: '9px 18px', zIndex: 20, pointerEvents: 'none', textAlign: 'center', whiteSpace: 'nowrap', boxShadow: '0 0 30px rgba(59,130,246,0.15)', animation: 'rmx-fadein 0.15s ease' }}>
          <div style={{ color: '#3b82f6', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{tooltip.pair}</div>
          <div style={{ color: '#fff', fontSize: 10, marginTop: 3 }}>
            Volume: <b>${tooltip.vol}B</b> · Settlement: <b>{(tooltip.settle * 100).toFixed(0)}%</b>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 1 }}>{tooltip.from} → {tooltip.to}</div>
        </div>
      )}

      {/* D3 canvas */}
      <div ref={wrapRef} style={{ width: '100%', position: 'relative', marginTop: -4 }} />

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 22px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {([['#00e5a0', '95%+ settled'], ['#3b82f6', '90–95%'], ['#f59e0b', '<90%']] as [string, string][]).map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 2, borderRadius: 2, background: c, boxShadow: `0 0 5px ${c}` }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>{l}</span>
            </div>
          ))}
          {([['#00e5a0', 'settled'], ['#fff', 'in-flight']] as [string, string][]).map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 8, letterSpacing: 1 }}>
          SETTLED: <span style={{ color: '#00e5a0', fontWeight: 700 }}>{settled.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
