// Faux client Supabase : chaque requête note ses appels (h.calls) et rend
// h.tables[table] (valeur ou fonction de la requête) ; h.rpcs[nom] pareil.
export function fakeClient(h) {
  const run = (r, q) => (typeof r === "function" ? r(q) : r);
  const from = (table) => {
    const q = { table, ops: [] };
    q.has = (op, ...args) =>
      q.ops.some(([o, ...a]) => o === op && args.every((v, i) => a[i] === v));
    h.calls.push(q);
    const chain = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then")
            return (ok, ko) =>
              Promise.resolve()
                .then(() => run(h.tables[table], q))
                .then((r) => r ?? { data: null, error: null })
                .then(ok, ko);
          return (...args) => {
            q.ops.push([prop, ...args]);
            return chain;
          };
        },
      },
    );
    return chain;
  };
  const rpc = (name, args) => {
    h.calls.push({ rpc: name, args });
    return Promise.resolve().then(
      () => run(h.rpcs[name], args) ?? { data: null, error: null },
    );
  };
  return { from, rpc };
}

export const resetFake = (h) => {
  h.tables = {};
  h.rpcs = {};
  h.calls = [];
};
