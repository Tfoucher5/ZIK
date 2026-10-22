<script>
  import { onMount, untrack } from 'svelte';
  import GuestModal from '$lib/components/auth/GuestModal.svelte';
  import HomeSeo from '$lib/components/home/HomeSeo.svelte';
  import HeroSection from '$lib/components/home/HeroSection.svelte';
  import TodayStrip from '$lib/components/home/TodayStrip.svelte';
  import RoomsWall from '$lib/components/home/RoomsWall.svelte';
  import TicketSection from '$lib/components/home/TicketSection.svelte';
  import Features from '$lib/components/home/Features.svelte';
  import TopPlayers from '$lib/components/home/TopPlayers.svelte';
  import NewsTeaser from '$lib/components/home/NewsTeaser.svelte';
  import Faq from '$lib/components/home/Faq.svelte';
  import { HomeState } from '$lib/components/home/home.svelte.js';

  let { data } = $props();

  const home = new HomeState(untrack(() => data));
  const weeklyChallenge = $derived(data.weeklyChallenge?.active ? data.weeklyChallenge : null);

  onMount(() => home.start());
</script>

<HomeSeo />

<HeroSection online={home.totalOnline} gamesMonth={home.globalStats.gamesMonth} userCount={home.globalStats.users} />
<TodayStrip challenge={weeklyChallenge} onResume={(room) => home.joinRoom(room.id, room.gameMode)} />
<RoomsWall {home} />
<TicketSection {home} />
<Features />
<TopPlayers players={data.eloLb ?? []} />
<NewsTeaser />
<Faq />

<GuestModal open={home.guestOpen} onClose={() => home.guestOpen = false} onConfirm={home.confirmGuest} />
