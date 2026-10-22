<script>
    /** Liens d'un projet (site, dépôt), ou mention « projet interne » s'il n'en a pas. */
    let { links, internal } = $props();
</script>

{#if links?.length}
    <div class="links-row">
        {#each links as link, i (i)}
            <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                class="modal-link"
                class:link-live={link.type === 'live'}
            >
                {#if link.type === 'live'}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                {:else}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.09.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                {/if}
                {link.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
            </a>
        {/each}
    </div>
{:else if internal}
    <div class="internal-notice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        Projet interne — code et données confidentiels
    </div>
{/if}

<style>
    .links-row {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .modal-link {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.7rem 1.1rem;
        border-radius: 10px;
        text-decoration: none;
        font-size: 0.88rem;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
        color: #cbd5e1;
        transition: background 0.2s, border-color 0.2s, color 0.2s;
    }

    .modal-link:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f1f5f9;
        border-color: rgba(255, 255, 255, 0.16);
    }

    .modal-link.link-live {
        background: rgba(99, 102, 241, 0.08);
        border-color: rgba(99, 102, 241, 0.2);
        color: #a5b4fc;
    }

    .modal-link.link-live:hover {
        background: rgba(99, 102, 241, 0.14);
        border-color: rgba(99, 102, 241, 0.35);
        color: #c7d2fe;
    }

    .internal-notice {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.85rem 1.1rem;
        border-radius: 10px;
        background: rgba(245, 158, 11, 0.06);
        border: 1px solid rgba(245, 158, 11, 0.14);
        color: #fbbf24;
        font-size: 0.88rem;
        font-weight: 500;
    }
</style>
