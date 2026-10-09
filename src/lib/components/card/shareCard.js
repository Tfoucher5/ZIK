import { RARITIES } from "./rarity.js";

const SITE_URL = "https://www.zik-music.fr";

export const shareText = (card) =>
  `J'ai décroché la carte ${RARITIES[card.rarity].label} « ${card.title} » de ${card.artist} sur ZIK !`;

const fetchImage = (card) =>
  fetch(card.shareImage).then((r) => {
    if (!r.ok) throw new Error("image");
    return r.blob();
  });

/**
 * Partage une carte.
 * - Téléphone : menu de partage du système, avec l'image et le texte.
 * - Ordinateur : l'image va dans le presse-papier, prête à coller (le menu de
 *   partage de Windows ne copie que le texte).
 * - Sinon : image téléchargée et texte copié.
 * Retourne "shared", "copied", "downloaded" ou "cancelled".
 */
export async function shareCard(card) {
  const text = shareText(card);
  const touch = window.matchMedia?.("(pointer: coarse)").matches;

  if (touch && navigator.canShare) {
    const blob = await fetchImage(card).catch(() => null);
    const file =
      blob &&
      new File([blob], `zik-carte-${card.number}.png`, { type: "image/png" });
    if (file && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, url: SITE_URL });
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return "cancelled";
      }
    }
  }

  // ClipboardItem reçoit une promesse : Safari exige que l'écriture parte
  // pendant le clic, avant que l'image soit téléchargée
  if (window.ClipboardItem && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": fetchImage(card) }),
      ]);
      return "copied";
    } catch {
      /* presse-papier refusé : on télécharge */
    }
  }

  const blob = await fetchImage(card).catch(() => null);
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zik-carte-${card.number}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await navigator.clipboard?.writeText(`${text} ${SITE_URL}`).catch(() => {});
  return "downloaded";
}

/** Message affiché après le partage, selon ce qui s'est passé. */
export function shareMessage(result) {
  if (result === "copied")
    return "Image copiée : colle-la avec Ctrl+V (ou Cmd+V).";
  if (result === "downloaded")
    return "Image téléchargée, texte copié pour la partager.";
  return "";
}
