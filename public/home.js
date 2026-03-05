// ─── Config Supabase ──────────────────────────────────────────────────────────
// Remplace ces valeurs par tes clés : Supabase Dashboard → Settings → API
const SUPABASE_URL     = window.ZIK_SUPABASE_URL     || 'REMPLACE_PAR_TON_URL_SUPABASE';
const SUPABASE_ANON_KEY = window.ZIK_SUPABASE_ANON_KEY || 'REMPLACE_PAR_TA_CLE_ANON_SUPABASE';

const SUPABASE_OK = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;

const { createClient } = supabase;
const sb = SUPABASE_OK ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ─── State ────────────────────────────────────────────────────────────────────
let currentUser = null;
let pendingRoom = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  loadRooms();
  loadLeaderboards();
  bindUI();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function initAuth() {
  if (!SUPABASE_OK || !sb) {
    // Pas de Supabase configuré → mode guest uniquement
    showNavAuth();
    console.warn('⚠️ Supabase non configuré — auth désactivée, mode guest uniquement');
    return;
  }
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      await setCurrentUser(session.user);
    } else {
      showNavAuth();
    }
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await setCurrentUser(session.user);
        closeModal();
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        showNavAuth();
      }
    });
  } catch (err) {
    console.error('Auth error:', err);
    showNavAuth();
  }
}

async function setCurrentUser(user) {
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  currentUser = { ...user, profile };
  showNavUser(profile?.username || user.email, profile?.avatar_url);
}

function showNavUser(username, avatarUrl) {
  document.getElementById('nav-auth').style.display = 'none';
  document.getElementById('nav-user').style.display = 'flex';
  document.getElementById('nav-username').textContent = username;
  const avatar = document.getElementById('nav-avatar');
  avatar.src = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=0d1117`;
}

function showNavAuth() {
  document.getElementById('nav-auth').style.display = 'flex';
  document.getElementById('nav-user').style.display = 'none';
}

// ─── Bind UI ──────────────────────────────────────────────────────────────────
function bindUI() {
  // Nav
  document.getElementById('openLoginBtn').onclick = () => openModal('login');
  document.getElementById('openRegisterBtn').onclick = () => openModal('register');
  document.getElementById('logoutBtn').onclick = async () => {
    await sb.auth.signOut();
  };
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('modal-overlay')?.addEventListener?.('click', e => {
    if (e.target.id === 'auth-modal') closeModal();
  });

  // Overlay click
  document.getElementById('auth-modal').onclick = (e) => {
    if (e.target === document.getElementById('auth-modal')) closeModal();
  };
  document.getElementById('guest-modal').onclick = (e) => {
    if (e.target === document.getElementById('guest-modal')) closeGuestModal();
  };

  // Switch views
  document.getElementById('switchToRegister').onclick = (e) => { e.preventDefault(); showView('register'); };
  document.getElementById('switchToLogin').onclick = (e) => { e.preventDefault(); showView('login'); };
  document.getElementById('closeConfirm').onclick = closeModal;

  // Login
  document.getElementById('loginSubmit').onclick = handleLogin;
  document.getElementById('loginPassword').onkeypress = (e) => { if (e.key === 'Enter') handleLogin(); };

  // Register
  document.getElementById('registerSubmit').onclick = handleRegister;
  document.getElementById('regPassword').onkeypress = (e) => { if (e.key === 'Enter') handleRegister(); };

  // Guest modal
  document.getElementById('cancelGuest').onclick = closeGuestModal;
  document.getElementById('confirmGuest').onclick = confirmGuestJoin;
  document.getElementById('guestUsername').onkeypress = (e) => { if (e.key === 'Enter') confirmGuestJoin(); };
  document.getElementById('guestToLogin').onclick = (e) => { e.preventDefault(); closeGuestModal(); openModal('login'); };
}

// ─── Auth Actions ─────────────────────────────────────────────────────────────
async function handleLogin() {
  if (!sb) return showError(document.getElementById('login-error'), 'Supabase non configuré.');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginSubmit');
  const err = document.getElementById('login-error');

  if (!email || !password) return showError(err, 'Remplis tous les champs.');

  btn.disabled = true; btn.textContent = 'Connexion...';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Se connecter';

  if (error) showError(err, error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message);
  else err.style.display = 'none';
}

async function handleRegister() {
  if (!sb) return showError(document.getElementById('register-error'), 'Supabase non configuré.');
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const btn = document.getElementById('registerSubmit');
  const err = document.getElementById('register-error');

  if (!username || !email || !password) return showError(err, 'Remplis tous les champs.');
  if (username.length < 3) return showError(err, 'Pseudo trop court (min. 3 caractères).');
  if (password.length < 6) return showError(err, 'Mot de passe trop court (min. 6 caractères).');

  const { data: existing } = await sb.from('profiles').select('id').eq('username', username).single();
  if (existing) return showError(err, 'Ce pseudo est déjà pris.');

  btn.disabled = true; btn.textContent = 'Création...';
  const { error } = await sb.auth.signUp({
    email, password,
    options: { data: { username } }
  });
  btn.disabled = false; btn.textContent = 'Créer mon compte';

  if (error) showError(err, error.message);
  else showView('confirm');
}

// ─── Rooms ────────────────────────────────────────────────────────────────────
async function loadRooms() {
  const grid = document.getElementById('rooms-grid');
  try {
    const res = await fetch('/api/rooms');
    const rooms = await res.json();

    let totalOnline = 0;
    grid.innerHTML = rooms.map(room => {
      totalOnline += room.online || 0;
      return `
        <div class="room-card" style="--room-color:${room.color};--room-gradient:${room.gradient}" onclick="joinRoom('${room.id}')">
          <div class="room-accent"></div>
          <div class="room-card-inner">
            <span class="room-emoji">${room.emoji}</span>
            <div class="room-name">${room.name}</div>
            <div class="room-desc">${room.description}</div>
            <div class="room-footer">
              <span class="room-online"><span class="dot"></span>${room.online || 0} en ligne</span>
              <button class="room-play" onclick="event.stopPropagation();joinRoom('${room.id}')">JOUER →</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('total-online').textContent = `${totalOnline} joueur${totalOnline !== 1 ? 's' : ''} en ligne`;
  } catch (err) {
    grid.innerHTML = '<p style="color:#5a6478;padding:20px">Impossible de charger les rooms.</p>';
  }

  // Refresh toutes les 30s
  setTimeout(loadRooms, 30000);
}

