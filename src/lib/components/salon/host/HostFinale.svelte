<script>
  /**
   * Podium de la soirée (ZIK Pro) : le 3e, le 2e, le tambour, puis le vainqueur en
   * plein écran sous les confettis (une seule fois), replié dans sa colonne, et les
   * places suivantes. Séquence et instants dans finaleSteps.js.
   */
  import { untrack } from 'svelte';
  import { launchConfetti } from '#lib/components/game/confetti.js';
  import { playSound, SOUNDS } from './sounds.js';
  import HostPodium from './HostPodium.svelte';
  import HostWinnerFlood from './HostWinnerFlood.svelte';
  import { FINALE_START, finaleSteps } from './finaleSteps.js';
  import { finaleView } from './gameOverView.js';

  let { finale, volume = 100, sound = true } = $props();

  let f = $derived(finaleView(finale));
  let v = $state({ ...FINALE_START });
  let section;

  $effect(() => {
    // Lus une fois : couper le son ou un nouveau classement ne relance pas la séquence
    const { vol, steps } = untrack(() => ({
      vol: volume / 100,
      steps: finaleSteps({
        count: f.podium.length,
        sound,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      }),
    }));
    let drumroll = null;
    const timers = steps.map((s) =>
      setTimeout(() => {
        v = { ...v, ...s.set };
        if (s.drumroll) drumroll = playSound(SOUNDS.drumroll, vol);
        if (s.confetti) launchConfetti(240, section);
      }, s.at),
    );
    // Podium retiré pendant le tambour : le son s'arrête avec lui
    return () => {
      timers.forEach(clearTimeout);
      drumroll?.pause();
    };
  });
</script>

<section class="fs sh-tv" bind:this={section} aria-live="polite">
  <header class="top">
    <p class="logo">ZIK<i></i><em>Soirée</em></p>
    <p class="k">Fin de la soirée · {finale.games} partie{finale.games > 1 ? 's' : ''}</p>
  </header>

  <div class="sc">
    <HostPodium
      entries={f.podium}
      step={v.step}
      soiree
      drum={v.drum}
      title={v.drum ? 'Et la victoire revient à…' : 'Le podium de la soirée'}
    />
  </div>

  {#if f.rest.length}
    <!-- Une ligne seulement : les places qui ne tiennent pas passent à la ligne, masquée -->
    <ol class="reste" class:on={v.rest}>
      {#each f.rest.slice(0, 5) as e, i (e.key)}
        <li style:--i={i} style:--tc={e.color ?? 'rgb(255 255 255 / 0.16)'}>
          <span>{e.rank}</span>{e.name}<em>{e.score.toLocaleString('fr-FR')} pts{e.tag ? ` · ${e.tag.toLowerCase()}` : ''}</em>
        </li>
      {/each}
    </ol>
  {/if}
  <p class="pied">Merci d'avoir joué · <b>ZIK</b> · zik-music.fr</p>

  {#if f.podium[0]}<HostWinnerFlood winner={f.podium[0]} games={finale.games} mode={v.flood} />{/if}
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
    flex-wrap: wrap;
    justify-content: center;
    gap: 3em 0.62em;
    height: 3.33em;
    overflow: hidden;
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
