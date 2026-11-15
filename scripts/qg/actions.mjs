// Traduit un appel d'outil en une phrase courte pour le flux du QG, jamais la commande brute.
const fin = (chemin) =>
  String(chemin ?? "")
    .split(/[\\/]/)
    .pop();
const court = (texte, n = 50) => {
  const t = String(texte ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

const COMMANDES = [
  [/\b(vitest|playwright test|npm (run )?test)\b/, "Lance les tests"],
  [/\b(eslint|prettier|svelte-check)\b/, "Vérifie le code"],
  [/\bnpm run build\b/, "Construit le site"],
  [/\bgh pr create\b/, "Ouvre une PR"],
  [/\bgh pr merge\b/, "Fusionne une PR"],
  [/\bgh (pr|run|api|issue)\b/, "Regarde GitHub"],
  [/\bgit commit\b/, "Enregistre un commit"],
  [/\bgit push\b/, "Pousse la branche"],
  [/\bgit (checkout|switch|worktree)\b/, "Change de branche"],
  [/\bgit (status|diff|log|show|fetch|blame)\b/, "Regarde l'historique git"],
  [/\bnpm (ci|install)\b/, "Installe les dépendances"],
  [/\bcurl\b/, "Interroge une adresse web"],
  [/\b(playwright|screenshot|capture)/i, "Prend une capture"],
  [
    /\bnode \S*(serveur|server)|\bnpm run (dev|preview)\b/,
    "Démarre un serveur",
  ],
  [/\bsupabase\b/, "Travaille sur la base"],
  [/\brailway\b/, "Regarde Railway"],
  [
    /(^|[;&|]\s*|cd \S+ && )(ls|find|cat|head|tail|wc|grep|sed -n)\b/,
    "Parcourt des fichiers",
  ],
];

const OUTILS = {
  Read: (e) => `Lit ${fin(e.file_path)}`,
  Edit: (e) => `Modifie ${fin(e.file_path)}`,
  MultiEdit: (e) => `Modifie ${fin(e.file_path)}`,
  NotebookEdit: (e) => `Modifie ${fin(e.notebook_path)}`,
  Write: (e) => `Écrit ${fin(e.file_path)}`,
  Grep: (e) => `Cherche « ${court(e.pattern, 30)} »`,
  Glob: () => "Cherche des fichiers",
  WebSearch: (e) => `Cherche sur le web « ${court(e.query, 30)} »`,
  WebFetch: () => "Lit une page web",
  Skill: (e) => `Active /${e.skill ?? "?"}`,
  Agent: (e) => `Confie une tâche : ${court(e.description)}`,
  Task: (e) => `Confie une tâche : ${court(e.description)}`,
  TodoWrite: () => "Met à jour sa liste de tâches",
  AskUserQuestion: () => "Pose une question à Théo",
  SendMessage: () => "Envoie un message",
  SubagentHandback: () => "Rend son rapport",
  ToolSearch: () => "Cherche un outil",
  Monitor: () => "Surveille une tâche",
  // La description d'une commande est souvent en anglais : on ne l'affiche pas.
  Bash: (e) =>
    COMMANDES.find(([re]) => re.test(String(e.command ?? "")))?.[1] ??
    "Lance une commande",
};

export function phrase(nom, entree = {}) {
  const e = entree && typeof entree === "object" ? entree : {};
  if (OUTILS[nom]) return OUTILS[nom](e);
  if (nom?.startsWith("mcp__")) {
    const service = nom
      .split("__")[1]
      .replace(/^claude_ai_/, "")
      .replaceAll("_", " ");
    return `Utilise ${service}`;
  }
  return `Utilise ${nom}`;
}
