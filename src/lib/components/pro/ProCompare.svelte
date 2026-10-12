<script>
  import { COMPARE } from './proContent.js';
</script>

<table class="pro-compare">
  <thead><tr><th></th><th>Gratuit</th><th>ZIK Pro</th></tr></thead>
  <tbody>
    {#each COMPARE as [label, free, pro] (label)}
      <tr><th scope="row">{label}</th><td>{free}</td><td>{pro}</td></tr>
    {/each}
  </tbody>
</table>

<style>
  .pro-compare {
    width: 100%;
    margin: 18px 0 24px;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .pro-compare th,
  .pro-compare td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .pro-compare thead th {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .pro-compare thead th:last-child,
  .pro-compare td:last-child {
    color: var(--accent);
  }
  .pro-compare tbody th {
    font-weight: 600;
  }
  .pro-compare td {
    color: var(--mid);
  }
</style>
