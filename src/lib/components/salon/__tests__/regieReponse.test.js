import { describe, it, expect } from "vitest";
import { texteReponse } from "../regie/reponse.js";

describe("réponse masquée de la régie", () => {
  const titre = { artist: "Daft Punk", title: "One More Time", cover: "a.jpg" };

  it("le même titre renvoyé à la reconnexion ne remasque pas", () => {
    expect(texteReponse({ ...titre })).toBe(texteReponse(titre));
  });

  it("un nouveau titre remasque", () => {
    expect(texteReponse({ ...titre, title: "Around the World" })).not.toBe(
      texteReponse(titre),
    );
    expect(texteReponse({ ...titre, artist: "Justice" })).not.toBe(
      texteReponse(titre),
    );
  });
});
