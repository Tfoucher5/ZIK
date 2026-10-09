import { RARITIES } from "../../components/card/rarity.js";

// Texte et lien de la notification d'appareil pour chaque type de la cloche.

export const CATEGORY_OF_TYPE = {
  friend_request: "social",
  friend_accept: "social",
  room_invite: "social",
  card_up: "cards",
  card_mythic: "cards",
  card_set_near: "cards",
};

const SET_LABEL = { album: "l'album", artist: "l'artiste" };

export function pushMessageFor(n) {
  const who = n.actor?.username || "Un joueur";
  const p = n.payload || {};
  const base = {
    tag: `${n.type}:${n.id}`,
    icon: n.actor?.avatar_url || undefined,
  };
  switch (n.type) {
    case "friend_request":
      return {
        ...base,
        title: "Nouvelle demande d'ami",
        body: `${who} veut t'ajouter en ami`,
        url: `/user/${who}`,
      };
    case "friend_accept":
      return {
        ...base,
        title: "Demande acceptée",
        body: `${who} a accepté ta demande d'ami`,
        url: `/user/${who}`,
      };
    case "room_invite":
      return {
        ...base,
        title: "Invitation à jouer",
        body: `${who} t'invite dans ${p.roomName || "sa room"}`,
        url: `/room/${p.roomId}`,
      };
    case "card_up":
      return {
        ...base,
        icon: undefined,
        title: "Ta carte a pris du galon",
        body: `${p.title} est passée ${RARITIES[p.rarity]?.label ?? ""}`,
        url: `/carte/${p.number}`,
      };
    case "card_mythic":
      return {
        ...base,
        title: "Carte Mythique 🌟",
        body: `${who} a décroché ${p.title} - ${p.artist}`,
        url: `/carte/${p.number}`,
      };
    case "card_set_near":
      return {
        ...base,
        icon: p.cover || undefined,
        title: "Plus qu'une carte !",
        body: `Il te manque une carte pour finir ${SET_LABEL[p.kind] ?? "le set"} ${p.setName}${p.roomName ? `. Elle passe dans la room ${p.roomName}` : ""}`,
        url: p.roomCode ? `/room/${p.roomCode}` : "/collection",
      };
    default:
      return null;
  }
}
