// Les profils restent dans public et PostgREST ne joint pas une table d'un
// autre schéma (social.*) : on les lit à part, par paquets de 300.
export async function profilesByIds(
  sb,
  ids,
  cols = "id, username, avatar_url",
) {
  const unique = [...new Set(ids)].filter(Boolean);
  const byId = new Map();
  for (let i = 0; i < unique.length; i += 300) {
    const { data, error } = await sb
      .from("profiles")
      .select(cols)
      .in("id", unique.slice(i, i + 300));
    if (error) throw error;
    for (const p of data ?? []) byId.set(p.id, p);
  }
  return byId;
}
