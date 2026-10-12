<script>
  /** @type {{ name: string, hint: string, live?: boolean, reg?: boolean }} */
  let { name, hint, live = false, reg = false } = $props();
</script>

<div class="youline" class:reg>
  <span class="arrow">→</span>
  <span class="txt" class:live>{name}<small>{hint}</small></span>
</div>

<style>
  .youline {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin: 4px -12px 12px;
    border: 1px dashed rgb(var(--accent-rgb) / 0.55); border-radius: var(--r, 5px);
    background: rgb(var(--accent-rgb) / 0.05);
  }
  .youline.reg { margin-top: 10px; }
  .youline .arrow { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; color: var(--accent); font-size: 1.1rem; }
  .youline .txt {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.95rem;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .youline .txt.live { color: var(--accent); }
  .youline .txt small { display: block; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.24em; color: var(--mid); }

  @media (max-height: 620px) {
    .youline { display: none; }
  }
</style>
