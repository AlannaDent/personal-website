/* game.js
   Runs The Salty Jellyfish.

   The idea in one breath: customers wander up to your shop, buy a book if there
   is one, and pay you coins. You spend coins to restock. Save up, and move into
   a bigger building.

   Reading guide:
     1. Settings and word lists
     2. The game "state": everything worth remembering
     3. Setup screen (pick a spot)
     4. Drawing the scene and the panels
     5. Customers and the game loop
     6. Moving up: the upgrade screen
     7. Saving and loading
*/

(function () {
  'use strict';

  // =========================================================
  // 1. Settings and word lists
  // =========================================================
  const SELL_PRICE = 3;          // coins earned per book sold
  const RESTOCK_COST = 1;        // coins spent per book restocked
  const WALK_SPEED = 55;         // picture units per second
  const SAVE_KEY = 'saltyJellyfish.stageOne';
  const DEFAULT_SHOP_NAME = 'The Salty Jellyfish';   // used if the player leaves the name blank

  // What each stage is saving toward. "next" is the stage the upgrade leads to.
  const GOALS = {
    1: { cost: 60,  label: 'A proper book shed with room to grow.', next: 2, button: 'Choose your shed' },
    2: { cost: 250, label: 'A real storefront on the high street.', next: null, button: null }
  };
  const STAGE_TAGLINES = { 1: 'Stage one: the Little Free Library', 2: 'Stage two: the Shed' };
  const MAX_CUSTOMERS = { 1: 3, 2: 4 };              // people on screen at once
  const SPAWN_GAP = { 1: [3500, 7500], 2: [2800, 6000] }; // ms between arrivals, min and max

  // Small print under the stage title. One is chosen at random on each page load,
  // from the list for the building the player is in.
  const FOOTNOTES = {
    lfl: [
      'Free library. Books sold separately.',
      'Technically a Little Fee Library.',
      'The “Free” is aspirational.',
      'Free to browse. Three coins to leave with one.',
      'Free in spirit. Not in price.'
    ],
    'garden-shed': [
      'Previously home to a lawnmower.',
      'The spiders were here first.',
      'Some assembly was required.',
      'Smells of cedar and ambition.'
    ],
    container: [
      'Seaworthy. Probably.',
      'The rust is decorative.',
      'Has seen more of the world than you have.',
      'Formerly shipped everything. Now ships books.'
    ],
    garage: [
      'The car had to go. No regrets.',
      'Oil stain now considered a feature.',
      'Door sticks in humid weather. Everything does.',
      'Mind the lawnmower. It stayed.'
    ]
  };

  // Faded book colours to match the weathered buildings.
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

  // Little observations for the journal, in the spirit of a bookshop clerk's logbook.
  const OBSERVATIONS = [
    'Lingered over the spines.', 'Hummed while browsing.', 'Read the first page standing up.',
    'Asked about the fog.', 'Left a thumbprint on the glass.', 'Seemed pleased.',
    'Paid in exact change.', 'Said the box needed paint. Not wrong.', 'Sniffed the pages.',
    'Waved at the church.', 'Checked the roof for leaks.', 'Promised to come back Tuesday.'
  ];
  const EMPTY_OBSERVATIONS = [
    'Peered in. Shelves bare. Sighed.', 'Found nothing. Rattled the door anyway.',
    'Stared at the empty shelves a long moment, then left.', 'Tutted. Walked on.'
  ];
  // What the journal says the day you move in.
  const MOVING_IN = {
    'garden-shed': 'Moved into the garden shed. A hundred slots. The spiders are unimpressed.',
    container: 'Moved into the container on the beach. A hundred slots and a view. Rust is decorative.',
    garage: 'Moved into the garage down the block. A hundred slots. The oil stain stays.'
  };

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
  //   state.stage     : 1 (library box) or 2 (shed)
  //   state.building  : 'lfl' | 'garden-shed' | 'container' | 'garage'
  //   state.location  : which backdrop the building sits in
  //   state.coins     : money in the tin
  //   state.books     : one entry per slot, each a colour (a book) or null (empty)
  //   state.sold      : lifetime books sold
  //   state.log       : the last few journal lines

  let customers = [];            // people currently on screen (not saved; they just wander off)
  let nextSpawnAt = 0;           // when the next customer may appear
  let lastFrame = 0;             // used to measure time between animation frames
  let running = false;

  // Shorthand for finding an element on the page by its id.
  const $ = (id) => document.getElementById(id);
  const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
  const building = () => Scenes.BUILDINGS[state.building];
  const capacity = () => building().capacity;
  const booksInStock = () => state.books.filter(Boolean).length;

  function freshState(shopName, location) {
    const books = [];
    for (let i = 0; i < Scenes.BUILDINGS.lfl.capacity; i++) books.push(randomFrom(BOOK_COLORS));
    return { shopName, stage: 1, building: 'lfl', location, coins: 0, books, sold: 0, log: [] };
  }

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
        <div class="thumb">${Scenes.render(loc.id, 'lfl')}</div>
        <h3>${loc.name}</h3>
        <p>${loc.blurb}</p>`;
      // Show the preview box full of books, with a placeholder name.
      const svg = card.querySelector('svg');
      drawBooksInto(svg, freshState('', loc.id).books, 'lfl');
      fitSign(svg.querySelector('.box-sign'), 'your library', 'lfl');

      card.addEventListener('click', () => {
        chosenLocation = loc.id;
        holder.querySelectorAll('.location-card').forEach(c => c.classList.toggle('selected', c === card));
        $('start-button').disabled = false;
      });
      holder.appendChild(card);
    });

    $('start-button').addEventListener('click', () => {
      const name = $('shop-name').value.trim() || DEFAULT_SHOP_NAME;
      state = freshState(name, chosenLocation);
      addLog(`Opened ${name} today. ${capacity()} books. High hopes.`);
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

  function showScreen(id) {
    ['setup-screen', 'game-screen', 'upgrade-screen'].forEach(s => $(s).classList.toggle('hidden', s !== id));
  }

  function startGame() {
    showScreen('game-screen');
    setStageText();
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
  // 4. Drawing the scene and the panels
  // =========================================================
  function drawScene() {
    $('scene').innerHTML = Scenes.render(state.location, state.building);
    const svg = $('scene').querySelector('svg');
    drawBooksInto(svg, state.books, state.building);
    fitSign(svg.querySelector('.box-sign'), state.shopName, state.building);
  }

  // Draws one small rectangle per book, shelf by shelf. Empty slots draw nothing.
  function drawBooksInto(svg, books, buildingId) {
    const b = Scenes.BUILDINGS[buildingId];
    let out = '';
    let i = 0;
    b.shelves.forEach(shelf => {
      for (let col = 0; col < shelf.count; col++, i++) {
        const color = books[i];
        if (!color) continue;
        const x = shelf.firstX + col * shelf.step;
        const height = shelf.minH + ((i * 7) % shelf.varH);   // varied heights, same every time
        const y = shelf.bottom - height;
        out += `<rect x="${x.toFixed(1)}" y="${y}" width="${shelf.width}" height="${height}" fill="${color}" stroke="#3b332c" stroke-width="0.5"/>`;
        out += `<rect x="${(x + 1).toFixed(1)}" y="${y + 3}" width="${(shelf.width - 2).toFixed(1)}" height="1.2" fill="#fff" opacity="0.35"/>`;
      }
    });
    svg.querySelector('.books').innerHTML = out;
  }

  // Long names use smaller lettering on the sign; very long names are trimmed.
  function fitSign(textEl, name, buildingId) {
    const sign = Scenes.BUILDINGS[buildingId].sign;
    const shown = name.length > 22 ? name.slice(0, 21) + '…' : name;
    textEl.setAttribute('font-size', shown.length > 15 ? sign.small : sign.size);
    textEl.textContent = shown;
  }

  // The stage line under the title, and its footnote.
  function setStageText() {
    $('stage-tagline').textContent = STAGE_TAGLINES[state.stage];
    $('footnote-text').textContent = randomFrom(FOOTNOTES[state.building] || FOOTNOTES.lfl);
  }

  function drawHud() {
    $('hud-name').textContent = state.shopName;
    $('hud-coins').textContent = state.coins;
    $('hud-stock').textContent = `${booksInStock()} / ${capacity()}`;
    $('hud-sold').textContent = state.sold;

    const empty = capacity() - booksInStock();
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
    const goal = GOALS[state.stage];
    const pct = Math.min(100, Math.round((state.coins / goal.cost) * 100));
    $('goal-label').textContent = goal.label;
    $('goal-bar').style.width = pct + '%';
    const reached = state.coins >= goal.cost;
    const upgradeButton = $('upgrade-button');
    if (reached && goal.next) {
      $('goal-text').textContent = `You have ${state.coins} coins. The shed costs ${goal.cost}.`;
      upgradeButton.textContent = `${goal.button} (${goal.cost} coins)`;
      upgradeButton.classList.remove('hidden');
      $('goal-hint').textContent = 'Your books come with you. Your customers will find you.';
    } else if (reached) {
      $('goal-text').textContent = 'You have saved enough for a storefront! Stage three is coming.';
      upgradeButton.classList.add('hidden');
      $('goal-hint').textContent = 'Keep selling in the meantime. The town is talking.';
    } else {
      $('goal-text').textContent = `${state.coins} of ${goal.cost} coins saved.`;
      upgradeButton.classList.add('hidden');
      $('goal-hint').textContent = goal.next ? 'Paint and decor arrive in a later stage.' : 'Stage three is still being built.';
    }
  }

  function addLog(line) {
    state.log.unshift(line);              // newest first
    if (state.log.length > 30) state.log.pop();   // the journal keeps the last thirty entries
  }

  // Redraw everything that changes when books or coins change, then save.
  function refresh() {
    drawBooksInto($('scene').querySelector('svg'), state.books, state.building);
    drawHud();
    drawLog();
    drawGoal();
    save();
  }

  // A little "+3" that drifts upward from a point in the scene.
  function floatText(x, y, text, color) {
    const group = $('scene').querySelector('svg .effects');
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
    const stops = building().stops;
    const c = {
      id: 'c' + Math.random().toString(36).slice(2, 8),
      look: randomFrom(CUSTOMER_LOOKS),
      side,
      x: side === 'left' ? -40 : Scenes.VIEW.width + 40,
      stopX: side === 'left' ? stops.left - onSameSide * 50 : stops.right + onSameSide * 50,
      dir: side === 'left' ? 1 : -1,                 // 1 = walking right, -1 = walking left
      state: 'arriving',
      browseUntil: 0
    };
    customers.push(c);
    $('scene').querySelector('svg .customers').insertAdjacentHTML('beforeend', customerSvg(c));
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

    if (now >= nextSpawnAt && customers.length < MAX_CUSTOMERS[state.stage]) {
      spawnCustomer();
      const [min, max] = SPAWN_GAP[state.stage];
      nextSpawnAt = now + min + Math.random() * (max - min);
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
      state.books[randomFrom(stocked)] = null;
      state.coins += SELL_PRICE;
      state.sold += 1;
      addLog(`${c.look.desc}. Bought <em>${randomFrom(BOOK_TITLES)}</em>. Paid ${SELL_PRICE} coins. ${randomFrom(OBSERVATIONS)}`);
      floatText(c.x, Scenes.GROUND_Y - 80, `+${SELL_PRICE}`, '#a5443a');
    } else {
      addLog(`${c.look.desc}. ${randomFrom(EMPTY_OBSERVATIONS)}`);
      floatText(c.x, Scenes.GROUND_Y - 80, '…', '#5d5a54');
    }
    refresh();
  }

  function restock() {
    const emptySlots = state.books.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
    const canAfford = Math.floor(state.coins / RESTOCK_COST);
    const n = Math.min(emptySlots.length, canAfford);
    if (n <= 0) return;
    for (let k = 0; k < n; k++) state.books[emptySlots[k]] = randomFrom(BOOK_COLORS);
    state.coins -= n * RESTOCK_COST;
    addLog(`Restocked ${n} ${n === 1 ? 'book' : 'books'} for ${n * RESTOCK_COST} ${n * RESTOCK_COST === 1 ? 'coin' : 'coins'}. Shelves look hopeful again.`);
    refresh();
  }

  // =========================================================
  // 6. Moving up: the upgrade screen
  // =========================================================
  let chosenBuilding = null;

  function openUpgradeScreen() {
    const goal = GOALS[state.stage];
    if (!goal.next || state.coins < goal.cost) return;
    chosenBuilding = null;
    $('confirm-upgrade').disabled = true;
    $('upgrade-cost').textContent = goal.cost;
    $('upgrade-coins').textContent = state.coins;

    const holder = $('upgrade-cards');
    holder.innerHTML = '';
    Scenes.UPGRADES[goal.next].forEach(id => {
      const b = Scenes.BUILDINGS[id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'location-card';
      card.dataset.id = id;
      card.innerHTML = `
        <div class="thumb">${Scenes.render(b.location, id)}</div>
        <h3>${b.name}</h3>
        <p>${b.blurb}</p>
        <p class="card-meta">Holds ${b.capacity} books</p>`;
      const svg = card.querySelector('svg');
      const full = [];
      for (let i = 0; i < b.capacity; i++) full.push(randomFrom(BOOK_COLORS));
      drawBooksInto(svg, full, id);
      fitSign(svg.querySelector('.box-sign'), state.shopName, id);
      card.addEventListener('click', () => {
        chosenBuilding = id;
        holder.querySelectorAll('.location-card').forEach(c => c.classList.toggle('selected', c === card));
        $('confirm-upgrade').disabled = false;
      });
      holder.appendChild(card);
    });
    showScreen('upgrade-screen');
  }

  // Pay up, move in. Existing books come along; the rest of the shelves start empty.
  function confirmUpgrade() {
    const goal = GOALS[state.stage];
    if (!chosenBuilding || state.coins < goal.cost) return;
    const b = Scenes.BUILDINGS[chosenBuilding];
    const carried = state.books.filter(Boolean);
    const books = carried.slice(0, b.capacity);
    while (books.length < b.capacity) books.push(null);

    state.coins -= goal.cost;
    state.stage = b.stage;
    state.building = b.id;
    state.location = b.location;
    state.books = books;
    addLog(MOVING_IN[b.id] || `Moved into the ${b.name.toLowerCase()}.`);
    save();

    customers = [];                       // the old crowd stays behind
    nextSpawnAt = performance.now() + 1500;
    showScreen('game-screen');
    setStageText();
    drawScene();
    drawHud();
    drawLog();
    drawGoal();
  }

  // =========================================================
  // 7. Saving and loading
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
      if (!data || !Array.isArray(data.books)) return null;
      // Saves from before buildings existed: they were all stage-one libraries.
      if (!data.stage) { data.stage = 1; data.building = 'lfl'; }
      const b = Scenes.BUILDINGS[data.building];
      if (!b || data.books.length !== b.capacity) return null;
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
    $('footnote-text').textContent = randomFrom(FOOTNOTES.lfl);
    buildSetupScreen();
    $('restock-button').addEventListener('click', restock);
    $('reset-button').addEventListener('click', reset);
    $('upgrade-button').addEventListener('click', openUpgradeScreen);
    $('confirm-upgrade').addEventListener('click', confirmUpgrade);
    $('cancel-upgrade').addEventListener('click', () => showScreen('game-screen'));
  }

  init();
})();
