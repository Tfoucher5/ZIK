<script>
  import ProCtaLink from './ProCtaLink.svelte';
</script>

<div class="pro-cta">
  <p>
    Le plus simple reste d'essayer : montez un salon en trente secondes,
    sans inscription et sans engagement.
  </p>
  <ProCtaLink href="/salon">Créer un salon</ProCtaLink>
  <p class="pro-contact">
    Une question, un besoin particulier ou l'envie d'un visuel pour votre
    établissement ? Écrivez à
    <a href="mailto:theo@zik-music.fr">theo@zik-music.fr</a>.
  </p>
</div>

<style>
  .pro-cta {
    margin-top: 48px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
  }
  .pro-cta p {
    font-size: 0.92rem;
    color: var(--mid);
    margin-bottom: 16px;
    line-height: 1.7;
  }
  .pro-contact {
    margin: 18px 0 0;
    font-size: 0.85rem;
  }
  .pro-contact a {
    color: var(--accent);
  }
</style>
