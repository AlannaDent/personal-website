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
  // A gentle wash of colour over the scene for each season (colour, opacity outside, opacity inside).
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
    'Box of paperbacks', 'Crate of hardbacks', 'Remainders from Hyannis', 'A neighbour\u2019s estate',
    'Publisher\u2019s overstock', 'Library discards, good ones', 'Yard-sale haul', 'Returns from the ferry kiosk'
  ];
  const MYSTERY_CHANCE = 0.15;                    // a mystery box hides its size until opened
  // How the three slots are filled each morning: a book box almost always in the first,
  // decor most of the time in the others, and now and then a pet.
  const BOOK_SLOT_CHANCE = 0.95;                  // slot one carries a book box
  const DECOR_SLOT_CHANCE = 0.7;                  // slots two and three carry decor when there is any left to buy
  const SPARE_BOOK_CHANCE = 0.5;                  // otherwise, another book box (else the slot is empty)
  const PET_DAILY_CHANCE = 0.15;                  // about one or two pets a season
  const MAX_PETS = 3;

  // Pets. Colours and names are chosen when the pet is offered.
  const PET_KINDS = {
    cat: { name: 'cat', price: 30, colors: ['white', 'black', 'tuxedo', 'gray', 'brown', 'tabby'], meta: 'wants the sunny shelf', speed: 34 },
    dog: { name: 'dog', price: 35, colors: ['brown', 'black', 'white', 'yellow'], meta: 'good with customers, they say', speed: 50 },
    crab: { name: 'crab', price: 20, colors: ['red'], meta: 'red, obviously', speed: 24 }
  };
  const PET_COLOR_NAMES = { white: 'White', black: 'Black', tuxedo: 'Tuxedo', gray: 'Grey', brown: 'Brown', tabby: 'Tabby', yellow: 'Yellow lab', red: 'Red' };
  const PET_NAMES = ['Biscuit', 'Mabel', 'Captain', 'Pickles', 'Scallop', 'Fog', 'Barnacle', 'Marlow', 'Pippin', 'Hazel', 'Otis', 'Juniper', 'Wendell', 'Clementine', 'Gus', 'Nell', 'Salty', 'Moby', 'Quahog', 'Tilly'];
  const PET_ADOPTED = {
    cat: ['has opinions about the top shelf.', 'chose the window seat within a minute.', 'inspected every box and approved none.'],
    dog: ['greeted three customers before lunch.', 'has already found the warmest patch of floor.', 'wagged at the van. Wags at everything.'],
    crab: ['scuttled under the counter and claimed it.', 'is red, obviously.', 'clicked at a customer. Friendly, we think.']
  };
  const PET_GREET_LINES = ['stopped to pet {pet}.', 'crouched down to say hello to {pet}.', 'was thoroughly inspected by {pet}.'];
  const PET_PLAY_LINES = ['{a} and {b} chased each other round the sign.', '{a} and {b} were caught playing when they should have been napping.', '{a} tried to teach {b} a game. {b} had a different game in mind.'];
  const PET_NAP_LINES = ['{pet} napped in the sun for most of the afternoon.', '{pet} slept on the doorstep and had to be stepped over.', '{pet} found the one warm spot and kept it.'];
  const PAINTS = [
    { color: '#a5443a', name: 'Cranberry' },
    { color: '#2f6f6a', name: 'Harbour Teal' },
    { color: '#d9a441', name: 'Mustard' },
    { color: '#2b3f5c', name: 'Nantucket Navy' },
    { color: '#d98c9c', name: 'Hydrangea Pink' }
  ];
  const PLANTS = [
    { kind: 'snake', name: 'Snake plant', price: 8, line: 'Set it by the door. Very hard to kill, apparently.' },
    { kind: 'monstera', name: 'Monstera', price: 14, line: 'Enormous leaves. Already reaching for the window.' },
    { kind: 'spider', name: 'Spider plant', price: 7, line: 'Came with three babies dangling off it. Free plants.' },
    { kind: 'orchid', name: 'Orchid', price: 12, line: 'Pink blooms. Instructions say “benign neglect”. Can do.' },
    { kind: 'zz', name: 'ZZ plant', price: 10, line: 'Glossy, upright, unbothered. Thrives on being ignored.' },
    { kind: 'inch', name: 'Inch plant', price: 6, line: 'Purple and striped, already trailing over the rim. Grows an inch a week, allegedly.' },
    { kind: 'fern', name: 'Fern', price: 9, line: 'Wants mist and shade. The Cape can manage the mist.' }
  ];
  const DECOR_ITEMS = PAINTS.map(p => ({ kind: 'paint', name: `${p.name} paint`, color: p.color, colorName: p.name, price: 12 })).concat(
    [{ kind: 'sign', name: 'Chalkboard sign', price: 15 }],
    PLANTS.map(pl => ({ kind: 'plant', plant: pl.kind, name: pl.name, price: pl.price }))
  );
  // Small pictures for the order form and inventory.
  const ICONS = {
    books: () => `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="5" height="13" fill="#b7736b"/><rect x="9" y="4" width="5" height="16" fill="#6f8a99"/><rect x="15" y="9" width="5" height="11" fill="#a9a06b"/><rect x="3" y="20" width="17" height="1.5" fill="#8a7460"/></svg>`,
    mystery: () => `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" fill="#c9a97a" stroke="#8a6a48"/><rect x="10" y="7" width="4" height="13" fill="#e9e2cf"/><text x="12" y="17" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#5c5b56">?</text></svg>`,
    paint: (color) => `<svg class="icon" viewBox="0 0 24 24"><path d="M5 9h14l-1.6 11H6.6z" fill="${color}" stroke="#8a8f94" stroke-width="0.8"/><rect x="4" y="7" width="16" height="3" rx="0.6" fill="#8a8f94"/><path d="M8 7a4 4 0 0 1 8 0" stroke="#8a8f94" stroke-width="1.5" fill="none"/></svg>`,
    sign: () => `<svg class="icon" viewBox="0 0 24 24"><polygon points="7,3 17,3 20,21 4,21" fill="#7d6b58"/><rect x="7.5" y="5" width="9" height="10" fill="#2f3a36"/><line x1="9.5" y1="9" x2="14.5" y2="9" stroke="#f4efe4" stroke-width="1"/><line x1="10" y1="12" x2="14" y2="12" stroke="#f4efe4" stroke-width="0.8" opacity="0.7"/></svg>`,
    pet: (pet) => `<svg class="icon" viewBox="-16 -26 32 30">${Scenes.petSvg(pet, 'sit')}</svg>`,
    plant: (kind) => ({
      snake: `<svg class="icon" viewBox="0 0 24 24"><path d="M8 21l1-7h6l1 7z" fill="#b8734f"/><g fill="#4f7a4a" stroke="#d9c46a" stroke-width="0.5"><path d="M10 14q-2-5 0-11q2 6 1 11z"/><path d="M13 14q2-6 1-12q-3 6-2 12z"/><path d="M11.5 14q-1-7 1-13q1 7 0 13z"/></g></svg>`,
      monstera: `<svg class="icon" viewBox="0 0 24 24"><path d="M8 21l1-6h6l1 6z" fill="#8a8f94"/><g fill="#3f6b3a"><ellipse cx="8" cy="9" rx="4" ry="5" transform="rotate(-25 8 9)"/><ellipse cx="16" cy="9" rx="4" ry="5" transform="rotate(25 16 9)"/><ellipse cx="12" cy="6" rx="3.5" ry="5"/></g><g stroke="#c9d9b8" stroke-width="0.8"><line x1="12" y1="2" x2="12" y2="10"/><line x1="8" y1="5" x2="8" y2="13"/><line x1="16" y1="5" x2="16" y2="13"/></g></svg>`,
      spider: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-5h4l1 5z" fill="#e9e2cf"/><g stroke="#7fa563" stroke-width="2" fill="none" stroke-linecap="round"><path d="M12 16q-6-4-9-2"/><path d="M12 16q6-4 9-2"/><path d="M12 16q-4-7-2-11"/><path d="M12 16q4-7 2-11"/><path d="M12 16q0-8 0-12"/></g></svg>`,
      orchid: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-4h4l1 4z" fill="#dfe8ea"/><path d="M12 17q1-8 5-13" stroke="#4f7a4a" stroke-width="1.2" fill="none"/><g fill="#d98c9c"><circle cx="15" cy="9" r="2.6"/><circle cx="17.5" cy="4.5" r="2.4"/><circle cx="13" cy="13" r="2.2"/></g><g fill="#b6413a"><circle cx="15" cy="9" r="0.8"/><circle cx="17.5" cy="4.5" r="0.7"/><circle cx="13" cy="13" r="0.7"/></g><path d="M11 17q-5-1-6-5q4 0 6 5z" fill="#4f7a4a"/></svg>`,
      zz: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-5h4l1 5z" fill="#3a3f44"/><g stroke="#2f5230" stroke-width="1" fill="none"><path d="M12 16q-2-6-4-12"/><path d="M12 16q2-6 4-12"/></g><g fill="#3f6b3a"><ellipse cx="9" cy="6" rx="2.2" ry="1.2" transform="rotate(-30 9 6)"/><ellipse cx="10" cy="10" rx="2.2" ry="1.2" transform="rotate(-30 10 10)"/><ellipse cx="15" cy="6" rx="2.2" ry="1.2" transform="rotate(30 15 6)"/><ellipse cx="14" cy="10" rx="2.2" ry="1.2" transform="rotate(30 14 10)"/><ellipse cx="11" cy="13" rx="2" ry="1.1" transform="rotate(-30 11 13)"/><ellipse cx="13" cy="13" rx="2" ry="1.1" transform="rotate(30 13 13)"/></g></svg>`,
      inch: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-6h4l1 6z" fill="#e9e2cf" stroke="#b5aea0" stroke-width="0.5"/><g fill="#6b4f8a"><ellipse cx="7" cy="12" rx="4" ry="1.6" transform="rotate(-40 7 12)"/><ellipse cx="17" cy="12" rx="4" ry="1.6" transform="rotate(40 17 12)"/><ellipse cx="12" cy="8" rx="4" ry="1.6"/><ellipse cx="5" cy="17" rx="3.5" ry="1.5" transform="rotate(-80 5 17)"/><ellipse cx="19" cy="17" rx="3.5" ry="1.5" transform="rotate(80 19 17)"/></g><g stroke="#9fd0c4" stroke-width="0.6"><line x1="9" y1="8" x2="15" y2="8"/><line x1="5" y1="14" x2="9" y2="10"/><line x1="19" y1="14" x2="15" y2="10"/></g></svg>`,
      fern: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 21l1-5h4l1 5z" fill="#b8734f"/><g stroke="#4f7a4a" stroke-width="0.9" fill="none"><path d="M12 16q-5-4-8-10"/><path d="M12 16q5-4 8-10"/><path d="M12 16q0-6 0-12"/></g><g fill="#6a955f"><ellipse cx="8" cy="10" rx="2" ry="0.8" transform="rotate(-50 8 10)"/><ellipse cx="6" cy="8" rx="2" ry="0.8" transform="rotate(-50 6 8)"/><ellipse cx="16" cy="10" rx="2" ry="0.8" transform="rotate(50 16 10)"/><ellipse cx="18" cy="8" rx="2" ry="0.8" transform="rotate(50 18 8)"/><ellipse cx="11" cy="9" rx="2" ry="0.8" transform="rotate(-30 11 9)"/><ellipse cx="13" cy="9" rx="2" ry="0.8" transform="rotate(30 13 9)"/><ellipse cx="11" cy="6" rx="1.6" ry="0.7" transform="rotate(-30 11 6)"/><ellipse cx="13" cy="6" rx="1.6" ry="0.7" transform="rotate(30 13 6)"/></g></svg>`
    }[kind] || '')
  };

  // Journal lines for a new day, by season.
  const DAY_LINES = {
    Spring: ['Hydrangeas thinking about it.', 'Fog until ten, then glorious.', 'First tourists of the year, blinking.', 'Peepers loud in the marsh tonight.'],
    Summer: ['Tourists. So many tourists.', 'Band concert on the green tonight.', 'Sand in the till again.', 'Sold out of beach reads by noon.'],
    Autumn: ['Cranberry bogs going red.', 'The light is gold and everyone is calm.', 'Half the shops shuttered for the season. Not us.', 'Sweater weather. Reading weather.'],
    Winter: ['Fog, then snow, then fog.', 'Two customers. Both regulars. Both lovely.', 'The harbour froze at the edges.', 'Wind off the water. Kettle on.']
  };
  // What the journal says at closing time, by season.
  const NIGHT_LINES = {
    Spring: ['Peepers loud in the marsh.', 'Fog rolling back in off the water.', 'Left the porch light on for the moths.'],
    Summer: ['Fireflies over the green.', 'Band concert still going somewhere.', 'Warm enough to read on the step.'],
    Autumn: ['Woodsmoke. Somebody\u2019s first fire of the year.', 'Dark by supper now.', 'Wind knocking the sign about.'],
    Winter: ['Snow starting. Quietest sound there is.', 'Harbour lights and not much else.', 'Kettle, blanket, a chapter or two.']
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
    Spring: 'Spring arrived. The town shook itself off.',
    Summer: 'Summer arrived, and with it the whole eastern seaboard.',
    Autumn: 'Autumn arrived. The tourists left. The books stayed.',
    Winter: 'Winter arrived. Fog rolled in and settled on the shelves.'
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
      intro: 'The shed did its job. Pick a house on the high street to turn into a proper bookshop. Each holds two hundred and fifty books, and the neighbours match. Your books and your name come with you.'
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
  const APPEAL = { paint: 0.4, sign: 0.5, plantOut: 0.3, extraPlant: 0.1, max: 2.2 };
  const SEASON_FOOTFALL = { Spring: 1.0, Summer: 1.3, Autumn: 1.0, Winter: 0.7 };
  const BUY_CHANCE = 0.85;                // the rest browse and leave, when the shelves are full
  // Well-stocked shelves draw people in. At empty shelves footfall falls to STOCK_FLOOR of
  // normal and buying to BUY_FLOOR of normal; both scale up smoothly to full shelves.
  const STOCK_FLOOR = 0.35;
  const BUY_FLOOR = 0.55;
  const THIN_SHELF_LINES = [
    'Shelves looked a bit thin. Said they\u2019d come back.', 'Peered at the gaps on the shelves and drifted off.',
    'Found nothing that grabbed them. Not much to grab.', 'Asked when the next delivery was.'
  ];
  const BROWSED_LINES = [
    'Browsed every shelf. Bought nothing. Smiled anyway.', 'Read half a chapter standing up, then put it back.',
    'Asked if we had it in paperback. We did not.', 'Just looking, thanks. Looked for a long time.',
    'Photographed the shop. Did not buy the book.', 'Left a bookmark in something. Will be back for it, probably.'
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
      'The gangplank is the only queue we have.',
      'Books below decks. Gulls above. Do not feed the gulls.'
    ]
  };

  // Faded book colours to match the weathered buildings.
  const BOOK_COLORS = ['#b7736b', '#6f8a99', '#a9a06b', '#7d9a7a', '#9b7f9c', '#c2a37c', '#8c8c8c', '#b39a5b', '#8f6f5a'];

  // The books customers buy come from books.js: 500 widely held novels (OCLC
  // WorldCat) and 96 nonfiction classics (the Guardian). Real titles, real authors.

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
    garage: 'Moved into the garage down the block. A hundred slots. The oil stain stays.',
    'dutch-colonial': 'Moved into the Dutch colonial on the high street. Two hundred and fifty slots. A real shop. Painted the door blue anyway.',
    'cape-cod': 'Moved into the Cape on the high street. Two hundred and fifty slots. A real shop. The cat approves.',
    tudor: 'Moved into the Tudor on the high street. Two hundred and fifty slots. A real shop. The door creaked a welcome.',
    church: 'Moved into the old church on the green. Five hundred slots. The bell rang once, on its own.',
    lighthouse: 'Moved into the lighthouse. Five hundred slots and the whole sea for a window. The light still turns.',
    ship: 'Moved aboard the schooner at the town dock. Five hundred slots below decks. The floor moves. Slightly.'
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
  //   state.catalogue : { dayIndex, items: [{ id, name, books, price, mystery, ordered }] }
  //   state.orders    : boxes paid for and on their way: [{ id, name, books, mystery, arrives (dayIndex) }]
  //   state.deliveries: boxes outside the shop, waiting to be opened: [{ id, name, books, mystery, kind, color }]
  //   state.decor     : what the shop owns and shows: { paint (colour on the walls or null),
  //                     paints: [colours owned, kept for good], signs, signOut,
  //                     plants: [plant kinds owned], plantOut (the kind out front, or null),
  //                     pets: [{ id, kind, color, name }], petsOut: [ids out and about] }
  //   state.coins     : money in the tin
  //   state.books     : one entry per slot, each a colour (a book) or null (empty)
  //   state.reserve   : books in the back room, not yet on a shelf
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
  // How inviting the shop looks, from 1 (bare) to APPEAL.max (everything out front).
  function appeal() {
    const d = state.decor || freshDecor();
    let a = 1;
    if (d.paint) a += APPEAL.paint;
    if (d.signOut) a += APPEAL.sign;
    if (d.plantOut) a += APPEAL.plantOut;
    a += APPEAL.extraPlant * Math.max(0, (d.plants || []).length - 1);
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
  function freshDecor() { return { paint: null, paints: [], signs: 0, signOut: false, plants: [], plantOut: null, pets: [], petsOut: [] }; }
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
      const name = $('shop-name').value.trim() || DEFAULT_SHOP_NAME;
      state = freshState(name, chosenLocation);
      addLog(`Opened ${name} today. ${capacity()} books. High hopes. Spring, Year 1.`);
      bumpLifetime(life => { life.shopsOpened += 1; });
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
    $('scene').innerHTML = Scenes.render(state.location, state.building, state.view, state.decor.paint);
    const svg = $('scene').querySelector('svg');
    drawBooksInto(svg, state.books, state.building, state.view);
    drawDecor();
    syncPets();
    const plate = svg.querySelector('.box-sign:not(.chalk)');
    if (plate) fitSign(plate, state.shopName, state.building);
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
    $('hud-name').title = `${state.shopName} \u00b7 ${state.sold} sold all time`;
    $('hud-coins').textContent = state.coins;
    $('hud-stock').textContent = `${booksInStock()} / ${capacity()}` + (state.reserve ? ` +${state.reserve}` : '');
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
      // The hint lives on the wrapper, so it shows even while the button is greyed out.
      $('next-day-wrap').dataset.tip = waiting ? 'Don\u2019t forget to open your packages!' : '';
    }
    $('next-day-wrap').classList.toggle('hidden', !night);
    drawNightTip();
  }

  // Mix two hex colours. t is 0 for a, 1 for b.
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
      color = '#1f2a5a'; opacity = inside ? 0.22 : 0.58; starOpacity = inside ? 0 : 0.9; glowOpacity = inside ? 0 : 0.8;
    } else if (t < 0.12) {                                  // sunrise: warm and fading
      color = '#f6b98a'; opacity = 0.28 * (1 - t / 0.12);
    } else if (t < 0.72) {                                  // daytime: clear
      opacity = 0;
    } else if (t < 0.92) {                                  // sunset: gold deepening to violet
      const u = (t - 0.72) / 0.2;
      color = mixColor('#f6a86a', '#8a5a8a', u); opacity = 0.06 + 0.26 * u;
      glowOpacity = inside ? 0 : 0.35 * u;
    } else {                                                // dusk: settling into night
      const u = (t - 0.92) / 0.08;
      color = mixColor('#8a5a8a', '#1f2a5a', u); opacity = 0.32 + 0.24 * u;
      starOpacity = inside ? 0 : 0.9 * u; glowOpacity = inside ? 0 : 0.35 + 0.45 * u;
    }
    if (inside && !state.clock.night) opacity *= 0.45;
    wash.setAttribute('fill', color);
    wash.setAttribute('opacity', opacity.toFixed(3));
    stars.setAttribute('opacity', starOpacity.toFixed(2));
    glow.setAttribute('opacity', glowOpacity.toFixed(2));
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
    addLog(`Closed up for the night. ${randomFrom(NIGHT_LINES[seasonName()])}`);
    deliverOrders();
    reportProgress();
    drawLog();
    drawOrderForm();
    drawDeliveries();
    drawDate();
    applyDaylight(true);
    save();
    lastClockSave = now || performance.now();
  }

  // Sunrise: the player begins the next day. The van comes, the catalogue changes.
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
        addLog(`Year ${c.year}. Still here. Still open.`);
      }
      addLog(SEASON_LINES[seasonName()]);
      applySeasonTint();
    } else {
      addLog(`Day ${c.day}. ${randomFrom(DAY_LINES[seasonName()])}`);
    }
    if (isSnowDay()) addLog('Snow today. The kind that squeaks underfoot.');
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
    const gap = 38 * personScale();                  // bigger people stand further apart
    const look = randomFrom(CUSTOMER_LOOKS);
    const c = {
      id: 'c' + Math.random().toString(36).slice(2, 8),
      look,
      companion: look.companion ? { kind: look.companion.kind, color: randomFrom(look.companion.colors), small: !!look.companion.small, carried: !!look.companion.carried } : null,
      side,
      x: side === 'left' ? -40 * personScale() : Scenes.VIEW.width + 40 * personScale(),
      stopX: side === 'left' ? Math.max(60, stops.left - onSameSide * gap) : Math.min(Scenes.VIEW.width - 60, stops.right + onSameSide * gap),
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
    const scale = customerScale(c);
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
    if (k.carried) {
      // peeking out of the basket the girl carries
      return `<g transform="translate(20 -22) scale(${(0.45 / personFactor).toFixed(2)})">${Scenes.petSvg(pet, 'sit')}</g>`;
    }
    const pose = c.state === 'browsing' ? 'sit' : 'stand';
    const s = (k.small ? 0.72 : 0.9) / personFactor;
    return `<line x1="-13" y1="-20" x2="${-30 + 2 * s}" y2="${-11 * s}" stroke="#7d6b58" stroke-width="0.9"/>
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

  // ---- Pets out and about ----
  // Each pet out front is a small actor: where it is, what it is doing, and until when.
  // States: 'wander' (walking to a spot), 'sit', 'nap', 'greet' (beside a customer),
  // 'play' (with another pet). Nothing here is saved; pets pick up where they like.
  let petActors = [];
  const petScale = () => personScale() * 0.9;
  function petBounds() { return state.view === 'inside' ? [150, 650] : [70, 730]; }

  // Rebuild the actors from the save: called when the scene is drawn or pets change.
  function syncPets() {
    const svg = $('scene').querySelector('svg');
    if (!svg) return;
    const out = (state.decor.pets || []).filter(p => (state.decor.petsOut || []).includes(p.id));
    petActors = petActors.filter(a => out.some(p => p.id === a.pet.id));
    out.forEach(p => {
      if (!petActors.some(a => a.pet.id === p.id)) {
        const [lo, hi] = petBounds();
        petActors.push({ pet: p, x: lo + Math.random() * (hi - lo), dir: 1, state: 'sit', until: performance.now() + 1500, targetX: null, pose: null, partner: null, lastLogDay: -1 });
      }
    });
    const group = svg.querySelector('.pets');
    group.innerHTML = petActors.map(a => `<g id="${a.pet.id}" class="pet"></g>`).join('');
    petActors.forEach(a => { a.pose = null; renderPet(a); });
  }

  function renderPet(a) {
    const el = document.getElementById(a.pet.id);
    if (!el) return;
    const pose = a.state === 'nap' ? 'nap' : (a.state === 'sit' || a.state === 'greet') ? 'sit' : 'stand';
    if (pose !== a.pose) { el.innerHTML = Scenes.petSvg(a.pet, pose); a.pose = pose; }
    const s = petScale();
    const flip = a.pet.kind === 'crab' ? 1 : a.dir;      // crabs face the viewer and scuttle sideways
    const bob = a.state === 'wander' ? Math.abs(Math.sin(a.x / 6)) * 1.2 * s : a.state === 'play' ? Math.abs(Math.sin(performance.now() / 90)) * 4 * s : 0;
    el.setAttribute('transform', `translate(${a.x.toFixed(1)} ${(Scenes.GROUND_Y - bob).toFixed(1)}) scale(${flip * s} ${s})`);
  }

  function petJournal(a, line) {
    if (a.lastLogDay === dayIndex()) return;           // one note per pet per day is plenty
    a.lastLogDay = dayIndex();
    addLog(line);
    drawLog();
    save();
  }

  function updatePets(dt, now) {
    if (!petActors.length) return;
    const [lo, hi] = petBounds();
    const night = state.clock.night;
    petActors.forEach(a => {
      const info = PET_KINDS[a.pet.kind];
      if (a.state === 'wander') {
        const speed = info.speed * (0.7 + 0.3 * personScale());
        if (a.targetX === null) a.targetX = lo + Math.random() * (hi - lo);
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
            a.greetTarget = null;
          }
          else if (Math.random() < (night ? 0.7 : 0.3)) { a.state = 'nap'; a.until = now + 8000 + Math.random() * 8000; if (!night && Math.random() < 0.5) petJournal(a, randomFrom(PET_NAP_LINES).replace('{pet}', a.pet.name)); }
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
          if (c.companion && !c.companion.carried) petJournal(a, randomFrom(SNIFF_LINES).split('{pet}').join(a.pet.name).replace('{kind}', PET_KINDS[c.companion.kind].name));
          else if (Math.random() < 0.5) petJournal(a, `${c.look.desc} ${randomFrom(PET_GREET_LINES).replace('{pet}', a.pet.name)}`);
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
      petJournal(a, randomFrom(PET_PLAY_LINES).split('{a}').join(a.pet.name).split('{b}').join(b.pet.name));
    }
    petActors.forEach(renderPet);
  }

  // ---- Weather: leaves on the wind in autumn, snow on winter snow days ----
  let weather = [];             // particles: { x, y, vx, vy, phase, size, color, kind, rot }
  let nextGustAt = 0;
  let lastWeatherDraw = 0;
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
    // Winter snow days: keep a steady scatter of flakes drifting down, day and night.
    if (isSnowDay()) {
      const flakes = weather.filter(p => p.kind === 'flake').length;
      for (let i = flakes; i < 42; i++) {
        weather.push({ kind: 'flake', x: Math.random() * 800, y: flakes === 0 ? Math.random() * 450 : -10, vx: -6 + Math.random() * 12, vy: 22 + Math.random() * 30, phase: Math.random() * 6.3, size: 1.2 + Math.random() * 1.8, color: '#f6f4ee', rot: 0 });
      }
    }
    // Move everything, retire what has left the scene, recycle flakes at the bottom.
    weather = weather.filter(p => {
      p.phase += dt * (p.kind === 'leaf' ? 5 : 1.6);
      p.x += (p.vx + Math.sin(p.phase) * (p.kind === 'leaf' ? 40 : 14)) * dt;
      p.y += p.vy * dt + (p.kind === 'leaf' ? Math.cos(p.phase) * 18 * dt : 0);
      if (p.kind === 'leaf') p.rot += 240 * dt;
      if (p.kind === 'flake' && p.y > 445) { if (!isSnowDay()) return false; p.y = -6; p.x = Math.random() * 800; return true; }
      return p.x > -40 && p.y < 460;
    });
    if (now - lastWeatherDraw < 50) return;         // draw at about 20 frames a second
    lastWeatherDraw = now;
    const group = $('scene').querySelector('svg .weather');
    if (!group) return;
    group.innerHTML = weather.map(p => p.kind === 'leaf'
      ? `<ellipse cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" rx="${p.size.toFixed(1)}" ry="${(p.size * 0.55).toFixed(1)}" fill="${p.color}" transform="rotate(${p.rot.toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})"/>`
      : `<circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${p.size.toFixed(1)}" fill="${p.color}" opacity="0.9"/>`).join('');
  }

  // The loop. The browser calls this about 60 times a second.
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - lastFrame) / 1000);   // seconds since last frame, capped
    lastFrame = now;
    advanceClock(dt * 1000, now);
    updatePets(dt, now);
    updateWeather(dt, now);

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
      if (c.state === 'arriving') {
        c.x += c.dir * speed * dt;
        const arrived = c.dir === 1 ? c.x >= c.stopX : c.x <= c.stopX;
        moveCustomerElement(c, bob());
        if (arrived) {
          c.x = c.stopX;
          c.state = 'browsing';
          c.browseUntil = now + 1800 + Math.random() * 1800;
          if (c.companion) redrawCustomer(c);
          moveCustomerElement(c, 0);
        }
      } else if (c.state === 'browsing') {
        if (now >= c.browseUntil) {
          completeVisit(c);
          c.state = 'leaving';
          c.dir = -c.dir;                                  // turn around
          if (c.companion) redrawCustomer(c);
        }
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
  // The wholesaler: today's catalogue, orders, and deliveries
  // =========================================================
  // Make sure there is a catalogue for today. A new one is written each morning.
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
        !(d.kind === 'plant' && owned.plants.includes(d.plant)) &&
        !(d.kind === 'paint' && owned.paints.includes(d.color)));
      const decorItem = () => {
        const d = decorChoices.splice(Math.floor(Math.random() * decorChoices.length), 1)[0];
        return { id: newId(), kind: d.kind, name: d.name, books: 0, price: d.price, mystery: false, ordered: false, color: d.color || null, plant: d.plant || null };
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
    state.orders.push({ id: 'o' + Math.random().toString(36).slice(2, 8), name: item.name, books: item.books, mystery: item.mystery, kind: item.kind || 'books', color: item.color || null, plant: item.plant || null, pet: item.pet || null, arrives });
    if (item.kind === 'pet') addLog(`Arranged to adopt a ${item.name.toLowerCase().replace(' \u00b7 ', ' called ')} for ${item.price} coins. The carrier arrives ${when}.`);
    else if (item.kind && item.kind !== 'books') addLog(`Ordered a ${item.name.toLowerCase()} for ${item.price} coins. Arrives ${when}.`);
    else addLog(item.mystery
      ? `Ordered a mystery box for ${item.price} coins. Arrives ${when}. Could be anything.`
      : `Ordered ${item.name.toLowerCase()} (${item.books} books) for ${item.price} coins. Arrives ${when}.`);
    bumpLifetime(life => { life.boxesOrdered = (life.boxesOrdered || 0) + 1; });
    refresh();
  }

  // Called at closing time: anything due today lands outside the shop.
  function deliverOrders() {
    const due = state.orders.filter(o => o.arrives <= dayIndex());
    if (!due.length) return;
    state.orders = state.orders.filter(o => o.arrives > dayIndex());
    due.forEach(o => state.deliveries.push({ id: o.id, name: o.name, books: o.books, mystery: o.mystery, kind: o.kind || 'books', color: o.color || null, plant: o.plant || null, pet: o.pet || null }));
    addLog(`The van came at closing. ${due.length} ${due.length === 1 ? 'box' : 'boxes'} on the step.`);
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
    if (spare === 0) addLog(`Opened the ${box.name.toLowerCase()}. ${n} books shelved.`);
    else if (n === 0) addLog(`Opened the ${box.name.toLowerCase()}. Shelves full, so all ${spare} went to the back room.`);
    else addLog(`Opened the ${box.name.toLowerCase()}. ${n} shelved, ${spare} to the back room.`);
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
    addLog(`Shelved ${n} ${n === 1 ? 'book' : 'books'} from the back room.`);
    refresh();
    drawInventory();
  }

  // Paint goes in the cupboard; a sign or a plant goes straight out front.
  function openDecorBox(box) {
    state.deliveries = state.deliveries.filter(d => d.id !== box.id);
    const decor = state.decor;
    if (box.kind === 'paint') {
      if (!decor.paints.includes(box.color)) decor.paints.push(box.color);
      const paint = PAINTS.find(p => p.color === box.color);
      addLog(`Opened the box: a bucket of ${paint ? paint.name : 'paint'}. Into the cupboard. It will never run out; that is how paint works here.`);
    } else if (box.kind === 'sign') {
      decor.signs += 1;
      decor.signOut = true;
      addLog(`Opened the box: a chalkboard sign. Wrote ${state.shopName} on it and put it out front.`);
    } else if (box.kind === 'plant') {
      const kind = box.plant || 'snake';
      const info = PLANTS.find(p => p.kind === kind) || PLANTS[0];
      if (!decor.plants.includes(kind)) decor.plants.push(kind);
      decor.plantOut = kind;                // the newest plant takes the spot by the door
      addLog(`Opened the box: a ${info.name.toLowerCase()}. ${info.line}`);
    } else if (box.kind === 'pet' && box.pet) {
      if ((decor.pets || []).length >= MAX_PETS) { addLog('The carrier came, but three is the limit. Sent back with apologies and a biscuit.'); }
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

  function paintBuilding(color) {
    if (!state.decor.paints.includes(color) || state.decor.paint === color) return;
    state.decor.paint = color;
    const paint = PAINTS.find(p => p.color === color);
    addLog(`Painted the ${buildingWord()} ${paint ? paint.name : 'a new colour'}. Two coats. Very satisfying.`);
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
      addLog(`${old} is now ${name}. ${name} didn\u2019t mind.`);
      drawLog();
      save();
    }
    drawInventory();
  }

  function toggleDecor(kind, plantKind, petId) {
    if (kind === 'sign' && state.decor.signs > 0) state.decor.signOut = !state.decor.signOut;
    if (kind === 'plant' && state.decor.plants.includes(plantKind)) {
      state.decor.plantOut = state.decor.plantOut === plantKind ? null : plantKind;   // one plant out at a time
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

  function drawInventory() {
    const decor = state.decor;
    const rows = [];
    const onShelves = booksInStock();
    const reserve = state.reserve || 0;
    const room = capacity() - onShelves;
    const canShelve = Math.min(room, reserve);
    rows.push(`<li class="stock-row"><div class="item-row">${ICONS.books()}<div><span class="item-name">Books</span><span class="item-meta">${onShelves} on the shelves \u00b7 ${reserve} in the back room</span></div></div>` +
      (canShelve > 0 ? `<button class="button small primary" data-shelve="1">Shelve ${canShelve}</button>` : `<span class="ordered">${reserve > 0 ? 'Shelves full' : room > 0 ? `${room} empty` : 'Full'}</span>`) + `</li>`);
    decor.paints.forEach(color => {
      const paint = PAINTS.find(p => p.color === color) || { name: 'Paint' };
      const current = decor.paint === color;
      rows.push(`<li><div class="item-row">${ICONS.paint(color)}<div><span class="item-name">${paint.name} paint</span><span class="item-meta">${current ? 'On the walls now' : 'In the cupboard'}</span></div></div>${current ? '<span class="ordered">Current</span>' : `<button class="button small primary" data-paint="${color}">Paint the ${buildingWord()}</button>`}</li>`);
    });
    if (decor.signs > 0) {
      rows.push(`<li><div class="item-row">${ICONS.sign()}<div><span class="item-name">Chalkboard sign</span><span class="item-meta">${decor.signOut ? 'Out front, with the shop name' : 'In the back'}</span></div></div><button class="button small" data-toggle="sign">${decor.signOut ? 'Take in' : 'Put out'}</button></li>`);
    }
    decor.plants.forEach(kind => {
      const info = PLANTS.find(p => p.kind === kind) || { name: kind };
      const out = decor.plantOut === kind;
      rows.push(`<li><div class="item-row">${ICONS.plant(kind)}<div><span class="item-name">${info.name}</span><span class="item-meta">${out ? 'By the door' : 'In the back'}</span></div></div><button class="button small" data-toggle="plant" data-plant="${kind}">${out ? 'Take in' : 'Put out'}</button></li>`);
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
    $('inventory-hint').textContent = paint ? `The ${buildingWord()} is painted ${paint.name}.` : `The ${buildingWord()} still wears its original paint.`;
    drawAppeal();
  }

  // The star rating in the header: how inviting the shop looks, out of five. Hovering
  // the stars shows today's forecast: how many customers to expect and what would help.
  function drawAppeal() {
    const expected = Math.round(expectedCustomersToday());
    const d = state.decor;
    const missing = [];
    if (!d.paint) missing.push('a coat of paint');
    if (!d.signOut) missing.push('the chalkboard out front');
    if (!d.plantOut) missing.push('a plant by the door');
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

  // The chalkboard and the plant, drawn outside the shop when they are out.
  function drawDecor() {
    const group = $('scene').querySelector('svg .decor');
    if (!group) return;
    if (state.view === 'inside') { group.innerHTML = ''; return; }
    const spots = Scenes.decorSpotsFor(state.building);
    const scale = personScale() * 0.75;
    let out = '';
    if (state.decor.signOut) out += Scenes.chalkboard(spots.signX, Scenes.GROUND_Y, scale);
    if (state.decor.plantOut) out += Scenes.plant(state.decor.plantOut, spots.plantX, Scenes.GROUND_Y, scale);
    group.innerHTML = out;
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

  // The order form: today's catalogue and what is on its way. Boxes on the step are
  // opened by clicking them in the picture.
  function drawOrderForm() {
    const items = (state.catalogue && state.catalogue.items) || [];
    const list = $('catalogue');
    if (!items.length) {
      list.innerHTML = `<li><span class="empty">The van didn\u2019t come today. Nothing on offer.</span></li>`;
    } else {
      list.innerHTML = items.map(item => {
        const kind = item.kind || 'books';
        const meta = kind === 'paint' ? `one bucket \u00b7 ${item.price} coins`
          : kind === 'sign' ? `A-frame, chalk included \u00b7 ${item.price} coins`
          : kind === 'pet' ? `${PET_KINDS[item.pet.kind].meta} \u00b7 ${item.price} coins`
          : kind === 'plant' ? `terracotta pot \u00b7 ${item.price} coins`
          : item.mystery ? `size unknown \u00b7 ${item.price} coins` : `${item.books} books \u00b7 ${item.price} coins`;
        const icon = kind === 'paint' ? ICONS.paint(item.color) : kind === 'sign' ? ICONS.sign() : kind === 'pet' ? ICONS.pet(item.pet) : kind === 'plant' ? ICONS.plant(item.plant || 'snake') : item.mystery ? ICONS.mystery() : ICONS.books();
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
    addLog(MOVING_IN[b.id] || `Moved into the ${b.name.toLowerCase()}.`);
    if (state.decor.paints.length) addLog('The paint buckets came too. The new walls could use them.');
    if ((state.decor.pets || []).length) addLog(`${state.decor.pets.map(p => p.name).join(' and ')} came along and immediately went exploring.`);
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
      // Earlier saves counted plants and buckets; now they are lists of kinds and colours.
      if (typeof data.decor.plants === 'number') {
        data.decor.plants = data.decor.plants > 0 ? ['snake'] : [];
        data.decor.plantOut = data.decor.plantOut ? 'snake' : null;
      }
      if (Array.isArray(data.decor.paints)) data.decor.paints = data.decor.paints.filter((c, i, a) => a.indexOf(c) === i);
      if (!Array.isArray(data.decor.pets)) data.decor.pets = [];
      if (!Array.isArray(data.decor.petsOut)) data.decor.petsOut = [];
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
    toggle.title = open ? 'Hide the title, stage and goal' : 'Show the title, stage and goal';
    try { localStorage.setItem(HEADER_KEY, open ? 'open' : 'closed'); } catch (e) { /* fine */ }
  }
  function headerOpen() {
    try { return localStorage.getItem(HEADER_KEY) !== 'closed'; } catch (e) { return true; }
  }

  function init() {
    applySketch(sketchOn());
    applyHeader(headerOpen());
    $('header-toggle').addEventListener('click', () => applyHeader($('site-header').classList.contains('collapsed')));
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
      if (paint) { paintBuilding(paint.dataset.paint); return; }
      const shelve = e.target.closest('[data-shelve]');
      if (shelve) { shelveReserve(); return; }
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) { toggleDecor(toggle.dataset.toggle, toggle.dataset.plant, toggle.dataset.pet); return; }
      const rename = e.target.closest('[data-rename]');
      if (rename) { startRename(rename.dataset.rename); return; }
    });
    // Clicking a box in the scene opens it.
    $('scene').addEventListener('click', (e) => {
      const box = e.target.closest('.delivery-box');
      if (box) openDelivery(box.dataset.id);
    });
    $('reset-button').addEventListener('click', reset);
    $('upgrade-button').addEventListener('click', openUpgradeScreen);
    $('confirm-upgrade').addEventListener('click', confirmUpgrade);
    $('cancel-upgrade').addEventListener('click', () => showScreen('game-screen'));
    $('view-toggle').addEventListener('click', () => (state.view === 'inside' ? exitBuilding() : enterBuilding()));
    $('next-day-button').addEventListener('click', beginDay);
  }

  init();
})();
