// Sons et musique de « L'Architecte » : tout est synthétisé avec WebAudio (aucun fichier audio).
// Bruit de crayon, clics, « ding » de validation, petite mélodie douce en fond.
;(function (root) {
  const KEY = 'archi:sound'
  let cfg = { fx: true, music: true }
  try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch (e) { /* stockage indisponible */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)) } catch (e) { /* ignoré */ } }

  let ctx = null, master = null, musicGain = null, noiseBuf = null, musicTimer = null, started = false
  const Ctor = root.AudioContext || root.webkitAudioContext

  function ensure() {
    if (ctx || !Ctor) return !!ctx
    try {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.9
      master.connect(ctx.destination)
      musicGain = ctx.createGain()
      musicGain.gain.value = cfg.music ? 1 : 0
      // petit écho pour donner de l'air à la musique
      const delay = ctx.createDelay(1.0), fb = ctx.createGain(), wet = ctx.createGain()
      delay.delayTime.value = 0.42
      fb.gain.value = 0.38
      wet.gain.value = 0.5
      musicGain.connect(master)
      musicGain.connect(delay)
      delay.connect(fb)
      fb.connect(delay)
      delay.connect(wet)
      wet.connect(master)
      const len = ctx.sampleRate * 0.5
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    } catch (e) { ctx = null }
    return !!ctx
  }

  function tone(freq, t0, dur, { type = 'sine', vol = 0.2, to = null, dest = null, attack = 0.008 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g)
    g.connect(dest || master)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }

  function noise(t0, dur, { freq = 3000, q = 1, vol = 0.12, type = 'bandpass' } = {}) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
    s.buffer = noiseBuf
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    s.connect(f)
    f.connect(g)
    g.connect(master)
    s.start(t0, Math.random() * 0.3)
    s.stop(t0 + dur + 0.05)
  }

  const now = () => ctx.currentTime
  let lastPencil = 0

  const FX = {
    // trait de crayon quand on déplace une pièce ou un meuble
    pencil() {
      const t = now()
      if (t - lastPencil < 0.07) return
      lastPencil = t
      noise(t, 0.09, { freq: 2600 + Math.random() * 1800, q: 0.8, vol: 0.09 })
    },
    click() { const t = now(); tone(520, t, 0.07, { type: 'triangle', vol: 0.12, to: 380 }) },
    place() { const t = now(); noise(t, 0.05, { freq: 900, q: 1.2, vol: 0.1 }); tone(240, t, 0.1, { type: 'sine', vol: 0.16, to: 150 }) },
    window() { const t = now(); tone(880, t, 0.08, { type: 'triangle', vol: 0.1 }); tone(1320, t + 0.05, 0.1, { type: 'triangle', vol: 0.08 }) },
    door() { const t = now(); tone(180, t, 0.12, { type: 'square', vol: 0.06, to: 120 }); noise(t, 0.07, { freq: 500, q: 1, vol: 0.12 }) },
    erase() { const t = now(); noise(t, 0.16, { freq: 1500, q: 0.5, vol: 0.12, type: 'highpass' }) },
    rotate() { const t = now(); tone(420, t, 0.12, { type: 'triangle', vol: 0.12, to: 640 }) },
    // bonne nouvelle : un critère vient d'être respecté
    good() { const t = now(); tone(660, t, 0.12, { type: 'sine', vol: 0.13 }); tone(990, t + 0.09, 0.18, { type: 'sine', vol: 0.12 }) },
    // dépassement de budget ou critère qui se casse
    bad() { const t = now(); tone(200, t, 0.2, { type: 'sawtooth', vol: 0.07, to: 130 }); tone(150, t + 0.12, 0.25, { type: 'sawtooth', vol: 0.06, to: 100 }) },
    error() { const t = now(); tone(180, t, 0.16, { type: 'square', vol: 0.06, to: 110 }) },
    twist() { const t = now(); [440, 415, 392, 370].forEach((f, i) => tone(f, t + i * 0.13, 0.22, { type: 'triangle', vol: 0.12 })) },
    // « ding » de validation (plus riche avec trois étoiles)
    ding(stars) {
      const t = now()
      const notes = stars >= 3 ? [784, 988, 1175, 1568] : [784, 988, 1175]
      notes.forEach((f, i) => {
        tone(f, t + i * 0.11, 1.1, { type: 'sine', vol: 0.16 })
        tone(f * 2, t + i * 0.11, 0.6, { type: 'sine', vol: 0.04 })
      })
    },
    unlock() { const t = now(); [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.3, { type: 'triangle', vol: 0.1 })) },
  }

  // Musique : accords doux qui changent lentement, quelques notes de pentatonique par-dessus
  const CHORDS = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]]
  const PENTA = [440, 493.88, 554.37, 659.25, 739.99, 880]
  let step = 0
  function musicTick() {
    if (!ctx || !cfg.music || ctx.state !== 'running') return
    const t = now() + 0.05, chord = CHORDS[step % CHORDS.length]
    chord.forEach((f, i) => tone(f, t + i * 0.05, 5.2, { type: 'sine', vol: 0.03, attack: 1.4, dest: musicGain }))
    const n = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) tone(PENTA[Math.floor(Math.random() * PENTA.length)], t + 0.8 + i * (0.9 + Math.random() * 0.8), 2.2, { type: 'triangle', vol: 0.025, attack: 0.04, dest: musicGain })
    step++
  }
  function startMusic() {
    if (musicTimer || !ensure()) return
    const run = () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); musicTick() }
    run()
    musicTimer = setInterval(run, 5000)
  }

  // Les navigateurs exigent un geste de l'utilisateur avant de produire du son
  function unlockAudio() {
    if (started) return
    started = true
    if (!ensure()) return
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    startMusic()
  }
  ;['pointerdown', 'keydown'].forEach((ev) => root.addEventListener(ev, unlockAudio, { once: false, passive: true }))

  root.ArchiSound = {
    play(name, arg) {
      if (!cfg.fx || !FX[name] || !ensure()) return
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      try { FX[name](arg) } catch (e) { /* ignoré */ }
    },
    get fx() { return cfg.fx },
    get music() { return cfg.music },
    setFx(v) { cfg.fx = !!v; save() },
    setMusic(v) {
      cfg.music = !!v
      save()
      if (musicGain) musicGain.gain.setTargetAtTime(cfg.music ? 1 : 0, ctx.currentTime, 0.3)
      if (cfg.music && started) startMusic()
    },
  }
})(typeof self !== 'undefined' ? self : this)
