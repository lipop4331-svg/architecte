// Vue 3D de la maison (three.js) : se reconstruit à chaque modification du plan.
// Gère l'étage, les meubles, l'escalier, le jardin, le toit, le décor et la lumière (jour / soirée).
// Textures procédurales (canvas) mises en cache pour toute l'application.
;(function (root) {
  const A = root.Archi
  const WALL_H = 2.6
  const FLOOR_H = 2.8 // hauteur d'un niveau (mur + dalle)
  const GROUND_Y = -0.45 // sol du décor, sous la dalle du terrain
  const OUT = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }

  // ---------- Outils de génération de textures ----------
  const TEX = {}
  const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 }
  const rngf = (seed) => {
    let s = seed >>> 0
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  }
  const hh = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length]
  function mkTex(key, w, h, draw, repeat = true) {
    if (TEX[key]) return TEX[key]
    const cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    const g = cv.getContext('2d')
    draw(g, w, h, rngf(strHash(key)))
    const t = new THREE.CanvasTexture(cv)
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 4
    TEX[key] = t
    return t
  }
  const wrapCircle = (g, w, h, x, y, r) => {
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
      if (x + dx + r < 0 || x + dx - r > w || y + dy + r < 0 || y + dy - r > h) continue
      g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill()
    }
  }
  const noise = (g, w, h, r, n, cols, a0, a1, sz) => {
    for (let i = 0; i < n; i++) {
      g.globalAlpha = a0 + r() * (a1 - a0)
      g.fillStyle = pick(r, cols)
      const s = 1 + r() * sz
      g.fillRect(r() * w, r() * h, s, s)
    }
    g.globalAlpha = 1
  }

  const GEN = {
    grass: () => mkTex('grass', 512, 512, (g, w, h, r) => {
      g.fillStyle = '#74b45a'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 1300; i++) {
        g.globalAlpha = 0.05 + r() * 0.1
        g.fillStyle = pick(r, ['#68a650', '#82c068', '#5f9c49', '#8fca72', '#79b95f', '#6fae56'])
        wrapCircle(g, w, h, r() * w, r() * h, 6 + r() * 26)
      }
      g.globalAlpha = 1
      for (let i = 0; i < 1800; i++) {
        g.strokeStyle = pick(r, ['rgba(60,110,40,0.35)', 'rgba(170,215,120,0.4)', 'rgba(220,235,150,0.25)'])
        const x = r() * w, y = r() * h
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5); g.stroke()
      }
    }),
    lawn: () => mkTex('lawn', 512, 512, (g, w, h, r) => {
      g.fillStyle = '#86c46c'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 1100; i++) {
        g.globalAlpha = 0.05 + r() * 0.1
        g.fillStyle = pick(r, ['#79b95f', '#92cf76', '#6fae56', '#9bd47e', '#85c36a'])
        wrapCircle(g, w, h, r() * w, r() * h, 5 + r() * 22)
      }
      g.globalAlpha = 0.07; g.fillStyle = '#ffffff'
      for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 64, h)
      g.globalAlpha = 1
      for (let i = 0; i < 2200; i++) {
        g.strokeStyle = pick(r, ['rgba(60,120,40,0.3)', 'rgba(190,235,140,0.4)'])
        const x = r() * w, y = r() * h
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4); g.stroke()
      }
      // quelques fleurs minuscules
      for (let i = 0; i < 40; i++) { g.fillStyle = pick(r, ['#ffffff', '#ffe36e', '#ffb3c6']); const x = r() * w, y = r() * h; g.fillRect(x, y, 2, 2) }
    }),
    parquet: () => mkTex('parquet', 256, 256, (g, w, h, r) => {
      const rows = 8, rh = h / rows
      for (let i = 0; i < rows; i++) {
        const off = (i * 77) % 128
        for (let k = -1; k < 3; k++) {
          const x = off + k * 128
          g.fillStyle = pick(r, ['#e2c7a0', '#d8b98d', '#ddc096', '#d1b184', '#e6cda8'])
          g.fillRect(x, i * rh, 128, rh)
          g.strokeStyle = 'rgba(120,80,40,0.16)'; g.lineWidth = 1
          for (let j = 0; j < 4; j++) { const y = i * rh + 4 + r() * (rh - 8); g.beginPath(); g.moveTo(x + 4, y); g.bezierCurveTo(x + 40, y + (r() - 0.5) * 5, x + 80, y + (r() - 0.5) * 5, x + 124, y); g.stroke() }
        }
        g.strokeStyle = 'rgba(80,50,20,0.5)'; g.lineWidth = 1.5
        g.beginPath(); g.moveTo(0, i * rh); g.lineTo(w, i * rh); g.stroke()
        for (let k = -1; k < 3; k++) { const x = off + k * 128; g.beginPath(); g.moveTo(x, i * rh); g.lineTo(x, (i + 1) * rh); g.stroke() }
      }
    }),
    tiles: () => mkTex('tiles', 256, 256, (g, w, h, r) => {
      g.fillStyle = '#b4afa5'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const c = 238 + Math.floor(r() * 14) - 7
        g.fillStyle = `rgb(${c},${c - 2},${c - 6})`
        g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60)
        const gr = g.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64)
        gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.06)')
        g.fillStyle = gr; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60)
      }
    }),
    concrete: () => mkTex('concrete', 256, 256, (g, w, h, r) => {
      g.fillStyle = '#c4c6c8'; g.fillRect(0, 0, w, h)
      noise(g, w, h, r, 7000, ['#8d9094', '#e2e4e6', '#a9acb0'], 0.04, 0.16, 3)
      for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(70,70,75,0.10)'; wrapCircle(g, w, h, r() * w, r() * h, 6 + r() * 14) }
      g.strokeStyle = 'rgba(60,60,64,0.5)'; g.lineWidth = 2
      g.strokeRect(0, 0, w, h)
      g.strokeStyle = 'rgba(60,60,64,0.35)'; g.lineWidth = 1
      g.beginPath(); g.moveTo(40, 40); g.lineTo(70, 70); g.lineTo(66, 110); g.lineTo(100, 130); g.stroke()
    }),
    plaster: () => mkTex('plaster', 128, 128, (g, w, h, r) => {
      g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h)
      noise(g, w, h, r, 1800, ['#d8d2c4', '#ffffff', '#e6e0d2'], 0.1, 0.4, 2)
    }),
    roof: () => mkTex('roof', 256, 256, (g, w, h, r) => {
      const rows = 8, rh = h / rows
      g.fillStyle = '#6e2a1c'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < rows; i++) for (let k = -1; k < 8; k++) {
        const x = k * 32 + (i % 2 ? 16 : 0), y = i * rh
        g.fillStyle = pick(r, ['#c05a3f', '#b44d37', '#c8624a', '#ad4733', '#bb5540'])
        g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 31, y); g.lineTo(x + 31, y + rh - 9); g.quadraticCurveTo(x + 31, y + rh, x + 16, y + rh); g.quadraticCurveTo(x + 1, y + rh, x + 1, y + rh - 9); g.closePath(); g.fill()
        g.fillStyle = 'rgba(255,225,200,0.22)'; g.fillRect(x + 3, y + 2, 4, rh - 10)
        g.fillStyle = 'rgba(50,10,0,0.3)'; g.fillRect(x + 1, y + rh - 7, 30, 5)
      }
    }),
    pave: () => mkTex('pave', 256, 256, (g, w, h, r) => {
      g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 8; i++) for (let k = -1; k < 4; k++) {
        const x = k * 64 + (i % 2 ? 32 : 0), c = 188 + Math.floor(r() * 36)
        g.fillStyle = `rgb(${c},${c - 8},${c - 22})`
        g.fillRect(x + 2, i * 32 + 2, 60, 28)
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 2, i * 32 + 2, 60, 3)
      }
    }),
    deck: () => mkTex('deck', 256, 256, (g, w, h, r) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = pick(r, ['#d3a86f', '#c99b5f', '#d8b07a', '#c4965a'])
        g.fillRect(0, i * 32, w, 32)
        g.strokeStyle = 'rgba(100,60,20,0.2)'
        for (let j = 0; j < 4; j++) { const y = i * 32 + 4 + r() * 24; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 3); g.stroke() }
        g.fillStyle = 'rgba(60,35,10,0.55)'; g.fillRect(0, i * 32, w, 2)
      }
    }),
    water: () => mkTex('water', 256, 256, (g, w, h, r) => {
      const gr = g.createLinearGradient(0, 0, w, h)
      gr.addColorStop(0, '#46b4e8'); gr.addColorStop(0.5, '#2f98d6'); gr.addColorStop(1, '#46b4e8')
      g.fillStyle = gr; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(255,255,255,${0.18 + r() * 0.22})`; g.lineWidth = 1 + r() * 2
        const y0 = 14 + i * 28, ph = r() * 6, k = 1 + Math.floor(r() * 3), a = 3 + r() * 5
        g.beginPath()
        for (let x = 0; x <= w; x += 4) { const y = y0 + a * Math.sin((x / w) * Math.PI * 2 * k + ph); if (x === 0) g.moveTo(x, y); else g.lineTo(x, y) }
        g.stroke()
      }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.55)'; const x = r() * w, y = r() * h; g.fillRect(x, y, 2 + r() * 2, 1.5) }
    }),
    leaf: () => mkTex('leaf', 128, 128, (g, w, h, r) => {
      g.fillStyle = '#3f8a3c'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 260; i++) { g.globalAlpha = 0.5; g.fillStyle = pick(r, ['#2f7a30', '#56a04a', '#4a9640', '#68b058', '#2a6e2c']); wrapCircle(g, w, h, r() * w, r() * h, 3 + r() * 7) }
      g.globalAlpha = 1
    }),
    side: () => mkTex('side', 128, 128, (g, w, h, r) => {
      const bands = ['#7a5a3b', '#8a6a48', '#6f5236', '#9a7a55', '#7e5f40', '#664a30']
      g.fillStyle = '#7a5a3b'; g.fillRect(0, 0, w, h)
      let y = 14
      for (let i = 0; y < h; i++) { const bh = 12 + r() * 14; g.fillStyle = bands[i % bands.length]; g.fillRect(0, y, w, bh); y += bh }
      noise(g, w, h, r, 500, ['#4a3522', '#b69a74'], 0.1, 0.4, 3)
      g.fillStyle = '#6aa851'; g.fillRect(0, 0, w, 12)
      g.fillStyle = '#7fbd62'; for (let x = 0; x < w; x += 6) g.fillRect(x, 8, 4, 6 + r() * 4)
    }, false),
    road: () => mkTex('road', 256, 128, (g, w, h, r) => {
      g.fillStyle = '#5b5f67'; g.fillRect(0, 0, w, h)
      noise(g, w, h, r, 3500, ['#43464d', '#7a7e86', '#6a6e76'], 0.08, 0.3, 2)
      g.fillStyle = 'rgba(243,240,214,0.92)'; g.fillRect(0, h / 2 - 2.5, w / 2, 5)
      g.fillStyle = 'rgba(232,228,208,0.75)'; g.fillRect(0, 6, w, 3); g.fillRect(0, h - 9, w, 3)
    }),
    gravel: () => mkTex('gravel', 128, 128, (g, w, h, r) => {
      g.fillStyle = '#a89f8c'; g.fillRect(0, 0, w, h)
      noise(g, w, h, r, 2600, ['#7d766a', '#cfc7b4', '#8f8878', '#b9b09b'], 0.3, 0.8, 3)
      for (let i = 0; i < 90; i++) { g.strokeStyle = pick(r, ['#b9ac6a', '#9a9457']); const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - 3 - r() * 4); g.stroke() }
    }),
    fence: () => mkTex('fence', 64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h)
      g.strokeStyle = '#ff8a2a'; g.lineWidth = 5
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke()
    }),
    blob: () => mkTex('blob', 128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64)
      gr.addColorStop(0, 'rgba(20,30,20,0.55)'); gr.addColorStop(0.6, 'rgba(20,30,20,0.25)'); gr.addColorStop(1, 'rgba(20,30,20,0)')
      g.fillStyle = gr; g.fillRect(0, 0, w, h)
    }, false),
  }
  const tex = (n) => GEN[n]()

  // ---------- Ciel ----------
  const TIMES = {
    day: { fog: 0xe4f1f6, hemiSky: 0xffffff, hemiGround: 0x8fae88, hemiI: 0.55, sunC: 0xfff0d0, sunI: 0.72, sunPos: [7, 20, 14] },
    evening: { fog: 0xf2a670, hemiSky: 0xa99ad0, hemiGround: 0x7a6552, hemiI: 0.85, sunC: 0xff9a50, sunI: 0.9, sunPos: [16, 7, 12] },
  }
  function skyTex(time) {
    return mkTex('sky_' + time, 1024, 512, (g, w, h, r) => {
      const ev = time === 'evening'
      const gr = g.createLinearGradient(0, 0, 0, h)
      const stops = ev
        ? [[0, '#1d1f5c'], [0.18, '#43358a'], [0.34, '#93498f'], [0.44, '#ee865c'], [0.5, '#f2a670'], [1, '#f2a670']]
        : [[0, '#3a80cc'], [0.25, '#6fb0e6'], [0.42, '#b6d9f1'], [0.5, '#e4f1f6'], [1, '#e4f1f6']]
      stops.forEach(([p, c]) => gr.addColorStop(p, c))
      g.fillStyle = gr; g.fillRect(0, 0, w, h)
      if (ev) { for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; g.fillRect(r() * w, r() * h * 0.3, 1.5, 1.5) } }
      const sp = TIMES[time].sunPos
      const rho = Math.hypot(sp[0], sp[2]), el = Math.atan2(sp[1], rho)
      let u = Math.atan2(sp[2], -sp[0]) / (Math.PI * 2); if (u < 0) u += 1
      const sx = u * w, sy = (1 - (0.5 + el / Math.PI)) * h
      const glow = g.createRadialGradient(sx, sy, 2, sx, sy, ev ? 190 : 120)
      glow.addColorStop(0, ev ? 'rgba(255,230,170,0.95)' : 'rgba(255,255,235,0.95)')
      glow.addColorStop(0.12, ev ? 'rgba(255,190,110,0.7)' : 'rgba(255,248,210,0.55)')
      glow.addColorStop(1, 'rgba(255,200,120,0)')
      g.fillStyle = glow; g.fillRect(0, 0, w, h)
      // nuages doux
      for (let i = 0; i < 16; i++) {
        const cx = r() * w, el2 = 0.04 + r() * 0.3, cy = (0.5 - el2) * h
        const sc = 1 + (0.35 - el2) * 2.2, n = 6 + Math.floor(r() * 5)
        for (let k = 0; k < n; k++) {
          const px = cx + (k - n / 2) * 22 * sc + (r() - 0.5) * 14, py = cy + (r() - 0.5) * 8, rr = (16 + r() * 16) * sc
          for (const o of [-w, 0, w]) {
            g.save(); g.translate(px + o, py); g.scale(2.1, 0.7)
            const cg = g.createRadialGradient(0, 0, 0, 0, 0, rr)
            if (ev) { cg.addColorStop(0, 'rgba(255,200,170,0.75)'); cg.addColorStop(1, 'rgba(200,110,140,0)') } else { cg.addColorStop(0, 'rgba(255,255,255,0.85)'); cg.addColorStop(1, 'rgba(255,255,255,0)') }
            g.fillStyle = cg; g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill(); g.restore()
          }
        }
      }
    }, false)
  }

  // met à l'échelle les UV d'une géométrie (répétition de texture)
  function uvs(geo, su, sv, swap) {
    const uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i)
      uv.setXY(i, (swap ? v : u) * su, (swap ? u : v) * sv)
    }
    uv.needsUpdate = true
    return geo
  }

  class View3D {
    constructor(el) {
      this.el = el
      this.matCache = new Map()
      this.labelCache = new Map()
      const w = el.clientWidth || 480, h = el.clientHeight || 360
      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      this.renderer.setSize(w, h)
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      el.appendChild(this.renderer.domElement)

      this.scene = new THREE.Scene()
      this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 700)
      this.hemi = new THREE.HemisphereLight(0xffffff, 0x8fae88, 0.55)
      this.scene.add(this.hemi)
      this.sun = new THREE.DirectionalLight(0xfff0d0, 0.72) // le soleil vient du sud (z positif)
      this.sun.castShadow = true
      this.sun.shadow.mapSize.set(2048, 2048)
      this.sun.shadow.bias = -0.0006
      this.sun.shadow.normalBias = 0.02
      this.scene.add(this.sun)
      this.scene.add(this.sun.target)
      this.dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false }))
      this.dome.renderOrder = -1
      this.scene.add(this.dome)

      this.group = new THREE.Group()
      this.scene.add(this.group)
      this.roof = false
      this.hideUpper = false
      this.time = 'day'
      this.targetY = 0.8
      this.theta = 0.55
      this.phi = 0.95
      this.radius = 22
      this.dirty = true
      this.levelId = null
      this.applyTime()
      this.bindControls()
      this.updateCamera()
      new ResizeObserver(() => this.resize()).observe(el)
      const loop = () => {
        if (this.dirty) { this.renderer.render(this.scene, this.camera); this.dirty = false }
        requestAnimationFrame(loop)
      }
      loop()
    }

    resize() {
      const w = this.el.clientWidth, h = this.el.clientHeight
      if (!w || !h) return
      this.renderer.setSize(w, h)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.dirty = true
    }

    bindControls() {
      const c = this.renderer.domElement
      const pts = new Map()
      let lastDist = 0
      c.style.touchAction = 'none'
      c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); lastDist = 0 })
      c.addEventListener('pointerup', (e) => pts.delete(e.pointerId))
      c.addEventListener('pointercancel', (e) => pts.delete(e.pointerId))
      c.addEventListener('pointermove', (e) => {
        const p = pts.get(e.pointerId)
        if (!p) return
        if (pts.size === 1) {
          this.theta -= (e.clientX - p[0]) * 0.008
          this.phi = Math.max(0.15, Math.min(1.5, this.phi - (e.clientY - p[1]) * 0.006))
        } else if (pts.size === 2) {
          const [a, b] = [...pts.values()]
          const d = Math.hypot(a[0] - b[0], a[1] - b[1])
          if (lastDist) this.radius = Math.max(8, Math.min(70, this.radius * (lastDist / d)))
          lastDist = d
        }
        pts.set(e.pointerId, [e.clientX, e.clientY])
        this.updateCamera()
      })
      c.addEventListener('wheel', (e) => {
        e.preventDefault()
        this.radius = Math.max(8, Math.min(70, this.radius * (1 + Math.sign(e.deltaY) * 0.08)))
        this.updateCamera()
      }, { passive: false })
    }

    updateCamera() {
      const r = this.radius
      this.camera.position.set(r * Math.sin(this.phi) * Math.sin(this.theta), this.targetY + r * Math.cos(this.phi), r * Math.sin(this.phi) * Math.cos(this.theta))
      this.camera.lookAt(0, this.targetY, 0)
      this.dirty = true
    }

    resetView(level) {
      this.theta = 0.55
      this.phi = 0.95
      this.targetY = (level.floors || 1) > 1 ? 1.8 : 0.8
      this.radius = Math.max(level.w, level.h) * 1.55 + 4 + ((level.floors || 1) > 1 ? 3 : 0)
      this.updateCamera()
    }

    rebuild() { if (this.last) this.update(...this.last) }
    setRoof(on) { this.roof = on; this.rebuild() }
    setHideUpper(on) { this.hideUpper = on; this.rebuild() }
    // setTime('day' | 'evening') : ambiance lumineuse, ciel, fenêtres allumées en soirée
    setTime(t) {
      this.time = t === 'evening' ? 'evening' : 'day'
      this.applyTime()
      this.rebuild()
    }

    applyTime() {
      const T = TIMES[this.time]
      this.hemi.color.setHex(T.hemiSky); this.hemi.groundColor.setHex(T.hemiGround); this.hemi.intensity = T.hemiI
      this.sun.color.setHex(T.sunC); this.sun.intensity = T.sunI
      this.sun.position.set(...T.sunPos)
      this.dome.material.map = skyTex(this.time)
      this.dome.material.needsUpdate = true
      this.scene.fog = new THREE.Fog(T.fog, 75, 230)
      this.scene.background = new THREE.Color(T.fog)
      this.dirty = true
    }

    mat(color, opts) {
      opts = opts || {}
      const key = color + '|' + JSON.stringify(opts)
      let m = this.matCache.get(key)
      if (!m) {
        const { tex: tn, phong, flat, ...rest } = opts
        const p = { color, ...rest }
        if (tn) p.map = tex(tn)
        if (flat) m = new THREE.MeshPhongMaterial({ ...p, flatShading: true, shininess: 0, specular: 0x000000 })
        else if (phong) m = new THREE.MeshPhongMaterial({ shininess: 70, specular: 0x666666, ...p })
        else m = new THREE.MeshLambertMaterial(p)
        this.matCache.set(key, m)
      }
      return m
    }

    box(parent, w, h, d, x, y, z, color, opts, uv) {
      const geo = new THREE.BoxGeometry(w, h, d)
      if (uv) uvs(geo, uv[0], uv[1], uv[2])
      const m = new THREE.Mesh(geo, this.mat(color, opts))
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      parent.add(m)
      return m
    }

    cyl(parent, rt, rb, h, x, y, z, color, seg = 14, opts) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), this.mat(color, opts))
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      parent.add(m)
      return m
    }

    sph(parent, r, x, y, z, color, sx = 1, sy = 1, sz = 1, seg = 10) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), this.mat(color, { flat: true }))
      m.position.set(x, y, z)
      m.scale.set(sx, sy, sz)
      m.castShadow = true
      m.receiveShadow = true
      parent.add(m)
      return m
    }

    plane(parent, w, d, x, y, z, color, opts, uv) {
      const geo = new THREE.PlaneGeometry(w, d)
      geo.rotateX(-Math.PI / 2)
      if (uv) uvs(geo, uv[0], uv[1])
      const m = new THREE.Mesh(geo, this.mat(color, opts))
      m.position.set(x, y, z)
      m.receiveShadow = true
      parent.add(m)
      return m
    }

    label(parent, text, x, y, z, size) {
      let m = this.labelCache.get(text)
      if (!m) {
        const cv = document.createElement('canvas')
        cv.width = 256; cv.height = 128
        const g = cv.getContext('2d')
        g.font = 'bold 40px Trebuchet MS, sans-serif'
        g.textAlign = 'center'; g.textBaseline = 'middle'
        g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.strokeText(text, 128, 64)
        g.fillStyle = '#25405f'; g.fillText(text, 128, 64)
        m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })
        this.labelCache.set(text, m)
      }
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size / 2), m)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(x, y, z)
      mesh.renderOrder = 2
      parent.add(mesh)
    }

    clear() {
      this.group.traverse((o) => { if (o.geometry) o.geometry.dispose() }) // matériaux et textures restent en cache
      this.group.clear()
    }

    // ---------- Végétation ----------
    tree(g, x, z, r, kind, seed) {
      const gcol = [0x4f9f4a, 0x5aa84f, 0x468f45, 0x62b055][seed % 4]
      const gcol2 = [0x5db055, 0x4a9a47, 0x6bbb5c, 0x3f8a40][seed % 4]
      const grp = new THREE.Group()
      grp.position.set(x, 0, z)
      g.add(grp)
      if (kind === 1) { // conifère
        this.cyl(grp, 0.1, 0.15, 0.9, 0, 0.45, 0, 0x6b4a2c)
        const hs = Math.max(1.0, r * 1.5)
        for (let i = 0; i < 4; i++) {
          const rr = r * (1.05 - i * 0.22)
          const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hs, 10), this.mat(i % 2 ? 0x2f7a46 : 0x38875a, { flat: true }))
          c.position.set(0, 0.8 + i * hs * 0.5 + hs / 2, 0); c.castShadow = true; c.receiveShadow = true; grp.add(c)
        }
      } else if (kind === 2) { // arbre en fleurs
        this.cyl(grp, 0.1, 0.18, 1.3, 0, 0.65, 0, 0x7a5230)
        const cy = 1.35 + r * 0.55
        this.sph(grp, r * 0.78, 0, cy, 0, 0xf2b2c8)
        this.sph(grp, r * 0.55, r * 0.5, cy - 0.15, r * 0.2, 0xf6c4d4)
        this.sph(grp, r * 0.5, -r * 0.45, cy - 0.1, -r * 0.25, 0xeda1bd)
        this.sph(grp, r * 0.45, 0, cy + r * 0.55, 0, 0xf8d0dc)
      } else { // feuillu
        this.cyl(grp, 0.13, 0.2, 1.4, 0, 0.7, 0, 0x7a5230)
        const cy = 1.4 + r * 0.5
        this.sph(grp, r * 0.78, 0, cy, 0, gcol)
        this.sph(grp, r * 0.6, r * 0.55, cy - 0.15, r * 0.15, gcol2)
        this.sph(grp, r * 0.58, -r * 0.5, cy - 0.12, -r * 0.2, gcol2)
        this.sph(grp, r * 0.55, r * 0.05, cy - 0.1, r * 0.55, gcol)
        this.sph(grp, r * 0.5, 0, cy + r * 0.5, -r * 0.1, gcol2)
      }
    }

    rock(g, o, X, Z) {
      const grp = new THREE.Group()
      grp.position.set(X(o.x + o.w / 2), 0.04, Z(o.y + o.h / 2))
      g.add(grp)
      const blobs = [[0, 0, 0.46, 0.44, 0x8f9298], [-0.2, 0.15, 0.3, 0.3, 0x9da0a6], [0.22, -0.18, 0.28, 0.26, 0x7f8288], [0.18, 0.2, 0.2, 0.2, 0xa4a7ac]]
      blobs.forEach(([bx, bz, rx, ry, c], i) => {
        const geo = new THREE.IcosahedronGeometry(1, 1)
        const p = geo.attributes.position
        for (let k = 0; k < p.count; k++) { const j = 0.88 + hh(Math.round(p.getX(k) * 50) + i, Math.round(p.getY(k) * 50 + p.getZ(k) * 30)) * 0.24; p.setXYZ(k, p.getX(k) * j, p.getY(k) * j, p.getZ(k) * j) }
        geo.computeVertexNormals()
        const m = new THREE.Mesh(geo, this.mat(c, { flat: true }))
        m.scale.set(o.w * rx, Math.min(o.w, o.h) * ry + 0.1, o.h * rx)
        m.position.set(bx * o.w, m.scale.y * 0.55, bz * o.h)
        m.rotation.y = i * 1.3
        m.castShadow = true; m.receiveShadow = true
        grp.add(m)
      })
    }

    zone(g, o, X, Z) {
      const cx = X(o.x + o.w / 2), cz = Z(o.y + o.h / 2)
      this.plane(g, o.w, o.h, cx, 0.052, cz, 0xffffff, { tex: 'gravel' }, [o.w / 2, o.h / 2])
      const hx = o.w / 2, hz = o.h / 2
      const side = (len, x, z, rot) => {
        const m = this.box(g, len, 0.42, 0.02, x, 0.27, z, 0xffffff, { tex: 'fence', transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }, [len / 0.3, 1.3])
        m.rotation.y = rot; m.castShadow = false
        this.box(g, len, 0.03, 0.03, x, 0.5, z, 0xff8a2a).rotation.y = rot
      }
      side(o.w, cx, cz - hz, 0); side(o.w, cx, cz + hz, 0)
      side(o.h, cx - hx, cz, Math.PI / 2); side(o.h, cx + hx, cz, Math.PI / 2)
      const post = (x, z) => this.cyl(g, 0.04, 0.04, 0.6, x, 0.32, z, 0x4a4f58, 6)
      for (let i = 0; i <= o.w; i++) { post(cx - hx + i, cz - hz); post(cx - hx + i, cz + hz) }
      for (let i = 1; i < o.h; i++) { post(cx - hx, cz - hz + i); post(cx + hx, cz - hz + i) }
      this.box(g, 0.5, 0.18, 0.3, cx - hx + 0.7, 0.15, cz + hz - 0.7, 0xff8a2a) // petit plot de chantier
    }

    // ---------- Toit en pente à deux pans ----------
    roofGable(g, cx, cz, wallTop, w, d, wallColor, ov = 0.3) {
      const alongX = w >= d
      const L = alongX ? w : d, S = alongX ? d : w
      const rise = Math.min((S / 2) * 0.52, 2.3)
      const tanA = rise / (S / 2), ang = Math.atan(tanA)
      const hs = S / 2 + ov
      const slopeLen = hs / Math.cos(ang)
      const ridgeY = wallTop + rise + 0.06
      const lenR = L + 2 * ov + 0.1
      const grp = new THREE.Group()
      grp.position.set(cx, ridgeY, cz)
      g.add(grp)
      for (const sg of [-1, 1]) {
        const pivot = new THREE.Group()
        grp.add(pivot)
        const geo = alongX ? new THREE.BoxGeometry(lenR, 0.1, slopeLen) : new THREE.BoxGeometry(slopeLen, 0.1, lenR)
        uvs(geo, lenR / 2.2, slopeLen / 2.2, !alongX)
        const m = new THREE.Mesh(geo, this.mat(0xffffff, { tex: 'roof' }))
        m.castShadow = true; m.receiveShadow = true
        if (alongX) { m.position.set(0, 0.05, (sg * slopeLen) / 2); pivot.rotation.x = sg * ang } else { m.position.set((sg * slopeLen) / 2, 0.05, 0); pivot.rotation.z = -sg * ang }
        pivot.add(m)
      }
      const cap = alongX ? this.box(grp, lenR, 0.12, 0.22, 0, 0.1, 0, 0x8d3a28) : this.box(grp, 0.22, 0.12, lenR, 0, 0.1, 0, 0x8d3a28)
      cap.receiveShadow = false
      // pignons
      const sh = new THREE.Shape()
      sh.moveTo(-S / 2 - 0.09, 0); sh.lineTo(S / 2 + 0.09, 0); sh.lineTo(0, rise + 0.06); sh.closePath()
      for (const sg of [-1, 1]) {
        const tri = new THREE.Mesh(new THREE.ShapeGeometry(sh), this.mat(wallColor, { side: THREE.DoubleSide }))
        tri.position.set(alongX ? cx + (sg * (L + 0.18)) / 2 : cx, wallTop - 0.02, alongX ? cz : cz + (sg * (L + 0.18)) / 2)
        tri.rotation.y = alongX ? Math.PI / 2 : 0
        tri.castShadow = true
        g.add(tri)
      }
    }

    // ---------- Meubles, escalier, jardin ----------
    buildItem(g, it, X, Z, baseY) {
      const d = A.ITEMS[it.t]
      const [w, h] = A.itemDims(it)
      const grp = new THREE.Group()
      grp.position.set(X(it.x + w / 2), baseY, Z(it.y + h / 2))
      g.add(grp)
      const long = w >= h
      const k = it.t
      const b = (bw, bh, bd, x, y, z, c, o, uv) => this.box(grp, bw, bh, bd, x, y, z, c, o, uv)
      if (k === 'lit1' || k === 'lit2') {
        b(w * 0.96, 0.32, h * 0.96, 0, 0.16, 0, 0xb68a5a)
        b(w * 0.88, 0.2, h * 0.88, 0, 0.42, 0, 0xf2eefc)
        const pw = long ? 0.35 : w * 0.7, pd = long ? h * 0.7 : 0.35
        b(pw, 0.14, pd, long ? -w / 2 + 0.38 : 0, 0.58, long ? 0 : -h / 2 + 0.38, 0xffffff)
        b(long ? w * 0.55 : w * 0.88, 0.12, long ? h * 0.88 : h * 0.55, long ? w * 0.14 : 0, 0.55, long ? 0 : h * 0.14, k === 'lit2' ? 0x8f7ad6 : 0x7aa6d6)
      } else if (k === 'armoire') {
        b(w * 0.96, 1.9, h * 0.96, 0, 0.95, 0, 0xa87b4a)
        b(long ? 0.03 : w * 0.9, 1.7, long ? h * 0.9 : 0.03, long ? 0 : 0, 0.95, 0, 0x7d5a33)
      } else if (k === 'canape') {
        b(w * 0.96, 0.45, h * 0.96, 0, 0.22, 0, 0xd96a6a)
        b(long ? w * 0.96 : 0.28, 0.9, long ? 0.28 : h * 0.96, long ? 0 : -w / 2 + 0.16, 0.6, long ? -h / 2 + 0.16 : 0, 0xc55555)
        b(long ? 0.25 : w * 0.96, 0.62, long ? h * 0.96 : 0.25, long ? -w / 2 + 0.14 : 0, 0.4, long ? 0 : -h / 2 + 0.14, 0xc55555)
        b(long ? 0.25 : w * 0.96, 0.62, long ? h * 0.96 : 0.25, long ? w / 2 - 0.14 : 0, 0.4, long ? 0 : h / 2 - 0.14, 0xc55555)
        b(long ? w * 0.28 : w * 0.5, 0.18, long ? h * 0.4 : h * 0.28, long ? -w * 0.25 : 0, 0.55, long ? 0 : -h * 0.25, 0xf2c14e)
      } else if (k === 'table') {
        b(w * 0.92, 0.08, h * 0.92, 0, 0.78, 0, 0xc79a62)
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(0.07, 0.75, 0.07, sx * (w * 0.46 - 0.1), 0.37, sz * (h * 0.46 - 0.1), 0x8a6a3e)
        this.cyl(grp, 0.12, 0.1, 0.16, 0, 0.9, 0, 0xf2f0e8) // vase
        this.sph(grp, 0.12, 0, 1.05, 0, 0xe05a7a)
      } else if (k === 'bureau_m') {
        b(w * 0.96, 0.07, h * 0.96, 0, 0.75, 0, 0x8e9bb0)
        for (const sx of [-1, 1]) b(0.07, 0.72, h * 0.9, sx * (w * 0.46 - 0.05), 0.36, 0, 0x6f7a8c)
        b(0.5, 0.35, 0.03, 0, 1.02, -h / 2 + 0.2, 0x2e3340)
        b(0.5, 0.02, 0.2, 0, 0.8, -h / 2 + 0.45, 0x444b58)
      } else if (k === 'evier') {
        b(w * 0.96, 0.9, h * 0.96, 0, 0.45, 0, 0xdfe4ea)
        b(w * 0.96, 0.05, h * 0.96, 0, 0.92, 0, 0x9fb4c6)
        b(long ? w * 0.34 : w * 0.55, 0.06, long ? h * 0.55 : h * 0.34, long ? -w * 0.2 : 0, 0.93, long ? 0 : -h * 0.2, 0x5f7488)
        b(long ? w * 0.34 : w * 0.55, 0.06, long ? h * 0.55 : h * 0.34, long ? w * 0.2 : 0, 0.93, long ? 0 : h * 0.2, 0x5f7488)
        this.cyl(grp, 0.03, 0.03, 0.3, 0, 1.1, long ? -h * 0.38 : -h * 0.38, 0xb8c2cc, 8)
      } else if (k === 'plaque') {
        b(w * 0.96, 0.9, h * 0.96, 0, 0.45, 0, 0xdfe4ea)
        b(w * 0.9, 0.05, h * 0.9, 0, 0.92, 0, 0x2e3340)
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.cyl(grp, 0.13, 0.13, 0.04, sx * 0.24, 0.96, sz * 0.24, 0xff8a3d)
      } else if (k === 'frigo') {
        b(w * 0.9, 1.85, h * 0.9, 0, 0.92, 0, 0xe9eef3)
        b(w * 0.88, 0.02, h * 0.02 + 0.02, 0, 1.28, h * 0.45, 0xb9c3cd)
        b(0.04, 0.5, 0.05, w * 0.3, 1.2, h * 0.46, 0x8794a3)
      } else if (k === 'baignoire') {
        b(w * 0.96, 0.6, h * 0.96, 0, 0.3, 0, 0xf4f7f9)
        b(w * 0.8, 0.1, h * 0.7, 0, 0.58, 0, 0x9fd8f2, { phong: true })
      } else if (k === 'lavabo') {
        this.cyl(grp, 0.1, 0.12, 0.7, 0, 0.35, 0, 0xe3eaee)
        b(0.7, 0.18, 0.5, 0, 0.8, 0, 0xf4f7f9)
        b(0.5, 0.05, 0.3, 0, 0.9, 0, 0x9fd8f2)
        b(0.7, 0.5, 0.03, 0, 1.4, -0.34, 0xcfe6f2, { phong: true }) // miroir
      } else if (k === 'wc') {
        b(0.42, 0.4, 0.55, 0, 0.2, 0.05, 0xf1f3f5)
        b(0.42, 0.55, 0.2, 0, 0.6, -0.3, 0xe6eaed)
      } else if (k === 'voiture') {
        b(w * 0.86, 0.55, h * 0.94, 0, 0.5, 0, 0xd4493e, { phong: true })
        b(long ? w * 0.4 : w * 0.7, 0.5, long ? h * 0.7 : h * 0.4, 0, 0.97, 0, 0xc23d33, { phong: true })
        b(long ? w * 0.34 : w * 0.62, 0.34, long ? h * 0.62 : h * 0.34, 0, 1.0, 0, 0xbfe0f2, { phong: true })
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const wh = this.cyl(grp, 0.28, 0.28, 0.2, long ? sx * w * 0.3 : sx * w * 0.44, 0.28, long ? sz * h * 0.44 : sz * h * 0.3, 0x2b2b31, 14)
          if (long) wh.rotation.x = Math.PI / 2
          else wh.rotation.z = Math.PI / 2
        }
      } else if (k === 'escalier') {
        const n = 10, along = w >= h ? 'x' : 'z'
        const len = along === 'x' ? w : h, wid = along === 'x' ? h : w
        for (let i = 0; i < n; i++) {
          const hh2 = ((i + 1) * FLOOR_H) / n
          const off = -len / 2 + (len / n) * (i + 0.5)
          b(along === 'x' ? len / n : wid * 0.94, hh2, along === 'x' ? wid * 0.94 : len / n, along === 'x' ? off : 0, hh2 / 2, along === 'x' ? 0 : off, i % 2 ? 0xd8c3a0 : 0xe0cdac)
        }
      } else if (k === 'escalier_col') {
        // Marches en éventail autour d'un poteau central : chaque marche monte d'un cran en tournant
        const n = 14, R = Math.min(w, h) / 2 * 0.94
        this.cyl(grp, 0.09, 0.09, FLOOR_H, 0, FLOOR_H / 2, 0, 0xb59a6b, 12)
        for (let i = 0; i < n; i++) {
          const hh2 = ((i + 1) * FLOOR_H) / n
          const ang = (i / n) * Math.PI * 2 * 0.95
          const step = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.06, 4, 1, false, 0, (Math.PI * 2) / n * 1.04), this.mat(i % 2 ? 0xd8c3a0 : 0xe0cdac))
          step.position.set(0, hh2 - 0.03, 0)
          step.rotation.y = -ang
          step.castShadow = true; step.receiveShadow = true
          grp.add(step)
        }
      } else if (k === 'rampe') {
        const L = Math.max(w, h), Wd = Math.min(w, h), rise = 0.4
        const ramp = new THREE.Group()
        grp.add(ramp)
        ramp.rotation.y = long ? 0 : -Math.PI / 2
        const shp = new THREE.Shape()
        shp.moveTo(-L / 2, 0); shp.lineTo(L / 2, 0); shp.lineTo(L / 2, rise); shp.closePath()
        const eg = new THREE.ExtrudeGeometry(shp, { depth: Wd * 0.94, bevelEnabled: false })
        eg.translate(0, 0, -Wd * 0.47)
        const wedge = new THREE.Mesh(eg, this.mat(0xe3d3b0))
        wedge.castShadow = true; wedge.receiveShadow = true
        ramp.add(wedge)
        const ang = Math.atan2(rise, L)
        const tilt = new THREE.Group()
        tilt.position.set(0, rise / 2, 0); tilt.rotation.z = ang
        ramp.add(tilt)
        const sl = Math.hypot(L, rise)
        this.box(tilt, sl, 0.04, Wd * 0.94, 0, 0.01, 0, 0xcdb88e)
        for (const sz of [-1, 1]) {
          this.box(tilt, sl, 0.04, 0.05, 0, 0.9, sz * Wd * 0.45, 0xf2f0ea)
          this.box(tilt, sl, 0.03, 0.04, 0, 0.5, sz * Wd * 0.45, 0xf2f0ea)
          for (let i = 0; i <= 3; i++) this.box(tilt, 0.05, 0.9, 0.05, -sl / 2 + 0.1 + (i * (sl - 0.2)) / 3, 0.45, sz * Wd * 0.45, 0xdfdcd2)
        }
      } else if (k === 'terrasse') {
        b(w, 0.12, h, 0, 0.06, 0, 0xffffff, { tex: 'deck' }, [w / 2, h / 2])
        this.cyl(grp, 0.5, 0.5, 0.05, 0, 0.78, 0, 0xf2e6d4, 18)
        this.cyl(grp, 0.05, 0.05, 0.7, 0, 0.42, 0, 0x8a6a3e, 8)
        for (const sg of [-1, 1]) { b(0.4, 0.06, 0.4, sg * 0.85, 0.5, 0, 0xe8dcc6); b(0.06, 0.45, 0.4, sg * 1.02, 0.75, 0, 0xe8dcc6) }
        const par = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.35, 16), this.mat(0xff8a3d, { side: THREE.DoubleSide }))
        par.position.set(w * 0.3, 2.2, -h * 0.25); par.castShadow = true; grp.add(par)
        this.cyl(grp, 0.03, 0.03, 2.1, w * 0.3, 1.1, -h * 0.25, 0xcfcfcf, 6)
      } else if (k === 'piscine') {
        const tw = 0.3
        b(w, 0.1, h, 0, 0.05, 0, 0xa6dcf2)
        const mg = (bw, bd, x, z) => b(bw, 0.18, bd, x, 0.09, z, 0xf4f1ea, null, [bw / 1.5, bd / 1.5])
        mg(w, tw, 0, -h / 2 + tw / 2); mg(w, tw, 0, h / 2 - tw / 2)
        mg(tw, h - 2 * tw, -w / 2 + tw / 2, 0); mg(tw, h - 2 * tw, w / 2 - tw / 2, 0)
        const wat = b(w - 2 * tw, 0.06, h - 2 * tw, 0, 0.13, 0, 0xcfeaff, { tex: 'water', phong: true, shininess: 110, specular: 0xffffff, transparent: true, opacity: 0.92 }, [(w - 2 * tw) / 2, (h - 2 * tw) / 2])
        wat.castShadow = false
        // échelle
        for (const sx of [-1, 1]) this.cyl(grp, 0.02, 0.02, 0.6, sx * 0.18, 0.4, -h / 2 + 0.06, 0xd7dde2, 6)
      } else if (k === 'arbre') {
        this.tree(grp, 0, 0, Math.min(w, h) * 0.5, Math.floor(hh(it.x + 1, it.y + 3) * 3), Math.floor(hh(it.y, it.x) * 4))
      } else if (k === 'potager') {
        b(w * 0.96, 0.14, h * 0.96, 0, 0.07, 0, 0x8a5f3a)
        b(w * 0.9, 0.06, h * 0.9, 0, 0.14, 0, 0x5b3d26)
        for (const sz of [-1, 1]) b(w * 0.96, 0.2, 0.05, 0, 0.1, sz * h * 0.48, 0xa5794d)
        const rows = 4
        for (let i = 0; i < rows; i++) {
          const z = -h * 0.34 + i * ((h * 0.68) / (rows - 1))
          b(w * 0.8, 0.07, 0.2, 0, 0.19, z, 0x6e4a2e)
          const n = Math.max(3, Math.round(w * 1.6))
          for (let j = 0; j < n; j++) this.sph(grp, 0.1, -w * 0.36 + (j * w * 0.72) / (n - 1), 0.32, z, i === 1 && j % 2 ? 0xe0503a : [0x6dae4f, 0x8bc34a, 0x4f9f4a, 0x9acd4a][i], 1, 0.8, 1, 7)
        }
      } else b(w * 0.96, 0.6, h * 0.96, 0, 0.3, 0, parseInt(d.color.slice(1), 16))
    }

    // ---------- Maison voisine mitoyenne ----------
    neighbor(g, side, W, H) {
      const [ox, oz] = OUT[side]
      const horiz = side === 'N' || side === 'S'
      const edge = (horiz ? H : W) / 2 + 0.25
      const len = horiz ? W : H
      const dep = 6, Lh = Math.min(len * 0.85, 11), hgt = 5
      const c = edge + 0.7 + dep / 2
      const px = ox * c, pz = oz * c
      // clôture / mur de séparation
      const wl = len + 0.5
      const wx = ox * (edge + 0.1), wz = oz * (edge + 0.1)
      this.box(g, horiz ? wl : 0.22, 1.5, horiz ? 0.22 : wl, wx, 0.7, wz, 0xf1ece0, { tex: 'plaster' }, [wl / 2, 0.8])
      this.box(g, horiz ? wl + 0.1 : 0.34, 0.1, horiz ? 0.34 : wl + 0.1, wx, 1.5, wz, 0xcfc8b8)
      for (let i = 0; i <= Math.floor(wl / 2.5); i++) { const t = -wl / 2 + i * 2.5; this.box(g, horiz ? 0.3 : 0.3, 1.6, horiz ? 0.3 : 0.3, horiz ? t : wx, 0.75, horiz ? wz : t, 0xe4ddcc) }
      // volume
      const bw = horiz ? Lh : dep, bd = horiz ? dep : Lh
      const wallCol = 0xeed9b6
      this.box(g, bw, hgt, bd, px, hgt / 2 - 0.05, pz, wallCol, { tex: 'plaster' }, [Lh / 2, hgt / 2])
      this.box(g, bw + 0.04, 0.5, bd + 0.04, px, 0.2, pz, 0xcbbfa5)
      this.roofGable(g, px, pz, hgt - 0.05, bw, bd, wallCol, 0.4)
      // fenêtres sur la façade tournée vers le terrain
      const fx = px - ox * (dep / 2), fz = pz - oz * (dep / 2)
      const lit = this.time === 'evening'
      const glass = lit ? this.mat(0xffd98a, { phong: true, emissive: 0xffc45a, emissiveIntensity: 0.9 }) : this.mat(0x7fa8c8, { phong: true, transparent: true, opacity: 0.75 })
      const win = (t, y) => {
        const x = horiz ? px + t : fx, z = horiz ? fz : pz + t
        const f = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 1.1 : 0.12, 1.3, horiz ? 0.12 : 1.1), this.mat(0xffffff)); f.position.set(x, y, z); g.add(f)
        const gl = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 0.9 : 0.16, 1.1, horiz ? 0.16 : 0.9), glass); gl.position.set(x, y, z); g.add(gl)
        const cr = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 0.05 : 0.18, 1.1, horiz ? 0.18 : 0.05), this.mat(0xffffff)); cr.position.set(x, y, z); g.add(cr)
      }
      const nWin = Math.max(2, Math.floor(Lh / 3))
      for (let i = 0; i < nWin; i++) { const t = -Lh / 2 + (Lh * (i + 0.5)) / nWin; win(t, 3.4); if (i !== Math.floor(nWin / 2)) win(t, 1.3) }
      const dx = horiz ? px + (-Lh / 2 + (Lh * (Math.floor(nWin / 2) + 0.5)) / nWin) : fx, dz = horiz ? fz : pz + (-Lh / 2 + (Lh * (Math.floor(nWin / 2) + 0.5)) / nWin)
      const door = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 1 : 0.14, 2.1, horiz ? 0.14 : 1), this.mat(0x4a6fa5)); door.position.set(dx, 1.05, dz); g.add(door)
    }

    update(level, planIn, hot) {
      const plan = A.toPlan(planIn)
      const rooms = plan.rooms
      this.last = [level, planIn, hot]
      if (this.levelId !== level.id) { this.levelId = level.id; this.resetView(level) }
      this.clear()
      const g = this.group
      const W = level.w, H = level.h
      const X = (cx) => cx - W / 2, Z = (cy) => cy - H / 2
      const baseOf = (f) => (f || 0) * FLOOR_H
      const visible = (f) => !(this.hideUpper && (f || 0) === 1)
      const FLOOR_TOP = 0.09
      const evening = this.time === 'evening'

      // ombres : la zone couverte suit la taille du terrain
      const sc = Math.max(W, H) * 0.75 + 7
      Object.assign(this.sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 1, far: 90 })
      this.sun.shadow.camera.updateProjectionMatrix()

      // Sol, terrain en forme de dalle de maquette
      const ground = this.plane(g, 900, 900, 0, GROUND_Y, 0, 0xffffff, { tex: 'grass' }, [900 / 16, 900 / 16])
      ground.name = 'ground'
      this.plane(g, W + 9, H + 9, 0, GROUND_Y + 0.01, 0, 0xffffff, { tex: 'blob', transparent: true, depthWrite: false }).receiveShadow = false
      const slab = this.box(g, W + 0.5, 0.49, H + 0.5, 0, -0.205, 0, 0xffffff, { tex: 'side' })
      slab.castShadow = false
      this.plane(g, W + 0.5, H + 0.5, 0, 0.043, 0, 0xffffff, { tex: 'lawn' }, [(W + 0.5) / 7, (H + 0.5) / 7])

      // Route, trottoir
      const road = level.road
      let rx = 0, rz = 0
      const rw = 3.4
      if (road) {
        const horiz = road === 'N' || road === 'S'
        const [ox, oz] = OUT[road]
        const half = (horiz ? H : W) / 2
        const rc = half + 0.4 + rw / 2
        rx = ox * rc; rz = oz * rc
        const rm = this.box(g, 400, 0.48, rw, 0, -0.21, 0, 0xffffff, { tex: 'road' }, [400 / 5, 1])
        rm.position.set(horiz ? 0 : rx, -0.21, horiz ? rz : 0)
        if (!horiz) rm.rotation.y = Math.PI / 2
        rm.castShadow = false
        const sl = (horiz ? W : H) + 1.5
        const sw = 0.4 + 0.3
        const sx = ox * (half + 0.25 + sw / 2 - 0.15), sz = oz * (half + 0.25 + sw / 2 - 0.15)
        this.box(g, horiz ? sl : sw, 0.5, horiz ? sw : sl, sx, -0.2, sz, 0xd9d6cc, { tex: 'concrete' }, [sl / 3, 0.5])
        this.label(g, 'ROUTE', rx, 0.1, rz, 2.6)
      }
      this.label(g, 'NORD', 0, 0.1, -H / 2 - 1.4 - (road === 'N' ? rw + 0.6 : 0), 2.4)

      // Haies sur les côtés sans route ni voisin ; bordure de pierre côté route ; mur côté voisin
      const neigh = (level.neighbors || []).filter((s) => OUT[s] && s !== road)
      for (const s of ['N', 'S', 'W', 'E']) {
        const horiz = s === 'N' || s === 'S'
        const [ox, oz] = OUT[s]
        const len = (horiz ? W : H) + 0.5
        const ex = ox * (W / 2 + 0.11), ez = oz * (H / 2 + 0.11)
        const px = horiz ? 0 : ex, pz = horiz ? ez : 0
        if (neigh.includes(s)) continue
        if (s === road) { this.box(g, horiz ? len : 0.24, 0.1, horiz ? 0.24 : len, px, 0.09, pz, 0xcfcac0, { tex: 'concrete' }, [len / 2, 0.2]); continue }
        this.box(g, horiz ? len : 0.34, 0.5, horiz ? 0.34 : len, px, 0.28, pz, 0xffffff, { tex: 'leaf' }, [len / 0.9, 0.6])
        for (let i = 0; i * 0.75 < len; i++) {
          const t = -len / 2 + 0.2 + i * 0.75
          const jh = hh(i + 3, s.charCodeAt(0))
          this.sph(g, 0.27 + jh * 0.08, horiz ? t : px, 0.52, horiz ? pz : t, [0x3d8a3d, 0x4a9a45, 0x357a37][i % 3], 1, 0.75, 1, 8)
        }
      }
      for (const s of neigh) this.neighbor(g, s, W, H)

      // Obstacles
      for (const o of level.obstacles || []) {
        const cx = X(o.x + o.w / 2), cz = Z(o.y + o.h / 2)
        if (o.kind === 'tree') {
          const r = Math.max(o.w, o.h) * 0.55 + 0.35
          this.tree(g, cx, cz, r, Math.floor(hh(o.x + 7, o.y + 2) * 3), Math.floor(hh(o.y, o.x + 5) * 4))
        } else if (o.kind === 'rock') this.rock(g, o, X, Z)
        else if (o.kind === 'zone') this.zone(g, o, X, Z)
        else if (o.kind === 'pond') {
          const mn = Math.min(o.w, o.h)
          const rad = mn / 2 + 0.25
          const sx = o.w / mn, sz = o.h / mn
          const rim = this.cyl(g, rad + 0.2, rad + 0.2, 0.1, cx, 0.07, cz, 0x9b9a95, 28, { tex: 'concrete' })
          rim.scale.set(sx, 1, sz)
          const geo = new THREE.CylinderGeometry(rad, rad, 0.1, 28)
          const pond = new THREE.Mesh(geo, this.mat(0xcfeaff, { tex: 'water', phong: true, shininess: 110, specular: 0xffffff }))
          pond.scale.set(sx, 1, sz); pond.position.set(cx, 0.075, cz); pond.receiveShadow = true; g.add(pond)
          for (let i = 0; i < 3; i++) { const lp = this.cyl(g, 0.22, 0.22, 0.02, cx + (i - 1) * rad * 0.5 * sx, 0.14, cz + ((i * 7) % 3 - 1) * rad * 0.4 * sz, 0x5faa4a, 10); lp.castShadow = false }
        }
      }

      const a = A.analyze(level, plan)

      // Pièces : sols (et dalle de l'étage), étiquettes
      const FLOORTEX = { salon: ['parquet', 2], chambre: ['parquet', 2], bureau: ['parquet', 2], cuisine: ['tiles', 2], sdb: ['tiles', 2], couloir: ['tiles', 2], garage: ['concrete', 4] }
      rooms.forEach((r) => {
        const f = r.f || 0
        if (!visible(f)) return
        const by = baseOf(f)
        if (f === 1) this.box(g, r.w, 0.2, r.h, X(r.x + r.w / 2), by - 0.1, Z(r.y + r.h / 2), 0xd9d2c4, { tex: 'concrete' }, [r.w / 4, r.h / 4])
        const col = new THREE.Color(A.TYPES[r.type].color).lerp(new THREE.Color(0xffffff), 0.3)
        const [tn, per] = FLOORTEX[r.type] || ['concrete', 4]
        const floor = this.box(g, r.w, 0.08, r.h, X(r.x + r.w / 2), by + 0.05, Z(r.y + r.h / 2), col.getHex(), { tex: tn }, [r.w / per, r.h / per])
        floor.castShadow = false
        if (hot === r.id) this.box(g, r.w + 0.12, 0.05, r.h + 0.12, X(r.x + r.w / 2), by + 0.02, Z(r.y + r.h / 2), 0xff8a3d)
        this.label(g, A.TYPES[r.type].label, X(r.x + r.w / 2), by + 0.11, Z(r.y + r.h / 2), Math.min(Math.max(r.w, 2) * 0.95, 4))
      })

      // Murs : une fois par bord et par étage
      const edges = new Map()
      rooms.forEach((r, i) => {
        const f = r.f || 0
        if (!visible(f)) return
        for (let y = r.y; y < r.y + r.h; y++)
          for (let x = r.x; x < r.x + r.w; x++) {
            const sides = [[`${f}|h:${x},${y}`, x, y - 1], [`${f}|h:${x},${y + 1}`, x, y + 1], [`${f}|v:${x},${y}`, x - 1, y], [`${f}|v:${x + 1},${y}`, x + 1, y]]
            for (const [key, nx, ny] of sides) {
              const n = a.owner.get(`${f}:${nx},${ny}`)
              if (n === i) continue
              if (n !== undefined && n < i) continue // déjà posé par l'autre pièce
              edges.set(key, { ext: n === undefined, f })
            }
          }
      })
      const opens = new Map()
      const entrances = new Map() // clé du bord -> côté de l'entrée
      rooms.forEach((r, i) => r.op.forEach((op) => {
        if (!A.opInRange(r, op) || !visible(r.f || 0)) return
        const key = A.edgeKey(r, op)
        const e = edges.get(key)
        if (!e) return
        if (op.k === 'w' && !e.ext) return
        if (op.k === 'd' && e.ext && (r.f || 0) === 1) return
        if (a.info[i].ext.includes(op)) entrances.set(key, op.s)
        const cur = opens.get(key)
        if (!cur || op.k === 'd') opens.set(key, op.k)
      }))
      const doorPos = []
      const glassMat = evening
        ? this.mat(0xffd98a, { phong: true, emissive: 0xffc45a, emissiveIntensity: 0.95, transparent: true, opacity: 0.96 })
        : this.mat(0x8ec9f0, { phong: true, transparent: true, opacity: 0.42 })
      for (const [key, e] of edges) {
        const [fl, rest] = key.split('|')
        const [kind, xy] = rest.split(':')
        const [ex, ey] = xy.split(',').map(Number)
        const along = kind === 'h' // le mur court le long de x
        const cx = X(along ? ex + 0.5 : ex), cz = Z(along ? ey : ey + 0.5)
        const by = baseOf(+fl)
        const th = e.ext ? 0.17 : 0.1
        const color = e.ext ? 0xf6efe0 : 0xeae5db
        const put = (len, hgt, y, c = color, extra) => this.box(g, along ? len : th, hgt, along ? th : len, cx, by + y, cz, c, extra || { tex: 'plaster' }, [len / 2, hgt / 2])
        const seg = (lenA, hgt, thk, offA, y, c, extra) => {
          const m = this.box(g, along ? lenA : thk, hgt, along ? thk : lenA, cx + (along ? offA : 0), by + y, cz + (along ? 0 : offA), c, extra)
          return m
        }
        const plinth = () => seg(1, 0.14, th + 0.04, 0, 0.07, e.ext ? 0xb9b0a0 : 0xd2cabb)
        const open = opens.get(key)
        if (open === 'w') {
          put(1, 0.9, 0.45); plinth()
          put(1, 0.5, WALL_H - 0.25)
          const ft = th + 0.05
          seg(1.02, 0.07, ft, 0, 0.93, 0xffffff); seg(1.02, 0.07, ft, 0, 2.07, 0xffffff)
          seg(0.07, 1.2, ft, -0.475, 1.5, 0xffffff); seg(0.07, 1.2, ft, 0.475, 1.5, 0xffffff)
          seg(0.04, 1.14, ft - 0.02, 0, 1.5, 0xffffff); seg(0.9, 0.04, ft - 0.02, 0, 1.5, 0xffffff)
          const pane = this.box(g, along ? 0.92 : 0.04, 1.16, along ? 0.04 : 0.92, cx, by + 1.5, cz, 0xffffff)
          pane.material = glassMat
          pane.castShadow = false
          if (e.ext) seg(1.14, 0.05, th + 0.14, 0, 0.88, 0xd9d4c8) // appui de fenêtre
        } else if (open === 'd') {
          put(1, 0.55, WALL_H - 0.275)
          const entrance = entrances.has(key)
          seg(0.08, 2.05, th + 0.04, -0.48, 1.025, 0xffffff); seg(0.08, 2.05, th + 0.04, 0.48, 1.025, 0xffffff)
          seg(1.04, 0.06, th + 0.04, 0, 2.07, 0xffffff)
          const pivot = new THREE.Group()
          pivot.position.set(along ? cx - 0.45 : cx, by, along ? cz : cz - 0.45)
          const panel = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.9 : 0.05, 2.0, along ? 0.05 : 0.9), this.mat(entrance ? 0xe0561a : 0x8a5a36))
          panel.position.set(along ? 0.45 : 0, 1.0, along ? 0 : 0.45)
          panel.castShadow = true
          pivot.add(panel)
          const inset = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.6 : 0.07, 0.7, along ? 0.07 : 0.6), this.mat(entrance ? 0xf06b2c : 0x9b6840))
          inset.position.set(along ? 0.45 : 0, 1.4, along ? 0 : 0.45); pivot.add(inset)
          const hm = this.mat(0xe8c04a, { phong: true })
          for (const sg of [-1, 1]) {
            const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), hm)
            hd.position.set(along ? 0.78 : sg * 0.06, 1.0, along ? sg * 0.06 : 0.78); pivot.add(hd)
          }
          pivot.rotation.y = along ? -1.15 : 1.15
          g.add(pivot)
          if (entrance) {
            const [ox, oz] = OUT[entrances.get(key)]
            doorPos.push({ x: cx, z: cz, s: entrances.get(key) })
            // paillasson orange devant l'entrée, côté extérieur
            this.box(g, along ? 1.1 : 0.9, 0.05, along ? 0.9 : 1.1, cx + ox * 0.65, 0.07, cz + oz * 0.65, 0xff9a4d)
            // lanterne à côté de la porte
            const lx = cx + (along ? 0.7 : 0) + ox * (th / 2 + 0.06), lz = cz + (along ? 0 : 0.7) + oz * (th / 2 + 0.06)
            const lan = this.mat(0xffe9a8, { emissive: 0xffd470, emissiveIntensity: evening ? 1 : 0.25 })
            const lm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), lan)
            lm.position.set(lx, by + 2.0, lz); g.add(lm)
          }
        } else { put(1, WALL_H, WALL_H / 2); plinth() }
      }

      // Chemin d'accès pavé : de l'entrée jusqu'à la route
      const PW = 1.3
      const path = (x0, z0, x1, z1) => {
        const lx = Math.abs(x1 - x0), lz = Math.abs(z1 - z0)
        if (lx < 0.01 && lz < 0.01) return
        const w2 = lx < 0.01 ? PW : lx + PW, d2 = lz < 0.01 ? PW : lz + PW
        const m = this.box(g, w2, 0.04, d2, (x0 + x1) / 2, 0.04, (z0 + z1) / 2, 0xffffff, { tex: 'pave' }, [w2 / 2, d2 / 2])
        m.castShadow = false
      }
      if (road) {
        for (const dp of doorPos) {
          const [ox, oz] = OUT[dp.s], [rxv, rzv] = OUT[road]
          const p0 = [dp.x + ox * 1.0, dp.z + oz * 1.0]
          const edgeD = Math.abs(ox) ? W / 2 : H / 2
          const dist = Math.max(0, Math.min(1.4, edgeD - (ox * p0[0] + oz * p0[1]) - 0.7))
          const roadEdge = rxv ? rxv * (W / 2 + 0.45) : rzv * (H / 2 + 0.45)
          const pts = [p0]
          if (dp.s === road) pts.push(rxv ? [roadEdge, p0[1]] : [p0[0], roadEdge])
          else {
            const c1 = [p0[0] + ox * dist, p0[1] + oz * dist]
            pts.push(c1)
            if (ox * rxv + oz * rzv === 0) pts.push(rxv ? [roadEdge, c1[1]] : [c1[0], roadEdge])
            else {
              const perpX = !Math.abs(ox), sgn = (perpX ? c1[0] : c1[1]) >= 0 ? 1 : -1
              const c2 = perpX ? [sgn * (W / 2 - 0.8), c1[1]] : [c1[0], sgn * (H / 2 - 0.8)]
              pts.push(c2)
              pts.push(rxv ? [roadEdge, c2[1]] : [c2[0], roadEdge])
            }
          }
          for (let i = 1; i < pts.length; i++) path(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
        }
      }

      // Meubles, escalier, jardin
      plan.items.forEach((it) => {
        const d = A.ITEMS[it.t]
        if (!d) return
        if (!d.garden && !d.stairs && !visible(it.f || 0)) return
        const by = d.garden || d.stairs ? FLOOR_TOP : baseOf(it.f || 0) + FLOOR_TOP
        this.buildItem(g, it, X, Z, by)
        if (hot !== undefined && hot !== null && hot === it.id) {
          const [w, h] = A.itemDims(it)
          const hl = this.box(g, w + 0.14, 0.03, h + 0.14, X(it.x + w / 2), by + 0.012, Z(it.y + h / 2), 0xff8a3d, { transparent: true, opacity: 0.7 })
          hl.castShadow = false
        }
      })

      // Toit (optionnel) : sur le dernier niveau de chaque emplacement
      if (this.roof) {
        rooms.forEach((r) => {
          const f = r.f || 0
          if (!visible(f)) return
          const cxr = X(r.x + r.w / 2), czr = Z(r.y + r.h / 2)
          const wallTop = baseOf(f) + WALL_H
          if (f === 0 && !this.hideUpper) {
            const up = (x, y) => rooms.some((q) => (q.f || 0) === 1 && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h)
            let n = 0
            for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (up(x, y)) n++
            if (n === r.w * r.h) return
            if (n > 0) { // couverture partielle : toit plat sur les cases libres
              for (let y = r.y; y < r.y + r.h; y++) {
                let x = r.x
                while (x < r.x + r.w) {
                  if (up(x, y)) { x++; continue }
                  let x2 = x
                  while (x2 < r.x + r.w && !up(x2, y)) x2++
                  const m = this.box(g, x2 - x + 0.1, 0.14, 1.1, X((x + x2) / 2), wallTop + 0.07, Z(y + 0.5), 0xffffff, { tex: 'roof' }, [(x2 - x) / 2.2, 0.5])
                  m.castShadow = true
                  x = x2
                }
              }
              return
            }
          }
          this.roofGable(g, cxr, czr, wallTop, r.w, r.h, 0xf6efe0)
        })
      }
      this.dirty = true
    }
  }

  root.View3D = View3D
})(typeof self !== 'undefined' ? self : this)

