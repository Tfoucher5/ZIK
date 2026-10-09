<script>
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/admin/PageHeader.svelte';

  let q = $state('');

  const SECTIONS = [
    {
      title: 'Suivre',
      links: [
        { href: '/admin/journal', name: 'Journal', desc: 'Tout ce qui se passe, au fil du temps' },
        { href: '/admin/chiffres', name: 'Chiffres', desc: 'Objectifs, semaine, Zikle du jour' },
        { href: '/admin/live', name: 'Rooms en direct', desc: 'Parties en ligne, chat, actions' },
        { href: '/admin/errors', name: 'Erreurs serveur', desc: 'Logs des dernières 24 h' },
      ],
    },
    {
      title: 'Gérer',
      links: [
        { href: '/admin/users', name: 'Joueurs', desc: 'Profils, Pro offert, bannissements' },
        { href: '/admin/reports', name: 'Messages', desc: 'Signalements et contacts des joueurs' },
        { href: '/admin/prospection', name: 'Prospection', desc: 'Emails, réponses, clients' },
        { href: '/admin/playlists', name: 'Playlists', desc: 'Playlists et leurs titres' },
        { href: '/admin/tracks', name: 'Titres', desc: 'Catalogue, audio, métadonnées' },
        { href: '/admin/rooms', name: 'Rooms', desc: 'Rooms publiques et officielles' },
        { href: '/admin/zikle', name: 'Zikle', desc: 'Calendrier et pool de titres' },
        { href: '/admin/defi', name: 'Défi de la semaine', desc: 'Objectif collectif, historique, prochain défi' },
        { href: '/admin/achievements', name: 'Succès', desc: 'Badges et déblocages' },
      ],
    },
    {
      title: 'Site',
      links: [
        { href: '/admin/reglages', name: 'Réglages', desc: 'Annonce à tous, vidéos des salons, maintenance' },
      ],
    },
  ];

  function search(e) {
    e.preventDefault();
    goto(`/admin/users?q=${encodeURIComponent(q.trim())}`);
  }
</script>

<div class="adm-page">
  <PageHeader title="Plus" />

  <div class="a-stack">
    <form class="search" role="search" onsubmit={search}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <label class="a-sr" for="adm-q">Chercher un joueur</label>
      <input id="adm-q" type="search" placeholder="Chercher un joueur…" bind:value={q} autocomplete="off" />
    </form>

    {#each SECTIONS as s (s.title)}
      <h2 class="a-h2">{s.title}</h2>
      <ul class="menu">
        {#each s.links as l (l.href)}
          <li>
            <a href={l.href}>
              <span class="a-row-main">
                <span class="a-row-title">{l.name}</span>
                <span class="a-row-sub">{l.desc}</span>
              </span>
              <span class="a-muted" aria-hidden="true">›</span>
            </a>
          </li>
        {/each}
      </ul>
    {/each}
  </div>
</div>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--a-line);
    border-radius: 14px;
    background: var(--a-surface);
  }
  .search:focus-within { border-color: var(--a-accent); }
  .search svg { flex: 0 0 18px; width: 18px; height: 18px; fill: none; stroke: var(--a-dim); stroke-width: 2; }
  .search input { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: var(--a-fg); font: inherit; font-size: 1rem; }

  .menu { list-style: none; border: 1px solid var(--a-line); border-radius: 14px; background: var(--a-surface); overflow: hidden; }
  .menu li + li { border-top: 1px solid var(--a-line); }
  .menu a { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
  .menu a:hover { background: var(--a-surface2); }
  @media (min-width: 900px) {
    .menu { display: grid; grid-template-columns: 1fr 1fr; }
    .menu li + li { border-top: 0; }
    .menu li { border-bottom: 1px solid var(--a-line); }
    .menu li:nth-child(odd) { border-right: 1px solid var(--a-line); }
  }
</style>
