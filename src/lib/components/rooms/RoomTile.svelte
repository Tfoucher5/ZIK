<script>
  import RoomCovers from './RoomCovers.svelte';
  import { ago } from '$lib/admin/stats-utils.js';
  import { toast } from '$lib/toast.svelte.js';

  let { room: r, covers, seed = 0, owner = false, onJoin, onEdit = null, onDelete = null } = $props();

  const live = $derived(r.online > 0);
  const playlistNames = $derived((r.playlists || []).filter(Boolean).map((p) => p.name).join(' · '));

  function copyLink() {
    navigator.clipboard.writeText(`${location.origin}/game?roomId=${r.code}`)
      .then(() => toast('Lien de la room copié !', 'success'))
      .catch(() => toast('Copie impossible', 'error'));
  }
</script>

<article class="rt" class:live>
  <button class="rt-cover" onclick={onJoin} aria-label="Jouer dans {r.name}" tabindex="-1">
    <RoomCovers {covers} {seed} emoji={r.emoji} />
    {#if live}<span class="rt-live"><span class="rt-dot"></span>{r.online} en jeu</span>{/if}
  </button>

  <div class="rt-body">
    <div class="rt-badges">
      {#if r.is_official}<span class="rt-b rt-b-off">✓ Officielle</span>{/if}
      <span class="rt-b" class:rt-b-qcm={r.game_mode === 'qcm'}>{r.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
      {#if r.cards}<span class="rt-b rt-b-cards" title="On peut gagner des cartes ici">Cartes</span>{/if}
      {#if r.auto_start}<span class="rt-b" title="La partie démarre dès qu'un joueur arrive">Auto</span>{/if}
      {#if owner && !r.is_public}<span class="rt-b">Privée</span>{/if}
    </div>

    <h3 class="rt-name"><a href="/room/{r.code}" title="Voir la fiche de {r.name}">{r.name}</a></h3>
    {#if !owner && r.profiles?.username}<p class="rt-owner">par {r.profiles.username}</p>{/if}

    <p class="rt-meta">
      {#if r.track_count}<strong>{r.track_count}</strong> titres · {/if}{r.max_rounds} manches · {r.round_duration} s
    </p>
    {#if playlistNames}<p class="rt-pl" title={playlistNames}>{playlistNames}</p>{/if}

    <div class="rt-foot">
      {#if owner}
        <button class="rt-code" onclick={copyLink} title="Copier le lien d'invitation">{r.code} <span aria-hidden="true">⧉</span></button>
      {:else}
        <span class="rt-status">{live ? 'Partie en cours' : r.last_active_at ? `Active ${ago(r.last_active_at)}` : 'Pas encore jouée'}</span>
      {/if}
      <div class="rt-acts">
        {#if onEdit}<button class="rt-ghost rt-edit" onclick={onEdit} aria-label="Modifier {r.name}"><span class="rt-edit-txt">Modifier</span><span class="rt-edit-ico" aria-hidden="true">✎</span></button>{/if}
        {#if onDelete}<button class="rt-ghost rt-del" onclick={onDelete} aria-label="Supprimer {r.name}" title="Supprimer">✕</button>{/if}
        <button class="rt-play" onclick={onJoin}>{live ? 'Rejoindre' : 'Jouer'} →</button>
      </div>
    </div>
  </div>
</article>

<style>
  .rt {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    overflow: hidden;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .rt:hover { border-color: rgb(var(--accent-rgb) / 0.45); transform: translateY(-2px); box-shadow: 0 12px 30px rgb(0 0 0 / 0.25); }
  .rt.live { border-color: rgb(var(--accent-rgb) / 0.55); }
  .rt-cover { position: relative; aspect-ratio: 16 / 9; overflow: hidden; padding: 0; border: none; background: none; cursor: pointer; }
  .rt-live {
    position: absolute;
    top: 10px;
    left: 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 0.7rem;
    font-weight: 800;
  }
  .rt-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: rt-pulse 1.4s infinite; }
  @keyframes rt-pulse { 50% { opacity: 0.3; } }

  .rt-body { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 12px 14px 14px; min-width: 0; }
  .rt-badges { display: flex; flex-wrap: wrap; gap: 5px; }
  .rt-b {
    padding: 2px 8px;
    border: 1px solid var(--border2);
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .rt-b-off { color: var(--accent); border-color: rgb(var(--accent-rgb) / 0.5); }
  .rt-b-qcm { color: var(--success); border-color: color-mix(in srgb, var(--success) 50%, transparent); }
  .rt-b-cards { color: var(--rarity-epic); border-color: color-mix(in srgb, var(--rarity-epic) 50%, transparent); }
  .rt-name {
    margin: 2px 0 0;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.3rem;
    line-height: 1.05;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .rt-name a { color: var(--text); text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .rt-name a:hover { color: var(--accent); }
  .rt-owner { margin: 0; font-size: 0.74rem; color: var(--dim); }
  .rt-meta { margin: 0; font-size: 0.76rem; color: var(--mid); }
  .rt-meta strong { color: var(--accent); }
  .rt-pl { margin: 0; font-size: 0.72rem; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rt-foot { margin-top: auto; padding-top: 8px; display: flex; align-items: center; gap: 8px; }
  .rt-status { flex: 1; min-width: 0; font-size: 0.7rem; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rt.live .rt-status { color: var(--accent); font-weight: 700; }
  .rt-code {
    flex: 1;
    min-width: 0;
    text-align: left;
    padding: 6px 0;
    border: none;
    background: none;
    color: var(--mid);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    cursor: pointer;
  }
  .rt-code:hover { color: var(--accent); }
  .rt-acts { display: flex; gap: 6px; flex-shrink: 0; }
  .rt-play, .rt-ghost {
    min-height: 36px;
    padding: 0 14px;
    border-radius: 9px;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .rt-play { border: none; background: var(--accent); color: var(--on-accent); }
  .rt-play:hover { filter: brightness(1.1); }
  .rt-ghost { border: 1px solid var(--border2); background: none; color: var(--mid); }
  .rt-ghost:hover { color: var(--text); border-color: var(--text); }
  .rt-del { padding: 0 11px; }
  .rt-edit-ico { display: none; }
  .rt-del:hover { color: var(--danger); border-color: var(--danger); }

  /* Mobile : carte horizontale, pochette à gauche */
  @media (max-width: 600px) {
    .rt { flex-direction: row; }
    .rt:hover { transform: none; }
    .rt-cover { aspect-ratio: auto; width: 104px; min-height: 104px; flex-shrink: 0; align-self: stretch; }
    .rt-live { top: 6px; left: 6px; padding: 3px 7px; font-size: 0.62rem; }
    .rt-body { padding: 10px 12px; gap: 4px; }
    .rt-name { font-size: 1.1rem; }
    .rt-pl { display: none; }
    .rt-foot { flex-wrap: wrap; padding-top: 4px; }
    .rt-code { flex: 1 1 100%; padding: 2px 0; }
    .rt-acts { flex: 1 1 100%; }
    .rt-play { flex: 1; padding: 0 10px; }
    .rt-play, .rt-ghost { min-height: 38px; }
    .rt-edit { padding: 0 11px; }
    .rt-edit-txt { display: none; }
    .rt-edit-ico { display: inline; }
  }
</style>
