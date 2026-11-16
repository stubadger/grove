/* Grove plants: SVG art for each plant at growth stages 0..5.
   Every plant is drawn with its base at (0,0), growing upward (negative y), up to about 115 tall and about
   60 to each side (the frame is -65..65 wide and -122..10 high).

   Each stage is drawn for the size it is shown at, not by shrinking the grown plant: a seedling is a few
   clean shapes, a young plant has two or three tones, and only the big stages get leaf texture, bark, fruit
   and other small touches. Light comes from the upper left.

   To add a plant: write a function (stage) -> SVG markup, then add it to DRAW and P.list.
   Shared gradients live in P.defs and must be inside the <defs> of any SVG that draws a plant. */
(function () {
  'use strict';
  var P = LD.plants = {};
  var g = { dd: '#1f4a2e', d: '#2c5a38', m: '#3f7d45', l: '#6aa84f', xl: '#a7c957', bark: '#5a4230', barkd: '#3f2d20' };
  var f = function (n) { return Math.round(n * 10) / 10; };
  var TAU = Math.PI * 2, DEG = 180 / Math.PI;

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
    '<linearGradient id="pg-culm" x1="0" x2="1"><stop offset="0" stop-color="#a2d568"/><stop offset=".45" stop-color="#6fae4a"/><stop offset="1" stop-color="#3f7d3a"/></linearGradient>' +
    '<linearGradient id="pg-culm2" x1="0" x2="1"><stop offset="0" stop-color="#c3d470"/><stop offset=".45" stop-color="#8cab4c"/><stop offset="1" stop-color="#56783a"/></linearGradient>' +
    '<linearGradient id="pg-cat" x1="0" x2="1"><stop offset="0" stop-color="#a87650"/><stop offset=".5" stop-color="#7a5235"/><stop offset="1" stop-color="#55361f"/></linearGradient>' +
    '<radialGradient id="pg-capA" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e8744a"/><stop offset="1" stop-color="#9c3a26"/></radialGradient>' +
    '<radialGradient id="pg-capB" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#eeaa62"/><stop offset="1" stop-color="#b0622c"/></radialGradient>' +
    '<radialGradient id="pg-capC" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#cf6046"/><stop offset="1" stop-color="#82291f"/></radialGradient>' +
    '<radialGradient id="pg-berry" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e4668a"/><stop offset="1" stop-color="#96284c"/></radialGradient>' +
    '<radialGradient id="pg-unripe" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f1ecb6"/><stop offset="1" stop-color="#b3b565"/></radialGradient>' +
    '<radialGradient id="pg-seed" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#8f5e2e"/><stop offset="1" stop-color="#3f2613"/></radialGradient>';

  /* ---- drawing tools ---- */
  /* place a small shape: returns a function that turns a point of the shape into picture coordinates */
  function xf(x, y, ang, sc) {
    var a = (ang || 0) / DEG, c = Math.cos(a) * (sc || 1), s = Math.sin(a) * (sc || 1);
    return function (lx, ly) { return f(x + lx * c - ly * s) + ' ' + f(y + lx * s + ly * c); };
  }
  /* path data: a pointed leaf, a broad leaf, a circle or oval */
  function leafD(x, y, len, wid, ang) {
    var p = xf(x, y, ang);
    return 'M' + p(0, 0) + 'Q' + p(len * 0.45, -wid) + ' ' + p(len, 0) + 'Q' + p(len * 0.45, wid) + ' ' + p(0, 0) + 'Z';
  }
  function broadD(x, y, len, wid, ang) {
    var p = xf(x, y, ang);
    return 'M' + p(0, 0) + 'C' + p(len * 0.02, -wid * 1.25) + ' ' + p(len * 0.62, -wid) + ' ' + p(len, 0) + 'C' + p(len * 0.62, wid) + ' ' + p(len * 0.02, wid * 1.25) + ' ' + p(0, 0) + 'Z';
  }
  function ellD(x, y, rx, ry) {
    ry = ry || rx;
    return 'M' + f(x - rx) + ' ' + f(y) + 'a' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(rx * 2) + ' 0a' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(-rx * 2) + ' 0Z';
  }
  function fill(d, col, more) { return d ? '<path d="' + d + '" fill="' + col + '"' + (more || '') + '/>' : ''; }
  function line(d, col, w, more) { return d ? '<path d="' + d + '" stroke="' + col + '" stroke-width="' + w + '" fill="none" stroke-linecap="round"' + (more || '') + '/>' : ''; }
  function dot(x, y, r, col, more) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + col + '"' + (more || '') + '/>'; }
  /* many small shapes of one colour become a single path, so a detailed plant stays cheap to draw.
     Colours are painted in the order they are first used. */
  function paint() {
    var keys = [], map = {};
    var p = function (col, d) { if (map[col] == null) { map[col] = ''; keys.push(col); } map[col] += d; return p; };
    p.out = function () { return keys.map(function (k) { return fill(map[k], k); }).join(''); };
    return p;
  }
  /* a single leaf as its own element (used by the grove picture) */
  function leaf(x, y, len, wid, ang, fillCol, vein) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(ang) + ')"><path d="M0 0Q' + f(len * 0.45) + ' ' + f(-wid) + ' ' + f(len) + ' 0Q' + f(len * 0.45) + ' ' + f(wid) + ' 0 0Z" fill="' + fillCol + '"/>' +
      (vein ? '<path d="M1 0H' + f(len * 0.85) + '" stroke="' + vein + '" stroke-width=".7"/>' : '') + '</g>';
  }
  /* a soft, bumpy outline for a mass of leaves */
  function clump(cx, cy, rx, ry, n, r) {
    var pts = [], a0 = r() * TAU, i, d;
    for (i = 0; i < n; i++) { var a = a0 + (i + (r() - 0.5) * 0.5) * TAU / n, k = 0.9 + r() * 0.14; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (i = 1; i <= n; i++) {
      var p = pts[i % n], q = pts[i - 1], ch = Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2));
      d += 'A' + f(ch * 0.6) + ' ' + f(ch * 0.6) + ' 0 0 1 ' + f(p[0]) + ' ' + f(p[1]);
    }
    return d + 'Z';
  }
  /* Foliage built from clumps [x, y, radius], listed back to front. Each clump has a shaded underside and a
     lit top. lvl is the growth stage: two tones when small, then a third, then leaves that break the outline. */
  function crown(cl, pal, r, lvl, lf, airy, leafy) {
    var out = '';
    lf = lf || 5;
    cl.forEach(function (c) {
      var x = c[0], y = c[1], R = c[2], n = Math.max(7, Math.round(R * 0.6)), i;
      /* the shaded layer only shows along the lower right, so the clumps read as one mass */
      out += fill(clump(x + R * 0.06, y + R * 0.1, R * 0.96, R * 0.9, n, r), pal.dd) + fill(clump(x - R * 0.03, y - R * 0.05, R * 0.97, R * 0.85, n, r), pal.d);
      if (lvl >= 2) out += fill(clump(x - R * 0.18, y - R * 0.26, R * 0.68, R * 0.53, Math.max(6, n - 2), r), pal.m);
      if (lvl >= 3) out += fill(clump(x - R * 0.3, y - R * 0.44, R * 0.38, R * 0.26, 6, r), pal.l);
      if (lvl < 3 && !leafy && !(airy && lvl >= 2)) return;   /* small plants stay plain, unless their leaves are big enough to see */
      var mk = paint(), k = Math.round(R * (airy ? 1.3 : [0.45, 0.5, 0.5, 0.75, 1][lvl - 1]));
      mk(pal.dd, '')(pal.m, '')(pal.l, '')(pal.xl, '');
      for (i = 0; i < k; i++) {
        var a = r() * TAU, d = R * (airy ? 0.45 + r() * 0.7 : 0.3 + r() * 0.66), lit = -0.6 * Math.cos(a) - 0.8 * Math.sin(a), len = lf * (0.7 + r() * 0.45);
        var col = lit > 0.3 ? (lvl >= 5 && d < R * 0.8 && r() < 0.3 ? pal.xl : pal.l) : lit < -0.3 ? (airy ? pal.d : pal.dd) : pal.m;
        mk(col, leafD(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.92, len, len * 0.5, a * DEG + (r() - 0.5) * 90));
      }
      out += mk.out();
    });
    return out;
  }

  /* ---- ground ---- */
  function moss(w, n, seed) {
    var r = rng(seed), out = '<ellipse cx="0" cy="0" rx="' + w + '" ry="' + f(w * 0.2) + '" fill="#4d7434"/><ellipse cx="' + f(-w * 0.15) + '" cy="-1" rx="' + f(w * 0.7) + '" ry="' + f(w * 0.12) + '" fill="#6a9440"/>';
    for (var i = 0; i < n; i++) { var x = (r() * 2 - 1) * w * 0.9; out += leaf(x, 0, 4 + r() * 5, 1.3, -90 + (r() - 0.5) * 50, r() < 0.5 ? g.l : g.m); }
    return out;
  }
  /* what a plant stands on: bare soil when just planted, moss and grass once it has settled in */
  function patch(st, w, seed) {
    var r = rng(seed), p = paint(), n = st < 1 ? 0 : 2 + st * 2, out;
    out = st < 2 ?
      '<ellipse cx="0" cy="0" rx="' + f(w) + '" ry="' + f(w * 0.24) + '" fill="#3b2e22"/><ellipse cx="' + f(-w * 0.18) + '" cy="-0.9" rx="' + f(w * 0.6) + '" ry="' + f(w * 0.11) + '" fill="#54412f"/>' :
      '<ellipse cx="0" cy="0" rx="' + f(w) + '" ry="' + f(Math.min(7, w * 0.2)) + '" fill="#3f6a31"/><ellipse cx="' + f(-w * 0.16) + '" cy="-1" rx="' + f(w * 0.68) + '" ry="' + f(Math.min(4, w * 0.11)) + '" fill="#5f8f3d"/>';
    for (var i = 0; i < n; i++) p(r() < 0.5 ? g.m : g.l, leafD((r() * 2 - 1) * w * 0.88, 0.5, 3.5 + r() * (2 + st), 1.2, -90 + (r() - 0.5) * 56));
    return out + p.out();
  }
  /* a few blades of grass in front of the plant */
  function sprigs(w, n, seed) {
    var r = rng(seed), p = paint();
    for (var i = 0; i < n; i++) p(r() < 0.5 ? '#4f8a3c' : g.l, leafD((r() < 0.5 ? -1 : 1) * w * (0.3 + r() * 0.62), 1.6, 4 + r() * 5, 1.2, -90 + (r() - 0.5) * 50));
    return p.out();
  }
  /* two seed leaves on a short stem */
  function seedling(h, stem, a, b, len, wid) {
    return line('M0 -1C0.8 ' + f(-h * 0.4) + ' -0.8 ' + f(-h * 0.7) + ' 0 ' + f(-h), stem, 2.4) +
      fill(broadD(0, -h + 1.5, len, wid, -150), a) + fill(broadD(0, -h + 1.5, len * 1.08, wid * 1.05, -30) + leafD(0, -h, len * 0.5, wid * 0.55, -90), b) +
      line('M0 ' + f(-h + 1.5) + 'l' + f(Math.cos(-150 / DEG) * len * 0.7) + ' ' + f(Math.sin(-150 / DEG) * len * 0.7) + 'M0 ' + f(-h + 1.5) + 'l' + f(Math.cos(-30 / DEG) * len * 0.75) + ' ' + f(Math.sin(-30 / DEG) * len * 0.75), stem, 0.7, ' opacity=".55"');
  }

  /* ---- fern ---- */
  var FERN = [['#1d4a2c', '#2f6c3c', '#163a23'], ['#2a6a38', '#58a04e', '#1c4429'], ['#32793c', '#7dbb52', '#1c4429']];
  function frond(a, L, tone, dens) {
    var sx = Math.sin(a), cx = Math.cos(a), E = [sx * L, -cx * L * 0.85 - L * 0.1], Cc = [sx * L * 0.25, -L * 0.82];
    var m = Math.max(4, Math.round(L / dens)), gap = L * 0.97 / m, lo = '', hi = '';
    for (var k = 1; k <= m; k++) {
      var t = 0.1 + 0.88 * k / (m + 0.5), u = 1 - t;
      var bx = 2 * u * t * Cc[0] + t * t * E[0], by = 2 * u * t * Cc[1] + t * t * E[1];
      var tx = 2 * (1 - 2 * t) * Cc[0] + 2 * t * E[0], ty = 2 * (1 - 2 * t) * Cc[1] + 2 * t * E[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= tl; ty /= tl;
      var len = L * 0.22 * (0.3 + Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.95) * (1 - 0.35 * t), wid = Math.max(0.9, Math.min(len * 0.3, gap * 0.48));
      for (var sg = -1; sg <= 1; sg += 2) {
        var px = -ty * sg, py = tx * sg, d = leafD(bx, by, len, wid, Math.atan2(py * 0.9 + ty * 0.45, px * 0.9 + tx * 0.45) * DEG);
        if (py < -0.2 || (py <= 0.2 && px < 0)) hi += d; else lo += d;   /* the side facing the light */
      }
    }
    return fill(lo, tone[0]) + fill(hi, tone[1]) + line('M0 0Q' + f(Cc[0]) + ' ' + f(Cc[1]) + ' ' + f(E[0]) + ' ' + f(E[1]), tone[2], f(Math.max(0.9, L * 0.018)));
  }
  function fiddle(x, h, flip) {
    return '<path transform="translate(' + f(x) + ' 0) scale(' + (flip ? -1 : 1) + ' 1)" d="M0 0C-1 ' + f(-h * 0.5) + ' 1 ' + f(-h * 0.85) + ' 4 ' + f(-h) +
      'c3.6 -1.8 6.2 1.6 4.4 4.2c-1.6 1.8 -4.2 .8 -3.4 -1.6" stroke="' + g.xl + '" stroke-width="2.3" fill="none" stroke-linecap="round"/>';
  }
  function fern(st) {
    if (!st) return patch(0, 11, 4) + fiddle(-3, 21) + fiddle(3, 14, true) + fiddle(-9, 8);
    var n = [0, 3, 5, 7, 9, 11][st], len = [0, 40, 52, 63, 74, 84][st], dens = [0, 7.2, 6.4, 5.6, 4.9, 4.3][st], spread = [0, 0.85, 1, 1.1, 1.18, 1.22][st];
    var out = patch(st, 8 + st * 3.4, 4), order = [], i;
    for (i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2); });
    order.forEach(function (i) {
      var t = (i / (n - 1)) * 2 - 1, back = Math.abs(t) > 0.6;
      out += frond(t * spread, len * (1 - 0.24 * Math.abs(t)) * (0.92 + ((i * 37) % 10) / 70), back ? FERN[0] : i % 2 ? FERN[1] : FERN[2], dens);
    });
    if (st >= 2) out += fiddle(-3, 9 + st * 2.4) + fiddle(4, 6 + st * 2, true);
    return out;
  }

  /* ---- pine ---- */
  /* one layer of boughs: swept sides and a fringe of pointed tips */
  function tier(yTop, yBot, w, n) {
    var h = yBot - yTop, dx = w / n, tips = [], i;
    for (i = 0; i <= n; i++) { var x = -w / 2 + dx * i, e = Math.abs(x) / (w / 2); tips.push([x, yBot - e * e * h * 0.12]); }
    var teeth = function (a, b) {
      var s = '';
      for (var j = a; j < b; j++) {
        var p = tips[j], q = tips[j + 1], ny = Math.min(p[1], q[1]) - h * 0.15;
        s += 'Q' + f(p[0] + dx * 0.3) + ' ' + f(ny + h * 0.05) + ' ' + f(p[0] + dx * 0.5) + ' ' + f(ny) + 'Q' + f(q[0] - dx * 0.3) + ' ' + f(ny + h * 0.05) + ' ' + f(q[0]) + ' ' + f(q[1]);
      }
      return s;
    };
    var start = 'M0 ' + f(yTop) + 'Q' + f(-w * 0.23) + ' ' + f(yTop + h * 0.6) + ' ' + f(tips[0][0]) + ' ' + f(tips[0][1]), m = Math.floor(n / 2);
    return {
      full: start + teeth(0, n) + 'Q' + f(w * 0.23) + ' ' + f(yTop + h * 0.6) + ' 0 ' + f(yTop) + 'Z',
      lit: start + teeth(0, m) + 'Q' + f(tips[m][0] + w * 0.1) + ' ' + f(yTop + h * 0.5) + ' 0 ' + f(yTop) + 'Z',
      edge: start + 'Q' + f(-w * 0.1) + ' ' + f(yTop + h * 0.58) + ' 0 ' + f(yTop) + 'Z'
    };
  }
  function pine(st) {
    var out, i;
    if (!st) {
      var nd = '', nl = '';
      for (i = 0; i < 9; i++) { var a = (-168 + i * 19.5) / DEG, d = 'M0 -13L' + f(Math.cos(a) * 12) + ' ' + f(-13 + Math.sin(a) * 12); if (i % 2) nl += d; else nd += d; }
      return patch(0, 12, 21) + line('M0 -1V-13.5', g.bark, 2) + line(nd, g.m, 1.9) + line(nl, g.l, 1.9) +
        '<ellipse cx="9" cy="-2" rx="4.2" ry="2.6" fill="#7a5235" transform="rotate(-14 9 -2)"/>' + line('M6.8 -3.3q1.2 1.6 .5 3M9.4 -3.8q1.2 1.6 .5 3.2', '#56361f', 0.8);
    }
    var tiers = [0, 3, 4, 5, 6, 7][st], H = [0, 44, 60, 78, 96, 113][st], bw = [0, 34, 43, 53, 63, 72][st], th = [0, 6, 8, 10, 12, 14][st], tw = [0, 1.4, 1.8, 2.3, 2.9, 3.5][st];
    var tooth = [0, 8, 7.5, 7, 6.8, 6.6][st], step = 0.52, r = rng(3), tH = (H - th) / (step * (tiers - 1) + 1.25), T = [], cones = paint(), lit = '', dark = '';
    out = patch(st, 8 + st * 3.4, 21);
    if (st === 5) out += line('M' + f(-tw * 1.4) + ' -0.5q-3.5 -1 -7 1.4M' + f(tw * 1.5) + ' -0.5q4 -1 8 1.2', g.bark, 2);
    out += fill('M' + f(-tw * 1.6) + ' 0Q' + f(-tw * 0.9) + ' ' + f(-th * 0.5) + ' ' + f(-tw * 0.7) + ' ' + f(-th - tH * 0.4) + 'H' + f(tw * 0.7) + 'Q' + f(tw * 0.9) + ' ' + f(-th * 0.5) + ' ' + f(tw * 1.7) + ' 0Z', 'url(#pg-trunk)');
    for (i = 0; i < tiers; i++) {
      var top = i === tiers - 1, yBot = -th - i * tH * step, w = bw * Math.pow(1 - i / (tiers + 0.3), 0.9);
      T.push({ yBot: yBot, yTop: yBot - tH * (top ? 1.25 : 1), w: w, n: Math.max(2, Math.round(w / tooth)) });
    }
    T.forEach(function (t, i) {
      var s = tier(t.yTop, t.yBot, t.w, t.n), odd = i % 2, h = t.yBot - t.yTop;
      if (i) out += fill(s.full, '#0d2417', ' opacity=".5" transform="translate(0 ' + f(tH * 0.1) + ')"');
      out += fill(s.full, odd ? '#2a6048' : '#235540') + fill(s.lit, odd ? '#4c9a5e' : '#438d55');
      if (st >= 2) out += fill(s.edge, '#9ad066', ' opacity=".55"');
      if (st >= 3) for (var k = 0; k < st; k++) {
        var yy = t.yTop + h * (0.42 + r() * 0.4), half = (t.w / 2) * (yy - t.yTop) / h * 0.8;
        lit += 'M' + f(-half * (0.2 + r() * 0.7)) + ' ' + f(yy) + 'l-2.2 2.8';
        dark += 'M' + f(half * (0.2 + r() * 0.7)) + ' ' + f(yy) + 'l2.2 2.8';
      }
    });
    if (st >= 3) out += line(lit, '#b4dc78', 1, ' opacity=".5"') + line(dark, '#0f2a1b', 1, ' opacity=".5"');
    if (st >= 4) {
      [[-0.26, 1], [0.24, 2], [-0.14, 3], [0.3, 0], [0.1, 4], [-0.3, 2]].slice(0, st === 5 ? 6 : 4).forEach(function (c) {
        var x = T[c[1]].w * c[0], y = T[c[1]].yBot - tH * 0.14;
        cones('#75492c', ellD(x, y, 1.5, 2.8))('#a0714a', ellD(x - 0.5, y - 0.3, 0.5, 1.8));
      });
      out += cones.out();
    }
    if (st === 5) out += '<ellipse cx="-17" cy="0.6" rx="3.6" ry="2" fill="#7a5235" transform="rotate(12 -17 0.6)"/><ellipse cx="21" cy="1.4" rx="3.2" ry="1.8" fill="#6d4a2a" transform="rotate(-18 21 1.4)"/>';
    if (st >= 3) out += sprigs(8 + st * 3.4, st, 22);
    return out;
  }

  /* ---- broadleaf trees: oak (green) and maple (autumn) ---- */
  var CROWN = [0, 0,
    [[0, -46, 14], [-11, -36, 11], [11, -37, 11]],
    [[0, -63, 14], [-16, -52, 13], [16, -53, 13], [-6, -44, 12], [8, -42, 11]],
    [[-7, -80, 15], [11, -77, 14], [-27, -65, 14], [29, -63, 14], [0, -63, 16], [-14, -51, 13], [15, -50, 13]],
    [[-8, -94, 16], [13, -91, 15], [-31, -80, 15], [34, -78, 15], [0, -78, 18], [-46, -60, 13], [48, -58, 13], [-23, -58, 15], [23, -56, 15], [0, -49, 14]]];
  var LIMB = [0, 0, [], [[-13, -50], [13, -51]], [[-23, -60], [23, -59], [0, -66]], [[-31, -70], [32, -68], [-6, -80], [12, -66]]];
  /* a young tree: a stem and a handful of big simple leaves */
  function sapling(pal, h) {
    var p = paint(), ribs = '', out = line('M0 0C2 ' + f(-h * 0.35) + ' -2 ' + f(-h * 0.65) + ' 0 ' + f(-h), g.bark, 2.2);
    p(pal.d, '')(pal.m, '')(pal.l, '');
    [0.34, 0.48, 0.61, 0.73, 0.84, 0.94].forEach(function (t, i) {
      var u = 1 - t, x = 3 * u * u * t * 2 - 3 * u * t * t * 2, y = -(3 * u * u * t * 0.35 + 3 * u * t * t * 0.65 + t * t * t) * h, left = i % 2 === 0;
      var len = 16 - t * 5, ang = left ? -152 - u * 22 : -28 + u * 22;
      p(left ? (i > 2 ? pal.l : pal.m) : pal.d, broadD(x, y, len, len * 0.33, ang));
      ribs += 'M' + f(x) + ' ' + f(y) + 'l' + f(Math.cos(ang / DEG) * len * 0.75) + ' ' + f(Math.sin(ang / DEG) * len * 0.75);
    });
    p(pal.l, broadD(0, -h + 1, 10, 3.4, -90));
    return out + p.out() + line(ribs, pal.dd, 0.7, ' opacity=".5"');
  }
  function broadleaf(st, K) {
    var pal = K.pal, r = rng(K.seed), out, i;
    if (!st) return K.first();
    if (st === 1) return patch(1, 11, K.seed) + sapling(pal, 40);
    var w = [0, 0, 2.2, 3.2, 4.6, 6.2][st], h = [0, 0, 30, 37, 43, 47][st] * K.sy, pw = 9 + st * 3.6, lim = '';
    var cl = CROWN[st].map(function (c) { return [c[0] * K.sx, c[1] * K.sy, c[2]]; });
    out = patch(st, pw, K.seed);
    if (K.litter && st >= 3) {   /* leaves that have come down */
      var lt = paint();
      for (i = 0; i < [0, 0, 0, 4, 7, 11][st]; i++) lt([pal.m, pal.l, pal.xl][i % 3], leafD((r() * 2 - 1) * pw * 0.95, 0.4 + r() * 2.2, 4 + r() * 2, 1.8, r() * 360));
      out += lt.out();
    }
    if (st === 5) out += line('M' + f(-w * 1.8) + ' -0.5q-4 -1 -8 1.6M' + f(w * 1.9) + ' -0.5q4.5 -1.2 9 1.4', g.bark, 2.2);
    LIMB[st].forEach(function (t, i) { lim += 'M' + f((i % 2 ? 1 : -1) * w * 0.25) + ' ' + f(-h * 0.8) + 'Q' + f(t[0] * K.sx * 0.3) + ' ' + f(-h * 1.02) + ' ' + f(t[0] * K.sx) + ' ' + f(t[1] * K.sy); });
    out += line(lim, '#4f3a2a', f(w * 0.95)) +
      fill('M' + f(-w * 2) + ' 0Q' + f(-w * 1.05) + ' ' + f(-h * 0.14) + ' ' + f(-w) + ' ' + f(-h * 0.42) + 'L' + f(-w * 0.8) + ' ' + f(-h) + 'H' + f(w * 0.8) + 'L' + f(w) + ' ' + f(-h * 0.42) + 'Q' + f(w * 1.05) + ' ' + f(-h * 0.14) + ' ' + f(w * 2.1) + ' 0Z', 'url(#pg-trunk)');
    if (st >= 3) out += line('M' + f(-w * 0.35) + ' ' + f(-h * 0.12) + 'v' + f(-h * 0.2) + 'M' + f(w * 0.3) + ' ' + f(-h * 0.36) + 'v' + f(-h * 0.2) + 'M' + f(-w * 0.1) + ' ' + f(-h * 0.62) + 'v' + f(-h * 0.14) +
      (st >= 4 ? 'M' + f(w * 0.55) + ' ' + f(-h * 0.08) + 'v' + f(-h * 0.14) + 'M' + f(-w * 0.6) + ' ' + f(-h * 0.4) + 'v' + f(-h * 0.12) : ''), g.barkd, 0.9, ' opacity=".65"');
    if (st === 5) out += '<ellipse cx="' + f(w * 0.15) + '" cy="' + f(-h * 0.5) + '" rx="1.7" ry="2.4" fill="#2a1d14"/>' + line('M' + f(w * 0.15 - 2.6) + ' ' + f(-h * 0.5) + 'a2.6 3.4 0 0 1 5.2 0', '#75573f', 0.8) +
      fill(clump(-w * 1.5, -2.6, 4.4, 2.7, 6, r), '#5d8a3c') + fill(clump(-w * 1.8, -3.4, 2.4, 1.4, 5, r), '#86b54e');
    out += crown(cl, pal, r, st);
    if (K.fruit && st >= 4) {   /* acorns */
      var ac = paint();
      cl.slice(st === 5 ? 4 : 3).forEach(function (c) {
        var x = c[0] + (r() - 0.5) * c[2] * 1.1, y = c[1] + c[2] * 0.5;
        ac('#b08445', ellD(x, y, 1.6, 2))('#5f3f24', 'M' + f(x - 1.9) + ' ' + f(y - 0.9) + 'a1.9 1.6 0 0 1 3.8 0Z');
      });
      out += ac.out();
    }
    if (K.fruit && st === 5) {   /* small mushrooms by the root */
      var mx = w * 3.1;
      out += fill('M' + f(mx - 0.8) + ' 1v-4h1.6v4ZM' + f(mx + 4.4) + ' 1.6v-3h1.2v3Z', '#eadfc4') + fill('M' + f(mx - 3) + ' -2.6Q' + f(mx) + ' -7 ' + f(mx + 3) + ' -2.6ZM' + f(mx + 3) + ' -1Q' + f(mx + 5) + ' -4.4 ' + f(mx + 7) + ' -1Z', '#c9703a');
    }
    if (st >= 3) out += sprigs(pw, st, K.seed + 1);
    return out;
  }
  var OAK = {
    pal: { dd: '#173a24', d: '#28603a', m: '#3f8346', l: '#69a94f', xl: '#9ccb5e' }, seed: 17, sx: 1, sy: 1, fruit: true,
    first: function () {
      return patch(0, 11, 17) + '<g transform="rotate(-24 -7 -2.6)"><ellipse cx="-7" cy="-2.6" rx="3.4" ry="2.5" fill="#b08445"/><path d="M-10.4 -2.6a3.4 2.6 0 0 1 2 -2.4v4.8a3.4 2.6 0 0 1 -2 -2.4Z" fill="#6d4a2a"/></g>' +
        seedling(18, '#6f8f45', '#4f9648', '#7fb85a', 15, 4.6);
    }
  };
  var MAPLE = {
    pal: { dd: '#6b2318', d: '#a43a20', m: '#cf5d2b', l: '#ea913d', xl: '#f6c15a' }, seed: 23, sx: 0.86, sy: 1.03, litter: true,
    first: function () { return patch(0, 11, 23) + fill(leafD(5, -1.6, 10, 2.6, -12), '#c9a56c') + dot(5, -1.6, 1.7, '#8a6a3c') + seedling(18, '#b0553a', '#cf5d2b', '#ea913d', 14, 4.4); }
  };

  /* ---- birch: a slim white stem and a light, airy crown with hanging strands ---- */
  var BIRCH = { dd: '#3a7439', d: '#56963f', m: '#7ab34d', l: '#a3cc5c', xl: '#d6e88a' };
  var BCL = [[-10, -100, 9], [8, -104, 9], [-22, -84, 10], [22, -86, 10], [-27, -64, 9], [28, -66, 9], [0, -90, 11], [-12, -72, 10], [13, -74, 10], [2, -58, 9], [-16, -52, 7], [18, -54, 7]];
  var BPICK = [0, [6, 7, 8], [0, 1, 6, 7, 8], [0, 1, 2, 3, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
  function birch(st) {
    if (!st) return patch(0, 11, 33) + seedling(19, '#d9d3c0', '#7ab34d', '#a3cc5c', 12, 4) + fill(broadD(0, -9, 8, 2.8, -18), '#7ab34d');
    var H = [0, 44, 62, 80, 98, 114][st], q = H / 114, w = [0, 1.3, 1.7, 2.2, 2.8, 3.3][st], r = rng(31), out = patch(st, 8 + st * 3.2, 33), i, t, m, hw;
    var lean = -3 * q, bend = 2.4 * q;   /* the stem leans a little, in a gentle curve */
    var mid = function (t) { var u = 1 - t; return [2 * u * t * bend + t * t * lean, -(2 * u * t * 0.5 + t * t * 0.96) * H]; };
    var cl = BPICK[st].map(function (k) { var c = BCL[k]; return [c[0] * q + lean * 0.6, c[1] * q, c[2] * (0.55 + 0.4 * q), k < 6]; });
    var marks = '', br = '', Lp = '', Rp = '';
    if (st >= 4) {   /* a second, slimmer stem from the same root */
      var ex = H * 0.17, ey = -H * 0.7;
      out += fill('M' + f(w * 0.4) + ' 0Q' + f(H * 0.05) + ' ' + f(-H * 0.36) + ' ' + f(ex - w * 0.25) + ' ' + f(ey) + 'h' + f(w * 0.5) + 'Q' + f(H * 0.05 + w * 1.5) + ' ' + f(-H * 0.34) + ' ' + f(w * 2.6) + ' 0Z', 'url(#pg-birch)');
      for (i = 0; i < 6; i++) { t = 0.1 + i * 0.13 + r() * 0.05; var u2 = 1 - t; marks += 'M' + f(u2 * u2 * w * 1.4 + 2 * u2 * t * (H * 0.05 + w * 0.7) + t * t * ex - w * 0.3) + ' ' + f(2 * u2 * t * -H * 0.35 + t * t * ey) + 'h' + f(w * (0.5 + r() * 0.5)); }
    }
    out += crown(cl.filter(function (c) { return c[3]; }), BIRCH, r, st, 4, true);
    cl.forEach(function (c) {
      var s = mid(Math.max(0.28, Math.min(0.93, (-c[1] - c[2] * 1.5) / H)));
      br += 'M' + f(s[0]) + ' ' + f(s[1]) + 'Q' + f(s[0] + (c[0] - s[0]) * 0.4) + ' ' + f(c[1] + c[2] * 0.2) + ' ' + f(c[0]) + ' ' + f(c[1]);
    });
    out += line(br, '#5d5548', f(Math.max(0.7, w * 0.42)));
    for (i = 0; i <= 8; i++) { t = i / 8; m = mid(t); hw = w * (i ? 1.45 - 1.1 * t : 2.1); Lp += (i ? 'L' : 'M') + f(m[0] - hw) + ' ' + f(m[1]); Rp = 'L' + f(m[0] + hw) + ' ' + f(m[1]) + Rp; }
    out += fill(Lp + Rp + 'Z', 'url(#pg-birch)');
    if (st >= 4) out += fill('M' + f(-w * 2.1) + ' 0L' + f(-w * 1.5) + ' ' + f(-H * 0.05) + 'l' + f(w * 0.7) + ' 1.6l' + f(w * 0.7) + ' -2.6l' + f(w * 0.8) + ' 2.2l' + f(w * 0.6) + ' -1.4L' + f(w * 2.1) + ' 0Z', '#39352d', ' opacity=".55"');
    for (i = 0; i < 3 + st * 3; i++) {
      t = 0.06 + r() * 0.82; m = mid(t); hw = w * (1.45 - 1.1 * t);
      var len = hw * (0.7 + r() * 0.9);
      marks += 'M' + f(r() < 0.5 ? m[0] - hw * 0.95 : m[0] + hw * 0.95 - len) + ' ' + f(m[1]) + 'h' + f(len);
    }
    out += line(marks, '#2b2925', f(0.7 + st * 0.1)) + crown(cl.filter(function (c) { return !c[3]; }), BIRCH, r, st, 4, true);
    if (st >= 3) {   /* strands of small leaves hanging under the crown */
      var sp = paint(), sl = '';
      sp(BIRCH.m, '')(BIRCH.l, '')(BIRCH.xl, '');
      for (i = 0; i < [0, 0, 0, 4, 6, 9][st]; i++) {
        var c = cl[(i * 5 + 2) % cl.length], x0 = c[0] + (r() - 0.5) * c[2] * 1.4, y0 = c[1] + c[2] * 0.45, sLen = (9 + r() * 9) * q + 3, sway = (r() - 0.5) * 5, nl = Math.floor(sLen / 3);
        sl += 'M' + f(x0) + ' ' + f(y0) + 'q' + f(sway * 0.2) + ' ' + f(sLen * 0.5) + ' ' + f(sway) + ' ' + f(sLen);
        for (var j = 1; j <= nl; j++) { var tt = j / nl; sp([BIRCH.l, BIRCH.m, BIRCH.xl][(i + j) % 3], leafD(x0 + sway * tt * tt, y0 + sLen * tt, 3.6, 1.4, 90 + (j % 2 ? 42 : -42))); }
      }
      out += line(sl, '#5a8f3e', 0.6) + sp.out() + sprigs(8 + st * 3.2, st, 34);
    }
    return out;
  }

  /* ---- bamboo ---- */
  function shoot(x, k) {
    var p = xf(x, 0, 0, k);
    return fill('M' + p(-4.6, 0) + 'C' + p(-4.8, -7) + ' ' + p(-2.2, -13) + ' ' + p(0.4, -18) + 'C' + p(2.6, -13) + ' ' + p(4.8, -7) + ' ' + p(4.6, 0) + 'Z', '#7c6a3e') +
      fill('M' + p(-4.6, 0) + 'C' + p(-4.8, -7) + ' ' + p(-2.2, -13) + ' ' + p(0.4, -18) + 'C' + p(-0.6, -12) + ' ' + p(-1.4, -6) + ' ' + p(-1, 0) + 'Z', '#a08c54') +
      line('M' + p(-4.3, -4.5) + 'Q' + p(0, -8.5) + ' ' + p(4.2, -5) + 'M' + p(-3.2, -9.5) + 'Q' + p(0.2, -13) + ' ' + p(3, -10), '#4f4126', f(0.9 * k)) +
      fill(leafD(x + 0.4 * k, -17 * k, 5.5 * k, 1.4 * k, -112) + leafD(x + 0.4 * k, -17 * k, 5 * k, 1.3 * k, -62), '#8cc65a');
  }
  function bamboo(st) {
    if (!st) return patch(0, 12, 6) + shoot(-2, 1.3) + shoot(8, 0.7);
    var n = [0, 2, 3, 4, 5, 7][st], H = [0, 40, 56, 72, 88, 101][st], wb = [0, 3.6, 4, 4.4, 4.8, 5.2][st], r = rng(9), C = [], back = '', culms = '', lv = paint(), i;
    lv(g.m, '')(g.l, '')('#8cc65a', '')(g.xl, '');
    for (i = 0; i < n; i++) {
      var o = i - (n - 1) / 2, far = Math.abs(o) / ((n - 1) / 2);
      C.push({ x: o * 9 + (r() - 0.5) * 3, h: H * (1 - 0.26 * far * (0.5 + r() * 0.5)), lean: o * 1.6 + (r() - 0.5) * 5, i: i });
    }
    C.sort(function (a, b) { return b.h - a.h; });   /* tall ones stand behind */
    C.forEach(function (c, ci) {
      var segs = Math.max(3, Math.round(c.h / 12)), L = '', R = '', nodes = '';
      for (var k = 0; k <= segs; k++) {
        var t = k / segs, cx = c.x + c.lean * t * t, y = -c.h * t, hw = wb * (1 - 0.6 * t) / 2;
        L += (k ? 'L' : 'M') + f(cx - hw) + ' ' + f(y);
        R = 'L' + f(cx + hw) + ' ' + f(y) + R;
        if (!k || k === segs) continue;
        nodes += 'M' + f(cx - hw - 0.5) + ' ' + f(y) + 'h' + f(hw * 2 + 1);
        if (t < 0.4) continue;
        var sd = (k + c.i) % 2 ? 1 : -1;   /* a spray of leaves at each upper joint */
        for (var j = 0; j < (st >= 3 ? 3 : 2); j++) {
          lv([g.l, '#8cc65a', g.m, g.xl][(j + k + ci) % 4], leafD(cx + sd * hw, y, 12 + r() * 6 + st * 0.5, 2.5 + st * 0.12, (sd > 0 ? -30 + j * 26 : 210 - j * 26) + (r() - 0.5) * 14));
        }
        if (st >= 3 && r() < 0.6) back += leafD(cx - sd * hw, y, 13 + r() * 6, 3, sd > 0 ? 200 + r() * 30 : -20 - r() * 30);
      }
      var tx = c.x + c.lean, ty = -c.h + 1;
      lv(g.xl, leafD(tx, ty, 11 + st, 2.4, -62 + c.lean * 2))(g.l, leafD(tx, ty, 10 + st, 2.3, -118 + c.lean * 2))('#8cc65a', leafD(tx, ty, 9 + st * 0.6, 2.1, -90 + c.lean * 2));
      culms += fill(L + R + 'Z', 'url(#' + (c.i % 3 === 1 ? 'pg-culm2' : 'pg-culm') + ')') + line(nodes, '#2c5a2e', 1.1);
    });
    return patch(st, 10 + n * 3.8, 6) + fill(back, '#2f6a3a') + culms + lv.out() + (st >= 4 ? shoot(-13, 0.6) : '') + (st === 5 ? shoot(14, 0.8) : '') + (st >= 3 ? sprigs(10 + n * 3.8, st, 7) : '');
  }

  /* ---- berry bush: the berries come in pale and ripen as it grows ---- */
  var BUSH = { dd: '#1c4429', d: '#2e6237', m: '#48883f', l: '#6aa84f', xl: '#a0cc5c' };
  var KCL = [[-18, -44, 14], [14, -47, 15], [-38, -26, 13], [38, -27, 13], [0, -34, 17], [-22, -22, 15], [22, -21, 15], [-42, -12, 10], [43, -12, 10], [0, -16, 14]];
  var KPICK = [0, [4, 5, 6], [0, 1, 4, 5, 6], [0, 1, 4, 5, 6, 9], [0, 1, 2, 3, 4, 5, 6, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]];
  var BER = [[-6, -30], [12, -38], [-24, -24], [25, -22], [2, -14], [-14, -42], [18, -50], [-38, -28], [38, -26], [8, -24], [-30, -10], [32, -10], [-8, -48], [-44, -12]];
  function berry(st) {
    if (!st) return patch(0, 11, 78) + seedling(17, g.bark, BUSH.m, BUSH.l, 12, 4.2) + fill(broadD(0, -7, 9, 3, -166), BUSH.d) + fill(broadD(0, -10, 9, 3, -12), BUSH.m);
    var q = [0, 0.46, 0.6, 0.73, 0.87, 1][st], r = rng(77), out = patch(st, 10 + st * 7, 78), hl = '', i;
    var cl = KPICK[st].map(function (k) { var c = KCL[k]; return [c[0] * q, c[1] * q, c[2] * (0.4 + 0.6 * q)]; });
    out += line('M0 0C' + f(-3 * q) + ' ' + f(-10 * q) + ' ' + f(-12 * q) + ' ' + f(-14 * q) + ' ' + f(-20 * q) + ' ' + f(-20 * q) + 'M0 0C' + f(q) + ' ' + f(-12 * q) + ' 0 ' + f(-20 * q) + ' 0 ' + f(-30 * q) +
      'M0 0C' + f(4 * q) + ' ' + f(-10 * q) + ' ' + f(12 * q) + ' ' + f(-14 * q) + ' ' + f(21 * q) + ' ' + f(-19 * q), g.bark, f(1.4 + st * 0.3));
    out += crown(cl, BUSH, r, st, 6, false, true);
    for (i = 0; i < [0, 0, 3, 6, 10, 14][st]; i++) {
      var bx = BER[i][0] * q, by = BER[i][1] * q, id = i < [0, 0, 0, 3, 8, 12][st] ? 'pg-berry' : 'pg-unripe';
      [[0, 0, 3], [3.5, 1.6, 2.5], [-1.2, 3.7, 2.3]].forEach(function (o) {
        out += dot(bx + o[0], by + o[1], o[2], 'url(#' + id + ')');
        hl += ellD(bx + o[0] - o[2] * 0.3, by + o[1] - o[2] * 0.35, o[2] * 0.26);
      });
    }
    return out + fill(hl, '#fff', ' opacity=".75"') + (st >= 3 ? sprigs(10 + st * 7, st + 1, 79) : '');
  }

  /* ---- mushroom ring ---- */
  var CAP = { dome: [1, 15], flat: [1.15, 9.5], bell: [0.82, 19] };   /* width and height of each cap shape */
  function shroom(x, k, cap, shape, lvl) {
    var sh = CAP[shape], w = 13 * k * sh[0], h = 22 * k, dm = sh[1] * k, ys = sh[1] / 15, i, out, gl = '';
    out = fill('M' + f(x - 3.2 * k) + ' 0C' + f(x - 3.6 * k) + ' ' + f(-h * 0.5) + ' ' + f(x - 2.4 * k) + ' ' + f(-h * 0.8) + ' ' + f(x - 2.3 * k) + ' ' + f(-h) +
      'H' + f(x + 2.3 * k) + 'C' + f(x + 2.4 * k) + ' ' + f(-h * 0.8) + ' ' + f(x + 3.6 * k) + ' ' + f(-h * 0.5) + ' ' + f(x + 3.2 * k) + ' 0Z', 'url(#pg-stem)');
    if (lvl >= 2) out += '<ellipse cx="' + f(x) + '" cy="' + f(-h * 0.62) + '" rx="' + f(3.9 * k) + '" ry="' + f(1.4 * k) + '" fill="#e6dabd"/>';
    out += '<ellipse cx="' + f(x) + '" cy="' + f(-h + 2.4 * k) + '" rx="' + f(w * 0.93) + '" ry="' + f(3.4 * k) + '" fill="#d6c59f"/>';
    if (lvl >= 1) {
      for (i = -4; i <= 4; i++) if (i) gl += 'M' + f(x + i * 0.5 * k) + ' ' + f(-h + 1.2 * k) + 'L' + f(x + i * w * 0.21) + ' ' + f(-h + 4.6 * k);
      out += '<path d="' + gl + '" stroke="#b09c72" stroke-width="' + f(0.5 * k) + '" fill="none"/>';
    }
    out += fill('M' + f(x - w) + ' ' + f(-h + 2 * k) + 'C' + f(x - w) + ' ' + f(-h - dm) + ' ' + f(x + w) + ' ' + f(-h - dm) + ' ' + f(x + w) + ' ' + f(-h + 2 * k) + 'Q' + f(x) + ' ' + f(-h + 5 * k) + ' ' + f(x - w) + ' ' + f(-h + 2 * k) + 'Z', 'url(#' + cap + ')') +
      '<path d="M' + f(x - w) + ' ' + f(-h + 2 * k) + 'Q' + f(x) + ' ' + f(-h + 5 * k) + ' ' + f(x + w) + ' ' + f(-h + 2 * k) + '" stroke="#5e1f15" stroke-width="' + f(0.9 * k) + '" fill="none" opacity=".45"/>' +
      '<ellipse cx="' + f(x - w * 0.3) + '" cy="' + f(-h - dm * 0.47) + '" rx="' + f(w * 0.38) + '" ry="' + f(dm * 0.16) + '" fill="#fff" opacity=".13" transform="rotate(-18 ' + f(x - w * 0.3) + ' ' + f(-h - dm * 0.47) + ')"/>';
    if (cap === 'pg-capB') return out + '<ellipse cx="' + f(x) + '" cy="' + f(-h - dm * 0.5) + '" rx="' + f(w * 0.3) + '" ry="' + f(dm * 0.14) + '" fill="#8f4a1e" opacity=".3"/>';
    [[-6, -4.4, 2, 1.6], [3.5, -7.2, 1.7, 1.3], [8, -2, 1.3, 1], [-1.5, -1.2, 1.2, 0.9], [-9.5, -0.6, 1, 0.8]].slice(0, [2, 3, 5][lvl]).forEach(function (sp) {
      out += '<ellipse cx="' + f(x + sp[0] * k * sh[0]) + '" cy="' + f(-h + sp[1] * k * ys) + '" rx="' + f(sp[2] * k) + '" ry="' + f(sp[3] * k) + '" fill="#f6ecd4" opacity=".9"/>';
    });
    return out;
  }
  /* a young mushroom whose cap has not opened yet */
  function button(x, k, cap) {
    return fill('M' + f(x - 3 * k) + ' 0C' + f(x - 3.4 * k) + ' ' + f(-4 * k) + ' ' + f(x - 2.6 * k) + ' ' + f(-7 * k) + ' ' + f(x - 2.4 * k) + ' ' + f(-8 * k) + 'H' + f(x + 2.4 * k) +
      'C' + f(x + 2.6 * k) + ' ' + f(-7 * k) + ' ' + f(x + 3.4 * k) + ' ' + f(-4 * k) + ' ' + f(x + 3 * k) + ' 0Z', 'url(#pg-stem)') +
      '<ellipse cx="' + f(x) + '" cy="' + f(-10.5 * k) + '" rx="' + f(6.4 * k) + '" ry="' + f(5.6 * k) + '" fill="url(#' + cap + ')"/>' +
      '<ellipse cx="' + f(x - 2 * k) + '" cy="' + f(-12.8 * k) + '" rx="' + f(2.6 * k) + '" ry="' + f(1.3 * k) + '" fill="#fff" opacity=".16"/>' +
      fill(ellD(x + 2.2 * k, -11.6 * k, 1.2 * k, 0.9 * k) + ellD(x - 3 * k, -9.4 * k, 0.9 * k, 0.7 * k), '#f6ecd4', ' opacity=".9"');
  }
  var RING = [[-2, 2, 'pg-capA', 'dome'], [-30, 1.25, 'pg-capB', 'flat'], [27, 1.4, 'pg-capC', 'bell'], [47, 0.8, 'pg-capA', 'dome'], [-50, 0.7, 'pg-capB', 'flat'], [11, 0.6, 'pg-capB', 'dome'], [-14, 0.45, 'pg-capC', 'bell']];
  function mushroom(st) {
    if (!st) return patch(1, 13, 8) + button(-2, 1.35, 'pg-capA') + button(10, 0.7, 'pg-capB');
    var q = [0, 0.62, 0.72, 0.82, 0.91, 1][st], out = patch(Math.max(2, st), 12 + st * 7.4, 8);
    RING.slice(0, [0, 2, 3, 4, 5, 7][st]).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (m) {
      var k = m[1] * q;
      out += shroom(m[0] * q, k, m[2], m[3], k < 0.6 ? 0 : k < 1 ? 1 : 2);
    });
    return out + (st >= 2 ? sprigs(12 + st * 7.4, st + 2, 9) : '');
  }

  /* ---- sunflower: a bud first, then it opens, then more heads ---- */
  function head(cx, cy, R, open, st) {
    var back = '', front = '', inner = '', n = 16, k;
    for (k = 0; k < n; k++) {
      back += leafD(cx, cy, R * (0.9 + 1.05 * open), R * 0.36, k * 360 / n + 11.25);
      front += leafD(cx, cy, R * (0.8 + 0.95 * open), R * 0.33, k * 360 / n);
      if (st >= 4) inner += leafD(cx, cy, R * (0.8 + 0.95 * open) * 0.72, R * 0.13, k * 360 / n);
    }
    return fill(back, '#d68f17') + fill(front, '#f6c833') + fill(inner, '#fbe38a') + dot(cx, cy, R * 0.8, 'url(#pg-seed)') +
      (st >= 2 ? '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R * 0.54) + '" fill="none" stroke="#a9773a" stroke-width="' + f(Math.max(0.7, R * 0.09)) + '" stroke-dasharray="1 1.5"/>' : '') +
      dot(cx, cy, R * 0.28, '#7d5c2c');
  }
  function bud(cx, cy, R) {
    var d = '';
    for (var k = 0; k < 7; k++) d += leafD(cx, cy + R * 0.3, R * 1.7, R * 0.5, -150 + k * 20);
    return fill(d, '#3f7d45') + dot(cx, cy, R * 0.75, '#5c9a44') + fill(leafD(cx - R * 0.3, cy - R * 0.2, R * 1.2, R * 0.28, -102) + leafD(cx + R * 0.3, cy - R * 0.2, R * 1.2, R * 0.28, -76), '#f6c833');
  }
  var SUN = [0, [[0, 36, 5.6, 'bud', 0]], [[0, 52, 7.5, 'half', 1]], [[-3, 66, 9.5, 'full', -2], [12, 38, 4.4, 'bud', 5]],
    [[-8, 80, 10.5, 'full', -4], [12, 60, 9, 'full', 6], [-22, 36, 4.2, 'bud', -6]],
    [[0, 92, 12.5, 'full', -2], [-24, 68, 10.5, 'full', -9], [24, 72, 10.5, 'full', 8], [10, 38, 4.5, 'bud', 4]]];
  function sunflower(st) {
    if (!st) return patch(0, 11, 12) + line('M0 -1C0.8 -6 -0.8 -11 0 -17', '#8fbf5a', 2.8) + fill(broadD(0, -16, 12, 4.4, -158), '#6aa84f') + fill(broadD(0, -16, 12.5, 4.6, -22) + leafD(0, -17, 5, 2, -90), '#8fbf5a');
    var out = patch(st, 8 + st * 4.4, 12);
    SUN[st].forEach(function (s, i) {
      var x = s[0], h = s[1], R = s[2], kind = s[3], cx = x + s[4], cy = -h, kx = x - s[4] * 0.3, lo = '', hi = '', rib = '', small = kind === 'bud' && i > 0;
      out += line('M' + f(x) + ' 0Q' + f(kx) + ' ' + f(-h * 0.55) + ' ' + f(cx) + ' ' + f(cy), '#4b8438', f(small ? 1.8 : 1.9 + R * 0.12));
      (small ? [0.34, 0.62] : h > 60 ? [0.18, 0.34, 0.5, 0.66] : [0.24, 0.44, 0.64]).forEach(function (t, j) {
        var u = 1 - t, bx = u * u * x + 2 * u * t * kx + t * t * cx, by = -(2 * u * t * 0.55 + t * t) * h, right = (j + i) % 2 === 1;
        var len = (small ? 7 : 10) + h * 0.09, tilt = -34 + u * 46, ang = right ? tilt : 180 - tilt, d = broadD(bx, by, len, len * 0.34, ang);   /* lower leaves droop */
        if (right) lo += d; else hi += d;
        if (st >= 2) rib += 'M' + f(bx) + ' ' + f(by) + 'L' + f(bx + Math.cos(ang / DEG) * len * 0.8) + ' ' + f(by + Math.sin(ang / DEG) * len * 0.8);
      });
      out += fill(lo, '#3b7a3e') + fill(hi, '#4f9648') + line(rib, '#2a5a34', 0.7, ' opacity=".7"') + (kind === 'bud' ? bud(cx, cy, R) : head(cx, cy, R, kind === 'half' ? 0.45 : 1, st));
    });
    return out + (st >= 3 ? sprigs(8 + st * 4.4, st, 13) : '');
  }

  /* ---- bluebells: nodding stems with bells hanging on one side ---- */
  var BELL = { dark: '#4c66c4', main: '#6f8de6', light: '#9fb4f5', hi: '#d3dcfb' };
  function bellD(p) {
    return 'M' + p(-2.2, 0) + 'C' + p(-2.8, 3) + ' ' + p(-2.3, 5) + ' ' + p(-3.9, 7.2) + 'L' + p(-1.7, 6.3) + 'L' + p(0, 7.9) + 'L' + p(1.7, 6.3) + 'L' + p(3.9, 7.2) + 'C' + p(2.3, 5) + ' ' + p(2.8, 3) + ' ' + p(2.2, 0) + 'Q' + p(0, -1.7) + ' ' + p(-2.2, 0) + 'Z';
  }
  function bluebell(st) {
    if (!st) return patch(0, 11, 14) + '<ellipse cx="0" cy="-3" rx="5.6" ry="5" fill="#cdb98f"/><ellipse cx="-1.6" cy="-4.6" rx="2.6" ry="1.9" fill="#e6d8b4" opacity=".7"/><ellipse cx="0" cy="1" rx="9.5" ry="2.4" fill="#3b2e22"/>' +
      fill(leafD(0, -6.5, 17, 2.4, -108) + leafD(0, -6.5, 13, 2.2, -60), g.m) + fill(leafD(0, -6.5, 20, 2.5, -84), g.l);
    var n = [0, 1, 2, 3, 4, 5][st], H = [0, 38, 50, 62, 74, 86][st], nb = [0, 3, 4, 5, 6, 7][st], r = rng(11), lv = paint(), bl = paint(), stems = '', peds = '', i, j;
    lv(g.d, '')(g.m, '')(g.l, ''); bl(BELL.dark, '')(BELL.main, '')(BELL.light, '')(BELL.hi, '');
    for (i = 0; i < n; i++) {
      var o = i - (n - 1) / 2, x = o * 7 + (r() - 0.5) * 2, h = H * (0.82 + r() * 0.2), dir = o < -0.1 ? -1 : o > 0.1 ? 1 : (r() < 0.5 ? -1 : 1);
      for (j = 0; j < (st >= 3 ? 3 : 2); j++) lv([g.d, g.m, g.l][(i + j) % 3], leafD(x + (r() - 0.5) * 3, 0, h * (0.5 + r() * 0.25), 2.2 + st * 0.15, -90 + (r() - 0.5) * 100));
      var B = [x - dir * 2, -h * 0.6], C = [x + dir, -h * 1.1], D = [x + dir * h * 0.44, -h * 0.76];
      stems += 'M' + f(x) + ' 0C' + f(B[0]) + ' ' + f(B[1]) + ' ' + f(C[0]) + ' ' + f(C[1]) + ' ' + f(D[0]) + ' ' + f(D[1]);
      for (j = 0; j < nb; j++) {
        var t = 0.44 + 0.56 * j / (nb - 1), u = 1 - t, sc = (0.95 + h / 150) * (1 - 0.42 * j / (nb - 1));
        var bx = u * u * u * x + 3 * u * u * t * B[0] + 3 * u * t * t * C[0] + t * t * t * D[0], by = 3 * u * u * t * B[1] + 3 * u * t * t * C[1] + t * t * t * D[1];
        var ox = bx + dir * 1.5 * sc, oy = by + 2 * sc, p = xf(ox, oy, -dir * 12, sc);
        peds += 'M' + f(bx) + ' ' + f(by) + 'Q' + f(bx + dir * 1.4 * sc) + ' ' + f(by + 0.2) + ' ' + f(ox) + ' ' + f(oy);
        if (j === nb - 1) { bl(BELL.dark, leafD(ox, oy - 0.5, 4.5 * sc, 1.5 * sc, 90 - dir * 12)); continue; }   /* a bud at the tip */
        bl((i + j) % 2 ? BELL.light : BELL.main, bellD(p));
        if (st >= 3) bl(BELL.hi, 'M' + p(-1.5, 0.3) + 'Q' + p(-2.1, 3.4) + ' ' + p(-2.6, 6) + 'L' + p(-1.4, 5.7) + 'Q' + p(-1, 3) + ' ' + p(-0.5, 0.2) + 'Z');
      }
    }
    return patch(st, 8 + st * 4.4, 14) + lv.out() + line(stems, '#4f8a3a', 1.8) + line(peds, '#4f8a3a', 0.8) + bl.out();
  }

  /* ---- foxgloves: tall spires over a rosette of broad leaves ---- */
  var GLOVE = { dark: '#b0468c', main: '#d264a9', light: '#f5c6df', spot: '#8a2f6c', bud: '#c9dc8a' };
  var FOX = [0, [[0, 40, 0]], [[0, 58, 1]], [[-5, 74, -2], [10, 50, 3]], [[0, 92, 0], [-15, 66, -4], [14, 58, 4]], [[1, 108, 1], [-17, 84, -5], [18, 76, 5], [-31, 52, -7]]];
  function foxglove(st) {
    var r = rng(19), lf = paint(), bl = paint(), ribs = '', stems = '', ks = [0, 1.1, 1.15, 1.2, 1.2, 1.25][st];
    lf(g.d, '')(g.m, '')('#4f9648', '');
    var rosette = function (n, L) {
      for (var i = 0; i < n; i++) {
        var a = -174 + i * 168 / (n - 1), len = L * (0.62 + 0.38 * Math.abs(Math.cos(a / DEG))) * (0.9 + r() * 0.2), bx = (i - (n - 1) / 2) * 0.8;
        lf([g.m, '#4f9648', g.d][i % 3], broadD(bx, -1, len, len * 0.3, a));
        if (st >= 3) ribs += 'M' + f(bx) + ' -1L' + f(bx + Math.cos(a / DEG) * len * 0.8) + ' ' + f(-1 + Math.sin(a / DEG) * len * 0.8);
      }
    };
    if (!st) { rosette(5, 17); return patch(0, 12, 15) + lf.out(); }
    rosette(4 + st, 13 + st * 2);
    bl(GLOVE.dark, '')(GLOVE.main, '')(GLOVE.light, '')(GLOVE.spot, '')(GLOVE.bud, '');
    FOX[st].forEach(function (s, si) {
      var x = s[0], h = s[1], lean = s[2], nf = Math.max(4, Math.round(h * 0.54 / 5.6));
      var at = function (t) { var u = 1 - t; return [u * u * x + 2 * u * t * (x - lean * 0.3) + t * t * (x + lean), -(2 * u * t * 0.5 + t * t) * h]; };
      stems += 'M' + f(x) + ' 0Q' + f(x - lean * 0.3) + ' ' + f(-h * 0.5) + ' ' + f(x + lean) + ' ' + f(-h);
      [0.14, 0.25].forEach(function (t, k) { var q = at(t), right = (k + si) % 2 === 1; lf(right ? g.m : '#4f9648', broadD(q[0], q[1], 7 + h * 0.04, 2.3, right ? -38 : 218)); });
      for (var j = 0; j < nf; j++) {
        var u = j / (nf - 1), q = at(0.36 + 0.58 * u), sd = (j + si) % 2 ? 1 : -1, sc = ks * (1.15 - 0.75 * u);
        if (u > 0.82) { bl(GLOVE.bud, leafD(q[0], q[1], 3.6 * ks, 1.3 * ks, -90 + sd * 50)); continue; }   /* still in bud near the top */
        var p = xf(q[0] + sd * 0.6, q[1], -sd * (30 + u * 16), sc);
        bl(j % 3 === 2 ? GLOVE.dark : GLOVE.main, 'M' + p(-1.6, 0) + 'C' + p(-2.5, 2.6) + ' ' + p(-2.5, 5.6) + ' ' + p(-3.5, 8.2) + 'Q' + p(0, 10.6) + ' ' + p(3.5, 8.2) + 'C' + p(2.5, 5.6) + ' ' + p(2.5, 2.6) + ' ' + p(1.6, 0) + 'Q' + p(0, -1.5) + ' ' + p(-1.6, 0) + 'Z');
        bl(GLOVE.light, 'M' + p(-3.5, 8.2) + 'Q' + p(0, 10.6) + ' ' + p(3.5, 8.2) + 'Q' + p(0, 6.4) + ' ' + p(-3.5, 8.2) + 'Z');
        if (st >= 4 && sc > 0.7) bl(GLOVE.spot, 'M' + p(-1.5, 8.1) + 'L' + p(-1, 7.6) + 'L' + p(-0.5, 8.1) + 'L' + p(-1, 8.7) + 'ZM' + p(0.6, 8.4) + 'L' + p(1.1, 7.9) + 'L' + p(1.6, 8.4) + 'L' + p(1.1, 9) + 'Z');
      }
      bl(GLOVE.bud, leafD(x + lean, -h + 1, 4.5 * ks, 1.4 * ks, -90));
    });
    return patch(st, 8 + st * 3.8, 15) + lf.out() + line(ribs, g.dd, 0.6, ' opacity=".6"') + line(stems, '#4b8438', f(1.5 + st * 0.12)) + bl.out();
  }

  /* ---- reeds: cattails standing in a pool ---- */
  function reed(st) {
    var r = rng(5), ww = 14 + st * 6, p = paint(), out, i;
    out = '<ellipse cx="0" cy="1" rx="' + ww + '" ry="' + f(3 + st * 0.5) + '" fill="#234c63" opacity=".85"/><ellipse cx="' + f(-ww * 0.2) + '" cy="0.4" rx="' + f(ww * 0.55) + '" ry="1.4" fill="#7fb6cf" opacity=".32"/>';
    if (!st) return out + fill(leafD(-3, 0, 18, 2, -106) + leafD(3, 0, 14, 1.9, -68), g.m) + fill(leafD(0, 0, 23, 2.2, -88), g.l);
    if (st >= 2) out += line('M' + f(-ww * 0.7) + ' 2.2h' + f(ww * 0.3) + 'M' + f(ww * 0.25) + ' 2.6h' + f(ww * 0.4) + 'M' + f(-ww * 0.1) + ' 3.4h' + f(ww * 0.25), '#a9d3e4', 0.6, ' opacity=".5"');
    var n = st, nb = [0, 6, 9, 12, 15, 18][st], H = [0, 44, 60, 75, 90, 104][st], sp = 5 + st * 3.4;
    p(g.dd, '')(g.d, '')(g.m, '')(g.l, '');
    for (i = 0; i < nb; i++) {
      var bx = (r() * 2 - 1) * sp;
      p([g.d, g.m, g.l, g.dd][i % 4], leafD(bx, 0.5, H * (0.42 + r() * 0.5), 2 + st * 0.2 + r() * 0.6, -90 + (bx / sp) * 14 + (r() - 0.5) * 22));
    }
    out += p.out();
    if (st >= 3) out += line('M' + f(-sp * 0.5) + ' 0Q' + f(-sp * 0.9) + ' ' + f(-H * 0.5) + ' ' + f(-sp * 1.9) + ' ' + f(-H * 0.42) + 'M' + f(sp * 0.4) + ' 0Q' + f(sp * 0.9) + ' ' + f(-H * 0.56) + ' ' + f(sp * 2) + ' ' + f(-H * 0.5), g.m, 1.6);
    for (i = 0; i < n; i++) {
      var o = i - (n - 1) / 2, x = o * (7.4 - st * 0.3) + (r() - 0.5) * 3, h = H * (i === Math.floor(n / 2) ? 1 : 0.68 + r() * 0.22) - 10, cx = x + o * 2.2 + (r() - 0.5) * 5, hl = 9 + st * 1.3, hw = 2 + st * 0.22;
      out += line('M' + f(x) + ' 0Q' + f(x - (cx - x) * 0.2) + ' ' + f(-h * 0.55) + ' ' + f(cx) + ' ' + f(-h + hl * 0.3), i % 2 ? '#5c9a44' : g.l, f(1.5 + st * 0.1)) +
        line('M' + f(cx) + ' ' + f(-h - hl * 0.6) + 'v' + f(-4 - st), g.l, 1) +
        '<rect x="' + f(cx - hw) + '" y="' + f(-h - hl * 0.7) + '" width="' + f(hw * 2) + '" height="' + f(hl) + '" rx="' + f(hw) + '" fill="url(#pg-cat)"/>';
    }
    if (st >= 4) out += fill('M' + f(ww * 0.55 - 6) + ' 1.8a6 2.1 0 1 0 6.4 -2l-0.6 2Z', '#4f8a3c') + fill(ellD(ww * 0.55 - 1.5, 1.2, 2.6, 0.8), '#6aa84f', ' opacity=".7"');
    if (st === 5) out += fill(ellD(-ww * 0.62, 2.2, 4.6, 1.6), '#4f8a3c') + fill(leafD(-ww * 0.62, 1.6, 3.4, 1.2, -140) + leafD(-ww * 0.62, 1.6, 3.4, 1.2, -40) + leafD(-ww * 0.62, 1.6, 3.6, 1.2, -90), '#f4f1e2');
    return out;
  }

  var DRAW = {
    fern: fern, pine: pine, berry: berry, mushroom: mushroom, reed: reed, birch: birch, bamboo: bamboo, sunflower: sunflower, bluebell: bluebell, foxglove: foxglove,
    oak: function (st) { return broadleaf(st, OAK); },
    maple: function (st) { return broadleaf(st, MAPLE); }
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

  /* shared with scene.js */
  P.tools = { rng: rng, leaf: leaf, moss: moss, g: g };
})();
