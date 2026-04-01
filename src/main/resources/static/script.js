// ════════════════════════════════════════════════════════
// THEME — Dark / Light mode med localStorage
// ════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️ Ljust läge' : '🌙 Mörkt läge';
  }
}

// Initialisera tema direkt vid sidladdning
initTheme();

// ════════════════════════════════════════════════════════
// STATE  –  håller aktuell spelare och spel i minnet
// ════════════════════════════════════════════════════════
const state = {
  playerId:   null,
  playerName: null,
  gameId:     null,
  gameStatus: null,
};

// ════════════════════════════════════════════════════════
// TAB NAVIGATION
// ════════════════════════════════════════════════════════
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// ════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════

/** Uppdaterar status-baren längst upp */
function updateStatusBar() {
  document.getElementById('status-player').textContent =
    state.playerName
      ? `👤 ${state.playerName} (ID: ${state.playerId})`
      : 'Ingen spelare';

  document.getElementById('status-game').textContent =
    state.gameId ? `🎯 Spel #${state.gameId}` : 'Inget spel';

  document.getElementById('status-game-status').textContent =
    state.gameStatus ? `Status: ${state.gameStatus}` : '–';
}

/** Sätter feedbackmeddelande med grön/röd färg */
function setFeedback(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.style.color = isError ? '#f87171' : '#4ade80';
}

/** Formaterar ett värde — trimmar timestamps till bara datum */
function formatValue(val) {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return val.substring(0, 10);
  }
  return val ?? '–';
}

/** Formaterar ett objekt som "nyckel: värde"-rader */
function formatObject(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${formatValue(v)}`)
    .join('\n');
}

/** Omvandlar API-svar till enkel, läsbar text */
function formatData(data) {
  if (typeof data === 'string') return data;

  if (Array.isArray(data)) {
    if (data.length === 0) return '(inga resultat)';
    return data
      .map((item, i) => `── ${i + 1} ──\n${formatObject(item)}`)
      .join('\n\n');
  }

  if (typeof data === 'object' && data !== null) {
    return formatObject(data);
  }

  return String(data);
}

/** Skriver ut API-svar i ett <pre>-block som läsbar text */
function showOutput(elementId, data) {
  document.getElementById(elementId).textContent = formatData(data);
}

// ════════════════════════════════════════════════════════
// API LAYER  –  fetch-wrappers för POST / GET / PUT / DELETE
// ════════════════════════════════════════════════════════

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json();
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json();
}

async function apiPut(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.status;
}

// ════════════════════════════════════════════════════════
// PLAY-FLÖDE  –  Steg 1 / 2 / 3 + Historik
// ════════════════════════════════════════════════════════

/** Steg 1 – Skapa spelare */
async function playCreatePlayer() {
  const username = document.getElementById('play-username').value.trim();
  if (!username) {
    setFeedback('fb-player', '⚠️ Ange ett användarnamn!', true);
    return;
  }
  try {
    const data = await apiPost('/players', { username });
    state.playerId   = data.id;
    state.playerName = data.username;
    updateStatusBar();
    setFeedback('fb-player', `✅ Spelare "${data.username}" skapad (ID: ${data.id})`);
    document.getElementById('btn-start-game').disabled = false;
  } catch (e) {
    setFeedback('fb-player', `❌ ${e.message}`, true);
  }
}

/** Steg 2 – Starta spel */
async function playStartGame() {
  if (!state.playerId) {
    setFeedback('fb-game', '⚠️ Skapa en spelare först!', true);
    return;
  }
  try {
    const data = await apiPost('/games', { playerId: state.playerId });
    state.gameId     = data.id;
    state.gameStatus = data.status;
    updateStatusBar();
    setFeedback('fb-game', `✅ Spel startat! (ID: ${data.id}) – Gissa ett tal 1–5`);

    // Aktivera gissa-knappen och historikknappen
    document.getElementById('btn-guess').disabled   = false;
    document.getElementById('btn-history').disabled = false;

    // Återställ resultatlåda och historik inför nytt spel
    document.getElementById('guess-result-box').className = 'result-box hidden';
    document.getElementById('history-table').classList.add('hidden');
    document.getElementById('history-body').innerHTML = '';
    setFeedback('fb-history', '');
  } catch (e) {
    setFeedback('fb-game', `❌ ${e.message}`, true);
  }
}

/** Steg 3 – Skicka gissning */
async function playMakeGuess() {
  if (!state.gameId) {
    setFeedback('fb-guess', '⚠️ Starta ett spel först!', true);
    return;
  }
  if (state.gameStatus === 'FINISHED') {
    setFeedback('fb-guess', '🏁 Spelet är avslutat! Starta ett nytt spel.', true);
    return;
  }

  const num = parseInt(document.getElementById('play-guess').value, 10);
  if (isNaN(num) || num < 1 || num > 5) {
    setFeedback('fb-guess', '⚠️ Ange ett tal mellan 1 och 5!', true);
    return;
  }

  try {
    const data = await apiPost('/guesses', { gameId: state.gameId, guessedNumber: num });

    // Visa resultatrutan med rätt färg/ikon
    const box = document.getElementById('guess-result-box');
    const messages = {
      LOW:     '⬇️  För lågt – gissa högre!',
      HIGH:    '⬆️  För högt – gissa lägre!',
      CORRECT: '🎉  RÄTT! Du hittade det hemliga talet!',
    };
    box.className = `result-box ${data.result}`;
    box.textContent = messages[data.result] || data.result;

    if (data.result === 'CORRECT') {
      state.gameStatus = 'FINISHED';
      updateStatusBar();
      document.getElementById('btn-guess').disabled = true;
      setFeedback('fb-guess', '🏆 Grattis! Starta ett nytt spel för att spela igen.');
      launchConfetti();
    } else {
      setFeedback('fb-guess', `Gissning #${data.id} registrerad.`);
    }

    // Uppdatera historiken automatiskt efter varje gissning
    await playLoadHistory();
  } catch (e) {
    setFeedback('fb-guess', `❌ ${e.message}`, true);
  }
}

