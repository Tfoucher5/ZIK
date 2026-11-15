// DA réseaux « Colle & magenta » (promo/DA-reseaux.md) : les codes du site ZIK imprimés, découpés et recollés à la main.
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

export const NOIR = "#0c0c0f"; // papier noir
export const BLANC = "#f6f4ec"; // papier de photocopie
export const ROSE = "#ff00ff"; // papier fluo, point du logo
export const VERT = "#3ddc84"; // « trouvé »

export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const j = (r, a) => (r() * 2 - 1) * a;

export const img = (f) =>
  `data:image/jpeg;base64,${readFileSync(f).toString("base64")}`;

const svg = (s) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' ${s}</svg>`)}")`;
// bruit d'une couleur à alpha variable : k = contraste, o = seuil
export const bruit = (f, oct, k, o, seed = 3, size = 500, rgb = "0 0 0") => {
  const [r, g, b] = rgb.split(" ");
  return svg(
    `width='${size}' height='${size}'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 ${k} ${o}'/></filter><rect width='100%' height='100%' filter='url(#n)'/>`,
  );
};

// Coup de ciseaux : quadrilatère presque droit (a en %)
export const ciseaux = (r, a = 1.2) =>
  `polygon(${a + j(r, a)}% ${a + j(r, a)}%, ${100 - a + j(r, a)}% ${a + j(r, a)}%, ${100 - a + j(r, a)}% ${100 - a + j(r, a)}%, ${a + j(r, a)}% ${100 - a + j(r, a)}%)`;

export const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=JetBrains+Mono:wght@500;700&family=Covered+By+Your+Grace&display=block" rel="stylesheet">';

// Filtres SVG : bords d'encre irréguliers (toner, Posca)
export const DEFS = `<svg width="0" height="0" style="position:absolute"><defs>
<filter id="toner" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>
<filter id="posca" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="9" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".5 .05" numOctaves="2" seed="5" result="g"/><feColorMatrix in="g" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.55" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>
</defs></svg>`;

export const CSS = `
*{margin:0;box-sizing:border-box}
body{background:${NOIR};position:relative;overflow:hidden;font-family:'JetBrains Mono',monospace;color:${BLANC}}
.abs{position:absolute}
/* matière : fibres et poussières du papier noir, lumière de la photo, grain sur les papiers clairs */
.fond{position:absolute;inset:0;background:${bruit(0.9, 2, 0.4, -0.2, 3, 500, "1 1 1")},radial-gradient(120% 90% at 22% 12%,rgba(255,255,255,.07),transparent 65%)}
.grain{position:absolute;inset:0;pointer-events:none;z-index:99;background:${bruit(0.85, 2, 1.1, -0.44)};mix-blend-mode:multiply;opacity:.75}
/* papier collé : ombre sur l'enveloppe, découpe sur le contenu */
.colle{position:absolute;filter:drop-shadow(2px 5px 3px rgba(0,0,0,.6))}
.colle>.p{width:100%;height:100%;background:${BLANC};color:#111}
.colle>.p.mag{background:${ROSE}}
/* photocopie tramée d'une pochette */
.copie{position:relative;overflow:hidden;background:#fff;filter:contrast(30)}
.copie img{position:relative;width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1) brightness(var(--b,1.08)) contrast(.92) blur(.7px);mix-blend-mode:hard-light}
.copie::before{content:"";position:absolute;inset:-60%;background:radial-gradient(circle,#404040 0,#fff 75%) 0 0/10px 10px;transform:rotate(28deg)}
/* titre imprimé : Barlow Condensed comme sur le site, passé à la photocopieuse */
.titre{font-family:'Barlow Condensed';font-weight:900;text-transform:uppercase;line-height:.84;letter-spacing:-.01em;color:#111;white-space:nowrap;filter:url(#toner)}
.mono{font-family:'JetBrains Mono';font-weight:700;text-transform:uppercase;letter-spacing:.14em;white-space:nowrap}
.posca{font-family:'Covered By Your Grace';color:#fff;line-height:.98;-webkit-text-stroke:.022em #fff;paint-order:stroke fill;filter:url(#posca)}
.point{display:inline-block;border-radius:50%;background:${ROSE};box-shadow:1px 2px 2px rgba(0,0,0,.6)}
.case{display:inline-grid;place-items:center;border:4px solid ${BLANC};border-radius:7px;font-family:'JetBrains Mono';font-weight:700;color:${BLANC};filter:url(#toner)}
.filet{position:absolute;background:${BLANC};opacity:.32;filter:url(#toner)}
.scotch{position:absolute;height:50px;z-index:5;background:${bruit(0.9, 1, 0.5, -0.2)},rgba(238,228,190,.8);clip-path:polygon(0 8%,3% 0,6% 10%,9% 0,100% 0,97% 12%,100% 24%,97% 38%,100% 52%,97% 66%,100% 80%,97% 100%,0 100%,3% 86%,0 72%,3% 58%,0 44%,3% 30%,0 18%)}
`;

