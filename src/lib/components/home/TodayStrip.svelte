<script>
  import { getContext } from 'svelte';
  import ChallengeIcon from '$lib/components/ChallengeIcon.svelte';
  import { todayParis, computeStreak } from '$lib/zikle/shared.js';

  /** @type {{ challenge: any, onResume: (room: any) => void }} */
  let { challenge = null, onResume } = $props();

  const ctx = getContext('zik');

  // 'loading' | 'todo' | 'won' | 'lost'
  let zikle = $state({ status: 'loading', attempts: 0, streak: 0 });
  let lastRoom = $state(null);

  $effect(() => {
    if (!ctx.authReady) return;
    loadZikle(ctx.user);
  });

  $effect(() => {
    try { lastRoom = JSON.parse(localStorage.getItem('zik_last_room') || 'null'); } catch { lastRoom = null; }
  });

  async function loadZikle(user) {
    const today = todayParis();
    let rows;
    if (user && ctx.sb) {
      const { data } = await ctx.sb
        .from('daily_results')
        .select('date, won, attempts')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(400);
      rows = data || [];
    } else {
      try {
        const history = JSON.parse(localStorage.getItem('zikle_history') || '{}');
        rows = Object.entries(history).map(([date, v]) => ({ date, won: v.won, attempts: v.attempts?.length ?? 0 }));
      } catch { rows = []; }
    }
    const todays = rows.find(r => r.date === today);
    zikle = {
      status: todays ? (todays.won ? 'won' : 'lost') : 'todo',
      attempts: todays?.attempts ?? 0,
      streak: computeStreak(rows, today),
    };
  }

  const pct = $derived(
    challenge ? Math.min(100, Math.round((challenge.current_value / challenge.target) * 100)) : 0,
  );

  const timeLeft = $derived.by(() => {
    if (!challenge) return '';
    const diffMs = new Date(`${challenge.week_end}T23:59:59+02:00`).getTime() - Date.now();
    if (diffMs <= 0) return 'Se termine bientôt';
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    return days > 0 ? `Encore ${days} j ${hours} h` : `Encore ${hours} h`;
  });
</script>

<section class="today" aria-labelledby="today-title">
  <h2 id="today-title" class="today-title">Aujourd'hui sur ZIK</h2>

  <div class="today-grid">
    <a href="/zikle" class="today-card" class:done={zikle.status === 'won' || zikle.status === 'lost'}>
      <span class="today-kicker">Zikle · la chanson du jour</span>
      {#if zikle.status === 'won'}
        <strong class="today-main">Trouvée en {zikle.attempts} essai{zikle.attempts > 1 ? 's' : ''} ✓</strong>
        <span class="today-sub">Nouvelle chanson demain. Va voir ton rang du jour.</span>
      {:else if zikle.status === 'lost'}
        <strong class="today-main">Pas trouvée cette fois</strong>
        <span class="today-sub">Nouvelle chanson demain, retente ta chance.</span>
      {:else}
        <strong class="today-main">
          {zikle.streak > 0 ? `Ne casse pas ta série de ${zikle.streak} jour${zikle.streak > 1 ? 's' : ''} !` : 'Une chanson, 6 essais. Tu la trouves ?'}
        </strong>
        <span class="today-sub">Gratuit, sans compte, 2 minutes.</span>
      {/if}
      {#if zikle.streak > 0 && zikle.status !== 'todo'}
        <span class="today-badge">🔥 Série de {zikle.streak} jour{zikle.streak > 1 ? 's' : ''}</span>
      {/if}
      <span class="today-cta">{zikle.status === 'todo' || zikle.status === 'loading' ? 'Jouer au Zikle →' : 'Voir le résultat →'}</span>
    </a>

    {#if challenge}
      <a href={challenge.type === 'zikle_wins' ? '/zikle' : '/defi'} class="today-card">
        <span class="today-kicker"><ChallengeIcon type={challenge.type} size={12} /> Défi de la semaine</span>
        <strong class="today-main">{challenge.label} : {pct} %</strong>
        <span class="today-bar" aria-hidden="true"><i style="width:{pct}%"></i></span>
        <span class="today-sub">
          {challenge.current_value.toLocaleString('fr-FR')} / {challenge.target.toLocaleString('fr-FR')} {challenge.unit} · {timeLeft}.
          Chaque partie compte, même perdue.
        </span>
        <span class="today-cta">Voir le défi →</span>
      </a>
    {/if}

    {#if lastRoom}
      <button class="today-card" onclick={() => onResume(lastRoom)}>
        <span class="today-kicker">Reprendre</span>
        <strong class="today-main">{lastRoom.emoji} {lastRoom.name}</strong>
        <span class="today-sub">Ta dernière room, en un clic.</span>
        <span class="today-cta">Rejouer →</span>
      </button>
    {/if}
  </div>
</section>

<style>
  .today {
    padding: 40px clamp(16px, 4vw, 48px) 8px;
  }
  .today-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    text-transform: uppercase;
    letter-spacing: -0.5px;
    margin-bottom: 18px;
  }
  .today-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
  }
  .today-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 20px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent);
    color: var(--text);
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
  }
  .today-card:hover { border-color: rgb(var(--accent-rgb) / 0.5); transform: translateY(-2px); }
  .today-card.done { border-left-color: var(--success); }
  .today-kicker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .today-main {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.35rem;
    line-height: 1.1;
    text-transform: uppercase;
  }
  .today-sub { font-size: 0.9rem; color: var(--mid); line-height: 1.45; }
  .today-badge { font-size: 0.85rem; font-weight: 700; }
  .today-bar { height: 6px; background: rgb(var(--c-glass) / 0.1); overflow: hidden; }
  .today-bar i { display: block; height: 100%; background: var(--accent); }
  .today-cta { margin-top: auto; padding-top: 8px; font-weight: 700; font-size: 0.9rem; color: var(--accent); }
  .today-card:hover .today-cta { text-decoration: underline; text-underline-offset: 3px; }
</style>
