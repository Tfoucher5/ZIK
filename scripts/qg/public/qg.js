import { majEquipe } from "./equipe.js";
import { majChrono } from "./chrono.js";
import { majTableau } from "./tableau.js";

const $ = (id) => document.getElementById(id);
const flux = new EventSource("/flux");
flux.onopen = () => $("live").classList.add("ok");
flux.onerror = () => {
  $("live").classList.remove("ok");
  $("horloge").textContent = "serveur arrêté ?";
};
let n = 0;
flux.onmessage = (e) => {
  const etat = JSON.parse(e.data);
  $("horloge").textContent = new Date(etat.maintenant).toLocaleTimeString(
    "fr-FR",
  );
  const instances = majEquipe(etat);
  majTableau(etat, instances);
  if (n++ % 2 === 0) majChrono(etat, instances);
};
