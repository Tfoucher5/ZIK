<script>
  import { tick } from 'svelte';
  import { stateOf } from './liveRooms.js';

  /** Pilotage d'une room en direct : manche, actions, joueurs, annonce et chat. */
  let { r, meta, act } = $props();

  let announceText = $state('');
  let chatInput = $state('');
  let confirming = $state(null);
  let chatBoxEl = $state();
  let confirmTimer;
  let prevChatLen = 0;

  const st = $derived(stateOf(r));
  const ranked = $derived([...r.players].sort((a, b) => b.score - a.score));

  $effect(() => {
    const len = r.chatMessages?.length ?? 0;
    if (len !== prevChatLen) {
      prevChatLen = len;
      tick().then(() => chatBoxEl && (chatBoxEl.scrollTop = chatBoxEl.scrollHeight));
    }
  });

  $effect(() => () => clearTimeout(confirmTimer));

  function ask(key, run) {
    clearTimeout(confirmTimer);
    if (confirming === key) {
      confirming = null;
      run();
      return;
    }
    confirming = key;
    confirmTimer = setTimeout(() => (confirming = null), 4000);
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    act('chat', { message: chatInput.trim() });
    chatInput = '';
  }

  function sendAnnounce() {
    if (!announceText.trim()) return;
    act('announce', { message: announceText.trim() });
    announceText = '';
  }

  const time = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const timerPct = (r) => (r.roundDuration ? Math.max(0, Math.min(100, (r.timer / r.roundDuration) * 100)) : 0);
</script>

