<script>
    /** Pile technique d'un projet, chaque techno colorée selon sa catégorie. */
    let { stack } = $props();

    const catColors = {
        'Frontend': { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
        'Backend': { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.16)', text: '#6ee7b7' },
        'Base de données': { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.16)', text: '#67e8f9' },
        'Temps réel': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.16)', text: '#fcd34d' },
        'Intégration': { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.16)', text: '#c4b5fd' },
        'Serveur': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.16)', text: '#94a3b8' },
        'Data': { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.16)', text: '#fdba74' },
        'Excel': { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.16)', text: '#6ee7b7' },
        'Core': { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
        'Templates': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.16)', text: '#94a3b8' }
    };

    function chipStyle(cat) {
        const c = catColors[cat] ?? catColors['Serveur'];
        return `background:${c.bg};border-color:${c.border};color:${c.text}`;
    }
</script>

<div class="stack-grid">
    {#each stack as tech, i (i)}
        <div class="tech-item" style={chipStyle(tech.cat)}>
            <span class="tech-cat">{tech.cat}</span>
            <span class="tech-name">{tech.name}</span>
        </div>
    {/each}
</div>

<style>
    .stack-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .tech-item {
        display: flex;
        flex-direction: column;
        padding: 0.45rem 0.75rem;
        border-radius: 8px;
        border: 1px solid;
    }

    .tech-cat {
        font-size: 0.66rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.7;
        margin-bottom: 0.1rem;
    }

    .tech-name {
        font-size: 0.85rem;
        font-weight: 700;
    }
</style>
