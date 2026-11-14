<script>
  import HomeSeo from '$lib/components/home/HomeSeo.svelte';
  import OnlineHome from '$lib/components/home/OnlineHome.svelte';

  let { data } = $props();
</script>

<HomeSeo />
<OnlineHome {data} />