<div class="detail">
  <header class="d-head">
    <span class="emo">{meta.emoji}</span>
    <div class="d-title">
      <b>{meta.name}</b>
      <span class="a-muted">{r.roomId} · {r.playerCount} joueur{r.playerCount > 1 ? 's' : ''}</span>
    </div>
    <em class="a-tag {st.tone}">{st.label}</em>
  </header>

  <section class="a-card now">
    {#if r.isActive}
      <div class="now-row">
        <span class="a-muted">Manche</span>
        <b class="big">{r.currentRound}<small>/{r.maxRounds}</small></b>
        {#if r.isPaused}
          <em class="a-tag warn">En pause</em>
        {:else if r.isSyncWaiting}
          <span class="a-muted">Chargement · {r.readyCount} prêt{r.readyCount > 1 ? 's' : ''}</span>
        {:else}
          <span class="timer">{r.timer} s</span>
        {/if}
      </div>
      {#if !r.isPaused && !r.isSyncWaiting}
        <div class="a-meter"><i class="tick" style="width:{timerPct(r)}%"></i></div>
      {/if}
      {#if r.currentTrack}
        <p class="track"><span class="a-muted">Titre en cours</span><b>{r.currentTrack.artist} · {r.currentTrack.title}</b></p>
      {/if}
    {:else}
      <p class="a-muted">Pas de partie en cours : les joueurs attendent le lancement.</p>
    {/if}
  </section>

  <div class="a-btns">
    {#if r.isActive && !r.isPaused}
      <button class="a-btn small" type="button" onclick={() => act('pause')}>Mettre en pause</button>
    {/if}
    {#if r.isPaused}
      <button class="a-btn small good" type="button" onclick={() => act('resume')}>Reprendre</button>
    {/if}
    {#if r.isActive}
      <button class="a-btn small" type="button" onclick={() => act('skip_round')}>Passer la manche</button>
    {/if}
    {#if r.adminBlocked}
      <button class="a-btn small good" type="button" onclick={() => act('unblock')}>Déverrouiller</button>
    {:else}
      <button class="a-btn small" type="button" title="Empêche de nouveaux joueurs d’entrer" onclick={() => act('block')}>Verrouiller</button>
    {/if}
    {#if r.isActive}
      <button class="a-btn small danger" type="button" onclick={() => ask('end', () => act('end_game'))}>
        {confirming === 'end' ? 'Confirmer la fin ?' : 'Terminer la partie'}
      </button>
    {/if}
    <button class="a-btn small danger" type="button" onclick={() => ask('close', () => act('close_room'))}>
      {confirming === 'close' ? 'Confirmer la fermeture ?' : 'Fermer la room'}
    </button>
  </div>

  <section class="block">
    <h3 class="a-h2">Joueurs</h3>
    {#if ranked.length}
      <ul class="players">
        {#each ranked as p, i (p.name)}
          <li>
            <span class="rank" class:gold={i === 0 && p.score > 0}>{i + 1}</span>
            <span class="p-name">{p.name}</span>
            {#if r.isActive}
              <span class="found">
                <em class="a-tag" class:good={p.foundArtist}>Artiste</em>
                <em class="a-tag" class:good={p.foundTitle}>Titre</em>
              </span>
            {/if}
            <b class="score">{p.score}</b>
            <button class="a-btn small danger kick" type="button" onclick={() => ask(`kick:${p.name}`, () => act('kick', { username: p.name }))}>
              {confirming === `kick:${p.name}` ? 'Confirmer' : 'Exclure'}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="a-muted">Personne dans la room.</p>
    {/if}
  </section>

  <section class="block">
    <h3 class="a-h2">Annonce à l’écran</h3>
    <form class="send" onsubmit={(e) => { e.preventDefault(); sendAnnounce(); }}>
      <input class="a-input" maxlength="200" placeholder="Message affiché en grand chez tous les joueurs" bind:value={announceText} />
      <button class="a-btn" type="submit" disabled={!announceText.trim()}>Annoncer</button>
    </form>
  </section>

  <section class="block">
    <h3 class="a-h2">Chat <span class="a-muted">({r.chatMessages?.length ?? 0})</span></h3>
    <div class="chat" bind:this={chatBoxEl}>
      {#each r.chatMessages ?? [] as m, i (i)}
        <p class="msg" class:admin={m.name.endsWith(' - admin')}>
          <span class="ts">{time(m.ts)}</span>
          <b>{m.name}</b>
          <span class="txt">{m.text}</span>
        </p>
      {:else}
        <p class="a-muted">Aucun message pour l’instant.</p>
      {/each}
    </div>
    <form class="send" onsubmit={(e) => { e.preventDefault(); sendChat(); }}>
      <input class="a-input" maxlength="120" placeholder="Écrire dans le chat en tant qu’admin" bind:value={chatInput} />
      <button class="a-btn primary" type="submit" disabled={!chatInput.trim()}>Envoyer</button>
    </form>
  </section>
</div>

<style>
  .emo { flex: 0 0 auto; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--a-surface2); font-size: 1.2rem; }

  .detail { display: grid; gap: 14px; min-width: 0; }
  .d-head { display: flex; align-items: center; gap: 12px; }
  .d-title { flex: 1; min-width: 0; display: grid; }
  .d-title b { overflow: hidden; font-family: var(--a-display); font-size: 1.4rem; text-overflow: ellipsis; white-space: nowrap; }
  .d-title span { font-size: 0.82rem; }

  .now { display: grid; gap: 10px; background: var(--a-bg); }
  .now-row { display: flex; align-items: baseline; gap: 10px; }
  .big { font-family: var(--a-display); font-size: 2rem; line-height: 1; }
  .big small { font-size: 1.1rem; color: var(--a-dim); }
  .timer { margin-left: auto; font-family: var(--a-display); font-size: 1.4rem; color: var(--a-cyan); font-variant-numeric: tabular-nums; }
  .tick { background: var(--a-cyan); transition: width 1.9s linear; }
  .track { display: grid; gap: 2px; font-size: 0.9rem; }
  .track span { font-size: 0.78rem; }

  .block { display: grid; gap: 8px; }
  .block .a-h2 { margin-top: 0; }
  .players { display: grid; gap: 6px; list-style: none; }
  .players li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--a-line); border-radius: 12px; background: var(--a-bg); }
  .rank { width: 22px; font-family: var(--a-display); font-weight: 800; text-align: center; color: var(--a-dim); }
  .rank.gold { color: var(--a-warn); }
  .p-name { flex: 1; min-width: 0; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .found { display: none; gap: 4px; }
  .score { min-width: 36px; font-family: var(--a-display); font-size: 1.2rem; text-align: right; font-variant-numeric: tabular-nums; }
  @media (min-width: 600px) { .found { display: flex; } }

  .send { display: flex; gap: 8px; }
  .send .a-input { flex: 1; min-width: 0; }

  .chat { display: grid; gap: 4px; align-content: start; max-height: 260px; min-height: 80px; overflow-y: auto; padding: 10px 12px; border: 1px solid var(--a-line); border-radius: 12px; background: var(--a-bg); }
  .msg { font-size: 0.86rem; line-height: 1.45; overflow-wrap: anywhere; }
  .msg .ts { margin-right: 6px; font-size: 0.72rem; color: var(--a-dim); font-variant-numeric: tabular-nums; }
  .msg b { margin-right: 6px; }
  .msg.admin b, .msg.admin .txt { color: var(--a-warn); }
</style>
