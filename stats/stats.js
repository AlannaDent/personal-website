/* stats.js
   Reads the bookshop game's saved numbers from this browser and shows them in the
   Stats card on the game page (it used to be its own tab). The game writes two things
   to localStorage:
     saltyJellyfish.stageOne  - the current shop (one save)
     saltyJellyfish.lifetime  - counters across every shop ever opened here
   This script only reads. It never changes them. The shared counters come from
   Supabase's get_stats() function, read with the public key.

   game.js calls SaltyStats.render() when the card is opened, and now and then while
   it stays open.
*/

window.SaltyStats = (function () {
  'use strict';

  const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const STAGE_NAMES = { 1: 'Little Free Library', 2: 'Shed', 3: 'Real shop', 4: 'The Big One' };
  // (Locations are not shown on this page; buildings are.)
  const BUILDING_NAMES = {
    lfl: 'Little Free Library', 'garden-shed': 'Garden shed', container: 'Storage container', garage: 'Garage bookshop',
    'dutch-colonial': 'Dutch colonial', 'cape-cod': 'Cape Cod cottage', tudor: 'Tudor revival',
    church: 'Converted church', lighthouse: 'Lighthouse', ship: 'Historic ship'
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function number(n) { return (n || 0).toLocaleString(); }
  function stat(value, label, detail, soon) {
    return `<div class="stat${soon ? ' soon' : ''}"><span class="value">${value}</span><span class="label">${label}</span>${detail ? `<span class="detail">${detail}</span>` : ''}</div>`;
  }
  function niceDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function render() {
  const $ = (id) => document.getElementById(id);
  if (!$('device-stats')) return;
  // ---- On this device ----
  const life = read('saltyJellyfish.lifetime');
  const deviceGrid = $('device-stats');
  if (life && life.shopsOpened) {
    deviceGrid.innerHTML =
      stat(number(life.shopsOpened), 'Shops opened') +
      stat(number(life.booksSold), 'Books sold', 'across every shop here') +
      stat(number(life.coinsEarned), 'Coins earned') +
      stat(number(life.daysPlayed), 'Days played', 'three minutes each') +
      stat(number(life.bestShopSold), 'Best single shop', life.bestShopName ? `sold by ${life.bestShopName}` : '') +
      stat(STAGE_NAMES[life.furthestStage] || 'Stage ' + life.furthestStage, 'Furthest stage', `${number(life.upgrades)} ${life.upgrades === 1 ? 'move' : 'moves'} made`) +
      stat(number(life.dolphins), 'Dolphins spotted', life.dolphins ? 'lucky you' : 'keep watching the water');
    document.getElementById('device-note').textContent = life.firstPlayed ? `First played here on ${niceDate(life.firstPlayed)}.` : '';
  } else {
    deviceGrid.innerHTML = stat('0', 'Shops opened');
    document.getElementById('device-note').textContent = 'No shops yet on this device.';
  }

  // ---- Your current shop ----
  const shop = read('saltyJellyfish.stageOne');
  const shopGrid = document.getElementById('shop-stats');
  if (shop && Array.isArray(shop.books)) {
    const clock = shop.clock || { year: 1, season: 0, day: 1 };
    const stocked = shop.books.filter(Boolean).length;
    shopGrid.innerHTML =
      stat(shop.shopName || 'Unnamed', 'Shop') +
      stat(BUILDING_NAMES[shop.building] || shop.building, 'Building', STAGE_NAMES[shop.stage] || '') +
      stat(`Year ${clock.year}`, 'Date', `${SEASONS[clock.season] || ''}, day ${clock.day}`) +
      stat(number(shop.sold), 'Books sold') +
      stat(number(shop.coins), 'Coins in the tin') +
      stat(`${stocked} / ${shop.books.length}`, 'In stock');
    document.getElementById('shop-note').textContent = '';
  } else {
    shopGrid.innerHTML = stat('—', 'No shop open');
    document.getElementById('shop-note').textContent = 'Nothing saved right now.';
  }

  // ---- Across all players ----
  const globalGrid = document.getElementById('global-stats');
  const globalNote = document.getElementById('global-note');
  // Remember the note's original wording so repeated renders do not pile up "Last updated".
  if (!globalNote.dataset.base) globalNote.dataset.base = globalNote.textContent.trim();
  const DASH = '\u2014';
  const placeholders = (why) =>
    stat(DASH, 'People who have played', why, true) +
    stat(DASH, 'Shops created', why, true) +
    stat(DASH, 'Books sold everywhere', why, true) +
    stat(DASH, 'Most books sold by one shop', why, true);
  const cfg = (typeof GLOBAL_STATS !== 'undefined') ? GLOBAL_STATS : { url: '', key: '' };
  if (!cfg.url || !cfg.key) {
    globalGrid.innerHTML = placeholders('not connected');
    globalNote.textContent = 'The shared counters are not connected on this copy of the site.';
  } else {
    globalGrid.innerHTML = placeholders('loading');
    fetch(cfg.url + '/rest/v1/rpc/get_stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key, 'Authorization': 'Bearer ' + cfg.key },
      body: '{}'
    })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(rows => {
        const g = Array.isArray(rows) ? rows[0] : rows;
        if (!g) throw new Error('empty');
        globalGrid.innerHTML =
          stat(number(g.players), 'People who have played') +
          stat(number(g.shops_opened), 'Shops created') +
          stat(number(g.books_sold), 'Books sold everywhere') +
          stat(number(g.best_shop_sold), 'Most books sold by one shop') +
          stat(number(g.pets_adopted), 'Pets adopted') +
          stat(number(g.coats_of_paint), 'Coats of paint');
        const when = g.updated_at ? new Date(g.updated_at) : null;
        globalNote.textContent = globalNote.dataset.base + (when && !isNaN(when) ? ` Last updated ${when.toLocaleString()}.` : '');
      })
      .catch(() => {
        globalGrid.innerHTML = placeholders('unavailable right now');
        globalNote.textContent = 'The shared counters could not be reached just now. The game itself is unaffected.';
      });
  }
  }

  return { render };
})();
