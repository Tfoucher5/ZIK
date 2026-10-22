// Le titre ne doit jamais apparaître dans les contrôles système du téléphone :
// on fige des métadonnées factices sur la Media Session.

const FAKE_META = {
  title: "♪ ♪ ♪",
  artist: "???",
  album: "ZIK — Blind Test",
  artwork: [
    {
      src: "/favicon/web-app-manifest-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
  ],
};

export function lockMediaSession() {
  if (!("mediaSession" in navigator)) return;
  try {
    const fake = new MediaMetadata(FAKE_META);
    Object.defineProperty(navigator.mediaSession, "metadata", {
      get: () => fake,
      set: () => {},
      configurable: true,
    });
  } catch {
    /* navigateur sans MediaMetadata */
  }
  navigator.mediaSession.playbackState = "playing";
}

export function unlockMediaSession() {
  try {
    Object.defineProperty(navigator.mediaSession, "metadata", {
      get: () => null,
      set: () => {},
      configurable: true,
    });
  } catch {
    /* navigateur sans mediaSession */
  }
  if ("mediaSession" in navigator)
    navigator.mediaSession.playbackState = "none";
}
