<script>
  import { onDestroy, onMount } from 'svelte';
  import { codeFromQr } from './qrCode.js';

  /** Scanne le QR de la TV dans la page et rend le code du salon. */
  let { onCode } = $props();

  // shortcut: sans BarcodeDetector (iPhone, Firefox) pas de bouton, l'appareil photo du téléphone lit déjà le QR ; ajouter jsQR en repli si des joueurs le demandent
  let supported = $state(false);
  let open = $state(false);
  let error = $state('');
  let video = $state();
  let cancelBtn = $state();
  let stream = null;
  let timer = null;

  onMount(async () => {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) return;
    const formats = await Promise.resolve(window.BarcodeDetector.getSupportedFormats?.()).catch(() => []);
    supported = !formats || formats.includes('qr_code');
  });

  $effect(() => {
    if (open) cancelBtn?.focus();
  });

  function stop() {
    clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    open = false;
  }

  async function start() {
    error = '';
    open = true;
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!open) return stop();
      video.srcObject = stream;
      await video.play();
      const scan = async () => {
        if (!stream) return;
        const found = await detector.detect(video).catch(() => []);
        for (const { rawValue } of found) {
          const code = codeFromQr(rawValue);
          if (code) {
            stop();
            return onCode(code);
          }
          error = "Ce QR code n'est pas celui d'une soirée ZIK.";
        }
        timer = setTimeout(scan, 250);
      };
      scan();
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      error = e?.name === 'NotAllowedError'
        ? "Caméra refusée. Autorise-la dans les réglages du navigateur, ou tape le code."
        : 'Caméra indisponible. Tape le code affiché sur la TV.';
    }
  }

  onDestroy(stop);
</script>

{#if supported}
  <button type="button" class="salon-join-link scan-open" onclick={start}>Scanner le QR code de la TV</button>
{/if}

{#if open}
  <div
    class="scan"
    role="dialog"
    aria-modal="true"
    aria-label="Scanner le QR code de la TV"
    tabindex="-1"
    onkeydown={(e) => { if (e.key === 'Escape') stop(); }}
  >
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} playsinline muted></video>
    <div class="scan-frame" aria-hidden="true"></div>
    <p class="scan-msg" role="status">{error || 'Vise le QR code affiché sur la TV.'}</p>
    <button bind:this={cancelBtn} type="button" class="sx-btn sx-btn-lg" onclick={stop}>Annuler</button>
  </div>
{/if}

<style>
  .scan-open {
    min-height: 44px;
    padding: 10px 12px;
  }
  .scan {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
    background: #000;
  }
  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .scan-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(70vw, 280px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border: 3px solid var(--accent);
    border-radius: 6px;
    box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.45);
  }
  .scan-msg {
    position: relative;
    margin: 0;
    padding: 8px 14px;
    border-radius: 3px;
    background: rgb(0 0 0 / 0.7);
    color: #fff;
    text-align: center;
  }
  .scan .sx-btn {
    position: relative;
    width: 100%;
    max-width: 360px;
  }
</style>
