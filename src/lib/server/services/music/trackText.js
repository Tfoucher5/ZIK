// Texte des titres et artistes : forme comparable (réponses), forme affichée,
// et découpage des featurings.

export function cleanString(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ *\([^)]*\) */g, "")
    .replace(/ *\[[^\]]*\] */g, "")
    .replace(/[''`]/g, "'")
    .replace(/[-\u2013\u2014]/g, " ")
    .trim()
    .toLowerCase();
}

export function displayString(str) {
  if (!str) return "";
  return str
    .replace(/ *\([^)]*\) */g, " ")
    .replace(/ *\[[^\]]*\] */g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFeaturing(artistStr) {
  if (!artistStr) return { main: "", feats: [] };

  // 1. Explicit feat keyword in parentheses: "Artist (feat. X, Y)"
  const mParen = artistStr.match(
    /^(.+?)\s*\((?:feat\.?|ft\.?|featuring|with|avec)\s+([^)]+)\)\s*$/i,
  );
  if (mParen) {
    const feats = mParen[2]
      .split(/\s*[,&]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { main: mParen[1].trim(), feats };
  }

  // 2. Explicit feat keyword without parentheses: "Artist feat. X & Y"
  const mFeat = artistStr.match(
    /^(.+?)\s+(?:feat\.?|ft\.?|featuring|with|avec)\s+(.+)$/i,
  );
  if (mFeat) {
    const feats = mFeat[2]
      .split(/\s*[,&]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { main: mFeat[1].trim(), feats };
  }

  // 3. Comma-separated artists (Spotify format: "Artist1, Artist2, Artist3")
  //    Only split if 3+ artists, or exactly 2 but neither contains & (to avoid
  //    splitting duo names like "Earth, Wind & Fire" incorrectly won't appear
  //    since the comma format is from APIs that list separate artists).
  //    Require 2+ artists without & in either part to be safe.
  const commaParts = artistStr
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
  if (commaParts.length >= 3) {
    return { main: commaParts[0], feats: commaParts.slice(1) };
  }
  if (
    commaParts.length === 2 &&
    !commaParts[0].includes("&") &&
    !commaParts[1].includes("&")
  ) {
    return { main: commaParts[0], feats: [commaParts[1]] };
  }

  // 4. No feat found — treat the whole string as one artist
  //    (handles duos like "Bigflo & Oli", "Macklemore & Ryan Lewis")
  return { main: artistStr, feats: [] };
}
