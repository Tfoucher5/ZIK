const LOGO_SIZE = 256;

// Espace « Mon lieu » d'un compte ZIK Pro
export class VenueAdmin {
  ready = $state(false);
  pro = $state(false);
  venue = $state(null);
  form = $state({});
  events = $state([]);
  ranking = $state([]);
  stats = $state(null);
  followers = $state(0);
  recap = $state(null);
  busy = $state(false);
  message = $state("");
  error = $state("");
  dirty = $derived(
    JSON.stringify(this.form) !== JSON.stringify(this.venue ?? {}),
  );

  constructor(zik) {
    this.zik = zik;
    $effect(() => {
      if (zik.user) this.load();
    });
  }

  async call(path, method = "GET", body) {
    const {
      data: { session },
    } = await this.zik.sb.auth.getSession();
    const res = await fetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: body && JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.message || "Erreur, réessayez.");
    return d;
  }

  async load() {
    this.pro = !!this.zik.user.pro;
    const d = await this.call("/api/venue");
    this.venue = d.venue;
    this.form = { ...(d.venue ?? {}) };
    this.events = d.events;
    this.ranking = d.ranking;
    this.stats = d.stats;
    this.followers = d.followers;
    this.recap = d.recap;
    this.ready = true;
  }

  async run(fn, done) {
    this.busy = true;
    this.error = "";
    this.message = "";
    try {
      await fn();
      this.message = typeof done === "function" ? done() : done;
      setTimeout(() => (this.message = ""), 3000);
    } catch (e) {
      this.error = e.message;
    }
    this.busy = false;
  }

  save() {
    return this.run(async () => {
      const d = await this.call("/api/venue", "PUT", this.form);
      this.venue = d.venue;
      this.form = { ...d.venue };
    }, "Lieu enregistré.");
  }

  addEvent(startsAt, theme) {
    return this.run(
      async () => {
        const d = await this.call("/api/venue/events", "POST", {
          // datetime-local est en heure locale : le serveur reçoit l'instant exact
          // eslint-disable-next-line svelte/prefer-svelte-reactivity
          startsAt: new Date(startsAt).toISOString(),
          theme,
        });
        this.events = d.events;
      },
      () =>
        this.followers
          ? "Soirée ajoutée. Vous pouvez maintenant prévenir ceux qui vous suivent."
          : "Soirée ajoutée.",
    );
  }

  notifyEvent(id) {
    let sent = 0;
    return this.run(
      async () => {
        const d = await this.call("/api/venue/events/notify", "POST", { id });
        this.events = d.events;
        sent = d.sent;
      },
      () => `Notification envoyée à ${sent} joueur${sent > 1 ? "s" : ""}.`,
    );
  }

  setReminders(on) {
    return this.run(
      async () => {
        await this.call("/api/venue", "PATCH", { reminders: on });
        this.venue.reminders = on;
        this.form.reminders = on;
      },
      on ? "Rappel du jour J activé." : "Rappel du jour J coupé.",
    );
  }

  removeEvent(id) {
    return this.run(async () => {
      const d = await this.call(`/api/venue/events?id=${id}`, "DELETE");
      this.events = d.events;
    }, "Soirée retirée.");
  }

  // Logo réduit dans le navigateur : il est stocké tel quel avec le lieu
  async setLogo(file) {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, LOGO_SIZE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    this.form.logo = canvas.toDataURL("image/webp", 0.85);
  }
}
