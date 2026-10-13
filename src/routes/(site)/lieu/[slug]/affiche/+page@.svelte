<script>
  let { data } = $props();
  const v = $derived(data.venue);
  const link = $derived(`https://www.zik-music.fr/lieu/${v.slug}`);
  const qr = $derived(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(link)}`);
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

<article class="poster">
  {#if v.logo}<img class="logo" src={v.logo} alt="" />{/if}
  <p class="at">{v.name} · {v.city}</p>
  <h1>Blind<br />test</h1>
  {#if v.schedule}<p class="when">{v.schedule}</p>{/if}
  <p class="how">Venez à plusieurs, on joue sur son téléphone.<br />Le classement du mois récompense les habitués.</p>
  <div class="scan">
    <img src={qr} alt="QR code vers {link}" width="300" height="300" />
    <p>Scannez pour voir les prochaines dates<br />et le classement du mois</p>
  </div>
  <p class="foot">zik-music.fr/lieu/{v.slug}</p>
</article>
</div>

<style>
  :global(html body) { margin: 0; }
  .sheet { min-height: 100vh; overflow: auto; background: #e5e5e5; color: #000; font-family: "Barlow", system-ui, sans-serif; }
  .tools { display: flex; gap: 16px; justify-content: center; align-items: center; padding: 16px; }
  .tools button { padding: 10px 18px; font: inherit; font-weight: 700; background: #000; color: #fff; border: 0; border-radius: 3px; cursor: pointer; }
  .tools a { color: #000; }
  .poster {
    box-sizing: border-box;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 32px;
    padding: 18mm 16mm;
    background: #fff;
    color: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .logo { max-height: 34mm; max-width: 80mm; object-fit: contain; margin-bottom: 6mm; }
  .at { font-family: "JetBrains Mono", monospace; font-size: 13pt; letter-spacing: 0.15em; text-transform: uppercase; margin: 0; }
  h1 { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 92pt; line-height: 0.82; text-transform: uppercase; margin: 8mm 0; }
  .when { font-family: "Barlow Condensed", sans-serif; font-weight: 800; font-size: 26pt; text-transform: uppercase; margin: 0 0 6mm; padding: 2mm 6mm; background: #ff00ff; }
  .how { font-size: 14pt; line-height: 1.4; margin: 0 0 8mm; }
  .scan { display: flex; flex-direction: column; align-items: center; gap: 4mm; margin-top: auto; }
  .scan img { width: 70mm; height: 70mm; }
  .scan p { font-size: 13pt; font-weight: 700; margin: 0; }
  .foot { margin: 8mm 0 0; font-family: "JetBrains Mono", monospace; font-size: 11pt; }
  @media screen and (max-width: 820px) {
    .poster { width: auto; min-height: 0; margin: 0 16px 32px; padding: 24px 16px; }
    h1 { font-size: 64pt; }
  }
  @media print {
    @page { size: A4; margin: 0; }
    .sheet { background: #fff; }
    .tools { display: none; }
    .poster { margin: 0; }
  }
</style>
