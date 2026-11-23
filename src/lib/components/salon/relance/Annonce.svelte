<script>
  import { untrack } from 'svelte';

  /** Annonce une fois par état (cle), pas à chaque seconde du décompte. */
  let { cle, texte } = $props();
  let dit = $state('');

  // Rempli après l'insertion : une zone vide qui change est lue, une zone déjà pleine souvent pas
  $effect(() => {
    void cle;
    dit = untrack(() => texte);
  });
</script>

<p class="sr" role="status">{dit}</p>

<style>
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
