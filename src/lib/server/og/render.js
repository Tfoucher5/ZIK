import { Resvg } from "@resvg/resvg-js";
import barlow from "./fonts/barlow-600.ttf?inline";
import barlowCondensed from "./fonts/barlow-condensed-800.ttf?inline";

// Les polices sont inlinées au build : le rendu ne dépend d'aucune police
// système, le PNG est donc identique en local et sur le serveur de prod.
// Barlow et Barlow Condensed viennent du dépôt google/fonts, sous licence
// OFL 1.1 (cf. fonts/OFL.txt) — ce sont les mêmes que celles du site.
const fontBuffers = [barlow, barlowCondensed].map((dataUri) =>
  Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64"),
);

export function svgToPng(svg) {
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontBuffers,
      defaultFontFamily: "Barlow",
    },
  });
  return Buffer.from(resvg.render().asPng());
}
