// Chargement d'une collection et du détail d'un set
export class CollectionStore {
  data = $state(null);
  status = $state("loading"); // loading | ready | private | error | login
  setDetail = $state(null);
  setLoading = $state(false);

  constructor(sb) {
    this.sb = sb;
  }

  async authHeaders() {
    const token = (await this.sb?.auth.getSession())?.data?.session
      ?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  async load(name) {
    const headers = await this.authHeaders();
    if (!headers) {
      this.status = "login";
      return;
    }
    const r = await fetch(`/api/cards/collection/${encodeURIComponent(name)}`, {
      headers,
    }).catch(() => null);
    if (r?.status === 403) this.status = "private";
    else if (!r?.ok) this.status = "error";
    else {
      this.data = await r.json();
      this.status = "ready";
    }
  }

  loadSet(setId, username) {
    if (!setId) {
      this.setDetail = null;
      return;
    }
    this.setLoading = true;
    this.authHeaders().then(async (headers) => {
      const r = await fetch(
        `/api/cards/set/${setId}?user=${encodeURIComponent(username)}`,
        {
          headers: headers ?? {},
        },
      ).catch(() => null);
      this.setDetail = r?.ok ? await r.json() : null;
      this.setLoading = false;
    });
  }
}
