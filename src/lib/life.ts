interface Grid {
  cs: number
  cols: number
  rows: number
  w: number
  h: number
  a: Uint8Array
  b: Uint8Array
  age: Uint16Array
  mask: Uint8Array
  anchored: Uint8Array
  threshold: Float32Array
  healAt: Float64Array
  maskIdx: number[]
}

interface Cell {
  x: number
  y: number
}

export interface LifeOptions {
  canvas: HTMLCanvasElement
  /** Element whose scroll position drives the dissolve and that receives pointer events */
  hero: HTMLElement
  /** Lines of text drawn with cells */
  lines: string[]
  /** Called a few times per second with the current generation and population */
  onStats?: (gen: number, pop: number) => void
}

const CELL_SIZE = 8
const CELL_SIZE_SMALL = 6
const TICK_MS = 100
const TICK_MS_REDUCED = 600
const GLIDER_EVERY_MS = 2600
const STATS_EVERY_MS = 250
const SOUP_DENSITY = 0.045
const MAX_CONTENT_WIDTH = 1280
const HEADER_SPACE = 96
const BOTTOM_SPACE = 28
const FONT = '"Onest", system-ui, sans-serif'
const GLIDER: [number, number][] = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2]
]

export function startLife({ canvas, hero, lines, onStats }: LifeOptions) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let g: Grid | null = null
  let fg = '#000'
  let accent = '#000'
  let cursor: Cell | null = null
  const dir: [number, number] = [1, 1]
  let gen = 0
  let pop = 0
  let lastTick = 0
  let lastGlider = 0
  let lastStats = 0
  let raf = 0

  const readColors = () => {
    const style = getComputedStyle(document.documentElement)
    fg = style.getPropertyValue('--fg').trim() || fg
    accent = style.getPropertyValue('--accent').trim() || accent
  }

  const progress = () => {
    const r = hero.getBoundingClientRect()
    if (!r.height) return 0
    return Math.min(1, Math.max(0, -r.top / (r.height * 0.7)))
  }

  const buildMask = () => {
    if (!g) return
    const { cols, rows, cs, w } = g
    const off = document.createElement('canvas')
    off.width = cols
    off.height = rows
    const o = off.getContext('2d', { willReadFrequently: true })
    if (!o) return
    o.font = `800 100px ${FONT}`
    const widest = Math.max(...lines.map((l) => o.measureText(l).width))
    const pad = Math.max(20, Math.min(40, w * 0.04))
    const left = Math.max(pad, (w - MAX_CONTENT_WIDTH) / 2 + pad) / cs
    const top = HEADER_SPACE / cs
    const vavail = rows - top - BOTTOM_SPACE / cs
    const lineHeight = 0.98
    const blockLines = 0.92 + lineHeight * (lines.length - 1)
    const fs = Math.max(
      6,
      Math.min((100 * (cols - left * 2)) / widest, vavail / (blockLines + 0.05))
    )
    o.font = `800 ${fs}px ${FONT}`
    o.textBaseline = 'alphabetic'
    const y0 = top + Math.max(0, (vavail - fs * blockLines) / 2) + fs * 0.92
    lines.forEach((line, i) => {
      o.fillText(line, Math.round(left), y0 + fs * lineHeight * i)
    })

    const data = o.getImageData(0, 0, cols, rows).data
    const p = progress()
    g.mask.fill(0)
    g.anchored.fill(0)
    g.maskIdx = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        if (data[i * 4 + 3] <= 110) continue
        g.mask[i] = 1
        g.maskIdx.push(i)
        // Mostly random, with a left-to-right bias so the name dissolves as it is read
        g.threshold[i] = 0.04 + 0.62 * Math.random() + 0.3 * (x / cols)
        if (g.threshold[i] >= p) {
          g.anchored[i] = 1
          g.a[i] = 0
        }
      }
    }
  }

  const layout = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h || (g && g.w === w && g.h === h)) return
    const cs = w < 640 ? CELL_SIZE_SMALL : CELL_SIZE
    const dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cols = Math.ceil(w / cs)
    const rows = Math.ceil(h / cs)
    const n = cols * rows
    g = {
      cs,
      cols,
      rows,
      w,
      h,
      a: new Uint8Array(n),
      b: new Uint8Array(n),
      age: new Uint16Array(n),
      mask: new Uint8Array(n),
      anchored: new Uint8Array(n),
      threshold: new Float32Array(n),
      healAt: new Float64Array(n),
      maskIdx: []
    }
    for (let i = 0; i < n; i++) if (Math.random() < SOUP_DENSITY) g.a[i] = 1
    buildMask()
  }

  const setCell = (x: number, y: number) => {
    if (!g) return
    const xx = ((x % g.cols) + g.cols) % g.cols
    const yy = ((y % g.rows) + g.rows) % g.rows
    const i = yy * g.cols + xx
    g.a[i] = 1
    g.age[i] = 0
  }

  const glider = (cx: number, cy: number, dx: number, dy: number) => {
    for (const [px, py] of GLIDER) {
      setCell(cx + (dx > 0 ? px : -px), cy + (dy > 0 ? py : -py))
    }
  }

  const step = () => {
    if (!g) return
    const { cols, rows, a, b, age } = g
    let count = 0
    for (let y = 0; y < rows; y++) {
      const ym = ((y - 1 + rows) % rows) * cols
      const y0 = y * cols
      const yp = ((y + 1) % rows) * cols
      for (let x = 0; x < cols; x++) {
        const xm = (x - 1 + cols) % cols
        const xp = (x + 1) % cols
        const n =
          a[ym + xm] +
          a[ym + x] +
          a[ym + xp] +
          a[y0 + xm] +
          a[y0 + xp] +
          a[yp + xm] +
          a[yp + x] +
          a[yp + xp]
        const i = y0 + x
        const alive = a[i]
        const next = n === 3 || (alive && n === 2) ? 1 : 0
        b[i] = next
        age[i] = next ? (alive ? Math.min(age[i] + 1, 60000) : 0) : 0
        count += next
      }
    }
    g.a = b
    g.b = a
    gen++
    pop = count
  }

  // Name cells stay drawn while anchored; once released they join the simulation
  const applyAnchors = (now: number) => {
    if (!g) return
    const p = progress()
    for (const i of g.maskIdx) {
      const want = g.threshold[i] >= p && now >= g.healAt[i]
      if (want && !g.anchored[i]) {
        g.anchored[i] = 1
        g.a[i] = 0
      } else if (!want && g.anchored[i]) {
        g.anchored[i] = 0
        g.a[i] = 1
        g.age[i] = 0
      }
    }
  }

  const draw = () => {
    if (!g) return
    const { cs, cols, rows, a, age, anchored } = g
    const s = cs > 5 ? cs - 1 : cs
    ctx.clearRect(0, 0, g.w, g.h)

    ctx.globalAlpha = 0.14
    ctx.fillStyle = fg
    for (let y = 0; y < rows; y += 4) {
      for (let x = 0; x < cols; x += 4) {
        ctx.fillRect(x * cs + cs / 2 - 0.5, y * cs + cs / 2 - 0.5, 1, 1)
      }
    }

    // [alpha, minAge, maxAge, color]: newborn cells in accent, fading as they age
    const passes: [number, number, number, string][] = [
      [0.26, 10, Number.POSITIVE_INFINITY, fg],
      [0.62, 2, 10, fg],
      [1, 0, 2, accent]
    ]
    for (const [alpha, min, max, color] of passes) {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      for (let i = 0; i < a.length; i++) {
        if (a[i] && !anchored[i] && age[i] >= min && age[i] < max) {
          ctx.fillRect((i % cols) * cs, ((i / cols) | 0) * cs, s, s)
        }
      }
    }

    ctx.globalAlpha = 1
    ctx.fillStyle = fg
    for (const i of g.maskIdx) {
      if (anchored[i])
        ctx.fillRect((i % cols) * cs, ((i / cols) | 0) * cs, s, s)
    }

    if (cursor) {
      ctx.strokeStyle = accent
      ctx.lineWidth = 1
      ctx.strokeRect(
        cursor.x * cs - cs + 0.5,
        cursor.y * cs - cs + 0.5,
        cs * 3 - 1,
        cs * 3 - 1
      )
    }
  }

  const cellFromEvent = (e: PointerEvent): Cell | null => {
    if (!g) return null
    const r = canvas.getBoundingClientRect()
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
      return null
    }
    return {
      x: Math.floor(((e.clientX - r.left) * (g.w / r.width)) / g.cs),
      y: Math.floor(((e.clientY - r.top) * (g.h / r.height)) / g.cs)
    }
  }

  // Seeds random cells around (cx, cy) and chips nearby name cells for a few seconds
  const disturb = (cx: number, cy: number, now: number) => {
    if (!g) return
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.random() < 0.42) setCell(cx + dx, cy + dy)
      }
    }
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue
        const i = y * g.cols + x
        if (g.mask[i]) g.healAt[i] = now + 1600 + Math.random() * 2200
      }
    }
  }

  const onMove = (e: PointerEvent) => {
    const c = cellFromEvent(e)
    if (!c) {
      cursor = null
      return
    }
    const now = performance.now()
    if (cursor) {
      const ddx = c.x - cursor.x
      const ddy = c.y - cursor.y
      if (ddx) dir[0] = Math.sign(ddx)
      if (ddy) dir[1] = Math.sign(ddy)
      const steps = Math.min(40, Math.max(Math.abs(ddx), Math.abs(ddy)))
      for (let s = 1; s <= steps; s++) {
        disturb(
          Math.round(cursor.x + (ddx * s) / steps),
          Math.round(cursor.y + (ddy * s) / steps),
          now
        )
      }
    } else {
      disturb(c.x, c.y, now)
    }
    cursor = c
  }

  const onDown = (e: PointerEvent) => {
    const c = cellFromEvent(e)
    if (!c) return
    disturb(c.x, c.y, performance.now())
    glider(c.x + 3, c.y + 3, 1, 1)
    glider(c.x - 3, c.y + 3, -1, 1)
    glider(c.x + 3, c.y - 3, 1, -1)
    glider(c.x - 3, c.y - 3, -1, -1)
    cursor = c
  }

  const onLeave = () => {
    cursor = null
  }

  const loop = (t: number) => {
    raf = requestAnimationFrame(loop)
    if (!g || hero.getBoundingClientRect().bottom < 0) return
    if (t - lastTick >= (reduced ? TICK_MS_REDUCED : TICK_MS)) {
      step()
      lastTick = t
    }
    if (!reduced && t - lastGlider > GLIDER_EVERY_MS) {
      lastGlider = t
      glider(
        1,
        Math.floor(Math.random() * g.rows),
        1,
        Math.random() < 0.5 ? 1 : -1
      )
    }
    applyAnchors(performance.now())
    draw()
    if (onStats && t - lastStats > STATS_EVERY_MS) {
      lastStats = t
      onStats(gen, pop)
    }
  }

  readColors()
  layout()
  document.fonts?.load(`800 100px ${FONT}`).then(buildMask, () => {})

  const resizeObserver = new ResizeObserver(layout)
  resizeObserver.observe(canvas)
  const themeObserver = new MutationObserver(readColors)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })
  hero.addEventListener('pointermove', onMove)
  hero.addEventListener('pointerdown', onDown)
  hero.addEventListener('pointerleave', onLeave)
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    themeObserver.disconnect()
    hero.removeEventListener('pointermove', onMove)
    hero.removeEventListener('pointerdown', onDown)
    hero.removeEventListener('pointerleave', onLeave)
  }
}
