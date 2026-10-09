<script>
  /** Message du support ZIK, envoyé depuis l'admin pendant la soirée. */
  let { message, onClose } = $props();
</script>

<div class="sb" role="status" aria-live="polite">
  <span class="sb-tag">Support ZIK</span>
  <p>{message}</p>
  <button onclick={onClose} aria-label="Fermer le message">×</button>
</div>

<style>
  .sb {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 95;
    display: flex;
    align-items: center;
    gap: 12px;
    width: min(720px, calc(100% - 24px));
    padding: 12px 12px 12px 16px;
    background: var(--accent);
    color: #000;
    border-radius: 3px;
    box-shadow: 0 14px 40px rgb(0 0 0 / 0.4);
    animation: sb-in 0.3s ease-out;
  }
  .sb-tag {
    flex-shrink: 0;
    font-family: var(--s-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
  }
  p {
    flex: 1;
    min-width: 0;
    font-weight: 700;
    font-size: clamp(0.95rem, 2.2vw, 1.25rem);
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  button {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: 2px solid #000;
    border-radius: 3px;
    background: none;
    color: #000;
    font-size: 1.1rem;
    cursor: pointer;
  }
  @keyframes sb-in {
    from {
      opacity: 0;
      transform: translate(-50%, -12px);
    }
  }
  @media (max-width: 520px) {
    .sb {
      flex-wrap: wrap;
      gap: 6px 10px;
    }
    .sb-tag {
      flex: 1;
    }
    p {
      order: 3;
      flex-basis: 100%;
    }
  }
</style>
