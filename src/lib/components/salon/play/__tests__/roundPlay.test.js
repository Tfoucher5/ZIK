import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import RoundPlay from "../RoundPlay.svelte";

const vue = (props) =>
  render(RoundPlay, {
    props: {
      answerMode: "multiple",
      timerStarted: true,
      choices: ["A", "B", "C", "D"],
      ...props,
    },
  }).body;

describe("QCM : écran du téléphone selon l'accusé", () => {
  it("en attente de l'accusé : grille gardée, case marquée « Envoi… »", () => {
    const html = vue({ chosenIndex: 1, allFound: false });
    expect(html).not.toContain("Réponse verrouillée");
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).toContain("Envoi…");
  });

  it("accusé reçu : réponse verrouillée", () => {
    const html = vue({ chosenIndex: 1, allFound: true });
    expect(html).toContain("Réponse verrouillée");
    expect(html).not.toContain("Envoi…");
  });

  it("case rendue : grille normale, sans « Envoi… »", () => {
    const html = vue({ chosenIndex: null, allFound: false });
    expect(html).not.toContain("Envoi…");
    expect(html).not.toMatch(/disabled/);
  });

  it("révélation : la case choisie marquée fausse, la bonne en avant", () => {
    const html = vue({ chosenIndex: 2, allFound: true, revealCorrectIndex: 1 });
    expect(html).toMatch(/c2[^"]*reveal-wrong/);
    expect(html).toMatch(/c1[^"]*reveal-correct/);
  });
});
