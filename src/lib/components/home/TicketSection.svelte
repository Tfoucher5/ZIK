<script>
  import { reveal } from './reveal.js';

  let { home } = $props();

  let roomCodeVal = $state("");
  let roomCodeErr = $state("");
  let roomCodeLoading = $state(false);

  async function joinByCode() {
    roomCodeErr = "";
    const code = roomCodeVal.trim().toUpperCase();
    if (code.length < 4) { roomCodeErr = "Code invalide."; return; }
    roomCodeLoading = true;
    try {
      const r = await fetch(`/api/rooms/custom/${code}`);
      if (!r.ok) {
        const r2 = await fetch(`/api/rooms/${code}`);
        if (!r2.ok) throw new Error("Partie introuvable ou expirée. Vérifie le code.");
      }
      home.navigateToGame(code);
    } catch (e) {
      roomCodeErr = e.message;
    } finally {
      roomCodeLoading = false;
    }
  }
</script>

<section class="ticket-section" use:reveal>
  <div class="ticket-left">
    <span class="ticket-kicker">Partie privée en ligne</span>
    <h2 class="ticket-title">T'as un code&nbsp;?<br>Entre-le.</h2>
    <p class="ticket-hint">Code affiché sur une TV&nbsp;? C'est une soirée : <a href="/salon/play">rejoindre une soirée →</a></p>
    <div class="quick-links">
      <a href="/rooms" class="ql">Rooms</a>
      <a href="/classements" class="ql">Classements</a>
      <a href="/playlists" class="ql">Playlists</a>
      <a href="/salon" class="ql">Mode Salon</a>
      <a href="https://discord.gg/Xkr9aUEKYf" target="_blank" rel="noopener noreferrer" class="ql ql-discord">Discord</a>
    </div>
  </div>

  <div class="ticket">
    <div class="stub">
      <span class="stub-logo">ZIK<em>.</em></span>
      <span class="stub-label">Billet d'entrée</span>
    </div>
    <div class="ticket-main">
      <div class="ticket-event">Blind Test</div>
      <div class="ticket-venue">ZIK · Partie en ligne</div>
      <label class="ticket-code-label" for="ticket-code-input">Code de partie en ligne</label>
      <div class="ticket-row">
        <input
          id="ticket-code-input"
          class="ticket-input"
          type="text"
          bind:value={roomCodeVal}
          placeholder="ABC123"
          maxlength="6"
          autocomplete="off"
          spellcheck="false"
          oninput={(e) => { roomCodeVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); }}
          onkeypress={(e) => { if (e.key === 'Enter') joinByCode(); }}
        />
        <button class="ticket-go" onclick={joinByCode} disabled={roomCodeLoading} >
          {#if roomCodeLoading}…{:else}Rejoindre →{/if}
        </button>
      </div>
      {#if roomCodeErr}<p class="ticket-err">{roomCodeErr}</p>{/if}
    </div>
  </div>
</section>

<style>
  .ticket-section {
    padding: 72px 48px;
    background: var(--bg);
    border-top: 1px solid rgb(var(--c-glass) / 0.04);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 72px;
    align-items: center;
  }
  .ticket-left {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .ticket-kicker {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: var(--accent);
    display: block;
  }
  .ticket-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.2rem, 5vw, 4.5rem);
    text-transform: uppercase;
    letter-spacing: -1.5px;
    line-height: 0.9;
  }
  .ticket-hint { font-size: 0.95rem; color: var(--mid); }
  .ticket-hint a { color: var(--accent); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .quick-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ql {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgb(var(--c-glass) / 0.75);
    text-decoration: none;
    border: 1px solid rgb(var(--c-glass) / 0.2);
    padding: 8px 18px;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    background: rgb(var(--c-glass) / 0.03);
  }
  .ql:hover { color: var(--text); border-color: rgb(var(--c-glass) / 0.5); background: rgb(var(--c-glass) / 0.07); }
  .ql-discord { color: #7289da; border-color: rgba(114,137,218,0.4); background: rgba(114,137,218,0.06); }
  .ql-discord:hover { color: var(--text); border-color: rgba(114,137,218,0.8); background: rgba(114,137,218,0.15); }
  .ticket {
    background: var(--bg2);
    border: 1px solid rgb(var(--c-glass) / 0.1);
    position: relative;
    overflow: hidden;
  }
  .ticket::before {
    content: '';
    position: absolute;
    top: 0; left: 172px; bottom: 0; width: 1px;
    background: repeating-linear-gradient(
      to bottom,
      rgb(var(--c-glass) / 0.12) 0, rgb(var(--c-glass) / 0.12) 5px,
      transparent 5px, transparent 11px
    );
  }
  .stub {
    position: absolute;
    top: 0; left: 0; bottom: 0; width: 172px;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 20px;
  }
  .stub-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2rem;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    letter-spacing: 0.1em;
  }
  .stub-logo em { color: var(--accent); font-style: normal; }
  .stub-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.52rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--dim);
    writing-mode: vertical-rl;
  }
  .ticket-main { padding: 28px 28px 28px 200px; }
  .ticket-event {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.8rem;
    text-transform: uppercase;
    letter-spacing: -0.3px;
    margin-bottom: 2px;
  }
  .ticket-venue {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--mid);
    margin-bottom: 22px;
  }
  .ticket-code-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
    display: block;
    margin-bottom: 5px;
  }
  .ticket-row { display: flex; }
  .ticket-input {
    flex: 1;
    background: transparent;
    border: 1px solid rgb(var(--c-glass) / 0.12);
    border-right: none;
    padding: 12px 16px;
    color: var(--text);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    outline: none;
    transition: border-color 0.2s;
  }
  .ticket-input:focus { border-color: rgb(var(--accent-rgb) / 0.5); }
  .ticket-input::placeholder { color: var(--dim); }
  .ticket-go {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--on-accent);
    background: var(--accent);
    border: none;
    padding: 12px 20px;
    white-space: nowrap;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .ticket-go:disabled { opacity: 0.5; cursor: not-allowed; }
  .ticket-err { font-size: 0.72rem; color: var(--danger); margin-top: 6px; }

  @media (max-width: 900px) {
    .ticket-section { padding: 48px 24px; grid-template-columns: 1fr; gap: 36px; }
  }

  @media (max-width: 600px) {
    .ticket-section { padding: 60px 16px; }
    .ticket::before { display: none; }
    .ticket-main { padding: 20px; }
    .stub { display: none; }
    .ticket-row { flex-direction: column; gap: 10px; }
    .ticket-input { border-right: 1px solid rgb(var(--c-glass) / 0.12); text-align: center; }
    .ticket-go { padding: 14px 20px; }
  }
</style>
