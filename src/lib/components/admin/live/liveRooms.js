// État affiché d'une room en direct dans l'admin.
export function stateOf(r) {
  if (r.adminBlocked) return { label: "Verrouillée", tone: "bad" };
  if (r.isPaused) return { label: "En pause", tone: "warn" };
  if (r.isActive)
    return { label: `Manche ${r.currentRound}/${r.maxRounds}`, tone: "good" };
  return { label: "En attente", tone: "" };
}
