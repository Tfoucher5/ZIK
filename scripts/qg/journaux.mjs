// Lit les journaux de Claude Code (~/.claude/projects) et en tire l'état de l'équipe d'agents.
import { phrase } from "./actions.mjs";

const CINQ_H = 5 * 3600e3;

export function hoteAutorise(hote, port) {
  return hote === `localhost:${port}` || hote === `127.0.0.1:${port}`;
}

// « You've hit your 5-hour limit · resets 9:50pm (Europe/Paris) » : heure locale du PC, prochaine occurrence après t.
const LIMITE = /hit your ([\w-]+) limit · resets ([^\n(<"]+)/;
export function limiteAtteinte(texte, t) {
  const m = String(texte).match(LIMITE);
  if (!m) return null;
  const fenetre = m[1] === "5-hour" ? "cinq" : "semaine";
  const h = m[2].trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i);
  if (!h) return { fenetre, t, texte: m[2].trim(), resetsAt: null };
  const d = new Date(t);
  d.setHours(
    (Number(h[1]) % 12) + (/pm/i.test(h[3]) ? 12 : 0),
    Number(h[2] ?? 0),
    0,
    0,
  );
  if (d.getTime() <= t) d.setDate(d.getDate() + 1);
  return { fenetre, t, texte: m[2].trim(), resetsAt: d.getTime() };
}

// Fenêtre de 5 h : ouverte par le premier message après la fin de la précédente. Estimation : seules les sessions suivies comptent.
export function fenetreEstimee(horaires, atteinte, maintenant) {
  if (atteinte?.resetsAt > maintenant) {
    const debut =
      atteinte.fenetre === "cinq" ? atteinte.resetsAt - CINQ_H : null;
    return { debut, fin: atteinte.resetsAt, atteinte: atteinte.fenetre };
  }
  let debut = null;
  for (const t of [...horaires].sort((a, b) => a - b))
    if (t <= maintenant && (debut === null || t >= debut + CINQ_H)) debut = t;
  if (debut === null || debut + CINQ_H <= maintenant)
    return { debut: null, fin: null, atteinte: null };
  return { debut, fin: debut + CINQ_H, atteinte: null };
}

const COMMANDE = /<command-name>\/?([\w:-]+)<\/command-name>/;

const textes = (o) => {
  const c = o.message?.content ?? o.content;
  if (typeof c === "string") return [c];
  return Array.isArray(c)
    ? c.filter((b) => b?.type === "text").map((b) => b.text)
    : [];
};

export class Suivi {
  constructor() {
    this.sessions = new Map();
    this.agents = new Map();
    this.lances = new Map();
    this.horaires = [];
    this.atteinte = null;
    this.flux = [];
    this.fusions = [];
  }

  evenement(t, qui, quoi, cible, cle) {
    const e = { t, qui, quoi, cle };
    if (cible) e.cible = cible;
    this.flux.unshift(e);
    // Les fichiers sont lus l'un après l'autre : on retrie par heure avant de couper.
    if (this.flux.length > 160) {
      this.flux.sort((a, b) => b.t - a.t);
      this.flux.length = 80;
    }
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
        traces: [],
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
        branche: "",
        traces: [],
      };
      this.agents.set(agentId, a);
    }
    return a;
  }

  meta(agentId, sessionId, m) {
    const a = this.agent(agentId, sessionId);
    a.type = m.agentType ?? a.type;
    a.description = m.description ?? a.description;
    a.fini = Boolean(m.finished);
  }

  ligne(o, agentId = null) {
    if (!o?.sessionId || !o.timestamp) return;
    const t = Date.parse(o.timestamp);
    for (const texte of textes(o)) {
      const a = limiteAtteinte(texte, t);
      if (a && !(this.atteinte?.t > t)) this.atteinte = a;
    }
    const s = this.session(o.sessionId, o);
    const porteur = agentId ? this.agent(agentId, o.sessionId) : s;
    if (agentId && !porteur.debut) porteur.debut = t;
    if (agentId && o.gitBranch) porteur.branche = o.gitBranch;
    porteur.derniere = Math.max(porteur.derniere, t);
    if (!agentId) s.derniere = Math.max(s.derniere, t);
    const m = o.message;
    if (!m || typeof m !== "object") return;

    if (o.type === "assistant" && m.usage && m.model !== "<synthetic>") {
      this.horaires.push(t);
      if (this.horaires.length > 50000)
        this.horaires = this.horaires.filter((h) => h > t - 36 * 3600e3);
    }
    if (typeof m.content === "string" && !agentId) {
      const cmd = m.content.match(COMMANDE);
      if (cmd) s.skill = cmd[1];
    }
    if (!Array.isArray(m.content)) return;
    for (const b of m.content) {
      if (b.type === "tool_use") {
        porteur.activite = phrase(b.name, b.input);
        porteur.traces.push({ t, quoi: porteur.activite });
        if (porteur.traces.length > 150) porteur.traces.splice(0, 50);
        if (porteur.activite === "Fusionne une PR") this.fusions.push(t);
        const cle = agentId ?? o.sessionId;
        const qui = agentId
          ? porteur.type
          : s.skill
            ? `/${s.skill.split(":").pop()}`
            : "Claude";
        if (b.name === "Skill" && !agentId) s.skill = b.input?.skill ?? s.skill;
        if ((b.name === "Agent" || b.name === "Task") && !agentId) {
          const type = b.input?.subagent_type ?? "general-purpose";
          const description = b.input?.description ?? "";
          this.lances.set(b.id, {
            type,
            description,
            session: o.sessionId,
            t,
            fini: false,
          });
          this.evenement(t, qui, description, type, cle);
        } else {
          this.evenement(t, qui, porteur.activite, null, cle);
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
            this.evenement(t, a.type, "A terminé", null, r.agentId);
          }
        }
        l.fini = r?.status !== "async_launched";
      }
    }
  }

  instantane(maintenant = Date.now()) {
    const actifSi = (d, ms) => maintenant - d < ms;
    // Traces des 30 dernières minutes seulement : la chronologie n'en montre pas plus.
    const recentes = (x) =>
      actifSi(x.derniere, 30 * 60e3)
        ? x.traces.filter((tr) => actifSi(tr.t, 30 * 60e3))
        : [];
    const agents = [...this.agents.values()].map((a) => ({
      ...a,
      traces: recentes(a),
      actif: !a.fini && actifSi(a.derniere || a.debut, 10 * 60e3),
    }));
    const lancesEnAttente = [...this.lances.values()].filter(
      (l) =>
        !l.fini &&
        actifSi(l.t, 60e3) &&
        !agents.some((a) => a.actif && a.type === l.type),
    );
    const sessions = [...this.sessions.values()]
      .map((s) => ({
        ...s,
        traces: recentes(s),
        actif: actifSi(s.derniere, 45e3),
      }))
      .sort((a, b) => b.derniere - a.derniere);
    const minuit = new Date(maintenant).setHours(0, 0, 0, 0);
    return {
      maintenant,
      prFusionnees: this.fusions.filter((t) => t >= minuit && t <= maintenant)
        .length,
      limite: fenetreEstimee(this.horaires, this.atteinte, maintenant),
      sessions: sessions.slice(0, 12),
      agents: agents.sort((a, b) => b.derniere - a.derniere).slice(0, 200),
      enAttente: lancesEnAttente.map(({ type, description, t }) => ({
        type,
        description,
        t,
      })),
      flux: [...this.flux].sort((a, b) => b.t - a.t).slice(0, 50),
    };
  }
}
