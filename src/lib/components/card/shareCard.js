import { RARITIES } from "./rarity.js";

const SITE_URL = "https://www.zik-music.fr";

/**
 * Partage une carte : image + texte via le menu de partage du téléphone
 * quand il accepte les fichiers, sinon image téléchargée et texte copié.
 * Retourne "shared", "downloaded" ou "cancelled".
 */
export async function shareCard(card) {
  const text = `J'ai décroché la carte ${RARITIES[card.rarity].label} « ${card.title} » de ${card.artist} sur ZIK !`;
  const blob = await fetch(card.shareImage)
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
  const file =
    blob &&
    new File([blob], `zik-carte-${card.number}.png`, { type: "image/png" });

  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, url: SITE_URL });
      return "shared";
    } catch (e) {
      if (e.name === "AbortError") return "cancelled";
    }
  }

  if (file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await navigator.clipboard?.writeText(`${text} ${SITE_URL}`).catch(() => {});
  return "downloaded";
}
