<script>
  import { dicebear } from '$lib/utils.js';
  let { url = null, username, size = 40 } = $props();
  const src = $derived(url || dicebear(username || '?'));
</script>

<img
  {src}
  alt={username}
  width={size}
  height={size}
  class="avatar"
  style="width:{size}px;height:{size}px"
/>

<style>
  .avatar {
    border-radius: 50%;
    object-fit: cover;
    display: block;
    flex-shrink: 0;
  }
</style>
