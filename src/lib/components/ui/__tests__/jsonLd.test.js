import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import JsonLd from "../JsonLd.svelte";

describe("données structurées", () => {
  it("un texte saisi ne peut pas fermer la balise script", () => {
    const json = JSON.stringify({
      name: "</script><img src=x onerror=alert(1)>",
    });
    const { head, body } = render(JsonLd, { props: { json } });
    const html = head + body;
    expect(html.match(/<\/script>/gi)).toHaveLength(1);
    const ld = html.match(/<script[^>]*>([\s\S]*)<\/script>/)[1];
    expect(JSON.parse(ld).name).toBe("</script><img src=x onerror=alert(1)>");
  });
});
