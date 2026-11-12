import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { verifyToken } from "$lib/server/middleware/auth.js";

const EMPTY = {
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
};

const PROFIL = "id, username, avatar_url, elo, level";

export async function GET({ params, request }) {
  const userId = params.userId;

  try {
    // Viewer connecté (si token fourni)
    let viewerId = null;
    const token = request.headers.get("authorization")?.slice(7);
    if (token) {
      const viewer = await verifyToken(token);
      if (viewer) viewerId = viewer.id;
    }
    const isOwn = viewerId && viewerId === userId;

    const [followingRes, followersRes, friendRes] = await Promise.all([
      supabase
        .schema("social")
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId),
      supabase
        .schema("social")
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId),
      supabase
        .schema("social")
        .from("friendships")
        .select(
          `requester_id, addressee_id, status, requester(${PROFIL}), addressee(${PROFIL})`,
        )
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    ]);

    // Si les tables n'existent pas encore, on renvoie un état vide plutôt que d'échouer.
    if (followingRes.error || followersRes.error || friendRes.error)
      return json(EMPTY);

    const followingIds = new Set(
      (followingRes.data || []).map((r) => r.following_id),
    );
    const followerIds = new Set(
      (followersRes.data || []).map((r) => r.follower_id),
    );

    // Amitiés : l'autre extrémité de chaque ligne impliquant userId
    const friends = [];
    const pendingRequests = []; // demandes reçues par userId (pending, userId = addressee)
    let friendStatus = "none";

    for (const f of friendRes.data || []) {
      const mine = f.requester_id === userId;
      const other = mine ? f.addressee_id : f.requester_id;
      if (f.status === "accepted") {
        friends.push(mine ? f.addressee : f.requester);
        if (viewerId && other === viewerId) friendStatus = "friends";
      } else if (f.status === "pending") {
        if (f.addressee_id === userId) pendingRequests.push(f.requester);
        if (viewerId && friendStatus === "none") {
          // demande impliquant le viewer et userId
          if (f.requester_id === viewerId && f.addressee_id === userId)
            friendStatus = "pending_out";
          else if (f.requester_id === userId && f.addressee_id === viewerId)
            friendStatus = "pending_in";
        }
      }
    }

    const shown = (list) => list.filter(Boolean).slice(0, 20);

    return json({
      followers: followerIds.size,
      following: followingIds.size,
      friendsCount: friends.length,
      friends: shown(friends.toSorted((a, b) => (b?.elo ?? 0) - (a?.elo ?? 0))),
      viewerFollows: viewerId ? followerIds.has(viewerId) && !isOwn : false,
      followsViewer: viewerId ? followingIds.has(viewerId) && !isOwn : false,
      friendStatus,
      isFriend: friendStatus === "friends",
      pendingRequests: isOwn ? shown(pendingRequests) : [],
      pendingCount: pendingRequests.length,
    });
  } catch {
    return json(EMPTY);
  }
}
