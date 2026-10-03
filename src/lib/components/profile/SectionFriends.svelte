<script>
  import { dicebear } from '$lib/utils.js';

  /**
   * Liste d'amis, avec la présence en direct et les demandes reçues.
   * Les actions remontent au parent, qui porte la session et le réseau.
   *
   * @type {{
   *   social: { friends: any[], friendsCount: number, pendingRequests: any[], pendingCount: number },
   *   presenceMap: Record<string, { online?: boolean, room?: any }>,
   *   isOwn: boolean,
   *   friendBusy: boolean,
   *   onFriendAction: (action: string, targetId: string) => void,
   *   onJoinRoom: (room: any) => void,
   *   onInvite: (ami: any) => void,
   * }}
   */
  let { social, presenceMap, isOwn, friendBusy, onFriendAction, onJoinRoom, onInvite } = $props();
</script>

{#if isOwn && social.pendingRequests.length}
  <div class="tape" style="margin-bottom:12px">Demandes reçues · {social.pendingCount}</div>
  <div class="case gl" style="margin-bottom:18px">
    {#each social.pendingRequests as p (p.id)}
      <div class="gl-row">
        <a class="gl-av" href="/user/{p.username}"><img src={p.avatar_url || dicebear(p.username)} alt="" width="34" height="34" loading="lazy" decoding="async"></a>
        <a class="gl-id" href="/user/{p.username}"><div class="gl-name">{p.username}</div><div class="gl-sub">Niveau {p.level ?? 1}</div></a>
        <span class="req-actions">
          <button class="btn-req accept" onclick={() => onFriendAction('accept', p.id)} disabled={friendBusy}>Accepter</button>
          <button class="btn-req" onclick={() => onFriendAction('remove', p.id)} disabled={friendBusy}>Refuser</button>
        </span>
      </div>
    {/each}
  </div>
{/if}

<div class="case gl">
  {#if social.friends.length}
    {#each social.friends as f (f.id)}
      {@const pr = presenceMap[f.id]}
      <div class="gl-row">
        <a class="gl-av" href="/user/{f.username}" class:gl-online={pr?.online}>
          <img src={f.avatar_url || dicebear(f.username)} alt="" width="34" height="34" loading="lazy" decoding="async">
        </a>
        <a class="gl-id" href="/user/{f.username}">
          <div class="gl-name">{f.username}</div>
          <div class="gl-sub" class:gl-sub-live={pr?.online}>
            {#if pr?.room}En room · {pr.room.roomName}{:else if pr?.online}En ligne{:else}Niveau {f.level ?? 1}{/if}
          </div>
        </a>
        <span class="gl-elo">{f.elo ?? '—'} ELO</span>
        {#if isOwn}
          <span class="req-actions">
            {#if pr?.room}
              <button class="btn-req accept" onclick={() => onJoinRoom(pr.room)}>Rejoindre</button>
            {:else}
              <button class="btn-req" onclick={() => onInvite(f)}>Inviter</button>
            {/if}
          </span>
        {/if}
      </div>
    {/each}
  {:else}
    <p class="pv-empty" style="padding:20px">
      {#if isOwn}Tu n'as pas encore d'amis. Depuis le profil d'un joueur, clique sur «&nbsp;Ajouter en ami&nbsp;»&nbsp;: dès qu'il accepte, il apparaît ici.{:else}Aucun ami pour le moment.{/if}
    </p>
  {/if}
</div>

<style>
  .gl { padding: 6px 0; }
  .gl-row { display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid var(--border); transition: background 0.15s, transform 0.15s; text-decoration: none; color: var(--text); }
  .gl-row:last-child { border-bottom: none; }
  .gl-row:hover { background: rgb(var(--c-glass) / 0.02); transform: translateX(3px); }
  .gl-av { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; overflow: hidden; border: 1px solid rgb(var(--accent-rgb) / 0.4); background: var(--surface); display: block; position: relative; }
  .gl-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gl-av.gl-online { overflow: visible; }
  .gl-av.gl-online img { border-radius: 50%; }
  .gl-av.gl-online::after {
    content: ''; position: absolute; right: -2px; bottom: -2px; width: 10px; height: 10px;
    border-radius: 50%; background: var(--success); border: 2px solid var(--bg2);
    box-shadow: 0 0 8px rgb(74 222 128 / 0.55);
  }
  .gl-sub-live { color: var(--success) !important; }
  .gl-id { flex: 1; min-width: 0; }
  .gl-name { font-weight: 600; font-size: 0.88rem; }
  .gl-sub { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-top: 1px; }
  .gl-elo { font-family: "JetBrains Mono", monospace; font-size: 0.72rem; color: var(--mid); flex-shrink: 0; }
  .gl-row > a { text-decoration: none; color: inherit; }
  .req-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .btn-req { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 12px; border-radius: 99px; cursor: pointer; border: 1.5px solid var(--border2); background: none; color: var(--mid); transition: all 0.15s; }
  .btn-req:hover { color: var(--text); border-color: rgb(var(--c-glass) / 0.4); }
  .btn-req.accept { border-color: var(--accent); color: var(--accent); background: rgb(var(--accent-rgb) / 0.08); }
  .btn-req:disabled { opacity: 0.55; cursor: default; }
</style>
