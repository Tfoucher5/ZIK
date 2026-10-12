<script>
  // Derniers titres joués : le plus récent en grand, les autres en liste
  let { history } = $props();
</script>

<aside class="g-sidebar g-sidebar-history">
  <div class="g-sidebar-title">Derniers titres <span class="n">{history.length}</span></div>
  <div class="g-history-list" id="history-list">
    {#each history as item, hi (item.answer + item.round)}
      {@const _di = item.answer.indexOf(' - ')}
      {@const _ha = _di > -1 ? item.answer.slice(0, _di) : item.answer}
      {@const _ht = _di > -1 ? item.answer.slice(_di + 3) : '—'}
      {#if hi === 0}
        <div class="g-feat" style={item.cover ? `background-image:url(${item.cover})` : ''}>
          {#if !item.cover}<div class="g-feat-note">&#x266A;</div>{/if}
          <div class="g-feat-grad"></div>
          <div class="g-feat-info">
            <div class="g-feat-num">Manche {item.round} — dernier titre</div>
            <div class="g-feat-art">{_ha}</div>
            {#if item.featArtists?.length}
              {#each item.featArtists as fa, fi (fi)}
                <div class="g-feat-feat" class:found={item.foundFeats?.[fi]}>feat. {fa}</div>
              {/each}
            {/if}
            <div class="g-feat-tit">{_ht}</div>
            <div class="g-feat-badges">
              <span class="g-rb" class:on={item.foundArtist}>ARTISTE {item.foundArtist ? '✓' : '✕'}</span>
              <span class="g-rb" class:on={item.foundTitle}>TITRE {item.foundTitle ? '✓' : '✕'}</span>
            </div>
          </div>
        </div>
      {:else}
        <div class="g-hitem">
          {#if item.cover}
            <img src={item.cover} alt="" class="g-hitem-img" loading="lazy" decoding="async">
          {:else}
            <div class="g-hitem-img g-hitem-noimg">&#x266A;</div>
          {/if}
          <div class="g-hitem-info">
            <div class="g-hitem-artist" class:found={item.foundArtist}>{_ha}</div>
            {#if item.featArtists?.length}
              {#each item.featArtists as fa, fi (fi)}
                <div class="g-hitem-feat" class:found={item.foundFeats?.[fi]}>feat. {fa}</div>
              {/each}
            {/if}
            <div class="g-hitem-title" class:found={item.foundTitle}>{_ht}</div>
          </div>
        </div>
      {/if}
    {/each}
  </div>
</aside>
