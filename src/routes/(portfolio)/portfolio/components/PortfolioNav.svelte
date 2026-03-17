<script>
    import { onMount } from 'svelte';
    import { GITHUB_URL } from '../data.js';

    let scrollProgress = 0;
    let activeSection = 'top';
    let menuOpen = false;

    const sections = [
        { id: 'top', label: 'Accueil' },
        { id: 'parcours', label: 'Parcours' },
        { id: 'formation', label: 'Formation' },
        { id: 'competences', label: 'Compétences' },
        { id: 'projets', label: 'Projets' },
        { id: 'contact', label: 'Contact' }
    ];

    onMount(() => {
        const onScroll = () => {
            const el = document.documentElement;
            scrollProgress = el.scrollTop / (el.scrollHeight - el.clientHeight);

            for (let i = sections.length - 1; i >= 0; i--) {
                const el = document.getElementById(sections[i].id);
                if (el && el.getBoundingClientRect().top <= 120) {
                    activeSection = sections[i].id;
                    break;
                }
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    });
</script>

<header class="glass-header">
    <div class="progress-bar" style="transform: scaleX({scrollProgress})" aria-hidden="true"></div>

    <nav class="nav">
        <a href="#top" class="brand" aria-label="Retour en haut" onclick={() => (menuOpen = false)}>
            <span class="brand-mark">TF</span>
            <span class="brand-dot"></span>
        </a>

        <div class="nav-links" class:open={menuOpen}>
            {#each sections.slice(1) as section}
                <a
                    href="#{section.id}"
                    class:active={activeSection === section.id}
                    onclick={() => (menuOpen = false)}
                >
                    {section.label}
                </a>
            {/each}
        </div>

        <div class="nav-right">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="nav-github" aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.09.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
            </a>

            <button
                class="menu-toggle"
                aria-label="Menu"
                aria-expanded={menuOpen}
                onclick={() => (menuOpen = !menuOpen)}
            >
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>
</header>

<style>
    .glass-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        background: rgba(3, 7, 18, 0.72);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .progress-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
        transform-origin: left;
        will-change: transform;
    }

    .nav {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0.9rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        color: #f1f5f9;
        font-weight: 800;
        font-size: 1.1rem;
        letter-spacing: -0.04em;
    }

    .brand-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #06b6d4);
        box-shadow: 0 0 14px rgba(99, 102, 241, 0.7);
    }

    .nav-links {
        display: flex;
        align-items: center;
        gap: 0.2rem;
    }

    .nav-links a {
        padding: 0.4rem 0.85rem;
        border-radius: 8px;
        color: #94a3b8;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: color 0.2s, background 0.2s;
    }

    .nav-links a:hover {
        color: #f1f5f9;
        background: rgba(255, 255, 255, 0.06);
    }

    .nav-links a.active {
        color: #a5b4fc;
        background: rgba(99, 102, 241, 0.1);
    }

    .nav-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .nav-github {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        color: #94a3b8;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        text-decoration: none;
        transition: color 0.2s, border-color 0.2s;
    }

    .nav-github:hover {
        color: #f1f5f9;
        border-color: rgba(255, 255, 255, 0.16);
    }

    .menu-toggle {
        display: none;
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        width: 34px;
        height: 34px;
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        cursor: pointer;
        padding: 7px;
    }

    .menu-toggle span {
        display: block;
        height: 2px;
        background: #94a3b8;
        border-radius: 2px;
        transition: transform 0.2s;
    }

    @media (max-width: 768px) {
        .menu-toggle {
            display: flex;
        }

        .nav-links {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            flex-direction: column;
            align-items: stretch;
            padding: 0.75rem 1rem;
            background: rgba(3, 7, 18, 0.96);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            gap: 0.2rem;
        }

        .nav-links.open {
            display: flex;
        }

        .nav-links a {
            padding: 0.7rem 0.85rem;
        }
    }
</style>
