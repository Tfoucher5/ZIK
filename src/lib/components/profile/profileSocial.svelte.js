import {
  authToken,
  fetchSocial,
  sendFollow,
  sendFriend,
} from "../player/social.js";

const empty = () => ({
  followers: 0,
  following: 0,
  friendsCount: 0,
  friends: [],
  viewerFollows: false,
  followsViewer: false,
  friendStatus: "none",
  isFriend: false,
  pendingRequests: [],
  pendingCount: 0,
});

// Côté social d'un profil : abonnés, amis, présence en jeu et invitations.
export class ProfileSocial {
  social = $state(empty());
  followBusy = $state(false);
  friendBusy = $state(false);
  presenceMap = $state({});
  inviteOpen = $state(false);
  inviteTarget = $state(null);
  #ctx;

  /** ctx() renvoie { sb, profileId, viewerId, isOwn, canFollow } à jour */
  constructor(ctx) {
    this.#ctx = ctx;
  }

  load = async () => {
    const { sb, profileId } = this.#ctx();
    if (!sb || !profileId) return;
    try {
      const data = await fetchSocial(sb, profileId);
      if (data) this.social = data;
      this.#loadPresence();
    } catch {
      /* réseau indisponible */
    }
  };

  // Présence : mes amis (mon profil) ou le propriétaire du profil (si ami)
  async #loadPresence() {
    const { sb, profileId, viewerId, isOwn } = this.#ctx();
    if (!viewerId) return;
    const ids = isOwn
      ? this.social.friends.map((f) => f.id)
      : this.social.isFriend
        ? [profileId]
        : [];
    if (!ids.length) {
      this.presenceMap = {};
      return;
    }
    try {
      const r = await fetch(`/api/presence?ids=${ids.join(",")}`, {
        headers: { Authorization: `Bearer ${await authToken(sb)}` },
      });
      if (r.ok) this.presenceMap = await r.json();
    } catch {
      /* réseau indisponible */
    }
  }

  joinFriendRoom = (room) => {
    const username = sessionStorage.getItem("zik_uname") || "Joueur";
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- lu une seule fois, pas un état
    window.location.href = `/game?${new URLSearchParams({
      roomId: room.roomId,
      username,
      userId: this.#ctx().viewerId || "",
      isGuest: "0",
      gameMode: room.gameMode || "classic",
    })}`;
  };

  openInvite = (target) => {
    this.inviteTarget = target;
    this.inviteOpen = true;
  };

  toggleFollow = async () => {
    const { sb, profileId, canFollow } = this.#ctx();
    if (this.followBusy || !canFollow) return;
    this.followBusy = true;
    try {
      if (await sendFollow(sb, profileId)) await this.load();
    } finally {
      this.followBusy = false;
    }
  };

  friendAction = async (action, targetId = this.#ctx().profileId) => {
    if (this.friendBusy) return;
    this.friendBusy = true;
    try {
      if (await sendFriend(this.#ctx().sb, targetId, action)) await this.load();
    } finally {
      this.friendBusy = false;
    }
  };
}
