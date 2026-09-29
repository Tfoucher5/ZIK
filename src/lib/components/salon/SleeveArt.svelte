<script>
  // Motif de pochette propre à chaque playlist officielle, tracé à plat en
  // noir sur la couleur de la pochette. Une playlist inconnue n'a pas de motif.
  let { id } = $props();

  const ART = {
    // Années 1970 : boule à facettes
    'c2ed2b7f-bacf-46aa-a48f-bbaecd68b763': 'disco',
    // Années 1980-1990 : soleil couchant rayé
    'cece7dc8-5f26-42e0-b5f4-793504ade387': 'sunset',
    // Années 2000 : CD
    '9a291b3d-bb06-4b5e-a5c0-260405900deb': 'cd',
    // Rap FR : micro
    '6e9ccdc8-1257-4977-8ad3-9e4db3691cdd': 'mic',
    // Rap US : couronne
    '7ae776b5-8fa7-4966-8150-8bb3b84a7544': 'crown',
    // Rock / Metal : éclair
    '122c8f5b-3232-49a5-97bb-861144a8b953': 'bolt',
    // Chanson française : guirlande de guinguette
    '09a2742e-121d-4b99-8e94-290b7f4b5eb4': 'lights',
    // Techno : onde
    '5b750720-117b-4ece-bb2d-a9131e930842': 'wave',
    // Musiques de films : pellicule
    'c09cab38-a21e-4589-b5d5-3a0799dad001': 'film',
    // Disney : château
    'ea9c3f7d-36aa-402d-be11-24ad09bab2b1': 'castle',
  };

  let art = $derived(ART[id]);
</script>

{#if art}
  <svg class="sleeve-art" viewBox="0 0 100 68" preserveAspectRatio="xMaxYMid meet" aria-hidden="true">
    {#if art === 'disco'}
      <circle cx="66" cy="34" r="24" />
      <g class="cut">
        {#each [18, 26, 34, 42, 50] as y (y)}<line x1="40" y1={y} x2="92" y2={y} />{/each}
        {#each [50, 58, 66, 74, 82] as x (x)}<line x1={x} y1="8" x2={x} y2="60" />{/each}
      </g>
      <line class="thin" x1="66" y1="0" x2="66" y2="10" />
    {:else if art === 'sunset'}
      <clipPath id="sun"><circle cx="64" cy="46" r="28" /></clipPath>
      <g clip-path="url(#sun)">
        {#each [[18, 10], [30, 7], [39, 5], [46, 4], [52, 3], [57, 2]] as [y, h] (y)}<rect x="30" y={y} width="70" height={h} />{/each}
      </g>
    {:else if art === 'cd'}
      <circle cx="64" cy="36" r="27" />
      <circle class="hole" cx="64" cy="36" r="7" />
      <path class="cut" d="M64 14 A22 22 0 0 1 86 36" />
    {:else if art === 'mic'}
      <rect x="54" y="8" width="22" height="34" rx="11" />
      <path class="stroke" d="M48 32 v4 a17 17 0 0 0 34 0 v-4 M65 53 v10 M55 63 h20" />
    {:else if art === 'crown'}
      <path d="M40 48 L44 18 L55 34 L65 12 L75 34 L86 18 L90 48 Z" />
      <rect x="40" y="52" width="50" height="6" />
    {:else if art === 'bolt'}
      <path d="M72 4 L44 42 H62 L52 70 L86 28 H68 Z" />
    {:else if art === 'lights'}
      <path class="stroke" d="M0 14 Q50 44 100 14" />
      {#each [[12, 20], [30, 28], [50, 31], [70, 28], [88, 20]] as [x, y] (x)}<circle cx={x} cy={y + 6} r="5" />{/each}
    {:else if art === 'wave'}
      {#each [4, 10, 18, 30, 44, 30, 22, 38, 50, 34, 20, 12, 6] as h, i (i)}<rect x={36 + i * 5} y={32 - h / 2} width="3" height={h} />{/each}
    {:else if art === 'film'}
      <rect x="50" y="0" width="34" height="56" />
      <g class="hole">
        {#each [4, 14, 24, 34, 44] as y (y)}<rect x="53" y={y} width="5" height="6" /><rect x="76" y={y} width="5" height="6" />{/each}
        <rect x="61" y="6" width="12" height="18" /><rect x="61" y="30" width="12" height="18" />
      </g>
    {:else if art === 'castle'}
      <path d="M44 60 V30 h6 v-6 h4 v6 h4 V18 L63 8 L68 18 v12 h4 v-6 h4 v6 h6 v30 H70 V48 a7 7 0 0 0 -14 0 V60 Z" />
      <path class="star" d="M34 12 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" />
      <path class="star" d="M90 6 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1 Z" />
    {/if}
  </svg>
{/if}

<style>
  .sleeve-art {
    flex: 1 1 0;
    min-height: 0;
    width: 100%;
    margin-bottom: 6px;
    fill: #111;
    pointer-events: none;
  }
  .cut, .cut line, .cut path {
    fill: none;
    stroke: var(--sleeve);
    stroke-width: 2;
  }
  .hole, .hole rect {
    fill: var(--sleeve);
  }
  .stroke, .thin {
    fill: none;
    stroke: #111;
    stroke-width: 4;
    stroke-linecap: round;
  }
  .thin {
    stroke-width: 1.5;
  }
  .star {
    fill: #111;
  }
</style>
