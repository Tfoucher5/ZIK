const SITE = "https://www.zik-music.fr";

/**
 * Fil d'Ariane au format schema.org, prêt à passer au composant JsonLd.
 * « Accueil » est ajouté en première position, inutile de le répéter.
 *
 * @param {Array<{ name: string, path: string }>} items
 *   Chemins relatifs, ex. [{ name: 'Classements', path: '/classements' }]
 * @returns {string} JSON sérialisé
 */
export function breadcrumb(items) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Accueil", path: "/" }, ...items].map(
      (it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        item: SITE + it.path,
      }),
    ),
  });
}
