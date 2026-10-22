<script>
    import { onMount } from 'svelte';
    import ProjectLinks from './ProjectLinks.svelte';
    import ProjectStack from './ProjectStack.svelte';
    import ProjectStatus from './ProjectStatus.svelte';

    export let project = null;
    export let onClose = () => {};

    let dialogEl;

    function handleKeydown(e) {
        if (e.key === 'Escape') onClose();
    }

    function handleBackdrop(e) {
        if (e.target === e.currentTarget) onClose();
    }

    onMount(() => {
        document.addEventListener('keydown', handleKeydown);
        document.body.style.overflow = 'hidden';
        dialogEl?.focus();
        return () => {
            document.removeEventListener('keydown', handleKeydown);
            document.body.style.overflow = '';
        };
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<div
    class="overlay"
    onclick={handleBackdrop}
    role="dialog"
    aria-modal="true"
    aria-label={project?.title}
    bind:this={dialogEl}
    tabindex="-1"
>
    <div class="modal">
        <!-- Header -->
        <div class="modal-header">
            <div class="modal-title-group">
                <ProjectStatus status={project?.status} />
                <h2 class="modal-title">{project?.title}</h2>
                <p class="modal-tagline">{project?.tagline}</p>
            </div>
            <button class="close-btn" onclick={onClose} aria-label="Fermer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
            <!-- Long description -->
            <div>
                <p class="long-desc">{project?.longDesc}</p>
            </div>

            <!-- Tech Stack -->
            {#if project?.stack?.length}
                <div>
                    <h3 class="block-title">Stack technique</h3>
                    <ProjectStack stack={project.stack} />
                </div>
            {/if}

            <!-- Highlights -->
            {#if project?.highlights?.length}
                <div>
                    <h3 class="block-title">Points clés</h3>
                    <ul class="highlight-list">
                        {#each project.highlights as item, i (i)}
                            <li>
                                <span class="check" aria-hidden="true">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                </span>
                                {item}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            <!-- Links -->
            <ProjectLinks links={project?.links} internal={project?.internal} />
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(3, 7, 18, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        animation: fadeIn 0.2s ease;
        overflow-y: auto;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .modal {
        width: 100%;
        max-width: 700px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: #0d1425;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        max-height: 90vh;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
    }

    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.8rem 1.8rem 1.2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        position: sticky;
        top: 0;
        background: #0d1425;
        z-index: 1;
    }

    .modal-title {
        margin: 0 0 0.3rem;
        font-size: 1.6rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        color: #f1f5f9;
    }

    .modal-tagline {
        margin: 0;
        font-size: 0.92rem;
        color: #64748b;
    }

    .close-btn {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        color: #94a3b8;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.07);
        color: #f1f5f9;
    }

    .modal-body {
        padding: 1.5rem 1.8rem 1.8rem;
        display: grid;
        gap: 1.8rem;
    }

    .long-desc {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.85;
        color: #94a3b8;
    }

    .block-title {
        margin: 0 0 0.9rem;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #475569;
    }

    .highlight-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.55rem;
    }

    .highlight-list li {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        font-size: 0.92rem;
        line-height: 1.6;
        color: #94a3b8;
    }

    .check {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.1);
        color: #818cf8;
        margin-top: 0.1rem;
    }


    @media (max-width: 640px) {
        .overlay {
            align-items: flex-end;
            padding: 0;
        }

        .modal {
            max-width: 100%;
            max-height: 92vh;
            border-radius: 20px 20px 0 0;
            animation: slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUpMobile {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }

        .modal-header {
            padding: 1.2rem 1.2rem 1rem;
        }

        .modal-title {
            font-size: 1.3rem;
        }

        .modal-body {
            padding: 1.2rem 1.2rem 2rem;
        }
    }
</style>
