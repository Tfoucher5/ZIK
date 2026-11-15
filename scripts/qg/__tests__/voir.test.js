import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cheminAutorise, servirVoir, typeVoir } from "../voir.mjs";
import { lienOuvrable } from "../public/liens.js";

let dossier, depot, dehors, serveur, port;
const voir = (f, entetes = {}) =>
  fetch(`http://127.0.0.1:${port}/voir?f=${encodeURIComponent(f)}`, {
    headers: entetes,
  });

beforeAll(async () => {
  dossier = mkdtempSync(join(tmpdir(), "qg-voir-"));
  depot = join(dossier, "depot");
  dehors = join(dossier, "depot-secret");
  mkdirSync(join(depot, "docs"), { recursive: true });
  mkdirSync(dehors);
  writeFileSync(join(depot, "docs", "note.md"), "# Titre\n<script>x</script>");
  writeFileSync(join(depot, "clip.mp4"), Buffer.from("0123456789"));
  writeFileSync(join(depot, "cle.env"), "SECRET=1");
  writeFileSync(join(dehors, "secret.txt"), "non");
  const options = { base: depot, racines: [depot] };
  serveur = createServer((req, res) =>
    servirVoir(
      req,
      res,
      new URL(req.url, "http://l").searchParams.get("f"),
      options,
    ),
  );
  await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
  port = serveur.address().port;
});
afterAll(() => {
  serveur.close();
  rmSync(dossier, { recursive: true, force: true });
});

describe("liste blanche de /voir", () => {
  it("accepte un fichier sous une racine, en absolu ou relatif au dépôt", () => {
    expect(
      cheminAutorise(join(depot, "clip.mp4"), depot, [depot]),
    ).toBeTruthy();
    expect(cheminAutorise("docs/note.md", depot, [depot])).toBeTruthy();
  });

  it("refuse dehors, la traversée, un préfixe voisin, l'UNC et un dossier", () => {
    const r = [depot];
    expect(cheminAutorise(join(dehors, "secret.txt"), depot, r)).toBeNull();
    expect(cheminAutorise("../depot-secret/secret.txt", depot, r)).toBeNull();
    expect(cheminAutorise("docs/../clip.mp4", depot, r)).toBeNull();
    expect(cheminAutorise("\\\\serveur\\partage\\a.txt", depot, r)).toBeNull();
    expect(cheminAutorise("docs", depot, r)).toBeNull();
    expect(cheminAutorise("absent.md", depot, r)).toBeNull();
    expect(cheminAutorise(null, depot, r)).toBeNull();
  });

  it("répond 403 hors liste blanche et 415 pour un type non prévu", async () => {
    expect((await voir(join(dehors, "secret.txt"))).status).toBe(403);
    expect((await voir("../depot-secret/secret.txt")).status).toBe(403);
    expect((await voir("cle.env")).status).toBe(415);
  });
});

describe("types et lecture", () => {
  it("donne le type MIME par extension", () => {
    expect(typeVoir("a.MP4")).toBe("video/mp4");
    expect(typeVoir("a.webm")).toBe("video/webm");
    expect(typeVoir("a.png")).toBe("image/png");
    expect(typeVoir("a.html")).toMatch(/^text\/html/);
    expect(typeVoir("a.txt")).toMatch(/^text\/plain/);
    expect(typeVoir("a.exe")).toBeUndefined();
  });

  it("rend le markdown échappé dans une page isolée", async () => {
    const res = await voir("docs/note.md");
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
    expect(res.headers.get("content-security-policy")).toMatch(/sandbox/);
    const html = await res.text();
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("sert une plage d'octets pour la vidéo", async () => {
    const res = await voir("clip.mp4", { range: "bytes=2-5" });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(await res.text()).toBe("2345");
    const fin = await voir("clip.mp4", { range: "bytes=-3" });
    expect(await fin.text()).toBe("789");
    expect((await voir("clip.mp4", { range: "bytes=20-" })).status).toBe(416);
    const tout = await voir("clip.mp4");
    expect(tout.status).toBe(200);
    expect(tout.headers.get("accept-ranges")).toBe("bytes");
  });
});

describe("liens des décisions", () => {
  it("garde http, envoie les chemins locaux vers /voir, laisse le texte", () => {
    expect(lienOuvrable("https://a.fr/")).toBe("https://a.fr/");
    expect(lienOuvrable("C:\\Temp\\claude\\v.mp4")).toBe(
      "/voir?f=C%3A%5CTemp%5Cclaude%5Cv.mp4",
    );
    expect(lienOuvrable("docs/strategie/vision.md")).toBe(
      "/voir?f=docs%2Fstrategie%2Fvision.md",
    );
    expect(lienOuvrable("voir le message de lundi")).toBeNull();
    expect(lienOuvrable("javascript:alert(1)")).toBeNull();
  });
});
