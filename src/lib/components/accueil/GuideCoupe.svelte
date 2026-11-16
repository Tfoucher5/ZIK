<!-- Texte de fond : l'immeuble en coupe, deux paliers, chacun son repère d'étage, une vignette du film et ses liens en bandeau TV -->
<script>
  import { UNIVERS } from '$lib/components/accueil/guide.js';
</script>

<section class="guide" aria-labelledby="t-guide">
  <div class="acc-wrap">
    <div class="acc-head rv">
      <span class="label"><i></i>ZIK en deux mots</span>
      <h2 id="t-guide" class="acc-h2 grad">Le blind test musical, gratuit et sans appli</h2>
    </div>
    <p class="intro rv">
      ZIK est un blind test musical qui se joue dans le navigateur, sur ordinateur, tablette ou téléphone.
      <b>Un extrait tombe, il faut trouver le titre et l'artiste avant les autres</b>&nbsp;: plus la réponse est rapide,
      plus elle rapporte de points.
    </p>

    {#each UNIVERS as u (u.titre)}
      <article class="palier rv">
        <div class="rep" aria-hidden="true"><span>{u.rep[0]}</span><b>{u.rep[1]}</b></div>
        <figure class="mini">
          <img src={u.img[0]} alt="" loading="lazy" decoding="async" width={u.img[1]} height={u.img[2]} />
        </figure>
        <div class="txt">
          <h3>{u.titre}</h3>
          <p>{u.texte}</p>
        </div>
        <ul class="bande">
          {#each u.liens as [href, txt] (href)}<li><a {href}>{txt}</a></li>{/each}
        </ul>
        <ul class="bande themes">
          <li class="t" aria-hidden="true">{u.themes[0]}</li>
          {#each u.themes[1] as [href, txt] (txt)}<li>{#if href}<a {href}>{txt}</a>{:else}<span>{txt}</span>{/if}</li>{/each}
        </ul>
      </article>
    {/each}
  </div>
</section>

<style>
  .intro {
    max-width: 30em;
    font-size: clamp(1.25rem, 5.2vw, 1.9rem);
    line-height: 1.3;
    font-weight: 500;
    color: var(--muted);
  }
  .intro b {
    font-weight: 600;
    color: var(--text);
  }
  .palier {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    margin-top: 44px;
    padding-top: 18px;
    border-top: 1px solid var(--line-2);
  }
  .rep {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .rep span {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .rep b {
    font-family: var(--titre);
    font-weight: 900;
    font-size: clamp(3.4rem, 17vw, 6.4rem);
    line-height: 0.8;
    color: transparent;
    -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.55);
    font-variant-numeric: tabular-nums;
  }
  .mini {
    position: relative;
    margin: 0;
    aspect-ratio: 16 / 8;
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: #0b0807;
  }
  .mini img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .palier:first-of-type .mini img {
    object-position: 50% 47%;
  }
  .mini::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 55%, rgba(5, 5, 7, 0.55));
  }
  h3 {
    margin-bottom: 12px;
    font-weight: 900;
    font-size: clamp(2rem, 8.6vw, 3rem);
  }
  .txt p {
    max-width: 38em;
    font-size: 16px;
    color: var(--soft);
  }
  .bande {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    border-top: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .bande li {
    display: flex;
    flex: 1 1 auto;
    border-bottom: 1px solid var(--line);
    border-right: 1px solid var(--line);
  }
  .bande :is(a, span) {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 46px;
    padding: 0 14px;
    color: var(--text);
    text-decoration: none;
    transition:
      background 0.25s,
      color 0.25s;
  }
  .bande span {
    color: var(--muted);
  }
  .bande a:is(:hover, :focus-visible) {
    background: var(--text);
    color: #000;
    outline-offset: -2px;
  }
  .themes {
    margin-top: -1px;
    border-top: 0;
  }
  .themes a {
    color: var(--muted);
  }
  .bande .t {
    flex: 0 0 auto;
    align-items: center;
    min-height: 46px;
    padding: 0 14px;
    color: var(--accent-tint);
    background: var(--accent-soft);
  }
  @media (min-width: 900px) {
    .intro {
      margin-bottom: 10px;
    }
    .palier {
      grid-template-columns: 170px 300px minmax(0, 1fr);
      column-gap: 40px;
      row-gap: 22px;
      align-items: start;
      margin-top: 64px;
      padding-top: 26px;
    }
    .rep {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }
    .rep b {
      font-size: 5.6rem;
    }
    .mini {
      aspect-ratio: 4 / 3;
    }
    .bande {
      grid-column: 2 / -1;
    }
    .bande li {
      flex: 0 1 auto;
    }
  }
</style>
