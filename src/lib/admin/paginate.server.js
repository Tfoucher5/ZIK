const PAGE = 1000;

// Supabase plafonne chaque réponse à 1000 lignes : on lit page par page.
export async function fetchAllRows(build) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}
