// L'Architecte : interface (plan 2D interactif, étages, meubles, jardin, critères, clients, chrono, vue 3D, niveaux).
;(function () {
  const A = window.Archi
  const { LEVELS, startPlan, CHAPTERS } = window.ArchiLevels
  const $ = (id) => document.getElementById(id)
  const C = 40 // pixels par case (1 case = 1 m)
  const PAD = 64 // marge autour du terrain (la route y est dessinée)
  const KEY = 'archi:v1'

  // ---------- Progression : étoiles, médailles, meilleurs scores ----------
  const emptyProgress = () => ({ stars: {}, best: {}, daily: {}, free: 0, name: '' })
  let progress = emptyProgress()
  try { progress = { ...emptyProgress(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch (e) { /* stockage indisponible */ }
  const cloud = () => (window.ArchiCloud && window.ArchiCloud.ready && window.ArchiCloud.user ? window.ArchiCloud : null)
  const saveProgress = () => {
    try { localStorage.setItem(KEY, JSON.stringify(progress)) } catch (e) { /* ignoré */ }
    clearTimeout(saveProgress.t)
    saveProgress.t = setTimeout(() => { const c = cloud(); if (c) c.saveProgress(progress).catch(() => {}) }, 1500)
  }
  // Fusionne deux sauvegardes (locale et en ligne) sans rien perdre : meilleures étoiles, meilleurs temps
  function mergeProgress(a, b) {
    const out = emptyProgress()
    out.name = a.name || b.name || ''
    out.free = Math.max(a.free || 0, b.free || 0)
    for (const id of new Set([...Object.keys(a.stars || {}), ...Object.keys(b.stars || {})])) out.stars[id] = Math.max((a.stars || {})[id] || 0, (b.stars || {})[id] || 0)
    for (const id of new Set([...Object.keys(a.best || {}), ...Object.keys(b.best || {})])) {
      const x = (a.best || {})[id], y = (b.best || {})[id]
      out.best[id] = x && y ? { time: Math.min(x.time, y.time), moves: Math.min(x.moves, y.moves), speed: !!(x.speed || y.speed), eco: !!(x.eco || y.eco) } : x || y
    }
    for (const d of new Set([...Object.keys(a.daily || {}), ...Object.keys(b.daily || {})])) {
      const x = (a.daily || {})[d], y = (b.daily || {})[d]
      out.daily[d] = x && y ? (x.stars > y.stars || (x.stars === y.stars && x.time <= y.time) ? x : y) : x || y
    }
    return out
  }
  const starsOf = (id) => progress.stars[id] || 0
  const bestOf = (id) => progress.best[id] || null
  const unlocked = (i) => i === 0 || starsOf(LEVELS[i - 1].id) > 0

  const S = {
    tool: 'move', idx: 0, level: null, rooms: [], items: [], floor: 0, history: [], sel: null, selItem: null,
    hints: new Set(), result: null, drag: null, view: null, nextId: 1,
    twist: false, t0: 0, tEnd: null, moves: 0, modalOpen: false,
  }
  const plan = () => ({ rooms: S.rooms, items: S.items })
  const floorsOf = (lv) => lv.floors || 1
  const clientsOf = (lv) => lv.clients || [lv.client]
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const starSvg = (on, cls = 'star') =>
    `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="${on ? '#f5b82e' : '#e5dcc8'}" stroke="${on ? '#c98a0a' : '#cfc4aa'}" stroke-width="1.4" stroke-linejoin="round"/></svg>`
  const starsRow = (n, total = 3, cls = 'star') => `<span class="stars">${Array.from({ length: total }, (_, i) => starSvg(i < n, cls)).join('')}</span>`
  const clockIc = (on) => `<svg class="medal ${on ? 'on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="${on ? '#ffd24d' : '#e5dcc8'}" stroke="${on ? '#b8860b' : '#cfc4aa'}" stroke-width="1.6"/><path d="M12 8v5l3 2M9.5 3h5" fill="none" stroke="${on ? '#7a5a00' : '#bbb09a'}" stroke-width="1.8" stroke-linecap="round"/></svg>`
  const ecoIc = (on) => `<svg class="medal ${on ? 'on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18l8-8 3 3-8 8H5z" fill="${on ? '#9ad0ff' : '#e5dcc8'}" stroke="${on ? '#2f7fc0' : '#cfc4aa'}" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 8l2-4 4 4-4 2z" fill="${on ? '#5aa6e8' : '#e5dcc8'}" stroke="${on ? '#2f7fc0' : '#cfc4aa'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`

  // ---------- Portraits des clients ----------
  function fallbackAvatar(look = {}) {
    return `<svg width="84" height="84" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#cfe3f5"/><path d="M12 62c2-14 12-20 20-20s18 6 20 20z" fill="#1f3a5f"/>
      <circle cx="32" cy="29" r="14" fill="${look.skin || '#f2c9a5'}"/>
      <path d="M17 29c0-13 8-18 15-18s15 5 15 18c-3-7-8-10-15-10s-12 3-15 10z" fill="${look.hair || '#555'}"/>
      <circle cx="26.5" cy="30" r="1.8" fill="#1f3a5f"/><circle cx="37.5" cy="30" r="1.8" fill="#1f3a5f"/>
      <path d="M26 36c3 3 9 3 12 0" fill="none" stroke="#1f3a5f" stroke-width="2" stroke-linecap="round"/></svg>`
  }
  const portraitHtml = (look, mood, size) => (window.Portrait ? window.Portrait.svg(look || {}, mood, size) : fallbackAvatar(look))

  // ---------- Accueil ----------
  function tagsOf(lv) {
    const t = []
    if (floorsOf(lv) > 1) t.push('Étage')
    const pal = lv.palette || []
    if (pal.some((k) => A.ITEMS[k].garden && k !== 'rampe')) t.push('Jardin')
    if (pal.some((k) => !A.ITEMS[k].garden && !A.ITEMS[k].stairs)) t.push('Meubles')
    if (pal.includes('rampe')) t.push('Accessibilité')
    if (lv.neighbors) t.push('Voisins')
    if (lv.clients) t.push('2 clients')
    if (lv.twist) t.push('Imprévu')
    if ((lv.obstacles || []).some((o) => o.kind === 'zone' || o.kind === 'rock')) t.push('Terrain difficile')
    return t
  }

  // Petit plan de la solution, dessiné sur chaque carte de niveau
  function thumb(lv) {
    const P = A.toPlan(lv.solution)
    const road = { N: [0, -2, lv.w, 1.6], S: [0, lv.h + 0.4, lv.w, 1.6], W: [-2, 0, 1.6, lv.h], E: [lv.w + 0.4, 0, 1.6, lv.h] }[lv.road]
    let s = `<rect x="${road[0]}" y="${road[1]}" width="${road[2]}" height="${road[3]}" fill="#8a9099"/>`
    s += `<rect x="0" y="0" width="${lv.w}" height="${lv.h}" fill="#dfeccb" stroke="#7aa35e" stroke-width="0.25"/>`
    ;(lv.obstacles || []).forEach((o) => (s += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${o.kind === 'pond' ? '#7cc4ee' : o.kind === 'tree' ? '#5aa84f' : o.kind === 'rock' ? '#9aa0a8' : '#d9cba6'}" rx="0.4"/>`))
    P.rooms.filter((r) => (r.f || 0) === 0).forEach((r) => (s += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${A.TYPES[r.type].color}" stroke="#1f3a5f" stroke-width="0.28"/>`))
    P.items.filter((i) => A.ITEMS[i.t].garden).forEach((i) => { const [w, h] = A.itemDims(i); s += `<rect x="${i.x}" y="${i.y}" width="${w}" height="${h}" fill="${A.ITEMS[i.t].color}" rx="0.3" opacity=".9"/>` })
    return `<svg viewBox="${Math.min(-2, 0) - 0.3} ${-2.3} ${lv.w + 4.6} ${lv.h + 4.6}" class="thumb" aria-hidden="true">${s}</svg>`
  }

  function renderHome() {
    const next = LEVELS.findIndex((lv, i) => unlocked(i) && starsOf(lv.id) === 0)
    const cur = next === -1 ? LEVELS.length - 1 : next
    $('hero').innerHTML = `<div class="hero-text"><h1>Tu es l’architecte.</h1>
      <p>Chaque client t’a confié un plan plein d’erreurs. Déplace les pièces, pose fenêtres, portes, meubles, escalier et jardin, respecte tous ses critères et son budget. Plus tu réalises ses souhaits et plus vite tu travailles, plus tu gagnes d’étoiles et de médailles.</p>
      <button class="btn primary big" id="bContinue">${starsOf(1) === 0 && cur === 0 ? 'Commencer' : `Reprendre : niveau ${LEVELS[cur].id}`}</button></div>
      <svg class="hero-art" viewBox="0 0 220 150" aria-hidden="true">
        <rect x="8" y="118" width="204" height="6" rx="3" fill="#7aa35e"/>
        <path d="M30 118V62l55-36 55 36v56" fill="#fffdf8" stroke="#1f3a5f" stroke-width="3" stroke-linejoin="round"/>
        <path d="M22 66l63-42 63 42" fill="none" stroke="#e07a3a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="76" y="84" width="22" height="34" rx="2" fill="#e0561a" stroke="#1f3a5f" stroke-width="2.5"/>
        <rect x="44" y="76" width="22" height="20" fill="#bfe3fa" stroke="#1f3a5f" stroke-width="2.5"/><rect x="106" y="76" width="22" height="20" fill="#bfe3fa" stroke="#1f3a5f" stroke-width="2.5"/>
        <path d="M150 118V80l36 0v38" fill="#e9dfc6" stroke="#1f3a5f" stroke-width="3"/><path d="M146 82l22-16 22 16" fill="none" stroke="#1f3a5f" stroke-width="3" stroke-linejoin="round"/>
        <g stroke="#1f3a5f" stroke-width="1.6" fill="none" stroke-dasharray="4 4"><path d="M14 30h60M14 38h40M170 30h40"/></g>
        <circle cx="196" cy="22" r="10" fill="#f7c948" stroke="#d99a0b" stroke-width="2"/></svg>`
    $('bContinue').onclick = () => openLevel(cur)
    $('levels').innerHTML = challengesHtml() + CHAPTERS.map((ch, ci) => {
      const cards = LEVELS.map((lv, i) => ({ lv, i })).filter(({ lv }) => lv.id >= ch.from && lv.id <= ch.to)
      const done = cards.filter(({ lv }) => starsOf(lv.id) > 0).length
      return `<section class="chapter"><h2><span class="chnum">${ci + 1}</span> ${ch.title} <small>${done} / ${cards.length}</small></h2><div class="levels-grid">${cards.map(({ lv, i }) => {
        const ok = unlocked(i), b = bestOf(lv.id)
        return `<button class="lvl ${ok ? '' : 'locked'}" data-i="${i}" ${ok ? '' : 'disabled'}>
          ${thumb(lv)}
          <div class="lvl-body"><span class="num">Niveau ${lv.id}</span><h3>${lv.title}</h3>
          <p>${clientsOf(lv).map((c) => c.name).join(' et ')}</p>
          <div class="tags">${tagsOf(lv).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
          <div class="meta"><span>${lv.budget} k€</span><span class="medals">${clockIc(b && b.speed)}${ecoIc(b && b.eco)}</span>${starsRow(starsOf(lv.id))}</div>
          ${b ? `<div class="best">Record : ${fmt(b.time)} - ${b.moves} actions</div>` : ''}</div>
          ${ok ? '' : '<span class="lock">Verrouillé</span>'}
        </button>`
      }).join('')}</div></section>`
    }).join('')
    const total = Object.values(progress.stars).reduce((a, b) => a + b, 0)
    $('totalStars').innerHTML = `${starSvg(true)} ${total} / ${LEVELS.length * 3}`
    document.querySelectorAll('.lvl:not(.locked)').forEach((b) => (b.onclick = () => openLevel(+b.dataset.i)))
    if ($('bDaily')) {
      $('bDaily').onclick = startDaily
      $('bBoard').onclick = () => showBoard(todayStr())
      $('bFree').onclick = () => startFree(+$('freeDiff').value)
      $('freeDiff').value = String(progress.diff || 3)
      $('freeDiff').onchange = () => { progress.diff = +$('freeDiff').value }
    }
  }

  // ---------- Niveau du jour, niveaux infinis, classement ----------
  const todayStr = () => new Date().toLocaleDateString('sv-SE')
  const DIFFS = ['Facile', 'Moyen', 'Difficile', 'Très difficile', 'Expert']
  function challengesHtml() {
    if (!window.ArchiGen) return ''
    const day = todayStr(), d = progress.daily[day]
    const long = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return `<section class="challenges">
      <div class="chal"><span class="num">Niveau du jour</span><h3>${long.charAt(0).toUpperCase() + long.slice(1)}</h3>
        <p>Le même plan pour tous les joueurs, un nouveau chaque jour. Compare tes étoiles et ton temps avec tes amis.</p>
        <div class="row"><button class="btn primary" id="bDaily">${d ? 'Rejouer' : 'Jouer'}</button><button class="btn" id="bBoard">Classement</button>
        ${d ? `<span class="done">Fait : ${d.stars} étoile(s), ${fmt(d.time)}</span>` : ''}</div></div>
      <div class="chal"><span class="num">Niveaux infinis</span><h3>Un plan au hasard</h3>
        <p>Un client et un terrain tirés au sort, à l’infini. ${progress.free ? `Déjà ${progress.free} réussi(s).` : ''}</p>
        <div class="row"><select id="freeDiff" aria-label="Difficulté">${DIFFS.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('')}</select><button class="btn primary" id="bFree">Générer un niveau</button></div></div>
    </section>`
  }
  function startDaily() {
    const day = todayStr()
    const lv = window.ArchiGen.daily(day)
    lv._gen = { kind: 'daily', day, label: `Niveau du jour : ${day}` }
    openLevel(-1, lv)
  }
  function startFree(diff) {
    const seed = Math.floor(Math.random() * 1e9)
    const lv = window.ArchiGen.generate(seed, diff)
    lv._gen = { kind: 'free', diff, seed, label: `Niveau infini (${DIFFS[diff - 1].toLowerCase()})` }
    openLevel(-1, lv)
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  async function showBoard(day) {
    modal(`<h2>Classement du jour</h2><p class="help">Chargement...</p><div class="actions"><button class="btn" id="mOk">Fermer</button></div>`)
    $('mOk').onclick = closeModal
    const c = window.ArchiCloud
    let body
    if (!c || !c.ready) body = '<p>Le classement demande une connexion Internet.</p>'
    else {
      try {
        const rows = await c.topScores(day)
        const me = c.user && c.user.id
        body = rows.length
          ? `<table class="board"><tr><th>#</th><th>Joueur</th><th>Étoiles</th><th>Temps</th></tr>${rows.map((r, i) => `<tr class="${r.user_id === me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.stars}</td><td>${fmt(+r.time_s)}</td></tr>`).join('')}</table>`
          : '<p>Personne n’a encore réussi le niveau du jour. Sois le premier !</p>'
        if (!me) body += '<p class="help">Connecte-toi (bouton Compte) pour que ton score apparaisse ici.</p>'
      } catch (e) { body = '<p>Impossible de charger le classement. La base n’est peut-être pas encore prête.</p>' }
    }
    $('modal').querySelector('.box').innerHTML = `<h2>Classement du jour</h2><p class="help" style="margin-top:0">${day}</p>${body}<div class="actions"><button class="btn" id="mOk">Fermer</button></div>`
    $('mOk').onclick = closeModal
  }

  // ---------- Compte en ligne ----------
  function renderAccountBtn() {
    const c = window.ArchiCloud
    $('bAcc').classList.toggle('on', !!(c && c.user))
    $('bAcc').textContent = c && c.user ? 'Connecté' : 'Compte'
  }
  function showAccount() {
    const c = window.ArchiCloud
    if (!c || !c.ready) { modal('<h2>Compte</h2><p>La connexion en ligne n’est pas disponible (pas d’Internet ?). Tes étoiles restent sauvegardées sur cet appareil.</p><div class="actions"><button class="btn" id="mOk">Fermer</button></div>'); $('mOk').onclick = closeModal; return }
    if (c.user) {
      modal(`<h2>Mon compte</h2><div class="acc"><p style="margin:0">${esc(c.user.email || '')}</p>
        <label>Nom affiché dans le classement<input id="aName" maxlength="20" value="${esc(progress.name || (c.user.email || '').split('@')[0])}"></label>
        <p class="help" style="margin:0">Tes étoiles, médailles et records sont sauvegardés en ligne et suivent ton compte sur tous tes appareils.</p></div>
        <div class="actions"><button class="btn" id="aOut">Se déconnecter</button><button class="btn primary" id="aOk">Enregistrer</button></div>`)
      $('aOk').onclick = () => { progress.name = $('aName').value.trim().slice(0, 20); saveProgress(); closeModal() }
      $('aOut').onclick = async () => { await c.signOut(); closeModal() }
      return
    }
    modal(`<h2>Compte</h2><div class="acc"><p class="help" style="margin:0">Crée un compte (ou connecte-toi) pour garder tes étoiles entre appareils et apparaître dans le classement.</p>
      <input id="aMail" type="email" placeholder="Adresse e-mail" autocomplete="email"><input id="aPass" type="password" placeholder="Mot de passe (6 caractères minimum)" autocomplete="current-password"><p class="err" id="aErr"></p></div>
      <div class="actions"><button class="btn" id="aUp">Créer un compte</button><button class="btn primary" id="aIn">Se connecter</button></div>`)
    const go = async (up) => {
      $('aErr').textContent = ''
      try {
        const email = $('aMail').value.trim(), pass = $('aPass').value
        if (up) {
          const ok = await c.signUp(email, pass)
          if (!ok) { $('aErr').style.color = '#2e9d63'; $('aErr').textContent = 'Compte créé. Confirme ton adresse dans le mail reçu, puis connecte-toi.'; return }
        } else await c.signIn(email, pass)
        closeModal()
      } catch (e) { $('aErr').style.color = ''; $('aErr').textContent = /invalid login/i.test(e.message) ? 'E-mail ou mot de passe incorrect.' : e.message }
    }
    $('aIn').onclick = () => go(false)
    $('aUp').onclick = () => go(true)
  }
  // À la connexion : on fusionne la sauvegarde en ligne avec celle de cet appareil
  async function onUserChange(user) {
    renderAccountBtn()
    if (!user) return
    try {
      const remote = await window.ArchiCloud.loadProgress()
      progress = remote ? mergeProgress(progress, remote) : progress
      saveProgress()
      renderHome()
    } catch (e) { /* tables absentes ou hors ligne : on joue en local */ }
  }

  function show(screen) {
    $('home').classList.toggle('hidden', screen !== 'home')
    $('game').classList.toggle('hidden', screen !== 'game')
    $('topSub').textContent = screen === 'home' ? 'Corrige les plans, contente les clients' : S.level._gen ? S.level._gen.label : `Niveau ${S.level.id} : ${S.level.title}`
    window.scrollTo(0, 0)
  }

  // ---------- Niveau ----------
  function openLevel(i, custom) {
    S.idx = custom ? -1 : i
    S.level = custom || LEVELS[i]
    const p = startPlan(S.level)
    S.rooms = p.rooms
    S.items = p.items
    S.floor = 0
    S.history = []
    S.sel = null
    S.selItem = null
    S.hints = new Set()
    S.nextId = 1
    S.twist = false
    S.t0 = Date.now()
    S.tEnd = null
    S.moves = 0
    S.result = null
    S.counted = false
    S.flash = null
    S.badItems = null
    setTool('move')
    const lv = S.level
    $('clientPanel').innerHTML = `
      <div id="clientCard"></div>
      <p class="story">${lv.story}</p>
      <div class="chrono" id="chrono"></div>
      <div class="budget" id="budget"></div>
      <div id="checks"></div>
      <button class="validate" id="bValidate">Valider le plan</button>`
    $('bValidate').onclick = validate
    $('addType').innerHTML = Object.entries(A.TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')
    $('addType').value = 'chambre'
    $('floors').classList.toggle('hidden', floorsOf(lv) < 2)
    $('upperWrap').classList.toggle('hidden', floorsOf(lv) < 2)
    $('upperToggle').checked = false
    $('timeToggle').checked = false
    const pal = lv.palette || []
    $('palette').classList.toggle('hidden', pal.length === 0)
    const groups = {}
    pal.forEach((k) => (groups[A.ITEMS[k].cat] = groups[A.ITEMS[k].cat] || []).push(k))
    $('itemSel').innerHTML = Object.entries(groups).map(([cat, ks]) => `<optgroup label="${cat}">${ks.map((k) => `<option value="${k}">${A.ITEMS[k].label} (${A.ITEMS[k].w} x ${A.ITEMS[k].h} m)</option>`).join('')}</optgroup>`).join('')
    $('game').dataset.tab = 'plan'
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === 'plan'))
    show('game')
    if (!S.view) S.view = new window.View3D($('three'))
    S.view.levelId = null
    S.view.hideUpper = false
    if (S.view.setTime) S.view.setTime('day')
    refresh()
  }

  // ---------- Mises à jour ----------
  // ---------- Sons et réactions du client ----------
  const snd = (n, a) => { if (window.ArchiSound) window.ArchiSound.play(n, a) }
  const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1)
  const flash = (who, text) => {
    S.flash = { who, text, until: Date.now() + 5200 }
    clearTimeout(flash.t)
    flash.t = setTimeout(() => { if (S.level && !$('game').classList.contains('hidden')) renderClient() }, 5300)
  }
  // Compare avec le plan précédent : le client commente ce qui vient de changer
  function react(prev, r) {
    const lv = S.level, cs = clientsOf(lv)
    const badItems = new Set(A.analyze(lv, plan()).itemInfo.map((x, i) => (x.ok ? null : S.items[i] && S.items[i].id)).filter(Boolean))
    const prevBad = S.badItems || new Set()
    S.badItems = badItems
    if (!prev || prev.list.length === 0) return
    const was = new Map(prev.list.map((x) => [x.id, x.ok]))
    const fixed = r.list.filter((x) => x.required && x.ok && was.get(x.id) === false)
    const broken = r.list.filter((x) => x.required && !x.ok && was.get(x.id) === true)
    const newBadItem = S.items.find((it) => badItems.has(it.id) && !prevBad.has(it.id))
    const who = (x) => Math.min(x && x.who !== undefined ? x.who : 0, cs.length - 1)
    if (r.requiredOk && !prev.requiredOk) { snd('unlock'); flash(0, 'C’est tout bon pour moi ! Il ne reste qu’à valider le plan.'); return }
    if (r.cost > lv.budget && prev.cost <= lv.budget) { snd('bad'); flash(0, `Houlà ! Vous dépassez mon budget de ${r.cost - lv.budget} k€ !`); return }
    if (r.cost <= lv.budget && prev.cost > lv.budget) { snd('good'); flash(0, 'Ah, voilà, ça rentre enfin dans mon budget.'); return }
    if (broken.some((x) => x.id === 'terrain')) { snd('bad'); flash(0, 'Attention, des pièces se chevauchent ou sortent du terrain !'); return }
    if (broken.length) { snd('bad'); flash(who(broken[0]), `${pick(['Attention, vous avez défait quelque chose :', 'Hé, ça ne va plus :', 'Ce n’était pas ce que j’avais demandé :'], S.moves)} ${lower(broken[0].text.replace(/^[^\s:]+ : /, ''))}.`); return }
    if (newBadItem) {
      const info = A.analyze(lv, plan()).itemInfo[S.items.indexOf(newBadItem)]
      snd('error')
      flash(0, `Le ${lower(A.ITEMS[newBadItem.t].label)} ici ? ${info.reason ? info.reason.charAt(0).toUpperCase() + info.reason.slice(1) : 'Ce n’est pas un bon endroit'}.`)
      return
    }
    if (fixed.length) { snd('good'); flash(who(fixed[0]), `${pick(['Voilà qui est mieux :', 'Ah, là je suis content :', 'Parfait pour ça :'], S.moves)} ${lower(fixed[0].text.replace(/^[^\s:]+ : /, ''))}.`) }
  }

  function refresh() {
    const prevResult = S.result
    let r = A.evaluate(S.level, plan(), { twist: S.twist })
    // Le client change d'avis dès que sa première liste est respectée
    if (S.level.twist && !S.twist && r.requiredOk) {
      S.twist = true
      r = A.evaluate(S.level, plan(), { twist: true })
      S.result = r
      S.justTwisted = true
      snd('twist')
      showTwist()
    }
    S.result = r
    if (S.justTwisted) S.justTwisted = false
    else react(prevResult, r)
    renderFloors()
    renderPlan()
    renderClient()
    renderChecks()
    renderPanel()
    S.view.update(S.level, plan(), S.sel || S.selItem)
    $('bUndo').disabled = S.history.length === 0
    if (r.requiredOk && !S.level._gen && r.stars > starsOf(S.level.id)) {
      progress.stars[S.level.id] = r.stars
      saveProgress()
      renderHome()
    }
  }

  const snapshot = () => { snd('place'); S.history.push(A.clone(plan())); S.moves++; if (S.history.length > 150) S.history.shift() }
  function undo() {
    if (!S.history.length) return
    const p = S.history.pop()
    S.rooms = p.rooms
    S.items = p.items
    if (!S.rooms.some((r) => r.id === S.sel)) S.sel = null
    if (!S.items.some((r) => r.id === S.selItem)) S.selItem = null
    refresh()
  }

  function setFloor(f) {
    S.floor = f
    S.sel = null
    S.selItem = null
    refresh()
  }
  function renderFloors() {
    if (floorsOf(S.level) < 2) return
    $('floors').innerHTML = ['Rez-de-chaussée', 'Étage'].map((n, f) => `<button class="floor ${S.floor === f ? 'on' : ''}" data-f="${f}">${n}</button>`).join('') + '<span class="muted">Le plan que tu vois et modifies</span>'
    $('floors').querySelectorAll('.floor').forEach((b) => (b.onclick = () => setFloor(+b.dataset.f)))
  }

  // ---------- Clients : portrait qui réagit, bulle de dialogue ----------
  const pick = (arr, k) => arr[Math.abs(k) % arr.length]
  function clientMood(i) {
    const r = S.result
    const rows = r.list.filter((x) => x.required && (x.who === undefined || x.who === i))
    const bad = rows.filter((x) => !x.ok).length
    if (r.requiredOk) return r.stars === 3 ? 'delighted' : 'happy'
    if (r.cost > S.level.budget) return 'angry'
    return bad / Math.max(1, rows.length) > 0.55 ? 'worried' : 'neutral'
  }

  function clientLine() {
    const r = S.result, lv = S.level, cs = clientsOf(lv)
    if (S.flash && Date.now() < S.flash.until) return S.flash
    if (r.requiredOk) return { who: 0, text: r.stars === 3 ? pick(['Magnifique, c’est exactement ce que je voulais !', 'Vous avez tout compris, bravo !', 'Je n’ai rien à redire, merci !'], S.idx) : pick(['Ça me convient. Et mes petits souhaits en plus ?', 'C’est bien, mais on peut faire encore mieux...'], S.idx) }
    if (r.cost > lv.budget) return { who: 0, text: `Hé ! Votre plan coûte ${r.cost} k€ et mon budget est de ${lv.budget} k€ !` }
    const first = r.list.find((x) => x.required && !x.ok && x.who !== undefined) || r.list.find((x) => x.required && !x.ok)
    if (!first) return { who: 0, text: '' }
    const starters = ['Il me faut encore :', 'Vous avez oublié :', 'N’oubliez pas :', 'Je tiens à :']
    const low = first.text.charAt(0).toLowerCase() + first.text.slice(1)
    const text = first.id === 'terrain' ? 'Votre plan a un problème : des pièces se chevauchent ou sortent du terrain.' : `${pick(starters, S.history.length + r.list.filter((x) => !x.ok).length)} ${cs.reduce((t, c) => t.replace(new RegExp('^' + c.name.split(' ')[0] + ' : ', 'i'), ''), low)}.`
    return { who: Math.min(first.who ?? 0, cs.length - 1), text }
  }

  function renderClient() {
    const lv = S.level, cs = clientsOf(lv)
    const line = clientLine()
    const portraits = cs.map((c, i) => {
      const m = clientMood(i)
      return `<div class="who ${line.who === i && line.text ? 'speaking' : ''}"><div class="cport mood-${m}">${portraitHtml(c.look, m, cs.length > 1 ? 78 : 96)}</div>
        <div class="wname"><b>${c.name}</b><span>${c.job}${cs.length === 1 ? ', ' + c.age + ' ans' : ''}</span></div></div>`
    }).join('')
    const quotes = cs.map((c) => (c.quote ? `<div class="quote">${cs.length > 1 ? `<b>${c.name} :</b> ` : ''}${c.quote}</div>` : '')).join('')
    $('clientCard').innerHTML = `<div class="whos">${portraits}</div>
      <div class="bubble ${line.text ? '' : 'empty'} mood-${clientMood(line.who)}">${line.text ? `<b>${cs[line.who].name} :</b> ${line.text}` : '&nbsp;'}</div>${quotes}`
  }

  function showTwist() {
    const lv = S.level, cs = clientsOf(lv)
    modal(`<div class="cport mood-angry" style="margin:0 auto 6px;width:110px">${portraitHtml(cs[0].look, 'worried', 110)}</div>
      <h2>Un instant...</h2>
      <p>${cs[0].name} : « ${lv.twist.message} »</p>
      <p class="help">De nouveaux critères viennent d’apparaître dans la liste (marqués NOUVEAU). Adapte ton plan !</p>
      <div class="actions"><button class="btn primary" id="mOk">Ça alors...</button></div>`)
    $('mOk').onclick = closeModal
  }

  // ---------- Dessin du plan ----------
  const px = (cx) => PAD + cx * C
  const onFloor = (r) => (r.f || 0) === S.floor
  // Un élément est visible sur l'étage affiché : le jardin au rez-de-chaussée, l'escalier aux deux étages
  function itemVisible(it) {
    const d = A.ITEMS[it.t]
    if (d.garden) return S.floor === 0
    if (d.stairs) return S.floor === 0 || floorsOf(S.level) > 1
    return (it.f || 0) === S.floor
  }

  function badRooms() {
    const bad = new Set()
    const owner = new Map()
    const obs = S.level.obstacles || []
    S.rooms.forEach((r) => {
      const f = r.f || 0
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          const k = `${f}:${x},${y}`
          if (owner.has(k)) { bad.add(r.id); bad.add(owner.get(k)) } else owner.set(k, r.id)
          if (x < 0 || y < 0 || x >= S.level.w || y >= S.level.h) bad.add(r.id)
          if (f === 0 && obs.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) bad.add(r.id)
        }
    })
    S.rooms.forEach((r) => {
      if ((r.f || 0) !== 1) return
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!S.rooms.some((q) => (q.f || 0) === 0 && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h)) bad.add(r.id)
    })
    return bad
  }

  const INWARD = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] }
  function opShape(r, op, invalid, entrance) {
    let x1, y1, x2, y2
    if (op.s === 'N') { x1 = px(r.x + op.o); y1 = px(r.y); x2 = x1 + C; y2 = y1 }
    else if (op.s === 'S') { x1 = px(r.x + op.o); y1 = px(r.y + r.h); x2 = x1 + C; y2 = y1 }
    else if (op.s === 'W') { x1 = px(r.x); y1 = px(r.y + op.o); x2 = x1; y2 = y1 + C }
    else { x1 = px(r.x + r.w); y1 = px(r.y + op.o); x2 = x1; y2 = y1 + C }
    const horiz = op.s === 'N' || op.s === 'S'
    const a = horiz ? [x1 + 5, y1] : [x1, y1 + 5], b = horiz ? [x2 - 5, y2] : [x2, y2 - 5]
    if (invalid) return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#d4493e" stroke-width="6" stroke-dasharray="5 4"/>`
    if (op.k === 'w')
      return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#1f3a5f" stroke-width="11" stroke-linecap="butt"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#2f8fd8" stroke-width="7" stroke-linecap="butt"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#d7efff" stroke-width="2.5"/>`
    const [ix, iy] = INWARD[op.s]
    const rad = C - 10
    const L = [a[0] + ix * rad, a[1] + iy * rad]
    const cross = (L[0] - a[0]) * (b[1] - a[1]) - (L[1] - a[1]) * (b[0] - a[0])
    const col = entrance ? '#e0561a' : '#8a5a36'
    let out = ''
    if (entrance) {
      // Porte d'entrée : halo orange, flèche qui rentre dans la maison et étiquette « ENTRÉE »
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
      const ox = -ix, oy = -iy // vers l'extérieur
      const tip = [mx + ox * 3, my + oy * 3]
      const base = [mx + ox * 27, my + oy * 27]
      const px2 = -oy * 12, py2 = ox * 12 // perpendiculaire
      out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="entrance-halo" stroke="#ff9a4d" stroke-width="26" opacity=".5" stroke-linecap="round"/>
        <polygon points="${tip[0]},${tip[1]} ${base[0] + px2},${base[1] + py2} ${base[0] - px2},${base[1] - py2}" fill="#e0561a" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
        <text x="${mx + ox * 45}" y="${my + oy * 45}" font-size="13" font-weight="800" fill="#e0561a" text-anchor="middle" dominant-baseline="central" stroke="#fffdf8" stroke-width="3.5" paint-order="stroke" letter-spacing="0.5" pointer-events="none">ENTRÉE</text>`
    }
    return out + `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#fffdf8" stroke-width="10"/>
      <line x1="${a[0]}" y1="${a[1]}" x2="${L[0]}" y2="${L[1]}" stroke="${col}" stroke-width="${entrance ? 4.5 : 3.5}" stroke-linecap="round"/>
      <path d="M${L[0]} ${L[1]} A ${rad} ${rad} 0 0 ${cross > 0 ? 1 : 0} ${b[0]} ${b[1]}" fill="none" stroke="${col}" stroke-width="1.5" stroke-dasharray="3 3"/>`
  }

  // Petit dessin de chaque meuble (en pixels, dans un rectangle dw x dh)
  function itemArt(it, dw, dh) {
    const d = A.ITEMS[it.t]
    const long = dw >= dh
    const k = it.t
    const st = 'stroke="#1f3a5f" stroke-width="1.6" stroke-linejoin="round"'
    if (k === 'lit1' || k === 'lit2') {
      const pw = long ? 12 : dw - 8, ph = long ? dh - 8 : 12
      return `<rect x="3" y="3" width="${dw - 6}" height="${dh - 6}" rx="5" fill="#f6f1ff" ${st}/><rect x="5" y="5" width="${pw}" height="${ph}" rx="4" fill="${d.color}" stroke="none"/>${k === 'lit2' ? (long ? `<line x1="${pw + 8}" y1="${dh / 2}" x2="${dw - 6}" y2="${dh / 2}" stroke="#cdbfe8" stroke-width="2"/>` : `<line x1="${dw / 2}" y1="${ph + 8}" x2="${dw / 2}" y2="${dh - 6}" stroke="#cdbfe8" stroke-width="2"/>`) : ''}`
    }
    if (k === 'armoire') return `<rect x="2" y="2" width="${dw - 4}" height="${dh - 4}" rx="3" fill="${d.color}" ${st}/><line x1="${long ? dw / 2 : 4}" y1="${long ? 4 : dh / 2}" x2="${long ? dw / 2 : dw - 4}" y2="${long ? dh - 4 : dh / 2}" stroke="#7a5630" stroke-width="2"/>`
    if (k === 'canape') return `<rect x="2" y="2" width="${dw - 4}" height="${dh - 4}" rx="6" fill="${d.color}" ${st}/><rect x="5" y="5" width="${long ? dw - 10 : 9}" height="${long ? 9 : dh - 10}" rx="4" fill="#c85f5f" stroke="none"/>`
    if (k === 'table') return `<rect x="3" y="3" width="${dw - 6}" height="${dh - 6}" rx="${Math.min(dw, dh) / 2.6}" fill="${d.color}" ${st}/><circle cx="${dw / 2}" cy="${dh / 2}" r="${Math.min(dw, dh) / 5}" fill="#e8d3b0" stroke="none"/>`
    if (k === 'bureau_m') return `<rect x="2" y="2" width="${dw - 4}" height="${dh - 4}" rx="3" fill="${d.color}" ${st}/><rect x="${dw / 2 - 7}" y="${dh / 2 - 5}" width="14" height="10" rx="2" fill="#dfe7f2" stroke="none"/>`
    if (k === 'evier') return `<rect x="2" y="2" width="${dw - 4}" height="${dh - 4}" rx="3" fill="${d.color}" ${st}/>${long ? `<rect x="6" y="7" width="${dw / 2 - 10}" height="${dh - 14}" rx="4" fill="#e6f2fb" stroke="none"/><rect x="${dw / 2 + 4}" y="7" width="${dw / 2 - 10}" height="${dh - 14}" rx="4" fill="#e6f2fb" stroke="none"/>` : `<rect x="7" y="6" width="${dw - 14}" height="${dh / 2 - 10}" rx="4" fill="#e6f2fb" stroke="none"/><rect x="7" y="${dh / 2 + 4}" width="${dw - 14}" height="${dh / 2 - 10}" rx="4" fill="#e6f2fb" stroke="none"/>`}`
    if (k === 'plaque') return `<rect x="2" y="2" width="${dw - 4}" height="${dh - 4}" rx="3" fill="${d.color}" ${st}/>${[[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].map(([a, b]) => `<circle cx="${dw * a}" cy="${dh * b}" r="5" fill="#2e3340" stroke="#ff8a3d" stroke-width="1.5"/>`).join('')}`
    if (k === 'frigo') return `<rect x="2" y="2" width="${dw - 4}" height="${dh - 4}" rx="4" fill="${d.color}" ${st}/><line x1="5" y1="${dh * 0.4}" x2="${dw - 5}" y2="${dh * 0.4}" stroke="#aab9c6" stroke-width="1.6"/><rect x="${dw - 9}" y="8" width="3" height="9" rx="1.5" fill="#7d8da1" stroke="none"/>`
    if (k === 'baignoire') return `<rect x="2" y="2" width="${dw - 4}" height="${dh - 4}" rx="9" fill="${d.color}" ${st}/><rect x="7" y="7" width="${dw - 14}" height="${dh - 14}" rx="7" fill="#bfe6f7" stroke="#8cc6e0" stroke-width="1.4"/><circle cx="${long ? dw - 14 : dw / 2}" cy="${long ? dh / 2 : dh - 14}" r="2.5" fill="#7d8da1" stroke="none"/>`
    if (k === 'lavabo') return `<rect x="3" y="3" width="${dw - 6}" height="${dh - 6}" rx="6" fill="${d.color}" ${st}/><ellipse cx="${dw / 2}" cy="${dh / 2 + 3}" rx="${dw / 3}" ry="${dh / 3.4}" fill="#bfe6f7" stroke="#8cc6e0" stroke-width="1.3"/>`
    if (k === 'wc') return `<rect x="6" y="3" width="${dw - 12}" height="11" rx="3" fill="${d.color}" ${st}/><ellipse cx="${dw / 2}" cy="${dh * 0.62}" rx="${dw / 3.2}" ry="${dh / 3.2}" fill="${d.color}" ${st}/>`
    if (k === 'voiture') return `<rect x="4" y="3" width="${dw - 8}" height="${dh - 6}" rx="14" fill="${d.color}" ${st}/><rect x="${long ? dw * 0.3 : 8}" y="${long ? 8 : dh * 0.3}" width="${long ? dw * 0.3 : dw - 16}" height="${long ? dh - 16 : dh * 0.3}" rx="5" fill="#bfe0f2" stroke="none"/>`
    if (k === 'escalier') {
      const n = Math.round((long ? dw : dh) / 11)
      let s = `<rect x="1" y="1" width="${dw - 2}" height="${dh - 2}" rx="3" fill="${d.color}" ${st}/>`
      for (let i = 1; i < n; i++) s += long ? `<line x1="${(dw / n) * i}" y1="2" x2="${(dw / n) * i}" y2="${dh - 2}" stroke="#a88e62" stroke-width="1.6"/>` : `<line x1="2" y1="${(dh / n) * i}" x2="${dw - 2}" y2="${(dh / n) * i}" stroke="#a88e62" stroke-width="1.6"/>`
      s += long ? `<path d="M8 ${dh / 2}H${dw - 12}m-7 -6l7 6l-7 6" fill="none" stroke="#7a5a2a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="M${dw / 2} ${dh - 8}V12m-6 7l6 -7l6 7" fill="none" stroke="#7a5a2a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
      return s
    }
    if (k === 'rampe') {
      let s = `<rect x="1" y="1" width="${dw - 2}" height="${dh - 2}" rx="4" fill="${d.color}" ${st}/>`
      const n = Math.round((long ? dw : dh) / 9)
      for (let i = 1; i < n; i++) s += long ? `<line x1="${(dw / n) * i}" y1="3" x2="${(dw / n) * i + 5}" y2="${dh - 3}" stroke="#a89a78" stroke-width="1.5"/>` : `<line x1="3" y1="${(dh / n) * i}" x2="${dw - 3}" y2="${(dh / n) * i + 5}" stroke="#a89a78" stroke-width="1.5"/>`
      s += `<rect x="1" y="1" width="${dw - 2}" height="4" fill="#e0561a" opacity=".85"/><rect x="1" y="${dh - 5}" width="${dw - 2}" height="4" fill="#e0561a" opacity=".85"/>`
      return s
    }
    if (k === 'terrasse') { let s = `<rect x="1" y="1" width="${dw - 2}" height="${dh - 2}" rx="3" fill="${d.color}" ${st}/>`; for (let i = 1; i < Math.round(dh / 10); i++) s += `<line x1="2" y1="${(dh / Math.round(dh / 10)) * i}" x2="${dw - 2}" y2="${(dh / Math.round(dh / 10)) * i}" stroke="#b69362" stroke-width="1.4"/>`; return s }
    if (k === 'piscine') return `<rect x="1" y="1" width="${dw - 2}" height="${dh - 2}" rx="12" fill="#e8f6fd" ${st}/><rect x="6" y="6" width="${dw - 12}" height="${dh - 12}" rx="8" fill="${d.color}" stroke="#3a9fce" stroke-width="1.5"/><path d="M14 ${dh * 0.35}q8 -7 16 0t16 0M14 ${dh * 0.62}q8 -7 16 0t16 0" fill="none" stroke="#e8f8ff" stroke-width="2.2" stroke-linecap="round"/>`
    if (k === 'arbre') return `<circle cx="${dw / 2}" cy="${dh / 2}" r="${Math.min(dw, dh) / 2 - 2}" fill="${d.color}" ${st}/><circle cx="${dw / 2 - 6}" cy="${dh / 2 - 6}" r="${Math.min(dw, dh) / 7}" fill="#7dc772" stroke="none"/><circle cx="${dw / 2}" cy="${dh / 2}" r="3" fill="#7a5230" stroke="none"/>`
    if (k === 'potager') { let s = `<rect x="1" y="1" width="${dw - 2}" height="${dh - 2}" rx="4" fill="${d.color}" ${st}/>`; for (let i = 1; i < 4; i++) s += `<line x1="6" y1="${(dh / 4) * i}" x2="${dw - 6}" y2="${(dh / 4) * i}" stroke="#7aa05a" stroke-width="3" stroke-dasharray="6 3" stroke-linecap="round"/>`; return s }
    return `<rect x="1" y="1" width="${dw - 2}" height="${dh - 2}" rx="3" fill="${d.color}" ${st}/>`
  }

  // Motifs (parquet, carrelage, béton, herbe, hachures) et ombres pour un plan plus « plan d'architecte »
  const DEFS = `<defs>
    <pattern id="p-wood" width="40" height="12" patternUnits="userSpaceOnUse"><rect width="40" height="12" fill="none"/><path d="M0 .5H40M0 6.5H40" stroke="#8a5a2b" stroke-opacity=".28" stroke-width="1"/><path d="M13 .5V6.5M31 6.5V12" stroke="#8a5a2b" stroke-opacity=".25" stroke-width="1"/></pattern>
    <pattern id="p-tile" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0V20H0" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/></pattern>
    <pattern id="p-conc" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="#000" fill-opacity=".12"/><circle cx="10" cy="10" r="1.2" fill="#000" fill-opacity=".1"/><circle cx="11" cy="2" r=".8" fill="#000" fill-opacity=".1"/></pattern>
    <pattern id="p-grass" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M3 11l1-4M4 11l2-3M10 5l1-4M11 5l2-3" stroke="#6b9a52" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/></pattern>
    <pattern id="p-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V10" stroke="#c0392b" stroke-opacity=".55" stroke-width="3"/></pattern>
    <pattern id="p-brick" width="22" height="12" patternUnits="userSpaceOnUse"><rect width="22" height="12" fill="#e7c9b0"/><path d="M0 6H22M0 0H22M11 0V6M0 6V12M22 6V12" stroke="#b98c6a" stroke-width="1.2"/></pattern>
    <filter id="f-shadow" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx="3" dy="4" stdDeviation="3.2" flood-color="#1f3a5f" flood-opacity=".28"/></filter>
    <filter id="f-soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1.5" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity=".28"/></filter>
  </defs>`
  const FLOORPAT = { salon: 'p-wood', chambre: 'p-wood', bureau: 'p-wood', cuisine: 'p-tile', sdb: 'p-tile', couloir: 'p-tile', garage: 'p-conc' }

  function renderPlan() {
    const lv = S.level
    const W = lv.w * C + PAD * 2, H = lv.h * C + PAD * 2
    const svg = $('svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const bad = badRooms()
    const a = A.analyze(lv, plan())
    let s = DEFS + `<rect x="0" y="0" width="${W}" height="${H}" fill="#fbf7ee"/>`
    // voisins (mitoyens) puis route
    const T = PAD - 12
    for (const side of lv.neighbors || []) {
      const nb = { N: [0, 0, W, T], S: [0, H - T, W, T], W: [0, 0, T, H], E: [W - T, 0, T, H] }[side]
      const hz = side === 'N' || side === 'S'
      s += `<rect x="${nb[0]}" y="${nb[1]}" width="${nb[2]}" height="${nb[3]}" fill="url(#p-brick)" stroke="#8a6a52" stroke-width="2"/>`
      s += `<text x="${nb[0] + nb[2] / 2}" y="${nb[1] + nb[3] / 2}" fill="#6b4630" font-size="13" font-weight="800" text-anchor="middle" dominant-baseline="central" letter-spacing="2" stroke="#f7e8da" stroke-width="3.5" paint-order="stroke" ${hz ? '' : `transform="rotate(90 ${nb[0] + nb[2] / 2} ${nb[1] + nb[3] / 2})"`}>VOISIN</text>`
    }
    const road = { N: [0, 0, W, T], S: [0, H - T, W, T], W: [0, 0, T, H], E: [W - T, 0, T, H] }[lv.road]
    s += `<rect x="${road[0]}" y="${road[1]}" width="${road[2]}" height="${road[3]}" fill="#6f757e"/>`
    const horiz = lv.road === 'N' || lv.road === 'S'
    s += horiz ? `<line x1="${road[0] + 8}" y1="${road[1] + road[3] / 2}" x2="${road[0] + road[2] - 8}" y2="${road[1] + road[3] / 2}" stroke="#e9e3c2" stroke-width="2" stroke-dasharray="14 10"/>` : `<line x1="${road[0] + road[2] / 2}" y1="${road[1] + 8}" x2="${road[0] + road[2] / 2}" y2="${road[1] + road[3] - 8}" stroke="#e9e3c2" stroke-width="2" stroke-dasharray="14 10"/>`
    s += `<text x="${road[0] + road[2] / 2}" y="${road[1] + road[3] / 2}" fill="#fff" font-size="14" font-weight="800" text-anchor="middle" dominant-baseline="central" letter-spacing="4" stroke="#6f757e" stroke-width="5" paint-order="stroke" ${horiz ? '' : `transform="rotate(90 ${road[0] + road[2] / 2} ${road[1] + road[3] / 2})"`}>ROUTE</text>`
    // terrain + grille + règles graduées
    s += `<rect x="${PAD}" y="${PAD}" width="${lv.w * C}" height="${lv.h * C}" fill="${S.floor ? '#eef0e8' : '#e3efd2'}" stroke="#6b9a52" stroke-width="3"/>`
    if (!S.floor) s += `<rect x="${PAD}" y="${PAD}" width="${lv.w * C}" height="${lv.h * C}" fill="url(#p-grass)"/>`
    for (let i = 1; i < lv.w; i++) s += `<line x1="${px(i)}" y1="${PAD}" x2="${px(i)}" y2="${PAD + lv.h * C}" stroke="#b9cfa2" stroke-opacity="${i % 5 === 0 ? 0.9 : 0.5}" stroke-width="${i % 5 === 0 ? 1.6 : 1}"/>`
    for (let j = 1; j < lv.h; j++) s += `<line x1="${PAD}" y1="${px(j)}" x2="${PAD + lv.w * C}" y2="${px(j)}" stroke="#b9cfa2" stroke-opacity="${j % 5 === 0 ? 0.9 : 0.5}" stroke-width="${j % 5 === 0 ? 1.6 : 1}"/>`
    for (let i = 0; i <= lv.w; i += 2) s += `<text x="${px(i)}" y="${PAD - 4}" font-size="9" fill="#6b8a58" text-anchor="middle">${i}</text>`
    for (let j = 2; j <= lv.h; j += 2) s += `<text x="${PAD - 4}" y="${px(j) + 3}" font-size="9" fill="#6b8a58" text-anchor="end">${j}</text>`
    // obstacles (au rez-de-chaussée)
    if (S.floor === 0)
      for (const o of lv.obstacles || []) {
        const x = px(o.x), y = px(o.y), w = o.w * C, h = o.h * C
        if (o.kind === 'tree') s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfe0b0" opacity=".6"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) * 0.42}" fill="#4f9f4a" stroke="#2f6d2c" stroke-width="2.5"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) * 0.12}" fill="#7a5230"/>`
        else if (o.kind === 'rock') s += `<path d="M${x + 4} ${y + h - 4}Q${x} ${y + h * 0.4} ${x + w * 0.25} ${y + 6}Q${x + w * 0.5} ${y - 2} ${x + w * 0.78} ${y + 8}Q${x + w + 2} ${y + h * 0.55} ${x + w - 4} ${y + h - 4}Z" fill="#a0a6ad" stroke="#5d646c" stroke-width="2.5" stroke-linejoin="round"/><path d="M${x + w * 0.3} ${y + h * 0.35}l10 8M${x + w * 0.6} ${y + h * 0.5}l-8 12" stroke="#7c838b" stroke-width="2" fill="none" stroke-linecap="round"/><text x="${x + w / 2}" y="${y + h + 12}" font-size="10" font-weight="700" fill="#5d646c" text-anchor="middle">Rocher</text>`
        else if (o.kind === 'zone') s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#p-hatch)" stroke="#c0392b" stroke-width="2.5" stroke-dasharray="9 5"/><rect x="${x + w / 2 - 62}" y="${y + h / 2 - 11}" width="124" height="22" rx="11" fill="#fffdf8" stroke="#c0392b" stroke-width="2"/><text x="${x + w / 2}" y="${y + h / 2 + 1}" font-size="11" font-weight="800" fill="#c0392b" text-anchor="middle" dominant-baseline="central" letter-spacing="1">ZONE INTERDITE</text>`
        else s += `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2 - 2}" ry="${h / 2 - 2}" fill="#6bb8e8" stroke="#3a86b8" stroke-width="2.5"/><path d="M${x + w * 0.3} ${y + h * 0.4}q${w * 0.1} -6 ${w * 0.2} 0M${x + w * 0.5} ${y + h * 0.6}q${w * 0.1} -6 ${w * 0.2} 0" stroke="#e6f6ff" stroke-width="2" fill="none" stroke-linecap="round"/>`
      }
    // boussole et soleil
    s += `<g transform="translate(${W - 34} ${lv.road === 'N' ? PAD + 26 : 28})"><circle r="17" fill="#fff" stroke="#1f3a5f" stroke-width="2"/><path d="M0 -12l5 12h-10z" fill="#d4493e"/><path d="M0 12l-5 -12h10z" fill="#1f3a5f"/><text y="-21" font-size="13" font-weight="800" fill="#1f3a5f" text-anchor="middle">N</text></g>`
    s += `<g transform="translate(34 ${lv.road === 'S' ? H - PAD - 26 : H - 26})"><circle r="9" fill="#f7c948" stroke="#d99a0b" stroke-width="2"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((d) => `<line x1="0" y1="-13" x2="0" y2="-18" stroke="#d99a0b" stroke-width="2.5" stroke-linecap="round" transform="rotate(${d})"/>`).join('')}</g><text x="52" y="${(lv.road === 'S' ? H - PAD - 26 : H - 26) + 5}" font-size="12" fill="#9a6d00" font-weight="700">sud</text>`
    // jardin (sous les pièces)
    const drawItem = (it) => {
      const [w, h] = A.itemDims(it)
      const idx = S.items.indexOf(it)
      const ok = a.itemInfo[idx].ok
      const sel = S.selItem === it.id
      return `<g data-item="${it.id}" transform="translate(${px(it.x)} ${px(it.y)})"><g filter="url(#f-soft)">${itemArt(it, w * C, h * C)}</g>
        ${!ok || sel ? `<rect x="0" y="0" width="${w * C}" height="${h * C}" rx="4" fill="${ok ? 'none' : 'rgba(212,73,62,.18)'}" stroke="${ok ? '#e07a3a' : '#d4493e'}" stroke-width="${sel ? 4 : 3}" ${ok ? '' : 'stroke-dasharray="7 4"'} pointer-events="none"/>` : ''}${sel && A.ITEMS[it.t].rotatable !== false ? `<g data-rot="1" transform="translate(${w * C} 0)" style="cursor:pointer"><circle r="14" fill="#e07a3a" stroke="#fff" stroke-width="3"/><path d="M-6 1a6 6 0 1 0 2-5M-4 -8v4h4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/></g>` : ''}</g>`
    }
    S.items.filter((it) => A.ITEMS[it.t].garden && itemVisible(it)).forEach((it) => (s += drawItem(it)))
    // fantôme du rez-de-chaussée quand on regarde l'étage
    if (S.floor === 1)
      S.rooms.filter((r) => (r.f || 0) === 0).forEach((r) => (s += `<rect x="${px(r.x)}" y="${px(r.y)}" width="${r.w * C}" height="${r.h * C}" fill="#f3efe4" stroke="#b9ad90" stroke-width="2" stroke-dasharray="6 5" opacity=".9"/>`))
    // pièces de l'étage affiché (les étiquettes sont dessinées après les meubles pour rester lisibles)
    let labels = ''
    let roomsSvg = ''
    S.rooms.filter(onFloor).forEach((r) => {
      const t = A.TYPES[r.type]
      const sel = S.sel === r.id
      const isBad = bad.has(r.id)
      const rx = px(r.x), ry = px(r.y), rw = r.w * C, rh = r.h * C
      roomsSvg += `<g data-room="${r.id}">
        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${t.color}"/>
        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="url(#${FLOORPAT[r.type] || 'p-conc'})"/>
        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="${isBad ? '#d4493e' : sel ? '#e07a3a' : '#1f3a5f'}" stroke-width="${sel || isBad ? 7 : 6}" ${isBad ? 'stroke-dasharray="10 5"' : ''} stroke-linejoin="miter"/>
        <rect x="${rx + 3}" y="${ry + 3}" width="${rw - 6}" height="${rh - 6}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" pointer-events="none"/></g>`
      labels += `<text x="${rx + 7}" y="${ry + 17}" font-size="${r.w < 3 || r.h < 2 ? 11 : 13}" font-weight="700" fill="#1f3a5f" stroke="#fffdf8" stroke-width="3.5" paint-order="stroke" pointer-events="none">${r.w < 3 && r.type === 'sdb' ? 'Bain' : t.label} <tspan font-weight="400" font-size="11" fill="#35517a">${r.w} x ${r.h} - ${r.w * r.h} m²</tspan></text>`
    })
    s += `<g filter="url(#f-shadow)">${roomsSvg}</g>`
    // meubles de l'étage affiché (escalier aux deux étages)
    S.items.filter((it) => !A.ITEMS[it.t].garden && itemVisible(it)).forEach((it) => (s += drawItem(it)))
    s += labels
    // ouvertures par-dessus les murs
    S.rooms.forEach((r, i) => {
      if (!onFloor(r)) return
      r.op.forEach((op, oi) => {
        if (!A.opInRange(r, op)) return
        s += opShape(r, op, a.info[i].bad.includes(oi), a.info[i].ext.includes(op))
      })
    })
    s += `<g id="hov"></g>`
    svg.innerHTML = s
  }

  // ---------- Critères ----------
  const checkIc = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.7 2.7L10 3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  const crossIc = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'

  function renderChecks() {
    const r = S.result, lv = S.level, cs = clientsOf(lv)
    const row = (x) => `<div class="crit ${x.ok ? 'ok' : 'ko'} ${x.bonus ? 'bonus' : ''} ${x.twist ? 'twist' : ''}"><span class="ic">${x.ok ? checkIc : crossIc}</span>
      <span class="txt">${x.who !== undefined && cs.length > 1 ? `<span class="chip" title="${cs[x.who].name}">${portraitHtml(cs[x.who].look, 'neutral', 22)}</span>` : ''}${x.text}<span class="det">${x.detail}</span>${S.hints.has(x.id) && !x.ok ? `<span class="hint">${x.hint || 'État actuel : ' + x.detail}</span>` : ''}</span></div>`
    const req = r.list.filter((x) => x.required), bon = r.list.filter((x) => x.bonus)
    const maxB = lv.budget
    const pct = Math.min(100, (r.cost / maxB) * 100)
    $('budget').className = 'budget' + (r.cost > maxB ? ' over' : '')
    $('budget').innerHTML = `<div class="lab"><b>Coût du plan</b><span>${r.cost} / ${maxB} k€</span></div><div class="bar"><i style="width:${pct}%"></i></div>`
    let reqHtml
    if (cs.length > 1) {
      const group = (title, rows) => (rows.length ? `<div class="grp">${title}</div>${rows.map(row).join('')}` : '')
      reqHtml = group(cs.length > 2 ? 'Pour tous' : 'Pour tous les deux',req.filter((x) => x.who === undefined)) + cs.map((c, i) => group(`${c.name} demande`, req.filter((x) => x.who === i))).join('')
    } else reqHtml = req.map(row).join('')
    $('checks').innerHTML = `<div class="sec">Critères du client (${req.filter((x) => x.ok).length} / ${req.length})</div>${reqHtml}
      <div class="sec">Souhaits en bonus (${bon.filter((x) => x.ok).length} / ${bon.length})</div>${bon.map(row).join('')}
      <div class="sec">Étoiles</div>${starsRow(r.stars)}`
    const v = $('bValidate')
    v.className = 'validate' + (r.requiredOk ? ' ready' : '')
    v.textContent = r.requiredOk ? 'Valider le plan' : `Il reste ${req.filter((x) => !x.ok).length} critère(s) à respecter`
    v.disabled = !r.requiredOk
    renderChrono()
  }

  function renderChrono() {
    const el = $('chrono')
    if (!el || !S.level) return
    const t = ((S.tEnd ?? Date.now()) - S.t0) / 1000
    const fast = t <= S.level.goldTime, eco = S.moves <= S.level.parMoves
    el.innerHTML = `<span class="ci ${fast ? 'good' : 'late'}" title="Médaille de vitesse : ${fmt(S.level.goldTime)}">${clockIc(fast)} <b>${fmt(t)}</b> <small>/ ${fmt(S.level.goldTime)}</small></span>
      <span class="ci ${eco ? 'good' : 'late'}" title="Médaille d'efficacité : ${S.level.parMoves} actions">${ecoIc(eco)} <b>${S.moves}</b> <small>/ ${S.level.parMoves} actions</small></span>`
  }
  setInterval(() => { if (S.level && !$('game').classList.contains('hidden') && !S.tEnd) renderChrono() }, 1000)

  function giveHint() {
    const first = S.result.list.find((x) => !x.ok && x.required && !S.hints.has(x.id)) || S.result.list.find((x) => !x.ok && !S.hints.has(x.id))
    if (first) S.hints.add(first.id)
    renderChecks()
  }

  // ---------- Panneau de l'élément choisi (pièce ou meuble) ----------
  function renderPanel() {
    const el = $('roomPanel')
    const it = S.items.find((x) => x.id === S.selItem)
    if (it) {
      const d = A.ITEMS[it.t]
      const info = A.analyze(S.level, plan()).itemInfo[S.items.indexOf(it)]
      el.innerHTML = `<div class="row"><b>${d.label}</b><span class="help" style="margin:0;color:${info.ok ? 'inherit' : '#d4493e'}">${info.ok ? 'bien placé' : info.reason}</span><span class="grow"></span>
        <button class="btn" id="iRot">Tourner</button><button class="btn danger" id="iDel">Supprimer</button></div>`
      $('iRot').onclick = rotateItem
      $('iDel').onclick = deleteSel
      return
    }
    const r = S.rooms.find((x) => x.id === S.sel)
    if (!r) { el.innerHTML = '<span class="help" style="margin:0">Clique sur une pièce pour changer son type ou sa taille, ou sur un meuble pour le tourner (poignée orange, double-clic ou touche R) ou le supprimer.</span>'; return }
    const a = A.analyze(S.level, plan())
    const i = S.rooms.indexOf(r)
    el.innerHTML = `<div class="row">
      <b>${A.TYPES[r.type].label}</b><span class="help" style="margin:0">${r.w * r.h} m², ${a.info[i].windows.length} fenêtre(s), ${a.info[i].doors.length} porte(s)</span><span class="grow"></span>
      <select id="rType">${Object.entries(A.TYPES).map(([k, t]) => `<option value="${k}" ${k === r.type ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
      <button class="btn danger" id="rDel">Supprimer</button></div>
      <div class="row" style="margin-top:8px">
        <span class="sz">Largeur <button class="btn sq" data-sz="w-">-</button><b>${r.w} m</b><button class="btn sq" data-sz="w+">+</button></span>
        <span class="sz">Profondeur <button class="btn sq" data-sz="h-">-</button><b>${r.h} m</b><button class="btn sq" data-sz="h+">+</button></span></div>`
    $('rType').onchange = (e) => { snapshot(); r.type = e.target.value; refresh() }
    $('rDel').onclick = () => deleteSel()
    el.querySelectorAll('[data-sz]').forEach((b) => (b.onclick = () => resize(r, b.dataset.sz)))
  }

  function resize(r, how) {
    const nw = r.w + (how === 'w+' ? 1 : how === 'w-' ? -1 : 0)
    const nh = r.h + (how === 'h+' ? 1 : how === 'h-' ? -1 : 0)
    if (nw < 1 || nh < 1 || nw > 12 || nh > 12) return
    if (r.x + nw > S.level.w || r.y + nh > S.level.h) return
    snapshot()
    r.w = nw
    r.h = nh
    r.op = r.op.filter((op) => A.opInRange(r, op)) // une ouverture hors du mur disparaît
    refresh()
  }

  function deleteSel() {
    if (S.selItem) {
      snapshot()
      S.items = S.items.filter((x) => x.id !== S.selItem)
      S.selItem = null
      return refresh()
    }
    if (!S.sel) return
    snapshot()
    S.rooms = S.rooms.filter((r) => r.id !== S.sel)
    S.sel = null
    refresh()
  }

  function rotateItem() {
    const it = S.items.find((x) => x.id === S.selItem)
    if (!it) return
    snapshot()
    snd('rotate')
    it.r = it.r ? 0 : 1
    const [w, h] = A.itemDims(it)
    it.x = Math.max(0, Math.min(S.level.w - w, it.x))
    it.y = Math.max(0, Math.min(S.level.h - h, it.y))
    refresh()
  }

  // Cherche une place libre pour une nouvelle pièce, sur l'étage affiché
  function addRoom() {
    const type = $('addType').value
    const lv = S.level
    const f = S.floor
    const occupied = (x, y) => S.rooms.some((q) => (q.f || 0) === f && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h)
    const blocked = (x, y) => (f === 0 && (lv.obstacles || []).some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) || (f === 1 && !S.rooms.some((q) => (q.f || 0) === 0 && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h))
    for (const [w, h] of [[4, 3], [3, 3], [3, 2], [2, 2], [2, 1]])
      for (let y = 0; y + h <= lv.h; y++)
        for (let x = 0; x + w <= lv.w; x++) {
          let free = true
          for (let yy = y; yy < y + h && free; yy++) for (let xx = x; xx < x + w; xx++) if (occupied(xx, yy) || blocked(xx, yy)) { free = false; break }
          if (free) {
            snapshot()
            const room = A.makeRoom('n' + S.nextId++, type, x, y, w, h, [], f)
            S.rooms.push(room)
            S.sel = room.id
            S.selItem = null
            return refresh()
          }
        }
    alert(f ? 'Il n’y a plus de place libre à l’étage (les pièces doivent reposer sur le rez-de-chaussée).' : 'Il n’y a plus de place libre sur le terrain pour une nouvelle pièce.')
  }

  // Ajoute un meuble, un escalier ou un élément de jardin à un endroit valide si possible
  function addItem() {
    const t = $('itemSel').value
    if (!t) return
    const d = A.ITEMS[t]
    const lv = S.level
    if (d.garden && S.floor !== 0) S.floor = 0
    const f = d.garden || d.stairs ? 0 : S.floor
    const selRoom = S.rooms.find((r) => r.id === S.sel)
    const order = (cands) => cands.sort((p, q) => {
      const inSel = (c) => (selRoom && c.x >= selRoom.x && c.y >= selRoom.y && c.x < selRoom.x + selRoom.w && c.y < selRoom.y + selRoom.h ? 0 : 1)
      return inSel(p) - inSel(q) || p.y - q.y || p.x - q.x
    })
    const cands = []
    for (const r of [0, 1]) {
      const [w, h] = r ? [d.h, d.w] : [d.w, d.h]
      if (r && w === h) continue
      for (let y = 0; y + h <= lv.h; y++) for (let x = 0; x + w <= lv.w; x++) cands.push({ x, y, r })
    }
    // la rampe se pose de préférence contre une porte d'entrée
    let chosen = null
    for (const c of order(cands)) {
      const it = A.makeItem('n' + S.nextId, t, c.x, c.y, c.r, f)
      const test = { rooms: S.rooms, items: [...S.items, it] }
      const an = A.analyze(lv, test)
      if (!an.itemInfo[test.items.length - 1].ok) continue
      if (t === 'rampe' && !an.info.some((inf) => inf.ramp.length)) continue
      chosen = it
      break
    }
    snapshot()
    if (!chosen) chosen = A.makeItem('n' + S.nextId, t, 0, 0, 0, f) // pas de place valide : on le pose et on laisse le joueur le déplacer
    S.nextId++
    S.items.push(chosen)
    S.selItem = chosen.id
    S.sel = null
    refresh()
    if (!A.analyze(lv, plan()).itemInfo[S.items.length - 1].ok) say('Il n’y a pas de place valide : déplace-le toi-même dans une pièce libre.')
  }

  // ---------- Interaction avec le plan ----------
  function cellPos(e) {
    const svg = $('svg')
    const rect = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const x = ((e.clientX - rect.left) / rect.width) * vb.width, y = ((e.clientY - rect.top) / rect.height) * vb.height
    return [(x - PAD) / C, (y - PAD) / C]
  }

  function hitItem(gx, gy) {
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i]
      if (!itemVisible(it)) continue
      const [w, h] = A.itemDims(it)
      if (gx >= it.x && gx <= it.x + w && gy >= it.y && gy <= it.y + h) return it
    }
    return null
  }

  // Ce qu'il y a sous le pointeur : un bord de pièce (fenêtre/porte), un meuble ou le corps d'une pièce
  function hit(gx, gy) {
    if (S.tool === 'move') {
      const it = hitItem(gx, gy)
      if (it) return { kind: 'item', item: it }
    }
    let best = null
    for (const r of S.rooms) {
      if (!onFloor(r)) continue
      const sides = []
      if (gx >= r.x && gx <= r.x + r.w) { sides.push(['N', Math.abs(gy - r.y)]); sides.push(['S', Math.abs(gy - (r.y + r.h))]) }
      if (gy >= r.y && gy <= r.y + r.h) { sides.push(['W', Math.abs(gx - r.x)]); sides.push(['E', Math.abs(gx - (r.x + r.w))]) }
      const inside = gx > r.x && gx < r.x + r.w && gy > r.y && gy < r.y + r.h
      for (const [side, d] of sides) {
        if (d > 0.3) continue
        const score = d + (inside ? 0 : 0.05)
        if (!best || score < best.score) {
          const o = side === 'N' || side === 'S' ? Math.floor(gx - r.x) : Math.floor(gy - r.y)
          best = { kind: 'edge', room: r, side, o: Math.max(0, Math.min(o, A.sideLength(r, side) - 1)), score }
        }
      }
    }
    if (best) return best
    for (let i = S.rooms.length - 1; i >= 0; i--) {
      const r = S.rooms[i]
      if (onFloor(r) && gx >= r.x && gx <= r.x + r.w && gy >= r.y && gy <= r.y + r.h) return { kind: 'room', room: r }
    }
    return null
  }

  function say(msg) {
    $('toolMsg').textContent = msg || ''
    clearTimeout(say.t)
    if (msg) say.t = setTimeout(() => ($('toolMsg').textContent = ''), 3500)
  }

  function setTool(t) {
    S.tool = t
    document.querySelectorAll('#tools .tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t))
    $('svg').style.cursor = t === 'move' ? 'default' : 'crosshair'
    say(t === 'window' ? 'Clique sur un mur extérieur pour poser une fenêtre (clique dessus pour l’enlever).' : t === 'door' ? 'Clique sur un mur pour poser une porte : entre deux pièces, ou vers l’extérieur pour l’entrée.' : t === 'erase' ? 'Clique sur une fenêtre ou une porte pour l’enlever.' : '')
  }

  // Pose (ou retire) une ouverture précise sur le mur cliqué : outils Fenêtre, Porte, Gomme
  function placeOpening(room, side, o) {
    const a = A.analyze(S.level, plan())
    const [nx, ny] = A.opCells(room, { s: side, o }).outside
    const exterior = a.owner.get(`${room.f || 0}:${nx},${ny}`) === undefined
    const key = A.edgeKey(room, { s: side, o })
    const atEdge = []
    S.rooms.forEach((r) => r.op.forEach((op) => { if (A.opInRange(r, op) && A.edgeKey(r, op) === key) atEdge.push([r, op]) }))
    const has = (k) => atEdge.some(([, op]) => op.k === k)
    const strip = () => atEdge.forEach(([r, op]) => (r.op = r.op.filter((x) => x !== op)))
    if (S.tool === 'erase') {
      if (!atEdge.length) return say('Il n’y a rien à enlever ici.')
      snapshot(); strip(); snd('erase'); return refresh()
    }
    if (S.tool === 'window') {
      if (!exterior) return say('Une fenêtre se pose sur un mur extérieur, pas entre deux pièces.')
      snapshot()
      const had = has('w')
      strip()
      if (!had) room.op.push({ s: side, o, k: 'w' })
      snd('window')
      return refresh()
    }
    if (exterior && (room.f || 0) === 1) return say('À l’étage, une porte ne peut ouvrir que sur une autre pièce (pas de balcon).')
    snapshot()
    const had = has('d')
    strip()
    if (!had) room.op.push({ s: side, o, k: 'd' })
    snd('door')
    refresh()
  }

  function toggleOpening(room, side, o) {
    if (S.tool !== 'move') return placeOpening(room, side, o)
    const a = A.analyze(S.level, plan())
    const [nx, ny] = A.opCells(room, { s: side, o }).outside
    const exterior = a.owner.get(`${room.f || 0}:${nx},${ny}`) === undefined
    const key = A.edgeKey(room, { s: side, o })
    const atEdge = []
    S.rooms.forEach((r) => r.op.forEach((op) => { if (A.opInRange(r, op) && A.edgeKey(r, op) === key) atEdge.push([r, op]) }))
    snapshot()
    const strip = () => atEdge.forEach(([r, op]) => (r.op = r.op.filter((x) => x !== op)))
    const has = (k) => atEdge.some(([, op]) => op.k === k)
    if (exterior) {
      let next = has('w') ? 'd' : has('d') ? null : 'w'
      if (next === 'd' && (room.f || 0) === 1) next = null // pas de porte vers le vide à l'étage
      strip()
      if (next) room.op.push({ s: side, o, k: next })
    } else {
      const wasDoor = has('d')
      strip()
      if (!wasDoor) room.op.push({ s: side, o, k: 'd' })
    }
    refresh()
  }

  function select(room, item) {
    const newRoom = room ? room.id : null, newItem = item ? item.id : null
    if (S.sel === newRoom && S.selItem === newItem) return
    S.sel = newRoom
    S.selItem = newItem
    renderPlan()
    renderPanel()
    S.view.update(S.level, plan(), S.sel || S.selItem)
  }

  function bindPlan() {
    const svg = $('svg')
    svg.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('[data-rot]')) { e.preventDefault(); rotateItem(); return }
      const [gx, gy] = cellPos(e)
      const h = hit(gx, gy)
      if (!h) { select(null, null); return }
      const obj = h.kind === 'item' ? h.item : h.room
      S.drag = { h, gx, gy, ox: obj.x, oy: obj.y, moved: false, saved: false }
      try { svg.setPointerCapture(e.pointerId) } catch (err) { /* pointeur synthétique */ }
      if (h.kind === 'item') select(null, h.item)
      else select(h.room, null)
    })
    svg.addEventListener('pointermove', (e) => {
      const [gx, gy] = cellPos(e)
      const d = S.drag
      if (!d) {
        const h = hit(gx, gy)
        const hov = $('hov')
        if (!hov) return
        if (h && h.kind === 'edge') {
          const sh = opShape(h.room, { s: h.side, o: h.o, k: S.tool === 'door' ? 'd' : 'w' }, false).replace(/#2f8fd8/, '#e07a3a').replace(/#d7efff/, '#fff')
          hov.innerHTML = sh.replace(/stroke-width="7"/, 'stroke-width="6" opacity=".7"')
        } else hov.innerHTML = ''
        svg.style.cursor = h ? (h.kind === 'edge' ? 'pointer' : 'grab') : S.tool === 'move' ? 'default' : 'crosshair'
        return
      }
      if (d.h.kind === 'edge') {
        // Départ sur un bord : on ne déplace que si on s'éloigne vraiment (sinon c'est un clic)
        if (Math.hypot(gx - d.gx, gy - d.gy) < 0.5) return
        d.h = { kind: 'room', room: d.h.room }
      }
      const obj = d.h.kind === 'item' ? d.h.item : d.h.room
      const [w, h] = d.h.kind === 'item' ? A.itemDims(obj) : [obj.w, obj.h]
      const nx = Math.max(0, Math.min(S.level.w - w, d.ox + Math.round(gx - d.gx)))
      const ny = Math.max(0, Math.min(S.level.h - h, d.oy + Math.round(gy - d.gy)))
      if (nx !== obj.x || ny !== obj.y) {
        if (!d.saved) {
          const before = A.clone(plan())
          const list = d.h.kind === 'item' ? before.items : before.rooms
          const b = list.find((q) => q.id === obj.id)
          b.x = d.ox
          b.y = d.oy
          S.history.push(before)
          S.moves++
          d.saved = true
        }
        obj.x = nx
        obj.y = ny
        d.moved = true
        snd('pencil')
        refresh()
      }
    })
    const end = () => {
      const d = S.drag
      S.drag = null
      if (d && !d.moved && d.h.kind === 'edge') toggleOpening(d.h.room, d.h.side, d.h.o)
    }
    svg.addEventListener('pointerup', end)
    svg.addEventListener('dblclick', (e) => {
      const [gx, gy] = cellPos(e)
      const h = hit(gx, gy)
      if (h && h.kind === 'item') { select(null, h.item); rotateItem() }
    })
    svg.addEventListener('pointercancel', () => (S.drag = null))
    svg.addEventListener('pointerleave', () => { const hov = $('hov'); if (hov) hov.innerHTML = '' })
  }

  // ---------- Fenêtres de dialogue ----------
  function modal(html) {
    $('modal').innerHTML = `<div class="box">${html}</div>`
    $('modal').classList.remove('hidden')
    S.modalOpen = true
  }
  const closeModal = () => { $('modal').classList.add('hidden'); S.modalOpen = false }

  function confetti() {
    const cols = ['#e07a3a', '#f5b82e', '#2f8fd8', '#2e9d63', '#d4493e', '#8a5aa0']
    return `<div class="confetti" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 29) % 100}%;background:${cols[i % cols.length]};animation-delay:${(i % 9) * 0.12}s;animation-duration:${1.8 + (i % 5) * 0.35}s;transform:rotate(${i * 37}deg)"></i>`).join('')}</div>`
  }

  function validate() {
    const r = S.result
    if (!r.requiredOk) return
    const lv = S.level
    if (!S.tEnd) S.tEnd = Date.now()
    snd('ding', r.stars)
    renderChrono()
    const time = (S.tEnd - S.t0) / 1000
    const speed = time <= lv.goldTime, eco = S.moves <= lv.parMoves
    const gen = lv._gen
    if (!gen) {
      const prev = bestOf(lv.id) || { time: Infinity, moves: Infinity, speed: false, eco: false }
      progress.best[lv.id] = { time: Math.min(prev.time, time), moves: Math.min(prev.moves, S.moves), speed: prev.speed || speed, eco: prev.eco || eco }
    } else if (gen.kind === 'daily') {
      const d = progress.daily[gen.day]
      if (!d || r.stars > d.stars || (r.stars === d.stars && time < d.time)) progress.daily[gen.day] = { stars: r.stars, time, moves: S.moves }
      const c = cloud()
      if (c) c.submitScore(gen.day, { name: progress.name || (c.user.email || 'Architecte').split('@')[0], stars: r.stars, time, moves: S.moves }).catch(() => {})
    } else if (!S.counted) { progress.free = (progress.free || 0) + 1; S.counted = true }
    saveProgress()
    renderHome()
    const next = gen ? null : LEVELS[S.idx + 1]
    const remaining = r.bonusTotal - r.bonusDone
    const cs = clientsOf(lv)
    modal(`${r.stars === 3 ? confetti() : ''}<div class="cport mood-${r.stars === 3 ? 'delighted' : 'happy'}" style="margin:0 auto 4px;width:118px">${portraitHtml(cs[0].look, r.stars === 3 ? 'delighted' : 'happy', 118)}</div>
      <div class="bigstars">${starsRow(r.stars, 3, 'star')}</div>
      <h2>${r.stars === 3 ? 'Plan parfait !' : 'Plan validé !'}</h2>
      <p>${cs.map((c) => c.name).join(' et ')} : « ${r.stars === 3 ? 'C’est exactement la maison dont je rêvais, merci !' : 'Merci, ça me convient. Mais si vous pouviez réaliser mes souhaits en plus...'} »</p>
      <div class="medalrow"><span class="${speed ? 'on' : ''}">${clockIc(speed)}<b>${fmt(time)}</b><small>${speed ? 'médaille de vitesse' : 'objectif ' + fmt(lv.goldTime)}</small></span>
        <span class="${eco ? 'on' : ''}">${ecoIc(eco)}<b>${S.moves} actions</b><small>${eco ? 'médaille d’efficacité' : 'objectif ' + lv.parMoves}</small></span></div>
      <p class="help">Coût final : ${r.cost} k€ sur ${lv.budget} k€.${remaining ? ` Il reste ${remaining} souhait(s) pour gagner plus d'étoiles.` : ''}</p>
      <div class="actions">
        <button class="btn" id="mKeep">${remaining ? 'Améliorer le plan' : 'Revoir le plan'}</button>
        <button class="btn" id="mHome">Tous les niveaux</button>
        ${gen && gen.kind === 'daily' ? '<button class="btn" id="mBoard">Classement</button>' : ''}
        ${gen && gen.kind === 'free' ? '<button class="btn primary" id="mAgain">Un autre plan</button>' : ''}
        ${next ? '<button class="btn primary" id="mNext">Niveau suivant</button>' : ''}
      </div>`)
    $('mKeep').onclick = closeModal
    $('mHome').onclick = () => { closeModal(); goHome() }
    if (next) $('mNext').onclick = () => { closeModal(); openLevel(S.idx + 1) }
    if ($('mBoard')) $('mBoard').onclick = () => setTimeout(() => showBoard(gen.day), 0)
    if ($('mAgain')) $('mAgain').onclick = () => { closeModal(); startFree(gen.diff) }
  }

  function goHome() { renderHome(); show('home') }

  // ---------- Démarrage ----------
  $('goHome').onclick = goHome
  $('bUndo').onclick = undo
  $('bReset').onclick = () => { if (confirm('Revenir au plan de départ de ce niveau ?')) openLevel(S.idx, S.level._gen ? S.level : undefined) }
  const syncSoundBtns = () => {
    $('bSnd').classList.toggle('on', window.ArchiSound ? window.ArchiSound.fx : false)
    $('bMus').classList.toggle('on', window.ArchiSound ? window.ArchiSound.music : false)
  }
  $('bSnd').onclick = () => { window.ArchiSound.setFx(!window.ArchiSound.fx); syncSoundBtns(); snd('click') }
  $('bMus').onclick = () => { window.ArchiSound.setMusic(!window.ArchiSound.music); syncSoundBtns() }
  $('bAcc').onclick = showAccount
  syncSoundBtns()
  if (window.ArchiCloud) {
    window.ArchiCloud.onChange(onUserChange)
    window.ArchiCloud.init()
  }
  $('bHint').onclick = giveHint
  $('bAdd').onclick = addRoom
  $('bAddItem').onclick = addItem
  document.querySelectorAll('#tools .tool').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)))
  $('bView').onclick = () => S.view.resetView(S.level)
  $('roofToggle').onchange = (e) => S.view.setRoof(e.target.checked)
  $('upperToggle').onchange = (e) => S.view.setHideUpper(e.target.checked)
  $('timeToggle').onchange = (e) => S.view.setTime && S.view.setTime(e.target.checked ? 'evening' : 'day')
  document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => {
    $('game').dataset.tab = b.dataset.t
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b))
  }))
  $('modal').addEventListener('mousedown', (e) => { if (e.target === $('modal')) closeModal() })
  document.addEventListener('keydown', (e) => {
    if ($('game').classList.contains('hidden')) return
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo() }
    else if (e.key === 'Delete' || e.key === 'Backspace') deleteSel()
    else if (e.key.toLowerCase() === 'r' && S.selItem) rotateItem()
  })
  bindPlan()
  renderHome()

  // Pour les tests automatiques
  window.__archi = { S, openLevel, refresh, validate, setFloor, addItem }
})()
