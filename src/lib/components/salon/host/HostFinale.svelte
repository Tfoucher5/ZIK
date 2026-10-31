<script>
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { teamColor } from '$lib/data/salonOptions.js';
  import { launchConfetti } from '$lib/components/game/confetti.js';
  import { playSound, afterSound, SOUNDS } from './sounds.js';

  /**
   * Podium final de la soirée : le 3e, le 2e (une place absente est sautée),
   * puis un roulement de tambour et le vainqueur sous les confettis.
   */
  let { finale, volume = 100, sound = true } = $props();

  let ranked = $derived(
    finale.teams
      ? finale.teams.map(t => ({ key: 't' + t.id, name: t.name, score: t.score, team: t.id }))
      : finale.players.map(p => ({ key: p.username, name: p.username, score: p.score, team: p.team }))
  );
  // Ordre d'affichage 2-1-3, ordre de révélation 3-2-1
  const PLACES = [
    { rank: 2, step: 2 },
    { rank: 1, step: 4 },
    { rank: 3, step: 1 },
  ];
  const pts = [1, 2, 3].map(() => new Tween(0, { duration: 1400, easing: cubicOut }));

  // 0 intro, 1 le 3e, 2 le 2e, 3 suspense, 4 le vainqueur, 5 la suite du classement
  let step = $state(0);
  let titre = $derived(
    step >= 4 ? ranked[0]?.name : step === 3 ? 'Et le grand gagnant est…' : 'Le podium de la soirée'
  );

  $effect(() => {
    for (const p of PLACES) if (step >= p.step) pts[p.rank - 1].target = ranked[p.rank - 1]?.score ?? 0;
  });

  $effect(() => {
    // Lus une fois : couper le son ne relance pas la séquence
    const vol = untrack(() => volume) / 100;
    const muet = untrack(() => !sound);
    let stop = () => {};
    const attendre = (ms, fn) => {
      const t = setTimeout(fn, ms);
      stop = () => clearTimeout(t);
    };
    const vainqueur = () => {
      step = 3;
      const suite = () => {
        step = 4;
        launchConfetti(240);
        attendre(1600, () => {
          launchConfetti(180);
          attendre(2400, () => (step = 5));
        });
      };
      if (muet) attendre(4000, suite);
      else stop = afterSound(playSound(SOUNDS.drumroll, vol), 4500, suite);
    };
    const deuxieme = () => {
      if (!ranked[1]) return vainqueur();
      step = 2;
      attendre(2600, vainqueur);
    };
    attendre(1800, () => {
      if (!ranked[2]) return deuxieme();
      step = 1;
      attendre(2600, deuxieme);
    });
    return () => stop();
  });
</script>

