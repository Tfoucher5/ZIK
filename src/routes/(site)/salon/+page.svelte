<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { onMount } from 'svelte';
  import { createSupabaseClient } from '$lib/supabase.js';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import PlaylistPicker from '$lib/components/salon/PlaylistPicker.svelte';
  import { loadSalonPlaylists, DEFAULT_SALON_PLAYLIST } from '$lib/salonPlaylists.js';
  import { rememberSignupRef, tagNewUser } from '$lib/signupRef.js';
  import { saveSalonKey, fetchPro, proActive, goToStripe } from '$lib/salonClient.js';
  import ProUpsell from '$lib/components/salon/ProUpsell.svelte';
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from '$lib/proPlans.js';

  const SITE = 'https://www.zik-music.fr';

  // Affichée sur la page ET envoyée à Google : les deux doivent rester identiques
  const FAQ_GROUPS = [
    {
      title: 'Pour jouer',
      items: [
        { q: 'Comment fonctionne le Mode Salon ?', a: "L'hôte ouvre le salon sur l'ordinateur branché à la TV. Les joueurs scannent le QR code affiché à l'écran avec leur téléphone et choisissent un pseudo. La TV diffuse les extraits, le chrono et le classement, les téléphones servent de buzzers." },
        { q: 'Faut-il installer une application ?', a: "Non, ni pour l'hôte ni pour les joueurs : tout se passe dans le navigateur. Les joueurs n'ont pas besoin de créer de compte." },
        { q: 'Peut-on jouer en équipes ?', a: "Oui. L'hôte choisit le nombre d'équipes, chaque joueur rejoint la sienne depuis son téléphone. Le score d'une équipe est la moyenne de ses joueurs, pour que les petites équipes gardent leurs chances." },
      ],
    },
    {
      title: 'Pour organiser',
      items: [
        { q: 'Peut-on utiliser ses propres musiques ?', a: 'Oui : importez une playlist Deezer, ou choisissez une playlist officielle ZIK (chanson française, années 80, 2000, rap français, Disney…).' },
        { q: 'Peut-on piloter la partie depuis un autre écran ?', a: "Oui. La régie s'ouvre sur un ordinateur ou une tablette à côté de la TV : pause, manche suivante, réglages et classement, sans que la salle ne voie rien." },
        { q: 'Et si la connexion est lente ?', a: "La musique de la manche suivante se charge pendant la manche en cours, pour éviter les temps morts. Un joueur qui perd le réseau retrouve sa place et ses points en revenant." },
      ],
    },
    {
      title: 'Tarifs',
      items: [
        { q: 'Combien de joueurs peuvent participer ?', a: `Jusqu'à ${FREE_MAX_PLAYERS} joueurs et ${FREE_MAX_TEAMS} équipes en version gratuite. ZIK Pro accueille un nombre illimité de joueurs et jusqu'à 8 équipes.` },
        { q: 'Combien ça coûte ?', a: `Le Mode Salon est gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs. Pour les bars, campings et événements, ZIK Pro coûte 7,90 € la soirée, 19 € par mois ou 190 € par an.` },
      ],
    },
  ];
  const SALON_FAQ = FAQ_GROUPS.flatMap((g) => g.items);

  const STEPS = [
    ['Ouvrez le salon', "sur l'ordinateur branché à la TV, choisissez la musique."],
    ['Les invités scannent le QR code', 'avec leur téléphone, sans appli ni compte.'],
    ['Jouez', 'ZIK diffuse, vérifie les réponses, compte les points et affiche le podium.'],
  ];

  const OCCASIONS = [
    ['soiree', 'Soirée entre amis'],
    ['bar', 'Bar et restaurant'],
    ['camping', 'Camping'],
    ['entreprise', 'Team building'],
    ['anniversaire', 'Anniversaire'],
    ['mariage', 'Mariage'],
  ];

  const salonJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'ZIK Mode Salon',
        url: `${SITE}/salon`,
        description: "Blind test de soirée : la TV diffuse la musique et le classement, les joueurs répondent depuis leur téléphone, en solo ou en équipes.",
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        inLanguage: 'fr-FR',
        offers: [
          { '@type': 'Offer', name: 'Gratuit', price: '0', priceCurrency: 'EUR' },
          { '@type': 'Offer', name: 'ZIK Pro Soirée', price: '7.90', priceCurrency: 'EUR' },
          { '@type': 'Offer', name: 'ZIK Pro Mensuel', price: '19.00', priceCurrency: 'EUR' },
          { '@type': 'Offer', name: 'ZIK Pro Annuel', price: '190.00', priceCurrency: 'EUR' },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Blind test en soirée', item: `${SITE}/salon` },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: SALON_FAQ.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  });

  const ROUNDS    = [5, 10, 15, 20];
  const DURATIONS = [15, 20, 30, 45, 60];
  const REVEALS   = [5, 7, 10, 15];

  let { data } = $props();

  const sb = createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey);

  let user      = $state(null);
  let authReady = $state(false);
  let authOpen  = $state(false);
  let authView  = $state('login');

  let maxRounds          = $state(10);
  let roundDuration      = $state(30);
  let answerMode         = $state('free');
  let manualNext         = $state(false);
  let showAnswerDuration = $state(7);
  let teamCount          = $state(0);
  let proRow             = $state(null);
  const pro              = $derived(proActive(proRow));
  let portalBusy         = $state(false);
  let upsell             = $state(null);

  let allPlaylists = $state([]);
  let selectedIds  = $state([]);
  let creating     = $state(false);
  let error        = $state('');

  let totalTrackCount = $derived(
    allPlaylists
      .filter(p => selectedIds.includes(p.id))
      .reduce((s, p) => s + (p.trackCount || 0), 0)
  );

  function openAuth(view) {
    rememberSignupRef('salon-setup');
    authView = view;
    authOpen = true;
  }

  async function openPortal() {
    portalBusy = true;
    try { await goToStripe(sb, '/api/pro/portal'); }
    catch (e) { error = e.message; portalBusy = false; }
  }

  function pickTeams(n) {
    if (!pro && n > FREE_MAX_TEAMS) upsell = 'teams';
    else teamCount = n;
  }

  async function loadPlaylists() {
    fetchPro(sb, user?.id).then((r) => (proRow = r)).catch(() => {});
    try {
      const flat = await loadSalonPlaylists(sb, user?.id ?? null);
      allPlaylists = flat;
      // ?playlist=id1,id2 : lien depuis une page /blind-test/<thème>
      const wanted = (new URLSearchParams(window.location.search).get('playlist') ?? '')
        .split(',')
        .filter((id) => flat.some((p) => p.id === id));
      if (wanted.length) selectedIds = wanted;
      else if (selectedIds.length === 0 && flat.length > 0) {
        selectedIds = [flat.find(p => p.id === DEFAULT_SALON_PLAYLIST)?.id ?? flat[0].id];
      }
    } catch {
      error = 'Impossible de charger les playlists.';
    }
  }

  async function createSalon() {
    error = '';
    if (selectedIds.length === 0) { error = 'Choisis au moins une playlist.'; return; }
    creating = true;
    try {
      const { data: { session } } = await sb.auth.getSession();
      const headers = { 'content-type': 'application/json' };
      if (session) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/salon', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin: new URLSearchParams(window.location.search).get('ref'),
          playlistIds: selectedIds,
          settings: { maxRounds, roundDuration, answerMode, manualNext, showAnswerDuration, teamCount },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erreur création salon');
      saveSalonKey(d.code, d.key);
      window.location.href = `/salon/host?code=${d.code}`;
    } catch (e) {
      error = e.message;
      creating = false;
    }
  }

  onMount(async () => {
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    user = session?.user ?? null;
    authReady = true;
    loadPlaylists();

    sb.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null;
      if (event === 'SIGNED_IN' && user) setTimeout(() => tagNewUser(sb, user));
      loadPlaylists();
    });
  });
