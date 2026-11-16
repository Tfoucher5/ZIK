<script>
  import { getContext } from 'svelte';
  import { fetchPro, proActive } from '$lib/client/salonClient.js';
  import { thanksPhase, STATUS, planLabel, endTitle, REGIE, regieLine } from './thanks.js';
  import { loadIntent, forgetIntent, backToRegie } from './intent.js';

  const zik = getContext('zik');
  let pro = $state(null);
  // Paiement parti d'une régie encore ouverte : on y renvoie
  let { regie = null } = $props();
  const active = $derived(proActive(pro));
  const endLabel = $derived(
    pro ? new Date(pro.current_period_end).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '',
  );
  let waitedTooLong = $state(false);
  const phase = $derived(thanksPhase({ active, waitedTooLong, authReady: zik.authReady, user: zik.user }));
  const pending = $derived(phase === 'late' ? 'Pas encore reçue' : 'En attente de Stripe…');

  $effect(() => {
    const code = loadIntent(localStorage)?.salon;
    if (!code) return;
    fetch(`/api/salon?code=${code}`)
      .then((r) => { if (r.status !== 404) regie = code; })
      .catch(() => {});
  });
  $effect(() => {
    if (active) forgetIntent(localStorage);
  });

  // Stripe prévient ZIK par webhook : on attend l'activation quelques secondes
  $effect(() => {
    const user = zik.user;
    if (!user) return;
    let tries = 0;
    let timer;
    const check = async () => {
      const row = await fetchPro(zik.sb, user.id).catch(() => null);
      // Un passe déjà en cours est actif avant même ce paiement : on attend
      // que la ligne porte la session Stripe de ce paiement-ci
      const sessionId = new URLSearchParams(location.search).get('session_id');
      if (proActive(row) && (!sessionId || row.stripe_last_session === sessionId)) { pro = row; return; }
      if (++tries >= 15) { waitedTooLong = true; return; }
      timer = setTimeout(check, 1500);
    };
    check();
    return () => clearTimeout(timer);
  });
</script>