<section class="fin" class:gagne={step >= 4} aria-live="polite">
  <div class="fin-spots" aria-hidden="true"><i></i><i></i></div>

  <header class="fin-head">
    <p class="fin-kicker">Fin de la soirée · {finale.games} partie{finale.games > 1 ? 's' : ''}</p>
    {#key titre}<h2 class:nom={step >= 4}>{titre}</h2>{/key}
  </header>

  <div class="fin-podium">
    {#each PLACES as p (p.rank)}
      {@const e = ranked[p.rank - 1]}
      <div class="fin-place r{p.rank}" class:on={e && step >= p.step}
        style="--tc:{e?.team != null ? teamColor(e.team) : 'var(--accent)'}">
        {#if e}
          {#if p.rank === 1}
            <svg class="fin-crown" viewBox="0 0 64 40" aria-hidden="true">
              <path d="M4 36 L8 8 L22 22 L32 4 L42 22 L56 8 L60 36 Z" />
            </svg>
          {/if}
          <span class="fin-name">{e.name}</span>
          <span class="fin-pts">{Math.round(pts[p.rank - 1].current)} pts</span>
        {/if}
        <div class="fin-block"><b>{p.rank}</b></div>
      </div>
    {/each}
  </div>

  {#if ranked.length > 3}
    <ol class="fin-rest" class:on={step >= 5}>
      {#each ranked.slice(3, 10) as e, i (e.key)}
        <li style="--i:{i}; --tc:{e.team != null ? teamColor(e.team) : 'var(--border2)'}">
          <span>{i + 4}</span><b>{e.name}</b><em>{e.score} pts</em>
        </li>
      {/each}
    </ol>
  {/if}

  <footer class="fin-foot">Merci d'avoir joué · <b>ZIK</b> · zik-music.fr</footer>
</section>

<style>
  .fin {
    --gold: #f6c945;
    --silver: #d4dbe3;
    --bronze: #d58a4e;
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    gap: 2vh;
    padding: clamp(24px, 4vh, 48px) clamp(24px, 5vw, 80px);
    overflow: hidden;
    background:
      radial-gradient(ellipse 80% 45% at 50% 100%, rgb(var(--accent-rgb) / 0.22), transparent 70%),
      radial-gradient(ellipse 60% 40% at 50% 0%, rgb(255 255 255 / 0.06), transparent 70%),
      #050506;
    color: #fff;
    text-align: center;
  }

  /* Deux projecteurs qui balaient la scène, puis se croisent sur le vainqueur */
  .fin-spots i {
    position: absolute;
    top: -10vh;
    width: 34vw;
    height: 120vh;
    background: linear-gradient(180deg, rgb(255 255 255 / 0.16), rgb(255 255 255 / 0) 80%);
    clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%);
    transform-origin: 50% 0;
    filter: blur(6px);
    pointer-events: none;
    transition: transform 1.2s cubic-bezier(0.3, 0.7, 0.2, 1), background 1.2s;
  }
  .fin-spots i:first-child { left: 2vw; animation: fin-balaye 3.4s ease-in-out infinite alternate; }
  .fin-spots i:last-child { right: 2vw; animation: fin-balaye 3.4s ease-in-out infinite alternate-reverse; }
  .gagne .fin-spots i { animation: none; background: linear-gradient(180deg, rgb(246 201 69 / 0.32), rgb(246 201 69 / 0) 80%); }
  .gagne .fin-spots i:first-child { transform: rotate(-24deg); }
  .gagne .fin-spots i:last-child { transform: rotate(24deg); }
  @keyframes fin-balaye {
    from { transform: rotate(-28deg); }
    to { transform: rotate(18deg); }
  }

  .fin-head { position: relative; z-index: 1; }
  .fin-kicker {
    font-family: var(--s-mono);
    font-size: clamp(0.7rem, 1.1vw, 0.9rem);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.6);
  }
  .fin-head h2 {
    margin-top: 1vh;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(2.4rem, 6vw, 5.6rem);
    line-height: 0.9;
    text-transform: uppercase;
    animation: fin-titre 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }
  .fin-head h2.nom {
    font-size: clamp(3.4rem, 10vw, 9.5rem);
    color: var(--gold);
    text-shadow: 0 0 40px rgb(246 201 69 / 0.55), 0 6px 0 #8a6a12;
    overflow-wrap: anywhere;
  }
  @keyframes fin-titre {
    from { opacity: 0; transform: scale(0.7) translateY(20px); }
  }

  .fin-podium {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: end;
    gap: clamp(10px, 2vw, 28px);
    width: min(1000px, 100%);
    flex: 1;
    max-height: 56vh;
  }
  .fin-place { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .fin-place.r1 { --medal: var(--gold); --h: 30vh; }
  .fin-place.r2 { --medal: var(--silver); --h: 21vh; }
  .fin-place.r3 { --medal: var(--bronze); --h: 15vh; }

  .fin-name, .fin-pts, .fin-crown { opacity: 0; transform: translateY(16px); transition: opacity 0.5s 0.5s, transform 0.5s 0.5s; }
  .fin-place.on .fin-name, .fin-place.on .fin-pts, .fin-place.on .fin-crown { opacity: 1; transform: none; }
  .fin-name {
    max-width: 100%;
    padding: 4px 14px;
    border-bottom: 4px solid var(--tc);
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(1.3rem, 2.6vw, 2.4rem);
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .r1 .fin-name { font-size: clamp(1.6rem, 3.4vw, 3rem); color: var(--gold); }
  .fin-pts { font-family: var(--s-mono); font-size: clamp(0.85rem, 1.4vw, 1.2rem); color: rgb(255 255 255 / 0.75); }
  .fin-crown { width: clamp(44px, 5vw, 72px); fill: var(--gold); filter: drop-shadow(0 0 14px rgb(246 201 69 / 0.7)); }
  .fin-place.on .fin-crown { animation: fin-couronne 2.4s 1s ease-in-out infinite; }
  @keyframes fin-couronne {
    50% { transform: translateY(-8px) rotate(-4deg); }
  }

  /* Marche du podium : métal de la médaille, monte à la révélation */
  .fin-block {
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
    height: var(--h);
    padding-top: 2vh;
    border-radius: 6px 6px 0 0;
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.35), rgb(255 255 255 / 0) 40%),
      linear-gradient(135deg, var(--medal), color-mix(in srgb, var(--medal) 55%, #000));
    box-shadow: inset 0 -12px 24px rgb(0 0 0 / 0.35), 0 0 0 rgb(0 0 0 / 0);
    transform: scaleY(0.04);
    transform-origin: bottom;
    opacity: 0.35;
    transition: transform 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 0.4s, box-shadow 0.9s;
  }
  .fin-place.on .fin-block { transform: none; opacity: 1; box-shadow: inset 0 -12px 24px rgb(0 0 0 / 0.35), 0 0 60px color-mix(in srgb, var(--medal) 45%, transparent); }
  .fin-block b {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(3rem, 7vw, 6.5rem);
    line-height: 1;
    color: rgb(0 0 0 / 0.55);
    text-shadow: 0 2px 0 rgb(255 255 255 / 0.35);
  }

  /* Rayons de lumière derrière le vainqueur */
  .fin-place.r1::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 20%;
    width: 160%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: repeating-conic-gradient(rgb(246 201 69 / 0.28) 0 10deg, transparent 10deg 24deg);
    mask: radial-gradient(circle, #000 20%, transparent 68%);
    transform: translateX(-50%) scale(0);
    transition: transform 1s cubic-bezier(0.2, 0.9, 0.3, 1.2);
    z-index: -1;
  }
  .fin-place.r1.on::before { transform: translateX(-50%) scale(1); animation: fin-rayons 14s linear infinite; }
  @keyframes fin-rayons {
    to { transform: translateX(-50%) scale(1) rotate(360deg); }
  }

  .fin-rest {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    list-style: none;
    max-width: 1100px;
  }
  .fin-rest li {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 14px;
    border-left: 3px solid var(--tc);
    background: rgb(255 255 255 / 0.06);
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.4s calc(var(--i) * 0.12s), transform 0.4s calc(var(--i) * 0.12s);
  }
  .fin-rest.on li { opacity: 1; transform: none; }
  .fin-rest span { font-family: var(--s-mono); color: rgb(255 255 255 / 0.5); }
  .fin-rest em { font-style: normal; font-family: var(--s-mono); font-size: 0.85rem; color: rgb(255 255 255 / 0.65); }

  .fin-foot {
    position: relative;
    z-index: 1;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    color: rgb(255 255 255 / 0.45);
  }
  .fin-foot b { color: var(--accent); }
</style>
