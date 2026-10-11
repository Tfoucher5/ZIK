import { toast } from "$lib/toast.svelte.js";

const LAST_KEY = "zik_pl_last";

function key(t) {
  const n = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  return `${n(t.artist)}|${n(t.title)}`;
}

// Métadonnées canoniques du catalogue `tracks` aplaties sur la ligne de liaison.
function flatten(row) {
  const { tracks: meta, ...rest } = row;
  return {
    ...rest,
    track_id: meta.id,
    artist: meta.artist,
    title: meta.title,
    preview_url: meta.preview_url,
    cover_url: meta.cover_url,
    external_id: meta.external_id,
    source: meta.source,
    youtube_id: meta.youtube_id,
  };
}

// Playlists de l'utilisateur et titres de celle ouverte, partagés par l'éditeur.
export class PlaylistStore {
  playlists = $state([]);
  loading = $state(true);
  current = $state(null);
  tracks = $state([]);
  tracksLoading = $state(false);
  sessionAdded = $state(0);

  #byExt = $derived(
    Object.fromEntries(
      this.tracks.filter((t) => t.external_id).map((t) => [t.external_id, t]),
    ),
  );
  #byKey = $derived(Object.fromEntries(this.tracks.map((t) => [key(t), t])));

  #sb;
  #getUser;

  constructor(sb, getUser) {
    this.#sb = sb;
    this.#getUser = getUser;
  }

  async token() {
    const {
      data: { session },
      error,
    } = await this.#sb.auth.getSession();
    if (error || !session) throw new Error("Session expirée, reconnecte-toi.");
    if (session.expires_at * 1000 - Date.now() < 60_000) {
      const { data, error: e } = await this.#sb.auth.refreshSession();
      if (e || !data.session)
        throw new Error("Session expirée, reconnecte-toi.");
      return data.session.access_token;
    }
    return session.access_token;
  }

  async api(path, { method = "GET", body } = {}) {
    const r = await fetch(path, {
      method,
      headers: {
        authorization: `Bearer ${await this.token()}`,
        "content-type": "application/json",
      },
      body: body && JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(data.error || data.message || `HTTP ${r.status}`);
    return data;
  }

  async load() {
    const user = this.#getUser();
    if (!user) {
      this.loading = false;
      return;
    }
    this.loading = true;
    const { data } = await this.#sb
      .from("custom_playlists")
      .select("*, custom_playlist_tracks!playlist_id(count)")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });
    this.playlists = (data || []).map((pl) => ({
      ...pl,
      track_count: pl.custom_playlist_tracks?.[0]?.count ?? 0,
    }));
    this.loading = false;
    if (!this.current && this.playlists.length) {
      let last = null;
      try {
        last = localStorage.getItem(LAST_KEY);
      } catch {
        /* stockage bloqué */
      }
      await this.open(
        this.playlists.find((p) => p.id === last) ?? this.playlists[0],
      );
    }
  }

  async open(pl) {
    this.current = pl;
    this.tracks = [];
    this.tracksLoading = true;
    try {
      localStorage.setItem(LAST_KEY, pl.id);
    } catch {
      /* stockage bloqué */
    }
    const { data, error } = await this.#sb
      .from("custom_playlist_tracks")
      .select("*, tracks(*)")
      .eq("playlist_id", pl.id)
      .order("position");
    if (this.current?.id !== pl.id) return;
    this.tracksLoading = false;
    if (error) {
      toast(error.message, "error");
      return;
    }
    this.tracks = data.map(flatten);
  }

  #syncCount() {
    const id = this.current?.id;
    this.playlists = this.playlists.map((p) =>
      p.id === id ? { ...p, track_count: this.tracks.length } : p,
    );
  }

  async save({ name, emoji, is_public }, existing) {
    if (existing) {
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- simple horodatage
      const updated_at = new Date().toISOString();
      const { error } = await this.#sb
        .from("custom_playlists")
        .update({ name, emoji, is_public, updated_at })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      this.playlists = this.playlists.map((p) =>
        p.id === existing.id ? { ...p, name, emoji, is_public } : p,
      );
      if (this.current?.id === existing.id)
        this.current = { ...this.current, name, emoji, is_public };
      return;
    }
    const { data, error } = await this.#sb
      .from("custom_playlists")
      .insert({ owner_id: this.#getUser().id, name, emoji, is_public })
      .select()
      .single();
    if (error) throw new Error(error.message);
    this.playlists = [{ ...data, track_count: 0 }, ...this.playlists];
    await this.open(data);
  }

  async remove() {
    const id = this.current.id;
    await this.api(`/api/playlists/${id}`, { method: "DELETE" });
    this.playlists = this.playlists.filter((p) => p.id !== id);
    this.current = null;
    this.tracks = [];
    if (this.playlists.length) await this.open(this.playlists[0]);
  }

  find(t) {
    return (
      (t.external_id && this.#byExt[t.external_id]) ||
      this.#byKey[key(t)] ||
      null
    );
  }

  async #resolve(list) {
    return this.api("/api/tracks/resolve", {
      method: "POST",
      body: { tracks: list },
    });
  }

  async #link(ids) {
    const linked = Object.fromEntries(
      this.tracks.map((t) => [t.track_id, true]),
    );
    const rows = [];
    for (const id of ids) {
      if (linked[id]) continue;
      linked[id] = true;
      rows.push({
        playlist_id: this.current.id,
        track_id: id,
        position: this.tracks.length + rows.length,
      });
    }
    if (!rows.length) return 0;
    const { data, error } = await this.#sb
      .from("custom_playlist_tracks")
      .insert(rows)
      .select("*, tracks(*)");
    if (error) throw new Error(error.message);
    this.tracks = [...this.tracks, ...data.map(flatten)];
    this.sessionAdded += data.length;
    this.#syncCount();
    return data.length;
  }

  // Un titre, version auto (ou vidéo YouTube collée). Renvoie false si refusé.
  async add(track) {
    if (this.find(track)) {
      toast("Déjà dans la playlist.", "error");
      return false;
    }
    try {
      const { ids, pinned } = await this.#resolve([track]);
      if (!(await this.#link(ids))) {
        toast("Déjà dans la playlist.", "error");
        return false;
      }
      if (pinned === false)
        toast(
          "Ajouté, mais ce titre avait déjà une version vérifiée : elle est gardée.",
          "error",
        );
      return true;
    } catch (e) {
      toast(e.message, "error");
      return false;
    }
  }

  async addBatch(list) {
    const fresh = list.filter((t) => !this.find(t));
    if (!fresh.length) return 0;
    try {
      const { ids } = await this.#resolve(fresh);
      return await this.#link(ids);
    } catch (e) {
      toast(e.message, "error");
      return 0;
    }
  }

  async unlink(row) {
    const { error } = await this.#sb
      .from("custom_playlist_tracks")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast(error.message, "error");
      return;
    }
    this.tracks = this.tracks.filter((t) => t.id !== row.id);
    this.#syncCount();
  }

  // Bouton +/✓ des résultats : ajoute, ou retire si déjà présent.
  async toggle(track) {
    const row = this.find(track);
    if (row) {
      await this.unlink(row);
      return false;
    }
    return this.add(track);
  }

  setVideo(trackId, youtubeId) {
    this.tracks = this.tracks.map((t) =>
      t.track_id === trackId ? { ...t, youtube_id: youtubeId } : t,
    );
  }
}
