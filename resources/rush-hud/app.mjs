import { normalize } from './model.mjs';
import { emptyManagerAssignments, loadManagerAssignments } from './assignments.mjs';
import { updateMarkup, changes, presentationChanges } from './motion.mjs';
import { loadDefaultTheme } from './theme.mjs';
import { view } from './view.mjs';

const root = document.querySelector('#hud');
const params = new URLSearchParams(location.search);
const preview = params.get('preview') === '1';
let latest = null, received = 0, connected = false, hidden = false;
let lastMarkup = '', previousGame = null;
let gameoverSince = null;
let settings = {};
let managerAssignments = emptyManagerAssignments();
let assignmentRefresh = null;
let assignmentMap = '';
const damageTotals = new Map();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let theme;
try { theme = await loadDefaultTheme(); }
catch (error) { root.textContent = `${error.message}. Keep JT Hud Manager's default HUD installed, then refresh this source.`; throw error; }

root.addEventListener('error', event => {
  const image = event.target;
  if (!image.matches?.('img[data-identity-image]')) return;
  const src = image.getAttribute('src');
  if (!src || theme.failedImages.has(src)) return;
  theme.failedImages.add(src);
  lastMarkup = '';
  render();
}, true);

function animate(node, frames, options) {
  if (node && !reducedMotion.matches) node.animate(frames, options);
}
function animateAll(selector, frames, options, stagger = 0) {
  if (reducedMotion.matches) return;
  [...root.querySelectorAll(selector)].forEach((node, index) => node.animate(frames, { ...options, delay: (options.delay || 0) + index * stagger }));
}
function playPresentationMotion(before, game) {
  const motion = presentationChanges(before, game);
  const ease = 'cubic-bezier(.22,1,.36,1)';
  if (motion.initial) {
    animate(root.querySelector('#matchbar'), [{ opacity: 0, transform: 'translate(-50%, -36px) scale(.97)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 650, easing: ease });
    animateAll('.teambox.left .player-horizontal-container', [{ opacity: 0, transform: 'translate(-45px, 70px) scale(.94)' }, { opacity: 1, transform: 'translate(0, 0) scale(1)' }], { duration: 620, easing: ease, fill: 'backwards' }, 85);
    animateAll('.teambox.right .player-horizontal-container', [{ opacity: 0, transform: 'translate(45px, 70px) scale(.94)' }, { opacity: 1, transform: 'translate(0, 0) scale(1)' }], { duration: 620, easing: ease, fill: 'backwards' }, 85);
    animate(root.querySelector('.observed'), [{ opacity: 0, transform: 'translate(-50%, 70px) scale(.94)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 680, delay: 180, easing: ease, fill: 'backwards' });
    animate(root.querySelector('.rush-radar'), [{ opacity: 0, transform: 'translate(-35px, -20px) scale(.92)' }, { opacity: 1, transform: 'translate(0, 0) scale(1)' }], { duration: 600, delay: 120, easing: ease, fill: 'backwards' });
  }
  if (motion.phase) {
    if (game.phase === 'freezetime') animateAll('.team-econ-panel.show', [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: ease }, 90);
    if (game.phase === 'over') animate(root.querySelector('.win_announcement.show'), [{ opacity: 0, transform: 'translate(-50%, -24px) scale(.88)' }, { opacity: 1, transform: 'translate(-50%, 4px) scale(1.03)', offset: .72 }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 620, easing: ease });
    if (game.phase === 'paused') animate(root.querySelector('#pause.show'), [{ opacity: 0, transform: 'translate(-50%, -30px) scale(.94)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 500, easing: ease });
    if (['timeout_ct', 'timeout_t'].includes(game.phase)) animate(root.querySelector('#timeout.show'), [{ opacity: 0, transform: 'translate(-50%, -30px) scale(.94)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 500, easing: ease });
  }
  if (motion.round) animate(root.querySelector('#timer'), [{ transform: 'perspective(400px) rotateX(-75deg)', opacity: .2 }, { transform: 'perspective(400px) rotateX(0)', opacity: 1 }], { duration: 520, easing: ease });
  if (motion.radar) animate(root.querySelector('.rush-radar'), [{ opacity: .15, transform: 'scale(.94) rotateY(-7deg)' }, { opacity: 1, transform: 'scale(1) rotateY(0)' }], { duration: 520, easing: ease });
  if (motion.teams) animateAll('#matchbar .team-name', [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: ease });
  for (const side of motion.scores || []) animate(root.querySelector(`.score.${side.toUpperCase()}`), [{ filter: 'brightness(2.5)', transform: 'scale(.75)' }, { filter: 'brightness(1.7)', transform: 'scale(1.3)', offset: .55 }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 650, easing: ease });
  for (const event of motion.players || []) {
    const card = [...root.querySelectorAll('.player-horizontal-container')].find(node => node.dataset.key === `player-${event.id}`);
    if (event.entered && !motion.initial) animate(card, [{ opacity: 0, transform: 'translateY(55px) scale(.9)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 520, easing: ease });
    if (event.revived) animate(card, [{ opacity: .35, filter: 'grayscale(1) brightness(2)' }, { opacity: 1, filter: 'grayscale(0) brightness(1)' }], { duration: 600, easing: ease });
    if (event.stats && !event.dead) animate(card?.querySelector('.card-info-section'), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)', offset: .4 }, { filter: 'brightness(1)' }], { duration: 420, easing: 'ease-out' });
    if (event.equipment && !event.dead) animate(card?.querySelector('.inventory-items'), [{ transform: 'translateY(3px)', opacity: .55 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 260, easing: ease });
    if (event.roundKills && !event.dead) animate(card?.querySelector('.round_kills_card'), [{ opacity: 0, transform: 'rotate(8deg) scale(.4)' }, { opacity: 1, transform: 'rotate(8deg) scale(1.18)', offset: .7 }, { opacity: 1, transform: 'rotate(8deg) scale(1)' }], { duration: 420, easing: ease });
  }
  if (motion.observed) animate(root.querySelector('.observed'), [{ opacity: .2, transform: 'translate(-50%, 28px) scale(.96)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 420, easing: ease });
  if (motion.observedVitals) animate(root.querySelector('.observed .main_container'), [{ filter: 'brightness(1.7)' }, { filter: 'brightness(1)' }], { duration: 360, easing: 'ease-out' });
}
function render() {
  const completed = latest?.map?.mode === 'rush' && latest?.map?.phase === 'gameover';
  const fresh = connected && received > 0 && (performance.now() - received < 10000 || completed);
  const game = normalize(fresh ? latest : {}, previousGame, managerAssignments);
  const show = fresh && game.isRush;
  let status = !connected ? 'Connecting to JT Hud Manager' : !fresh ? 'Waiting for live game data' : !game.isRush ? 'Waiting for a RUSH match' : !game.hasRoster ? 'Waiting for spectator data' : game.count !== 6 ? `Spectator roster · ${game.count} / 6 players` : '';
  if (connected && received && !fresh) status = 'Game feed paused · waiting for fresh data';
  if (show && game.phase === 'gameover') gameoverSince ??= performance.now();
  else gameoverSince = null;
  const results = gameoverSince !== null && performance.now() - gameoverSince >= 3000;
  const html = view(game, { show, status, preview, hidden, theme, results, settings });
  if (html !== lastMarkup) {
    const damageText = new Map([...root.querySelectorAll('.player-horizontal-container')].map(node => [node.dataset.key, node.querySelector('.damage-indicator')?.textContent]));
    updateMarkup(root, html);
    lastMarkup = html;
    for (const node of root.querySelectorAll('.player-horizontal-container')) node.querySelector('.damage-indicator').textContent = damageText.get(node.dataset.key) || '';
    for (const node of root.querySelectorAll('.fit-text')) {
      const style = getComputedStyle(node);
      let size = parseFloat(style.fontSize);
      const height = parseFloat(style.maxHeight);
      const minimum = Number(node.dataset.minSize);
      while (size > minimum && (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > height + 1)) node.style.fontSize = `${--size}px`;
    }
    for (const event of changes(previousGame, game)) {
      const card = [...root.querySelectorAll('.player-horizontal-container')].find(node => node.dataset.key === `player-${event.id}`);
      const badge = card?.querySelector('.damage-indicator');
      if (badge) {
        const now = performance.now();
        const prior = damageTotals.get(event.id);
        const amount = prior && now - prior.at < 900 ? prior.amount + event.damage : event.damage;
        damageTotals.set(event.id, { amount, at: now });
        badge.textContent = `−${amount}`;
        badge.getAnimations().forEach(animation => animation.cancel());
        animate(badge, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)', offset: .2 }, { opacity: 1, transform: 'translateY(0)', offset: .8 }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 1200, easing: 'ease-out' });
      }
    }
    playPresentationMotion(previousGame, game);
    if (previousGame?.isRush && show) {
      if (game.observed && previousGame.observed?.id !== game.observed.id) animate(root.querySelector('.observed .avatar_container'), [{ opacity: 0, translate: '0 15px' }, { opacity: 1, translate: '0 0' }], { duration: 300, easing: 'ease-out' });
    }
    previousGame = show ? game : null;
  }
  root.style.setProperty('--scale', Math.min(innerWidth / 2560, innerHeight / 1440));
  const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
  root.style.setProperty('--color-ct', color(settings.ct_color, '#00bfff'));
  root.style.setProperty('--color-t', color(settings.t_color, '#f4c628'));
  root.style.setProperty('--color-ct-dark', `color-mix(in srgb, ${color(settings.ct_color, '#00bfff')} 38%, #121214)`);
  root.style.setProperty('--color-t-dark', `color-mix(in srgb, ${color(settings.t_color, '#f4c628')} 38%, #121214)`);
  root.style.setProperty('--radius', settings.sharp_corners ? '0px' : '8px');
}
function accept(payload) {
  if (!payload || typeof payload !== 'object') return;
  latest = payload;
  received = performance.now();
  const nextMap = payload.map?.name || '';
  if (nextMap !== assignmentMap) refreshManagerAssignments(nextMap);
}
async function refreshManagerAssignments(activeMap = latest?.map?.name || '') {
  if (preview || assignmentRefresh) return assignmentRefresh;
  assignmentMap = activeMap;
  assignmentRefresh = loadManagerAssignments({ activeMap }).then(value => {
    managerAssignments = value;
    render();
  }).catch(() => {}).finally(() => { assignmentRefresh = null; });
  return assignmentRefresh;
}
if (preview) {
  const { fixture, stressFixture } = await import('./preview.mjs');
  const previewData = params.get('stress') === '1' ? stressFixture : fixture;
  connected = true;
  accept(previewData);
  setInterval(() => accept(previewData), 1000);
} else if (typeof window.io === 'function') {
  const socket = window.io(location.origin);
  socket.on('connect', () => { connected = true; received = 0; socket.emit('started'); });
  socket.on('readyToRegister', () => socket.emit('register', 'rush-hud', false, 'cs2', 'DEFAULT'));
  socket.on('update', accept);
  socket.on('match', () => refreshManagerAssignments());
  socket.on('hud_config', data => { settings = data?.display_settings && typeof data.display_settings === 'object' ? data.display_settings : {}; lastMarkup = ''; render(); });
  socket.on('disconnect', () => { connected = false; latest = null; received = 0; render(); });
  socket.on('connect_error', () => { connected = false; render(); });
  socket.on('refreshHUD', () => location.reload());
  socket.on('hud_action', data => {
    if (data?.action === 'boxesState') hidden = data.data === 'hide';
    if (data?.action === 'display_settings' && data.data && typeof data.data === 'object') { settings = data.data; lastMarkup = ''; }
  });
} else root.textContent = 'Open this HUD through JT Hud Manager.';
setInterval(render, 100);
if (!preview) {
  refreshManagerAssignments();
  setInterval(() => refreshManagerAssignments(), 5000);
}
render();
document.fonts.ready.then(() => { lastMarkup = ''; render(); });
