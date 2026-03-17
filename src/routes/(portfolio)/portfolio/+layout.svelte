<script>
    import { onMount } from 'svelte';

    onMount(() => {
        document.body.classList.add('portfolio-mode');
        return () => document.body.classList.remove('portfolio-mode');
    });
</script>

<slot />

<style>
    :global(html) {
        background: #030712;
        scroll-behavior: smooth;
    }

    :global(body.portfolio-mode) {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        background: #030712;
        color: #f1f5f9;
        font-family:
            'Inter',
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    :global(body.portfolio-mode *) {
        box-sizing: border-box;
    }

    :global(body.portfolio-mode a) {
        -webkit-tap-highlight-color: transparent;
    }

    :global(body.portfolio-mode #svelte) {
        min-height: 100vh;
    }

    :global(body.portfolio-mode ::selection) {
        background: rgba(99, 102, 241, 0.28);
        color: #ffffff;
    }

    /* Bricolage Grotesque pour les titres */
    :global(body.portfolio-mode h1,
    body.portfolio-mode h2,
    body.portfolio-mode h3) {
        font-family: 'Bricolage Grotesque', 'Inter', system-ui, sans-serif;
    }

    /* Scrollbar */
    :global(body.portfolio-mode) {
        scrollbar-width: thin;
        scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
    }
</style>
