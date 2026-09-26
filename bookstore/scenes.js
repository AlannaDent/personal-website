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
      name: 'On the beach',
      blurb: 'Sand in the hinges, salt on the glass. Beach readers are loyal readers.',
      boxColor: '#a9b5b7'               // faded gray-blue paint for the library box
    },
    {
      id: 'park',
      name: 'In the park',
      blurb: 'Grass, a bench, a playground behind. Parents wait; parents browse.',
      boxColor: '#a3ad95'               // faded sage
    },
    {
      id: 'street',
      name: 'In town',
      blurb: 'Shops either side and a little white church. Foot traffic guaranteed.',
      boxColor: '#b08a82'               // faded dusty red
    },
    {
      id: 'dock',
      name: 'On the dock',
      blurb: 'Gulls, halyards, and a bait shop that opens at five. Fishermen read more than you\u2019d think.',
      boxColor: '#8fa3ad'               // faded harbor blue
    }
  ];

  // =========================================================
  // 2. Small drawing helpers
  // =========================================================
  function grassTuft(x, y) {
    return `<path d="M${x} ${y} l-4 -14 M${x} ${y} l0 -18 M${x} ${y} l4 -13" stroke="#8f9a5c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  // Clouds drift slowly left to right (CSS animation, see .cloud in style.css). Each one
  // travels from off the left edge to off the right edge and loops; the negative delay
  // starts it exactly where it is drawn, so the sky looks the same as before at first.
  function cloud(cx, cy, w) {
    const margin = w * 1.7;
    const start = -(cx + margin), end = VIEW.width - cx + margin;
    const dur = 150 + (w % 7) * 12;                                 // 150-222 s per crossing
    const delay = -dur * (cx + margin) / (VIEW.width + margin * 2);  // begin mid-journey
    return `<g class="cloud" fill="#ffffff" opacity="0.75" style="--start:${start.toFixed(0)}px; --end:${end.toFixed(0)}px; --dur:${dur}s; --delay:${delay.toFixed(1)}s">
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
  // A cardboard delivery box on the ground. (x, y) is the bottom-left corner.
  function deliveryBox(x, y, size, id, remaining) {
    const w = size, h = size * 0.72;
    return `<g class="delivery-box" data-id="${id}" transform="translate(${x} ${y})" style="cursor:pointer">
      <ellipse cx="${w / 2}" cy="0" rx="${w * 0.6}" ry="${size * 0.08}" fill="#000" opacity="0.12"/>
      <rect x="0" y="${-h}" width="${w}" height="${h}" fill="#c9a97a" stroke="#8a6a48" stroke-width="${Math.max(1, size / 30)}"/>
      <rect x="${w * 0.42}" y="${-h}" width="${w * 0.16}" height="${h}" fill="#e9e2cf" opacity="0.85"/>
      <line x1="0" y1="${-h * 0.88}" x2="${w}" y2="${-h * 0.88}" stroke="#8a6a48" stroke-width="${Math.max(1, size / 40)}" opacity="0.7"/>
      <rect x="${w * 0.1}" y="${-h * 0.62}" width="${w * 0.26}" height="${h * 0.2}" fill="#f4efe4" stroke="#8a6a48" stroke-width="0.8"/>
      <text x="${w * 0.23}" y="${-h * 0.47}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.max(6, size * 0.14)}" fill="#5c5b56">${remaining}</text>
    </g>`;
  }

  // ---- Decor the player can buy ----
  // An A-frame chalkboard with the shop name in chalk. (x, y) is the bottom center;
  // scale follows the people so it reads as about waist-high.
  function chalkboard(x, y, scale) {
    return `<g class="chalkboard" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="13" ry="1.6" fill="#000" opacity="0.12"/>
      <g stroke="#7d6b58" stroke-width="2.2" stroke-linecap="round"><line x1="-12" y1="0" x2="-7" y2="-29"/><line x1="12" y1="0" x2="7" y2="-29"/><line x1="-8" y1="-8" x2="8" y2="-8"/></g>
      <rect x="-11.5" y="-31" width="23" height="24" rx="1.2" fill="#7d6b58"/>
      <rect x="-10" y="-29.5" width="20" height="21" fill="#2f3a36"/>
      <text class="box-sign chalk" x="0" y="-21" text-anchor="middle" font-family="Caveat, 'Bradley Hand', cursive" font-size="5" fill="#f4efe4"></text>
      <text class="chalk-line2" x="0" y="-15.5" text-anchor="middle" font-family="Caveat, 'Bradley Hand', cursive" font-size="5" fill="#f4efe4"></text>
      <line x1="-6" y1="-13" x2="6" y2="-13" stroke="#f4efe4" stroke-width="0.7" opacity="0.6"/>
      <text x="0" y="-9.5" text-anchor="middle" font-family="Caveat, cursive" font-size="3.2" fill="#f4efe4" opacity="0.85">open</text>
    </g>`;
  }
  // A snake plant in a terracotta pot. (x, y) is the bottom center.
  function snakePlant(x, y, scale) {
    const leaf = (dx, h, lean) => `<path d="M${dx} -9 q${lean - 2} ${-h * 0.45} ${lean} ${-h} q${2 - lean * 0.4} ${h * 0.55} ${-lean + 1.5} ${h}z" fill="#4f7a4a" stroke="#d9c46a" stroke-width="0.6"/>`;
    return `<g class="plant snake-plant" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="8" ry="1.4" fill="#000" opacity="0.12"/>
      ${leaf(-3, 22, -2)}${leaf(3, 26, 2)}${leaf(0, 30, 0.5)}${leaf(-5, 18, -3)}${leaf(5, 20, 3)}
      <path d="M-6.5 -9.5 l1.5 9.5 h10 l1.5 -9.5 z" fill="#b8734f" stroke="#8a5a3a" stroke-width="0.6"/>
      <rect x="-7.2" y="-11" width="14.4" height="2.2" rx="0.6" fill="#a05f3e"/>
    </g>`;
  }

  // A monstera: a few big, split leaves on stems, in a wide pot.
  function monstera(x, y, scale) {
    const leaf = (cx, cy, r, rot) => `<g transform="translate(${cx} ${cy}) rotate(${rot})"><path d="M0 0 C-${r * 0.9} -${r * 0.3} -${r * 0.9} -${r * 1.5} 0 -${r * 1.7} C${r * 0.9} -${r * 1.5} ${r * 0.9} -${r * 0.3} 0 0 z" fill="#3f6b3a" stroke="#2f5230" stroke-width="0.5"/><g stroke="#c9d9b8" stroke-width="0.9" opacity="0.9"><line x1="0" y1="-1" x2="0" y2="-${r * 1.5}"/><line x1="-${r * 0.7}" y1="-${r * 0.6}" x2="0" y2="-${r * 0.9}"/><line x1="${r * 0.7}" y1="-${r * 0.6}" x2="0" y2="-${r * 0.9}"/><line x1="-${r * 0.7}" y1="-${r * 1.1}" x2="0" y2="-${r * 1.3}"/><line x1="${r * 0.7}" y1="-${r * 1.1}" x2="0" y2="-${r * 1.3}"/></g></g>`;
    return `<g class="plant monstera" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="10" ry="1.6" fill="#000" opacity="0.12"/>
      <g stroke="#3f6b3a" stroke-width="1.4" fill="none"><path d="M0 -10 q-4 -8 -9 -12"/><path d="M0 -10 q4 -9 8 -14"/><path d="M0 -10 q0 -9 1 -18"/></g>
      ${leaf(-9, -22, 7, -30)}${leaf(8, -24, 7.5, 28)}${leaf(1, -28, 6.5, 0)}
      <path d="M-8 -11 l1.5 11 h13 l1.5 -11 z" fill="#8a8f94" stroke="#5c5b56" stroke-width="0.6"/>
      <rect x="-8.8" y="-12.6" width="17.6" height="2.4" rx="0.6" fill="#6f7478"/>
    </g>`;
  }
  // A spider plant: arching striped leaves and a couple of dangling plantlets.
  function spiderPlant(x, y, scale) {
    const blade = (rot, len) => `<g transform="rotate(${rot})"><path d="M0 -9 q${len * 0.35} -${len * 0.6} ${len * 0.9} -${len * 0.35} q-${len * 0.5} ${len * 0.1} -${len * 0.9} ${len * 0.35}z" fill="#7fa563" stroke="#e9e2cf" stroke-width="0.5"/></g>`;
    let leaves = '';
    [-70, -50, -30, -12, 8, 28, 48, 68].forEach((rot, i) => { leaves += blade(rot, 14 + (i % 3) * 3); });
    return `<g class="plant spider-plant" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="9" ry="1.5" fill="#000" opacity="0.12"/>
      ${leaves}
      <g stroke="#c9d9b8" stroke-width="0.6" fill="none"><path d="M-6 -12 q-8 4 -10 12"/><path d="M7 -12 q8 3 9 12"/></g>
      <g fill="#7fa563"><path d="M-16 0 l-2 -4 l2 -1 l2 1 z"/><path d="M-16 0 l-3 1 l2 -3z"/><path d="M16 0 l-2 -4 l2 -1 l2 1 z"/><path d="M16 0 l3 1 l-2 -3z"/></g>
      <path d="M-6 -10 l1 8 h10 l1 -8 z" fill="#e9e2cf" stroke="#b5aea0" stroke-width="0.6"/>
      <rect x="-6.8" y="-11.5" width="13.6" height="2.2" rx="0.6" fill="#d9d0bf"/>
    </g>`;
  }
  // An orchid: two broad leaves, a tall stem, and a run of pink blooms.
  function orchid(x, y, scale) {
    const bloom = (cx, cy, r) => `<g transform="translate(${cx} ${cy})"><g fill="#d98c9c">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${r * Math.cos(a * Math.PI / 180)}" cy="${r * Math.sin(a * Math.PI / 180)}" rx="${r * 0.7}" ry="${r * 0.45}" transform="rotate(${a} ${r * Math.cos(a * Math.PI / 180)} ${r * Math.sin(a * Math.PI / 180)})"/>`).join('')}</g><circle r="${r * 0.35}" fill="#b6413a"/><circle r="${r * 0.15}" fill="#f2e6b8"/></g>`;
    return `<g class="plant orchid" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="7" ry="1.3" fill="#000" opacity="0.12"/>
      <g fill="#4f7a4a" stroke="#2f5230" stroke-width="0.4"><path d="M-1 -8 q-9 -2 -11 -8 q7 -1 11 5z"/><path d="M1 -8 q9 -3 10 -9 q-7 0 -10 6z"/></g>
      <path d="M0 -9 q1 -10 3 -18 q1 -6 5 -12" stroke="#4f7a4a" stroke-width="1.1" fill="none"/>
      <line x1="0" y1="-9" x2="2" y2="-26" stroke="#7d6b58" stroke-width="0.7" opacity="0.7"/>
      ${bloom(2.5, -20, 2.4)}${bloom(4.5, -27, 2.6)}${bloom(7.5, -34, 2.6)}${bloom(9.5, -39.5, 2.2)}
      <path d="M-5 -8 l1 8 h8 l1 -8 z" fill="#dfe8ea" stroke="#9fb0c4" stroke-width="0.6"/>
      <rect x="-5.6" y="-9.4" width="11.2" height="2" rx="0.6" fill="#c9d6dd"/>
    </g>`;
  }
  // A ZZ plant: upright stems lined with glossy oval leaflets, in a dark pot.
  function zzPlant(x, y, scale) {
    const stem = (lean, h) => {
      let out = `<path d="M0 -9 q${lean * 0.5} -${h * 0.5} ${lean} -${h}" stroke="#2f5230" stroke-width="1" fill="none"/>`;
      for (let i = 1; i <= 5; i++) {
        const t = i / 5.5, px = lean * t * t, py = -9 - h * t;
        out += `<ellipse cx="${px - 3}" cy="${py}" rx="3.2" ry="1.7" fill="#3f6b3a" stroke="#c9d9b8" stroke-width="0.3" transform="rotate(-25 ${px - 3} ${py})"/><ellipse cx="${px + 3}" cy="${py + 1}" rx="3.2" ry="1.7" fill="#4f7a4a" stroke="#c9d9b8" stroke-width="0.3" transform="rotate(25 ${px + 3} ${py + 1})"/>`;
      }
      return out;
    };
    return `<g class="plant zz-plant" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="8" ry="1.4" fill="#000" opacity="0.12"/>
      ${stem(-6, 24)}${stem(5, 28)}${stem(0, 20)}
      <path d="M-6.5 -9.5 l1.5 9.5 h10 l1.5 -9.5 z" fill="#3a3f44" stroke="#2b2a28" stroke-width="0.6"/>
      <rect x="-7.2" y="-11" width="14.4" height="2.2" rx="0.6" fill="#5c5b56"/>
    </g>`;
  }
  // An inch plant: purple-and-green striped leaves trailing over the pot's rim.
  function inchPlant(x, y, scale) {
    const leaf = (cx, cy, rot, len) => `<g transform="translate(${cx} ${cy}) rotate(${rot})"><ellipse rx="${len}" ry="1.9" fill="#6b4f8a"/><line x1="-${len * 0.8}" y1="0" x2="${len * 0.8}" y2="0" stroke="#9fd0c4" stroke-width="0.7" opacity="0.9"/><line x1="-${len * 0.7}" y1="-0.9" x2="${len * 0.7}" y2="-0.9" stroke="#c98ab3" stroke-width="0.5" opacity="0.8"/></g>`;
    let leaves = '';
    [[-7, -12, -40, 5], [-9, -6, -70, 4.5], [7, -12, 40, 5], [9, -6, 70, 4.5], [0, -14, 0, 5], [-4, -16, -20, 4.5], [4, -16, 20, 4.5], [-11, -1, -95, 4], [11, -1, 95, 4]].forEach(([cx, cy, r, l]) => { leaves += leaf(cx, cy, r, l); });
    return `<g class="plant inch-plant" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="8" ry="1.4" fill="#000" opacity="0.12"/>
      <path d="M-6.5 -9.5 l1.5 9.5 h10 l1.5 -9.5 z" fill="#e9e2cf" stroke="#b5aea0" stroke-width="0.6"/>
      <rect x="-7.2" y="-11" width="14.4" height="2.2" rx="0.6" fill="#d9d0bf"/>
      ${leaves}
    </g>`;
  }
  // A fern: arching fronds with fine leaflets, in a terracotta pot.
  function fern(x, y, scale) {
    const frond = (rot, len) => {
      let out = `<g transform="rotate(${rot})"><path d="M0 -9 q${len * 0.2} -${len * 0.7} ${len * 0.55} -${len}" stroke="#4f7a4a" stroke-width="0.8" fill="none"/>`;
      for (let i = 1; i <= 6; i++) {
        const t = i / 6.5, px = len * 0.55 * t * t * 1.1, py = -9 - len * t * (1 - 0.15 * t);
        out += `<ellipse cx="${px - 2.2}" cy="${py}" rx="2.4" ry="0.9" fill="#6a955f" transform="rotate(-35 ${px - 2.2} ${py})"/><ellipse cx="${px + 2.2}" cy="${py}" rx="2.4" ry="0.9" fill="#4f7a4a" transform="rotate(35 ${px + 2.2} ${py})"/>`;
      }
      return out + '</g>';
    };
    let fronds = '';
    [-60, -35, -12, 10, 32, 58].forEach((r, i) => { fronds += frond(r, 18 + (i % 2) * 4); });
    return `<g class="plant fern" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="8" ry="1.4" fill="#000" opacity="0.12"/>
      ${fronds}
      <path d="M-6.5 -9.5 l1.5 9.5 h10 l1.5 -9.5 z" fill="#b8734f" stroke="#8a5a3a" stroke-width="0.6"/>
      <rect x="-7.2" y="-11" width="14.4" height="2.2" rx="0.6" fill="#a05f3e"/>
    </g>`;
  }
  // A cactus in a terracotta pot: one tall column, two arms, pale spines, a pink flower.
  function cactus(x, y, scale) {
    return `<g class="plant cactus" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="8" ry="1.4" fill="#000" opacity="0.12"/>
      <path d="M-4.2 -10 q0 -22 4.2 -25 q4.2 3 4.2 25 z" fill="#5f8f5a"/>
      <path d="M-4 -19 q-8 -1 -8 -9 q0 -4.5 3 -4.5 q2.6 0 2.6 4.5 q0 5 2.4 5.5 z" fill="#5f8f5a"/>
      <path d="M4 -22 q8 -1 8 -9 q0 -4.5 -3 -4.5 q-2.6 0 -2.6 4.5 q0 5 -2.4 5.5 z" fill="#5f8f5a"/>
      <g stroke="#3f6b3a" stroke-width="0.5" opacity="0.8"><line x1="-1.6" y1="-12" x2="-1.6" y2="-32"/><line x1="1.6" y1="-12" x2="1.6" y2="-32"/><line x1="-9.5" y1="-24" x2="-9.5" y2="-30"/><line x1="9.5" y1="-27" x2="9.5" y2="-33"/></g>
      <g stroke="#e9e2cf" stroke-width="0.5"><line x1="-4.2" y1="-15" x2="-5.6" y2="-15.6"/><line x1="4.2" y1="-18" x2="5.6" y2="-18.6"/><line x1="-4.2" y1="-27" x2="-5.6" y2="-27.6"/><line x1="4.2" y1="-30" x2="5.6" y2="-30.6"/><line x1="-11.5" y1="-28" x2="-13" y2="-28.4"/><line x1="11.5" y1="-31" x2="13" y2="-31.4"/></g>
      <circle cx="0" cy="-35" r="2.1" fill="#d98c9c"/><circle cx="0" cy="-35" r="0.8" fill="#e8c46a"/>
      <path d="M-6.5 -9.5 l1.5 9.5 h10 l1.5 -9.5 z" fill="#b8734f" stroke="#8a5a3a" stroke-width="0.6"/>
      <rect x="-7.2" y="-11" width="14.4" height="2.2" rx="0.6" fill="#a05f3e"/>
    </g>`;
  }
  // A hydrangea bush planted in the ground: leaves below, round mop-head blooms above.
  function hydrangeaBush(bloom, light, dark) {
    return (x, y, scale) => `<g class="plant hydrangea" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="15" ry="1.8" fill="#000" opacity="0.12"/>
      <g fill="#4f7a4a"><ellipse cx="-9" cy="-6" rx="8" ry="4.6"/><ellipse cx="9" cy="-6" rx="8" ry="4.6"/><ellipse cx="0" cy="-4" rx="9" ry="4.6"/></g>
      <g fill="#3f6b3a" opacity="0.7"><ellipse cx="-13" cy="-3" rx="4" ry="2.2"/><ellipse cx="13" cy="-3" rx="4" ry="2.2"/></g>
      <g fill="${bloom}"><circle cx="-8" cy="-14" r="6.5"/><circle cx="6" cy="-16" r="7"/><circle cx="-1" cy="-21" r="6"/><circle cx="11" cy="-10" r="5"/><circle cx="-13" cy="-9" r="5"/></g>
      <g fill="${light}"><circle cx="-6" cy="-17" r="2.6"/><circle cx="8" cy="-19" r="2.4"/><circle cx="1" cy="-24" r="2"/><circle cx="-11" cy="-11" r="1.8"/><circle cx="12" cy="-13" r="1.6"/></g>
      <g fill="${dark}" opacity="0.8"><circle cx="-10" cy="-12" r="0.8"/><circle cx="4" cy="-13" r="0.8"/><circle cx="-3" cy="-19" r="0.8"/><circle cx="9" cy="-8" r="0.7"/><circle cx="2" cy="-22" r="0.7"/></g>
    </g>`;
  }
  const hydrangeaPink = hydrangeaBush('#d98c9c', '#f0c0c8', '#b86b7c');
  const hydrangeaBlue = hydrangeaBush('#8b9cc9', '#b7c4e4', '#6b7db0');
  // One entry point for every plant the shop can own.
  const PLANT_DRAWINGS = { snake: snakePlant, monstera, spider: spiderPlant, orchid, zz: zzPlant, inch: inchPlant, fern, cactus, 'hydrangea-pink': hydrangeaPink, 'hydrangea-blue': hydrangeaBlue };
  // A park bench for out front. Seen slightly from above so the seat has depth: pale top
  // slats, a darker front edge, a slatted back, and a little shadow on the ground.
  function bench(x, y, scale) {
    return `<g class="bench" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="30" ry="2.4" fill="#000" opacity="0.13"/>
      <g stroke="#3e3a36" stroke-width="2.6" stroke-linecap="round" fill="none">
        <path d="M-22 0 L-22 -15"/><path d="M22 0 L22 -15"/>
        <path d="M-20 -15 L-25 -31"/><path d="M20 -15 L25 -31"/>
        <path d="M-25 -31 L-19 -31"/><path d="M25 -31 L19 -31"/>
      </g>
      <g fill="#a5794f"><rect x="-22" y="-30" width="44" height="3.2" rx="0.8"/><rect x="-22" y="-25" width="44" height="3.2" rx="0.8"/><rect x="-22" y="-20" width="44" height="3.2" rx="0.8"/></g>
      <g fill="#7a5636"><rect x="-22" y="-27" width="44" height="0.9"/><rect x="-22" y="-22" width="44" height="0.9"/></g>
      <path d="M-26 -16 L26 -16 L28 -12 L-28 -12 Z" fill="#b98a5b"/>
      <path d="M-26 -16 L26 -16 L26 -14.6 L-26 -14.6 Z" fill="#cfa06c"/>
      <rect x="-28" y="-12" width="56" height="3.4" fill="#8a6240"/>
      <g stroke="#7a5636" stroke-width="0.8"><line x1="-8" y1="-16" x2="-9" y2="-12"/><line x1="8" y1="-16" x2="9" y2="-12"/></g>
    </g>`;
  }

  // A black wrought-iron lamppost. Its glass warms and a glow spreads at dusk (game.js sets
  // .lamp-glow opacity and .lamp-glass colour along with the shop's window glow).
  function lamppost(x, y, scale) {
    return `<g class="lamp" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="7" ry="1.3" fill="#000" opacity="0.13"/>
      <ellipse class="lamp-glow" cx="0" cy="-83" rx="20" ry="17" fill="url(#windowGlow)" opacity="0"/>
      <path d="M-7 0 h14 l-2.5 -5 h-9 z" fill="#2b2a28"/><rect x="-4.2" y="-14" width="8.4" height="9" rx="0.8" fill="#2b2a28"/>
      <rect x="-1.6" y="-76" width="3.2" height="62" fill="#2b2a28"/>
      <rect x="-3.2" y="-52" width="6.4" height="2.4" fill="#2b2a28"/><rect x="-2.7" y="-73" width="5.4" height="1.8" fill="#2b2a28"/>
      <g stroke="#2b2a28" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M-1.6 -68 q-8 -1.5 -9 -8 q0 -3 2.5 -2.5"/><path d="M1.6 -68 q8 -1.5 9 -8 q0 -3 -2.5 -2.5"/></g>
      <path class="lamp-glass" d="M-5 -77 l1.5 -12 h7 l1.5 12 z" fill="#dfe8ea"/>
      <g stroke="#2b2a28" stroke-width="1.1" fill="none"><path d="M-6 -76.5 l2 -12.5 h8 l2 12.5 z"/><line x1="0" y1="-77" x2="0" y2="-89"/></g>
      <path d="M-8.5 -89 l8.5 -6 l8.5 6 z" fill="#2b2a28"/><circle cx="0" cy="-96.5" r="1.6" fill="#2b2a28"/>
    </g>`;
  }

  function plant(kind, x, y, scale) {
    return (PLANT_DRAWINGS[kind] || snakePlant)(x, y, scale);
  }
  // An Adirondack chair in weathered blue: a fanned slatted back leaning away, wide flat
  // arms, a low seat. Seen a little from above so the seat shows.
  function adirondack(x, y, scale) {
    return `<g class="chair" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="18" ry="2" fill="#000" opacity="0.13"/>
      <g stroke="#6b7f88" stroke-width="2.4" stroke-linecap="round"><line x1="-11" y1="0" x2="-12" y2="-14"/><line x1="11" y1="0" x2="12" y2="-14"/></g>
      <g fill="#a9c2cc" stroke="#6b7f88" stroke-width="0.5"><rect x="-12" y="-36" width="4.4" height="24" rx="1"/><rect x="-7.2" y="-38" width="4.4" height="26" rx="1"/><rect x="-2.2" y="-39" width="4.4" height="27" rx="1"/><rect x="2.8" y="-38" width="4.4" height="26" rx="1"/><rect x="7.6" y="-36" width="4.4" height="24" rx="1"/></g>
      <path d="M-13 -14 L13 -14 L15.5 -8.5 L-15.5 -8.5 Z" fill="#9fb8c4"/>
      <g stroke="#7f98a4" stroke-width="0.6"><line x1="-13.8" y1="-12.2" x2="13.8" y2="-12.2"/><line x1="-14.6" y1="-10.3" x2="14.6" y2="-10.3"/></g>
      <rect x="-15.5" y="-8.5" width="31" height="2.2" fill="#7f98a4"/>
      <g stroke="#6b7f88" stroke-width="1.6" stroke-linecap="round"><line x1="-16" y1="-21" x2="-14" y2="-9"/><line x1="16" y1="-21" x2="14" y2="-9"/></g>
      <rect x="-21" y="-23" width="13" height="3" rx="1.2" fill="#b9d0d8" stroke="#6b7f88" stroke-width="0.4"/><rect x="8" y="-23" width="13" height="3" rx="1.2" fill="#b9d0d8" stroke="#6b7f88" stroke-width="0.4"/>
      <g stroke="#6b7f88" stroke-width="2.4" stroke-linecap="round"><line x1="-13.5" y1="-8" x2="-14.5" y2="0"/><line x1="13.5" y1="-8" x2="14.5" y2="0"/></g>
    </g>`;
  }

  // ---- Indoor-only decor (stage three on) ----
  // Same conventions as the things out front: (x, y) is the bottom center, and scale
  // follows the people.
  // A squishy armchair in faded rust velvet: fat rolled arms, a sagging seat cushion.
  function armchair(x, y, scale) {
    return `<g class="armchair" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="24" ry="2.4" fill="#000" opacity="0.14"/>
      <g fill="#5a3e2c"><rect x="-18" y="-4" width="3" height="4" rx="0.8"/><rect x="15" y="-4" width="3" height="4" rx="0.8"/></g>
      <path d="M-16 -18 Q-17 -40 0 -40 Q17 -40 16 -18 Z" fill="#a8574a" stroke="#6e3a31" stroke-width="0.8"/>
      <path d="M-8 -36 Q0 -38 8 -36" stroke="#6e3a31" stroke-width="0.7" fill="none" opacity="0.6"/>
      <rect x="-20" y="-17" width="40" height="13" rx="3" fill="#9a4c40" stroke="#6e3a31" stroke-width="0.8"/>
      <path d="M-14 -18 Q0 -23 14 -18 Q14 -13 0 -12 Q-14 -13 -14 -18 Z" fill="#b8665a" stroke="#6e3a31" stroke-width="0.6"/>
      <rect x="-24" y="-26" width="10" height="22" rx="4.5" fill="#a8574a" stroke="#6e3a31" stroke-width="0.8"/>
      <rect x="14" y="-26" width="10" height="22" rx="4.5" fill="#a8574a" stroke="#6e3a31" stroke-width="0.8"/>
      <g fill="none" stroke="#6e3a31" stroke-width="0.7" opacity="0.7"><circle cx="-19" cy="-22" r="2.4"/><circle cx="19" cy="-22" r="2.4"/></g>
      <path d="M-7 -30 l5 -3 l6 2 l-2 5 l-7 1 z" fill="#e9e2cf" opacity="0.9"/>
    </g>`;
  }
  // A leaning pile of board games, the lids in faded primary colors.
  function boardGames(x, y, scale) {
    const boxes = [['#6f8a99', -11, 22], ['#b7736b', -9, 20], ['#d9a441', -12, 23], ['#4f7a4a', -8, 18], ['#e9e2cf', -10, 19]];
    let out = `<g class="board-games" transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="0" rx="15" ry="1.8" fill="#000" opacity="0.14"/>`;
    boxes.forEach(([color, left, w], i) => {
      const top = -4.2 * (i + 1), tilt = [0, 2, -1.5, 3, -2][i];
      out += `<g transform="rotate(${tilt} ${left + w / 2} ${top + 2})"><rect x="${left}" y="${top}" width="${w}" height="4.2" fill="${color}" stroke="#3b332c" stroke-width="0.5"/><rect x="${left + 2}" y="${top + 1.3}" width="${w * 0.4}" height="1.2" fill="#fff" opacity="0.5"/></g>`;
    });
    return out + `</g>`;
  }
  // A brass reading lamp with a pleated cream shade. It glows after dark like the
  // lamppost (same .lamp-glow and .lamp-glass hooks).
  function readingLamp(x, y, scale) {
    return `<g class="reading-lamp" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="9" ry="1.4" fill="#000" opacity="0.14"/>
      <ellipse class="lamp-glow" cx="0" cy="-50" rx="22" ry="18" fill="url(#windowGlow)" opacity="0"/>
      <ellipse cx="0" cy="-1" rx="7" ry="1.8" fill="#8a6a3a"/>
      <rect x="-0.9" y="-48" width="1.8" height="47" fill="#b08a4a"/>
      <path class="lamp-glass" d="M-9 -45 L-6 -58 H6 L9 -45 Z" fill="#f4ecd4"/>
      <path d="M-9 -45 L-6 -58 H6 L9 -45 Z" fill="none" stroke="#b08a4a" stroke-width="0.8"/>
      <g stroke="#c9b28a" stroke-width="0.5" opacity="0.8"><line x1="-4" y1="-58" x2="-6" y2="-45"/><line x1="0" y1="-58" x2="0" y2="-45"/><line x1="4" y1="-58" x2="6" y2="-45"/></g>
    </g>`;
  }
  // A globe on a wooden stand, tilted on its brass meridian.
  function globe(x, y, scale) {
    return `<g class="globe" transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="0" rx="12" ry="1.6" fill="#000" opacity="0.14"/>
      <g stroke="#6b4a3a" stroke-width="1.8" stroke-linecap="round"><line x1="0" y1="-12" x2="-9" y2="0"/><line x1="0" y1="-12" x2="9" y2="0"/><line x1="0" y1="-12" x2="0" y2="-1"/></g>
      <rect x="-1.5" y="-17" width="3" height="6" fill="#6b4a3a"/>
      <circle cx="0" cy="-29" r="12" fill="#7fa3ad" stroke="#3b5a66" stroke-width="0.6"/>
      <g fill="#c9b27a"><path d="M-8 -35 q4 -3 7 0 q-1 4 -4 5 q-3 -1 -3 -5 z"/><path d="M2 -29 q5 -2 7 2 q-2 5 -6 6 q-2 -3 -1 -8 z"/><path d="M-6 -24 q2 0 3 3 q-2 2 -3 0 z"/></g>
      <path d="M-9 -37 A13 13 0 0 1 9 -21" stroke="#b08a4a" stroke-width="1.6" fill="none" transform="rotate(-20 0 -29)"/>
      <circle cx="-4" cy="-34" r="2.5" fill="#fff" opacity="0.35"/>
    </g>`;
  }
  const INDOOR_DRAWINGS = { armchair, games: boardGames, readinglamp: readingLamp, globe };
  function indoorItem(kind, x, y, scale) {
    return (INDOOR_DRAWINGS[kind] || armchair)(x, y, scale);
  }

  // The night sky: a color wash, a scatter of stars, and the moon. Outside, it sits just
  // above the sky and the sun and behind everything else, so the moon and stars stay
  // bright while houses, trees and people pass in front of them (those get their own
  // wash from the night-wash filter). The game sets the opacities as the day goes by.
  function nightSky() {
    let stars = '';
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 34; i++) {
      stars += `<circle cx="${(rnd() * 800).toFixed(0)}" cy="${(rnd() * 200).toFixed(0)}" r="${(0.8 + rnd() * 1.3).toFixed(1)}" fill="#f6f2e4"/>`;
    }
    return `<rect class="sky-wash" width="${VIEW.width}" height="${VIEW.height}" fill="#1f2a5a" opacity="0"/>
      <g class="stars" opacity="0">${stars}</g>
      ${moonSvg()}`;
  }
  // The time-of-day layer, over the whole picture: a glow from the shop's windows. Inside,
  // where there is no sky, it carries the night sky's wash too (withSky), over everything.
  function daylightLayer(glowX, glowY, glowRx, glowRy, withSky) {
    return `<g class="daylight">
      ${withSky ? nightSky() : ''}
      <ellipse class="window-glow" cx="${glowX}" cy="${glowY}" rx="${glowRx}" ry="${glowRy}" fill="url(#windowGlow)" opacity="0"/>
    </g>`;
  }

  // =========================================================
  // Pets
  // =========================================================
  // Small animals drawn facing right with their feet at y = 0. The game positions,
  // flips and scales them. pose is 'stand', 'sit' or 'nap'.
  const PET_COLORS = {
    cat: {
      white: { body: '#f4f1e8', dark: '#c9c3b6', chest: null },
      black: { body: '#2b2a28', dark: '#151413', chest: null },
      tuxedo: { body: '#2b2a28', dark: '#151413', chest: '#f4f1e8' },
      gray: { body: '#8a8f94', dark: '#5c5b56', chest: null },
      brown: { body: '#8a6248', dark: '#5a4030', chest: null },
      tabby: { body: '#b08a5a', dark: '#6b4a3a', chest: '#e9e2cf', stripes: true }
    },
    dog: {
      brown: { body: '#8a6248', dark: '#5a4030' },
      black: { body: '#2b2a28', dark: '#151413' },
      white: { body: '#f4f1e8', dark: '#c9c3b6' },
      yellow: { body: '#e0c48a', dark: '#b08a5a' }
    },
    crab: { red: { body: '#b6413a', dark: '#7a2a24' } }
  };

  function catSvg(c, pose) {
    const eye = pose === 'nap' ? `<g stroke="#2b2a28" stroke-width="0.6"><line x1="7" y1="-12.5" x2="8.5" y2="-12.5"/><line x1="10" y1="-12.5" x2="11.5" y2="-12.5"/></g>` : `<g fill="#3b7a3a"><circle cx="7.5" cy="-13" r="0.9"/><circle cx="10.5" cy="-13" r="0.9"/></g>`;
    const stripes = c.stripes ? `<g stroke="${c.dark}" stroke-width="0.9" opacity="0.8"><line x1="-4" y1="-11" x2="-3" y2="-4"/><line x1="0" y1="-12" x2="1" y2="-4"/><line x1="4" y1="-11" x2="5" y2="-5"/></g>` : '';
    if (pose === 'nap') {
      return `<ellipse cx="0" cy="0" rx="11" ry="1.6" fill="#000" opacity="0.12"/>
        <path d="M-11 -3 q-4 -6 3 -6" stroke="${c.body}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse cx="0" cy="-4" rx="10" ry="4" fill="${c.body}"/>${stripes}
        <circle cx="8" cy="-7" r="4.2" fill="${c.body}"/><polygon points="5,-10 5.5,-14 8,-10.5" fill="${c.body}"/><polygon points="11,-10 12,-14 9,-10.5" fill="${c.body}"/>
        <g stroke="#2b2a28" stroke-width="0.6"><line x1="6.5" y1="-7" x2="8" y2="-7"/><line x1="9.5" y1="-7" x2="11" y2="-7"/></g>
        <text x="13" y="-13" font-family="Georgia, serif" font-size="4" fill="#5d5a54" opacity="0.8">z</text><text x="16" y="-17" font-family="Georgia, serif" font-size="3" fill="#5d5a54" opacity="0.6">z</text>`;
    }
    if (pose === 'sit') {
      return `<ellipse cx="0" cy="0" rx="8" ry="1.6" fill="#000" opacity="0.12"/>
        <path d="M-5 -2 q-8 2 -6 -6" stroke="${c.body}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse cx="0" cy="-8" rx="6" ry="8.5" fill="${c.body}"/>${stripes}
        ${c.chest ? `<ellipse cx="1" cy="-7" rx="3.2" ry="5" fill="${c.chest}"/>` : ''}
        <g fill="${c.body}"><ellipse cx="-3" cy="-1" rx="2.2" ry="1.4"/><ellipse cx="3" cy="-1" rx="2.2" ry="1.4"/></g>
        ${c.chest ? `<g fill="${c.chest}"><ellipse cx="-3" cy="-1" rx="1.6" ry="1"/><ellipse cx="3" cy="-1" rx="1.6" ry="1"/></g>` : ''}
        <circle cx="2" cy="-18" r="4.5" fill="${c.body}"/><polygon points="-1.5,-21 -1,-25.5 2,-21.5" fill="${c.body}"/><polygon points="5.5,-21 6.5,-25.5 3,-21.5" fill="${c.body}"/>
        <g fill="#3b7a3a"><circle cx="0.8" cy="-18.5" r="0.9"/><circle cx="3.8" cy="-18.5" r="0.9"/></g><circle cx="2.3" cy="-16.5" r="0.6" fill="#d98c9c"/>`;
    }
    return `<ellipse cx="0" cy="0" rx="10" ry="1.6" fill="#000" opacity="0.12"/>
      <path d="M-9 -8 q-5 -2 -5 -9" stroke="${c.body}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <g fill="${c.body}"><rect x="-8" y="-5" width="2.4" height="5"/><rect x="-4" y="-5" width="2.4" height="5"/><rect x="2" y="-5" width="2.4" height="5"/><rect x="5.5" y="-5" width="2.4" height="5"/></g>
      ${c.chest ? `<g fill="${c.chest}"><rect x="-8" y="-1.5" width="2.4" height="1.5"/><rect x="5.5" y="-1.5" width="2.4" height="1.5"/></g>` : ''}
      <ellipse cx="0" cy="-8" rx="9.5" ry="5" fill="${c.body}"/>${stripes}
      ${c.chest ? `<ellipse cx="5" cy="-7" rx="3" ry="3.4" fill="${c.chest}"/>` : ''}
      <circle cx="9" cy="-12.5" r="4.5" fill="${c.body}"/><polygon points="5.5,-15.5 6,-20 9,-16" fill="${c.body}"/><polygon points="12.5,-15.5 13.5,-20 10,-16" fill="${c.body}"/>
      ${eye}<circle cx="12" cy="-11.5" r="0.6" fill="#d98c9c"/>`;
  }

  function dogSvg(c, pose) {
    const eyes = pose === 'nap' ? `<g stroke="#2b2a28" stroke-width="0.6"><line x1="8" y1="-14" x2="9.5" y2="-14"/></g>` : `<circle cx="9.5" cy="-14.5" r="1" fill="#2b2a28"/>`;
    if (pose === 'nap') {
      return `<ellipse cx="0" cy="0" rx="12" ry="1.8" fill="#000" opacity="0.12"/>
        <path d="M-12 -4 q-3 -6 2 -7" stroke="${c.body}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="0" cy="-4.5" rx="11" ry="4.5" fill="${c.body}"/>
        <circle cx="9" cy="-7.5" r="5" fill="${c.body}"/><ellipse cx="6" cy="-6" rx="2.2" ry="4" fill="${c.dark}"/>
        <circle cx="13.5" cy="-6" r="2.2" fill="${c.dark}"/><circle cx="14.5" cy="-6.5" r="0.7" fill="#2b2a28"/>
        <g stroke="#2b2a28" stroke-width="0.6"><line x1="8" y1="-9" x2="9.5" y2="-9"/></g>
        <text x="14" y="-14" font-family="Georgia, serif" font-size="4" fill="#5d5a54" opacity="0.8">z</text><text x="17" y="-18" font-family="Georgia, serif" font-size="3" fill="#5d5a54" opacity="0.6">z</text>`;
    }
    if (pose === 'sit') {
      return `<ellipse cx="0" cy="0" rx="9" ry="1.8" fill="#000" opacity="0.12"/>
        <path d="M-6 -3 q-7 3 -8 -4" stroke="${c.body}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="0" cy="-9" rx="7" ry="9.5" fill="${c.body}"/>
        <g fill="${c.body}"><ellipse cx="-3.5" cy="-1" rx="2.6" ry="1.6"/><ellipse cx="3.5" cy="-1" rx="2.6" ry="1.6"/></g>
        <circle cx="3" cy="-20" r="5.2" fill="${c.body}"/><ellipse cx="-0.5" cy="-18" rx="2.2" ry="4.2" fill="${c.dark}"/>
        <circle cx="7.5" cy="-18.5" r="2.4" fill="${c.dark}"/><circle cx="8.5" cy="-19" r="0.7" fill="#2b2a28"/>
        <circle cx="4" cy="-21.5" r="1" fill="#2b2a28"/><ellipse cx="7" cy="-16" rx="1.2" ry="1.8" fill="#d98c9c"/>`;
    }
    return `<ellipse cx="0" cy="0" rx="11" ry="1.8" fill="#000" opacity="0.12"/>
      <path d="M-10 -9 q-3 -4 -1 -9" stroke="${c.body}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <g fill="${c.body}"><rect x="-8.5" y="-6" width="2.8" height="6"/><rect x="-4" y="-6" width="2.8" height="6"/><rect x="2" y="-6" width="2.8" height="6"/><rect x="6" y="-6" width="2.8" height="6"/></g>
      <ellipse cx="0" cy="-9" rx="10.5" ry="5.5" fill="${c.body}"/>
      <circle cx="10" cy="-14" r="5.2" fill="${c.body}"/><ellipse cx="6.5" cy="-12" rx="2.2" ry="4.2" fill="${c.dark}"/>
      <circle cx="14.5" cy="-12.5" r="2.4" fill="${c.dark}"/><circle cx="15.5" cy="-13" r="0.7" fill="#2b2a28"/>
      ${eyes}<ellipse cx="14" cy="-10" rx="1.2" ry="1.8" fill="#d98c9c"/>`;
  }

  function crabSvg(c, pose) {
    const zz = pose === 'nap' ? `<text x="9" y="-11" font-family="Georgia, serif" font-size="4" fill="#5d5a54" opacity="0.8">z</text>` : '';
    const eyes = pose === 'nap' ? `<g stroke="#2b2a28" stroke-width="0.6"><line x1="-3.5" y1="-11" x2="-2" y2="-11"/><line x1="2" y1="-11" x2="3.5" y2="-11"/></g>` : `<g fill="#2b2a28"><circle cx="-2.8" cy="-11.5" r="1"/><circle cx="2.8" cy="-11.5" r="1"/></g>`;
    return `<ellipse cx="0" cy="0" rx="10" ry="1.6" fill="#000" opacity="0.12"/>
      <g stroke="${c.dark}" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M-6 -4 l-4 3 l-1 1"/><path d="M-7 -6 l-5 1 l-2 1.5"/><path d="M-6 -8 l-5 -1 l-2 1"/><path d="M6 -4 l4 3 l1 1"/><path d="M7 -6 l5 1 l2 1.5"/><path d="M6 -8 l5 -1 l2 1"/></g>
      <ellipse cx="0" cy="-6" rx="8" ry="4.6" fill="${c.body}"/>
      <g stroke="${c.body}" stroke-width="1.8" fill="none"><path d="M-6 -9 q-5 -3 -8 -1"/><path d="M6 -9 q5 -3 8 -1"/></g>
      <g fill="${c.body}"><circle cx="-14" cy="-10.5" r="2.6"/><circle cx="14" cy="-10.5" r="2.6"/></g>
      <g fill="${c.dark}"><path d="M-15 -12.5 l-1.5 -2.5 l2.5 1z"/><path d="M15 -12.5 l1.5 -2.5 l-2.5 1z"/></g>
      <g stroke="${c.dark}" stroke-width="0.9"><line x1="-2.8" y1="-9" x2="-2.8" y2="-12"/><line x1="2.8" y1="-9" x2="2.8" y2="-12"/></g>${eyes}
      <path d="M-1.5 -8 q1.5 1.2 3 0" stroke="#2b2a28" stroke-width="0.5" fill="none"/>${zz}`;
  }

  function petSvg(pet, pose) {
    const c = (PET_COLORS[pet.kind] || PET_COLORS.cat)[pet.color] || Object.values(PET_COLORS[pet.kind] || PET_COLORS.cat)[0];
    if (pet.kind === 'dog') return dogSvg(c, pose);
    if (pet.kind === 'crab') return crabSvg(c, pose);
    return catSvg(c, pose);
  }

  // Bare winter branches, fanning up from the top of a trunk. Hidden except in winter.
  function bareBranches(x, y, s) {
    return `<g class="bare" stroke="#5a4030" stroke-width="${4 * s}" fill="none" stroke-linecap="round" transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 0 q-22 -40 -48 -56"/><path d="M0 0 q16 -46 42 -64"/><path d="M0 0 q-2 -52 -6 -84"/>
      <path d="M-14 -26 q-16 -8 -34 -10" stroke-width="${2.6 * s}"/><path d="M12 -30 q14 -14 30 -20" stroke-width="${2.6 * s}"/>
      <path d="M-30 -42 q-8 -14 -6 -26" stroke-width="${2 * s}"/><path d="M26 -50 q10 -10 8 -26" stroke-width="${2 * s}"/><path d="M-4 -60 q6 -12 18 -16" stroke-width="${2 * s}"/>
    </g>`;
  }

  // Seasonal touches on the ground and in the sky. Each group is shown by the page
  // stylesheet only in its season. grassy: whether wildflowers make sense here.
  // edgeX: where the ground ends, for a scene that drops away (the cliff). Drifts centered
  // past it are left out; render also clips the whole layer to the ground.
  // path: [top, bottom] of a path across the scene that flowers shouldn't grow on.
  function seasonalLayer(grassy, edgeX = 800, path = null) {
    let seed = 41;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    let leaves = '';
    const leafColors = ['#c9782e', '#a5443a', '#d9a441', '#b85c2a'];
    for (let i = 0; i < 30; i++) {
      const x = rnd() * 800, y = 382 + rnd() * 52, r = rnd() * 360;
      leaves += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="5" ry="2.6" fill="${leafColors[i % 4]}" transform="rotate(${r.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    }
    let drifts = '';
    [[60, 404, 90, 9], [230, 412, 70, 7], [400, 420, 110, 10], [600, 406, 80, 8], [760, 416, 90, 9], [130, 434, 120, 8], [520, 438, 130, 9]].filter(([cx]) => cx < edgeX).forEach(([cx, cy, rx, ry]) => {
      drifts += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#f6f4ee" opacity="0.92"/>`;
    });
    let flowers = '';
    if (grassy) {
      const petals = ['#d98c9c', '#e8c46a', '#ffffff', '#9b7f9c', '#b6413a'];
      for (let i = 0; i < 26; i++) {
        const x = rnd() * 800, y = 380 + rnd() * 50;
        if (path && y > path[0] && y < path[1] + 6) continue;
        flowers += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${x.toFixed(0)}" y2="${(y - 6).toFixed(0)}" stroke="#4f7a4a" stroke-width="1"/><circle cx="${x.toFixed(0)}" cy="${(y - 7).toFixed(0)}" r="2.2" fill="${petals[i % 5]}"/>`;
      }
    }
    return `<g class="autumn-leaves">${leaves}</g><g class="snow-drifts">${drifts}</g><g class="wildflowers">${flowers}</g>`;
  }
  // The sun and the moon. Drawn right after the sky, in layers of their own (see render),
  // so clouds, gulls, buildings and decor all pass in front. Each is drawn around its own origin;
  // game.js moves them along an arc through the day (applyDaylight) and fades the moon in
  // at dusk. The starting transform is only for pictures no game is running in, such as the
  // location cards on the setup screen.
  function skyBodies() {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const c = Math.cos(a * Math.PI / 180), si = Math.sin(a * Math.PI / 180);
      return `<line x1="${(34 * c).toFixed(1)}" y1="${(34 * si).toFixed(1)}" x2="${(44 * c).toFixed(1)}" y2="${(44 * si).toFixed(1)}"/>`;
    }).join('');
    const sun = `<g class="sun" transform="translate(560 90)"><circle class="sun-glow" r="46" fill="#f6d9a8" opacity="0.28"/><circle class="sun-disc" r="26" fill="#f6d9a8"/><g class="sun-rays" stroke="#f6d9a8" stroke-width="2" opacity="0.6">${rays}</g></g>`;
    return sun;
  }
  // The moon lives in the night sky (see nightSky), above the sky's own wash, so it stays
  // bright while the sky goes blue. game.js moves and fades it.
  function moonSvg() {
    return `<g class="moon" transform="translate(640 80)" opacity="0"><circle r="30" fill="#f4f1e8" opacity="0.16"/><circle r="18" fill="#f4f1e8"/><g fill="#dcd6c6" opacity="0.8"><circle cx="-6" cy="-4" r="3.2"/><circle cx="6" cy="6" r="2.2"/><circle cx="5" cy="-8" r="1.6"/><circle cx="-3" cy="8" r="1.3"/></g></g>`;
  }
  const GRASSY = ['park', 'green', 'street2', 'cliff'];
  // Scenes where the ground doesn't reach both edges of the picture: the outline of the
  // ground (so snow, leaves and flowers stay on it) and roughly where it ends. The cliff's
  // grass runs out along a line from (660, 338) down to (690, 450).
  const GROUND = {
    cliff: { outline: '0,330 660,330 690,450 0,450', edgeX: 670 }
  };
  // Scenes with a path people walk along: its top and bottom, kept clear of flowers.
  const PATHS = { green: [393, 423] };
  // A plain sign board with an empty text element the game fills with the shop name.
  function signBoard(x, y, w, h, fontSize) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e9e2cf" stroke="#7d6b58" stroke-width="1.5"/>
      <text class="box-sign" x="${x + w / 2}" y="${y + h * 0.72}" text-anchor="middle" font-family="Georgia, serif" font-size="${fontSize}" fill="#5c5b56"></text>`;
  }

  // The definitions block: sky gradient, awning stripes, and the "wobble" filter,
  // which nudges every edge slightly so shapes feel hand-drawn rather than ruler-straight.
  let nightWashCount = 0;
  function defs(skyTop, skyBottom) {
    return `<defs>
      <filter id="wobble" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <!-- Sketch mode. The color layer: a little dustier and warmer, loosely placed. -->
      <filter id="wobbleFill" x="-3%" y="-3%" width="106%" height="106%">
        <feColorMatrix in="SourceGraphic" type="saturate" values="0.88" result="dusty"/>
        <feColorMatrix in="dusty" type="matrix" values="1.05 0 0 0 0.01  0 1 0 0 0.005  0 0 0.93 0 0  0 0 0 1 0" result="warm"/>
        <!-- Watercolor pooling: pigment gathers where a wash ends, so each shape gets a slightly darker rim. -->
        <feMorphology in="warm" operator="erode" radius="1.1" result="inner"/>
        <feComposite in="warm" in2="inner" operator="out" result="rim"/>
        <feColorMatrix in="rim" type="matrix" values="0.72 0 0 0 0  0 0.72 0 0 0  0 0 0.72 0 0  0 0 0 0.55 0" result="darkRim"/>
        <feMerge result="pooled"><feMergeNode in="warm"/><feMergeNode in="darkRim"/></feMerge>
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="noise"/>
        <feDisplacementMap in="pooled" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <!-- Sketch mode. The ink layer: a scratchier wobble, so lines waver and vary. -->
      <filter id="wobbleLine" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="11" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="B"/>
      </filter>
      <!-- Sketch mode. Paper grain, generated rather than loaded from a file. -->
      <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="5" result="noise"/>
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.93  0 0 0 0 0.90  0 0 0 0 0.82  0 0 0 0.55 0"/>
      </filter>
      <!-- The night wash for everything in front of the sky: the same color and strength as
           the sky's wash rect, but painted only onto the shapes themselves, so the moon and
           stars behind them are left bright. game.js sets the flood and switches it on.
           Every picture gets its own id, as the setup screen shows several at once. -->
      <filter id="nightWash${++nightWashCount}" class="night-wash" filterUnits="userSpaceOnUse" x="0" y="0" width="${VIEW.width}" height="${VIEW.height}" color-interpolation-filters="sRGB">
        <feFlood class="wash-flood" flood-color="#1f2a5a" flood-opacity="0" result="tint"/>
        <feComposite in="tint" in2="SourceGraphic" operator="in" result="tintOnShapes"/>
        <feComposite in="tintOnShapes" in2="SourceGraphic" operator="over"/>
      </filter>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${skyTop}"/>
        <stop offset="1" stop-color="${skyBottom}"/>
      </linearGradient>
      <radialGradient id="windowGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f2e6b8" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#f2e6b8" stop-opacity="0"/>
      </radialGradient>
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
    const bx = opts.boardwalkX || 480;   // where the footprints start, beside the shop
    const sx = opts.signX || 250;        // the "BEACH" sign post
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(150, 80, 60) + cloud(620, 110, 70);
    s += `<rect x="0" y="235" width="800" height="70" fill="#7fa3ad"/>`;
    s += `<g class="waves" stroke="#a9c6cc" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M40 255 q15 -4 30 0"/><path d="M180 270 q15 -4 30 0"/><path d="M330 250 q15 -4 30 0"/>
      <path d="M520 265 q15 -4 30 0"/><path d="M680 252 q15 -4 30 0"/><path d="M740 285 q15 -4 30 0"/>
    </g>`;
    s += `<g class="waves late" stroke="#bcd3d8" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M110 282 q12 -3 24 0"/><path d="M420 278 q12 -3 24 0"/><path d="M600 290 q12 -3 24 0"/>
    </g>`;
    // Foam where the water meets the sand: it creeps up and slides back.
    s += `<path class="foam" d="M0 300 C150 270 300 320 450 290 S700 270 800 300" stroke="#f4f7f4" stroke-width="3" fill="none" opacity="0.6"/>`;
    s += `<path d="M0 300 C150 270 300 320 450 290 S700 270 800 300 L800 450 L0 450 Z" fill="#e3d6b4"/>`;
    s += `<path d="M0 450 L0 405 C200 398 600 408 800 400 L800 450 Z" fill="#d9caa3"/>`;
    [60, 95, 160, 250, 300, 560, 610, 700, 760].forEach((x, i) => { s += grassTuft(x, 296 + (i % 3) * 6); });
    // Footprints from beside the shop down to the water: pairs of prints that wander
    // slightly and shrink with distance.
    s += `<g fill="#c4b18a" opacity="0.7">`;
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const cx = bx + 20 + 90 * t + Math.sin(t * 5) * 8;                 // a gentle wander to the right
      const cy = 396 - 88 * t;                                             // up the sand towards the sea
      const size = 3.4 - 1.9 * t, side = i % 2 === 0 ? -1 : 1;             // alternate feet, smaller as they go
      const fx = cx + side * (5 - 2.5 * t), rot = -20 + 10 * Math.sin(t * 7);
      s += `<ellipse cx="${fx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(size * 0.6).toFixed(1)}" ry="${size.toFixed(1)}" transform="rotate(${rot.toFixed(0)} ${fx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      s += `<ellipse cx="${fx.toFixed(1)}" cy="${(cy - size * 1.15).toFixed(1)}" rx="${(size * 0.45).toFixed(1)}" ry="${(size * 0.42).toFixed(1)}" transform="rotate(${rot.toFixed(0)} ${fx.toFixed(1)} ${(cy - size * 1.15).toFixed(1)})"/>`;
    }
    s += `</g>`;
    // The near part is painted after the background people, so strollers on the far sand
    // pass behind the dune fence and the sign post rather than in front.
    let near = `<g stroke="#8b6f4e" stroke-width="6"><line x1="40" y1="290" x2="40" y2="370"/><line x1="130" y1="288" x2="130" y2="368"/><line x1="215" y1="300" x2="215" y2="380"/></g>`;
    near += `<path d="M40 306 Q85 330 130 304 Q172 336 215 316" stroke="#c9b28a" stroke-width="3" fill="none"/><path d="M40 336 Q85 358 130 334 Q172 364 215 346" stroke="#c9b28a" stroke-width="3" fill="none"/>`;
    near += `<rect x="${sx - 1}" y="270" width="9" height="130" fill="#8b6f4e"/>`;
    near += `<rect x="${sx - 46}" y="250" width="100" height="34" fill="#e8e1cf" stroke="#8b6f4e" stroke-width="3"/>`;
    near += `<text x="${sx + 4}" y="274" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#5b6b70">BEACH &#8594;</text>`;
    return { far: s, near };
  }

  function park() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(520, 70, 55) + cloud(240, 100, 45);
    // Beyond the park: a distant bay. Water to the horizon with a hazy edge, a strip of
    // marsh and sand, then a pale far field that the near tree line rises in front of.
    s += `<rect x="0" y="200" width="800" height="36" fill="#9dbccb"/>`;
    s += `<rect x="0" y="199" width="800" height="3" fill="#c8dde3" opacity="0.8"/>`;
    s += `<g class="waves" stroke="#c3d9e0" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M80 214 q10 -3 20 0"/><path d="M300 222 q10 -3 20 0"/><path d="M520 210 q10 -3 20 0"/><path d="M700 226 q10 -3 20 0"/></g>`;
    s += `<g class="waves late" stroke="#d3e4e9" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M180 228 q8 -2.5 16 0"/><path d="M420 216 q8 -2.5 16 0"/><path d="M620 219 q8 -2.5 16 0"/></g>`;
    // a small sailboat, far out, drifting slowly across (same drift animation as the clouds)
    s += `<g class="cloud" style="--start:-710px; --end:130px; --dur:480s; --delay:-405s"><path d="M690 218 l0 -13 l9 13 z" fill="#f4f1e8"/><path d="M683 219 h15 l-2 3 h-11 z" fill="#5a4030"/></g>`;
    s += `<rect x="0" y="234" width="800" height="5" fill="#d9caa3"/>`;
    s += `<rect x="0" y="238" width="800" height="30" fill="#b8cf93"/>`;
    s += `<g fill="#8fa86f" opacity="0.7"><ellipse cx="90" cy="246" rx="14" ry="3"/><ellipse cx="330" cy="243" rx="18" ry="3.2"/><ellipse cx="560" cy="247" rx="12" ry="2.6"/><ellipse cx="740" cy="244" rx="16" ry="3"/></g>`;
    s += `<path class="leaf-line" d="M0 255 Q60 215 120 250 T240 245 T360 255 T480 240 T600 255 T720 245 T800 255 L800 300 L0 300 Z" fill="#7f9a68"/>`;
    s += `<rect x="0" y="290" width="800" height="160" fill="#9dbb6f"/>`;
    s += `<path d="M0 340 C200 320 500 360 800 335 L800 450 L0 450 Z" fill="#a6c277"/>`;
    s += `<path d="M0 425 C200 408 600 408 800 425 L800 440 C600 424 200 424 0 440 Z" fill="#d5c7a2"/>`;
    s += `<g opacity="0.85">
      <g stroke="#8a7f92" stroke-width="5" fill="none" stroke-linecap="round">
        <path d="M555 300 L595 218 L635 300"/><path d="M705 300 L665 218 L625 300"/>
        <line x1="595" y1="218" x2="665" y2="218"/>
      </g>
      <polygon points="735,300 760,225 770,225 770,300" fill="#c98a6a"/>
      <path d="M770 228 C790 250 800 275 800 300" stroke="#e0d8c8" stroke-width="7" fill="none"/>
      <g stroke="#8a7f92" stroke-width="2"><line x1="742" y1="285" x2="768" y2="285"/><line x1="748" y1="265" x2="768" y2="265"/><line x1="754" y1="245" x2="768" y2="245"/></g>
    </g>`;
    s += `<rect x="70" y="250" width="22" height="150" fill="#7a5a3e"/>`;
    s += bareBranches(81, 250, 1);
    s += `<g class="leaf" fill="#6f9556"><circle cx="80" cy="200" r="70"/><circle cx="40" cy="235" r="48"/><circle cx="125" cy="220" r="55"/></g>`;
    s += `<g class="leaf alt" fill="#7fa563"><circle cx="70" cy="180" r="40"/><circle cx="115" cy="205" r="30"/></g>`;
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

  // The view behind every town street: a glimpse of the bay to a hazy horizon, a soft far
  // tree line, then a lighter mid-distance field with a few trees and a hedge, all of it
  // behind the buildings so it shows between them and over the lower roofs.
  function townDistance() {
    let s = `<rect x="0" y="262" width="800" height="24" fill="#9dbccb"/>`;
    s += `<rect x="0" y="261" width="800" height="3" fill="#c8dde3" opacity="0.8"/>`;
    s += `<g class="waves" stroke="#c3d9e0" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M60 272 q9 -2.5 18 0"/><path d="M230 278 q9 -2.5 18 0"/><path d="M420 270 q9 -2.5 18 0"/><path d="M600 276 q9 -2.5 18 0"/><path d="M740 268 q9 -2.5 18 0"/></g>`;
    s += `<g class="cloud" style="--start:-560px; --end:280px; --dur:520s; --delay:-330s"><path d="M540 278 l0 -11 l7.5 11 z" fill="#f4f1e8"/><path d="M534 279 h12.5 l-1.6 2.6 h-9.3 z" fill="#5a4030"/></g>`;
    // far shore: a soft blue-green tree line with a few taller crowns
    s += `<path d="M0 290 Q40 278 80 286 T160 284 T240 288 T320 282 T400 288 T480 283 T560 289 T640 284 T720 288 T800 285 L800 300 L0 300 Z" fill="#8fa88a"/>`;
    s += `<g fill="#7f9a80"><ellipse cx="120" cy="286" rx="16" ry="6"/><ellipse cx="350" cy="284" rx="20" ry="7"/><ellipse cx="610" cy="285" rx="18" ry="6.5"/></g>`;
    // mid-distance: a pale field down to the street, a hedge, a handful of trees
    s += `<rect x="0" y="297" width="800" height="73" fill="#b8cf93"/>`;
    s += `<path d="M0 318 C200 310 500 326 800 314 L800 370 L0 370 Z" fill="#a6c277"/>`;
    s += `<g fill="#7f9a68"><ellipse cx="90" cy="332" rx="30" ry="9"/><ellipse cx="300" cy="336" rx="42" ry="10"/><ellipse cx="520" cy="330" rx="34" ry="9"/><ellipse cx="730" cy="335" rx="38" ry="10"/></g>`;
    s += `<g fill="#6f9556"><circle cx="150" cy="318" r="14"/><circle cx="410" cy="314" r="16"/><circle cx="640" cy="320" r="13"/></g>`;
    s += `<g fill="#7a5a3e"><rect x="148" y="326" width="4" height="12"/><rect x="408" y="324" width="4" height="14"/><rect x="638" y="328" width="4" height="10"/></g>`;
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
    s += townDistance();
    s += pavementAndRoad();
    s += chowderHouse() + church() + taffyShop();
    s += `<rect x="465" y="150" width="7" height="250" fill="#3a3f44"/><rect x="458" y="392" width="21" height="8" fill="#3a3f44"/>`;
    s += `<rect x="454" y="118" width="29" height="34" fill="#3a3f44"/><rect x="459" y="123" width="19" height="24" fill="#f2e6b8"/><polygon points="450,118 468,104 487,118" fill="#3a3f44"/>`;
    return s;
  }

  // A block down the same street: the taffy shop is now on the left, then a
  // house lot with a fence, hydrangeas and a tree. The garage building sits here.
  function street2() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(300, 70, 50) + cloud(650, 100, 55);
    s += townDistance();
    s += pavementAndRoad();
    s += `<g transform="translate(-560 0)">${taffyShop()}</g>`;
    // tree behind the fence, right
    s += `<rect x="712" y="240" width="18" height="135" fill="#7a5a3e"/>`;
    s += bareBranches(721, 240, 0.85);
    s += `<g class="leaf" fill="#6f9556"><circle cx="720" cy="200" r="58"/><circle cx="685" cy="230" r="38"/><circle cx="758" cy="222" r="42"/></g>`;
    s += `<g class="leaf alt" fill="#7fa563"><circle cx="712" cy="185" r="32"/><circle cx="750" cy="205" r="22"/></g>`;
    // lawn behind the fence
    s += `<rect x="600" y="345" width="200" height="30" fill="#9dbb6f"/>`;
    s += picketFence(600, 800, 375);
    s += hydrangeas(612, 366) + hydrangeas(760, 366);
    // the garage's mailbox by the curb: a wooden post, a loaf-shaped box seen from the
    // side, its door towards us, and the red flag up
    s += `<rect x="249" y="372" width="4" height="28" fill="#7a5a3e"/><rect x="245" y="370" width="12" height="2" fill="#5a4030"/>`;
    s += `<path d="M241 372 V366 a6 6 0 0 1 6 -6 h8 a6 6 0 0 1 6 6 v6 z" fill="#3f5f5b" stroke="#2b3f3c" stroke-width="0.8"/>`;
    s += `<path d="M241 372 V366 a6 6 0 0 1 6 -6 v12 z" fill="#5b7a76"/><circle cx="244.5" cy="367" r="0.8" fill="#e8e1cf"/>`;
    s += `<line x1="255" y1="362" x2="255" y2="371" stroke="#2b3f3c" stroke-width="0.6" opacity="0.6"/>`;
    s += `<rect x="259" y="355" width="1.4" height="8" fill="#b6413a"/><rect x="257" y="354" width="4.5" height="2.6" rx="0.6" fill="#b6413a"/>`;
    return s;
  }

  // A boat dock: water, planks, a bait and tackle shop to the left, a little sailboat
  // moored to the right. The library box stands on the dock.
  function dock() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(180, 70, 55) + cloud(560, 100, 50);
    // far shore and water
    s += `<rect x="0" y="230" width="800" height="12" fill="#8fa68a"/><g fill="#f4f1e8"><rect x="300" y="218" width="12" height="12"/><rect x="340" y="222" width="8" height="8"/></g><polygon points="298,218 306,208 314,218" fill="#5a5f66"/>`;
    s += `<rect x="0" y="242" width="800" height="208" fill="#6f8fa0"/>`;
    s += `<g class="waves" stroke="#9fb8c4" stroke-width="2" fill="none" stroke-linecap="round"><path d="M240 270 q15 -4 30 0"/><path d="M420 300 q15 -4 30 0"/><path d="M300 340 q15 -4 30 0"/><path d="M500 262 q15 -4 30 0"/><path d="M760 330 q15 -4 30 0"/></g>`;
    s += `<g class="waves late" stroke="#b3c9d3" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M120 300 q12 -3 24 0"/><path d="M380 322 q12 -3 24 0"/><path d="M470 352 q12 -3 24 0"/></g>`;
    // the sailboat, moored to the right
    s += `<rect x="656" y="60" width="6" height="272" fill="#7a5a3e"/>`;
    s += `<polygon points="662,64 662,76 686,70" fill="#b6413a"/>`;
    s += `<path d="M659 96 q22 90 6 210 z" fill="#e9e2cf" stroke="#c9b28a" stroke-width="1"/>`;
    s += `<g stroke="#c9b28a" stroke-width="1.2" opacity="0.8"><line x1="659" y1="64" x2="590" y2="330"/><line x1="659" y1="64" x2="740" y2="326"/></g>`;
    s += `<rect x="612" y="298" width="96" height="6" fill="#5a4030"/>`;
    s += `<path d="M566 332 Q580 372 630 374 L740 374 Q766 350 776 326 L730 330 Z" fill="#f4f1e8" stroke="#8a8f94" stroke-width="1.5"/>`;
    s += `<path d="M578 344 L766 340" stroke="#2b3f5c" stroke-width="5"/>`;
    s += `<text x="700" y="362" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#2b3f5c" letter-spacing="1">DOG-EAR</text>`;
    s += `<path d="M566 332 q-30 10 -40 40" stroke="#c9b28a" stroke-width="2" fill="none"/>`;
    // the dock: planks with pilings and a rope rail
    s += `<rect x="0" y="372" width="800" height="78" fill="#b39a6f"/>`;
    s += `<g stroke="#9c845c" stroke-width="2">${[388, 406, 424, 442].map(y => `<line x1="0" y1="${y}" x2="800" y2="${y}"/>`).join('')}</g>`;
    s += `<g fill="#7d6b58"><rect x="520" y="330" width="14" height="46"/><rect x="760" y="336" width="14" height="40"/><rect x="230" y="340" width="12" height="36"/></g>`;
    s += `<path d="M534 344 Q650 372 760 350" stroke="#c9b28a" stroke-width="2" fill="none"/>`;
    // bait and tackle shop, left, on the dock
    s += `<rect x="20" y="256" width="190" height="116" fill="#a8a08f" stroke="#6b665c" stroke-width="1.5"/>`;
    s += hLines(20, 210, 266, 368, 7, 0.08);
    s += `<polygon points="10,260 115,200 220,260" fill="#5a5f66" stroke="#4a4946" stroke-width="1.5"/>`;
    s += `<rect x="170" y="212" width="12" height="30" fill="#a86b5f"/>`;
    s += `<rect x="42" y="282" width="126" height="20" fill="#f3eee2" stroke="#6b665c" stroke-width="1.5"/>`;
    s += `<text x="105" y="297" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#2b3f5c" letter-spacing="1">BAIT &amp; TACKLE</text>`;
    s += `<rect x="40" y="312" width="52" height="40" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="3"/><line x1="66" y1="312" x2="66" y2="352" stroke="#f4f1e8" stroke-width="2"/>`;
    s += `<rect x="130" y="308" width="40" height="64" fill="#2b3f5c"/><rect x="138" y="316" width="24" height="22" fill="#dfe8ea"/>`;
    // a hanging buoy and a coil of rope
    s += `<line x1="112" y1="312" x2="112" y2="332" stroke="#3a3f44" stroke-width="1.5"/><ellipse cx="112" cy="344" rx="8" ry="12" fill="#e59a5c"/><rect x="104" y="340" width="16" height="6" fill="#f4f1e8"/>`;
    s += `<circle cx="300" cy="392" r="9" fill="none" stroke="#c9b28a" stroke-width="4"/>`;
    s += `<rect x="30" y="382" width="30" height="16" fill="#8b6f4e" stroke="#5a4a42"/><g stroke="#5a4a42" stroke-width="1"><line x1="30" y1="390" x2="60" y2="390"/><line x1="40" y1="382" x2="40" y2="398"/><line x1="50" y1="382" x2="50" y2="398"/></g>`;
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

  // A neighboring Dutch colonial: clapboard body, gambrel roof, shuttered windows.
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
  // A neighboring Cape: shingled body, steep roof with one dormer, chimney.
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
  // A neighboring Tudor shop: brick below, half-timbered above, steep gable.
  function tudorNeighbor(x, w, brick) {
    let out = `<rect x="${x}" y="300" width="${w}" height="70" fill="${brick}" stroke="#5b3d33" stroke-width="1"/>`;
    out += hLines(x, x + w, 306, 366, 6, 0.1);
    out += halfTimber(x, 248, w, 52);
    out += `<polygon points="${x - 10},250 ${x + w / 2},176 ${x + w + 10},250" fill="#5b4a40" stroke="#3d2a22" stroke-width="1.5"/>`;
    out += leadedWindow(x + w * 0.3, 258, w * 0.4, 32, '#3d2a22');
    out += leadedWindow(x + w * 0.1, 310, w * 0.34, 40, '#3d2a22') + leadedWindow(x + w * 0.56, 310, w * 0.34, 40, '#3d2a22');
    // An arched front door between the windows.
    const dw = w * 0.12, dx = x + w * 0.5 - dw / 2;
    out += `<path d="M${dx} 370 V${336 + dw / 2} A${dw / 2} ${dw / 2} 0 0 1 ${dx + dw} ${336 + dw / 2} V370 Z" fill="#3d2a22"/>`;
    return out;
  }

  function street3dutch() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(150, 70, 55) + cloud(660, 90, 60);
    s += townDistance();
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
    s += townDistance();
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
    s += townDistance();
    s += pavementAndRoad();
    s += tudorNeighbor(-30, 230, '#8f5b4a');
    s += tudorNeighbor(600, 240, '#7d4f42');
    s += streetLamp(598);
    s += boxwood(212, 392, 9) + boxwood(588, 392, 9);
    return s;
  }

  // ---- Stage four places ----

  // A churchyard stone, its bottom center at (x, y), h tall, leaning a few degrees.
  // kind: 'round' (the classic curved top), 'shoulder' (a tablet with scalloped
  // shoulders), 'cross', 'celtic' (a cross with a ring) or 'obelisk'.
  function headstone(kind, x, y, h, lean) {
    const w = h * 0.62;
    let shape;
    if (kind === 'round') shape = `<path d="M${-w / 2} 0 V${-h + w / 2} A${w / 2} ${w / 2} 0 0 1 ${w / 2} ${-h + w / 2} V0 Z"/>`;
    else if (kind === 'shoulder') shape = `<path d="M${-w / 2} 0 V${-h * 0.8} Q${-w / 2} ${-h * 0.92} ${-w * 0.28} ${-h * 0.88} Q0 ${-h * 1.1} ${w * 0.28} ${-h * 0.88} Q${w / 2} ${-h * 0.92} ${w / 2} ${-h * 0.8} V0 Z"/>`;
    else if (kind === 'obelisk') shape = `<path d="M${-w * 0.3} -4 L${-w * 0.2} ${-h * 0.88} L0 ${-h} L${w * 0.2} ${-h * 0.88} L${w * 0.3} -4 Z"/><rect x="${-w / 2}" y="-5" width="${w}" height="5"/>`;
    else {   // cross or celtic
      const arm = w * 0.8;
      shape = `<path d="M-2.6 -3 V${-h * 0.62} H${-arm / 2} V${-h * 0.76} H-2.6 V${-h} H2.6 V${-h * 0.76} H${arm / 2} V${-h * 0.62} H2.6 V-3 Z"/><rect x="-6" y="-3" width="12" height="3"/>`;
      if (kind === 'celtic') shape += `<circle cx="0" cy="${-h * 0.69}" r="${arm * 0.3}" fill="none" stroke="#9a968c" stroke-width="2"/>`;
    }
    const lines = kind === 'round' || kind === 'shoulder'
      ? `<g stroke="#7d7a72" stroke-width="0.8" opacity="0.7"><line x1="${-w * 0.25}" y1="${-h * 0.62}" x2="${w * 0.25}" y2="${-h * 0.62}"/><line x1="${-w * 0.18}" y1="${-h * 0.5}" x2="${w * 0.18}" y2="${-h * 0.5}"/></g>` : '';
    return `<g transform="translate(${x} ${y}) rotate(${lean})"><g fill="#a8a49a" stroke="#7d7a72" stroke-width="0.8">${shape}</g>${lines}<ellipse cx="${-w * 0.2}" cy="-1" rx="${w * 0.3}" ry="2" fill="#6f8f5a" opacity="0.7"/></g>`;
  }
  // A little family mausoleum: a stone temple with two columns, a pediment and an iron
  // gate, ivy climbing one corner. (x, y) is the middle of its bottom step.
  function mausoleum(x, y) {
    let s = `<rect x="${x - 34}" y="${y - 6}" width="68" height="6" fill="#a8a49a" stroke="#7d7a72" stroke-width="0.8"/><rect x="${x - 30}" y="${y - 10}" width="60" height="4" fill="#b8b3a7" stroke="#7d7a72" stroke-width="0.8"/>`;
    s += `<rect x="${x - 27}" y="${y - 42}" width="54" height="32" fill="#b8b3a7" stroke="#7d7a72" stroke-width="0.8"/>`;
    s += `<g fill="#cfcabe" stroke="#9a968c" stroke-width="0.6"><rect x="${x - 25}" y="${y - 40}" width="7" height="30"/><rect x="${x + 18}" y="${y - 40}" width="7" height="30"/></g>`;
    s += `<path d="M${x - 10} ${y - 10} v-18 a10 10 0 0 1 20 0 v18 z" fill="#3a3f44"/><g stroke="#8a8f94" stroke-width="1">${[-6, -2, 2, 6].map(d => `<line x1="${x + d}" y1="${y - 36}" x2="${x + d}" y2="${y - 10}"/>`).join('')}</g>`;
    s += `<rect x="${x - 31}" y="${y - 48}" width="62" height="6" fill="#a8a49a" stroke="#7d7a72" stroke-width="0.8"/>`;
    s += `<polygon points="${x - 33},${y - 48} ${x},${y - 66} ${x + 33},${y - 48}" fill="#a8a49a" stroke="#7d7a72" stroke-width="0.8"/><circle cx="${x}" cy="${y - 55}" r="3" fill="none" stroke="#7d7a72" stroke-width="0.8"/>`;
    s += `<g fill="#6f8f5a">${[[-30, -8, 5], [-27, -16, 4.5], [-31, -24, 4], [-26, -31, 3.5], [-22, -12, 3.5]].map(([dx, dy, r]) => `<circle cx="${x + dx}" cy="${y + dy}" r="${r}"/>`).join('')}</g>`;
    return s;
  }

  // The town green: old trees, a small churchyard behind the fence, and a path along the
  // fence where people walk. The church stands here.
  function green() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(140, 70, 55) + cloud(660, 95, 60);
    s += `<path class="leaf-line" d="M0 262 Q80 232 160 258 T320 252 T480 262 T640 250 T800 262 L800 300 L0 300 Z" fill="#7f9a68"/>`;
    s += `<rect x="0" y="292" width="800" height="160" fill="#9dbb6f"/>`;
    [[70, 200], [730, 205]].forEach(([cx, cy]) => {
      s += `<rect x="${cx - 12}" y="${cy + 40}" width="24" height="160" fill="#7a5a3e"/>`;
      s += bareBranches(cx, cy + 40, 1.05);
      s += `<g class="leaf" fill="#6f9556"><circle cx="${cx}" cy="${cy}" r="72"/><circle cx="${cx - 45}" cy="${cy + 40}" r="46"/><circle cx="${cx + 48}" cy="${cy + 30}" r="52"/></g>`;
      s += `<g class="leaf alt" fill="#7fa563"><circle cx="${cx - 10}" cy="${cy - 22}" r="40"/><circle cx="${cx + 36}" cy="${cy}" r="28"/></g>`;
    });
    // the churchyard: a mausoleum at the back and stones of all sorts, older ones leaning
    s += mausoleum(160, 358);
    s += headstone('round', 102, 376, 22, -5) + headstone('obelisk', 206, 370, 34, 0) + headstone('shoulder', 232, 378, 20, 3);
    s += headstone('celtic', 584, 374, 30, 2) + headstone('round', 622, 378, 18, -7) + headstone('cross', 656, 372, 28, 0) + headstone('shoulder', 694, 377, 21, 4);
    // the path runs along the fence, where people walk
    s += `<path d="M0 397 Q200 393 400 397 T800 397 L800 419 Q600 423 400 419 T0 419 Z" fill="#d5c7a2"/>`;
    s += picketFence(0, 330, 400) + picketFence(470, 800, 400);
    s += hydrangeas(20, 380) + hydrangeas(740, 380);
    return s;
  }

  // A cliff over the sea at sunset. The lighthouse stands here.
  function cliff() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += `<g fill="#e8b4a0" opacity="0.55"><ellipse cx="180" cy="120" rx="120" ry="14"/><ellipse cx="560" cy="80" rx="150" ry="12"/><ellipse cx="660" cy="150" rx="110" ry="10"/></g>`;
    s += `<rect x="0" y="236" width="800" height="214" fill="#5f6f95"/>`;
    s += `<g class="waves" stroke="#c9a9b4" stroke-width="2" opacity="0.7"><line x1="600" y1="262" x2="760" y2="262"/><line x1="640" y1="280" x2="780" y2="280"/><line x1="660" y1="300" x2="800" y2="300"/><line x1="680" y1="330" x2="800" y2="330"/></g>`;
    s += `<path d="M120 246 l10 -18 l3 18 z" fill="#f4f1e8" opacity="0.9"/><rect x="117" y="246" width="18" height="3" fill="#3a3f44"/>`;
    s += `<polygon points="0,338 660,338 690,450 0,450" fill="#7f9a68"/>`;
    s += `<polygon points="0,330 660,330 664,342 0,342" fill="#95ad74"/>`;
    s += `<polygon points="660,338 800,450 690,450" fill="#6b5a50"/><polygon points="668,352 760,450 700,450" fill="#5a4a42"/>`;
    [90, 150, 230, 610, 640].forEach((x, i) => { s += grassTuft(x, 336 + (i % 2) * 4); });
    s += picketFence(40, 250, 400);
    return s;
  }

  // A harbor with a plank dock. The ship is moored here.
  function harbor() {
    let s = `<rect width="800" height="450" fill="url(#sky)"/>`;
    s += cloud(120, 90, 50) + cloud(600, 60, 60);
    s += `<rect x="0" y="228" width="800" height="14" fill="#8fa68a"/><g fill="#f4f1e8"><rect x="90" y="214" width="14" height="14"/><rect x="150" y="218" width="10" height="10"/></g><polygon points="88,214 97,204 106,214" fill="#5a5f66"/>`;
    s += `<rect x="0" y="240" width="800" height="210" fill="#6f8fa0"/>`;
    s += `<g class="waves" stroke="#9fb8c4" stroke-width="2" fill="none" stroke-linecap="round"><path d="M40 262 q15 -4 30 0"/><path d="M700 258 q15 -4 30 0"/><path d="M740 300 q15 -4 30 0"/><path d="M60 330 q15 -4 30 0"/><path d="M720 350 q15 -4 30 0"/></g>`;
    s += `<g class="waves late" stroke="#b3c9d3" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M110 290 q12 -3 24 0"/><path d="M660 320 q12 -3 24 0"/><path d="M40 356 q12 -3 24 0"/></g>`;
    s += `<rect x="0" y="372" width="800" height="78" fill="#b39a6f"/>`;
    s += `<g stroke="#9c845c" stroke-width="2">${[388, 406, 424, 442].map(y => `<line x1="0" y1="${y}" x2="800" y2="${y}"/>`).join('')}</g>`;
    s += `<g fill="#7d6b58"><rect x="30" y="336" width="14" height="40"/><rect x="756" y="336" width="14" height="40"/><rect x="120" y="344" width="12" height="32"/></g>`;
    s += `<path d="M44 350 Q90 372 126 356" stroke="#c9b28a" stroke-width="2" fill="none"/>`;
    s += `<rect x="690" y="382" width="34" height="18" fill="#8b6f4e" stroke="#5a4a42"/><g stroke="#5a4a42" stroke-width="1"><line x1="690" y1="391" x2="724" y2="391"/><line x1="701" y1="382" x2="701" y2="400"/><line x1="712" y1="382" x2="712" y2="400"/></g>`;
    s += `<circle cx="70" cy="392" r="9" fill="none" stroke="#c9b28a" stroke-width="4"/>`;
    return s;
  }

  const BACKDROPS = { beach, park, street, dock, street2, street3dutch, street3cape, street3tudor, green, cliff, harbor };
  // Scenes with open water: where the sea surface sits (a dolphin's lower half hides below
  // it), the stretches of x where the water is in clear view, and an optional size factor
  // for water that is far away.
  const SEA = {
    beach: { surface: 268, spans: [[60, 740]] },
    dock: { surface: 300, spans: [[60, 520]] },
    harbor: { surface: 300, spans: [[40, 200], [620, 760]] },
    cliff: { surface: 290, spans: [[560, 790]] },
    park: { surface: 214, spans: [[190, 290], [720, 790]], scale: 0.42 }   // the far bay: tiny
  };
  const seaFor = (locationId) => SEA[locationId] || null;
  // The horizon line the sun rises from and sets behind, per scene: the far water in the
  // park and by the sea, the distant bay behind the town streets, the tree line elsewhere.
  const HORIZON = { beach: 235, park: 200, dock: 230, harbor: 228, cliff: 236, street: 262, street2: 262, street3dutch: 262, street3cape: 262, street3tudor: 262, green: 300 };
  const horizonFor = (locationId) => HORIZON[locationId] || 250;
  // Background people. doors: the neighbors' front doors (x, the ground they stand on, and
  // the door's height, which sets how big a visitor is drawn so they fit through it).
  // sand: the strip of far beach where distant strollers walk. park: swing pivots and the
  // picnic spot.
  const EXTRAS = {
    street: { doors: [{ x: 173, y: 370, h: 74 }, { x: 643, y: 370, h: 60 }] },
    street2: { doors: [{ x: 83, y: 370, h: 60 }] },
    street3dutch: { doors: [{ x: 75, y: 370, h: 40 }, { x: 730, y: 370, h: 40 }] },
    street3cape: { doors: [{ x: 80, y: 370, h: 44 }, { x: 725, y: 370, h: 44 }] },
    street3tudor: { doors: [{ x: 85, y: 370, h: 44 }, { x: 720, y: 370, h: 44 }] },
    dock: { doors: [{ x: 150, y: 372, h: 64 }] },
    beach: { sand: { yMin: 318, yMax: 336 } },
    park: { swings: [{ x: 612, pivotY: 218, seatY: 272 }, { x: 648, pivotY: 218, seatY: 272 }], swingGround: 300, picnic: { x: 190, y: 352 } }
  };
  const extrasFor = (locationId) => EXTRAS[locationId] || null;
  const SKIES = {
    beach: ['#b9d3dc', '#eef0e6'],
    park: ['#c9dde4', '#eef3ea'],
    street: ['#cddfe6', '#f1efe4'],
    dock: ['#c6d8e0', '#eef0e6'],
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
  const INTERIOR_STOPS = { left: 220, right: 480 };
  const INTERIOR_PERSON_SCALE = 2.0;    // about as tall as the counter is wide
  // Where decor can stand inside, left to right: four spots across the open floor between
  // the left wall's props and the counter. The same in every interior.
  const INTERIOR_DECOR_SLOTS = [147, 263, 379, 495];

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
    stops: { left: 212, right: 588 },
    personScale: 3.2,                     // a real person next to a real Little Free Library
    deliveryX: 660,                       // where the van sets boxes down
    decorSlots: [96, 282, 518, 704],       // far left, left, right, far right legacySignX: 308, legacyPlantX: 492,
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
        <g fill="#2f2f2f"><rect x="352" y="250" width="4" height="6"/><rect x="352" y="304" width="4" height="6"/></g>`;
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
    paint: '#aaa99d',
    shelves: [278, 306, 334, 362, 390].map(bottom => ({ bottom, firstX: 332, step: 6.9, width: 5.4, count: 20, minH: 18, varH: 7 })),
    sign: { size: 10, small: 8 },
    stops: { left: 240, right: 560 },
    personScale: 2.3,
    deliveryX: 620,
    decorSlots: [132, 265, 535, 668], legacySignX: 520, legacyPlantX: 282,
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="400" cy="${GROUND_Y}" rx="125" ry="6" fill="#000" opacity="0.1"/>`;
      s += `<rect x="300" y="226" width="200" height="174" fill="${color}" stroke="#4f5a48" stroke-width="1.5"/>`;
      s += vLines(310, 496, 228, 398, 11, 0.09);
      s += `<g fill="#fff" opacity="0.14"><rect x="306" y="232" width="3" height="120"/><rect x="490" y="240" width="2" height="140"/></g>`;
      s += `<g fill="#000" opacity="0.07"><rect x="300" y="380" width="200" height="20"/><rect x="470" y="230" width="8" height="170"/></g>`;
      // interior and shelf boards
      s += `<rect x="330" y="250" width="140" height="140" fill="#4a3f36"/>`;
      this.shelves.forEach(sh => { s += `<rect x="330" y="${sh.bottom}" width="140" height="2.5" fill="#8a7460"/>`; });
      // roof with shingle rows
      s += `<polygon points="288,230 400,166 512,230" fill="#3f3a36" stroke="#2b2a28" stroke-width="1.5"/>`;
      s += `<g stroke="#6a6a66" stroke-width="1" opacity="0.5"><line x1="316" y1="214" x2="484" y2="214"/><line x1="340" y1="200" x2="460" y2="200"/><line x1="364" y1="186" x2="436" y2="186"/></g>`;
      // gable window with board shutters and a flower box
      s += `<rect x="388" y="194" width="24" height="22" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="2"/><line x1="400" y1="194" x2="400" y2="216" stroke="#f4f1e8"/><line x1="388" y1="205" x2="412" y2="205" stroke="#f4f1e8"/>`;
      s += `<g fill="#e9e6dc" stroke="#8a8a80" stroke-width="0.8"><rect x="378" y="194" width="8" height="22"/><rect x="414" y="194" width="8" height="22"/></g><g stroke="#8a8a80" stroke-width="1"><line x1="378" y1="194" x2="386" y2="216"/><line x1="414" y1="216" x2="422" y2="194"/></g>`;
      s += `<rect x="384" y="216" width="32" height="6" fill="#e9e6dc" stroke="#8a8a80" stroke-width="0.8"/>` + flower(390, 214, '#d98c9c') + flower(400, 213, '#b6413a') + flower(410, 214, '#ffffff');
      // pots and a rake outside
      s += `<path d="M268 400 l4 -22 h18 l4 22 z" fill="#b8734f"/><g fill="#6f9556"><circle cx="275" cy="372" r="7"/><circle cx="285" cy="370" r="8"/><circle cx="280" cy="364" r="6"/></g>`;
      s += `<line x1="520" y1="400" x2="508" y2="290" stroke="#8b6f4e" stroke-width="3"/><path d="M500 292 h16 l2 -10 h-20 z" fill="#6a6a66"/>`;
      return s;
    },
    front() {
      // open doors either side of the opening, then the sign over the doors
      let s = `<g fill="#bdbcb0" stroke="#6a6a60" stroke-width="1.5"><rect x="300" y="250" width="28" height="140"/><rect x="472" y="250" width="28" height="140"/></g>`;
      s += vLines(306, 326, 252, 388, 7, 0.1) + vLines(478, 498, 252, 388, 7, 0.1);
      s += `<g stroke="#6a6a60" stroke-width="1.5" opacity="0.7"><line x1="302" y1="252" x2="326" y2="388"/><line x1="498" y1="252" x2="474" y2="388"/></g>`;
      s += `<g fill="#2f2f2f"><rect x="322" y="316" width="3" height="10"/><rect x="475" y="316" width="3" height="10"/></g>`;
      s += `<rect x="330" y="250" width="140" height="140" fill="none" stroke="#3e352e" stroke-width="2"/>`;
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
    paint: '#7f9a78',
    shelves: [300, 330, 360, 390].map(bottom => ({ bottom, firstX: 312, step: 7.9, width: 6.2, count: 25, minH: 20, varH: 8 })),
    sign: { size: 11, small: 8.5 },
    stops: { left: 232, right: 588 },
    personScale: 1.7,
    deliveryX: 640,
    decorSlots: [163, 262, 560, 659], legacySignX: 560, legacyPlantX: 262,
    backdropOpts: { boardwalkX: 590, signX: 150 },
    draw(color) {
      let s = `<ellipse cx="410" cy="${GROUND_Y}" rx="150" ry="6" fill="#000" opacity="0.1"/>`;
      s += `<rect x="280" y="250" width="260" height="150" fill="${color}" stroke="#3f4f4f" stroke-width="1.5"/>`;
      s += vLines(290, 530, 252, 398, 10, 0.1);
      s += `<g fill="#5a7055"><rect x="280" y="250" width="9" height="150"/><rect x="531" y="250" width="9" height="150"/></g>`;
      // the cut-out side panel, propped up as an awning over the opening
      s += `<polygon points="304,270 516,270 542,232 278,232" fill="${color}" stroke="#3f4f3f" stroke-width="1.5"/>`;
      s += `<polygon points="304,270 516,270 542,232 278,232" fill="#000" opacity="0.12"/>`;
      s += `<g stroke="#000" stroke-width="1" opacity="0.12">${[290, 320, 350, 380, 410, 440, 470, 500].map(x => `<line x1="${x + 12}" y1="270" x2="${x + 2}" y2="232"/>`).join('')}</g>`;
      s += `<g stroke="#2f3a3a" stroke-width="3"><line x1="316" y1="270" x2="330" y2="300"/><line x1="504" y1="270" x2="490" y2="300"/></g>`;
      // rust
      s += `<g fill="#a55e3a" opacity="0.55"><ellipse cx="300" cy="382" rx="24" ry="11"/><ellipse cx="522" cy="268" rx="16" ry="9"/><ellipse cx="292" cy="262" rx="10" ry="7"/><path d="M516 300 q6 20 2 40 q-3 20 4 58 h-8 q-4 -40 -1 -58 q3 -20 -3 -40 z"/></g>`;
      s += `<g fill="#7a3f22" opacity="0.35"><ellipse cx="296" cy="386" rx="12" ry="5"/><ellipse cx="526" cy="266" rx="7" ry="4"/></g>`;
      // interior and shelves
      s += `<rect x="310" y="270" width="200" height="120" fill="#3d3a36"/>`;
      this.shelves.forEach(sh => { s += `<rect x="310" y="${sh.bottom}" width="200" height="2.5" fill="#8a7460"/>`; });
      // end-door locking bars, right end
      s += `<g stroke="#2f3a3a" stroke-width="3"><line x1="533" y1="258" x2="533" y2="392"/><line x1="538" y1="258" x2="538" y2="392"/></g>`;
      return s;
    },
    front() {
      let s = `<rect x="310" y="270" width="200" height="120" fill="none" stroke="#2f3a3a" stroke-width="2.5"/>`;
      s += `<rect x="306" y="392" width="208" height="5" fill="#4f6262"/>`;
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
    stops: { left: 400, right: 636 },
    personScale: 1.25,
    deliveryX: 690,
    decorSlots: [355, 428, 604, 677], legacySignX: 604, legacyPlantX: 428,
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
      return `<rect x="440" y="290" width="140" height="106" fill="none" stroke="#3e352e" stroke-width="2"/>`;
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
    blurb: 'Gambrel roof, white clapboard, a blue door, and a balcony nobody uses. A Cape classic.',
    location: 'street3dutch',
    capacity: 250,
    interior: { shelves: SHOP_INTERIOR_SHELVES, stops: INTERIOR_STOPS, personScale: INTERIOR_PERSON_SCALE, decorSlots: INTERIOR_DECOR_SLOTS },
    door: { x: 400, y: 350 },
    paint: '#f4f1e8',
    shelves: houseShelves(),
    sign: { size: 11, small: 9 },
    stops: { left: 205, right: 595 },
    personScale: 1.0,
    deliveryX: 640,
    decorSlots: [194, 252, 310, 490, 548, 606], legacySignX: 582, legacyPlantX: 216,   // three a side from stage three
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
      return shopFrontGlass('#f4f1e8');
    }
  };

  BUILDINGS['cape-cod'] = {
    id: 'cape-cod',
    stage: 3,
    name: 'Cape Cod cottage',
    blurb: 'Named for the place. Steep roof, three dormers, green shutters, two chimneys, one cat.',
    location: 'street3cape',
    capacity: 250,
    interior: { shelves: SHOP_INTERIOR_SHELVES, stops: INTERIOR_STOPS, personScale: INTERIOR_PERSON_SCALE, decorSlots: INTERIOR_DECOR_SLOTS },
    door: { x: 400, y: 350 },
    paint: '#f6f3ea',
    shelves: houseShelves(),
    sign: { size: 11, small: 9 },
    stops: { left: 205, right: 595 },
    personScale: 1.0,
    deliveryX: 640,
    decorSlots: [194, 252, 310, 490, 548, 606], legacySignX: 582, legacyPlantX: 216,   // three a side from stage three
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
      return shopFrontGlass('#f4f1e8');
    }
  };

  BUILDINGS.tudor = {
    id: 'tudor',
    stage: 3,
    name: 'Tudor revival',
    blurb: 'Brick below, timber and plaster above, an arched door that creaks on purpose.',
    location: 'street3tudor',
    capacity: 250,
    interior: { shelves: SHOP_INTERIOR_SHELVES, stops: INTERIOR_STOPS, personScale: INTERIOR_PERSON_SCALE, decorSlots: INTERIOR_DECOR_SLOTS },
    door: { x: 400, y: 350 },
    paint: '#8f5b4a',
    shelves: houseShelves(),
    sign: { size: 11, small: 9 },
    stops: { left: 205, right: 595 },
    personScale: 1.0,
    deliveryX: 640,
    decorSlots: [194, 252, 310, 490, 548, 606], legacySignX: 582, legacyPlantX: 216,   // three a side from stage three
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
      return s;
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
  // wallColor, if given, is the player's own paint on the walls.
  function interior(style, shelves, wallColor) {
    const top = shelves[0].bottom - shelves[0].minH - shelves[0].varH - 6;
    let s = `<rect width="800" height="450" fill="${wallColor || style.wall}"/>`;
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
  // Things in front of the books: the counter (or the style's own desk) with the name
  // plate, the lamp, and anything the style puts in the very front of the picture.
  function interiorFront(style, signSize) {
    let s = style.desk ? style.desk() : counter(style.counterWood, style.counterTop);
    s += signBoard(575, 356, 120, 16, signSize);
    if (style.lamp) s += style.lamp();
    if (style.front) s += style.front();
    return s;
  }

  // The church's old altar, now the shop desk: a carved oak table on a stone step, dressed
  // in white linen with a gold-fringed red cloth hanging at each end, brass candlesticks,
  // the till, and an open ledger on the little stand where the big Bible used to sit.
  // Same footprint as the counter, so the name plate sits across its front.
  function altarDesk() {
    let s = `<rect x="544" y="394" width="182" height="8" fill="#a39a8a" stroke="#7d766c" stroke-width="1"/>`;
    s += `<rect x="560" y="338" width="150" height="56" fill="#5b4332" stroke="#3d2a22" stroke-width="1"/>`;
    s += `<g fill="#4a3526" stroke="#3d2a22" stroke-width="0.8">${[580, 604, 628, 652, 676].map(x => `<path d="M${x} 392 v-10 q7 -11 14 0 v10 z"/>`).join('')}</g>`;
    s += `<rect x="552" y="330" width="166" height="9" rx="1" fill="#f4efe4" stroke="#c9c3b6" stroke-width="1"/>`;
    [558, 696].forEach(x => {
      s += `<rect x="${x - 2}" y="338" width="20" height="38" fill="#f4efe4" stroke="#c9c3b6" stroke-width="0.8"/>`;
      s += `<path d="M${x} 338 h16 v30 l-8 5 l-8 -5 z" fill="#a5443a"/>`;
      s += `<path d="M${x} 368 l8 5 l8 -5" stroke="#d9a441" stroke-width="1.6" fill="none"/>`;
      s += `<g stroke="#d9a441" stroke-width="1.3"><line x1="${x + 8}" y1="344" x2="${x + 8}" y2="358"/><line x1="${x + 4}" y1="348" x2="${x + 12}" y2="348"/></g>`;
    });
    [568, 702].forEach(x => {
      s += `<ellipse cx="${x}" cy="329" rx="6" ry="2" fill="#b08a3a"/><rect x="${x - 1.5}" y="314" width="3" height="15" fill="#c9a24a"/><ellipse cx="${x}" cy="314" rx="4" ry="1.5" fill="#b08a3a"/>`;
      s += `<rect x="${x - 2.5}" y="296" width="5" height="18" fill="#f4efe4"/><ellipse cx="${x}" cy="292" rx="2.5" ry="4" fill="#f2c46a"/>`;
    });
    s += `<rect x="596" y="312" width="32" height="18" rx="2" fill="#8a6a2a"/><rect x="600" y="304" width="24" height="9" rx="2" fill="#d9a441"/><rect x="603" y="316" width="18" height="4" fill="#5a4220"/>`;
    s += `<rect x="662" y="318" width="4" height="12" fill="#6b4a36"/><path d="M648 318 l16 -6 l16 6 v3 l-16 -5 l-16 5 z" fill="#f4efe4" stroke="#8a8070" stroke-width="0.7"/><line x1="664" y1="312" x2="664" y2="316" stroke="#a5443a" stroke-width="1.2"/>`;
    return s;
  }
  // Pew backs across the very front of the picture, as if we were sitting a few rows back:
  // two banks with the aisle between them, cut off by the bottom edge. They sit below
  // where people's feet touch the floor, so nobody walks behind them.
  function pews() {
    return [[-10, 338], [462, 810]].map(([x1, x2]) => {
      let p = `<rect x="${x1}" y="421" width="${x2 - x1}" height="30" fill="#6b4a36"/>`;
      p += `<g stroke="#4a3024" stroke-width="1.2" opacity="0.5">${Array.from({ length: Math.floor((x2 - x1) / 46) }, (_, i) => `<line x1="${x1 + 23 + i * 46}" y1="426" x2="${x1 + 23 + i * 46}" y2="450"/>`).join('')}</g>`;
      p += `<rect x="${x1}" y="415" width="${x2 - x1}" height="7" rx="3" fill="#4a3024"/>`;
      // the carved end panel on the aisle side, with a rounded top
      const ex = x1 < 0 ? x2 - 14 : x1;
      p += `<path d="M${ex} 450 V412 a7 7 0 0 1 14 0 V450 z" fill="#5a3e2c" stroke="#3d2a22" stroke-width="1"/><circle cx="${ex + 7}" cy="413" r="2.2" fill="#3d2a22" opacity="0.5"/>`;
      return p;
    }).join('') +
      // a hymnal left on each rail
      `<g><rect x="96" y="409" width="20" height="6" rx="1" fill="#2b3f5c"/><rect x="98" y="410" width="16" height="1.2" fill="#d9a441"/></g><g><rect x="640" y="409" width="18" height="6" rx="1" fill="#a5443a"/><rect x="642" y="410" width="14" height="1.2" fill="#d9a441"/></g>`;
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
    // a gothic arched window with tracery
    right: () => `<path d="M712 290 v-80 a34 34 0 0 1 68 0 v80 z" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="4"/><g stroke="#f4f1e8" stroke-width="2" fill="none"><line x1="746" y1="176" x2="746" y2="290"/><line x1="712" y1="240" x2="780" y2="240"/><path d="M722 214 a24 24 0 0 1 48 0"/><path d="M722 214 q12 -14 24 0 q12 -14 24 0"/></g><rect x="706" y="290" width="80" height="7" fill="#4a5a8a"/>`,
    // nautical cage lanterns
    lamp: () => [300, 500].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="40" stroke="#8a6a3a" stroke-width="2"/><rect x="${x - 8}" y="38" width="16" height="6" fill="#d9a441"/><ellipse cx="${x}" cy="62" rx="14" ry="18" fill="#f2e6b8" stroke="#8a6a3a" stroke-width="2"/><g stroke="#8a6a3a" stroke-width="1.5" fill="none"><ellipse cx="${x}" cy="62" rx="7" ry="18"/><line x1="${x - 14}" y1="62" x2="${x + 14}" y2="62"/></g><rect x="${x - 6}" y="78" width="12" height="5" fill="#d9a441"/>`).join(''),
    // blue-and-white striped rug
    props: () => `<rect x="0" y="20" width="800" height="8" fill="#4a5a8a" opacity="0.5"/><g fill="none" stroke="#f4f1e8" stroke-width="3" opacity="0.8"><ellipse cx="340" cy="412" rx="95" ry="10"/><ellipse cx="340" cy="412" rx="70" ry="6"/><ellipse cx="340" cy="412" rx="45" ry="3"/></g>`
  };

  INTERIORS['cape-cod'] = {
    wall: '#f6f3ea', trim: '#1f3b33', bookcase: '#1f3b33', shelfBoard: '#2f5a4a',
    rugColor: '#5d5a54', rugStripe: '#e9e2cf', counterWood: '#1f3b33', counterTop: '#a8865c',
    texture: () => `<rect x="0" y="0" width="800" height="110" fill="#f4f1e8"/>` + vLines(4, 800, 0, 110, 14, 0.05) + vLines(2, 800, 110, 366, 9, 0.03),
    floor: () => floorPlanks('#a8865c', '#8a6a48'),
    // the vaulted plank ceiling with white beams
    ceiling: () => `<g fill="#e9e4d6" stroke="#cfc6b4" stroke-width="1"><rect x="0" y="104" width="800" height="10"/><polygon points="0,110 400,0 800,110 800,98 400,-12 0,98"/><rect x="394" y="0" width="12" height="110"/></g>`,
    // a big window with a woven shade, and a fiddle-leaf fig
    left: () => `<rect x="22" y="150" width="78" height="130" fill="#dfe8ea" stroke="#f4f1e8" stroke-width="4"/><g stroke="#f4f1e8" stroke-width="2"><line x1="61" y1="150" x2="61" y2="280"/><line x1="22" y1="215" x2="100" y2="215"/></g><rect x="20" y="148" width="82" height="46" fill="#c9a97a"/>` + hLines(20, 102, 154, 190, 5, 0.15) + `<rect x="30" y="372" width="26" height="0"/><path d="M36 372 l3 -30 h20 l3 30 z" fill="#b8734f"/><line x1="49" y1="342" x2="49" y2="290" stroke="#4f7a4a" stroke-width="2"/><g fill="#6a955f"><ellipse cx="36" cy="300" rx="12" ry="8" transform="rotate(-30 36 300)"/><ellipse cx="62" cy="296" rx="12" ry="8" transform="rotate(30 62 296)"/><ellipse cx="46" cy="318" rx="12" ry="8" transform="rotate(-20 46 318)"/><ellipse cx="58" cy="326" rx="11" ry="7" transform="rotate(25 58 326)"/></g>`,
    right: () => fireplace(690, '#a86b5f', '#f4f1e8'),
    // a rattan pendant, petals of woven straw around a glass globe
    lamp: () => `<line x1="400" y1="0" x2="400" y2="44" stroke="#8a7a5a" stroke-width="2"/><g fill="#d9b98a" stroke="#b08a5a" stroke-width="1">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="${400 + 30 * Math.cos(a * Math.PI / 180)}" cy="${64 + 14 * Math.sin(a * Math.PI / 180)}" rx="22" ry="9" transform="rotate(${a / 3} ${400 + 30 * Math.cos(a * Math.PI / 180)} ${64 + 14 * Math.sin(a * Math.PI / 180)})"/>`).join('')}</g><circle cx="400" cy="70" r="12" fill="#f2e6b8"/>`,
    // the cat, on the hearth rug
    props: () => `<ellipse cx="758" cy="404" rx="34" ry="10" fill="#e9e2cf"/><g fill="#3b332c"><ellipse cx="753" cy="396" rx="16" ry="7"/><circle cx="768" cy="390" r="6"/><polygon points="764,386 765,379 768,386"/><polygon points="770,386 773,379 774,386"/><path d="M737 396 q-14 -2 -12 10" stroke="#3b332c" stroke-width="3" fill="none"/></g>`
  };

  INTERIORS.tudor = {
    wall: '#efe6d2', trim: '#3d2a22', bookcase: '#5b3d2e', shelfBoard: '#3d2a22',
    rugColor: '#8f5b4a', rugStripe: '#d9a441', counterWood: '#5b3d2e', counterTop: '#3d2a22',
    floor: () => floorPlanks('#6b4a3a', '#4a3024'),
    ceiling: () => `<g fill="#3d2a22"><rect x="0" y="0" width="800" height="14"/><rect x="0" y="46" width="800" height="10"/><rect x="0" y="96" width="800" height="10"/><rect x="104" y="0" width="12" height="366"/><rect x="684" y="0" width="12" height="366"/></g>
      <g stroke="#3d2a22" stroke-width="6"><line x1="20" y1="14" x2="104" y2="96"/><line x1="780" y1="14" x2="696" y2="96"/></g>`,
    left: () => fireplace(0, '#8f5b4a', '#3d2a22'),
    right: () => leadedWindow(712, 130, 64, 170, '#3d2a22') + `<path d="M712 130 a32 32 0 0 1 64 0 z" fill="#dfe8ea" stroke="#3d2a22" stroke-width="2.5"/><rect x="704" y="300" width="80" height="7" fill="#3d2a22"/>`,
    // a wrought-iron chandelier with candles
    lamp: () => `<line x1="400" y1="14" x2="400" y2="56" stroke="#2b2a28" stroke-width="2"/><ellipse cx="400" cy="74" rx="46" ry="12" fill="none" stroke="#2b2a28" stroke-width="4"/><g stroke="#2b2a28" stroke-width="2"><line x1="400" y1="56" x2="354" y2="74"/><line x1="400" y1="56" x2="446" y2="74"/><line x1="400" y1="56" x2="400" y2="86"/></g>${[354, 377, 400, 423, 446].map((x, i) => `<rect x="${x - 2}" y="${(i === 0 || i === 4) ? 60 : (i === 2 ? 70 : 54)}" width="4" height="12" fill="#f4efe4"/><ellipse cx="${x}" cy="${(i === 0 || i === 4) ? 56 : (i === 2 ? 66 : 50)}" rx="2.5" ry="4" fill="#f2c46a"/>`).join('')}<ellipse cx="400" cy="130" rx="90" ry="34" fill="#f2e6b8" opacity="0.12"/>`,
    props: () => `<rect x="20" y="344" width="60" height="6" fill="#3d2a22"/><rect x="24" y="320" width="10" height="24" fill="#e9e2cf"/><ellipse cx="29" cy="316" rx="4" ry="6" fill="#d9a441"/>`
  };

  INTERIORS.church = {
    wall: '#d9cfb8', trim: '#8a8070', bookcase: '#4a3f36', shelfBoard: '#2b2a28',
    counterWood: '#4a3f36', counterTop: '#2b2a28',
    desk: altarDesk,
    front: pews,
    // stone blocks
    texture: () => hLines(0, 800, 22, 360, 22, 0.1) + `<g stroke="#000" stroke-width="1" opacity="0.08">${Array.from({ length: 16 }, (_, r) => Array.from({ length: 9 }, (_, c) => { const x = c * 100 + (r % 2) * 50; return `<line x1="${x}" y1="${r * 22}" x2="${x}" y2="${r * 22 + 22}"/>`; }).join('')).join('')}</g>`,
    floor: stoneFloor,
    // ribbed vaulting
    ceiling: () => `<g fill="none" stroke="#b5a88e" stroke-width="9"><path d="M0 130 Q400 -70 800 130"/><path d="M-60 260 Q200 -20 460 260" opacity="0.8"/><path d="M340 260 Q600 -20 860 260" opacity="0.8"/></g><g fill="none" stroke="#c9bea4" stroke-width="3"><path d="M0 130 Q400 -70 800 130"/><path d="M-60 260 Q200 -20 460 260"/><path d="M340 260 Q600 -20 860 260"/></g>`,
    left: () => stainedArch(28, 60, 60, 240),
    right: () => stainedArch(712, 60, 60, 240),
    // ring lights hung on thin cables
    lamp: () => [250, 550].map(x => `<g stroke="#3a3f44" stroke-width="1"><line x1="${x - 30}" y1="0" x2="${x - 30}" y2="96"/><line x1="${x + 30}" y1="0" x2="${x + 30}" y2="96"/></g><ellipse cx="${x}" cy="100" rx="46" ry="10" fill="none" stroke="#f6efd6" stroke-width="5"/><ellipse cx="${x}" cy="100" rx="46" ry="10" fill="none" stroke="#f2e6b8" stroke-width="10" opacity="0.25"/>`).join(''),
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
    wall: '#d4b990', trim: '#8a6a48', bookcase: '#b08a5a', shelfBoard: '#8a6a48',
    counterWood: '#b08a5a', counterTop: '#8a6a48',
    texture: () => hLines(0, 800, 8, 360, 10, 0.12),
    floor: () => floorPlanks('#8a6a48', '#6b4a3a'),
    // deck beams overhead, the hull's curved ribs, and two posts
    ceiling: () => `<g fill="#c9a97a" stroke="#8a6a48" stroke-width="1"><rect x="0" y="0" width="800" height="16"/><rect x="0" y="40" width="800" height="10"/></g>
      <g stroke="#b08a5a" stroke-width="12" fill="none" stroke-linecap="round"><path d="M110 366 Q92 180 118 0"/><path d="M690 366 Q708 180 682 0"/></g>
      <g fill="#c9a97a" stroke="#8a6a48" stroke-width="1"><rect x="176" y="16" width="9" height="356"/><rect x="615" y="16" width="9" height="356"/></g>`,
    left: () => porthole(66, 190) + porthole(66, 280) + `<rect x="30" y="330" width="46" height="42" rx="6" fill="#7a5a3e" stroke="#4a3024"/><g stroke="#4a3024" stroke-width="2"><line x1="30" y1="342" x2="76" y2="342"/><line x1="30" y1="360" x2="76" y2="360"/></g><g fill="#b7736b"><rect x="38" y="318" width="8" height="12"/><rect x="48" y="316" width="8" height="14"/></g>`,
    // a hammock slung between the ribs
    right: () => `<path d="M700 150 Q740 260 790 150" stroke="#e9e2cf" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M712 168 Q740 240 780 166" stroke="#b6413a" stroke-width="6" fill="none"/><g stroke="#c9b28a" stroke-width="2"><line x1="700" y1="150" x2="696" y2="60"/><line x1="790" y1="150" x2="794" y2="60"/></g>`,
    // brass lanterns hung from the beams
    lamp: () => [250, 550].map(x => `<line x1="${x}" y1="16" x2="${x}" y2="46" stroke="#3a3f44" stroke-width="2"/><rect x="${x - 7}" y="44" width="14" height="5" fill="#d9a441"/><rect x="${x - 10}" y="49" width="20" height="26" rx="3" fill="#f2e6b8" stroke="#8a6a3a" stroke-width="2"/><rect x="${x - 6}" y="75" width="12" height="4" fill="#d9a441"/><ellipse cx="${x}" cy="120" rx="60" ry="26" fill="#f2e6b8" opacity="0.12"/>`).join(''),
    // a ship's wheel on the wall
    props: () => `<ellipse cx="400" cy="412" rx="120" ry="16" fill="#e9e2cf" opacity="0.35"/><g stroke="#6b4a3a" stroke-width="2" fill="none"><circle cx="46" cy="60" r="18"/><circle cx="46" cy="60" r="6"/>${[0, 45, 90, 135].map(a => `<line x1="${46 - 22 * Math.cos(a * Math.PI / 180)}" y1="${60 - 22 * Math.sin(a * Math.PI / 180)}" x2="${46 + 22 * Math.cos(a * Math.PI / 180)}" y2="${60 + 22 * Math.sin(a * Math.PI / 180)}"/>`).join('')}</g>`
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
    interior: { shelves: BIG_INTERIOR_SHELVES, stops: INTERIOR_STOPS, personScale: INTERIOR_PERSON_SCALE, decorSlots: INTERIOR_DECOR_SLOTS },
    door: { x: 400, y: 350 },
    bell: { x: 400, y: 110 },             // the bell's pivot in the belfry: where music notes rise from
    sign: { size: 11, small: 9 },
    stops: { left: 235, right: 565 },
    personScale: 1.0,
    deliveryX: 650,
    decorSlots: [209, 267, 325, 475, 533, 591], legacySignX: 566, legacyPlantX: 236,
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="400" cy="${GROUND_Y}" rx="160" ry="6" fill="#000" opacity="0.08"/>`;
      s += `<rect x="250" y="205" width="300" height="195" fill="${color}" stroke="#b5aea0" stroke-width="1.5"/>`;
      s += hLines(250, 550, 214, 396, 8, 0.05);
      // the roof, notched where the tower stands, so its sketched outline doesn't cross the belfry
      s += `<polygon points="235,210 372,129 372,182 428,182 428,129 565,210" fill="#5a5f66" stroke="#4a4946" stroke-width="1.5"/>`;
      s += `<rect x="372" y="70" width="56" height="112" fill="${color}" stroke="#b5aea0" stroke-width="1.5"/>`;
      // the belfry: one tall open arch with the bell hung in it. game.js swings
      // .church-bell about its pivot (the yoke) to ring it.
      const arch = 'M378 152 V122 a22 22 0 0 1 44 0 V152 z';
      s += `<path d="${arch}" fill="#3a3f44"/><clipPath id="belfry"><path d="${arch}"/></clipPath>`;
      s += `<g fill="#4a3024"><rect x="378" y="106" width="5" height="8"/><rect x="417" y="106" width="5" height="8"/></g>`;
      s += `<g clip-path="url(#belfry)"><g transform="translate(400 110)"><g class="church-bell">${churchBell()}</g></g></g>`;
      s += `<rect x="375" y="150" width="50" height="4" fill="#b5aea0"/>`;
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
    front() { return ''; }
  };

  // A big old bronze bell, the kind that rang across a New England town: a wooden yoke,
  // a flared lip, a band round the waist, and the clapper just showing. Drawn about its
  // pivot at (0, 0), at the middle of the yoke.
  function churchBell() {
    return `<rect x="-18" y="-4" width="36" height="6" rx="1.5" fill="#6b4a36" stroke="#4a3024" stroke-width="0.8"/>
      <rect x="-3.5" y="1" width="7" height="4" fill="#7a5a2a"/>
      <path d="M-8 4 C-11.5 5 -12.5 9 -12.5 15 L-13.5 26 Q-14.5 31 -18.5 33 L18.5 33 Q14.5 31 13.5 26 L12.5 15 C12.5 9 11.5 5 8 4 Z" fill="#b08a3a" stroke="#6e5220" stroke-width="1"/>
      <line x1="-12" y1="18" x2="12" y2="18" stroke="#8a6a2a" stroke-width="1"/>
      <path d="M-7 8 C-9 12 -9.5 20 -10.5 28" stroke="#e6c886" stroke-width="2" opacity="0.6" fill="none"/>
      <rect x="-19" y="32" width="38" height="3" rx="1.5" fill="#8a6a2a"/>
      <circle cx="0" cy="36.5" r="2.6" fill="#5a4220"/>`;
  }

  BUILDINGS.lighthouse = {
    id: 'lighthouse',
    stage: 4,
    name: 'Lighthouse',
    blurb: 'On the cliff, over the sea. The keeper’s house is the shop; the tower is the reading nook.',
    location: 'cliff',
    capacity: 500,
    paint: '#f4f1e8',
    shelves: [],
    interior: { shelves: BIG_INTERIOR_SHELVES, stops: INTERIOR_STOPS, personScale: INTERIOR_PERSON_SCALE, decorSlots: INTERIOR_DECOR_SLOTS },
    door: { x: 455, y: 365 },
    sign: { size: 10, small: 8.5 },
    stops: { left: 250, right: 590 },
    sides: ['left'],                      // the other side is the cliff
    petRange: [70, 640],                  // the grass ends at the cliff edge, near x 676
    beam: { x: 330, y: 88 },              // the lamp in the lantern room: its light turns
    personScale: 1.0,
    deliveryX: 110,
    decorSlots: [264, 322, 380, 500, 558, 616], legacySignX: 560, legacyPlantX: 376,
    backdropOpts: {},
    draw(color) {
      let s = `<ellipse cx="420" cy="${GROUND_Y}" rx="150" ry="6" fill="#000" opacity="0.1"/>`;
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
    front() { return ''; }
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
    interior: { shelves: BIG_INTERIOR_SHELVES, stops: INTERIOR_STOPS, personScale: INTERIOR_PERSON_SCALE, decorSlots: INTERIOR_DECOR_SLOTS },
    door: { x: 400, y: 232 },
    sign: { size: 10, small: 8 },
    stops: { left: 250, right: 560 },
    personScale: 1.15,
    deliveryX: 660,
    decorSlots: [136, 203, 270, 530, 597, 664], legacySignX: 610, legacyPlantX: 160,
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
    front() { return ''; }
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
  // paintColor, if given, is the player's own coat of paint on the walls; wallColor is
  // the same for the walls inside.
  function render(locationId, buildingId, view, paintColor, wallColor) {
    const building = BUILDINGS[buildingId] || BUILDINGS.lfl;
    if (view === 'inside' && building.interior) return renderInterior(building, wallColor);
    const locId = BACKDROPS[locationId] ? locationId : 'park';
    const loc = LOCATIONS.find(l => l.id === locId);
    const color = paintColor || building.paint || (loc && loc.boxColor) || '#a9b5b7';
    const [skyTop, skyBottom] = SKIES[locId];
    // A backdrop is one string, or { far, near } when part of it should be painted in front
    // of the background people (the beach's dune fence, for instance). Every backdrop starts
    // with the sky. It is lifted out and drawn first, with the sun and the night sky (stars
    // and moon) straight after it, so everything else in the backdrop, clouds included, is
    // in front of them. The sun gets a painted layer of its own: inside the backdrop's, its
    // sketch-mode ink copy would be drawn over the neighbors' houses.
    const drawn = BACKDROPS[locId](building.backdropOpts || {});
    const far = typeof drawn === 'string' ? drawn : drawn.far;
    const near = typeof drawn === 'string' ? '' : drawn.near;
    const skyRect = `<rect width="800" height="450" fill="url(#sky)"/>`;
    const backdrop = far.replace(skyRect, '');
    const bldg = building.draw(color);
    const front = building.front();
    // The two .washed groups hold everything in front of the sky; at night game.js gives
    // them the night-wash filter. The paper grain sits between them, unwashed, as it blends
    // with whatever is beneath it.
    return `<svg viewBox="0 0 ${VIEW.width} ${VIEW.height}" xmlns="http://www.w3.org/2000/svg" role="img">
      ${defs(skyTop, skyBottom)}
      ${skyRect}
      ${painted('sky-bodies', skyBodies())}
      <g class="night-sky">${nightSky()}</g>
      <g class="washed">
        ${painted('backdrop', backdrop)}
        <g class="background-life"></g>
        ${SEA[locId] ? `<clipPath id="sea-surface"><rect x="0" y="0" width="${VIEW.width}" height="${SEA[locId].surface}"/></clipPath><g class="sea-life" clip-path="url(#sea-surface)"></g>` : ''}
        ${near ? painted('backdrop-near', near) : ''}
        ${GROUND[locId]
          ? `<clipPath id="ground-only"><polygon points="${GROUND[locId].outline}"/></clipPath><g clip-path="url(#ground-only)">${painted('seasonal', seasonalLayer(GRASSY.includes(locId), GROUND[locId].edgeX))}</g>`
          : painted('seasonal', seasonalLayer(GRASSY.includes(locId), 800, PATHS[locId]))}
        ${painted('building', bldg)}
        <g class="books"></g>
        ${painted('front', front)}
      </g>
      <rect class="paper" width="${VIEW.width}" height="${VIEW.height}" filter="url(#paperGrain)"/>
      <g class="washed">
        <g class="decor"></g>
        <g class="deliveries"></g>
        <g class="pets"></g>
        <g class="customers"></g>
        <g class="weather"></g>
      </g>
      ${building.beam ? beamLayer(building.beam) : ''}
      <rect class="season-tint" width="${VIEW.width}" height="${VIEW.height}" fill="#ffffff" opacity="0"/>
      ${daylightLayer(400, 320, 190, 110)}
      <g class="effects"></g>
    </svg>`;
  }
  // A lighthouse's light. The lens turns, so from the side the beam swings out one way,
  // shortens as it points straight at us (the lamp flashes), then swings out the other way
  // and shortens again as it points out to sea behind the tower. game.js turns it (the
  // .beam-sweep scale and the .beam-flash opacity) and sets how strong it is for the hour.
  // Drawn outside the night wash, so it shines out at night. Pointing right to start, so a
  // still picture of it (the upgrade cards) looks as the lighthouse always did.
  function beamLayer(b) {
    return `<g class="lighthouse-beam" transform="translate(${b.x} ${b.y})" opacity="0.3">
      <defs><linearGradient id="beamFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4cc" stop-opacity="0.95"/><stop offset="1" stop-color="#fff4cc" stop-opacity="0"/></linearGradient></defs>
      <polygon class="beam-sweep" points="0,-5 520,-46 520,46 0,5" fill="url(#beamFade)"/>
      <circle class="beam-flash" r="26" fill="url(#windowGlow)" opacity="0"/>
    </g>`;
  }
  function renderInterior(building, wallColor) {
    const style = INTERIORS[building.id];
    return `<svg viewBox="0 0 ${VIEW.width} ${VIEW.height}" xmlns="http://www.w3.org/2000/svg" role="img">
      ${defs('#ffffff', '#ffffff')}
      ${painted('backdrop', interior(style, building.interior.shelves, wallColor))}
      <g class="books"></g>
      ${painted('front', interiorFront(style, building.sign.size))}
      <rect class="paper" width="${VIEW.width}" height="${VIEW.height}" filter="url(#paperGrain)"/>
      <g class="decor"></g>
      <g class="pets"></g>
      <g class="customers"></g>
      <rect class="season-tint" width="${VIEW.width}" height="${VIEW.height}" fill="#ffffff" opacity="0"/>
      ${daylightLayer(400, 240, 0, 0, true)}
      <g class="effects"></g>
    </svg>`;
  }
  // A painted layer draws its content twice: once as color (fills only) and once as
  // ink (outlines only). Normally the ink layer is hidden and the color layer keeps
  // its outlines, so the picture looks as it always did. In sketch mode the page's
  // stylesheet shows both, wobbles them differently and offsets the ink a little,
  // the way hand-inked lines never quite sit on the paint beneath them.
  function painted(name, content) {
    return `<g class="${name}"><g class="fills">${content}</g><g class="lines" aria-hidden="true">${content}</g></g>`;
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
  // Which sides customers may arrive from. Inside, always both.
  function sidesFor(buildingId, view) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    if (view === 'inside' && b.interior) return ['left', 'right'];
    return b.sides || ['left', 'right'];
  }
  // The front door, for buildings a customer can walk up and into (stage three on).
  // Undefined from the inside view, or for a building with no door of its own.
  function doorFor(buildingId, view) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    if (view === 'inside') return null;
    return b.door || null;
  }
  // How big people are drawn in this view. 1 is the size that suits a house.
  function personScaleFor(buildingId, view) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    if (view === 'inside' && b.interior) return b.interior.personScale || 1;
    return b.personScale || 1;
  }
  function deliveryXFor(buildingId) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    return b.deliveryX || 640;
  }
  // Where decor can stand out front, left to right: two spots a side at stages one and
  // two, three a side from stage three (a perk of the upgrade). The player puts any item in
  // any spot; game.js names them L1.. and R1.. counting outwards from the door.
  function decorSlotsFor(buildingId) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    return b.decorSlots || [230, 300, 500, 570];
  }
  // How far left and right the shop's pets may wander out front. Most scenes are grass or
  // sidewalk edge to edge; the cliff drops away on the right.
  function petRangeFor(buildingId) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    return b.petRange || [70, 730];
  }
  // Where decor can stand inside, left to right. Empty for buildings with no interior.
  function interiorDecorSlotsFor(buildingId) {
    const b = BUILDINGS[buildingId] || BUILDINGS.lfl;
    return (b.interior && b.interior.decorSlots) || [];
  }

  // Only these names are visible to game.js.
  return { LOCATIONS, BUILDINGS, UPGRADES, VIEW, GROUND_Y, render, shelvesFor, stopsFor, sidesFor, doorFor, personScaleFor, deliveryXFor, deliveryBox, decorSlotsFor, interiorDecorSlotsFor, petRangeFor, chalkboard, plant, indoorItem, bench, adirondack, lamppost, petSvg, PET_COLORS, seaFor, extrasFor, horizonFor };
})();
