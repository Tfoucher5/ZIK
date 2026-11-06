// Test de charge de ZIK Soirée : de vraies connexions Socket.io jouent des soirées
// complètes (TV, régie, téléphones). La TV ne lit aucun média : elle signale
// seulement que la musique a démarré.
//
// Usage : node scripts/charge-salon.mjs --joueurs 250 [--salons 1] [--manches 5]
//         [--rythme 50] [--url http://localhost:3000]
// Compte Pro de test créé sur le staging avec le .env local. Jamais sur la prod.
//
// Un échec peut venir du réseau du poste de test (ETIMEDOUT, ping timeout) comme
// du serveur : vérifier côté serveur avant de conclure (sonde eventLoop de
// ops.health_checks, journaux HTTP et trafic sortant Railway).

import { monitorEventLoopDelay } from "node:perf_hooks";
import { config } from "dotenv";
import { io } from "socket.io-client";
import {
  assertCibleAutorisee,
  jetonDeTest,
  lireArgs,
  percentile,
  verdict,
} from "./charge-salon-outils.mjs";

const PLAYLIST = "6e9ccdc8-1257-4977-8ad3-9e4db3691cdd";
const ATTENTE_MAX_MS = 10 * 60 * 1000;
const CALME_MAX_MS = 60 * 1000;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function creerSalon(url, jeton, manches) {
  const res = await fetch(`${url}/api/salon`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${jeton}`,
    },
    body: JSON.stringify({
      playlistIds: [PLAYLIST],
      settings: {
        answerMode: "free",
        maxRounds: manches,
        roundDuration: 15,
        showAnswerDuration: 3,
      },
    }),
  });
  const corps = await res.json();
  if (!res.ok) throw new Error(`Création du salon : ${corps.error}`);
  return corps;
}

function connecter(url, m, role) {
  const debut = Date.now();
  const socket = io(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
    timeout: 30000,
  });
  socket.on("disconnect", (raison) => {
    if (m.fin) return;
    if (role !== "téléphone") m.ecranPerdu = true;
    m.coupures.push(
      `${role} après ${Math.round((Date.now() - debut) / 1000)} s : ${raison}`,
    );
  });
  socket.on("connect_error", (e) => {
    if (role !== "téléphone") m.ecranPerdu = true;
    m.erreurs.push(
      `${e.message} : ${e.description?.message ?? e.description ?? "?"}`,
    );
  });
  socket.on("salon_error", (e) => m.erreurs.push(e.message));
  m.sockets.push(socket);
  return socket;
}

// Seul le premier essai est chronométré : le second arrive 350 ms après et
// raccourcirait la mesure quand le serveur ralentit
function jouerManche(socket, m, salon) {
  const ajouter = (guess, delai, chrono) => {
    setTimeout(() => {
      if (salon.phase !== "round") return;
      if (chrono) {
        socket.salonEnvoi = Date.now();
        m.envoyes++;
      }
      socket.emit("salon_submit_guess", { guess });
    }, delai);
  };
  const delai = 1000 + Math.random() * 9000;
  if (Math.random() < 0.4 && salon.reponse) {
    ajouter(salon.reponse.title, delai, true);
    ajouter(salon.reponse.artist, delai + 350, false);
  } else ajouter("zzz qqq", delai, true);
}

function joueur(url, salon, numero, m) {
  const socket = connecter(url, m, "téléphone");
  const debut = Date.now();
  socket.on("salon_round_start", () => {
    salon.phase = "round";
    salon.debutManche ||= Date.now();
    m.diffusion.push(Date.now() - salon.debutManche);
  });
  socket.on("salon_timer_started", () => jouerManche(socket, m, salon));
  socket.on("salon_feedback", () => {
    if (!socket.salonEnvoi) return;
    m.reponses.push(Date.now() - socket.salonEnvoi);
    socket.salonEnvoi = null;
  });
  socket.on("salon_game_over", () => m.finis++);
  socket.once("salon_joined", () => {
    m.rejoints.push(Date.now() - debut);
  });
  socket.once("connect", () =>
    socket.emit("salon_join_player", {
      code: salon.code,
      username: `s${salon.indice}j${numero}`,
    }),
  );
}

async function ouvrirSalon(url, jeton, indice, opts, m) {
  const { code, key } = await creerSalon(url, jeton, opts.manches);
  const salon = { code, indice, phase: "lobby", reponse: null, debutManche: 0 };

  const tv = connecter(url, m, "TV");
  tv.on("salon_round_start", () => {
    salon.debutManche ||= Date.now();
    setTimeout(() => tv.emit("salon_music_ready"), 300);
  });
  tv.once("connect", () => tv.emit("salon_join_host", { code, key }));

  salon.regie = connecter(url, m, "régie");
  salon.regie.on("salon_round_start", ({ hostInfo }) => {
    salon.reponse = hostInfo ?? null;
  });
  salon.regie.on("salon_round_end", () => {
    salon.phase = "summary";
    salon.debutManche = 0;
  });
  salon.regie.on("salon_game_over", ({ scores, rounds }) => {
    m.podiums.push({
      code,
      rounds,
      classes: scores.length,
      points: scores.reduce((n, s) => n + s.score, 0),
    });
  });
  salon.regie.once("connect", () =>
    salon.regie.emit("salon_join_control", { code, key }),
  );
  return salon;
}

function resume(nom, valeurs) {
  const ms = (p) => percentile(valeurs, p) ?? "-";
  return `${nom.padEnd(22)} n=${String(valeurs.length).padEnd(7)} p50=${ms(50)} ms  p95=${ms(95)} ms  max=${ms(100)} ms`;
}

async function principal() {
  config({ quiet: true });
  const opts = lireArgs(process.argv.slice(2));
  const url = assertCibleAutorisee(opts.url, process.env.SUPABASE_URL);

  const m = {
    sockets: [],
    coupures: [],
    erreurs: [],
    rejoints: [],
    diffusion: [],
    reponses: [],
    envoyes: 0,
    podiums: [],
    finis: 0,
    ecranPerdu: false,
    fin: false,
  };
  const lag = monitorEventLoopDelay({ resolution: 20 });
  const lagFenetre = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();
  lagFenetre.enable();

  const jeton = await jetonDeTest();
  const salons = [];
  for (let i = 0; i < opts.salons; i++)
    salons.push(await ouvrirSalon(url, jeton, i, opts, m));
  console.log(`Salons ouverts : ${salons.map((s) => s.code).join(", ")}`);
  const debutTest = Date.now();
  setInterval(() => {
    const t = Math.round((Date.now() - debutTest) / 1000);
    console.log(
      `[${t} s] rejoints ${m.rejoints.length}, manches reçues ${m.diffusion.length}, réponses ${m.reponses.length}, coupures ${m.coupures.length} (${m.coupures.at(-1) ?? "-"}), erreurs ${m.erreurs.length}, générateur max ${Math.round(lagFenetre.max / 1e6)} ms`,
    );
    lagFenetre.reset();
  }, 15000).unref();

  for (let i = 0; i < opts.joueurs; i++) {
    joueur(url, salons[i % salons.length], i, m);
    if ((i + 1) % opts.rythme === 0) await pause(1000);
  }
  const limite = Date.now() + ATTENTE_MAX_MS;
  // Un téléphone sans réponse ne doit pas empêcher de jouer la partie
  let vus = -1;
  let calme = Date.now();
  while (
    m.rejoints.length < opts.joueurs &&
    Date.now() - calme < CALME_MAX_MS
  ) {
    const n = m.rejoints.length + m.erreurs.length + m.coupures.length;
    if (n !== vus) {
      vus = n;
      calme = Date.now();
    }
    if (n >= opts.joueurs) break;
    await pause(500);
  }
  console.log(`Rejoints : ${m.rejoints.length}/${opts.joueurs}`);

  for (const s of salons) s.regie.emit("salon_start");
  while (
    m.podiums.length < salons.length &&
    !m.ecranPerdu &&
    Date.now() < limite
  )
    await pause(500);
  await pause(5000);
  m.fin = true;
  lag.disable();
  lagFenetre.disable();
  for (const s of m.sockets) s.disconnect();

  console.log(resume("Entrée dans le salon", m.rejoints));
  console.log(resume("Début de manche reçu", m.diffusion));
  console.log(resume("Réponse à un essai", m.reponses));
  console.log(`Essais chronométrés : ${m.envoyes}`);
  for (const p of m.podiums)
    console.log(
      `Podium ${p.code} : ${p.rounds} manches, ${p.classes} classés, ${p.points} points`,
    );
  console.log(`Coupures : ${m.coupures.length}, erreurs : ${m.erreurs.length}`);
  if (m.erreurs.length) console.log(`Exemple d'erreur : ${m.erreurs[0]}`);
  for (const c of m.coupures.slice(0, 20)) console.log(`Coupure : ${c}`);
  m.lagMs = Math.round(lag.percentile(99) / 1e6);
  console.log(`Générateur : retard p99 ${m.lagMs} ms`);

  const motifs = verdict(m, opts);
  for (const motif of motifs) console.log(`Motif : ${motif}`);
  const ok = !motifs.length;
  if (m.ecranPerdu)
    console.log("TV ou régie perdue : partie non suivie jusqu'au bout.");
  console.log(ok ? "RÉSULTAT : OK" : "RÉSULTAT : ÉCHEC");
  process.exit(ok ? 0 : 1);
}

principal().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
