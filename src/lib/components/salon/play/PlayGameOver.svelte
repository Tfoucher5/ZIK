<script>
  import { teamColor } from '$lib/data/salonOptions.js';
  import { podium } from './salonPlayer.svelte.js';
  import { endView } from './endView.js';
  import { storyData } from './podiumStory.js';
  import StoryShare from './StoryShare.svelte';
  import TeamBand from './TeamBand.svelte';
  import PlayTop from './PlayTop.svelte';

  /** Téléphone en fin de partie : sa place en aplat, les classements, « Une autre ! ». */
  let { p } = $props();

  const v = $derived(endView(p));
  // « 5e sur 8 » : le suffixe reste en minuscules sous le titre en capitales
  const ordinal = $derived(v.title.match(/^(.*?)(\d+)(re|e)\b(.*)$/));
  const rows = $derived(podium(p.finalRanking));
  const me = $derived(p.finalRanking?.me);
  const story = $derived(
    storyData({ finalRanking: p.finalRanking, teams: p.teams, username: p.username, myTeam: p.myTeam, round: p.round }),
  );
  const asked = $derived(Math.max(p.roster.encore ?? 0, p.encore ? 1 : 0));
</script>

<div class="go">
  {#if p.team}
    <TeamBand name={p.team.name} color={teamColor(p.myTeam)}><small class="who">{p.username} · {p.code}</small></TeamBand>
  {:else}
    <PlayTop username={p.username} code={p.code} />
  {/if}

  <section class="res {v.medal ?? ''}" class:long={v.team}>
    <p class="k">Partie terminée · {p.round} manche{p.round > 1 ? 's' : ''}</p>
    <h1 aria-label={v.title}>
      {#if ordinal}{ordinal[1]}{ordinal[2]}<span class="e">{ordinal[3]}</span>{ordinal[4]}{:else}{v.title}{/if}
    </h1>
    {#if v.score}<p><b>{v.score}</b>{v.team ? ' de moyenne' : ''}.{v.gap ? ` ${v.gap}` : ''}</p>{/if}
  </section>

  {#if v.night}
    <p class="nuit">
      Soirée ({v.night.games} parties) : {v.night.team ? 'ton équipe est' : 'tu es'} à la <b>{v.night.place}</b>{v.night.count ? ` sur ${v.night.count}` : ''}
    </p>
  {/if}

  {#if p.teams}
    <div class="bloc">
      <p class="k">Les équipes</p>
      <ol class="cl">
        {#each p.teams as t, i (t.id)}
          <li class="eq" class:me={t.id === p.myTeam} style:--tc={teamColor(t.id)}>
            <span class="r">{String(i + 1).padStart(2, '0')}</span>
            <span class="n">{t.name}{#if t.id === p.myTeam}<small>ton équipe</small>{/if}</span>
            <span class="p">{t.score}</span>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  {#if rows.length}
    <div class="bloc">
      <p class="k">{p.teams ? 'Les joueurs' : 'Le classement'}</p>
      <ol class="cl">
        {#each rows as r (r.username)}
          {#if r === me && me.rank > 4}<li class="trou" aria-hidden="true">···</li>{/if}
          <li class:me={r.username === p.username}>
            <span class="r">{String(r.rank).padStart(2, '0')}</span>
            <span class="n">{r.username}{#if r.username === p.username}<small>toi</small>{:else if r.left}<small>a quitté</small>{/if}</span>
            <span class="p">{r.score}</span>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  {#if story}<StoryShare data={story} />{/if}

  <p class="fuite">
    <a class="lien" href="/salon?ref=invite">Organiser ma propre soirée</a>
    <button class="lien" onclick={p.leave}>Rejoindre une autre soirée</button>
  </p>
</div>

<footer class="bar">
  <button class="encore" aria-pressed={p.encore} onclick={p.toggleEncore}>
    {p.encore ? `Demandé · ${asked} sur ${p.roster.count}` : 'Une autre !'}
  </button>
  <p>L'hôte lance la suivante. Tu restes dans la partie : garde cette page ouverte.</p>
</footer>

<style>
  .go {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    container-type: inline-size;
  }
  .who {
    margin-left: auto;
    flex: none;
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
  }
  .k {
    font-family: var(--s-mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }
  /* Le résultat en aplat, à la couleur de la médaille */
  .res {
    margin: 0 -16px;
    padding: 18px 16px 20px;
    display: grid;
    gap: 10px;
    background: var(--mc, var(--surface2));
    color: var(--mt, var(--text));
  }
  .res.or { --mc: var(--gold); --mt: #000; }
  .res.ar { --mc: var(--silver); --mt: #000; }
  .res.br { --mc: var(--bronze); --mt: #000; }
  .res .k {
    color: inherit;
    opacity: 0.78;
  }
  h1 {
    margin: 0;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 23.5cqw;
    line-height: 0.86;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    text-wrap: balance;
    animation: titre 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .long h1 { font-size: 19cqw; }
  .e {
    font-size: 0.46em;
    vertical-align: top;
    margin-left: 0.04em;
    text-transform: lowercase;
  }
  .res p:last-child {
    font-size: 17px;
    font-weight: 500;
    line-height: 1.3;
  }
  .res b {
    font-family: var(--s-mono);
    font-weight: 700;
  }
  @keyframes titre {
    from { opacity: 0; transform: translateY(30px) scale(0.8); }
  }
  .nuit {
    padding-left: 12px;
    border-left: 3px solid var(--border2);
    font-size: 16px;
    line-height: 1.35;
    color: var(--mid);
  }
  .nuit b { color: var(--text); font-weight: 600; }
  .bloc { display: grid; gap: 6px; }
  .cl { list-style: none; margin: 0; padding: 0; }
  .cl li {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 44px;
    border-bottom: 1px solid var(--border);
    font-size: 17px;
    line-height: 1.2;
  }
  .cl .r { font-family: var(--s-mono); font-size: 13px; color: var(--mid); }
  .cl .n { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cl .n small { margin-left: 6px; font-size: 14px; color: var(--mid); }
  .cl .p { font-family: var(--s-mono); font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
  .cl li.me {
    margin: 0 -10px;
    padding: 0 10px;
    border-radius: 10px;
    border-bottom-color: transparent;
    background: rgb(255 255 255 / 0.1);
    font-weight: 600;
  }
  .cl li.eq .n::before {
    content: '';
    display: inline-block;
    width: 11px;
    height: 11px;
    margin-right: 9px;
    border-radius: 3px;
    background: var(--tc);
  }
  .cl li.trou {
    min-height: 20px;
    border-bottom: 0;
    font-family: var(--s-mono);
    font-size: 13px;
    color: var(--mid);
  }
  .fuite {
    margin-top: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0 20px;
  }
  .lien {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0;
    background: none;
    border: 0;
    color: var(--text);
    opacity: 0.85;
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    text-decoration: underline;
    text-decoration-color: var(--border2);
    text-underline-offset: 5px;
    cursor: pointer;
  }
  /* « Une autre ! » sous le pouce, toujours visible */
  .bar {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: grid;
    gap: 8px;
    margin: 0 -16px calc(-16px - env(safe-area-inset-bottom));
    padding: 12px 16px calc(14px + env(safe-area-inset-bottom));
    background: rgb(7 7 11 / 0.94);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-top: 1px solid var(--border2);
  }
  .bar p {
    text-align: center;
    font-size: 14px;
    line-height: 1.3;
    color: var(--mid);
  }
  .encore {
    min-height: 64px;
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: #000;
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 26px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.12s, background 0.25s, color 0.25s;
  }
  .encore:active { transform: scale(0.97); }
  .encore[aria-pressed='true'] {
    background: rgb(255 255 255 / 0.08);
    color: var(--text);
    box-shadow: inset 0 0 0 1px var(--border2);
  }
  .encore:focus-visible,
  .lien:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    h1 { animation: none; }
    .encore { transition: none; }
  }
</style>
