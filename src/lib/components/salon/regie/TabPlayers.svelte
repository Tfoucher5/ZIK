<script>
  import { teamColor } from '$lib/data/salonOptions.js';
  import { statutJoueur } from './onglets.js';
  import { ecranLarge } from './large.svelte.js';
  /**
   * Onglet « Joueurs » : une ligne par joueur. Au téléphone, on touche la
   * ligne pour changer l'équipe, corriger le score ou exclure ; en 1024 px tout
   * est sur la ligne. Équipes et classement de la soirée (`children`) dessous,
   * ou à gauche en 1024 px.
   *
   * @type {{
   *   players: any[], teams: any[]|null, phase: string, code: string,
   *   pro: boolean, step: number, confirmKick: string|null,
   *   onScore: (username: string, delta: number) => void,
   *   onSetScore: (username: string, score: number) => void,
   *   onKick: (username: string) => void,
   *   onTeam: (username: string, team: number) => void,
   *   children?: import('svelte').Snippet,
   * }}
   */
  let { players, teams, phase, code, pro, step, confirmKick, onScore, onSetScore, onKick, onTeam, children } = $props();

  const live = $derived(phase === 'round' || phase === 'summary');
  // Équipes : moyenne dès que la partie a commencé, jusqu'au podium
  const scores = $derived(phase !== 'lobby');
  const ecran = ecranLarge();
  let ouvert = $state(null);

  // Saisie directe : la valeur part à la validation, puis le champ revient
  // au score connu. C'est le serveur qui fait foi (salon_scores_update) : une
  // demande refusée ne laisse pas un score que personne n'a.
  function valide(e, username, scoreActuel) {
    const champ = e.currentTarget;
    const v = Math.round(Number(champ.value));
    const valable = Number.isFinite(v) && v >= 0 && v !== scoreActuel;
    champ.value = scoreActuel;
    if (valable) {
      onSetScore(username, v);
      champ.blur();
    }
  }
</script>

