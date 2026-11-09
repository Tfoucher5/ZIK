import { vi } from "vitest";

// Faux client Supabase : chaque requête note sa table et ses appels chaînés
// (q.ops), et se résout par resolve(q) -> { data, error, count }.
export function fakeSupabase(resolve = () => {}) {
  const queries = [];
  const from = (table) => {
    const q = { table, ops: [] };
    q.args = (name) => q.ops.find(([n]) => n === name)?.[1];
    q.has = (name) => q.ops.some(([n]) => n === name);
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
    rpc: vi.fn(async () => ({ data: null, error: null })),
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
