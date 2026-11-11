// 获取画布和画笔 / Get the canvas and drawing context
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // 像素素材缩放保持硬边 / keep pixel art crisp
// 画布与素材同尺寸，页面里用 CSS 像素化放大 / Canvas matches sprite size, CSS scales it up
const W = 288, H = 512, GROUND = 400;
let bird = {x:60, y:246, width:34, height:24, vy:0, rot:0};
let state = 'READY', score = 0, best = 0, pipes = [], pipesPassed = 0;
let gravity = 0.35, flapSpeed = -6;
// 速度随得分上升，有峰值 / Speed rises with score, capped at a peak
const baseSpeed = 2, maxSpeed = 4;
let speed = baseSpeed;
// 难度配置：上下缺口 + 水平间距 + 提速快慢 + 金币倍率 / Difficulty: gap + spacing + acceleration + coin rate
const difficulties = [
  {name:'EASY',      gap:200, ramp:0.04, spacing:190, mult:1},
  {name:'NORMAL',    gap:155, ramp:0.08, spacing:150, mult:1.5},
  {name:'DIFFICULT', gap:130, ramp:0.10, spacing:132, mult:2}
];
let diff = 1, gap = difficulties[diff].gap;
// 每档难度各自的最佳纪录 / per-difficulty best scores
let bests = difficulties.map(() => 0);
let moveBird = () => {}, movePipes = () => {}, drawPipes = () => {};
let onFlap = () => {}, drawEffects = () => {}, afterScore = () => {};
let saveBest = () => {}, clearEffects = () => {}, saveCoins = () => {};
let drawBase = () => {}, drawStars = () => {};

// 加载像素素材 / Load pixel-art assets
const SPRITE_FILES = [
  'background-day','background-night','base','pipe-green','message','gameover',
  'yellowbird-downflap','yellowbird-midflap','yellowbird-upflap',
  'redbird-downflap','redbird-midflap','redbird-upflap',
  'bluebird-downflap','bluebird-midflap','bluebird-upflap',
  '0','1','2','3','4','5','6','7','8','9',
  'star-blue-open','star-blue-closed','star-orange-open','star-orange-closed',
  'pirate-downflap','pirate-midflap','pirate-upflap',
  'tycoon-downflap','tycoon-midflap','tycoon-upflap',
  'ultra-downflap','ultra-midflap','ultra-upflap',
  'creeper-downflap','creeper-midflap','creeper-upflap',
  'pipe-wood','pipe-gold','pipe-silver','pipe-grass',
  'base-wood','base-marble','base-metal','base-grass',
  'background-sea','background-city','background-space'
];
const sprites = {};
const assetsReady = Promise.all(SPRITE_FILES.map(name => new Promise(resolve => {
  const img = new Image();
  img.onload = resolve; img.onerror = resolve;
  img.src = 'assets/sprites/' + name + '.png';
  sprites[name] = img;
})));

// 音效池：每个音效预载 4 份实例轮转播放，避免 cloneNode 的加载延迟导致丢音
// Sound pool: 4 preloaded instances per cue, rotated so rapid repeats never get dropped
const soundNames = ['wing','point','hit','die','swoosh'];
const POOL_SIZE = 4;
const sounds = {}, poolIdx = {};
for (const n of soundNames) {
  sounds[n] = [];
  poolIdx[n] = 0;
  for (let i = 0; i < POOL_SIZE; i++) {
    const a = new Audio('assets/audio/' + n + '.wav');
    a.preload = 'auto'; a.volume = 0.5;
    try {a.load();} catch {}
    sounds[n].push(a);
  }
}
// 默认开启：所有音效都由玩家操作触发，不会撞自动播放策略 / on by default, every sound follows a gesture
let soundOn = true;
function playSound(name) {
  if (!soundOn) return;
  const list = sounds[name];
  if (!list || !list.length) return;
  const s = list[poolIdx[name] % list.length];
  poolIdx[name] = (poolIdx[name] + 1) % list.length;
  try {
    s.currentTime = 0;                       // 从头播，快速连发也不吞音 / restart so fast repeats still fire
    const p = s.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {}
}
// 星星特殊音效：合成音占位，蓝星三连音、橙星双音 / star sounds: synth placeholder, blue = 3 tones, orange = 2 tones
let starAudio = null;
function playStarTones(freqs) {
  if (!soundOn) return;
  try {
    starAudio = starAudio || new AudioContext();
    starAudio.resume().catch(() => {});
    const now = starAudio.currentTime, step = 0.07;
    freqs.forEach((f, i) => {
      const o = starAudio.createOscillator(), g = starAudio.createGain();
      o.connect(g); g.connect(starAudio.destination);
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.08, now + i * step);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * step + 0.18);
      o.start(now + i * step); o.stop(now + i * step + 0.2);
    });
  } catch {}
}

