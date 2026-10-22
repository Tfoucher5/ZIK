<script>
    import { reveal } from './reveal.js';
    import { experiences } from '$lib/data/portfolio.js';
    import ExperienceCard from './ExperienceCard.svelte';
</script>

<section id="parcours" class="section">
    <div class="section-header" use:reveal>
        <span class="kicker">Parcours</span>
        <h2 class="section-title">Expériences professionnelles</h2>
    </div>

    <div class="timeline">
        <div class="timeline-line" aria-hidden="true"></div>

        {#each experiences as xp, i (xp.id)}
            <article
                class="timeline-item"
                use:reveal
                style="--delay: {i * 100}ms"
            >
                <div class="timeline-dot" class:current={xp.current} aria-hidden="true"></div>

                <ExperienceCard {xp} />
            </article>
        {/each}
    </div>
</section>

<style>
    .section {
        max-width: 1200px;
        margin: 0 auto;
        padding: 5rem 1.5rem;
    }

    .section-header {
        margin-bottom: 3rem;
    }

    .kicker {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #6366f1;
        margin-bottom: 0.7rem;
    }

    .section-title {
        margin: 0;
        font-size: clamp(1.8rem, 4vw, 2.4rem);
        letter-spacing: -0.04em;
        color: #f1f5f9;
        font-weight: 800;
    }

    /* Timeline */
    .timeline {
        position: relative;
        display: grid;
        gap: 1.2rem;
        padding-left: 2.5rem;
        max-width: 860px;
    }

    .timeline-line {
        position: absolute;
        left: 6px;
        top: 16px;
        bottom: 16px;
        width: 2px;
        background: linear-gradient(180deg, #6366f1 0%, rgba(99, 102, 241, 0.1) 100%);
        border-radius: 2px;
    }

    .timeline-item {
        position: relative;
    }

    .timeline-dot {
        position: absolute;
        left: -2.15rem;
        top: 1.6rem;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #0f172a;
        border: 2px solid #334155;
        transition: border-color 0.3s;
        z-index: 2;
    }

    .timeline-dot.current {
        background: #6366f1;
        border-color: #6366f1;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    }

    .timeline-item:hover .timeline-dot {
        border-color: #6366f1;
    }

    @media (max-width: 640px) {
        .timeline {
            padding-left: 1.8rem;
        }

        .timeline-dot {
            left: -1.6rem;
            top: 1.4rem;
        }

    }
</style>
