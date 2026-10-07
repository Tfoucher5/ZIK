import { getAdminClient } from "../config.js";
import { firstTime, pushToAll } from "./push.js";
import {
  getOrCreateWeeklyChallenge,
  getWeeklyChallengeArchives,
} from "./weeklyChallenge.js";

// Notifications d'appareil planifiées (heure de Paris). Lancé par server.js
// seulement : en dev, la base est celle de la prod et ces envois partiraient
// vers les vrais joueurs. Chaque envoi a une clé dans notification_once, il ne
// part qu'une fois même si le serveur redémarre.

const TICK_MS = 5 * 60_000;
// Fenêtre d'envoi : un serveur redémarré tard ne réveille personne la nuit
const WINDOW_H = 3;

function parisNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: parts.weekday,
  };
}

const inWindow = (hour, start) => hour >= start && hour < start + WINDOW_H;

async function challengeStart(now) {
  const challenge = await getOrCreateWeeklyChallenge();
  if (
    !challenge ||
    !(await firstTime(`challenge_start:${challenge.week_start}`))
  )
    return;
  const [last] = await getWeeklyChallengeArchives(1);
  const recap = last
    ? last.status === "success"
      ? "Défi de la semaine dernière réussi, bravo ! "
      : "Défi de la semaine dernière raté de peu. "
    : "";
  await pushToAll("challenge", {
    tag: `challenge:${challenge.week_start}`,
    title: "Nouveau défi de la semaine",
    body: `${recap}Cette semaine : ${challenge.target.toLocaleString("fr-FR")} ${challenge.unit} à atteindre ensemble.`,
    url: "/defi",
  });
  console.log(`[push] défi de la semaine envoyé (${now.date})`);
}

async function challengeLastDay() {
  const challenge = await getOrCreateWeeklyChallenge();
  if (
    !challenge ||
    !(await firstTime(`challenge_last_day:${challenge.week_start}`))
  )
    return;
  const left = challenge.target - challenge.current_value;
  await pushToAll("challenge", {
    tag: `challenge:${challenge.week_start}`,
    title: left > 0 ? "Dernier jour du défi" : "Défi réussi 🎉",
    body:
      left > 0
        ? `Il manque ${left.toLocaleString("fr-FR")} ${challenge.unit} avant ce soir minuit. Chaque partie compte !`
        : `${challenge.target.toLocaleString("fr-FR")} ${challenge.unit} atteints cette semaine. Merci à tous !`,
    url: "/defi",
  });
}

async function zikleReminder(now) {
  if (!(await firstTime(`zikle_reminder:${now.date}`))) return;
  const { data: played } = await getAdminClient()
    .from("daily_results")
    .select("user_id")
    .eq("date", now.date);
  await pushToAll(
    "zikle",
    {
      tag: `zikle:${now.date}`,
      title: "Le Zikle du jour t'attend",
      body: "Une chanson à deviner en 6 essais. Tu la trouves ?",
      url: "/zikle",
    },
    { skip: new Set((played ?? []).map((p) => p.user_id)) },
  );
}

async function tick() {
  const now = parisNow();
  const jobs = [];
  if (now.weekday === "Mon" && inWindow(now.hour, 9))
    jobs.push(challengeStart(now));
  if (now.weekday === "Sun" && inWindow(now.hour, 18))
    jobs.push(challengeLastDay());
  if (inWindow(now.hour, 18)) jobs.push(zikleReminder(now));
  const results = await Promise.allSettled(jobs);
  for (const r of results)
    if (r.status === "rejected")
      console.error("[push] envoi planifié :", r.reason?.message);
}

export function startPushSchedule() {
  setTimeout(tick, 90_000);
  setInterval(tick, TICK_MS);
}
