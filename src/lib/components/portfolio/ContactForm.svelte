<script>
    import { enhance } from '$app/forms';

    /** Formulaire de contact (action du +page.server.js), avec honeypot anti-spam. */
    let { form = null } = $props();

    let isSubmitting = $state(false);

    const handleEnhance = () => {
        isSubmitting = true;
        return async ({ result, update }) => {
            await update({ reset: result.type === 'success' });
            isSubmitting = false;
        };
    };
</script>

<div class="form-card card">
                <form method="POST" use:enhance={handleEnhance} class="contact-form">
                    <!-- Honeypot anti-spam -->
                    <div class="hidden-field" aria-hidden="true">
                        <label for="website">Website</label>
                        <input id="website" name="website" type="text" tabindex="-1" autocomplete="off" />
                    </div>

                    <div class="field-row">
                        <div class="input-group">
                            <input
                                id="nom"
                                type="text"
                                name="nom"
                                placeholder=" "
                                required
                                disabled={isSubmitting}
                                value={form?.values?.nom ?? ''}
                            />
                            <label for="nom">Votre nom</label>
                        </div>

                        <div class="input-group">
                            <input
                                id="email"
                                type="email"
                                name="email"
                                placeholder=" "
                                required
                                disabled={isSubmitting}
                                value={form?.values?.email ?? ''}
                            />
                            <label for="email">Votre email</label>
                        </div>
                    </div>

                    <div class="input-group">
                        <textarea
                            id="message"
                            name="message"
                            placeholder=" "
                            rows="6"
                            required
                            disabled={isSubmitting}
                        >{form?.values?.message ?? ''}</textarea>
                        <label for="message">Votre message</label>
                    </div>

                    <button class="submit-btn" type="submit" disabled={isSubmitting}>
                        {#if isSubmitting}
                            <span class="spinner" aria-hidden="true"></span> Transmission...
                        {:else}
                            Envoyer le message
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        {/if}
                    </button>
                </form>

                {#if form?.success}
                    <div class="status-msg success" role="status">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                        {form.message}
                    </div>
                {:else if form?.error}
                    <div class="status-msg error" role="alert">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                        {form.error}
                    </div>
                {/if}
</div>

<style>
    .card {
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(12px);
    }

    .form-card {
        padding: 1.6rem;
    }

    .hidden-field {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        opacity: 0;
    }

    .contact-form {
        display: grid;
        gap: 1rem;
    }

    .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .input-group {
        position: relative;
    }

    .input-group input,
    .input-group textarea {
        width: 100%;
        padding: 1.15rem 0.95rem 0.65rem;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.03);
        color: #f1f5f9;
        font: inherit;
        font-size: 0.92rem;
        transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        resize: vertical;
    }

    .input-group textarea {
        padding-top: 1.3rem;
    }

    .input-group input:focus,
    .input-group textarea:focus {
        outline: none;
        border-color: rgba(99, 102, 241, 0.4);
        background: rgba(99, 102, 241, 0.04);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
    }

    .input-group label {
        position: absolute;
        left: 0.95rem;
        top: 0.95rem;
        font-size: 0.9rem;
        color: #475569;
        pointer-events: none;
        transition: top 0.18s, font-size 0.18s, color 0.18s;
    }

    .input-group input:focus ~ label,
    .input-group input:not(:placeholder-shown) ~ label,
    .input-group textarea:focus ~ label,
    .input-group textarea:not(:placeholder-shown) ~ label {
        top: 0.38rem;
        font-size: 0.7rem;
        color: #6366f1;
    }

    .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.9rem 1.5rem;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, #818cf8, #6366f1 50%, #4f46e5);
        color: #f8fafc;
        font: inherit;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.4), 0 8px 20px rgba(99, 102, 241, 0.2);
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.5), 0 12px 28px rgba(99, 102, 241, 0.28);
    }

    .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .status-msg {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-top: 0.8rem;
        padding: 0.85rem 1rem;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 500;
    }

    .status-msg.success {
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.18);
        color: #6ee7b7;
    }

    .status-msg.error {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.16);
        color: #fca5a5;
    }


    @media (max-width: 760px) {
        .field-row {
            grid-template-columns: 1fr;
        }
    }
</style>
