import { supabase } from '$lib/server/config.js';

const BASE = 'https://www.zik-music.fr';
const INDEXNOW_KEY = '451a21245e3d4ea399e073c32dceb1c0';

const STATIC_URLS = [
  `${BASE}/`,
  `${BASE}/docs`,
  `${BASE}/rooms`,
  `${BASE}/playlists`,
  `${BASE}/cgu`,
  `${BASE}/confidentialite`,
  `${BASE}/mentions-legales`,
];

export async function POST({ request }) {
  // Protection par clé secrète pour éviter les appels non autorisés
  const auth = request.headers.get('x-admin-key');
  if (auth !== process.env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: rooms } = await supabase
    .from('rooms')
    .select('code')
    .eq('is_public', true)
    .order('last_active_at', { ascending: false })
    .limit(200);

  const roomUrls = (rooms || []).map((r) => `${BASE}/room/${r.code}`);
  const urlList = [...STATIC_URLS, ...roomUrls];

  const body = {
    host: 'www.zik-music.fr',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
    urlList,
  };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  return new Response(
    JSON.stringify({ submitted: urlList.length, status: res.status }),
    { status: res.ok ? 200 : 502, headers: { 'Content-Type': 'application/json' } },
  );
}
