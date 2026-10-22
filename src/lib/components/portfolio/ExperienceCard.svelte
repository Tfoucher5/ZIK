<script>
    /** Carte d'une expérience : résumé, puis détails et stack au clic. */
    let { xp } = $props();

    let expanded = $state(false);
</script>

<div class="card xp-card" class:expanded>
    <div class="card-top">
        <div class="card-header">
            <div class="header-left">
                <div class="xp-type" class:alt={xp.type === 'Alternance'}>{xp.type}</div>
                <h3 class="xp-title">{xp.title}</h3>
                <div class="xp-company">
                    <span class="company-name">{xp.company}</span>
                    <span class="sep" aria-hidden="true">·</span>
                    <span class="company-loc">{xp.location}</span>
                </div>
            </div>
            <div class="header-right">
                <span class="date-badge" class:current-badge={xp.current}>{xp.date}</span>
            </div>
        </div>
        <p class="xp-short">{xp.shortDesc}</p>
    </div>

    {#if expanded}
        <div class="card-expanded">
            <p class="xp-long">{xp.longDesc}</p>

            <ul class="detail-list">
                {#each xp.details as detail, i (i)}
                    <li>
                        <span class="bullet" aria-hidden="true">◈</span>
                        {detail}
                    </li>
                {/each}
            </ul>

            <div class="stack-row">
                {#each xp.stack as tech, i (i)}
                    <span class="tech-chip">{tech}</span>
                {/each}
            </div>
        </div>
    {/if}

    <button
        class="expand-btn"
        onclick={() => (expanded = !expanded)}
        aria-expanded={expanded}
        aria-label="{expanded ? 'Réduire' : 'Voir les détails'} — {xp.title}"
    >
        {expanded ? 'Réduire' : 'Voir les détails'}
        <svg
            width="14" height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
            style="transform: rotate({expanded ? 180 : 0}deg); transition: transform 0.3s"
        >
            <path d="M6 9l6 6 6-6"/>
        </svg>
    </button>
</div>

<style>
    /* Card */
    .card {
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(12px);
        transition: border-color 0.3s, background 0.3s;
        overflow: hidden;
    }

    .card:hover {
        border-color: rgba(99, 102, 241, 0.18);
        background: rgba(99, 102, 241, 0.03);
    }

    .card-top {
        padding: 1.4rem 1.5rem 0.8rem;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 0.75rem;
    }

    .xp-type {
        display: inline-block;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        background: rgba(100, 116, 139, 0.12);
        color: #94a3b8;
        border: 1px solid rgba(100, 116, 139, 0.16);
        margin-bottom: 0.45rem;
    }

    .xp-type.alt {
        background: rgba(99, 102, 241, 0.1);
        color: #a5b4fc;
        border-color: rgba(99, 102, 241, 0.18);
    }

    .xp-title {
        margin: 0 0 0.35rem;
        font-size: 1.1rem;
        font-weight: 700;
        color: #e2e8f0;
        line-height: 1.3;
    }

    .xp-company {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.88rem;
        color: #64748b;
    }

    .company-name {
        color: #94a3b8;
        font-weight: 600;
    }

    .date-badge {
        flex-shrink: 0;
        padding: 0.3rem 0.7rem;
        border-radius: 8px;
        font-size: 0.78rem;
        font-weight: 600;
        font-family: ui-monospace, monospace;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #64748b;
        white-space: nowrap;
    }

    .date-badge.current-badge {
        background: rgba(99, 102, 241, 0.1);
        border-color: rgba(99, 102, 241, 0.2);
        color: #a5b4fc;
    }

    .xp-short {
        margin: 0;
        font-size: 0.92rem;
        line-height: 1.7;
        color: #64748b;
    }

    /* Expanded content */
    .card-expanded {
        padding: 0 1.5rem 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        margin-top: 0.8rem;
    }

    .xp-long {
        margin: 1rem 0 1rem;
        font-size: 0.92rem;
        line-height: 1.75;
        color: #94a3b8;
    }

    .detail-list {
        list-style: none;
        padding: 0;
        margin: 0 0 1.2rem;
        display: grid;
        gap: 0.5rem;
    }

    .detail-list li {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        font-size: 0.9rem;
        line-height: 1.6;
        color: #94a3b8;
    }

    .bullet {
        flex-shrink: 0;
        color: #6366f1;
        margin-top: 0.1rem;
        font-size: 0.7rem;
    }

    .stack-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
    }

    .tech-chip {
        padding: 0.3rem 0.65rem;
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 500;
        background: rgba(6, 182, 212, 0.07);
        border: 1px solid rgba(6, 182, 212, 0.14);
        color: #67e8f9;
    }

    @media (max-width: 640px) {
        .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .header-right {
            align-self: flex-start;
        }

        .date-badge {
            font-size: 0.72rem;
        }

        .card-top {
            padding: 1.2rem 1.2rem 0.8rem;
        }

        .card-expanded {
            padding: 0 1.2rem 1rem;
        }

        .expand-btn {
            padding: 0.75rem 1.2rem;
        }
    }

    /* Expand button */
    .expand-btn {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        width: 100%;
        padding: 0.75rem 1.5rem;
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        background: transparent;
        color: #6366f1;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        font-family: inherit;
    }

    .expand-btn:hover {
        background: rgba(99, 102, 241, 0.05);
        color: #818cf8;
    }
</style>
