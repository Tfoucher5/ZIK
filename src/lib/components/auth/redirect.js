// Adresse de retour après Google, Discord ou le lien de confirmation :
// une page du site seulement, jamais un autre domaine
export const authRedirect = (origin, next) =>
  typeof next === "string" && /^\/(?![/\\])/.test(next)
    ? origin + next
    : origin;
