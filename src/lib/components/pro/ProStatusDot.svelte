<span class="pro-status-dot" aria-hidden="true"></span>

<style>
  .pro-status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--ok);
    box-shadow: 0 0 0 0 rgba(61, 220, 132, 0.6);
    animation: pro-ping 2s infinite;
  }
  @keyframes pro-ping {
    70% {
      box-shadow: 0 0 0 10px rgba(61, 220, 132, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(61, 220, 132, 0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pro-status-dot {
      animation: none;
    }
  }
</style>
