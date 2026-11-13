// Lit les journaux de Claude Code (~/.claude/projects) et en tire l'état de l'équipe d'agents.

const TARIFS = [
  ["fable-5-2", 8, 40, 0.2],
  ["fable-5", 10, 50, 1],
  ["mythos-5-2", 8, 40, 0.2],
  ["mythos-5", 10, 50, 1],
  ["opus-5-5", 4, 20, 0.2],
  ["opus-5", 5, 25, 0.5],
  ["opus-4", 5, 25, 0.5],
  ["sonnet-5-5", 2, 10, 0.1],
  ["sonnet-5", 2, 10, 0.2],
  ["sonnet-4", 3, 15, 0.3],
  ["haiku-5-5", 0.1, 0.5, 0.01],
  ["haiku-4", 1, 5, 0.1],
];

export function tarif(modele = "") {
  const t = TARIFS.find(([cle]) => modele.includes(cle)) ?? TARIFS[4];
  return { entree: t[1], sortie: t[2], lecture: t[3] };
}

export function cout(modele, u) {
  const t = tarif(modele);
  const ecriture1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const ecriture5m = (u.cache_creation_input_tokens ?? 0) - ecriture1h;
  return (
    ((u.input_tokens ?? 0) * t.entree +
      (u.output_tokens ?? 0) * t.sortie +
      (u.cache_read_input_tokens ?? 0) * t.lecture +
      ecriture5m * t.entree * 1.25 +
      ecriture1h * t.entree * 2) /
    1e6
  );
}

function tokens(u) {
  return (
    (u.input_tokens ?? 0) +
    (u.output_tokens ?? 0) +
    (u.cache_read_input_tokens ?? 0) +
    (u.cache_creation_input_tokens ?? 0)
  );
}

