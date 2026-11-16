<script>
  import { PLANS } from '$lib/data/proPlans.js';
  import { teamColor } from '$lib/data/salonOptions.js';
  import { textesFile } from './regiePro.svelte.js';

  /**
   * Soirée complète : la jauge et l'offre ZIK Pro, dans la page et jamais par-dessus.
   * `replie` : en partie ou hors de Direct, une ligne qui s'ouvre au toucher.
   * @type {{ o: import('./regiePro.svelte.js').RegiePro, pro: boolean, players?: any[], replie?: boolean }}
   */
  let { o, pro, players = [], replie = false } = $props();

  const plan = (id) => PLANS.find((p) => p.id === id);
  const [soiree, mensuel, annuel] = ['night', 'monthly', 'yearly'].map(plan);
  const etat = $derived(o.entres ? 'actif' : pro ? null : o.paiement ? 'encours' : o.count ? 'offre' : null);
  const t = $derived(textesFile(o.names, o.count));
  const te = $derived(o.entres && textesFile(o.entres.names, o.entres.count));
  const initiale = (n) => [...n][0]?.toUpperCase() ?? '';

  const presents = $derived(players.filter((p) => !p.left));
  const dedans = $derived(etat === 'actif' ? presents.filter((p) => !o.entres.names.includes(p.username)) : presents);
  const neufs = $derived(etat === 'actif' ? presents.filter((p) => o.entres.names.includes(p.username)) : []);
  const attente = $derived(etat === 'actif' ? 0 : o.count);
</script>

