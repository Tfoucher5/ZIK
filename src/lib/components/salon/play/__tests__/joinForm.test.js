import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import JoinForm from "../JoinForm.svelte";

// Réseau lent : « Rejoindre » touché avant l'hydratation doit quand même partir
describe("formulaire Rejoindre avant le chargement du JavaScript", () => {
  it("envoie le code et le pseudo en GET par un vrai bouton d'envoi", () => {
    const { body } = render(JoinForm, { props: { onJoin() {} } });
    expect(body).toMatch(/<form[^>]*method="get"/);
    expect(body).toMatch(/<input[^>]*name="code"/);
    expect(body).toMatch(/<input[^>]*name="pseudo"/);
    expect(body).toMatch(/<button[^>]*type="submit"[^>]*>\s*Rejoindre/);
  });

  it("code en tuiles : le code part quand même, « Changer » n'envoie pas", () => {
    const { body } = render(JoinForm, {
      props: { onJoin() {}, codeKnown: true, codeInput: "ABC123" },
    });
    expect(body).toMatch(
      /<input[^>]*type="hidden"[^>]*name="code"[^>]*value="ABC123"/,
    );
    expect(body).toMatch(/<button[^>]*type="button"[^>]*>Changer/);
  });

  it("aucun bouton du formulaire n'envoie par défaut", () => {
    const { body } = render(JoinForm, { props: { onJoin() {} } });
    const form = body.slice(body.indexOf("<form"), body.indexOf("</form>"));
    for (const b of form.match(/<button[^>]*>/g))
      expect(b).toMatch(/type="(button|submit)"/);
  });
});
