// Remplit la base de staging avec le catalogue de la prod : titres, cartes,
// playlists et rooms officielles, succès. Aucune donnée personnelle (comptes,
// scores, abonnements, mails) : les playlists et rooms sont rattachées au
// compte admin de staging, les autres liens vers un compte sont vidés.
//
// Usage : node scripts/seed-staging.mjs <pseudo admin sur le staging>
// Lecture de la prod en lecture seule, écriture sur le staging seulement.
// Demande la CLI Supabase connectée (npx supabase login).

import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROD = "fbeubmwhxytniohodlgr";
const STAGING = "ieuknbblonybkiqknonn";
const CHUNK = 2000;

const adminName = process.argv[2];
if (!adminName)
  throw new Error("Usage : node scripts/seed-staging.mjs <pseudo>");

const tmp = mkdtempSync(join(tmpdir(), "zik-seed-"));
const cli = (args) =>
  execSync(`npx -y supabase@latest db query ${args}`, {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });

function read(ref, sql) {
  const out = cli(`--remote=${ref} --read-only --output-format json "${sql}"`);
  return JSON.parse(out.slice(out.indexOf("{"))).rows;
}

function write(sql) {
  const file = join(tmp, "seed.sql");
  writeFileSync(file, sql);
  // --yes : écriture sans question, jamais ailleurs que sur STAGING
  cli(`--remote=${STAGING} --yes -f "${file}"`);
}

const [admin] = read(
  STAGING,
  `select id from public.profiles where username = '${adminName.replace(/'/g, "''")}'`,
);
if (!admin) throw new Error(`Compte « ${adminName} » absent du staging`);

// Ordre imposé par les clés étrangères. where : lignes copiées ; set : colonnes
// remplacées (liens vers un compte de la prod).
const official = "is_official";
const TABLES = [
  { t: "achievements" },
  { t: "answer_types" },
  { t: "card_artists" },
  { t: "card_albums" },
  { t: "cards", set: { first_owner_id: null } },
  { t: "tracks" },
  { t: "card_sets" },
  { t: "card_set_items" },
  {
    t: "custom_playlists",
    where: official,
    set: { owner_id: admin.id, linked_room_id: null },
  },
  {
    t: "custom_playlist_tracks",
    where: `playlist_id in (select id from public.custom_playlists where ${official})`,
  },
  {
    t: "track_answers",
    where: `track_id in (select c.id from public.custom_playlist_tracks c join public.custom_playlists p on p.id = c.playlist_id where p.${official})`,
  },
  {
    t: "rooms",
    where: official,
    set: { owner_id: admin.id },
    // une room officielle peut pointer vers une playlist non copiée
    fix: `update public.rooms set playlist_id = null where playlist_id not in (select id from public.custom_playlists)`,
  },
  {
    t: "room_playlists",
    where: `room_id in (select id from public.rooms where ${official}) and playlist_id in (select id from public.custom_playlists where ${official})`,
  },
  { t: "daily_songs" },
  { t: "zikle_pool" },
  { t: "weekly_challenges", set: { top_contributor_id: null } },
];

const tableNames = TABLES.map((x) => `'${x.t}'`).join(",");
// Schéma de chaque table dans chaque base (phase 4 : la prod suit le staging
// à la release, les deux peuvent différer entre-temps)
const SCHEMAS = "'public','cards'";
const qualified = (ref) => {
  const m = {};
  for (const r of read(
    ref,
    `select table_name t, table_schema s from information_schema.tables where table_type = 'BASE TABLE' and table_schema in (${SCHEMAS}) and table_name in (${tableNames})`,
  ))
    m[r.t] = `${r.s}.${r.t}`;
  return m;
};
const prodName = qualified(PROD);
const stagingName = qualified(STAGING);
const cols = {};
for (const r of read(
  PROD,
  `select table_name t, string_agg(column_name, ',' order by ordinal_position) c from information_schema.columns where table_schema in (${SCHEMAS}) and table_name in (${tableNames}) and is_generated = 'NEVER' and coalesce(identity_generation, '') <> 'ALWAYS' group by 1`,
))
  cols[r.t] = r.c.split(",");

// Pagination stable : tri sur la clé primaire (la 1re colonne n'est pas unique)
const pk = {};
for (const r of read(
  PROD,
  `select c.relname t, string_agg(quote_ident(a.attname), ',' order by k.n) k from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace s on s.oid = c.relnamespace cross join lateral unnest(i.indkey) with ordinality k(attnum, n) join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum where i.indisprimary and s.nspname in (${SCHEMAS}) and c.relname in (${tableNames}) group by 1`,
))
  pk[r.t] = r.k;

// Triggers coupés (cartes rattachées aux sets, compteurs) : on copie l'état tel quel
const HEAD = "set session_replication_role = replica;\n";

write(
  HEAD +
    TABLES.slice()
      .reverse()
      .map((x) => `delete from ${stagingName[x.t]};`)
      .join("\n") +
    `\nupdate public.profiles set role = 'super_admin' where id = '${admin.id}';`,
);

// L'API refuse les requêtes trop lourdes : on coupe en deux jusqu'à passer
const MAX_BYTES = 400_000;
function insert(t, list, rows) {
  const json = JSON.stringify(rows);
  if (json.length > MAX_BYTES && rows.length > 1) {
    const half = rows.length >> 1;
    insert(t, list, rows.slice(0, half));
    insert(t, list, rows.slice(half));
    return;
  }
  write(
    // do nothing : le serveur de staging peut créer des cartes pendant la copie
    `${HEAD}insert into ${stagingName[t]} (${list}) select ${list} from json_populate_recordset(null::${stagingName[t]}, $seed$${json}$seed$) on conflict do nothing;`,
  );
}

for (const { t, where, set, fix } of TABLES) {
  const list = cols[t].map((c) => `"${c}"`).join(", ");
  let total = 0;
  for (let offset = 0; ; offset += CHUNK) {
    const rows = read(
      PROD,
      `select ${list} from ${prodName[t]} ${where ? `where ${where}` : ""} order by ${pk[t] ?? list} limit ${CHUNK} offset ${offset}`,
    );
    if (!rows.length) break;
    for (const row of rows) Object.assign(row, set);
    insert(t, list, rows);
    total += rows.length;
    if (rows.length < CHUNK) break;
  }
  if (fix) write(HEAD + fix);
  console.log(`${t.padEnd(24)} ${total}`);
}

// Les séquences repartent après les ids copiés
write(`do $$ declare s record; begin
  for s in select pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) seq, c.table_schema sch, c.table_name t, c.column_name col
    from information_schema.columns c
    where c.table_schema in (${SCHEMAS}) and pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) is not null
  loop
    execute format('select setval(%L, coalesce((select max(%I) from %I.%I), 0) + 1, false)', s.seq, s.col, s.sch, s.t);
  end loop;
end $$;`);
console.log("Seed terminé.");
