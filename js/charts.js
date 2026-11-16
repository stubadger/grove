/* Grove charts: small SVG chart builders. Each takes the pixel width it will be drawn at
   and returns an SVG string. Hover/focus details come from a data-tip attribute (JSON)
   that app.js turns into a tooltip. */
(function () {
  'use strict';
  var CH = LD.charts = {}, D = LD.date;

  var esc = CH.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var f = function (n) { return Math.round(n * 10) / 10; };
  var num = CH.num = function (n) { return n == null ? '–' : Math.round(n).toLocaleString(); };
  var tip = CH.tip = function (title, rows) { return esc(JSON.stringify({ t: title, r: rows || [] })); };

  CH.ramp = ['#203528', '#2f5a36', '#4a8243', '#76ad4d', '#b5d56a'];

  function niceMax(v) {
    if (v <= 0) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 4 ? 4 : m <= 5 ? 5 : m <= 8 ? 8 : 10) * p;
  }
  function open(w, h, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(label || 'Chart') + '">';
  }
  function yAxis(m, pw, ph, max, n, fmt) {
    var s = '';
    for (var i = 0; i <= n; i++) {
      var v = max * i / n, y = f(m.t + ph - ph * i / n);
      s += '<line class="' + (i ? 'gl' : 'bl') + '" x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + y + '" y2="' + y + '"/>' +
           '<text class="ax" x="' + (m.l - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    return s;
  }
  function axisFmt(max) {
    return function (v) { return max >= 10000 ? (v === 0 ? '0' : f(v / 1000) + 'K') : num(v); };
  }
  function xLabels(m, ph, labels, xOf, pw) {
    var n = labels.length, step = Math.max(1, Math.ceil(n * 50 / pw)), s = '';
    for (var i = 0; i < n; i++) {
      if ((n - 1 - i) % step) continue;
      var x = xOf(i), edge = m.l + pw + m.r - 2, end = x + 20 > edge;   /* keep the last label inside the chart */
      s += '<text class="ax" x="' + f(end ? edge : x) + '" y="' + (m.t + ph + 16) + '" text-anchor="' + (end ? 'end' : 'middle') + '">' + esc(labels[i]) + '</text>';
    }
    return s;
  }
  function roundTop(x, yTop, w, yBase, r) {
    r = Math.max(0, Math.min(r, w / 2, yBase - yTop));
    return 'M' + f(x) + ' ' + f(yBase) + 'V' + f(yTop + r) + 'Q' + f(x) + ' ' + f(yTop) + ' ' + f(x + r) + ' ' + f(yTop) +
           'H' + f(x + w - r) + 'Q' + f(x + w) + ' ' + f(yTop) + ' ' + f(x + w) + ' ' + f(yTop + r) + 'V' + f(yBase) + 'Z';
  }
  function goalLine(m, pw, y, label) {
    return '<line class="goal" x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + f(y) + '" y2="' + f(y) + '"/>' +
           '<text class="goalt" x="' + (m.l + pw) + '" y="' + f(y - 5) + '" text-anchor="end">' + esc(label) + '</text>';
  }

  /* Single-series bars. o: values[], labels[], tips[] (titles), name, color, goal, goalLabel, max, tickN, unit, height */
  CH.bars = function (w, o) {
    var h = o.height || 190, m = { l: 40, r: 10, t: 16, b: 24 }, pw = w - m.l - m.r, ph = h - m.t - m.b, n = o.values.length;
    var dm = Math.max.apply(null, o.values.map(function (v) { return v || 0; }).concat([o.goal || 0]));
    var max = o.max || niceMax(dm * 1.08 || 1), tn = o.tickN || 4, y0 = m.t + ph;
    var band = pw / n, bw = Math.max(1, Math.min(24, band - 2));
    var fmt = o.fmt || num;
    var s = open(w, h, o.name) + yAxis(m, pw, ph, max, tn, axisFmt(max));
    for (var i = 0; i < n; i++) {
      var v = o.values[i], x = m.l + i * band + (band - bw) / 2;
      var row = v == null ? ['No entry', o.name] : [fmt(v) + (o.unit || ''), o.name, o.color];
      s += '<g class="col" tabindex="0" data-tip="' + tip(o.tips ? o.tips[i] : o.labels[i], [row].concat(o.extra ? [o.extra[i]] : []).filter(Boolean)) + '">' +
           '<rect class="hit" x="' + f(m.l + i * band) + '" y="' + m.t + '" width="' + f(band) + '" height="' + ph + '"/>';
      if (v > 0) s += '<path class="mark" fill="' + o.color + '" d="' + roundTop(x, y0 - (v / max) * ph, bw, y0, 4) + '"/>';
      s += '</g>';
    }
    if (o.goal) s += goalLine(m, pw, y0 - (o.goal / max) * ph, o.goalLabel || 'Goal');
    s += xLabels(m, ph, o.labels, function (i) { return m.l + i * band + band / 2; }, pw);
    return s + '</svg>';
  };

  /* Stacked bars. o: series[{name,color,values[]}], labels[], tips[], unit, height */
  CH.stacked = function (w, o) {
    var h = o.height || 210, m = { l: 40, r: 10, t: 16, b: 24 }, pw = w - m.l - m.r, ph = h - m.t - m.b, n = o.labels.length;
    var tot = o.labels.map(function (_, i) { return o.series.reduce(function (a, sr) { return a + (sr.values[i] || 0); }, 0); });
    var max = niceMax(Math.max.apply(null, tot.concat([1])) * 1.05), y0 = m.t + ph;
    var band = pw / n, bw = Math.max(1, Math.min(24, band - 2));
    var s = open(w, h, o.name) + yAxis(m, pw, ph, max, 4, axisFmt(max));
    for (var i = 0; i < n; i++) {
      var x = m.l + i * band + (band - bw) / 2;
      var live = o.series.filter(function (sr) { return sr.values[i] > 0; });
      var rows = live.map(function (sr) { return [num(sr.values[i]) + (o.unit || ''), sr.name, sr.color]; });
      rows.push([num(tot[i]) + (o.unit || ''), 'Total']);
      s += '<g class="col" tabindex="0" data-tip="' + tip(o.tips[i], tot[i] ? rows : [['Nothing logged', '']]) + '">' +
           '<rect class="hit" x="' + f(m.l + i * band) + '" y="' + m.t + '" width="' + f(band) + '" height="' + ph + '"/>';
      var acc = 0;
      live.forEach(function (sr, j) {
        var yb = y0 - (acc / max) * ph; acc += sr.values[i];
        var yt = y0 - (acc / max) * ph, last = j === live.length - 1;
        if (!last) yt += 2;
        if (yb - yt < 1) yt = yb - 1;
        s += last ? '<path class="mark" fill="' + sr.color + '" d="' + roundTop(x, yt, bw, yb, 4) + '"/>'
                  : '<rect class="mark" fill="' + sr.color + '" x="' + f(x) + '" y="' + f(yt) + '" width="' + f(bw) + '" height="' + f(yb - yt) + '"/>';
      });
      s += '</g>';
    }
    s += xLabels(m, ph, o.labels, function (i) { return m.l + i * band + band / 2; }, pw);
    return s + '</svg>';
  };

  /* Line with a soft area. o: values[] (null = gap), labels[], tips[], name, color, max, fmt, goal, goalLabel, height */
  CH.line = function (w, o) {
    var h = o.height || 190, m = { l: 40, r: 18, t: 18, b: 24 }, pw = w - m.l - m.r, ph = h - m.t - m.b, n = o.values.length;
    var dm = Math.max.apply(null, o.values.map(function (v) { return v || 0; }).concat([o.goal || 0]));
    var max = o.max || niceMax(dm * 1.1 || 1), y0 = m.t + ph, fmt = o.fmt || num;
    var X = function (i) { return m.l + (n === 1 ? pw / 2 : pw * i / (n - 1)); };
    var Y = function (v) { return y0 - (v / max) * ph; };
    var s = open(w, h, o.name) + yAxis(m, pw, ph, max, 4, o.axisFmt || axisFmt(max));
    var d = '', area = '', runStart = -1, lastI = -1, i;
    for (i = 0; i <= n; i++) {
      var v = i < n ? o.values[i] : null;
      if (v != null) {
        d += (runStart < 0 ? 'M' : 'L') + f(X(i)) + ' ' + f(Y(v));
        if (runStart < 0) { runStart = i; area += 'M' + f(X(i)) + ' ' + f(y0) + 'L' + f(X(i)) + ' ' + f(Y(v)); }
        else area += 'L' + f(X(i)) + ' ' + f(Y(v));
        lastI = i;
      } else if (runStart >= 0) {
        area += 'L' + f(X(i - 1)) + ' ' + f(y0) + 'Z'; runStart = -1;
      }
    }
    if (area) s += '<path d="' + area + '" fill="' + o.color + '" opacity=".1"/>';
    if (o.goal) s += goalLine(m, pw, Y(o.goal), o.goalLabel || 'Goal');
    if (d) s += '<path d="' + d + '" fill="none" stroke="' + o.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    var band = n > 1 ? pw / (n - 1) : pw;
    for (i = 0; i < n; i++) {
      var val = o.values[i], hx = Math.max(m.l, X(i) - band / 2), hw = Math.min(m.l + pw, X(i) + band / 2) - hx;
      s += '<g class="col" tabindex="0" data-tip="' + tip(o.tips ? o.tips[i] : o.labels[i], [val == null ? ['No entry', o.name] : [fmt(val), o.name, o.color]]) + '">' +
           '<rect class="hit" x="' + f(hx) + '" y="' + m.t + '" width="' + f(hw) + '" height="' + ph + '"/>' +
           '<line class="xh" x1="' + f(X(i)) + '" x2="' + f(X(i)) + '" y1="' + m.t + '" y2="' + y0 + '"/>';
      if (val != null) s += '<circle class="xh dot" cx="' + f(X(i)) + '" cy="' + f(Y(val)) + '" r="4" fill="' + o.color + '"/>';
      s += '</g>';
    }
    if (lastI >= 0) {
      var lv = o.values[lastI], ly = Y(lv), ty = ly - 10 < m.t + 2 ? ly + 18 : ly - 10;
      s += '<circle class="dot" cx="' + f(X(lastI)) + '" cy="' + f(ly) + '" r="4" fill="' + o.color + '"/>' +
           '<text class="endl" x="' + f(X(lastI) + (lastI > n / 2 ? 4 : -4)) + '" y="' + f(ty) + '" text-anchor="' + (lastI > n / 2 ? 'end' : 'start') + '">' + esc(fmt(lv)) + '</text>';
    }
    s += xLabels(m, ph, o.labels, X, pw);
    return s + '</svg>';
  };

  /* Calendar heatmap, weeks as columns. o: end, weeks, get(date) -> {v: 0..1|null, t: title, r: rows} */
  CH.heat = function (w, o) {
    var left = 24, top = 18, cell = Math.max(8, Math.min(20, Math.floor((w - left) / o.weeks) - 3)), step = cell + 3;
    var h = top + 7 * step + 2, start = D.add(D.weekStart(o.end), -7 * (o.weeks - 1));
    var s = open(left + o.weeks * step, h, o.name), lastMonth = -1;
    ['M', '', 'W', '', 'F', '', ''].forEach(function (t, i) {
      if (t) s += '<text class="ax" x="0" y="' + (top + i * step + cell - 2) + '">' + t + '</text>';
    });
    for (var wk = 0; wk < o.weeks; wk++) {
      var mon = D.add(start, wk * 7), mo = D.parse(mon).getMonth();
      if (mo !== lastMonth && wk < o.weeks - 1) {
        s += '<text class="ax" x="' + (left + wk * step) + '" y="10">' + D.fmt(mon, { month: 'short' }) + '</text>';
        lastMonth = mo;
      }
      for (var dw = 0; dw < 7; dw++) {
        var date = D.add(mon, dw);
        if (date > o.end) continue;
        var g = o.get(date), idx = g.v == null ? 0 : g.v <= 0 ? 0 : Math.min(4, 1 + Math.floor(g.v * 4 - 1e-9));
        s += '<rect class="cell" data-tip="' + tip(g.t, g.r) + '" x="' + (left + wk * step) + '" y="' + (top + dw * step) +
             '" width="' + cell + '" height="' + cell + '" rx="3" fill="' + CH.ramp[idx] + '"/>';
      }
    }
    return s + '</svg>';
  };

  /* Habit grid: one row per habit, one cell per day. o: rows[{label, cells[bool]}], dates[], color, name */
  CH.grid = function (w, o) {
    var n = o.dates.length, labW = Math.round(Math.min(190, Math.max(96, w * 0.34)));
    var cell = Math.max(5, Math.min(28, Math.floor((w - labW) / n) - 2)), step = cell + 2, rowH = Math.max(step, 24), top = 18;
    var h = top + o.rows.length * rowH + 2, maxCh = Math.floor(labW / 6.3);
    var s = open(w, h, o.name);
    o.dates.forEach(function (d, i) {
      if ((n - 1 - i) % 7 === 0) s += '<text class="ax" x="' + (labW + i * step + cell / 2) + '" y="10" text-anchor="middle">' + D.fmt(d, { day: 'numeric', month: 'short' }) + '</text>';
    });
    o.rows.forEach(function (r, ri) {
      var y = top + ri * rowH, lab = r.label.length > maxCh ? r.label.slice(0, maxCh - 1) + '…' : r.label;
      s += '<text class="rowl" x="0" y="' + (y + rowH / 2 + 4) + '"><title>' + esc(r.label) + '</title>' + esc(lab) + '</text>';
      r.cells.forEach(function (c, i) {
        /* null = the habit does not apply that day: drawn as an empty outline */
        s += '<rect class="cell" data-tip="' + tip(D.fmt(o.dates[i]), [[c == null ? 'Not a day for this' : c ? 'Done' : 'Not ticked', r.label, c ? o.color : null]]) +
             '" x="' + (labW + i * step) + '" y="' + f(y + (rowH - cell) / 2) + '" width="' + cell + '" height="' + cell + '" rx="3" ' +
             (c == null ? 'fill="transparent" stroke="' + CH.ramp[0] + '" stroke-width="1"' : 'fill="' + (c ? o.color : CH.ramp[0]) + '"') + '/>';
      });
    });
    return s + '</svg>';
  };

  /* Dot strip: one row per item, a dot on each date it happened. o: rows[{label, dates[]}], start, end, color, name */
  CH.strip = function (w, o) {
    var labW = Math.round(Math.min(190, Math.max(96, w * 0.34))), rowH = 28, top = 20, span = Math.max(1, D.diff(o.end, o.start));
    var pw = w - labW - 10, h = top + o.rows.length * rowH + 4, maxCh = Math.floor(labW / 6.3);
    var X = function (d) { return labW + (D.diff(d, o.start) / span) * pw; };
    var s = open(w, h, o.name), d = D.weekStart(o.end), k = 0, every = Math.max(1, Math.ceil((span / 7) * 52 / pw));
    while (d >= o.start) {
      if (k % every === 0) {
        s += '<line class="gl" x1="' + f(X(d)) + '" x2="' + f(X(d)) + '" y1="' + (top - 4) + '" y2="' + (h - 4) + '"/>' +
             '<text class="ax" x="' + f(X(d)) + '" y="10" text-anchor="middle">' + D.fmt(d, { day: 'numeric', month: 'short' }) + '</text>';
      }
      d = D.add(d, -7); k++;
    }
    o.rows.forEach(function (r, ri) {
      var y = top + ri * rowH + rowH / 2, lab = r.label.length > maxCh ? r.label.slice(0, maxCh - 1) + '…' : r.label;
      s += '<text class="rowl" x="0" y="' + (y + 4) + '"><title>' + esc(r.label) + '</title>' + esc(lab) + '</text>' +
           '<line class="bl" x1="' + labW + '" x2="' + (labW + pw) + '" y1="' + y + '" y2="' + y + '"/>';
      r.dates.forEach(function (dt) {
        if (dt < o.start || dt > o.end) return;
        s += '<g class="pt" tabindex="0" data-tip="' + tip(D.fmt(dt), [['Done', r.label, o.color]]) + '"><circle class="hit" cx="' + f(X(dt)) + '" cy="' + y + '" r="12"/>' +
             '<circle class="dot mark" cx="' + f(X(dt)) + '" cy="' + y + '" r="4.5" fill="' + o.color + '"/></g>';
      });
    });
    return s + '</svg>';
  };

  /* Progress ring with a centred figure */
  CH.ring = function (size, pct, color, big, small) {
    var sw = 9, r = (size - sw) / 2, c = 2 * Math.PI * r, cx = size / 2;
    return '<svg class="ring" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(big + ' ' + small) + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-opacity=".22" stroke-width="' + sw + '"/>' +
      (pct > 0 ? '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' +
        f(c * Math.min(1, pct)) + ' ' + f(c) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' : '') +
      '<text class="ringb" x="' + cx + '" y="' + (cx + 2) + '" text-anchor="middle">' + esc(big) + '</text>' +
      '<text class="rings" x="' + cx + '" y="' + (cx + 18) + '" text-anchor="middle">' + esc(small) + '</text></svg>';
  };

  /* The night plan: 8pm to noon with wind-down, sleep and daylight bands. bands: [{from,to,color,name}] in minutes after 8pm */
  CH.night = function (w, bands) {
    var h = 58, m = { l: 4, r: 4 }, pw = w - m.l - m.r, span = 16 * 60, y = 8, bh = 18;
    var X = function (min) { return m.l + pw * Math.max(0, Math.min(span, min)) / span; };
    var s = open(w, h, 'Night plan from 8pm to noon') + '<rect x="' + m.l + '" y="' + y + '" width="' + pw + '" height="' + bh + '" rx="9" fill="' + CH.ramp[0] + '"/>';
    bands.forEach(function (b) {
      var x1 = X(b.from), x2 = X(b.to);
      if (x2 - x1 < 1) return;
      s += '<rect class="cell" data-tip="' + tip(b.name, [[b.label, '', b.color]]) + '" x="' + f(x1 + 1) + '" y="' + y + '" width="' + f(Math.max(1, x2 - x1 - 2)) + '" height="' + bh + '" rx="4" fill="' + b.color + '"/>';
    });
    [['8 pm', 0], ['12 am', 240], ['4 am', 480], ['8 am', 720], ['12 pm', 960]].forEach(function (t, i, a) {
      s += '<line class="bl" x1="' + f(X(t[1])) + '" x2="' + f(X(t[1])) + '" y1="' + (y + bh + 3) + '" y2="' + (y + bh + 8) + '"/>' +
           '<text class="ax" x="' + f(X(t[1])) + '" y="' + (y + bh + 22) + '" text-anchor="' + (i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle') + '">' + t[0] + '</text>';
    });
    return s + '</svg>';
  };

  /* Several lines on one axis. o: series[{name,color,values[] (null = gap)}], labels[], tips[], max, tickN, fmt, axisFmt, height */
  CH.lines = function (w, o) {
    var h = o.height || 200, m = { l: 40, r: 18, t: 18, b: 24 }, pw = w - m.l - m.r, ph = h - m.t - m.b, n = o.labels.length, dm = 0;
    o.series.forEach(function (sr) { sr.values.forEach(function (v) { if (v > dm) dm = v; }); });
    var max = o.max || niceMax(dm * 1.1 || 1), y0 = m.t + ph, fmt = o.fmt || num;
    var X = function (i) { return m.l + (n === 1 ? pw / 2 : pw * i / (n - 1)); }, Y = function (v) { return y0 - (v / max) * ph; };
    var s = open(w, h, o.name) + yAxis(m, pw, ph, max, o.tickN || 4, o.axisFmt || axisFmt(max)), i;
    o.series.forEach(function (sr) {
      var d = '', run = false, last = -1, dots = '', count = 0;
      sr.values.forEach(function (v, k) {
        if (v == null) { run = false; return; }
        d += (run ? 'L' : 'M') + f(X(k)) + ' ' + f(Y(v)); run = true; last = k; count++;
        dots += '<circle cx="' + f(X(k)) + '" cy="' + f(Y(v)) + '" r="2.4" fill="' + sr.color + '"/>';
      });
      if (d) s += '<path d="' + d + '" fill="none" stroke="' + sr.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      if (count <= 45) s += dots;   /* with few points, mark each one so single days still show */
      if (last >= 0) s += '<circle class="dot" cx="' + f(X(last)) + '" cy="' + f(Y(sr.values[last])) + '" r="4" fill="' + sr.color + '"/>';
    });
    var band = n > 1 ? pw / (n - 1) : pw;
    for (i = 0; i < n; i++) {
      var hx = Math.max(m.l, X(i) - band / 2), hw = Math.min(m.l + pw, X(i) + band / 2) - hx, marks = '';
      var rows = o.series.map(function (sr) {
        var v = sr.values[i];
        if (v != null) marks += '<circle class="xh dot" cx="' + f(X(i)) + '" cy="' + f(Y(v)) + '" r="4" fill="' + sr.color + '"/>';
        return [v == null ? 'No entry' : fmt(v), sr.name, sr.color];
      });
      s += '<g class="col" tabindex="0" data-tip="' + tip(o.tips ? o.tips[i] : o.labels[i], rows) + '"><rect class="hit" x="' + f(hx) + '" y="' + m.t + '" width="' + f(hw) + '" height="' + ph + '"/>' +
           '<line class="xh" x1="' + f(X(i)) + '" x2="' + f(X(i)) + '" y1="' + m.t + '" y2="' + y0 + '"/>' + marks + '</g>';
    }
    return s + xLabels(m, ph, o.labels, X, pw) + '</svg>';
  };

  /* Bars side by side for two or three series. o: series[{name,color,values[]}], labels[], tips[], max, tickN, unit, height */
  CH.groups = function (w, o) {
    var h = o.height || 200, m = { l: 40, r: 10, t: 16, b: 24 }, pw = w - m.l - m.r, ph = h - m.t - m.b, n = o.labels.length, ns = o.series.length, dm = 0;
    o.series.forEach(function (sr) { sr.values.forEach(function (v) { if (v > dm) dm = v; }); });
    var max = o.max || niceMax(dm * 1.08 || 1), y0 = m.t + ph, band = pw / n, bw = Math.max(2, Math.min(13, (band - 4) / ns - 2)), gw = ns * bw + (ns - 1) * 2;
    var s = open(w, h, o.name) + yAxis(m, pw, ph, max, o.tickN || 4, axisFmt(max));
    for (var i = 0; i < n; i++) {
      var x0 = m.l + i * band + (band - gw) / 2, bars = '';
      var rows = o.series.map(function (sr, k) {
        var v = sr.values[i];
        if (v > 0) bars += '<path class="mark" fill="' + sr.color + '" d="' + roundTop(x0 + k * (bw + 2), y0 - (v / max) * ph, bw, y0, 3) + '"/>';
        return [v == null ? 'No entry' : num(v) + (o.unit || ''), sr.name, sr.color];
      });
      s += '<g class="col" tabindex="0" data-tip="' + tip(o.tips ? o.tips[i] : o.labels[i], rows) + '"><rect class="hit" x="' + f(m.l + i * band) + '" y="' + m.t + '" width="' + f(band) + '" height="' + ph + '"/>' + bars + '</g>';
    }
    return s + xLabels(m, ph, o.labels, function (k) { return m.l + k * band + band / 2; }, pw) + '</svg>';
  };

  /* Radar: one shape over spokes, each spoke running from 0 at the centre to 100% at the rim. o: axes[{name, v (0..1)}], color, name */
  CH.radar = function (w, o) {
    var size = Math.min(w, 320), h = size, cx = w / 2, cy = h / 2 + 2, R = size / 2 - 46, n = o.axes.length, i, s = open(w, h, o.name), shape = '';
    var pt = function (k, v) { var a = -Math.PI / 2 + k * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
    [0.25, 0.5, 0.75, 1].forEach(function (ring) {
      var d = '';
      for (i = 0; i < n; i++) { var p = pt(i, ring); d += (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); }
      s += '<path d="' + d + 'Z" fill="none" class="' + (ring === 1 ? 'bl' : 'gl') + '"/>';
    });
    s += '<text class="ax" x="' + f(cx + 4) + '" y="' + f(cy - R * 0.5 + 3) + '">50%</text><text class="ax" x="' + f(cx + 4) + '" y="' + f(cy - R + 12) + '">100%</text>';
    for (i = 0; i < n; i++) {
      var e = pt(i, 1), l = pt(i, 1.2), v = Math.max(0, Math.min(1, o.axes[i].v || 0)), q = pt(i, v), cs = Math.cos(-Math.PI / 2 + i * 2 * Math.PI / n);
      s += '<line class="gl" x1="' + f(cx) + '" y1="' + f(cy) + '" x2="' + f(e[0]) + '" y2="' + f(e[1]) + '"/>' +
           '<text class="rowl" x="' + f(l[0]) + '" y="' + f(l[1] + 4) + '" text-anchor="' + (Math.abs(cs) < 0.3 ? 'middle' : cs > 0 ? 'start' : 'end') + '">' + esc(o.axes[i].name) + '</text>';
      shape += (i ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1]);
    }
    s += '<path d="' + shape + 'Z" fill="' + o.color + '" fill-opacity=".2" stroke="' + o.color + '" stroke-width="2" stroke-linejoin="round"/>';
    for (i = 0; i < n; i++) {
      var d2 = pt(i, Math.max(0, Math.min(1, o.axes[i].v || 0)));
      s += '<g class="pt" tabindex="0" data-tip="' + tip(o.axes[i].name, [[Math.round((o.axes[i].v || 0) * 100) + '%', 'of its list done', o.color]]) + '"><circle class="hit" cx="' + f(d2[0]) + '" cy="' + f(d2[1]) + '" r="13"/>' +
           '<circle class="dot mark" cx="' + f(d2[0]) + '" cy="' + f(d2[1]) + '" r="4.5" fill="' + o.color + '"/></g>';
    }
    return s + '</svg>';
  };
})();
