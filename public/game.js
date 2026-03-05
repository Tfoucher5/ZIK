const socket = io();
let player, ytReady = false, pendingVideo = null;
let personalProgress = { artist: false, title: false };

// ─── URL Params ───────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const ROOM_ID  = params.get('roomId')   || 'pop';
const USERNAME = params.get('username') || 'Joueur';
const USER_ID  = params.get('userId')   || null;
const IS_GUEST = params.get('isGuest') === '1';

// ─── YouTube ──────────────────────────────────────────────────────────────────
function onYouTubeIframeAPIReady() {
  player = new YT.Player('youtube-player', {
    height: '0', width: '0',
    playerVars: { autoplay: 1, controls: 0, enablejsapi: 1 },
    events: {
      onReady: (e) => {
        ytReady = true;
        e.target.setVolume(parseInt(localStorage.getItem('bt_volume') ?? '50'));
        if (pendingVideo) { loadVideo(pendingVideo.videoId, pendingVideo.startSeconds); pendingVideo = null; }
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) {
          player.setVolume(parseInt(localStorage.getItem('bt_volume') ?? '50'));
          player.unMute();
        }
      }
    }
  });
}

function loadVideo(videoId, startSeconds) {
  if (!ytReady || !player) { pendingVideo = { videoId, startSeconds }; return; }
  player.mute();
  player.loadVideoById({ videoId, startSeconds });
}

