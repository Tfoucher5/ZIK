<script>
  /**
   * QR code dessiné sur place (uqr) : rien ne part vers un service tiers,
   * ce qui compte pour le QR de la régie, qui contient la clé du salon.
   * Sans `size`, il prend la largeur de son conteneur.
   */
  import { encode } from 'uqr';

  let { text, size = null, label = '' } = $props();

  let qr = $derived(encode(text, { border: 2 }));
  let path = $derived(
    qr.data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join(''),
  );
</script>

<svg
  class="qr"
  viewBox="0 0 {qr.size} {qr.size}"
  width={size}
  height={size}
  shape-rendering="crispEdges"
  role={label ? 'img' : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : 'true'}
>
  <rect width={qr.size} height={qr.size} fill="#fff" />
  <path d={path} fill="#000" />
</svg>

<style>
  .qr {
    display: block;
  }
  .qr:not([width]) {
    width: 100%;
    height: auto;
  }
</style>