// 商店：小鸟 / 水管 / 背景 / BGM 四类皮肤，用金币购买后装备
// Shop: bird / pipe / background / BGM skins, bought with coins then equipped
const shopCats = [
  {key:'bird', name:'BIRD', items:[
    {id:'yellow', name:'CLASSIC', price:0,   bird:'yellowbird'},
    {id:'red',    name:'RED',     price:100, bird:'redbird'},
    {id:'blue',   name:'BLUE',    price:250, bird:'bluebird'},
    {id:'pirate', name:'PIRATE',  price:450, bird:'pirate'},
    {id:'tycoon', name:'TYCOON',  price:650, bird:'tycoon'},
    {id:'ultra',  name:'ULTRA',   price:900, bird:'ultra'},
    {id:'creeper',name:'CREEPER', price:550, bird:'creeper'},
    {id:'birdX',  name:'???',     price:0,   coming:true}
  ]},
  {key:'pipe', name:'PIPE', items:[
    {id:'green',  name:'GREEN',  price:0,   img:'pipe-green'},
    {id:'red',    name:'RED',    price:150, hue:-120},
    {id:'blue',   name:'BLUE',   price:300, hue:120},
    {id:'wood',   name:'WOOD',   price:260, img:'pipe-wood'},
    {id:'gold',   name:'GOLD',   price:480, img:'pipe-gold'},
    {id:'silver', name:'SILVER', price:620, img:'pipe-silver'},
    {id:'grass',  name:'GRASS',  price:380, img:'pipe-grass'},
    {id:'pipeX',  name:'???',    price:0,   coming:true}
  ]},
  {key:'bg', name:'BACK', items:[
    {id:'day',   name:'DAY',   price:0,   img:'background-day',   base:'base'},
    {id:'night', name:'NIGHT', price:150, img:'background-night', base:'base'},
    {id:'sea',   name:'SEA',   price:200, img:'background-sea',   base:'base-wood'},
    {id:'city',  name:'CITY',  price:320, img:'background-city',  base:'base-marble'},
    {id:'space', name:'SPACE', price:480, img:'background-space', base:'base-metal'}
  ]},
  {key:'bgm', name:'BGM', items:[
    {id:'off',  name:'OFF',      price:0},
    {id:'chip',  name:'CHIPTUNE', price:220},
    {id:'sun',   name:'SUNSHINE', price:350},
    {id:'candy', name:'CANDY POP', price:450}
  ]}
];
let shopTab = 0, shopPage = 0;
// 待确认购买：{key, id}，非空时商店显示确认弹窗 / pending purchase awaiting confirmation
let pendingBuy = null;
let owned = {bird:['yellow'], pipe:['green'], bg:['day'], bgm:['off']};
let equipped = {bird:'yellow', pipe:'green', bg:'day', bgm:'off'};
let shopToast = '', shopToastAt = -99;

const catOf = key => shopCats.find(c => c.key === key);
const itemOf = (key, id) => catOf(key).items.find(i => i.id === id) || catOf(key).items[0];
const birdPrefix = () => itemOf('bird', equipped.bird).bird;
// 管道贴图：img 项直接用现成贴图（木/金/银），hue 项把绿管实时染色（红/蓝）
// Pipe sprite: img items use their own texture, hue items recolour the green pipe
const tinted = {};
function pipeSpriteFor(it) {
  if (!it) return sprites['pipe-green'];
  if (it.img) return sprites[it.img] || sprites['pipe-green'];
  if (!it.hue) return sprites['pipe-green'];
  if (!tinted[it.id]) {
    const src = sprites['pipe-green'];
    if (!src.naturalWidth) return src;
    const c = document.createElement('canvas');
    c.width = src.naturalWidth; c.height = src.naturalHeight;
    const g = c.getContext('2d');
    g.filter = `hue-rotate(${it.hue}deg) saturate(1.1)`;
    g.drawImage(src, 0, 0);
    tinted[it.id] = c;
  }
  return tinted[it.id];
}
function pipeSprite() {return pipeSpriteFor(itemOf('pipe', equipped.pipe));}
function background() {
  const it = itemOf('bg', equipped.bg);
  ctx.drawImage(sprites[it.img || 'background-day'], 0, 0, W, H);
}

// 死亡动画状态：原地弹两下 → 坠落 → 落地结算 / death sequence: two hops, fall, then settle
let dieT = 0, dieOffset = 0, dieVY = 0, dieLanded = false;
function endGame() {
  if (state !== 'PLAYING') return;
  state = 'DYING';
  dieT = 0; dieOffset = 0; dieVY = 0; dieLanded = false;
  // 金币先算好，落地时才入账 / compute coins now, credit them on landing
  coinsEarned = Math.round(score * difficulties[diff].mult);
  playSound('hit');
}
// 落地：定格、记纪录、入账、播死亡音 / landing: freeze, save best, credit coins, play the die cue
function landBird() {
  if (dieLanded) return;
  dieLanded = true;
  bird.y = GROUND - bird.height; bird.rot = 90; dieOffset = 0;
  state = 'GAME_OVER';
  bests[diff] = Math.max(bests[diff], score); best = bests[diff]; saveBest();
  coins += coinsEarned; saveCoins();
  playSound('die');
}
function reset() {
  state = 'READY'; bird.y = 246; bird.vy = 0; bird.rot = 0; pipes = []; score = 0; speed = baseSpeed; pipesPassed = 0; coinsEarned = 0; clearEffects();
  dieT = 0; dieOffset = 0; dieVY = 0; dieLanded = false;
}
// 切换难度：同步该难度的最佳纪录 / switch difficulty and load its own best score
function setDiff(i) {
  playUi('select');
  diff = i; gap = difficulties[diff].gap; best = bests[diff] || 0; reset();
}

// 计时与固定物理步长 / Clock and fixed physics steps
let previous = 0, elapsed = 0, tick = 0;
function frame(time) {
  elapsed += Math.min((time - previous) / 1000, 0.05); previous = time;
  while (elapsed >= 1/60) {moveBird(); movePipes(); tick += 1/60; elapsed -= 1/60;}
  background(); drawPipes(); drawStars(); drawBase(); drawEffects(); drawBird();
  drawUI();
  requestAnimationFrame(frame);
}

