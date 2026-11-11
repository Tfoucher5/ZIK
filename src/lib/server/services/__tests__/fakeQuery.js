import { vi } from "vitest";

// Faux client Supabase : chaque requête note sa table et ses appels chaînés
// (q.ops), et se résout par resolve(q) -> { data, error, count }.
// Les RPC se résolvent par rpc(nom, args), même forme.
export function fakeQuery(resolve = () => {}, rpc = () => {}) {
  const queries = [];
  const from = (table, schema = "public") => {
    const q = { table, schema, ops: [] };
    q.args = (name) => q.ops.find(([n]) => n === name)?.[1];
    // has("eq", "id", 1) : appel avec ces premiers arguments
    q.has = (name, ...want) =>
      q.ops.some(([n, a]) => n === name && want.every((v, i) => a[i] === v));
    queries.push(q);
    const chain = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then")
            return (ok, ko) =>
              Promise.resolve()
                .then(() => resolve(q))
                .then((r) => r ?? { data: null, error: null })
                .then(ok, ko);
          return (...args) => {
            q.ops.push([prop, args]);
            return chain;
          };
        },
      },
    );
    return chain;
  };
  const client = {
    from,
    schema: (name) => ({ from: (table) => from(table, name) }),
    rpc: vi.fn(
      async (name, args) =>
        (await rpc(name, args)) ?? { data: null, error: null },
    ),
    auth: {
      admin: {
        updateUserById: vi.fn(async () => ({ error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
        getUserById: vi.fn(async () => ({ data: { user: null } })),
      },
    },
  };
  return { client, queries, of: (t) => queries.filter((q) => q.table === t) };
}

// Clients anonyme (h.anon) et admin (h.admin) distincts, mêmes réponses :
// h.tables[table] et h.rpcs[nom] (valeur, ou fonction de la requête / des args).
export function fakeClients(h) {
  const run = (r, x) => (typeof r === "function" ? r(x) : r);
  const make = () =>
    fakeQuery(
      (q) => run(h.tables[q.table], q),
      (name, args) => run(h.rpcs[name], args),
    );
  // Gardés si vi.resetModules() relance la fabrique du mock
  h.anon ??= make();
  h.admin ??= make();
  h.reset = () => {
    h.tables = {};
    h.rpcs = {};
    for (const f of [h.anon, h.admin]) {
      f.queries.length = 0;
      f.client.rpc.mockClear();
    }
  };
  h.all = () => [...h.anon.queries, ...h.admin.queries];
  // Écritures d'un client (h.anon ou h.admin)
  h.writes = (f) =>
    f.queries.filter((q) =>
      ["insert", "update", "upsert", "delete"].some((o) => q.has(o)),
    );
  h.reset();
  return { supabase: h.anon.client, getAdminClient: () => h.admin.client };
}
