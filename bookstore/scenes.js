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
      <radialGradient id="roundWall" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="1" stop-color="#8a8f94" stop-opacity="0.35"/>
      </radialGradient>
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

  // ---- Stage three streets: the same high street, dressed in one architectural style ----

  // Dark timbers over a cream wall, for Tudor gables. (x, y, w, h) is the wall.
  function halfTimber(x, y, w, h) {
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#efe6d2"/>`;
    out += `<g stroke="#3d2a22" stroke-width="4" stroke-linecap="square">`;
    for (let tx = x + 14; tx < x + w - 6; tx += 18) out += `<line x1="${tx}" y1="${y}" x2="${tx}" y2="${y + h}"/>`;
    out += `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}"/><line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}"/>`;
    out += `<line x1="${x + 2}" y1="${y + h - 2}" x2="${x + 30}" y2="${y + 4}"/><line x1="${x + w - 2}" y1="${y + h - 2}" x2="${x + w - 30}" y2="${y + 4}"/>`;
    out += `</g>`;
    return out;
  }
  // A window with a grid of small panes.
  function leadedWindow(x, y, w, h, frame) {
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#dfe8ea" stroke="${frame}" stroke-width="2.5"/>`;
    out += `<g stroke="${frame}" stroke-width="1" opacity="0.8">`;
    for (let gx = x + w / 3; gx < x + w - 1; gx += w / 3) out += `<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}"/>`;
    for (let gy = y + h / 3; gy < y + h - 1; gy += h / 3) out += `<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}"/>`;
    return out + `</g>`;
  }
  function shutters(x, y, w, h, color) {
    return `<g fill="${color}"><rect x="${x - 9}" y="${y}" width="8" height="${h}"/><rect x="${x + w + 1}" y="${y}" width="8" height="${h}"/></g>`;
  }
  function streetLamp(x) {
    return `<rect x="${x}" y="${y_lamp}" width="5" height="${400 - y_lamp}" fill="#3a3f44"/><rect x="${x - 9}" y="${y_lamp - 24}" width="23" height="26" fill="#3a3f44"/><rect x="${x - 5}" y="${y_lamp - 20}" width="15" height="18" fill="#f2e6b8"/>`;
  }
  const y_lamp = 262;
  function boxwood(x, y, r) { return `<circle cx="${x}" cy="${y}" r="${r}" fill="#4f7a4a"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.45}" fill="#6a955f"/>`; }

  // A neighbouring Dutch colonial: clapboard body, gambrel roof, shuttered windows.
  function gambrelNeighbor(x, w, body, roof, shutter) {
    const top = 268, eave = 262;
    let out = `<rect x="${x}" y="${top}" width="${w}" height="${370 - top}" fill="${body}" stroke="#a8a091" stroke-width="1"/>`;
    out += hLines(x, x + w, top + 10, 366, 8, 0.06);
    out += `<polygon points="${x - 10},${eave} ${x + w * 0.14},${eave - 52} ${x + w * 0.3},${eave - 78} ${x + w * 0.7},${eave - 78} ${x + w * 0.86},${eave - 52} ${x + w + 10},${eave}" fill="${roof}" stroke="#4a4946" stroke-width="1.5"/>`;
    out += `<rect x="${x + w * 0.42}" y="${eave - 44}" width="${w * 0.16}" height="30" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="3"/>`;
    [0.12, 0.62].forEach(f => {
      out += `<rect x="${x + w * f}" y="292" width="${w * 0.22}" height="40" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="3"/>`;
      out += shutters(x + w * f, 292, w * 0.22, 40, shutter);
    });
    out += `<rect x="${x + w * 0.42}" y="330" width="${w * 0.16}" height="40" fill="${shutter}"/>`;
    return out;
  }
  // A neighbouring Cape: shingled body, steep roof with one dormer, chimney.
  function capeNeighbor(x, w, body, roof) {
    const top = 282;
    let out = `<rect x="${x}" y="${top}" width="${w}" height="${370 - top}" fill="${body}" stroke="#9a9384" stroke-width="1"/>`;
    out += hLines(x, x + w, top + 8, 366, 7, 0.07);
    out += `<polygon points="${x - 10},${top + 4} ${x + w / 2},${top - 80} ${x + w + 10},${top + 4}" fill="${roof}" stroke="#4a4946" stroke-width="1.5"/>`;
    out += `<rect x="${x + w * 0.62}" y="${top - 70}" width="14" height="36" fill="#a86b5f"/>`;
    out += `<rect x="${x + w * 0.42}" y="${top - 36}" width="${w * 0.16}" height="30" fill="#f4f1e8"/><polygon points="${x + w * 0.4},${top - 34} ${x + w * 0.5},${top - 48} ${x + w * 0.6},${top - 34}" fill="${roof}"/>`;
    out += `<rect x="${x + w * 0.45}" y="${top - 32}" width="${w * 0.1}" height="22" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="2"/>`;
    [0.1, 0.64].forEach(f => {
      out += `<rect x="${x + w * f}" y="300" width="${w * 0.24}" height="42" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="3"/>`;
      out += shutters(x + w * f, 300, w * 0.24, 42, '#1f3b33');
    });
    out += `<rect x="${x + w * 0.43}" y="326" width="${w * 0.14}" height="44" fill="#1f3b33"/>`;
    return out;
  }
  // A neighbouring Tudor shop: brick below, half-timbered above, steep gable.
  function tudorNeighbor(x, w, brick) {
    let out = `<rect x="${x}" y="300" width="${w}" height="70" fill="${brick}" stroke="#5b3d33" stroke-width="1"/>`;
    out += hLines(x, x + w, 306, 366, 6, 0.1);
    out += halfTimber(x, 248, w, 52);
    out += `<polygon points="${x - 10},250 ${x + w / 2},176 ${x + w + 10},250" fill="#5b4a40" stroke="#3d2a22" stroke-width="1.5"/>`;
    out += leadedWindow(x + w * 0.3, 258, w * 0.4, 32, '#3d2a22');
    out += leadedWindow(x + w * 0.1, 310, w * 0.34, 40, '#3d2a22') + leadedWindow(x + w * 0.56, 310, w * 0.34, 40, '#3d2a22');
    return out;
  }

  function street3dutch() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(150, 70, 55) + cloud(660, 90, 60);
    s += pavementAndRoad();
    s += gambrelNeighbor(-40, 230, '#c9d2d6', '#6d6259', '#4a5a8a');
    s += gambrelNeighbor(610, 240, '#e9dcae', '#7a6a58', '#4f7a4a');
    s += streetLamp(600);
    s += boxwood(205, 390, 10) + boxwood(590, 392, 9) + boxwood(190, 394, 7);
    return s;
  }
  function street3cape() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(230, 60, 50) + cloud(620, 110, 55);
    s += pavementAndRoad();
    s += capeNeighbor(-30, 220, '#b9b0a0', '#6b625a');
    s += capeNeighbor(610, 230, '#d9d0bf', '#5f5750');
    s += streetLamp(600);
    s += hydrangeas(180, 384) + hydrangeas(585, 384);
    return s;
  }
  function street3tudor() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(180, 80, 50) + cloud(640, 70, 50);
    s += pavementAndRoad();
    s += tudorNeighbor(-30, 230, '#8f5b4a');
    s += tudorNeighbor(600, 240, '#7d4f42');
    s += streetLamp(598);
    s += boxwood(212, 392, 9) + boxwood(588, 392, 9);
    return s;
  }

  // ---- Stage four places ----

  // The town green: old trees, a fence, a path. The church stands here.
  function green() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(140, 70, 55) + cloud(660, 95, 60);
    s += `<path d="M0 262 Q80 232 160 258 T320 252 T480 262 T640 250 T800 262 L800 300 L0 300 Z" fill="#7f9a68"/>`;
    s += `<rect x="0" y="292" width="800" height="160" fill="#9dbb6f"/>`;
    [[70, 200], [730, 205]].forEach(([cx, cy]) => {
      s += `<rect x="${cx - 12}" y="${cy + 40}" width="24" height="160" fill="#7a5a3e"/>`;
      s += `<g fill="#6f9556"><circle cx="${cx}" cy="${cy}" r="72"/><circle cx="${cx - 45}" cy="${cy + 40}" r="46"/><circle cx="${cx + 48}" cy="${cy + 30}" r="52"/></g>`;
      s += `<g fill="#7fa563"><circle cx="${cx - 10}" cy="${cy - 22}" r="40"/><circle cx="${cx + 36}" cy="${cy}" r="28"/></g>`;
    });
    s += `<polygon points="370,400 430,400 470,450 330,450" fill="#d5c7a2"/>`;
    s += picketFence(0, 330, 400) + picketFence(470, 800, 400);
    s += hydrangeas(20, 380) + hydrangeas(740, 380);
    s += `<g fill="#8b6f4e"><rect x="560" y="356" width="80" height="7"/><rect x="560" y="338" width="80" height="5"/><rect x="565" y="360" width="5" height="40"/><rect x="630" y="360" width="5" height="40"/></g>`;
    return s;
  }

  // A cliff over the sea at sunset. The lighthouse stands here.
  function cliff() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += `<g fill="#e8b4a0" opacity="0.55"><ellipse cx="180" cy="120" rx="120" ry="14"/><ellipse cx="560" cy="80" rx="150" ry="12"/><ellipse cx="660" cy="150" rx="110" ry="10"/></g>`;
    s += `<circle cx="690" cy="215" r="26" fill="#f6d9a8" opacity="0.9"/>`;
    s += `<rect x="0" y="236" width="800" height="214" fill="#5f6f95"/>`;
    s += `<g stroke="#c9a9b4" stroke-width="2" opacity="0.7"><line x1="600" y1="262" x2="760" y2="262"/><line x1="640" y1="280" x2="780" y2="280"/><line x1="660" y1="300" x2="800" y2="300"/><line x1="680" y1="330" x2="800" y2="330"/></g>`;
    s += `<path d="M120 246 l10 -18 l3 18 z" fill="#f4f1e8" opacity="0.9"/><rect x="117" y="246" width="18" height="3" fill="#3a3f44"/>`;
    s += `<polygon points="0,338 660,338 690,450 0,450" fill="#7f9a68"/>`;
    s += `<polygon points="0,330 660,330 664,342 0,342" fill="#95ad74"/>`;
    s += `<polygon points="660,338 800,450 690,450" fill="#6b5a50"/><polygon points="668,352 760,450 700,450" fill="#5a4a42"/>`;
    [90, 150, 230, 610, 640].forEach((x, i) => { s += grassTuft(x, 336 + (i % 2) * 4); });
    s += picketFence(40, 250, 400);
    s += seagull(520, 190) + seagull(570, 205);
    return s;
  }

  // A harbour with a plank dock. The ship is moored here.
  function harbor() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(120, 90, 50) + cloud(600, 60, 60);
    s += seagull(200, 130) + seagull(700, 110);
    s += `<rect x="0" y="228" width="800" height="14" fill="#8fa68a"/><g fill="#f4f1e8"><rect x="90" y="214" width="14" height="14"/><rect x="150" y="218" width="10" height="10"/></g><polygon points="88,214 97,204 106,214" fill="#5a5f66"/>`;
    s += `<rect x="0" y="240" width="800" height="210" fill="#6f8fa0"/>`;
    s += `<g stroke="#9fb8c4" stroke-width="2" fill="none" stroke-linecap="round"><path d="M40 262 q15 -4 30 0"/><path d="M700 258 q15 -4 30 0"/><path d="M740 300 q15 -4 30 0"/><path d="M60 330 q15 -4 30 0"/><path d="M720 350 q15 -4 30 0"/></g>`;
    s += `<rect x="0" y="372" width="800" height="78" fill="#b39a6f"/>`;
    s += `<g stroke="#9c845c" stroke-width="2">${[388, 406, 424, 442].map(y => `<line x1="0" y1="${y}" x2="800" y2="${y}"/>`).join('')}</g>`;
    s += `<g fill="#7d6b58"><rect x="30" y="336" width="14" height="40"/><rect x="756" y="336" width="14" height="40"/><rect x="120" y="344" width="12" height="32"/></g>`;
    s += `<path d="M44 350 Q90 372 126 356" stroke="#c9b28a" stroke-width="2" fill="none"/>`;
    s += `<rect x="690" y="382" width="34" height="18" fill="#8b6f4e" stroke="#5a4a42"/><g stroke="#5a4a42" stroke-width="1"><line x1="690" y1="391" x2="724" y2="391"/><line x1="701" y1="382" x2="701" y2="400"/><line x1="712" y1="382" x2="712" y2="400"/></g>`;
    s += `<circle cx="70" cy="392" r="9" fill="none" stroke="#c9b28a" stroke-width="4"/>`;
    return s;
  }

  const BACKDROPS = { beach, park, street, street2, street3dutch, street3cape, street3tudor, green, cliff, harbor };
  const SKIES = {
    beach: ['#b9d3dc', '#eef0e6'],
    park: ['#c9dde4', '#eef3ea'],
    street: ['#cddfe6', '#f1efe4'],
    street2: ['#cddfe6', '#f1efe4'],
    street3dutch: ['#c6dbe4', '#f1efe4'],
    street3cape: ['#cfe0e6', '#f3f0e6'],
    street3tudor: ['#c9d8e2', '#efece4'],
    green: ['#c9dde4', '#eef3ea'],
    cliff: ['#7a6f9c', '#f2c4a0'],
    harbor: ['#c6d8e0', '#eef0e6']
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

  // Shelf layouts for interiors (used from stage three on). Defined early so the
  // buildings below can refer to them.
  function interiorShelves(rows, firstBottom, spacing, minH, varH) {
    const shelves = [];
    for (let r = 0; r < rows; r++) {
      shelves.push({ bottom: firstBottom + r * spacing, firstX: 134, step: 10.7, width: 8.4, count: 50, minH, varH });
    }
    return shelves;
  }
  const SHOP_INTERIOR_SHELVES = interiorShelves(5, 170, 40, 24, 9);    // 5 x 50 = 250
  const BIG_INTERIOR_SHELVES = interiorShelves(10, 132, 22, 14, 6);    // 10 x 50 = 500
  const INTERIOR_STOPS = { left: 230, right: 470 };

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

  // ---- Stage three: a real shop, in a converted house on the high street ----
  // All three share the same footprint: body x 230..570, two shop windows
  // (240..370 and 430..560, y 285..395) and a door at 385..415. Each shop window
  // shows five shelves of twenty-five books: 250 in all.
  const SHOP_WINDOW_SHELVES = [307, 329, 351, 373, 395];
  function houseShelves() {
    const left = SHOP_WINDOW_SHELVES.map(bottom => ({ bottom, firstX: 242, step: 5.2, width: 4.1, count: 25, minH: 13, varH: 6 }));
    const right = SHOP_WINDOW_SHELVES.map(bottom => ({ bottom, firstX: 432, step: 5.2, width: 4.1, count: 25, minH: 13, varH: 6 }));
    return left.concat(right);
  }
  // Interior, shelf boards and door shared by the three houses. Drawn behind the books.
  function shopFrontBack(doorColor) {
    let s = `<g fill="#3d3a36"><rect x="240" y="285" width="130" height="110"/><rect x="430" y="285" width="130" height="110"/></g>`;
    SHOP_WINDOW_SHELVES.forEach(b => { s += `<rect x="240" y="${b}" width="130" height="2" fill="#8a7460"/><rect x="430" y="${b}" width="130" height="2" fill="#8a7460"/>`; });
    s += `<rect x="385" y="305" width="30" height="95" fill="${doorColor}"/>`;
    return s;
  }
  // Glass tint and frames, drawn in front of the books.
  function shopFrontGlass(frame) {
    let s = `<g fill="#dfeaf0" opacity="0.12"><rect x="240" y="285" width="130" height="110"/><rect x="430" y="285" width="130" height="110"/></g>`;
    s += `<g fill="#fff" opacity="0.18"><polygon points="240,285 275,285 240,340"/><polygon points="430,285 465,285 430,340"/></g>`;
    s += `<g fill="none" stroke="${frame}" stroke-width="3"><rect x="240" y="285" width="130" height="110"/><rect x="430" y="285" width="130" height="110"/></g>`;
    return s;
  }

  BUILDINGS['dutch-colonial'] = {
    id: 'dutch-colonial',
    stage: 3,
    name: 'Dutch colonial',
    blurb: 'Gambrel roof, white clapboard, a blue door and a balcony nobody uses. A Cape classic.',
    location: 'street3dutch',
    capacity: 250,
    interior: { shelves: SHOP_INTERIOR_SHELVES, stops: INTERIOR_STOPS },
    door: { x: 400, y: 350 },
    paint: '#f4f1e8',
    shelves: houseShelves(),
    sign: { size: 11, small: 9 },
    stops: { left: 205, right: 595 },
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="400" cy="${GROUND_Y}" rx="185" ry="6" fill="#000" opacity="0.08"/>`;
      s += `<rect x="230" y="250" width="340" height="150" fill="${color}" stroke="#b5aea0" stroke-width="1.5"/>`;
      s += hLines(230, 570, 260, 396, 8, 0.06);
      // gambrel roof
      s += `<polygon points="215,255 255,185 300,150 500,150 545,185 585,255" fill="#7a6a58" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<g stroke="#4a4946" stroke-width="1" opacity="0.25"><line x1="238" y1="215" x2="562" y2="215"/><line x1="255" y1="185" x2="545" y2="185"/><line x1="278" y1="168" x2="522" y2="168"/></g>`;
      s += `<rect x="518" y="146" width="16" height="32" fill="#a86b5f"/>`;
      // central gable with balcony
      s += `<polygon points="348,252 400,178 452,252" fill="#8f8f8a" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<rect x="388" y="205" width="24" height="34" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="3"/>` + shutters(388, 205, 24, 34, '#f4f1e8');
      s += `<rect x="352" y="246" width="96" height="4" fill="#f4f1e8"/><g stroke="#f4f1e8" stroke-width="2">${[358, 370, 382, 394, 406, 418, 430, 442].map(x => `<line x1="${x}" y1="236" x2="${x}" y2="250"/>`).join('')}</g><rect x="352" y="234" width="96" height="3" fill="#f4f1e8"/>`;
      // shop front interior and door
      s += shopFrontBack('#4a5a8a');
      s += shutters(240, 285, 130, 110, '#c5cfd8') + shutters(430, 285, 130, 110, '#c5cfd8');
      // portico
      s += `<rect x="360" y="252" width="80" height="8" fill="#f4f1e8" stroke="#b5aea0"/>`;
      s += `<g fill="#f7f4ec" stroke="#b5aea0" stroke-width="1"><rect x="366" y="260" width="8" height="140"/><rect x="426" y="260" width="8" height="140"/></g>`;
      s += `<g fill="#f4f1e8"><rect x="376" y="305" width="7" height="95" opacity="0.9"/><rect x="417" y="305" width="7" height="95" opacity="0.9"/></g>`;
      s += `<rect x="372" y="394" width="56" height="6" fill="#9a948a"/>`;
      s += boxwood(252, 390, 10) + boxwood(282, 392, 9) + boxwood(518, 392, 9) + boxwood(548, 390, 10);
      return s;
    },
    front() {
      return shopFrontGlass('#f4f1e8') + signBoard(330, 264, 140, 18, this.sign.size);
    }
  };

  BUILDINGS['cape-cod'] = {
    id: 'cape-cod',
    stage: 3,
    name: 'Cape Cod cottage',
    blurb: 'Named for the place. Steep roof, three dormers, green shutters, two chimneys, one cat.',
    location: 'street3cape',
    capacity: 250,
    interior: { shelves: SHOP_INTERIOR_SHELVES, stops: INTERIOR_STOPS },
    door: { x: 400, y: 350 },
    paint: '#f6f3ea',
    shelves: houseShelves(),
    sign: { size: 11, small: 9 },
    stops: { left: 205, right: 595 },
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="400" cy="${GROUND_Y}" rx="185" ry="6" fill="#000" opacity="0.08"/>`;
      s += `<rect x="230" y="262" width="340" height="138" fill="${color}" stroke="#b5aea0" stroke-width="1.5"/>`;
      s += hLines(230, 570, 272, 396, 6, 0.05);
      // roof and chimneys
      s += `<polygon points="215,266 400,160 585,266" fill="#6b625a" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<g stroke="#4a4946" stroke-width="1" opacity="0.25"><line x1="262" y1="240" x2="538" y2="240"/><line x1="296" y1="220" x2="504" y2="220"/><line x1="330" y1="200" x2="470" y2="200"/></g>`;
      s += `<g fill="#a86b5f"><rect x="246" y="208" width="16" height="44"/><rect x="536" y="198" width="16" height="52"/></g>`;
      // three dormers
      [275, 400, 525].forEach(cx => {
        s += `<rect x="${cx - 16}" y="206" width="32" height="46" fill="#f6f3ea" stroke="#b5aea0" stroke-width="1"/>`;
        s += `<polygon points="${cx - 20},208 ${cx},190 ${cx + 20},208" fill="#6b625a" stroke="#4a4946" stroke-width="1.5"/>`;
        s += `<rect x="${cx - 9}" y="214" width="18" height="30" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="2"/><line x1="${cx}" y1="214" x2="${cx}" y2="244" stroke="#b5aea0"/>`;
      });
      // shop front interior and door, shutters, arched surround
      s += shopFrontBack('#1f3b33');
      s += shutters(240, 285, 130, 110, '#1f3b33') + shutters(430, 285, 130, 110, '#1f3b33');
      s += `<path d="M378 400 v-92 a22 22 0 0 1 44 0 v92 z" fill="#f7f4ec" stroke="#b5aea0"/><path d="M385 400 v-88 a15 15 0 0 1 30 0 v88 z" fill="#1f3b33"/><circle cx="410" cy="352" r="1.8" fill="#d9a441"/>`;
      // lanterns and topiaries
      s += `<g fill="#2b2a28"><rect x="368" y="318" width="7" height="12"/><rect x="425" y="318" width="7" height="12"/></g><g fill="#f2e6b8"><rect x="369.5" y="320" width="4" height="8"/><rect x="426.5" y="320" width="4" height="8"/></g>`;
      s += `<g fill="#b8734f"><rect x="366" y="386" width="12" height="14"/><rect x="422" y="386" width="12" height="14"/></g>` + boxwood(372, 378, 8) + boxwood(428, 378, 8);
      s += `<rect x="374" y="394" width="52" height="6" fill="#a86b5f"/>`;
      // the cat in the right window sill
      s += `<g fill="#3b332c"><ellipse cx="540" cy="391" rx="9" ry="4"/><circle cx="548" cy="386" r="4"/><polygon points="545,383 546,378 548,383"/><polygon points="549,383 551,378 552,383"/></g>`;
      return s;
    },
    front() {
      return shopFrontGlass('#f4f1e8') + signBoard(330, 266, 140, 17, this.sign.size);
    }
  };

  BUILDINGS.tudor = {
    id: 'tudor',
    stage: 3,
    name: 'Tudor revival',
    blurb: 'Brick below, timber and plaster above, an arched door that creaks on purpose.',
    location: 'street3tudor',
    capacity: 250,
    interior: { shelves: SHOP_INTERIOR_SHELVES, stops: INTERIOR_STOPS },
    door: { x: 400, y: 350 },
    paint: '#8f5b4a',
    shelves: houseShelves(),
    sign: { size: 11, small: 9 },
    stops: { left: 205, right: 595 },
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="400" cy="${GROUND_Y}" rx="185" ry="6" fill="#000" opacity="0.08"/>`;
      s += `<rect x="230" y="250" width="340" height="150" fill="${color}" stroke="#5b3d33" stroke-width="1.5"/>`;
      s += hLines(230, 570, 256, 396, 6, 0.1);
      // main roof and chimneys
      s += `<polygon points="215,255 300,160 500,160 585,255" fill="#5b4a40" stroke="#3d2a22" stroke-width="1.5"/>`;
      s += `<g fill="#7d4f42"><rect x="468" y="130" width="16" height="40"/><rect x="556" y="150" width="16" height="50"/></g>`;
      // two half-timbered gables
      [[232, 378], [422, 568]].forEach(([x1, x2]) => {
        const mid = (x1 + x2) / 2;
        s += `<polygon points="${x1},255 ${mid},166 ${x2},255" fill="#efe6d2" stroke="#3d2a22" stroke-width="1.5"/>`;
        s += `<g stroke="#3d2a22" stroke-width="4" stroke-linecap="square"><line x1="${mid}" y1="172" x2="${mid}" y2="196"/><line x1="${mid - 26}" y1="212" x2="${mid - 26}" y2="255"/><line x1="${mid + 26}" y1="212" x2="${mid + 26}" y2="255"/><line x1="${x1 + 2}" y1="253" x2="${x2 - 2}" y2="253"/><line x1="${mid - 50}" y1="253" x2="${mid - 26}" y2="212"/><line x1="${mid + 50}" y1="253" x2="${mid + 26}" y2="212"/></g>`;
        s += `<polygon points="${x1 - 8},257 ${mid},160 ${x2 + 8},257 ${x2 - 4},257 ${mid},176 ${x1 + 4},257" fill="#3d2a22"/>`;
        s += leadedWindow(mid - 18, 204, 36, 42, '#3d2a22');
      });
      s += leadedWindow(386, 200, 28, 38, '#3d2a22');
      // shop front interior, door with stone surround
      s += shopFrontBack('#3d2a22');
      s += `<path d="M378 400 v-95 a22 22 0 0 1 44 0 v95 z" fill="#cfc6b4" stroke="#9a9384"/><path d="M385 400 v-90 a15 15 0 0 1 30 0 v90 z" fill="#3d2a22"/><rect x="393" y="330" width="14" height="10" fill="#dfe8ea" opacity="0.7"/>`;
      s += `<rect x="395" y="290" width="10" height="12" fill="#2b2a28"/><rect x="397" y="292" width="6" height="8" fill="#f2e6b8"/>`;
      s += `<rect x="372" y="394" width="56" height="6" fill="#9a9384"/>`;
      s += boxwood(255, 392, 9) + boxwood(545, 392, 9);
      return s;
    },
    front() {
      // dark mullions across the shop windows, in the Tudor manner
      let s = shopFrontGlass('#3d2a22');
      s += `<g stroke="#3d2a22" stroke-width="2" opacity="0.85">${[272, 305, 338, 462, 495, 528].map(x => `<line x1="${x}" y1="285" x2="${x}" y2="395"/>`).join('')}</g>`;
      return s + signBoard(330, 262, 140, 18, this.sign.size);
    }
  };

  // =========================================================
  // Interiors
  // =========================================================
  // From stage three on, the player can step inside. Every interior shares one
  // layout: a wall of bookcases across the back (x 130..670), a floor at y 372,
  // a counter on the right, and style-specific walls, windows and props.


  function floorPlanks(color, lineColor) {
    let out = `<rect x="0" y="372" width="800" height="78" fill="${color}"/>`;
    out += `<g stroke="${lineColor}" stroke-width="1.5" opacity="0.5">${[386, 402, 420, 440].map(y => `<line x1="0" y1="${y}" x2="800" y2="${y}"/>`).join('')}`;
    out += [60, 210, 380, 540, 700].map((x, i) => `<line x1="${x}" y1="${372 + (i % 2) * 14}" x2="${x + 3}" y2="${386 + (i % 2) * 16}"/>`).join('') + `</g>`;
    return out;
  }
  function stoneFloor() {
    let out = `<rect x="0" y="372" width="800" height="78" fill="#b5aea2"/>`;
    out += `<g stroke="#9a9384" stroke-width="1.5" opacity="0.7">${[390, 410, 432].map(y => `<line x1="0" y1="${y}" x2="800" y2="${y}"/>`).join('')}`;
    for (let x = 30; x < 800; x += 70) out += `<line x1="${x}" y1="372" x2="${x + 6}" y2="450"/>`;
    return out + `</g>`;
  }
  function hangingLamp(x, shade, cordTop) {
    return `<line x1="${x}" y1="${cordTop}" x2="${x}" y2="${cordTop + 50}" stroke="#3a3f44" stroke-width="2"/>
      <polygon points="${x - 22},${cordTop + 72} ${x - 10},${cordTop + 50} ${x + 10},${cordTop + 50} ${x + 22},${cordTop + 72}" fill="${shade}"/>
      <ellipse cx="${x}" cy="${cordTop + 74}" rx="20" ry="4" fill="#f2e6b8" opacity="0.9"/>
      <ellipse cx="${x}" cy="${cordTop + 110}" rx="60" ry="30" fill="#f2e6b8" opacity="0.12"/>`;
  }
  function counter(wood, top) {
    let out = `<rect x="560" y="340" width="150" height="60" fill="${wood}" stroke="#3d2a22" stroke-width="1"/>`;
    out += `<rect x="554" y="334" width="162" height="8" fill="${top}" stroke="#3d2a22" stroke-width="1"/>`;
    out += `<rect x="600" y="316" width="30" height="20" rx="3" fill="#7d6b58"/><rect x="604" y="308" width="22" height="10" rx="2" fill="#d9a441"/>`;
    out += `<g fill="#b7736b"><rect x="650" y="322" width="8" height="12"/><rect x="659" y="318" width="8" height="16"/><rect x="668" y="324" width="8" height="10"/></g>`;
    return out;
  }
  function rug(cx, color, stripe) {
    return `<ellipse cx="${cx}" cy="412" rx="150" ry="20" fill="${color}"/><ellipse cx="${cx}" cy="412" rx="120" ry="14" fill="none" stroke="${stripe}" stroke-width="3" opacity="0.7"/>`;
  }
  function porthole(cx, cy) {
    return `<circle cx="${cx}" cy="${cy}" r="24" fill="#d9a441"/><circle cx="${cx}" cy="${cy}" r="18" fill="#7fa3ad"/><path d="M${cx - 18} ${cy + 4} q18 -8 36 0 v8 h-36 z" fill="#5f8a94"/><circle cx="${cx - 6}" cy="${cy - 7}" r="4" fill="#fff" opacity="0.6"/>`;
  }
  function fireplace(x, brick, mantel) {
    let out = `<rect x="${x}" y="200" width="110" height="172" fill="${brick}" stroke="#5b3d33" stroke-width="1"/>`;
    out += hLines(x, x + 110, 208, 366, 8, 0.15);
    out += `<rect x="${x - 6}" y="196" width="122" height="8" fill="${mantel}"/>`;
    out += `<rect x="${x + 22}" y="272" width="66" height="100" fill="#2b2a28"/>`;
    out += `<g fill="#d9a441"><ellipse cx="${x + 55}" cy="352" rx="18" ry="16"/></g><g fill="#e59a5c"><ellipse cx="${x + 50}" cy="356" rx="10" ry="12"/></g><g fill="#f2e6b8"><ellipse cx="${x + 56}" cy="360" rx="5" ry="7"/></g>`;
    out += `<g fill="#5a3e2c"><rect x="${x + 30}" y="362" width="50" height="6"/></g>`;
    out += `<g fill="#b7736b"><rect x="${x + 10}" y="182" width="7" height="14"/><rect x="${x + 18}" y="180" width="7" height="16"/></g><rect x="${x + 70}" y="176" width="16" height="20" fill="#dfe8ea" stroke="#7d6b58"/>`;
    return out;
  }
  function shutteredWindow(x, y, w, h, shutter, trim) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#dfe8ea" stroke="${trim}" stroke-width="3"/><line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${trim}" stroke-width="2"/><line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${trim}" stroke-width="2"/>` + shutters(x, y, w, h, shutter);
  }
  function stainedArch(x, y, w, h) {
    const colors = ['#8b9cc9', '#b6413a', '#d9a441', '#4f7a4a', '#9b7f9c', '#7fa3ad'];
    let out = `<path d="M${x} ${y + h} v-${h - w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 v${h - w / 2} z" fill="#dfe8ea" stroke="#5a5f66" stroke-width="3"/>`;
    for (let i = 0; i < 6; i++) {
      out += `<rect x="${x + 4 + (i % 2) * (w / 2 - 4)}" y="${y + w / 2 + Math.floor(i / 2) * ((h - w / 2) / 3)}" width="${w / 2 - 4}" height="${(h - w / 2) / 3 - 3}" fill="${colors[i]}" opacity="0.8"/>`;
    }
    out += `<circle cx="${x + w / 2}" cy="${y + w / 2 - 4}" r="${w / 4}" fill="#d9a441" opacity="0.85"/>`;
    return out;
  }

  // Builds an interior from a style description. Each field is optional and
  // returns SVG text: texture(), floor(), ceiling(), left(), right(), props(), lamp().
  function interior(style, shelves) {
    const top = shelves[0].bottom - shelves[0].minH - shelves[0].varH - 6;
    let s = `<rect width="800" height="450" fill="${style.wall}"/>`;
    if (style.texture) s += style.texture();
    s += style.floor();
    s += `<rect x="0" y="366" width="800" height="7" fill="${style.trim}"/>`;
    if (style.ceiling) s += style.ceiling();
    if (style.left) s += style.left();
    if (style.right) s += style.right();
    s += `<rect x="122" y="${top - 10}" width="556" height="${348 - (top - 10)}" fill="${style.bookcase}" stroke="${style.trim}" stroke-width="1.5"/>`;
    s += `<rect x="130" y="${top}" width="540" height="${334 - top}" fill="#3d3a36"/>`;
    shelves.forEach(sh => { s += `<rect x="130" y="${sh.bottom}" width="540" height="3" fill="${style.shelfBoard}"/>`; });
    s += `<rect x="122" y="334" width="556" height="14" fill="${style.bookcase}" stroke="${style.trim}" stroke-width="1"/>`;
    if (style.rugColor) s += rug(340, style.rugColor, style.rugStripe);
    if (style.props) s += style.props();
    return s;
  }
  // Things in front of the books: the counter with the name plate, and the lamp.
  function interiorFront(style, signSize) {
    let s = counter(style.counterWood, style.counterTop);
    s += signBoard(575, 356, 120, 16, signSize);
    if (style.lamp) s += style.lamp();
    return s;
  }

  const INTERIORS = {};

  INTERIORS['dutch-colonial'] = {
    wall: '#f4f1e8', trim: '#4a5a8a', bookcase: '#f7f4ec', shelfBoard: '#c9c0ae',
    rugColor: '#8b9cc9', rugStripe: '#4a5a8a', counterWood: '#f7f4ec', counterTop: '#c19a6b',
    texture: () => vLines(6, 800, 0, 366, 12, 0.05),
    floor: () => floorPlanks('#c19a6b', '#a07a55'),
    // the front door, open to the street
    left: () => `<rect x="14" y="190" width="84" height="182" fill="#4a5a8a"/><rect x="22" y="198" width="68" height="174" fill="#dfe8ea"/>
      <rect x="22" y="300" width="68" height="72" fill="#c9c3b6"/>
      <g fill="#6f9556"><circle cx="40" cy="250" r="14"/><circle cx="72" cy="240" r="16"/></g>
      <polygon points="14,190 -30,176 -30,386 14,372" fill="#3f4f7a"/><circle cx="-4" cy="284" r="2.5" fill="#d9a441"/>`,
    right: () => shutteredWindow(716, 190, 60, 90, '#f4f1e8', '#4a5a8a') + `<rect x="708" y="280" width="76" height="7" fill="#4a5a8a"/>` + flower(722, 278, '#d98c9c') + flower(746, 276, '#ffffff') + flower(768, 278, '#d98c9c'),
    lamp: () => hangingLamp(400, '#4a5a8a', 0),
    props: () => `<rect x="0" y="20" width="800" height="8" fill="#4a5a8a" opacity="0.5"/>`
  };

  INTERIORS['cape-cod'] = {
    wall: '#f6f3ea', trim: '#1f3b33', bookcase: '#1f3b33', shelfBoard: '#2f5a4a',
    rugColor: '#b6413a', rugStripe: '#e9e2cf', counterWood: '#1f3b33', counterTop: '#a8865c',
    floor: () => floorPlanks('#a8865c', '#8a6a48'),
    ceiling: () => `<g fill="#e9e4d6" stroke="#cfc6b4" stroke-width="1"><rect x="0" y="24" width="800" height="12"/><rect x="0" y="66" width="800" height="12"/></g>`,
    left: () => shutteredWindow(30, 190, 64, 96, '#1f3b33', '#f4f1e8') + `<rect x="22" y="286" width="80" height="7" fill="#f4f1e8"/>` + flower(40, 284, '#e8c46a') + flower(62, 282, '#d98c9c') + flower(86, 284, '#ffffff'),
    right: () => fireplace(690, '#a86b5f', '#f4f1e8'),
    lamp: () => `<rect x="392" y="60" width="16" height="22" fill="#2b2a28"/><rect x="395" y="64" width="10" height="14" fill="#f2e6b8"/><line x1="400" y1="36" x2="400" y2="60" stroke="#2b2a28" stroke-width="2"/>`,
    // the cat, on the hearth rug
    props: () => `<ellipse cx="660" cy="404" rx="34" ry="10" fill="#e9e2cf"/><g fill="#3b332c"><ellipse cx="655" cy="396" rx="16" ry="7"/><circle cx="670" cy="390" r="6"/><polygon points="666,386 667,379 670,386"/><polygon points="672,386 675,379 676,386"/><path d="M639 396 q-14 -2 -12 10" stroke="#3b332c" stroke-width="3" fill="none"/></g>`
  };

  INTERIORS.tudor = {
    wall: '#efe6d2', trim: '#3d2a22', bookcase: '#5b3d2e', shelfBoard: '#3d2a22',
    rugColor: '#8f5b4a', rugStripe: '#d9a441', counterWood: '#5b3d2e', counterTop: '#3d2a22',
    floor: () => floorPlanks('#6b4a3a', '#4a3024'),
    ceiling: () => `<g fill="#3d2a22"><rect x="0" y="0" width="800" height="14"/><rect x="0" y="46" width="800" height="10"/><rect x="0" y="96" width="800" height="10"/><rect x="104" y="0" width="12" height="366"/><rect x="684" y="0" width="12" height="366"/></g>
      <g stroke="#3d2a22" stroke-width="6"><line x1="20" y1="14" x2="104" y2="96"/><line x1="780" y1="14" x2="696" y2="96"/></g>`,
    left: () => fireplace(0, '#8f5b4a', '#3d2a22'),
    right: () => leadedWindow(712, 170, 64, 120, '#3d2a22') + `<rect x="704" y="290" width="80" height="7" fill="#3d2a22"/>`,
    lamp: () => `<line x1="400" y1="14" x2="400" y2="54" stroke="#2b2a28" stroke-width="2"/><rect x="388" y="54" width="24" height="30" fill="#2b2a28"/><rect x="392" y="58" width="16" height="22" fill="#f2e6b8"/><ellipse cx="400" cy="120" rx="70" ry="30" fill="#f2e6b8" opacity="0.12"/>`,
    props: () => `<rect x="20" y="344" width="60" height="6" fill="#3d2a22"/><rect x="24" y="320" width="10" height="24" fill="#e9e2cf"/><ellipse cx="29" cy="316" rx="4" ry="6" fill="#d9a441"/>`
  };

  INTERIORS.church = {
    wall: '#f1ede4', trim: '#5a5f66', bookcase: '#7a5a3e', shelfBoard: '#5a4030',
    counterWood: '#7a5a3e', counterTop: '#5a4030',
    floor: stoneFloor,
    ceiling: () => `<g fill="none" stroke="#5a5f66" stroke-width="8"><path d="M0 120 Q400 -60 800 120"/><path d="M0 200 Q400 20 800 200" opacity="0.5"/></g>`,
    left: () => stainedArch(28, 60, 60, 240),
    right: () => stainedArch(712, 60, 60, 240),
    lamp: () => hangingLamp(250, '#5a5f66', 0) + hangingLamp(550, '#5a5f66', 0),
    // rose window, red runner, and a pew
    props: () => `<circle cx="400" cy="62" r="34" fill="#dfe8ea" stroke="#5a5f66" stroke-width="3"/>
      ${['#8b9cc9', '#b6413a', '#d9a441', '#4f7a4a', '#9b7f9c', '#7fa3ad', '#b6413a', '#8b9cc9'].map((c, i) => { const a = (i / 8) * Math.PI * 2, b = ((i + 1) / 8) * Math.PI * 2; return `<path d="M400 62 L${400 + 30 * Math.cos(a)} ${62 + 30 * Math.sin(a)} A30 30 0 0 1 ${400 + 30 * Math.cos(b)} ${62 + 30 * Math.sin(b)} z" fill="${c}" opacity="0.8"/>`; }).join('')}
      <circle cx="400" cy="62" r="8" fill="#f2e6b8"/>
      <rect x="0" y="380" width="800" height="24" fill="#b6413a" opacity="0.75"/>
      <g fill="#7a5a3e"><rect x="30" y="352" width="100" height="8"/><rect x="30" y="336" width="100" height="6"/><rect x="34" y="358" width="6" height="42"/><rect x="120" y="358" width="6" height="42"/></g>`
  };

  INTERIORS.lighthouse = {
    wall: '#f6f4ee', trim: '#b6413a', bookcase: '#f4f1e8', shelfBoard: '#9a6b52',
    rugColor: '#2b3f5c', rugStripe: '#b6413a', counterWood: '#f4f1e8', counterTop: '#9a6b52',
    texture: () => `<rect width="800" height="366" fill="url(#roundWall)"/>` + hLines(0, 800, 40, 360, 26, 0.05),
    floor: () => floorPlanks('#c9a97a', '#a8865c'),
    left: () => porthole(66, 170) + porthole(66, 262),
    // the spiral stair, climbing the right-hand wall
    right: () => `<rect x="746" y="0" width="8" height="366" fill="#7d6b58"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${700 + (i % 2) * 22}" y="${60 + i * 38}" width="${56 - (i % 2) * 22}" height="8" fill="${i % 2 ? '#9a6b52' : '#8a5a42'}"/>`).join('')}
      <path d="M700 68 L722 106 L700 144 L722 182 L700 220 L722 258 L700 296 L722 334" stroke="#b6413a" stroke-width="3" fill="none"/>`,
    lamp: () => `<line x1="400" y1="0" x2="400" y2="40" stroke="#2b2a28" stroke-width="2"/><rect x="386" y="40" width="28" height="30" rx="3" fill="#2b2a28"/><rect x="391" y="45" width="18" height="20" fill="#f2e6b8"/><rect x="392" y="34" width="16" height="6" fill="#d9a441"/>`,
    // a coil of rope and a brass telescope on a stand
    props: () => `<circle cx="60" cy="392" r="12" fill="none" stroke="#c9b28a" stroke-width="5"/><g fill="#d9a441"><rect x="640" y="300" width="60" height="6" transform="rotate(-25 670 303)"/><rect x="694" y="284" width="14" height="8" transform="rotate(-25 701 288)"/></g>`
  };

  INTERIORS.ship = {
    wall: '#8a6a4f', trim: '#4a3024', bookcase: '#6b4a3a', shelfBoard: '#4a3024',
    counterWood: '#6b4a3a', counterTop: '#4a3024',
    texture: () => hLines(0, 800, 8, 360, 10, 0.15),
    floor: () => floorPlanks('#a07a55', '#7a5a3e'),
    // deck beams overhead and the hull's curved ribs
    ceiling: () => `<g fill="#4a3024"><rect x="0" y="0" width="800" height="16"/><rect x="0" y="40" width="800" height="10"/></g>
      <g stroke="#4a3024" stroke-width="10" fill="none" stroke-linecap="round"><path d="M110 366 Q92 180 118 0"/><path d="M690 366 Q708 180 682 0"/><path d="M400 0 v50"/></g>`,
    left: () => porthole(66, 190) + porthole(66, 280) + `<rect x="30" y="330" width="46" height="42" rx="6" fill="#7a5a3e" stroke="#4a3024"/><g stroke="#4a3024" stroke-width="2"><line x1="30" y1="342" x2="76" y2="342"/><line x1="30" y1="360" x2="76" y2="360"/></g><g fill="#b7736b"><rect x="38" y="318" width="8" height="12"/><rect x="48" y="316" width="8" height="14"/></g>`,
    // a hammock slung between the ribs
    right: () => `<path d="M700 150 Q740 260 790 150" stroke="#e9e2cf" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M712 168 Q740 240 780 166" stroke="#b6413a" stroke-width="6" fill="none"/><g stroke="#c9b28a" stroke-width="2"><line x1="700" y1="150" x2="696" y2="60"/><line x1="790" y1="150" x2="794" y2="60"/></g>`,
    lamp: () => `<line x1="400" y1="16" x2="400" y2="50" stroke="#2b2a28" stroke-width="2"/><rect x="388" y="50" width="24" height="30" rx="3" fill="#2b2a28"/><rect x="392" y="55" width="16" height="20" fill="#f2e6b8"/><ellipse cx="400" cy="130" rx="70" ry="30" fill="#f2e6b8" opacity="0.12"/>`,
    // a ship's wheel on the wall
    props: () => `<ellipse cx="400" cy="412" rx="120" ry="16" fill="#e9e2cf" opacity="0.35"/><g stroke="#4a3024" stroke-width="2" fill="none"><circle cx="46" cy="60" r="18"/><circle cx="46" cy="60" r="6"/>${[0, 45, 90, 135].map(a => `<line x1="${46 - 22 * Math.cos(a * Math.PI / 180)}" y1="${60 - 22 * Math.sin(a * Math.PI / 180)}" x2="${46 + 22 * Math.cos(a * Math.PI / 180)}" y2="${60 + 22 * Math.sin(a * Math.PI / 180)}"/>`).join('')}</g>`
  };

  // =========================================================
  // Stage four: The Big One
  // =========================================================

  BUILDINGS.church = {
    id: 'church',
    stage: 4,
    name: 'Converted church',
    blurb: 'Steeple, stained glass, and pews that make excellent reading benches. The bell still works.',
    location: 'green',
    capacity: 500,
    paint: '#f4f1e8',
    shelves: [],
    interior: { shelves: BIG_INTERIOR_SHELVES, stops: INTERIOR_STOPS },
    door: { x: 400, y: 350 },
    sign: { size: 11, small: 9 },
    stops: { left: 235, right: 565 },
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="400" cy="${GROUND_Y}" rx="160" ry="6" fill="#000" opacity="0.08"/>`;
      s += `<rect x="250" y="205" width="300" height="195" fill="${color}" stroke="#b5aea0" stroke-width="1.5"/>`;
      s += hLines(250, 550, 214, 396, 8, 0.05);
      s += `<polygon points="235,210 400,112 565,210" fill="#5a5f66" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<rect x="372" y="70" width="56" height="112" fill="${color}" stroke="#b5aea0" stroke-width="1.5"/>`;
      s += `<g fill="#3a3f44"><path d="M384 120 a8 8 0 0 1 16 0 v26 h-16 z"/><path d="M400 120 a8 8 0 0 1 16 0 v26 h-16 z"/></g>`;
      s += `<polygon points="366,72 400,6 434,72" fill="#5a5f66" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<rect x="372" y="172" width="56" height="6" fill="#b5aea0"/>`;
      s += `<circle cx="400" cy="175" r="16" fill="#dfe8ea" stroke="#5a5f66" stroke-width="3"/><circle cx="400" cy="175" r="10" fill="#d9a441" opacity="0.8"/>`;
      s += stainedArch(280, 240, 36, 120) + stainedArch(484, 240, 36, 120);
      // open double doors with warm light and a glimpse of shelves
      s += `<path d="M368 400 v-88 a32 32 0 0 1 64 0 v88 z" fill="#5a5f66"/>`;
      s += `<path d="M374 400 v-84 a26 26 0 0 1 52 0 v84 z" fill="#f2e6b8"/>`;
      s += `<g fill="#7a5a3e"><rect x="378" y="320" width="44" height="3"/><rect x="378" y="345" width="44" height="3"/><rect x="378" y="370" width="44" height="3"/></g>`;
      s += `<g opacity="0.8">${[380, 388, 396, 404, 412].map((x, i) => `<rect x="${x}" y="${300 + (i % 2) * 2}" width="6" height="${18 - (i % 2) * 2}" fill="#b7736b"/>`).join('')}${[380, 388, 396, 404, 412].map((x, i) => `<rect x="${x}" y="${326 + (i % 2) * 2}" width="6" height="${17 - (i % 2) * 2}" fill="#6f8a99"/>`).join('')}</g>`;
      s += `<g fill="#7a5a3e" stroke="#4a3024" stroke-width="1"><rect x="346" y="316" width="24" height="84"/><rect x="430" y="316" width="24" height="84"/></g>`;
      s += `<rect x="360" y="394" width="80" height="6" fill="#9a948a"/>`;
      s += hydrangeas(258, 384) + hydrangeas(500, 384);
      return s;
    },
    front() { return signBoard(330, 216, 140, 18, this.sign.size); }
  };

  BUILDINGS.lighthouse = {
    id: 'lighthouse',
    stage: 4,
    name: 'Lighthouse',
    blurb: 'On the cliff, over the sea. The keeper’s house is the shop; the tower is the reading nook.',
    location: 'cliff',
    capacity: 500,
    paint: '#f4f1e8',
    shelves: [],
    interior: { shelves: BIG_INTERIOR_SHELVES, stops: INTERIOR_STOPS },
    door: { x: 455, y: 365 },
    sign: { size: 10, small: 8.5 },
    stops: { left: 250, right: 590 },
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="420" cy="${GROUND_Y}" rx="150" ry="6" fill="#000" opacity="0.1"/>`;
      s += `<polygon points="346,96 800,40 800,150" fill="#f2e6b8" opacity="0.28"/>`;
      // tower
      s += `<polygon points="292,400 368,400 352,120 308,120" fill="${color}" stroke="#b5aea0" stroke-width="1.5"/>`;
      s += `<polygon points="292,400 318,400 322,120 308,120" fill="#000" opacity="0.06"/>`;
      s += `<rect x="298" y="110" width="64" height="10" fill="#2b2a28"/><g stroke="#2b2a28" stroke-width="2">${[302, 314, 326, 338, 350].map(x => `<line x1="${x}" y1="96" x2="${x}" y2="110"/>`).join('')}<line x1="298" y1="96" x2="362" y2="96"/></g>`;
      s += `<rect x="312" y="66" width="36" height="44" fill="#f2e6b8" stroke="#2b2a28" stroke-width="3"/><g stroke="#2b2a28" stroke-width="2"><line x1="324" y1="66" x2="324" y2="110"/><line x1="336" y1="66" x2="336" y2="110"/></g>`;
      s += `<path d="M308 66 Q330 40 352 66 z" fill="#2b2a28"/><circle cx="330" cy="40" r="4" fill="#2b2a28"/>`;
      s += `<circle cx="330" cy="88" r="9" fill="#fff" opacity="0.9"/>`;
      s += `<rect x="318" y="220" width="14" height="22" rx="7" fill="#3a3f44"/><rect x="322" y="300" width="14" height="22" rx="7" fill="#3a3f44"/>`;
      // keeper's house with the shop door open
      s += `<rect x="368" y="285" width="176" height="115" fill="#b9b0a0" stroke="#7d766c" stroke-width="1.5"/>`;
      s += hLines(368, 544, 294, 396, 7, 0.08);
      s += `<polygon points="360,290 456,222 552,290" fill="#a5443a" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<rect x="500" y="232" width="14" height="36" fill="#a86b5f"/>`;
      s += `<g fill="#dfe8ea" stroke="#f4f1e8" stroke-width="3"><rect x="384" y="306" width="34" height="38"/><rect x="494" y="306" width="34" height="38"/></g>`;
      s += `<rect x="440" y="326" width="32" height="74" fill="#3a3f44"/><rect x="444" y="330" width="24" height="70" fill="#f2e6b8"/>`;
      s += `<g fill="#b7736b" opacity="0.8">${[446, 452, 458, 464].map((x, i) => `<rect x="${x}" y="${350 + (i % 2) * 2}" width="4" height="${14 - (i % 2) * 2}"/>`).join('')}</g><rect x="444" y="366" width="24" height="2" fill="#7a5a3e"/>`;
      s += `<rect x="472" y="326" width="10" height="74" fill="#a5443a"/>`;
      s += `<rect x="436" y="396" width="40" height="4" fill="#9a948a"/>`;
      return s;
    },
    front() { return signBoard(386, 290, 140, 16, this.sign.size); }
  };

  BUILDINGS.ship = {
    id: 'ship',
    stage: 4,
    name: 'Historic ship',
    blurb: 'A retired schooner at the town dock. Books below decks, gulls above. Mind the gangplank.',
    location: 'harbor',
    capacity: 500,
    paint: '#4a3024',
    shelves: [],
    interior: { shelves: BIG_INTERIOR_SHELVES, stops: INTERIOR_STOPS },
    door: { x: 400, y: 232 },
    sign: { size: 10, small: 8 },
    stops: { left: 250, right: 560 },
    backdropOpts: {},
    draw(color) {
      let s = '';
      // masts, yards, furled sails and rigging
      [300, 480].forEach(mx => {
        s += `<rect x="${mx - 4}" y="30" width="8" height="222" fill="#7a5a3e"/>`;
        [[80, 110], [150, 90]].forEach(([y, w]) => {
          s += `<rect x="${mx - w / 2}" y="${y}" width="${w}" height="5" fill="#5a4030"/>`;
          s += `<ellipse cx="${mx}" cy="${y + 9}" rx="${w / 2 - 6}" ry="7" fill="#e9e2cf" stroke="#c9b28a" stroke-width="1"/>`;
        });
        s += `<g stroke="#c9b28a" stroke-width="1.2" opacity="0.8"><line x1="${mx}" y1="34" x2="${mx - 110}" y2="252"/><line x1="${mx}" y1="34" x2="${mx + 110}" y2="252"/></g>`;
      });
      s += `<polygon points="300,30 300,44 330,37" fill="#b6413a"/>`;
      s += `<line x1="640" y1="262" x2="730" y2="232" stroke="#7a5a3e" stroke-width="6" stroke-linecap="round"/>`;
      // hull
      s += `<path d="M150 252 Q140 330 200 376 L600 376 Q690 330 735 240 L650 252 Z" fill="${color}" stroke="#2b2a28" stroke-width="1.5"/>`;
      s += `<g stroke="#000" stroke-width="1" opacity="0.15"><path d="M160 290 Q180 345 230 376"/><path d="M180 290 L640 290"/><path d="M175 320 L650 320"/><path d="M190 350 L620 350"/></g>`;
      s += `<path d="M150 252 Q140 262 152 272 L640 272 L665 250 Z" fill="#e9e2cf" opacity="0.9"/>`;
      [230, 300, 370, 440, 510, 580].forEach(x => { s += `<circle cx="${x}" cy="318" r="10" fill="#d9a441"/><circle cx="${x}" cy="318" r="7" fill="#f2e6b8"/>`; });
      // deck rail and the deckhouse with its door
      s += `<g stroke="#e9e2cf" stroke-width="2">${[170, 210, 250, 290, 330, 470, 510, 550, 590, 630].map(x => `<line x1="${x}" y1="236" x2="${x}" y2="252"/>`).join('')}<line x1="160" y1="236" x2="640" y2="236"/></g>`;
      s += `<rect x="340" y="200" width="120" height="52" fill="#7a5a3e" stroke="#4a3024" stroke-width="1.5"/><rect x="336" y="196" width="128" height="6" fill="#e9e2cf"/>`;
      s += `<rect x="388" y="212" width="24" height="40" fill="#3a3f44"/><rect x="391" y="215" width="18" height="37" fill="#f2e6b8"/>`;
      s += `<g fill="#dfe8ea" stroke="#e9e2cf" stroke-width="2"><rect x="350" y="214" width="22" height="18"/><rect x="428" y="214" width="22" height="18"/></g>`;
      // gangplank down to the dock, and a mooring line
      s += `<polygon points="466,250 486,250 560,400 536,400" fill="#b39a6f" stroke="#7d6b58" stroke-width="1"/><g stroke="#7d6b58" stroke-width="1.5">${[0, 1, 2, 3, 4].map(i => `<line x1="${476 + i * 14}" y1="${270 + i * 30}" x2="${490 + i * 14}" y2="${270 + i * 30}"/>`).join('')}</g>`;
      s += `<line x1="470" y1="236" x2="548" y2="384" stroke="#c9b28a" stroke-width="2"/>`;
      s += `<path d="M205 366 Q150 380 128 372" stroke="#c9b28a" stroke-width="2" fill="none"/>`;
      return s;
    },
    front() { return signBoard(240, 282, 120, 16, this.sign.size); }
  };


  // Which buildings are offered when moving up to each stage.
  const UPGRADES = { 2: ['garden-shed', 'container', 'garage'], 3: ['dutch-colonial', 'cape-cod', 'tudor'], 4: ['church', 'lighthouse', 'ship'] };

  // =========================================================
  // 5. Put it all together
  // =========================================================
  // Returns the whole picture as text. game.js drops it into the page, then
  // fills the empty .books and .customers groups as the game runs.
  // view is 'outside' (default) or 'inside'. Inside is only available for
  // buildings that define an interior.
  function render(locationId, buildingId, view) {
    const building = BUILDINGS[buildingId] || BUILDINGS.lfl;
    if (view === 'inside' && building.interior) return renderInterior(building);
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
  function renderInterior(building) {
    const style = INTERIORS[building.id];
    return `<svg viewBox="0 0 ${VIEW.width} ${VIEW.height}" xmlns="http://www.w3.org/2000/svg" role="img">
      ${defs('#ffffff', '#ffffff')}
      <g class="backdrop" filter="url(#wobble)">${interior(style, building.interior.shelves)}</g>
      <g class="books"></g>
      <g class="front">${interiorFront(style, building.sign.size)}</g>
      <g class="customers"></g>
      <g class="effects"></g>
    </svg>`;
  }
  // The shelf layout for a view: the exterior's windows, or the interior wall.
  function shelvesFor(buildingId, view) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    return (view === 'inside' && b.interior) ? b.interior.shelves : b.shelves;
  }
  function stopsFor(buildingId, view) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    return (view === 'inside' && b.interior) ? b.interior.stops : b.stops;
  }

  // Only these names are visible to game.js.
  return { LOCATIONS, BUILDINGS, UPGRADES, VIEW, GROUND_Y, render, shelvesFor, stopsFor };
})();
