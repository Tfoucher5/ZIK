<script>
  // Données structurées pour Google. Une balise <script> écrite dans le
  // template n'est pas interprétée par Svelte : elle doit passer par {@html}.
  // « < » est échappé pour qu'un texte ne puisse pas fermer la balise.
  let { json } = $props();

  let tag = $derived(
    `<script type="application/ld+json">${json.replace(/</g, "\u003c")}</` + "script>",
  );
</script>

<!-- JSON construit par nos pages, « < » échappé ci-dessus -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html tag}