// 像素数字 / Pixel digit sprites
function drawNumber(n, cx, y, scale = 1) {
  const s = String(n), dw = 24 * scale, dh = 36 * scale, g = 2 * scale;
  let x = cx - (s.length * (dw + g) - g) / 2;
  for (const ch of s) {ctx.drawImage(sprites[ch], Math.round(x), y, dw, dh); x += dw + g;}
}
function drawLabel(text, cx, y, size = 11) {
  ctx.font = `bold ${size}px Arial`; ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = '#543847'; ctx.strokeText(text, cx, y);
  ctx.fillStyle = 'white'; ctx.fillText(text, cx, y);
}
// 框内按钮 / In-canvas button
function drawButton(r, text, selected, enabled) {
  ctx.fillStyle = !enabled ? '#9a9a9a' : selected ? '#5bc85b' : '#f8f0e0';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.lineWidth = 2; ctx.strokeStyle = '#543847';
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#27213c';
  ctx.fillText(text, r.x + r.w/2, r.y + r.h/2 + 1);
  ctx.textBaseline = 'alphabetic';
}
// 统计小面板：上标签下数值 / Small stat panel: label on top, value below
function drawStatBox(r, label, value) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.lineWidth = 2; ctx.strokeStyle = '#543847';
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.textAlign = 'center';
  ctx.font = 'bold 8px Arial'; ctx.fillStyle = '#a06a3c';
  ctx.fillText(label, r.x + r.w/2, r.y + 12);
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#27213c';
  ctx.fillText(String(value), r.x + r.w/2, r.y + 27);
}
// 三档最佳纪录并排显示，当前难度高亮 / all three bests at once, active difficulty highlighted
function drawBestPanel() {
  const r = bestPanel;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.lineWidth = 2; ctx.strokeStyle = '#543847';
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  const colW = r.w / difficulties.length;
  ctx.textAlign = 'center';
  difficulties.forEach((d, i) => {
    const cx = r.x + colW * (i + 0.5);
    const on = i === diff;
    ctx.font = 'bold 7px Arial';
    ctx.fillStyle = on ? '#d2691e' : '#a06a3c';
    ctx.fillText(d.name === 'DIFFICULT' ? 'DIFF' : d.name, cx, r.y + 12);
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = on ? '#27213c' : '#6b6273';
    ctx.fillText(String(bests[i] || 0), cx, r.y + 27);
    if (on) {ctx.fillStyle = '#d2691e'; ctx.fillRect(cx - 15, r.y + r.h - 5, 30, 2);}
  });
}
// 框内按钮区域 / In-canvas button rects (canvas coordinates)
const diffRects  = [{x:12,y:204,w:86,h:26},{x:101,y:204,w:86,h:26},{x:190,y:204,w:86,h:26}];
const shopRect   = {x:74,y:244,w:140,h:30};
const soundRect  = {x:89,y:286,w:110,h:24};
// 主界面底部：三档纪录并排 + 金币 / ready screen: per-difficulty bests and coins
const bestPanel  = {x:14,y:348,w:180,h:34};
const coinsRect  = {x:200,y:348,w:74,h:34};
// 商店：分页标签 + 卡片（每页 2x2 共四张大卡）+ 翻页 + 声音 + 返回
// Shop: tabs, four large cards per page, pager, sound, back
const tabRects  = [0,1,2,3].map(i => ({x: 10 + i * 68, y: 62, w: 64, h: 22}));
const cardRects = [0,1,2,3].map(i => ({x: i % 2 ? 150 : 10, y: 90 + Math.floor(i / 2) * 94, w: 128, h: 90}));
const prevRect  = {x: 10,  y: 280, w: 54, h: 22};
const nextRect  = {x: 224, y: 280, w: 54, h: 22};
const shopSoundRect = {x: 84, y: 310, w: 120, h: 22};
const backRect  = {x: 84, y: 338, w: 120, h: 24};
const PER_PAGE = cardRects.length;
// 购买确认弹窗：面板与两个按钮 / purchase confirm dialog panel and buttons
const BUY_PANEL = {x: 32, y: 166, w: 224, h: 184};
const confirmRect = {x: 46,  y: BUY_PANEL.y + 142, w: 88, h: 26};
const cancelRect  = {x: 154, y: BUY_PANEL.y + 142, w: 88, h: 26};
function inRect(x, y, r) {return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;}
// 分页：每页 PER_PAGE 件 / paging helper
const pageCountOf = cat => Math.max(1, Math.ceil(cat.items.length / PER_PAGE));
const pageItems = cat => cat.items.slice(shopPage * PER_PAGE, shopPage * PER_PAGE + PER_PAGE);
function setTab(n) {
  playUi('move');
  shopTab = n; shopPage = 0; pendingBuy = null;
}

// 商店卡片：预览 + 名称 + 状态 / Shop card: preview, name, state
function drawShopCard(r, cat, item) {
  const isEq = equipped[cat.key] === item.id;
  const isOwned = owned[cat.key].includes(item.id);
  const affordable = coins >= item.price;
  ctx.fillStyle = item.coming ? '#cbc6bb' : isEq ? '#b9e88f' : '#f8f0e0';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.lineWidth = isEq ? 3 : 2; ctx.strokeStyle = item.coming ? '#7d776d' : isEq ? '#3f8f2f' : '#543847';
  ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);

  const cx = r.x + r.w / 2;
  if (item.coming) {
    ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#6f6a61'; ctx.fillText('?', cx, r.y + 32);
    ctx.textBaseline = 'alphabetic';
  } else if (cat.key === 'bird') {
    ctx.drawImage(sprites[(item.bird || 'yellowbird') + '-midflap'], cx - 19, r.y + 14, 38, 27);
  } else if (cat.key === 'pipe') {
    ctx.drawImage(pipeSpriteFor(item), 0, 0, 52, 70, cx - 16, r.y + 4, 32, 43);
  } else if (cat.key === 'bg') {
    if (item.img) ctx.drawImage(sprites[item.img], r.x + 16, r.y + 6, r.w - 32, 41);
  } else {
    ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = item.id === 'off' ? '#9a9a9a' : '#5b8fd6';
    ctx.fillText(item.id === 'off' ? '\u266A' : '\u266B', cx, r.y + 28);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = '#27213c'; ctx.fillText(item.name, cx, r.y + 64);
  ctx.font = 'bold 9px Arial';
  if (item.coming) {ctx.fillStyle = '#5d564d'; ctx.fillText('COMING SOON', cx, r.y + 80);}
  else if (isEq) {ctx.fillStyle = '#2f6d1f'; ctx.fillText('EQUIPPED', cx, r.y + 80);}
  else if (isOwned) {ctx.fillStyle = '#4a6b2f'; ctx.fillText('OWNED - TAP', cx, r.y + 80);}
  else {
    ctx.fillStyle = affordable ? '#a06d00' : '#a33a2b';
    ctx.fillText(item.price + ' COINS', cx, r.y + 80);
  }
}