function joinRoom(roomId) {
  pendingRoom = roomId;
  if (currentUser) {
    // Joueur connecté → aller directement au jeu
    goToGame(roomId, currentUser.profile?.username || currentUser.email, currentUser.id, false);
  } else {
    // Joueur non connecté → modal guest
    openGuestModal(roomId);
  }
}

function goToGame(roomId, username, userId, isGuest) {
  const params = new URLSearchParams({ roomId, username, userId: userId || '', isGuest: isGuest ? '1' : '0' });
  window.location.href = `/game.html?${params}`;
}

// ─── Guest Modal ──────────────────────────────────────────────────────────────
function openGuestModal(roomId) {
  pendingRoom = roomId;
  const saved = localStorage.getItem('bt_guest_username');
  if (saved) document.getElementById('guestUsername').value = saved;
  document.getElementById('guest-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('guestUsername').focus(), 100);
}

function closeGuestModal() {
  document.getElementById('guest-modal').style.display = 'none';
}

function confirmGuestJoin() {
  const username = document.getElementById('guestUsername').value.trim();
  if (!username) { document.getElementById('guestUsername').focus(); return; }
  localStorage.setItem('bt_guest_username', username);
  closeGuestModal();
  goToGame(pendingRoom, username, null, true);
}

// ─── Leaderboards ─────────────────────────────────────────────────────────────
async function loadLeaderboards() {
  // Weekly
  fetch('/api/leaderboard/weekly')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('weekly-list');
      if (!data.length) { el.innerHTML = '<div class="lb-loading">Pas encore de données</div>'; return; }
      el.innerHTML = data.map((p, i) => `
        <div class="lb-row">
          <div class="lb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
          <div class="lb-name">${escHtml(p.username)}</div>
          <div>
            <div class="lb-score">${p.weekly_score} pts</div>
            <div class="lb-meta">${p.games_count} parties</div>
          </div>
        </div>
      `).join('');
    })
    .catch(() => { document.getElementById('weekly-list').innerHTML = '<div class="lb-loading">—</div>'; });

  // ELO
  fetch('/api/leaderboard/elo')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('elo-list');
      if (!data.length) { el.innerHTML = '<div class="lb-loading">Pas encore de données</div>'; return; }
      el.innerHTML = data.map((p, i) => `
        <div class="lb-row">
          <div class="lb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
          <div class="lb-name">${escHtml(p.username)} <span style="font-size:.7rem;color:#5a6478">Niv.${p.level}</span></div>
          <div>
            <div class="lb-score">⚡ ${p.elo}</div>
            <div class="lb-meta">${p.games_played} parties</div>
          </div>
        </div>
      `).join('');
    })
    .catch(() => { document.getElementById('elo-list').innerHTML = '<div class="lb-loading">—</div>'; });
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(view) {
  showView(view);
  document.getElementById('auth-modal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('auth-modal').style.display = 'none';
}
function showView(view) {
  ['login', 'register', 'confirm'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === view ? 'block' : 'none';
  });
}
function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
