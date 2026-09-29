import './style.css';
import { Game, readSave, STATIONS, PURCHASES, type Purchase, type Upgrade, type Point } from './model';
import { World } from './world';

const icons: Record<string, string> = {
  pizza: '<path d="M5 4c5-2 10-1 15 3L10 21 5 4Z"/><path d="M5 7c5-1 9 0 13 3"/><circle cx="10" cy="10" r="1"/><circle cx="14" cy="12" r="1"/><circle cx="10" cy="16" r="1"/>',
  play: '<path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke-linejoin="round"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  sound: '<path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  bag: '<rect x="5" y="6" width="14" height="15" rx="4"/><path d="M9 6V4a3 3 0 0 1 6 0v2M8 13h8v5H8z"/>',
  wheat: '<path d="M12 22V7M12 17c-5 0-7-3-7-6 5 0 7 3 7 6Zm0-5c-5 0-7-3-7-6 5 0 7 3 7 6Zm0 5c5 0 7-3 7-6-5 0-7 3-7 6Zm0-5c5 0 7-3 7-6-5 0-7 3-7 6Zm0-5c-3-2-3-4 0-6 3 2 3 4 0 6Z"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  upgrade: '<path d="m12 3 8 8h-5v10H9V11H4l8-8Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9"/>',
  oven: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 8h18M8 12h8v5H8zM7 5.5h.01M11 5.5h.01"/>',
  shoe: '<path d="M4 4h5l1 7 9 4c2 1 2 3 2 5H3V9l1-5Z"/><path d="M3 17h18m-9-7-2 3m6-1-2 3"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
  touch: '<path d="M8 13V6a2 2 0 0 1 4 0v6-2a2 2 0 0 1 4 0v2-1a2 2 0 0 1 4 0v5c0 4-3 6-6 6-3 0-4-1-6-3l-4-5a2 2 0 0 1 3-2l1 1Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? ''}</svg>`;
const app = document.querySelector<HTMLDivElement>('#app')!;
const SAVE_KEY = 'dough-and-go-v1';
let storageAvailable = true;
function getStored(key: string) { try { return localStorage.getItem(key); } catch { storageAvailable = false; return null; } }
const saved = readSave(getStored(SAVE_KEY));
const game = new Game(saved);
let soundEnabled = getStored('dough-sound') === 'true';
let started = false;
let uiClock = 0, saveClock = 0, toastTimer = 0;
let pendingMilestone = false;
const keys = new Set<string>();
const stick = { x: 0, y: 0, pointer: -1 };
let audioContext: AudioContext | undefined;

app.innerHTML = `
  <canvas id="world" tabindex="0" aria-label="Dough and Go game world. Move with WASD, arrow keys, or the touch joystick."></canvas>
  <div class="vignette"></div>
  <header class="topbar">
    <div class="brand"><span class="brand-mark">${icon('pizza')}</span><span class="brand-name">dough & go</span></div>
    <div class="top-actions">
      <button class="icon-button" id="sound" aria-label="Turn sound on" title="Turn sound on">${icon('mute')}</button>
      <button class="icon-button" id="pause" aria-label="How to play" title="How to play">${icon('help')}</button>
    </div>
  </header>
  <main class="intro">
    <div class="intro-content">
      <p class="eyebrow">A little farm-to-table adventure</p>
      <h1>dough<span>& go.</span></h1>
      <p class="intro-description">From golden fields<br>to happy bellies.</p>
      <button class="primary-button" id="play">${icon('play')}<span>${saved ? 'Back to the farm' : 'Let’s make pizza'}</span></button>
      <p class="intro-footnote"><span>${icon('keyboard')} Keyboard</span><span>${icon('touch')} Touch friendly</span></p>
    </div>
  </main>
  <div class="world-caption">Good things start small.<svg viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 5c29-3 35 20 21 35m-1-10 1 11 12-4"/></svg></div>
  <footer class="intro-footer"><span>GROW A LITTLE. MAKE A LOT.</span><button id="how-to">${icon('help')} How to play</button></footer>
  <div class="hud" aria-label="Game status">
    <div class="money"><span class="coin-icon">$</span><span id="coins">0</span></div>
    <div class="day-progress"><p id="goal-label">Your first little rush</p><strong><b id="served">0</b> <span id="served-label">/ 10 pizzas served</span></strong><div class="day-track">${'<i></i>'.repeat(10)}</div></div>
    <div class="world-labels">
      <div class="station-label" id="label-field"><strong>Wheat field</strong></div>
      <div class="station-label" id="label-delivery"><strong>Drop wheat</strong><small id="oven-stock">3 wheat = 1 pizza</small></div>
      <div class="station-label" id="label-pickup"><strong id="pizza-stock">Pizza pickup</strong><small id="bake-status">Oven needs wheat</small><div class="bake-track"><span id="bake-fill"></span></div></div>
      <div class="station-label" id="label-counter"><strong>Serve here · $12</strong><small id="queue-status">Customers on their way</small></div>
      ${(['server', 'farm', 'farmer'] as Purchase[]).map(key => `<div class="station-label purchase-label" id="label-${key}"><strong>${key === 'farm' ? 'Wheat farm' : key === 'server' ? 'Pizza worker' : 'Farm worker'} · $${PURCHASES[key].price}</strong><small>Walk here to ${key === 'farm' ? 'buy' : 'hire'}</small></div>`).join('')}
      ${game.customers.map(customer => `<div class="compliment" id="compliment-${customer.id}" hidden></div>`).join('')}
      <div class="player-badge" id="player-badge" hidden></div>
    </div>
    <div class="edge-guide" id="edge-guide" hidden><span id="edge-guide-name">Kitchen</span>${icon('arrow')}</div>
    <div class="controls-hint"><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span><span class="or">or</span> arrow keys to move</div>
    <div class="inventory" id="inventory"><span class="bag-icon">${icon('bag')}</span><div><p class="inventory-label">Your basket</p><p class="inventory-value" id="inventory-value">0 <small>/ 18</small></p><div class="inventory-bar"><span id="inventory-fill"></span></div></div></div>
    <div class="objective"><div class="objective-steps"><span id="step-harvest" class="active">Harvest</span>${icon('arrow')}<span id="step-bake">Bake</span>${icon('arrow')}<span id="step-serve">Serve</span></div><p class="objective-title" id="objective-title"></p><p class="objective-detail" id="objective-detail"></p></div>
    <button class="upgrade-button" id="upgrades" aria-label="Little upgrades" title="Little upgrades">${icon('upgrade')}<span><strong>Little upgrades</strong><small>Make room to grow</small></span><i class="upgrade-dot"></i></button>
    <div class="purchase-prompt" id="purchase-prompt" hidden><div><strong id="purchase-title"></strong><p id="purchase-detail"></p></div><button id="purchase-button" class="buy-button" title="Press E or click to purchase"></button></div>
    <div class="joystick" id="joystick" role="group" aria-label="Touch movement joystick"><div class="joystick-knob" id="joystick-knob"></div></div>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <p class="sr-only" id="live-objective" aria-live="polite"></p>
  <dialog id="dialog" aria-labelledby="dialog-title"></dialog>
  <div class="loading" id="loading"><p>Warming up the oven…</p></div>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('world');
const dialog = $<HTMLDialogElement>('dialog');
let world: World;
try {
  world = new World(canvas, game);
} catch (error) {
  console.error(error);
  app.innerHTML = '<div class="error-state"><h2>The kitchen couldn’t open.</h2><p>This game needs WebGL. Enable hardware acceleration in your browser settings, then reload the page.</p></div>';
  throw error;
}

function save() {
  if (!started) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.state)); }
  catch { storageAvailable = false; }
}
function toast(message: string) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('toast').classList.remove('show'), 3200);
}
function unlockAudio() {
  if (!soundEnabled) return;
  try { audioContext ??= new AudioContext(); void audioContext.resume().catch(() => {}); } catch { /* Audio is optional. */ }
}
function note(frequency: number, duration = .08, volume = .035) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.4, audioContext.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function syncSound() {
  $('sound').innerHTML = icon(soundEnabled ? 'sound' : 'mute');
  $('sound').setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Turn sound on');
  $('sound').title = soundEnabled ? 'Mute sound' : 'Turn sound on';
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
}
function toggleSound() { soundEnabled = !soundEnabled; try { localStorage.setItem('dough-sound', String(soundEnabled)); } catch { /* Optional preference. */ } unlockAudio(); syncSound(); note(523); }
$('sound').addEventListener('click', toggleSound); syncSound();

function start() {
  started = true; app.classList.add('playing'); unlockAudio();
  $('pause').innerHTML = icon('pause'); $('pause').setAttribute('aria-label', 'Pause game'); $('pause').title = 'Pause game (Esc)';
  canvas.focus({ preventScroll: true });
  if (!storageAvailable) toast('Progress stays in this session because browser storage is unavailable.');
}
$('play').addEventListener('click', start);

function releaseMovement() { keys.clear(); stick.x = stick.y = 0; stick.pointer = -1; $('joystick-knob').style.transform = ''; }
function openDialog(content: string, mode: string) {
  releaseMovement(); game.moving = false;
  dialog.dataset.mode = mode; dialog.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}
const dialogHeader = (title: string) => `<div class="dialog-top"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close" aria-label="Close">${icon('close')}</button></div>`;
function howTo() {
  openDialog(`${dialogHeader('A recipe for a good time')}
    <p class="dialog-intro">Everything happens as you walk. Just bring a little appetite.</p>
    ${[
      ['Harvest', 'Walk into the wheat to fill your basket. It grows back after a little while.'],
      ['Bake', 'Stand on the golden pad by the oven. Three wheat make one pizza.'],
      ['Pick up', 'Wait at the green pad to collect fresh pizzas.'],
      ['Serve & grow', 'Walk to the striped counter. Each pizza earns $12. Customers queue, enjoy their pizza, and leave.'],
      ['Build your team', 'Visit the signs to hire a pizza worker ($96), buy a wheat farm ($180), and hire a farm worker ($144). Press E or tap Buy.'],
    ].map(([title, copy], i) => `<div class="how-step"><span class="step-number">${i + 1}</span><div><h3>${title}</h3><p>${copy}</p></div></div>`).join('')}
    <div class="dialog-bottom"><strong>WASD / Arrow keys</strong> to move. On phones, drag the <strong>joystick</strong>. <strong>Esc</strong> pauses the game.<br>Progress saves automatically on this browser.</div>
    <button class="primary-button dialog-wide" data-action="${started ? 'close' : 'start'}">${started ? 'Back to the kitchen' : 'Let’s make pizza'} ${icon('play')}</button>`, 'help');
}
function pause() {
  if (!started) return howTo();
  openDialog(`${dialogHeader('Taking a little break')}
    <p class="dialog-intro">Your farm can wait. Come back when you’re ready.</p>
    <div class="pause-controls"><button class="primary-button dialog-wide" data-action="close">${icon('play')} Keep cooking</button><button data-action="help">${icon('help')} How to play</button><button data-action="sound">${icon(soundEnabled ? 'sound' : 'mute')} Sound ${soundEnabled ? 'on' : 'off'}</button></div>
    <button class="text-button" data-action="reset-confirm">Start a new farm</button>`, 'pause');
  save();
}
const upgradeNames: Record<Upgrade, string> = { basket: 'A bigger basket', oven: 'A hotter oven', shoes: 'Happy feet' };
function shop() {
  const details = { basket: `${game.capacity} → ${game.capacity + 9} carrying slots`, oven: `${game.bakeTime.toFixed(1)}s → ${[2.1, 1.5, 1, 1][game.state.levels.oven]}s per pizza`, shoes: `${game.state.levels.shoes ? 'Even quicker' : 'Quicker'} trips around the farm` };
  const rows = (['basket', 'oven', 'shoes'] as Upgrade[]).map(key => {
    const price = game.price(key), level = game.state.levels[key];
    return `<div class="upgrade-row"><span class="row-icon">${icon({ basket: 'bag', oven: 'oven', shoes: 'shoe' }[key])}</span><div><h3>${upgradeNames[key]}</h3><p>${price === null ? 'As good as it gets!' : details[key]}</p><span class="levels" aria-label="Level ${level} of 3">${[0, 1, 2].map(i => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</span></div><button class="buy-button" data-upgrade="${key}" aria-label="${price === null ? `${upgradeNames[key]} fully upgraded` : `Buy ${upgradeNames[key]} for ${price} coins`}" ${price === null || game.state.coins < price ? 'disabled' : ''}>${price === null ? 'MAX' : `${icon('coin')} ${price}`}</button></div>`;
  }).join('');
  openDialog(`${dialogHeader('Little upgrades')}<p class="dialog-intro">A little reinvestment goes a long way.</p>${rows}<p class="shop-balance">You have <strong>$${game.state.coins}</strong> to grow with.</p>`, 'shop');
}
$('how-to').addEventListener('click', howTo);
$('pause').addEventListener('click', () => dialog.open ? dialog.close() : pause());
$('upgrades').addEventListener('click', shop);
dialog.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.dataset.upgrade) {
    const key = button.dataset.upgrade as Upgrade;
    if (game.buy(key)) { note(660, .18); save(); shop(); updateUI(); }
    return;
  }
  switch (button.dataset.action) {
    case 'close': dialog.close(); break;
    case 'start': dialog.close(); start(); break;
    case 'help': howTo(); break;
    case 'sound': toggleSound(); pause(); break;
    case 'reset-confirm': openDialog(`${dialogHeader('A fresh start?')}<p class="dialog-intro">This replaces your saved farm, coins, and upgrades with a new game.</p><button class="primary-button dialog-wide" data-action="reset">Start a new farm</button><button class="text-button" data-action="pause">Keep my farm</button>`, 'reset'); break;
    case 'pause': pause(); break;
    case 'reset': {
      game.reset(); pendingMilestone = false;
      save(); dialog.close(); updateUI(); toast('A fresh field, a warm oven. Let’s go.'); break;
    }
  }
});
dialog.addEventListener('close', () => { releaseMovement(); if (started) canvas.focus({ preventScroll: true }); });
dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!dialog.open && started) { event.preventDefault(); pause(); }
    return;
  }
  if (!started || dialog.open) return;
  if (event.key.toLowerCase() === 'e' && !event.repeat) { event.preventDefault(); buyNearby(); return; }
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key.length === 1 ? event.key.toLowerCase() : event.key)) {
    event.preventDefault(); keys.add(event.key.toLowerCase());
  }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', releaseMovement);
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseMovement(); save(); if (started && !dialog.open) pause(); } });
window.addEventListener('pagehide', save);
const joystick = $('joystick');
function moveStick(event: PointerEvent) {
  if (stick.pointer !== event.pointerId) return;
  const rect = joystick.getBoundingClientRect(), dx = event.clientX - rect.left - rect.width / 2, dy = event.clientY - rect.top - rect.height / 2;
  const length = Math.hypot(dx, dy), max = 35, scale = Math.min(1, max / Math.max(1, length));
  stick.x = dx * scale / max; stick.y = dy * scale / max;
  $('joystick-knob').style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
}
joystick.addEventListener('pointerdown', event => { if (dialog.open || stick.pointer !== -1) return; event.preventDefault(); stick.pointer = event.pointerId; joystick.setPointerCapture(event.pointerId); unlockAudio(); moveStick(event); });
joystick.addEventListener('pointermove', moveStick);
function releaseStick(event: PointerEvent) { if (stick.pointer !== event.pointerId) return; stick.pointer = -1; stick.x = stick.y = 0; $('joystick-knob').style.transform = ''; }
joystick.addEventListener('pointerup', releaseStick); joystick.addEventListener('pointercancel', releaseStick); joystick.addEventListener('lostpointercapture', releaseStick);