<main class="merci">
  <article class="card s-{phase}" aria-labelledby="merci-t">
    <svg class="check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
    <span class="st" role="status"><i></i>{STATUS[phase]}</span>
    <h1 class="grad" id="merci-t">{phase === 'on' ? (regie ? "C'est actif." : 'Merci, paiement reçu !') : 'Merci !'}</h1>

    {#if regie && REGIE[phase]}
      <p class="msg">
        {REGIE[phase][0]}<b>{regie}</b>{REGIE[phase][1]}
        {#if phase === 'late'}Si rien ne bouge dans quelques minutes, écrivez à <a href="mailto:theo@zik-music.fr">theo@zik-music.fr</a>. <b>Inutile de payer à nouveau.</b>{/if}
      </p>
    {:else if phase === 'on'}
      <p class="msg">ZIK Pro est actif. Créez votre soirée en restant connecté avec ce compte : pas de limite de joueurs, buzzer, manches spéciales et classement de la soirée sont débloqués.</p>
    {:else if phase === 'late'}
      <p class="msg">Le paiement est bien passé, l'activation prend un peu plus de temps que prévu. Rechargez la page dans une minute. Si rien ne bouge, écrivez à <a href="mailto:theo@zik-music.fr">theo@zik-music.fr</a> : c'est réglé dans la journée. <b>Inutile de payer à nouveau.</b></p>
    {:else if phase === 'out'}
      <p class="msg">Connectez-vous avec le compte utilisé pour le paiement pour retrouver ZIK Pro.</p>
    {:else}
      <p class="msg">Stripe confirme votre paiement à ZIK. Ça prend en général quelques secondes, ne fermez pas cette page.</p>
    {/if}

    {#if zik.user}
      <dl>
        <div><dt>Formule</dt><dd class:wait={!active}>{active ? planLabel(pro.plan) : pending}</dd></div>
        {#if active}<div><dt>{endTitle(pro.plan)}</dt><dd>{endLabel}</dd></div>{/if}
        {#if regie}<div><dt>Soirée</dt><dd class:wait={!active}>{regieLine(regie, active)}</dd></div>{/if}
        <div><dt>Compte</dt><dd>{zik.user.email}</dd></div>
      </dl>
    {/if}

    <div class="ctas">
      {#if phase === 'out'}
        <button type="button" class="btn-main" onclick={() => zik.openAuthModal('login')}>Me connecter</button>
      {:else if regie}
        <button type="button" class="btn-main" onclick={() => backToRegie(regie)}>Retourner sur la régie</button>
      {:else}
        <a class="btn-main" href="/salon">{phase === 'on' ? 'Créer ma soirée Pro' : 'Créer une soirée'}</a>
      {/if}
      <a class="link" href="/pro#tarifs">Voir mon accès ZIK Pro</a>
    </div>
    <p class="small">Le reçu et la facture arrivent par e-mail, envoyés par Stripe.</p>
  </article>
</main>

<style>
  .merci {
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: calc(var(--top) + 40px) max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px));
  }
  .card {
    width: min(520px, 100%);
    display: grid;
    gap: 18px;
    justify-items: center;
    padding: 32px 22px 28px;
    border-radius: 22px;
    text-align: center;
    background:
      linear-gradient(var(--surface), var(--surface)) padding-box,
      linear-gradient(170deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.03)) border-box;
    border: 1px solid transparent;
    animation: in 0.6s var(--out);
  }
  .check {
    width: 76px;
    height: 76px;
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .check circle {
    stroke: var(--line-2);
    stroke-dasharray: 151;
    stroke-dashoffset: 151;
    animation: draw 0.8s ease forwards;
    transition: stroke 0.3s;
  }
  .check path {
    stroke: var(--ok);
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
  }
  .s-on .check circle {
    stroke: var(--ok);
  }
  .s-on .check path {
    animation: draw 0.45s 0.1s ease forwards;
  }
  .s-wait .check circle {
    stroke-dasharray: 110 151;
    transform-origin: center;
    animation:
      draw 0.8s ease forwards,
      turn 1.6s linear infinite;
  }
  .s-late .check circle {
    stroke: var(--warn);
  }
  h1 {
    font-weight: 900;
    font-size: clamp(2.3rem, 10vw, 3.2rem);
  }
  .st {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .st i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
  }
  .s-on .st i {
    background: var(--ok);
  }
  .s-wait .st i {
    animation: blink 1s steps(1) infinite;
  }
  .s-late .st i {
    background: var(--warn);
  }
  .msg {
    max-width: 30em;
    color: var(--muted);
  }
  .msg a,
  .msg b {
    color: var(--text);
    font-weight: 600;
  }
  dl {
    width: 100%;
    margin: 0;
    display: grid;
    text-align: left;
    border-top: 1px solid var(--line);
  }
  dl div {
    display: grid;
    gap: 2px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }
  dt {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  dd {
    margin: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  dd.wait {
    color: var(--muted);
    font-weight: 500;
  }
  .ctas {
    display: grid;
    gap: 10px;
    width: 100%;
  }
  .link {
    display: inline-grid;
    place-items: center;
    min-height: 44px;
    color: var(--text);
    font-size: 15px;
    text-underline-offset: 3px;
  }
  .small {
    font-size: 14px;
    color: var(--muted);
  }
  @keyframes in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes blink {
    50% {
      opacity: 0.2;
    }
  }
  @media (min-width: 900px) {
    .card {
      padding: 44px 40px 36px;
    }
    dl div {
      grid-template-columns: 11em minmax(0, 1fr);
      align-items: baseline;
      gap: 16px;
    }
  }
  :global(html.rm) .check circle,
  :global(html.rm) .check path {
    stroke-dashoffset: 0;
  }
  :global(html.rm) .s-wait .check path {
    stroke-dashoffset: 40;
  }
</style>
