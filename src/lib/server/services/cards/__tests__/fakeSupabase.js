// Faux client Supabase : chaque from(table) enregistre la chaîne d'appels
// (select, eq, in, update…) et, une fois attendu, renvoie ce que `respond`
// décide pour cette requête. Aucune base réelle n'est jamais touchée.
export function fakeSupabase(respond = () => ({ data: null, error: null })) {
  const calls = [];
  const run = (q) =>
    Promise.resolve()
      .then(() => respond(q))
      .then((r) => r ?? { data: null, error: null });
  const builder = (q) => {
    calls.push(q);
    const self = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then") return (ok, ko) => run(q).then(ok, ko);
          return (...args) => {
            q.ops.push([prop, ...args]);
            return self;
          };
        },
      },
    );
    return self;
  };
  return {
    calls,
    from: (table) => builder({ table, ops: [] }),
    rpc: (fn, args) => {
      const q = { table: null, rpc: fn, args, ops: [] };
      calls.push(q);
      return run(q);
    },
  };
}

// Arguments du premier appel `name` d'une requête, ou undefined
export const arg = (q, name) => q.ops.find(([op]) => op === name)?.slice(1);
export const has = (q, name) => q.ops.some(([op]) => op === name);
// Valeur passée à .eq(col, v)
export const eqOf = (q, col) =>
  q.ops.find(([op, c]) => op === "eq" && c === col)?.[2];
export const kind = (q) =>
  ["insert", "update", "upsert", "delete"].find((k) => has(q, k)) || "select";
// Requêtes d'écriture sur une table
export const writes = (sb, table, k) =>
  sb.calls.filter((q) => q.table === table && kind(q) === k);
