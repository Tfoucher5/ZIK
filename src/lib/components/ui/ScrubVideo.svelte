<script>
  import { scrub } from '#lib/components/ui/scrub.js';

  /**
   * @type {{
   *   sources: { portrait?: string, paysage?: string },
   *   poster: { portrait?: string, paysage: string },
   *   alt?: string,
   *   len?: number,
   *   priority?: boolean,
   *   onprogress?: (p: number) => void,
   *   children?: import('svelte').Snippet,
   * }}
   */
  let { sources, poster, alt = '', len = 6, priority = false, onprogress, children } = $props();

  let host;
  let video;
  let pret = $state(false);

  $effect(() => {
    const html = document.documentElement.classList;
    const calme =
      matchMedia('(prefers-reduced-motion: reduce)').matches || html.contains('rm') || html.contains('no-animations');
    if (calme) return;
    return scrub(host, video, { sources, onprogress: (p) => onprogress?.(p) });
  });
</script>

<div class="scene" bind:this={host} style:--len={len}>
  <div class="sticky">
    <picture>
      {#if poster.portrait}<source media="(orientation: portrait)" srcset={poster.portrait} />{/if}
      <img
        src={poster.paysage}
        {alt}
        decoding="async"
        fetchpriority={priority ? 'high' : undefined}
        loading={priority ? undefined : 'lazy'}
      />
    </picture>
    <video bind:this={video} class:pret muted playsinline preload="none" aria-hidden="true" onloadeddata={() => (pret = true)}></video>
    {@render children?.()}
  </div>
</div>

<style>
  .scene {
    position: relative;
    height: calc(var(--len) * 100svh);
  }
  .sticky {
    position: sticky;
    top: 0;
    height: 100svh;
    overflow: hidden;
  }
  img,
  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  video {
    opacity: 0;
    transition: opacity 0.4s;
  }
  video.pret {
    opacity: 1;
  }
  :global(html.rm) .scene,
  :global(html.rm) .sticky {
    height: auto;
    position: static;
  }
  :global(html.rm) img {
    position: static;
    height: auto;
  }
  :global(html.rm) video {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .scene,
    .sticky {
      height: auto;
      position: static;
    }
    img {
      position: static;
      height: auto;
    }
    video {
      display: none;
    }
  }
</style>
