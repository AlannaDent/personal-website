/* stats.js
   Reads the bookshop game's saved numbers from this browser and shows them.
   The game writes two things to localStorage:
     saltyJellyfish.stageOne  - the current shop (one save)
     saltyJellyfish.lifetime  - counters across every shop ever opened here
   This page only reads. It never changes them and never sends them anywhere.
*/

(function () {
  'use strict';

  const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const STAGE_NAMES = { 1: 'Little Free Library', 2: 'Shed', 3: 'Real shop', 4: 'The Big One' };
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

  // ---- On this device ----
  const life = read('saltyJellyfish.lifetime');
  const deviceGrid = document.getElementById('device-stats');
  if (life && life.shopsOpened) {
    deviceGrid.innerHTML =
      stat(number(life.shopsOpened), 'Shops opened') +
      stat(number(life.booksSold), 'Books sold', 'across every shop here') +
      stat(number(life.coinsEarned), 'Coins earned') +
      stat(number(life.daysPlayed), 'Days played', 'three minutes each') +
      stat(number(life.bestShopSold), 'Best single shop', life.bestShopName ? `sold by ${life.bestShopName}` : '') +
      stat(STAGE_NAMES[life.furthestStage] || 'Stage ' + life.furthestStage, 'Furthest stage', `${number(life.upgrades)} ${life.upgrades === 1 ? 'move' : 'moves'} made`);
    document.getElementById('device-note').textContent = life.firstPlayed ? `First played here on ${niceDate(life.firstPlayed)}.` : '';
  } else {
    deviceGrid.innerHTML = stat('0', 'Shops opened');
    document.getElementById('device-note').innerHTML = 'No shops yet on this device. <a href="../bookstore/index.html">Open one.</a>';
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
    document.getElementById('shop-note').innerHTML = 'Nothing saved right now. <a href="../bookstore/index.html">Start a library.</a>';
  }

  // ---- Across all players (placeholders until there is a shared counter service) ----
  document.getElementById('global-stats').innerHTML =
    stat('—', 'People who have played', 'coming', true) +
    stat('—', 'Shops created', 'coming', true) +
    stat('—', 'Books sold everywhere', 'coming', true) +
    stat('—', 'Most books sold by one shop', 'coming', true);
})();
