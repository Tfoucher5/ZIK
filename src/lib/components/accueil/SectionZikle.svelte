<!-- Le Zikle du jour : six essais, un extrait de plus en plus long -->
<script>
  const N = 132;
  const rects = Array.from({ length: N }, (_, i) => {
    const h = Math.max(0.1, Math.abs(Math.sin(i * 0.37) * Math.sin(i * 0.113 + 1) * Math.cos(i * 0.049)) * 0.95 + 0.08 * Math.sin(i * 1.7) + 0.12);
    const y = (1 - Math.min(1, h)) * 50;
    return `<rect x='${i * 10 + 2}' y='${y.toFixed(1)}' width='6' height='${(100 - 2 * y).toFixed(1)}' rx='3'/>`;
  }).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${N * 10} 100' preserveAspectRatio='none'>${rects}</svg>`;
  const MASK = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const ESSAIS = [6, 14, 26, 42, 66, 100];
</script>

<section class="zikle" aria-labelledby="t-zikle">
  <div class="acc-wrap">
    <div class="acc-copy">
      <span class="label rv"><i></i>Le Zikle du jour</span>
      <h2 id="t-zikle" class="acc-h2 grad rv">Une chanson par jour, six essais</h2>
      <p class="acc-lead rv">La même chanson pour tout le monde. À chaque erreur, l'extrait s'allonge. Jouable sans compte.</p>
      <a class="btn-line rv" href="/zikle">Jouer au Zikle du jour</a>
    </div>
    <div class="onde rv" aria-hidden="true">
      <div class="bars" style:--mk={MASK}><i class="b0"></i><i class="b1"></i></div>
      <ol>
        {#each ESSAIS as x, i (x)}<li style:--x="{x}%"><span>Essai&nbsp;</span>{i + 1}</li>{/each}
      </ol>
    </div>
  </div>
</section>

<style>
  @property --w {
    syntax: '<percentage>';
    inherits: true;
    initial-value: 100%;
  }
  .zikle {
    background: var(--surface-alt);
    border-block: 1px solid var(--line);
  }
  .onde {
    margin-top: 40px;
  }
  .bars {
    position: relative;
    height: 84px;
  }
  .bars i {
    position: absolute;
    inset: 0;
    -webkit-mask: var(--mk) center / 100% 100% no-repeat;
    mask: var(--mk) center / 100% 100% no-repeat;
  }
  .b0 {
    background: rgba(255, 255, 255, 0.16);
  }
  .b1 {
    background: linear-gradient(90deg, var(--violet), var(--accent));
    clip-path: inset(0 calc(100% - var(--w)) 0 0);
  }
  ol {
    position: relative;
    height: 34px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  li {
    position: absolute;
    top: 0;
    left: var(--x);
    translate: -100% 0;
    padding: 8px 6px 0 0;
    border-right: 1px solid var(--line-2);
    white-space: nowrap;
  }
  li span {
    display: none;
  }
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      :global(html:not(.rm)) .bars {
        animation: allonge linear both;
        animation-timeline: view();
        animation-range: entry 20% cover 62%;
      }
    }
  }
  @keyframes allonge {
    from {
      --w: 4%;
    }
    to {
      --w: 100%;
    }
  }
  @media (min-width: 900px) {
    .bars {
      height: 130px;
    }
    li span {
      display: inline;
    }
  }
</style>
