<script>
    import { metrics } from '$lib/data/portfolio.js';

    let countersStarted = false;
    let displayValues = $state(metrics.map(() => 0));

    function animateCounter(index, target) {
        const duration = 1800;
        const steps = 60;
        const step = target / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += step;
            if (current >= target) {
                displayValues[index] = target;
                clearInterval(interval);
            } else {
                displayValues[index] = Math.floor(current);
            }
        }, duration / steps);
    }

    function startCounters(node) {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && !countersStarted) {
                        countersStarted = true;
                        metrics.forEach((m, i) => animateCounter(i, m.value));
                        observer.disconnect();
                    }
                }
            },
            { threshold: 0.3 }
        );
        observer.observe(node);
        return { destroy() { observer.disconnect(); } };
    }
</script>

<div class="hero-panels" use:startCounters>
    <div class="panel-grid">
        <!-- Métriques -->
        <div class="panel metric-panel glass-card">
            <div class="metrics-row">
                {#each metrics as metric, i (metric.label)}
                    <div class="metric">
                        <div class="metric-value">{displayValues[i]}{metric.suffix}</div>
                        <div class="metric-label">{metric.label}</div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Focus card -->
        <div class="panel focus-panel glass-card">
            <div class="panel-label">Focus actuel</div>
            <p class="focus-text">Transformer les besoins réels en outils clairs, fiables et performants.</p>
            <div class="stack-chips">
                <span>SvelteKit (perso)</span>
                <span>Supabase (perso)</span>
                <span>Python (alternance)</span>
                <span>Automatisation (alternance)</span>
                <span>Data (alternance)</span>
                <span>Excel (alternance)</span>
            </div>
        </div>

        <!-- Dispo card -->
        <div class="panel dispo-panel glass-card">
            <div class="dispo-dot"></div>
            <div>
                <div class="dispo-title">En alternance — Licence Générale STS</div>
                <div class="dispo-sub">En recherche d'une alternance pour 2026–2027</div>
            </div>
        </div>
    </div>
</div>

<style>
    .panel-grid {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    .glass-card {
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 1.5rem;
        transition: border-color 0.3s, transform 0.3s;
    }

    .glass-card:hover {
        border-color: rgba(99, 102, 241, 0.18);
        transform: translateY(-2px);
    }

    .metrics-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
    }

    .metric-value {
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        background: linear-gradient(135deg, #e0e7ff, #a5b4fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .metric-label {
        margin-top: 0.2rem;
        font-size: 0.78rem;
        line-height: 1.4;
        color: #475569;
    }

    .panel-label {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #6366f1;
        margin-bottom: 0.7rem;
    }

    .focus-text {
        margin: 0 0 1rem;
        font-size: 1rem;
        line-height: 1.6;
        color: #cbd5e1;
    }

    .stack-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
    }

    .stack-chips span {
        padding: 0.3rem 0.7rem;
        border-radius: 6px;
        background: rgba(99, 102, 241, 0.08);
        border: 1px solid rgba(99, 102, 241, 0.14);
        color: #a5b4fc;
        font-size: 0.78rem;
        font-weight: 500;
    }

    .dispo-panel {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
    }

    .dispo-dot {
        flex-shrink: 0;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
        animation: ping-green 2.5s infinite;
    }

    @keyframes ping-green {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
        70% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .dispo-title {
        font-weight: 700;
        color: #e2e8f0;
        font-size: 0.95rem;
    }

    .dispo-sub {
        font-size: 0.8rem;
        color: #64748b;
        margin-top: 0.15rem;
    }

    @media (max-width: 640px) {
        .metrics-row {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.25rem;
        }

        .metric-value {
            font-size: 1.5rem;
        }

        .metric-label {
            font-size: 0.7rem;
        }

        .glass-card {
            padding: 1.2rem;
        }

        .stack-chips span {
            font-size: 0.72rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .dispo-dot {
            animation: none !important;
        }
    }
</style>
