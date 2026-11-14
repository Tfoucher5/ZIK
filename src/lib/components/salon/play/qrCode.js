// Code de salon lu dans un QR : l'URL de la TV (…/salon/play?code=ABC123) ou
// le code seul. null si ce n'est pas un QR de soirée ZIK.
export function codeFromQr(text) {
  const raw = String(text ?? "").trim();
  let code = raw;
  try {
    code = new URL(raw).searchParams.get("code") ?? "";
  } catch {
    // pas une URL : le QR contient peut-être le code seul
  }
  code = code.toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}
