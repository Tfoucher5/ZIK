const AHEAD = 3;

async function post(path, token, body) {
  const r = await fetch(`${path}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
  return d;
}

// File des titres signalés « vidéo » : un clic épingle la vidéo, règle le
// signalement et passe au suivant. Les recherches des titres d'après partent
// en avance pour que les propositions soient déjà là.
export class VideoQueue {
  items = $state(null);
  index = $state(0);
  results = $state({});
  done = $state(0);
  failures = $state([]);
  loadErr = $state('');

  constructor(token) {
    this.token = token;
  }

  current = $derived(this.items?.[this.index] ?? null);
  candidates = $derived(this.current ? this.results[this.current.id] : null);

  async load() {
    const r = await fetch(`/api/admin/issues?status=open&kind=video&token=${encodeURIComponent(this.token)}`);
    const d = await r.json();
    if (!r.ok) { this.loadErr = d.error || 'Chargement impossible.'; this.items = []; return; }
    this.items = d.issues;
    this.prefetch();
  }

  search(issue, query = `${issue.track.artist} - ${issue.track.title}`) {
    this.results[issue.id] = { query, videos: null, err: '' };
    return post('/api/admin/track-video-search', this.token, { query })
      .then((d) => (this.results[issue.id] = { query, videos: d.videos, err: '' }))
      .catch((e) => (this.results[issue.id] = { query, videos: [], err: e.message }));
  }

  prefetch() {
    for (const issue of this.items.slice(this.index, this.index + AHEAD + 1))
      if (!this.results[issue.id]) this.search(issue);
  }

  next() {
    delete this.results[this.current.id];
    this.index++;
    this.prefetch();
  }

  // Départ de l'extrait laissé vide : le jeu le tire tout seul
  pick(video) {
    const issue = this.current;
    this.next();
    post('/api/admin/track-audio-fix', this.token, { trackId: issue.track.id, youtubeId: video.id, youtubeStart: null })
      .then(() => post('/api/admin/issues', this.token, { id: issue.id, action: 'fix' }))
      .then(() => this.done++)
      .catch((e) => this.failures.push({ issue, error: e.message }));
  }

  ignore() {
    const issue = this.current;
    this.next();
    post('/api/admin/issues', this.token, { id: issue.id, action: 'ignore' })
      .catch((e) => this.failures.push({ issue, error: e.message }));
  }

  // Remis en fin de file, le signalement reste ouvert
  skip() {
    const issue = this.current;
    this.next();
    this.items.push(issue);
  }
}
