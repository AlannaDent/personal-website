/* game.js
   Runs The Salty Jellyfish.

   The idea in one breath: customers wander up to your shop, buy a book if there
   is one, and pay you coins. You spend coins on boxes of books from the
   wholesaler, which arrive the next morning. Save up, and move into a bigger
   building.

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
  const WALK_SPEED = 55;         // picture units per second
  const SAVE_KEY = 'saltyJellyfish.stageOne';
  const LIFETIME_KEY = 'saltyJellyfish.lifetime';   // counters across every shop on this device
  const DEFAULT_SHOP_NAME = 'The Salty Jellyfish';   // used if the player leaves the name blank

  // The calendar. Short for now; both numbers can grow later.
  const DAY_MS = 3 * 60 * 1000;          // a day lasts three minutes of play
  const DAYS_PER_SEASON = 10;
  const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];   // the game begins in Spring
  // A gentle wash of color over the scene for each season (color, opacity outside, opacity inside).
  const SEASON_TINT = {
    Spring: ['#ffffff', 0, 0],
    Summer: ['#f6d9a8', 0.10, 0.05],
    Autumn: ['#d9a441', 0.14, 0.06],
    Winter: ['#8b9cc9', 0.16, 0.08]
  };
  // The wholesaler. Up to this many items are offered each day; each slot has a
  // chance of being empty, and some mornings the van does not come at all.
  const CATALOGUE_SLOTS = 3;
  const NO_VAN_CHANCE = 0.08;
  // Box sizes by shop stage: [small, medium, large] books per box.
  const BOX_SIZES = { 1: [5, 10, 20], 2: [15, 30, 60], 3: [40, 80, 150], 4: [80, 160, 300] };
  const BOX_PRICE_PER_BOOK = [1.2, 1.0, 0.8];     // small boxes cost more per book
  const BOX_NAMES = [
    'Box of paperbacks', 'Crate of hardbacks', 'Remainders from Hyannis', 'A neighbor\u2019s estate',
    'Publisher\u2019s overstock', 'Library discards, good ones', 'Yard-sale haul', 'Returns from the ferry kiosk'
  ];
  const MYSTERY_CHANCE = 0.15;                    // a mystery box hides its size until opened
  // How the three slots are filled each morning: a book box almost always in the first,
  // decor most of the time in the others, and now and then a pet.
  const BOOK_SLOT_CHANCE = 0.95;                  // slot one carries a book box
  const DECOR_SLOT_CHANCE = 0.7;                  // slots two and three carry decor when there is any left to buy
  const SPARE_BOOK_CHANCE = 0.5;                  // otherwise, another book box (else the slot is empty)
  const PET_DAILY_CHANCE = 0.15;                  // about one or two pets a season
  const MAX_PETS = 12;

  // Pets. Colors and names are chosen when the pet is offered.
  const PET_KINDS = {
    cat: { name: 'cat', price: 30, colors: ['white', 'black', 'tuxedo', 'gray', 'brown', 'tabby'], meta: 'wants the sunny shelf', speed: 34 },
    dog: { name: 'dog', price: 35, colors: ['brown', 'black', 'white', 'yellow'], meta: 'good with customers, they say', speed: 50 },
    crab: { name: 'crab', price: 20, colors: ['red'], meta: 'red, obviously', speed: 24 }
  };
  const PET_COLOR_NAMES = { white: 'White', black: 'Black', tuxedo: 'Tuxedo', gray: 'Gray', brown: 'Brown', tabby: 'Tabby', yellow: 'Yellow lab', red: 'Red' };
  const PET_NAMES = ['Biscuit', 'Mabel', 'Captain', 'Pickles', 'Scallop', 'Fog', 'Barnacle', 'Marlow', 'Pippin', 'Hazel', 'Otis', 'Juniper', 'Wendell', 'Clementine', 'Gus', 'Nell', 'Salty', 'Moby', 'Quahog', 'Tilly'];
  const PET_ADOPTED = {
    cat: ['has opinions about the top shelf and has already shared them.', 'claimed the window seat within a minute. Paperwork pending.', 'inspected every box, approved none, and sat in all of them.'],
    dog: ['greeted three customers before lunch and one mailbox after.', 'found the warmest patch of floor and is not taking questions.', 'wagged at the van. Wags at everything. Is right to.'],
    crab: ['scuttled under the counter and declared it a small, independent nation.', 'is red, obviously. Has never been more red.', 'clicked at a customer. Friendly, we think. Hard to say with crabs.']
  };
  const PET_GREET_LINES = ['stopped to pet {pet} and lost all track of time.', 'crouched down to say hello to {pet} and got a full report.', 'was thoroughly inspected by {pet} and passed, narrowly.'];
  const PET_PLAY_LINES = ['{a} and {b} chased each other around the sign until the sign got dizzy.', '{a} and {b} were caught playing during scheduled nap time. A warning was issued.', '{a} tried to teach {b} a game. {b} invented a better one.'];
  // With ten or more pets out, the day's pet line is sometimes about the crowd instead.
  const PET_CROWD_FROM = 10;
  const PET_CROWD_LINES = [
    'Counted {n} pets on the doorstep. Counted again. Still {n}. Nobody would hold still.',
    '{n} pets out front today. A customer asked whether the books were the side business. Fair question.',
    'Someone asked to adopt one. All {n} declined, politely, in unison.',
    'The mail carrier now brings {n} treats every morning and leaves with {n} new best friends.'
  ];
  // Chase lines: {a} is the chaser, {b} the runner.
  const CHASE_LINES = [
    '{a} chased {b} from one end to the other. Then {b} chased {a} back. Honor was satisfied.',
    '{a} and {b} played tag. Nobody could agree on who was it. The matter is still under review.',
    '{a} chased {b} past three customers. One cheered. One started taking bets.'
  ];
  const CHASE_LINES_DOG_CAT = ['{a} chased {b}. {b} allowed it, briefly, as a personal favor.', '{a} chased {b} around the sign twice. {b} then sat down and washed, as if none of it were worth mentioning.'];
  const CHASE_LINES_CRAB_CHASER = ['{a} chased {b} sideways across the whole front. {b} did not look back. {a} could not look forward.', '{a} went after {b} with both claws up, like a very small, very cross conductor. {b} took it seriously.'];
  const CHASE_LINES_CRAB_RUNNER = ['{b} escaped {a} at a sideways sprint. Nobody saw that coming, least of all {a}.', '{a} chased {b}, who simply went sideways. {a} is still thinking about it. Philosophically.'];
  const PET_NAP_LINES = ['{pet} napped in the sun for most of the afternoon. Professional work.', '{pet} slept on the doorstep and had to be stepped over, like a very soft speed bump.', '{pet} found the one warm spot and defended it without waking up.'];
  const PAINTS = [
    { color: '#a5443a', name: 'Cranberry' },
    { color: '#2f6f6a', name: 'Harbor Teal' },
    { color: '#d9a441', name: 'Mustard' },
    { color: '#2b3f5c', name: 'Nantucket Navy' },
    { color: '#d98c9c', name: 'Hydrangea Pink' }
  ];
  const PLANTS = [
    { kind: 'snake', name: 'Snake plant', price: 8, line: 'Set it by the door. Said to be unkillable. Please do not take that as a challenge.' },
    { kind: 'monstera', name: 'Monstera', price: 14, line: 'Enormous leaves. Already reaching for the window like it has somewhere to be.' },
    { kind: 'spider', name: 'Spider plant', price: 7, line: 'Came with three babies dangling off it. Buy one plant, get a whole family.' },
    { kind: 'orchid', name: 'Orchid', price: 12, line: 'Pink blooms. Instructions say “benign neglect.” Finally, a skill we already have.' },
    { kind: 'zz', name: 'ZZ plant', price: 10, line: 'Glossy, upright, unbothered. Thrives on being ignored. Relatable.' },
    { kind: 'inch', name: 'Inch plant', price: 6, line: 'Purple and striped, already trailing over the rim. Grows an inch a week, allegedly. Keeping a ruler handy.' },
    { kind: 'fern', name: 'Fern', price: 9, line: 'Wants mist and shade. The Cape can manage the mist. The Cape can always manage the mist.' },
    { kind: 'cactus', name: 'Cactus', price: 9, line: 'Came with a warning label and one pink flower. Wants sun and to be left alone. Same.' },
    { kind: 'hydrangea-pink', name: 'Pink hydrangea bush', price: 16, line: 'Pink as a Cape Cod postcard. The soil must be sweet. So must the neighbors.' },
    { kind: 'hydrangea-blue', name: 'Blue hydrangea bush', price: 16, line: 'Blue as the harbor in June. The soil must be sour. The hydrangea is not.' }
  ];
  // Indoor-only decor. The van only carries these once the shop has an inside to put
  // them in (stage three on).
  const INDOOR_ITEMS = [
    { kind: 'armchair', name: 'Squishy armchair', price: 26, meta: 'faded velvet, well sat-in', line: 'Sat in it to test it. Woke up forty minutes later. Test passed.' },
    { kind: 'games', name: 'Pile of board games', price: 14, meta: 'most of the pieces', line: 'Checked every box. Most of the pieces are there. The dice are anyone\u2019s guess. So are the rules.' },
    { kind: 'readinglamp', name: 'Reading lamp', price: 16, meta: 'brass, pleated shade', line: 'Plugged it in by the shelves. The whole corner went golden, and a customer sighed happily.' },
    { kind: 'globe', name: 'Globe on a stand', price: 18, meta: 'a few borders out of date', line: 'A few of the countries have changed names since. Customers love pointing this out. We love letting them.' }
  ];
  const DECOR_ITEMS = PAINTS.map(p => ({ kind: 'paint', name: `${p.name} paint`, color: p.color, colorName: p.name, price: 12 })).concat(
    [{ kind: 'sign', name: 'Chalkboard sign', price: 15 }, { kind: 'bench', name: 'Park bench', price: 22 }, { kind: 'chair', name: 'Adirondack chair', price: 18 }, { kind: 'lamp', name: 'Iron lamppost', price: 20 }],
    PLANTS.map(pl => ({ kind: 'plant', plant: pl.kind, name: pl.name, price: pl.price })),
    INDOOR_ITEMS.map(it => ({ kind: 'indoor', indoor: it.kind, name: it.name, price: it.price }))
  );
  // The small descriptor under an order-form row (books and pets have their own).
  const DECOR_META = { paint: 'one bucket', sign: 'A-frame, chalk included', bench: 'weathered oak', chair: 'weathered blue', lamp: 'black wrought iron' };
  const PLANT_META = { 'hydrangea-pink': 'for the flower bed', 'hydrangea-blue': 'for the flower bed' };   // the rest come in a terracotta pot
  // Small pictures for the order form and inventory.
  const ICONS = {
    books: () => `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="5" height="13" fill="#b7736b"/><rect x="9" y="4" width="5" height="16" fill="#6f8a99"/><rect x="15" y="9" width="5" height="11" fill="#a9a06b"/><rect x="3" y="20" width="17" height="1.5" fill="#8a7460"/></svg>`,
    mystery: () => `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" fill="#c9a97a" stroke="#8a6a48"/><rect x="10" y="7" width="4" height="13" fill="#e9e2cf"/><text x="12" y="17" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#5c5b56">?</text></svg>`,
    paint: (color) => `<svg class="icon" viewBox="0 0 24 24"><path d="M5 9h14l-1.6 11H6.6z" fill="${color}" stroke="#8a8f94" stroke-width="0.8"/><rect x="4" y="7" width="16" height="3" rx="0.6" fill="#8a8f94"/><path d="M8 7a4 4 0 0 1 8 0" stroke="#8a8f94" stroke-width="1.5" fill="none"/></svg>`,
    lamp: () => `<svg class="icon" viewBox="0 0 24 24"><path d="M9 22 h6 l-1 -2 h-4 z" fill="#2b2a28"/><rect x="11.2" y="9" width="1.6" height="11" fill="#2b2a28"/><path d="M9 9 l0.8 -5 h4.4 l0.8 5 z" fill="#f6e7b8" stroke="#2b2a28" stroke-width="0.9"/><path d="M8 4 l4 -2.5 l4 2.5 z" fill="#2b2a28"/><g stroke="#2b2a28" stroke-width="0.9" fill="none"><path d="M11.2 12 q-3 -0.5 -3.5 -3"/><path d="M12.8 12 q3 -0.5 3.5 -3"/></g></svg>`,
    chair: () => `<svg class="icon" viewBox="0 0 24 24"><g fill="#a9c2cc" stroke="#6b7f88" stroke-width="0.4"><rect x="6" y="3" width="2.6" height="11" rx="0.6"/><rect x="9.2" y="2" width="2.6" height="12" rx="0.6"/><rect x="12.2" y="2" width="2.6" height="12" rx="0.6"/><rect x="15.4" y="3" width="2.6" height="11" rx="0.6"/></g><path d="M5 14 h14 l1.5 3.5 h-17 z" fill="#9fb8c4"/><rect x="2" y="10" width="6" height="2" rx="0.8" fill="#b9d0d8"/><rect x="16" y="10" width="6" height="2" rx="0.8" fill="#b9d0d8"/><g stroke="#6b7f88" stroke-width="1.4" stroke-linecap="round"><line x1="5" y1="17.5" x2="4.5" y2="22"/><line x1="19" y1="17.5" x2="19.5" y2="22"/></g></svg>`,
    bench: () => `<svg class="icon" viewBox="0 0 24 24"><g fill="#a5794f"><rect x="4" y="6" width="16" height="2" rx="0.5"/><rect x="4" y="9.5" width="16" height="2" rx="0.5"/></g><rect x="3" y="13" width="18" height="3" fill="#b98a5b"/><rect x="3" y="16" width="18" height="1.2" fill="#8a6240"/><g stroke="#3e3a36" stroke-width="1.4" stroke-linecap="round"><line x1="6" y1="17" x2="6" y2="21"/><line x1="18" y1="17" x2="18" y2="21"/><line x1="5.5" y1="13" x2="4.5" y2="6"/><line x1="18.5" y1="13" x2="19.5" y2="6"/></g></svg>`,
    sign: () => `<svg class="icon" viewBox="0 0 24 24"><polygon points="7,3 17,3 20,21 4,21" fill="#7d6b58"/><rect x="7.5" y="5" width="9" height="10" fill="#2f3a36"/><line x1="9.5" y1="9" x2="14.5" y2="9" stroke="#f4efe4" stroke-width="1"/><line x1="10" y1="12" x2="14" y2="12" stroke="#f4efe4" stroke-width="0.8" opacity="0.7"/></svg>`,
    pet: (pet) => `<svg class="icon" viewBox="-16 -26 32 30">${Scenes.petSvg(pet, 'sit')}</svg>`,
    indoor: (kind) => `<svg class="icon" viewBox="${({ armchair: '-25 -44 50 46', games: '-15 -27 30 29', readinglamp: '-22 -60 44 62', globe: '-21 -42 42 44' })[kind] || '-25 -44 50 46'}">${Scenes.indoorItem(kind, 0, 0, 1)}</svg>`,
    plant: (kind) => ({
      snake: `<svg class="icon" viewBox="0 0 24 24"><path d="M8 21l1-7h6l1 7z" fill="#b8734f"/><g fill="#4f7a4a" stroke="#d9c46a" stroke-width="0.5"><path d="M10 14q-2-5 0-11q2 6 1 11z"/><path d="M13 14q2-6 1-12q-3 6-2 12z"/><path d="M11.5 14q-1-7 1-13q1 7 0 13z"/></g></svg>`,
      monstera: `<svg class="icon" viewBox="0 0 24 24"><path d="M8 21l1-6h6l1 6z" fill="#8a8f94"/><g fill="#3f6b3a"><ellipse cx="8" cy="9" rx="4" ry="5" transform="rotate(-25 8 9)"/><ellipse cx="16" cy="9" rx="4" ry="5" transform="rotate(25 16 9)"/><ellipse cx="12" cy="6" rx="3.5" ry="5"/></g><g stroke="#c9d9b8" stroke-width="0.8"><line x1="12" y1="2" x2="12" y2="10"/><line x1="8" y1="5" x2="8" y2="13"/><line x1="16" y1="5" x2="16" y2="13"/></g></svg>`,
      spider: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-5h4l1 5z" fill="#e9e2cf"/><g stroke="#7fa563" stroke-width="2" fill="none" stroke-linecap="round"><path d="M12 16q-6-4-9-2"/><path d="M12 16q6-4 9-2"/><path d="M12 16q-4-7-2-11"/><path d="M12 16q4-7 2-11"/><path d="M12 16q0-8 0-12"/></g></svg>`,
      orchid: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-4h4l1 4z" fill="#dfe8ea"/><path d="M12 17q1-8 5-13" stroke="#4f7a4a" stroke-width="1.2" fill="none"/><g fill="#d98c9c"><circle cx="15" cy="9" r="2.6"/><circle cx="17.5" cy="4.5" r="2.4"/><circle cx="13" cy="13" r="2.2"/></g><g fill="#b6413a"><circle cx="15" cy="9" r="0.8"/><circle cx="17.5" cy="4.5" r="0.7"/><circle cx="13" cy="13" r="0.7"/></g><path d="M11 17q-5-1-6-5q4 0 6 5z" fill="#4f7a4a"/></svg>`,
      zz: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-5h4l1 5z" fill="#3a3f44"/><g stroke="#2f5230" stroke-width="1" fill="none"><path d="M12 16q-2-6-4-12"/><path d="M12 16q2-6 4-12"/></g><g fill="#3f6b3a"><ellipse cx="9" cy="6" rx="2.2" ry="1.2" transform="rotate(-30 9 6)"/><ellipse cx="10" cy="10" rx="2.2" ry="1.2" transform="rotate(-30 10 10)"/><ellipse cx="15" cy="6" rx="2.2" ry="1.2" transform="rotate(30 15 6)"/><ellipse cx="14" cy="10" rx="2.2" ry="1.2" transform="rotate(30 14 10)"/><ellipse cx="11" cy="13" rx="2" ry="1.1" transform="rotate(-30 11 13)"/><ellipse cx="13" cy="13" rx="2" ry="1.1" transform="rotate(30 13 13)"/></g></svg>`,
      inch: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-6h4l1 6z" fill="#e9e2cf" stroke="#b5aea0" stroke-width="0.5"/><g fill="#6b4f8a"><ellipse cx="7" cy="12" rx="4" ry="1.6" transform="rotate(-40 7 12)"/><ellipse cx="17" cy="12" rx="4" ry="1.6" transform="rotate(40 17 12)"/><ellipse cx="12" cy="8" rx="4" ry="1.6"/><ellipse cx="5" cy="17" rx="3.5" ry="1.5" transform="rotate(-80 5 17)"/><ellipse cx="19" cy="17" rx="3.5" ry="1.5" transform="rotate(80 19 17)"/></g><g stroke="#9fd0c4" stroke-width="0.6"><line x1="9" y1="8" x2="15" y2="8"/><line x1="5" y1="14" x2="9" y2="10"/><line x1="19" y1="14" x2="15" y2="10"/></g></svg>`,
      cactus: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-5h4l1 5z" fill="#b8734f"/><path d="M10.2 16 q0 -12 1.8 -13 q1.8 1 1.8 13 z" fill="#5f8f5a"/><path d="M10.2 11 q-4 -0.5 -4 -4.5 q0 -2 1.4 -2 q1.2 0 1.2 2 q0 2.8 1.4 3.2 z" fill="#5f8f5a"/><path d="M13.8 9 q4 -0.5 4 -4.5 q0 -2 -1.4 -2 q-1.2 0 -1.2 2 q0 2.8 -1.4 3.2 z" fill="#5f8f5a"/><circle cx="12" cy="2.6" r="1.2" fill="#d98c9c"/></svg>`,
      'hydrangea-pink': `<svg class="icon" viewBox="0 0 24 24"><g fill="#4f7a4a"><ellipse cx="7" cy="18" rx="5" ry="3"/><ellipse cx="17" cy="18" rx="5" ry="3"/><ellipse cx="12" cy="19" rx="5" ry="3"/></g><g fill="#d98c9c"><circle cx="7.5" cy="12" r="4.2"/><circle cx="15.5" cy="11" r="4.6"/><circle cx="11.5" cy="7" r="4"/></g><g fill="#f0c0c8"><circle cx="8.5" cy="10.5" r="1.5"/><circle cx="16" cy="9.5" r="1.4"/><circle cx="12" cy="5.5" r="1.2"/></g></svg>`,
      'hydrangea-blue': `<svg class="icon" viewBox="0 0 24 24"><g fill="#4f7a4a"><ellipse cx="7" cy="18" rx="5" ry="3"/><ellipse cx="17" cy="18" rx="5" ry="3"/><ellipse cx="12" cy="19" rx="5" ry="3"/></g><g fill="#8b9cc9"><circle cx="7.5" cy="12" r="4.2"/><circle cx="15.5" cy="11" r="4.6"/><circle cx="11.5" cy="7" r="4"/></g><g fill="#b7c4e4"><circle cx="8.5" cy="10.5" r="1.5"/><circle cx="16" cy="9.5" r="1.4"/><circle cx="12" cy="5.5" r="1.2"/></g></svg>`,
      fern: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-5h4l1 5z" fill="#b8734f"/><g stroke="#4f7a4a" stroke-width="0.9" fill="none"><path d="M12 16q-5-4-8-10"/><path d="M12 16q5-4 8-10"/><path d="M12 16q0-6 0-12"/></g><g fill="#6a955f"><ellipse cx="8" cy="10" rx="2" ry="0.8" transform="rotate(-50 8 10)"/><ellipse cx="6" cy="8" rx="2" ry="0.8" transform="rotate(-50 6 8)"/><ellipse cx="16" cy="10" rx="2" ry="0.8" transform="rotate(50 16 10)"/><ellipse cx="18" cy="8" rx="2" ry="0.8" transform="rotate(50 18 8)"/><ellipse cx="11" cy="9" rx="2" ry="0.8" transform="rotate(-30 11 9)"/><ellipse cx="13" cy="9" rx="2" ry="0.8" transform="rotate(30 13 9)"/><ellipse cx="11" cy="6" rx="1.6" ry="0.7" transform="rotate(-30 11 6)"/><ellipse cx="13" cy="6" rx="1.6" ry="0.7" transform="rotate(30 13 6)"/></g></svg>`
    }[kind] || '')
  };

  // Journal lines for a new day, by season. These show up every day, so each season
  // mixes plain lines (first row) with quippy ones (second row) and picks one at random.
  const DAY_LINES = {
    Spring: ['Hydrangeas thinking about it.', 'Fog until ten, then glorious.', 'First tourists of the year, blinking.', 'Peepers loud in the marsh tonight.',
      'The hydrangeas are thinking about it. No promises.', 'Fog until ten, then showing off.', 'First tourists of the year, blinking like they\u2019d just been unboxed.', 'The peepers in the marsh have started rehearsals.'],
    Summer: ['Tourists. So many tourists.', 'Band concert on the green tonight.', 'Sand in the till again.', 'Sold out of beach reads by noon.',
      'Tourists. So many tourists. One asked where the ocean was. Pointed.', 'Band concert on the green tonight. Tuba confirmed.', 'Sand in the till again. Sand in everything, honestly.', 'Sold out of beach reads by noon. The beach remains undefeated.'],
    Autumn: ['Cranberry bogs going red.', 'The light is gold and everyone is calm.', 'Half the shops shuttered for the season. Not us.', 'Sweater weather. Reading weather.',
      'The cranberry bogs are blushing.', 'Gold light all day. Everyone is walking slower on purpose.', 'Half the high street shuttered for the season. Not us. Never us.', 'Sweater weather. Also reading weather. Same weather.'],
    Winter: ['Fog, then snow, then fog.', 'Two customers. Both regulars. Both lovely.', 'The harbor froze at the edges.', 'Wind off the water. Kettle on.',
      'Fog, then snow, then fog. The sky can\u2019t make up its mind.', 'Two customers. Both regulars. Both brought muffins.', 'The harbor froze at the edges, like a pie crust.', 'Wind off the water. Kettle on. Kettle on again.']
  };
  // How the journal starts its closing-time line. One is picked at random each night.
  const CLOSING_OPENERS = ['Closed up for the night.', 'Closed up for the night.', 'Locked up.', 'Flipped the sign to Closed.', 'Turned the key and called it a day.'];
  // What the journal says at closing time, by season. Plain first row, quippy second.
  const NIGHT_LINES = {
    Spring: ['Peepers loud in the marsh.', 'Fog rolling back in off the water.', 'Left the porch light on for the moths.',
      'The peepers are loud in the marsh. They have a lot to say.', 'Fog rolling back in off the water, right on schedule.', 'Left the porch light on for the moths. They all came.'],
    Summer: ['Fireflies over the green.', 'Band concert still going somewhere.', 'Warm enough to read on the step.',
      'Fireflies over the green, showing off.', 'The band concert is still going somewhere. Encore number four.', 'Warm enough to read on the step. Did. Three chapters.'],
    Autumn: ['Woodsmoke. Somebody\u2019s first fire of the year.', 'Dark by supper now.', 'Wind knocking the sign around.',
      'Woodsmoke. Somebody lit their first fire of the year and wants the whole street to know.', 'Dark by supper now. The lamps don\u2019t mind.', 'Wind knocking the sign around. It\u2019ll live.'],
    Winter: ['Snow starting. Quietest sound there is.', 'Harbor lights and not much else.', 'Kettle, blanket, a chapter or two.',
      'Snow starting. The quietest sound there is, and the whole town is listening.', 'Harbor lights and not much else. Just how we like it.', 'Kettle, blanket, a chapter or two. Possibly five.']
  };
  // How the day is lit, as a fraction of the way through it.
  const PHASES = [
    { until: 0.12, name: 'Sunrise' },
    { until: 0.72, name: 'Daytime' },
    { until: 0.92, name: 'Sunset' },
    { until: 1.01, name: 'Dusk' }
  ];
  const LAST_CUSTOMER_AT = 0.86;         // nobody new arrives after this point in the day
  // The night-sky tips live in tips.js so they are easy to add to. One shows each night.
  const NIGHT_TIPS = window.NIGHT_TIPS || [];
  const SEASON_LINES = {
    Spring: 'Spring arrived. The town shook itself off like a wet dog.',
    Summer: 'Summer arrived, and with it the whole eastern seaboard.',
    Autumn: 'Autumn arrived. The tourists left. The books stayed. So did we.',
    Winter: 'Winter arrived. Fog rolled in and settled on the shelves like it had a library card.'
  };

  // What each stage is saving toward. "next" is the stage the upgrade leads to.
  const GOALS = {
    1: { cost: 60,  label: 'A proper book shed with room to grow.', thing: 'shed', next: 2, button: 'Upgrade shop' },
    2: { cost: 250, label: 'A real shop on the high street.', thing: 'shop', next: 3, button: 'Upgrade shop' },
    3: { cost: 800, label: 'The bookshop of every reader\u2019s dreams.', thing: 'dream shop', next: 4, button: 'Upgrade shop' },
    4: { cost: null, label: 'The bookshop of every reader\u2019s dreams. You\u2019re in it.', final: true }
  };
  // What the upgrade screen says for each stage being moved into.
  const UPGRADE_COPY = {
    2: {
      title: 'Time to move up in the world.',
      intro: 'Twenty books was never going to be enough. Pick a shed. Each one holds a hundred books and comes with its own spot in town. Your books and your name come with you.'
    },
    3: {
      title: 'A real shop. With a door and everything.',
      intro: 'The shed did its job. Pick a house on the high street to turn into a proper bookshop. Each holds two hundred and fifty books, and the neighbors match. Room for six things out front instead of four. Your books and your name come with you.'
    },
    4: {
      title: 'The Big One.',
      intro: 'You have run a real shop. Now run the one people drive across the Cape to see. Each holds five hundred books. Your books and your name come with you. So does the cat, probably.'
    }
  };
  const STAGE_TAGLINES = { 1: 'Stage one: the Little Free Library', 2: 'Stage two: the Shed', 3: 'Stage three: A Real Shop', 4: 'Stage four: The Big One' };
  const MAX_CUSTOMERS = { 1: 3, 2: 4, 3: 5, 4: 6 };              // people on screen at once

  // Footfall. Customers trickle in at a base rate per stage, multiplied by the shop's
  // appeal (decor) and the season. Even a fully decorated shop in high summer should
  // fall short of selling out: the maximum is about 17 sales against 20 books at stage one.
  const BASE_CUSTOMERS_PER_DAY = { 1: 6, 2: 22, 3: 50, 4: 90 };
  const APPEAL = { paint: 0.4, sign: 0.5, plantOut: 0.3, extraPlant: 0.1, bench: 0.15, chair: 0.1, lamp: 0.1, inside: 0.08, max: 2.2 };   // extraPlant: each further plant out front; inside: each thing standing inside
  const SEASON_FOOTFALL = { Spring: 1.0, Summer: 1.3, Autumn: 1.0, Winter: 0.7 };
  const BUY_CHANCE = 0.85;                // the rest browse and leave, when the shelves are full
  // Well-stocked shelves draw people in. At empty shelves footfall falls to STOCK_FLOOR of
  // normal and buying to BUY_FLOOR of normal; both scale up smoothly to full shelves.
  const STOCK_FLOOR = 0.35;
  const BUY_FLOOR = 0.55;
  const THIN_SHELF_LINES = [
    'Said the shelves looked a bit thin. Promised to come back when they\u2019d filled out.', 'Peered at the gaps on the shelves and drifted off like a disappointed gull.',
    'Found nothing that grabbed them. To be fair, there wasn\u2019t much to grab.', 'Asked when the next delivery was. Then asked again, to be sure.'
  ];
  const BROWSED_LINES = [
    'Browsed every shelf. Bought nothing. Smiled on the way out, which counts for something.', 'Read half a chapter standing up, then put it back at the most exciting part.',
    'Asked if we had it in paperback. We did not. Nobody ever does.', 'Just looking, thanks. Looked for forty-five minutes.',
    'Photographed the shop from six angles. Bought nothing. The shop looked great, though.', 'Left a bookmark in something. Will be back for it. Probably. Maybe.'
  ];

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
      'Smells of cedar and ambition.',
      'At least this one locks.',
      'Now shop-able in the rain!'
    ],
    container: [
      'Seaworthy. Probably.',
      'The rust is decorative.',
      'Has seen more of the world than you have.',
      'Formerly shipped everything. Now ships books.',
      'At least this one locks.',
      'Now shop-able in the rain!'
    ],
    garage: [
      'The car had to go. No regrets.',
      'Oil stain now considered a feature.',
      'Door sticks in humid weather. Everything does.',
      'Mind the lawnmower. It stayed.',
      'At least this one locks.',
      'Now shop-able in the rain!'
    ],
    'dutch-colonial': [
      'Look, Geppetto, I\u2019m a real live boy!',
      'The balcony is decorative. Please do not test this.',
      'Gambrel: a roof, not a small mammal.'
    ],
    'cape-cod': [
      'Look, Geppetto, I\u2019m a real live boy!',
      'The cat came with the house.',
      'Three dormers, two chimneys, one very good reading nook.'
    ],
    tudor: [
      'Look, Geppetto, I\u2019m a real live boy!',
      'The timbers are load-bearing. The plaster is opinion.',
      'The door creaks. This is on purpose.'
    ],
    church: [
      'The bell rings at closing. Nobody asked.',
      'Pews: now with lumbar support and a reading light.',
      'Sermons replaced by staff picks.'
    ],
    lighthouse: [
      'Open until the fog says otherwise.',
      'Ships still steer by it. Readers too.',
      'Two hundred and twelve steps to the poetry section.'
    ],
    ship: [
      'Seaworthy. Certainly. Probably.',
      'The gangplank is the only line we have.',
      'Books below decks. Gulls above. Do not feed the gulls.'
    ]
  };

  // Faded book colors to match the weathered buildings.
  const BOOK_COLORS = ['#b7736b', '#6f8a99', '#a9a06b', '#7d9a7a', '#9b7f9c', '#c2a37c', '#8c8c8c', '#b39a5b', '#8f6f5a'];

  // The books customers buy come from books.js: 500 widely held novels (OCLC
  // WorldCat) and 96 nonfiction classics (the Guardian). Real titles, real authors.

  // Little observations for the journal, in the spirit of a bookshop clerk's logbook.
  const OBSERVATIONS = [
    'Lingered over the spines like they were a menu.', 'Hummed while browsing. Off-key, with conviction.', 'Read the first page standing up and gasped.',
    'Asked about the fog. Got a very long answer.', 'Left a thumbprint on the glass, like a signature.', 'Seemed pleased. Tried to hide it. Failed.',
    'Paid in exact change, triumphantly.', 'Said the place could use a coat of paint. Not wrong.', 'Sniffed the pages first, like a wine expert.',
    'Waved at a gull. The gull did not wave back.', 'Checked the sky for rain, then the roof, then the sky again.', 'Promised to come back Tuesday. Did not say which Tuesday.'
  ];
  const EMPTY_OBSERVATIONS = [
    'Peered in. Shelves bare. Sighed, dramatically.', 'Found nothing. Rattled the door anyway, for luck.',
    'Stared at the empty shelves a long moment, as if books might grow there.', 'Made a small, disappointed noise. Walked on.'
  ];
  // What the journal says the day you move in.
  const MOVING_IN = {
    'garden-shed': 'Moved into the garden shed. A hundred slots. The spiders have filed a complaint.',
    container: 'Moved into the container on the beach. A hundred slots and a view. The rust is a design choice.',
    garage: 'Moved into the garage down the block. A hundred slots. The oil stain has tenure.',
    'dutch-colonial': 'Moved into the Dutch colonial on the high street. Two hundred and fifty slots. A real shop. Painted the door blue, just because.',
    'cape-cod': 'Moved into the Cape on the high street. Two hundred and fifty slots. A real shop. The cat approves, which is the only review that matters.',
    tudor: 'Moved into the Tudor on the high street. Two hundred and fifty slots. A real shop. The door creaked a welcome and hasn\u2019t stopped since.',
    church: 'Moved into the old church on the green. Five hundred slots. The bell rang once, on its own. Taking that as a yes.',
    lighthouse: 'Moved into the lighthouse. Five hundred slots and the whole sea for a window. The light still turns. The stairs count as exercise.',
    ship: 'Moved aboard the schooner at the town dock. Five hundred slots below decks. The floor moves. Slightly. Constantly.'
  };

  // Who wanders by. Personality comes from clothes and props, per STYLE.md.
  const CUSTOMER_LOOKS = [
    { desc: 'A woman in a red scarf', coat: '#3f5a86', hat: null, scarf: '#b6413a', prop: 'tote', propColor: '#c9a86a' },
    { desc: 'A grandmother with a wicker basket', coat: '#7fa0c9', hat: '#b6413a', scarf: null, prop: 'basket', propColor: '#b48a52' },
    { desc: 'A boy in a striped sweater', coat: '#c94f47', hat: null, scarf: null, prop: null, propColor: null, stripes: true, small: true },
    { desc: 'A tourist with a tote bag', coat: '#d9a441', hat: '#f1e7c8', scarf: null, prop: 'tote', propColor: '#2b3f5c' },
    { desc: 'A man in a mustard raincoat', coat: '#c99a3a', hat: null, scarf: null, prop: null, propColor: null },
    { desc: 'A girl in a beret', coat: '#2f6f6a', hat: '#a5443a', scarf: null, prop: 'basket', propColor: '#c9a86a', small: true },
    { desc: 'A jogger who slowed down', coat: '#8a9bb3', hat: null, scarf: null, prop: null, propColor: null },
    { desc: 'Someone walking a very patient dog', coat: '#6b5b7a', hat: '#2b2a28', scarf: null, prop: null, propColor: null, companion: { kind: 'dog', colors: ['yellow', 'brown', 'white'] } },
    { desc: 'A man with a small scruffy dog', coat: '#8a6248', hat: '#5a4030', scarf: null, prop: null, propColor: null, companion: { kind: 'dog', colors: ['brown', 'black'], small: true } },
    { desc: 'A girl with a crab in a bucket', coat: '#d98c9c', hat: null, scarf: null, prop: 'basket', propColor: '#8a8f94', small: true, companion: { kind: 'crab', colors: ['red'], carried: true } }
  ];
  const SNIFF_LINES = ['{pet} and the visiting {kind} sniffed noses and agreed on something.', '{pet} met the visiting {kind}. Circling ensued. Then friendship.', '{pet} and the visiting {kind} had a long conversation nobody else could follow.'];

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
  //   state.view      : 'outside' or 'inside' (inside exists from stage three on)
  //   state.clock     : { year, season (0-3), day (1-10), ms (time into the current day),
  //                       night (true once the day has ended and the game is paused) }
  //   state.catalog : { dayIndex, items: [{ id, name, books, price, mystery, ordered }] }
  //   state.orders    : boxes paid for and on their way: [{ id, name, books, mystery, arrives (dayIndex) }]
  //   state.deliveries: boxes outside the shop, waiting to be opened: [{ id, name, books, mystery, kind, color }]
  //   state.decor     : what the shop owns and shows: { paint (color on the walls or null),
  //                     wallPaint (color on the walls inside, from stage three, or null),
  //                     paints: [colors owned, kept for good], signs, bench,
  //                     plants: [plant kinds owned],
  //                     spots: { L2, L1, R1, R2 } -> which item stands in each spot out front
  //                       ('sign', 'bench', 'plant:<kind>' or null),
  //                     indoor: [indoor-only kinds owned],
  //                     insideSpots: { I1..I4 } -> which item stands in each spot inside, from
  //                       stage three ('indoor:<kind>' or anything that can stand out front),
  //                     pets: [{ id, kind, color, name }], petsOut: [ids out and about] }
  //   state.coins     : money in the tin
  //   state.books     : one entry per slot, each a color (a book) or null (empty)
  //   state.reserve   : books in the back room, not yet on a shelf
  //   state.sold      : lifetime books sold
  //   state.log       : the last few journal lines

  let customers = [];            // people currently on screen (not saved; they just wander off)
  let nextSpawnAt = 0;           // when the next customer may appear
  let lastFrame = 0;             // used to measure time between animation frames
  let running = false;

  // Shorthand for finding an element on the page by its id.
  const $ = (id) => document.getElementById(id);
  // 'a' or 'an' in front of a word, so the journal never says 'a inch plant'.
  const withArticle = (words) => (/^[aeiou]/i.test(words) ? 'an ' : 'a ') + words;
  const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
  const building = () => Scenes.BUILDINGS[state.building];
  // How inviting the shop looks, from 1 (bare) to APPEAL.max (everything out front).
  function appeal() {
    const d = state.decor || freshDecor();
    let a = 1;
    if (d.paint) a += APPEAL.paint;
    if (isOut('sign')) a += APPEAL.sign;
    const plantsOut = outKeys().filter(k => k.startsWith('plant:')).length;
    if (plantsOut) a += APPEAL.plantOut + APPEAL.extraPlant * (plantsOut - 1);
    if (isOut('bench')) a += APPEAL.bench;      // somewhere to sit means someone stays
    if (isOut('chair')) a += APPEAL.chair;
    if (isOut('lamp')) a += APPEAL.lamp;
    a += APPEAL.inside * insideKeys().length;   // a cozy inside gets talked about
    a += 0.15 * ((d.petsOut || []).length);   // a shop cat is worth a great deal
    return Math.min(APPEAL.max, a);
  }
  // How full the shelves are, 0 to 1.
  const shelfFill = () => booksInStock() / Math.max(1, capacity());
  // Footfall multiplier from stock: full shelves 1, empty shelves STOCK_FLOOR.
  const stockPull = () => STOCK_FLOOR + (1 - STOCK_FLOOR) * shelfFill();
  // Roughly how many customers today's shop can expect, at the current stock level.
  function expectedCustomersToday() {
    return BASE_CUSTOMERS_PER_DAY[state.stage] * appeal() * SEASON_FOOTFALL[seasonName()] * stockPull();
  }
  // Time until the next arrival: the open hours spread over today's expected
  // visitors, give or take. Returns milliseconds.
  function nextArrivalGap() {
    const openMs = DAY_MS * LAST_CUSTOMER_AT;
    const gap = openMs / Math.max(1, expectedCustomersToday());
    return gap * (0.6 + Math.random() * 0.8);
  }
  // How big people are drawn right now (see personScale in scenes.js).
  const personScale = () => Scenes.personScaleFor(state.building, state.view);
  const customerScale = (c) => personScale() * (c.look.small ? 0.8 : 1);
  const capacity = () => building().capacity;
  const booksInStock = () => state.books.filter(Boolean).length;

  function freshState(shopName, location) {
    const books = [];
    for (let i = 0; i < Scenes.BUILDINGS.lfl.capacity; i++) books.push(randomFrom(BOOK_COLORS));
    return { shopName, stage: 1, building: 'lfl', location, view: 'outside', coins: 0, books, reserve: 0, sold: 0, log: [], clock: freshClock(), catalogue: null, orders: [], deliveries: [], decor: freshDecor() };
  }
  function freshDecor() { return { paint: null, wallPaint: null, paints: [], signs: 0, bench: 0, chair: 0, lamp: 0, plants: [], indoor: [], spots: freshSpots(), insideSpots: {}, pets: [], petsOut: [] }; }
  // ---- Decor spots out front ----
  // Four spots, left to right. Each holds one item key: 'sign', 'bench', 'plant:<kind>'.
  // Spot ids for a building, left to right: L2 L1 R1 R2 for two a side, L3..R3 for three.
  function slotIds(buildingId = state.building) {
    const n = Scenes.decorSlotsFor(buildingId).length / 2;
    const left = [], right = [];
    for (let i = n; i >= 1; i--) left.push('L' + i);
    for (let i = 1; i <= n; i++) right.push('R' + i);
    return left.concat(right);
  }
  function slotLabel(id) {
    if (id[0] === 'I') return 'inside, ' + INSIDE_LABELS[id];
    const n = slotIds().length / 2, side = id[0] === 'L' ? 'left' : 'right', k = Number(id.slice(1));
    if (k === 1) return `${side} of the door`;
    if (k === n) return `far ${side}`;
    return side;
  }
  const putOutOrder = () => slotIds().slice().sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));   // nearest the door first
  function freshSpots(buildingId = state && state.building) {
    const sp = {};
    slotIds(buildingId || 'lfl').forEach(id => { sp[id] = null; });
    return sp;
  }
  // The building's spots. After an upgrade the new building may have more spots than the
  // save knows about; they are added here as empty.
  const spots = () => {
    const sp = state.decor.spots || (state.decor.spots = freshSpots());
    slotIds().forEach(id => { if (!(id in sp)) sp[id] = null; });
    return sp;
  };
  const slotOf = (key) => slotIds().find(id => spots()[id] === key) || null;
  const isOut = (key) => slotOf(key) !== null;
  const outKeys = () => slotIds().map(id => spots()[id]).filter(Boolean);
  const freeSlot = () => putOutOrder().find(id => !spots()[id]) || null;
  // ---- Decor spots inside (stage three on) ----
  // Four spots across the shop floor, left to right: I1..I4. Anything that can stand out
  // front can stand inside too; indoor-only things ('indoor:<kind>') stand only inside.
  // An item is in one place at a time: out front, inside, or in the back.
  const INSIDE_LABELS = { I1: 'far left', I2: 'left of center', I3: 'right of center', I4: 'by the counter' };
  function insideSlotIds(buildingId = state.building) {
    return Scenes.interiorDecorSlotsFor(buildingId).map((x, i) => 'I' + (i + 1));
  }
  const hasInside = () => insideSlotIds().length > 0;
  const insideSpots = () => {
    const sp = state.decor.insideSpots || (state.decor.insideSpots = {});
    insideSlotIds().forEach(id => { if (!(id in sp)) sp[id] = null; });
    return sp;
  };
  const insideSlotOf = (key) => insideSlotIds().find(id => insideSpots()[id] === key) || null;
  const isInside = (key) => insideSlotOf(key) !== null;
  const insideKeys = () => insideSlotIds().map(id => insideSpots()[id]).filter(Boolean);
  const freeInsideSlot = () => insideSlotIds().find(id => !insideSpots()[id]) || null;
  const isIndoorOnly = (key) => key.startsWith('indoor:');
  // Put an item in the first free spot out front (moving it from inside if need be).
  // Returns the spot, or null if everything is full or the item belongs indoors.
  function putOut(key) {
    if (isOut(key)) return slotOf(key);
    if (isIndoorOnly(key)) return null;
    const id = freeSlot();
    if (id) { takeIn(key); spots()[id] = key; }
    return id;
  }
  // The same, for the first free spot inside.
  function putInside(key) {
    if (isInside(key)) return insideSlotOf(key);
    const id = freeInsideSlot();
    if (id) { takeIn(key); insideSpots()[id] = key; }
    return id;
  }
  // Something new out of its box: out front if there is room, else inside, else the back.
  const placeNew = (key) => putOut(key) || putInside(key);
  function takeIn(key) {
    const id = slotOf(key); if (id) spots()[id] = null;
    const inId = insideSlotOf(key); if (inId) insideSpots()[inId] = null;
  }
  const indoorInfo = (kind) => INDOOR_ITEMS.find(i => i.kind === kind) || { name: 'armchair' };
  const itemName = (key) => key === 'sign' ? 'the chalkboard' : key === 'bench' ? 'the bench' : key === 'chair' ? 'the chair' : key === 'lamp' ? 'the lamppost'
    : isIndoorOnly(key) ? 'the ' + indoorInfo(key.slice(7)).name.toLowerCase()
    : 'the ' + ((PLANTS.find(p => p.kind === key.slice(6)) || { name: 'plant' }).name.toLowerCase());
  // Days counted from the start of the game, so "tomorrow" is simply +1.
  const dayIndex = () => ((state.clock.year - 1) * SEASONS.length + state.clock.season) * DAYS_PER_SEASON + state.clock.day;
  function freshClock() { return { year: 1, season: 0, day: 1, ms: 0, night: false }; }
  const dayFraction = () => Math.min(1, state.clock.ms / DAY_MS);
  // About one winter day in three is a snow day. Fixed per day so it survives a reload.
  const isSnowDay = () => seasonName() === 'Winter' && ((dayIndex() * 7919) % 3 === 0);
  const phaseName = () => state.clock.night ? 'Night' : PHASES.find(p => dayFraction() < p.until).name;
  const seasonName = () => SEASONS[state.clock.season];
  const dateText = () => `Year ${state.clock.year} \u00b7 ${seasonName()} \u00b7 Day ${state.clock.day}`;

  // ---- Lifetime counters: every shop ever opened on this device ----
  function loadLifetime() {
    try {
      const data = JSON.parse(localStorage.getItem(LIFETIME_KEY) || 'null');
      if (data && typeof data === 'object') return data;
    } catch (e) { /* fall through */ }
    return { firstPlayed: null, shopsOpened: 0, booksSold: 0, coinsEarned: 0, daysPlayed: 0, bestShopSold: 0, bestShopName: '', furthestStage: 1, upgrades: 0 };
  }
  // Change the counters with a small function, then save them. Failures are ignored:
  // the counters are for fun and the game must never stop over them.
  function bumpLifetime(change) {
    try {
      const life = loadLifetime();
      if (!life.firstPlayed) life.firstPlayed = new Date().toISOString();
      change(life);
      localStorage.setItem(LIFETIME_KEY, JSON.stringify(life));
    } catch (e) { /* counters are optional */ }
  }

  // ---- Shared counters across all players ----
  // Each device has a random ID, kept in the browser, so players can be counted without
  // knowing who anyone is. Progress since the last report is sent as small numbers; the
  // server caps each one. Any failure is ignored and the game plays on.
  const DEVICE_KEY = 'saltyJellyfish.device';
  const REPORT_FIELDS = ['shopsOpened', 'booksSold', 'coinsEarned', 'daysPlayed', 'boxesOpened', 'petsAdopted', 'coatsOfPaint'];
  function deviceId() {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = 'd' + Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (e) { return null; }
  }
  let reporting = false;
  function reportProgress() {
    const cfg = (typeof GLOBAL_STATS !== 'undefined') ? GLOBAL_STATS : null;
    if (!cfg || !cfg.url || !cfg.key || reporting) return;
    const id = deviceId();
    if (!id) return;
    let life;
    try { life = loadLifetime(); } catch (e) { return; }
    const reported = life.reported || {};
    const delta = {};
    let anything = false;
    REPORT_FIELDS.forEach(f => {
      delta[f] = Math.max(0, (life[f] || 0) - (reported[f] || 0));
      if (delta[f] > 0) anything = true;
    });
    const best = life.bestShopSold || 0;
    if (!anything && best <= (reported.bestShopSold || 0) && reported.everReported) return;
    reporting = true;
    fetch(cfg.url + '/rest/v1/rpc/record_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key, 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({
        p_device: id, p_shops: delta.shopsOpened, p_sold: delta.booksSold, p_coins: delta.coinsEarned,
        p_days: delta.daysPlayed, p_boxes: delta.boxesOpened, p_pets: delta.petsAdopted, p_paint: delta.coatsOfPaint, p_best: best
      })
    })
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        // Remember what has been counted, so nothing is sent twice.
        bumpLifetime(l => {
          l.reported = { everReported: true, bestShopSold: best };
          REPORT_FIELDS.forEach(f => { l.reported[f] = l[f] || 0; });
        });
      })
      .catch(() => { /* try again another time */ })
      .finally(() => { reporting = false; });
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
      drawBooksInto(svg, freshState('', loc.id).books, 'lfl', 'outside');

      card.addEventListener('click', () => {
        chosenLocation = loc.id;
        holder.querySelectorAll('.location-card').forEach(c => c.classList.toggle('selected', c === card));
        $('start-button').disabled = false;
      });
      holder.appendChild(card);
    });

    $('start-button').addEventListener('click', () => {
      const name = DEFAULT_SHOP_NAME;   // renamed later from the pencil on the name pill
      state = freshState(name, chosenLocation);
      addLog(`Opened ${name} today. ${capacity()} books. Enormous hopes. Spring, Year 1.`);
      bumpLifetime(life => { life.shopsOpened += 1; });
      save();
      startGame();
    });

    // Offer to resume if a saved game exists.
    const saved = load();
    if (saved) {
      $('resume-note').classList.remove('hidden');
      $('resume-button').addEventListener('click', () => { state = saved; save(); startGame(); });   // save() writes any migration back
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
    drawDate();
    ensureCatalogue();
    drawOrderForm();
    drawInventory();
    drawLog();
    drawGoal();
    applyDaylight(true);
    customers = [];
    nextSpawnAt = performance.now() + Math.min(8000, nextArrivalGap());   // first customer before long
    reportProgress();
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
    if (!building().interior) state.view = 'outside';
    $('scene').innerHTML = Scenes.render(state.location, state.building, state.view, state.decor.paint, state.decor.wallPaint);
    critters = [];
    extras = [];
    const svg = $('scene').querySelector('svg');
    drawBooksInto(svg, state.books, state.building, state.view);
    drawDecor();
    syncPets();
    drawShopName();
    applySeasonTint();
    applyDaylight(true);
    drawDeliveries();
    // The step-inside / step-outside button only exists for buildings with an interior.
    const toggle = $('view-toggle');
    toggle.classList.toggle('hidden', !building().interior);
    toggle.textContent = state.view === 'inside' ? 'Step outside' : 'Step inside';
  }

  // Draws one small rectangle per book, shelf by shelf. Empty slots draw nothing.
  // Which shelves depends on the view: shop windows outside, the big wall inside.
  function drawBooksInto(svg, books, buildingId, view) {
    let out = '';
    let i = 0;
    Scenes.shelvesFor(buildingId, view).forEach(shelf => {
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
  // The shop name wherever it is painted: the plate on the stage-one box (and the shed
  // signs), and the chalkboard if it is out.
  function drawShopName() {
    const svg = $('scene').querySelector('svg');
    const plate = svg && svg.querySelector('.box-sign:not(.chalk)');
    if (plate) fitSign(plate, state.shopName, state.building);
    drawDecor();
  }

  // ---- Renaming the shop, from the pencil on its name pill ----
  const SHOP_NAME_MAX = 28;
  let shopRenameOpen = false;   // guards against Enter and the blur it causes both closing the box
  function startShopRename() {
    const pill = $('hud-name');
    if (shopRenameOpen) return;
    shopRenameOpen = true;
    pill.innerHTML = `<input class="rename" type="text" maxlength="${SHOP_NAME_MAX}" value="${state.shopName.replace(/"/g, '&quot;')}" aria-label="New shop name">`;
    const box = pill.querySelector('input');
    box.focus();
    box.select();
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishShopRename(box.value);
      if (e.key === 'Escape') finishShopRename(null);
    });
    box.addEventListener('blur', () => finishShopRename(box.value));
  }
  function finishShopRename(value) {
    if (!shopRenameOpen) return;
    shopRenameOpen = false;
    const pill = $('hud-name');
    const name = value === null ? '' : value.trim().slice(0, SHOP_NAME_MAX);
    // Put the text and pencil back first, then apply the new name if there is one.
    pill.innerHTML = `<span id="hud-name-text"></span><button class="pencil" id="rename-shop" type="button" title="Rename your shop" aria-label="Rename your shop">\u270e</button>`;
    $('rename-shop').addEventListener('click', startShopRename);
    if (name && name !== state.shopName) {
      const old = state.shopName;
      state.shopName = name;
      addLog(`Repainted the sign. ${old} is now ${name}. The gulls will need time to adjust.`);
      drawLog();
      drawShopName();
      save();
    }
    drawHud();
  }

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
    const nameText = $('hud-name-text');
    if (nameText) nameText.textContent = state.shopName;
    $('hud-name').title = `${state.shopName} \u00b7 ${state.sold} sold all time`;
    $('hud-coins').textContent = state.coins;
    const shelved = booksInStock(), cap = capacity(), back = state.reserve || 0;
    $('hud-stock').textContent = `${shelved} / ${cap}` + (back ? ` +${back}` : '');
    // Hover cards for the two pills.
    $('hud-coins-chip').dataset.tip = `Coins you have right now: ${state.coins}.`;
    $('hud-stock-chip').dataset.tip = `${shelved} ${shelved === 1 ? 'book' : 'books'} on your shelves, out of ${cap} shelf spaces.` + (back ? ` Plus ${back} waiting in the back room.` : '');
    drawAppeal();
  }

  function drawLog() {
    $('log').innerHTML = state.log.map(line => `<li>${line}</li>`).join('');
  }

  // The date line above the HUD and the thin bar that fills through the day.
  function drawDate() {
    $('hud-date').textContent = dateText();
    $('hud-phase').textContent = phaseName();
    $('day-bar').style.width = (dayFraction() * 100) + '%';
    const night = state.clock.night;
    document.querySelector('.dateline').classList.toggle('night', night);
    const button = $('next-day-button');
    if (night) {
      button.textContent = `Begin Day ${state.clock.day % DAYS_PER_SEASON + 1}`;
      // Boxes on the step must be opened before the day begins.
      const waiting = (state.deliveries || []).length > 0;
      button.disabled = waiting;
      // The hint lives on the wrapper, so it shows even while the button is grayed out.
      $('next-day-wrap').dataset.tip = !waiting ? '' : state.view === 'inside' ? 'Step outside to open your packages!' : 'Don\u2019t forget to open your packages!';
    }
    $('next-day-wrap').classList.toggle('hidden', !night);
    drawNightTip();
  }

  // Mix two hex colors. t is 0 for a, 1 for b.
  function mixColor(a, b, t) {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  // The light over the scene for this moment of the day. Called every frame,
  // but only touches the picture a few times a second unless forced.
  let lastDaylightAt = 0;
  function applyDaylight(force) {
    const now = performance.now();
    if (!force && now - lastDaylightAt < 250) return;
    lastDaylightAt = now;
    const svg = $('scene').querySelector('svg');
    if (!svg) return;
    const wash = svg.querySelector('.sky-wash');
    const stars = svg.querySelector('.stars');
    const glow = svg.querySelector('.window-glow');
    if (!wash) return;
    const inside = state.view === 'inside';
    const t = dayFraction();
    let color = '#1f2a5a', opacity = 0, starOpacity = 0, glowOpacity = 0;
    if (state.clock.night) {
      color = '#1f2a5a'; opacity = inside ? 0.22 : 0.58; starOpacity = inside ? 0 : 0.9; glowOpacity = 0.8;
    } else if (t < 0.12) {                                  // sunrise: warm and fading
      color = '#f6b98a'; opacity = 0.28 * (1 - t / 0.12);
    } else if (t < 0.72) {                                  // daytime: clear
      opacity = 0;
    } else if (t < 0.92) {                                  // sunset: gold deepening to violet
      const u = (t - 0.72) / 0.2;
      color = mixColor('#f6a86a', '#8a5a8a', u); opacity = 0.06 + 0.26 * u;
      glowOpacity = 0.35 * u;
    } else {                                                // dusk: settling into night
      const u = (t - 0.92) / 0.08;
      color = mixColor('#8a5a8a', '#1f2a5a', u); opacity = 0.32 + 0.24 * u;
      starOpacity = inside ? 0 : 0.9 * u; glowOpacity = 0.35 + 0.45 * u;
    }
    if (inside && !state.clock.night) opacity *= 0.45;
    wash.setAttribute('fill', color);
    wash.setAttribute('opacity', opacity.toFixed(3));
    // Outside, the wash rect only covers the sky (so the moon and stars can sit on top of
    // it); everything in front gets the same wash through a filter, switched off when clear.
    const nightWash = svg.querySelector('.night-wash');
    if (nightWash) {
      const flood = nightWash.querySelector('.wash-flood');
      flood.setAttribute('flood-color', color);
      flood.setAttribute('flood-opacity', opacity.toFixed(3));
      svg.querySelectorAll('.washed').forEach(g => {
        if (opacity > 0) g.setAttribute('filter', `url(#${nightWash.id})`);
        else g.removeAttribute('filter');
      });
    }
    stars.setAttribute('opacity', starOpacity.toFixed(2));
    glow.setAttribute('opacity', (inside ? 0 : glowOpacity).toFixed(2));
    // Lamps come on with the shop's windows: a glow, and warm glass. Inside too.
    svg.querySelectorAll('.lamp-glow').forEach(el => el.setAttribute('opacity', Math.min(0.95, glowOpacity * 1.2).toFixed(2)));
    svg.querySelectorAll('.lamp-glass').forEach(el => el.setAttribute('fill', glowOpacity > 0.2 ? '#f6e7b8' : '#dfe8ea'));
    moveSkyBodies(svg, t);
  }

  // The sun climbs from the left horizon at sunrise, arcs over the shop and drops behind
  // the right horizon at dusk; the moon rises as it goes and hangs high all night. Winter's
  // arc is lower than summer's. The horizon line here sits behind the hills, water and
  // rooftops, so the sun genuinely disappears behind them.
  // How high the sun's arc peaks, as a y position near the top of the picture (0 is the
  // very top). The arc stretches from each scene's own horizon up to this, so the sun comes
  // close to touching the top everywhere; winter's arc peaks lower.
  const SUN_PEAK_Y = { Spring: 46, Summer: 38, Autumn: 52, Winter: 72 };
  const ARC_LEFT = 40, ARC_RIGHT = 760;   // where the arc meets the horizon, near the picture's edges
  // The sun's character by season: how big it is drawn, how strong its glow, and its
  // colour high in the sky. Summer is big and warm; winter is small, pale and thin.
  const SUN_LOOK = {
    Spring: { size: 1.0, glow: 0.28, color: '#f6d9a8' },
    Summer: { size: 1.18, glow: 0.4, color: '#f8d890' },
    Autumn: { size: 0.95, glow: 0.24, color: '#f2cf8e' },
    Winter: { size: 0.84, glow: 0.12, color: '#f1e6d2' }
  };
  const SUN_UP_UNTIL = 0.92;   // the sun is down once dusk begins
  function moveSkyBodies(svg, t) {
    const night = state.clock.night, inside = state.view === 'inside';
    const suns = svg.querySelectorAll('.sun');
    // Sun: s runs 0..1 across the daylight part of the day. It starts with its centre just
    // below the scene's horizon line, so the disc peeks over it as the Sunrise phase begins.
    const horizon = Scenes.horizonFor(state.location);
    const s = night ? 1 : Math.min(1, t / SUN_UP_UNTIL);
    const sunX = ARC_LEFT + (ARC_RIGHT - ARC_LEFT) * s;
    const arc = horizon + 14 - SUN_PEAK_Y[seasonName()];   // from just below the horizon to the peak
    const sunY = horizon + 14 - Math.sin(Math.PI * s) * arc;
    const low = Math.min(1, Math.max(0, (Math.abs(s - 0.5) - 0.32) / 0.18));   // 0 high in the sky, 1 at the horizon
    const look = SUN_LOOK[seasonName()] || SUN_LOOK.Spring;
    const sunColor = mixColor(look.color, '#f6a86a', low);
    suns.forEach(el => {
      el.setAttribute('transform', `translate(${sunX.toFixed(1)} ${sunY.toFixed(1)}) scale(${look.size})`);
      el.setAttribute('opacity', night ? '0' : '1');
      el.querySelectorAll('.sun-disc, .sun-glow').forEach(c => c.setAttribute('fill', sunColor));
      const glow = el.querySelector('.sun-glow');
      if (glow) glow.setAttribute('opacity', (look.glow + 0.1 * low).toFixed(2));   // a little more haze near the horizon
      const rays = el.querySelector('.sun-rays');
      if (rays) rays.setAttribute('stroke', sunColor);
    });
    // Moon: the same arc as the sun, half a day behind it, so the two are always on opposite
    // halves of the sky. It rises on the left through Sunset and Dusk (m 0 -> 0.5) while the
    // sun sets on the right, hangs at the top of the arc all night (the clock is paused), and
    // sets down the right side through the next Sunrise (m 0.5 -> 1) as the sun comes up on
    // the left. Not shown inside.
    let moonOpacity = 0, m = 0.5;
    if (inside) moonOpacity = 0;
    else if (night) moonOpacity = 1;
    else if (t >= 0.72) { m = (t - 0.72) / 0.28 * 0.5; moonOpacity = Math.min(1, (t - 0.72) / 0.16); }
    else if (t < 0.12) { m = 0.5 + (t / 0.12) * 0.5; moonOpacity = 1 - t / 0.12; }
    const moonArc = arc * 0.92;   // the moon rides a touch lower than the sun
    const moonX = ARC_LEFT + (ARC_RIGHT - ARC_LEFT) * m, moonY = horizon + 14 - Math.sin(Math.PI * m) * moonArc;
    svg.querySelectorAll('.moon').forEach(el => {
      el.setAttribute('transform', `translate(${moonX.toFixed(1)} ${moonY.toFixed(1)})`);
      el.setAttribute('opacity', moonOpacity.toFixed(2));
    });
  }
  function applySeasonTint() {
    SEASONS.forEach(s => document.body.classList.remove('season-' + s.toLowerCase()));
    document.body.classList.add('season-' + seasonName().toLowerCase());
    const tint = $('scene').querySelector('svg .season-tint');
    if (!tint) return;
    const [color, outside, inside] = SEASON_TINT[seasonName()];
    tint.setAttribute('fill', color);
    tint.setAttribute('opacity', state.view === 'inside' ? inside : outside);
  }

  // Called by the game loop as time passes. The day runs to nightfall, then the
  // game waits for the player to begin the next one.
  let lastClockSave = 0;
  function advanceClock(dtMs, now) {
    const c = state.clock;
    if (c.night) return;
    c.ms += dtMs;
    if (c.ms >= DAY_MS) {
      c.ms = DAY_MS;
      nightfall(now);
    } else if (now - lastClockSave > 15000) { save(); lastClockSave = now; }   // keep the clock roughly current
    drawDate();
    applyDaylight(false);
  }

  // Closing time: the shop empties and the clock stops.
  function nightfall(now) {
    state.clock.night = true;
    customers.forEach(c => { const el = document.getElementById(c.id); if (el) el.remove(); });
    customers = [];
    addLog(`${randomFrom(CLOSING_OPENERS)} ${randomFrom(NIGHT_LINES[seasonName()])}`);
    deliverOrders();
    // Boxes are only drawn outside. If the van came while the player was inside, step
    // out to meet it so the boxes (and the reason Begin Day is waiting) are in view.
    if (state.view === 'inside' && state.deliveries.length) {
      addLog('Stepped outside to meet the van, like a dog hearing the mail.');
      state.view = 'outside';
      switchView();
    }
    reportProgress();
    drawLog();
    drawOrderForm();
    drawDeliveries();
    drawDate();
    applyDaylight(true);
    save();
    lastClockSave = now || performance.now();
  }

  // Sunrise: the player begins the next day. The van comes, the catalog changes.
  function beginDay() {
    const c = state.clock;
    if (!c.night) return;
    if ((state.deliveries || []).length > 0) return;   // open the boxes first
    c.night = false;
    c.ms = 0;
    c.day += 1;
    bumpLifetime(life => { life.daysPlayed += 1; });
    if (c.day > DAYS_PER_SEASON) {
      c.day = 1;
      c.season = (c.season + 1) % SEASONS.length;
      if (c.season === 0) {
        c.year += 1;
        addLog(`Year ${c.year}. Still here. Still open. Still shelving.`);
      }
      addLog(SEASON_LINES[seasonName()]);
      applySeasonTint();
    } else {
      addLog(`Day ${c.day}. ${randomFrom(DAY_LINES[seasonName()])}`);
    }
    if (isSnowDay()) addLog('Snow today. The squeaky kind. Everyone is walking like a penguin.');
    weather = [];
    ensureCatalogue();
    nextSpawnAt = performance.now() + Math.min(8000, nextArrivalGap());
    drawOrderForm();
    drawDeliveries();
    drawAppeal();
    drawLog();
    drawDate();
    applyDaylight(true);
    save();
    lastClockSave = performance.now();
  }

  function drawGoal() {
    const goal = GOALS[state.stage];
    const upgradeButton = $('upgrade-button');
    // A gold dot on the header caret says an upgrade is waiting, even when the header is folded.
    $('header-toggle').classList.toggle('ready', !goal.final && !!goal.next && state.coins >= goal.cost);
    if (goal.final) {
      $('goal-heading').textContent = 'Goal reached:';
      $('goal-label').textContent = goal.label;
      $('goal-bar').style.width = '100%';
      $('goal-text').textContent = 'Every reader\u2019s dream, achieved. The town is very proud.';
      upgradeButton.classList.add('hidden');
      return;
    }
    $('goal-heading').textContent = 'Next goal:';
    $('goal-label').textContent = goal.label;
    const pct = Math.min(100, Math.round((state.coins / goal.cost) * 100));
    $('goal-bar').style.width = pct + '%';
    const reached = state.coins >= goal.cost;
    if (reached && goal.next) {
      $('goal-text').textContent = `You have ${state.coins} coins. The ${goal.thing} costs ${goal.cost}.`;
      upgradeButton.textContent = `${goal.button} (${goal.cost} coins)`;
      upgradeButton.classList.remove('hidden');
    } else if (reached) {
      $('goal-text').textContent = `Saved enough for the ${goal.thing}. Stage four is coming.`;
      upgradeButton.classList.add('hidden');
    } else {
      $('goal-text').textContent = `${state.coins} of ${goal.cost} coins saved.`;
      upgradeButton.classList.add('hidden');
    }
  }

  // The night tip: shown while the shop is closed, gone at sunrise.
  function drawNightTip() {
    const tip = $('night-tip');
    if (state.clock.night && NIGHT_TIPS.length) {
      tip.textContent = NIGHT_TIPS[dayIndex() % NIGHT_TIPS.length];
      tip.classList.remove('hidden');
    } else {
      tip.classList.add('hidden');
    }
  }

  function addLog(line) {
    state.log.unshift(line);              // newest first
    if (state.log.length > 200) state.log.pop();  // the journal keeps the last two hundred entries
  }

  // Redraw everything that changes when books or coins change, then save.
  function refresh() {
    drawBooksInto($('scene').querySelector('svg'), state.books, state.building, state.view);
    drawHud();
    drawOrderForm();
    drawInventory();
    drawLog();
    drawGoal();
    drawDate();
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
    const side = randomFrom(Scenes.sidesFor(state.building, state.view));
    const onSameSide = customers.filter(c => c.side === side).length;
    const stops = Scenes.stopsFor(state.building, state.view);
    const door = Scenes.doorFor(state.building, state.view);
    const gap = 38 * personScale();                  // bigger people stand further apart
    const look = randomFrom(CUSTOMER_LOOKS);
    const c = {
      id: 'c' + Math.random().toString(36).slice(2, 8),
      look,
      companion: look.companion ? { kind: look.companion.kind, color: randomFrom(look.companion.colors), small: !!look.companion.small, carried: !!look.companion.carried } : null,
      side,
      x: side === 'left' ? -40 * personScale() : Scenes.VIEW.width + 40 * personScale(),
      // With a door out front, everyone walks all the way up to it and goes inside.
      // Without one (the outdoor shelves of stages one and two), they stop and browse
      // on the sidewalk, queued a little further out per person already standing there.
      stopX: door ? door.x : (side === 'left' ? Math.max(60, stops.left - onSameSide * gap) : Math.min(Scenes.VIEW.width - 60, stops.right + onSameSide * gap)),
      door,
      dir: side === 'left' ? 1 : -1,                 // 1 = walking right, -1 = walking left
      state: 'arriving',
      browseUntil: 0,
      busy: null,                                    // stopped for a moment (see "Customers stopping")
      met: new Set()                                 // pets and people already passed, so each is a single chance
    };
    customers.push(c);
    $('scene').querySelector('svg .customers').insertAdjacentHTML('beforeend', customerSvg(c));
  }

  // The person itself, feet at (0,0), facing right. Shared by customers and background people.
  // With reach set, one arm stretches down in front, to pet something.
  function personBody(L, reach) {
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
    if (reach) body += `<path d="M5 -27 Q13 -22 19 -14" stroke="${L.coat}" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="19.5" cy="-13" r="2.4" fill="#f0cfb5"/>`;
    return body;
  }

  // Someone sitting on the ground (or a swing seat): legs out front, same coat and head.
  function seatedBody(L) {
    let b = `<ellipse cx="3" cy="0" rx="12" ry="2.5" fill="#000" opacity="0.12"/>`;
    b += `<rect x="-3" y="-8" width="17" height="6" fill="#4a4a55" rx="1"/>`;
    b += `<path d="M-11 -26 L9 -26 L12 -6 L-12 -6 Z" fill="${L.coat}"/>`;
    if (L.stripes) b += `<g fill="#f4efe4"><rect x="-11.5" y="-22" width="21" height="3"/><rect x="-12" y="-15" width="22" height="3"/></g>`;
    b += `<circle cx="-1" cy="-35" r="9" fill="#f0cfb5"/><circle cx="2" cy="-35" r="1" fill="#3b332c"/><circle cx="3" cy="-32" r="1.8" fill="#e59a8c" opacity="0.6"/>`;
    if (L.hat) b += `<path d="M-11 -39 Q-1 -51 9 -39 Z" fill="${L.hat}"/>`;
    else b += `<path d="M-10 -39 Q-1 -47 8 -39 Q-1 -41 -10 -39 Z" fill="#5a3e2c"/>`;
    return b;
  }

  // Someone sitting on a seat h units up (a bench, a chair): feet at (0,0) under the hips,
  // facing right, knees out front and shins down to the ground. A reader holds their new book open.
  function sitterBody(L, h, reading) {
    const top = -h - 14;                                   // shoulders
    let b = `<ellipse cx="4" cy="0" rx="13" ry="2.6" fill="#000" opacity="0.12"/>`;
    if (L.prop === 'tote') b += `<rect x="-24" y="-13" width="10" height="13" fill="${L.propColor}" rx="1"/><path d="M-22 -13 q3 -6 6 0" stroke="${L.propColor}" stroke-width="1.5" fill="none"/>`;
    b += `<rect x="16.5" y="${-h - 2}" width="5.5" height="${h + 2}" fill="#4a4a55"/><rect x="-2" y="${-h - 5}" width="24" height="6" rx="1.5" fill="#4a4a55"/>`;
    b += `<path d="M-12 ${top} L11 ${top} L13 ${-h + 1} L-14 ${-h + 1} Z" fill="${L.coat}"/>`;
    if (L.stripes) b += `<g fill="#f4efe4"><rect x="-12.5" y="${top + 4}" width="24" height="3"/><rect x="-13.2" y="${top + 10}" width="25.4" height="3"/></g>`;
    const head = top - 10;
    b += `<circle cx="0" cy="${head}" r="9" fill="#f0cfb5"/><circle cx="3" cy="${head}" r="1" fill="#3b332c"/><circle cx="4" cy="${head + 3}" r="1.8" fill="#e59a8c" opacity="0.6"/>`;
    if (L.hat) b += `<path d="M-10 ${head - 4} Q0 ${head - 16} 10 ${head - 4} Z" fill="${L.hat}"/>`;
    else b += `<path d="M-9 ${head - 4} Q0 ${head - 12} 9 ${head - 4} Q0 ${head - 6} -9 ${head - 4} Z" fill="#5a3e2c"/>`;
    if (L.scarf) b += `<rect x="-10" y="${top - 3}" width="20" height="5" fill="${L.scarf}" rx="1"/><rect x="4" y="${top - 1}" width="5" height="11" fill="${L.scarf}"/>`;
    if (L.prop === 'basket') b += `<path d="M5 ${-h - 12} h12 l-2 8 h-8 z" fill="${L.propColor}"/><path d="M7 ${-h - 12} q4 -7 8 0" stroke="${L.propColor}" stroke-width="1.5" fill="none"/>`;
    if (reading) {
      b += `<path d="M12 ${top + 8} l5.5 -1.8 l5.5 1.8 v-8 l-5.5 1.8 l-5.5 -1.8 z" fill="#f4efe4" stroke="#8a6248" stroke-width="0.6"/><line x1="17.5" y1="${top + 6.2}" x2="17.5" y2="${top + 1.8}" stroke="#8a6248" stroke-width="0.5"/>`;
      b += `<path d="M4 ${top + 3} Q9 ${top + 9} 13 ${top + 6}" stroke="${L.coat}" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="13.5" cy="${top + 5.5}" r="2.3" fill="#f0cfb5"/>`;
    }
    return b;
  }

  // Draws a simple person: round head, coat, legs, optional hat and prop.
  function customerSvg(c) {
    const L = c.look;
    const scale = customerScale(c);
    let body = c.state === 'seated' ? sitterBody(L, seatHeight(c), c.bought) : personBody(L, c.busy && c.busy.reach);
    body += companionSvg(c);
    return `<g id="${c.id}" class="customer" transform="translate(${c.x} ${Scenes.GROUND_Y}) scale(${c.dir * scale} ${scale})">${body}</g>`;
  }

  // A visiting animal beside its person: a dog on a lead trotting behind (sitting while
  // its person browses), or a crab riding in the bucket.
  function companionSvg(c) {
    const k = c.companion;
    if (!k) return '';
    const pet = { kind: k.kind, color: k.color };
    // The person's group is already scaled by personScale (and 0.8 for a child), so the
    // animal's own factor here brings it to the same size as the shop's pets (0.9 x person).
    const personFactor = c.look.small ? 0.8 : 1;
    const h = c.state === 'seated' ? seatHeight(c) : 0;        // sitting: the basket is on a lap
    if (k.carried) {
      // peeking out of the basket the girl carries
      return `<g transform="translate(${h ? 11 : 20} ${h ? -h - 10 : -22}) scale(${(0.45 / personFactor).toFixed(2)})">${Scenes.petSvg(pet, 'sit')}</g>`;
    }
    const pose = c.state === 'browsing' || c.state === 'seated' || c.busy ? 'sit' : 'stand';
    const s = (k.small ? 0.72 : 0.9) / personFactor;
    return `<line x1="${h ? -8 : -13}" y1="${h ? -h - 8 : -20}" x2="${-30 + 2 * s}" y2="${-11 * s}" stroke="#7d6b58" stroke-width="0.9"/>
      <g transform="translate(-32 0) scale(${s.toFixed(2)})">${Scenes.petSvg(pet, pose)}</g>`;
  }
  // Redraw a customer in place (used when its companion changes pose).
  function redrawCustomer(c) {
    const el = document.getElementById(c.id);
    if (el) el.outerHTML = customerSvg(c);
  }

  function moveCustomerElement(c, bob) {
    const el = document.getElementById(c.id);
    if (!el) return;
    const scale = customerScale(c);
    el.setAttribute('transform', `translate(${c.x} ${Scenes.GROUND_Y - bob}) scale(${c.dir * scale} ${scale})`);
  }

  // Hides a customer while they're inside browsing out of sight, and brings them back
  // when they come back out to leave.
  function setCustomerVisible(c, visible) {
    const el = document.getElementById(c.id);
    if (el) el.style.display = visible ? '' : 'none';
  }

  // ---- Customers stopping for a moment ----
  // Now and then someone on their way in or out stops to pet one of the shop's pets.
  // While c.busy is set they stand still (a browser keeps browsing a little longer);
  // when it runs out they face the way they were going and carry on. Nothing is saved.
  const PET_STOP_CHANCE = 0.25;  // passing a pet within reach: how often they stop for it
  const walking = (c) => c.state === 'arriving' || c.state === 'leaving';
  const onStage = (x) => x > 40 && x < Scenes.VIEW.width - 40;   // well inside the picture, not at its edge

  function startBusy(c, kind, until, extra) {
    c.busy = Object.assign({ kind, until, dir: c.dir, nextFx: 0 }, extra);
    if (c.state === 'browsing') c.browseUntil = Math.max(c.browseUntil, until + 400);
    redrawCustomer(c);
  }
  function endBusy(c) {
    c.dir = c.busy.dir;
    c.busy = null;
    redrawCustomer(c);
  }

  // A shop pet someone could stop for: settled, or strolling, and not already being petted.
  const pettable = (a) => (a.state === 'sit' || a.state === 'nap' || a.state === 'wander') && !a.partner && !a.greeting
    && !customers.some(o => o.busy && o.busy.pet === a);

  // Walking past a pet: if one is just ahead and within arm's reach, maybe stop and pet it.
  function maybePetShopPet(c, now) {
    const reach = 22 * customerScale(c);
    if (!onStage(c.x)) return false;
    const a = petActors.find(p => !c.met.has(p.pet.id) && (p.x - c.x) * c.dir > 0 && Math.abs(p.x - c.x) < reach && pettable(p));
    if (!a) return false;
    c.met.add(a.pet.id);
    if (Math.random() >= PET_STOP_CHANCE) return false;
    petCustomerPet(c, a, now + 2500 + Math.random() * 2000);
    if (Math.random() < 0.5) petJournal(`${c.look.desc} ${randomFrom(PET_GREET_LINES).replace('{pet}', a.pet.name)}`);
    return true;
  }

  // One note a day about the people themselves (not the pets), so the journal stays mostly about books.
  let lastPeopleLogDay = -1;
  function peopleJournal(line) {
    if (lastPeopleLogDay === dayIndex() || Math.random() < 0.5) return;
    lastPeopleLogDay = dayIndex();
    addLog(line);
    drawLog();
    save();
  }

  // ---- Customers meeting each other ----
  // Someone standing where another customer could walk up to them: out in the open and not
  // already stopped for something else.
  const approachable = (o) => (o.state === 'arriving' || o.state === 'browsing' || o.state === 'leaving') && !o.busy;
  function maybeMeet(c, now) {
    for (const o of customers) {
      if (o === c || c.met.has(o.id) || !approachable(o)) continue;
      if (o.companion && maybePetVisitorPet(c, o, now)) return true;
      if (maybeChat(c, o, now)) return true;
    }
    return false;
  }

  // ---- Chats ----
  // Two customers who meet may stop and talk: they face each other (unless one has a dog on
  // a lead, who would end up on the wrong side) and speech bubbles go back and forth.
  const CHAT_CHANCE = 0.3;
  const CHAT_LINES = ['{a} and {b} stopped to talk about the weather. The weather was discussed thoroughly.', '{a} bumped into {b}. They talked books, then tides, then somebody’s cousin.',
    '{a} and {b} had a long chat. Nobody bought anything during it. Everybody left happy.', '{a} and {b} found out they had read the same book. The conversation may still be going.'];
  const lowerFirst = (s) => s[0].toLowerCase() + s.slice(1);
  const onLead = (c) => c.companion && !c.companion.carried;

  function maybeChat(c, o, now) {
    const s = customerScale(c);
    const ahead = (o.x - c.x) * c.dir;
    if (ahead <= 0 || ahead > 40 * s || !onStage(c.x) || !onStage(o.x)) return false;
    c.met.add(o.id); o.met.add(c.id);
    if (ahead < 28 * s || Math.random() >= CHAT_CHANCE) return false;   // too close to stand and talk
    const mid = (c.x + o.x) / 2;                     // and nobody standing in between them
    if (customers.some(p => p !== c && p !== o && p.state !== 'inside' && Math.abs(p.x - mid) < ahead / 2 + 12 * s)) return false;
    startChat(c, o, now);
    if (c.look.desc !== o.look.desc) peopleJournal(randomFrom(CHAT_LINES).replace('{a}', c.look.desc).replace('{b}', lowerFirst(o.look.desc)));
    return true;
  }

  function startChat(c, o, now) {
    const until = now + 3500 + Math.random() * 3000;
    const facing = o.x >= c.x ? 1 : -1;
    startBusy(c, 'chat', until, { other: o, lead: true, turn: Math.random() < 0.5 });
    startBusy(o, 'chat', until, { other: c });
    c.dir = facing;
    if (!onLead(o)) o.dir = -facing;
    redrawCustomer(c); redrawCustomer(o);
  }

  // What goes in a speech bubble: dots, a heart, a book, a tune, a fish, "!" or "?", and a
  // bit of weather to suit the season. Drawn about 16 units across, centered on (0,0).
  const CHAT_ICONS = [
    '<g fill="#5d5a54"><circle cx="-3.6" cy="0" r="1.2"/><circle cx="0" cy="0" r="1.2"/><circle cx="3.6" cy="0" r="1.2"/></g>',
    '<path d="M0 3.4 C-5.5 -0.4 -3.6 -5 0 -2.2 C3.6 -5 5.5 -0.4 0 3.4 Z" fill="#d98c9c"/>',
    '<path d="M-5 -3 L0 -2 L5 -3 V3 L0 4 L-5 3 Z" fill="#a5443a"/><line x1="0" y1="-2" x2="0" y2="4" stroke="#f4efe4" stroke-width="0.7"/>',
    '<g fill="#2b3f5c"><circle cx="-2.4" cy="2.8" r="1.5"/><circle cx="2.6" cy="1.8" r="1.5"/></g><path d="M-1 2.8 V-3.6 L4 -4.6 V1.8" stroke="#2b3f5c" stroke-width="0.9" fill="none"/>',
    '<path d="M-4.5 0 Q-1 -3.4 3 0 Q-1 3.4 -4.5 0 Z M3 0 L5.5 -2.4 L5.5 2.4 Z" fill="#6f8a99"/><circle cx="-2.4" cy="-0.4" r="0.6" fill="#f4efe4"/>',
    '<text x="0" y="3.6" text-anchor="middle" font-size="10" font-family="Georgia, serif" font-weight="bold" fill="#a5443a">!</text>',
    '<text x="0" y="3.6" text-anchor="middle" font-size="10" font-family="Georgia, serif" font-weight="bold" fill="#2f6f6a">?</text>'
  ];
  const WEATHER_ICONS = {
    Spring: '<g fill="#d98c9c"><circle cx="0" cy="-2.4" r="1.8"/><circle cx="2.3" cy="-0.7" r="1.8"/><circle cx="1.4" cy="2" r="1.8"/><circle cx="-1.4" cy="2" r="1.8"/><circle cx="-2.3" cy="-0.7" r="1.8"/></g><circle r="1.2" fill="#d9a441"/>',
    Summer: '<circle r="2.4" fill="#d9a441"/><g stroke="#d9a441" stroke-width="1" stroke-linecap="round"><line x1="0" y1="-4.8" x2="0" y2="-3.6"/><line x1="0" y1="3.6" x2="0" y2="4.8"/><line x1="-4.8" y1="0" x2="-3.6" y2="0"/><line x1="3.6" y1="0" x2="4.8" y2="0"/><line x1="-3.4" y1="-3.4" x2="-2.6" y2="-2.6"/><line x1="2.6" y1="2.6" x2="3.4" y2="3.4"/><line x1="-3.4" y1="3.4" x2="-2.6" y2="2.6"/><line x1="2.6" y1="-2.6" x2="3.4" y2="-3.4"/></g>',
    Autumn: '<path d="M-4 3.5 Q-4.5 -4 4 -4 Q4 3.5 -4 3.5 Z" fill="#c9782e"/><path d="M-4 3.5 L2 -2" stroke="#8a4a1e" stroke-width="0.6"/>',
    Winter: '<g stroke="#6f8a99" stroke-width="0.9" stroke-linecap="round"><line x1="0" y1="-4.5" x2="0" y2="4.5"/><line x1="-3.9" y1="-2.25" x2="3.9" y2="2.25"/><line x1="-3.9" y1="2.25" x2="3.9" y2="-2.25"/></g>'
  };

  // A bubble over the speaker's head, a little in front of their face, its tail pointing back to them.
  function chatBubble(c) {
    const group = $('scene').querySelector('svg .effects');
    if (!group) return;
    const s = customerScale(c);
    const x = c.x + c.dir * 10 * s, y = Scenes.GROUND_Y - 62 * s;
    const d = c.dir;
    const icon = Math.random() < 0.2 ? (WEATHER_ICONS[seasonName()] || CHAT_ICONS[0]) : randomFrom(CHAT_ICONS);
    group.insertAdjacentHTML('beforeend', `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s * 0.9).toFixed(2)})"><g class="chat-bubble">
      <path d="M${-2 * d} 5 L${-7 * d} 10 L${3 * d} 5 Z" fill="#fffaf0" stroke="#5d5a54" stroke-width="0.6" stroke-linejoin="round"/>
      <rect x="-8.5" y="-6.5" width="17" height="13" rx="4.5" fill="#fffaf0" stroke="#5d5a54" stroke-width="0.6"/>
      <path d="M${-1.6 * d} 6.2 L${2.6 * d} 6.2 L${2.6 * d} 5.4 L${-1.6 * d} 5.4 Z" fill="#fffaf0"/>${icon}</g></g>`);
    const el = group.lastElementChild;
    setTimeout(() => el.remove(), 1700);
  }

  // ---- Sitting down ----
  // After their visit, someone may sit a while before heading off, reading if they bought
  // a book. Only things people really sit on count: the park bench, the Adirondack chair,
  // and the squishy armchair. Never the plants. One sitter each: people are drawn larger
  // than the decor, so two on a bench would sit in each other's laps.
  // Each seat's height is in the item's own drawing units.
  const SEATS = { bench: 16, chair: 12, 'indoor:armchair': 17 };
  const SIT_CHANCE = 0.35;
  const SIT_LINES = ['{a} sat {seat} for a while and watched the world go by.', '{a} took a load off {seat}. Declared it the best seat in town. It might be.', '{a} sat {seat}, sighed a happy sigh, and stayed longer than planned.'];
  const READ_LINES = ['{a} sat down {seat} and read the first chapter right there. Then the second.', '{a} couldn’t wait to get home. Started reading {seat}.'];
  const decorScale = () => personScale() * 0.75;             // how big decor is drawn, next to people

  // The free seats in the view on screen, each as { spot, key, x, y, face }: y is the
  // seat's height in picture units, face which way a sitter looks (toward the middle).
  function freeSeats() {
    const xs = zoneXs(), out = [];
    zoneIds().forEach((id, i) => {
      const key = zoneSpots()[id];
      if (!SEATS[key] || customers.some(c => c.seat && c.seat.spot === id)) return;
      out.push({ spot: id, key, x: xs[i], y: SEATS[key] * decorScale(), face: xs[i] < Scenes.VIEW.width / 2 ? 1 : -1 });
    });
    return out.filter(s => onStage(s.x));
  }
  const seatHeight = (c) => c.seat.y / customerScale(c);    // in the sitter's own drawing units
  const seatStillThere = (c) => zoneSpots()[c.seat.spot] === c.seat.key;   // not dragged away meanwhile
  const seatPhrase = (key) => (key === 'bench' ? 'on ' : 'in ') + itemName(key);

  // Just leaving: maybe head for the nearest free seat first.
  function maybeSit(c) {
    if (state.clock.night || Math.random() >= SIT_CHANCE) return;
    const seat = freeSeats().sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
    if (!seat) return;
    c.seat = seat;
    c.leaveDir = c.dir;
    c.state = 'toSeat';
    c.dir = seat.x >= c.x ? 1 : -1;
  }
  function sitDown(c, now) {
    c.x = c.seat.x;
    c.state = 'seated';
    c.dir = c.seat.face;
    c.seatUntil = now + 7000 + Math.random() * 8000;
    redrawCustomer(c);
    const line = randomFrom(c.bought ? READ_LINES : SIT_LINES);
    peopleJournal(line.replace('{a}', c.look.desc).replace('{seat}', seatPhrase(c.seat.key)));
  }
  function standUp(c) {
    c.state = 'leaving';
    c.dir = c.leaveDir;
    c.seat = null;
    redrawCustomer(c);
  }


  // Where another customer's animal is: the dog trotting behind on its lead, or the crab's
  // bucket out in front.
  function companionX(o) {
    return o.x + o.dir * (o.companion.carried ? 20 : -32) * customerScale(o);
  }
  const VISITOR_PET_CHANCE = 0.5;
  const VISITOR_PET_LINES = ['{a} stopped to scratch the ears of a visiting dog. The dog has recommended us to friends.', '{a} asked whether they could pet the dog. The dog answered first.', '{a} and a stranger’s dog became best friends for about four seconds. Nobody regrets it.'];
  const VISITOR_CRAB_LINES = ['{a} leaned over a bucket to say hello to a crab. The crab clicked back, politely.', '{a} was introduced to a crab in a bucket. They shook hands. Well, claws. Well, one of them.'];

  // Walking up on someone else's dog (or crab): if it is just ahead, maybe stop and pet it.
  // The owner waits, the way owners do.
  function maybePetVisitorPet(c, o, now) {
    const s = customerScale(c);
    const px = companionX(o);
    const ahead = (px - c.x) * c.dir;
    if (ahead <= 0 || ahead > 22 * s) return false;                          // not there yet
    // Only from the animal's far side, so it reads owner, lead, animal, then the one petting it.
    if (Math.abs(c.x - o.x) < Math.abs(px - o.x) || !onStage(c.x) || !onStage(px)) return false;
    c.met.add(o.id); o.met.add(c.id);
    if (Math.random() >= VISITOR_PET_CHANCE) return false;
    const until = now + 3000 + Math.random() * 2000;
    startBusy(c, 'petVisitor', until, { owner: o, reach: true });
    startBusy(o, 'wait', until, { other: c });
    const lines = o.companion.kind === 'crab' ? VISITOR_CRAB_LINES : VISITOR_PET_LINES;
    peopleJournal(randomFrom(lines).replace('{a}', c.look.desc));
    return true;
  }

  // The customer reaches down; the pet stops where it is (a napping pet naps on) and enjoys it.
  function petCustomerPet(c, a, until) {
    if (a.state !== 'nap') { a.state = 'greet'; a.targetX = null; a.dir = a.x < c.x ? 1 : -1; }
    a.until = Math.max(a.until, until);
    c.dir = a.x >= c.x ? 1 : -1;
    startBusy(c, 'pet', until, { pet: a, reach: true });
  }

  // Each frame while stopped: hearts over whatever is being petted, until time is up.
  function runBusy(c, now) {
    const b = c.busy;
    const a = b.pet;
    const o = b.owner || b.other;                    // the other customer, if there is one
    const gone = (a && (!petActors.includes(a) || (a.state !== 'greet' && a.state !== 'nap')))
      || (o && (!customers.includes(o) || !o.busy));
    if (now >= b.until || gone) { endBusy(c); return; }
    if (now >= b.nextFx) {
      b.nextFx = now + 900 + Math.random() * 500;
      if (a) floatText(a.x, Scenes.GROUND_Y - 30 * petScale(), '♥', '#d98c9c');
      if (b.kind === 'chat' && b.lead) {             // the one who stopped first keeps the turns
        chatBubble(b.turn ? c : o);
        b.turn = !b.turn;
        b.nextFx = now + 1100 + Math.random() * 500;
      }
      if (b.kind === 'petVisitor') {
        const high = b.owner.companion.carried ? 38 * customerScale(b.owner) : 30 * petScale();
        floatText(companionX(b.owner), Scenes.GROUND_Y - high, '♥', '#d98c9c');
      }
    }
  }

  // ---- Pets out and about ----
  // Each pet out front is a small actor: where it is, what it is doing, and until when.
  // States: 'wander' (walking to a spot), 'sit', 'nap', 'greet' (beside a customer),
  // 'play' (with another pet). Nothing here is saved; pets pick up where they like.
  let petActors = [];
  const petScale = () => personScale() * 0.9;
  function petBounds() { return state.view === 'inside' ? [150, 650] : [70, 730]; }
  // A crowd of pets: past four, everyone is drawn a little smaller (three-quarters at twelve)
  // and some stand a row further back, so they overlap like a crowd rather than pile up.
  const CROWD_FROM = 4;
  function crowdScale() { return 1 - Math.max(0, petActors.length - CROWD_FROM) * 0.03; }
  function crowded() { return petActors.length > CROWD_FROM; }

  // Somewhere to go: try a few spots and take the one furthest from the other pets.
  function openSpot(a) {
    const [lo, hi] = petBounds();
    let best = null, bestGap = -1;
    for (let i = 0; i < 6; i++) {
      const x = lo + Math.random() * (hi - lo);
      const gap = Math.min(Infinity, ...petActors.filter(o => o !== a).map(o => Math.abs((o.targetX === null ? o.x : o.targetX) - x)));
      if (gap > bestGap) { best = x; bestGap = gap; }
    }
    return best;
  }

  // Rebuild the actors from the save: called when the scene is drawn or pets change.
  function syncPets() {
    const svg = $('scene').querySelector('svg');
    if (!svg) return;
    const out = (state.decor.pets || []).filter(p => (state.decor.petsOut || []).includes(p.id));
    petActors = petActors.filter(a => out.some(p => p.id === a.pet.id));
    out.forEach(p => {
      if (!petActors.some(a => a.pet.id === p.id)) {
        const a = { pet: p, x: 0, dir: 1, state: 'sit', until: performance.now() + 1500, targetX: null, pose: null, partner: null, row: Math.random() < 0.5 ? 1 : 0 };
        a.x = openSpot(a);
        petActors.push(a);
      }
    });
    petActors.sort((a, b) => b.row - a.row);           // the back row is drawn first
    const group = svg.querySelector('.pets');
    group.innerHTML = petActors.map(a => `<g id="${a.pet.id}" class="pet"></g>`).join('');
    petActors.forEach(a => { a.pose = null; renderPet(a); });
  }

  function renderPet(a) {
    const el = document.getElementById(a.pet.id);
    if (!el) return;
    const pose = a.state === 'nap' ? 'nap' : (a.state === 'sit' || a.state === 'greet') ? 'sit' : 'stand';
    if (pose !== a.pose) { el.innerHTML = Scenes.petSvg(a.pet, pose); a.pose = pose; }
    const back = crowded() ? a.row : 0;
    const s = petScale() * crowdScale() * (1 - 0.1 * back);
    const flip = a.pet.kind === 'crab' ? 1 : a.dir;      // crabs face the viewer and scuttle sideways
    const bob = a.state === 'wander' ? Math.abs(Math.sin(a.x / 6)) * 1.2 * s : a.state === 'play' ? Math.abs(Math.sin(performance.now() / 90)) * 4 * s
      : a.state === 'chase' ? Math.abs(Math.sin(a.x / 5)) * (a.pet.kind === 'crab' ? 1.2 : 3) * s : 0;
    el.setAttribute('transform', `translate(${a.x.toFixed(1)} ${(Scenes.GROUND_Y - 10 * back - bob).toFixed(1)}) scale(${flip * s} ${s})`);
  }

  // "Biscuit", "Biscuit and Mabel", "Biscuit, Mabel, and Otis" (with the Oxford comma).
  function namesList(names) {
    if (names.length < 3) return names.join(' and ');
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  let lastPetLogDay = -1;
  function petJournal(line) {
    if (lastPetLogDay === dayIndex()) return;          // one pet note a day, however many pets
    lastPetLogDay = dayIndex();
    if (petActors.length >= PET_CROWD_FROM && Math.random() < 0.4) line = randomFrom(PET_CROWD_LINES).split('{n}').join(petActors.length);
    addLog(line);
    drawLog();
    save();
  }

  // ---- Chases ----
  // Now and then one pet chases another. Both run flat out, the runner away and the chaser
  // after it. A catch is a tag (they swap, and the new chaser gives a half-second head start);
  // a runner out of room turns and dashes back past. After a few seconds both sit to catch
  // their breath. Crabs are slow, so they get tagged a lot and then chase dogs they cannot catch.
  const CHASE_ODDS = {           // chaser -> runner: how likely each pairing is picked
    dog: { cat: 3, dog: 2, crab: 1 },
    cat: { dog: 1, cat: 1, crab: 1 },
    crab: { dog: 1, cat: 1, crab: 1 }
  };
  const CHASE_BOOST = 2.3;       // how much faster than a stroll
  const CHASER_EDGE = 1.15;      // the chaser is a touch faster, so it gains

  function startChase(chaser, runner, now) {
    const until = now + 4000 + Math.random() * 4000;
    [chaser, runner].forEach(p => { p.state = 'chase'; p.until = until; p.targetX = null; p.partner = null; p.greeting = false; });
    chaser.chase = { other: runner, role: 'chaser', waitUntil: 0 };
    runner.chase = { other: chaser, role: 'runner', runDir: runner.x >= chaser.x ? 1 : -1 };
    const kinds = chaser.pet.kind + '>' + runner.pet.kind;
    const lines = kinds === 'dog>cat' ? CHASE_LINES_DOG_CAT : chaser.pet.kind === 'crab' && runner.pet.kind !== 'crab' ? CHASE_LINES_CRAB_CHASER
      : runner.pet.kind === 'crab' && chaser.pet.kind !== 'crab' ? CHASE_LINES_CRAB_RUNNER : CHASE_LINES;
    petJournal(randomFrom(lines).split('{a}').join(chaser.pet.name).split('{b}').join(runner.pet.name));
  }

  function endChase(a, now) {
    [a, a.chase && a.chase.other].forEach(p => {
      if (!p || p.state !== 'chase') return;
      p.chase = null; p.state = 'sit'; p.targetX = null;
      p.until = now + 2000 + Math.random() * 3000;
    });
  }

  function runChase(a, dt, now, lo, hi) {
    const c = a.chase, o = c.other;
    if (!petActors.includes(o) || o.state !== 'chase' || now >= a.until) { endChase(a, now); return; }
    const speed = PET_KINDS[a.pet.kind].speed * (0.7 + 0.3 * personScale()) * CHASE_BOOST * (c.role === 'chaser' ? CHASER_EDGE : 1);
    if (c.role === 'chaser') {
      if (now < c.waitUntil) return;                   // counting to one, fairly
      const dx = o.x - a.x;
      a.dir = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) < 12 * petScale()) {            // tag, you're it
        a.chase = { other: o, role: 'runner', runDir: -a.dir };
        o.chase = { other: a, role: 'chaser', waitUntil: now + 500 };
        return;
      }
    } else {
      if (a.x <= lo) c.runDir = 1;                     // out of room: turn and dash back past
      if (a.x >= hi) c.runDir = -1;
      a.dir = c.runDir;
    }
    a.x = Math.max(lo, Math.min(hi, a.x + a.dir * speed * dt));
  }

  // Pick a chaser and a runner from the pets who are free, weighted by CHASE_ODDS.
  function maybeStartChase(now, night) {
    if (night) return;
    const idle = petActors.filter(a => (a.state === 'wander' || a.state === 'sit') && !a.partner && !a.greeting);
    const running = petActors.filter(a => a.state === 'chase').length / 2;
    if (idle.length < 2 || running >= 1 + Math.floor(petActors.length / 5)) return;
    if (Math.random() >= 0.00025 * (idle.length - 1)) return;   // per frame: more pets, more chases
    const pairs = [];
    idle.forEach(c => idle.forEach(r => { if (c !== r) pairs.push([c, r, CHASE_ODDS[c.pet.kind][r.pet.kind]]); }));
    let pick = Math.random() * pairs.reduce((sum, p) => sum + p[2], 0);
    const pair = pairs.find(p => (pick -= p[2]) < 0) || pairs[0];
    startChase(pair[0], pair[1], now);
  }

  function updatePets(dt, now) {
    if (!petActors.length) return;
    const [lo, hi] = petBounds();
    const night = state.clock.night;
    petActors.forEach(a => {
      const info = PET_KINDS[a.pet.kind];
      if (a.state === 'chase') { runChase(a, dt, now, lo, hi); return; }
      if (a.state === 'wander') {
        const speed = info.speed * (0.7 + 0.3 * personScale());
        if (a.targetX === null) a.targetX = openSpot(a);
        const dx = a.targetX - a.x;
        a.dir = dx >= 0 ? 1 : -1;
        if (Math.abs(dx) < speed * dt) {
          a.x = a.targetX; a.targetX = null;
          if (a.partner) { a.state = 'play'; a.until = now + 2500 + Math.random() * 1500; }
          else if (a.greeting) {
            a.state = 'greet'; a.until = now + 3000; a.greeting = false;
            floatText(a.x, Scenes.GROUND_Y - 30 * petScale(), '\u2665', '#d98c9c');
            const t = a.greetTarget;
            if (t && t.companion && !t.companion.carried && t.state === 'browsing') floatText(t.x - t.dir * 24 * personScale(), Scenes.GROUND_Y - 30 * petScale(), '\u2665', '#d98c9c');
            // A browser the pet came to see (rather than their dog) reaches down to pet it.
            else if (t && t.state === 'browsing' && !t.busy && customers.includes(t)) petCustomerPet(t, a, a.until);
            a.greetTarget = null;
          }
          else if (Math.random() < (night ? 0.7 : 0.3)) { a.state = 'nap'; a.until = now + 8000 + Math.random() * 8000; if (!night && Math.random() < 0.5) petJournal(randomFrom(PET_NAP_LINES).replace('{pet}', a.pet.name)); }
          else { a.state = 'sit'; a.until = now + 2000 + Math.random() * 4000; }
        } else {
          a.x += Math.sign(dx) * speed * dt;
        }
      } else if (now >= a.until) {
        if (a.state === 'play' && a.partner) { const p = a.partner; a.partner = null; if (p.partner === a) p.partner = null; }
        a.state = 'wander';
        a.targetX = null;
        // Sometimes wander toward a browsing customer to be petted.
        const browsing = customers.filter(c => c.state === 'browsing');
        const withAnimals = browsing.filter(c => c.companion && !c.companion.carried);
        if (!night && browsing.length && Math.random() < (withAnimals.length ? 0.7 : 0.35)) {
          const c = withAnimals.length ? randomFrom(withAnimals) : randomFrom(browsing);
          const beside = c.companion && !c.companion.carried ? -c.dir * 30 * personScale() : (Math.random() < 0.5 ? -1 : 1) * 26 * personScale();
          a.targetX = Math.max(lo, Math.min(hi, c.x + beside));
          a.greeting = true;
          a.greetTarget = c;
          if (c.companion && !c.companion.carried) petJournal(randomFrom(SNIFF_LINES).split('{pet}').join(a.pet.name).replace('{kind}', PET_KINDS[c.companion.kind].name));
          else if (Math.random() < 0.5) petJournal(`${c.look.desc} ${randomFrom(PET_GREET_LINES).replace('{pet}', a.pet.name)}`);
        }
      }
    });
    // Two pets who are both wandering may decide to play.
    const free = petActors.filter(a => a.state === 'wander' && !a.partner && !a.greeting);
    if (free.length >= 2 && !night && Math.random() < 0.0004) {   // per frame: a game every minute or so
      const [a, b] = free.sort(() => Math.random() - 0.5);
      const meet = Math.max(lo, Math.min(hi, (a.x + b.x) / 2));
      a.partner = b; b.partner = a;
      a.targetX = meet - 10 * petScale(); b.targetX = meet + 10 * petScale();
      petJournal(randomFrom(PET_PLAY_LINES).split('{a}').join(a.pet.name).split('{b}').join(b.pet.name));
    }
    maybeStartChase(now, night);
    petActors.forEach(renderPet);
  }

  // ---- Weather: leaves on the wind in autumn, snow on winter snow days ----
  let weather = [];             // particles: { x, y, vx, vy, phase, size, color, kind, rot }
  let nextGustAt = 0;
  let lastWeatherDraw = 0;
  // Spring showers and light winter flurries: when the next one may start, and when the
  // current one ends. Snow days (one winter day in three) snow all day regardless.
  let nextShowerAt = 0, showerUntil = 0;
  let nextFlurryAt = 0, flurryUntil = 0;
  const snowing = (now) => isSnowDay() || now < flurryUntil;
  const LEAF_COLORS = ['#c9782e', '#a5443a', '#d9a441', '#b85c2a'];

  function updateWeather(dt, now) {
    if (state.view === 'inside') { weather = []; return; }
    const season = seasonName();
    // Autumn: every so often a gust carries a handful of leaves across the scene.
    if (season === 'Autumn' && !state.clock.night && now >= nextGustAt) {
      const count = 8 + Math.floor(Math.random() * 7);
      for (let i = 0; i < count; i++) {
        weather.push({ kind: 'leaf', x: 820 + Math.random() * 160, y: 100 + Math.random() * 260, vx: -(130 + Math.random() * 90), vy: 26 + Math.random() * 30, phase: Math.random() * 6.3, size: 4 + Math.random() * 3, color: randomFrom(LEAF_COLORS), rot: Math.random() * 360 });
      }
      nextGustAt = now + 12000 + Math.random() * 16000;
    }
    // Winter: snow days snow all day; other winter days get the odd light flurry.
    if (season === 'Winter' && !isSnowDay()) {
      if (!nextFlurryAt) nextFlurryAt = now + 20000 + Math.random() * 60000;
      if (now >= nextFlurryAt) {
        flurryUntil = now + 25000 + Math.random() * 20000;
        nextFlurryAt = now + 120000 + Math.random() * 120000;
        addLog('A flurry. Gone almost before it landed. Show-off.');
        drawLog();
      }
    }
    if (snowing(now)) {
      const flakes = weather.filter(p => p.kind === 'flake').length;
      const want = isSnowDay() ? 42 : 16;
      for (let i = flakes; i < want; i++) {
        weather.push({ kind: 'flake', x: Math.random() * 800, y: flakes === 0 ? Math.random() * 450 : -10, vx: -6 + Math.random() * 12, vy: 22 + Math.random() * 30, phase: Math.random() * 6.3, size: 1.2 + Math.random() * 1.8, color: '#f6f4ee', rot: 0 });
      }
    }
    // Spring: a shower now and then, twenty to forty seconds of slanting rain.
    if (season === 'Spring') {
      if (!nextShowerAt) nextShowerAt = now + 30000 + Math.random() * 90000;
      if (now >= nextShowerAt) {
        showerUntil = now + 20000 + Math.random() * 20000;
        nextShowerAt = now + 100000 + Math.random() * 140000;
        addLog('Spring shower. Umbrellas up. Suddenly everyone is a very slow browser.');
        drawLog();
      }
    }
    if (now < showerUntil) {
      const drops = weather.filter(p => p.kind === 'rain').length;
      for (let i = drops; i < 90; i++) {
        weather.push({ kind: 'rain', x: -20 + Math.random() * 860, y: drops === 0 ? Math.random() * 450 : -12, vx: -35, vy: 400 + Math.random() * 140, phase: 0, size: 8 + Math.random() * 6, color: '#9fb8c4', rot: 0 });
      }
    }
    // Move everything, retire what has left the scene, recycle flakes at the bottom.
    weather = weather.filter(p => {
      p.phase += dt * (p.kind === 'leaf' ? 5 : 1.6);
      const wobble = p.kind === 'leaf' ? 40 : p.kind === 'flake' ? 14 : 0;
      p.x += (p.vx + Math.sin(p.phase) * wobble) * dt;
      p.y += p.vy * dt + (p.kind === 'leaf' ? Math.cos(p.phase) * 18 * dt : 0);
      if (p.kind === 'leaf') p.rot += 240 * dt;
      if (p.kind === 'flake' && p.y > 445) { if (!snowing(now)) return false; p.y = -6; p.x = Math.random() * 800; return true; }
      if (p.kind === 'rain' && p.y > 445) { if (now >= showerUntil) return false; p.y = -12; p.x = -20 + Math.random() * 860; return true; }
      return p.x > -40 && p.y < 460;
    });
    if (now - lastWeatherDraw < 50) return;         // draw at about 20 frames a second
    lastWeatherDraw = now;
    const group = $('scene').querySelector('svg .weather');
    if (!group) return;
    group.innerHTML = weather.map(p => p.kind === 'leaf'
      ? `<ellipse cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" rx="${p.size.toFixed(1)}" ry="${(p.size * 0.55).toFixed(1)}" fill="${p.color}" transform="rotate(${p.rot.toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})"/>`
      : p.kind === 'rain'
      ? `<line x1="${p.x.toFixed(0)}" y1="${p.y.toFixed(0)}" x2="${(p.x - p.size * 0.12).toFixed(1)}" y2="${(p.y + p.size).toFixed(0)}" stroke="${p.color}" stroke-width="1.2" opacity="0.55" stroke-linecap="round"/>`
      : `<circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${p.size.toFixed(1)}" fill="${p.color}" opacity="0.9"/>`).join('');
  }

  // ---- Background people: strollers on the far sand, neighbors visiting the shops next
  // door, a child on the swings and a picnic in the park. Drawn behind the building, never
  // saved. Daylight only for new arrivals; anyone already out finishes what they are doing.
  // Their sizes are fixed to the backdrop (a door's height, the far sand), not to the
  // shop's own person scale, which is deliberately large at stage one.
  let extras = [];
  let nextStrollerAt = 0, nextVisitorAt = 0, nextSwingAt = 0, nextPicnicAt = 0;
  const walkSpeedFor = (scale) => WALK_SPEED * (0.6 + 0.4 * scale);
  function updateExtras(dt, now) {
    if (!OUTDOORS()) { extras = []; return; }
    const cfg = Scenes.extrasFor(state.location);
    if (!cfg) { extras = []; return; }
    const night = state.clock.night;
    const look = () => randomFrom(CUSTOMER_LOOKS);
    if (!night) {
      // Beach: distant strollers, alone or in pairs, along the far sand.
      if (cfg.sand) {
        if (!nextStrollerAt) nextStrollerAt = now + 5000 + Math.random() * 20000;
        if (now >= nextStrollerAt) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const y = cfg.sand.yMin + Math.random() * (cfg.sand.yMax - cfg.sand.yMin);
          const n = Math.random() < 0.45 ? 2 : 1;
          for (let i = 0; i < n; i++) extras.push({ kind: 'stroller', look: look(), x: (dir === 1 ? -30 : 830) - dir * i * 16, y: y + i * 2, dir, scale: 0.45 + Math.random() * 0.1, speed: 0.55 + Math.random() * 0.2, state: 'walk' });
          nextStrollerAt = now + 25000 + Math.random() * 35000;
        }
      }
      // Town and pier: a neighbor walks to a shop next door, goes in, comes out later, leaves.
      if (cfg.doors) {
        if (!nextVisitorAt) nextVisitorAt = now + 8000 + Math.random() * 25000;
        if (now >= nextVisitorAt) {
          const door = randomFrom(cfg.doors);
          const fromLeft = door.x < 400 ? Math.random() < 0.7 : Math.random() < 0.3;   // usually the near edge
          extras.push({ kind: 'visitor', look: look(), x: fromLeft ? -40 : 840, y: door.y, dir: fromLeft ? 1 : -1, scale: door.h / 62, speed: 0.9, state: 'toDoor', door, until: 0 });
          nextVisitorAt = now + 30000 + Math.random() * 45000;
        }
      }
      // Park: a child heads for a free swing; a pair arrives for a picnic.
      if (cfg.swings) {
        if (!nextSwingAt) nextSwingAt = now + 20000 + Math.random() * 50000;
        if (now >= nextSwingAt) {
          const busy = extras.filter(e => e.kind === 'swinger').map(e => e.swing.x);
          const free = cfg.swings.filter(sw => !busy.includes(sw.x));
          if (free.length) {
            const L = randomFrom(CUSTOMER_LOOKS.filter(l => l.small)) || look();
            extras.push({ kind: 'swinger', look: L, x: 840, y: cfg.swingGround, dir: -1, scale: 0.55, speed: 0.8, state: 'toSwing', swing: randomFrom(free), phase: 0, until: 0 });
          }
          nextSwingAt = now + 150000 + Math.random() * 150000;
        }
        if (!nextPicnicAt) nextPicnicAt = now + 45000 + Math.random() * 60000;
        if (now >= nextPicnicAt && !extras.some(e => e.kind === 'picnic')) {
          extras.push({ kind: 'picnic', looks: [look(), look()], x: -40, y: cfg.picnic.y, dir: 1, scale: 0.7, speed: 0.7, state: 'arrive', spot: cfg.picnic.x, until: 0 });
          nextPicnicAt = now + 240000 + Math.random() * 180000;
        }
      }
    }
    // Move everyone.
    extras = extras.filter(e => {
      const v = walkSpeedFor(e.scale) * e.speed * dt;
      if (e.kind === 'stroller') { e.x += e.dir * v; return e.x > -60 && e.x < 860; }
      if (e.kind === 'visitor') {
        if (e.state === 'toDoor') { e.x += e.dir * v; if ((e.dir === 1 && e.x >= e.door.x) || (e.dir === -1 && e.x <= e.door.x)) { e.x = e.door.x; e.state = 'pause'; e.until = now + 500; } }
        else if (e.state === 'pause') { if (now >= e.until) { e.state = 'inside'; e.until = now + 8000 + Math.random() * 20000; } }
        else if (e.state === 'inside') { if (now >= e.until) { e.state = 'out'; e.dir = Math.random() < 0.5 ? 1 : -1; } }
        else { e.x += e.dir * v; return e.x > -60 && e.x < 860; }
        return true;
      }
      if (e.kind === 'swinger') {
        if (e.state === 'toSwing') { e.x -= v; if (e.x <= e.swing.x) { e.x = e.swing.x; e.state = 'swing'; e.until = now + 30000 + Math.random() * 30000; } }
        else if (e.state === 'swing') { e.phase += dt * 2.1; if (now >= e.until && Math.abs(Math.sin(e.phase)) < 0.15) { e.state = 'leave'; e.dir = 1; } }
        else { e.x += v; return e.x < 860; }
        return true;
      }
      if (e.kind === 'picnic') {
        if (e.state === 'arrive') { e.x += v; if (e.x >= e.spot) { e.x = e.spot; e.state = 'sit'; e.until = now + 60000 + Math.random() * 60000; } }
        else if (e.state === 'sit') { if (now >= e.until || night) { e.state = 'leave'; e.dir = -1; } }
        else { e.x -= v; return e.x > -80; }
        return true;
      }
      return false;
    });
  }
  // The background people as SVG, plus the park's swings (empty ones hang still).
  function extrasSvg() {
    const cfg = Scenes.extrasFor(state.location);
    let out = '';
    if (cfg && cfg.swings) {
      cfg.swings.forEach(sw => {
        const rider = extras.find(e => e.kind === 'swinger' && e.state === 'swing' && e.swing.x === sw.x);
        const angle = rider ? Math.sin(rider.phase) * 28 : 0;
        const drop = sw.seatY - sw.pivotY;
        out += `<g opacity="0.85" transform="translate(${sw.x} ${sw.pivotY}) rotate(${angle.toFixed(1)})"><g stroke="#6f6678" stroke-width="2"><line x1="-8" y1="0" x2="-8" y2="${drop}"/><line x1="8" y1="0" x2="8" y2="${drop}"/></g><rect x="-8" y="${drop}" width="16" height="5" fill="#c98a6a"/>` +
          (rider ? `<g transform="translate(0 ${drop + 1}) scale(${(rider.scale * 1.05).toFixed(2)})">${seatedBody(rider.look)}</g>` : '') + `</g>`;
      });
    }
    extras.forEach(e => {
      const bob = (walking) => walking ? Math.abs(Math.sin(e.x / 9)) * 1.6 : 0;
      if (e.kind === 'stroller' || (e.kind === 'visitor' && e.state !== 'inside') || (e.kind === 'swinger' && e.state !== 'swing')) {
        const walking = e.kind === 'stroller' || e.state === 'toDoor' || e.state === 'out' || e.state === 'toSwing' || e.state === 'leave';
        out += `<g transform="translate(${e.x.toFixed(1)} ${(e.y - bob(walking)).toFixed(1)}) scale(${(e.dir * e.scale).toFixed(3)} ${e.scale.toFixed(3)})">${personBody(e.look)}</g>`;
      }
      if (e.kind === 'picnic') {
        if (e.state === 'sit') {
          out += `<g transform="translate(${e.x} ${e.y})"><rect x="-38" y="-7" width="76" height="12" rx="2" fill="#b6413a" opacity="0.85"/><g stroke="#f4efe4" stroke-width="1" opacity="0.6"><line x1="-38" y1="-1" x2="38" y2="-1"/><line x1="-20" y1="-7" x2="-20" y2="5"/><line x1="0" y1="-7" x2="0" y2="5"/><line x1="20" y1="-7" x2="20" y2="5"/></g><rect x="-6" y="-11" width="12" height="7" fill="#b48a52" rx="1"/>` +
            `<g transform="translate(-22 -3) scale(${e.scale.toFixed(3)})">${seatedBody(e.looks[0])}</g><g transform="translate(22 -3) scale(${(-e.scale).toFixed(3)} ${e.scale.toFixed(3)})">${seatedBody(e.looks[1])}</g></g>`;
        } else {
          const b = bob(true);
          out += `<g transform="translate(${e.x.toFixed(1)} ${(e.y - b).toFixed(1)}) scale(${(e.dir * e.scale).toFixed(3)} ${e.scale.toFixed(3)})">${personBody(e.looks[0])}</g>` +
            `<g transform="translate(${(e.x - e.dir * 22).toFixed(1)} ${(e.y - b * 0.6).toFixed(1)}) scale(${(e.dir * e.scale).toFixed(3)} ${e.scale.toFixed(3)})">${personBody(e.looks[1])}</g>`;
        }
      }
    });
    return out;
  }

  // ---- Wildlife: gulls crossing the sky, tiny crabs on the far sand, a fox at the tree line ----
  // These live behind the building (the .background-life layer) and are not saved.
  let critters = [];             // { kind, x, y, dir, speed, scale, phase, state, until }
  let nextBirdAt = 0, nextCrabAt = 0, nextFoxAt = 0, nextDolphinAt = 0, lastCritterDraw = 0;
  const DOLPHIN_LINES = ['A dolphin! Out past the swell. The whole shop pressed its nose to the window.', 'Something silver leapt clear of the water. A dolphin, surely. Nobody bought anything for a full minute.', 'A dolphin, arcing out beyond the buoys. One customer cried a little. Two pretended not to.'];
  const OUTDOORS = () => state.view !== 'inside';
  function updateWildlife(dt, now) {
    if (!OUTDOORS()) { critters = []; return; }
    const loc = state.location;
    const night = state.clock.night;
    // Gulls: one to three together, any outdoor scene, daylight only.
    if (!night) {
      if (!nextBirdAt) nextBirdAt = now + 4000 + Math.random() * 12000;
      if (now >= nextBirdAt) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const count = 1 + Math.floor(Math.random() * 3);
        const baseY = 40 + Math.random() * 110, speed = 55 + Math.random() * 50;
        for (let i = 0; i < count; i++) {
          critters.push({ kind: 'bird', x: dir === 1 ? -40 - i * 34 : 840 + i * 34, y: baseY + (i % 2) * 14 + Math.random() * 8, dir, speed, scale: 0.75 + Math.random() * 0.5, phase: Math.random() * 6.3 });
        }
        nextBirdAt = now + 18000 + Math.random() * 30000;
      }
    }
    // Crabs: beach only, scuttling along the far sand behind the shop.
    if (loc === 'beach') {
      if (!nextCrabAt) nextCrabAt = now + 6000 + Math.random() * 20000;
      if (now >= nextCrabAt) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        critters.push({ kind: 'crab', x: dir === 1 ? -12 : 812, y: 306 + Math.random() * 16, dir, speed: 28 + Math.random() * 20, scale: 0.3 + Math.random() * 0.1, phase: Math.random() * 6.3, state: 'go', until: 0 });
        nextCrabAt = now + 20000 + Math.random() * 40000;
      }
    }
    // A fox: park only, more often towards dusk and after dark. It comes out from behind
    // the big tree, trots along the tree line, stops to sniff, and goes back.
    if (loc === 'park') {
      if (!nextFoxAt) nextFoxAt = now + 30000 + Math.random() * 60000;
      const dusk = night || dayFraction() > 0.7;
      if (now >= nextFoxAt) {
        if (dusk || Math.random() < 0.4) {
          critters.push({ kind: 'fox', x: 96, y: 296, dir: 1, speed: 26, scale: 0.55, phase: 0, state: 'out', until: 0, turnX: 200 + Math.random() * 90 });
          addLog(night ? 'A fox at the edge of the trees, eyes catching the light. Minding its own business, mostly.' : 'A fox at the edge of the trees. Gone before anyone could point. Classic fox.');
          drawLog();
        }
        nextFoxAt = now + 70000 + Math.random() * 90000;
      }
    }
    // A dolphin: rare, daylight, only where there is open water. It leaps once and is gone.
    const sea = Scenes.seaFor(loc);
    if (sea && !night) {
      if (!nextDolphinAt) nextDolphinAt = now + 240000 + Math.random() * 420000;   // 4 to 11 minutes
      if (now >= nextDolphinAt) {
        const span = randomFrom(sea.spans);
        const x = span[0] + Math.random() * (span[1] - span[0]);
        critters.push({ kind: 'dolphin', x, y: sea.surface, dir: Math.random() < 0.5 ? 1 : -1, speed: 0, scale: (0.55 + Math.random() * 0.2) * (sea.scale || 1), phase: 0, t: 0 });
        addLog(randomFrom(DOLPHIN_LINES));
        drawLog();
        bumpLifetime(life => { life.dolphins = (life.dolphins || 0) + 1; });
        nextDolphinAt = now + 240000 + Math.random() * 420000;
      }
    }
    // Move everyone.
    critters = critters.filter(c => {
      if (c.kind === 'dolphin') { c.t += dt / 1.6; return c.t < 1; }   // one leap takes 1.6 s
      c.phase += dt * (c.kind === 'bird' ? 9 : 6);
      if (c.kind === 'bird') {
        c.x += c.dir * c.speed * dt;
        c.y += Math.sin(c.phase * 0.5) * 6 * dt;
        return c.x > -80 && c.x < 880;
      }
      if (c.kind === 'crab') {
        // Scuttle in bursts: go, pause, go.
        if (c.state === 'go') { c.x += c.dir * c.speed * dt; if (Math.random() < dt * 0.5) { c.state = 'pause'; c.until = now + 600 + Math.random() * 1400; } }
        else if (now >= c.until) c.state = 'go';
        return c.x > -30 && c.x < 830;
      }
      if (c.kind === 'fox') {
        if (c.state === 'out') { c.x += c.speed * dt; if (c.x >= c.turnX) { c.state = 'sniff'; c.until = now + 2500 + Math.random() * 3000; } }
        else if (c.state === 'sniff') { if (now >= c.until) { c.state = 'back'; c.dir = -1; } }
        else { c.x -= c.speed * dt; if (c.x <= 96) return false; }
        return true;
      }
      return false;
    });
    if (now - lastCritterDraw < 50) return;         // about 20 frames a second is plenty
    lastCritterDraw = now;
    const svg = $('scene').querySelector('svg');
    if (!svg) return;
    const seaGroup = svg.querySelector('.sea-life');
    if (seaGroup) {
      seaGroup.innerHTML = critters.filter(c => c.kind === 'dolphin').map(c => {
        // A parabola out of the water and back in: nose up on the way out, nose down on the way in.
        const k = c.scale / 0.65;   // a far-off dolphin leaps a proportionally smaller arc
        const t = c.t, lift = Math.sin(Math.PI * t) * 34 * k;
        const x = c.x + c.dir * 50 * k * t, y = c.y + 10 * k - lift, angle = -55 + 110 * t;
        const splash = (t < 0.22 || t > 0.78)
          ? `<g fill="#f4f7f4" opacity="${(t < 0.22 ? 1 - t / 0.22 : (t - 0.78) / 0.22).toFixed(2)}"><circle cx="${(c.x - 9).toFixed(0)}" cy="${(c.y - 5).toFixed(0)}" r="1.6"/><circle cx="${(c.x + 7).toFixed(0)}" cy="${(c.y - 8).toFixed(0)}" r="1.3"/><circle cx="${(c.x + 14).toFixed(0)}" cy="${(c.y - 3).toFixed(0)}" r="1.1"/><circle cx="${(c.x - 3).toFixed(0)}" cy="${(c.y - 11).toFixed(0)}" r="1"/></g>`
          : '';
        const ring = `<ellipse cx="${c.x.toFixed(0)}" cy="${(c.y - 1).toFixed(0)}" rx="${(8 + 26 * t).toFixed(0)}" ry="${(2 + 3 * t).toFixed(1)}" stroke="#e8f0f2" stroke-width="1.2" fill="none" opacity="${(0.7 * (1 - t)).toFixed(2)}"/>`;
        return ring + splash + `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(c.dir * c.scale).toFixed(2)} ${c.scale.toFixed(2)}) rotate(${angle.toFixed(0)})">
          <path d="M-22 0 q10 -12 26 -6 q8 3 14 6 q-6 3 -14 6 q-16 6 -26 -6 z" fill="#6f7d88"/>
          <path d="M-2 -6 q3 -8 8 -6 q-4 3 -4 6 z" fill="#5b6873"/>
          <path d="M-22 0 q-6 -6 -10 -8 q3 8 3 8 q-3 4 -4 8 q6 -5 11 -8 z" fill="#5b6873"/>
          <path d="M6 3 q4 4 6 8 q-6 -3 -10 -5 z" fill="#5b6873"/>
          <circle cx="12" cy="-2" r="1" fill="#2b2a28"/>
          <path d="M-14 3 q14 5 28 1" stroke="#c9d3da" stroke-width="1.5" fill="none" opacity="0.7"/>
        </g>`;
      }).join('');
    }
    const group = svg.querySelector('.background-life');
    if (!group) return;
    group.innerHTML = extrasSvg() + critters.filter(c => c.kind !== 'dolphin').map(c => {
      const flip = c.dir === -1 ? ' scale(-1 1)' : '';
      if (c.kind === 'bird') {
        const up = Math.sin(c.phase) > 0;
        const wing = up ? 'q8 -7 16 0 q8 -7 16 0' : 'q8 -1.5 16 0 q8 -1.5 16 0';
        return `<g transform="translate(${c.x.toFixed(0)} ${c.y.toFixed(0)}) scale(${c.scale.toFixed(2)})${flip}"><path d="M-16 0 ${wing}" stroke="#7c8a90" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
      }
      if (c.kind === 'crab') {
        const step = c.state === 'go' ? Math.sin(c.phase * 2) * 0.6 : 0;
        return `<g transform="translate(${c.x.toFixed(0)} ${(c.y + step).toFixed(1)}) scale(${c.scale.toFixed(2)})">${Scenes.petSvg({ kind: 'crab', color: 'red' }, 'sit')}</g>`;
      }
      // fox
      const trot = c.state === 'sniff' ? 0 : Math.abs(Math.sin(c.phase)) * 0.8;
      const head = c.state === 'sniff' ? 'translate(0 2.5) rotate(18)' : '';
      return `<g transform="translate(${c.x.toFixed(0)} ${(c.y - trot).toFixed(1)}) scale(${c.scale})${flip}">
        <ellipse cx="0" cy="0" rx="10" ry="1.3" fill="#000" opacity="0.12"/>
        <path d="M-11 -2 q-7 -6 -13 0 q5 4 12 2 z" fill="#c8733a"/><circle cx="-22" cy="-1" r="2.2" fill="#f4f1e8"/>
        <path d="M-11 -2 q11 -10 22 -1 l0 3 l-22 0 z" fill="#c8733a"/>
        <g transform="${head}"><circle cx="12" cy="-6" r="3.6" fill="#c8733a"/><path d="M9 -9 l1 -5 l3 4 z" fill="#c8733a"/><path d="M13 -9.5 l2 -4.5 l1.5 4.5 z" fill="#c8733a"/><circle cx="15.5" cy="-5" r="1.5" fill="#f4f1e8"/><circle cx="16.5" cy="-5.2" r="0.6" fill="#2b2a28"/></g>
        <g stroke="#6e3a1a" stroke-width="1.4" stroke-linecap="round"><line x1="-7" y1="0" x2="-8" y2="4"/><line x1="-3" y1="0" x2="-2" y2="4"/><line x1="5" y1="0" x2="4" y2="4"/><line x1="8" y1="0" x2="9" y2="4"/></g>
      </g>`;
    }).join('');
  }

  // The loop. The browser calls this about 60 times a second.
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - lastFrame) / 1000);   // seconds since last frame, capped
    lastFrame = now;
    advanceClock(dt * 1000, now);
    updatePets(dt, now);
    updateWeather(dt, now);
    updateExtras(dt, now);
    updateWildlife(dt, now);

    const shopOpen = !state.clock.night && dayFraction() < LAST_CUSTOMER_AT;
    // A building with only one side to stand on (the lighthouse) fits fewer at once.
    const singleSided = Scenes.sidesFor(state.building, state.view).length === 1;
    const maxOnScreen = singleSided ? Math.min(4, MAX_CUSTOMERS[state.stage]) : MAX_CUSTOMERS[state.stage];
    if (shopOpen && now >= nextSpawnAt && customers.length < maxOnScreen) {
      spawnCustomer();
      nextSpawnAt = now + nextArrivalGap();
    }

    customers.forEach(c => {
      const speed = WALK_SPEED * (0.6 + 0.4 * personScale());
      const bob = () => Math.abs(Math.sin(c.x / (9 * personScale()))) * 2 * personScale();
      if (c.busy) { runBusy(c, now); return; }
      if (walking(c) && !state.clock.night && (maybePetShopPet(c, now) || maybeMeet(c, now))) return;
      if (c.state === 'arriving') {
        c.x += c.dir * speed * dt;
        const arrived = c.dir === 1 ? c.x >= c.stopX : c.x <= c.stopX;
        moveCustomerElement(c, bob());
        if (arrived) {
          c.x = c.stopX;
          if (c.door) {
            // A shop with a door: stand a beat at the threshold, then go inside out of sight.
            c.state = 'entering';
            c.browseUntil = now + 500;
          } else {
            c.state = 'browsing';
            c.browseUntil = now + 1800 + Math.random() * 1800;
          }
          if (c.companion) redrawCustomer(c);
          moveCustomerElement(c, 0);
        }
      } else if (c.state === 'entering') {
        if (now >= c.browseUntil) {
          c.state = 'inside';
          c.browseUntil = now + 1800 + Math.random() * 1800;
          setCustomerVisible(c, false);
        }
      } else if (c.state === 'browsing' || c.state === 'inside') {
        if (now >= c.browseUntil) {
          completeVisit(c);
          c.state = 'leaving';
          c.dir = -c.dir;                                  // turn around
          if (c.door) setCustomerVisible(c, true);
          maybeSit(c);
          if (c.companion) redrawCustomer(c);
        }
      } else if (c.state === 'toSeat') {
        if (!seatStillThere(c)) { standUp(c); return; }
        const dx = c.seat.x - c.x;
        if (Math.abs(dx) <= speed * dt) { sitDown(c, now); return; }
        c.dir = dx > 0 ? 1 : -1;
        c.x += c.dir * speed * dt;
        moveCustomerElement(c, bob());
      } else if (c.state === 'seated') {
        if (now >= c.seatUntil || !seatStillThere(c)) standUp(c);
      } else if (c.state === 'leaving') {
        c.x += c.dir * speed * dt;
        moveCustomerElement(c, bob());
      }
    });

    // Remove anyone who has walked off the edge.
    customers = customers.filter(c => {
      const margin = 60 * personScale();
      const gone = c.state === 'leaving' && (c.x < -margin || c.x > Scenes.VIEW.width + margin);
      if (gone) { const el = document.getElementById(c.id); if (el) el.remove(); }
      return !gone;
    });

    requestAnimationFrame(tick);
  }

  // What happens when a customer finishes browsing.
  function completeVisit(c) {
    const stocked = state.books.map((b, i) => (b ? i : -1)).filter(i => i >= 0);
    const buyChance = BUY_CHANCE * (BUY_FLOOR + (1 - BUY_FLOOR) * shelfFill());
    if (stocked.length > 0 && Math.random() > buyChance) {
      addLog(`${c.look.desc}. ${shelfFill() < 0.5 && Math.random() < 0.6 ? randomFrom(THIN_SHELF_LINES) : randomFrom(BROWSED_LINES)}`);
      floatText(c.x, Scenes.GROUND_Y - 60 * customerScale(c) - 8, '\u2026', '#5d5a54');
    } else if (stocked.length > 0) {
      state.books[randomFrom(stocked)] = null;
      c.bought = true;                               // something to read, if they sit down
      state.coins += SELL_PRICE;
      state.sold += 1;
      bumpLifetime(life => {
        life.booksSold += 1;
        life.coinsEarned += SELL_PRICE;
        if (state.sold > life.bestShopSold) { life.bestShopSold = state.sold; life.bestShopName = state.shopName; }
      });
      const book = randomFrom(ALL_BOOKS);
      addLog(`${c.look.desc}. Bought <em>${book.title}</em> by ${book.author}. Paid ${SELL_PRICE} coins. ${randomFrom(OBSERVATIONS)}`);
      floatText(c.x, Scenes.GROUND_Y - 60 * customerScale(c) - 8, `+${SELL_PRICE}`, '#a5443a');
    } else {
      addLog(`${c.look.desc}. ${randomFrom(EMPTY_OBSERVATIONS)}`);
      floatText(c.x, Scenes.GROUND_Y - 60 * customerScale(c) - 8, '…', '#5d5a54');
    }
    refresh();
  }

  // =========================================================
  // The wholesaler: today's catalog, orders, and deliveries
  // =========================================================
  // Make sure there is a catalog for today. A new one is written each morning.
  function ensureCatalogue() {
    if (state.catalogue && state.catalogue.dayIndex === dayIndex()) return;
    const items = [];
    const newId = () => 'i' + Math.random().toString(36).slice(2, 8);
    if (Math.random() >= NO_VAN_CHANCE) {
      const sizes = BOX_SIZES[state.stage] || BOX_SIZES[1];
      const names = BOX_NAMES.slice().sort(() => Math.random() - 0.5);   // shuffled, so no repeats today
      let mysteryOffered = false;                 // at most one mystery box a day
      const bookBox = () => {
        const tier = Math.floor(Math.random() * 3);
        const books = sizes[tier];
        const mystery = !mysteryOffered && Math.random() < MYSTERY_CHANCE;
        if (mystery) mysteryOffered = true;
        return {
          id: newId(), kind: 'books', name: mystery ? 'Mystery box' : names.pop(), books,
          // A mystery box is priced like a medium box at a discount; its size is decided when opened.
          price: Math.max(1, Math.round(mystery ? sizes[1] * BOX_PRICE_PER_BOOK[1] * 0.7 : books * BOX_PRICE_PER_BOOK[tier])),
          mystery, ordered: false
        };
      };
      const owned = state.decor || freshDecor();
      const decorChoices = DECOR_ITEMS.filter(d =>
        !(d.kind === 'sign' && owned.signs > 0) &&
        !(d.kind === 'bench' && owned.bench > 0) &&
        !(d.kind === 'chair' && owned.chair > 0) &&
        !(d.kind === 'lamp' && owned.lamp > 0) &&
        !(d.kind === 'plant' && owned.plants.includes(d.plant)) &&
        !(d.kind === 'indoor' && (!hasInside() || (owned.indoor || []).includes(d.indoor))) &&
        !(d.kind === 'paint' && owned.paints.includes(d.color)));
      const decorItem = () => {
        const d = decorChoices.splice(Math.floor(Math.random() * decorChoices.length), 1)[0];
        return { id: newId(), kind: d.kind, name: d.name, books: 0, price: d.price, mystery: false, ordered: false, color: d.color || null, plant: d.plant || null, indoor: d.indoor || null };
      };
      const petItem = () => {
        const kind = randomFrom(Object.keys(PET_KINDS));
        const info = PET_KINDS[kind];
        const color = randomFrom(info.colors);
        const taken = (owned.pets || []).map(p => p.name);
        const name = randomFrom(PET_NAMES.filter(n => !taken.includes(n)).concat(taken.length ? [] : PET_NAMES));
        return { id: newId(), kind: 'pet', name: `${PET_COLOR_NAMES[color]} ${info.name} \u00b7 ${name}`, books: 0, price: info.price, mystery: false, ordered: false, pet: { kind, color, name } };
      };
      // Slot one: books, almost always.
      if (Math.random() < BOOK_SLOT_CHANCE) items.push(bookBox());
      // A pet, now and then, while there is room for one.
      const petToday = (owned.pets || []).length < MAX_PETS && Math.random() < PET_DAILY_CHANCE;
      // Slots two and three: decor most of the time, else another box, else empty.
      for (let slot = 1; slot < CATALOGUE_SLOTS; slot++) {
        if (petToday && slot === CATALOGUE_SLOTS - 1) { items.push(petItem()); continue; }
        if (decorChoices.length && Math.random() < DECOR_SLOT_CHANCE) items.push(decorItem());
        else if (Math.random() < SPARE_BOOK_CHANCE) items.push(bookBox());
      }
    }
    state.catalogue = { dayIndex: dayIndex(), items };
  }

  function placeOrder(itemId) {
    const item = (state.catalogue.items || []).find(i => i.id === itemId);
    if (!item || item.ordered || state.coins < item.price) return;
    state.coins -= item.price;
    item.ordered = true;
    // The van comes at closing time. Order during the day and it arrives tonight;
    // order at night and it arrives tomorrow night.
    const arrives = dayIndex() + (state.clock.night ? 1 : 0);
    const when = state.clock.night ? 'tomorrow night' : 'tonight';
    state.orders.push({ id: 'o' + Math.random().toString(36).slice(2, 8), name: item.name, books: item.books, mystery: item.mystery, kind: item.kind || 'books', color: item.color || null, plant: item.plant || null, indoor: item.indoor || null, pet: item.pet || null, arrives });
    if (item.kind === 'pet') addLog(`Arranged to adopt a ${item.name.toLowerCase().replace(' \u00b7 ', ' called ')} for ${item.price} coins. The carrier arrives ${when}.`);
    else if (item.kind && item.kind !== 'books') addLog(`Ordered ${withArticle(item.name.toLowerCase())} for ${item.price} coins. Arrives ${when}.`);
    else addLog(item.mystery
      ? `Ordered a mystery box for ${item.price} coins. Arrives ${when}. Could be anything. Could be all cookbooks.`
      : `Ordered ${item.name.toLowerCase()} (${item.books} books) for ${item.price} coins. Arrives ${when}.`);
    bumpLifetime(life => { life.boxesOrdered = (life.boxesOrdered || 0) + 1; });
    refresh();
  }

  // Called at closing time: anything due today lands outside the shop.
  function deliverOrders() {
    const due = state.orders.filter(o => o.arrives <= dayIndex());
    if (!due.length) return;
    state.orders = state.orders.filter(o => o.arrives > dayIndex());
    due.forEach(o => state.deliveries.push({ id: o.id, name: o.name, books: o.books, mystery: o.mystery, kind: o.kind || 'books', color: o.color || null, plant: o.plant || null, indoor: o.indoor || null, pet: o.pet || null }));
    addLog(`The van came at closing. ${due.length} ${due.length === 1 ? 'box' : 'boxes'} on the step. The driver honked hello.`);
  }

  // Opening a box is a night-time job, after the shop has closed. Books go on the
  // shelves, as many as fit; the rest wait in the box.
  function openDelivery(id) {
    const box = state.deliveries.find(d => d.id === id);
    if (!box) return;
    if (!state.clock.night) {
      floatText(Scenes.deliveryXFor(state.building) + 24, Scenes.GROUND_Y - 30 * personScale(), 'after closing', '#5d5a54');
      return;
    }
    if (box.kind && box.kind !== 'books') { openDecorBox(box); return; }
    if (box.mystery) {
      const sizes = BOX_SIZES[state.stage] || BOX_SIZES[1];
      box.books = randomFrom([sizes[0], sizes[0], sizes[1], sizes[2]]);   // usually small, sometimes a pleasant surprise
      box.mystery = false;
      box.name = 'Mystery box';
    }
    const emptySlots = state.books.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
    const n = Math.min(emptySlots.length, box.books);
    for (let k = 0; k < n; k++) state.books[emptySlots[k]] = randomFrom(BOOK_COLORS);
    const spare = box.books - n;
    state.reserve = (state.reserve || 0) + spare;
    state.deliveries = state.deliveries.filter(d => d.id !== id);
    floatText(Scenes.deliveryXFor(state.building) + 20, Scenes.GROUND_Y - 30 * personScale(), `+${box.books} books`, '#2f6f6a');
    if (spare === 0) addLog(`Opened the ${box.name.toLowerCase()}. ${n} books shelved, spines out and proud.`);
    else if (n === 0) addLog(`Opened the ${box.name.toLowerCase()}. Shelves full, so all ${spare} went to the back room to wait their turn.`);
    else addLog(`Opened the ${box.name.toLowerCase()}. ${n} shelved, ${spare} to the back room to wait their turn.`);
    bumpLifetime(life => { life.boxesOpened = (life.boxesOpened || 0) + 1; });
    refresh();
    drawInventory();
    drawDeliveries();
  }

  // Move books from the back room onto empty shelves.
  function shelveReserve() {
    const emptySlots = state.books.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
    const n = Math.min(emptySlots.length, state.reserve || 0);
    if (n <= 0) return;
    for (let k = 0; k < n; k++) state.books[emptySlots[k]] = randomFrom(BOOK_COLORS);
    state.reserve -= n;
    addLog(`Brought ${n} ${n === 1 ? 'book' : 'books'} out of the back room and into the light.`);
    refresh();
    drawInventory();
  }

  // Paint goes in the cupboard; a sign or a plant goes straight out front (or inside, if
  // the front is full); indoor things go straight inside.
  function openDecorBox(box) {
    state.deliveries = state.deliveries.filter(d => d.id !== box.id);
    const decor = state.decor;
    if (box.kind === 'paint') {
      if (!decor.paints.includes(box.color)) decor.paints.push(box.color);
      const paint = PAINTS.find(p => p.color === box.color);
      addLog(`Opened the box: a bucket of ${paint ? paint.name : 'paint'}. Into the cupboard. It will never run out; that is how paint works here.`);
    } else if (box.kind === 'sign') {
      decor.signs += 1;
      const spot = placeNew('sign');
      addLog(`Opened the box: a chalkboard sign. Wrote ${state.shopName} on it in our very best handwriting${spot ? ` and set it ${slotLabel(spot)}.` : '. No room out front yet, so it waits in the back.'}`);
    } else if (box.kind === 'bench') {
      decor.bench = 1;
      const spot = placeNew('bench');
      addLog(spot ? `Opened the crate: a park bench. Set it ${slotLabel(spot)}. Someone sat on it before the straw was swept up.` : 'Opened the crate: a park bench. Every spot out front is taken, so it waits in the back.');
    } else if (box.kind === 'chair') {
      decor.chair = 1;
      const spot = placeNew('chair');
      addLog(spot ? `Opened the crate: an Adirondack chair. Set it ${slotLabel(spot)}. Nobody has got up from it since.` : 'Opened the crate: an Adirondack chair. Every spot out front is taken, so it waits in the back.');
    } else if (box.kind === 'lamp') {
      decor.lamp = 1;
      const spot = placeNew('lamp');
      addLog(spot ? `Opened the crate: an iron lamppost. Stood it ${slotLabel(spot)}. It comes on by itself at dusk, which feels like a small miracle.` : 'Opened the crate: an iron lamppost. Every spot out front is taken, so it waits in the back.');
    } else if (box.kind === 'plant') {
      const kind = box.plant || 'snake';
      const info = PLANTS.find(p => p.kind === kind) || PLANTS[0];
      if (!decor.plants.includes(kind)) decor.plants.push(kind);
      const spot = placeNew('plant:' + kind);   // the newest plant takes the first free spot
      addLog(`Opened the box: a ${info.name.toLowerCase()}. ${info.line}${spot ? '' : ' Nowhere to put it yet; it waits in the back.'}`);
    } else if (box.kind === 'indoor') {
      const kind = box.indoor || 'armchair';
      const info = indoorInfo(kind);
      decor.indoor = decor.indoor || [];
      if (!decor.indoor.includes(kind)) decor.indoor.push(kind);
      const spot = putInside('indoor:' + kind);
      addLog(`Opened the box: ${withArticle(info.name.toLowerCase())}. ${info.line}${spot ? '' : ' Every spot inside is taken, so it waits in the back.'}`);
    } else if (box.kind === 'pet' && box.pet) {
      if ((decor.pets || []).length >= MAX_PETS) { addLog(`The carrier came, but ${MAX_PETS} pets is the limit. Sent back with apologies and a treat.`); }
      else {
        const pet = { id: 'p' + Math.random().toString(36).slice(2, 8), kind: box.pet.kind, color: box.pet.color, name: box.pet.name };
        decor.pets = decor.pets || [];
        decor.petsOut = decor.petsOut || [];
        decor.pets.push(pet);
        decor.petsOut.push(pet.id);
        addLog(`Opened the carrier: a ${PET_COLOR_NAMES[pet.color].toLowerCase()} ${PET_KINDS[pet.kind].name} called ${pet.name}. ${pet.name} ${randomFrom(PET_ADOPTED[pet.kind])}`);
        bumpLifetime(life => { life.petsAdopted = (life.petsAdopted || 0) + 1; });
        syncPets();
      }
    }
    bumpLifetime(life => { life.boxesOpened = (life.boxesOpened || 0) + 1; });
    drawDecor();
    drawInventory();
    refresh();
    drawDeliveries();
  }

  // ---- The inventory: paint, sign, plant ----
  const buildingWord = () => ({ 1: 'library box', 2: 'shed', 3: 'shop', 4: 'shop' })[state.stage] || 'shop';

  // where: 'outside' (the building) or 'inside' (the walls inside, from stage three).
  function paintBuilding(color, where) {
    const inside = where === 'inside' && hasInside();
    const field = inside ? 'wallPaint' : 'paint';
    if (!state.decor.paints.includes(color) || state.decor[field] === color) return;
    state.decor[field] = color;
    const paint = PAINTS.find(p => p.color === color);
    const name = paint ? paint.name : 'a new color';
    addLog(inside ? `Painted the walls inside ${name}. Dusted every shelf while the paint dried, which was overdue anyway.`
      : `Painted the ${buildingWord()} ${name}. Two coats. Very satisfying.`);
    bumpLifetime(life => { life.coatsOfPaint = (life.coatsOfPaint || 0) + 1; });
    drawScene();
    drawInventory();
    refresh();
  }
  // ---- Renaming a pet ----
  const PET_NAME_MAX = 15;
  let renamingPet = null;
  function startRename(petId) {
    renamingPet = petId;
    drawInventory();
  }
  function finishRename(petId, value) {
    if (renamingPet !== petId) return;
    renamingPet = null;
    const pet = (state.decor.pets || []).find(p => p.id === petId);
    const name = value === null ? '' : value.trim().slice(0, PET_NAME_MAX);
    if (pet && name && name !== pet.name) {
      const old = pet.name;
      pet.name = name;
      addLog(`${old} is now ${name}. ${name} didn\u2019t mind, and still won\u2019t come when called.`);
      drawLog();
      save();
    }
    drawInventory();
  }

  // where: 'front', 'inside' or 'back' (the inventory's buttons say which).
  function toggleDecor(kind, sub, petId, where) {
    const key = kind === 'sign' && state.decor.signs > 0 ? 'sign'
      : kind === 'bench' && state.decor.bench > 0 ? 'bench'
      : kind === 'chair' && state.decor.chair > 0 ? 'chair'
      : kind === 'lamp' && state.decor.lamp > 0 ? 'lamp'
      : kind === 'plant' && state.decor.plants.includes(sub) ? 'plant:' + sub
      : kind === 'indoor' && (state.decor.indoor || []).includes(sub) ? 'indoor:' + sub : null;
    if (key) {
      if (where === 'back') takeIn(key);
      else if (where === 'inside') { if (!putInside(key)) { addLog(`No free spot inside for ${itemName(key)}. Put something away first.`); drawLog(); } }
      else if (!putOut(key)) { addLog(`No free spot out front for ${itemName(key)}. Take something in first.`); drawLog(); }
    }
    if (kind === 'pet' && petId) {
      const out = state.decor.petsOut || [];
      state.decor.petsOut = out.includes(petId) ? out.filter(id => id !== petId) : out.concat([petId]);
      syncPets();
    }
    drawDecor();
    drawInventory();
    save();
  }

  // ---- Dragging decor to a new spot ----
  // Press on an item out front (or inside) and pull it sideways. The spots show as soft
  // marks on the ground, the nearest one brightens, and letting go drops the item there
  // (swapping with whatever was in it). Pointer events cover mouse and touch alike.
  let drag = null;   // { key, el, fromX, dx }
  // The spots in the view on screen: out front, or inside.
  const zoneIds = () => state.view === 'inside' ? insideSlotIds() : slotIds();
  const zoneXs = () => state.view === 'inside' ? Scenes.interiorDecorSlotsFor(state.building) : Scenes.decorSlotsFor(state.building);
  const zoneSpots = () => state.view === 'inside' ? insideSpots() : spots();
  const zoneSlotOf = (key) => zoneIds().find(id => zoneSpots()[id] === key) || null;
  const sceneX = (clientX) => {
    const r = $('scene').querySelector('svg').getBoundingClientRect();
    return (clientX - r.left) / r.width * Scenes.VIEW.width;   // pixels on screen -> picture units
  };
  function startDecorDrag(e) {
    const item = e.target.closest('.decor-item');
    if (!item) return;
    e.preventDefault();
    const key = item.dataset.decor;
    drag = { key, el: item, fromX: sceneX(e.clientX), dx: 0 };
    item.classList.add('dragging');
    const group = $('scene').querySelector('svg .decor');
    const xs = zoneXs();
    const r = personScale() * 0.75 * 16;
    group.insertAdjacentHTML('beforeend', `<g class="slot-markers">${zoneIds().map((id, i) => `<ellipse class="slot-marker" data-slot="${id}" cx="${xs[i]}" cy="${Scenes.GROUND_Y}" rx="${r.toFixed(0)}" ry="${(r * 0.22).toFixed(1)}"/>`).join('')}</g>`);
    updateDragMarker();
  }
  function dragTargetSlot() {
    const xs = zoneXs();
    const here = xs[zoneIds().indexOf(zoneSlotOf(drag.key))] + drag.dx;
    let best = 0;
    xs.forEach((x, i) => { if (Math.abs(x - here) < Math.abs(xs[best] - here)) best = i; });
    return zoneIds()[best];
  }
  function updateDragMarker() {
    const target = dragTargetSlot();
    $('scene').querySelectorAll('.slot-marker').forEach(m => m.classList.toggle('near', m.dataset.slot === target));
  }
  function moveDecorDrag(e) {
    if (!drag) return;
    drag.dx = sceneX(e.clientX) - drag.fromX;
    drag.el.setAttribute('transform', `translate(${drag.dx.toFixed(1)} 0)`);
    updateDragMarker();
  }
  function endDecorDrag() {
    if (!drag) return;
    const target = dragTargetSlot();
    const from = zoneSlotOf(drag.key);
    if (Math.abs(drag.dx) > 3 && target !== from) {
      const sp = zoneSpots();
      const other = sp[target];
      sp[target] = drag.key;
      sp[from] = other || null;
      save();
    }
    drag = null;
    drawDecor();        // redraws everything in place and clears the markers
    drawInventory();
  }

  function drawInventory() {
    const decor = state.decor;
    const rows = [];
    // The buttons for an item that can be placed: take in (or put away) when it is placed;
    // otherwise put out, and from stage three a second button for inside. Each is
    // disabled when every spot in its place is taken.
    const placeButtons = (key, toggleAttrs) => {
      if (isOut(key)) return `<button class="button small" ${toggleAttrs} data-where="back">Take in</button>`;
      if (isInside(key)) return `<button class="button small" ${toggleAttrs} data-where="back">Put away</button>`;
      const front = isIndoorOnly(key) ? ''
        : `<button class="button small" ${toggleAttrs} data-where="front"${freeSlot() ? '' : ' disabled title="Every spot out front is taken"'}>${hasInside() ? 'Out front' : 'Put out'}</button>`;
      const inside = !hasInside() ? ''
        : `<button class="button small" ${toggleAttrs} data-where="inside"${freeInsideSlot() ? '' : ' disabled title="Every spot inside is taken"'}>${isIndoorOnly(key) ? 'Put inside' : 'Inside'}</button>`;
      return `<span class="place-buttons">${front}${inside}</span>`;
    };
    const whereIs = (key, inBack) => isOut(key) ? `Out front, ${slotLabel(slotOf(key))}`
      : isInside(key) ? `Inside, ${INSIDE_LABELS[insideSlotOf(key)]}` : inBack;
    const onShelves = booksInStock();
    const reserve = state.reserve || 0;
    const room = capacity() - onShelves;
    const canShelve = Math.min(room, reserve);
    rows.push(`<li class="stock-row"><div class="item-row">${ICONS.books()}<div><span class="item-name">Books</span><span class="item-meta">${onShelves} on the shelves \u00b7 ${reserve} in the back room</span></div></div>` +
      (canShelve > 0 ? `<button class="button small primary" data-shelve="1">Shelve ${canShelve}</button>` : `<span class="ordered">${reserve > 0 ? 'Shelves full' : room > 0 ? `${room} empty` : 'Full'}</span>`) + `</li>`);
    decor.paints.forEach(color => {
      const paint = PAINTS.find(p => p.color === color) || { name: 'Paint' };
      const current = decor.paint === color;
      if (!hasInside()) {
        rows.push(`<li><div class="item-row">${ICONS.paint(color)}<div><span class="item-name">${paint.name} paint</span><span class="item-meta">${current ? 'On the walls now' : 'In the cupboard'}</span></div></div>${current ? '<span class="ordered">Current</span>' : `<button class="button small primary" data-paint="${color}">Paint the ${buildingWord()}</button>`}</li>`);
        return;
      }
      // From stage three, the same bucket can do the walls outside, inside, or both.
      const within = decor.wallPaint === color;
      const meta = current && within ? 'On the walls inside and out' : current ? 'On the outside walls' : within ? 'On the walls inside' : 'In the cupboard';
      const buttons = (current ? '' : `<button class="button small primary" data-paint="${color}" data-where="outside" title="Paint the outside of the ${buildingWord()}">Outside</button>`) +
        (within ? '' : `<button class="button small primary" data-paint="${color}" data-where="inside" title="Paint the walls inside">Inside</button>`);
      rows.push(`<li><div class="item-row">${ICONS.paint(color)}<div><span class="item-name">${paint.name} paint</span><span class="item-meta">${meta}</span></div></div>${buttons ? `<span class="place-buttons">${buttons}</span>` : '<span class="ordered">Current</span>'}</li>`);
    });
    if (decor.signs > 0) {
      rows.push(`<li><div class="item-row">${ICONS.sign()}<div><span class="item-name">Chalkboard sign</span><span class="item-meta">${whereIs('sign', 'In the back')}</span></div></div>${placeButtons('sign', 'data-toggle="sign"')}</li>`);
    }
    if (decor.bench > 0) {
      rows.push(`<li><div class="item-row">${ICONS.bench()}<div><span class="item-name">Park bench</span><span class="item-meta">${whereIs('bench', 'In the back')}</span></div></div>${placeButtons('bench', 'data-toggle="bench"')}</li>`);
    }
    if (decor.chair > 0) {
      rows.push(`<li><div class="item-row">${ICONS.chair()}<div><span class="item-name">Adirondack chair</span><span class="item-meta">${whereIs('chair', 'In the back')}</span></div></div>${placeButtons('chair', 'data-toggle="chair"')}</li>`);
    }
    if (decor.lamp > 0) {
      rows.push(`<li><div class="item-row">${ICONS.lamp()}<div><span class="item-name">Iron lamppost</span><span class="item-meta">${whereIs('lamp', 'In the back')}</span></div></div>${placeButtons('lamp', 'data-toggle="lamp"')}</li>`);
    }
    decor.plants.forEach(kind => {
      const info = PLANTS.find(p => p.kind === kind) || { name: kind };
      rows.push(`<li><div class="item-row">${ICONS.plant(kind)}<div><span class="item-name">${info.name}</span><span class="item-meta">${whereIs('plant:' + kind, 'In the back')}</span></div></div>${placeButtons('plant:' + kind, `data-toggle="plant" data-plant="${kind}"`)}</li>`);
    });
    (decor.indoor || []).forEach(kind => {
      rows.push(`<li><div class="item-row">${ICONS.indoor(kind)}<div><span class="item-name">${indoorInfo(kind).name}</span><span class="item-meta">${whereIs('indoor:' + kind, 'In the back')}</span></div></div>${placeButtons('indoor:' + kind, `data-toggle="indoor" data-indoor="${kind}"`)}</li>`);
    });
    (decor.pets || []).forEach(pet => {
      const out = (decor.petsOut || []).includes(pet.id);
      const nameCell = renamingPet === pet.id
        ? `<input class="rename" type="text" maxlength="${PET_NAME_MAX}" value="${pet.name.replace(/"/g, '&quot;')}" data-rename-input="${pet.id}" aria-label="New name">`
        : `<span class="item-name">${pet.name} <button class="pencil" data-rename="${pet.id}" title="Rename ${pet.name}" aria-label="Rename ${pet.name}">\u270e</button></span>`;
      rows.push(`<li><div class="item-row">${ICONS.pet(pet)}<div>${nameCell}<span class="item-meta">${PET_COLOR_NAMES[pet.color]} ${PET_KINDS[pet.kind].name} \u00b7 ${out ? 'out and about' : 'asleep on the boxes in the back'}</span></div></div><button class="button small" data-toggle="pet" data-pet="${pet.id}">${out ? 'Take in' : 'Put out'}</button></li>`);
    });
    if (rows.length === 1) rows.push(`<li><span class="empty">No decor yet. The van sometimes carries paint, a sign, plants, and once in a while a pet.</span></li>`);
    $('inventory').innerHTML = rows.join('');
    // While renaming, focus the box and wire up Enter, Escape and clicking away.
    const box = $('inventory').querySelector('[data-rename-input]');
    if (box) {
      box.focus();
      box.select();
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishRename(box.dataset.renameInput, box.value);
        if (e.key === 'Escape') finishRename(box.dataset.renameInput, null);
      });
      box.addEventListener('blur', () => finishRename(box.dataset.renameInput, box.value));
    }
    const paint = PAINTS.find(p => p.color === decor.paint);
    const wall = hasInside() && PAINTS.find(p => p.color === decor.wallPaint);
    $('inventory-hint').textContent = (paint ? `The ${buildingWord()} is painted ${paint.name}.` : `The ${buildingWord()} still wears its original paint.`) +
      (wall ? ` Inside, the walls are ${wall.name}.` : '') +
      (outKeys().length || insideKeys().length ? ' Drag any decor in the picture to a new spot.' : '');
    drawAppeal();
  }

  // The star rating in the header: how inviting the shop looks, out of five. Hovering
  // the stars shows today's forecast: how many customers to expect and what would help.
  function drawAppeal() {
    const expected = Math.round(expectedCustomersToday());
    const d = state.decor;
    const missing = [];
    if (!d.paint) missing.push('a coat of paint');
    if (!isOut('sign')) missing.push('the chalkboard out front');
    if (!outKeys().some(k => k.startsWith('plant:'))) missing.push('a plant by the door');
    if (!isOut('bench')) missing.push('a bench to sit on');
    if (hasInside() && !insideKeys().length) missing.push('something cozy inside');
    const season = SEASON_FOOTFALL[seasonName()];
    const seasonNote = season > 1 ? ' Summer crowds help.' : season < 1 ? ' Winter is quiet.' : '';
    const fill = shelfFill();
    const stockNote = fill >= 0.9 ? ' Full shelves draw them in.' : fill >= 0.5 ? ` Shelves ${Math.round(fill * 100)}% full: some walk on by.` : fill > 0 ? ` Shelves only ${Math.round(fill * 100)}% full: most walk on by.` : ' Empty shelves. Hardly anyone stops.';
    const lit = Math.round((appeal() - 1) / (APPEAL.max - 1) * 5);
    const note = $('appeal-note');
    note.querySelector('.stars').innerHTML = '\u2605'.repeat(lit) + `<span class="dim">${'\u2605'.repeat(5 - lit)}</span>`;
    note.dataset.tip = `About ${expected} ${expected === 1 ? 'customer' : 'customers'} a day.${seasonNote}${stockNote}` +
      (missing.length ? ` More would come for ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : ' The shop is as inviting as it gets.');
    note.setAttribute('aria-label', `${lit} of 5 stars. ${note.dataset.tip}`);
  }

  // The decor in the view on screen: what stands out front, or what stands inside.
  function drawDecor() {
    const group = $('scene').querySelector('svg .decor');
    if (!group) return;
    const xs = zoneXs();
    const scale = personScale() * 0.75;
    let out = '';
    // Each occupied spot draws its item. Items can be dragged to another spot.
    zoneIds().forEach((id, i) => {
      const key = zoneSpots()[id];
      if (!key) return;
      const x = xs[i], y = Scenes.GROUND_Y;
      const art = key === 'sign' ? Scenes.chalkboard(x, y, scale) : key === 'bench' ? Scenes.bench(x, y, scale) : key === 'chair' ? Scenes.adirondack(x, y, scale) : key === 'lamp' ? Scenes.lamppost(x, y, scale)
        : isIndoorOnly(key) ? Scenes.indoorItem(key.slice(7), x, y, scale) : Scenes.plant(key.slice(6), x, y, scale);
      out += `<g class="decor-item" data-decor="${key}"><title>${itemName(key)} (drag to move)</title>${art}</g>`;
    });
    group.innerHTML = out;
    if (out.includes('lamp-glow')) applyDaylight(true);   // light the lamppost for the time of day
    // The shop name in chalk: one line if short, otherwise split at a space near the middle.
    const chalk = group.querySelector('.chalk');
    const line2 = group.querySelector('.chalk-line2');
    if (chalk && line2) {
      const name = state.shopName.length > 26 ? state.shopName.slice(0, 25) + '\u2026' : state.shopName;
      if (name.length <= 11) {
        chalk.setAttribute('y', -18); chalk.setAttribute('font-size', 6); chalk.textContent = name; line2.textContent = '';
      } else {
        const words = name.split(' ');
        let first = '', rest = name;
        if (words.length > 1) {
          let best = 1, bestDiff = Infinity;
          for (let i = 1; i < words.length; i++) {
            const a = words.slice(0, i).join(' ').length, b = words.slice(i).join(' ').length;
            if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
          }
          first = words.slice(0, best).join(' '); rest = words.slice(best).join(' ');
        } else { first = name.slice(0, Math.ceil(name.length / 2)); rest = name.slice(Math.ceil(name.length / 2)); }
        const size = Math.max(first.length, rest.length) > 13 ? 3.8 : 4.8;
        chalk.setAttribute('y', -21.5); chalk.setAttribute('font-size', size); chalk.textContent = first;
        line2.setAttribute('font-size', size); line2.textContent = rest;
      }
    }
  }

  // The order form: today's catalog and what is on its way. Boxes on the step are
  // opened by clicking them in the picture.
  function drawOrderForm() {
    const items = (state.catalogue && state.catalogue.items) || [];
    const list = $('catalogue');
    if (!items.length) {
      list.innerHTML = `<li><span class="empty">The van didn\u2019t come today. Nothing on offer.</span></li>`;
    } else {
      list.innerHTML = items.map(item => {
        const kind = item.kind || 'books';
        const descriptor = kind === 'pet' ? PET_KINDS[item.pet.kind].meta
          : kind === 'plant' ? (PLANT_META[item.plant] || 'terracotta pot')
          : kind === 'indoor' ? (indoorInfo(item.indoor).meta || 'for inside')
          : kind === 'books' ? (item.mystery ? 'size unknown' : `${item.books} books`)
          : (DECOR_META[kind] || 'for out front');
        const meta = `${descriptor} \u00b7 ${item.price} coins`;
        const icon = kind === 'paint' ? ICONS.paint(item.color) : kind === 'sign' ? ICONS.sign() : kind === 'bench' ? ICONS.bench() : kind === 'chair' ? ICONS.chair() : kind === 'lamp' ? ICONS.lamp() : kind === 'pet' ? ICONS.pet(item.pet) : kind === 'indoor' ? ICONS.indoor(item.indoor) : kind === 'plant' ? ICONS.plant(item.plant || 'snake') : item.mystery ? ICONS.mystery() : ICONS.books();
        const action = item.ordered
          ? `<span class="ordered">Ordered \u2713</span>`
          : `<button class="button small primary" data-order="${item.id}" ${state.coins < item.price ? 'disabled' : ''}>Order</button>`;
        return `<li><div class="item-row">${icon}<div><span class="item-name${item.mystery ? ' mystery' : ''}">${item.name}</span><span class="item-meta">${meta}</span></div></div>${action}</li>`;
      }).join('');
    }
    const pending = $('orders-pending');
    pending.innerHTML = state.orders.length
      ? `<h4>On the way</h4><ul>${state.orders.map(o => `<li><span>${o.name}${(o.mystery || (o.kind && o.kind !== 'books')) ? '' : ` (${o.books} books)`}</span><span class="ordered">${o.arrives <= dayIndex() ? 'tonight' : 'tomorrow night'}</span></li>`).join('')}</ul>`
      : '';
  }

  // The two sub-tabs on the shop card.
  function showTab(name) {
    document.querySelectorAll('.subtab').forEach(b => {
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('tab-order').classList.toggle('hidden', name !== 'order');
    $('tab-inventory').classList.toggle('hidden', name !== 'inventory');
  }

  // Boxes outside the shop. Only drawn in the outside view; the form lists them either way.
  function drawDeliveries() {
    const group = $('scene').querySelector('svg .deliveries');
    if (!group) return;
    if (state.view === 'inside') { group.innerHTML = ''; return; }
    const size = Math.max(22, 16 * personScale());
    const x0 = Scenes.deliveryXFor(state.building);
    group.innerHTML = state.deliveries.map((d, i) =>
      Scenes.deliveryBox(x0 + i * (size + 6), Scenes.GROUND_Y, size, d.id, d.mystery ? '?' : d.kind === 'pet' ? '\u2665' : (d.kind && d.kind !== 'books') ? '\u2605' : d.books)
    ).join('');
    if (!state.clock.night) group.querySelectorAll('.delivery-box').forEach(b => b.classList.add('waiting'));
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
    $('upgrade-title').textContent = UPGRADE_COPY[goal.next].title;
    $('upgrade-intro').textContent = UPGRADE_COPY[goal.next].intro;
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
      drawBooksInto(svg, full, id, 'outside');
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
    // The back room comes too; if the new shelves have room, fill them from it.
    let reserve = (state.reserve || 0) + Math.max(0, carried.length - b.capacity);
    for (let i = 0; i < books.length && reserve > 0; i++) { if (!books[i]) { books[i] = randomFrom(BOOK_COLORS); reserve -= 1; } }
    state.reserve = reserve;

    state.coins -= goal.cost;
    state.stage = b.stage;
    state.building = b.id;
    state.location = b.location;
    state.books = books;
    state.view = 'outside';
    state.decor.paint = null;             // the new place wears its own paint until you change it
    state.decor.wallPaint = null;         // inside and out
    addLog(MOVING_IN[b.id] || `Moved into the ${b.name.toLowerCase()}.`);
    if (state.decor.paints.length) addLog('The paint buckets came too, sloshing hopefully. The new walls could use them.');
    const pets = state.decor.pets || [];
    if (pets.length >= PET_CROWD_FROM) addLog(`All ${pets.length} pets came along. It\u2019s giving \u201ccrazy cat lady\u201d\u2026`);
    else if (pets.length > 3) addLog(`All ${pets.length} pets came along and immediately claimed the best spots.`);
    else if (pets.length) addLog(`${namesList(pets.map(p => p.name))} came along and immediately claimed the best spots.`);
    bumpLifetime(life => { life.upgrades += 1; life.furthestStage = Math.max(life.furthestStage || 1, b.stage); });
    save();
    reportProgress();

    customers = [];                       // the old crowd stays behind
    nextSpawnAt = performance.now() + 1500;
    showScreen('game-screen');
    setStageText();
    drawScene();
    drawHud();
    drawInventory();
    drawLog();
    drawGoal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Admire the outside for a moment, then get pulled in through the door.
    if (b.interior) setTimeout(enterBuilding, 1800);
  }

  // ---- Stepping inside and out ----
  // Entering zooms the picture toward the door and fades to the interior.
  function enterBuilding() {
    const b = building();
    if (!b.interior || state.view === 'inside') return;
    const scene = $('scene');
    scene.style.setProperty('--door-x', (b.door.x / Scenes.VIEW.width * 100) + '%');
    scene.style.setProperty('--door-y', (b.door.y / Scenes.VIEW.height * 100) + '%');
    scene.classList.add('entering');
    setTimeout(() => {
      state.view = 'inside';
      switchView();
      scene.classList.remove('entering');
    }, 900);
  }
  function exitBuilding() {
    if (state.view !== 'inside') return;
    state.view = 'outside';
    switchView();
  }
  function switchView() {
    customers = [];
    nextSpawnAt = performance.now() + 1200;
    drawScene();
    drawDate();           // the Begin Day hint depends on whether we are inside or out
    const scene = $('scene');
    scene.classList.remove('arriving');
    void scene.offsetWidth;               // restart the animation
    scene.classList.add('arriving');
    setTimeout(() => scene.classList.remove('arriving'), 800);
    save();
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
      if (!data.view) data.view = data.stage >= 3 ? 'inside' : 'outside';
      if (!data.clock) data.clock = freshClock();
      if (typeof data.clock.night !== 'boolean') data.clock.night = false;
      if (!Array.isArray(data.orders)) data.orders = [];
      if (!Array.isArray(data.deliveries)) data.deliveries = [];
      if (!data.catalogue) data.catalogue = null;
      if (!data.decor) data.decor = freshDecor();
      if (typeof data.reserve !== 'number') data.reserve = 0;
      // Earlier saves counted plants and buckets; now they are lists of kinds and colors.
      if (typeof data.decor.plants === 'number') {
        data.decor.plants = data.decor.plants > 0 ? ['snake'] : [];
        data.decor.plantOut = data.decor.plantOut ? 'snake' : null;
      }
      if (Array.isArray(data.decor.paints)) data.decor.paints = data.decor.paints.filter((c, i, a) => a.indexOf(c) === i);
      if (!Array.isArray(data.decor.pets)) data.decor.pets = [];
      if (typeof data.decor.bench !== 'number') data.decor.bench = 0;
      if (typeof data.decor.chair !== 'number') data.decor.chair = 0;
      if (typeof data.decor.lamp !== 'number') data.decor.lamp = 0;
      // Saves from before decor spots: one sign spot, one plant spot, a bench beside the
      // plant. Put each item that was out into the nearest of the new spots, then drop
      // the old flags.
      if (!data.decor.spots) {
        const d = data.decor;
        const xs = Scenes.decorSlotsFor(data.building);
        const b = Scenes.BUILDINGS[data.building] || {};
        const legacy = { sign: b.legacySignX, plant: b.legacyPlantX };
        const ids = slotIds(data.building);
        const sp = freshSpots(data.building);
        const nearestFree = (x) => {
          const order = ids.map((id, i) => ({ id, dist: Math.abs(xs[i] - (x == null ? 400 : x)) })).sort((p, q) => p.dist - q.dist);
          return (order.find(o => !sp[o.id]) || {}).id || null;
        };
        if (d.signOut && d.signs > 0) { const id = nearestFree(legacy.sign); if (id) sp[id] = 'sign'; }
        if (d.plantOut && (d.plants || []).includes(d.plantOut)) { const id = nearestFree(legacy.plant); if (id) sp[id] = 'plant:' + d.plantOut; }
        if (d.benchOut && d.bench > 0) { const id = nearestFree(legacy.plant == null ? null : legacy.plant + (legacy.plant < legacy.sign ? -62 : 62)); if (id) sp[id] = 'bench'; }
        d.spots = sp;
        delete d.signOut; delete d.plantOut; delete d.benchOut;
      }
      slotIds(data.building).forEach(id => { if (!(id in data.decor.spots)) data.decor.spots[id] = null; });
      if (!Array.isArray(data.decor.petsOut)) data.decor.petsOut = [];
      // Saves from before indoor decor: nothing owned for inside, every inside spot empty.
      if (!Array.isArray(data.decor.indoor)) data.decor.indoor = [];
      if (!data.decor.insideSpots) data.decor.insideSpots = {};
      if (data.decor.wallPaint === undefined) data.decor.wallPaint = null;   // and before painting inside
      insideSlotIds(data.building).forEach(id => { if (!(id in data.decor.insideSpots)) data.decor.insideSpots[id] = null; });
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

  // ---- Sketch mode: the hand-painted look, on by default, remembered per device ----
  const SKETCH_KEY = 'saltyJellyfish.sketch';
  function sketchOn() {
    try { return localStorage.getItem(SKETCH_KEY) !== 'off'; } catch (e) { return true; }
  }
  function applySketch(on) {
    document.body.classList.toggle('sketch', on);
    $('style-toggle').textContent = on ? 'Sketch: on' : 'Sketch: off';
    try { localStorage.setItem(SKETCH_KEY, on ? 'on' : 'off'); } catch (e) { /* fine */ }
  }

  // =========================================================
  // Wire up the buttons and go.
  // =========================================================
  // The header (big title, stage and next goal) can be folded to one slim line with the caret.
  // Open by default; the choice is remembered in this browser like the sketch setting.
  const HEADER_KEY = 'saltyJellyfish.header';
  function applyHeader(open) {
    $('site-header').classList.toggle('collapsed', !open);
    const toggle = $('header-toggle');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.title = open ? 'Hide the title, stage, and goal' : 'Show the title, stage, and goal';
    try { localStorage.setItem(HEADER_KEY, open ? 'open' : 'closed'); } catch (e) { /* fine */ }
  }
  function headerOpen() {
    try { return localStorage.getItem(HEADER_KEY) !== 'closed'; } catch (e) { return true; }
  }

  // The Stats card under the journal: folded by default, remembered per browser. The
  // numbers refresh when it opens and every half minute while it stays open.
  const STATS_KEY = 'saltyJellyfish.stats';
  let statsTimer = null;
  function refreshStats() { if (window.SaltyStats) window.SaltyStats.render(); }
  function applyStats(open) {
    $('stats-panel').classList.toggle('collapsed', !open);
    $('stats-body').classList.toggle('hidden', !open);
    $('stats-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    try { localStorage.setItem(STATS_KEY, open ? 'open' : 'closed'); } catch (e) { /* fine */ }
    clearInterval(statsTimer);
    if (open) { refreshStats(); statsTimer = setInterval(refreshStats, 30000); }
  }
  function statsOpen() {
    try { return localStorage.getItem(STATS_KEY) === 'open'; } catch (e) { return false; }
  }

  function init() {
    applySketch(sketchOn());
    applyStats(statsOpen());
    $('stats-toggle').addEventListener('click', () => applyStats($('stats-panel').classList.contains('collapsed')));
    applyHeader(headerOpen());
    $('header-toggle').addEventListener('click', () => applyHeader($('site-header').classList.contains('collapsed')));
    $('rename-shop').addEventListener('click', startShopRename);
    $('style-toggle').addEventListener('click', () => applySketch(!document.body.classList.contains('sketch')));
    $('footnote-text').textContent = randomFrom(FOOTNOTES.lfl);
    buildSetupScreen();
    // The shop card's sub-tabs.
    document.querySelectorAll('.subtab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    // One listener for the whole form: Order buttons and Open buttons.
    $('game-screen').addEventListener('click', (e) => {
      const order = e.target.closest('[data-order]');
      if (order) { placeOrder(order.dataset.order); return; }
      const open = e.target.closest('[data-open]');
      if (open) { openDelivery(open.dataset.open); return; }
      const paint = e.target.closest('[data-paint]');
      if (paint) { paintBuilding(paint.dataset.paint, paint.dataset.where); return; }
      const shelve = e.target.closest('[data-shelve]');
      if (shelve) { shelveReserve(); return; }
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) { toggleDecor(toggle.dataset.toggle, toggle.dataset.plant || toggle.dataset.indoor, toggle.dataset.pet, toggle.dataset.where); return; }
      const rename = e.target.closest('[data-rename]');
      if (rename) { startRename(rename.dataset.rename); return; }
    });
    // Clicking a box in the scene opens it.
    $('scene').addEventListener('click', (e) => {
      const box = e.target.closest('.delivery-box');
      if (box) { openDelivery(box.dataset.id); return; }
    });
    // Dragging decor between spots.
    $('scene').addEventListener('pointerdown', startDecorDrag);
    window.addEventListener('pointermove', moveDecorDrag);
    window.addEventListener('pointerup', endDecorDrag);
    window.addEventListener('pointercancel', endDecorDrag);
    $('reset-button').addEventListener('click', reset);
    $('upgrade-button').addEventListener('click', openUpgradeScreen);
    $('confirm-upgrade').addEventListener('click', confirmUpgrade);
    $('cancel-upgrade').addEventListener('click', () => showScreen('game-screen'));
    $('view-toggle').addEventListener('click', () => (state.view === 'inside' ? exitBuilding() : enterBuilding()));
    $('next-day-button').addEventListener('click', beginDay);
  }

  init();
})();
