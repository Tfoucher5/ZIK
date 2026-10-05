// Vidéo de présentation ZIK : chaque image est calculée à partir du temps t
// (en secondes), pour un rendu identique image par image (voir render.mjs).

const DURATION = 35.5;
const $ = (id) => document.getElementById(id);

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
// Apparition puis disparition en fondu sur [a, b]
const env = (t, a, b, fi = 0.35, fo = 0.3) =>
  Math.min(eo(prog(t, a, a + fi)), 1 - prog(t, b - fo, b));
const css = (el, o) => Object.assign(el.style, o);
const show = (el, op) => {
  el.style.opacity = op;
  el.style.visibility = op <= 0.001 ? 'hidden' : 'visible';
};
// Pseudo-aléatoire stable
const rnd = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const COVERS = Array.from({ length: 28 }, (_, i) => `covers/c${String(i).padStart(2, '0')}.jpg`);

// ── Construction des éléments ───────────────────────────────────────────────
const wall = $('wall');
const cols = [];
for (let c = 0; c < 4; c++) {
  const col = document.createElement('div');
  col.className = 'col';
  col.style.left = `${-90 + c * 322}px`;
  const set = Array.from({ length: 7 }, (_, k) => COVERS[(c * 7 + k) % 28]);
  for (const src of [...set, ...set]) {
    const img = document.createElement('img');
    img.src = src;
    col.appendChild(img);
  }
  wall.appendChild(col);
  cols.push(col);
}

function bars(el, n) {
  for (let i = 0; i < n; i++) el.appendChild(document.createElement('i'));
  return [...el.children];
}
const gBars = bars($('gEq'), 18);
const tvBars = bars($('tvEq'), 26);
const setBars = (list, t, max, on = 1) =>
  list.forEach((b, i) => {
    const h = 0.22 + 0.78 * Math.abs(Math.sin(t * (5 + (i % 5)) + i * 1.7)) * (0.55 + 0.45 * rnd(i));
    b.style.height = `${Math.max(8, h * max * on)}px`;
  });

// Classement
const PLAYERS = [
  { n: 'Julie', s: 14 },
  { n: 'Toi', s: 12, me: true },
  { n: 'Karim', s: 11 },
  { n: 'Lisa', s: 9 },
];
const rows = PLAYERS.map((p) => {
  const r = document.createElement('div');
  r.className = `row${p.me ? ' me' : ''}`;
  r.innerHTML = `<span class="rk"></span><span class="nm">${p.n}</span><span class="sc cond"></span>`;
  $('board').appendChild(r);
  return r;
});

// Fil d'activité des autres joueurs
const FEED = [
  { at: 1.3, html: '⚡ <b>Julie</b> a trouvé l’artiste', tm: '1,3 s' },
  { at: 2.6, html: '⚡ <b>Karim</b> a trouvé l’artiste', tm: '2,6 s' },
  { at: 3.1, html: '🏆 <b>Julie</b> a tout trouvé', tm: '3,1 s' },
];
const feed = FEED.map((f) => {
  const d = document.createElement('div');
  d.innerHTML = `<span>${f.html}</span><span class="tm">${f.tm}</span>`;
  $('feed').appendChild(d);
  return d;
});

// QCM
const SHAPES = [
  '<svg class="sh" viewBox="0 0 40 40"><polygon points="20,4 37,35 3,35" fill="#111"/></svg>',
  '<svg class="sh" viewBox="0 0 40 40"><polygon points="20,2 38,20 20,38 2,20" fill="#111"/></svg>',
  '<svg class="sh" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#111"/></svg>',
  '<svg class="sh" viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="4" fill="#111"/></svg>',
];
const QCOLORS = ['#ff5fd2', '#5ad1ff', '#ffe14d', '#7cf29a'];
const QTEXT = ['Starboy', 'Blinding Lights', 'Levitating', 'Save Your Tears'];
const choices = QTEXT.map((txt, i) => {
  const d = document.createElement('div');
  d.className = 'choice';
  d.style.background = QCOLORS[i];
  d.innerHTML = `${SHAPES[i]}<span>${txt}</span><span class="res" style="margin-left:auto;font-family:'Barlow Condensed';font-weight:800"></span>`;
  $('choices').appendChild(d);
  return d;
});

