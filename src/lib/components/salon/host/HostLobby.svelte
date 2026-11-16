<script>
  /**
   * Lobby de la TV : le code et le QR en héros, puis qui est déjà là, par
   * équipe ou en vrac. Pensé pour une salle pleine : derniers arrivés
   * seulement, le reste en « et N autres » (lobbyView).
   */
  import { teamColor } from '$lib/data/salonOptions.js';
  import { salonPlayUrl } from '$lib/client/salonClient.js';
  import QrCode from '../QrCode.svelte';
  import MediaCheck from '../regie/MediaCheck.svelte';
  import { lobbyView } from './lobbyView.js';

  let { h } = $props();

  let v = $derived(lobbyView(h.players, h.teams));
  const plural = (n, mot) => `${mot}${n > 1 ? 's' : ''}`;

  // Seuls les joueurs qui arrivent pendant que le lobby est affiché sont encadrés
  const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function arrive() {
    return {
      duration: reduit ? 0 : 2400,
      css: (t) => `transform: scale(${0.6 + 0.4 * Math.min(1, t * 5)}); outline-color: rgb(255 255 255 / ${t < 0.8 ? 1 : (1 - t) * 5});`,
    };
  }
</script>

<section class="lb sh-tv" aria-label="Lobby : rejoindre la partie">
  <!-- Plus de 4 équipes : le héros se resserre pour laisser deux rangées d'équipes -->
  <div class="lb-hero" class:compact={v.teams?.length > 4}>
    <div class="lb-left">
      <h1>Sortez vos <br><em>téléphones.</em></h1>
      <div class="lb-code" aria-label="Code {h.code}">
        {#each h.code.split('') as ch, i (i)}<b>{ch}</b>{/each}
      </div>
      <p class="lb-url">Scannez le QR code, ou allez sur <b>zik-music.fr</b> et tapez le code.</p>
      {#if !h.controls}<div class="lb-check"><MediaCheck check={h.mediaCheck} tv solo /></div>{/if}
    </div>
    <figure class="lb-qr">
      <p class="lb-cpt"><i></i><b>{v.count}</b> {plural(v.count, 'joueur')} {plural(v.count, 'connecté')}</p>
      <div><QrCode text={salonPlayUrl(h.code)} label="QR code pour rejoindre la partie" /></div>
      <figcaption>Scannez pour jouer</figcaption>
    </figure>
  </div>

  <div class="lb-bas">
    {#if v.teams}
      <div class="lb-eqs" class:serre={v.cap < 6} class:mini={!v.cap} style="--cols:{v.cols}">
        {#each v.teams as t (t.id)}
          <div class="lb-eq" style="--tc:{teamColor(t.id)}">
            <header><h2>{t.name}</h2><span class="nb">{t.size}<small>{plural(t.size, 'joueur')}</small></span></header>
            {#if v.cap}
              <ul class="noms">
                {#each t.names as p (p.key)}<li in:arrive>{p.name}</li>{/each}
                <!-- Au-delà de 3 équipes, l'effectif suffit : pas de place pour une ligne de plus -->
                {#if t.more && v.cap === 6}<li class="vide">et {t.more} {plural(t.more, 'autre')}</li>{/if}
                {#if !t.size}<li class="vide">Personne encore</li>{/if}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    {:else if v.count}
      <ul class="noms solo">
        {#each v.names as p (p.key)}<li in:arrive>{p.name}</li>{/each}
      </ul>
      {#if v.more}<p class="lb-plus">et {v.more} {plural(v.more, 'autre')}</p>{/if}
    {:else}
      <p class="lb-vide">Personne pour l'instant. Les joueurs apparaissent ici dès qu'ils entrent le code.</p>
    {/if}
  </div>
</section>
