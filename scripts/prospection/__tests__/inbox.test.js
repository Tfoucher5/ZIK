import { describe, it, expect } from "vitest";
import { simpleParser } from "mailparser";

const raw = (from) =>
  [
    `From: ${from}`,
    "To: contact@zik.test",
    "Subject: =?UTF-8?Q?R=C3=A9ponse?=",
    "Date: Mon, 23 Nov 2026 09:00:00 +0100",
    "Message-ID: <rep-1@bar.test>",
    "In-Reply-To: <envoi-1@zik.test>",
    "References: <envoi-0@zik.test> <envoi-1@zik.test>",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Stop merci",
    "",
  ].join("\r\n");

describe("lecture des réponses de prospection", () => {
  it("donne les champs lus par inbox.mjs", async () => {
    const mail = await simpleParser(raw("Le Bar <Contact@Bar.test>"));
    expect(mail.from.value[0].address).toBe("Contact@Bar.test");
    expect(mail.subject).toBe("Réponse");
    expect(mail.messageId).toBe("<rep-1@bar.test>");
    expect(mail.inReplyTo).toBe("<envoi-1@zik.test>");
    expect([].concat(mail.references)).toEqual([
      "<envoi-0@zik.test>",
      "<envoi-1@zik.test>",
    ]);
    expect(mail.date.toISOString()).toBe("2026-11-23T08:00:00.000Z");
    expect(mail.text.trim()).toBe("Stop merci");
  });

  it.each([
    [`(a (b) piege@autre.test) contact@bar.test`],
    [`Bar (a (b) <piege@autre.test>) <contact@bar.test>`],
  ])("ne prend pas un commentaire pour l'expéditeur : %s", async (from) => {
    const mail = await simpleParser(raw(from));
    expect(mail.from.value[0].address).toBe("contact@bar.test");
  });
});
