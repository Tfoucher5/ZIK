<script>
  import { onMount } from 'svelte';

  let activeSection = $state('decouverte');

  const sections = [
    { id: 'decouverte', label: 'Découverte' },
    { id: 'rejoindre', label: 'Rejoindre une partie' },
    { id: 'jouer', label: 'Comment jouer' },
    { id: 'points', label: 'Système de points' },
    { id: 'zikle', label: 'Zikle — chanson du jour' },
    { id: 'salon', label: 'Mode Salon' },
    { id: 'qcm', label: 'Mode QCM multijoueur' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'compte', label: 'Compte & Profil' },
    { id: 'cartes', label: 'Cartes musicales' },
    { id: 'amis', label: 'Amis & invitations' },
    { id: 'classement', label: 'Classements' },
    { id: 'faq', label: 'FAQ' },
  ];

  onMount(() => {
    const headings = document.querySelectorAll('h2[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
          }
        }
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  });
</script>

<aside class="doc-sidebar">
  <nav aria-label="Sections de la documentation">
    <ul>
      {#each sections as s (s.id)}
        <li>
          <a
            href="#{s.id}"
            class:active={activeSection === s.id}
            aria-current={activeSection === s.id ? 'location' : undefined}
          >
            {s.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</aside>

<style>
  .doc-sidebar {
    position: sticky;
    top: 80px;
    height: fit-content;
    padding-right: 32px;
  }

  .doc-sidebar nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .doc-sidebar nav ul li a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--dim, #888);
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
    line-height: 1.4;
  }

  .doc-sidebar nav ul li a:hover {
    color: var(--text, #fff);
    background: rgb(var(--c-glass) / 0.05);
  }

  .doc-sidebar nav ul li a.active {
    color: var(--accent, #7c3aed);
    background: rgb(var(--accent-rgb) / 0.1);
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .doc-sidebar {
      display: none;
    }
  }
</style>
