<script>
  let { head, rows } = $props();
</script>

<table class="doc-table">
  <thead>
    <tr>
      {#each head as h (h)}
        <th>{h}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each rows as row, i (i)}
      <tr>
        {#each row as cell, j (j)}
          <td>{cell}</td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    font-size: 0.88rem;
    border-radius: 10px;
    overflow: hidden;
  }

  .doc-table th {
    background: rgb(var(--c-glass) / 0.07);
    color: var(--text, #fff);
    font-weight: 700;
    text-align: left;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
  }

  .doc-table td {
    color: var(--mid, #ccc);
    padding: 10px 14px;
    border-bottom: 1px solid rgb(var(--c-glass) / 0.04);
  }

  .doc-table tr:last-child td {
    border-bottom: none;
  }

  .doc-table tr:hover td {
    background: rgb(var(--c-glass) / 0.02);
  }

  @media (max-width: 768px) {
    .doc-table {
      font-size: 0.8rem;
    }

    .doc-table th,
    .doc-table td {
      padding: 8px 10px;
    }
  }
</style>
