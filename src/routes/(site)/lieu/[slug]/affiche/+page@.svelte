<script>
  import { venueTheme } from '$lib/venues.js';

  let { data } = $props();
  const v = $derived(data.venue);
  const link = $derived(`https://www.zik-music.fr/lieu/${v.slug}`);
  const qr = $derived(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(link)}`);

  const STEPS = [
    ['Scannez', 'le code affiché sur l\'écran'],
    ['Répondez', 'sur votre téléphone, sans appli'],
    ['Grimpez', 'au classement du mois'],
  ];
</script>

<svelte:head>
  <title>Affiche blind test - {v.name}</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="/css/fonts.css?v=3.0.0" />
</svelte:head>

<div class="sheet">
<div class="tools">
  <button onclick={() => window.print()}>Imprimer l'affiche</button>
  <a href="/lieu/{v.slug}">Retour à la page du lieu</a>
</div>

<article class="poster" style={venueTheme(v.color || '#ff00ff')}>
  <header class="band">
    {#if v.logo}<img class="logo" src={v.logo} alt="" />{/if}
    <p class="at">{v.name}<span>{v.city}</span></p>
  </header>

  <div class="body">
    <h1>Soirée<br /><em>blind test</em></h1>
    {#if v.schedule}<p class="when">{v.schedule}</p>{/if}
    <p class="how">Venez à plusieurs : la musique passe sur l'écran, chacun répond sur son téléphone.</p>

    <ol class="steps">
      {#each STEPS as [t, d], i (t)}
        <li><b>{i + 1}</b><span><strong>{t}</strong> {d}</span></li>
      {/each}
    </ol>

    <div class="scan">
      <img src={qr} alt="QR code vers {link}" width="300" height="300" />
      <div>
        <p class="scan-t">Prochaines dates et classement du mois</p>
        <p class="scan-u">zik-music.fr/lieu/{v.slug}</p>
      </div>
    </div>
  </div>

  <footer class="foot">Blind test animé avec <b>ZIK</b> · zik-music.fr</footer>
</article>
</div>

<style>
  :global(html body) { margin: 0; }
  .sheet { min-height: 100vh; overflow: auto; background: #e5e5e5; color: #000; font-family: "Barlow", system-ui, sans-serif; }
  .tools { display: flex; gap: 16px; justify-content: center; align-items: center; padding: 16px; }
  .tools button { padding: 10px 18px; font: inherit; font-weight: 700; background: #000; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
  .tools a { color: #000; }
  .poster {
    box-sizing: border-box;
    width: 210mm;
    height: 297mm;
    margin: 0 auto 32px;
    background: #fff;
    color: #000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .band {
    display: flex;
    align-items: center;
    gap: 8mm;
    padding: 10mm 16mm;
    background: var(--accent);
    color: var(--on-accent);
  }
  .logo { height: 26mm; max-width: 60mm; padding: 3mm; border-radius: 4mm; background: #fff; object-fit: contain; }
  .at { margin: 0; display: flex; flex-direction: column; font-family: "Barlow Condensed", sans-serif; font-size: 30pt; font-weight: 900; line-height: 1; text-transform: uppercase; }
  .at span { margin-top: 2mm; font-family: "JetBrains Mono", monospace; font-size: 11pt; font-weight: 500; letter-spacing: 0.2em; opacity: 0.8; }
  .body { flex: 1; display: flex; flex-direction: column; padding: 11mm 16mm 0; }
  h1 { margin: 0; font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 72pt; line-height: 0.84; text-transform: uppercase; letter-spacing: -0.01em; }
  h1 em { font-style: normal; color: var(--accent); }
  .when {
    align-self: flex-start;
    margin: 8mm 0 0;
    padding: 2.5mm 6mm;
    border-radius: 3mm;
    background: #000;
    color: #fff;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 22pt;
    font-weight: 800;
    text-transform: uppercase;
  }
  .how { margin: 6mm 0 0; font-size: 14pt; line-height: 1.45; max-width: 150mm; }
  .steps { list-style: none; margin: 8mm 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
  .steps li { display: flex; flex-direction: column; gap: 3mm; padding: 5mm; border: 0.6mm solid #000; border-radius: 4mm; font-size: 11.5pt; line-height: 1.35; }
  .steps b {
    display: grid;
    place-items: center;
    width: 10mm;
    height: 10mm;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 16pt;
    font-weight: 900;
  }
  .steps strong { display: block; font-size: 14pt; text-transform: uppercase; font-family: "Barlow Condensed", sans-serif; font-weight: 900; }
  .scan { display: flex; align-items: center; gap: 10mm; margin: auto 0 8mm; padding: 6mm; border-radius: 5mm; background: #f2f2f2; }
  .scan img { flex: none; width: 46mm; height: 46mm; padding: 3mm; background: #fff; border-radius: 3mm; }
  .scan-t { margin: 0; font-family: "Barlow Condensed", sans-serif; font-size: 24pt; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
  .scan-u { margin: 4mm 0 0; font-family: "JetBrains Mono", monospace; font-size: 11pt; }
  .foot { padding: 5mm 16mm; border-top: 0.4mm solid #ddd; font-size: 10pt; color: #555; text-align: center; }
  @media screen and (max-width: 820px) {
    .poster { width: auto; height: auto; margin: 0 16px 32px; }
    .band, .body { padding-left: 18px; padding-right: 18px; }
    h1 { font-size: 54pt; }
    .steps { grid-template-columns: 1fr; }
    .scan { flex-direction: column; text-align: center; }
  }
  @media print {
    @page { size: A4; margin: 0; }
    .sheet { background: #fff; }
    .tools { display: none; }
    .poster { margin: 0; }
  }
</style>
