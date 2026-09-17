/* scenes.js
   Draws the three backdrops and the Little Free Library box.

   Everything here is SVG (Scalable Vector Graphics): pictures described as shapes
   and coordinates in text, rather than pixels. The browser draws them at any size.
   The picture is 800 units wide and 450 tall; every number below lives on that grid.

   These are placeholders in the intended palette: faded, weathered, a bit plain.
   The plan is to replace them with proper watercolor art later.
*/

const Scenes = (function () {
  'use strict';

  // ---- Shared geometry that game.js also needs ----
  const VIEW = { width: 800, height: 450 };
  const GROUND_Y = 400;                 // where feet touch the ground
  const STOP_X = { left: 300, right: 500 }; // where customers stand to browse

  // The book slots inside the box: two shelves of ten.
  const SHELVES = [
    { bottom: 280 },                    // top shelf (books sit on the shelf line)
    { bottom: 318 }                     // bottom shelf
  ];
  const SLOT = { firstX: 353, step: 9.5, width: 8 };

  // ---- The three places a library can live ----
  const LOCATIONS = [
    {
      id: 'beach',
      name: 'By the beach entrance',
      blurb: 'Sand in the hinges, salt on the glass. Beach readers are loyal readers.',
      boxColor: '#a9b5b7'               // faded grey-blue paint
    },
    {
      id: 'park',
      name: 'In the park',
      blurb: 'Grass, a bench, a playground behind. Parents wait; parents browse.',
      boxColor: '#a3ad95'               // faded sage paint
    },
    {
      id: 'street',
      name: 'On the high street corner',
      blurb: 'Shops either side and a little white church. Foot traffic guaranteed.',
      boxColor: '#b08a82'               // faded dusty-red paint
    }
  ];

  // ---- Little helpers for repeated shapes ----
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
  // A few faded book spines for a neighbouring shop window (not the player's stock).
  function windowBooks(x, y, count, color) {
    let out = '';
    for (let i = 0; i < count; i++) {
      const h = 14 + ((i * 5) % 9);
      out += `<rect x="${x + i * 7}" y="${y - h}" width="5" height="${h}" fill="${color}" opacity="${0.55 + (i % 3) * 0.12}"/>`;
    }
    return out;
  }

  // ---- The definitions block: gradients and the "wobble" filter ----
  // The wobble filter nudges every edge slightly so shapes feel hand-drawn
  // rather than ruler-straight. It is applied to the backdrop only.
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

  // ---- Backdrop 1: the beach entrance ----
  function beach() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(150, 80, 60) + cloud(620, 110, 70);
    s += seagull(560, 60) + seagull(610, 45);
    // sea
    s += `<rect x="0" y="235" width="800" height="70" fill="#7fa3ad"/>`;
    s += `<g stroke="#a9c6cc" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M40 255 q15 -4 30 0"/><path d="M180 270 q15 -4 30 0"/><path d="M330 250 q15 -4 30 0"/>
      <path d="M520 265 q15 -4 30 0"/><path d="M680 252 q15 -4 30 0"/><path d="M740 285 q15 -4 30 0"/>
    </g>`;
    // dune and sand
    s += `<path d="M0 300 C150 270 300 320 450 290 S700 270 800 300 L800 450 L0 450 Z" fill="#e3d6b4"/>`;
    s += `<path d="M0 450 L0 405 C200 398 600 408 800 400 L800 450 Z" fill="#d9caa3"/>`;
    // boardwalk down to the sand, to the right of the box
    s += `<polygon points="480,300 515,300 660,450 420,450" fill="#b39a6f"/>`;
    s += `<g stroke="#9c845c" stroke-width="2">
      <line x1="486" y1="320" x2="509" y2="320"/><line x1="494" y1="350" x2="529" y2="350"/>
      <line x1="504" y1="380" x2="553" y2="380"/><line x1="516" y1="410" x2="581" y2="410"/>
      <line x1="530" y1="440" x2="614" y2="440"/>
    </g>`;
    // rope fence along the dune, left side
    s += `<g stroke="#8b6f4e" stroke-width="4"><line x1="40" y1="300" x2="40" y2="340"/><line x1="130" y1="298" x2="130" y2="338"/><line x1="215" y1="310" x2="215" y2="350"/></g>`;
    s += `<path d="M40 310 Q85 325 130 308 Q172 330 215 320" stroke="#c9b28a" stroke-width="2" fill="none"/>`;
    // beach grass
    [60, 95, 160, 250, 300, 560, 610, 700, 760].forEach((x, i) => { s += grassTuft(x, 296 + (i % 3) * 6); });
    // sign
    s += `<rect x="250" y="330" width="6" height="70" fill="#8b6f4e"/>`;
    s += `<rect x="220" y="316" width="66" height="24" fill="#e8e1cf" stroke="#8b6f4e" stroke-width="2"/>`;
    s += `<text x="253" y="333" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#5b6b70">BEACH &#8594;</text>`;
    return s;
  }

  // ---- Backdrop 2: the park ----
  function park() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(520, 70, 55) + cloud(240, 100, 45);
    // distant tree line
    s += `<path d="M0 255 Q60 215 120 250 T240 245 T360 255 T480 240 T600 255 T720 245 T800 255 L800 300 L0 300 Z" fill="#7f9a68"/>`;
    // grass
    s += `<rect x="0" y="290" width="800" height="160" fill="#9dbb6f"/>`;
    s += `<path d="M0 340 C200 320 500 360 800 335 L800 450 L0 450 Z" fill="#a6c277"/>`;
    // path
    s += `<path d="M0 425 C200 408 600 408 800 425 L800 440 C600 424 200 424 0 440 Z" fill="#d5c7a2"/>`;
    // playground in the background (right), a little faded
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
    // big tree, left
    s += `<rect x="70" y="250" width="22" height="150" fill="#7a5a3e"/>`;
    s += `<g fill="#6f9556"><circle cx="80" cy="200" r="70"/><circle cx="40" cy="235" r="48"/><circle cx="125" cy="220" r="55"/></g>`;
    s += `<g fill="#7fa563"><circle cx="70" cy="180" r="40"/><circle cx="115" cy="205" r="30"/></g>`;
    // bench
    s += `<g fill="#8b6f4e">
      <rect x="170" y="355" width="90" height="8"/><rect x="170" y="335" width="90" height="6"/>
      <rect x="175" y="360" width="6" height="40"/><rect x="249" y="360" width="6" height="40"/>
      <rect x="172" y="341" width="5" height="16"/><rect x="253" y="341" width="5" height="16"/>
    </g>`;
    // flowers
    s += flower(300, 372, '#d98c9c') + flower(312, 380, '#e8c46a') + flower(560, 375, '#d98c9c') + flower(575, 368, '#ffffff') + flower(640, 384, '#e8c46a');
    s += grassTuft(330, 392) + grassTuft(590, 395) + grassTuft(720, 388);
    return s;
  }

  // ---- Backdrop 3: the high street corner ----
  function street() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(420, 60, 50) + cloud(700, 95, 45);
    // pavement and road
    s += `<rect x="0" y="370" width="800" height="80" fill="#c9c3b6"/>`;
    s += `<g stroke="#b5afa2" stroke-width="1.5">${[60, 140, 220, 300, 460, 540, 620, 700, 780].map(x => `<line x1="${x}" y1="370" x2="${x}" y2="428"/>`).join('')}</g>`;
    s += `<rect x="0" y="428" width="800" height="3" fill="#e6e2d8"/><rect x="0" y="431" width="800" height="19" fill="#8f8b84"/>`;

    // left shop: the chowder house
    s += `<rect x="0" y="150" width="215" height="220" fill="#6b8f8a"/>`;
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

    // little white church behind the corner
    s += `<rect x="222" y="235" width="112" height="135" fill="#f4f1e8" stroke="#c8c3b8"/>`;
    s += `<polygon points="216,240 278,190 340,240" fill="#5a5f66"/>`;
    s += `<rect x="254" y="125" width="48" height="115" fill="#f4f1e8" stroke="#c8c3b8"/>`;
    s += `<polygon points="250,128 278,62 306,128" fill="#5a5f66"/>`;
    s += `<path d="M278 60 v-16 M271 51 h14" stroke="#5a5f66" stroke-width="3"/>`;
    s += `<path d="M270 175 a8 8 0 0 1 16 0 v22 h-16 z" fill="#7c8a90"/>`;
    s += `<g fill="#9fb0c4"><path d="M236 300 a8 8 0 0 1 16 0 v30 h-16 z"/><path d="M304 300 a8 8 0 0 1 16 0 v30 h-16 z"/></g>`;
    s += `<path d="M266 370 v-38 a12 12 0 0 1 24 0 v38 z" fill="#7c5a3e"/>`;
    // hydrangeas by the church
    s += `<g fill="#8b9cc9"><circle cx="232" cy="362" r="11"/><circle cx="246" cy="356" r="12"/><circle cx="330" cy="362" r="11"/><circle cx="318" cy="356" r="10"/></g>`;
    s += `<g fill="#a9b6d6"><circle cx="238" cy="356" r="6"/><circle cx="324" cy="355" r="6"/></g>`;

    // right shop: the taffy shop
    s += `<rect x="480" y="170" width="320" height="200" fill="#a8766a"/>`;
    s += `<g stroke="#9a6a5e" stroke-width="1" opacity="0.6">${[190, 210, 230, 250].map(y => `<line x1="480" y1="${y}" x2="800" y2="${y}"/>`).join('')}</g>`;
    s += `<rect x="475" y="162" width="330" height="12" fill="#6d4a42"/>`;
    s += `<g fill="#dfe8ea" stroke="#6d4a42" stroke-width="3"><rect x="510" y="190" width="46" height="56"/><rect x="620" y="190" width="46" height="56"/><rect x="730" y="190" width="46" height="56"/></g>`;
    s += `<g fill="#6d4a42"><rect x="506" y="244" width="54" height="7"/><rect x="616" y="244" width="54" height="7"/><rect x="726" y="244" width="54" height="7"/></g>`;
    s += flower(515, 242, '#d98c9c') + flower(535, 240, '#ffffff') + flower(552, 242, '#d98c9c') + flower(625, 242, '#e8c46a') + flower(645, 240, '#d98c9c') + flower(735, 242, '#ffffff') + flower(755, 240, '#d98c9c');
    s += `<rect x="530" y="258" width="220" height="22" fill="#f3eee2" stroke="#6d4a42" stroke-width="2"/>`;
    s += `<text x="640" y="274" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#6d4a42" letter-spacing="1">SALTWATER TAFFY &amp; FUDGE</text>`;
    s += `<polygon points="480,284 800,284 806,306 470,306" fill="#d1a85a"/>`;
    s += `<g fill="#f1e7c8" stroke="#6d4a42" stroke-width="3"><rect x="500" y="314" width="100" height="56"/><rect x="680" y="314" width="100" height="56"/></g>`;
    s += windowBooks(512, 362, 6, '#d98c9c') + windowBooks(692, 362, 6, '#e8c46a');
    s += `<rect x="620" y="310" width="46" height="60" fill="#6d4a42"/><rect x="630" y="320" width="26" height="28" fill="#dfe8ea"/>`;
    // hanging sign
    s += `<line x1="480" y1="300" x2="470" y2="300" stroke="#3a3f44" stroke-width="3"/>`;
    // street lamp between the box and the taffy shop
    s += `<rect x="466" y="262" width="5" height="138" fill="#3a3f44"/>`;
    s += `<rect x="457" y="240" width="23" height="26" fill="#3a3f44"/><rect x="461" y="244" width="15" height="18" fill="#f2e6b8"/>`;
    return s;
  }

  const BACKDROPS = { beach, park, street };
  const SKIES = {
    beach: ['#b9d3dc', '#eef0e6'],
    park: ['#c9dde4', '#eef3ea'],
    street: ['#cddfe6', '#f1efe4']
  };

  // ---- The Little Free Library box itself ----
  // Drawn plain and weathered on purpose. The player will want to fix it up.
  function box(color) {
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
      <polygon points="336,229 400,201 400,207 342,231" fill="#fff" opacity="0.12"/>
    `;
  }
  // The glass door and the name board go in front of the books.
  function glassAndSign() {
    return `
      <rect x="352" y="242" width="96" height="76" fill="#dfeaf0" opacity="0.22"/>
      <polygon points="352,242 382,242 352,292" fill="#fff" opacity="0.25"/>
      <rect x="350" y="240" width="100" height="80" fill="none" stroke="#5c5b56" stroke-width="2"/>
      <rect x="443" y="274" width="3" height="12" fill="#2f2f2f"/>
      <g fill="#2f2f2f"><rect x="352" y="250" width="4" height="6"/><rect x="352" y="304" width="4" height="6"/></g>
      <rect x="360" y="336" width="80" height="18" fill="#e9e2cf" stroke="#7d6b58" stroke-width="1.5"/>
      <text class="box-sign" x="400" y="349" text-anchor="middle" font-family="Georgia, serif" font-size="9.5" fill="#5c5b56"></text>
    `;
  }

  // ---- Put it all together ----
  // Returns the whole picture as text. game.js drops it into the page, then
  // fills the empty #books and #customers groups as the game runs.
  function render(locationId) {
    const loc = LOCATIONS.find(l => l.id === locationId) || LOCATIONS[0];
    const [skyTop, skyBottom] = SKIES[loc.id];
    return `<svg viewBox="0 0 ${VIEW.width} ${VIEW.height}" xmlns="http://www.w3.org/2000/svg" role="img">
      ${defs(skyTop, skyBottom)}
      <g class="backdrop" filter="url(#wobble)">${BACKDROPS[loc.id]()}</g>
      <g class="box">${box(loc.boxColor)}</g>
      <g class="books"></g>
      <g class="glass">${glassAndSign()}</g>
      <g class="customers"></g>
      <g class="effects"></g>
    </svg>`;
  }

  // Only these names are visible to game.js.
  return { LOCATIONS, VIEW, GROUND_Y, STOP_X, SHELVES, SLOT, render };
})();
