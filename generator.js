// Générateur de niveaux aléatoires (mais toujours résolubles) pour « L'Architecte ».
// Le même seed donne exactement le même niveau (PRNG mulberry32, aucun Math.random, aucune date).
//   ArchiGen.generate(seed, difficulty)  -> niveau complet (même format que levels.js)
//   ArchiGen.daily('2026-10-13')         -> niveau du jour (difficulté selon le jour de la semaine)
//   ArchiGen.startPlan(niveau)           -> plan de départ défectueux (mutations + relocate)
// Méthode : on construit une solution valide, on DÉRIVE les critères des vrais faits de cette solution
// (via engine.analyze/evaluate), puis on fabrique des mutations qui cassent ≥ 3 critères.
// Utilisable dans le navigateur (window.ArchiGen, après engine.js) et dans Node.
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'))
  else root.ArchiGen = factory(root.Archi)
})(typeof self !== 'undefined' ? self : this, function (A) {
  const ITEMS = A.ITEMS

  // ---------------------------------------------------------------- PRNG
  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function hashStr(s) {
    let h = 2166136261
    s = String(s)
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13
    return h >>> 0
  }
  function mix() {
    let h = 0x9e3779b9
    for (let i = 0; i < arguments.length; i++) {
      h = Math.imul(h ^ (arguments[i] | 0), 0x85ebca6b)
      h ^= h >>> 13
      h = Math.imul(h, 0xc2b2ae35)
      h ^= h >>> 16
    }
    return h >>> 0
  }
  function makeRng(seed) {
    const f = mulberry32(seed)
    return {
      f,
      int: (a, b) => a + Math.floor(f() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(f() * arr.length)],
      chance: (p) => f() < p,
      shuffle(arr) {
        const a = arr.slice()
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t }
        return a
      },
    }
  }
  const sum = (a) => a.reduce((s, x) => s + x, 0)

  // ---------------------------------------------------------------- textes français
  const T = {
    salon: { s: 'salon', p: 'salons', fem: false },
    cuisine: { s: 'cuisine', p: 'cuisines', fem: true },
    chambre: { s: 'chambre', p: 'chambres', fem: true },
    sdb: { s: 'salle de bain', p: 'salles de bain', fem: true },
    bureau: { s: 'bureau', p: 'bureaux', fem: false },
    couloir: { s: 'couloir', p: 'couloirs', fem: false },
    garage: { s: 'garage', p: 'garages', fem: false },
  }
  const ind = (t) => (T[t].fem ? 'une ' : 'un ') + T[t].s
  const def = (t) => (T[t].fem ? 'la ' : 'le ') + T[t].s
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const low = (s) => s.charAt(0).toLowerCase() + s.slice(1)
  const NUM = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix']
  const nOf = (t, n) => (n === 1 ? ind(t) : NUM[n] + ' ' + T[t].p)
  const SIDE_FR = { N: 'nord', S: 'sud', E: 'est', W: 'ouest' }
  const SIDE_AT = { N: 'au nord', S: 'au sud', E: 'à l’est', W: 'à l’ouest' }
  const IT = {
    lit1: ['un lit simple', 'lits simples'], lit2: ['un lit double', 'lits doubles'], armoire: ['une armoire', 'armoires'],
    canape: ['un canapé', 'canapés'], table: ['une table à manger', 'tables à manger'], bureau_m: ['un poste de travail', 'postes de travail'],
    evier: ['un évier', 'éviers'], plaque: ['des plaques de cuisson', 'plaques de cuisson'], frigo: ['un frigo', 'frigos'],
    baignoire: ['une baignoire', 'baignoires'], lavabo: ['un lavabo', 'lavabos'], wc: ['des WC', 'WC'], voiture: ['la voiture', 'voitures'],
    escalier: ['un escalier', 'escaliers'], terrasse: ['une terrasse', 'terrasses'], piscine: ['une piscine', 'piscines'],
    arbre: ['un arbre', 'arbres'], potager: ['un potager', 'potagers'], rampe: ['une rampe', 'rampes'],
  }
  const roomIn = (t, many) => 'dans ' + (many ? ind(t) : def(t))
  const ORIENT = 'Le nord est en haut du plan, le sud en bas, l’est à droite.'

  // ---------------------------------------------------------------- géométrie utilitaire
  const ck = (f, x, y) => `${f}:${x},${y}`
  const ownerMap = (rooms) => {
    const m = new Map()
    rooms.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) m.set(ck(r.f, x, y), i) })
    return m
  }
  function shared(a, b) {
    if (a.f !== b.f) return null
    if (a.x + a.w === b.x) { const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h); if (y1 > y0) return { aS: 'E', bS: 'W', n: y1 - y0, aO: y0 - a.y, bO: y0 - b.y } }
    if (b.x + b.w === a.x) { const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h); if (y1 > y0) return { aS: 'W', bS: 'E', n: y1 - y0, aO: y0 - a.y, bO: y0 - b.y } }
    if (a.y + a.h === b.y) { const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w); if (x1 > x0) return { aS: 'S', bS: 'N', n: x1 - x0, aO: x0 - a.x, bO: x0 - b.x } }
    if (b.y + b.h === a.y) { const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w); if (x1 > x0) return { aS: 'N', bS: 'S', n: x1 - x0, aO: x0 - a.x, bO: x0 - b.x } }
    return null
  }
  const overlapRect = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  function extSlots(room, own, usedEdges) {
    const out = []
    for (const s of ['N', 'S', 'W', 'E'])
      for (let o = 0; o < A.sideLength(room, s); o++) {
        const op = { s, o, k: 'w' }
        const [nx, ny] = A.opCells(room, op).outside
        if (own.has(ck(room.f, nx, ny))) continue
        if (usedEdges && usedEdges.has(A.edgeKey(room, op))) continue
        out.push({ s, o })
      }
    return out
  }
  const zoneOf = (level, it) => {
    const [w, h] = A.itemDims(it)
    const cx = it.x + w / 2, cy = it.y + h / 2
    const d = { N: cy, S: level.h - cy, W: cx, E: level.w - cx }
    return Object.keys(d).sort((p, q) => d[p] - d[q])[0]
  }
  const distTo = (L, r, side) => ({ N: r.y, S: L.h - (r.y + r.h), W: r.x, E: L.w - (r.x + r.w) }[side])

  // ---------------------------------------------------------------- réglages par difficulté
  function profile(d, rng) {
    const p = { d }
    p.floors = d >= 5 ? 2 : d === 4 ? (rng.chance(0.55) ? 2 : 1) : d === 3 ? (rng.chance(0.25) ? 2 : 1) : 1
    p.nCh = d === 1 ? rng.pick([1, 1, 1, 2]) : d === 2 ? rng.pick([2, 2, 3]) : rng.pick([2, 3, 3])
    if (p.floors === 2) p.nCh = d >= 5 ? rng.pick([3, 3, 2]) : rng.pick([2, 3])
    p.garage = d >= 2 && rng.chance([0, 0, 0.3, 0.5, 0.6, 0.7][d])
    p.bureau = d >= 2 && rng.chance([0, 0, 0.4, 0.6, 0.7, 0.8][d])
    p.sdb2 = d >= 4 && rng.chance(0.5)
    p.furniture = d >= 5 ? true : d === 4 ? rng.chance(0.75) : d === 3 ? rng.chance(0.5) : d === 2 ? rng.chance(0.15) : false
    p.garden = d >= 5 ? true : d === 4 ? rng.chance(0.85) : d === 3 ? rng.chance(0.6) : d === 2 ? rng.chance(0.25) : false
    p.nObst = [0, 0, rng.chance(0.4) ? 1 : 0, rng.chance(0.8) ? 1 : 0, rng.int(1, 2), 2][d]
    p.neighbor = d >= 5 ? true : d === 4 ? rng.chance(0.6) : d === 3 ? rng.chance(0.3) : false
    p.twist = d >= 5 ? true : d === 4 ? rng.chance(0.55) : d === 3 ? rng.chance(0.2) : false
    p.exits = d >= 4 && rng.chance(0.35)
    p.ramp = d >= 2 && !p.exits && rng.chance(d === 3 ? 0.25 : 0.15)
    p.req = [0, rng.int(9, 10), rng.int(11, 13), rng.int(14, 16), rng.int(17, 19), rng.int(19, 22)][d]
    p.nMut = [0, rng.int(3, 4), rng.int(4, 5), rng.int(5, 6), rng.int(6, 7), rng.int(7, 9)][d]
    p.pct = [0, 0.09, 0.07, 0.06, 0.05, 0.04][d]
    return p
  }

  // ---------------------------------------------------------------- construction de la maison
  const MINW = { salon: 4, cuisine: 3, garage: 3, chambre: 3, sdb: 2, bureau: 3 }
  const MAXW = { salon: 7, cuisine: 5, garage: 5, chambre: 5, sdb: 3, bureau: 5 }
  const WGT = { salon: 3, cuisine: 2, garage: 2, chambre: 2.2, sdb: 1, bureau: 1.6 }
  const minSum = (types) => sum(types.map((t) => MINW[t]))
  const capSum = (types) => sum(types.map((t) => MAXW[t]))
  const BASE = { salon: 'salon', cuisine: 'cuis', garage: 'gar', chambre: 'ch', sdb: 'sdb', bureau: 'bur', couloir: 'cou' }

  function splitWidths(rng, types, W) {
    const w = types.map((t) => MINW[t])
    let rest = W - sum(w)
    if (rest < 0) return null
    while (rest > 0) {
      let idx = types.map((t, i) => i).filter((i) => w[i] < MAXW[types[i]])
      if (!idx.length) idx = types.map((t, i) => i)
      const tot = sum(idx.map((i) => WGT[types[i]]))
      let x = rng.f() * tot, ch = idx[idx.length - 1]
      for (const i of idx) { x -= WGT[types[i]]; if (x <= 0) { ch = i; break } }
      w[ch]++; rest--
    }
    return w
  }
  const NOISE = { chambre: 0, bureau: 1, salon: 1, sdb: 2, cuisine: 2, garage: 3, couloir: 3 }
  function orderTypes(rng, types, nb, isFront) {
    let arr = rng.shuffle(types)
    if (nb) {
      arr = arr.map((t) => ({ t, k: NOISE[t] + rng.f() * 0.8 })).sort((a, b) => a.k - b.k).map((o) => o.t)
      if (nb === 'W') arr.reverse()
    } else if (isFront && types.length === 3 && ['salon', 'cuisine', 'garage'].every((t) => types.includes(t)) && rng.chance(0.7)) {
      arr = rng.chance(0.5) ? ['salon', 'cuisine', 'garage'] : ['garage', 'cuisine', 'salon']
    }
    return arr
  }
  function fillBand(rng, types, W, fillers) {
    types = types.slice()
    let guard = 0
    while (capSum(types) < W && guard++ < 3) types.push(rng.pick(fillers))
    return types
  }

  // pondération des portes : plus petit = plus naturel ; Infinity = jamais dans l'arbre
  const PAIRW = {
    'cuisine+salon': 1, 'couloir+salon': 1, 'couloir+cuisine': 2, 'cuisine+garage': 1, 'garage+salon': 3, 'bureau+salon': 2, 'salon+sdb': 3,
    'chambre+salon': 2, 'chambre+couloir': 1, 'couloir+sdb': 1, 'bureau+couloir': 1, 'couloir+garage': 3, 'bureau+cuisine': 3, 'bureau+sdb': 4, 'bureau+garage': 4,
  }
  const pairW = (a, b) => { const w = PAIRW[[a, b].sort().join('+')]; return w === undefined ? Infinity : w }
  const EXTRA = [['salon', 'cuisine', 0.9], ['cuisine', 'garage', 0.9], ['chambre', 'sdb', 0.45], ['bureau', 'salon', 0.4], ['couloir', 'cuisine', 0.3], ['couloir', 'salon', 0.5], ['garage', 'salon', 0.2]]

  function placeDoor(rng, rooms, sg, edges) {
    const n = sg.s.n
    const ks = rng.shuffle([...Array(n).keys()])
    if (n >= 3) ks.sort((a, b) => (a === 0 || a === n - 1 ? 1 : 0) - (b === 0 || b === n - 1 ? 1 : 0))
    for (const k of ks)
      for (const host of rng.chance(0.5) ? ['a', 'b'] : ['b', 'a']) {
        const room = rooms[host === 'a' ? sg.a : sg.b]
        const op = host === 'a' ? { s: sg.s.aS, o: sg.s.aO + k, k: 'd' } : { s: sg.s.bS, o: sg.s.bO + k, k: 'd' }
        const ek = A.edgeKey(room, op)
        if (edges.has(ek)) continue
        edges.add(ek); room.op.push(op)
        return true
      }
    return false
  }
  function connectFloor(rng, rooms, idxs, root, edges) {
    const segs = []
    for (let x = 0; x < idxs.length; x++)
      for (let y = x + 1; y < idxs.length; y++) {
        const a = idxs[x], b = idxs[y]
        const s = shared(rooms[a], rooms[b])
        if (s) segs.push({ a, b, s, w: pairW(rooms[a].type, rooms[b].type) })
      }
    const inS = new Set([root]), tree = []
    while (inS.size < idxs.length) {
      let best = null, bk = 1e9
      for (const sg of segs) {
        if (inS.has(sg.a) === inS.has(sg.b) || !isFinite(sg.w)) continue
        const k = sg.w + rng.f() * 1.3
        if (k < bk) { bk = k; best = sg }
      }
      if (!best) return false
      tree.push(best); inS.add(inS.has(best.a) ? best.b : best.a)
    }
    for (const sg of tree) if (!placeDoor(rng, rooms, sg, edges)) return false
    // portes supplémentaires (boucles, suite parentale...)
    const done = new Set(tree)
    for (const sg of segs) {
      if (done.has(sg)) continue
      const ta = rooms[sg.a].type, tb = rooms[sg.b].type
      for (const [x, y, p] of EXTRA) if (((ta === x && tb === y) || (ta === y && tb === x)) && rng.chance(p)) { placeDoor(rng, rooms, sg, edges); break }
    }
    return true
  }

  function buildBand(rng, ids, types, x0, y0, W, depth, f) {
    const widths = splitWidths(rng, types, W)
    if (!widths) return null
    let x = x0
    return types.map((t, i) => {
      const n = (ids[t] = (ids[t] || 0) + 1)
      const r = { id: BASE[t] + n, type: t, x, y: y0, w: widths[i], h: depth, f, op: [] }
      x += widths[i]
      return r
    })
  }

  // Place un meuble dans une pièce : au contact des murs, hors des cases de portes si possible
  function fitItem(rng, room, t, occ, keep) {
    const best = []
    for (const r of [0, 1]) {
      if (r === 1 && ITEMS[t].w === ITEMS[t].h) continue
      const [iw, ih] = A.itemDims({ t, r })
      for (let y = room.y; y + ih <= room.y + room.h; y++)
        for (let x = room.x; x + iw <= room.x + room.w; x++) {
          let ok = true, kc = 0, ws = 0
          for (let cy = y; cy < y + ih && ok; cy++)
            for (let cx = x; cx < x + iw; cx++) {
              const k = ck(room.f, cx, cy)
              if (occ.has(k)) { ok = false; break }
              if (keep.has(k)) kc++
              if (cx === room.x || cx === room.x + room.w - 1 || cy === room.y || cy === room.y + room.h - 1) ws++
            }
          if (ok) best.push({ x, y, r, s: kc * 6 - ws + rng.f() * 1.5 })
        }
    }
    if (!best.length) return null
    best.sort((a, b) => a.s - b.s)
    return best[0]
  }
  const markOcc = (occ, room, t, p) => { for (const [x, y] of A.itemCells({ t, x: p.x, y: p.y, r: p.r })) occ.add(ck(room.f, x, y)) }

  // ---------------------------------------------------------------- la maison + terrain + jardin
  function buildModel(rng, p) {
    const nb = p.neighbor ? rng.pick(['E', 'W']) : null
    // composition des pièces
    let front = ['salon', 'cuisine'], back = [], upBack = [], upFront = []
    if (p.garage) front.push('garage')
    if (p.floors === 1) {
      for (let i = 0; i < p.nCh; i++) back.push('chambre')
      back.push('sdb')
      if (p.bureau) back.push('bureau')
      if (p.sdb2 && p.nCh >= 3) back.push('sdb')
    } else {
      back.push('sdb')
      if (p.bureau) back.push('bureau')
      const ups = ['sdb']
      for (let i = 0; i < p.nCh; i++) ups.push('chambre')
      if (p.nCh === 2) ups.push('bureau')
      if (p.sdb2) ups.push('sdb')
      const nbk = Math.ceil(ups.length / 2)
      upBack = ups.slice(0, nbk); upFront = ups.slice(nbk)
    }
    const Wmax = p.d >= 5 ? 15 : 14
    // ajuste pour tenir dans la largeur maximale
    for (let g = 0; g < 8 && minSum(back) > Wmax; g++) {
      const i2 = back.lastIndexOf('sdb')
      if (back.filter((t) => t === 'sdb').length > 1 && i2 >= 0) back.splice(i2, 1)
      else if (back.includes('bureau') && front.length < 3) { back.splice(back.indexOf('bureau'), 1); front.push('bureau') }
      else if (back.filter((t) => t === 'chambre').length > 1) back.splice(back.lastIndexOf('chambre'), 1)
      else break
    }
    if (minSum(front) > Wmax) front = front.filter((t) => t !== 'garage')
    let Wh = Math.max(minSum(front), minSum(back), p.floors === 2 ? Math.max(minSum(upBack), upFront.length ? minSum(upFront) : 0) : 0) + rng.int(0, p.d <= 2 ? 1 : 3)
    Wh = Math.min(Wh, Wmax)
    let shrink = 0
    if (p.floors === 2 && rng.chance(0.4)) {
      const needU = Math.max(minSum(upBack), upFront.length ? minSum(upFront) : 0)
      const s = rng.int(2, 3)
      if (Wh - s >= needU) shrink = s
    }
    const Wu = Wh - shrink
    front = fillBand(rng, front, Wh, ['garage', 'bureau'])
    back = fillBand(rng, back, Wh, p.floors === 2 ? ['bureau', 'chambre'] : ['bureau', 'chambre', 'sdb'])
    if (p.floors === 2) {
      upBack = fillBand(rng, upBack, Wu, ['chambre', 'bureau'])
      if (upFront.length) upFront = fillBand(rng, upFront, Wu, ['chambre', 'bureau'])
    }
    // gabarit : rangée arrière, couloir optionnel, rangée avant
    const db = rng.int(3, 4), df = rng.chance(0.7) ? 4 : 5
    const hasCorr = p.floors === 2 ? rng.chance(0.5) : back.length >= 3 || rng.chance(p.d <= 2 ? 0.2 : 0.5)
    const cd = hasCorr && p.floors === 1 && rng.chance(0.15) ? 2 : 1
    const Hh = db + (hasCorr ? cd : 0) + df

    // marges et terrain
    let ml = rng.int(1, 2), mr = rng.int(1, 2)
    if (p.garden || p.nObst) { if (rng.chance(0.5)) ml = rng.int(3, 4); else mr = rng.int(3, 4) }
    const mt = rng.int(1, 3), mb = p.garden || p.ramp ? rng.int(2, 3) : rng.int(1, 2)
    while (Wh + ml + mr > 20) { if (ml > 1 && ml >= mr) ml--; else if (mr > 1) mr--; else break }
    const Wt = Wh + ml + mr, Ht = Hh + mt + mb
    const ox = ml, oy = mt

    for (let attempt = 0; attempt < 40; attempt++) {
      const ids = {}
      const rooms = []
      // rez-de-chaussée
      const fo = orderTypes(rng, front, nb, true), bo = orderTypes(rng, back, nb, false)
      const bR = buildBand(rng, ids, bo, 0, 0, Wh, db, 0)
      let cR = null
      if (hasCorr) { ids.couloir = 1; cR = [{ id: 'cou1', type: 'couloir', x: 0, y: db, w: Wh, h: cd, f: 0, op: [] }] }
      const fR = buildBand(rng, ids, fo, 0, db + (hasCorr ? cd : 0), Wh, df, 0)
      if (!bR || !fR) return null
      rooms.push(...bR, ...(cR || []), ...fR)
      let upIdx = []
      if (p.floors === 2) {
        const ux = rng.chance(0.5) ? 0 : shrink
        const ubO = orderTypes(rng, upBack, nb, false)
        const ubR = buildBand(rng, ids, ubO, ux, 0, Wu, db, 1)
        ids.couloir = (ids.couloir || 0) + 1
        const corr = { id: 'cou' + ids.couloir, type: 'couloir', x: ux, y: db, w: Wu, h: 1, f: 1, op: [] }
        const dfu = Hh - db - 1
        const ufR = upFront.length ? buildBand(rng, ids, orderTypes(rng, upFront, nb, false), ux, db + 1, Wu, dfu, 1) : []
        if (!ubR || !ufR) return null
        const base = rooms.length
        rooms.push(...ubR, corr, ...ufR)
        upIdx = rooms.map((r, i) => i).filter((i) => i >= base)
      }
      // portes
      const edges = new Set()
      const g0 = rooms.map((r, i) => i).filter((i) => rooms[i].f === 0)
      const salon = rooms.findIndex((r) => r.type === 'salon')
      if (!connectFloor(rng, rooms, g0, salon, edges)) { rooms.forEach((r) => (r.op = [])); continue }
      if (p.floors === 2) {
        const cor = upIdx.find((i) => rooms[i].type === 'couloir')
        if (!connectFloor(rng, rooms, upIdx, cor, edges)) { rooms.forEach((r) => (r.op = [])); continue }
      }
      // décalage dans le terrain
      rooms.forEach((r) => { r.x += ox; r.y += oy })
      // entrée sur le mur sud du salon
      const sr = rooms[salon]
      const own = ownerMap(rooms)
      const entr = []
      for (let o = 0; o < sr.w; o++) if (!edges.has(A.edgeKey(sr, { s: 'S', o, k: 'd' }))) entr.push(o)
      if (!entr.length) continue
      const eo = rng.pick(entr)
      const eop = { s: 'S', o: eo, k: 'd' }
      sr.op.push(eop); edges.add(A.edgeKey(sr, eop))
      const blocked = new Set()
      rooms.forEach((r) => { if (r.f === 0) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) blocked.add(`${x},${y}`) })
      const eout = A.opCells(sr, eop).outside
      blocked.add(`${eout[0]},${eout[1]}`)
      const model = { W: Wt, H: Ht, rooms, items: [], obstacles: [], nb, blocked, edges, entrance: { room: salon, op: eop, out: eout }, own, hasCorr, p }
      // seconde sortie (sécurité incendie)
      if (p.exits) {
        const cands = rng.shuffle(g0.filter((i) => ['cuisine', 'garage', 'bureau', 'couloir'].includes(rooms[i].type)))
        let done = false
        for (const i of cands) {
          const sl = extSlots(rooms[i], own, edges).filter((s) => s.s !== 'S')
          if (!sl.length) continue
          const s = rng.pick(sl)
          const out = A.opCells(rooms[i], s).outside
          rooms[i].op.push({ s: s.s, o: s.o, k: 'd' }); edges.add(A.edgeKey(rooms[i], s)); blocked.add(`${out[0]},${out[1]}`)
          model.exit2 = true; done = true; break
        }
        if (!done) p.exits = false
      }
      return model
    }
    return null
  }

  function freeRect(m, x, y, w, h) {
    if (x < 0 || y < 0 || x + w > m.W || y + h > m.H) return false
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (m.blocked.has(`${xx},${yy}`)) return false
    return true
  }
  const blockRect = (m, x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) m.blocked.add(`${xx},${yy}`) }

  function placeTerrace(rng, m) {
    const salon = m.rooms[m.entrance.room]
    const slots = rng.shuffle(extSlots(salon, m.own, m.edges))
    for (const s of slots) {
      const [cx, cy] = A.opCells(salon, { s: s.s, o: s.o, k: 'd' }).outside
      if (!freeRect(m, cx, cy, 1, 1)) continue
      const opts = []
      for (const [tw, th] of [[3, 2], [2, 3]])
        for (let x = cx - tw + 1; x <= cx; x++) for (let y = cy - th + 1; y <= cy; y++) if (freeRect(m, x, y, tw, th)) opts.push({ x, y, r: tw === 2 ? 1 : 0, tw, th })
      if (!opts.length) continue
      const o = rng.pick(opts)
      const op = { s: s.s, o: s.o, k: 'd' }
      salon.op.push(op); m.edges.add(A.edgeKey(salon, op))
      m.items.push({ id: 'terr', t: 'terrasse', x: o.x, y: o.y, r: o.r, f: 0 })
      blockRect(m, o.x, o.y, o.tw, o.th)
      return true
    }
    return false
  }

  function placeObstacles(rng, m, n) {
    const kinds = rng.shuffle(['tree', 'pond', 'rock', 'zone', 'tree'])
    let placed = 0
    for (const kind of kinds) {
      if (placed >= n) break
      const dims = kind === 'tree' ? rng.pick([[1, 1], [2, 2]]) : kind === 'pond' ? rng.pick([[3, 3], [3, 2], [4, 3]]) : kind === 'rock' ? rng.pick([[2, 2], [2, 3]]) : rng.pick([[4, 3], [5, 3], [6, 4]])
      const opts = []
      for (const [w, h] of [dims, [dims[1], dims[0]]])
        for (let y = 0; y + h <= m.H; y++)
          for (let x = 0; x + w <= m.W; x++)
            if (freeRect(m, x, y, w, h)) {
              const edge = Math.min(x, y, m.W - x - w, m.H - y - h)
              opts.push({ x, y, w, h, s: (kind === 'tree' ? edge * 0.5 : edge) + rng.f() * 2.5 })
            }
      if (!opts.length) continue
      opts.sort((a, b) => a.s - b.s)
      const o = opts[0]
      m.obstacles.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind })
      blockRect(m, o.x, o.y, o.w, o.h)
      placed++
    }
    return placed >= n
  }

  function placeGardenItem(rng, m, id, t, scoreFn) {
    const opts = []
    for (const r of [0, 1]) {
      if (r === 1 && ITEMS[t].w === ITEMS[t].h) continue
      const [w, h] = A.itemDims({ t, r })
      for (let y = 0; y + h <= m.H; y++) for (let x = 0; x + w <= m.W; x++) if (freeRect(m, x, y, w, h)) opts.push({ x, y, w, h, r, s: scoreFn(x, y, w, h) + rng.f() * 2 })
    }
    if (!opts.length) return false
    opts.sort((a, b) => a.s - b.s)
    const o = opts[0]
    m.items.push({ id, t, x: o.x, y: o.y, r: o.r, f: 0 })
    blockRect(m, o.x, o.y, o.w, o.h)
    return true
  }

  function placeGarden(rng, m, p) {
    const edgeD = (x, y, w, h) => Math.min(x, y, m.W - x - w, m.H - y - h)
    if (p.ramp) {
      const [cx, cy] = m.entrance.out
      const opts = []
      for (let x = cx - 2; x <= cx; x++) {
        if (x < 0 || x + 3 > m.W || cy >= m.H) continue
        let ok = true
        for (let xx = x; xx < x + 3; xx++) if (xx !== cx && m.blocked.has(`${xx},${cy}`)) ok = false
        if (ok) opts.push(x)
      }
      if (!opts.length) p.ramp = false
      else { const x = rng.pick(opts); m.items.push({ id: 'ramp', t: 'rampe', x, y: cy, r: 0, f: 0 }); blockRect(m, x, cy, 3, 1) }
    }
    if (p.garden) {
      if (rng.chance(p.d >= 4 ? 0.55 : 0.35)) placeGardenItem(rng, m, 'pool', 'piscine', (x, y, w, h) => -((m.H - (y + h)) * 1.0) + edgeD(x, y, w, h) * 0.3)
      const nTrees = rng.int(1, 3)
      for (let i = 1; i <= nTrees; i++) placeGardenItem(rng, m, 'arb' + i, 'arbre', (x, y, w, h) => edgeD(x, y, w, h) * 1.2)
      if (rng.chance(0.4)) placeGardenItem(rng, m, 'pot', 'potager', () => 0)
    }
  }

  // ---------------------------------------------------------------- fenêtres, escalier, meubles
  function placeWindows(rng, m) {
    const rooms = m.rooms
    const own = ownerMap(rooms)
    const WANT = {
      salon: () => 2 + (rng.chance(0.4) ? 1 : 0), cuisine: () => 1 + (rng.chance(0.4) ? 1 : 0), chambre: () => 1 + (rng.chance(0.35) ? 1 : 0),
      bureau: () => 1 + (rng.chance(0.4) ? 1 : 0), sdb: () => (rng.chance(0.65) ? 1 : 0), couloir: () => (rng.chance(0.5) ? 1 : 0), garage: () => (rng.chance(0.5) ? 1 : 0),
    }
    rooms.forEach((r) => {
      let slots = extSlots(r, own, m.edges)
      if (r.type === 'chambre' && m.nb) slots = slots.filter((s) => s.s !== m.nb)
      const want = Math.min(WANT[r.type](), slots.length)
      let placed = 0
      const mine = []
      // le salon préfère le côté sud
      const order = rng.shuffle(slots)
      if (r.type === 'salon') order.sort((a, b) => (a.s === 'S' ? 0 : 1) - (b.s === 'S' ? 0 : 1))
      for (let pass = 0; pass < 2 && placed < want; pass++)
        for (const s of order) {
          if (placed >= want) break
          if (mine.includes(s)) continue
          const tooClose = mine.some((q) => q.s === s.s && Math.abs(q.o - s.o) <= 1)
          if (pass === 0 && tooClose) continue
          const op = { s: s.s, o: s.o, k: 'w' }
          const ek = A.edgeKey(r, op)
          if (m.edges.has(ek)) continue
          m.edges.add(ek); r.op.push(op); mine.push(s); placed++
        }
    })
  }

  function placeStairs(rng, m) {
    const rooms = m.rooms
    const keep = new Set()
    rooms.forEach((r) => r.op.forEach((op) => { if (op.k === 'd') { const c = A.opCells(r, op); keep.add(ck(r.f, c.inside[0], c.inside[1])); keep.add(ck(r.f, c.outside[0], c.outside[1])) } }))
    m.keep = keep
    const own = ownerMap(rooms)
    const opts = []
    rooms.forEach((u, ui) => {
      if (u.f !== 1 || u.type !== 'couloir') return
      for (const r of [0, 1]) {
        const [w, h] = A.itemDims({ t: 'escalier', r })
        for (let y = u.y; y + h <= u.y + u.h; y++)
          for (let x = u.x; x + w <= u.x + u.w; x++) {
            let g = -2, kc = 0
            for (let cy = y; cy < y + h; cy++)
              for (let cx = x; cx < x + w; cx++) {
                const o = own.get(ck(0, cx, cy))
                if (o === undefined) g = -1
                else if (g === -2) g = o
                else if (g !== o) g = -1
                if (keep.has(ck(0, cx, cy)) || keep.has(ck(1, cx, cy))) kc++
              }
            if (g < 0) continue
            const gt = rooms[g].type
            if (!['salon', 'couloir', 'cuisine', 'bureau'].includes(gt)) continue
            opts.push({ x, y, r, s: kc * 5 + (gt === 'salon' || gt === 'couloir' ? 0 : 2) + rng.f() * 2 })
          }
      }
    })
    if (!opts.length) return false
    opts.sort((a, b) => a.s - b.s)
    const o = opts[0]
    m.items.push({ id: 'esc', t: 'escalier', x: o.x, y: o.y, r: o.r, f: 0 })
    return true
  }

  function placeFurniture(rng, m) {
    const rooms = m.rooms
    const occ = new Set(), keep = m.keep || new Set()
    for (const it of m.items.filter((i) => i.t === 'escalier')) for (const [x, y] of A.itemCells(it)) { occ.add(ck(0, x, y)); occ.add(ck(1, x, y)) }
    let bedCount = 0
    for (const r of rooms) {
      const list = []
      if (r.type === 'chambre') {
        bedCount++
        list.push([bedCount > 1 && rng.chance(0.3) ? 'lit1' : 'lit2', true])
        list.push(['armoire', false, 0.7])
        if (r.w * r.h >= 12) list.push(['bureau_m', false, 0.15])
      } else if (r.type === 'salon') {
        list.push(['canape', true]); list.push(['table', false, 0.85])
        if (r.w * r.h >= 20) list.push(['bureau_m', false, 0.12])
      } else if (r.type === 'cuisine') {
        list.push(['evier', true], ['plaque', true], ['frigo', true])
        if (r.w * r.h >= 12) list.push(['table', false, 0.3])
      } else if (r.type === 'sdb') list.push(['baignoire', true], ['lavabo', true], ['wc', true])
      else if (r.type === 'bureau') list.push(['bureau_m', true])
      else if (r.type === 'garage') list.push(['voiture', true])
      for (const [t, must, pr] of list) {
        if (!must && !rng.chance(pr)) continue
        let pos = fitItem(rng, r, t, occ, keep)
        if (!pos) pos = fitItem(rng, r, t, occ, new Set())
        if (!pos) { if (must) return false; continue }
        markOcc(occ, r, t, pos)
        m.items.push({ id: `${r.id}_${t}`, t, x: pos.x, y: pos.y, r: pos.r, f: r.f })
      }
    }
    return true
  }

  // ---------------------------------------------------------------- transformations (route toujours au sud à la construction)
  const SW = { flipX: { E: 'W', W: 'E', N: 'N', S: 'S' }, flipY: { N: 'S', S: 'N', E: 'E', W: 'W' }, tr: { N: 'W', W: 'N', S: 'E', E: 'S' } }
  function applyTransform(m, kind) {
    if (kind === 'flipX' || kind === 'flipY') {
      const fx = kind === 'flipX'
      m.rooms.forEach((r) => {
        r.op = r.op.map((op) => {
          const along = fx ? op.s === 'N' || op.s === 'S' : op.s === 'E' || op.s === 'W'
          return { s: SW[kind][op.s], o: along ? (fx ? r.w : r.h) - 1 - op.o : op.o, k: op.k }
        })
        if (fx) r.x = m.W - r.x - r.w; else r.y = m.H - r.y - r.h
      })
      m.items.forEach((it) => { const [w, h] = A.itemDims(it); if (fx) it.x = m.W - it.x - w; else it.y = m.H - it.y - h })
      m.obstacles.forEach((o) => { if (fx) o.x = m.W - o.x - o.w; else o.y = m.H - o.y - o.h })
    } else {
      m.rooms.forEach((r) => {
        r.op = r.op.map((op) => ({ s: SW.tr[op.s], o: op.o, k: op.k }))
        const x = r.x, w = r.w
        r.x = r.y; r.y = x; r.w = r.h; r.h = w
      })
      m.items.forEach((it) => { const x = it.x; it.x = it.y; it.y = x; it.r = it.r ? 0 : 1 })
      m.obstacles.forEach((o) => { const x = o.x, w = o.w; o.x = o.y; o.y = x; o.w = o.h; o.h = w })
      const W = m.W; m.W = m.H; m.H = W
    }
    m.road = SW[kind][m.road]
    if (m.nbSides) m.nbSides = m.nbSides.map((s) => SW[kind][s])
  }

  // ---------------------------------------------------------------- relocate (copie de levels.js) et plan de départ
  function relocate(level, plan) {
    const moved = new Set((level.muts || []).filter((m) => ['move', 'size', 'floor'].includes(m.m)).map((m) => m.id))
    const obs = level.obstacles || []
    const fits = (rooms, r, x, y) => {
      for (let yy = y; yy < y + r.h; yy++)
        for (let xx = x; xx < x + r.w; xx++) {
          if (xx < 0 || yy < 0 || xx >= level.w || yy >= level.h) return false
          if (r.f === 0 && obs.some((o) => xx >= o.x && xx < o.x + o.w && yy >= o.y && yy < o.y + o.h)) return false
          if (rooms.some((q) => q !== r && q.f === r.f && xx >= q.x && xx < q.x + q.w && yy >= q.y && yy < q.y + q.h)) return false
          if (r.f === 1 && !rooms.some((q) => q.f === 0 && xx >= q.x && xx < q.x + q.w && yy >= q.y && yy < q.y + q.h)) return false
        }
      return true
    }
    for (const r of plan.rooms) {
      if (!moved.has(r.id)) continue
      if (fits(plan.rooms, r, r.x, r.y)) continue
      let best = null
      for (let y = 0; y <= level.h - r.h; y++)
        for (let x = 0; x <= level.w - r.w; x++) {
          if (!fits(plan.rooms, r, x, y)) continue
          const d = Math.abs(x - r.x) + Math.abs(y - r.y)
          if (!best || d < best.d) best = { x, y, d }
        }
      if (best) { r.x = best.x; r.y = best.y }
    }
    const movedItems = new Set((level.muts || []).filter((m) => m.m === 'imove').map((m) => m.id))
    for (const it of plan.items) {
      if (!movedItems.has(it.id) || !A.ITEMS[it.t].garden) continue
      const ok = (x, y) => {
        const [w, h] = A.itemDims(it)
        for (let yy = y; yy < y + h; yy++)
          for (let xx = x; xx < x + w; xx++) {
            if (xx < 0 || yy < 0 || xx >= level.w || yy >= level.h) return false
            if (obs.some((o) => xx >= o.x && xx < o.x + o.w && yy >= o.y && yy < o.y + o.h)) return false
            if (plan.rooms.some((q) => q.f === 0 && xx >= q.x && xx < q.x + q.w && yy >= q.y && yy < q.y + q.h)) return false
            if (plan.items.some((q) => q !== it && A.ITEMS[q.t].garden && A.itemCells(q).some(([cx, cy]) => cx === xx && cy === yy))) return false
          }
        return true
      }
      if (ok(it.x, it.y)) continue
      const [w, h] = A.itemDims(it)
      let best = null
      for (let y = 0; y <= level.h - h; y++)
        for (let x = 0; x <= level.w - w; x++) {
          if (!ok(x, y)) continue
          const d = Math.abs(x - it.x) + Math.abs(y - it.y)
          if (!best || d < best.d) best = { x, y, d }
        }
      if (best) { it.x = best.x; it.y = best.y }
    }
    return plan
  }
  const startPlan = (level) => relocate(level, A.applyMutations(level.solution, level.muts))
  const geomOk = (a) => !(a.overlap || a.outside || a.onObstacle || a.unsupported)

  // ---------------------------------------------------------------- faits -> critères candidats
  function buildPool(L, P, ctx) {
    const pool = []
    const ana = A.analyze(L, P)
    const rooms = P.rooms, items = P.items
    const add = (group, c, want, extra) => pool.push(Object.assign({ group, c, want: want || '', sig: '' }, extra || {}))
    const types = [...new Set(rooms.map((r) => r.type))]
    const idxOf = (t) => rooms.map((r, i) => (r.type === t ? i : -1)).filter((i) => i >= 0)
    const many = (t) => idxOf(t).length > 1
    const road = L.road
    const winCount = (i, s) => ana.info[i].windows.filter((w) => !s || w.s === s).length
    const sigOf = (c) => [c.kind, c.type || c.item || (c.a ? c.a + '-' + c.b : '') || c.room || '', c.side || '', c.kind === 'window' ? (c.min || 1) : ''].join(':')

    // --- nombre de pièces
    for (const t of types) {
      if (t === 'couloir') continue
      const n = idxOf(t).length
      add('count', { kind: 'count', type: t, min: n, text: cap(nOf(t, n)), hint: n === 1 ? `Il faut ${ind(t)}.` : `Il faut ${n} pièces de type ${cap(T[t].s)}.` },
        t === 'chambre' || t === 'sdb' ? nOf(t, n) : n > 1 ? nOf(t, n) : ind(t), { sigKey: 'count:' + t })
      if ((t === 'chambre' || t === 'sdb') && ctx.rng.chance(0.4))
        add('count', { kind: 'count', type: t, min: n, max: n, text: `Exactement ${NUM[n]} ${n === 1 ? T[t].s : T[t].p}`, hint: 'Ni plus, ni moins.' }, nOf(t, n), { sigKey: 'count:' + t })
    }
    if (L.floors === 2) {
      const nc = idxOf('chambre').length
      if (nc && rooms.filter((r) => r.type === 'chambre').every((r) => r.f === 1))
        add('count', { kind: 'count', type: 'chambre', min: nc, f: 1, text: `${cap(nOf('chambre', nc))} à l’étage`, hint: 'Les chambres se mettent à l’étage : utilise les onglets au-dessus du plan.' }, `${nOf('chambre', nc)} à l’étage`, { sigKey: 'count:chambre' })
      if (rooms.filter((r) => r.type === 'salon').every((r) => r.f === 0))
        add('count', { kind: 'count', type: 'salon', min: 1, f: 0, text: 'Le salon au rez-de-chaussée', hint: 'Le salon doit être en bas.' }, 'un salon au rez-de-chaussée', { sigKey: 'count:salon' })
    }
    // --- surfaces
    for (const t of types) {
      const areas = idxOf(t).map((i) => rooms[i].w * rooms[i].h)
      const best = Math.max(...areas)
      if (t === 'sdb' || t === 'garage' || t === 'couloir') {
        if (t === 'couloir') add('size', { kind: 'area', type: t, min: best, text: `Un couloir large : ${best} m² au moins`, hint: 'Élargis le couloir.' }, '', { sigKey: 'area:couloir' })
        continue
      }
      const min = Math.max(best - ctx.rng.int(0, 2), 4)
      add('size', { kind: 'area', type: t, min, text: `${cap(ind(t))} d’au moins ${min} m²`, hint: `Agrandis ${def(t)} avec les boutons de taille.` }, `${ind(t)} d’au moins ${min} m²`, { sigKey: 'area:' + t })
    }
    {
      const sdb = idxOf('sdb')
      if (sdb.length === 1) { const a = rooms[sdb[0]].w * rooms[sdb[0]].h; add('size', { kind: 'area', type: 'sdb', max: a, text: `Une salle de bain de ${a} m² au plus`, hint: 'Pas besoin d’une salle de bain géante.' }, '', { sigKey: 'area:sdb' }) }
      const ch = idxOf('chambre')
      if (ch.length) { const m = Math.min(...ch.map((i) => Math.min(rooms[i].w, rooms[i].h))); if (m >= 3) add('size', { kind: 'minSide', type: 'chambre', min: m, text: `Chambres d’au moins ${m} m de côté`, hint: 'Aucune chambre ne doit être trop étroite.' }, `des chambres d’au moins ${m} m de côté`, { sigKey: 'minSide:chambre' }) }
      const total = sum(rooms.map((r) => r.w * r.h))
      const mx = total + ctx.rng.int(0, 3)
      add('size', { kind: 'totalArea', max: mx, text: `Maison compacte : ${mx} m² au maximum`, hint: 'Chaque mètre carré compte.' }, `une maison de ${mx} m² au plus`, { sigKey: 'totalArea:max' })
      const mn = total - ctx.rng.int(0, 3)
      add('size', { kind: 'totalArea', min: mn, text: `Une maison d’au moins ${mn} m² habitables`, hint: 'La maison ne doit pas rétrécir.' }, `une maison d’au moins ${mn} m²`, { sigKey: 'totalArea:min' })
    }
    // --- fenêtres
    for (const t of types) {
      const idxs = idxOf(t)
      if (Math.min(...idxs.map((i) => winCount(i))) >= 1)
        add('win', { kind: 'window', type: t, min: 1, text: many(t) ? `Chaque ${T[t].s} a une fenêtre` : `${cap(def(t))} a une fenêtre`, hint: 'Clique sur un mur extérieur pour poser une fenêtre.' },
          t === 'chambre' ? 'des chambres lumineuses' : '', { sigKey: 'window:' + t })
      for (const s of ['N', 'S', 'E', 'W']) {
        if (t === 'couloir') continue
        const cs = idxs.map((i) => winCount(i, s))
        const mn = Math.min(...cs)
        if (mn >= 1) {
          const n = Math.min(mn, 3)
          const sun = t === 'salon' && s === 'S' ? ' (soleil)' : t === 'bureau' && s === 'N' ? ' (lumière douce)' : ''
          const want = t === 'salon' && s === 'S' ? 'un salon plein sud' : t === 'bureau' && s === 'N' ? 'un bureau avec la lumière du nord' : ''
          add('win', { kind: 'window', type: t, side: s, min: n, text: `${many(t) ? 'Chaque ' + T[t].s : cap(def(t))} ${many(t) ? 'a' : 'a'} ${n === 1 ? 'une fenêtre' : NUM[n] + ' fenêtres'} ${SIDE_AT[s]}${sun}`, hint: 'La fenêtre doit être posée sur le bon côté. ' + ORIENT }, want, { sigKey: `window:${t}:${s}` })
        }
      }
    }
    for (const t of ['chambre', 'sdb']) {
      const idxs = idxOf(t)
      if (!idxs.length) continue
      const ownAll = ownerMap(rooms)
      for (const s of ['N', 'S', 'E', 'W']) {
        const hasWall = idxs.some((i) => extSlots(rooms[i], ownAll).some((q) => q.s === s))
        if (!hasWall || idxs.some((i) => winCount(i, s))) continue
        const where = s === road ? `côté route (${SIDE_FR[s]})` : (L.neighbors || []).includes(s) ? `côté voisin (${SIDE_FR[s]})` : `côté ${SIDE_FR[s]}`
        add('win', { kind: 'noWindowSide', type: t, side: s, text: `Aucune fenêtre de ${T[t].s} ${where}`, hint: 'Retire les fenêtres de ce côté.' },
          t === 'chambre' && (s === road || (L.neighbors || []).includes(s)) ? (s === road ? 'aucune fenêtre de chambre côté route' : 'aucune fenêtre de chambre côté voisin') : '', { sigKey: `noWin:${t}:${s}` })
      }
    }
    {
      const n = sum(ana.info.map((x) => x.windows.length))
      add('win', { kind: 'windowsTotal', min: n, text: `Au moins ${n} fenêtres en tout`, hint: 'Il manque de la lumière.' }, '', { sigKey: 'wtotal:min' })
      add('win', { kind: 'windowsTotal', max: n, text: `Pas plus de ${n} fenêtres en tout`, hint: 'Les fenêtres coûtent cher : économise.' }, '', { sigKey: 'wtotal:max' })
    }
    // --- entrée, accessibilité
    const ext = []
    rooms.forEach((r, i) => ana.info[i].ext.forEach((op) => ext.push(op.s)))
    if (ext.length === 1) add('core', { kind: 'entrance', n: 1, side: 'road', text: `Une seule entrée, côté route (${SIDE_FR[road]})`, hint: 'Une porte donnant dehors, sur le mur côté route, et pas d’autre.' }, 'une seule entrée, côté route', { core: true, sigKey: 'entrance' })
    else if (ext.length === 2 && new Set(ext).size === 2) add('core', { kind: 'exits', min: 2, sides: 2, text: 'Deux sorties sur deux côtés différents (sécurité incendie)', hint: 'Une porte donnant dehors, ailleurs que sur le côté de l’entrée.' }, 'deux sorties de secours', { core: true, sigKey: 'entrance' })
    add('core', { kind: 'reachable', text: L.floors === 2 ? 'Toutes les pièces, étage compris, sont accessibles depuis l’entrée' : 'Toutes les pièces sont accessibles depuis l’entrée', hint: L.floors === 2 ? 'Relie les pièces par des portes et pense à l’escalier.' : 'Relie chaque pièce à une autre par une porte.' }, '', { core: true, sigKey: 'reachable' })
    add('rel', { kind: 'noThrough', text: 'Jamais besoin de traverser une chambre pour aller ailleurs', hint: 'Une chambre ne doit pas être le seul passage vers une autre pièce.' }, 'un plan où l’on ne traverse jamais une chambre', { sigKey: 'noThrough' })
    // --- liaisons entre pièces
    const linkPairs = new Set(), adjPairs = new Set()
    rooms.forEach((r, i) => {
      ana.info[i].links.forEach((j) => { if (rooms[j].type !== r.type) linkPairs.add([r.type, rooms[j].type].sort().join('+')) })
      ana.info[i].adj.forEach((j) => { if (rooms[j].type !== r.type) adjPairs.add([r.type, rooms[j].type].sort().join('+')) })
    })
    const LINKWANT = { 'garage+cuisine': 'un garage relié à la cuisine', 'cuisine+salon': 'une cuisine ouverte sur le salon', 'chambre+sdb': 'une salle de bain attenante à la chambre', 'bureau+salon': 'un bureau relié au salon' }
    for (const key of linkPairs) {
      const [x, y] = key.split('+')
      const aa = y === 'garage' ? y : x, bb = y === 'garage' ? x : y
      const text = aa === 'garage' && bb === 'cuisine' ? 'Le garage est relié à la cuisine par une porte' : `Une porte entre ${def(aa)} et ${def(bb)}`
      add('rel', { kind: 'link', a: aa, b: bb, text, hint: `Clique sur le mur que ${def(aa)} et ${def(bb)} partagent pour poser une porte.` }, LINKWANT[key] || '', { sigKey: `link:${key}` })
    }
    for (const key of adjPairs) {
      const [x, y] = key.split('+')
      if (x === 'couloir' || y === 'couloir') continue
      add('rel', { kind: 'adjacent', a: x, b: y, text: `${cap(def(x))} touche ${def(y)}`, hint: 'Colle les deux pièces l’une contre l’autre.' }, '', { sigKey: `adj:${key}` })
    }
    for (const [x, y] of [['chambre', 'cuisine'], ['chambre', 'garage'], ['bureau', 'garage'], ['bureau', 'cuisine'], ['chambre', 'salon']]) {
      if (!types.includes(x) || !types.includes(y)) continue
      if (adjPairs.has([x, y].sort().join('+'))) continue
      add('rel', { kind: 'notAdjacent', a: x, b: y, text: `Aucune ${x === 'bureau' ? 'bureau' : T[x].s} ne touche ${def(y)}`.replace('Aucune bureau', 'Aucun bureau'), hint: 'Ces deux pièces ne doivent pas se toucher (bruit, odeurs).' }, x === 'chambre' && y === 'cuisine' ? 'des chambres à l’écart de la cuisine' : x === 'chambre' && y === 'garage' ? 'des chambres loin du garage' : '', { sigKey: `notAdj:${x}-${y}` })
    }
    // --- distances
    for (const t of ['chambre', 'bureau']) {
      const idxs = idxOf(t)
      if (!idxs.length) continue
      const d = Math.min(...idxs.map((i) => distTo(L, rooms[i], road)))
      if (d >= 2) add('dist', { kind: 'awayFromRoad', type: t, d, text: `${t === 'chambre' ? 'Chambres' : 'Bureau'} à ${d} m au moins de la route (${SIDE_FR[road]})`, hint: 'Éloigne-les de la route.' }, t === 'chambre' ? 'des chambres loin de la route' : 'un bureau à l’écart de la route', { sigKey: 'awayRoad:' + t })
    }
    for (const s of L.neighbors || []) {
      const ch = idxOf('chambre')
      if (ch.length) {
        const d = Math.min(...ch.map((i) => distTo(L, rooms[i], s)))
        if (d >= 2) add('dist', { kind: 'awayFromSide', type: 'chambre', side: s, d, text: `Chambres à ${d} m au moins du voisin (${SIDE_FR[s]})`, hint: `Le voisin est du côté ${SIDE_FR[s]} du plan.` }, 'des chambres loin du voisin', { sigKey: 'awaySide:chambre:' + s })
      }
      for (const t of ['garage', 'cuisine', 'couloir']) {
        const idxs = idxOf(t)
        if (!idxs.length) continue
        const d = Math.min(...idxs.map((i) => distTo(L, rooms[i], s)))
        if (d <= 3 && t !== 'couloir') add('dist', { kind: 'nearSide', type: t, side: s, d, text: `${cap(def(t))} fait écran côté voisin (à ${d} m au plus du côté ${SIDE_FR[s]})`, hint: `Place-${T[t].fem ? 'la' : 'le'} contre le voisin (${SIDE_FR[s]}).` }, `${def(t)} côté voisin pour faire écran`, { sigKey: `near:${t}:${s}` })
      }
    }
    // --- meubles
    const okItems = items.map((it, k) => ana.itemInfo[k])
    const combos = new Map()
    items.forEach((it, k) => {
      const d = ITEMS[it.t]
      if (d.garden || d.stairs || !okItems[k].ok || okItems[k].room < 0) return
      const key = it.t + '@' + rooms[okItems[k].room].type
      combos.set(key, (combos.get(key) || 0) + 1)
    })
    for (const [key, n] of combos) {
      const [t, rt] = key.split('@')
      const mn = n >= 2 && ctx.rng.chance(0.6) ? n : 1
      const room = mn > 1 && many(rt) ? 'dans les ' + T[rt].p : roomIn(rt, many(rt))
      const txt = t === 'voiture' ? `La voiture ${room}` : mn === 1 ? `${cap(IT[t][0])} ${room}` : `${cap(NUM[mn])} ${IT[t][1]} ${room}`
      const want = { evier: 'une cuisine bien équipée', plaque: 'une cuisine bien équipée', frigo: 'une cuisine bien équipée', baignoire: 'une vraie baignoire', lit2: 'un grand lit', canape: 'un canapé dans le salon', voiture: 'un garage pour la voiture' }[t] || ''
      add('furn', { kind: 'furn', item: t, room: rt, min: mn, text: txt, hint: `Choisis « ${cap(A.ITEMS[t].label)} » dans la liste et pose-le entièrement ${room}.` }, want, { sigKey: `furn:${t}@${rt}` })
      if (many(rt) && idxOf(rt).every((i) => items.some((it, k) => it.t === t && okItems[k].ok && okItems[k].room === i)))
        add('furn', { kind: 'furnRoom', item: t, room: rt, text: `Chaque ${T[rt].s} a ${IT[t][0]}`, hint: 'Aucune pièce de ce type ne doit être oubliée.' }, '', { sigKey: `furnRoom:${t}@${rt}` })
    }
    if (items.some((it, k) => it.t === 'escalier' && okItems[k].ok))
      add('furn', { kind: 'furn', item: 'escalier', text: 'Un escalier relie les deux étages', hint: 'Ajoute un escalier : il doit tomber dans une pièce en bas et dans une pièce en haut, aux mêmes cases.' }, 'un escalier pour relier les deux niveaux', { sigKey: 'furn:escalier' })
    // --- jardin
    const gi = (t) => items.filter((it, k) => it.t === t && okItems[k].ok)
    if (gi('terrasse').length) {
      add('garden', { kind: 'garden', item: 'terrasse', min: 1, text: 'Une terrasse', hint: 'Ajoute une terrasse depuis la liste, hors de la maison.' }, 'une terrasse pour les repas d’été', { sigKey: 'garden:terrasse' })
      add('garden', { kind: 'patio', room: 'salon', text: 'Le salon s’ouvre sur la terrasse par une porte', hint: 'Pose une porte sur le mur du salon qui touche la terrasse.' }, 'un salon qui s’ouvre sur la terrasse', { sigKey: 'patio' })
    }
    const pools = gi('piscine')
    if (pools.length) {
      add('garden', { kind: 'garden', item: 'piscine', min: 1, text: 'Une piscine', hint: 'Ajoute une piscine depuis la liste, hors de la maison.' }, 'une piscine', { sigKey: 'garden:piscine' })
      const [pw, ph] = A.itemDims(pools[0])
      const d = distTo(L, { x: pools[0].x, y: pools[0].y, w: pw, h: ph }, road)
      if (d >= 2) add('garden', { kind: 'gardenAway', item: 'piscine', d, text: `La piscine à ${d} m au moins de la route (${SIDE_FR[road]})`, hint: 'Éloigne la piscine de la route.' }, '', { sigKey: 'gardenAway:piscine' })
    }
    const trees = gi('arbre')
    if (trees.length) {
      add('garden', { kind: 'garden', item: 'arbre', min: trees.length, text: trees.length === 1 ? 'Un arbre dans le jardin' : `Au moins ${NUM[trees.length]} arbres dans le jardin`, hint: 'Ajoute des arbres depuis la liste, hors de la maison.' }, trees.length === 1 ? 'un arbre au jardin' : `${NUM[trees.length]} arbres au jardin`, { sigKey: 'garden:arbre' })
      for (const s of ['N', 'S', 'E', 'W']) {
        const n = trees.filter((it) => zoneOf(L, it) === s).length
        if (n >= 1) add('garden', { kind: 'garden', item: 'arbre', min: n, zone: s, text: `${n === 1 ? 'Un arbre' : cap(NUM[n]) + ' arbres'} côté ${SIDE_FR[s]} du jardin`, hint: ORIENT }, '', { sigKey: 'garden:arbre:' + s })
      }
    }
    if (gi('potager').length) add('garden', { kind: 'garden', item: 'potager', min: 1, text: 'Un potager', hint: 'Ajoute un potager depuis la liste.' }, 'un potager', { sigKey: 'garden:potager' })
    if (gi('rampe').length) add('garden', { kind: 'ramp', text: 'Une rampe d’accès à l’entrée (fauteuil roulant)', hint: 'Ajoute une rampe devant la porte d’entrée.' }, 'une rampe devant l’entrée', { sigKey: 'ramp' })

    pool.forEach((e, i) => { e.sig = e.sigKey || sigOf(e.c); e.c.id = 'p' + i; e.pid = 'p' + i })
    // on ne garde que les critères vrais pour la solution (sécurité)
    const probe = Object.assign({}, L, { criteria: pool.map((e) => e.c), twist: undefined, muts: [] })
    const ev = A.evaluate(probe, P)
    const okIds = new Set(ev.list.filter((x) => x.ok).map((x) => x.id))
    return { pool: pool.filter((e) => okIds.has(e.pid)), cost: ev.cost }
  }

  // ---------------------------------------------------------------- mutations
  function mutationCandidates(rng, L, P) {
    const ana = A.analyze(L, P)
    const rooms = P.rooms, items = P.items
    const out = []
    const own = ownerMap(rooms)
    const usedEdges = new Set()
    rooms.forEach((r) => r.op.forEach((op) => usedEdges.add(A.edgeKey(r, op))))
    const hasItems = rooms.map((r, i) => items.some((it, k) => ana.itemInfo[k].room === i || ana.itemInfo[k].room1 === i))
    const upperOf = (r) => r.f === 0 && rooms.some((q) => q.f === 1 && overlapRect(q, r))
    const push = (kind, m, room) => out.push({ kind, m, room })
    const TYPES_TO = { cuisine: ['chambre', 'bureau', 'garage'], garage: ['chambre', 'bureau'], bureau: ['garage', 'chambre', 'cuisine'], sdb: ['chambre', 'bureau', 'cuisine'], chambre: ['bureau', 'sdb', 'garage'], salon: ['bureau', 'chambre'] }
    rooms.forEach((r, i) => {
      for (const t of TYPES_TO[r.type] || []) push('type', { m: 'type', id: r.id, type: t }, r.id)
      r.op.forEach((op) => push(op.k === 'd' ? 'rmdoor' : 'rmwin', { m: 'rmop', id: r.id, op: A.opStr(op) }))
      if (!hasItems[i]) {
        if (!upperOf(r)) {
          for (const [dx, dy] of rng.shuffle([[-3, 0], [3, 0], [0, 3], [0, -3], [4, 0], [-4, 0], [2, 3], [-2, 3]]).slice(0, 3)) push('move', { m: 'move', id: r.id, dx, dy }, r.id)
          if (r.w > 3) push('size', { m: 'size', id: r.id, w: r.w - 1, h: r.h }, r.id)
          if (r.h > 3) push('size', { m: 'size', id: r.id, w: r.w, h: r.h - 1 }, r.id)
          if (r.w > 4) push('size', { m: 'size', id: r.id, w: r.w - 2, h: r.h }, r.id)
        }
        if (r.f === 1 && r.type !== 'couloir') push('floor', { m: 'floor', id: r.id, f: 0 }, r.id)
      }
      if (r.f === 0 && r.type !== 'salon') {
        const sl = extSlots(r, own, usedEdges)
        if (sl.length) { const s = rng.pick(sl); push('adddoor', { m: 'addop', id: r.id, op: `${s.s}${s.o}d` }) }
      }
    })
    items.forEach((it, k) => {
      const d = ITEMS[it.t]
      push('idel', { m: 'idel', id: it.id }, it.id)
      const [w, h] = A.itemDims(it)
      if (!d.stairs) for (const [dx, dy] of rng.shuffle([[w + 1, 0], [-(w + 1), 0], [0, h + 1], [0, -(h + 1)], [3, 3]]).slice(0, 2)) push('imove', { m: 'imove', id: it.id, dx, dy }, it.id)
      else push('imove', { m: 'imove', id: it.id, dx: 0, dy: -4 }, it.id)
      if (!d.garden && !d.stairs) push('irot', { m: 'irot', id: it.id }, it.id)
      if (it.t === 'wc') push('itype', { m: 'itype', id: it.id, t: 'lavabo' }, it.id)
      if (it.t === 'lavabo') push('itype', { m: 'itype', id: it.id, t: 'wc' }, it.id)
      if (it.t === 'lit2') push('itype', { m: 'itype', id: it.id, t: 'lit1' }, it.id)
      if (it.t === 'canape') push('itype', { m: 'itype', id: it.id, t: 'table' }, it.id)
      if (it.f === 1 && !d.stairs) push('ifloor', { m: 'ifloor', id: it.id, f: 0 }, it.id)
    })
    return out
  }

  // ---------------------------------------------------------------- client, textes
  const FIRST_F = ['Léa', 'Camille', 'Inès', 'Manon', 'Chloé', 'Sofia', 'Yasmine', 'Élodie', 'Nadia', 'Clémence', 'Aïcha', 'Jade', 'Marguerite', 'Josiane', 'Océane', 'Salomé', 'Mathilde', 'Louise', 'Fatou', 'Anaïs', 'Juliette', 'Margaux']
  const FIRST_M = ['Hugo', 'Samir', 'Mathieu', 'Lucas', 'Karim', 'Étienne', 'Théo', 'Bastien', 'Omar', 'Gaspard', 'Raphaël', 'Jérôme', 'Antoine', 'Yann', 'Mohamed', 'Pierre', 'Rémi', 'Nicolas', 'Baptiste', 'Idriss', 'Georges', 'Lucien']
  const SURN = ['Martin', 'Dubois', 'Lefèvre', 'Moreau', 'Girard', 'Bonnet', 'Roux', 'Fournier', 'Mercier', 'Lambert', 'Benali', 'Diallo', 'Nguyen', 'Da Silva', 'Petit', 'Garnier', 'Rousseau', 'Blanc', 'Guérin', 'Faure', 'Delorme', 'Marchand']
  const ARCH = [
    { id: 'solo', hh: 'solo', ages: [24, 42], jobs: [['Infirmier', 'Infirmière'], ['Graphiste', 'Graphiste'], ['Boulanger', 'Boulangère'], ['Professeur', 'Professeure'], ['Photographe', 'Photographe'], ['Kinésithérapeute', 'Kinésithérapeute'], ['Électricien', 'Électricienne']],
      intro: ['Je veux un petit nid à mon image, simple et lumineux.', 'Ma maison doit être pratique : je n’ai pas le temps d’entretenir un palais.', 'Je rentre souvent tard : je veux une maison où l’on se sent bien dès l’entrée.'],
      story: ['{n} vient d’acheter un terrain avec ses économies et veut une maison facile à vivre.', '{n} vit seul et rêve de sa première vraie maison.'] },
    { id: 'couple', hh: 'couple', ages: [27, 40], jobs: [['Jeune couple', 'Jeune couple'], ['Couple de jeunes mariés', 'Couple de jeunes mariés'], ['Couple sans enfant', 'Couple sans enfant']],
      intro: ['On veut une maison prête à vivre, avec de la place pour recevoir nos amis.', 'On construit notre premier chez-nous : on veut que ce soit parfait.', 'On adore cuisiner et recevoir : il nous faut une maison conviviale.'],
      story: ['{n} construisent leur première maison et ont des idées bien arrêtées.', '{n} ont enfin trouvé le terrain de leurs rêves.'] },
    { id: 'family', hh: 'family', ages: [34, 48], jobs: [['Famille de 4', 'Famille de 4'], ['Parents de deux enfants', 'Parents de deux enfants'], ['Famille de cinq personnes', 'Famille de cinq personnes'], ['Famille recomposée', 'Famille recomposée']],
      intro: ['Avec les enfants, il faut de la place et du calme, mais aussi un espace pour se retrouver.', 'La maison doit résister aux enfants, aux amis des enfants et au chien.', 'On veut une maison où chacun a son coin.'],
      story: ['{n} ont des enfants bruyants et beaucoup de projets pour leur future maison.', '{n} cherchent une maison qui grandira avec les enfants.'] },
    { id: 'senior', hh: 'senior', ages: [64, 82], jobs: [['Retraité', 'Retraitée'], ['Ancien instituteur', 'Ancienne institutrice'], ['Ancien facteur', 'Ancienne factrice']],
      intro: ['À mon âge, je veux du confort et un plan qui ne me fasse pas courir partout.', 'J’ai eu une vie bien remplie : maintenant, je veux une maison tranquille.', 'Je veux pouvoir recevoir mes petits-enfants sans me ruiner.'],
      story: ['{n} a du mal à marcher longtemps et veut une maison pensée pour la tranquillité.', '{n} prend sa retraite et fait construire la maison de ses vieux jours.'] },
    { id: 'remote', hh: 'solo', ages: [28, 45], jobs: [['Développeur', 'Développeuse'], ['Traducteur', 'Traductrice'], ['Écrivain', 'Écrivaine'], ['Comptable', 'Comptable'], ['Illustrateur', 'Illustratrice']],
      intro: ['Je travaille de chez moi : je veux de la lumière et un coin tranquille.', 'Mon bureau, c’est ma vie. Le reste doit être calme et bien organisé.', 'Je passe mes journées devant l’écran : je veux une maison qui respire.'],
      story: ['{n} travaille à la maison et tient à un espace calme et bien éclairé.', '{n} télétravaille et veut séparer clairement le travail et le repos.'] },
    { id: 'artist', hh: 'solo', ages: [30, 55], jobs: [['Peintre', 'Peintre'], ['Potier', 'Potière'], ['Musicien', 'Musicienne'], ['Sculpteur', 'Sculptrice']],
      intro: ['J’ai besoin d’espace et de lumière pour créer, et d’un peu de silence pour dormir.', 'Ma maison est mon atelier : je veux de grands volumes et de la lumière.', 'Mes voisins n’apprécient pas toujours mon travail : pensez à l’isolement.'],
      story: ['{n} crée dans sa maison et rêve d’un lieu inspirant.', '{n} cherche un équilibre entre l’atelier et la vie de tous les jours.'] },
    { id: 'cook', hh: 'solo', ages: [28, 50], jobs: [['Cuisinier', 'Cuisinière'], ['Boulanger', 'Boulangère'], ['Traiteur', 'Traiteuse'], ['Pâtissier', 'Pâtissière']],
      intro: ['La cuisine est le cœur de la maison : tout part de là.', 'Je cuisine pour mes amis tous les week-ends : il me faut de la place.', 'Une bonne cuisine, un bon salon, et le reste suivra.'],
      story: ['{n} passe sa vie derrière les fourneaux et veut une cuisine à la hauteur.', '{n} adore recevoir et attache une grande importance à la cuisine.'] },
    { id: 'night', hh: 'solo', ages: [26, 45], jobs: [['Infirmier de nuit', 'Infirmière de nuit'], ['Pilote de ligne', 'Pilote de ligne'], ['Boulanger de nuit', 'Boulangère de nuit']],
      intro: ['Je dors le jour : mes chambres doivent être au calme, loin du bruit.', 'Mon sommeil est sacré : pas de bruit, pas de lumière en trop.', 'Je travaille de nuit et je dors le jour : le silence est ma priorité.'],
      story: ['{n} dort le jour et déteste le bruit.', '{n} a des horaires décalés et cherche avant tout du calme.'] },
    { id: 'sport', hh: 'solo', ages: [25, 45], jobs: [['Coach sportif', 'Coach sportive'], ['Sapeur-pompier', 'Sapeuse-pompière'], ['Kiné du sport', 'Kiné du sport']],
      intro: ['Je veux une maison saine, claire et pratique, sans fioritures.', 'J’aime l’air frais et le grand espace : de grandes fenêtres, surtout.', 'Je suis tout le temps dehors : la maison doit être simple, pratique, et se vider d’un coup d’œil.'],
      story: ['{n} est toujours en mouvement et veut une maison simple et efficace.', '{n} cherche un lieu où se ressourcer après l’effort.'] },
    { id: 'diy', hh: 'solo', ages: [30, 60], jobs: [['Garagiste', 'Garagiste'], ['Menuisier', 'Menuisière'], ['Mécanicien', 'Mécanicienne']],
      intro: ['Je bricole beaucoup : il me faut de la place pour la voiture et pour les outils.', 'Un bon garage, une maison solide, et je suis content.', 'Je répare tout moi-même, alors autant que la maison soit bien pensée.'],
      story: ['{n} a toujours rêvé d’un vrai garage et d’une maison qui lui ressemble.', '{n} est un bricoleur qui sait exactement ce qu’il veut.'] },
  ]
  const SKINS = ['#f2c9a5', '#e9bd98', '#c98f64', '#e8bd9a', '#f0c8a8', '#efc5a2', '#f0c6a2', '#dba67d', '#b9835a', '#efd0b5', '#8d5a3b', '#a8714b', '#f4d3b8', '#e0b08a']
  const HAIR_Y = ['#6b3b25', '#2f2a28', '#1c1c1c', '#a8442c', '#c9b27a', '#3b2a21', '#7a4a2e', '#2a1c14', '#8a4b2a', '#d46a8a']
  const HAIR_O = ['#d8d8d8', '#c8c8c8', '#8a8a8a', '#555555', '#cfd2d6']
  const CLOTHES = ['#4a9bd0', '#c8644a', '#3d4b66', '#7a8f5a', '#7a5ac0', '#1f3a5f', '#e07a7a', '#4caf7d', '#e0a030', '#5a7ab0', '#d98a2b', '#8a5aa0', '#2f6f6f', '#a04050']

  function makeClient(rng, p, flags) {
    const arch = flags.senior ? ARCH[3] : rng.pick(ARCH)
    const female = rng.chance(0.5)
    const first = rng.pick(female ? FIRST_F : FIRST_M)
    let other = rng.pick(female ? FIRST_M : FIRST_F)
    if (other === first) other = rng.pick(FIRST_M)
    const surn = rng.pick(SURN)
    const age = rng.int(arch.ages[0], arch.ages[1])
    const job = rng.pick(arch.jobs)[female ? 1 : 0]
    let name, short
    if (arch.hh === 'solo') { name = first; short = first }
    else if (arch.hh === 'couple') { name = rng.chance(0.5) ? `${first} et ${other}` : `${first} et ${other} ${surn}`; short = name }
    else if (arch.hh === 'family') { name = rng.chance(0.5) ? `La famille ${surn}` : `${first} et ${other} ${surn}`; short = name }
    else { name = rng.chance(0.5) ? first : (female ? 'Madame ' : 'Monsieur ') + surn; short = name }
    const old = age >= 60
    const style = rng.pick(female ? ['long', 'bob', 'ponytail', 'bun', 'curly', 'afro', 'side', 'short'] : ['short', 'side', 'spiky', 'curly', 'afro', 'bald', 'short'])
    const look = {
      skin: rng.pick(SKINS), hair: old ? rng.pick(HAIR_O) : rng.pick(HAIR_Y), hairStyle: old && style === 'spiky' ? 'side' : style, age,
      clothes: rng.pick(CLOTHES), collar: rng.pick(['shirt', 'shirt', 'hoodie', 'tie', 'scarf']),
    }
    if (!female && rng.chance(0.4)) look.beard = rng.pick(['stubble', 'moustache', 'full'])
    if (rng.chance(old ? 0.55 : 0.25)) look.glasses = rng.pick(['round', 'square'])
    if (rng.chance(0.18)) look.freckles = true
    if (female && rng.chance(0.2)) look.accessory = 'earrings'
    else if (!female && rng.chance(0.1)) look.accessory = rng.pick(['cap', 'beanie'])
    if (flags.ramp) look.accessory = 'wheelchair'
    return { arch, female, first, surn, name, short, job, age, look }
  }

  const joinFr = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' et ' + arr[arr.length - 1])

  // ---------------------------------------------------------------- assemblage d'un niveau
  function attempt(seed, d, att) {
    const rng = makeRng(mix(seed, d, att))
    const p = profile(d, rng)
    p.terrace = p.garden && rng.chance(0.75)
    const m = buildModel(rng, p)
    if (!m) return null
    m.road = 'S'
    // terrasse, obstacles, jardin
    if (p.garden && p.terrace) placeTerrace(rng, m)
    if (p.nObst && !placeObstacles(rng, m, p.nObst)) return null
    placeGarden(rng, m, p)
    placeWindows(rng, m)
    if (p.floors === 2) { if (!placeStairs(rng, m)) return null } else m.keep = (() => { const k = new Set(); m.rooms.forEach((r) => r.op.forEach((op) => { if (op.k === 'd') { const c = A.opCells(r, op); k.add(ck(r.f, c.inside[0], c.inside[1])); k.add(ck(r.f, c.outside[0], c.outside[1])) } })); return k })()
    if (p.furniture && !placeFurniture(rng, m)) return null
    if (p.floors === 2 && !p.furniture && !m.items.some((i) => i.t === 'escalier')) return null

    // transformation selon la route
    m.nbSides = m.nb ? [m.nb] : []
    if (rng.chance(0.5)) applyTransform(m, 'flipX')
    const roadFinal = rng.pick(['N', 'S', 'E', 'W'])
    if (roadFinal === 'N') applyTransform(m, 'flipY')
    else if (roadFinal === 'E') applyTransform(m, 'tr')
    else if (roadFinal === 'W') { applyTransform(m, 'tr'); applyTransform(m, 'flipX') }
    if (m.road !== roadFinal) return null

    const rooms = m.rooms.map((r) => A.makeRoom(r.id, r.type, r.x, r.y, r.w, r.h, r.op.map(A.opStr), r.f))
    const items = m.items.map((it) => A.makeItem(it.id, it.t, it.x, it.y, it.r, it.f))
    const L0 = { w: m.W, h: m.H, road: m.road, floors: p.floors, obstacles: m.obstacles, neighbors: m.nbSides.length ? m.nbSides : undefined, solution: { rooms, items }, muts: [] }
    if (!L0.neighbors) delete L0.neighbors
    const P = L0.solution
    const base = A.evaluate(Object.assign({}, L0, { criteria: [] }), P)
    if (!base.requiredOk) return null
    {
      const an = base.analysis
      if (an.info.some((x) => x.bad.length)) return null
    }

    // critères candidats vrais pour la solution
    const ctx = { rng }
    const { pool, cost } = buildPool(L0, P, ctx)
    if (pool.length < p.req) { /* trop peu de faits : on continue avec ce qu'on a */ }

    // mutations : chacune doit casser au moins un critère candidat
    const probeBase = Object.assign({}, L0, { criteria: pool.map((e) => e.c) })
    const failOf = (muts) => {
      const lv = Object.assign({}, probeBase, { muts })
      const st = relocate(lv, A.applyMutations(P, muts))
      const ev = A.evaluate(lv, st)
      if (!geomOk(ev.analysis)) return null
      return new Set(ev.list.filter((x) => !x.ok && /^p\d+$/.test(x.id)).map((x) => x.id))
    }
    const cands = mutationCandidates(rng, L0, P)
    const good = []
    for (const c of cands) {
      const f = failOf([c.m])
      if (f && f.size) good.push({ c, fails: f })
    }
    const byKind = {}
    for (const g of rng.shuffle(good)) (byKind[g.c.kind] = byKind[g.c.kind] || []).push(g)
    const kinds = Object.keys(byKind).sort()
    const chosen = []
    const busy = new Set()
    const covered = new Set()
    const keyOf = (m) => (m.m === 'rmop' || m.m === 'addop' ? m.id + ':' + m.op : m.id)
    const structural = (m) => ['move', 'size', 'type', 'floor', 'del'].includes(m.m)
    const target = p.nMut
    let guard = 0
    while (chosen.length < target && guard++ < 200) {
      const order = rng.shuffle(kinds)
      let progressed = false
      for (const k of order) {
        if (chosen.length >= target) break
        const lst = byKind[k]
        const idx = lst.findIndex((g) => {
          const m = g.c.m
          const kk = structural(m) ? 'S:' + m.id : (m.m === 'imove' || m.m === 'idel' || m.m === 'irot' || m.m === 'itype' || m.m === 'ifloor') ? 'I:' + m.id : keyOf(m)
          if (busy.has(kk)) return false
          if (m.m === 'rmop' || m.m === 'addop') { if (busy.has('S:' + m.id) && structural(m)) return false }
          for (const f of g.fails) if (!covered.has(f)) return true
          return false
        })
        if (idx < 0) continue
        const g = lst.splice(idx, 1)[0]
        const m = g.c.m
        busy.add(structural(m) ? 'S:' + m.id : (m.m === 'imove' || m.m === 'idel' || m.m === 'irot' || m.m === 'itype' || m.m === 'ifloor') ? 'I:' + m.id : keyOf(m))
        // un meuble supprimé ne peut plus être déplacé, une pièce déplacée ne perd pas ses portes dans la foulée
        chosen.push(g)
        g.fails.forEach((f) => covered.add(f))
        progressed = true
      }
      if (!progressed) break
    }
    // validation globale des mutations : géométrie propre
    let muts = chosen.map((g) => g.c.m)
    while (muts.length) {
      const f = failOf(muts)
      if (f) break
      muts.pop(); chosen.pop()
    }
    if (muts.length < 3) return null
    const allFails = failOf(muts)
    // ----- sélection des critères obligatoires
    const taken = new Set()
    const sel = []
    const take = (e) => { if (taken.has(e.sig)) return false; taken.add(e.sig); sel.push(e); return true }
    const poolShuffled = rng.shuffle(pool)
    poolShuffled.filter((e) => e.core).forEach(take)
    const CAP = { count: Math.max(3, Math.ceil(p.req * 0.3)), size: Math.ceil(p.req * 0.25), win: Math.ceil(p.req * 0.3), rel: Math.ceil(p.req * 0.3), furn: Math.ceil(p.req * 0.4), garden: Math.ceil(p.req * 0.35), dist: 3, core: 5 }
    const cnt = {}
    sel.forEach((e) => (cnt[e.group] = (cnt[e.group] || 0) + 1))
    const canAdd = (e) => (cnt[e.group] || 0) < (CAP[e.group] || 4)
    const addSel = (e, force) => { if (!force && !canAdd(e)) return false; if (!take(e)) return false; cnt[e.group] = (cnt[e.group] || 0) + 1; return true }
    for (const g of chosen) {
      const ids = rng.shuffle([...g.fails])
      let ok = false
      for (const id of ids) { const e = pool.find((x) => x.pid === id); if (e && !taken.has(e.sig) && addSel(e, false)) { ok = true; break } }
      if (!ok) for (const id of ids) { const e = pool.find((x) => x.pid === id); if (e && addSel(e, true)) { ok = true; break } ; if (e && taken.has(e.sig) && sel.includes(e)) { ok = true; break } }
    }
    // quelques autres critères en échec
    for (const id of rng.shuffle([...allFails])) { if (sel.length >= Math.ceil(p.req * 0.6)) break; const e = pool.find((x) => x.pid === id); if (e && rng.chance(0.4)) addSel(e, false) }
    for (const e of poolShuffled) { if (sel.length >= p.req - 1) break; addSel(e, false) }
    // budget
    const pct = p.pct
    let B2 = Math.ceil(cost) + rng.int(0, 1)
    let B1 = Math.max(Math.ceil(cost * (1 + pct)), B2 + 3)
    sel.sort((a, b) => 0)
    // ----- bonus
    const rest = poolShuffled.filter((e) => !taken.has(e.sig) && !e.core)
    const bonuses = []
    const bGroups = new Set()
    const wishy = rest.filter((e) => ['rel', 'garden', 'furn', 'win', 'dist', 'size'].includes(e.group))
    for (const e of wishy) { if (bonuses.length >= 1) break; if (!bGroups.has(e.group)) { bonuses.push(e); bGroups.add(e.group); taken.add(e.sig) } }
    const useBudgetBonus = rng.chance(0.55) || bonuses.length < 2
    // ----- twist
    let twist = null
    const twistEntries = []
    if (p.twist) {
      const tGroups = new Set()
      for (const e of rest.filter((x) => !['count', 'size'].includes(x.group)).concat(rest)) { if (twistEntries.length >= 2) break; if (taken.has(e.sig) || tGroups.has(e.group)) continue; twistEntries.push(e); tGroups.add(e.group); taken.add(e.sig) }
      if (twistEntries.length < 1) p.twist = false
    }
    if (!useBudgetBonus) { for (const e of rest) { if (bonuses.length >= 2) break; if (!taken.has(e.sig)) { bonuses.push(e); taken.add(e.sig) } } }

    // ----- numérotation
    const crit = []
    let n = 0
    const stamp = (e, extra) => { const c = Object.assign({}, e.c, extra); delete c.id; return c }
    const idBase = (c, id) => Object.assign({ id }, c)
    sel.forEach((e) => crit.push(idBase(stamp(e), 'c' + ++n)))
    crit.push(idBase({ kind: 'budget', max: B1, text: `Budget : ${B1} k€ maximum`, hint: 'Chaque fenêtre, chaque porte, chaque m² et chaque meuble coûtent de l’argent.' }, 'c' + ++n))
    // l'ordre de présentation : entrée/budget placés à la fin comme dans les niveaux écrits à la main
    const bonusCrit = []
    let bn = 0
    bonuses.slice(0, 2).forEach((e) => { const c = stamp(e); c.text = 'Souhait : ' + low(c.text); bonusCrit.push(Object.assign({ id: 'b' + ++bn, bonus: true }, c)) })
    if (useBudgetBonus && bonusCrit.length < 2) bonusCrit.push({ id: 'b' + ++bn, bonus: true, kind: 'budget', max: B2, text: `Souhait : rester sous ${B2} k€`, hint: 'Un peu moins cher encore.' })
    if (bonusCrit.length < 2) for (const e of rest) { if (bonusCrit.length >= 2) break; if (!taken.has(e.sig)) { taken.add(e.sig); const c = stamp(e); c.text = 'Souhait : ' + low(c.text); bonusCrit.push(Object.assign({ id: 'b' + ++bn, bonus: true }, c)) } }
    if (bonusCrit.length < 2) return null
    let twistObj
    if (p.twist) {
      const tc = []
      let tn = 0
      twistEntries.forEach((e) => { const c = stamp(e); c.text = 'NOUVEAU : ' + low(c.text); tc.push(Object.assign({ id: 't' + ++tn }, c)) })
      const B3 = Math.max(Math.ceil(cost), B1 - rng.int(4, 8))
      const wants = twistEntries.map((e) => e.want).filter(Boolean)
      if (B3 <= B1 - 2 && B3 >= Math.ceil(cost)) tc.push({ id: 't' + ++tn, kind: 'budget', max: B3, text: `NOUVEAU : budget abaissé à ${B3} k€`, hint: 'Retire ce qui est superflu.' })
      if (tc.length) {
        const msg = `Réflexion faite, ${wants.length ? 'je voudrais aussi ' + joinFr(wants) + '... et ' : ''}j’ai revu mes comptes : il faut que ça coûte moins cher !`
        twistObj = { message: msg, criteria: tc }
      }
    }

    // ----- client, titre, histoire
    const wantsAll = [...sel.filter((e) => e.want).map((e) => e), ...[]]
    const failedWants = chosen.flatMap((g) => [...g.fails].map((id) => pool.find((x) => x.pid === id))).filter((e) => e && e.want && sel.includes(e))
    const rest2 = wantsAll.filter((e) => !failedWants.includes(e))
    const pickWants = []
    const wseen = new Set()
    for (const e of rng.shuffle(failedWants).concat(rng.shuffle(rest2))) { if (pickWants.length >= (d >= 4 ? 4 : d >= 2 ? 3 : 2)) break; if (wseen.has(e.want)) continue; wseen.add(e.want); pickWants.push(e.want) }
    const wheel = !!items.find((i) => i.t === 'rampe')
    const client = makeClient(rng, p, { ramp: wheel, senior: wheel && rng.chance(0.5) })
    const budgetLine = d >= 4 ? rng.pick([' Et attention au budget : pas un euro de trop !', ' Mon budget est serré, je compte sur vous.']) : ''
    const quote = `${rng.pick(client.arch.intro)}${pickWants.length ? ' Il me faut ' + joinFr(pickWants) + '.' : ''}${budgetLine}`.trim()
    const obsFr = { tree: 'un arbre protégé', pond: 'une mare', rock: 'un rocher', zone: 'une zone interdite de construction' }
    const story = [
      rng.pick(client.arch.story).replace('{n}', client.short),
      m.obstacles.length ? `Le terrain comporte ${joinFr([...new Set(m.obstacles.map((o) => obsFr[o.kind]))])} : ${m.obstacles.length > 1 ? 'on ne peut pas construire dessus' : 'on ne peut pas construire dessus'}.` : '',
      m.nbSides.length ? `Une maison voisine longe le terrain côté ${SIDE_FR[m.nbSides[0]]}.` : '',
      wheel ? `${client.short} se déplace en fauteuil roulant : l’accès doit être de plain-pied.` : '',
      p.floors === 2 ? 'La maison aura deux niveaux : utilise les onglets « Rez-de-chaussée » et « Étage » au-dessus du plan.' : '',
      items.some((i) => !ITEMS[i.t].garden && !ITEMS[i.t].stairs) ? 'Pense aux meubles : un meuble doit tenir entièrement dans sa pièce, sans toucher un autre.' : '',
      twistObj ? 'Attention : ce client a tendance à changer d’avis en cours de projet.' : '',
      'Un plan a été dessiné à la hâte : il y a des erreurs à corriger.',
    ].filter(Boolean).join(' ')
    const dd = /^[AEIOUÉÈÊÎÏÔÂ]/.test(client.short) ? 'd’' : 'de '
    const titleOpts = [`La maison ${dd}${client.short}`, `Chez ${client.short}`, p.floors === 2 ? `Le duplex ${dd}${client.short}` : `Le projet ${dd}${client.short}`]
    if (client.arch.hh === 'family') titleOpts.push(`La maison ${client.surn}`)
    const title = client.short.startsWith('La famille') ? `Chez ${client.short.replace('La famille ', 'les ')}` : rng.pick(titleOpts)

    const palette = [...new Set(items.map((i) => i.t))]
    if (p.floors === 2 && !palette.includes('escalier')) palette.push('escalier')
    if (palette.includes('escalier') && !palette.includes('escalier_col')) palette.push('escalier_col')
    const req = crit.length + (twistObj ? twistObj.criteria.length : 0)
    const level = {
      id: `g-${seed}-${d}`, title, w: m.W, h: m.H, road: m.road, floors: p.floors, budget: B1, par: Math.max(3, muts.length + (p.floors === 2 ? 1 : 0)),
      client: { name: client.name, age: client.age, job: client.job, quote, look: client.look },
      story, obstacles: m.obstacles, solution: { rooms, items }, muts, criteria: crit.concat(bonusCrit),
    }
    if (palette.length) level.palette = palette
    if (m.nbSides.length) level.neighbors = m.nbSides
    if (twistObj) level.twist = twistObj
    level.goldTime = 60 + 14 * req
    level.parMoves = level.par * 4
    level.gen = { seed, difficulty: d, attempt: att }
    const issues = verify(level)
    if (issues.length) return { level, issues }
    return { level, issues: [] }
  }

  // Vérifie qu'un niveau est valide (mêmes contrôles que gen-tests.js)
  function verify(lv) {
    const issues = []
    const sol = A.evaluate(lv, lv.solution, { twist: true })
    const base = A.evaluate(lv, lv.solution)
    const st = A.evaluate(lv, startPlan(lv))
    sol.list.filter((x) => !x.ok).forEach((x) => issues.push(`solution échoue : ${x.id} ${x.text} -> ${x.detail}`))
    if (!base.requiredOk) issues.push('solution (liste de base) échoue')
    const fails = st.list.filter((x) => x.required && !x.ok && /^c\d+$/.test(x.id))
    if (fails.length < 3) issues.push(`départ : seulement ${fails.length} critères en échec`)
    if (st.requiredOk) issues.push('le départ est déjà gagnant')
    if (!geomOk(st.analysis)) issues.push('le plan de départ chevauche / sort du terrain / est dans le vide')
    const a = sol.analysis
    lv.solution.rooms.forEach((r, i) => { if (a.info[i].bad.length) issues.push('ouverture invalide dans la solution : ' + r.id) })
    if (lv.criteria.filter((c) => !c.bonus).length < 8) issues.push('moins de 8 critères obligatoires')
    if (lv.criteria.filter((c) => c.bonus).length < 2) issues.push('moins de 2 bonus')
    return issues
  }

  function generate(seed, difficulty) {
    const d = Math.max(1, Math.min(5, Math.round(difficulty || 1)))
    const s = typeof seed === 'string' ? hashStr(seed) : seed >>> 0
    let lastIssues = []
    for (let att = 0; att < 80; att++) {
      const r = attempt(s, d, att)
      if (r && !r.issues.length) return JSON.parse(JSON.stringify(r.level))
      if (r) lastIssues = r.issues
    }
    throw new Error(`ArchiGen : impossible de générer le niveau (seed ${seed}, difficulté ${d}) ${lastIssues.join(' ; ')}`)
  }

  // difficulté selon le jour de la semaine (dimanche = 0)
  const DAILY_DIFF = [5, 1, 2, 3, 3, 4, 5]
  function daily(dateString) {
    const ds = String(dateString)
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ds)
    const day = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : hashStr(ds) % 7
    const lv = generate(hashStr(ds), DAILY_DIFF[day])
    lv.id = 'j-' + ds
    lv.daily = ds
    return lv
  }

  const G = { generate, daily, startPlan, verify, hash: hashStr, mulberry32 }
  A.Generator = G
  return G
})