</script>

<svelte:head>
  <title>Blind test en soirée sur la TV, les téléphones en buzzers - gratuit | ZIK</title>
  <meta name="description" content="Organisez un blind test en soirée en 2 minutes : la TV diffuse la musique et le classement, chacun répond sur son téléphone, en solo ou en équipes. Sans appli, gratuit jusqu'à 12 joueurs." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/salon" />

  <meta property="og:title" content="Blind test en soirée sur la TV | ZIK" />
  <meta property="og:description" content="La TV diffuse, les téléphones répondent. Équipes, classement en direct, podium. Vos playlists Deezer. Sans appli, gratuit jusqu'à 12 joueurs." />
  <meta property="og:url" content="https://www.zik-music.fr/salon" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Blind test en soirée sur la TV | ZIK" />
  <meta name="twitter:description" content="La TV diffuse, les téléphones répondent. En équipes, avec vos playlists. Sans appli, gratuit jusqu'à 12 joueurs." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />

  <JsonLd json={salonJsonLd} />
</svelte:head>

{#snippet segmented(options, value, set, unit = '')}
  <div class="st-seg" role="radiogroup">
    {#each options as o (o)}
      <button type="button" role="radio" aria-checked={value === o} class:on={value === o} onclick={() => set(o)}>{o}{unit}</button>
    {/each}
  </div>
{/snippet}

<div class="st">
  <header class="st-top">
    <a class="st-top-link" href="/">← ZIK</a>
    <a class="st-top-link st-top-join" href="/salon/play">Invité ? <b>Entrer le code</b></a>
  </header>

  <section class="st-hero">
    <p class="st-kicker">Mode salon</p>
    <h1>Ce soir,<br>c'est <em>blind test.</em></h1>
    <ol class="st-how">
      <li><b>La TV</b> diffuse la musique</li>
      <li><b>Les téléphones</b> servent de buzzer</li>
      <li><b>Personne</b> n'a besoin de compte</li>
    </ol>
  </section>

  {#if !authReady}
    <p class="st-loading">Chargement…</p>
  {:else}
    <section class="st-block">
      <h2><span>A</span>La musique</h2>
      <div><PlaylistPicker playlists={allPlaylists} bind:selectedIds onLogin={user ? null : () => openAuth('register')} /></div>
    </section>

    <section class="st-block">
      <h2><span>B</span>Le déroulé</h2>
      <dl class="st-sheet">
        <div>
          <dt>Manches</dt>
          <dd>{@render segmented(ROUNDS, maxRounds, v => (maxRounds = v))}</dd>
        </div>
        <div>
          <dt>Temps pour répondre</dt>
          <dd>{@render segmented(DURATIONS, roundDuration, v => (roundDuration = v), ' s')}</dd>
        </div>
        <div>
          <dt>Réponses</dt>
          <dd>
            <div class="st-seg st-seg-wide" role="radiogroup">
              <button type="button" role="radio" aria-checked={answerMode === 'free'} class:on={answerMode === 'free'} onclick={() => (answerMode = 'free')}>
                Texte libre<small>Pour les connaisseurs</small>
              </button>
              <button type="button" role="radio" aria-checked={answerMode === 'multiple'} class:on={answerMode === 'multiple'} onclick={() => (answerMode = 'multiple')}>
                4 choix<small>Tout le monde joue</small>
              </button>
            </div>
          </dd>
        </div>
        <div>
          <dt>Manche suivante</dt>
          <dd>
            <div class="st-seg st-seg-wide" role="radiogroup">
              <button type="button" role="radio" aria-checked={!manualNext} class:on={!manualNext} onclick={() => (manualNext = false)}>Automatique</button>
              <button type="button" role="radio" aria-checked={manualNext} class:on={manualNext} onclick={() => (manualNext = true)}>Quand je clique</button>
            </div>
          </dd>
        </div>
        <div>
          <dt>Équipes</dt>
          <dd>
            <div class="st-seg st-seg-wide" role="radiogroup">
              {#each [[0, 'Chacun pour soi'], [2, '2 équipes'], [3, '3'], [4, '4'], [6, '6'], [8, '8']] as [n, label] (n)}
                <button type="button" role="radio" aria-checked={teamCount === n} class:on={teamCount === n} class:st-pro={!pro && n > FREE_MAX_TEAMS} onclick={() => pickTeams(n)}>{label}</button>
              {/each}
            </div>
          </dd>
        </div>
        {#if !manualNext}
          <div>
            <dt>Réponse affichée</dt>
            <dd>{@render segmented(REVEALS, showAnswerDuration, v => (showAnswerDuration = v), ' s')}</dd>
          </div>
        {/if}
      </dl>
    </section>

    <p class="st-pro-note">
      En ouvrant le salon, cet onglet devient <b>l'écran TV</b> : branche cet ordinateur à la télé.
      Le bouton <b>Régie</b> ouvre le pilotage sur un autre écran (ordinateur, tablette).
    </p>
    <p class="st-pro-note">
      {#if pro}
        <b>ZIK Pro actif</b> : joueurs illimités, jusqu'à 8 équipes, régie complète.
        {#if proRow.stripe_customer_id}
          <button type="button" class="st-pro-manage" disabled={portalBusy} onclick={openPortal}>
            {portalBusy ? 'Ouverture…' : proRow.plan === 'night' ? 'Mes factures' : 'Gérer mon abonnement'}
          </button>
        {/if}
      {:else}
        Version gratuite : jusqu'à {FREE_MAX_PLAYERS} joueurs et {FREE_MAX_TEAMS} équipes.
        Un bar, un camping, un événement ? <a href="/pro#tarifs">Découvrir ZIK Pro</a>
      {/if}
    </p>
  {/if}

  <section class="st-seo" aria-labelledby="st-seo-title">
    <h2 id="st-seo-title">Le blind test de soirée, sans animateur</h2>

    <div class="st-seo-grid">
      <div>
        <h3>Comment ça marche</h3>
        <ol class="st-steps">
          {#each STEPS as [head, rest], i (head)}
            <li><span>{String(i + 1).padStart(2, '0')}</span><p><b>{head}</b> {rest}</p></li>
          {/each}
        </ol>
      </div>
      <div>
        <h3>Pour chaque occasion</h3>
        <ul class="st-occasions">
          {#each OCCASIONS as [slug, label] (slug)}
            <li><a href="/blind-test/{slug}">{label}</a></li>
          {/each}
          <li><a href="/blind-test">Tous les thèmes</a></li>
        </ul>
      </div>
    </div>

    <h3>Questions fréquentes</h3>
    <div class="st-faq">
      {#each FAQ_GROUPS as g (g.title)}
        <div class="st-faq-group">
          <p class="st-faq-title">{g.title}</p>
          {#each g.items as { q, a } (q)}
            <details>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          {/each}
        </div>
      {/each}
    </div>
  </section>
</div>

{#if authReady}
  <div class="st-bar">
    <div class="st-bar-in">
      <p class="st-recap">
        <b>{selectedIds.length}</b> playlist{selectedIds.length > 1 ? 's' : ''}
        <i>·</i><b>{totalTrackCount}</b> titres
        <i>·</i><b>{maxRounds}</b> manches
      </p>
      {#if error}<p class="st-error">{error}</p>{/if}
      <button class="st-go" onclick={createSalon} disabled={creating || selectedIds.length === 0}>
        {creating ? 'Ouverture…' : 'Ouvrir le salon'}
      </button>
    </div>
  </div>
{/if}

{#if upsell}<ProUpsell feature={upsell} onClose={() => (upsell = null)} />{/if}

<AuthModal {sb} open={authOpen} bind:view={authView} onClose={() => (authOpen = false)} onSuccess={() => (authOpen = false)} />

<style>
  .st {
    max-width: 1040px;
    margin: 0 auto;
    padding: 22px 24px 140px;
  }
  .st-top { display: flex; justify-content: space-between; align-items: center; }
  .st-top-link {
    font-size: 0.85rem;
    color: var(--mid);
    text-decoration: none;
  }
  .st-top-link:hover { color: var(--text); }
  .st-top-join b { color: var(--text); font-weight: 600; border-bottom: 1px solid currentColor; }

  .st-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 24px 48px;
    padding: 56px 0 44px;
    border-bottom: 2px solid var(--text);
  }
  .st-kicker {
    grid-column: 1 / -1;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(3rem, 9vw, 6.4rem);
    line-height: 0.86;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  h1 em { font-style: normal; color: var(--accent); }
  .st-how {
    list-style: none;
    counter-reset: how;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 8px;
  }
  .st-how li {
    counter-increment: how;
    font-size: 0.95rem;
    color: var(--mid);
  }
  .st-how li::before {
    content: counter(how);
    display: inline-block;
    width: 22px;
    font-family: var(--s-mono);
    font-size: 0.75rem;
    color: var(--dim);
  }
  .st-how b { color: var(--text); font-weight: 600; }

  .st-loading { padding: 40px 0; color: var(--mid); }

  .st-block {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 24px;
    padding: 40px 0;
    border-bottom: 1px solid var(--border);
  }
  .st-block h2 {
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 1.6rem;
    text-transform: uppercase;
    line-height: 1;
  }
  .st-block h2 span {
    display: block;
    margin-bottom: 8px;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--dim);
  }

  .st-sheet { display: flex; flex-direction: column; }
  .st-sheet > div {
    display: grid;
    grid-template-columns: 180px 1fr;
    align-items: center;
    gap: 12px 20px;
    padding: 14px 0;
    border-bottom: 1px dashed var(--border);
  }
  .st-sheet > div:first-child { padding-top: 0; }
  .st-sheet > div:last-child { border-bottom: 0; }
  .st-sheet dt { font-size: 0.9rem; color: var(--mid); }

  .st-seg {
    display: inline-flex;
    flex-wrap: wrap;
    border: 1px solid var(--border2);
    border-radius: 3px;
  }
  .st-seg button {
    min-width: 58px;
    padding: 9px 14px;
    background: none;
    border: 0;
    border-right: 1px solid var(--border2);
    color: var(--text);
    font: inherit;
    font-family: var(--s-mono);
    font-size: 0.82rem;
    cursor: pointer;
  }
  .st-seg button:last-child { border-right: 0; }
  .st-seg button:hover:not(.on) { background: var(--surface2); }
  .st-seg button.on { background: var(--text); color: var(--bg); }
  .st-seg-wide button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 10px 16px;
    font-family: inherit;
    font-weight: 600;
    text-align: left;
  }
  .st-seg-wide small { font-weight: 400; font-size: 0.74rem; opacity: 0.65; }

  .st-seo {
    margin-top: 56px;
    padding-top: 36px;
    border-top: 2px solid var(--text);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .st-seo h2 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.8rem;
    text-transform: uppercase;
  }
  .st-seo h3 {
    margin: 14px 0 10px;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .st-seo-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 40px;
  }
  .st-steps { display: flex; flex-direction: column; gap: 12px; list-style: none; }
  .st-steps li { display: flex; gap: 14px; }
  .st-steps span { font-family: var(--s-mono); font-size: 0.8rem; color: var(--accent); padding-top: 2px; }
  .st-steps p { font-size: 0.92rem; color: var(--mid); line-height: 1.55; }
  .st-steps b { color: var(--text); font-weight: 600; }
  .st-occasions { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; }
  .st-occasions a {
    display: inline-block;
    padding: 7px 12px;
    border: 1px solid var(--border2);
    border-radius: 3px;
    font-size: 0.88rem;
    color: var(--text);
    text-decoration: none;
  }
  .st-occasions a:hover { border-color: var(--text); }

  .st-faq {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    align-items: start;
  }
  .st-faq-title {
    padding-bottom: 8px;
    border-bottom: 2px solid var(--text);
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.1rem;
    text-transform: uppercase;
  }
  .st-faq details { border-bottom: 1px solid var(--border); }
  .st-faq summary {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }
  .st-faq summary::-webkit-details-marker { display: none; }
  .st-faq summary::after {
    content: '+';
    flex: none;
    font-family: var(--s-mono);
    color: var(--accent);
    transition: transform 0.2s;
  }
  .st-faq details[open] summary::after { transform: rotate(45deg); }
  .st-faq summary:hover { color: var(--accent); }
  .st-faq details p {
    padding: 0 0 14px;
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.6;
  }
  .st-pro-note { padding-top: 28px; font-size: 0.85rem; color: var(--mid); }
  .st-pro-note a, .st-pro-note b { color: var(--text); text-underline-offset: 3px; }
  .st-pro-manage { margin-left: 6px; padding: 0; background: none; border: none; font: inherit; color: var(--accent); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .st-seg button.st-pro:not(.on) { color: var(--dim); }
  .st-seg button.st-pro::after { content: ' ●'; color: var(--accent); font-size: 0.6rem; }

  .st-bar {
    position: fixed;
    inset: auto 0 0;
    z-index: 10;
    background: var(--bg);
    border-top: 2px solid var(--text);
  }
  .st-bar-in {
    max-width: 1040px;
    margin: 0 auto;
    padding: 14px 24px calc(14px + env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .st-recap { font-size: 0.9rem; color: var(--mid); }
  .st-recap b { font-family: var(--s-mono); color: var(--text); font-weight: 600; }
  .st-recap i { font-style: normal; margin: 0 8px; color: var(--dim); }
  .st-error { color: var(--danger); font-size: 0.85rem; }
  .st-go {
    margin-left: auto;
    padding: 15px 30px;
    background: var(--accent);
    color: var(--on-accent);
    border: 0;
    border-radius: 3px;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.15rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: 4px 4px 0 var(--text);
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .st-go:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--text); }
  .st-go:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--text); }
  .st-go:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

  @media (max-width: 760px) {
    .st { padding: 16px 16px 150px; }
    .st-hero { grid-template-columns: 1fr; padding: 36px 0 30px; }
    .st-block { grid-template-columns: 1fr; gap: 18px; padding: 30px 0; }
    .st-block h2 span { display: inline; margin: 0 10px 0 0; }
    .st-sheet > div { grid-template-columns: 1fr; gap: 8px; }
    .st-seo-grid, .st-faq { grid-template-columns: 1fr; gap: 24px; }
    .st-bar-in { flex-wrap: wrap; gap: 10px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
    .st-go { width: 100%; margin-left: 0; }
  }
</style>
