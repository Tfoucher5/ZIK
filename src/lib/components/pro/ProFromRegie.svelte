<script>
  import { PLANS } from '$lib/data/proPlans.js';
  import Captcha from '$lib/components/auth/Captcha.svelte';
  import { captchaOn } from '$lib/components/auth/authForm.svelte.js';
  import { resendSignup } from './intent.js';

  let { checkout } = $props();
  const c = $derived(checkout.chosen);
  const step = $derived(checkout.step);
  const deja = $derived(step === 'actif');
  const pas = $derived({ formule: 0.03, compte: 0.33, mail: 0.33, payer: 0.66, actif: 1 }[step]);
  const accountPlan = $derived(PLANS.find((p) => p.id === checkout.pro?.plan)?.name ?? 'ZIK Pro');

  let captchaToken = $state(null);
  let captcha = $state();
  let resent = $state('');

  async function resend() {
    const token = captchaToken;
    resent = await resendSignup(checkout.zik.sb.auth, checkout.pendingEmail, { origin: location.origin, captchaOn, token });
    if (token) captcha?.reset();
  }
</script>

<section id="depuis-regie" class="caisse" aria-labelledby="caisse-t">
  <div class="tete">
    <span class="label"><i></i>Depuis votre régie</span>
    <h2 class="grad" id="caisse-t">{deja ? 'Votre soirée est passée en ZIK Pro' : 'Votre soirée passe en ZIK Pro toute seule'}</h2>
    <div class="soiree"><span class="k">Soirée en cours</span><span class="tuiles" aria-label="Code {checkout.regie}">{#each checkout.regie as ch, i (i)}<b aria-hidden="true">{ch}</b>{/each}</span></div>
  </div>
  <div class="texte">
    <p class="lead">{deja ? 'Plus de limite de joueurs : ceux qui attendaient entrent.' : 'Dès le paiement, plus de limite de joueurs : ceux qui attendent entrent.'} Rien à recréer, personne ne rescanne.</p>
    <p class="rassure"><b aria-hidden="true">●</b><span>Votre régie reste ouverte dans l'autre onglet : la soirée continue{deja ? '' : ' pendant que vous payez'}.</span></p>
  </div>
  <div class="droite">
    <ol class="frise" style="--p:{pas}">
      <li class:on={pas > 0.1}>Compte</li><li class:on={pas > 0.5}>Paiement</li><li class:on={pas > 0.9}>C'est actif</li>
    </ol>
    {#if deja}
      <div class="choisi"><b>{accountPlan}</b><span>déjà actif sur ce compte</span><strong class="mot">Actif</strong></div>
    {:else if c}
      <div class="choisi"><b>{c.name}</b><span>{c.period}</span><strong>{c.price}</strong><a href="#offres-plans">Changer de formule</a></div>
    {/if}

    <div class="etape" aria-live="polite">
      {#if step === 'actif'}
        <p class="k"><b>●</b> ZIK Pro actif</p>
        <h3>Rien à payer</h3>
        <p>Votre compte a déjà ZIK Pro. En vous connectant, vous avez rattaché la soirée <b>{checkout.regie}</b> : elle vient de passer en ZIK Pro.</p>
        <button type="button" class="btn-main" onclick={checkout.back}>Retourner sur la régie</button>
      {:else if step === 'formule'}
        <h3>Choisissez votre formule</h3>
        <p>Au mois ou à l'année : la soirée <b>{checkout.regie}</b> passe en ZIK Pro dès le paiement, comme toutes celles que vous lancerez ensuite.</p>
        <a class="btn-main" href="#offres-plans">Voir les deux formules</a>
      {:else if step === 'compte'}
        <h3>D'abord, votre compte</h3>
        <p>ZIK Pro s'active sur un compte ZIK : c'est lui qui garde votre accès et vos factures. Vos joueurs, eux, n'ont toujours besoin de rien.</p>
        <div class="btns">
          <button type="button" class="btn-main" onclick={() => checkout.account('register')}>Créer mon compte</button>
          <button type="button" class="btn-line" onclick={() => checkout.account('login')}>J'ai déjà un compte</button>
        </div>
        <small>Votre choix est gardé : une fois connecté, vous arrivez directement au paiement.</small>
      {:else if step === 'mail'}
        <h3>Confirmez votre e-mail</h3>
        <p>Un e-mail vient de partir à <b>{checkout.pendingEmail}</b>. Ouvrez le lien : sur cet appareil, il vous ramène ici, formule et soirée gardées pendant 1 h.</p>
        <button type="button" class="btn-main" onclick={() => checkout.account('login')}>J'ai confirmé, me connecter</button>
        <small>Lien ouvert sur un autre appareil ? Revenez sur cet onglet et connectez-vous.</small>
        <Captcha bind:this={captcha} bind:token={captchaToken} />
        <button type="button" class="lien" onclick={resend}>Renvoyer l'e-mail</button>
        {#if resent}<small role="status">{resent}</small>{/if}
      {:else if checkout.attachError}
        <h3>Soirée non rattachée</h3>
        <p class="err" role="alert">{checkout.attachError}</p>
        <div class="btns">
          <button type="button" class="btn-main" onclick={checkout.withoutSoiree}>Continuer sans cette soirée</button>
          <button type="button" class="btn-line" onclick={checkout.attach}>Réessayer</button>
        </div>
        <small>ZIK Pro s'active alors sur votre compte : vos prochaines soirées, créées connecté, seront en ZIK Pro.</small>
      {:else}
        <h3>Vérifiez et payez</h3>
        <dl class="fiche">
          <div><dt>Compte</dt><dd>{checkout.zik.user?.email}</dd></div>
          {#if c.id === 'night'}<div><dt>ZIK Pro actif jusqu'au</dt><dd>{checkout.nightEnd}</dd></div>{/if}
        </dl>
        <button type="button" class="btn-main" onclick={checkout.payDirect} disabled={!checkout.attached || checkout.busy !== null}>
          {checkout.busy ? 'Redirection…' : checkout.attached ? `Payer ${c.price}` : 'Vérification de la soirée…'}
        </button>
        {#if checkout.payError}<p class="err" role="alert">{checkout.payError}</p>{/if}
        <small>Vous allez être redirigé vers Stripe pour payer. Le reçu et la facture arrivent par e-mail. En payant, vous acceptez les <a href="/cgv" target="_blank" rel="noopener">CGV</a>.</small>
      {/if}
    </div>
  </div>
</section>

<style>
  .caisse {
    display: grid;
    grid-template-areas: 'tete' 'droite' 'texte';
    gap: 22px;
    margin-bottom: 40px;
    padding: 22px 20px 20px;
    border-radius: 22px;
    border: 1px solid transparent;
    background:
      linear-gradient(var(--surface), var(--surface)) padding-box,
      linear-gradient(170deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.03)) border-box;
    scroll-margin-top: calc(var(--top, 58px) + 16px);
  }
  .caisse > div { display: grid; gap: 16px; align-content: start; min-width: 0; }
  .tete { grid-area: tete; }
  .droite { grid-area: droite; }
  .texte { grid-area: texte; }
  h2 { font-weight: 900; font-size: clamp(2.3rem, 10.4vw, 4.2rem); line-height: 0.9; letter-spacing: -0.01em; }
  .k { font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
  .k b { color: var(--ok); font-size: 10px; }
  .soiree { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .tuiles { display: flex; gap: 0.16em; font-family: var(--mono); font-weight: 700; font-size: 18px; }
  .tuiles b { display: grid; place-items: center; width: 1.22em; height: 1.5em; border-radius: 0.14em; background: rgba(255, 255, 255, 0.09); border-bottom: 0.06em solid rgba(255, 255, 255, 0.45); }
  .lead { font-size: 1.02rem; color: var(--muted); }
  .rassure { display: flex; gap: 10px; align-items: baseline; font-size: 15px; line-height: 1.4; color: var(--soft); }
  .rassure b { color: var(--ok); font-size: 10px; }
  .frise { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); margin: 0; padding: 12px 0 0; list-style: none; font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
  .frise::before, .frise::after { content: ''; position: absolute; left: 0; top: 0; height: 2px; }
  .frise::before { right: 0; background: var(--line-2); }
  .frise::after { width: calc(var(--p) * 100%); background: linear-gradient(90deg, var(--violet), var(--accent)); transition: width 0.45s var(--out); }
  .frise li.on { color: var(--text); }
  .frise li:nth-child(2) { text-align: center; }
  .frise li:last-child { text-align: right; }
  .choisi { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; align-items: center; padding: 14px 0; border-block: 1px solid var(--line-2); }
  .choisi b { font-family: var(--titre); font-weight: 800; font-size: 1.7rem; text-transform: uppercase; line-height: 1; }
  .choisi span { font-size: 14px; color: var(--muted); line-height: 1.3; }
  .choisi strong { grid-row: 1 / span 2; grid-column: 2; font-family: var(--titre); font-weight: 900; font-size: 44px; line-height: 1; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .choisi strong.mot { font-size: 22px; font-weight: 800; text-transform: uppercase; color: var(--ok); }
  .choisi a { grid-column: 1 / -1; justify-self: start; display: inline-flex; align-items: center; min-height: 44px; margin-bottom: -12px; font-size: 15px; color: var(--soft); text-underline-offset: 5px; text-decoration-color: var(--line-2); }
  .etape { display: grid; gap: 12px; }
  h3 { font-weight: 800; font-size: 1.8rem; line-height: 1; }
  .etape p:not(.k) { font-size: 16px; line-height: 1.5; color: var(--muted); }
  .etape p b { color: var(--text); font-weight: 600; }
  .btns { display: grid; gap: 10px; }
  .etape small { font-size: 14px; line-height: 1.4; color: var(--muted); }
  .etape small a { color: var(--text); }
  .lien { justify-self: start; min-height: 44px; padding: 0; border: 0; background: none; color: var(--soft); font: inherit; font-size: 15px; font-weight: 500; text-decoration: underline; text-underline-offset: 5px; cursor: pointer; }
  .etape .err { color: var(--danger); }
  .etape button:disabled { opacity: 0.6; cursor: default; transform: none; box-shadow: none; }
  .fiche { margin: 0; display: grid; border-top: 1px solid var(--line); }
  .fiche div { display: grid; gap: 2px; padding: 11px 0; border-bottom: 1px solid var(--line); }
  .fiche dt { font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
  .fiche dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; line-height: 1.35; }
  @media (min-width: 900px) {
    .caisse { grid-template: 'tete droite' auto 'texte droite' 1fr / minmax(0, 6fr) minmax(0, 5fr); gap: 20px 64px; margin-bottom: 64px; padding: 44px 48px; }
    .caisse > div { gap: 20px; }
    .tuiles { font-size: 22px; }
    .lead { font-size: 1.2rem; }
    .btns { grid-template-columns: 1fr 1fr; }
    .fiche div { grid-template-columns: 12em minmax(0, 1fr); align-items: baseline; gap: 16px; }
  }
</style>
