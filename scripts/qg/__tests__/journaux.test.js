import { describe, it, expect } from "vitest";
import {
  Suivi,
  hoteAutorise,
  limiteAtteinte,
  fenetreEstimee,
} from "../journaux.mjs";

const T0 = Date.parse("2026-11-13T15:00:00Z");
const H = 3600e3;
const ligne = (o) => ({
  sessionId: "s1",
  timestamp: new Date(T0).toISOString(),
  cwd: "C:\\dev\\ZIK",
  gitBranch: "develop",
  ...o,
});
const usage = { input_tokens: 10, output_tokens: 100 };

describe("Suivi", () => {
  it("suit un agent du lancement à la fin, en phrases simples", () => {
    const s = new Suivi();
    s.ligne(
      ligne({
        type: "user",
        message: { content: "<command-name>/tech</command-name>" },
      }),
    );
    s.ligne(
      ligne({
        type: "assistant",
        message: {
          id: "m1",
          content: [
            {
              type: "tool_use",
              id: "t1",
              name: "Agent",
              input: { subagent_type: "dev", description: "Page lieu" },
            },
          ],
        },
      }),
    );
    expect(s.instantane(T0).enAttente).toEqual([
      { type: "dev", description: "Page lieu", t: T0 },
    ]);
    expect(s.flux[0]).toMatchObject({
      qui: "/tech",
      quoi: "Page lieu",
      cible: "dev",
    });
    s.meta("a1", "s1", {
      agentType: "dev",
      description: "Page lieu",
      finished: false,
    });
    s.ligne(
      ligne({
        type: "assistant",
        agentId: "a1",
        message: {
          id: "m2",
          model: "claude-sonnet-5-5",
          usage,
          content: [
            {
              type: "tool_use",
              id: "x",
              name: "Read",
              input: { file_path: "a/b.js" },
            },
          ],
        },
      }),
      "a1",
    );
    let etat = s.instantane(T0 + 1000);
    expect(etat.sessions[0].skill).toBe("tech");
    expect(etat.agents[0]).toMatchObject({
      type: "dev",
      actif: true,
      activite: "Lit b.js",
    });
    expect(etat.flux[0]).toMatchObject({ qui: "dev", quoi: "Lit b.js" });
    expect(etat.enAttente).toEqual([]);
    expect(etat).not.toHaveProperty("aujourdhui");
    s.ligne(
      ligne({
        type: "user",
        toolUseResult: { status: "completed", agentId: "a1", agentType: "dev" },
        message: { content: [{ type: "tool_result", tool_use_id: "t1" }] },
      }),
    );
    etat = s.instantane(T0 + 2000);
    expect(etat.agents[0].actif).toBe(false);
    expect(etat.flux[0]).toMatchObject({ qui: "dev", quoi: "A terminé" });
  });

  it("range le flux par heure, même si les fichiers arrivent dans le désordre", () => {
    const s = new Suivi();
    for (let i = 0; i < 200; i++)
      s.evenement(T0 + (i % 2 ? i : -i) * 1000, "dev", `e${i}`);
    const { flux } = s.instantane(T0);
    expect(flux[0].quoi).toBe("e199");
    expect(flux.map((e) => e.t)).toEqual(
      [...flux.map((e) => e.t)].sort((a, b) => b - a),
    );
  });

  it("ignore les lignes sans session ou sans message", () => {
    const s = new Suivi();
    s.ligne(null);
    s.ligne({ type: "summary" });
    s.ligne(ligne({ type: "attachment" }));
    expect(s.instantane(T0).agents).toEqual([]);
  });

  it("repère la limite atteinte, même dans une notification d'agent", () => {
    const s = new Suivi();
    s.ligne(
      ligne({
        type: "queue-operation",
        content:
          "<summary>failed: You've hit your 5-hour limit · resets 9:50pm (Europe/Paris) (error type rate_limit)</summary>",
      }),
    );
    const { limite } = s.instantane(T0 + 60e3);
    expect(limite.atteinte).toBe("cinq");
    expect(new Date(limite.fin).getHours()).toBe(21);
    expect(limite.fin - limite.debut).toBe(5 * H);
  });

  it("estime la fenêtre de 5 h d'après les messages", () => {
    const s = new Suivi();
    for (const t of [T0, T0 + H]) {
      s.ligne({
        ...ligne({
          type: "assistant",
          message: { id: String(t), model: "claude-opus-5-5", usage },
        }),
        timestamp: new Date(t).toISOString(),
      });
    }
    expect(s.instantane(T0 + 2 * H).limite).toEqual({
      debut: T0,
      fin: T0 + 5 * H,
      atteinte: null,
    });
  });
});

describe("limiteAtteinte", () => {
  it("lit l'heure de reprise, le lendemain si elle est passée", () => {
    const t = new Date(2026, 10, 15, 22, 0).getTime();
    const a = limiteAtteinte("You've hit your 5-hour limit · resets 6pm", t);
    expect(a.fenetre).toBe("cinq");
    expect(new Date(a.resetsAt)).toEqual(new Date(2026, 10, 16, 18, 0));
    expect(
      limiteAtteinte("hit your weekly limit · resets 9:05am", t),
    ).toMatchObject({ fenetre: "semaine" });
    expect(limiteAtteinte("rien à voir", t)).toBeNull();
    expect(
      limiteAtteinte("hit your weekly limit · resets Nov 20", t).resetsAt,
    ).toBeNull();
  });
});

describe("fenetreEstimee", () => {
  it("ouvre une nouvelle fenêtre au premier message après la fin de la précédente", () => {
    const h = [T0, T0 + 4 * H, T0 + 6 * H, T0 + 7 * H];
    expect(fenetreEstimee(h, null, T0 + 8 * H)).toEqual({
      debut: T0 + 6 * H,
      fin: T0 + 11 * H,
      atteinte: null,
    });
    expect(fenetreEstimee(h, null, T0 + 12 * H).debut).toBeNull();
    expect(fenetreEstimee([], null, T0).debut).toBeNull();
  });

  it("préfère l'heure de reprise d'une limite atteinte, ignore une limite passée", () => {
    const atteinte = { fenetre: "cinq", t: T0, resetsAt: T0 + 2 * H };
    expect(fenetreEstimee([T0], atteinte, T0 + H)).toEqual({
      debut: T0 - 3 * H,
      fin: T0 + 2 * H,
      atteinte: "cinq",
    });
    expect(fenetreEstimee([T0], atteinte, T0 + 3 * H).atteinte).toBeNull();
  });
});

describe("hoteAutorise", () => {
  it("refuse tout autre hôte que la machine locale (rebinding DNS)", () => {
    expect(hoteAutorise("localhost:4747", 4747)).toBe(true);
    expect(hoteAutorise("127.0.0.1:4747", 4747)).toBe(true);
    expect(hoteAutorise("piege.example:4747", 4747)).toBe(false);
    expect(hoteAutorise("localhost:80", 4747)).toBe(false);
    expect(hoteAutorise(undefined, 4747)).toBe(false);
  });
});