// Playlists
const PLAYLISTS = [
  ['Rap FR', [11, 15, 22, 10]],
  ['Années 80-90', [4, 3, 19, 13]],
  ['Chanson française', [12, 27, 8, 2]],
  ['Années 2000', [21, 18, 0, 14]],
  ['Années 2010', [1, 23, 24, 25]],
  ['Pop', [7, 9, 20, 26]],
];
const sleeves = PLAYLISTS.map(([name, ids], i) => {
  const s = document.createElement('div');
  s.className = 'sleeve';
  s.innerHTML = `<div class="grid">${ids.map((k) => `<img src="${COVERS[k]}" alt="">`).join('')}</div><div class="name cond">${name}</div>`;
  css(s, { left: `${i % 2 ? 560 : 90}px`, top: `${660 + Math.floor(i / 2) * 470}px` });
  $('s4').appendChild(s);
  return s;
});

// Zikle
const SEGS = [1, 2, 4, 7, 11, 16];
const zSegs = SEGS.map(() => {
  const s = document.createElement('span');
  s.style.flex = '1';
  s.innerHTML = '<i></i>';
  $('zBar').appendChild(s);
  return s.firstChild;
});
const TRIES = [
  { k: 'ko', ic: '✕', txt: 'Angèle - Tout oublier', at: 1.1 },
  { k: 'skip', ic: '»', txt: 'Passé', at: 2.0 },
  { k: 'ok', ic: '✓', txt: 'Stromae - Alors on danse', at: 3.1 },
];
const tries = TRIES.map((tr, i) => {
  const d = document.createElement('div');
  d.className = `try ${tr.k}`;
  d.innerHTML = `<span class="ic">${tr.ic}</span><span>${tr.txt}</span><span class="t">${SEGS[i]} s</span>`;
  $('tries').appendChild(d);
  return d;
});