{#if players.length === 0}
  <div class="tp-vide">
    <p class="rg-k"><b aria-hidden="true">●</b>En attente</p>
    <h1 class="rg-h1">Personne<span>pour l'instant</span></h1>
    <p>Les joueurs scannent le QR code affiché sur la TV, ou vont sur <b>zik-music.fr</b> et tapent le code.</p>
    <p class="tp-tuiles" aria-label="Code {code}">{#each code.split('') as c, i (i)}<b>{c}</b>{/each}</p>
    {@render children?.()}
  </div>
{:else}
  <div class="tp">
    <section class="tp-col">
      <p class="rg-k">{live ? `Cette partie · ${players.length} joueurs` : `${players.length} joueur${players.length > 1 ? 's' : ''}`}{#if !live}<span class="tp-tel">· touche un pseudo</span>{/if}</p>
      <ul class="jrs" class:avant={phase === 'lobby'}>
        {#each players as p (p.username)}
          {@const st = statutJoueur(p, phase)}
          <li class="jr" class:off={p.offline} class:open={ouvert === p.username}
            style="--tc:{teams && p.team != null ? teamColor(p.team) : 'transparent'}">
            <button class="jr-t" type="button" tabindex={ecran.large ? -1 : 0} aria-expanded={ouvert === p.username}
              onclick={() => (ouvert = ouvert === p.username ? null : p.username)}>
              <i></i><b>{p.username}</b>
              {#if st}<span class="jr-st {st.cls}">{st.label}</span>{/if}
              <span class="jr-pts">{p.score}</span><em aria-hidden="true">+</em>
            </button>
            <div class="jr-p">
              {#if teams}
                <select value={p.team} disabled={!pro} title={pro ? '' : 'ZIK Pro'} onchange={(e) => onTeam(p.username, +e.currentTarget.value)} aria-label="Équipe de {p.username}">
                  {#each teams as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
                </select>
              {/if}
              <span class="pas">
                <button type="button" onclick={() => onScore(p.username, -step)} aria-label="Retirer {step} point à {p.username}">−</button>
                <input type="number" min="0" inputmode="numeric" value={p.score} aria-label="Score de {p.username}"
                  onkeydown={(e) => { if (e.key === 'Enter') valide(e, p.username, p.score); }}
                  onblur={(e) => valide(e, p.username, p.score)}>
                <button type="button" onclick={() => onScore(p.username, step)} aria-label="Ajouter {step} point à {p.username}">+</button>
              </span>
              <button class="jr-x" type="button" class:confirme={confirmKick === p.username} onclick={() => onKick(p.username)}>
                {confirmKick === p.username ? `Confirmer : exclure ${p.username}` : 'Exclure'}
              </button>
            </div>
          </li>
        {/each}
      </ul>
    </section>

    <section class="tp-col tp-cote">
      {#if teams}
        <p class="rg-k">{scores ? 'Équipes · moyenne des joueurs' : 'Équipes'}</p>
        <ul class="tp-eqs">
          {#each teams as t (t.id)}
            <li style="--tc:{teamColor(t.id)}">
              <b>{t.name}</b><span>{scores ? t.score : t.members.length}</span>
              {#if scores}<small>{t.members.length} joueur{t.members.length > 1 ? 's' : ''}</small>{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {@render children?.()}
    </section>
  </div>
{/if}

<style>
  .tp { display: grid; gap: 18px; }
  .tp-col { display: grid; gap: 10px; align-content: start; min-width: 0; }

  .tp-vide { display: grid; gap: 14px; }
  .tp-vide > p:not(.rg-k) { font-size: 17px; line-height: 1.5; color: var(--soft); }
  .tp-vide b { color: var(--text); font-weight: 600; }
  .tp-tuiles { display: flex; gap: 0.16em; font-family: var(--mono); font-weight: 700; font-size: 34px; }
  .tp-tuiles b {
    display: grid; place-items: center; width: 1.22em; height: 1.5em; border-radius: 0.14em;
    background: rgb(255 255 255 / 0.09); border-bottom: 0.06em solid rgb(255 255 255 / 0.45);
  }

  .jrs { list-style: none; border-top: 1px solid var(--line-2); }
  .jr { border-bottom: 1px solid var(--line); }
  .jr-t {
    display: grid; grid-template-columns: 10px minmax(0, 1fr) auto auto 44px; gap: 10px; align-items: center;
    width: 100%; min-height: 52px; padding: 0; border: 0; background: none; color: var(--text);
    font: inherit; text-align: left; cursor: pointer;
  }
  .jr-t > i { width: 10px; height: 10px; border-radius: 50%; background: var(--tc); }
  .jr-t b { overflow: hidden; font-weight: 600; font-size: 17px; text-overflow: ellipsis; white-space: nowrap; }
  .jr.off .jr-t b { color: var(--muted); }
  .jr-st {
    padding: 3px 9px; border-radius: 999px; background: rgb(255 255 255 / 0.07);
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--muted); white-space: nowrap;
  }
  .jr-st.ok { background: rgb(61 220 132 / 0.16); color: var(--ok); }
  .jr-st.off { background: rgb(255 179 71 / 0.13); color: var(--warn); }
  .avant .jr-pts { display: none; }
  .jr-pts { min-width: 3ch; font-family: var(--mono); font-weight: 700; font-size: 16px; text-align: right; font-variant-numeric: tabular-nums; }
  .jr-t em {
    display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--line-2); border-radius: 50%;
    font-style: normal; font-size: 18px; transition: transform 0.35s var(--out), background 0.25s, color 0.25s;
  }
  .jr.open .jr-t em { transform: rotate(45deg); background: #fff; color: #000; }

  .jr-p { display: none; flex-wrap: wrap; gap: 10px; padding: 2px 0 14px 20px; }
  .jr.open .jr-p { display: flex; }
  .jr-p select {
    flex: 1 1 140px; min-width: 0; height: 44px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: 999px;
    background: var(--surface); color: var(--text); font: inherit; font-size: 15px;
  }
  .jr-p select:disabled { opacity: 0.5; }
  .pas { display: inline-flex; align-items: center; height: 44px; border: 1px solid var(--line-2); border-radius: 999px; }
  .pas button { width: 44px; height: 42px; border: 0; background: none; color: var(--text); font-size: 20px; cursor: pointer; }
  .pas input {
    width: 58px; height: 42px; padding: 0; border: 0; background: none; color: var(--text); text-align: center;
    font-family: var(--mono); font-weight: 700; font-size: 16px; font-variant-numeric: tabular-nums;
    -moz-appearance: textfield; appearance: textfield;
  }
  .pas input::-webkit-outer-spin-button, .pas input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .pas input:focus { outline: 2px solid var(--accent); border-radius: 6px; }
  .jr-x {
    height: 44px; padding: 0 16px; border: 1px solid var(--line-2); border-radius: 999px;
    background: none; color: var(--soft); font: inherit; font-size: 15px; cursor: pointer;
  }
  .jr-x.confirme { border-color: var(--danger); color: var(--danger); background: rgb(248 113 113 / 0.1); font-weight: 700; }

  .tp-eqs { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
  .tp-eqs li {
    display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px; min-width: 0;
    padding: 8px 12px 10px; border-top: 4px solid var(--tc); border-radius: 0 0 12px 12px; background: rgb(255 255 255 / 0.045);
  }
  .tp-eqs b { min-width: 0; overflow: hidden; font-family: var(--titre); font-weight: 800; font-size: 20px; text-transform: uppercase; text-overflow: ellipsis; white-space: nowrap; }
  .tp-eqs span { font-family: var(--titre); font-weight: 900; font-size: 34px; line-height: 0.9; font-variant-numeric: tabular-nums; }
  .tp-eqs small { flex: 1 1 100%; font-size: 13px; line-height: 1.3; color: var(--muted); }

  @media (min-width: 900px) {
    .tp { grid-template-columns: 300px minmax(0, 1fr); column-gap: 44px; }
    .tp-cote { order: -1; }
    .tp-tel { display: none; }
    .jr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: center; }
    .jr-t { grid-template-columns: 10px minmax(0, 1fr) auto; min-height: 60px; cursor: default; pointer-events: none; }
    .jr-t em, .jr-t .jr-pts { display: none; }
    .jr-p, .jr.open .jr-p { display: flex; flex-wrap: nowrap; padding: 0; }
    .jr-p select { flex: none; width: 128px; }
    .tp-eqs { grid-template-columns: 1fr; gap: 6px; }
    .tp-eqs li { flex-wrap: nowrap; align-items: center; padding: 8px 14px; border-top: 0; border-left: 4px solid var(--tc); border-radius: 0 12px 12px 0; }
    .tp-eqs b { flex: 1; }
    .tp-eqs small { order: 1; flex: none; }
    .tp-eqs span { order: 2; min-width: 2.2ch; text-align: right; }
  }
</style>