function buyNearby() {
  if (!started || dialog.open) return;
  const key = game.nearbyPurchase;
  if (!key) return;
  const reason = game.purchaseReason(key);
  if (reason) { toast(reason); return; }
  if (game.purchase(key)) {
    note(660, .18); save(); updateUI();
    toast(key === 'farm' ? 'Your new wheat farm is ready to harvest!' : key === 'server' ? 'Pizza worker hired. Fresh pizzas are in good hands.' : 'Farm worker hired. Wheat deliveries are covered.');
    canvas.focus({ preventScroll: true });
  }
}
$('purchase-button').addEventListener('click', buyNearby);

let lastObjective = '';
function updateUI() {
  const s = game.state;
  $('coins').textContent = s.coins.toLocaleString();
  $('served').textContent = String(s.served);
  $('served-label').textContent = s.served < 10 ? '/ 10 pizzas served' : 'happy customers';
  $('goal-label').textContent = s.served < 10 ? 'Your first little rush' : s.workers.server && s.workers.farmer ? 'A farm of your own' : 'Grow your little team';
  document.querySelectorAll('.day-track i').forEach((dot, i) => dot.classList.toggle('done', i < s.served));
  const basketText = s.pizzas > 0 ? `${s.pizzas} pizza${s.pizzas === 1 ? '' : 's'}${s.grain ? ` · ${s.grain} wheat` : ''}` : `${s.grain} <small>/ ${game.capacity}</small>`;
  $('inventory-value').innerHTML = game.full ? `FULL <small>${game.load}/${game.capacity}</small>` : basketText;
  $('inventory').classList.toggle('full', game.full);
  $('inventory-fill').style.width = `${game.load / game.capacity * 100}%`;
  const objective = game.objective;
  $('objective-title').textContent = objective.title; $('objective-detail').textContent = objective.detail;
  $('step-harvest').classList.toggle('active', objective.step === 0);
  $('step-bake').classList.toggle('active', objective.step === 1 || objective.step === 2);
  $('step-serve').classList.toggle('active', objective.step === 3);
  if (lastObjective !== objective.title) { lastObjective = objective.title; $('live-objective').textContent = objective.title + '. ' + objective.detail; }
  $('oven-stock').textContent = s.ovenWheat ? `${s.ovenWheat} wheat in kitchen` : '3 wheat = 1 pizza';
  $('pizza-stock').textContent = s.readyPizzas ? `${s.readyPizzas} pizza${s.readyPizzas === 1 ? '' : 's'} ready` : 'Pizza pickup';
  $('bake-status').textContent = s.readyPizzas >= 24 ? 'Collect to make room' : s.outputProgress > 0 ? 'Fresh out of the oven!' : s.ovenWheat >= 3 ? `Baking · ${Math.ceil((1 - s.bakeProgress) * game.bakeTime)}s` : s.readyPizzas ? 'Fresh & ready to go' : 'Oven needs wheat';
  $('queue-status').textContent = game.waitingCustomers ? `${game.waitingCustomers} in the queue${s.workers.server ? ' · Worker on duty' : ''}` : 'More customers on their way';
  const key = game.nearbyPurchase;
  $('purchase-prompt').hidden = !key;
  if (key) {
    const purchase = PURCHASES[key], reason = game.purchaseReason(key);
    $('purchase-title').textContent = purchase.title;
    $('purchase-detail').textContent = reason || purchase.detail;
    $('purchase-button').textContent = `${key === 'farm' ? 'Buy' : 'Hire'} · $${purchase.price}`;
    $<HTMLButtonElement>('purchase-button').disabled = !!reason;
    $('purchase-button').setAttribute('aria-label', `${purchase.title} for ${purchase.price} coins${reason ? `. ${reason}` : ''}`);
  }
  $('upgrades').classList.toggle('available', (['basket', 'oven', 'shoes'] as Upgrade[]).some(key => game.price(key) !== null && s.coins >= game.price(key)!));
  $('player-badge').hidden = !game.load;
  $('player-badge').textContent = game.full ? 'MAX!' : s.pizzas ? `${s.pizzas} pizza${s.pizzas === 1 ? '' : 's'}` : `${s.grain}/${game.capacity}`;
  $('player-badge').classList.toggle('full', game.full);
}
const labels = [
  { id: 'label-field', point: { x: -7, z: -4.8 }, y: 1.2 },
  { id: 'label-delivery', point: STATIONS.delivery, y: .7 },
  { id: 'label-pickup', point: STATIONS.pickup, y: .7 },
  { id: 'label-counter', point: STATIONS.counter, y: .9 },
  ...(['server', 'farm', 'farmer'] as Purchase[]).map(key => ({ id: `label-${key}`, point: PURCHASES[key], y: 2.2 })),
];
// Project after the camera renders, then move one composited layer on whole
// device pixels. Stable label widths keep changing counts from shifting their anchor.
function anchor(el: HTMLElement, point: { x: number; y: number }) {
  const ratio = window.devicePixelRatio || 1;
  const x = Math.round(point.x * ratio) / ratio, y = Math.round(point.y * ratio) / ratio;
  el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;
}
function positionLabels() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  labels.forEach(label => {
    const p = world.project(label.point, label.y), el = $(label.id);
    anchor(el, p);
    const purchase = label.id.replace('label-', '') as Purchase;
    const owned = purchase in PURCHASES && game.owns(purchase);
    el.style.visibility = owned || p.x < 78 || p.x > width - 78 || p.y < (width < 760 ? 180 : 130) || p.y > height - (width < 760 ? 175 : 145) ? 'hidden' : 'visible';
  });
  const p = world.project(game.state.position, 2.25 + Math.min(game.load, 18) * .11);
  anchor($('player-badge'), p);
  game.customers.forEach(customer => {
    const el = $(`compliment-${customer.id}`);
    el.hidden = customer.mode !== 'leaving' || customer.position.z >= 9;
    if (!el.hidden) { el.textContent = customer.compliment; anchor(el, world.project(customer.position, 2.4)); }
  });
  const destination = world.project(game.objective.target), bottom = height - 280;
  const outside = destination.x < 45 || destination.x > width - 45 || destination.y < 120 || destination.y > bottom;
  const guide = $('edge-guide'); guide.hidden = width >= 760 || !outside;
  if (!guide.hidden) {
    guide.style.left = `${Math.max(55, Math.min(width - 55, destination.x))}px`;
    guide.style.top = `${Math.max(130, Math.min(bottom, destination.y))}px`;
    const name = ['Wheat', 'Kitchen', 'Pizzas', 'Counter', 'Grow your farm'][game.objective.step];
    $('edge-guide-name').textContent = name;
    guide.querySelector('svg')!.style.transform = `rotate(${Math.atan2(destination.y - height / 2, destination.x - width / 2)}rad)`;
  }
}
let previous = performance.now(), visualTime = 0;
function frame(now: number) {
  const dt = Math.max(0, Math.min((now - previous) / 1000, .05)); previous = now;
  const active = started && !dialog.open && !document.hidden;
  if (!dialog.open && !document.hidden) visualTime += dt;
  if (active) {
    let direction: Point = { x: 0, z: 0 };
    const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')) + stick.x;
    const y = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) + stick.y;
    if (Math.hypot(x, y) > .05) direction = world.screenDirection(x, y);
    game.step(dt, direction); world.face(direction, dt);
    for (const event of game.events) {
      world.event(event);
      if (event.type === 'harvest' && event.actor !== 'farmer') note(240 + game.state.grain * 14, .045, .018);
      if (event.type === 'pickup') note(480, .08);
      if (event.type === 'sale') {
        note(760, .16); const p = world.project(event, 1.9), pop = document.createElement('span');
        pop.className = 'sale-pop'; pop.textContent = '+$12'; pop.style.left = `${p.x}px`; pop.style.top = `${p.y}px`;
        app.append(pop); window.setTimeout(() => pop.remove(), 1100);
      }
      if (event.type === 'milestone') pendingMilestone = true;
    }
    game.events = [];
    if (pendingMilestone && !dialog.open) {
      pendingMilestone = false; save();
      openDialog(`<div class="celebration"><span class="big-pizza">${icon('pizza')}</span><h2 id="dialog-title">A little local favorite.</h2><p>Ten fresh pizzas. Ten happy customers.<br>Build your team: visit the pizza worker sign, then explore the farm for sale.</p><button class="primary-button dialog-wide" data-action="close">Keep the good things growing ${icon('arrow')}</button></div>`, 'milestone');
    }
    saveClock += dt;
    if (saveClock > 2) { saveClock = 0; save(); }
  } else game.moving = false;
  world.update(dt, visualTime, started, active); positionLabels();
  $('bake-fill').style.transform = `scaleX(${game.state.bakeProgress})`;
  uiClock += dt; if (uiClock >= .1) { updateUI(); uiClock = 0; }
  requestAnimationFrame(frame);
}
window.addEventListener('resize', () => world.resize());
updateUI(); world.update(.016, 0, false);
requestAnimationFrame(frame);
$('loading').classList.add('ready');
setTimeout(() => $('loading').remove(), 400);

// Read-only development diagnostics for browser checks.
if (import.meta.env.DEV) {
  Object.assign(window, { __dough: { snapshot: () => structuredClone({ ...game.state, capacity: game.capacity, elapsed: game.elapsed, paused: dialog.open, cropCount: game.crops.filter(c => (!c.expansion || game.state.farmOwned) && c.readyAt <= game.elapsed).length, pizzaWorker: game.pizzaWorker, farmWorker: game.farmWorker, customers: game.customers, nearbyPurchase: game.nearbyPurchase }), project: (point: Point) => world.project(point), renderInfo: () => ({ calls: world.renderer.info.render.calls, triangles: world.renderer.info.render.triangles }) } });
}