// 面板文字：深棕、无描边 / panel text in dark brown, no outline
function drawPanelLabel(text, cx, y, size = 11) {
  ctx.font = `bold ${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#543847'; ctx.fillText(text, cx, y);
}

// 购买确认弹窗 / purchase confirmation dialog
function drawBuyConfirm() {
  const cat = catOf(pendingBuy.key);
  const item = cat && cat.items.find(i => i.id === pendingBuy.id);
  if (!item) {pendingBuy = null; return;}
  const px = BUY_PANEL.x, py = BUY_PANEL.y, pw = BUY_PANEL.w, ph = BUY_PANEL.h;
  // 半透明遮罩，压住整块画面 / dim the whole canvas
  ctx.fillStyle = 'rgba(20,14,24,0.55)';
  ctx.fillRect(0, 0, W, H);
  // 面板 / panel
  ctx.fillStyle = '#f8f0e0';
  ctx.fillRect(px, py, pw, ph);
  ctx.lineWidth = 3; ctx.strokeStyle = '#543847';
  ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
  drawPanelLabel('CONFIRM PURCHASE', W/2, py + 24, 12);

  // 预览区 / preview strip
  const cx = W/2, pvY = py + 32, pvH = 40;
  ctx.fillStyle = '#e8e0cd';
  ctx.fillRect(px + 12, pvY, pw - 24, pvH);
  if (cat.key === 'bird') {
    ctx.drawImage(sprites[(item.bird || 'yellowbird') + '-midflap'], cx - 19, pvY + 7, 38, 27);
  } else if (cat.key === 'pipe') {
    ctx.drawImage(pipeSpriteFor(item), 0, 0, 52, 70, cx - 13, pvY + 3, 26, 34);
  } else if (cat.key === 'bg') {
    if (item.img) ctx.drawImage(sprites[item.img], px + 34, pvY + 2, pw - 68, pvH - 4);
  } else {
    ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5b8fd6';
    ctx.fillText(item.id === 'off' ? '\u266A' : '\u266B', cx, pvY + pvH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  drawPanelLabel(item.name, cx, py + 88, 13);
  drawPanelLabel('PRICE  ' + item.price + ' COINS', cx, py + 110, 10);
  // 扣款后余额，让玩家看清花完还剩多少 / show the balance after paying
  drawPanelLabel('COINS ' + coins + '  \u2192  ' + (coins - item.price), cx, py + 130, 9);
  drawButton(confirmRect, 'BUY', true, true);
  drawButton(cancelRect, 'CANCEL', false, true);
}

function drawUI() {
  // 死亡动画期间只留分数，结算面板等落地后再出 / during the death fall only the score stays on screen
  if (state === 'PLAYING' || state === 'DYING') {
    drawNumber(score, W/2, 30);
    // 提速提示 / speed indicator once accelerating
    if (state === 'PLAYING' && speed > baseSpeed) drawLabel('SPEED x' + (speed / baseSpeed).toFixed(1), W/2, 80);
    return;
  }
  if (state === 'READY') {
    // 开始画面：难度 + 商店入口 + 声音 + 当前装备 / start: difficulty, shop entry, sound, loadout
    ctx.drawImage(sprites.message, (W - 184 * 0.65) / 2, 6, 184 * 0.65, 267 * 0.65);
    drawLabel('DIFFICULTY', W/2, 194);
    difficulties.forEach((d, i) => drawButton(diffRects[i], d.name, i === diff, true));
    drawButton(shopRect, 'SHOP', false, true);
    drawButton(soundRect, soundOn ? 'SOUND: ON' : 'SOUND: OFF', false, true);
    drawLabel('BIRD ' + itemOf('bird', equipped.bird).name + '   PIPE ' + itemOf('pipe', equipped.pipe).name, W/2, 326, 9);
    drawLabel('BG ' + itemOf('bg', equipped.bg).name + '   BGM ' + itemOf('bgm', equipped.bgm).name, W/2, 340, 9);
    // 三档纪录常驻 + 金币 / all three bests and coins always on screen
    drawBestPanel();
    drawStatBox(coinsRect, 'COINS', coins);
    if (storageNote) drawLabel('Storage unavailable', W/2, 392, 9);
    return;
  }
  if (state === 'SHOP') {
    // 商店：分类标签 + 当前页四张卡片 + 翻页 / shop: tabs, current page cards, pager
    drawLabel('SHOP', W/2, 26, 15);
    drawLabel('COINS ' + coins, W/2, 46, 10);
    shopCats.forEach((c, i) => drawButton(tabRects[i], c.name, i === shopTab, true));
    const cat = shopCats[shopTab];
    const pages = pageCountOf(cat);
    const list = pageItems(cat);
    list.forEach((item, i) => drawShopCard(cardRects[i], cat, item));
    // 末页不满时补空槽 / blank slots on a partially filled page
    for (let i = list.length; i < cardRects.length; i++) {
      const r = cardRects[i];
      ctx.save();
      ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(84,56,71,0.35)';
      ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
      ctx.restore();
    }
    // 翻页控件：只有多页时显示 / pager only when needed
    if (pages > 1) {
      drawButton(prevRect, '<', false, shopPage > 0);
      drawButton(nextRect, '>', false, shopPage < pages - 1);
      drawLabel((shopPage + 1) + '/' + pages, W/2, 296, 11);
    }
    drawButton(shopSoundRect, soundOn ? 'SOUND: ON' : 'SOUND: OFF', false, true);
    drawButton(backRect, 'BACK', false, true);
    if (tick - shopToastAt < 2) drawLabel(shopToast, W/2, 378, 10);
    // 确认弹窗盖在最上层 / confirm dialog sits above everything
    if (pendingBuy) drawBuyConfirm();
    return;
  }
  // GAME_OVER / 结束画面：结算得分与金币
  ctx.drawImage(sprites.gameover, (W - 192) / 2, 118);
  drawLabel('SCORE', W/2, 186); drawNumber(score, W/2, 192, 0.6);
  drawLabel('BEST', W/2, 236); drawNumber(best, W/2, 242, 0.6);
  drawLabel('COINS +' + coinsEarned, W/2, 286); drawNumber(coinsEarned, W/2, 292, 0.6);
  drawLabel('TOTAL ' + coins, W/2, 338);
  drawLabel('Press Space to restart', W/2, 372, 9);
}

// 画出小鸟（三帧扇翅 + 俯仰角）/ Draw the bird (3-frame flap + tilt)
const BIRD_FRAMES = ['downflap', 'midflap', 'upflap'];
drawBird = () => {
  // 死亡时翅膀定格，不再扇动 / wings freeze once dead
  const pose = state === 'DYING' ? 'midflap' : BIRD_FRAMES[[0,1,2,1][Math.floor(tick * 10) % 4]];
  const bob = state === 'READY' ? Math.sin(tick * 4) * 4 : 0;
  const dy = state === 'DYING' ? dieOffset : 0;   // 死亡动画的弹跳/坠落位移 / death hop & fall offset
  ctx.save();
  ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2 + bob + dy);
  ctx.rotate(bird.rot * Math.PI / 180);
  ctx.drawImage(sprites[birdPrefix() + '-' + pose], -bird.width/2, -bird.height/2, bird.width, bird.height);
  ctx.restore();
};

// 输入与重力 / Input and gravity
function flap() {
  if (state === 'SHOP' || state === 'DYING') return; // 商店 / 死亡动画中不起飞 / no flying in shop or mid-death
  if (state === 'GAME_OVER') {reset(); playSound('swoosh'); return;}
  // 拍翅音效由 onFlap 负责，这里不再重复播放 / onFlap already plays the wing cue
  state = 'PLAYING'; bird.vy = flapSpeed; onFlap();
}
document.addEventListener('keydown', e => {
  // 确认弹窗优先：Enter 买下，ESC / 空格 取消 / dialog first: Enter buys, ESC or Space cancels
  if (pendingBuy) {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {e.preventDefault(); commitBuy(); return;}
    if (e.code === 'Escape' || e.code === 'Space') {e.preventDefault(); pendingBuy = null; playUi('cancel'); return;}
    return;
  }
  if (e.code === 'Escape' && state === 'SHOP') {state = 'READY'; playUi('cancel'); return;}
  // S 进/出商店（与点击商店按钮一致）/ S toggles the shop
  if (e.code === 'KeyS' && !['SELECT','BUTTON','INPUT'].includes(e.target.tagName)) {
    if (state === 'READY') {state = 'SHOP'; shopToastAt = -99; shopPage = 0; pendingBuy = null; playUi('open');}
    else if (state === 'SHOP') {state = 'READY'; playUi('cancel');}
    return;
  }
  // M 静音开关 / M toggles sound anywhere
  if (e.code === 'KeyM' && !['SELECT','BUTTON','INPUT'].includes(e.target.tagName)) {toggleSound(); return;}
  if (e.code === 'Space' && !['SELECT','BUTTON','INPUT'].includes(e.target.tagName)) {
    e.preventDefault();
    if (e.repeat) return;
    if (state === 'SHOP') {state = 'READY'; playUi('cancel'); return;} // 空格退出商店 / space leaves the shop
    flap();
  }
  // 数字键：READY 切难度，SHOP 切分类 / digits: difficulty in READY, category in SHOP
  if (['Digit1','Digit2','Digit3','Digit4'].includes(e.code)) {
    const n = Number(e.code.slice(-1)) - 1;
    if (state === 'READY' && n < difficulties.length) {
      setDiff(n);
    } else if (state === 'SHOP' && n < shopCats.length) {
      setTab(n);
    }
  }
});
// 点击画布：先判按钮，再当拍翅 / tap: buttons first, otherwise flap
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * W / r.width;
  const y = (e.clientY - r.top) * H / r.height;
  canvas.focus();
  if (state === 'SHOP') {
    // 确认弹窗打开时吞掉其他点击 / dialog swallows every other tap
    if (pendingBuy) {
      if (inRect(x, y, confirmRect)) {commitBuy(); return;}
      if (inRect(x, y, cancelRect)) {pendingBuy = null; playUi('cancel'); return;}
      // 点面板外也当取消 / tapping outside the panel cancels
      if (!inRect(x, y, BUY_PANEL)) {pendingBuy = null; playUi('cancel'); return;}
      return;
    }
    for (let i = 0; i < shopCats.length; i++) {
      if (inRect(x, y, tabRects[i])) {setTab(i); return;}
    }
    const cat = shopCats[shopTab];
    const pages = pageCountOf(cat);
    // 翻页优先判定 / pager first
    if (pages > 1) {
      if (inRect(x, y, prevRect)) {shopPage = Math.max(0, shopPage - 1); playUi('move'); return;}
      if (inRect(x, y, nextRect)) {shopPage = Math.min(pages - 1, shopPage + 1); playUi('move'); return;}
    }
    const list = pageItems(cat);
    for (let i = 0; i < list.length; i++) {
      if (inRect(x, y, cardRects[i])) {buyOrEquip(cat, list[i]); return;}
    }
    if (inRect(x, y, shopSoundRect)) {toggleSound(); return;}
    if (inRect(x, y, backRect)) {state = 'READY'; pendingBuy = null; playUi('cancel'); return;}
    return;
  }
  if (state === 'READY') {
    for (let i = 0; i < difficulties.length; i++) {
      if (inRect(x, y, diffRects[i])) {setDiff(i); return;}
    }
    if (inRect(x, y, shopRect)) {state = 'SHOP'; shopToastAt = -99; shopPage = 0; pendingBuy = null; playUi('open'); return;}
    if (inRect(x, y, soundRect)) {toggleSound(); return;}
  }
  flap();
});
moveBird = () => {
  // 死亡动画：先原地弹两下（高度递减），再自由坠落 / two hops in place, then fall
  if (state === 'DYING') {
    dieT += 1/60;
    if (dieT < 0.22) {
      dieOffset = -Math.sin(dieT / 0.22 * Math.PI) * 15;   // 第一跳 / first hop
    } else if (dieT < 0.28) {
      dieOffset = 0;                                      // 落地瞬间的停顿 / brief pause on the ground
    } else if (dieT < 0.52) {
      dieOffset = -Math.sin((dieT - 0.28) / 0.24 * Math.PI) * 9;  // 第二跳 / second hop
    } else {
      dieVY += 0.5; dieOffset += dieVY;                    // 自由坠落 / free fall
      bird.rot = Math.min(90, bird.rot + 7);               // 坠落时低头 / nose dive
      if (bird.y + dieOffset + bird.height >= GROUND) {landBird(); return;}
    }
    return;
  }
  if (state !== 'PLAYING') return;
  bird.vy += gravity; bird.y += bird.vy;
  if (bird.y < 0) {bird.y = 0; bird.vy = 0;}
  // 上升抬头、下坠低头 / tilt up when rising, dive when falling
  if (bird.vy < 0) bird.rot = -25; else bird.rot = Math.min(90, bird.rot + 4);
  if (bird.y + bird.height >= GROUND) {bird.y = GROUND - bird.height; endGame();}
};

// 生成和移动管道 / Create and move pipes
function createPipe() {
  const top = 60 + Math.random() * (GROUND - gap - 160);
  // 50% 概率带星：20% 蓝星(+10)、30% 橙星(+5) / 50% chance a star: 20% blue(+10), 30% orange(+5)
  const roll = Math.random();
  pipes.push({x: W, top, bottom: top + gap, scored: false,
    star: roll < 0.5, kind: roll < 0.2 ? 'blue' : 'orange', starGot: false});
}
movePipes = () => {
  if (state !== 'PLAYING') return;
  for (const p of pipes) p.x -= speed;
  pipes = pipes.filter(p => p.x + 52 > 0);
  if (!pipes.length || pipes[pipes.length - 1].x < W - difficulties[diff].spacing) createPipe();
};
drawPipes = () => {
  const pipe = pipeSprite();
  for (const p of pipes) {
    // 下管 / bottom pipe
    ctx.drawImage(pipe, Math.round(p.x), p.bottom, 52, 320);
    // 上管：取素材上部并倒置，管口对齐缺口 / top pipe: crop and flip, cap meets the gap
    ctx.save();
    ctx.translate(Math.round(p.x), p.top); ctx.scale(1, -1);
    ctx.drawImage(pipe, 0, 0, 52, p.top, 0, 0, 52, p.top);
    ctx.restore();
  }
};
// 滚动地面：跟随当前背景主题 / Scrolling ground, follows the equipped background theme
let baseX = 0;
drawBase = () => {
  if (state === 'PLAYING') {baseX -= speed; if (baseX <= -48) baseX += 48;}
  const it = itemOf('bg', equipped.bg);
  ctx.drawImage(sprites[it.base || 'base'], Math.round(baseX), GROUND);
};
// 画星星：贴图 + 眨眼动画 / Draw stars: sprite with blink animation
drawStars = () => {
  for (const p of pipes) {
    if (!p.star || p.starGot) continue;
    // 每 1.6 秒眨一次眼，闭眼 0.22 秒，足够显眼 / blink 0.22s every 1.6s
    const pose = (tick % 1.6) < 0.22 ? 'closed' : 'open';
    const y = (p.top + p.bottom) / 2 + Math.sin(tick * 6 + p.x * 0.05) * 5;
    // 等比 32x32，中心对齐碰撞圆心 p.x+26 / square sprite centred on the pickup circle
    ctx.drawImage(sprites['star-' + p.kind + '-' + pose], Math.round(p.x) + 10, Math.round(y) - 16, 32, 32);
  }
};

// 检查碰撞并且只计分一次 / Check collisions and score only once
const movePipesWithoutHits = movePipes;
movePipes = () => {
  movePipesWithoutHits();
  if (state !== 'PLAYING') return;
  for (const p of pipes) {
    const overlap = bird.x + bird.width - 2 > p.x && bird.x + 2 < p.x + 52;
    if (overlap && (bird.y + 2 < p.top || bird.y + bird.height - 2 > p.bottom)) {endGame(); return;}
    // 吃星星：蓝星 +10、橙星 +5，音效与粒子按颜色区分 / grab star: blue +10, orange +5
    if (p.star && !p.starGot) {
      const sx = p.x + 26, sy = (p.top + p.bottom) / 2;
      const dx = sx - (bird.x + bird.width / 2), dy = sy - (bird.y + bird.height / 2);
      if (dx * dx + dy * dy < 26 * 26) {
        p.starGot = true;
        score += p.kind === 'blue' ? 10 : 5;
        afterScore();
        playStarTones(p.kind === 'blue' ? [660, 880, 1320] : [523, 659, 784]);
        const col = p.kind === 'blue' ? '#87ceeb' : '#ffa500';
        for (let i = 0; i < 12; i++) particles.push({x: sx, y: sy, vx: -1.5 + Math.random() * 3, vy: -1.5 + Math.random() * 3, life: 1, color: col});
      }
    }
    // 速度越快单管得分越高 / faster speed pays more per pipe
    if (!p.scored && p.x + 52 < bird.x) {
      p.scored = true; pipesPassed++;
      score += 1 + Math.floor(speed - baseSpeed);
      afterScore(); playSound('point');
    }
  }
};

// 保存到当前浏览器 / Save in this browser
let storageNote = false;
const bestsKey = 'aie1101-bird-bests';           // 三档难度各自的纪录 / best score per difficulty
const bestKey = 'aie1101-bird-best';             // 旧版单条纪录，仅用于迁移 / legacy value, migration only
const coinsKey = 'aie1101-bird-coins', shopKey = 'aie1101-bird-shop';
// 金币：累计持有 + 本局所得 / coins: total owned + earned this run
let coins = 0, coinsEarned = 0;
let saveShop = () => {};
try {
  coins = Math.max(0, Number(localStorage.getItem(coinsKey)) || 0);
  // 商店进度：已拥有 + 已装备 / shop progress: owned + equipped
  const raw = localStorage.getItem(shopKey);
  if (raw) {
    const d = JSON.parse(raw);
    for (const c of shopCats) {
      if (d.owned && Array.isArray(d.owned[c.key])) {
        const valid = d.owned[c.key].filter(id => c.items.some(i => i.id === id && !i.coming));
        if (valid.length) owned[c.key] = Array.from(new Set([c.items[0].id, ...valid]));
      }
      if (d.equipped && owned[c.key].includes(d.equipped[c.key])) equipped[c.key] = d.equipped[c.key];
    }
  }
}
catch {storageNote = true;}
// 分难度最佳纪录：独立读取，避免单条损坏影响金币与商店 / isolated so a bad best entry can't break coins/shop
try {
  const rawB = localStorage.getItem(bestsKey);
  if (rawB) {
    const arr = JSON.parse(rawB);
    bests = difficulties.map((_, i) => Math.max(0, Math.round(Number(arr && arr[i]) || 0)));
  } else {
    // 老存档只有一条纪录，归入默认的 NORMAL / the old single best belonged to NORMAL
    bests[1] = Math.max(0, Math.round(Number(localStorage.getItem(bestKey)) || 0));
  }
  best = bests[diff];
} catch {storageNote = true;}
saveBest = () => {
  try {localStorage.setItem(bestsKey, JSON.stringify(bests));}
  catch {storageNote = true;}
};
// 迁移完成后立刻写成新格式，之后只读新 key / persist the migration once, then read only the new key
try {
  if (!localStorage.getItem(bestsKey) && bests.some(v => v > 0)) saveBest();
} catch {storageNote = true;}
saveCoins = () => {
  try {localStorage.setItem(coinsKey, String(coins));}
  catch {storageNote = true;}
};
saveShop = () => {
  try {localStorage.setItem(shopKey, JSON.stringify({owned, equipped}));}
  catch {storageNote = true;}
};

// 商店交互：未拥有则购买，已拥有则装备 / shop: buy when unowned, equip when owned
function setToast(msg) {shopToast = msg; shopToastAt = tick;}
// 点卡片：已拥有→直接装备；未拥有→先弹确认框，不立刻扣钱
// Tap: owned items equip right away, unowned ones open a confirm dialog first
function buyOrEquip(cat, item) {
  if (item.coming) {setToast('COMING SOON'); playUi('deny'); return;}
  if (equipped[cat.key] === item.id) {setToast('ALREADY EQUIPPED'); playUi('deny'); return;}
  if (owned[cat.key].includes(item.id)) {
    equipped[cat.key] = item.id;
    saveShop();
    setToast('EQUIPPED ' + item.name);
    playUi('select');
    if (cat.key === 'bgm') {
      // 选 BGM 时自动开声音，否则买了听不到 / auto-enable sound so a picked track is audible
      if (equipped.bgm !== 'off' && !soundOn) soundOn = true;
      bgmRefresh();
    }
    return;
  }
  if (coins < item.price) {setToast('NEED ' + (item.price - coins) + ' MORE COINS'); playUi('deny'); return;}
  pendingBuy = {key: cat.key, id: item.id};  // 交给确认弹窗 / hand over to the confirm dialog
  playUi('open');
}
// 确认后真正扣钱并入账 / actually charge and unlock once confirmed
function commitBuy() {
  const req = pendingBuy;
  pendingBuy = null;
  if (!req) return;
  const cat = catOf(req.key);
  const item = cat && cat.items.find(i => i.id === req.id);
  if (!item || item.coming) {playUi('deny'); return;}
  if (owned[cat.key].includes(item.id) || coins < item.price) {playUi('deny'); return;}
  coins -= item.price;
  owned[cat.key].push(item.id);
  equipped[cat.key] = item.id;
  saveCoins(); saveShop();
  setToast('BOUGHT ' + item.name);
  playUi('buy');
  if (cat.key === 'bgm') {
    if (equipped.bgm !== 'off' && !soundOn) soundOn = true;
    bgmRefresh();
  }
}
// 按键 / UI 音效：WebAudio 合成短音，无需素材文件 / UI blips synthesized with WebAudio
// move=翻页/切页  open=进商店/弹确认  select=选难度/装备  cancel=取消/退出  buy=购买成功  deny=无效/金币不足
let uiCtx = null;
function uiTone(freq, at, dur, type, vol) {
  const o = uiCtx.createOscillator(), g = uiCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(uiCtx.destination);
  o.start(at); o.stop(at + dur + 0.02);
}
function playUi(kind) {
  if (!soundOn) return;
  try {
    uiCtx = uiCtx || new (window.AudioContext || window.webkitAudioContext)();
    uiCtx.resume().catch(() => {});
    const t = uiCtx.currentTime;
    if (kind === 'move') uiTone(740, t, 0.06, 'square', 0.04);
    else if (kind === 'open') {uiTone(440, t, 0.07, 'square', 0.04); uiTone(660, t + 0.07, 0.09, 'square', 0.04);}
    else if (kind === 'select') {uiTone(660, t, 0.06, 'square', 0.04); uiTone(880, t + 0.06, 0.08, 'square', 0.04);}
    else if (kind === 'cancel') {uiTone(520, t, 0.07, 'square', 0.04); uiTone(330, t + 0.07, 0.1, 'square', 0.04);}
    else if (kind === 'buy') {[523, 659, 784, 1047].forEach((f, i) => uiTone(f, t + i * 0.07, 0.1, 'square', 0.045));}
    else if (kind === 'deny') uiTone(220, t, 0.12, 'sawtooth', 0.035);
  } catch {}
}

// 声音总开关：同时控制音效与 BGM / master sound switch drives sfx and BGM
function toggleSound() {
  soundOn = !soundOn;
  if (soundOn) {bgmRefresh(); playSound('swoosh');} else bgmStop();
}

// BGM：全部用 WebAudio 合成（无音频文件），支持多首曲目 / synthesized tracks, multiple songs
// 每首 = 主旋律 + 低音 + 可选高音点缀；tempo 为每步毫秒 / each track: lead + bass + optional sparkle
const CHIP_LEAD = [523,659,784,659, 587,698,880,698, 523,659,784,880, 784,659,587,523];
const CHIP_BASS = [131,131,196,196, 147,147,196,196, 131,131,196,196, 98,98,131,131];
// SUNSHINE：C 大调阳光跳跃感，正拍切分 / bouncy C-major with off-beat skips
const SUN_LEAD  = [523,659,784,1047, 784,659,587,698, 880,784,659,784, 1047,988,784,659];
const SUN_BASS  = [131,165,196,165, 147,185,196,185, 131,165,196,165, 175,220,262,220];
// CANDY：更快的小跳琶音，糖果感 / faster arpeggios, candy-pop feel
const CANDY_LEAD = [659,784,880,1047, 880,784,659,587, 698,880,988,1175, 988,880,784,659];
const CANDY_BASS = [165,165,220,220, 147,147,196,196, 175,175,233,233, 196,196,165,165];
const BGM_TRACKS = {
  chip:  {tempo:200, lead:CHIP_LEAD,  bass:CHIP_BASS,  leadType:'square',   bassType:'triangle', vol:0.028},
  sun:   {tempo:180, lead:SUN_LEAD,   bass:SUN_BASS,   leadType:'square',   bassType:'triangle', vol:0.026, sparkle:true},
  candy: {tempo:150, lead:CANDY_LEAD, bass:CANDY_BASS, leadType:'triangle', bassType:'square',   vol:0.03,  sparkle:true}
};
let bgmCtx = null, bgmTimer = null, bgmIdx = 0;
function bgmTone(freq, at, dur, type, vol) {
  const o = bgmCtx.createOscillator(), g = bgmCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(bgmCtx.destination);
  o.start(at); o.stop(at + dur + 0.02);
}
function bgmStop() {
  if (bgmTimer) {clearInterval(bgmTimer); bgmTimer = null;}
}
function bgmRefresh() {
  bgmStop();
  const track = BGM_TRACKS[equipped.bgm];
  // 只有开启声音且装备了合成曲时才播 / only when sound is on and a synth track is equipped
  if (!soundOn || !track) return;
  try {
    bgmCtx = bgmCtx || new (window.AudioContext || window.webkitAudioContext)();
    bgmCtx.resume().catch(() => {});
    bgmIdx = 0;
    const step = () => {
      if (!soundOn || !BGM_TRACKS[equipped.bgm]) {bgmStop(); return;}
      const at = bgmCtx.currentTime, i = bgmIdx % 16;
      bgmTone(track.lead[i], at, 0.16, track.leadType, track.vol);
      if (i % 2 === 0) bgmTone(track.bass[i], at, 0.2, track.bassType, 0.045);
      // 高音八度点缀，每 4 步一次 / octave sparkle every 4th step
      if (track.sparkle && i % 4 === 2) bgmTone(track.lead[i] * 2, at + track.tempo / 2000, 0.09, 'sine', 0.018);
      bgmIdx++;
    };
    step();
    bgmTimer = setInterval(step, track.tempo);
  } catch {}
}

// 扇翅粒子和音效 / Flap particles and sound
let particles = [];
onFlap = () => {
  for (let i = 0; i < 8; i++) particles.push({x: bird.x, y: bird.y + 20, vx: -1 - Math.random() * 2, vy: Math.random() * 2, life: 1});
  playSound('wing');
};
const moveBirdWithoutParticles = moveBird;
moveBird = () => {
  moveBirdWithoutParticles();
  for (const p of particles) {p.x += p.vx; p.y += p.vy; p.life -= 1/30;}
  particles = particles.filter(p => p.life > 0);
};
drawEffects = () => {for (const p of particles) {ctx.globalAlpha = p.life; ctx.fillStyle = p.color || '#ffffff'; ctx.fillRect(p.x, p.y, 4, 4);} ctx.globalAlpha = 1;};
clearEffects = () => {particles = [];};

// 得分后：解锁；速度只跟过管数走，不与星星分联动 / after scoring: unlock; speed tracks pipes passed only
afterScore = () => {
  speed = Math.min(maxSpeed, baseSpeed + pipesPassed * difficulties[diff].ramp);
  // 纪录只算当前难度 / the best score is tracked per difficulty
  if (score > bests[diff]) {bests[diff] = score; saveBest();}
  best = bests[diff];
};

// 素材就绪后再启动 / Start once assets are loaded
assetsReady.then(() => requestAnimationFrame(frame));

// 页面切走或关闭前落盘，避免中途退出丢纪录 / flush everything before the tab goes away
const flushSave = () => {saveBest(); saveCoins(); saveShop();};
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {if (document.visibilityState === 'hidden') flushSave();});

// 调试钩子：控制台可直接跳商店、发金币 / debug hooks: jump to shop, grant coins from the console
window.__flappy = {
  shop: () => {state = 'SHOP';},
  tab: n => {setTab(n);},
  page: n => {shopPage = n;},
  ready: () => {state = 'READY';},
  coins: n => {coins = n;},
  own: (key, id) => {const c = catOf(key); if (!owned[key].includes(id)) owned[key].push(id); equipped[key] = id; saveShop(); bgmRefresh();},
  info: () => ({state, diff, score, best, bests: bests.slice(), coins, coinsEarned, owned, equipped, shopTab, shopPage, pending: pendingBuy ? pendingBuy.id : null, tinted: Object.keys(tinted), soundOn, birdY: Math.round(bird.y), dieT: Number(dieT.toFixed(2)), dieOffset: Math.round(dieOffset), rot: Math.round(bird.rot), pipes: pipes.length})
};
