// Faux client Supabase des tests de priorité : note les filtres reçus dans m
export function fakeVideoDb(m) {
  const query = (table) => {
    let ids;
    let rows = () => m.tables[table] ?? [];
    const result = () =>
      m.tableErrors[table]
        ? { data: null, error: { message: m.tableErrors[table] } }
        : { data: rows(), error: null };
    const q = {
      select: (columns) => {
        if (table === "tracks") m.trackSelect = columns;
        return q;
      },
      is: () => q,
      or: (filter) => {
        m.or = filter;
        return q;
      },
      neq: (col, value) => {
        const before = rows;
        rows = () => before().filter((r) => r[col] !== value);
        return q;
      },
      gte: (col, value) => {
        m.gte = { col, value };
        return q;
      },
      order: () => q,
      in: (col, values) => {
        ids = values;
        m.inColumns[table] = col;
        if (table === "custom_playlists") m.ownerBatches.push(values.length);
        if (table === "rooms") {
          const before = rows;
          rows = () => before().filter((r) => values.includes(r[col]));
        }
        return q;
      },
      limit: async () => {
        if (table !== "tracks") return result();
        m.trackQueries.push(ids);
        const data = m.tracksFor(ids);
        return data instanceof Error
          ? { data: null, error: { message: data.message } }
          : { data, error: null };
      },
      then: (resolve) => resolve(result()),
      update: () => ({ eq: async () => ({ error: null }) }),
    };
    return q;
  };
  const sb = { from: query };
  sb.schema = () => sb;
  return sb;
}
