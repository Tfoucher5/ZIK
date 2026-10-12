export class HomeState {
  rooms = $state([]);
  totalOnline = $state(0);
  globalStats = $state({ users: 0, gamesMonth: 0 });
  guestOpen = $state(false);
  liveRooms = $derived(
    this.rooms.filter((r) => r.online > 0).sort((a, b) => b.online - a.online),
  );
  #pendingRoom = null;
  #pendingGameMode = "classic";
  #roomsTimer = null;

  constructor(data) {
    this.rooms = data.rooms ?? [];
    this.totalOnline = data.totalOnline ?? 0;
    this.globalStats = data.globalStats ?? { users: 0, gamesMonth: 0 };
  }

  start() {
    this.loadRooms();
    this.loadStats();
    const statsTimer = setInterval(() => {
      if (!document.hidden) this.loadStats();
    }, 60_000);
    const onVisible = () => {
      if (!document.hidden) this.loadRooms();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(statsTimer);
      clearTimeout(this.#roomsTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }

  loadRooms = async () => {
    clearTimeout(this.#roomsTimer);
    try {
      const res = await fetch("/api/rooms/official");
      const data = await res.json();
      this.rooms = data.rooms ?? data;
      this.totalOnline =
        data.totalOnline ?? this.rooms.reduce((s, r) => s + (r.online || 0), 0);
    } catch {
      this.rooms = [];
    }
    if (!document.hidden) this.#roomsTimer = setTimeout(this.loadRooms, 30_000);
  };

  async loadStats() {
    try {
      const r = await fetch("/api/stats/global", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        this.globalStats = {
          users: d.users ?? 0,
          gamesMonth: d.gamesMonth ?? 0,
        };
      }
    } catch {
      /* réseau */
    }
  }

  joinRoom = (roomId, gameMode = "classic") => {
    const userId = sessionStorage.getItem("zik_uid");
    const name = sessionStorage.getItem("zik_uname");
    if (userId && name)
      this.navigateToGame(roomId, name, userId, false, gameMode);
    else this.#openGuestModal(roomId, gameMode);
  };

  navigateToGame = (
    roomId,
    username,
    userId,
    isGuest,
    gameMode = "classic",
  ) => {
    if (!username) {
      this.#openGuestModal(roomId, gameMode);
      return;
    }
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- valeur temporaire, pas d'état
    window.location.href = `/game?${new URLSearchParams({
      roomId,
      username,
      userId: userId || "",
      isGuest: isGuest ? "1" : "0",
      gameMode,
    })}`;
  };

  #openGuestModal(roomId, gameMode) {
    this.#pendingRoom = roomId;
    this.#pendingGameMode = gameMode;
    this.guestOpen = true;
  }

  confirmGuest = (name) => {
    this.guestOpen = false;
    this.navigateToGame(
      this.#pendingRoom,
      name,
      null,
      true,
      this.#pendingGameMode,
    );
  };
}
