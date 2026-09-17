/* game.js
   Runs stage one of the bookshop game.

   The idea in one breath: customers wander up to your Little Free Library, buy a
   book if there is one, and pay you coins. You spend coins to restock. Save up
   for the next stage.

   Reading guide:
     1. Settings and word lists
     2. The game "state": everything worth remembering
     3. Setup screen (pick a spot)
     4. Drawing the scene
     5. Customers and the game loop
     6. Saving and loading
*/

(function () {
  'use strict';

  // =========================================================
  // 1. Settings and word lists
  // =========================================================
  const SLOT_COUNT = 20;         // a comically small shop
  const SELL_PRICE = 3;          // coins earned per book sold
  const RESTOCK_COST = 1;        // coins spent per book restocked
  const GOAL_COINS = 60;         // what the book shed will cost in stage two
  const MAX_CUSTOMERS = 3;       // how many people can be on screen at once
  const WALK_SPEED = 55;         // picture units per second
  const SAVE_KEY = 'capeCodBookshop.stageOne';

  // Faded book colours to match the weathered box.
  const BOOK_COLORS = ['#b7736b', '#6f8a99', '#a9a06b', '#7d9a7a', '#9b7f9c', '#c2a37c', '#8c8c8c', '#b39a5b', '#8f6f5a'];

  // Titles with a wink at Chatham and the Cape.
  const BOOK_TITLES = [
    'Fog Over Monomoy', 'The Seal Who Read Too Much', 'Low Tide at Oyster Pond',
    'Saltwater Taffy and Other Vices', 'Cranberry Bog Mysteries, Vol. 3', 'Hydrangea Season',
    'A Field Guide to Piping Plovers', 'The Band Concert Waltz', 'Shingles: A Love Story',
    'Main Street After Labor Day', 'Knots for Nervous Sailors', 'Rainy Day at the Fish Pier',
    'How to Parallel Park in July', 'The Lighthouse Keeper’s Almanac', 'The Ferry Left Without Me',
    'Stargazing from the Dunes', 'Whale Tales', 'The Anglers’ Book Club',
    'Chowder: A Memoir', 'Ninety-Nine Uses for Beach Glass'
  ];

  // Who wanders by. Personality comes from clothes and props, per STYLE.md.
  const CUSTOMER_LOOKS = [
    { desc: 'A woman in a red scarf', coat: '#3f5a86', hat: null, scarf: '#b6413a', prop: 'tote', propColor: '#c9a86a' },
    { desc: 'A grandmother with a wicker basket', coat: '#7fa0c9', hat: '#b6413a', scarf: null, prop: 'basket', propColor: '#b48a52' },
    { desc: 'A boy in a striped jumper', coat: '#c94f47', hat: null, scarf: null, prop: null, propColor: null, stripes: true, small: true },
    { desc: 'A tourist with a tote bag', coat: '#d9a441', hat: '#f1e7c8', scarf: null, prop: 'tote', propColor: '#2b3f5c' },
    { desc: 'A man in a mustard raincoat', coat: '#c99a3a', hat: null, scarf: null, prop: null, propColor: null },
    { desc: 'A girl in a beret', coat: '#2f6f6a', hat: '#a5443a', scarf: null, prop: 'basket', propColor: '#c9a86a', small: true },
    { desc: 'A jogger who slowed down', coat: '#8a9bb3', hat: null, scarf: null, prop: null, propColor: null },
    { desc: 'Someone walking a very patient dog', coat: '#6b5b7a', hat: '#2b2a28', scarf: null, prop: 'tote', propColor: '#a5443a' }
  ];

  // =========================================================
  // 2. The game state
  // =========================================================
  // "state" is the single place where everything worth remembering lives.
  // Saving the game means writing this object down; loading means reading it back.
  let state = null;
  //   state.shopName  : what the player called it
  //   state.location  : 'beach' | 'park' | 'street'
  //   state.coins     : money in the tin
  //   state.books     : 20 entries, each a colour (a book) or null (empty slot)
  //   state.sold      : lifetime books sold
  //   state.log       : the last few diary lines

  let customers = [];            // people currently on screen (not saved; they just wander off)
  let nextSpawnAt = 0;           // when the next customer may appear
  let lastFrame = 0;             // used to measure time between animation frames
  let running = false;

  // Shorthand for finding an element on the page by its id.
  const $ = (id) => document.getElementById(id);

  function freshState(shopName, location) {
    const books = [];
    for (let i = 0; i < SLOT_COUNT; i++) books.push(randomFrom(BOOK_COLORS));
    return { shopName, location, coins: 0, books, sold: 0, log: [] };
  }

  function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }

  // =========================================================
  // 3. Setup screen
  // =========================================================
  let chosenLocation = null;

  function buildSetupScreen() {
    const holder = $('location-cards');
    holder.innerHTML = '';

    Scenes.LOCATIONS.forEach(loc => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'location-card';
      card.dataset.id = loc.id;
      card.innerHTML = `
        <div class="thumb">${Scenes.render(loc.id)}</div>
        <h3>${loc.name}</h3>
        <p>${loc.blurb}</p>`;
      // Show the preview box full of books, with a placeholder name.
      const svg = card.querySelector('svg');
      drawBooksInto(svg, freshState('', loc.id).books);
      svg.querySelector('.box-sign').textContent = 'your library';

      card.addEventListener('click', () => {
        chosenLocation = loc.id;
        holder.querySelectorAll('.location-card').forEach(c => c.classList.toggle('selected', c === card));
        $('start-button').disabled = false;
      });
      holder.appendChild(card);
    });

    $('start-button').addEventListener('click', () => {
      const name = $('shop-name').value.trim() || 'The Little Library';
      state = freshState(name, chosenLocation);
      addLog(`You opened ${name} with ${SLOT_COUNT} books and high hopes.`);
      save();
      startGame();
    });

    // Offer to resume if a saved game exists.
    const saved = load();
    if (saved) {
      $('resume-note').classList.remove('hidden');
      $('resume-button').addEventListener('click', () => { state = saved; startGame(); });
    }
  }

  function startGame() {
    $('setup-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    drawScene();
    drawHud();
    drawLog();
    drawGoal();
    customers = [];
    nextSpawnAt = performance.now() + 1500;   // first customer arrives soon
    if (!running) {
      running = true;
      lastFrame = performance.now();
      requestAnimationFrame(tick);
    }
  }

  // =========================================================
  // 4. Drawing the scene
  // =========================================================
  function drawScene() {
    $('scene').innerHTML = Scenes.render(state.location);
    const svg = $('scene').querySelector('svg');
    drawBooksInto(svg, state.books);
    svg.querySelector('.box-sign').textContent = shortName(state.shopName);
  }

  // Draws one small rectangle per book. Empty slots draw nothing, so gaps show.
  function drawBooksInto(svg, books) {
    const group = svg.querySelector('.books');
    let out = '';
    books.forEach((color, i) => {
      if (!color) return;
      const shelf = Scenes.SHELVES[i < 10 ? 0 : 1];
      const col = i % 10;
      const x = Scenes.SLOT.firstX + col * Scenes.SLOT.step;
      const height = 26 + ((i * 7) % 9);              // varied heights, same every time
      const y = shelf.bottom - height;
      out += `<rect x="${x}" y="${y}" width="${Scenes.SLOT.width}" height="${height}" fill="${color}" stroke="#3b332c" stroke-width="0.6"/>`;
      out += `<rect x="${x + 1}" y="${y + 4}" width="${Scenes.SLOT.width - 2}" height="1.5" fill="#fff" opacity="0.35"/>`;
    });
    group.innerHTML = out;
  }

  function shortName(name) {
    return name.length > 16 ? name.slice(0, 15) + '…' : name;
  }

  function drawHud() {
    $('hud-name').textContent = state.shopName;
    $('hud-coins').textContent = state.coins;
    $('hud-stock').textContent = `${booksInStock()} / ${SLOT_COUNT}`;
    $('hud-sold').textContent = state.sold;

    const empty = SLOT_COUNT - booksInStock();
    const button = $('restock-button');
    if (empty === 0) {
      button.disabled = true;
      button.textContent = 'Restock';
      $('restock-hint').textContent = 'Shelves are full.';
    } else if (state.coins < RESTOCK_COST) {
      button.disabled = true;
      button.textContent = 'Restock';
      $('restock-hint').textContent = `${empty} empty ${empty === 1 ? 'slot' : 'slots'}. You need at least ${RESTOCK_COST} coin to restock.`;
    } else {
      button.disabled = false;
      const canAfford = Math.min(empty, Math.floor(state.coins / RESTOCK_COST));
      button.textContent = `Restock ${canAfford} ${canAfford === 1 ? 'book' : 'books'} (${canAfford * RESTOCK_COST} coins)`;
      $('restock-hint').textContent = `${empty} empty ${empty === 1 ? 'slot' : 'slots'}. Each book costs ${RESTOCK_COST} coin to restock and sells for ${SELL_PRICE}.`;
    }
  }

  function drawLog() {
    $('log').innerHTML = state.log.map(line => `<li>${line}</li>`).join('');
  }

  function drawGoal() {
    const pct = Math.min(100, Math.round((state.coins / GOAL_COINS) * 100));
    $('goal-bar').style.width = pct + '%';
    $('goal-text').textContent = state.coins >= GOAL_COINS
      ? 'You have saved enough for a book shed! Stage two is coming.'
      : `${state.coins} of ${GOAL_COINS} coins saved.`;
  }

  function booksInStock() { return state.books.filter(Boolean).length; }

  function addLog(line) {
    state.log.unshift(line);              // newest first
    if (state.log.length > 6) state.log.pop();
  }

  // A little "+3" that drifts upward from a point in the scene.
  function floatText(x, y, text, color) {
    const svg = $('scene').querySelector('svg');
    const group = svg.querySelector('.effects');
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    el.setAttribute('text-anchor', 'middle');
    el.setAttribute('font-size', '16');
    el.setAttribute('fill', color);
    el.setAttribute('class', 'float');
    el.textContent = text;
    group.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // =========================================================
  // 5. Customers and the game loop
  // =========================================================
  // Each customer is a small object: where they are, which way they face,
  // and what they are doing ('arriving', 'browsing', or 'leaving').
  function spawnCustomer() {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const onSameSide = customers.filter(c => c.side === side).length;
    const look = randomFrom(CUSTOMER_LOOKS);
    const c = {
      id: 'c' + Math.random().toString(36).slice(2, 8),
      look,
      side,
      x: side === 'left' ? -40 : Scenes.VIEW.width + 40,
      stopX: side === 'left' ? Scenes.STOP_X.left - onSameSide * 50 : Scenes.STOP_X.right + onSameSide * 50,
      dir: side === 'left' ? 1 : -1,                 // 1 = walking right, -1 = walking left
      state: 'arriving',
      browseUntil: 0
    };
    customers.push(c);
    const group = $('scene').querySelector('.customers');
    group.insertAdjacentHTML('beforeend', customerSvg(c));
  }

  // Draws a simple person: round head, coat, legs, optional hat and prop.
  function customerSvg(c) {
    const L = c.look;
    const scale = L.small ? 1.1 : 1.35;
    let body = `<ellipse cx="0" cy="0" rx="14" ry="3" fill="#000" opacity="0.12"/>`;
    body += `<rect x="-7" y="-26" width="6" height="26" fill="#4a4a55"/><rect x="1" y="-26" width="6" height="26" fill="#4a4a55"/>`;
    body += `<path d="M-12 -30 L12 -30 L15 -6 L-15 -6 Z" fill="${L.coat}"/>`;
    if (L.stripes) {
      body += `<g fill="#f4efe4"><rect x="-13" y="-25" width="26" height="3"/><rect x="-13.6" y="-18" width="27.2" height="3"/><rect x="-14.2" y="-11" width="28.4" height="3"/></g>`;
    }
    body += `<circle cx="0" cy="-40" r="9" fill="#f0cfb5"/>`;
    body += `<circle cx="3" cy="-40" r="1" fill="#3b332c"/>`;
    body += `<circle cx="4" cy="-37" r="1.8" fill="#e59a8c" opacity="0.6"/>`;
    if (L.hat) body += `<path d="M-10 -44 Q0 -56 10 -44 Z" fill="${L.hat}"/>`;
    else body += `<path d="M-9 -44 Q0 -52 9 -44 Q0 -46 -9 -44 Z" fill="#5a3e2c"/>`;
    if (L.scarf) body += `<rect x="-10" y="-33" width="20" height="5" fill="${L.scarf}" rx="1"/><rect x="4" y="-31" width="5" height="12" fill="${L.scarf}"/>`;
    if (L.prop === 'tote') body += `<rect x="13" y="-22" width="10" height="13" fill="${L.propColor}" rx="1"/><path d="M15 -22 q3 -6 6 0" stroke="${L.propColor}" stroke-width="1.5" fill="none"/>`;
    if (L.prop === 'basket') body += `<path d="M13 -20 h12 l-2 10 h-8 z" fill="${L.propColor}"/><path d="M15 -20 q4 -8 8 0" stroke="${L.propColor}" stroke-width="1.5" fill="none"/>`;
    return `<g id="${c.id}" class="customer" transform="translate(${c.x} ${Scenes.GROUND_Y}) scale(${c.dir * scale} ${scale})">${body}</g>`;
  }

  function moveCustomerElement(c, bob) {
    const el = document.getElementById(c.id);
    if (!el) return;
    const scale = c.look.small ? 1.1 : 1.35;
    el.setAttribute('transform', `translate(${c.x} ${Scenes.GROUND_Y - bob}) scale(${c.dir * scale} ${scale})`);
  }

  // The loop. The browser calls this about 60 times a second.
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - lastFrame) / 1000);   // seconds since last frame, capped
    lastFrame = now;

    if (now >= nextSpawnAt && customers.length < MAX_CUSTOMERS) {
      spawnCustomer();
      nextSpawnAt = now + 3500 + Math.random() * 4000;
    }

    customers.forEach(c => {
      if (c.state === 'arriving') {
        c.x += c.dir * WALK_SPEED * dt;
        const arrived = c.dir === 1 ? c.x >= c.stopX : c.x <= c.stopX;
        moveCustomerElement(c, Math.abs(Math.sin(c.x / 9)) * 2);
        if (arrived) {
          c.x = c.stopX;
          c.state = 'browsing';
          c.browseUntil = now + 1800 + Math.random() * 1800;
          moveCustomerElement(c, 0);
        }
      } else if (c.state === 'browsing') {
        if (now >= c.browseUntil) {
          completeVisit(c);
          c.state = 'leaving';
          c.dir = -c.dir;                                  // turn around
        }
      } else if (c.state === 'leaving') {
        c.x += c.dir * WALK_SPEED * dt;
        moveCustomerElement(c, Math.abs(Math.sin(c.x / 9)) * 2);
      }
    });

    // Remove anyone who has walked off the edge.
    customers = customers.filter(c => {
      const gone = c.state === 'leaving' && (c.x < -60 || c.x > Scenes.VIEW.width + 60);
      if (gone) { const el = document.getElementById(c.id); if (el) el.remove(); }
      return !gone;
    });

    requestAnimationFrame(tick);
  }

  // What happens when a customer finishes browsing.
  function completeVisit(c) {
    const stocked = state.books.map((b, i) => (b ? i : -1)).filter(i => i >= 0);
    if (stocked.length > 0) {
      const slot = randomFrom(stocked);
      state.books[slot] = null;
      state.coins += SELL_PRICE;
      state.sold += 1;
      addLog(`${c.look.desc} bought <em>${randomFrom(BOOK_TITLES)}</em>. +${SELL_PRICE} coins.`);
      floatText(c.x, Scenes.GROUND_Y - 80, `+${SELL_PRICE}`, '#a5443a');
    } else {
      addLog(`${c.look.desc} peered in, found nothing, and wandered off.`);
      floatText(c.x, Scenes.GROUND_Y - 80, '…', '#5d5a54');
    }
    const svg = $('scene').querySelector('svg');
    drawBooksInto(svg, state.books);
    drawHud();
    drawLog();
    drawGoal();
    save();
  }

  function restock() {
    const emptySlots = state.books.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
    const canAfford = Math.floor(state.coins / RESTOCK_COST);
    const n = Math.min(emptySlots.length, canAfford);
    if (n <= 0) return;
    for (let k = 0; k < n; k++) state.books[emptySlots[k]] = randomFrom(BOOK_COLORS);
    state.coins -= n * RESTOCK_COST;
    addLog(`You restocked ${n} ${n === 1 ? 'book' : 'books'} for ${n * RESTOCK_COST} ${n * RESTOCK_COST === 1 ? 'coin' : 'coins'}.`);
    const svg = $('scene').querySelector('svg');
    drawBooksInto(svg, state.books);
    drawHud();
    drawLog();
    drawGoal();
    save();
  }

  // =========================================================
  // 6. Saving and loading
  // =========================================================
  // localStorage is a small notebook the browser keeps for this site on this
  // device. It survives refreshes and closing the tab. It is wrapped in
  // try/catch because private windows sometimes refuse it, and the game should
  // still play even if saving fails.
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* play on without saving */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.books) || data.books.length !== SLOT_COUNT) return null;
      return data;
    } catch (e) { return null; }
  }
  function reset() {
    if (!confirm('Start over? Your coins and books will be gone.')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to remove */ }
    location.reload();
  }

  // =========================================================
  // Wire up the buttons and go.
  // =========================================================
  function init() {
    buildSetupScreen();
    $('restock-button').addEventListener('click', restock);
    $('reset-button').addEventListener('click', reset);
  }

  init();
})();
