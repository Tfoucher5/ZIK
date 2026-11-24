<script>
  import { onMount, untrack } from 'svelte';
  import GuestModal from '#lib/components/auth/GuestModal.svelte';
  import HeroSection from './HeroSection.svelte';
  import TodayStrip from './TodayStrip.svelte';
  import RoomsWall from './RoomsWall.svelte';
  import TicketSection from './TicketSection.svelte';
  import Features from './Features.svelte';
  import TopPlayers from './TopPlayers.svelte';
  import NewsTeaser from './NewsTeaser.svelte';
  import Faq from './Faq.svelte';
  import { HomeState } from './home.svelte.js';

  let { data } = $props();

  const home = new HomeState(untrack(() => data));
  const weeklyChallenge = $derived(data.weeklyChallenge?.active ? data.weeklyChallenge : null);

  onMount(() => home.start());
</script>

<HeroSection online={home.totalOnline} gamesMonth={home.globalStats.gamesMonth} userCount={home.globalStats.users} />
<TodayStrip challenge={weeklyChallenge} onResume={(room) => home.joinRoom(room.id, room.gameMode)} />
<RoomsWall {home} />
<TicketSection {home} />
<Features />
<TopPlayers players={data.eloLb ?? []} />
<NewsTeaser />
<Faq />

<GuestModal open={home.guestOpen} onClose={() => home.guestOpen = false} onConfirm={home.confirmGuest} />
