import { describe, it, expect } from "vitest";
import { dropOverriddenMeta } from "../defaultMeta.js";

const head = (...tags) => `<head>${tags.join("")}</head>`;
const def = (k, v) => `<meta data-default property="${k}" content="${v}">`;
const page = (k, v) => `<meta property="${k}" content="${v}">`;

describe("dropOverriddenMeta", () => {
  it("neutralise la balise par défaut redéfinie par la page", () => {
    const out = dropOverriddenMeta(
      head(def("og:title", "ZIK"), page("og:title", "Années 80")),
    );
    expect(out.match(/property="og:title"/g)).toHaveLength(1);
    expect(out).toContain('content="Années 80"');
    expect(out).toContain('data-overridden="og:title"');
  });

  it("garde les balises par défaut que la page ne redéfinit pas", () => {
    const out = dropOverriddenMeta(
      head(def("og:image", "og.png"), page("og:title", "Années 80")),
    );
    expect(out).toContain('property="og:image"');
  });

  it("traite aussi les balises twitter (name=)", () => {
    const out = dropOverriddenMeta(
      head(
        '<meta data-default name="twitter:title" content="ZIK">',
        '<meta name="twitter:title" content="Zikle">',
      ),
    );
    expect(out.match(/name="twitter:title"/g)).toHaveLength(1);
  });

  it("ne touche pas une page sans balise propre", () => {
    const html = head(def("og:title", "ZIK"));
    expect(dropOverriddenMeta(html)).toBe(html);
  });
});
