<script>
  import CardTray from '$lib/components/card/CardTray.svelte';

  // Classement de la room, avec le menu ⋯ de chaque joueur
  let { players, username, isGuest, canAddFriends, cardsInPlay, roundsSeen, roundTotal, cardsOff, onAddFriend, onReport } = $props();

  let openMenuFor = $state(null);
  const maxScore = $derived(Math.max(1, ...players.map(p => p.score)));
</script>

<aside class="g-sidebar g-sidebar-scores">
  <div class="g-sidebar-title">Classement <span class="n">{players.length} joueur{players.length > 1 ? 's' : ''}</span></div>
  <div class="g-player-list" id="player-list">
    {#each players as p, i (p.name)}
      <div class="g-strip rank-{i+1}" class:me={p.name === username}>
        <div class="g-strip-top">
          <span class="g-strip-rank">{String(i + 1).padStart(2, '0')}</span>
          <span class="g-strip-name">
            <a href="/user/{p.name}" class="g-player-link" onclick={e => e.stopPropagation()}>{p.name}</a>
            <span class="g-badges">
              <span class="g-badge {p.foundArtist ? 'found' : ''}" title={p.foundArtist ? 'Artiste trouvé' : 'Artiste pas encore trouvé'}>A</span>
              <span class="g-badge {p.foundTitle ? 'found' : ''}" title={p.foundTitle ? 'Titre trouvé' : 'Titre pas encore trouvé'}>T</span>
              {#if p.foundFeats?.some(Boolean)}<span class="g-badge found">F</span>{/if}
            </span>
          </span>
          <span class="g-strip-score {p.scored ? 'flash' : ''}">{p.score}<small>pt</small></span>
          {#if p.name !== username}
            <div class="g-player-menu">
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
              <span class="g-menu-dot" role="button" tabindex="0" onclick={e => { e.stopPropagation(); openMenuFor = openMenuFor === p.name ? null : p.name; }}>⋯</span>
              {#if openMenuFor === p.name}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="g-dropdown" role="menu" tabindex="-1" onclick={e => e.stopPropagation()}>
                  {#if canAddFriends && p.userId && !p.isGuest}
                    <button class="g-dd-item" onclick={() => { openMenuFor = null; onAddFriend(p); }}>👋 Ajouter en ami</button>
                  {/if}
                  <button class="g-dd-item" onclick={() => { openMenuFor = null; onReport(p); }}>🚨 Signaler ce joueur</button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        <div class="g-strip-vu"><div class="g-strip-vu-fill" style="width:{(p.score / maxScore) * 100}%"></div></div>
      </div>
    {/each}
  </div>
  {#if !isGuest}
    <div class="g-cards-tray">
      <CardTray entries={cardsInPlay} round={roundsSeen} maxRounds={roundTotal} off={cardsOff} />
    </div>
  {/if}
</aside>

<!-- Fermeture du menu au clic extérieur -->
{#if openMenuFor}
  <div aria-hidden="true" style="position:fixed;inset:0;z-index:98" onclick={() => { openMenuFor = null; }}></div>
{/if}
