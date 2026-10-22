<script>
    /** Badge d'état d'un projet : en ligne ou interne. */
    let { status } = $props();
</script>

{#if status === 'live'}
    <span class="status-live">
        <span class="live-dot"></span> Live
    </span>
{:else if status === 'internal'}
    <span class="status-internal">Interne · Confidentiel</span>
{/if}

<style>
    .status-live {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: #6ee7b7;
        margin-bottom: 0.5rem;
    }

    .live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        animation: ping-green 2s infinite;
    }

    @keyframes ping-green {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
        70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .status-internal {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        background: rgba(245, 158, 11, 0.08);
        border: 1px solid rgba(245, 158, 11, 0.16);
        color: #fcd34d;
        margin-bottom: 0.5rem;
    }

</style>
