<script>
  /**
   * Châssis commun à toutes les sections du profil : en-tête numéroté et
   * révélation au défilement.
   *
   * L'encadrement lui-même (.case) n'est pas ici : certaines sections en
   * portent deux côte à côte. Il est déclaré par ProfileView en `:global`
   * restreint à `.pv`, pour rester disponible dans les composants enfants —
   * le CSS scopé de Svelte ne traversant pas les frontières de composant.
   *
   * @type {{ id: string, num: string, titre: string, sub?: string, children: import('svelte').Snippet }}
   */
  let { id, num, titre, sub = '', children } = $props();

  function reveal(node) {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) { node.classList.add('in'); io.unobserve(node); }
      }),
      { threshold: 0.14, rootMargin: '0px 0px -60px 0px' },
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }
</script>

<section class="prog-block" id="pv-{id}" use:reveal>
  <div class="block-head">
    <span class="block-num">{num}</span>
    <h2>{titre}</h2>
    {#if sub}<span class="sub">{sub}</span>{/if}
  </div>
  {@render children()}
</section>

<style>
  .prog-block { opacity: 0; transform: translateY(18px); transition: opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1); }
  .prog-block:global(.in) { opacity: 1; transform: translateY(0); }

  .block-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
  .block-num { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.1rem; color: var(--accent); letter-spacing: 0.05em; }
  .block-head h2 { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.9rem; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; }
  .block-head .sub { font-family: "JetBrains Mono", monospace; font-size: 0.64rem; color: var(--dim); text-transform: uppercase; letter-spacing: 0.06em; margin-left: auto; }

  @media (prefers-reduced-motion: reduce) {
    .prog-block { transition: none; opacity: 1; transform: none; }
  }

  @media (max-width: 640px) {
    .block-head { flex-wrap: wrap; }
    .block-head .sub { margin-left: 0; }
  }
</style>
