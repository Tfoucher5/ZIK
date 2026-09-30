import { describe, it, expect } from "vitest";
import {
  firstMail,
  followUp,
} from "../../../../scripts/prospection/templates.mjs";

describe("mails de prospection", () => {
  it("nomme le bar dans l'objet", () => {
    expect(firstMail({ kind: "bar", name: "La Tribune" }).subject).toBe(
      "Un blind test chez La Tribune ?",
    );
  });

  it("donne la source de l'adresse et le moyen de dire stop, relance comprise", () => {
    for (const kind of ["bar", "camping", "association"]) {
      for (const mail of [
        firstMail({ kind, name: "X" }),
        followUp({ kind, name: "X" }),
      ]) {
        expect(mail.text).toContain("OpenStreetMap");
        expect(mail.text).toContain("« stop »");
        expect(mail.text).toContain("https://www.zik-music.fr/pro");
      }
    }
  });

  it("répond dans le fil du premier mail", () => {
    expect(followUp({ kind: "bar", name: "Le Zinc" }).subject).toBe(
      "Re: Un blind test chez Le Zinc ?",
    );
  });
});
