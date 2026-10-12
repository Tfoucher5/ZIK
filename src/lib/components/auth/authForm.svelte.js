import { env } from "$env/dynamic/public";

export const captchaOn = !!env.PUBLIC_TURNSTILE_SITE_KEY;
export const CAPTCHA_MSG = "Valide la vérification anti-robot.";

// Saisies conservées entre les vues et les ouvertures de la modale
export class AuthForm {
  email = $state("");
  password = $state("");
  showLoginPwd = $state(false);
  username = $state("");
  regEmail = $state("");
  regPassword = $state("");
  showRegPwd = $state(false);
  // Champ invisible : un humain ne le voit pas, un robot le remplit
  website = $state("");
}
