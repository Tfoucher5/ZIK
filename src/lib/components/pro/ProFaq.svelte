<script>
  import Faq from '#lib/components/ui/Faq.svelte';
  import { FAQ } from './proContent.js';
</script>

<section id="faq" class="calm flat" aria-labelledby="pro-faq">
  <div class="wrap in">
    <div class="head rv">
      <span class="label"><i></i>Questions</span>
      <h2 class="grad" id="pro-faq">Vos questions avant de payer</h2>
    </div>
    <Faq items={FAQ} />
  </div>
</section>

<section id="contact" class="calm contact" aria-labelledby="pro-contact">
  <div class="wrap">
    <span class="label"><i></i>Contact</span>
    <h2 class="grad" id="pro-contact">Une question avant de vous lancer ?</h2>
    <p>Un besoin particulier, une grande salle, un visuel ou un QR code à imprimer pour vos tables : écrivez-nous, on répond vite.</p>
    <div class="ctas"><a class="btn-line" href="mailto:theo@zik-music.fr">Écrire un e-mail</a></div>
    <p class="mail">theo@zik-music.fr</p>
  </div>
</section>

<style>
  section.flat {
    padding-top: 0;
  }
  .contact {
    text-align: center;
  }
  .contact h2 {
    margin-top: 14px;
    font-weight: 900;
    font-size: clamp(2.6rem, 11vw, 5.4rem);
  }
  .contact p {
    max-width: 32em;
    margin: 16px auto 0;
    color: var(--muted);
  }
  .contact .ctas {
    justify-content: center;
    margin-top: 26px;
  }
  .contact .mail {
    font-family: var(--mono);
    font-size: 15px;
    color: var(--text);
  }
  @media (min-width: 900px) {
    .in {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      gap: 64px;
      align-items: start;
    }
  }
</style>
