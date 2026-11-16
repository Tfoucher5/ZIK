<script module>
  import { seg, stage, BLEU, ROSE } from '$lib/components/soiree/soireePins.js';

  // [pseudo, équipe (0 rouge, 1 bleue), arrivée]
  const ARR = [['Karim', 0, 0.08], ['Zoé', 1, 0.16], ['Léa', 0, 0.3], ['Hugo', 1, 0.44], ['Inès', 0, 0.56], ['Malik', 1, 0.68], ['Sarah', 0, 0.78], ['Tom', 1, 0.88]];

  export function render(p) {
    const k = ARR.filter((a) => p >= a[2]).length;
    const team = p >= 0.48;
    const of = (t) =>
      ARR.filter((a, i) => i < k && a[1] === t && (a[0] !== 'Léa' || team))
        .map((a) => a[0])
        .join(', ') || 'Personne encore';
    return {
      k,
      team,
      count: `${k} ${k > 1 ? 'joueurs connectés' : 'joueur connecté'}`,
      rows: ARR.map(([n, t], i) => ({ n, c: i === 2 && !team ? 'transparent' : t ? BLEU : ROSE, in: i < k })),
      rouges: of(0),
      bleus: of(1),
      lay: stage(p, [0.27, 0.62]),
      pseudo: 'Léa'.slice(0, Math.ceil(seg(p, 0.05, 0.18) * 3)),
      press: p > 0.2 && p < 0.27,
      beat: stage(p, [0.3, 0.62]),
    };
  }
</script>

<script>
  import Pin from '$lib/components/soiree/Pin.svelte';
  import Qr from '$lib/components/soiree/Qr.svelte';
  import { PINS } from '$lib/components/soiree/soireeBeats.js';
  import { pad } from '$lib/components/soiree/soireePins.js';

  let p = $state(1);
  const s = $derived(render(p));
</script>

<Pin id="rejoindre" len={1.1} {...PINS.rejoindre} beat={s.beat} onprogress={(v) => (p = v)}>
  <div class="dev duo" aria-hidden="true">
    <div class="tv2">
      <div class="scr">
        <div class="stg lob">
          <div>
            <p class="kk"><b>●</b> {s.count}</p>
            <div class="lob-h">Sortez vos<br /><em>téléphones.</em></div>
            <div class="code">{#each 'KZ4P2M' as c, i (i)}<b>{c}</b>{/each}</div>
            <p class="lob-url">Scannez le QR code, ou allez sur <b>zik-music.fr</b> et tapez le code.</p>
          </div>
          <Qr />
          <div class="tms">
            <div class="tm" style:--tc={ROSE}><b>Rouge</b><span>{s.rouges}</span></div>
            <div class="tm" style:--tc={BLEU}><b>Bleue</b><span>{s.bleus}</span></div>
          </div>
        </div>
        <aside class="brd">
          <div class="brd-h"><span>Joueurs</span><span>{s.k}</span></div>
          <ol class="rows">
            {#each s.rows as r, i (r.n)}
              <li class="row fx" class:in={r.in} style:--y={i} style:--tc={r.c}>
                <span class="rk">{pad(i + 1)}</span><span class="nm">{r.n}</span><span class="pt"><span>0</span></span>
              </li>
            {/each}
          </ol>
        </aside>
      </div>
    </div>
    <div class="ph">
      <div class="phs">
        <div class="phl">
          <div class="lay" class:on={s.lay === 0}>
            <p class="k">ZIK Soirée</p>
            <div class="big">Entre dans<br />la partie.</div>
            <p class="k">Code affiché sur la TV</p>
            <div class="inp">KZ4P2M</div>
            <p class="k">Ton pseudo</p>
            <div class="inp">{s.pseudo}<i class="caret"></i></div>
            <div class="pbtn" class:press={s.press}>Rejoindre</div>
          </div>
          <div class="lay" class:on={s.lay === 1}>
            <p class="k"><b>●</b> Connecté</p>
            <div class="big">C'est bon,<br />tu es dedans.</div>
            <p class="k">Choisis ton équipe</p>
            <div class="teams2">
              <div class="team2" class:on={s.team} style:--tc={ROSE}><b>Rouge</b><small>1 joueur</small></div>
              <div class="team2" style:--tc={BLEU}><b>Bleue</b><small>1 joueur</small></div>
            </div>
          </div>
          <div class="lay" class:on={s.lay === 2}>
            <p class="k"><b>●</b> Connecté</p>
            <div class="big">C'est bon,<br />tu es dedans.</div>
            <p class="hint">Regarde la TV : la partie démarre quand l'hôte la lance.</p>
            <p class="k">Dans le salon · {s.k}</p>
            <ul class="roster">
              {#each s.rows.slice(0, s.k) as r (r.n)}<li class:me={r.n === 'Léa'}>{r.n}</li>{/each}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</Pin>

<style>
  .stg.lob {
    grid-template-columns: minmax(0, 1fr) 21%;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 2cqw;
    place-items: center start;
    text-align: left;
  }
  .lob-h { font-family: var(--titre); font-weight: 900; text-transform: uppercase; font-size: 2.7em; line-height: 0.86; margin: 0.2em 0 0.3em; }
  .lob-h em { font-style: normal; color: var(--accent); }
  .code { display: flex; gap: 0.25em; }
  .code b { display: grid; place-items: center; width: 1.45em; height: 1.8em; border-radius: 0.25em; background: rgba(255, 255, 255, 0.09); font-family: var(--mono); font-size: 1.2em; }
  .lob-url { margin: 0.5em 0 0; font-size: 0.74em; color: var(--muted); }
  .lob :global(.qr) { width: 100%; }
  .tms { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 1.4cqw; width: 100%; }
  .tm { min-width: 0; padding: 0.4em 0.6em; border-radius: 0.35em; background: rgba(255, 255, 255, 0.04); border-left: 0.3em solid var(--tc); text-align: left; }
  .tm b { display: block; font-family: var(--titre); text-transform: uppercase; }
  .tm span { display: block; color: var(--muted); font-size: 0.8em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .teams2 { display: grid; gap: 0.4em; }
  .team2 { display: flex; justify-content: space-between; align-items: center; padding: 0.55em 0.7em; border-radius: 0.45em; border: 1px solid var(--line-2); border-left: 0.3em solid var(--tc); transition: background 0.3s, border-color 0.3s; }
  .team2 b { font-family: var(--titre); text-transform: uppercase; }
  .team2 small { color: var(--muted); font-size: 0.75em; }
  .team2.on { background: color-mix(in srgb, var(--tc) 22%, transparent); border-color: var(--tc); }
  .roster { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3em; }
  .roster li { padding: 0.15em 0.55em; border-radius: 99px; background: rgba(255, 255, 255, 0.06); font-size: 0.8em; }
  .roster li.me { background: var(--accent-soft); color: var(--accent-tint); }
</style>
