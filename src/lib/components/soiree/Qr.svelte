<script>
  import { QR } from '#lib/components/soiree/soireePins.js';
</script>

<div class="qr">{#each QR as noir, i (i)}<i class:w={!noir}></i>{/each}</div>
