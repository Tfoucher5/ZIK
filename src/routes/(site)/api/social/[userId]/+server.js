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
  isFriend: false,
};

export async function GET({ params, request }) {
  const userId = params.userId;

  try {
    // Abonnements (ceux que userId suit) et abonnés (ceux qui suivent userId)
    const [followingRes, followersRes] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", userId),
      supabase.from("follows").select("follower_id").eq("following_id", userId),
    ]);

    // Si la table n'existe pas encore, on renvoie un état vide plutôt que d'échouer.
    if (followingRes.error || followersRes.error) return json(EMPTY);

    const followingIds = new Set(
      (followingRes.data || []).map((r) => r.following_id),
    );
    const followerIds = new Set(
      (followersRes.data || []).map((r) => r.follower_id),
    );
    const friendIds = [...followingIds].filter((id) => followerIds.has(id));

    // Enrichit les amis avec leur profil (triés par ELO)
    let friends = [];
    if (friendIds.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, elo, level")
        .in("id", friendIds)
        .order("elo", { ascending: false })
        .limit(12);
      friends = data || [];
    }

    // Relation du visiteur connecté (si token fourni)
    let viewerFollows = false;
    let followsViewer = false;
    const token = request.headers.get("authorization")?.slice(7);
    if (token) {
      const viewer = await verifyToken(token);
      if (viewer && viewer.id !== userId) {
        viewerFollows = followerIds.has(viewer.id);
        followsViewer = followingIds.has(viewer.id);
      }
    }

    return json({
      followers: followerIds.size,
      following: followingIds.size,
      friendsCount: friendIds.length,
      friends,
      viewerFollows,
      followsViewer,
      isFriend: viewerFollows && followsViewer,
    });
  } catch {
    return json(EMPTY);
  }
}
