import { describe, it, expect } from "vitest";
import { simpleParser } from "mailparser";

const raw = (from) =>
  [
    `From: ${from}`,
    "To: contact@zik-music.fr",
    "Subject: =?UTF-8?Q?R=C3=A9ponse?=",
    "Date: Mon, 23 Nov 2026 09:00:00 +0100",
    "Message-ID: <rep-1@bar.fr>",
    "In-Reply-To: <envoi-1@zik-music.fr>",
    "References: <envoi-0@zik-music.fr> <envoi-1@zik-music.fr>",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Stop merci",
    "",
  ].join("\r\n");

describe("lecture des réponses de prospection", () => {
  it("donne les champs lus par inbox.mjs", async () => {
    const mail = await simpleParser(raw("Le Bar <Contact@Bar.fr>"));
    expect(mail.from.value[0].address).toBe("Contact@Bar.fr");
    expect(mail.subject).toBe("Réponse");
    expect(mail.messageId).toBe("<rep-1@bar.fr>");
    expect(mail.inReplyTo).toBe("<envoi-1@zik-music.fr>");
    expect([].concat(mail.references)).toEqual([
      "<envoi-0@zik-music.fr>",
      "<envoi-1@zik-music.fr>",
    ]);
    expect(mail.date.toISOString()).toBe("2026-11-23T08:00:00.000Z");
    expect(mail.text.trim()).toBe("Stop merci");
  });

  it.each([
    [`Lieu: "Bar; piege@autre.fr" <contact@bar.fr>;`],
    [`Bar (a (b) piege@autre.fr) <contact@bar.fr>`],
  ])("ne prend pas le texte affiché pour une adresse : %s", async (from) => {
    const mail = await simpleParser(raw(from));
    const addresses = mail.from.value
      .flatMap((v) => v.group ?? [v])
      .map((v) => v.address);
    expect(addresses).toEqual(["contact@bar.fr"]);
  });
});