export function jour(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function resumeOutil(nom, entree = {}) {
  const chemin = entree.file_path ?? entree.path;
  const cible = chemin
    ? String(chemin).split(/[\\/]/).slice(-2).join("/")
    : (entree.command ??
      entree.pattern ??
      entree.skill ??
      entree.description ??
      entree.url ??
      entree.query ??
      "");
  const court = String(cible).replace(/\s+/g, " ").trim().slice(0, 70);
  return court ? `${nom} · ${court}` : nom;
}

const COMMANDE = /<command-name>\/?([\w:-]+)<\/command-name>/;

export class Suivi {
  constructor() {
    this.sessions = new Map();
    this.agents = new Map();
    this.lances = new Map();
    this.messages = new Map();
    this.jours = new Map();
    this.flux = [];
  }

  evenement(t, qui, quoi) {
    this.flux.unshift({ t, qui, quoi });
    if (this.flux.length > 80) this.flux.length = 80;
  }

  session(id, o) {
    let s = this.sessions.get(id);
    if (!s) {
      s = {
        id,
        projet: "",
        branche: "",
        skill: null,
        derniere: 0,
        activite: "",
        tokens: 0,
        cout: 0,
        modele: "",
      };
      this.sessions.set(id, s);
    }
    if (o.cwd && !s.projet)
      s.projet = o.cwd.split(/[\\/]/).filter(Boolean).pop();
    if (o.gitBranch) s.branche = o.gitBranch;
    return s;
  }

  agent(agentId, sessionId) {
    let a = this.agents.get(agentId);
    if (!a) {
      a = {
        agentId,
        session: sessionId,
        type: "?",
        description: "",
        debut: 0,
        derniere: 0,
        fini: false,
        activite: "",
        tokens: 0,
        cout: 0,
        modele: "",
      };
      this.agents.set(agentId, a);
    }
    return a;
  }

  meta(agentId, sessionId, m) {
    const a = this.agent(agentId, sessionId);
    const nouveau = a.type === "?";
    a.type = m.agentType ?? a.type;
    a.description = m.description ?? a.description;
    a.fini = Boolean(m.finished);
    if (nouveau && !a.fini)
      this.evenement(
        a.debut || Date.now(),
        a.type,
        `démarre : ${a.description}`,
      );
  }

  usage(cle, porteur, modele, u, t) {
    const avant = this.messages.get(cle);
    const c = cout(modele, u);
    const n = tokens(u);
    const j = jour(t);
    const total = this.jours.get(j) ?? { tokens: 0, cout: 0 };
    if (avant) {
      porteur.tokens -= avant.n;
      porteur.cout -= avant.c;
      total.tokens -= avant.n;
      total.cout -= avant.c;
    }
    porteur.tokens += n;
    porteur.cout += c;
    total.tokens += n;
    total.cout += c;
    this.jours.set(j, total);
    this.messages.set(cle, { n, c });
  }

  ligne(o, agentId = null) {
    if (!o?.sessionId || !o.timestamp) return;
    const t = Date.parse(o.timestamp);
    const s = this.session(o.sessionId, o);
    const porteur = agentId ? this.agent(agentId, o.sessionId) : s;
    if (agentId && !porteur.debut) porteur.debut = t;
    porteur.derniere = Math.max(porteur.derniere, t);
    if (!agentId) s.derniere = Math.max(s.derniere, t);
    const m = o.message;
    if (!m || typeof m !== "object") return;

    if (o.type === "assistant" && m.usage) {
      porteur.modele = m.model ?? porteur.modele;
      this.usage(
        `${o.sessionId}:${m.id ?? o.uuid}`,
        porteur,
        m.model,
        m.usage,
        t,
      );
    }
    if (typeof m.content === "string" && !agentId) {
      const cmd = m.content.match(COMMANDE);
      if (cmd) s.skill = cmd[1];
    }
    if (!Array.isArray(m.content)) return;
    for (const b of m.content) {
      if (b.type === "tool_use") {
        porteur.activite = resumeOutil(b.name, b.input);
        if (b.name === "Skill" && !agentId) {
          s.skill = b.input?.skill ?? s.skill;
          this.evenement(t, "CEO", `active /${s.skill}`);
        } else if ((b.name === "Agent" || b.name === "Task") && !agentId) {
          const type = b.input?.subagent_type ?? "general-purpose";
          this.lances.set(b.id, {
            type,
            description: b.input?.description ?? "",
            session: o.sessionId,
            t,
            fini: false,
          });
          this.evenement(
            t,
            s.skill ? `/${s.skill}` : "CEO",
            `lance ${type} : ${b.input?.description ?? ""}`,
          );
        } else {
          this.evenement(t, agentId ? porteur.type : "CEO", porteur.activite);
        }
      } else if (b.type === "tool_result" && this.lances.has(b.tool_use_id)) {
        const l = this.lances.get(b.tool_use_id);
        const r = o.toolUseResult;
        if (r?.agentId) {
          const a = this.agent(r.agentId, o.sessionId);
          a.type = r.agentType ?? l.type;
          a.description ||= l.description;
          if (r.status === "completed") {
            a.fini = true;
            this.evenement(t, a.type, "a terminé");
          }
        }
        l.fini = r?.status !== "async_launched";
      }
    }
  }

  instantane(maintenant = Date.now()) {
    const actifSi = (d, ms) => maintenant - d < ms;
    const agents = [...this.agents.values()].map((a) => ({
      ...a,
      actif: !a.fini && actifSi(a.derniere || a.debut, 10 * 60e3),
    }));
    const lancesEnAttente = [...this.lances.values()].filter(
      (l) =>
        !l.fini &&
        actifSi(l.t, 60e3) &&
        !agents.some((a) => a.actif && a.type === l.type),
    );
    const sessions = [...this.sessions.values()]
      .map((s) => ({ ...s, actif: actifSi(s.derniere, 45e3) }))
      .sort((a, b) => b.derniere - a.derniere);
    const aujourdhui = this.jours.get(jour(maintenant)) ?? {
      tokens: 0,
      cout: 0,
    };
    return {
      maintenant,
      aujourdhui,
      sessions: sessions.slice(0, 12),
      agents: agents.sort((a, b) => b.derniere - a.derniere).slice(0, 200),
      enAttente: lancesEnAttente.map(({ type, description, t }) => ({
        type,
        description,
        t,
      })),
      flux: this.flux.slice(0, 50),
    };
  }
}

export function lireOrganigramme(claudeMd) {
  const debut = claudeMd.indexOf("### L'entreprise d'agents");
  if (debut < 0) return { chefs: [], board: [] };
  const chefs = [];
  let board = [];
  for (const ligne of claudeMd.slice(debut).split("\n")) {
    if (ligne.startsWith("## ")) break;
    const cols = ligne.split("|").map((c) => c.trim());
    if (cols.length < 5 || !cols[2].startsWith("`/")) continue;
    const skill = cols[2].replace(/[`/]/g, "");
    const equipe = [...cols[3].split(";")[0].matchAll(/`([\w*-]+)`/g)].map(
      (m) => m[1],
    );
    if (skill === "board") board = equipe;
    else if (skill === "ceo")
      chefs.unshift({ id: "ceo", nom: cols[1], skill, equipe: [] });
    else chefs.push({ id: skill, nom: cols[1], skill, equipe });
  }
  return { chefs, board };
}
