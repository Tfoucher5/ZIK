import { majTableau } from "./tableau.js";
import { majBureaux } from "./bureaux.js";

const liaison = document.getElementById("liaison");
const flux = new EventSource("/flux");
flux.onopen = () => {
  liaison.textContent = "en direct";
  liaison.className = "liaison ok";
};
flux.onerror = () => {
  liaison.textContent = "serveur arrêté ?";
  liaison.className = "liaison";
};
flux.onmessage = (e) => {
  const etat = JSON.parse(e.data);
  majBureaux(etat);
  majTableau(etat);
};
