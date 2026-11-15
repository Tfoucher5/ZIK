<script>
  import { specialsAt, clock, SPECIALS_CYCLE } from './demos.js';

  const CARDS = [
    { c: '#2fb8ff', g: '5 s', titre: 'Intro éclair', texte: "La musique s'arrête au bout de 5 secondes" },
    { c: '#f4e04d', g: '½', titre: 'Sprint', texte: 'Deux fois moins de temps pour répondre' },
    { c: '#ff00ff', g: '×2', titre: 'Points doubles', texte: 'Chaque bonne réponse vaut double' },
  ];
  let t = $state(0);
  const s = $derived(specialsAt(t));
</script>

<div class="spe" {@attach clock(SPECIALS_CYCLE, 0, (v) => (t = v))}>
  {#each CARDS as c, i (c.titre)}
    <article class="ct" class:on={s.i === i} style="--c:{c.c}">
      <span class="ct-n">{s.i === i ? s.n : 4}</span>
      <p class="kk">Attention · Manche spéciale</p>
      <div class="ct-g">{c.g}</div>
      <h4>{c.titre}</h4>
      <p class="tx">{c.texte}</p>
    </article>
  {/each}
</div>

<style>
  .spe {
    width: 100%;
    aspect-ratio: 16 / 10;
    container-type: inline-size;
    display: grid;
  }
  .ct {
    grid-area: 1 / 1;
    position: relative;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 2px;
    padding: 12px;
    text-align: center;
    border-radius: 18px;
    background: radial-gradient(
      80% 70% at 50% 40%,
      color-mix(in srgb, var(--c) 30%, #0a0a10),
      #08080c 75%
    );
    border: 1px solid color-mix(in srgb, var(--c) 60%, transparent);
    overflow: hidden;
    opacity: 0;
    transform: scale(0.94);
    transition:
      opacity 0.2s,
      transform 0.45s var(--out);
  }
  .ct.on {
    opacity: 1;
    transform: none;
    transition-delay: 0.2s;
  }
  .kk {
    font-size: 2.6cqw;
    color: color-mix(in srgb, var(--c) 55%, #fff);
  }
  .ct-g {
    font-family: var(--titre);
    font-weight: 900;
    font-size: 24cqw;
    line-height: 0.8;
    color: var(--c);
  }
  h4 {
    font-weight: 900;
    font-size: 10cqw;
    line-height: 0.85;
  }
  .tx {
    color: #e2e3ee;
    font-size: 3.6cqw;
  }
  .ct-n {
    position: absolute;
    top: 3cqw;
    right: 3cqw;
    width: 9cqw;
    height: 9cqw;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 2px solid var(--c);
    font-family: var(--mono);
    font-weight: 700;
    font-size: 3.6cqw;
  }
</style>
