<script>
    import { reveal } from './reveal.js';
    import ContactForm from './ContactForm.svelte';

    export let form = null;
</script>

<section id="contact" class="section">
    <div class="section-header" use:reveal>
        <span class="kicker">Contact</span>
        <h2 class="section-title">Initialiser une connexion</h2>
        <p class="section-sub">Une alternance, une opportunité ou un échange ? Écris-moi ici.</p>
    </div>

    <div class="contact-layout" use:reveal style="--delay: 100ms">
        <!-- Info side -->
        <div class="info-col">
            <div class="info-card card">
                <h3 class="info-title">Restons en contact</h3>
                <p class="info-text">
                    Je réponds généralement sous 24–48h.
                </p>

                <div class="contact-links">
                    <a href="https://www.linkedin.com/in/theo-foucher-3956b52a0/" target="_blank" rel="noopener noreferrer" class="contact-link">
                        <span class="link-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                        </span>
                        LinkedIn
                    </a>
                    <a href="https://github.com/Tfoucher5" target="_blank" rel="noopener noreferrer" class="contact-link">
                        <span class="link-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.09.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                        </span>
                        GitHub
                    </a>
                </div>
            </div>
        </div>

        <!-- Form side -->
        <div class="form-col">
            <ContactForm {form} />
        </div>
    </div>
</section>

<style>
    .section {
        max-width: 1200px;
        margin: 0 auto;
        padding: 5rem 1.5rem 7rem;
    }

    .section-header {
        margin-bottom: 2.5rem;
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
        margin: 0 0 0.4rem;
        font-size: clamp(1.8rem, 4vw, 2.4rem);
        letter-spacing: -0.04em;
        color: #f1f5f9;
        font-weight: 800;
    }

    .section-sub {
        margin: 0;
        font-size: 0.9rem;
        color: #475569;
    }

    .contact-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 1.2rem;
        align-items: start;
        max-width: 860px;
    }

    .card {
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(12px);
    }

    .info-card {
        padding: 1.6rem;
    }

    .info-title {
        margin: 0 0 0.8rem;
        font-size: 1rem;
        font-weight: 700;
        color: #e2e8f0;
    }

    .info-text {
        margin: 0 0 1.4rem;
        font-size: 0.88rem;
        line-height: 1.75;
        color: #64748b;
    }

    .contact-links {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .contact-link {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.6rem 0.85rem;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.02);
        color: #94a3b8;
        text-decoration: none;
        font-size: 0.88rem;
        font-weight: 500;
        transition: color 0.2s, border-color 0.2s, background 0.2s;
    }

    .contact-link:hover {
        color: #f1f5f9;
        border-color: rgba(99, 102, 241, 0.2);
        background: rgba(99, 102, 241, 0.05);
    }

    .link-icon {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.04);
    }

    @media (max-width: 760px) {
        .contact-layout {
            grid-template-columns: 1fr;
        }
    }
</style>
