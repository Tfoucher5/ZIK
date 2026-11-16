<script>
  import RegieEvening from './RegieEvening.svelte';
  import CloseEvening from './CloseEvening.svelte';
  import { finTete, encore } from './fin.js';

  /**
   * Onglet Direct entre deux parties : qui a gagné, ce que montre la TV (et
   * le QR en grand), les « Une autre ! » des téléphones, puis la soirée.
   *
   * @type {{ players: any[], teams: any[]|null, rounds: number, night: any,
   *   intermission: any, finale: any, qrBig: boolean, pro: boolean, musique: string, tambour?: boolean,
   *   onSend: (ev: string, payload?: any) => void, onUpsell: (f: string) => void,
   *   onPlaylists: () => void, onClose: () => void }}
   */
  let { players, teams, rounds, night, intermission, finale, qrBig, pro, musique, tambour = true, onSend, onUpsell, onPlaylists, onClose } = $props();

  const t = $derived(finTete({ players, teams, rounds, night, intermission, finale, tambour }));
  const e = $derived(encore(players));
</script>

<p class="rg-k"><b aria-hidden="true">●</b>{t.kicker}{#if finale}<span class="pro-tag">ZIK Pro</span>{/if}</p>
<h1 class="rg-h1">{t.titre}{#if t.sous}<span>{t.sous}</span>{/if}</h1>

<div class="fe-tv">
  <b>Sur la TV</b>{qrBig ? 'Le QR en grand et le code. Toute la salle peut scanner.' : t.tv}
  {#if !finale}
    <button class="fe-qr" type="button" aria-pressed={qrBig} onclick={() => onSend('salon_qr_big', { on: !qrBig })}>
      <svg viewBox="0 0 18 18" aria-hidden="true"><path fill-rule="evenodd" d="M0 0h7v7H0zM2 2v3h3V2zM11 0h7v7h-7zM13 2v3h3V2zM0 11h7v7H0zM2 13v3h3v-3z" /><path d="M11 11h3v3h-3zM15 15h3v3h-3zM15 11h3v2h-3zM11 16h2v2h-2z" /></svg>
      {qrBig ? 'Refermer le QR' : 'Afficher le QR en grand'}
    </button>
  {/if}
</div>

{#if !finale && !intermission && e.n}
  <div class="fe-enc">
    <span>« Une autre ! » : <b>{e.n} sur {e.sur}</b> en redemande{e.n > 1 ? 'nt' : ''}</span>
    <span class="rg-jauge"><i style="--p:{e.p}"></i></span>
  </div>
{/if}

<RegieEvening {pro} {night} {intermission} {finale} {musique} {onSend} {onUpsell} {onPlaylists} />
{#if !finale}<CloseEvening {onClose} />{/if}

<style>
  .rg-k .pro-tag { margin: 0; font-size: 12px; padding: 2px 8px; }
  /* Carte « Sur la TV » : ce que la salle voit en ce moment */
  .fe-tv {
    padding: 10px 14px; border: 1px solid rgb(47 184 255 / 0.4); border-radius: 14px;
    background: rgb(47 184 255 / 0.07); font-size: 15px; line-height: 1.4; color: var(--soft);
  }
  .fe-tv b {
    display: block; font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--bleu);
  }
  .fe-qr {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; min-height: 48px; margin: 12px 0 4px;
    border: 1px solid rgb(47 184 255 / 0.55); border-radius: 999px; background: rgb(47 184 255 / 0.1);
    color: var(--text); font-family: var(--titre); font-weight: 700; font-size: 17px;
    letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer;
    transition: background 0.25s, color 0.25s;
  }
  .fe-qr svg { flex: none; width: 18px; height: 18px; fill: currentColor; }
  .fe-qr[aria-pressed='true'] { border-color: var(--text); background: var(--text); color: #000; }
  .fe-enc { display: grid; gap: 7px; font-size: 15px; line-height: 1.3; color: var(--soft); }
  .fe-enc b { font-weight: 600; color: var(--text); }
</style>
