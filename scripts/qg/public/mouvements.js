import * as THREE from "three";
import { COULEURS } from "./plan.js";
import { NOMS } from "./disposition.js";
import { fiche } from "./noms.js";

// Ces métiers restent à leur poste ; les autres se réunissent en salle dès qu'ils sont deux du même service.
const AU_POSTE = ["dev", "test-writer", "reviewer", "recette", "incident"];

// Copies d'un agent lancé plusieurs fois : elles sortent de l'ascenseur du Plateau, prennent un poste libre et repartent.
function clones(s, id, n) {
  const svc = s.equipe.service(id);
  const libres = s.equipe.libres(svc);
  const voulus = id === "renforts" ? n : n - 1;
  const asc = s.d.ascenseur;
  for (let i = 0; i < libres.length; i++) {
    const cle = `${id}#${i + 2}`;
    let p = s.persos.get(cle);
    if (i < voulus && !p) {
      p = s.perso(
        cle,
        id === "renforts" ? "renfort" : fiche(id).role,
        COULEURS[svc],
        asc,
      );
      p.siege = libres[i];
      p.temporaire = true;
    }
    if (!p) continue;
    p.voulu = i < voulus;
    p.depart = !p.voulu;
    p.aller(p.voulu ? libres[i] : asc);
  }
}

// Réunions de pôle au Plateau, séance du board à la Direction, chacun reste à son étage.
export function deplacer(s, activite, nb, seance) {
  const multiples = new Set(
    [...nb.keys()].filter((id) => id !== "theo" && id !== "ceo"),
  );
  for (const [id, p] of s.persos)
    if (p.temporaire && id.includes("#")) multiples.add(id.split("#")[0]);
  for (const id of multiples) clones(s, id, nb.get(id) ?? 0);
  const enSeance = new Set(seance);
  const reunions = new Map();
  for (const [id, svc] of Object.entries(s.d.services)) {
    const membres = (s.equipe.modele.equipes[id] ?? []).filter(
      (m) => activite.has(m) && !AU_POSTE.includes(m) && !enSeance.has(m),
    );
    if (membres.length >= 2) {
      reunions.set(id, { salle: svc.salle, membres });
      svc.salle.tele.allumer(
        `Réunion ${NOMS[id]}`,
        membres.map((m) => `${fiche(m).nom} · ${activite.get(m)}`),
      );
    } else svc.salle.tele.eteindre();
  }
  const salleDe = (m) =>
    [...reunions.values()].find((r) => r.membres.includes(m));
  const board = s.dir.board;
  let siege = 0;
  for (const [id, p] of s.persos) {
    const base = id.split("#")[0];
    const texte = activite.get(base);
    const nouveau = p.arrivee > 0;
    const actif = p.temporaire ? p.voulu : texte != null || nouveau;
    if (p.actif && !actif) p.pause = 1 + Math.random() * 4;
    p.etat(actif, texte ?? (nouveau ? "vient d'arriver" : ""));
    const ecran = p.siege.ecran;
    if (p.temporaire) {
      if (ecran) ecran.material.emissiveIntensity = p.voulu ? 0.9 : 0.05;
      continue;
    }
    let but = actif ? p.siege : null;
    const r = salleDe(id);
    const enHaut = p.niveau === "direction";
    if (enSeance.has(id) && actif && enHaut && siege < board.sieges.length)
      but = board.sieges[siege++];
    else if (id === "ceo" && enSeance.size) but = board.debout;
    else if (r) but = r.salle.sieges[r.membres.indexOf(id)];
    else if (texte?.startsWith("pilote ")) {
      const cible = s.persos.get(texte.slice(7).split(" ")[0]);
      if (cible && cible.niveau === p.niveau && !salleDe(cible.id))
        but = {
          place: cible.siege.place.clone().add(new THREE.Vector3(0.7, 0, 0.7)),
          angle: cible.siege.angle + 0.9,
          debout: true,
        };
    }
    if (but) p.aller(but);
    if (ecran)
      ecran.material.emissiveIntensity = actif && but === p.siege ? 0.9 : 0.05;
  }
  if (siege)
    board.tele.allumer(
      "Board en séance",
      seance.map((m) => `${fiche(m).nom} · ${fiche(m).role ?? m}`),
    );
  else board.tele.eteindre();
}
