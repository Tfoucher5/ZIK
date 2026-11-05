import { error } from "@sveltejs/kit";

// Second contrôle, en plus du hook : si la garde du hook saute un jour, les
// lectures et les écritures admin restent fermées.

export function requireAdmin(locals) {
  if (!locals.adminId) throw error(403, "Accès refusé");
}

export function adminLoad(load) {
  return (event) => {
    requireAdmin(event.locals);
    return load(event);
  };
}

export function adminActions(actions) {
  return Object.fromEntries(
    Object.entries(actions).map(([nom, action]) => [
      nom,
      (event) => {
        requireAdmin(event.locals);
        return action(event);
      },
    ]),
  );
}