{#snippet carte()}
  {#if etat === 'actif'}
    <section class="ro ok" role="status" aria-label="ZIK Pro activé">
      <p class="rg-k"><b aria-hidden="true">●</b>ZIK Pro activé</p>
      <h2>{o.entres.count ? 'Tout le monde est dedans' : 'Plus de limite de joueurs'}</h2>
      {#if o.entres.count}<p><b>{te.entres}</b> Rien à recréer, personne n'a rescanné.</p>{/if}
      <p>Aussi débloqué : plus d'équipes, le buzzer, les manches spéciales, le classement de la soirée.</p>
      <div class="ro-duo"><button class="rg-em" type="button" onclick={o.ack}>Compris</button></div>
    </section>
  {:else if etat === 'encours'}
    <section class="ro" role="status" aria-label="Paiement en cours">
      <p class="rg-k"><b class="ro-i" aria-hidden="true">●</b>Paiement en cours</p>
      <h2>Finis dans l'autre onglet</h2>
      <p>
        Dès que le paiement est confirmé, cette soirée passe en ZIK Pro toute seule{#if o.count}&nbsp;et <b>{t.entrent}</b>{/if}.
        Rien à faire ici{replie ? '.' : ' : tu peux même lancer la partie.'}
      </p>
      <div class="ro-duo">
        <button class="rg-em" type="button" onclick={() => o.buy(soiree.id)}>Rouvrir le paiement</button>
        <button class="ro-lien" type="button" onclick={o.cancel}>Revenir à l'offre</button>
      </div>
    </section>
  {:else if etat === 'offre'}
    <section class="ro" aria-label="Passer cette soirée en ZIK Pro">
      <div class="ro-t"><p class="rg-k">{soiree.name}</p><span class="pro-tag">ZIK Pro</span><strong>{soiree.price}<small>une fois</small></strong></div>
      <h2>{t.titre}</h2>
      <p><b>{t.attendent}</b> Avec ZIK Pro, plus de limite de joueurs : tout le monde entre tout de suite, rien à recréer.</p>
      <button class="ro-btn" type="button" onclick={() => o.buy(soiree.id)}>{soiree.cta}</button>
      <small>Nouvel onglet : ta régie reste ouverte.</small>
      <p class="ro-abo">
        Tu en fais souvent ? <button class="ro-lien" type="button" onclick={() => o.buy()}>Voir les abonnements</button>
        {mensuel.price} par mois ou {annuel.price} par an.
      </p>
    </section>
  {/if}
{/snippet}

{#if !etat}
  <!-- rien : soirée pas complète, ou déjà en ZIK Pro -->
{:else if replie && etat !== 'actif'}
  <details class="ro-plein">
    <summary class="rg-l">
      <b><span class="ro-w" aria-hidden="true">●</span>{etat === 'encours' ? 'Paiement en cours' : t.resume}</b>
      {#if o.count}<small>{t.siPlace}</small>{/if}
      <em>{etat === 'encours' ? 'Voir' : 'Faire entrer'}</em>
    </summary>
    {@render carte()}
  </details>
{:else}
  <div class="ro-bloc" class:replie>
  {#if !replie && (attente || o.entres?.count)}
    <div class="ro-places" role="img"
      aria-label={etat === 'actif' ? `${presents.length} joueurs, plus de limite` : `${presents.length} places prises, ${t.sousTitre}`}>
      {#each dedans.slice(0, 24) as p (p.username)}<i style="--tc:{p.team != null ? teamColor(p.team) : 'var(--text)'}"></i>{/each}
      {#if attente}
        <span class="ro-mur"></span>
        {#each o.names as n, i (i)}<i class="att">{initiale(n)}</i>{/each}
        {#if attente > o.names.length}<i class="att plus">+&nbsp;{attente - o.names.length}</i>{/if}
      {/if}
      {#each neufs as p (p.username)}<i class="neuf">{initiale(p.username)}</i>{/each}
      {#if etat === 'actif' && o.entres.count > neufs.length}<i class="neuf plus">+&nbsp;{o.entres.count - neufs.length}</i>{/if}
    </div>
  {/if}
  {@render carte()}
  </div>
{/if}

<style>
  .ro-bloc { display: grid; gap: 14px; }
  .ro-bloc.replie { margin-bottom: 14px; }
  .ro-places { display: flex; align-items: center; gap: 4px; }
  .ro-places i {
    flex: 1 1 0; min-width: 0; height: 30px; border-radius: 6px; background: var(--tc);
    display: grid; place-items: center;
    font-style: normal; font-family: var(--mono); font-weight: 700; font-size: 13px;
  }
  /* Ceux qui attendent : pointillés neutres, jamais la couleur d'une équipe */
  .ro-places i.att { background: none; border: 1.6px dashed rgb(255 255 255 / 0.45); color: var(--soft); }
  .ro-places i.neuf { background: none; outline: 2px solid var(--text); outline-offset: 1px; color: var(--text); }
  .ro-places i.plus { flex: 1.6 1 0; white-space: nowrap; }
  .ro-mur { flex: none; width: 3px; height: 46px; margin: 0 5px; border-radius: 2px; background: var(--text); }

  .ro {
    display: grid; gap: 9px; padding: 14px 18px 10px; border-radius: 22px; border: 1px solid transparent;
    background:
      linear-gradient(#13131c, #13131c) padding-box,
      linear-gradient(170deg, rgb(255 255 255 / 0.24), rgb(255 255 255 / 0.04)) border-box;
  }
  .ro.ok {
    padding-bottom: 16px;
    background:
      linear-gradient(#0f1a15, #101016) padding-box,
      linear-gradient(170deg, rgb(61 220 132 / 0.7), rgb(61 220 132 / 0.12)) border-box;
  }
  .ro-t { display: flex; align-items: center; gap: 6px; }
  .ro-t .rg-k { letter-spacing: 0.08em; white-space: nowrap; }
  .ro-t .pro-tag { margin: 0; padding: 3px 6px; font-size: 11px; white-space: nowrap; }
  .ro-t strong {
    margin-left: auto; font-family: var(--titre); font-weight: 900; font-size: 30px; line-height: 1;
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }
  .ro-t strong small { margin-left: 6px; font-family: var(--corps); font-weight: 500; font-size: 14px; color: var(--muted); }
  .ro h2 { margin: 0; font-family: var(--titre); font-weight: 900; font-size: 34px; line-height: 0.92; text-transform: uppercase; }
  .ro > p:not(.rg-k) { margin: 0; font-size: 16px; line-height: 1.4; color: var(--soft); }
  .ro > p:not(.rg-k) b { color: var(--text); font-weight: 600; }
  .ro > small { font-size: 14px; line-height: 1.35; color: var(--muted); text-align: center; }
  .ro-i { color: var(--bleu); }

  /* Bouton blanc : le magenta reste à « Lancer la partie » */
  .ro-btn {
    width: 100%; min-height: 52px; padding: 0 20px; border: 0; border-radius: 999px;
    background: var(--text); color: #000; cursor: pointer;
    font-family: var(--titre); font-weight: 800; font-size: 20px; letter-spacing: 0.05em; text-transform: uppercase;
  }
  .ro > p.ro-abo {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0 8px; min-height: 44px; padding-top: 8px;
    border-top: 1px solid var(--line); font-size: 15px; color: var(--muted);
  }
  .ro-lien {
    min-height: 44px; padding: 0; border: 0; background: none; cursor: pointer;
    font: inherit; font-weight: 600; color: var(--text);
    text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 5px;
  }
  .ro-duo { display: flex; align-items: center; gap: 8px 16px; flex-wrap: wrap; }
  .ro-duo .ro-lien { font-weight: 500; color: var(--soft); }

  .ro-plein { margin-bottom: 14px; padding: 0 14px; border-radius: 14px; border: 1px solid var(--line-2); background: rgb(255 255 255 / 0.045); }
  .ro-plein .ro { padding: 4px 0 6px; border: 0; background: none; }
  .ro-plein[open] > :global(.rg-l em) { background: none; border-color: var(--line-2); color: var(--text); }
  .ro-w { color: var(--warn); font-size: 10px; }

  @media (min-width: 900px) {
    .ro-plein[open], .ro-bloc:not(.replie) > .ro { max-width: 560px; }
  }
</style>
