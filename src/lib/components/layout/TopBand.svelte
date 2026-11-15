<!-- En-tête des pages refaites : le bandeau de la TV ZIK (logo · rubriques · CODE ▢▢▢▢▢▢) -->
<script>
  import { page } from '$app/state';
  import AccountMenu from '$lib/components/layout/AccountMenu.svelte';
  import CodeDialog from '$lib/components/layout/CodeDialog.svelte';
  import SoundButton from '$lib/components/layout/SoundButton.svelte';
  import { band } from '$lib/components/layout/topBand.svelte.js';

  const LIENS = [
    ['/soiree', 'ZIK Soirée'],
    ['/jouer', 'Jouer en ligne'],
    ['/zikle', 'Zikle'],
    ['/pro', 'ZIK Pro'],
  ];

  let codeOpen = $state(false);
  let rub;
  const courant = (href) => (page.url.pathname === href ? 'page' : undefined);
</script>

<header class="top">
  <div class="in">
    <a class="logo" href="/" aria-label="ZIK, accueil">ZIK<i aria-hidden="true"></i></a>
    <nav class="liens" aria-label="Navigation principale">
      {#each LIENS as [href, txt] (href)}<a {href} aria-current={courant(href)}>{txt}</a>{/each}
    </nav>
    <button class="slot" type="button" aria-label="J'ai un code : saisir les 6 caractères" onclick={() => (codeOpen = true)}>
      <span aria-hidden="true">Code</span>{#each [0, 1, 2, 3, 4, 5] as i (i)}<i></i>{/each}
    </button>
    {#if band.son}<SoundButton son={band.son} />{/if}
    <AccountMenu />
    <button class="burger" type="button" popovertarget="tb-rub" aria-label="Rubriques">
      <span aria-hidden="true"></span>
    </button>
  </div>
  <div class="barre" aria-hidden="true"><i></i></div>
</header>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<nav id="tb-rub" class="rub" popover aria-label="Rubriques" bind:this={rub} onclick={(e) => e.target.closest('a') && rub.hidePopover()}>
  {#each LIENS as [href, txt] (href)}<a {href} aria-current={courant(href)}>{txt}</a>{/each}
</nav>

<CodeDialog bind:open={codeOpen} />

<style>
  .top {
    position: fixed;
    z-index: 30;
    inset: 0 0 auto 0;
    padding-top: env(safe-area-inset-top, 0px);
    background: linear-gradient(180deg, rgba(5, 5, 7, 0.94), rgba(5, 5, 7, 0.7));
    -webkit-backdrop-filter: blur(14px) saturate(1.4);
    backdrop-filter: blur(14px) saturate(1.4);
    font-family: var(--corps);
    color: var(--text);
  }
  .in {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 56px;
    max-width: 1240px;
    margin: 0 auto;
    padding-inline: max(14px, env(safe-area-inset-left, 0px));
  }
  .logo {
    display: inline-flex;
    align-items: baseline;
    margin-right: auto;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 30px;
    line-height: 1;
    color: var(--text);
    text-decoration: none;
  }
  .logo i {
    width: 7px;
    height: 7px;
    margin-left: 3px;
    border-radius: 50%;
    background: var(--accent);
  }
  .liens {
    display: none;
    align-self: stretch;
    margin-right: auto;
  }
  .liens a,
  .rub a {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 0 16px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    text-decoration: none;
    transition: color 0.25s;
  }
  .liens a {
    border-left: 1px solid var(--line);
  }
  .liens a:last-child {
    border-right: 1px solid var(--line);
  }
  .liens a::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 0;
    height: 2px;
    background: var(--text);
    transform: scaleX(0);
    transform-origin: 0 50%;
    transition: transform 0.3s var(--out);
  }
  .liens a:hover,
  .liens a[aria-current],
  .rub a[aria-current] {
    color: var(--text);
  }
  .liens a:hover::after,
  .liens a[aria-current]::after {
    transform: none;
  }
  .slot,
  .burger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    min-width: 40px;
    padding: 0 8px;
    border-radius: 10px;
    border: 1px solid var(--line-2);
    background: rgba(255, 255, 255, 0.04);
    color: var(--muted);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      border-color 0.25s,
      background 0.25s;
  }
  .slot {
    gap: 2px;
    padding: 0 7px;
    color: var(--text);
    font-weight: 700;
  }
  .slot span {
    margin-right: 4px;
  }
  .slot i {
    flex: none;
    width: 8px;
    height: 18px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.07);
    border-bottom: 2px solid rgba(255, 255, 255, 0.4);
  }
  .slot i:first-of-type {
    border-bottom-color: var(--accent);
    animation: clign 1.1s steps(2) infinite;
  }
  @keyframes clign {
    50% {
      opacity: 0.25;
    }
  }
  .slot:hover,
  .burger:hover {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
  .burger span,
  .burger span::before,
  .burger span::after {
    display: block;
    width: 16px;
    height: 2px;
    border-radius: 1px;
    background: var(--text);
  }
  .burger span {
    position: relative;
  }
  .burger span::before,
  .burger span::after {
    content: '';
    position: absolute;
  }
  .burger span::before {
    top: -5px;
  }
  .burger span::after {
    top: 5px;
  }
  .rub {
    position: fixed;
    inset: calc(62px + env(safe-area-inset-top, 0px)) var(--gut) auto auto;
    margin: 0;
    min-width: 220px;
    padding: 8px;
    border: 1px solid var(--line-2);
    border-radius: 14px;
    background: var(--surface);
    box-shadow: 0 40px 90px -30px #000;
  }
  .rub a {
    display: flex;
    min-height: 44px;
    border-radius: 8px;
  }
  .rub a:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .barre {
    height: 2px;
    background: var(--line);
  }
  .barre i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--violet), var(--accent));
    transform-origin: 0 50%;
    transform: scaleX(0);
  }
  @supports (animation-timeline: scroll()) {
    @media (prefers-reduced-motion: no-preference) {
      :global(html:not(.rm)) .barre i {
        animation: prog linear both;
        animation-timeline: scroll(root);
      }
    }
  }
  @keyframes prog {
    to {
      transform: scaleX(1);
    }
  }
  @media (min-width: 900px) {
    .in {
      gap: 12px;
      padding-inline: 20px;
    }
    .logo {
      margin-right: 22px;
    }
    .liens {
      display: flex;
    }
    .slot {
      gap: 4px;
      padding: 0 10px;
    }
    .slot i {
      width: 13px;
      height: 20px;
    }
    .burger {
      display: none;
    }
  }
</style>