/** Ladda och visa gissningshistorik för aktuellt spel */
async function playLoadHistory() {
  if (!state.gameId) {
    setFeedback('fb-history', '⚠️ Starta ett spel först!', true);
    return;
  }
  try {
    const guesses = await apiGet(`/guesses/game/${state.gameId}`);
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';

    guesses.forEach((g, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${g.guessedNumber}</td>
        <td class="result-${g.result}">${g.result}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('history-table').classList.remove('hidden');
    setFeedback('fb-history', `Visar ${guesses.length} gissning(ar) för spel #${state.gameId}.`);
  } catch (e) {
    setFeedback('fb-history', `❌ ${e.message}`, true);
  }
}

// ════════════════════════════════════════════════════════
// PLAYER CRUD
// ════════════════════════════════════════════════════════

async function playerCreate() {
  const username = document.getElementById('p-create-username').value.trim();
  if (!username) { showOutput('p-create-output', '⚠️ Ange ett användarnamn!'); return; }
  try {
    showOutput('p-create-output', await apiPost('/players', { username }));
  } catch (e) {
    showOutput('p-create-output', `❌ Fel: ${e.message}`);
  }
}

async function playerGet() {
  const id = document.getElementById('p-get-id').value;
  if (!id) { showOutput('p-get-output', '⚠️ Ange ett ID!'); return; }
  try {
    showOutput('p-get-output', await apiGet(`/players/${id}`));
  } catch (e) {
    showOutput('p-get-output', `❌ Fel: ${e.message}`);
  }
}

async function playerUpdate() {
  const id       = document.getElementById('p-update-id').value;
  const username = document.getElementById('p-update-username').value.trim();
  if (!id || !username) { showOutput('p-update-output', '⚠️ Ange ID och nytt användarnamn!'); return; }
  try {
    showOutput('p-update-output', await apiPut(`/players/${id}`, { username }));
  } catch (e) {
    showOutput('p-update-output', `❌ Fel: ${e.message}`);
  }
}

async function playerDelete() {
  const id = document.getElementById('p-delete-id').value;
  if (!id) { showOutput('p-delete-output', '⚠️ Ange ett ID!'); return; }
  try {
    await apiDelete(`/players/${id}`);
    showOutput('p-delete-output', `✅ Spelare ID ${id} borttagen.`);
    // Rensa state om det var den aktiva spelaren
    if (parseInt(id) === state.playerId) {
      Object.assign(state, { playerId: null, playerName: null, gameId: null, gameStatus: null });
      updateStatusBar();
    }
  } catch (e) {
    showOutput('p-delete-output', `❌ Fel: ${e.message}`);
  }
}

// ════════════════════════════════════════════════════════
// GAME CRUD
// ════════════════════════════════════════════════════════

async function gameCreate() {
  const playerId = parseInt(document.getElementById('g-create-playerid').value, 10);
  if (!playerId) { showOutput('g-create-output', '⚠️ Ange ett spelar-ID!'); return; }
  try {
    showOutput('g-create-output', await apiPost('/games', { playerId }));
  } catch (e) {
    showOutput('g-create-output', `❌ Fel: ${e.message}`);
  }
}

async function gameGet() {
  const id = document.getElementById('g-get-id').value;
  if (!id) { showOutput('g-get-output', '⚠️ Ange ett ID!'); return; }
  try {
    showOutput('g-get-output', await apiGet(`/games/${id}`));
  } catch (e) {
    showOutput('g-get-output', `❌ Fel: ${e.message}`);
  }
}

async function gameDelete() {
  const id = document.getElementById('g-delete-id').value;
  if (!id) { showOutput('g-delete-output', '⚠️ Ange ett ID!'); return; }
  try {
    await apiDelete(`/games/${id}`);
    showOutput('g-delete-output', `✅ Spel ID ${id} borttaget.`);
    if (parseInt(id) === state.gameId) {
      state.gameId = null;
      state.gameStatus = null;
      updateStatusBar();
    }
  } catch (e) {
    showOutput('g-delete-output', `❌ Fel: ${e.message}`);
  }
}

// ════════════════════════════════════════════════════════
// GUESS CRUD
// ════════════════════════════════════════════════════════

async function guessGet() {
  const id = document.getElementById('guess-get-id').value;
  if (!id) { showOutput('guess-get-output', '⚠️ Ange ett ID!'); return; }
  try {
    showOutput('guess-get-output', await apiGet(`/guesses/${id}`));
  } catch (e) {
    showOutput('guess-get-output', `❌ Fel: ${e.message}`);
  }
}

async function guessList() {
  const gameId = document.getElementById('guess-list-gameid').value;
  if (!gameId) { showOutput('guess-list-output', '⚠️ Ange ett spel-ID!'); return; }
  try {
    showOutput('guess-list-output', await apiGet(`/guesses/game/${gameId}`));
  } catch (e) {
    showOutput('guess-list-output', `❌ Fel: ${e.message}`);
  }
}

async function guessDelete() {
  const id = document.getElementById('guess-delete-id').value;
  if (!id) { showOutput('guess-delete-output', '⚠️ Ange ett ID!'); return; }
  try {
    await apiDelete(`/guesses/${id}`);
    showOutput('guess-delete-output', `✅ Gissning ID ${id} borttagen.`);
  } catch (e) {
    showOutput('guess-delete-output', `❌ Fel: ${e.message}`);
  }
}

// ════════════════════════════════════════════════════════
// PREMIUM FX
// ════════════════════════════════════════════════════════

// 1 — Cursor glow follows mouse
const cursorGlow = document.getElementById('cursor-glow');
document.addEventListener('mousemove', (e) => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

// 2 — Card spotlight: track mouse position as CSS vars
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width  * 100) + '%');
    card.style.setProperty('--mouse-y', ((e.clientY - r.top)  / r.height * 100) + '%');
  });
});

// 3 — Canvas confetti burst on CORRECT guess
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const CX  = canvas.width  / 2;
  const CY  = canvas.height / 2;
  const COLORS = ['#a855f7','#ec4899','#f59e0b','#22c55e','#c084fc','#fcd34d','#f4f0ff'];

  const particles = Array.from({ length: 120 }, () => ({
    x:    CX + (Math.random() - 0.5) * 300,
    y:    CY + (Math.random() - 0.5) * 120,
    vx:   (Math.random() - 0.5) * 14,
    vy:   -(Math.random() * 20 + 6),
    w:    Math.random() * 9  + 3,
    h:    Math.random() * 5  + 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot:  Math.random() * 360,
    rotV: (Math.random() - 0.5) * 14,
    grav: 0.38,
    drag: 0.992,
    fade: Math.random() * 0.016 + 0.007,
    op:   1,
  }));

  let raf;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      if (p.op <= 0) continue;
      alive++;
      p.x  += p.vx;   p.vx *= p.drag;
      p.y  += p.vy;   p.vy += p.grav;
      p.rot += p.rotV;
      p.op  -= p.fade;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.op);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0) { raf = requestAnimationFrame(draw); }
    else { canvas.remove(); cancelAnimationFrame(raf); }
  })();
}