// Salon : QR code factice, téléphones, équipes
const qr = $('qr');
qr.innerHTML = '<svg viewBox="0 0 25 25" width="264" height="264" shape-rendering="crispEdges"></svg>';
{
  const svg = qr.firstChild;
  let cells = '';
  const finder = (x, y) =>
    `<rect x="${x}" y="${y}" width="7" height="7" fill="#000"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#000"/>`;
  for (let y = 0; y < 25; y++)
    for (let x = 0; x < 25; x++) {
      const inFinder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
      if (!inFinder && rnd(x * 31 + y * 7) > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`;
    }
  svg.innerHTML = cells + finder(0, 0) + finder(18, 0) + finder(0, 18);
}
const NAMES = ['Julie', 'Karim', 'Lisa', 'Tom'];
const PICK = [1, 1, 3, 1];
const minis = NAMES.map((n, i) => {
  const m = document.createElement('div');
  m.className = 'mini';
  m.style.left = `${73 + i * 246}px`;
  m.innerHTML = `<div class="who">${i < 2 ? 'Les Vinyles' : 'Les Platines'}<br><b>${n}</b></div>
    <div class="joined cond">✓ Prêt</div>
    <div class="q">${QCOLORS.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
    <div class="res cond" style="text-align:center;font-size:40px;margin-top:-260px"></div>`;
  $('minis').appendChild(m);
  return m;
});
const TEAMS = [
  { n: 'Les Vinyles', s: 324, c: '#ff5fd2' },
  { n: 'Les Platines', s: 288, c: '#5ad1ff' },
];
const teams = TEAMS.map((tm, i) => {
  const d = document.createElement('div');
  d.className = 'team';
  css(d, { left: '40px', right: '40px', top: `${330 + i * 104}px`, background: `${tm.c}22`, border: `2px solid ${tm.c}` });
  d.innerHTML = `<span style="color:${tm.c};font-family:'Barlow Condensed';font-weight:800;font-size:40px">${i + 1}</span><span style="flex:1">${tm.n}</span><span class="cond sc" style="font-size:46px"></span>`;
  $('teams').appendChild(d);
  return d;
});

// ── Rendu d'une image ───────────────────────────────────────────────────────
function render(t) {
  // 1. Accroche : mur de pochettes et question
  const s1 = 1 - prog(t, 2.75, 3.25);
  show($('s1'), s1);
  if (s1 > 0) {
    const zoom = eio(prog(t, 2.5, 3.25));
    css(wall, { transform: `rotate(-8deg) scale(${1.18 + zoom * 0.9})` });
    cols.forEach((col, c) => {
      const loop = 7 * 322;
      const dir = c % 2 ? 1 : -1;
      const y = ((t * (140 + c * 30) * dir) % loop + loop) % loop;
      col.style.transform = `translateY(${-y - (c % 2) * 160}px)`;
    });
    ['h1', 'h2', 'h3', 'h4'].forEach((id, k) => {
      const p = back(prog(t, 0.15 + k * 0.3, 0.6 + k * 0.3));
      css($(id), { transform: `translateY(${(1 - p) * 90}px)`, opacity: clamp(p) });
    });
  }

  // Légendes
  [
    ['cap2', 3.3, 10.45],
    ['cap3', 10.65, 15.05],
    ['cap4', 15.35, 19.45],
    ['cap5', 19.65, 24.85],
    ['cap6', 25.05, 31.45],
  ].forEach(([id, a, b]) => {
    const o = env(t, a, b, 0.45, 0.3);
    show($(id), o);
    $(id).style.transform = `translateY(${(1 - eo(prog(t, a, a + 0.5))) * 50}px)`;
  });

  // Téléphone : entre, sort pour les playlists, revient pour le Zikle
  const inA = back(prog(t, 3.0, 3.75));
  const outA = eio(prog(t, 15.0, 15.6));
  const inB = back(prog(t, 19.45, 20.15));
  const outB = eio(prog(t, 24.7, 25.2));
  let py = 1400;
  let pOp = 0;
  if (t < 17) {
    py = (1 - inA) * 1400 + outA * 1500;
    pOp = t >= 3 ? 1 : 0;
  } else if (t >= 19.45) {
    py = (1 - inB) * 1400;
    pOp = 1 - outB;
  }
  show($('phone'), pOp);
  $('phone').style.transform = `translateY(${py}px) scale(${1 - outB * 0.1})`;

  renderGame(t - 3.0);
  renderQcm(t - 10.6);
  renderPlaylists(t - 15.2);
  renderZikle(t - 19.45);
  renderSalon(t - 24.8);
  renderOutro(t - 31.6);

  $('glow').style.opacity = 0.7 + 0.3 * Math.sin(t * 1.3);
}

function type(el, text, t, a, b) {
  const n = Math.round(clamp((t - a) / (b - a)) * text.length);
  el.textContent = text.slice(0, n);
  return n;
}

function renderGame(t) {
  const op = 1 - prog(t, 7.45, 7.7);
  show($('game'), op);
  if (op <= 0) return;
  const found = t >= 3.6;
  const sec = found ? 27 : Math.max(0, 30 - Math.floor(t));
  $('gNum').textContent = sec;
  $('gArc').setAttribute('stroke-dashoffset', String(603 * ((30 - (found ? 26.6 : 30 - t)) / 30)));
  setBars(gBars, t, 90, found ? 0.25 : 1);

  // Saisie : artiste puis titre
  const typedEl = $('typed');
  let typing = 0;
  if (t < 2.1) typing = type(typedEl, 'daft punk', t, 0.9, 1.8);
  else if (t < 3.6) typing = type(typedEl, 'one more time', t, 2.45, 3.4);
  else typedEl.textContent = '';
  $('ph').style.display = typing ? 'none' : 'inline';
  $('caret').style.opacity = Math.floor(t * 2.4) % 2 ? 0.2 : 1;

  const gotA = t >= 2.1;
  const gotT = t >= 3.6;
  $('slotA').classList.toggle('ok', gotA);
  $('slotT').classList.toggle('ok', gotT);
  $('valA').textContent = gotA ? 'Daft Punk' : '? ? ?';
  $('valT').textContent = gotT ? 'One More Time' : '? ? ?';
  $('ptsA').textContent = gotA ? '+1' : '';
  $('ptsT').textContent = gotT ? '+2' : '';
  const popA = gotA ? back(prog(t, 2.1, 2.45)) : 1;
  const popT = gotT ? back(prog(t, 3.6, 3.95)) : 1;
  $('slotA').style.transform = `scale(${0.94 + 0.06 * popA})`;
  $('slotT').style.transform = `scale(${0.94 + 0.06 * popT})`;

  feed.forEach((d, i) => {
    const p = back(prog(t, FEED[i].at, FEED[i].at + 0.3));
    css(d, { opacity: clamp(p), transform: `translateY(${(1 - p) * 20}px)` });
  });
  const toast = env(t, 3.7, 5.0, 0.25, 0.25);
  show($('toast'), toast);
  $('toast').style.transform = `scale(${0.7 + 0.3 * back(prog(t, 3.7, 4.05))})`;

  // Le jeu laisse place au classement
  const toBoard = eio(prog(t, 4.95, 5.35));
  ['input', 'slotA', 'slotT', 'feed'].forEach((id) => (($(id).style.opacity = 1 - toBoard)));
  document.querySelector('#game .ring').style.opacity = 1 - toBoard;
  $('gEq').style.opacity = 1 - toBoard;
  show($('board'), toBoard);

  const myScore = Math.round(12 + 3 * eo(prog(t, 5.9, 6.4)));
  const swap = eio(prog(t, 6.3, 6.9));
  const order = [
    [1, 0 + swap],
    [0, 1 - swap],
    [2, 2],
    [3, 3],
  ];
  rows.forEach((r, i) => {
    const pos = i === 0 ? order[0][1] : i === 1 ? order[1][1] : i;
    const enter = back(prog(t, 5.1 + i * 0.08, 5.55 + i * 0.08));
    css(r, { top: `${70 + pos * 122}px`, transform: `translateX(${(1 - enter) * 120}px)`, opacity: clamp(enter) });
    r.querySelector('.rk').textContent = Math.round(pos) + 1;
    r.querySelector('.sc').textContent = PLAYERS[i].me ? myScore : PLAYERS[i].s;
  });
}

function renderQcm(t) {
  const op = env(t, -0.15, 5.1, 0.3, 0.2);
  show($('qcm'), op);
  if (op <= 0) return;
  $('qCover').style.transform = `scale(${0.8 + 0.2 * back(prog(t, 0, 0.45))})`;
  const tapped = t >= 2.0;
  choices.forEach((c, i) => {
    const p = back(prog(t, 0.3 + i * 0.12, 0.7 + i * 0.12));
    const good = i === 1;
    const press = good ? 1 - 0.05 * Math.sin(Math.PI * prog(t, 2.0, 2.25)) : 1;
    css(c, {
      transform: `translateY(${(1 - p) * 60}px) scale(${press})`,
      opacity: clamp(p) * (tapped && !good ? 1 - 0.7 * prog(t, 2.1, 2.4) : 1),
      outline: good && t >= 2.2 ? '6px solid #fff' : 'none',
    });
    c.querySelector('.res').textContent = good && t >= 2.2 ? '✓ +2 · 1,9 s' : '';
  });
}

function renderPlaylists(t) {
  const op = env(t, 0, 4.4, 0.2, 0.35);
  show($('s4'), op);
  if (op <= 0) return;
  sleeves.forEach((s, i) => {
    const p = back(prog(t, 0.15 + i * 0.1, 0.75 + i * 0.1));
    const fl = Math.sin(t * 1.6 + i) * 8;
    css(s, {
      transform: `translateY(${(1 - p) * 900 + fl}px) rotate(${(1 - p) * (i % 2 ? 14 : -14) + (i % 2 ? 2 : -2)}deg)`,
      opacity: clamp(p * 1.5),
    });
  });
}

function renderZikle(t) {
  const op = t >= 0 ? 1 : 0;
  show($('zikle'), op);
  if (!op) return;
  // Écoute de l'extrait : 1 s, puis 2 s, puis 4 s
  const fills = [prog(t, 0.6, 0.95), prog(t, 1.4, 1.8), prog(t, 2.25, 2.85), 0, 0, 0];
  zSegs.forEach((s, i) => (s.style.transform = `scaleX(${fills[i]})`));
  tries.forEach((d, i) => {
    const p = back(prog(t, TRIES[i].at, TRIES[i].at + 0.35));
    css(d, { opacity: clamp(p), transform: `translateX(${(1 - p) * -80}px)` });
  });
  const sh = back(prog(t, 3.7, 4.1));
  css($('share'), { opacity: clamp(sh), transform: `scale(${0.6 + 0.4 * sh})` });
}

function renderSalon(t) {
  const op = env(t, 0, 6.85, 0.4, 0.3);
  show($('s6'), op);
  if (op <= 0) return;
  $('tv').style.transform = `scale(${0.9 + 0.1 * eo(prog(t, 0, 0.5))})`;

  const lobby = 1 - prog(t, 2.0, 2.2);
  const round = Math.min(prog(t, 2.1, 2.3), 1 - prog(t, 4.2, 4.4));
  const reveal = prog(t, 4.3, 4.5);
  show($('tvLobby'), lobby);
  show($('tvRound'), round);
  show($('tvReveal'), reveal);

  const joined = minis.filter((_, i) => t >= 0.7 + i * 0.25).length;
  $('tvJoined').textContent = `${joined} joueur${joined > 1 ? 's' : ''} connecté${joined > 1 ? 's' : ''}`;
  $('tvNum').textContent = Math.max(0, 12 - Math.floor((t - 2.1) * 1.4));
  setBars(tvBars, t, 110, t < 4.2 ? 1 : 0.2);
  const answered = minis.filter((_, i) => t >= 2.7 + i * 0.3).length;
  $('tvAnswered').textContent = `${answered} / 4 ont répondu`;

  minis.forEach((m, i) => {
    const p = back(prog(t, 0.6 + i * 0.25, 1.1 + i * 0.25));
    m.style.transform = `translateY(${(1 - p) * 500}px)`;
    m.style.opacity = clamp(p);
    const ready = t < 2.2;
    m.querySelector('.joined').style.display = ready ? 'block' : 'none';
    const q = m.querySelector('.q');
    q.style.display = ready ? 'none' : 'grid';
    const tapped = t >= 2.7 + i * 0.3;
    [...q.children].forEach((b, k) => {
      b.style.opacity = tapped && k !== PICK[i] ? 0.18 : 1;
      b.style.outline = tapped && k === PICK[i] ? '4px solid #fff' : 'none';
    });
    const res = m.querySelector('.res');
    const good = PICK[i] === 1;
    res.textContent = t >= 4.4 ? (good ? '✓ +2' : '✕') : '';
    res.style.color = good ? '#22c55e' : '#ef4444';
    q.style.opacity = t >= 4.4 ? 0.15 : 1;
  });

  teams.forEach((d, i) => {
    const p = back(prog(t, 4.6 + i * 0.15, 5.0 + i * 0.15));
    css(d, { opacity: clamp(p), transform: `translateY(${(1 - p) * 40}px)` });
    d.querySelector('.sc').textContent = Math.round(TEAMS[i].s * eo(prog(t, 4.7, 5.6)));
  });
}

function renderOutro(t) {
  const op = t >= 0 ? 1 : 0;
  show($('outro'), op);
  if (!op) return;
  const r = eio(prog(t, 0, 0.55)) * 1500;
  $('outro').style.clipPath = `circle(${r}px at 50% 46%)`;
  const lp = back(prog(t, 0.35, 0.9));
  css($('logo'), { transform: `skewX(-8deg) scale(${0.4 + 0.6 * lp})`, opacity: clamp(lp * 1.4) });
  ['tag1', 'tag2', 'tag3'].forEach((id, k) => {
    const p = back(prog(t, 0.85 + k * 0.25, 1.25 + k * 0.25));
    css($(id), { opacity: clamp(p), transform: `translateY(${(1 - p) * 50}px)` });
  });
}

window.DURATION = DURATION;
window.render = render;
window.ready = Promise.all([
  document.fonts.ready,
  ...[...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
]);

// Aperçu dans un navigateur : lecture en boucle, ?t=12.5 pour figer une image
const fixed = new URLSearchParams(location.search).get('t');
if (fixed !== null) render(Number(fixed));
else if (!navigator.webdriver) {
  const start = performance.now();
  const loop = (now) => {
    render(((now - start) / 1000) % DURATION);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
