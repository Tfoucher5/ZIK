<script>
  import DemoRound from './DemoRound.svelte';
  import SalonDemo from './SalonDemo.svelte';
  import NotifyPrompt from '$lib/components/notify/NotifyPrompt.svelte';

  /** @type {{ tour: import('./tour.svelte.js').Tour, guest: boolean, top: number, left: number, w: number, h: number, onShow: () => void, onQuit: () => void, onCta: (href: string) => void, onSignup: () => void }} */
  let { tour, guest, top, left, w = $bindable(), h = $bindable(), onShow, onQuit, onCta, onSignup } = $props();

  let primaryBtn = $state();
  let settled = $state(false);

  // Pas de glissement depuis le coin de l'écran avant la première mesure.
  $effect(() => {
    if (w && !settled) requestAnimationFrame(() => requestAnimationFrame(() => (settled = true)));
  });

  const s = $derived(tour.step);
  const waitsClick = $derived((s.mode === 'nav' || s.mode === 'click') && tour.clickable && !tour.clicked);

  const primary = $derived.by(() => {
    if (tour.i === 0) return { label: "C'est parti", run: () => tour.next() };
    if (s.final) return { label: 'Terminer', run: onQuit };
    if (waitsClick) return { label: 'Montre-moi', run: onShow };
    if (s.mode === 'nav' && !tour.el) return { label: 'Y aller', run: () => tour.next() };
    return { label: 'Suivant', run: () => tour.next() };
  });

  $effect(() => {
    void tour.i;
    if (!tour.busy) primaryBtn?.focus({ preventScroll: true });
  });
</script>

<div
  class="tc"
  class:settled
  class:hidden={!w}
  role="dialog"
  aria-modal="true"
  aria-labelledby="tc-title"
  style="top:{top}px;left:{left}px"
  bind:offsetWidth={w}
  bind:offsetHeight={h}
>
  <div class="tc-progress" style="--p:{(tour.i + 1) / tour.count}"></div>
  <div class="tc-head">
    <span class="tc-kicker">{s.kicker}</span>
    <span class="tc-count">{tour.i + 1} / {tour.count}</span>
  </div>

  {#key tour.i}
    <div class="tc-body">
      <h2 id="tc-title">{s.title}</h2>
      <p class="tc-text">{s.text}</p>
      {#if s.demo}<DemoRound />{/if}
      {#if s.salon}<SalonDemo phase={s.salon} />{/if}
      {#if s.notify}
        <NotifyPrompt embedded categories={s.notify} title="Activer les notifications" text="Sur cet appareil, même quand ZIK est fermé." />
      {/if}
      {#if tour.clicked && s.success}
        <p class="tc-success">{s.success}</p>
      {:else if s.hint && tour.clickable}
        <p class="tc-hint"><span class="tc-hint-dot"></span>{s.hint}</p>
      {/if}
      {#if s.cta || (s.auth && guest)}
        <div class="tc-links">
          {#each s.cta ?? [] as c (c.href)}<button onclick={() => onCta(c.href)}>{c.label} &rarr;</button>{/each}
          {#if s.auth && guest}<button onclick={onSignup}>Créer un compte &rarr;</button>{/if}
        </div>
      {/if}
    </div>
  {/key}

  <div class="tc-actions">
    {#if !s.final}
      <button class="tc-quit" onclick={onQuit}>{tour.i === 0 ? 'Non merci' : 'Quitter'}</button>
    {/if}
    <div class="tc-nav">
      {#if tour.i > 0 && !s.final}
        <button class="btn-ghost sm" onclick={() => tour.prev()} disabled={tour.busy}>Retour</button>
      {/if}
      <button class="btn-accent sm" bind:this={primaryBtn} onclick={primary.run} disabled={tour.busy}>
        {tour.busy ? '…' : primary.label}
      </button>
    </div>
  </div>
</div>

<style>
  .tc {
    position: fixed;
    z-index: 1002;
    width: min(400px, calc(100vw - 24px));
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    background: var(--modal-bg);
    border: 1px solid var(--border2);
    border-radius: 18px;
    padding: 22px 22px 18px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
    animation: tc-in 0.35s ease;
  }
  .tc.hidden {
    visibility: hidden;
  }
  .tc.settled {
    transition:
      top 0.5s cubic-bezier(0.65, 0, 0.35, 1),
      left 0.5s cubic-bezier(0.65, 0, 0.35, 1);
  }
  .tc-progress {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--border);
  }
  .tc-progress::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    transform-origin: left;
    transform: scaleX(var(--p));
    transition: transform 0.5s ease;
  }

  .tc-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .tc-kicker {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.76rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .tc-count {
    font-size: 0.72rem;
    color: var(--dim);
    font-variant-numeric: tabular-nums;
  }

  .tc-body {
    animation: tc-slide 0.35s ease;
  }
  .tc-body h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.7rem;
    line-height: 1.05;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .tc-text {
    font-size: 0.92rem;
    line-height: 1.5;
    color: var(--mid);
  }

  .tc-hint,
  .tc-success {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.86rem;
    font-weight: 600;
  }
  .tc-hint {
    background: rgb(var(--accent-rgb) / 0.12);
    color: var(--text);
  }
  .tc-hint-dot {
    flex-shrink: 0;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
    animation: tc-ping 1.4s ease-out infinite;
  }
  .tc-success {
    background: rgb(34 197 94 / 0.12);
    color: var(--text);
    font-weight: 500;
    animation: tc-slide 0.3s ease;
  }

  .tc-links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin-top: 12px;
  }
  .tc-links button {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
  }
  .tc-links button:hover {
    text-decoration: underline;
  }

  .tc-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
  }
  .tc-quit {
    background: none;
    border: none;
    padding: 6px 0;
    font: inherit;
    font-size: 0.85rem;
    color: var(--dim);
    cursor: pointer;
  }
  .tc-quit:hover {
    color: var(--text);
  }
  .tc-nav {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  @keyframes tc-in {
    from { opacity: 0; transform: translateY(14px) scale(0.97); }
  }
  @keyframes tc-slide {
    from { opacity: 0; transform: translateX(12px); }
  }
  @keyframes tc-ping {
    0% { box-shadow: 0 0 0 0 rgb(var(--accent-rgb) / 0.7); }
    100% { box-shadow: 0 0 0 10px rgb(var(--accent-rgb) / 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .tc, .tc-body, .tc-success { animation: none; transition: none; }
  }
</style>
