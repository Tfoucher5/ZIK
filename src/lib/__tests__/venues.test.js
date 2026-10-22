import { describe, it, expect } from "vitest";
import { cleanVenue, seasonStart, onColor, venueEventText } from "../venues.js";
import { slugify } from "../slug.js";
import { eventIcs } from "../ics.js";

describe("cleanVenue", () => {
  it("exige le nom et la ville", () => {
    expect(cleanVenue({ name: "Le Comptoir" }).error).toMatch(/Ville/);
  });

  it("nettoie les champs et complète le lien du site", () => {
    const { venue } = cleanVenue({
      name: "  Le Comptoir ",
      city: "Nantes",
      website: "lecomptoir.fr",
      color: "#ff00aa",
    });
    expect(venue.name).toBe("Le Comptoir");
    expect(venue.website).toBe("https://lecomptoir.fr");
    expect(venue.address).toBeNull();
    expect(venue.color).toBe("#ff00aa");
  });

  it("ignore une couleur invalide et refuse un logo qui n'est pas une image", () => {
    expect(
      cleanVenue({ name: "A", city: "B", color: "red" }).venue.color,
    ).toBeNull();
    expect(
      cleanVenue({ name: "A", city: "B", logo: "javascript:alert(1)" }).error,
    ).toMatch(/Logo/);
  });
});

describe("seasonStart", () => {
  it("renvoie le premier jour du mois à Paris", () => {
    const d = seasonStart(new Date("2026-10-13T12:00:00Z"));
    expect(d.toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });
});

describe("onColor", () => {
  it("choisit un texte lisible", () => {
    expect(onColor("#ffff00")).toBe("#000000");
    expect(onColor("#1a1a7a")).toBe("#ffffff");
  });
});

describe("slugify", () => {
  it("fait une adresse propre", () => {
    expect(slugify("Le Bar à Thym Nantes")).toBe("le-bar-a-thym-nantes");
    expect(slugify("Bigflo & Oli")).toBe("bigflo-et-oli");
  });
});

describe("venueEventText", () => {
  it("annonce le lieu, le thème et la date en heure de Paris", () => {
    expect(
      venueEventText({
        name: "Le Comptoir",
        startsAt: "2026-10-20T19:00:00Z",
        theme: "Années 80",
      }),
    ).toBe(
      "Le Comptoir organise un blind test « Années 80 » le mardi 20 octobre à 21:00.",
    );
  });

  it("se passe du thème", () => {
    expect(
      venueEventText({ name: "Chez Jo", startsAt: "2026-12-05T20:30:00Z" }),
    ).toBe("Chez Jo organise un blind test le samedi 5 décembre à 21:30.");
  });
});

describe("venueEventText rappel", () => {
  it("dit « Ce soir » pour une soirée après 17 h", () => {
    expect(
      venueEventText({
        name: "Le Comptoir",
        startsAt: "2026-10-20T19:00:00Z",
        reminder: true,
      }),
    ).toBe("Ce soir à 21:00 : blind test chez Le Comptoir.");
  });

  it("dit « Aujourd'hui » pour une soirée en journée", () => {
    expect(
      venueEventText({
        name: "Camping Les Pins",
        startsAt: "2026-07-14T13:30:00Z",
        theme: "Disney",
        reminder: true,
      }),
    ).toBe(
      "Aujourd'hui à 15:30 : blind test « Disney » chez Camping Les Pins.",
    );
  });
});

describe("eventIcs", () => {
  const ics = eventIcs(
    {
      slug: "le-comptoir-angers",
      name: "Le Comptoir",
      city: "Angers",
      address: "12 rue Saint-Laud, 49100",
    },
    { id: "abc", starts_at: "2026-10-20T19:00:00Z", theme: "Rap, 2000" },
    new Date("2026-10-13T10:00:00Z"),
  );

  it("décrit la soirée en UTC sur 3 h", () => {
    expect(ics).toContain("DTSTART:20261020T190000Z");
    expect(ics).toContain("DTEND:20261020T220000Z");
    expect(ics).toContain("UID:abc@zik-music.fr");
  });

  it("échappe virgules et utilise des fins de ligne CRLF", () => {
    expect(ics).toContain("SUMMARY:Blind test Rap\\, 2000 - Le Comptoir");
    expect(ics).toContain("LOCATION:12 rue Saint-Laud\\, 49100\\, Angers");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
