// Le layout pose des balises de partage par défaut (data-default) et les pages
// ajoutent les leurs : Svelte ne remplace pas, il cumule. On neutralise la
// balise par défaut quand la page fournit la même. Elle garde sa place dans le
// HTML (l'hydratation du layout reste alignée), seul son nom disparaît.
const META_RE = /<meta\b[^>]*>/g;
const KEY_RE = /\b(property|name)="((?:og|twitter):[^"]+)"/;

export function dropOverriddenMeta(html) {
  const tags = html.match(META_RE) ?? [];
  const pageKeys = new Set(
    tags
      .filter((t) => !t.includes("data-default"))
      .map((t) => t.match(KEY_RE)?.[0])
      .filter(Boolean),
  );
  if (!pageKeys.size) return html;
  return html.replace(META_RE, (tag) => {
    const key = tag.match(KEY_RE)?.[0];
    return tag.includes("data-default") && pageKeys.has(key)
      ? tag.replace(KEY_RE, 'data-overridden="$2"')
      : tag;
  });
}
