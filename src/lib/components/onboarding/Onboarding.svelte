<script>
  import { getContext, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { onboarding } from './onboarding.svelte.js';
  import { Tour } from './tour.svelte.js';
  import Spotlight from './Spotlight.svelte';
  import GuideCursor from './GuideCursor.svelte';
  import TourCard from './TourCard.svelte';
  import Confetti from './Confetti.svelte';

  const PAD = 8;
  const M = 12;
  const GAP = 18;

  const ctx = getContext('zik');
  const tour = new Tour();

  let rect = $state(null);
  let vw = $state(typeof window === 'undefined' ? 0 : innerWidth);
  let vh = $state(typeof window === 'undefined' ? 0 : innerHeight);
  let cw = $state(0);
  let ch = $state(0);
  let press = $state(false);
  let cursor = $state({ x: 0, y: 0 });

  function padded(r) {
    const top = Math.max(2, r.top - PAD);
    const left = Math.max(2, r.left - PAD);
    return {
      top,
      left,
      width: Math.min(innerWidth - 2, r.right + PAD) - left,
      height: Math.min(innerHeight - 2, r.bottom + PAD) - top,
    };
  }

  function same(a, b) {
    return a === b || (a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);
  }

  $effect(() => {
    if (!onboarding.open) return;
    untrack(() => {
      cursor = { x: innerWidth / 2, y: innerHeight / 2 };
      tour.go(0);
    });

    let raf;
    const loop = () => {
      vw = innerWidth;
      vh = innerHeight;
      const el = tour.el;
      if (el && !el.isConnected && !tour.busy) tour.go(tour.i);
      const next = el?.isConnected ? padded(el.getBoundingClientRect()) : null;
      // Pendant une navigation, on garde l'ancien cadre plutôt que de faire clignoter l'écran.
      if (!same(next, rect) && (next || !tour.busy)) rect = next;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e) => {
      if (tour.clickable && tour.el?.contains(e.target)) tour.onTargetClick();
    };
    document.addEventListener('click', onClick, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', onClick, true);
      tour.stop();
      rect = null;
    };
  });

  $effect(() => {
    if (!rect) return;
    cursor = {
      x: rect.left + rect.width / 2,
      y: Math.min(rect.top + rect.height * 0.6, vh - 30),
    };
  });

  const pos = $derived.by(() => {
    if (!rect || !cw) return { top: Math.max(M, (vh - ch) / 2), left: (vw - cw) / 2 };
    let top;
    if (rect.top + rect.height + GAP + ch < vh - M) top = rect.top + rect.height + GAP;
    else if (rect.top - GAP - ch > M) top = rect.top - GAP - ch;
    else top = vh - ch - M;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - cw / 2, M), vw - cw - M);
    return { top: Math.max(M, top), left };
  });

  const tapping = $derived(
    (tour.step.mode === 'nav' || tour.step.mode === 'click') && tour.clickable && !tour.clicked,
  );

  async function show() {
    press = true;
    await new Promise((r) => setTimeout(r, 380));
    press = false;
    tour.el?.click();
  }

  function cta(href) {
    onboarding.finish();
    goto(href);
  }

  function signup() {
    onboarding.finish();
    ctx.openAuthModal('register');
  }

  function onKey(e) {
    if (!onboarding.open) return;
    if (e.key === 'Escape') return onboarding.finish();
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowLeft' && !tour.busy) tour.prev();
    else if (e.key === 'ArrowRight' && !tour.busy && !tapping && !tour.step.final) tour.next();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if onboarding.open}
  <Spotlight {rect} clickable={tour.clickable} />
  <GuideCursor x={cursor.x} y={cursor.y} show={!!rect} tap={tapping} {press} />
  <TourCard
    {tour}
    guest={!ctx.user}
    top={pos.top}
    left={pos.left}
    bind:w={cw}
    bind:h={ch}
    onShow={show}
    onQuit={onboarding.finish}
    onCta={cta}
    onSignup={signup}
  />
  {#if tour.step.final}<Confetti />{/if}
{/if}
