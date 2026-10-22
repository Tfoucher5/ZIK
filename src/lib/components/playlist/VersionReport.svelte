<script>
  import { getContext } from 'svelte';
  import { toast } from '$lib/client/toast.svelte.js';
  import { MIN_REPORT_MESSAGE } from '$lib/shared/reports/bug-report.js';

  let { track, trackId, videoId, onDone } = $props();

  const _ctx = getContext('zik');
  let message = $state('');
  let sending = $state(false);

  const tooShort = $derived(message.trim().length < MIN_REPORT_MESSAGE);

  async function send() {
    if (tooShort || sending) return;
    sending = true;
    try {
      const r = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'bug',
          subject: 'audio',
          message: `[Mauvaise version] ${track.artist} - ${track.title} : ${message.trim()}`,
          reporter_id: _ctx.user?.id ?? null,
          reporter_name: _ctx.user?.profile?.username ?? null,
          metadata: { tracks: [{ trackId, videoId }], context: { from: 'playlist-version' } },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      toast('Merci, on vérifie cette version.', 'success');
      onDone();
    } catch (e) { toast(e.message, 'error'); }
    sending = false;
  }
</script>

<div class="vreport">
  <label for="vreport-msg">Quelle version attendais-tu ? Un lien YouTube aide beaucoup.</label>
  <textarea id="vreport-msg" class="input-glass" rows="3" maxlength="500" bind:value={message}
    placeholder="Ex : c'est un remix, l'original est https://youtu.be/..."></textarea>
  <button class="btn-ghost sm" onclick={send} disabled={tooShort || sending}>{sending ? '...' : 'Envoyer le signalement'}</button>
</div>

<style>
  .vreport { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .vreport label { font-size: 0.78rem; color: var(--mid); }
  .vreport textarea { resize: vertical; min-height: 72px; font: inherit; }
  .vreport button { align-self: flex-start; min-height: 44px; }
</style>
