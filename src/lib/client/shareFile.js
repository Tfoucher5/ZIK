export const SITE_URL = "https://www.zik-music.fr";

/**
 * Menu de partage du système avec un fichier. Appelée pendant le clic : rien n'est
 * attendu avant `navigator.share`, sinon Safari refuse. Retourne "shared",
 * "cancelled", ou null quand le partage est indisponible ou refusé.
 */
export async function shareFile(file, text) {
  if (!navigator.canShare?.({ files: [file] })) return null;
  try {
    await navigator.share({ files: [file], text, url: SITE_URL });
    return "shared";
  } catch (e) {
    return e.name === "AbortError" ? "cancelled" : null;
  }
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
