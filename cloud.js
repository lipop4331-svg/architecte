// Compte en ligne (Supabase) : sauvegarde de la progression et classement du niveau du jour.
// L'URL et la clé "anon" sont publiques par conception : la sécurité vient des règles SQL (supabase.sql).
// Ne mettez JAMAIS ici une clé "secret" ou "service_role".
;(function (root) {
  const SUPABASE_URL = 'https://pdnjrtprfkixanfmjyky.supabase.co'
  const SUPABASE_KEY = 'sb_publishable_0luFoN6Ssd_eIe9mM1Diqg_DXnqqqlo'

  const Cloud = {
    sb: null,
    user: null,
    ready: false,
    listeners: [],
    onChange(fn) { this.listeners.push(fn) },
    emit() { this.listeners.forEach((f) => { try { f(this.user) } catch (e) { /* ignoré */ } }) },

    async init() {
      if (this.ready || !root.supabase) return
      try {
        this.sb = root.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        this.ready = true
        const { data } = await this.sb.auth.getSession()
        this.user = data.session ? data.session.user : null
        this.sb.auth.onAuthStateChange((_ev, session) => {
          const u = session ? session.user : null
          if ((u && u.id) !== (this.user && this.user.id)) { this.user = u; this.emit() }
        })
        this.emit()
      } catch (e) { this.sb = null }
    },

    async signIn(email, password) {
      const { data, error } = await this.sb.auth.signInWithPassword({ email, password })
      if (error) throw error
      this.user = data.user
      this.emit()
    },
    // Renvoie true si connecté tout de suite, false si une confirmation par e-mail est demandée
    async signUp(email, password) {
      const { data, error } = await this.sb.auth.signUp({ email, password })
      if (error) throw error
      if (data.session) { this.user = data.user; this.emit(); return true }
      return false
    },
    async signOut() {
      try { await this.sb.auth.signOut() } catch (e) { /* ignoré */ }
      this.user = null
      this.emit()
    },

    // Progression
    async loadProgress() {
      if (!this.user) return null
      const { data, error } = await this.sb.from('archi_saves').select('data').eq('user_id', this.user.id).maybeSingle()
      if (error) throw error
      return data && data.data ? data.data : null
    },
    async saveProgress(progress) {
      if (!this.user) return
      const { error } = await this.sb.from('archi_saves').upsert({ user_id: this.user.id, data: progress, updated_at: new Date().toISOString() })
      if (error) throw error
    },

    // Classement du niveau du jour
    async submitScore(day, s) {
      if (!this.user) return
      const { data } = await this.sb.from('archi_scores').select('stars,time_s,moves').eq('day', day).eq('user_id', this.user.id).maybeSingle()
      const better = !data || s.stars > data.stars || (s.stars === data.stars && s.time < data.time_s)
      if (!better) return
      const { error } = await this.sb.from('archi_scores').upsert({ day, user_id: this.user.id, name: s.name, stars: s.stars, time_s: s.time, moves: s.moves, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    async topScores(day) {
      const { data, error } = await this.sb.from('archi_scores').select('user_id,name,stars,time_s,moves').eq('day', day).order('stars', { ascending: false }).order('time_s', { ascending: true }).limit(20)
      if (error) throw error
      return data || []
    },
  }
  root.ArchiCloud = Cloud
})(typeof self !== 'undefined' ? self : this)
