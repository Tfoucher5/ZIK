<script>
  /**
   * Podium de la soirée (ZIK Pro) : le 3e, le 2e, le tambour, puis le vainqueur en
   * plein écran sous les confettis (une seule fois), replié dans sa colonne, et les
   * places suivantes. Séquence et instants dans finaleSteps.js.
   */
  import { untrack } from 'svelte';
  import { teamColor } from '$lib/data/salonOptions.js';
  import { launchConfetti } from '$lib/components/game/confetti.js';
  import { playSound, SOUNDS } from './sounds.js';
  import HostPodium from './HostPodium.svelte';
  import HostWinnerFlood from './HostWinnerFlood.svelte';
  import { FINALE_START, finaleSteps } from './finaleSteps.js';

  let { finale, volume = 100, sound = true } = $props();

  let ranked = $derived(
    finale.teams
      ? finale.teams.map((t) => ({ key: 't' + t.id, name: t.name, score: t.score, color: teamColor(t.id), avg: true }))
      : finale.players.map((p) => ({ key: p.username, name: p.username, score: p.score, left: p.left, color: p.team != null ? teamColor(p.team) : null })),
  );
  let podium = $derived(ranked.slice(0, 3).map((e, i) => ({ ...e, rank: i + 1, color: finale.teams ? e.color : null })));
  let v = $state({ ...FINALE_START });
  let section;

  $effect(() => {
    // Lus une fois : couper le son ou un nouveau classement ne relance pas la séquence
    const { vol, steps } = untrack(() => ({
      vol: volume / 100,
      steps: finaleSteps({
        count: ranked.length,
        sound,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      }),
    }));
    const timers = steps.map((s) =>
      setTimeout(() => {
        v = { ...v, ...s.set };
        if (s.drumroll) playSound(SOUNDS.drumroll, vol);
        if (s.confetti) launchConfetti(240, section);
      }, s.at),
    );
    return () => timers.forEach(clearTimeout);
  });
</script>

<section class="fs sh-tv" bind:this={section} aria-live="polite">
  <header class="top">
    <p class="logo">ZIK<i></i><em>Soirée</em></p>
    <p class="k">Fin de la soirée · {finale.games} partie{finale.games > 1 ? 's' : ''}</p>
  </header>

  <div class="sc">
    <HostPodium
      entries={podium}
      step={v.step}
      tags={false}
      soiree
      drum={v.drum}
      title={v.drum ? 'Et le grand gagnant est…' : 'Le podium de la soirée'}
    />
  </div>

  {#if ranked.length > 3}
    <ol class="reste" class:on={v.rest}>
      {#each ranked.slice(3, 8) as e, i (e.key)}
        <li style:--i={i} style:--tc={e.color ?? 'rgb(255 255 255 / 0.16)'}>
          <span>{i + 4}</span>{e.name}<em>{e.score.toLocaleString('fr-FR')} pts{e.left ? ' · parti' : ''}</em>
        </li>
      {/each}
    </ol>
  {/if}
  <p class="pied">Merci d'avoir joué · <b>ZIK</b> · zik-music.fr</p>

  {#if podium[0]}<HostWinnerFlood winner={podium[0]} games={finale.games} mode={v.flood} />{/if}
</section>

<style>
  .fs {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    flex-direction: column;
    padding: 3.33em;
    overflow: hidden;
    background: radial-gradient(90% 80% at 30% 0%, #1b0a20, #060608 70%);
    color: var(--text);
  }
  .top {
    flex: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 3.1em;
    padding-bottom: 1em;
    border-bottom: 2px solid rgb(255 255 255 / 0.16);
    box-sizing: content-box;
  }
  .logo {
    display: flex;
    align-items: baseline;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 3.2em;
    line-height: 1;
    text-transform: uppercase;
  }
  .logo i {
    width: 0.23em;
    height: 0.23em;
    margin-left: 0.1em;
    border-radius: 50%;
    background: var(--accent);
  }
  .logo em,
  .k {
    font-style: normal;
    font-family: var(--s-mono);
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--soft, #d6d7e4);
  }
  .logo em {
    margin-left: 0.7em;
    font-size: 0.46em;
    color: var(--mid);
  }
  .k {
    font-size: 1.56em;
  }
  .sc {
    flex: 1;
    min-height: 0;
    display: grid;
    margin-top: 1.45em;
  }
  .reste {
    flex: none;
    display: flex;
    justify-content: center;
    gap: 0.62em;
    height: 3.33em;
    margin: 1.25em 0 0;
    padding: 0;
    list-style: none;
  }
  .reste li {
    display: flex;
    align-items: baseline;
    gap: 0.47em;
    padding: 0.4em 0.67em;
    border-left: 0.2em solid var(--tc);
    background: rgb(255 255 255 / 0.06);
    font-size: 1.56em;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    opacity: 0;
    transform: translateY(0.5em);
    transition:
      opacity 0.4s calc(var(--i) * 0.12s),
      transform 0.4s calc(var(--i) * 0.12s);
  }
  .reste.on li {
    opacity: 1;
    transform: none;
  }
  .reste span,
  .reste em {
    font-family: var(--s-mono);
    font-style: normal;
    font-size: 0.93em;
    font-weight: 500;
    color: var(--mid);
  }
  .pied {
    flex: none;
    margin-top: 0.95em;
    text-align: center;
    font-size: 1.46em;
    letter-spacing: 0.06em;
    color: var(--mid);
  }
  .pied b {
    color: var(--text);
  }
  @media (prefers-reduced-motion: reduce) {
    .reste li {
      transition: none;
    }
  }
</style>
