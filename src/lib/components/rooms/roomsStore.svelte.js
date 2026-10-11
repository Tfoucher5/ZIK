// Rooms publiques, rooms de l'utilisateur et playlists disponibles pour en créer.
export class RoomsStore {
  publicRooms = $state([]);
  myRooms = $state([]);
  pubLoading = $state(true);
  mineLoading = $state(false);
  mineLoaded = $state(false);
  playlists = $state([]);
  itunesCovers = $state({});

  #sb;
  #getUser;

  constructor(sb, getUser) {
    this.#sb = sb;
    this.#getUser = getUser;
  }

  async token() {
    const {
      data: { session },
    } = await this.#sb.auth.getSession();
    return session?.access_token || null;
  }

  async api(path, { method = "GET", body } = {}) {
    const token = await this.token();
    const headers = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const r = await fetch(path, {
      method,
      headers,
      body: body && JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(data.error || data.message || `HTTP ${r.status}`);
    return data;
  }

  async loadPublic() {
    this.pubLoading = true;
    try {
      this.publicRooms = await this.api("/api/rooms");
    } catch {
      this.publicRooms = [];
    }
    this.pubLoading = false;
  }

  async loadMine() {
    if (!this.#getUser()) return;
    this.mineLoading = true;
    try {
      this.myRooms = await this.api("/api/rooms/mine");
    } catch {
      this.myRooms = [];
    }
    this.mineLoading = false;
    this.mineLoaded = true;
  }

  covers(r) {
    return r.covers?.length ? r.covers : this.itunesCovers[r.id] || [];
  }

  // Rooms sans pochettes en base : on en cherche sur iTunes d'après leur nom.
  async fillCovers(rooms) {
    const missing = rooms.filter(
      (r) => !r.covers?.length && !(r.id in this.itunesCovers),
    );
    if (!missing.length) return;
    this.itunesCovers = {
      ...this.itunesCovers,
      ...Object.fromEntries(missing.map((r) => [r.id, []])),
    };
    await Promise.all(
      missing.map(async (r) => {
        try {
          const res = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(r.name)}&media=music&entity=album&limit=4&country=fr`,
          );
          const d = await res.json();
          const urls = (d.results || [])
            .map((x) => x.artworkUrl100?.replace("100x100bb", "300x300bb"))
            .filter(Boolean);
          if (urls.length)
            this.itunesCovers = { ...this.itunesCovers, [r.id]: urls };
        } catch {
          /* pas bloquant */
        }
      }),
    );
  }

  async loadPlaylists() {
    const user = this.#getUser();
    if (!user) return;
    const [{ data: mine }, { data: shared }] = await Promise.all([
      this.#sb
        .from("custom_playlists")
        .select("id, name, emoji, track_count")
        .eq("owner_id", user.id)
        .order("name"),
      this.#sb
        .from("custom_playlists")
        .select("id, name, emoji, track_count, is_official")
        .or("is_public.eq.true,is_official.eq.true")
        .neq("owner_id", user.id)
        .order("name"),
    ]);
    const flat = (mine || []).map((p) => ({ ...p, group: "Mes playlists" }));
    for (const p of shared || [])
      if (!flat.some((f) => f.id === p.id))
        flat.push({ ...p, group: p.is_official ? "Officielles" : "Publiques" });
    this.playlists = flat;
  }

  getRoom(code) {
    return this.api(`/api/rooms/${code}`);
  }

  async save(body, id) {
    const d = id
      ? await this.api(`/api/rooms/${id}`, { method: "PATCH", body })
      : await this.api("/api/rooms", { method: "POST", body });
    await Promise.all([this.loadPublic(), this.loadMine()]);
    return d;
  }

  async remove(id) {
    await this.api(`/api/rooms/${id}`, { method: "DELETE" });
    this.myRooms = this.myRooms.filter((r) => r.id !== id);
    this.publicRooms = this.publicRooms.filter((r) => r.id !== id);
  }
}
