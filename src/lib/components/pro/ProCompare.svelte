<script>
  import { COMPARE } from './proContent.js';
</script>

<section id="comparatif" class="calm" aria-labelledby="pro-cmp">
  <div class="wrap in">
    <div class="head rv">
      <span class="label"><i></i>Comparatif</span>
      <h2 class="grad" id="pro-cmp">Gratuit ou ZIK Pro</h2>
      <p>Le gratuit suffit pour une soirée entre amis. ZIK Pro, c'est pour une salle pleine et un vrai animateur.</p>
    </div>
    <table>
      <thead><tr><th scope="col">Fonction</th><th scope="col">Gratuit</th><th scope="col" class="p">ZIK Pro</th></tr></thead>
      <tbody>
        {#each COMPARE as r (r.k)}
          <tr>
            <th scope="row">{r.k}</th>
            <td data-l="Gratuit">
              {#if r.free === null}<span class="n">Non</span>
              {:else}<span>{#if r.freeOk}<span class="y" aria-hidden="true">✓</span>{/if}{r.free}</span>{/if}
            </td>
            <td class="p">
              <span>{#if !r.proNoCheck}<span class="y" aria-hidden="true">✓</span>{/if}{r.pro}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  section.calm {
    padding-top: 24px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }
  thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  tbody tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px 12px;
    padding: 16px 0;
    border-bottom: 1px solid var(--line);
  }
  th[scope='row'] {
    grid-column: 1 / -1;
    text-align: left;
    font-family: var(--titre);
    font-weight: 700;
    font-size: 19px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  td {
    display: grid;
    gap: 2px;
    align-content: start;
    color: #c9cad8;
    line-height: 1.4;
  }
  td::before {
    content: attr(data-l);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
  td.p {
    color: var(--text);
  }
  td.p::before {
    content: 'ZIK Pro';
    color: var(--accent-tint);
  }
  .y {
    margin-right: 4px;
    color: var(--ok);
    font-weight: 700;
  }
  .n {
    color: var(--muted);
  }
  @media (min-width: 900px) {
    .in {
      display: grid;
      grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
      gap: 64px;
      align-items: start;
    }
    thead {
      position: static;
      width: auto;
      height: auto;
      clip-path: none;
    }
    thead tr,
    tbody tr {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.25fr);
      gap: 20px;
    }
    thead th {
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line-2);
      text-align: left;
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }
    thead th.p {
      color: var(--accent-tint);
    }
    th[scope='row'] {
      grid-column: auto;
      font-size: 20px;
    }
    td::before {
      display: none;
    }
  }
</style>
