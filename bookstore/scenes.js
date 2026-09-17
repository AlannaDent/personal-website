/* scenes.js
   Draws the backdrops and the buildings the player's shop can live in.

   Everything here is SVG (Scalable Vector Graphics): pictures described as shapes
   and coordinates in text, rather than pixels. The browser draws them at any size.
   The picture is 800 units wide and 450 tall; every number below lives on that grid.

   Structure:
     1. Shared geometry and the list of locations
     2. Small drawing helpers
     3. Backdrops (beach, park, street, and the street a block down)
     4. Buildings: each one knows how to draw itself, where its shelves are,
        how big its sign is, and where customers stand
     5. render(), which puts a backdrop and a building together

   These are placeholders in the intended palette: faded, weathered, a bit plain.
   The plan is to replace them with proper watercolor art later.
*/

const Scenes = (function () {
  'use strict';

  // =========================================================
  // 1. Shared geometry and locations
  // =========================================================
  const VIEW = { width: 800, height: 450 };
  const GROUND_Y = 400;                 // where feet touch the ground

  // The three places a stage-one library can start. Later buildings each
  // bring their own location (see BUILDINGS below).
  const LOCATIONS = [
    {
      id: 'beach',
      name: 'By the beach entrance',
      blurb: 'Sand in the hinges, salt on the glass. Beach readers are loyal readers.',
      boxColor: '#a9b5b7'               // faded grey-blue paint for the library box
    },
    {
      id: 'park',
      name: 'In the park',
      blurb: 'Grass, a bench, a playground behind. Parents wait; parents browse.',
      boxColor: '#a3ad95'               // faded sage
    },
    {
      id: 'street',
      name: 'On the high street corner',
      blurb: 'Shops either side and a little white church. Foot traffic guaranteed.',
      boxColor: '#b08a82'               // faded dusty red
    }
  ];

  // =========================================================
  // 2. Small drawing helpers
  // =========================================================
  function grassTuft(x, y) {
    return `<path d="M${x} ${y} l-4 -14 M${x} ${y} l0 -18 M${x} ${y} l4 -13" stroke="#8f9a5c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  function cloud(cx, cy, w) {
    return `<g fill="#ffffff" opacity="0.75">
      <ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${w * 0.3}"/>
      <ellipse cx="${cx + w * 0.5}" cy="${cy - w * 0.18}" rx="${w * 0.6}" ry="${w * 0.28}"/>
    </g>`;
  }
  function flower(x, y, color) {
    return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
  }
  function seagull(x, y) {
    return `<path d="M${x} ${y} q8 -6 16 0 q8 -6 16 0" stroke="#7c8a90" stroke-width="2" fill="none"/>`;
  }
  function hydrangeas(x, y) {
    return `<g fill="#8b9cc9"><circle cx="${x}" cy="${y}" r="11"/><circle cx="${x + 14}" cy="${y - 6}" r="12"/><circle cx="${x + 28}" cy="${y}" r="10"/></g>
      <g fill="#a9b6d6"><circle cx="${x + 6}" cy="${y - 6}" r="6"/><circle cx="${x + 22}" cy="${y - 2}" r="5"/></g>`;
  }
  function picketFence(x1, x2, y) {
    let out = `<rect x="${x1}" y="${y - 22}" width="${x2 - x1}" height="3" fill="#f1ede4"/><rect x="${x1}" y="${y - 10}" width="${x2 - x1}" height="3" fill="#f1ede4"/>`;
    for (let x = x1; x < x2; x += 12) {
      out += `<polygon points="${x},${y} ${x},${y - 28} ${x + 3},${y - 32} ${x + 6},${y - 28} ${x + 6},${y}" fill="#f7f4ec" stroke="#c8c3b8" stroke-width="0.6"/>`;
    }
    return out;
  }
  // Three glass jars of saltwater taffy on a shelf. (x, y) is the shelf's left end.
  function taffyJars(x, y) {
    const fills = [
      ['#d98c9c', '#f2d7a0', '#9fd0c4', '#f4efe4', '#d98c9c'],
      ['#b6413a', '#f4efe4', '#b6413a', '#f4efe4', '#e59a8c'],
      ['#d9a441', '#8b9cc9', '#e59a8c', '#d9a441', '#9fd0c4']
    ];
    let out = `<rect x="${x - 4}" y="${y}" width="86" height="3" fill="#6d4a42"/>`;
    fills.forEach((candies, j) => {
      const jx = x + j * 28;
      out += `<rect x="${jx}" y="${y - 30}" width="22" height="30" rx="4" fill="#eef3f4" stroke="#8a8f94" stroke-width="1"/>`;
      out += `<rect x="${jx + 4}" y="${y - 35}" width="14" height="6" rx="1.5" fill="#6d4a42"/>`;
      candies.forEach((c, k) => {
        const cx = jx + 5 + ((k * 7) % 13);
        const cy = y - 5 - Math.floor(k / 2) * 7 - (k % 2) * 3;
        out += `<ellipse cx="${cx}" cy="${cy}" rx="3.5" ry="2.6" fill="${c}"/>`;
      });
      out += `<rect x="${jx + 3}" y="${y - 26}" width="3" height="18" fill="#fff" opacity="0.5"/>`;
    });
    return out;
  }
  // A pyramid of fudge blocks and a couple of lollipops. (x, y) is the shelf's left end.
  function fudgeAndLollipops(x, y) {
    let out = `<rect x="${x - 4}" y="${y}" width="86" height="3" fill="#6d4a42"/>`;
    [4, 3, 2].forEach((count, row) => {
      for (let i = 0; i < count; i++) {
        const bx = x + row * 7 + i * 14;
        const by = y - (row + 1) * 9;
        out += `<rect x="${bx}" y="${by}" width="12" height="8" rx="1" fill="${row % 2 ? '#8a6248' : '#6b4a3a'}" stroke="#4a3024" stroke-width="0.8"/>`;
        out += `<rect x="${bx + 1}" y="${by + 1}" width="10" height="2" fill="#fff" opacity="0.18"/>`;
      }
    });
    out += `<rect x="${x + 62}" y="${y - 12}" width="16" height="12" rx="2" fill="#f4efe4" stroke="#8a8f94" stroke-width="1"/>`;
    [['#d98c9c', 64, 30], ['#9fd0c4', 71, 34], ['#d9a441', 77, 29]].forEach(([c, dx, h]) => {
      out += `<line x1="${x + dx}" y1="${y - 10}" x2="${x + dx}" y2="${y - h}" stroke="#f4efe4" stroke-width="1.5"/>`;
      out += `<circle cx="${x + dx}" cy="${y - h}" r="5" fill="${c}"/><circle cx="${x + dx}" cy="${y - h}" r="2" fill="none" stroke="#fff" stroke-width="1" opacity="0.7"/>`;
    });
    return out;
  }
  // Rows of faint horizontal lines: planks, shingles, corrugation.
  function hLines(x1, x2, y1, y2, gap, opacity) {
    let out = `<g stroke="#000" stroke-width="1" opacity="${opacity}">`;
    for (let y = y1; y <= y2; y += gap) out += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`;
    return out + '</g>';
  }
  function vLines(x1, x2, y1, y2, gap, opacity) {
    let out = `<g stroke="#000" stroke-width="1" opacity="${opacity}">`;
    for (let x = x1; x <= x2; x += gap) out += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`;
    return out + '</g>';
  }
  // A plain sign board with an empty text element the game fills with the shop name.
  function signBoard(x, y, w, h, fontSize) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e9e2cf" stroke="#7d6b58" stroke-width="1.5"/>
      <text class="box-sign" x="${x + w / 2}" y="${y + h * 0.72}" text-anchor="middle" font-family="Georgia, serif" font-size="${fontSize}" fill="#5c5b56"></text>`;
  }

  // The definitions block: sky gradient, awning stripes, and the "wobble" filter,
  // which nudges every edge slightly so shapes feel hand-drawn rather than ruler-straight.
  function defs(skyTop, skyBottom) {
    return `<defs>
      <filter id="wobble" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${skyTop}"/>
        <stop offset="1" stop-color="${skyBottom}"/>
      </linearGradient>
      <pattern id="stripes" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#e9e2cf"/>
        <rect width="8" height="16" fill="#6b8f8a"/>
      </pattern>
    </defs>`;
  }

  // =========================================================
  // 3. Backdrops
  // =========================================================
  // Each takes an options object so a building can nudge details out of its way.

  function beach(opts) {
    const bx = opts.boardwalkX || 480;   // where the boardwalk meets the dune
    const sx = opts.signX || 250;        // the "BEACH" sign post
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(150, 80, 60) + cloud(620, 110, 70);
    s += seagull(560, 60) + seagull(610, 45);
    s += `<rect x="0" y="235" width="800" height="70" fill="#7fa3ad"/>`;
    s += `<g stroke="#a9c6cc" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M40 255 q15 -4 30 0"/><path d="M180 270 q15 -4 30 0"/><path d="M330 250 q15 -4 30 0"/>
      <path d="M520 265 q15 -4 30 0"/><path d="M680 252 q15 -4 30 0"/><path d="M740 285 q15 -4 30 0"/>
    </g>`;
    s += `<path d="M0 300 C150 270 300 320 450 290 S700 270 800 300 L800 450 L0 450 Z" fill="#e3d6b4"/>`;
    s += `<path d="M0 450 L0 405 C200 398 600 408 800 400 L800 450 Z" fill="#d9caa3"/>`;
    s += `<polygon points="${bx},300 ${bx + 35},300 ${bx + 180},450 ${bx - 60},450" fill="#b39a6f"/>`;
    s += `<g stroke="#9c845c" stroke-width="2">
      <line x1="${bx + 6}" y1="320" x2="${bx + 29}" y2="320"/><line x1="${bx + 14}" y1="350" x2="${bx + 49}" y2="350"/>
      <line x1="${bx + 24}" y1="380" x2="${bx + 73}" y2="380"/><line x1="${bx + 36}" y1="410" x2="${bx + 101}" y2="410"/>
      <line x1="${bx + 50}" y1="440" x2="${bx + 134}" y2="440"/>
    </g>`;
    s += `<g stroke="#8b6f4e" stroke-width="4"><line x1="40" y1="300" x2="40" y2="340"/><line x1="130" y1="298" x2="130" y2="338"/><line x1="215" y1="310" x2="215" y2="350"/></g>`;
    s += `<path d="M40 310 Q85 325 130 308 Q172 330 215 320" stroke="#c9b28a" stroke-width="2" fill="none"/>`;
    [60, 95, 160, 250, 300, 560, 610, 700, 760].forEach((x, i) => { s += grassTuft(x, 296 + (i % 3) * 6); });
    s += `<rect x="${sx}" y="330" width="6" height="70" fill="#8b6f4e"/>`;
    s += `<rect x="${sx - 30}" y="316" width="66" height="24" fill="#e8e1cf" stroke="#8b6f4e" stroke-width="2"/>`;
    s += `<text x="${sx + 3}" y="333" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#5b6b70">BEACH &#8594;</text>`;
    return s;
  }

  function park() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(520, 70, 55) + cloud(240, 100, 45);
    s += `<path d="M0 255 Q60 215 120 250 T240 245 T360 255 T480 240 T600 255 T720 245 T800 255 L800 300 L0 300 Z" fill="#7f9a68"/>`;
    s += `<rect x="0" y="290" width="800" height="160" fill="#9dbb6f"/>`;
    s += `<path d="M0 340 C200 320 500 360 800 335 L800 450 L0 450 Z" fill="#a6c277"/>`;
    s += `<path d="M0 425 C200 408 600 408 800 425 L800 440 C600 424 200 424 0 440 Z" fill="#d5c7a2"/>`;
    s += `<g opacity="0.85">
      <g stroke="#8a7f92" stroke-width="5" fill="none" stroke-linecap="round">
        <path d="M555 300 L595 218 L635 300"/><path d="M705 300 L665 218 L625 300"/>
        <line x1="595" y1="218" x2="665" y2="218"/>
      </g>
      <g stroke="#6f6678" stroke-width="2"><line x1="612" y1="218" x2="612" y2="272"/><line x1="648" y1="218" x2="648" y2="272"/></g>
      <rect x="604" y="272" width="16" height="5" fill="#c98a6a"/><rect x="640" y="272" width="16" height="5" fill="#c98a6a"/>
      <polygon points="735,300 760,225 770,225 770,300" fill="#c98a6a"/>
      <path d="M770 228 C790 250 800 275 800 300" stroke="#e0d8c8" stroke-width="7" fill="none"/>
      <g stroke="#8a7f92" stroke-width="2"><line x1="742" y1="285" x2="768" y2="285"/><line x1="748" y1="265" x2="768" y2="265"/><line x1="754" y1="245" x2="768" y2="245"/></g>
    </g>`;
    s += `<rect x="70" y="250" width="22" height="150" fill="#7a5a3e"/>`;
    s += `<g fill="#6f9556"><circle cx="80" cy="200" r="70"/><circle cx="40" cy="235" r="48"/><circle cx="125" cy="220" r="55"/></g>`;
    s += `<g fill="#7fa563"><circle cx="70" cy="180" r="40"/><circle cx="115" cy="205" r="30"/></g>`;
    s += `<g fill="#8b6f4e">
      <rect x="170" y="355" width="90" height="8"/><rect x="170" y="335" width="90" height="6"/>
      <rect x="175" y="360" width="6" height="40"/><rect x="249" y="360" width="6" height="40"/>
      <rect x="172" y="341" width="5" height="16"/><rect x="253" y="341" width="5" height="16"/>
    </g>`;
    s += flower(300, 372, '#d98c9c') + flower(312, 380, '#e8c46a') + flower(560, 375, '#d98c9c') + flower(575, 368, '#ffffff') + flower(640, 384, '#e8c46a');
    s += grassTuft(330, 392) + grassTuft(590, 395) + grassTuft(720, 388);
    return s;
  }

  // The chowder house on the left of the high street corner.
  function chowderHouse() {
    let s = `<rect x="0" y="150" width="215" height="220" fill="#6b8f8a"/>`;
    s += `<rect x="-5" y="142" width="225" height="12" fill="#3f5f5b"/>`;
    s += `<g fill="#dfe8ea" stroke="#3f5f5b" stroke-width="3"><rect x="30" y="170" width="50" height="60"/><rect x="130" y="170" width="50" height="60"/></g>`;
    s += `<g fill="#3f5f5b"><rect x="26" y="228" width="58" height="8"/><rect x="126" y="228" width="58" height="8"/></g>`;
    s += flower(35, 226, '#d98c9c') + flower(55, 224, '#e8c46a') + flower(75, 226, '#d98c9c') + flower(135, 226, '#ffffff') + flower(155, 224, '#d98c9c') + flower(175, 226, '#e8c46a');
    s += `<rect x="20" y="244" width="175" height="22" fill="#f3eee2" stroke="#3f5f5b" stroke-width="2"/>`;
    s += `<text x="107" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#3f5f5b" letter-spacing="1">THE CHOWDER HOUSE</text>`;
    s += `<polygon points="0,270 215,270 225,292 -10,292" fill="url(#stripes)"/>`;
    s += `<rect x="20" y="300" width="110" height="70" fill="#f1e7c8" stroke="#3f5f5b" stroke-width="3"/>`;
    s += `<rect x="150" y="296" width="46" height="74" fill="#3f5f5b"/><rect x="160" y="306" width="26" height="30" fill="#dfe8ea"/>`;
    s += `<rect x="40" y="330" width="70" height="26" fill="#f6f1e4" stroke="#b5afa2"/><text x="75" y="347" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#a5443a">chowdah</text>`;
    return s;
  }

  // The little white church.
  function church() {
    let s = `<rect x="222" y="235" width="112" height="135" fill="#f4f1e8" stroke="#c8c3b8"/>`;
    s += `<polygon points="216,240 278,190 340,240" fill="#5a5f66"/>`;
    s += `<rect x="254" y="125" width="48" height="115" fill="#f4f1e8" stroke="#c8c3b8"/>`;
    s += `<polygon points="250,128 278,62 306,128" fill="#5a5f66"/>`;
    s += `<path d="M278 60 v-16 M271 51 h14" stroke="#5a5f66" stroke-width="3"/>`;
    s += `<path d="M270 175 a8 8 0 0 1 16 0 v22 h-16 z" fill="#7c8a90"/>`;
    s += `<g fill="#9fb0c4"><path d="M236 300 a8 8 0 0 1 16 0 v30 h-16 z"/><path d="M304 300 a8 8 0 0 1 16 0 v30 h-16 z"/></g>`;
    s += `<path d="M266 370 v-38 a12 12 0 0 1 24 0 v38 z" fill="#7c5a3e"/>`;
    s += hydrangeas(232, 362) + hydrangeas(300, 362);
    return s;
  }

  // The saltwater taffy shop, drawn at x 480..800. street2 slides it left.
  function taffyShop() {
    let s = `<rect x="480" y="170" width="320" height="200" fill="#a8766a"/>`;
    s += `<g stroke="#9a6a5e" stroke-width="1" opacity="0.6">${[190, 210, 230, 250].map(y => `<line x1="480" y1="${y}" x2="800" y2="${y}"/>`).join('')}</g>`;
    s += `<rect x="475" y="162" width="330" height="12" fill="#6d4a42"/>`;
    s += `<g fill="#dfe8ea" stroke="#6d4a42" stroke-width="3"><rect x="510" y="190" width="46" height="56"/><rect x="620" y="190" width="46" height="56"/><rect x="730" y="190" width="46" height="56"/></g>`;
    s += `<g fill="#6d4a42"><rect x="506" y="244" width="54" height="7"/><rect x="616" y="244" width="54" height="7"/><rect x="726" y="244" width="54" height="7"/></g>`;
    s += flower(515, 242, '#d98c9c') + flower(535, 240, '#ffffff') + flower(552, 242, '#d98c9c') + flower(625, 242, '#e8c46a') + flower(645, 240, '#d98c9c') + flower(735, 242, '#ffffff') + flower(755, 240, '#d98c9c');
    s += `<rect x="530" y="258" width="220" height="22" fill="#f3eee2" stroke="#6d4a42" stroke-width="2"/>`;
    s += `<text x="640" y="274" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#6d4a42" letter-spacing="1">SALTWATER TAFFY &amp; FUDGE</text>`;
    s += `<polygon points="480,284 800,284 806,306 470,306" fill="#d1a85a"/>`;
    s += `<g fill="#f1e7c8" stroke="#6d4a42" stroke-width="3"><rect x="500" y="314" width="100" height="56"/><rect x="680" y="314" width="100" height="56"/></g>`;
    s += taffyJars(510, 362) + fudgeAndLollipops(690, 362);
    s += `<rect x="620" y="310" width="46" height="60" fill="#6d4a42"/><rect x="630" y="320" width="26" height="28" fill="#dfe8ea"/>`;
    return s;
  }

  function pavementAndRoad() {
    let s = `<rect x="0" y="370" width="800" height="80" fill="#c9c3b6"/>`;
    s += `<g stroke="#b5afa2" stroke-width="1.5">${[60, 140, 220, 300, 460, 540, 620, 700, 780].map(x => `<line x1="${x}" y1="370" x2="${x}" y2="428"/>`).join('')}</g>`;
    s += `<rect x="0" y="428" width="800" height="3" fill="#e6e2d8"/><rect x="0" y="431" width="800" height="19" fill="#8f8b84"/>`;
    return s;
  }

  // The high street corner: chowder house, church, taffy shop, street lamp.
  function street() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(420, 60, 50) + cloud(700, 95, 45);
    s += pavementAndRoad();
    s += chowderHouse() + church() + taffyShop();
    s += `<rect x="466" y="262" width="5" height="138" fill="#3a3f44"/>`;
    s += `<rect x="457" y="240" width="23" height="26" fill="#3a3f44"/><rect x="461" y="244" width="15" height="18" fill="#f2e6b8"/>`;
    return s;
  }

  // A block down the same street: the taffy shop is now on the left, then a
  // house lot with a fence, hydrangeas and a tree. The garage building sits here.
  function street2() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(300, 70, 50) + cloud(650, 100, 55);
    s += pavementAndRoad();
    s += `<g transform="translate(-560 0)">${taffyShop()}</g>`;
    // tree behind the fence, right
    s += `<rect x="712" y="240" width="18" height="135" fill="#7a5a3e"/>`;
    s += `<g fill="#6f9556"><circle cx="720" cy="200" r="58"/><circle cx="685" cy="230" r="38"/><circle cx="758" cy="222" r="42"/></g>`;
    s += `<g fill="#7fa563"><circle cx="712" cy="185" r="32"/><circle cx="750" cy="205" r="22"/></g>`;
    // lawn behind the fence
    s += `<rect x="600" y="345" width="200" height="30" fill="#9dbb6f"/>`;
    s += picketFence(600, 800, 375);
    s += hydrangeas(612, 366) + hydrangeas(760, 366);
    // mailbox by the kerb
    s += `<rect x="248" y="350" width="4" height="50" fill="#3a3f44"/><rect x="240" y="338" width="22" height="14" rx="4" fill="#3f5f5b"/>`;
    return s;
  }

  const BACKDROPS = { beach, park, street, street2 };
  const SKIES = {
    beach: ['#b9d3dc', '#eef0e6'],
    park: ['#c9dde4', '#eef3ea'],
    street: ['#cddfe6', '#f1efe4'],
    street2: ['#cddfe6', '#f1efe4']
  };

  // =========================================================
  // 4. Buildings
  // =========================================================
  // Each building describes:
  //   capacity  how many books it holds
  //   shelves   where the book slots are: for each shelf, the y of the shelf top
  //             (books stand on it), the x of the first slot, the step between
  //             slots, each book's width, how many slots, and book height range
  //   sign      font sizes for the name plate (normal, and for long names)
  //   stops     where customers stand to browse, left and right of the building
  //   draw()    the building behind the books; front() what goes in front of them

  const BUILDINGS = {};

  // ---- Stage one: the Little Free Library box ----
  BUILDINGS.lfl = {
    id: 'lfl',
    stage: 1,
    name: 'Little Free Library',
    capacity: 20,
    paint: null,                          // uses the location's boxColor
    shelves: [
      { bottom: 280, firstX: 353, step: 9.5, width: 8, count: 10, minH: 26, varH: 9 },
      { bottom: 318, firstX: 353, step: 9.5, width: 8, count: 10, minH: 26, varH: 9 }
    ],
    sign: { size: 9.5, small: 7.6 },
    stops: { left: 300, right: 500 },
    backdropOpts: {},
    draw(color) {
      return `
        <ellipse cx="400" cy="${GROUND_Y}" rx="42" ry="5" fill="#000" opacity="0.12"/>
        <rect x="392" y="330" width="16" height="70" fill="#7d6b58"/>
        <rect x="392" y="330" width="5" height="70" fill="#000" opacity="0.12"/>
        <rect x="340" y="230" width="120" height="100" fill="${color}" stroke="#5c5b56" stroke-width="1.5"/>
        <g fill="#fff" opacity="0.18"><rect x="345" y="236" width="3" height="62"/><rect x="452" y="240" width="2" height="82"/></g>
        <g fill="#000" opacity="0.08"><rect x="340" y="312" width="120" height="18"/><rect x="432" y="232" width="6" height="96"/></g>
        <rect x="352" y="242" width="96" height="76" fill="#5a4d42"/>
        <rect x="352" y="280" width="96" height="3" fill="#8a7460"/>
        <polygon points="330,232 400,198 470,232" fill="#6a6a66" stroke="#4a4946" stroke-width="1.5"/>
        <polygon points="336,229 400,201 400,207 342,231" fill="#fff" opacity="0.12"/>`;
    },
    front() {
      return `
        <rect x="352" y="242" width="96" height="76" fill="#dfeaf0" opacity="0.22"/>
        <polygon points="352,242 382,242 352,292" fill="#fff" opacity="0.25"/>
        <rect x="350" y="240" width="100" height="80" fill="none" stroke="#5c5b56" stroke-width="2"/>
        <rect x="443" y="274" width="3" height="12" fill="#2f2f2f"/>
        <g fill="#2f2f2f"><rect x="352" y="250" width="4" height="6"/><rect x="352" y="304" width="4" height="6"/></g>
        ${signBoard(360, 336, 80, 18, this.sign.size)}`;
    }
  };

  // ---- Stage two, option 1: a garden shed in the park ----
  // Doors swung open on a five-shelf wall of books. Opening x 330..470, y 250..390.
  BUILDINGS['garden-shed'] = {
    id: 'garden-shed',
    stage: 2,
    name: 'Garden shed',
    blurb: 'Retired from lawnmower duty. Sage paint, shingle roof, doors that stick a little.',
    location: 'park',
    capacity: 100,
    paint: '#9aa88f',
    shelves: [278, 306, 334, 362, 390].map(bottom => ({ bottom, firstX: 332, step: 6.9, width: 5.4, count: 20, minH: 18, varH: 7 })),
    sign: { size: 10, small: 8 },
    stops: { left: 262, right: 538 },
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="400" cy="${GROUND_Y}" rx="125" ry="6" fill="#000" opacity="0.1"/>`;
      s += `<rect x="300" y="226" width="200" height="174" fill="${color}" stroke="#4f5a48" stroke-width="1.5"/>`;
      s += hLines(300, 500, 240, 396, 14, 0.08);
      s += `<g fill="#fff" opacity="0.14"><rect x="306" y="232" width="3" height="120"/><rect x="490" y="240" width="2" height="140"/></g>`;
      s += `<g fill="#000" opacity="0.07"><rect x="300" y="380" width="200" height="20"/><rect x="470" y="230" width="8" height="170"/></g>`;
      // interior and shelf boards
      s += `<rect x="330" y="250" width="140" height="140" fill="#4a3f36"/>`;
      this.shelves.forEach(sh => { s += `<rect x="330" y="${sh.bottom}" width="140" height="2.5" fill="#8a7460"/>`; });
      // roof with shingle rows
      s += `<polygon points="288,230 400,166 512,230" fill="#6a6a66" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<g stroke="#4a4946" stroke-width="1" opacity="0.35"><line x1="316" y1="214" x2="484" y2="214"/><line x1="340" y1="200" x2="460" y2="200"/><line x1="364" y1="186" x2="436" y2="186"/></g>`;
      s += `<rect x="388" y="196" width="24" height="20" fill="#dfe8ea" stroke="#4f5a48" stroke-width="1.5"/><line x1="400" y1="196" x2="400" y2="216" stroke="#4f5a48"/>`;
      // pots and a rake outside
      s += `<path d="M268 400 l4 -22 h18 l4 22 z" fill="#b8734f"/><g fill="#6f9556"><circle cx="275" cy="372" r="7"/><circle cx="285" cy="370" r="8"/><circle cx="280" cy="364" r="6"/></g>`;
      s += `<line x1="520" y1="400" x2="508" y2="290" stroke="#8b6f4e" stroke-width="3"/><path d="M500 292 h16 l2 -10 h-20 z" fill="#6a6a66"/>`;
      return s;
    },
    front() {
      // open doors either side of the opening, then the sign over the doors
      let s = `<g fill="#8a9a80" stroke="#4f5a48" stroke-width="1.5"><rect x="300" y="250" width="28" height="140"/><rect x="472" y="250" width="28" height="140"/></g>`;
      s += hLines(300, 328, 262, 380, 14, 0.12) + hLines(472, 500, 262, 380, 14, 0.12);
      s += `<g fill="#2f2f2f"><rect x="322" y="316" width="3" height="10"/><rect x="475" y="316" width="3" height="10"/></g>`;
      s += `<rect x="330" y="250" width="140" height="140" fill="none" stroke="#3e352e" stroke-width="2"/>`;
      s += signBoard(345, 232, 110, 16, this.sign.size);
      return s;
    }
  };

  // ---- Stage two, option 2: a retired shipping container on the beach ----
  // The side has been cut open. Opening x 310..510, y 270..390. Four shelves of 25.
  BUILDINGS.container = {
    id: 'container',
    stage: 2,
    name: 'Retired storage container',
    blurb: 'Crossed three oceans. Now crossing genres. The rust is decorative.',
    location: 'beach',
    capacity: 100,
    paint: '#6f8a8a',
    shelves: [300, 330, 360, 390].map(bottom => ({ bottom, firstX: 312, step: 7.9, width: 6.2, count: 25, minH: 20, varH: 8 })),
    sign: { size: 11, small: 8.5 },
    stops: { left: 242, right: 578 },
    backdropOpts: { boardwalkX: 590, signX: 150 },
    draw(color) {
      let s = `<ellipse cx="410" cy="${GROUND_Y}" rx="150" ry="6" fill="#000" opacity="0.1"/>`;
      s += `<rect x="280" y="250" width="260" height="150" fill="${color}" stroke="#3f4f4f" stroke-width="1.5"/>`;
      s += vLines(290, 530, 252, 398, 10, 0.1);
      s += `<g fill="#4f6262"><rect x="280" y="250" width="9" height="150"/><rect x="531" y="250" width="9" height="150"/></g>`;
      // rust
      s += `<g fill="#a55e3a" opacity="0.55"><ellipse cx="300" cy="382" rx="24" ry="11"/><ellipse cx="522" cy="268" rx="16" ry="9"/><ellipse cx="292" cy="262" rx="10" ry="7"/><path d="M516 300 q6 20 2 40 q-3 20 4 58 h-8 q-4 -40 -1 -58 q3 -20 -3 -40 z"/></g>`;
      s += `<g fill="#7a3f22" opacity="0.35"><ellipse cx="296" cy="386" rx="12" ry="5"/><ellipse cx="526" cy="266" rx="7" ry="4"/></g>`;
      // interior and shelves
      s += `<rect x="310" y="270" width="200" height="120" fill="#3d3a36"/>`;
      this.shelves.forEach(sh => { s += `<rect x="310" y="${sh.bottom}" width="200" height="2.5" fill="#8a7460"/>`; });
      // end-door locking bars, right end
      s += `<g stroke="#2f3a3a" stroke-width="3"><line x1="533" y1="258" x2="533" y2="392"/><line x1="538" y1="258" x2="538" y2="392"/></g>`;
      // sign posts on the roof
      s += `<g fill="#7d6b58"><rect x="352" y="232" width="4" height="18"/><rect x="464" y="232" width="4" height="18"/></g>`;
      return s;
    },
    front() {
      let s = `<rect x="310" y="270" width="200" height="120" fill="none" stroke="#2f3a3a" stroke-width="2.5"/>`;
      s += `<rect x="306" y="392" width="208" height="5" fill="#4f6262"/>`;
      s += signBoard(340, 228, 140, 20, this.sign.size);
      return s;
    }
  };

  // ---- Stage two, option 3: a home garage a block down the high street ----
  // House at x 260..430, garage 430..590 with the door rolled up. Opening x 440..580, y 290..395.
  BUILDINGS.garage = {
    id: 'garage',
    stage: 2,
    name: 'Garage bookshop',
    blurb: 'A block down from the corner. The car had to go. The house came with hydrangeas.',
    location: 'street2',
    capacity: 100,
    paint: '#b7ada0',
    shelves: [311, 332, 353, 374, 395].map(bottom => ({ bottom, firstX: 442, step: 6.9, width: 5.4, count: 20, minH: 14, varH: 6 })),
    sign: { size: 10, small: 8 },
    stops: { left: 402, right: 632 },
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="430" cy="${GROUND_Y}" rx="170" ry="6" fill="#000" opacity="0.08"/>`;
      // house
      s += `<rect x="260" y="215" width="170" height="185" fill="#c9c0ae" stroke="#7d766c" stroke-width="1.5"/>`;
      s += hLines(260, 430, 226, 392, 9, 0.07);
      s += `<polygon points="250,220 345,150 440,220" fill="#5a5f66" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<rect x="395" y="160" width="14" height="40" fill="#8a6248"/>`;
      s += `<g fill="#dfe8ea" stroke="#f4f1e8" stroke-width="3"><rect x="278" y="236" width="40" height="42"/><rect x="372" y="236" width="40" height="42"/><rect x="372" y="322" width="40" height="42"/></g>`;
      s += `<g stroke="#7d766c" stroke-width="1"><line x1="298" y1="236" x2="298" y2="278"/><line x1="392" y1="236" x2="392" y2="278"/><line x1="392" y1="322" x2="392" y2="364"/></g>`;
      s += `<g fill="#3f5f5b"><rect x="274" y="278" width="48" height="6"/><rect x="368" y="278" width="48" height="6"/></g>`;
      s += flower(282, 276, '#d98c9c') + flower(298, 274, '#ffffff') + flower(314, 276, '#d98c9c') + flower(378, 276, '#e8c46a') + flower(394, 274, '#d98c9c') + flower(410, 276, '#ffffff');
      s += `<rect x="298" y="338" width="34" height="62" fill="#7c5a3e"/><circle cx="326" cy="370" r="1.6" fill="#d9a441"/>`;
      s += `<rect x="292" y="396" width="46" height="4" fill="#8f8b84"/>`;
      // garage
      s += `<rect x="430" y="266" width="160" height="134" fill="${color}" stroke="#7d766c" stroke-width="1.5"/>`;
      s += hLines(430, 590, 276, 392, 9, 0.07);
      s += `<g fill="#000" opacity="0.07"><rect x="430" y="380" width="160" height="20"/></g>`;
      s += `<polygon points="424,268 510,232 596,268" fill="#5a5f66" stroke="#4a4946" stroke-width="1.5"/>`;
      // interior, shelves, rolled-up door
      s += `<rect x="440" y="290" width="140" height="106" fill="#3d3a36"/>`;
      this.shelves.forEach(sh => { s += `<rect x="440" y="${sh.bottom}" width="140" height="2" fill="#8a7460"/>`; });
      s += `<rect x="436" y="284" width="148" height="8" rx="3" fill="#8a8a86" stroke="#5c5b56" stroke-width="1"/>`;
      // driveway and the oil stain that is now a feature
      s += `<polygon points="440,400 580,400 620,450 400,450" fill="#b9b3a6"/>`;
      s += `<ellipse cx="520" cy="420" rx="18" ry="5" fill="#000" opacity="0.1"/>`;
      // a bicycle leaning on the garage
      s += `<g stroke="#3a3f44" stroke-width="2" fill="none"><circle cx="606" cy="388" r="11"/><circle cx="634" cy="388" r="11"/><path d="M606 388 l10 -18 h16 l2 18 M616 370 l-4 -6 M620 370 l14 18"/></g>`;
      return s;
    },
    front() {
      let s = `<rect x="440" y="290" width="140" height="106" fill="none" stroke="#3e352e" stroke-width="2"/>`;
      s += signBoard(455, 268, 110, 15, this.sign.size);
      return s;
    }
  };

  // Which buildings are offered when moving up to each stage.
  const UPGRADES = { 2: ['garden-shed', 'container', 'garage'] };

  // =========================================================
  // 5. Put it all together
  // =========================================================
  // Returns the whole picture as text. game.js drops it into the page, then
  // fills the empty .books and .customers groups as the game runs.
  function render(locationId, buildingId) {
    const building = BUILDINGS[buildingId] || BUILDINGS.lfl;
    const locId = BACKDROPS[locationId] ? locationId : 'park';
    const loc = LOCATIONS.find(l => l.id === locId);
    const color = building.paint || (loc && loc.boxColor) || '#a9b5b7';
    const [skyTop, skyBottom] = SKIES[locId];
    return `<svg viewBox="0 0 ${VIEW.width} ${VIEW.height}" xmlns="http://www.w3.org/2000/svg" role="img">
      ${defs(skyTop, skyBottom)}
      <g class="backdrop" filter="url(#wobble)">${BACKDROPS[locId](building.backdropOpts || {})}</g>
      <g class="building">${building.draw(color)}</g>
      <g class="books"></g>
      <g class="front">${building.front()}</g>
      <g class="customers"></g>
      <g class="effects"></g>
    </svg>`;
  }

  // Only these names are visible to game.js.
  return { LOCATIONS, BUILDINGS, UPGRADES, VIEW, GROUND_Y, render };
})();
