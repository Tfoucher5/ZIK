import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import barlow from "./fonts/barlow-600.ttf?inline";
import barlowCondensed from "./fonts/barlow-condensed-800.ttf?inline";

// Les polices sont inlinées au build : le rendu ne dépend d'aucune police
// système, le PNG est donc identique en local et sur le serveur de prod.
// Barlow et Barlow Condensed viennent du dépôt google/fonts, sous licence
// OFL 1.1 (cf. fonts/OFL.txt) — ce sont les mêmes que celles du site.
// resvg-js 2.6 n'a pas d'option fontBuffers (ignorée sans erreur) : les
// polices sont écrites une fois sur disque pour passer par fontFiles.
const fontFiles = [
  ["barlow-600.ttf", barlow],
  ["barlow-condensed-800.ttf", barlowCondensed],
].map(([name, dataUri]) => {
  const path = join(tmpdir(), `zik-og-${name}`);
  writeFileSync(
    path,
    Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64"),
  );
  return path;
});

export function svgToPng(svg) {
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles,
      defaultFontFamily: "Barlow",
    },
  });
  return Buffer.from(resvg.render().asPng());
}
