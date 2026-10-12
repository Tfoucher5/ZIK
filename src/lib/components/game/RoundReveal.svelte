<script>
  import { goto } from '$app/navigation';
  import Card from '$lib/components/card/Card.svelte';
  import CardDrop from '$lib/components/card/CardDrop.svelte';

  // Écran plein de fin de manche : la réponse, la carte éventuelle, qui a trouvé
  let { coverSrc, roundCard, roundInfo, slots, finder, reason, roundsSeen, roundTotal } = $props();
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
      <div class="g-rv-eyebrow">{roundInfo} — Réponse</div>
      <h1 class="g-rv-artist" class:missed={slots.artist.state === 'missed'}>{slots.artist.val}</h1>
      {#each slots.feats as fs, i (i)}
        <div class="g-rv-feat">feat. {fs.val}</div>
      {/each}
      <div class="g-rv-title" class:missed={slots.title.state === 'missed'}>{slots.title.val}</div>
      {#each slots.extras as es, i (i)}
        <div class="g-rv-extra">{es.label} : {es.val}</div>
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
