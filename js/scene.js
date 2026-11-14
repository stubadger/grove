/* Grove scene: the living picture at the top of Today, on the Grove page and on section banners.

   The picture is built as stacked layers inside one box, back to front:
     1. sky SVG        sky, stars, sun or moon, two mountain ridges
     2. clouds, birds  HTML, moved by CSS
     3. forest SVG     three rows of trees with mist between, light shafts, ground, decorations
     4. plants         one link per section: its plant (swaying) and its label
     5. small life     butterflies, fireflies, the campfire's flicker
     6. frame SVG      dark trunks at the edges and leaves hanging in from the top corners
     7. falling        leaves, petals, snow or drifting motes, by season
   The SVG layers never animate. Everything that moves is an HTML element moved with CSS transforms,
   which the browser can do without redrawing the picture, so it stays smooth on a phone.

   - PHASE is the time of day (sky and light). SEASON tints trees and ground and picks what falls.
   - P.decor lists the things that unlock with levels; DECOR has a draw function for each, base at (0,0).
     To add one: add an entry to P.decor and a function to DECOR.
   - Motion styles are under "scene motion" in style.css and stop when Animations is off. */
(function () {
  'use strict';
  var P = LD.plants, T = P.tools, rng = T.rng, leaf = T.leaf;
  var f = function (n) { return Math.round(n * 10) / 10; };

  function rgb(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2); }).join('');
  }

  var PHASE = {
    dawn:  { sky: ['#2b4a4b', '#ecd0a8'], haze: '#bfcbae', dim: 0.93, sun: '#ffe6bd', cloud: '#f7e3cf' },
    day:   { sky: ['#2f6a59', '#e3f0be'], haze: '#c2dcb6', dim: 1,    sun: '#fff4c4', cloud: '#f6fbec' },
    dusk:  { sky: ['#27314a', '#e6975a'], haze: '#a08878', dim: 0.82, sun: '#ffc98a', cloud: '#f0b596' },
    night: { sky: ['#050f0e', '#12332d'], haze: '#1d3d36', dim: 0.56, sun: '#e9edd8', cloud: '#27463f' }
  };
  var SEASON = {
    spring: { name: 'Spring', pine: '#4a8a52', round: '#79b75f', ground: ['#3d7c43', '#2c5f33', '#204a28'], grass: '#74bb5c', accent: '#b5d56a', accent2: '#7fb069', fall: 'petal', blossom: '#f6bdd3' },
    summer: { name: 'Summer', pine: '#3a774a', round: '#4f9a4f', ground: ['#30693a', '#22512c', '#183d21'], grass: '#57a04f', accent: '#a7c957', accent2: '#7fb069', fall: 'mote' },
    autumn: { name: 'Autumn', pine: '#466f47', round: '#c9772e', ground: ['#5b5d2d', '#434620', '#333618'], grass: '#8f8f3c', accent: '#e8b45a', accent2: '#c98a3a', fall: 'leaf' },
    winter: { name: 'Winter', pine: '#487268', round: '#93a3a1', ground: ['#e1eaec', '#c3d1d6', '#a8bac0'], grass: '#a9bcbc', accent: '#a9d3e0', accent2: '#7fb3c4', fall: 'snow', snow: true }
  };
  P.seasons = SEASON;

  /* which season it is: a fixed choice, or by the calendar for the owner's half of the world */
  P.southern = function () {
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    return /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Port_Moresby)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Lusaka|Maseru)|^America\/(Sao_Paulo|Argentina|Buenos_Aires|Santiago|Montevideo|Asuncion|Lima|La_Paz)|^Indian\/(Mauritius|Reunion)/.test(tz);
  };
  P.seasonNow = function (choice, hemi) {
    if (SEASON[choice]) return choice;
    var south = hemi === 'south' || (hemi !== 'north' && P.southern());
    var m = (new Date().getMonth() + (south ? 6 : 0)) % 12;
    return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  };

  /* ---------------- things that unlock ---------------- */
  /* at: 0..1 across the scene, snapped to the nearest gap between plants; dx nudges it within the gap.
     layer bg stands at the back of the clearing, fg at the front, air is not a placed object. */
  P.decor = [
    { id: 'stones',      name: 'Stepping stones', level: 2,  at: 0.5,  layer: 'fg', dy: 9 },
    { id: 'lantern',     name: 'Lantern',         level: 3,  at: 0,    layer: 'fg', dx: -0.2 },
    { id: 'butterflies', name: 'Butterflies',     level: 4,  layer: 'air' },
    { id: 'bench',       name: 'Bench',           level: 5,  at: 0.5,  layer: 'fg' },
    { id: 'pond',        name: 'Lily pond',       level: 6,  at: 0.25, layer: 'fg', dy: 4 },
    { id: 'beehive',     name: 'Beehive',         level: 7,  at: 1,    layer: 'fg', dx: 0.1 },
    { id: 'planter',     name: 'Garden bed',      level: 8,  at: 0.75, layer: 'fg' },
    { id: 'campfire',    name: 'Campfire',        level: 9,  at: 0.25, layer: 'bg' },
    { id: 'arch',        name: 'Stone arch',      level: 10, at: 1,    layer: 'bg', dx: -0.12 },
    { id: 'owl',         name: 'Owl',             level: 12, at: 0,    layer: 'fg', dx: 0.22 },
    { id: 'treehouse',   name: 'Treehouse',       level: 14, at: 0.5,  layer: 'bg' },
    { id: 'deer',        name: 'Deer',            level: 16, at: 0.75, layer: 'bg' }
  ];

  /* each returns [markup, glows] where glows are [x, y, radius] lights shown at dusk and night */
  var DECOR = {
    stones: function () {
      var out = '';
      [[0, 4, 10, 3.2], [-11, -1, 8, 2.6], [3, -5, 6.5, 2.1], [-6, -9, 5.2, 1.7], [3, -12, 4, 1.3]].forEach(function (s) {
        out += '<ellipse cx="' + s[0] + '" cy="' + s[1] + '" rx="' + s[2] + '" ry="' + s[3] + '" fill="#6f7c72"/><ellipse cx="' + (s[0] - s[2] * 0.15) + '" cy="' + (s[1] - s[3] * 0.3) + '" rx="' + f(s[2] * 0.7) + '" ry="' + f(s[3] * 0.55) + '" fill="#98a498"/>';
      });
      return [out, []];
    },
    lantern: function (c) {
      return ['<ellipse cx="0" cy="0" rx="6" ry="1.8" fill="#5f6b62"/><rect x="-1.6" y="-38" width="3.2" height="38" rx="1" fill="#5a4230"/>' +
        '<path d="M0 -37q0 -9 9 -9" stroke="#5a4230" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M9 -46v3" stroke="#3a2a18" stroke-width="1"/>' +
        '<path d="M4.4 -43h9.2l1.6 11h-12.4z" fill="#4a3525"/><rect x="6.2" y="-41.4" width="5.6" height="7.8" rx="1" fill="' + (c.lit ? '#ffe9a6' : '#e3ecd2') + '"/>' +
        '<path d="M3.4 -43h11.2l-5.6 -4.4z" fill="#3a2a18"/><path d="M9 -41.4v7.8" stroke="#4a3525" stroke-width=".7"/>' +
        leaf(-1, -14, 6, 2.2, 200, '#4f9a4f') + leaf(1, -22, 6, 2.2, -20, '#5aa855'), [[9, -37, 32]]];
    },
    bench: function () {
      return ['<rect x="-17" y="-11" width="2.6" height="11" fill="#4a3525"/><rect x="14.4" y="-11" width="2.6" height="11" fill="#4a3525"/>' +
        '<rect x="-18.5" y="-25" width="2.4" height="14" fill="#5a4230"/><rect x="16.1" y="-25" width="2.4" height="14" fill="#5a4230"/>' +
        '<rect x="-20" y="-24" width="40" height="3.2" rx="1" fill="#8a6a4c"/><rect x="-20" y="-19" width="40" height="3.2" rx="1" fill="#7a5c44"/>' +
        '<rect x="-21" y="-13" width="42" height="3.6" rx="1.3" fill="#9a7856"/><rect x="-21" y="-13" width="42" height="1.2" rx=".6" fill="#b8946c"/>' +
        '<ellipse cx="-16" cy="-13.4" rx="4" ry="1.2" fill="#5d8a3c"/>', []];
    },
    pond: function (c) {
      var water = mix('#3f8f86', c.sky, 0.36);
      return ['<ellipse cx="0" cy="2" rx="35" ry="8.4" fill="#1b3828"/><ellipse cx="0" cy="2" rx="32" ry="6.6" fill="' + water + '"/>' +
        '<path d="M-19 1h11M4 3.4h13M-7 5.2h9" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".32"/>' +
        '<circle cx="-13" cy="3.2" r="3.6" fill="#4f9a4f"/><path d="M-13 3.2l3.6 -1" stroke="' + water + '" stroke-width="1"/>' +
        '<circle cx="9" cy="1" r="3.2" fill="#5aa855"/><circle cx="18" cy="4" r="2.6" fill="#4f9a4f"/><circle cx="9" cy="0.2" r="1.7" fill="#f6bdd3"/><circle cx="9" cy="0.2" r=".7" fill="#f4c531"/>' +
        '<path d="M-30 2V-14M-27 3V-10M-33 3V-9" stroke="#6aa84f" stroke-width="1.4" stroke-linecap="round"/><rect x="-31.4" y="-17" width="2.8" height="7" rx="1.4" fill="#7a5235"/>' +
        '<ellipse cx="27" cy="6" rx="6" ry="2.4" fill="#6f7c72"/><ellipse cx="26" cy="5.2" rx="4" ry="1.4" fill="#5d8a3c"/>', []];
    },
    beehive: function () {
      return ['<rect x="-8" y="-3" width="2" height="3" fill="#4a3525"/><rect x="6" y="-3" width="2" height="3" fill="#4a3525"/>' +
        '<rect x="-10" y="-10" width="20" height="7.4" rx="1" fill="#d9b658"/><rect x="-10" y="-17.4" width="20" height="7.4" rx="1" fill="#e8ca76"/><rect x="-10" y="-24.8" width="20" height="7.4" rx="1" fill="#d9b658"/>' +
        '<path d="M-12.5 -24.4L0 -32L12.5 -24.4Z" fill="#7a5c44"/><rect x="-3.2" y="-5.6" width="6.4" height="1.8" rx=".9" fill="#3a2a18"/>' +
        '<ellipse cx="-15" cy="-20" rx="1.7" ry="1.2" fill="#f4c531"/><ellipse cx="14" cy="-28" rx="1.7" ry="1.2" fill="#f4c531"/><ellipse cx="5" cy="-37" rx="1.7" ry="1.2" fill="#f4c531"/>', []];
    },
    planter: function () {
      var out = '<rect x="-23" y="-10" width="46" height="10" rx="1.6" fill="#7a5c44"/><path d="M-23 -5H23" stroke="#5a4230" stroke-width=".8"/><rect x="-21" y="-12" width="42" height="3.4" rx="1" fill="#3b2e22"/>';
      [-15, -8].forEach(function (x) { out += '<circle cx="' + x + '" cy="-13" r="3.6" fill="#7dbb62"/><circle cx="' + (x - 1) + '" cy="-14.2" r="2" fill="#a7c957"/>'; });
      out += '<path d="M3 -11V-30" stroke="#8a6a4c" stroke-width="1.1"/>' + leaf(3, -16, 7, 2.6, -150, '#4f9a4f') + leaf(3, -20, 7, 2.6, -30, '#5aa855') + leaf(3, -25, 6, 2.2, -160, '#4f9a4f') +
        '<circle cx="6" cy="-18" r="1.9" fill="#d9483b"/><circle cx="0.4" cy="-23" r="1.7" fill="#e2603f"/><circle cx="5.4" cy="-27" r="1.5" fill="#d9483b"/>' +
        leaf(14, -11, 9, 1.6, -75, '#6aa84f') + leaf(14, -11, 9, 1.6, -100, '#7dbb62') + leaf(17, -11, 8, 1.5, -62, '#6aa84f');
      return [out, []];
    },
    campfire: function (c) {
      var out = '<rect x="-30" y="-7" width="15" height="7" rx="3.5" fill="#5a4230"/><ellipse cx="-15" cy="-3.5" rx="1.8" ry="3.5" fill="#9a7856"/>' +
        '<rect x="15" y="-7" width="15" height="7" rx="3.5" fill="#4a3525"/><ellipse cx="15" cy="-3.5" rx="1.8" ry="3.5" fill="#8a6a4c"/>';
      [[-8, 0], [-4, 1.4], [1, 1.8], [6, 1.2], [9, -0.4]].forEach(function (s) { out += '<ellipse cx="' + s[0] + '" cy="' + s[1] + '" rx="3" ry="1.7" fill="#7d8a80"/>'; });
      out += '<path d="M-7 -1L5 -8M7 -1L-5 -8" stroke="#3a2a18" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M0 -4C-6 -9 -3 -14 -1 -18C0 -14 4 -14 2 -22C7 -16 8 -9 0 -4Z" fill="#f08a3c"/><path d="M0 -5C-3 -9 -1 -11 0 -14C2 -11 4 -9 0 -5Z" fill="#ffd66b"/>';
      if (!c.lit) out += '<path d="M1 -24q-5 -8 0 -15q4 -6 -1 -13" stroke="#fff" stroke-width="2" fill="none" opacity=".2" stroke-linecap="round"/>';
      return [out, [[0, -9, 46]]];
    },
    arch: function () {
      var out = '';
      [0, 1, 2, 3].forEach(function (i) {
        out += '<rect x="-25" y="' + (-11 - i * 10.4) + '" width="12" height="10" rx="2.4" fill="' + (i % 2 ? '#84918a' : '#73807a') + '"/>' +
               '<rect x="13" y="' + (-11 - i * 10.4) + '" width="12" height="10" rx="2.4" fill="' + (i % 2 ? '#73807a' : '#84918a') + '"/>';
      });
      out += '<path d="M-26 -41Q0 -76 26 -41L14 -39Q0 -58 -14 -39Z" fill="#7b8881"/><path d="M-9 -55l2 9M9 -55l-2 9M0 -60v10" stroke="#5f6b62" stroke-width=".9"/>' +
        '<path d="M-25 -44Q-10 -66 4 -66Q-12 -58 -20 -42Z" fill="#5d8a3c"/><ellipse cx="18" cy="-52" rx="6" ry="2.6" fill="#4f7a34" transform="rotate(38 18 -52)"/><ellipse cx="-20" cy="-12" rx="5" ry="2" fill="#5d8a3c"/>' +
        '<path d="M-22 -40q-3 12 1 22M20 -44q3 10 -2 20" stroke="#3f7d45" stroke-width="1.1" fill="none"/>' +
        leaf(-23, -32, 5, 2, 150, '#5aa855') + leaf(-21, -24, 5, 2, 30, '#4f9a4f') + leaf(21, -36, 5, 2, 20, '#5aa855') + leaf(19, -28, 5, 2, 160, '#4f9a4f');
      return [out, []];
    },
    owl: function (c) {
      var eye = c.lit ? '#ffe27a' : '#f6ecd4';
      return ['<rect x="-5.5" y="-11" width="11" height="11" fill="#5a4230"/><ellipse cx="0" cy="-11" rx="5.5" ry="1.8" fill="#8a6a4c"/><ellipse cx="-3" cy="-1" rx="5" ry="1.6" fill="#5d8a3c"/>' +
        '<ellipse cx="0" cy="-21" rx="7.4" ry="9.4" fill="#8a6a4c"/><ellipse cx="0" cy="-18.6" rx="4.6" ry="6" fill="#c9ad85"/>' +
        '<path d="M-6.6 -27l1.6 -5 3 3.6zM6.6 -27l-1.6 -5 -3 3.6z" fill="#7a5c44"/>' +
        '<circle cx="-2.9" cy="-24.2" r="2.7" fill="' + eye + '"/><circle cx="2.9" cy="-24.2" r="2.7" fill="' + eye + '"/><circle cx="-2.9" cy="-24.2" r="1.2" fill="#22180e"/><circle cx="2.9" cy="-24.2" r="1.2" fill="#22180e"/>' +
        '<path d="M-1.2 -22.4L0 -20.2L1.2 -22.4Z" fill="#e2a03f"/><path d="M-2.4 -16.6q1.2 1 2.4 0q1.2 1 2.4 0" stroke="#8a6a4c" stroke-width=".7" fill="none"/>', []];
    },
    treehouse: function (c, S) {
      var out = '';
      [[0, -88, 26], [-22, -74, 19], [22, -74, 19]].forEach(function (k) { out += '<circle cx="' + k[0] + '" cy="' + k[1] + '" r="' + k[2] + '" fill="' + mix(S.round, '#12301c', 0.4) + '"/>'; });
      out += '<path d="M-8 0C-6 -20 -5.5 -42 -6.5 -60H6.5C5.5 -42 6 -20 8 0Z" fill="url(#pg-trunk)"/>' +
        '<path d="M-19 0L-17 -54M-13.6 0L-12 -54M-18.6 -9h5M-18.3 -18h5M-18 -27h5M-17.7 -36h5M-17.4 -45h5" stroke="#8a6a4c" stroke-width="1.1"/>' +
        '<rect x="-24" y="-56" width="48" height="3.4" rx="1" fill="#7a5c44"/>' +
        '<rect x="-15" y="-76" width="30" height="20" rx="3" fill="#b8946c"/><path d="M-15 -70h30M-15 -64h30" stroke="#9a7856" stroke-width=".7"/>' +
        '<path d="M-19.5 -75Q0 -96 19.5 -75Z" fill="#6b4e37"/><path d="M-12 -79.5q12 -9 24 0M-7 -84q7 -5 14 0" stroke="#4a3525" stroke-width=".9" fill="none"/><path d="M-17 -76q8 -9 15 -12q-10 1 -17 10z" fill="#5d8a3c"/>' +
        '<circle cx="-5" cy="-66" r="4.4" fill="' + (c.lit ? '#ffe9a6' : '#cfe0c2') + '"/><path d="M-9.4 -66h8.8M-5 -70.4v8.8" stroke="#7a5c44" stroke-width=".8"/><rect x="4" y="-68" width="6.4" height="12" rx="3" fill="#7a5c44"/>' +
        '<path d="M-24 -56Q0 -47 24 -56" stroke="#4a3525" stroke-width=".7" fill="none"/>';
      [-16, -8, 0, 8, 16].forEach(function (x) { out += '<circle cx="' + x + '" cy="' + f(-56 + 6.5 * (1 - Math.pow(x / 24, 2))) + '" r="1.4" fill="' + (c.lit ? '#ffe27a' : '#e9dfb0') + '"/>'; });
      [[10, -98, 11], [-14, -92, 9]].forEach(function (k) { out += '<circle cx="' + k[0] + '" cy="' + k[1] + '" r="' + k[2] + '" fill="' + mix(S.round, '#ffffff', 0.1) + '"/>'; });
      return [out, [[-5, -66, 24]]];
    },
    deer: function () {
      return ['<path d="M-9 -15V0M-5 -15V0M5 -15V0M9 -15V0" stroke="#8a5f3c" stroke-width="2.2" stroke-linecap="round"/>' +
        '<ellipse cx="0" cy="-20" rx="13" ry="7" fill="#a9744a"/><path d="M8 -24L14 -37L19 -35L13 -19Z" fill="#a9744a"/><ellipse cx="18.5" cy="-38" rx="5.4" ry="3.6" fill="#b07c50"/>' +
        '<path d="M14.5 -40l-2.6 -4.2 3.6 1.6z" fill="#8a5f3c"/><circle cx="20" cy="-38.6" r=".8" fill="#22180e"/><ellipse cx="-13" cy="-21" rx="2.4" ry="3" fill="#f3e9d8"/>' +
        '<path d="M16 -41q-2 -7 -6 -9M17.5 -41q1 -7 6 -9M13 -47l-3 -1M21 -47l3 -2" stroke="#7a5235" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
        '<circle cx="-4" cy="-22" r="1" fill="#d9b48c"/><circle cx="2" cy="-19" r="1" fill="#d9b48c"/><circle cx="-8" cy="-18" r=".9" fill="#d9b48c"/>', []];
    }
  };
  /* a small picture of one decoration, for the Grove page */
  P.decorIcon = function (id, size) {
    var d = DECOR[id];
    if (!d) return '<svg class="decoricon" viewBox="-30 -46 60 52" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M-9 -22q-6 -8 -7 0q1 6 7 0q6 -8 7 0q-1 6 -7 0" fill="#f4c531"/><path d="M8 -12q-5 -7 -6 0q1 5 6 0q5 -7 6 0q-1 5 -6 0" fill="#7c9df0"/></svg>';
    var vb = id === 'treehouse' ? '-60 -122 120 128' : id === 'arch' ? '-40 -76 80 82' : (id === 'pond' || id === 'planter' || id === 'bench' || id === 'campfire') ? '-40 -46 80 56' : '-30 -50 60 56';
    return '<svg class="decoricon" viewBox="' + vb + '" width="' + size + '" height="' + size + '" aria-hidden="true"><defs>' + P.defs + '</defs>' +
      d({ lit: false, sky: '#e3f0be' }, SEASON.summer)[0] + '</svg>';
  };

  /* ---------------- scenery pieces ---------------- */
  /* a soft mountain ridge */
  function ridge(w, base, amp, r, col, n) {
    var pts = [], i;
    for (i = 0; i <= n; i++) pts.push([w * i / n, base - amp * (0.3 + r() * 0.7)]);
    var d = 'M0 ' + (base + 400) + 'V' + f(pts[0][1]);
    for (i = 1; i <= n; i++) d += 'Q' + f(pts[i - 1][0]) + ' ' + f(pts[i - 1][1]) + ' ' + f((pts[i - 1][0] + pts[i][0]) / 2) + ' ' + f((pts[i - 1][1] + pts[i][1]) / 2);
    return '<path d="' + d + 'L' + w + ' ' + f(pts[n][1]) + 'V' + (base + 400) + 'Z" fill="' + col + '"/>';
  }
  /* one row of forest. detail 0 = far and plain, 1 = middle, 2 = near: layered boughs with a lit side and round crowns with highlights.
     c: { pine, pineLit, round, roundLit, trunk, hill, snow } */
  function forest(w, base, hmin, hmax, step, r, c, S, detail) {
    var dark = '', lit = '', trunks = '', crowns = '', hi = '', extra = '';
    for (var x = -step; x < w + step; x += step * (0.62 + r() * 0.7)) {
      var hh = hmin + r() * (hmax - hmin);
      if (detail && r() < 0.27) {
        var cr = hh * 0.3, cy = base - hh * 0.6, tw = Math.max(1.2, hh * 0.035);
        trunks += 'M' + f(x - tw) + ' ' + base + 'V' + f(cy) + 'H' + f(x + tw) + 'V' + base + 'Z';
        [[0, 0, 1], [-0.72, 0.38, 0.7], [0.72, 0.34, 0.72], [0.05, -0.55, 0.62]].forEach(function (k) { crowns += '<circle cx="' + f(x + k[0] * cr) + '" cy="' + f(cy + k[1] * cr) + '" r="' + f(k[2] * cr) + '"/>'; });
        if (detail > 1) [[-0.32, -0.38, 0.5], [0.36, -0.12, 0.32], [-0.62, 0.22, 0.3]].forEach(function (k) { hi += '<circle cx="' + f(x + k[0] * cr) + '" cy="' + f(cy + k[1] * cr) + '" r="' + f(k[2] * cr) + '"/>'; });
        if (S.blossom && detail > 1) for (var b = 0; b < 6; b++) extra += '<circle cx="' + f(x + (r() - 0.5) * cr * 2.2) + '" cy="' + f(cy + (r() - 0.6) * cr * 1.3) + '" r="' + f(1.2 + r()) + '" fill="' + S.blossom + '" opacity=".85"/>';
        if (S.snow) extra += '<path d="M' + f(x - cr * 0.8) + ' ' + f(cy - cr * 0.6) + 'Q' + f(x) + ' ' + f(cy - cr * 1.75) + ' ' + f(x + cr * 0.8) + ' ' + f(cy - cr * 0.6) + 'Q' + f(x) + ' ' + f(cy - cr * 1.0) + ' ' + f(x - cr * 0.8) + ' ' + f(cy - cr * 0.6) + 'Z" fill="' + c.snow + '" opacity=".88"/>';
      } else {
        var tiers = detail === 0 ? 1 : detail === 1 ? 3 : 4, ww = hh * (0.38 + r() * 0.12), seg = hh * 0.86 / tiers;
        trunks += 'M' + f(x - 1.3) + ' ' + base + 'V' + f(base - hh * 0.2) + 'H' + f(x + 1.3) + 'V' + base + 'Z';
        for (var t = 0; t < tiers; t++) {
          var yb = base - (tiers > 1 ? hh * 0.1 + t * seg * 0.8 : 0), yt = t === tiers - 1 ? base - hh : yb - seg * 1.55, tw2 = ww * (1 - t / (tiers + 0.35)), ym = yb - (yb - yt) * 0.42;
          dark += 'M' + f(x - tw2 / 2) + ' ' + f(yb) + 'Q' + f(x - tw2 * 0.14) + ' ' + f(ym) + ' ' + f(x) + ' ' + f(yt) + 'Q' + f(x + tw2 * 0.14) + ' ' + f(ym) + ' ' + f(x + tw2 / 2) + ' ' + f(yb) + 'Q' + f(x) + ' ' + f(yb + (yb - yt) * 0.1) + ' ' + f(x - tw2 / 2) + ' ' + f(yb) + 'Z';
          if (detail > 1) lit += 'M' + f(x - tw2 / 2) + ' ' + f(yb) + 'Q' + f(x - tw2 * 0.14) + ' ' + f(ym) + ' ' + f(x) + ' ' + f(yt) + 'L' + f(x - tw2 * 0.07) + ' ' + f(yb + (yb - yt) * 0.05) + 'Z';
        }
        if (S.snow) extra += '<path d="M' + f(x - ww * 0.17) + ' ' + f(base - hh * 0.7) + 'Q' + f(x - ww * 0.04) + ' ' + f(base - hh * 0.86) + ' ' + f(x) + ' ' + f(base - hh) + 'Q' + f(x + ww * 0.04) + ' ' + f(base - hh * 0.86) + ' ' + f(x + ww * 0.17) + ' ' + f(base - hh * 0.7) + 'Q' + f(x) + ' ' + f(base - hh * 0.62) + ' ' + f(x - ww * 0.17) + ' ' + f(base - hh * 0.7) + 'Z" fill="' + c.snow + '" opacity=".88"/>';
      }
    }
    return '<rect x="0" y="' + (base - 1) + '" width="' + w + '" height="700" fill="' + c.hill + '"/><path d="' + trunks + '" fill="' + c.trunk + '"/><path d="' + dark + '" fill="' + c.pine + '"/>' +
      (lit ? '<path d="' + lit + '" fill="' + c.pineLit + '" opacity=".55"/>' : '') + '<g fill="' + c.round + '">' + crowns + '</g>' + (hi ? '<g fill="' + c.roundLit + '" opacity=".6">' + hi + '</g>' : '') + extra;
  }
  /* leaves hanging in from a top corner, on a sagging branch, with a couple of trailing vines */
  function canopy(w, r, side, cols, span, depth) {
    var x0 = side ? w : 0, dir = side ? -1 : 1, out = '', i;
    var by = function (t) { return (1 - t) * (1 - t) * depth * 0.15 + 2 * (1 - t) * t * depth * 0.8 + t * t * depth * 0.32; };
    out += '<ellipse cx="' + x0 + '" cy="-4" rx="' + f(span * 0.6) + '" ry="' + f(depth * 0.62) + '" fill="' + cols[0] + '"/>' +
           '<path d="M' + x0 + ' ' + f(depth * 0.15) + 'Q' + f(x0 + dir * span * 0.5) + ' ' + f(depth * 0.8) + ' ' + f(x0 + dir * span) + ' ' + f(depth * 0.32) + '" stroke="#140d08" stroke-width="' + f(Math.max(2.5, depth * 0.07)) + '" fill="none" stroke-linecap="round"/>';
    for (i = 0; i < 2; i++) {
      var vt = 0.34 + i * 0.3 + r() * 0.08, vx = x0 + dir * span * vt, vy = by(vt), vl = depth * (0.5 + r() * 0.5);
      out += '<path d="M' + f(vx) + ' ' + f(vy) + 'q' + f(dir * 5) + ' ' + f(vl * 0.5) + ' ' + f(dir * -2) + ' ' + f(vl) + '" stroke="' + cols[1] + '" stroke-width="1.3" fill="none"/>';
      for (var k = 1; k <= 4; k++) out += leaf(vx + dir * 1.5, vy + vl * k / 4.4, 6, 2.2, k % 2 ? 20 : 160, cols[2]);
    }
    var n = Math.round(span / 5);
    for (i = 0; i < n; i++) {
      var t = r(), lx = x0 + dir * span * t + (r() - 0.5) * 26, ly = by(t) + (r() - 0.55) * depth * 0.85 * (1 - t * 0.5) - 5;
      out += leaf(lx, ly, 11 + r() * 9, 3.6 + r() * 2.2, 40 + r() * 100, cols[Math.floor(r() * cols.length)], r() < 0.3 ? cols[0] : null);
    }
    return out;
  }
  /* a dark trunk standing at one edge, close to the viewer */
  function edgeTrunk(w, h, side, tw, r, col) {
    var x0 = side ? w : 0, dir = side ? -1 : 1, out, i;
    out = '<path d="M' + x0 + ' 0H' + f(x0 + dir * tw * 0.85) + 'Q' + f(x0 + dir * tw * 0.6) + ' ' + f(h * 0.55) + ' ' + f(x0 + dir * tw * 1.5) + ' ' + h + 'H' + x0 + 'Z" fill="' + col + '"/>';
    var bark = '';
    for (i = 0; i < 9; i++) { var bx = x0 + dir * tw * (0.1 + r() * 0.55), byy = r() * h * 0.85; bark += 'M' + f(bx) + ' ' + f(byy) + 'q' + f(dir * 1.5) + ' ' + f(8 + r() * 10) + ' 0 ' + f(18 + r() * 16); }
    out += '<path d="' + bark + '" stroke="#3a2a1c" stroke-width="1.2" fill="none" opacity=".7" stroke-linecap="round"/>';
    for (i = 0; i < 3; i++) out += '<ellipse cx="' + f(x0 + dir * tw * (0.5 + r() * 0.25)) + '" cy="' + f(h * (0.3 + i * 0.22 + r() * 0.08)) + '" rx="' + f(tw * 0.22) + '" ry="' + f(6 + r() * 6) + '" fill="#274d2e" opacity=".85"/>';
    return out;
  }

  /* ---------------- the scene ----------------
     o: phase, season, items [{id,name,plant,stage,level}], decor {id:true}, still, grew (section id that just grew),
        banner (one large plant on the right, no labels or links), big (taller Grove page version)
     Returns HTML for a box of the given size. */
  P.scene = function (w, h, o) {
    o = Object.create(o);
    o.big = o.big && w >= 560;   /* on a phone the Grove page uses the normal proportions, just taller */
    var narrow = w < 560;
    var ph = PHASE[o.phase] || PHASE.day, S = SEASON[o.season] || SEASON.summer, lit = o.phase === 'night' || o.phase === 'dusk';
    var gy = h - (o.banner ? 16 : 44), r = rng(42), i, x, dim = ph.dim, glow = '', html = '';
    var shade = function (c) { return mix(c, '#06100c', 1 - dim); };
    var svgOpen = function (cls) { return '<svg class="lay ' + cls + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">'; };

    /* 1. sky */
    var cel = { dawn: [w * 0.22, gy - 96], day: [w * 0.52, h * 0.2], dusk: [w * 0.6, gy - 92], night: [w * 0.5, h * 0.24] }[o.phase];
    if (w < 560 || o.banner) cel = [w * (o.banner ? 0.5 : 0.8), gy - (o.banner ? 74 : 112)];
    var a = svgOpen('s-sky') + '<defs><linearGradient id="sky-' + o.phase + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + ph.sky[0] + '"/><stop offset=".72" stop-color="' + mix(ph.sky[0], ph.sky[1], 0.82) + '"/><stop offset="1" stop-color="' + ph.sky[1] + '"/></linearGradient>' +
      '<radialGradient id="glow"><stop offset="0" stop-color="' + ph.sun + '" stop-opacity=".75"/><stop offset="1" stop-color="' + ph.sun + '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#sky-' + o.phase + ')"/>';
    if (o.phase === 'night') {
      for (i = 0; i < Math.round(w / 16); i++) a += '<circle cx="' + f(r() * w) + '" cy="' + f(r() * h * 0.5) + '" r="' + f(0.5 + r() * 0.8) + '" fill="#e9edd8" opacity="' + f(0.3 + r() * 0.6) + '"/>';
      a += '<circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="52" fill="url(#glow)" opacity=".45"/><circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="13" fill="#e9edd8"/>' +
           '<circle cx="' + f(cel[0] + 6) + '" cy="' + f(cel[1] - 4) + '" r="11.5" fill="' + mix(ph.sky[0], ph.sky[1], 0.25) + '"/>';
    } else {
      a += '<circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="' + (o.banner ? 70 : 96) + '" fill="url(#glow)"/><circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="13" fill="' + ph.sun + '"/>';
    }
    var fb = gy - (o.big ? 118 : o.banner ? 50 : 70), mb = gy - (o.big ? 66 : o.banner ? 28 : 40), nb = gy - (o.big ? 20 : 12);
    a += ridge(w, fb + 6, o.big ? 120 : 64, rng(5), mix(mix(S.pine, ph.haze, 0.82), ph.sky[1], 0.35), 6) +
         ridge(w, fb + 10, o.big ? 74 : 40, rng(9), mix(mix(S.pine, ph.haze, 0.7), ph.sky[1], 0.18), 9);
    html += a + '</svg>';

    /* 2. clouds and birds drift across the sky */
    var nc = o.banner ? 2 : Math.max(2, Math.round(w / 320));
    for (i = 0; i < nc; i++) {
      var cs = 0.7 + r() * 0.8, dur = 120 + i * 41, cx0 = r();
      html += '<div class="scloud" style="top:' + f(14 + r() * (fb * 0.4)) + 'px;--w:' + w + 'px;animation-duration:' + dur + 's;animation-delay:-' + f(cx0 * dur) + 's">' +
        '<svg width="' + f(84 * cs) + '" height="' + f(30 * cs) + '" viewBox="-42 -20 84 30" aria-hidden="true"><g fill="' + ph.cloud + '" opacity=".55"><ellipse cx="0" cy="0" rx="40" ry="8"/><ellipse cx="-14" cy="-6" rx="17" ry="9"/><ellipse cx="10" cy="-8" rx="21" ry="11"/></g></svg></div>';
    }
    if (!o.banner && o.phase !== 'night' && !o.still) {
      html += '<div class="sbird" style="top:' + f(40 + r() * 30) + 'px;--w:' + w + 'px"><svg width="46" height="26" viewBox="-24 -8 48 26" aria-hidden="true"><path d="M-7 0q3.5 -4.5 7 0q3.5 -4.5 7 0M9 9q2.6 -3.4 5.2 0q2.6 -3.4 5.2 0M-22 12q2.4 -3 4.8 0q2.4 -3 4.8 0" stroke="' + mix(ph.sky[0], '#0b1512', 0.7) + '" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg></div>';
    }

    /* 3. forest, light, ground, decorations */
    var snow = shade('#f2f7f8');
    var layer = function (hazeT, darkT) {
      var p = mix(mix(S.pine, ph.haze, hazeT), '#07130e', darkT), rd = mix(mix(S.round, ph.haze, hazeT), '#07130e', darkT * 0.6);
      return { pine: p, pineLit: mix(p, ph.sun, 0.3), round: rd, roundLit: mix(rd, ph.sun, 0.34), trunk: mix(p, '#1c120a', 0.45),
               hill: mix(p, S.snow ? shade('#c6d5da') : p, 0.5), snow: mix(snow, ph.haze, hazeT * 0.5) };
    };
    var b = svgOpen('s-forest') + '<defs>' + P.defs +
      '<radialGradient id="lamp"><stop offset="0" stop-color="#ffdf8a" stop-opacity=".8"/><stop offset="1" stop-color="#ffdf8a" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + ph.haze + '" stop-opacity="0"/><stop offset="1" stop-color="' + mix(ph.haze, '#ffffff', 0.35) + '" stop-opacity=".5"/></linearGradient>' +
      '<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + ph.sun + '" stop-opacity=".24"/><stop offset="1" stop-color="' + ph.sun + '" stop-opacity="0"/></linearGradient></defs>';
    b += forest(w, fb, o.big ? 24 : 16, o.big ? 52 : 34, o.big ? 15 : 11, rng(11), layer(0.66, 0), S, 0) +
         '<rect x="0" y="' + (fb - 30) + '" width="' + w + '" height="' + (mb - fb + 34) + '" fill="url(#mist)"/>' +
         forest(w, mb, o.big ? 44 : 28, o.big ? 86 : 56, o.big ? 26 : 19, rng(21), layer(0.36, 0.08), S, 1);
    if (o.phase !== 'night') {
      [[-0.24, 0.035], [-0.07, 0.02], [0.1, 0.03], [0.29, 0.04]].forEach(function (ry) {
        var bx = cel[0] + ry[0] * w;
        b += '<path d="M' + f(cel[0] - 4) + ' ' + f(cel[1]) + 'L' + f(bx - w * ry[1]) + ' ' + (gy + 8) + 'H' + f(bx + w * ry[1]) + 'L' + f(cel[0] + 4) + ' ' + f(cel[1]) + 'Z" fill="url(#ray)"/>';
      });
    }
    b += '<rect x="0" y="' + (mb - 28) + '" width="' + w + '" height="' + (nb - mb + 30) + '" fill="url(#mist)" opacity=".8"/>' +
         forest(w, nb, o.big ? 70 : 44, o.big ? 150 : 92, o.big ? 46 : 34, rng(31), layer(0.1, 0.3), S, 2);
    /* undergrowth along the foot of the near trees */
    var under = '', underHi = '', lc = layer(0.04, 0.34);
    for (x = -6; x < w + 10; x += 10 + r() * 16) { var br = 7 + r() * 9; under += '<circle cx="' + f(x) + '" cy="' + f(nb + 2) + '" r="' + f(br) + '"/>'; if (r() < 0.5) underHi += '<circle cx="' + f(x - br * 0.25) + '" cy="' + f(nb - br * 0.35) + '" r="' + f(br * 0.45) + '"/>'; }
    b += '<g fill="' + lc.round + '">' + under + '</g><g fill="' + lc.roundLit + '" opacity=".45">' + underHi + '</g>';

    /* where things stand */
    var items = o.items || [], n = items.length || 1, k = Math.max(0.6, Math.min(1.15, w / (n * 150)));
    if (o.big) k = Math.min(k * 1.45, (w / (n + 1)) / 96);
    if (o.banner) k = Math.min(1.2, (h - 30) / 132);
    var slots = items.map(function (_, idx) { return o.banner ? w * 0.84 : w * (idx + 1) / (n + 1); });
    var gap = w / (n + 1), show = o.banner ? {} : (o.decor || {}), dctx = { lit: lit, sky: ph.sky[1] }, flame = null;
    var place = function (d, baseY, scale) {
      var px = (Math.round(d.at * n) + 0.5 + (d.dx || 0)) * gap, res = DECOR[d.id](dctx, S);
      res[1].forEach(function (gl) { if (lit) glow += '<circle cx="' + f(px + gl[0] * scale) + '" cy="' + f(baseY + gl[1] * scale) + '" r="' + f(gl[2] * scale) + '" fill="url(#lamp)"/>'; });
      if (d.id === 'campfire') flame = [px, baseY - 12 * scale, 34 * scale];
      return '<g transform="translate(' + f(px) + ' ' + f(baseY) + ') scale(' + f(scale) + ')">' + res[0] + '</g>';
    };
    var live = 'filter:brightness(' + f(0.5 + dim * 0.5) + ') saturate(' + f(0.6 + dim * 0.4) + ')';

    /* ground: three rolling bands, pools of light, grass, flowers */
    var g1 = shade(S.ground[0]), g2 = shade(S.ground[1]), g3 = shade(S.ground[2]);
    b += '<path d="M0 ' + (gy - 4) + 'Q' + f(w * 0.2) + ' ' + (gy - 13) + ' ' + f(w * 0.45) + ' ' + (gy - 5) + 'T' + w + ' ' + (gy - 8) + 'V' + h + 'H0Z" fill="' + g1 + '"/>' +
         '<path d="M0 ' + (gy + 6) + 'Q' + f(w * 0.3) + ' ' + gy + ' ' + f(w * 0.6) + ' ' + (gy + 6) + 'T' + w + ' ' + (gy + 3) + 'V' + h + 'H0Z" fill="' + g2 + '"/>' +
         '<path d="M0 ' + (gy + 24) + 'Q' + f(w * 0.35) + ' ' + (gy + 16) + ' ' + f(w * 0.7) + ' ' + (gy + 24) + 'T' + w + ' ' + (gy + 20) + 'V' + h + 'H0Z" fill="' + g3 + '"/>';
    if (o.phase !== 'night') for (i = 0; i < Math.round(w / 150); i++) b += '<ellipse cx="' + f(r() * w) + '" cy="' + f(gy + 2 + r() * 12) + '" rx="' + f(30 + r() * 46) + '" ry="' + f(3 + r() * 3) + '" fill="' + ph.sun + '" opacity="' + f(0.07 + r() * 0.08) + '"/>';
    var bgd = '';
    P.decor.forEach(function (d) { if (d.layer === 'bg' && show[d.id]) bgd += place(d, gy - 6, k * 0.95); });
    if (bgd) b += '<g style="' + live + '">' + bgd + '</g>';
    var tufts = '', fl = '', litter = '', fcol = ['#f3e9a8', '#ffffff', '#c9a7ee', '#f0b6c8'];
    for (x = 8; x < w; x += 11 + r() * 24) {
      var th = 5 + r() * 7, ty = gy + 2 + r() * 5;
      tufts += 'M' + f(x) + ' ' + f(ty) + 'l-3 ' + f(-th) + 'M' + f(x) + ' ' + f(ty) + 'l0 ' + f(-th - 2) + 'M' + f(x) + ' ' + f(ty) + 'l3.5 ' + f(-th + 1);
      if (!S.snow && r() < (o.season === 'spring' ? 0.75 : 0.4)) fl += '<circle cx="' + f(x + 6) + '" cy="' + f(ty - 2 - r() * 4) + '" r="1.5" fill="' + fcol[Math.floor(r() * fcol.length)] + '" opacity=".9"/>';
      if (o.season === 'autumn' && r() < 0.6) litter += leaf(x + 3, ty + 1 + r() * 3, 5, 2, r() * 360, ['#d9822b', '#c9552a', '#e8b45a'][Math.floor(r() * 3)]);
    }
    b += '<path d="' + tufts + '" stroke="' + shade(S.grass) + '" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".85"/>' + fl + litter;
    var fgd = '';
    items.forEach(function (it, idx) { fgd += '<ellipse cx="' + f(slots[idx]) + '" cy="' + (gy + 3) + '" rx="' + f(34 * k) + '" ry="' + f(4.6 * k) + '" fill="#081209" opacity=".42"/>'; });
    P.decor.forEach(function (d) { if (d.layer === 'fg' && show[d.id]) fgd += place(d, gy + 2 + (d.dy || 0) * k, k); });
    b += '<g style="' + live + '">' + fgd + '</g>' + glow;
    html += b + '</svg>';

    /* 4. the plants: each one a link with its label */
    var ink = S.snow && o.phase !== 'night' ? ['#30444a', '#16262b'] : ['#c7d8c4', '#f1f6ee'];
    items.forEach(function (it, idx) {
      var bw = 130 * k, left = slots[idx] - bw / 2, top = gy + 2 - 122 * k;
      var art = '<div class="' + (o.grew === it.id ? 'grew' : '') + '"><div class="' + (o.still ? '' : 'sway') + '" style="animation-duration:' + f(5.5 + (idx % 3) * 1.3) + 's;animation-delay:-' + f(idx * 1.7) + 's">' +
        '<svg viewBox="-65 -122 130 132" width="' + f(bw) + '" height="' + f(132 * k) + '" style="' + live + '" aria-hidden="true"><defs>' + P.defs + '</defs>' + P.draw(it.plant, it.stage) + '</svg></div></div>';
      html += o.banner ? '<div class="splant" style="left:' + f(left) + 'px;top:' + f(top) + 'px;width:' + f(bw) + 'px">' + art + '</div>' :
        '<a class="splant" href="#/' + it.id + '" style="left:' + f(left) + 'px;top:' + f(top) + 'px;width:' + f(bw) + 'px" aria-label="' + it.name + ', level ' + it.level + '">' + art +
        '<span class="plab" style="top:' + f(122 * k + 8) + 'px"><span class="pn" style="color:' + ink[0] + '">' + it.name + '</span><span class="pl" style="color:' + ink[1] + '">Lv ' + it.level + '</span></span></a>';
    });

    /* 5. small life */
    if (show.butterflies && !lit && !S.snow && !o.still) {
      items.slice(0, 4).forEach(function (it, idx) {
        html += '<div class="sfly" style="left:' + f(slots[idx] + (idx % 2 ? 26 : -34) * k) + 'px;top:' + f(gy - 44 * k - idx * 6) + 'px;animation-delay:-' + f(idx * 2.3) + 's">' +
          '<svg class="flap" width="14" height="12" viewBox="-7 -7 14 12" aria-hidden="true"><path d="M0 0q-5 -6 -6 0q1 5 6 0q5 -6 6 0q-1 5 -6 0" fill="' + ['#f4c531', '#9db4f5', '#f08a6a', '#e39ac8'][idx % 4] + '"/></svg></div>';
      });
    }
    if (flame && lit && !o.still) html += '<i class="sflame" style="left:' + f(flame[0] - flame[2]) + 'px;top:' + f(flame[1] - flame[2]) + 'px;width:' + f(flame[2] * 2) + 'px;height:' + f(flame[2] * 2) + 'px"></i>';
    if (lit && !S.snow) for (i = 0; i < Math.round(w / 70); i++) html += '<i class="' + (o.still ? 'ffs' : 'ff') + '" style="left:' + f(r() * w) + 'px;top:' + f(gy - 6 - r() * 76) + 'px;animation-delay:' + f(-r() * 6) + 's"></i>';

    /* 6. the frame: trunks at the edges, leaves hanging in from the top corners, dark grass at the bottom corners */
    var cols = [mix('#0d2416', '#06100c', 1 - dim), mix('#17381f', '#06100c', 1 - dim), mix('#234f2c', '#06100c', 1 - dim), mix('#2f6a3a', '#06100c', 1 - dim)];
    if (o.season === 'autumn') cols[3] = mix('#8a5a22', '#06100c', 1 - dim);
    var c = svgOpen('s-frame'), span = Math.min(w * 0.34, 330), depth = o.banner ? 34 : o.big ? 78 : 58, tw = narrow ? 7 : Math.max(12, Math.min(40, w * 0.036));
    if (!o.banner) c += edgeTrunk(w, h, 0, tw, rng(51), mix('#17100a', '#050806', 1 - dim)) + edgeTrunk(w, h, 1, tw * 0.8, rng(52), mix('#17100a', '#050806', 1 - dim));
    c += canopy(w, rng(61), 0, cols, span, depth) + (o.banner ? '' : canopy(w, rng(62), 1, cols, span * 0.8, depth * 0.85));
    if (!o.banner && !narrow) {   /* left out on a phone, where it would cover the outer plant labels */
      var bl = '';
      [[0, 1], [w, -1]].forEach(function (cn) {
        for (i = 0; i < 9; i++) { var bh = 26 + r() * 34, bxx = cn[0] + cn[1] * (r() * 50 - 4); bl += 'M' + f(bxx) + ' ' + h + 'Q' + f(bxx + cn[1] * bh * 0.1) + ' ' + f(h - bh * 0.6) + ' ' + f(bxx + cn[1] * bh * 0.45) + ' ' + f(h - bh) + 'Q' + f(bxx + cn[1] * bh * 0.2) + ' ' + f(h - bh * 0.5) + ' ' + f(bxx + cn[1] * 5) + ' ' + h + 'Z'; }
      });
      c += '<path d="' + bl + '" fill="' + cols[0] + '"/>';
    }
    html += c + '</svg>';

    /* 7. whatever is falling this season */
    if (!o.still) {
      var kind = S.fall, count = Math.round(w / (kind === 'mote' ? 90 : o.banner ? 120 : 60)), pal = { leaf: ['#d9822b', '#c9552a', '#e8b45a', '#a8482b'], petal: ['#f6bdd3', '#fbdbe5', '#f4a9c4'], snow: ['#ffffff'], mote: ['#fff3c4'] }[kind];
      for (i = 0; i < count; i++) {
        var fd = kind === 'snow' ? 9 + r() * 8 : kind === 'mote' ? 16 + r() * 12 : 8 + r() * 9;
        html += '<i class="fall ' + kind + '" style="--x:' + f(r() * w) + 'px;--dx:' + f((r() - 0.3) * 90) + 'px;--h:' + (h - 26) + 'px;--r:' + Math.round(200 + r() * 500) + 'deg;background:' + pal[Math.floor(r() * pal.length)] +
          ';animation-duration:' + f(fd) + 's;animation-delay:-' + f(r() * fd) + 's"></i>';
      }
    }
    return '<div class="sc ' + o.phase + (o.banner ? ' sbanner' : '') + '" style="width:' + w + 'px;height:' + h + 'px"' + (o.banner ? ' aria-hidden="true"' : '') + '>' + html + '</div>';
  };
})();
