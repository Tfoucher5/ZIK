// Clé du masquage : la régie remasque quand ce texte change, pas quand l'objet
// du titre est recréé à l'identique (reconnexion de la régie)
export const texteReponse = (track) => `${track.artist} - ${track.title}`;
