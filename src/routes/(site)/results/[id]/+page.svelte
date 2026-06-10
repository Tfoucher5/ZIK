<script>
  let { data } = $props();

  const r = data.result;
  const TIER_LABELS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };

  const rankLabel = r.rank === 1 ? '🥇 1er' : r.rank === 2 ? '🥈 2e' : r.rank === 3 ? '🥉 3e' : `#${r.rank}`;
  const dateLabel = new Date(r.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const metaTitle = `${r.username} a marqué ${r.score} pts au blind test "${r.room_name}" — ZIK`;
  const metaDesc = `${rankLabel} sur ${r.total_players} joueur${r.total_players > 1 ? 's' : ''} dans la room ${r.room_name}. Tu fais mieux ? Joue gratuitement au blind test multijoueur sur ZIK.`;
</script>

<svelte:head>
  <title>{metaTitle}</title>
  <meta name="description" content={metaDesc} />
  <meta name="robots" content="noindex, follow" />
  <meta property="og:title" content={metaTitle} />
  <meta property="og:description" content={metaDesc} />
  <meta property="og:url" content="https://www.zik-music.fr/results/{r.id}" />
</svelte:head>

<main class="result-root">
  <div class="result-card">
    <div class="result-brand">ZIK<span>.</span></div>

    <div class="result-room">
      {#if r.room_emoji}<span class="result-emoji">{r.room_emoji}</span>{/if}
      <span>{r.room_name}</span>
    </div>

    <div class="result-avatar">{r.username[0]?.toUpperCase() ?? '?'}</div>
    <div class="result-name">{r.username}</div>
    <time class="result-date" datetime={r.created_at}>{dateLabel}</time>

    <div class="result-score">{r.score}<span>pts</span></div>
    <div class="result-rank">{rankLabel} sur {r.total_players} joueur{r.total_players > 1 ? 's' : ''}</div>

    {#if data.unlockedAchievements.length}
      <div class="result-achievements">
        <p class="result-ach-title">Succès débloqués pendant cette partie</p>
        <div class="result-ach-list">
          {#each data.unlockedAchievements as a (a.id + (a.tier ?? ''))}
            <span class="result-ach result-ach--{a.rarity}" title={a.name}>
              {a.icon} {a.name}{#if a.tier}&nbsp;· {TIER_LABELS[a.tier]}{/if}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <a class="result-cta" href="/rooms">🎵 Tu fais mieux ? Joue maintenant</a>
    <p class="result-sub">Blind test multijoueur gratuit, sans installation.</p>
  </div>
</main>

<style>
.result-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px 60px;
}

.result-card {
  width: min(440px, 100%);
  text-align: center;
  padding: 36px 28px;
  border-radius: 24px;
  background: linear-gradient(160deg, rgba(124, 58, 237, 0.14), rgba(17, 17, 27, 0.9));
  border: 1px solid rgba(124, 58, 237, 0.35);
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.45);
}

.result-brand {
  font-size: 1.3rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.02em;
  margin-bottom: 18px;
}
.result-brand span { color: #7c3aed; }

.result-room {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #c4b5fd;
  background: rgba(124, 58, 237, 0.14);
  padding: 6px 16px;
  border-radius: 999px;
  margin-bottom: 22px;
}
.result-emoji { font-size: 1.1rem; }

.result-avatar {
  width: 72px;
  height: 72px;
  margin: 0 auto 10px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #7c3aed, #4c1d95);
}

.result-name { font-size: 1.3rem; font-weight: 800; color: #fff; }
.result-date { font-size: 0.8rem; color: #9ca3af; }

.result-score {
  margin-top: 18px;
  font-size: 3.4rem;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.result-score span {
  font-size: 1.1rem;
  margin-left: 6px;
  -webkit-text-fill-color: #a78bfa;
}

.result-rank {
  margin-top: 8px;
  font-weight: 700;
  color: #e5e7eb;
}

.result-achievements { margin-top: 22px; }
.result-ach-title {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  margin: 0 0 10px;
}
.result-ach-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.result-ach {
  font-size: 0.82rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e5e7eb;
}
.result-ach--rare      { border-color: rgba(37, 99, 235, 0.5); color: #93c5fd; }
.result-ach--epic      { border-color: rgba(168, 85, 247, 0.6); color: #d8b4fe; }
.result-ach--legendary { border-color: rgba(250, 204, 21, 0.6); color: #fde68a; }

.result-cta {
  display: inline-block;
  margin-top: 26px;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff;
  font-weight: 800;
  padding: 12px 26px;
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.result-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4);
}

.result-sub {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: #9ca3af;
}
</style>