// Papier découpé et collé. o : {x,y,w,h,rot,seed,mag,z,id,style}
export const colle = (o, inner) =>
  `<div class="colle" ${o.id ? `id="${o.id}"` : ""} style="left:${o.x}px;top:${o.y}px;${o.w ? `width:${o.w}px;` : ""}${o.h ? `height:${o.h}px;` : ""}transform:rotate(${o.rot || 0}deg);${o.z ? `z-index:${o.z};` : ""}"><div class="p${o.mag ? " mag" : ""}" style="clip-path:${ciseaux(rng(o.seed || 1), o.a || 1.2)};${o.style || ""}">${inner}</div></div>`;

// Bande de titre : une ligne de Barlow Condensed sur papier blanc ou magenta
export const bande = (o, texte, taille) =>
  colle(
    {
      a: 2.2,
      ...o,
      style: `padding:${taille * 0.1}px ${taille * 0.16}px ${taille * 0.07}px`,
    },
    `<div class="titre" style="font-size:${taille}px">${texte}</div>`,
  );

export const scotch = (x, y, w, rot) =>
  `<div class="scotch" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg)"></div>`;

// Gommette magenta = le point du logo, en grand
export const pastille = (o, l1, l2) =>
  `<div class="colle" ${o.id ? `id="${o.id}"` : ""} style="left:${o.x}px;top:${o.y}px;width:${o.d}px;height:${o.d}px;transform:rotate(${o.rot || 0}deg);z-index:6"><div class="p mag" style="border-radius:50%;display:grid;place-content:center;text-align:center"><div class="titre" style="font-size:${o.d * 0.5}px">${l1}</div><div class="mono" style="font-size:${o.d * 0.1}px;margin-top:${o.d * 0.03}px">${l2}</div></div></div>`;

// Cases de code, comme le « CODE ▢▢▢▢ » du bandeau TV
export const cases = (txt, t) =>
  [...txt]
    .map(
      (c, i) =>
        `<span class="case" style="width:${t}px;height:${t * 1.18}px;font-size:${t * 0.62}px;margin-left:${t * 0.14}px;transform:rotate(${[1.5, -1, 0.8, -1.8][i % 4]}deg)">${c}</span>`,
    )
    .join("");

// Bandeau : celui de la TV ZIK. Logo à point, filet, rubrique mono, cases de code, barre de lecture magenta
export const bandeau = ({ y, rubrique, code, part }) =>
  `<div class="abs" id="bandeau" style="left:60px;top:${y}px;width:880px;height:66px;display:flex;align-items:center;gap:20px">
<div style="font:900 62px/1 'Barlow Condensed';color:${BLANC};filter:url(#toner)">ZIK</div><i class="point" style="width:17px;height:17px;margin:26px 0 0 -16px;transform:translate(1px,2px)"></i>
<i style="width:3px;height:40px;background:${BLANC};opacity:.32"></i>
<div class="mono" style="font-size:21px;flex:1;filter:url(#toner)">${rubrique}</div>
<div class="mono" style="font-size:17px;opacity:.6">code</div><div style="margin-left:-12px">${cases(code, 38)}</div></div>
<div class="filet" style="left:60px;top:${y + 78}px;width:880px;height:3px"></div>
<div class="abs" id="lecture" style="left:60px;top:${y + 76}px;width:${880 * part}px;height:7px;background:${ROSE};border-radius:2px;filter:url(#toner)"></div>`;

export const page = (w, h, body, extra = "") =>
  `<html><head>${FONTS}<style>${CSS}body{width:${w}px;height:${h}px}${extra}</style></head><body>${DEFS}<div class="fond"></div>${body}<div class="grain"></div></body></html>`;

export const lancer = () =>
  chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
