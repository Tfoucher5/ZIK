import { describe, it, expect } from "vitest";
import { resolveSource, isTrackableVisit } from "../visitSource.js";

const params = (qs = "") => new URLSearchParams(qs);

describe("resolveSource", () => {
  it("classe une arrivée sans referrer en direct", () => {
    expect(resolveSource(null, params())).toMatchObject({
      source: "direct",
      medium: "direct",
    });
  });

  it("ignore un referrer interne", () => {
    expect(
      resolveSource("https://www.zik-music.fr/rooms", params()),
    ).toMatchObject({ source: "direct", medium: "direct" });
  });

  it("regroupe les domaines d'un même canal", () => {
    expect(
      resolveSource("https://old.reddit.com/r/france", params()),
    ).toMatchObject({
      source: "reddit",
      medium: "social",
    });
    expect(resolveSource("https://redd.it/abc", params())).toMatchObject({
      source: "reddit",
    });
  });

  it("distingue moteur de recherche et site référent", () => {
    expect(resolveSource("https://www.google.fr/", params())).toMatchObject({
      medium: "search",
    });
    expect(
      resolveSource("https://unblog.example.com/a", params()),
    ).toMatchObject({
      source: "unblog.example.com",
      medium: "referral",
    });
  });

  it("retire le www d'un référent inconnu", () => {
    expect(resolveSource("https://www.exemple.fr/x", params())).toMatchObject({
      source: "exemple.fr",
    });
  });

  it("fait primer les utm sur le referrer", () => {
    expect(
      resolveSource(
        "https://www.google.fr/",
        params("utm_source=affiche&utm_medium=qr&utm_campaign=bar-lyon"),
      ),
    ).toMatchObject({
      source: "affiche",
      medium: "qr",
      campaign: "bar-lyon",
    });
  });

  it("donne un medium par défaut à un utm_source seul", () => {
    expect(resolveSource(null, params("utm_source=flyer"))).toMatchObject({
      source: "flyer",
      medium: "campagne",
    });
  });

  it("conserve le host d'origine pour les référents", () => {
    expect(
      resolveSource("https://old.reddit.com/r/france", params()).referrerHost,
    ).toBe("old.reddit.com");
  });
});

describe("isTrackableVisit", () => {
  const visit = (over = {}) => ({
    method: "GET",
    pathname: "/",
    userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126",
    accept: "text/html,application/xhtml+xml",
    ...over,
  });

  it("accepte une navigation normale", () => {
    expect(isTrackableVisit(visit())).toBe(true);
  });

  it("rejette les robots", () => {
    expect(isTrackableVisit(visit({ userAgent: "Googlebot/2.1" }))).toBe(false);
    expect(isTrackableVisit(visit({ userAgent: "WhatsApp/2.0 preview" }))).toBe(
      false,
    );
  });

  it("rejette l'api, l'admin et les fichiers", () => {
    expect(isTrackableVisit(visit({ pathname: "/api/rooms" }))).toBe(false);
    expect(isTrackableVisit(visit({ pathname: "/admin/dashboard" }))).toBe(
      false,
    );
    expect(isTrackableVisit(visit({ pathname: "/css/base.css" }))).toBe(false);
  });

  it("rejette ce qui n'est pas une page demandée en GET", () => {
    expect(isTrackableVisit(visit({ method: "POST" }))).toBe(false);
    expect(isTrackableVisit(visit({ accept: "application/json" }))).toBe(false);
    expect(isTrackableVisit(visit({ userAgent: null }))).toBe(false);
  });
});
