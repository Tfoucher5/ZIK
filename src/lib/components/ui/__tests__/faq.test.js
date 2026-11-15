import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Faq from "../Faq.svelte";

describe("FAQ", () => {
  it("rend un details natif fermé par question, texte échappé", () => {
    const items = [
      { q: "Faut-il une appli ?", a: "Non." },
      { q: "<b>Prix</b>", a: "Gratuit <script>" },
    ];
    const { body } = render(Faq, { props: { items } });
    expect(body.match(/<details/g)).toHaveLength(2);
    expect(body).not.toContain("open");
    expect(body).toMatch(/<summary[^>]*>Faut-il une appli \?<\/summary>/);
    expect(body).toContain("&lt;b>Prix&lt;/b>");
    expect(body).not.toContain("<script>");
  });
});
