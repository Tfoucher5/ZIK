<script>
  import { enhance } from '$app/forms';
  import ConfirmSubmit from './ConfirmSubmit.svelte';

  /** Joueurs du salon, avec le retrait pour la soirée. */
  let { s, busy, submit } = $props();
</script>

<section class="a-card block">
  <h3>Joueurs ({s.players})</h3>
  <ul class="a-list">
    {#each s.roster as p (p.username)}
      <li class="a-row">
        <span class="a-row-main">
          <span class="a-row-title">{p.username}</span>
          <span class="a-row-sub">{p.score} pts{p.team != null && s.settings.teams[p.team] ? ` · ${s.settings.teams[p.team]}` : ''}</span>
        </span>
        {#if p.offline}<em class="a-tag warn">Parti</em>{/if}
        <form method="POST" action="?/kick" use:enhance={submit} class="inline">
          <input type="hidden" name="code" value={s.code} />
          <input type="hidden" name="username" value={p.username} />
          <ConfirmSubmit label="Retirer" danger {busy} />
        </form>
      </li>
    {:else}
      <li class="a-empty">Personne pour l'instant.</li>
    {/each}
  </ul>
  <p class="a-muted hint">Un joueur retiré ne peut plus revenir de la soirée, ni avec ce pseudo ni avec ce téléphone.</p>
</section>

<style>
  .block { display: grid; gap: 10px; min-width: 0; }
  h3 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .a-row { flex-wrap: wrap; }
  .inline { display: contents; }
  .hint { font-size: 0.82rem; }
</style>
