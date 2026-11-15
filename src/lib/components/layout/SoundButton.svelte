<!-- Le son de la page : un égaliseur, à plat quand c'est coupé -->
<script>
  /** @type {{ son: { on: boolean, toggle: () => void } }} */
  let { son } = $props();
</script>

<button class="son" type="button" aria-pressed={son.on} aria-label="Son de la page" onclick={son.toggle}>
  <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  <span class="t">{son.on ? 'Son activé' : 'Son coupé'}</span>
</button>

<style>
  .son {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    height: 40px;
    min-width: 40px;
    padding: 0 8px;
    border-radius: 10px;
    border: 1px solid var(--line-2);
    background: none;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .son:hover,
  .son[aria-pressed='true'] {
    color: var(--text);
    border-color: rgba(255, 255, 255, 0.5);
  }
  .eq {
    display: inline-flex;
    align-items: flex-end;
    gap: 3px;
    height: 16px;
  }
  .eq i {
    width: 3px;
    height: 16px;
    border-radius: 1px;
    background: currentColor;
    transform-origin: 50% 100%;
    transform: scaleY(0.18);
  }
  [aria-pressed='true'] .eq i {
    animation: eq 0.5085s ease-in-out infinite alternate;
  }
  .eq i:nth-child(2) {
    animation-delay: -0.2s !important;
  }
  .eq i:nth-child(3) {
    animation-delay: -0.35s !important;
  }
  .eq i:nth-child(4) {
    animation-delay: -0.1s !important;
  }
  @keyframes eq {
    from {
      transform: scaleY(0.25);
    }
    to {
      transform: scaleY(1);
    }
  }
  .t {
    display: none;
  }
  @media (min-width: 900px) {
    .son {
      padding: 0 10px;
    }
    .t {
      display: inline;
    }
  }
</style>
