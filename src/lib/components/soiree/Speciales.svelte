<script module>
  import { ease, seg } from '#lib/components/soiree/soireePins.js';

  /** Trois cartons qui claquent l'un après l'autre, avec le décompte de l'annonce. */
  export function render(p) {
    return [0, 1, 2].map((i) => {
      const s = i * 0.32;
      const inn = seg(p, s + 0.02, s + 0.1);
      const out = i < 2 ? seg(p, s + 0.28, s + 0.34) : 0;
      const k = 1 + 0.55 * (1 - ease(inn));
      return {
        o: inn * (1 - out),
        tr: `scale(${k * (1 - 0.12 * out)}) rotate(${(1 - ease(inn)) * (i % 2 ? 3 : -3)}deg)`,
        flash: Math.max(0, 1 - Math.abs(p - s - 0.1) / 0.03) * 0.6,
        n: Math.max(1, 4 - Math.floor(seg(p, s + 0.1, s + 0.3) * 4)),
      };
    });
  }
</script>

<script>
  import Pin from '#lib/components/soiree/Pin.svelte';
  import { CARTONS, PINS } from '#lib/components/soiree/soireeBeats.js';

  let p = $state(0.2);
  const s = $derived(render(p));
</script>

<Pin id="speciales" len={1.5} full {...PINS.speciales} onprogress={(v) => (p = v)}>
  <div class="dev cartons">
    {#each CARTONS as c, i (c.k)}
      <article class="ct" style:--c={c.c} style:opacity={s[i].o} style:transform={s[i].tr}>
        <span class="ct-n" aria-hidden="true">{s[i].n}</span>
        <p class="kk">Attention · Manche spéciale</p>
        <div class="ct-g" aria-hidden="true">{c.g}</div>
        <h3>{c.label}</h3>
        <p>{c.hint}</p>
        <i class="flash" style:opacity={s[i].flash}></i>
      </article>
    {/each}
  </div>
</Pin>

<style>
  .dev.cartons { width: 100%; height: 100%; display: grid; align-content: stretch; }
  .ct { grid-area: 1 / 1; position: relative; display: grid; place-content: center; justify-items: center; text-align: center; gap: 6px; padding: 24px 16px; border-radius: 26px; background: radial-gradient(80% 70% at 50% 40%, color-mix(in srgb, var(--c) 30%, #0a0a10), #08080c 75%); border: 1px solid color-mix(in srgb, var(--c) 60%, transparent); overflow: hidden; will-change: transform, opacity; }
  .ct .kk { color: color-mix(in srgb, var(--c) 55%, #fff); }
  .ct-g { font-family: var(--titre); font-weight: 900; font-size: clamp(5rem, 30vw, 13rem); line-height: 0.8; color: var(--c); }
  .ct h3 { font-weight: 900; font-size: clamp(2.6rem, 13vw, 7.5rem); line-height: 0.85; }
  .ct > p:not(.kk) { color: #e2e3ee; font-size: 1.05rem; }
  .ct-n { position: absolute; top: 14px; right: 16px; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; border: 2px solid var(--c); font-family: var(--mono); font-weight: 700; font-size: 18px; }
  .flash { position: absolute; inset: 0; border-radius: 26px; background: #fff; pointer-events: none; mix-blend-mode: overlay; }
  :global(html.rm) .cartons { gap: 14px; }
  :global(html.rm) .ct { grid-area: auto; min-height: 300px; opacity: 1 !important; transform: none !important; will-change: auto; }
  :global(html.rm) .flash { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .dev.cartons { gap: 14px; }
    .ct { grid-area: auto; min-height: 300px; opacity: 1 !important; transform: none !important; will-change: auto; }
    .flash { display: none; }
  }
  @media (min-width: 900px) {
    .ct > p:not(.kk) { font-size: 1.3rem; }
  }
</style>
