/* Grove plants: SVG art for each plant at growth stages 0..5, and the grove scene.
   Every plant is drawn with its base at (0,0), growing upward (negative y), up to about 110 tall.
   To add a plant: write a function (stage) -> SVG markup, then add it to DRAW and P.list.
   Shared gradients live in P.defs and must be inside the <defs> of any SVG that draws a plant. */
(function () {
  'use strict';
  var P = LD.plants = {};
  var g = { dd: '#1f4a2e', d: '#2c5a38', m: '#3f7d45', l: '#6aa84f', xl: '#a7c957', bark: '#5a4230', barkd: '#3f2d20' };
  var f = function (n) { return Math.round(n * 10) / 10; };

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  P.defs =
    '<linearGradient id="pg-trunk" x1="0" x2="1"><stop offset="0" stop-color="#80624a"/><stop offset="1" stop-color="#43301f"/></linearGradient>' +
    '<linearGradient id="pg-birch" x1="0" x2="1"><stop offset="0" stop-color="#f6f3e8"/><stop offset="1" stop-color="#c2bdae"/></linearGradient>' +
    '<linearGradient id="pg-stem" x1="0" x2="1"><stop offset="0" stop-color="#f6eedb"/><stop offset="1" stop-color="#c9bc9b"/></linearGradient>' +
    '<radialGradient id="pg-capA" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e8744a"/><stop offset="1" stop-color="#9c3a26"/></radialGradient>' +
    '<radialGradient id="pg-capB" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#eeaa62"/><stop offset="1" stop-color="#b0622c"/></radialGradient>' +
    '<radialGradient id="pg-capC" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#cf6046"/><stop offset="1" stop-color="#82291f"/></radialGradient>' +
    '<radialGradient id="pg-berry" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e4668a"/><stop offset="1" stop-color="#96284c"/></radialGradient>';

  /* ---- shared pieces ---- */
  function leaf(x, y, len, wid, ang, fill, vein) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(ang) + ')"><path d="M0 0Q' + f(len * 0.45) + ' ' + f(-wid) + ' ' + f(len) + ' 0Q' + f(len * 0.45) + ' ' + f(wid) + ' 0 0Z" fill="' + fill + '"/>' +
      (vein ? '<path d="M1 0H' + f(len * 0.85) + '" stroke="' + vein + '" stroke-width=".7"/>' : '') + '</g>';
  }
  function mound(w, col) {
    return '<ellipse cx="0" cy="0" rx="' + w + '" ry="' + f(w * 0.24) + '" fill="' + (col || '#3b2e22') + '"/>';
  }
  function moss(w, n, seed) {
    var r = rng(seed), out = '<ellipse cx="0" cy="0" rx="' + w + '" ry="' + f(w * 0.2) + '" fill="#4d7434"/><ellipse cx="' + f(-w * 0.15) + '" cy="-1" rx="' + f(w * 0.7) + '" ry="' + f(w * 0.12) + '" fill="#6a9440"/>';
    for (var i = 0; i < n; i++) { var x = (r() * 2 - 1) * w * 0.9; out += leaf(x, 0, 4 + r() * 5, 1.3, -90 + (r() - 0.5) * 50, r() < 0.5 ? g.l : g.m); }
    return out;
  }
  function sprout() {
    return mound(11) + '<path d="M0 -1C0 -6 0.5 -10 0 -15" stroke="' + g.l + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      leaf(0, -13, 13, 4.5, -152, g.l, g.m) + leaf(0, -13, 14, 5, -30, g.xl, g.l) + leaf(0, -15, 6, 2.2, -90, g.xl);
  }

  /* ---- fern ---- */
  function frond(a, L, col, hi) {
    var sx = Math.sin(a), cx = Math.cos(a);
    var E = [sx * L, -cx * L * 0.85 - L * 0.1], Cc = [sx * L * 0.25, -L * 0.82];
    var m = Math.max(5, Math.round(L / 5)), d = '';
    for (var k = 1; k <= m; k++) {
      var t = 0.1 + 0.88 * k / (m + 0.5), u = 1 - t;
      var bx = 2 * u * t * Cc[0] + t * t * E[0], by = 2 * u * t * Cc[1] + t * t * E[1];
      var tx = 2 * (1 - 2 * t) * Cc[0] + 2 * t * E[0], ty = 2 * (1 - 2 * t) * Cc[1] + 2 * t * E[1];
      var tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
      var len = L * 0.21 * (0.3 + Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.95) * (1 - 0.35 * t);
      [1, -1].forEach(function (sg) {
        d += 'M' + f(bx) + ' ' + f(by) + 'l' + f((-ty * sg * 0.9 + tx * 0.45) * len) + ' ' + f((tx * sg * 0.9 + ty * 0.45) * len);
      });
    }
    var rib = 'M0 0Q' + f(Cc[0]) + ' ' + f(Cc[1]) + ' ' + f(E[0]) + ' ' + f(E[1]);
    return '<path d="' + d + '" stroke="' + col + '" stroke-width="' + f(Math.max(1.8, L * 0.055)) + '" stroke-linecap="round" fill="none"/>' +
           '<path d="' + d + '" stroke="' + hi + '" stroke-width="' + f(Math.max(0.6, L * 0.016)) + '" stroke-linecap="round" fill="none" opacity=".75"/>' +
           '<path d="' + rib + '" stroke="' + g.dd + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
  }
  function fiddle(x, h, flip) {
    return '<path transform="translate(' + f(x) + ' 0) scale(' + (flip ? -1 : 1) + ' 1)" d="M0 0C-1 ' + f(-h * 0.5) + ' 1 ' + f(-h * 0.85) + ' 4 ' + f(-h) +
      'c3.6 -1.8 6.2 1.6 4.4 4.2c-1.6 1.8 -4.2 .8 -3.4 -1.6" stroke="' + g.xl + '" stroke-width="2.1" fill="none" stroke-linecap="round"/>';
  }
  function fern(st) {
    if (!st) return mound(10) + fiddle(-2, 15) + fiddle(3, 9, true);
    var n = [0, 3, 5, 7, 9, 11][st], len = [0, 30, 44, 58, 72, 86][st], out = moss(9 + st * 3, 4 + st, 4);
    var order = [], i;
    for (i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2); });
    order.forEach(function (i) {
      var t = (i / (n - 1)) * 2 - 1, back = Math.abs(t) > 0.55;
      out += frond(t * 1.25, len * (1 - 0.22 * Math.abs(t)) * (0.9 + ((i * 37) % 10) / 60), back ? g.d : i % 2 ? g.m : '#4a8f4c', back ? g.m : g.xl);
    });
    if (st >= 2) out += fiddle(-3, 10 + st * 2.5) + fiddle(4, 7 + st * 2, true);
    return out;
  }

  /* ---- pine ---- */
  function bough(yTop, yBot, w, teeth, dark, light) {
    var n = teeth * 2, full = 'M0 ' + f(yTop), half = 'M0 ' + f(yTop), h = yBot - yTop;
    for (var i = 0; i <= n; i++) {
      var x = -w / 2 + w * i / n, edge = Math.abs(x) / (w / 2), y = i % 2 ? yBot - h * 0.2 : yBot - (1 - edge) * h * 0.1;
      full += 'L' + f(x) + ' ' + f(y);
      if (i <= teeth) half += 'L' + f(x) + ' ' + f(y);
    }
    return '<path d="' + full + 'Z" fill="' + dark + '" stroke="' + dark + '" stroke-width="1.2" stroke-linejoin="round"/><path d="' + half + 'Z" fill="' + light + '"/>';
  }
  function pine(st) {
    var out = '', i;
    if (!st) {
      out = mound(10) + '<path d="M0 -1V-12" stroke="' + g.bark + '" stroke-width="1.6" stroke-linecap="round"/>';
      for (i = 0; i < 7; i++) { var a = (-160 + i * 23.3) * Math.PI / 180; out += '<path d="M0 -11L' + f(Math.cos(a) * 9) + ' ' + f(-11 + Math.sin(a) * 9) + '" stroke="' + (i % 2 ? g.l : g.m) + '" stroke-width="1.5" stroke-linecap="round"/>'; }
      return out;
    }
    var tiers = [0, 2, 3, 4, 5, 6][st], s = [0, 0.5, 0.62, 0.76, 0.88, 1][st], th = 15 * s, bw = 70 * s, tH = 27 * s, r = rng(3);
    out += '<path d="M' + f(-4.8 * s) + ' 0C' + f(-3.2 * s) + ' ' + f(-th * 0.4) + ' ' + f(-2.8 * s) + ' ' + f(-th * 0.8) + ' ' + f(-2.6 * s) + ' ' + f(-th - 3) + 'H' + f(2.6 * s) +
           'C' + f(2.8 * s) + ' ' + f(-th * 0.8) + ' ' + f(3.2 * s) + ' ' + f(-th * 0.4) + ' ' + f(5.2 * s) + ' 0Z" fill="url(#pg-trunk)"/>';
    for (i = 0; i < tiers; i++) {
      var yBot = -th - i * tH * 0.6 + 3, w = bw * (1 - i / (tiers + 0.6)), yTop = yBot - tH * (i === tiers - 1 ? 1.2 : 1);
      var teeth = Math.max(2, 2 * Math.round((2 + tiers - i) / 2));
      if (i) out += '<path d="M' + f(-w * 0.44) + ' ' + f(yBot + 1) + 'Q0 ' + f(yBot + 6 * s) + ' ' + f(w * 0.44) + ' ' + f(yBot + 1) + '" stroke="#102a1b" stroke-width="' + f(3.4 * s) + '" fill="none" opacity=".55" stroke-linecap="round"/>';
      out += bough(yTop, yBot, w, teeth, i % 2 ? '#24523a' : '#1f4a2e', i % 2 ? '#4c8a52' : '#3f7d45');
      var d = '';
      for (var k = 0; k < 5; k++) {
        var yy = yTop + (yBot - yTop) * (0.42 + r() * 0.42), half = (w / 2) * (yy - yTop) / (yBot - yTop);
        d += 'M' + f(-half * (0.15 + r() * 0.6)) + ' ' + f(yy) + 'l' + f(-2.6 * s) + ' ' + f(3 * s) + 'M' + f(half * (0.15 + r() * 0.6)) + ' ' + f(yy) + 'l' + f(2.6 * s) + ' ' + f(3 * s);
      }
      out += '<path d="' + d + '" stroke="#b9d77a" stroke-width="' + f(1.1 * s) + '" stroke-linecap="round" opacity=".4" fill="none"/>';
    }
    if (st >= 4) [[-0.22, 1], [0.25, 2], [-0.12, 3]].forEach(function (c) {
      out += '<ellipse cx="' + f(bw * c[0] * (1 - c[1] / (tiers + 0.6))) + '" cy="' + f(-th - c[1] * tH * 0.6 + 7 * s) + '" rx="' + f(1.9 * s) + '" ry="' + f(3.4 * s) + '" fill="#7a5235"/>';
    });
    return out;
  }

  /* ---- broadleaf trees: oak (green) and maple (autumn) ---- */
  function broadleaf(st, pal, seed, fruit) {
    if (!st) return sprout();
    var s = [0, 0.42, 0.58, 0.74, 0.88, 1][st], r = rng(seed), out = '<g transform="scale(' + s + ')">';
    out += '<path d="M-8 0C-5.5 -8 -5 -20 -5 -36L-13 -52L-10 -54L-3 -44L-1.5 -60H2L3.5 -44L11 -54L14 -52L5.5 -36C5.5 -20 6 -8 9 0Z" fill="url(#pg-trunk)"/>' +
           '<path d="M-2 -6v-9M1.5 -18v-8M-1 -30v-6M3 -8v-5" stroke="' + g.barkd + '" stroke-width="1" stroke-linecap="round" opacity=".7"/>';
    var cl = [[0, -74, 22], [-22, -62, 19], [22, -62, 19], [0, -56, 17], [-34, -46, 14], [34, -46, 14], [-10, -90, 16], [12, -92, 15]].slice(0, [0, 3, 4, 6, 8, 8][st]);
    cl.forEach(function (c) { out += '<circle cx="' + (c[0] + 2) + '" cy="' + (c[1] + 4) + '" r="' + c[2] + '" fill="' + pal.dd + '"/>'; });
    cl.forEach(function (c) { out += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + f(c[2] * 0.94) + '" fill="' + pal.d + '"/>'; });
    cl.forEach(function (c) {
      for (var i = 0; i < 7; i++) {
        var a = -Math.PI * (0.15 + r() * 0.95), d = c[2] * (0.35 + r() * 0.5);
        out += '<circle cx="' + f(c[0] + Math.cos(a) * d) + '" cy="' + f(c[1] + Math.sin(a) * d) + '" r="' + f(c[2] * (0.22 + r() * 0.16)) + '" fill="' + (i < 4 ? pal.m : pal.l) + '"/>';
      }
    });
    cl.forEach(function (c) {
      for (var i = 0; i < 6; i++) {
        var a = r() * Math.PI * 2, d = Math.sqrt(r()) * c[2] * 0.85, x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d;
        out += leaf(x, y, 5 + r() * 3, 2.2, r() * 360, y < c[1] ? pal.xl : pal.m);
      }
    });
    if (fruit && st >= 4) cl.slice(0, 5).forEach(function (c) { out += '<circle cx="' + f(c[0] + (r() - 0.5) * c[2]) + '" cy="' + f(c[1] + c[2] * 0.45) + '" r="2" fill="' + fruit + '"/>'; });
    return out + '</g>';
  }
  var OAK = { dd: '#1a3f27', d: '#2c5a38', m: '#3f7d45', l: '#6aa84f', xl: '#8fbf5a' };
  var MAPLE = { dd: '#6b2318', d: '#9c3520', m: '#c9552a', l: '#e78a3c', xl: '#f2b354' };

  /* ---- birch ---- */
  function birch(st) {
    if (!st) return sprout();
    var s = [0, 0.45, 0.6, 0.75, 0.88, 1][st], r = rng(31), out = '<g transform="scale(' + s + ')">', i;
    out += '<path d="M0 -52Q-13 -60 -21 -58M0 -64Q13 -72 22 -68M0 -76Q-11 -86 -17 -84M0 -86Q9 -96 14 -95" stroke="#9a9485" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
           '<path d="M-4.4 0C-3.2 -30 -2.6 -62 -1.6 -100H1.6C2.6 -62 3.2 -30 4.8 0Z" fill="url(#pg-birch)"/>';
    for (i = 0; i < 11; i++) { var y = -6 - i * 8.2 - r() * 3, lft = r() < 0.5; out += '<path d="M' + (lft ? -3.4 : 0.4) + ' ' + f(y) + 'l' + f(2.2 + r() * 1.6) + ' ' + f((r() - 0.5) * 1.2) + '" stroke="#34332e" stroke-width="' + f(0.9 + r() * 0.8) + '" stroke-linecap="round"/>'; }
    var n = 34 + st * 24, cols = ['#7fb24f', '#a7c957', '#6aa84f', '#c4d867', '#8fbf5a'];
    for (i = 0; i < n; i++) {
      var a = r() * Math.PI * 2, d = Math.sqrt(r()), x = Math.cos(a) * d * 27, yy = -72 + Math.sin(a) * d * 34;
      out += leaf(x, yy, 5 + r() * 2.5, 2.1, 60 + r() * 60, cols[Math.floor(r() * cols.length)]);
    }
    return out + '</g>';
  }

  /* ---- bamboo ---- */
  function bamboo(st) {
    if (!st) return sprout();
    var n = [0, 2, 3, 4, 5, 6][st], r = rng(9), out = moss(8 + n * 2.5, 3 + n, 6), i, k;
    for (i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * 9 + (r() - 0.5) * 3, h = (40 + st * 13) * (0.7 + r() * 0.35), segs = Math.max(3, Math.round(h / 12)), lean = (r() - 0.5) * 9, col = i % 2 ? '#5f9e45' : '#6fae4a';
      for (k = 0; k < segs; k++) {
        var t0 = k / segs, t1 = (k + 1) / segs, x0 = x + lean * t0 * t0, x1 = x + lean * t1 * t1, y0 = -h * t0, y1 = -h * t1 + 1.6;
        out += '<path d="M' + f(x0) + ' ' + f(y0) + 'L' + f(x1) + ' ' + f(y1) + '" stroke="' + col + '" stroke-width="3.6" stroke-linecap="round"/>' +
               '<path d="M' + f(x0 - 0.9) + ' ' + f(y0 - 1) + 'L' + f(x1 - 0.9) + ' ' + f(y1 + 1) + '" stroke="#b5dc80" stroke-width=".9" stroke-linecap="round" opacity=".7"/>';
        if (k >= segs - 3 && k > 0) {
          var sd = (k + i) % 2 ? 1 : -1;
          out += leaf(x0, y0, 13 + r() * 5, 2.3, sd > 0 ? -18 - r() * 25 : 198 + r() * 25, g.l, g.m) + leaf(x0, y0, 10 + r() * 4, 2, sd > 0 ? 12 + r() * 20 : 168 - r() * 20, g.xl);
        }
      }
      out += leaf(x + lean, -h, 12, 2.2, -70 + lean * 3, g.xl) + leaf(x + lean, -h, 10, 2, -115 + lean * 3, g.l);
    }
    return out;
  }

  /* ---- berry bush ---- */
  function berry(st) {
    if (!st) return sprout();
    var s = [0, 0.55, 0.75, 0.95, 1.15, 1.35][st], r = rng(77), out = '<g transform="scale(' + s + ')">';
    var blobs = [[0, -20, 22], [-22, -14, 16], [22, -14, 16], [-11, -33, 14], [12, -34, 14], [0, -43, 10]].slice(0, [0, 3, 4, 5, 6, 6][st]);
    out += '<path d="M0 0C-2 -8 -8 -12 -16 -16M0 0C1 -10 0 -18 0 -26M0 0C3 -8 9 -12 17 -15" stroke="' + g.bark + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    blobs.forEach(function (b) { out += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="' + g.dd + '"/>'; });
    var leaves = [];
    blobs.forEach(function (b) {
      var n = Math.round(b[2] * 1.5);
      for (var i = 0; i < n; i++) { var a = r() * Math.PI * 2, d = Math.sqrt(r()) * b[2] * 0.98; leaves.push([b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d, a, r(), r()]); }
    });
    leaves.sort(function (p, q) { return q[1] - p[1]; });
    leaves.forEach(function (p) {
      var t = Math.max(0, Math.min(1, -p[1] / 50)), col = p[3] < 0.22 ? g.d : t > 0.55 ? (p[3] < 0.5 ? g.xl : g.l) : t > 0.28 ? g.l : g.m;
      out += leaf(p[0], p[1], 7 + p[4] * 3, 2.7 + p[4], p[2] * 180 / Math.PI, col, p[3] > 0.6 ? g.d : null);
    });
    var pts = [[-6, -18], [10, -24], [-19, -12], [21, -11], [2, -33], [-12, -30], [14, -37], [-27, -19], [27, -18], [6, -10], [-3, -44], [-13, -7], [17, -3]], left = [0, 2, 4, 7, 10, 13][st];
    pts.forEach(function (p) {
      if (!left) return;
      if (!blobs.some(function (b) { return Math.sqrt(Math.pow(p[0] - b[0], 2) + Math.pow(p[1] - b[1], 2)) < b[2] - 2; })) return;
      left--;
      [[0, 0, 3], [3.6, 1.6, 2.5], [-1.2, 3.8, 2.3]].forEach(function (o) {
        out += '<circle cx="' + f(p[0] + o[0]) + '" cy="' + f(p[1] + o[1]) + '" r="' + o[2] + '" fill="url(#pg-berry)"/><circle cx="' + f(p[0] + o[0] - o[2] * 0.3) + '" cy="' + f(p[1] + o[1] - o[2] * 0.35) + '" r="' + f(o[2] * 0.25) + '" fill="#fbdbe5"/>';
      });
    });
    return out + '</g>';
  }

  /* ---- mushroom ring ---- */
  function shroom(x, k, cap) {
    var w = 13 * k, h = 22 * k, i, out;
    out = '<path d="M' + f(x - 3.2 * k) + ' 0C' + f(x - 3.6 * k) + ' ' + f(-h * 0.5) + ' ' + f(x - 2.4 * k) + ' ' + f(-h * 0.8) + ' ' + f(x - 2.3 * k) + ' ' + f(-h) +
          'H' + f(x + 2.3 * k) + 'C' + f(x + 2.4 * k) + ' ' + f(-h * 0.8) + ' ' + f(x + 3.6 * k) + ' ' + f(-h * 0.5) + ' ' + f(x + 3.2 * k) + ' 0Z" fill="url(#pg-stem)"/>' +
          '<ellipse cx="' + f(x) + '" cy="' + f(-h * 0.62) + '" rx="' + f(3.9 * k) + '" ry="' + f(1.4 * k) + '" fill="#e6dabd"/>' +
          '<ellipse cx="' + f(x) + '" cy="' + f(-h + 2.4 * k) + '" rx="' + f(w * 0.93) + '" ry="' + f(3.4 * k) + '" fill="#d6c59f"/>';
    var gl = '';
    for (i = -4; i <= 4; i++) if (i) gl += 'M' + f(x + i * 0.5 * k) + ' ' + f(-h + 1.2 * k) + 'L' + f(x + i * w * 0.21) + ' ' + f(-h + 4.6 * k);
    out += '<path d="' + gl + '" stroke="#b09c72" stroke-width="' + f(0.5 * k) + '" fill="none"/>' +
           '<path d="M' + f(x - w) + ' ' + f(-h + 2 * k) + 'C' + f(x - w) + ' ' + f(-h - 15 * k) + ' ' + f(x + w) + ' ' + f(-h - 15 * k) + ' ' + f(x + w) + ' ' + f(-h + 2 * k) +
           'Q' + f(x) + ' ' + f(-h + 5 * k) + ' ' + f(x - w) + ' ' + f(-h + 2 * k) + 'Z" fill="url(#' + cap + ')"/>' +
           '<path d="M' + f(x - w) + ' ' + f(-h + 2 * k) + 'Q' + f(x) + ' ' + f(-h + 5 * k) + ' ' + f(x + w) + ' ' + f(-h + 2 * k) + '" stroke="#5e1f15" stroke-width="' + f(0.9 * k) + '" fill="none" opacity=".45"/>' +
           '<ellipse cx="' + f(x - 4 * k) + '" cy="' + f(-h - 7 * k) + '" rx="' + f(5 * k) + '" ry="' + f(2.4 * k) + '" fill="#fff" opacity=".13" transform="rotate(-18 ' + f(x - 4 * k) + ' ' + f(-h - 7 * k) + ')"/>';
    [[-6, -4.4, 2, 1.6], [3.5, -7.2, 1.7, 1.3], [8, -2, 1.3, 1], [-1.5, -1.2, 1.2, 0.9], [-9.5, -0.6, 1, 0.8]].forEach(function (sp) {
      out += '<ellipse cx="' + f(x + sp[0] * k) + '" cy="' + f(-h + sp[1] * k) + '" rx="' + f(sp[2] * k) + '" ry="' + f(sp[3] * k) + '" fill="#f6ecd4" opacity=".9"/>';
    });
    return out;
  }
  function mushroom(st) {
    var specs = [[0, 1, 'pg-capA'], [-17, 0.68, 'pg-capB'], [16, 0.8, 'pg-capC'], [-30, 0.5, 'pg-capB'], [29, 0.55, 'pg-capA'], [7, 0.42, 'pg-capB']];
    var s = [0.75, 1, 1.2, 1.4, 1.6, 1.8][st], n = st + 1;
    var out = '<g transform="scale(' + s + ')">' + moss(12 + n * 5, 5 + n * 2, 8);
    specs.slice(0, n).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (m) { out += shroom(m[0], m[1], m[2]); });
    return out + '</g>';
  }

  /* ---- sunflower ---- */
  function sunflower(st) {
    if (!st) return sprout();
    var n = [0, 1, 1, 2, 3, 3][st], hh = [0, 34, 58, 78, 94, 106][st], R = [0, 6, 8.5, 10, 11.5, 13][st], out = moss(8 + n * 4, 4 + n, 12), i, k;
    for (i = 0; i < n; i++) {
      var mid = (n - 1) / 2, x = (i - mid) * 22, h = hh * (i === Math.round(mid) ? 1 : 0.76), lean = (i - mid) * 5, rr = R * (i === Math.round(mid) ? 1 : 0.82);
      out += '<path d="M' + f(x) + ' 0Q' + f(x + lean * 0.2) + ' ' + f(-h * 0.5) + ' ' + f(x + lean) + ' ' + f(-h) + '" stroke="#4f8a3a" stroke-width="2.8" fill="none" stroke-linecap="round"/>';
      [0.28, 0.48, 0.68].forEach(function (t, j) {
        if (h * t < 12) return;
        out += leaf(x + lean * t * t, -h * t, 13 + h * 0.06, 5.5, j % 2 ? -28 : 208, j % 2 ? g.m : '#4a8f4c', g.d);
      });
      var cx = x + lean, cy = -h;
      for (k = 0; k < 14; k++) out += leaf(cx, cy, rr * 1.9, rr * 0.34, k * 360 / 14 + 13, '#dd9f1c');
      for (k = 0; k < 14; k++) out += leaf(cx, cy, rr * 1.75, rr * 0.32, k * 360 / 14, '#f4c531');
      out += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(rr * 0.72) + '" fill="#6b4423"/><circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(rr * 0.4) + '" fill="#4a2e17"/>' +
             '<circle cx="' + f(cx - rr * 0.2) + '" cy="' + f(cy - rr * 0.22) + '" r="' + f(rr * 0.5) + '" fill="none" stroke="#8a5a2c" stroke-width=".8" stroke-dasharray="1 1.6"/>';
    }
    return out;
  }

  /* ---- bell flowers: bluebell / foxglove ---- */
  function flower(st, col, col2) {
    if (!st) return sprout();
    var n = st + 1, r = rng(11), out = moss(7 + n * 3, 3 + n, 14);
    for (var i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * 10, h = (34 + st * 11) * (0.75 + r() * 0.35), lean = (i - (n - 1) / 2) * 3 + (r() - 0.5) * 6;
      out += leaf(x, 0, 18 + st * 2, 3, -112 - r() * 20, g.d, g.dd) + leaf(x, 0, 16 + st * 2, 2.8, -62 + r() * 18, g.m) +
             '<path d="M' + f(x) + ' 0Q' + f(x + lean * 0.2) + ' ' + f(-h * 0.6) + ' ' + f(x + lean) + ' ' + f(-h) + '" stroke="' + g.m + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
      var blooms = 3 + Math.min(4, st);
      for (var b = 0; b < blooms; b++) {
        var t = 1 - b * 0.11, bx = x + lean * t * t, by = -h * t, side = b % 2 ? 1 : -1, sc = 0.75 + b * 0.07;
        out += '<path d="M' + f(bx) + ' ' + f(by) + 'q' + (side * 3) + ' -1 ' + (side * 4.4) + ' 1.4" stroke="' + g.m + '" stroke-width="1" fill="none"/>' +
               '<path transform="translate(' + f(bx + side * 4.4) + ' ' + f(by + 1.2) + ') rotate(' + (side * -14) + ') scale(' + f(sc) + ')" d="M-2.4 0Q-3 4 -3.9 6.6Q-1.9 5.3 0 6.8Q1.9 5.3 3.9 6.6Q3 4 2.4 0Q0 -1.7 -2.4 0Z" fill="' + (b % 3 ? col : col2) + '"/>';
      }
    }
    return out;
  }

  /* ---- reeds ---- */
  function reed(st) {
    if (!st) return sprout();
    var n = st + 2, r = rng(5), out = '<ellipse cx="0" cy="1" rx="' + (16 + n * 3) + '" ry="4" fill="#27506a" opacity=".55"/><ellipse cx="-4" cy="0.5" rx="' + (8 + n) + '" ry="1.6" fill="#7fb6cf" opacity=".3"/>';
    for (var i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * 8, h = (36 + st * 11) * (0.7 + r() * 0.4), lean = (r() - 0.5) * 10;
      out += leaf(x, 0, h * 0.8, 2.2, -90 + lean * 2.4 - 14, g.d) + leaf(x, 0, h * 0.7, 2, -90 + lean * 2.4 + 16, g.m) +
             '<path d="M' + f(x) + ' 0Q' + f(x + lean * 0.3) + ' ' + f(-h * 0.6) + ' ' + f(x + lean) + ' ' + f(-h) + '" stroke="' + (i % 2 ? g.m : g.l) + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
      if (i % 2 === 0) out += '<path d="M' + f(x + lean) + ' ' + f(-h) + 'v-7" stroke="' + g.l + '" stroke-width="1.1" stroke-linecap="round"/><rect x="' + f(x + lean - 2.6) + '" y="' + f(-h - 2) + '" width="5.2" height="14" rx="2.6" fill="#7a5235"/>' +
             '<rect x="' + f(x + lean - 2.6) + '" y="' + f(-h - 2) + '" width="2" height="14" rx="1" fill="#9a6d49" opacity=".7"/>';
    }
    return out;
  }

  var DRAW = {
    fern: fern, pine: pine, berry: berry, mushroom: mushroom, reed: reed, birch: birch, bamboo: bamboo, sunflower: sunflower,
    oak: function (st) { return broadleaf(st, OAK, 17, '#8a6a3c'); },
    maple: function (st) { return broadleaf(st, MAPLE, 23); },
    bluebell: function (st) { return flower(st, '#7c9df0', '#a9bdf7'); },
    foxglove: function (st) { return flower(st, '#d977b5', '#eaa6d2'); }
  };
  /* id, label for menus, name used in sentences ("Your fern grew") */
  P.list = [
    ['fern', 'Fern', 'fern'], ['pine', 'Pine', 'pine'], ['oak', 'Oak', 'oak'], ['maple', 'Autumn maple', 'maple'], ['birch', 'Birch', 'birch'],
    ['bamboo', 'Bamboo', 'bamboo'], ['berry', 'Berry bush', 'berry bush'], ['mushroom', 'Mushroom ring', 'mushroom ring'],
    ['sunflower', 'Sunflowers', 'sunflowers'], ['bluebell', 'Bluebells', 'bluebells'], ['foxglove', 'Foxgloves', 'foxgloves'], ['reed', 'Reeds', 'reeds']
  ];
  P.names = {};
  P.list.forEach(function (p) { P.names[p[0]] = p[2]; });

  P.draw = function (plant, stage) { return (DRAW[plant] || DRAW.fern)(Math.max(0, Math.min(5, stage))); };

  /* one plant on its own patch of ground */
  P.single = function (plant, stage, size) {
    return '<svg class="plantsolo" viewBox="-65 -122 130 132" width="' + size + '" height="' + size + '" role="img" aria-label="' + (P.names[plant] || plant) + ', growth stage ' + (stage + 1) + ' of 6">' +
           '<defs>' + P.defs + '</defs><ellipse cx="0" cy="1" rx="48" ry="7" fill="#101d14"/><ellipse cx="0" cy="0" rx="42" ry="5.5" fill="#2a4a2c"/>' + P.draw(plant, stage) + '</svg>';
  };

  /* a line of background trees: mostly conifers with some round crowns */
  function treeline(w, base, hmin, hmax, col, r, step) {
    var d = '', c = '';
    for (var x = -step; x < w + step; x += step * (0.7 + r() * 0.6)) {
      var hh = hmin + r() * (hmax - hmin), ww = hh * 0.44;
      if (r() < 0.24) {
        var cr = hh * 0.3;
        d += 'M' + f(x - 1.2) + ' ' + base + 'V' + f(base - hh * 0.5) + 'H' + f(x + 1.2) + 'V' + base + 'Z';
        c += '<circle cx="' + f(x) + '" cy="' + f(base - hh * 0.62) + '" r="' + f(cr) + '"/><circle cx="' + f(x - cr * 0.7) + '" cy="' + f(base - hh * 0.5) + '" r="' + f(cr * 0.7) + '"/><circle cx="' + f(x + cr * 0.7) + '" cy="' + f(base - hh * 0.52) + '" r="' + f(cr * 0.72) + '"/>';
      } else {
        d += 'M' + f(x - ww / 2) + ' ' + base + 'L' + f(x - ww * 0.3) + ' ' + f(base - hh * 0.4) + 'L' + f(x - ww * 0.38) + ' ' + f(base - hh * 0.4) + 'L' + f(x) + ' ' + f(base - hh) +
             'L' + f(x + ww * 0.38) + ' ' + f(base - hh * 0.4) + 'L' + f(x + ww * 0.3) + ' ' + f(base - hh * 0.4) + 'L' + f(x + ww / 2) + ' ' + base + 'Z';
      }
    }
    return '<g fill="' + col + '"><path d="' + d + '"/>' + c + '<rect x="0" y="' + (base - 1) + '" width="' + w + '" height="600"/></g>';
  }
  function rock(x, y, s) {
    return '<path d="M' + f(x - 13 * s) + ' ' + y + 'C' + f(x - 13 * s) + ' ' + f(y - 9 * s) + ' ' + f(x - 5 * s) + ' ' + f(y - 13 * s) + ' ' + f(x + 2 * s) + ' ' + f(y - 12 * s) +
           'C' + f(x + 9 * s) + ' ' + f(y - 11 * s) + ' ' + f(x + 14 * s) + ' ' + f(y - 6 * s) + ' ' + f(x + 14 * s) + ' ' + y + 'Z" fill="#4c5a52"/>' +
           '<path d="M' + f(x - 12 * s) + ' ' + f(y - 6 * s) + 'C' + f(x - 8 * s) + ' ' + f(y - 14 * s) + ' ' + f(x + 6 * s) + ' ' + f(y - 14.5 * s) + ' ' + f(x + 11 * s) + ' ' + f(y - 8 * s) +
           'C' + f(x + 5 * s) + ' ' + f(y - 10 * s) + ' ' + f(x - 5 * s) + ' ' + f(y - 9 * s) + ' ' + f(x - 12 * s) + ' ' + f(y - 6 * s) + 'Z" fill="#5d8a3c"/>';
  }

  /* The grove: sky by time of day, two tree lines, light, ground detail and one plant per active skill.
     items: [{id, name, plant, stage, level}]. opt.still turns off the firefly animation. */
  P.scene = function (w, h, phase, items, opt) {
    opt = opt || {};
    var sky = { dawn: ['#20333a', '#927a58'], day: ['#1c403b', '#7da078'], dusk: ['#2a2338', '#b96d42'], night: ['#081011', '#14302a'] }[phase];
    var far = { dawn: '#41604f', day: '#3f6b55', dusk: '#54434a', night: '#11271f' }[phase];
    var mid = { dawn: '#2a4638', day: '#2a4d3a', dusk: '#2e3335', night: '#0d1f19' }[phase];
    var gy = h - 44, r = rng(42), i, s, x;
    s = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Your grove">' +
        '<defs>' + P.defs + '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient>' +
        '<radialGradient id="glow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".55"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfeedd" stop-opacity="0"/><stop offset="1" stop-color="#dfeedd" stop-opacity=".2"/></linearGradient>' +
        '<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4" stop-opacity=".11"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07100b" stop-opacity=".55"/><stop offset="1" stop-color="#07100b" stop-opacity="0"/></linearGradient></defs>' +
        '<rect width="' + w + '" height="' + h + '" fill="url(#sky)"/>';
    var cel = { dawn: [w * 0.2, gy - 62], day: [w * 0.5, h * 0.24], dusk: [w * 0.56, gy - 70], night: [w * 0.5, h * 0.26] }[phase];
    if (w < 560) cel = [w * 0.84, gy - 92];   /* narrow screens: keep it clear of the heading */
    if (phase === 'night') {
      for (i = 0; i < 46; i++) s += '<circle cx="' + f(r() * w) + '" cy="' + f(r() * h * 0.55) + '" r="' + f(0.5 + r() * 0.8) + '" fill="#e9edd8" opacity="' + f(0.3 + r() * 0.6) + '"/>';
      s += '<circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="46" fill="url(#glow)" opacity=".5"/><circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="13" fill="#e9edd8"/>' +
           '<circle cx="' + f(cel[0] + 6) + '" cy="' + f(cel[1] - 4) + '" r="11.5" fill="' + sky[0] + '"/>';
    } else {
      s += '<circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="70" fill="url(#glow)"/><circle cx="' + f(cel[0]) + '" cy="' + f(cel[1]) + '" r="13" fill="#fbe7a1"/>';
    }
    s += treeline(w, gy - 54, 18, 38, far, r, 13) + '<rect y="' + (gy - 86) + '" width="' + w + '" height="80" fill="url(#mist)"/>';
    if (phase !== 'night') {
      [[-0.21, 0.03], [0.03, 0.022], [0.25, 0.035]].forEach(function (ry) {   /* three soft shafts of light */
        var bx = cel[0] + ry[0] * w;
        s += '<path d="M' + f(cel[0] - 5) + ' ' + f(cel[1]) + 'L' + f(bx - w * ry[1]) + ' ' + (gy + 6) + 'H' + f(bx + w * ry[1]) + 'L' + f(cel[0] + 5) + ' ' + f(cel[1]) + 'Z" fill="url(#ray)"/>';
      });
    }
    s += treeline(w, gy - 22, 30, 66, mid, r, 23) + '<rect y="' + (gy - 46) + '" width="' + w + '" height="46" fill="url(#mist)" opacity=".6"/>' +
         '<path d="M0 ' + (gy - 2) + 'Q' + f(w * 0.25) + ' ' + (gy - 9) + ' ' + f(w * 0.5) + ' ' + (gy - 3) + 'T' + w + ' ' + (gy - 5) + 'V' + h + 'H0Z" fill="#1b3423"/>' +
         '<path d="M0 ' + (gy + 6) + 'Q' + f(w * 0.3) + ' ' + (gy + 1) + ' ' + f(w * 0.6) + ' ' + (gy + 6) + 'T' + w + ' ' + (gy + 3) + 'V' + h + 'H0Z" fill="#132519"/>';
    var n = items.length, k = Math.max(0.6, Math.min(1.15, w / (n * 150)));
    var slots = items.map(function (_, idx) { return w * (idx + 1) / (n + 1); });
    var clear = function (px) { return slots.every(function (sx) { return Math.abs(sx - px) > 52 * k + 10; }); };
    /* rocks and a fallen log sit between the plants */
    for (i = 0; i < 6; i++) { x = 20 + r() * (w - 40); if (clear(x)) s += rock(x, gy + 3, 0.5 + r() * 0.5); }
    x = w * 0.5 + (n % 2 ? w / (n + 1) / 2 : 0);
    if (clear(x) && w > 520) s += '<rect x="' + f(x - 26) + '" y="' + (gy - 6) + '" width="52" height="10" rx="5" fill="#4a3525"/><ellipse cx="' + f(x + 26) + '" cy="' + (gy - 1) + '" rx="3.4" ry="5" fill="#8a6a4c"/>' +
      '<ellipse cx="' + f(x + 26) + '" cy="' + (gy - 1) + '" rx="1.6" ry="2.6" fill="none" stroke="#5a4230" stroke-width=".8"/><path d="M' + f(x - 20) + ' ' + (gy - 6) + 'q8 -4 18 -1q8 2 14 -1" stroke="#5d8a3c" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    var tufts = '', fl = '';
    for (x = 8; x < w; x += 14 + r() * 30) {
      var th = 5 + r() * 7, ty = gy + 2 + r() * 4;
      tufts += 'M' + f(x) + ' ' + f(ty) + 'l-3 ' + f(-th) + 'M' + f(x) + ' ' + f(ty) + 'l0 ' + f(-th - 2) + 'M' + f(x) + ' ' + f(ty) + 'l3.5 ' + f(-th + 1);
      if (r() < 0.4) fl += '<circle cx="' + f(x + 6) + '" cy="' + f(ty - 2 - r() * 4) + '" r="1.4" fill="' + ['#f3e9a8', '#e9edd8', '#c9a7ee', '#f0b6c8'][Math.floor(r() * 4)] + '" opacity=".85"/>';
    }
    s += '<path d="' + tufts + '" stroke="#3f7d45" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".8"/>' + fl;
    items.forEach(function (it, idx) {
      var px = f(slots[idx]);
      s += '<a href="#/' + it.id + '" class="plant" aria-label="' + it.name + ', level ' + it.level + '">' +
           '<ellipse cx="' + px + '" cy="' + (gy + 3) + '" rx="' + f(32 * k) + '" ry="' + f(4.5 * k) + '" fill="#0b160f" opacity=".45"/>' +
           '<g transform="translate(' + px + ' ' + (gy + 2) + ') scale(' + f(k) + ')">' + P.draw(it.plant, it.stage) + '</g>' +
           '<text class="pn" x="' + px + '" y="' + (gy + 22) + '" text-anchor="middle">' + it.name + '</text>' +
           '<text class="pl" x="' + px + '" y="' + (gy + 37) + '" text-anchor="middle">Lv ' + it.level + '</text>' +
           '<rect x="' + f(slots[idx] - 44) + '" y="' + (gy - 120) + '" width="88" height="162" fill="transparent"/></a>';
    });
    /* dark foreground blades in the corners give depth */
    var fg = '';
    [[0, 1], [w, -1]].forEach(function (c) {
      for (i = 0; i < 9; i++) { var bh = 26 + r() * 34, bxx = c[0] + c[1] * (r() * 46 - 6); fg += 'M' + f(bxx) + ' ' + h + 'Q' + f(bxx + c[1] * bh * 0.1) + ' ' + f(h - bh * 0.6) + ' ' + f(bxx + c[1] * bh * 0.45) + ' ' + f(h - bh) + 'Q' + f(bxx + c[1] * bh * 0.2) + ' ' + f(h - bh * 0.5) + ' ' + f(bxx + c[1] * 5) + ' ' + h + 'Z'; }
    });
    s += '<path d="' + fg + '" fill="#0a150e" opacity=".9"/>';
    if (phase === 'night' || phase === 'dusk') {
      for (i = 0; i < 14; i++) s += '<circle class="' + (opt.still ? '' : 'ff') + '" style="animation-delay:' + f(-r() * 6) + 's" cx="' + f(r() * w) + '" cy="' + f(gy - 6 - r() * 70) + '" r="1.7" fill="#f5e9a0" opacity=".8"/>';
    }
    s += '<rect width="' + w + '" height="' + f(h * 0.5) + '" fill="url(#shade)"/>';
    return s + '</svg>';
  };
})();
