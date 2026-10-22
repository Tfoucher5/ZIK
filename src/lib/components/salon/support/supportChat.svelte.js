// Chat avec le support ZIK, partagé par la régie et l'écran TV.
// Le serveur renvoie l'échange complet (100 messages max) à chaque changement.

const lastAdminId = (s) =>
  s?.messages.findLast((m) => m.from === "admin")?.id ?? 0;

export class SupportChat {
  state = $state(null);
  expanded = $state(false);
  dismissed = $state(false);
  seen = $state(0);
  #socket = null;

  unread = $derived(
    this.expanded
      ? 0
      : (this.state?.messages ?? []).filter(
          (m) => m.from === "admin" && m.id > this.seen,
        ).length,
  );
  visible = $derived(!!this.state && (this.state.open || !this.dismissed));
  active = $derived(!!this.state?.open);

  attach(socket) {
    this.#socket = socket;
    socket.on("salon_support", (v) => this.update(v));
  }

  update(v) {
    const prev = this.state;
    this.state = v ?? null;
    if (!v) return;
    // Un échange déjà clos au chargement de la page ne revient pas à l'écran
    if (!v.open && !prev) this.dismissed = true;
    if (v.open && (!prev?.open || (!lastAdminId(prev) && lastAdminId(v)))) {
      this.expanded = true;
      this.dismissed = false;
    }
    if (this.expanded) this.seen = lastAdminId(v);
  }

  toggle() {
    this.expanded = !this.expanded;
    if (this.expanded) this.seen = lastAdminId(this.state);
  }

  dismiss() {
    this.dismissed = true;
    this.expanded = false;
  }

  #emit(event, payload) {
    const socket = this.#socket;
    if (!socket?.connected)
      return Promise.resolve({
        ok: false,
        error: "Pas de connexion au salon.",
      });
    return new Promise((resolve) =>
      socket.timeout(8000).emit(event, payload, (err, res) => {
        if (err) resolve({ ok: false, error: "Pas de réponse, réessaie." });
        else {
          if (res.ok) this.update(res.support);
          resolve(res);
        }
      }),
    );
  }

  call(message) {
    return this.#emit("salon_support_call", { message });
  }

  send(text) {
    return this.#emit("salon_support_send", { text });
  }
}
