import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";

// Page de prototype : visible en local uniquement.
export function load() {
  if (!dev) error(404, "Page introuvable");
}
