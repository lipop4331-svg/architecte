// Moteur de règles du jeu « L'Architecte » : analyse un plan et vérifie les critères du client.
// Un plan = { rooms: [pièces], items: [meubles, escaliers, éléments de jardin] }.
// Utilisable dans le navigateur (window.Archi) et dans Node (tests).
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.Archi = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  // Types de pièces : prix au m² (en k€) et couleur
  const TYPES = {
    salon: { label: 'Salon', color: '#f1c27d', price: 1.0 },
    cuisine: { label: 'Cuisine', color: '#8fd19e', price: 1.8 },
    chambre: { label: 'Chambre', color: '#9fc1f0', price: 1.0, bedroom: true },
    sdb: { label: 'Salle de bain', color: '#8fdde6', price: 2.2 },
    bureau: { label: 'Bureau', color: '#cdb0ee', price: 1.0 },
    couloir: { label: 'Couloir', color: '#e3d8c8', price: 0.7 },
    garage: { label: 'Garage', color: '#c0c6cd', price: 0.6 },
  }

  // Meubles, escalier et jardin : taille en cases (1 case = 1 m), prix en k€
  const ITEMS = {
    lit1: { label: 'Lit simple', w: 1, h: 2, cat: 'Chambre', rooms: ['chambre'], price: 0.3, color: '#b9a0e0' },
    lit2: { label: 'Lit double', w: 2, h: 2, cat: 'Chambre', rooms: ['chambre'], price: 0.5, color: '#a98fd6' },
    armoire: { label: 'Armoire', w: 2, h: 1, cat: 'Chambre', rooms: ['chambre'], price: 0.4, color: '#b58a5a' },
    canape: { label: 'Canapé', w: 3, h: 1, cat: 'Salon', rooms: ['salon'], price: 0.8, color: '#e07a7a' },
    table: { label: 'Table à manger', w: 2, h: 2, cat: 'Salon', rooms: ['salon', 'cuisine'], price: 0.4, color: '#c79a62' },
    bureau_m: { label: 'Poste de travail', w: 2, h: 1, cat: 'Bureau', rooms: ['bureau', 'chambre', 'salon'], price: 0.3, color: '#8e9bb0' },
    evier: { label: 'Évier', w: 2, h: 1, cat: 'Cuisine', rooms: ['cuisine'], price: 0.5, color: '#9fb4c6' },
    plaque: { label: 'Plaques de cuisson', w: 1, h: 1, cat: 'Cuisine', rooms: ['cuisine'], price: 0.4, color: '#6e7480' },
    frigo: { label: 'Frigo', w: 1, h: 1, cat: 'Cuisine', rooms: ['cuisine'], price: 0.5, color: '#dfe7ee' },
    baignoire: { label: 'Baignoire', w: 2, h: 1, cat: 'Salle de bain', rooms: ['sdb'], price: 0.9, color: '#f2f6f8' },
    lavabo: { label: 'Lavabo', w: 1, h: 1, cat: 'Salle de bain', rooms: ['sdb'], price: 0.3, color: '#e3eef2' },
    wc: { label: 'WC', w: 1, h: 1, cat: 'Salle de bain', rooms: ['sdb', 'couloir'], price: 0.3, color: '#eef0f2' },
    voiture: { label: 'Voiture', w: 2, h: 3, cat: 'Garage', rooms: ['garage'], price: 0, color: '#d4493e' },
    escalier: { label: 'Escalier', w: 1, h: 3, cat: 'Escalier', stairs: true, price: 2.0, color: '#d8c3a0' },
    terrasse: { label: 'Terrasse', w: 3, h: 2, cat: 'Jardin', garden: true, price: 1.5, color: '#d9b98a' },
    piscine: { label: 'Piscine', w: 3, h: 4, cat: 'Jardin', garden: true, price: 6, color: '#6bc3ec' },
    arbre: { label: 'Arbre', w: 2, h: 2, cat: 'Jardin', garden: true, price: 0.3, color: '#5aa84f' },
    rampe: { label: 'Rampe d’accès', w: 3, h: 1, cat: 'Accès', garden: true, price: 0.8, color: '#cdbf9f' },
    potager: { label: 'Potager', w: 2, h: 2, cat: 'Jardin', garden: true, price: 0.2, color: '#a97c50' },
  }

  const DIRS = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }
  const SIDE_NAME = { N: 'nord', S: 'sud', W: 'ouest', E: 'est' }
  const OPEN_PRICE = { w: 0.6, d: 0.4 } // fenêtre, porte

  // Une ouverture : { s: côté (N/S/E/W), o: position le long du côté, k: 'w' fenêtre ou 'd' porte }
  const parseOp = (str) => ({ s: str[0], o: parseInt(str.slice(1, -1), 10), k: str.slice(-1) })
  const opStr = (op) => `${op.s}${op.o}${op.k}`
  const makeRoom = (id, type, x, y, w, h, ops = [], f = 0) => ({ id, type, x, y, w, h, f, op: ops.map(parseOp) })
  const makeItem = (id, t, x, y, r = 0, f = 0) => ({ id, t, x, y, r, f })
  const toPlan = (p) => (Array.isArray(p) ? { rooms: p, items: [] } : { rooms: p.rooms || [], items: p.items || [] })
  const clone = (p) => {
    const q = toPlan(p)
    const rooms = q.rooms.map((r) => ({ ...r, f: r.f || 0, op: r.op.map((o) => ({ ...o })) }))
    const items = q.items.map((i) => ({ ...i }))
    return Array.isArray(p) ? rooms : { rooms, items }
  }
  const itemDims = (it) => (it.r ? [ITEMS[it.t].h, ITEMS[it.t].w] : [ITEMS[it.t].w, ITEMS[it.t].h])
  function itemCells(it) {
    const [w, h] = itemDims(it)
    const out = []
    for (let y = it.y; y < it.y + h; y++) for (let x = it.x; x < it.x + w; x++) out.push([x, y])
    return out
  }

  // Case (dans la pièce) qui touche l'ouverture, et case juste de l'autre côté du mur
  function opCells(room, op) {
    let cx, cy
    if (op.s === 'N') { cx = room.x + op.o; cy = room.y }
    else if (op.s === 'S') { cx = room.x + op.o; cy = room.y + room.h - 1 }
    else if (op.s === 'W') { cx = room.x; cy = room.y + op.o }
    else { cx = room.x + room.w - 1; cy = room.y + op.o }
    const [dx, dy] = DIRS[op.s]
    return { inside: [cx, cy], outside: [cx + dx, cy + dy] }
  }
  const sideLength = (room, s) => (s === 'N' || s === 'S' ? room.w : room.h)
  const opInRange = (room, op) => op.o >= 0 && op.o < sideLength(room, op.s)

  // Clé d'un bord de case (par étage) : 'h' = bord haut de la case (x,y), 'v' = bord gauche
  function edgeKey(room, op) {
    const f = room.f || 0
    if (op.s === 'N') return `${f}|h:${room.x + op.o},${room.y}`
    if (op.s === 'S') return `${f}|h:${room.x + op.o},${room.y + room.h}`
    if (op.s === 'W') return `${f}|v:${room.x},${room.y + op.o}`
    return `${f}|v:${room.x + room.w},${room.y + op.o}`
  }

  // ---------- Mutations : on dérive un plan défectueux de la solution ----------
  function applyMutations(plan, muts) {
    const out = toPlan(clone(plan))
    for (const m of muts || []) {
      if (m.m === 'idel') { out.items = out.items.filter((x) => x.id !== m.id); continue }
      if (m.m === 'imove' || m.m === 'irot' || m.m === 'ifloor' || m.m === 'itype') {
        const it = out.items.find((x) => x.id === m.id)
        if (!it) continue
        if (m.m === 'imove') { it.x += m.dx; it.y += m.dy }
        else if (m.m === 'irot') it.r = it.r ? 0 : 1
        else if (m.m === 'ifloor') it.f = m.f
        else it.t = m.t
        continue
      }
      if (m.m === 'del') { out.rooms = out.rooms.filter((x) => x.id !== m.id); continue }
      const r = out.rooms.find((x) => x.id === m.id)
      if (!r) continue
      if (m.m === 'move') { r.x += m.dx; r.y += m.dy }
      else if (m.m === 'type') r.type = m.type
      else if (m.m === 'size') { r.w = m.w; r.h = m.h }
      else if (m.m === 'floor') r.f = m.f
      else if (m.m === 'rmop') r.op = r.op.filter((o) => opStr(o) !== m.op)
      else if (m.m === 'addop') r.op.push(parseOp(m.op))
    }
    return out
  }

  // ---------- Analyse d'un plan ----------
  function analyze(level, planIn) {
    const { rooms, items } = toPlan(planIn)
    const owner = new Map() // 'étage:x,y' -> index de pièce
    let overlap = false, outside = false, onObstacle = false, unsupported = false
    const obs = level.obstacles || []
    rooms.forEach((r, i) => {
      const f = r.f || 0
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          const k = `${f}:${x},${y}`
          if (owner.has(k)) overlap = true
          else owner.set(k, i)
          if (x < 0 || y < 0 || x >= level.w || y >= level.h) outside = true
          if (f === 0 && obs.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) onObstacle = true
        }
    })
    // L'étage doit reposer sur le rez-de-chaussée
    rooms.forEach((r) => {
      if ((r.f || 0) !== 1) return
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!owner.has(`0:${x},${y}`)) unsupported = true
    })

    // Meubles, escaliers, jardin
    const itemInfo = items.map(() => ({ ok: true, room: -1, room1: -1, reason: '' }))
    const occ = new Map() // 'étage:x,y' -> index de meuble
    const gardenOcc = new Map()
    const terraceCells = new Set()
    const rampCells = new Set()
    const bad = (i, why) => { if (itemInfo[i].ok) itemInfo[i].reason = why; itemInfo[i].ok = false }
    items.forEach((it, i) => {
      const d = ITEMS[it.t]
      if (!d) return bad(i, 'objet inconnu')
      const cells = itemCells(it)
      if (d.garden) {
        for (const [x, y] of cells) {
          const k = `${x},${y}`
          if (x < 0 || y < 0 || x >= level.w || y >= level.h) bad(i, 'hors du terrain')
          else if (owner.has(`0:${k}`)) bad(i, 'sur la maison')
          else if (obs.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) bad(i, 'sur un obstacle')
          if (gardenOcc.has(k)) { bad(i, 'chevauche un autre élément'); bad(gardenOcc.get(k), 'chevauche un autre élément') } else gardenOcc.set(k, i)
          if (it.t === 'terrasse') terraceCells.add(k)
          if (it.t === 'rampe') rampCells.add(k)
        }
        return
      }
      const floors = d.stairs ? (level.floors > 1 ? [0, 1] : [0]) : [it.f || 0]
      floors.forEach((f) => {
        let room = -2
        for (const [x, y] of cells) {
          const k = `${f}:${x},${y}`
          const o = owner.get(k)
          if (o === undefined) room = -1
          else if (room === -2) room = o
          else if (room !== -1 && room !== o) room = -1
          if (occ.has(k)) { bad(i, 'chevauche un autre meuble'); bad(occ.get(k), 'chevauche un autre meuble') } else occ.set(k, i)
        }
        if (room < 0) bad(i, d.stairs ? 'l’escalier doit être dans une pièce, à chaque étage' : 'doit être entièrement dans une pièce')
        // meuble : la pièce qui le contient ; escalier : pièce du bas (room) et pièce du haut (room1)
        if (d.stairs && f === 1) itemInfo[i].room1 = room
        else itemInfo[i].room = room
      })
    })

    const info = rooms.map((r) => ({ area: r.w * r.h, windows: [], doors: [], links: new Set(), adj: new Set(), ext: [], patio: [], ramp: [], bad: [] }))
    rooms.forEach((r, i) => {
      const f = r.f || 0
      r.op.forEach((op, oi) => {
        if (!opInRange(r, op)) return info[i].bad.push(oi)
        const [nx, ny] = opCells(r, op).outside
        const n = owner.get(`${f}:${nx},${ny}`)
        if (op.k === 'w') {
          if (n === undefined) info[i].windows.push(op)
          else info[i].bad.push(oi) // fenêtre sur un mur mitoyen : inutile
        } else if (op.k === 'd') {
          if (n === undefined) {
            if (f === 1) info[i].bad.push(oi) // pas de porte vers le vide à l'étage
            else if (terraceCells.has(`${nx},${ny}`)) { info[i].patio.push(op); info[i].doors.push(op) } // baie vers la terrasse
            else { info[i].ext.push(op); info[i].doors.push(op); if (rampCells.has(`${nx},${ny}`)) info[i].ramp.push(op) }
          } else if (n !== i) { info[i].links.add(n); info[n].links.add(i); info[i].doors.push(op) }
          else info[i].bad.push(oi)
        }
      })
      // pièces qui se touchent (même étage)
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++)
          for (const [dx, dy] of Object.values(DIRS)) {
            const n = owner.get(`${f}:${x + dx},${y + dy}`)
            if (n !== undefined && n !== i) { info[i].adj.add(n); info[n].adj.add(i) }
          }
    })
    // Les escaliers relient les pièces des deux étages
    items.forEach((it, i) => {
      if (!ITEMS[it.t]?.stairs || !itemInfo[i].ok) return
      const a = itemInfo[i].room, b = itemInfo[i].room1
      if (a >= 0 && b >= 0 && a !== b) { info[a].links.add(b); info[b].links.add(a) }
    })
    return { owner, overlap, outside, onObstacle, unsupported, info, itemInfo, items }
  }

  function cost(plan, a) {
    const { rooms, items } = toPlan(plan)
    let c = 0
    rooms.forEach((r, i) => {
      c += r.w * r.h * (TYPES[r.type]?.price ?? 1)
      c += a.info[i].windows.length * OPEN_PRICE.w + a.info[i].doors.length * OPEN_PRICE.d
    })
    items.forEach((it) => { c += ITEMS[it.t]?.price ?? 0 })
    return Math.round(c * 10) / 10
  }

  // Pièces atteignables depuis l'entrée ; si 'skipBedrooms', on ne traverse pas les chambres
  function reach(rooms, a, skipBedrooms) {
    const seen = new Set()
    const queue = []
    rooms.forEach((r, i) => {
      if (a.info[i].ext.length && !(skipBedrooms && TYPES[r.type]?.bedroom)) { seen.add(i); queue.push(i) }
    })
    while (queue.length) {
      const i = queue.shift()
      for (const j of a.info[i].links) {
        if (seen.has(j)) continue
        seen.add(j)
        if (!(skipBedrooms && TYPES[rooms[j].type]?.bedroom)) queue.push(j) // une chambre est atteinte mais pas traversée
      }
    }
    return seen
  }

  const ofType = (rooms, t, f) => rooms.map((r, i) => [r, i]).filter(([r]) => r.type === t && (f === undefined || (r.f || 0) === f))
  const lbl = (t) => (TYPES[t] ? TYPES[t].label.toLowerCase() : ITEMS[t] ? ITEMS[t].label.toLowerCase() : t)
  const centerOf = (it) => { const [w, h] = itemDims(it); return [it.x + w / 2, it.y + h / 2] }

  // ---------- Critères ----------
  function check(c, level, plan, a, totalCost) {
    const { rooms, items } = plan
    switch (c.kind) {
      case 'count': {
        const n = ofType(rooms, c.type, c.f).length
        return [n >= c.min && (c.max === undefined || n <= c.max), `${n} ${lbl(c.type)}${n > 1 ? 's' : ''}${c.f !== undefined ? (c.f ? ' à l’étage' : ' au rez-de-chaussée') : ''}`]
      }
      case 'area': {
        const list = ofType(rooms, c.type)
        const best = Math.max(0, ...list.map(([r]) => r.w * r.h))
        return [best >= c.min && (c.max === undefined || best <= c.max), best ? `${best} m²` : `pas de ${lbl(c.type)}`]
      }
      case 'totalArea': {
        const t = rooms.reduce((s, r) => s + r.w * r.h, 0)
        return [(c.min === undefined || t >= c.min) && (c.max === undefined || t <= c.max), `${t} m²`]
      }
      case 'budget':
        return [totalCost <= c.max, `${totalCost} k€ sur ${c.max} k€`]
      case 'window': {
        const list = ofType(rooms, c.type)
        if (!list.length) return [false, `pas de ${lbl(c.type)}`]
        const counts = list.map(([, i]) => a.info[i].windows.filter((w) => !c.side || w.s === c.side).length)
        const ok = c.any ? counts.some((n) => n >= (c.min ?? 1)) : counts.every((n) => n >= (c.min ?? 1))
        return [ok, counts.join(' / ') + ' fenêtre(s)']
      }
      case 'noWindowSide': {
        const list = ofType(rooms, c.type)
        const badOnes = list.filter(([, i]) => a.info[i].windows.some((w) => w.s === c.side))
        return [badOnes.length === 0 && list.length > 0, badOnes.length ? `${badOnes.length} avec fenêtre côté ${SIDE_NAME[c.side]}` : list.length ? 'ok' : `pas de ${lbl(c.type)}`]
      }
      case 'adjacent': {
        const ok = ofType(rooms, c.a).some(([, i]) => [...a.info[i].adj].some((j) => rooms[j].type === c.b))
        return [ok, ok ? 'collées' : 'pas côte à côte']
      }
      case 'link': {
        const ok = ofType(rooms, c.a).some(([, i]) => [...a.info[i].links].some((j) => rooms[j].type === c.b))
        return [ok, ok ? 'reliées par une porte' : 'pas de porte entre elles']
      }
      case 'awayFromRoad': {
        const list = ofType(rooms, c.type)
        const dist = (r) => ({ N: r.y, S: level.h - (r.y + r.h), W: r.x, E: level.w - (r.x + r.w) }[level.road])
        const ds = list.map(([r]) => dist(r))
        return [list.length > 0 && ds.every((d) => d >= c.d), list.length ? `à ${Math.min(...ds)} m de la route` : `pas de ${lbl(c.type)}`]
      }
      case 'reachable': {
        const seen = reach(rooms, a, false)
        const missing = rooms.length - seen.size
        return [rooms.length > 0 && missing === 0 && a.info.some((x) => x.ext.length), missing ? `${missing} pièce(s) inaccessible(s)` : 'tout est accessible']
      }
      case 'entrance': {
        const ext = []
        rooms.forEach((r, i) => a.info[i].ext.forEach((op) => ext.push(op.s)))
        const side = c.side === 'road' ? level.road : c.side
        const ok = ext.length === (c.n ?? 1) && (!side || ext.every((s) => s === side))
        return [ok, ext.length === 0 ? 'aucune entrée' : `${ext.length} entrée(s)${ext.length ? ' côté ' + [...new Set(ext)].map((s) => SIDE_NAME[s]).join(', ') : ''}`]
      }
      case 'noThrough': {
        const seen = reach(rooms, a, true)
        const badOnes = rooms.filter((r, i) => !TYPES[r.type]?.bedroom && !seen.has(i)).length
        return [rooms.length > 0 && badOnes === 0, badOnes ? 'il faut traverser une chambre' : 'aucune chambre à traverser']
      }
      case 'furn': {
        const n = items.filter((it, i) => it.t === c.item && a.itemInfo[i].ok && a.itemInfo[i].room >= 0 && (!c.room || rooms[a.itemInfo[i].room].type === c.room) && (c.f === undefined || (it.f || 0) === c.f)).length
        return [n >= (c.min ?? 1) && (c.max === undefined || n <= c.max), `${n} ${lbl(c.item)}${c.room ? ' en ' + lbl(c.room) : ''}`]
      }
      case 'furnRoom': {
        const list = ofType(rooms, c.room)
        const missing = list.filter(([, i]) => !items.some((it, k) => it.t === c.item && a.itemInfo[k].ok && (a.itemInfo[k].room === i || a.itemInfo[k].room1 === i))).length
        return [list.length > 0 && missing === 0, list.length ? (missing ? `${missing} ${lbl(c.room)}(s) sans ${lbl(c.item)}` : 'toutes équipées') : `pas de ${lbl(c.room)}`]
      }
      case 'garden': {
        const ok = items.filter((it, i) => it.t === c.item && a.itemInfo[i].ok && (!c.zone || zoneOf(level, it) === c.zone || c.zone === 'any')).length
        return [ok >= (c.min ?? 1), `${ok} ${lbl(c.item)}${c.zone ? ' côté ' + SIDE_NAME[c.zone] : ''}`]
      }
      case 'gardenAway': {
        const list = items.filter((it, i) => it.t === c.item && a.itemInfo[i].ok)
        const dist = (it) => { const [w, h] = itemDims(it); return { N: it.y, S: level.h - (it.y + h), W: it.x, E: level.w - (it.x + w) }[level.road] }
        const ds = list.map(dist)
        return [list.length > 0 && ds.every((d) => d >= c.d), list.length ? `à ${Math.min(...ds)} m de la route` : `pas de ${lbl(c.item)}`]
      }
      case 'windowsTotal': {
        const n = a.info.reduce((s, x) => s + x.windows.length, 0)
        return [(c.min === undefined || n >= c.min) && (c.max === undefined || n <= c.max), `${n} fenêtre(s) en tout`]
      }
      case 'minSide': {
        const list = ofType(rooms, c.type, c.f)
        const m = list.length ? Math.min(...list.map(([r]) => Math.min(r.w, r.h))) : 0
        return [list.length > 0 && m >= c.min, list.length ? `côté le plus court : ${m} m` : `pas de ${lbl(c.type)}`]
      }
      case 'exits': {
        const sides = []
        rooms.forEach((r, i) => a.info[i].ext.forEach((op) => sides.push(op.s)))
        const distinct = new Set(sides).size
        return [sides.length >= c.min && distinct >= (c.sides ?? 1), `${sides.length} sortie(s) sur ${distinct} côté(s)`]
      }
      case 'awayFromSide': {
        const list = ofType(rooms, c.type)
        const dist = (r) => ({ N: r.y, S: level.h - (r.y + r.h), W: r.x, E: level.w - (r.x + r.w) }[c.side])
        const ds = list.map(([r]) => dist(r))
        return [list.length > 0 && ds.every((d) => d >= c.d), list.length ? `à ${Math.min(...ds)} m du côté ${SIDE_NAME[c.side]}` : `pas de ${lbl(c.type)}`]
      }
      case 'nearSide': {
        const list = ofType(rooms, c.type)
        const dist = (r) => ({ N: r.y, S: level.h - (r.y + r.h), W: r.x, E: level.w - (r.x + r.w) }[c.side])
        const ds = list.map(([r]) => dist(r))
        return [list.length > 0 && ds.some((d) => d <= c.d), list.length ? `à ${Math.min(...ds)} m du côté ${SIDE_NAME[c.side]}` : `pas de ${lbl(c.type)}`]
      }
      case 'notAdjacent': {
        const list = ofType(rooms, c.a)
        const touch = list.filter(([, i]) => [...a.info[i].adj].some((j) => rooms[j].type === c.b)).length
        return [list.length > 0 && touch === 0, touch ? `${lbl(c.a)} collé à ${lbl(c.b)}` : 'séparés']
      }
      case 'ramp': {
        const ext = []
        rooms.forEach((r, i) => a.info[i].ext.forEach((op) => ext.push(a.info[i].ramp.includes(op))))
        return [ext.length > 0 && ext.every(Boolean), ext.length === 0 ? 'aucune entrée' : ext.every(Boolean) ? 'entrée avec rampe' : 'entrée sans rampe']
      }
      case 'patio': {
        const ok = ofType(rooms, c.room).some(([, i]) => a.info[i].patio.length > 0)
        return [ok, ok ? 'porte vers la terrasse' : `pas de porte du ${lbl(c.room)} vers une terrasse`]
      }
      default:
        return [true, '']
    }
  }
  function zoneOf(level, it) {
    const [cx, cy] = centerOf(it)
    // moitié du terrain où se trouve l'élément : on renvoie le côté le plus proche
    const d = { N: cy, S: level.h - cy, W: cx, E: level.w - cx }
    return Object.keys(d).sort((p, q) => d[p] - d[q])[0]
  }

  function evaluate(level, planIn, opts = {}) {
    const plan = toPlan(planIn)
    const a = analyze(level, plan)
    const total = cost(plan, a)
    const list = [
      {
        id: 'terrain', required: true, text: 'Respecter le terrain : pièces séparées, dans le terrain, hors obstacles',
        hint: 'Aucune pièce ne doit se chevaucher, sortir du terrain vert ou se poser sur un arbre ou une mare.',
        ok: !(a.overlap || a.outside || a.onObstacle),
        detail: a.overlap ? 'des pièces se chevauchent' : a.onObstacle ? 'une pièce est sur un obstacle' : a.outside ? 'une pièce sort du terrain' : 'ok',
      },
    ]
    if (level.floors > 1)
      list.push({
        id: 'struct', required: true, text: 'L’étage repose sur le rez-de-chaussée',
        hint: 'Chaque pièce de l’étage doit être entièrement au-dessus de pièces du rez-de-chaussée.',
        ok: !a.unsupported, detail: a.unsupported ? 'une pièce de l’étage est dans le vide' : 'ok',
      })
    if (plan.items.length || (level.palette && level.palette.length)) {
      const badItems = a.itemInfo.filter((x) => !x.ok)
      list.push({
        id: 'items', required: true, text: 'Meubles, escalier et jardin bien placés',
        hint: 'Un meuble doit tenir entièrement dans une pièce, sans chevaucher un autre. Un élément de jardin va hors de la maison. L’escalier doit tomber dans une pièce à chaque étage.',
        ok: badItems.length === 0, detail: badItems.length ? `${badItems.length} mal placé(s) : ${badItems[0].reason}` : 'ok',
      })
    }
    // Un client peut changer d'avis : opts.twist ajoute ses nouvelles demandes (level.twist.criteria)
    const all = level.criteria.concat(opts.twist && level.twist ? level.twist.criteria.map((c) => ({ ...c, twist: true })) : [])
    for (const c of all) {
      const [ok, detail] = check(c, level, plan, a, total)
      list.push({ id: c.id, required: !c.bonus, bonus: !!c.bonus, twist: !!c.twist, who: c.who, text: c.text, hint: c.hint || '', ok, detail })
    }
    const requiredOk = list.filter((x) => x.required).every((x) => x.ok)
    const bonusDone = list.filter((x) => x.bonus && x.ok).length
    const bonusTotal = list.filter((x) => x.bonus).length
    return { list, cost: total, requiredOk, bonusDone, bonusTotal, stars: requiredOk ? Math.min(3, 1 + bonusDone) : 0, analysis: a }
  }

  return { TYPES, ITEMS, DIRS, SIDE_NAME, OPEN_PRICE, parseOp, opStr, makeRoom, makeItem, toPlan, clone, applyMutations, analyze, evaluate, opCells, edgeKey, opInRange, sideLength, itemDims, itemCells }
})
