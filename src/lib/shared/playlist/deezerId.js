// Identifiant Deezer sûr d'un titre : complété en base, ou celui d'un import Deezer
export const deezerIdOf = (track) =>
  track.deezer_id ||
  (/^\d+$/.test(track.external_id ?? "") ? track.external_id : null);
