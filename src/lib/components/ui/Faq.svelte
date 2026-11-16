<script>
  /** @type {{ items: { q: string, a: string }[] }} */
  let { items } = $props();
</script>

<div class="faq">
  {#each items as it (it.q)}
    <details>
      <summary>{it.q}</summary>
      <p>{it.a}</p>
    </details>
  {/each}
</div>

<style>
  .faq {
    interpolate-size: allow-keywords;
  }
  details {
    border-bottom: 1px solid var(--line);
  }
  details:first-of-type {
    border-top: 1px solid var(--line);
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 64px;
    padding: 10px 0;
    cursor: pointer;
    list-style: none;
    font-family: var(--titre);
    font-weight: 700;
    font-size: 21px;
    line-height: 1.05;
    text-transform: uppercase;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: '+';
    flex: none;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--line-2);
    font-family: var(--corps);
    font-weight: 400;
    font-size: 20px;
    transition:
      transform 0.35s var(--out),
      background 0.25s,
      color 0.25s;
  }
  details[open] summary::after {
    transform: rotate(45deg);
    background: #fff;
    color: #000;
  }
  p {
    margin: 0;
    padding: 0 0 20px;
    max-width: 46em;
    color: var(--muted);
  }
  details::details-content {
    block-size: 0;
    overflow: clip;
    transition:
      block-size 0.45s var(--out),
      content-visibility 0.45s allow-discrete;
  }
  details[open]::details-content {
    block-size: auto;
  }
</style>
