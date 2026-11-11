<script>
  import { goto } from '$app/navigation';
  import Card from '$lib/components/card/Card.svelte';
  import CardDrop from '$lib/components/card/CardDrop.svelte';
  import { isWork } from '$lib/shared/playlist/work.js';

  // Écran plein de fin de manche : la réponse, la carte éventuelle, qui a trouvé
  let { coverSrc, roundCard, roundInfo, slots, finder, reason, roundsSeen, roundTotal } = $props();
  // Musique de film, série… : l'œuvre est la réponse, la chanson passe dessous
  let work = $derived(slots.extras.find((e) => isWork(e.label)));
</script>

<div class="g-reveal">
  <div class="g-rv-bg" style={coverSrc ? `background-image:url(${coverSrc})` : ''}></div>
  <div class="g-rv-inner">
    {#if roundCard?.mode === 'won'}
      <div class="g-rv-card">
        <Card card={roundCard.card} size="lg" reveal inspectable list={[roundCard.card]} />
      </div>
    {:else}
      <div class="g-rv-sleeve">
        <div class="g-rv-vinyl"></div>
        {#if coverSrc}
          <img class="g-rv-cover" src={coverSrc} alt="Pochette">
        {:else}
          <div class="g-rv-cover-fb">&#x266A;</div>
        {/if}
      </div>
    {/if}
    <div class="g-rv-info">
      <div class="g-rv-eyebrow">{roundInfo} — {work ? work.label : 'Réponse'}</div>
      {#if work}
        <h1 class="g-rv-artist" class:missed={work.state === 'missed'}>{work.val}</h1>
        <div class="g-rv-title">{slots.artist.val} — {slots.title.val}</div>
      {:else}
        <h1 class="g-rv-artist" class:missed={slots.artist.state === 'missed'}>{slots.artist.val}</h1>
      {/if}
      {#each slots.feats as fs, i (i)}
        <div class="g-rv-feat">feat. {fs.val}</div>
      {/each}
      {#if !work}
        <div class="g-rv-title" class:missed={slots.title.state === 'missed'}>{slots.title.val}</div>
      {/if}
      {#each slots.extras as es, i (i)}
        {#if es !== work}
          <div class="g-rv-extra">{es.label} : {es.val}</div>
        {/if}
      {/each}
      <div class="g-rv-chips">
        <span class="g-rv-chip" class:none={!finder.includes('1er')}>{finder}</span>
      </div>
      {#if roundCard}
        <div class="g-rv-drop">
          <CardDrop
            card={roundCard.card}
            mode={roundCard.mode}
            delayed={roundCard.delayed}
            winner={roundCard.winner}
            round={roundCard.roundsPresent ?? roundsSeen}
            maxRounds={roundTotal}
            conditions={roundCard.conditions ?? []}
            onsignup={() => goto('/?auth=register&ref=cards')}
          />
        </div>
      {/if}
      <div class="g-rv-next">{reason}</div>
    </div>
  </div>
</div>