// ─── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const ui = {
    roomName:    document.getElementById('room-name'),
    round:       document.getElementById('round-info'),
    placeholder: document.getElementById('album-placeholder'),
    cover:       document.getElementById('reveal-cover'),
    summary:     document.getElementById('round-summary'),
    reason:      document.getElementById('round-reason'),
    social:      document.getElementById('first-finder-msg'),
    timer:       document.getElementById('timer-bar'),
    players:     document.getElementById('player-list'),
    guess:       document.getElementById('guessInput'),
    start:       document.getElementById('startBtn'),
    vol:         document.getElementById('volumeSlider'),
    hist:        document.getElementById('history-list'),
    feed:        document.getElementById('game-feedback'),
    artistVal:   document.querySelector('#slot-artist .val'),
    titleVal:    document.querySelector('#slot-title .val'),
    artistSlot:  document.getElementById('slot-artist'),
    titleSlot:   document.getElementById('slot-title'),
    gameOver:    document.getElementById('game-over-screen'),
    finalList:   document.getElementById('final-scores'),
    errorMsg:    document.getElementById('error-msg'),
    replayBtn:   document.getElementById('replayBtn'),
  };

  // Init volume
  const vol = localStorage.getItem('bt_volume') ?? '50';
  ui.vol.value = vol;
  ui.vol.oninput = (e) => {
    const v = parseInt(e.target.value);
    if (player?.setVolume) player.setVolume(v);
    localStorage.setItem('bt_volume', v);
  };

  // Rejoindre la room
  socket.emit('join_room', { roomId: ROOM_ID, username: USERNAME, userId: USER_ID, isGuest: IS_GUEST });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  ui.start.onclick = () => {
    socket.emit('request_new_game');
    ui.start.disabled = true;
    ui.start.textContent = 'Chargement...';
  };

  ui.replayBtn.onclick = () => {
    socket.emit('request_new_game');
    ui.replayBtn.disabled = true;
    ui.gameOver.style.display = 'none';
    ui.start.style.display = 'none';
  };

  ui.guess.onkeypress = (e) => {
    if (e.key === 'Enter') {
      const val = ui.guess.value.trim();
      if (val) socket.emit('submit_guess', val);
      ui.guess.value = '';
    }
  };

  // ─── Socket Events ────────────────────────────────────────────────────────

  socket.on('room_joined', ({ roomConfig }) => {
    if (roomConfig) ui.roomName.textContent = `${roomConfig.emoji} ${roomConfig.name}`;
    else ui.roomName.textContent = ROOM_ID.toUpperCase();
  });

  socket.on('update_players', (players) => {
    ui.players.innerHTML = players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
        return `<div class="p-card rank-${i+1}">
          <span class="pname">${medal} ${escHtml(p.name)}</span>
          <div class="pright">
            <div style="display:flex;gap:2px">
              <div class="pbadge ${p.foundArtist ? 'f' : ''}">A</div>
              <div class="pbadge ${p.foundTitle ? 'f' : ''}">T</div>
            </div>
            <span class="pscore">${p.score}pt</span>
          </div>
        </div>`;
      }).join('');
  });

  socket.on('init_history', () => { ui.hist.innerHTML = ''; });

  socket.on('game_starting', () => {
    ui.gameOver.style.display = 'none';
    ui.start.style.display = 'none';
  });

  socket.on('start_round', (data) => {
    personalProgress = { artist: false, title: false };
    ui.round.textContent = `Manche ${data.round} / ${data.total}`;
    ui.placeholder.style.display = 'flex';
    ui.cover.style.display = 'none';
    ui.cover.src = '';
    ui.summary.style.display = 'none';
    ui.gameOver.style.display = 'none';

    ui.artistVal.textContent = '???'; ui.titleVal.textContent = '???';
    ui.artistSlot.className = 'slot'; ui.titleSlot.className = 'slot';

    ui.timer.style.width = '100%';
    ui.timer.style.background = 'var(--accent)';
    ui.timer.style.transition = 'none';
    setTimeout(() => { ui.timer.style.transition = 'width 1s linear, background 0.5s'; }, 50);

    ui.guess.disabled = false; ui.guess.value = ''; ui.guess.focus();
    ui.start.style.display = 'none';
    ui.start.disabled = false; ui.start.textContent = '🎮 LANCER LA PARTIE';
    ui.feed.textContent = ''; ui.feed.className = '';

    loadVideo(data.videoId, data.startSeconds);
  });

  socket.on('timer_update', (data) => {
    const pct = (data.current / data.max) * 100;
    ui.timer.style.width = `${pct}%`;
    if (pct < 30)      ui.timer.style.background = 'var(--danger)';
    else if (pct < 60) ui.timer.style.background = '#f59e0b';
  });

  let feedTimeout;
  socket.on('feedback', (data) => {
    ui.feed.textContent = data.msg;
    ui.feed.className = '';
    void ui.feed.offsetWidth;
    ui.feed.className = `active ${data.type === 'miss' ? 'cold' : 'hot'}`;

    if (data.type === 'success_artist') {
      ui.artistVal.textContent = data.val;
      ui.artistSlot.className = 'slot found';
      personalProgress.artist = true;
    }
    if (data.type === 'success_title') {
      ui.titleVal.textContent = data.val;
      ui.titleSlot.className = 'slot found';
      personalProgress.title = true;
    }
    clearTimeout(feedTimeout);
    feedTimeout = setTimeout(() => ui.feed.classList.remove('active'), 2500);
  });

  socket.on('round_end', (data) => {
    const parts = data.answer.split(' - ');
    ui.artistVal.textContent = parts[0];
    ui.titleVal.textContent  = parts.slice(1).join(' - ');
    ui.artistSlot.className = `slot ${data.foundArtist ? 'found' : 'missed'}`;
    ui.titleSlot.className  = `slot ${data.foundTitle  ? 'found' : 'missed'}`;

    if (data.cover) {
      ui.cover.src = data.cover;
      ui.cover.style.display = 'block';
      ui.placeholder.style.display = 'none';
    }

    ui.summary.style.display = 'block';
    ui.reason.textContent = data.reason;
    ui.social.textContent = data.totalFound > 0
      ? `🏆 1er complet : ${data.firstFinder} — ${data.totalFound} joueur(s) ont tout trouvé`
      : "❌ Personne n'a trouvé";

    ui.guess.disabled = true;
    ui.timer.style.width = '0%';
    if (player && ytReady) player.stopVideo();

    const item = document.createElement('div');
    item.className = 'h-item';
    item.innerHTML = `
      ${data.cover ? `<img src="${data.cover}" alt="">` : ''}
      <div class="h-info">
        <div class="h-title">${escHtml(data.answer)}</div>
        <div class="h-tags">
          <span class="${data.foundArtist ? 'f' : ''}">A</span>
          <span class="${data.foundTitle  ? 'f' : ''}">T</span>
        </div>
      </div>`;
    ui.hist.prepend(item);
  });

  socket.on('game_over', (finalScores) => {
    if (player && ytReady) player.stopVideo();
    ui.guess.disabled = true;
    ui.timer.style.width = '0%';
    ui.summary.style.display = 'none';
    ui.replayBtn.disabled = false;

    ui.finalList.innerHTML = finalScores.map((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
      const guestTag = p.isGuest ? ' <span style="font-size:.7rem;color:#5a6478">(invité)</span>' : '';
      return `<div class="final-card rank-${i+1}">
        <span class="final-rank">${medal}</span>
        <span class="final-name">${escHtml(p.name)}${guestTag}</span>
        <span class="final-score">${p.score} pts</span>
      </div>`;
    }).join('');

    ui.gameOver.style.display = 'flex';
  });

  socket.on('server_error', (msg) => {
    ui.errorMsg.textContent = msg;
    ui.errorMsg.style.display = 'block';
    setTimeout(() => ui.errorMsg.style.display = 'none', 4000);
    ui.start.disabled = false;
    ui.start.textContent = '🎮 LANCER LA PARTIE';
    if (ui.replayBtn) { ui.replayBtn.disabled = false; }
  });
});

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
