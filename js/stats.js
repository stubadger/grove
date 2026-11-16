/* Grove stats: the Stats page, the daily energy and mood check-in, the workout log, and extra graphs for each section.
   Everything here is worked out from the saved log each time it is drawn. Page helpers come from app.js as LD.ui.

   LD.pages.stats            the Stats page
   LD.more.subnav(on)        the Journey / Stats / Week in review switch
   LD.more.feelCard(date)    energy and mood on the Today page
   LD.more.workoutCard()     today's session on the Movement page: tick exercises, note weights
   LD.more.sectionCharts(a)  extra graphs at the bottom of a section page */
(function () {
  'use strict';
  var C = LD.config, S = LD.store, G = LD.game, D = LD.date, CH = LD.charts;
  var esc = CH.esc, num = CH.num, short = { day: 'numeric', month: 'short' };
  var avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
  var one = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };
  var day = function (d) { return S.state.days[d] || {}; };
  var live = function (d) { return d >= S.state.startDate && d <= D.today(); };
  /* two series on one chart: a pair the colour-blind check passes, used wherever two things are compared */
  var PAIR = ['#3987e5', '#c98500'];
  function weeksBack(n) { var ws = D.weekStart(D.today()), out = []; for (var k = n - 1; k >= 0; k--) out.push(D.add(ws, -7 * k)); return out; }
  function weekDates(ws) { return D.range(D.add(ws, 6), 7).filter(live); }
  function wkLabel(w) { return D.fmt(w, short); }
  function empty(title, text) { return '<section class="card insight"><header><h3>' + title + '</h3></header><p class="empty">' + text + '</p></section>'; }

  LD.more.subnav = function (on) {
    return '<nav class="subnav" aria-label="Progress pages">' + [['journey', 'Journey'], ['stats', 'Stats'], ['week', 'Week in review']].map(function (x) {
      return '<a href="#/' + x[0] + '"' + (x[0] === on ? ' class="on" aria-current="page"' : '') + '>' + x[1] + '</a>';
    }).join('') + '</nav>';
  };

  /* ================= energy and mood ================= */
  var FEEL = { energy: ['Energy', ['Flat', 'Low', 'Okay', 'Good', 'Full']], mood: ['Mood', ['Rough', 'Low', 'Okay', 'Good', 'Great']] };
  LD.more.feelCard = function (date) {
    var d = S.day(date), U = LD.ui;
    var row = function (k) {
      var cur = d[k] || 0, name = FEEL[k][0], words = FEEL[k][1];
      return '<div class="feel"><span class="lab">' + name + '</span><div class="scale" role="group" aria-label="' + name + ', 1 to 5">' + [1, 2, 3, 4, 5].map(function (v) {
        return '<button class="lvl' + (v <= cur ? ' on' : '') + '" aria-pressed="' + (v === cur) + '" aria-label="' + name + ' ' + v + ' of 5, ' + words[v - 1] + '" title="' + words[v - 1] +
          '" data-act="feel" data-k="' + k + '" data-v="' + v + '" data-date="' + date + '" data-key="fl-' + k + v + '"><i style="height:' + (6 + v * 4) + 'px"></i></button>';
      }).join('') + '</div><span class="word">' + (cur ? words[cur - 1] : '') + '</span></div>';
    };
    return '<section class="card' + (d.energy && d.mood ? ' complete' : '') + '"><header><h3>' + U.icon('pulse') + ' How are you today?</h3><span class="count">' + (d.energy && d.mood ? 'Noted' : 'Optional') + '</span></header>' +
      row('energy') + row('mood') + '<p class="hint">One tap each, worth ' + C.xp.checkin + ' XP. It feeds the charts on the <a href="#/stats">Stats page</a>.</p></section>';
  };
  LD.actions.feel = function (d, e) { LD.ui.act(function () { S.setFeel(d.date, d.k, +d.v); }, e); };

  function feelCards() {
    var today = D.today(), dates = D.range(today, 30), en = dates.map(function (d) { return day(d).energy || null; }), mo = dates.map(function (d) { return day(d).mood || null; });
    var count = en.concat(mo).filter(Boolean).length, U = LD.ui, labels = dates.map(function (d) { return D.fmt(d, short); });
    if (!count) return empty('Energy and mood', 'Tap how you are on the Today page and a chart of your energy and mood builds up here.');
    var series = [{ name: 'Energy', color: PAIR[1], values: en }, { name: 'Mood', color: PAIR[0], values: mo }];
    var out = U.chartCard('Energy and mood', 'Your two daily taps over the last 30 days, from 1 to 5.', function (w) {
      return CH.lines(w, { name: 'Energy and mood', series: series, labels: labels, tips: dates.map(function (d) { return D.fmt(d); }), max: 5, tickN: 5, fmt: function (v) { return v + ' of 5'; } });
    }, { head: ['Day', 'Energy', 'Mood'], rows: dates.map(function (d, i) { return [D.fmt(d), en[i] ? String(en[i]) : '–', mo[i] ? String(mo[i]) : '–']; }).reverse() },
      U.legend([['Energy', PAIR[1]], ['Mood', PAIR[0]]]), 'span2');
    /* the same two, averaged for each day of the week */
    var all = D.range(today, 84).filter(live), byDay = function (k) {
      return [0, 1, 2, 3, 4, 5, 6].map(function (w) { var v = all.filter(function (d) { return D.dow(d) === w && day(d)[k]; }).map(function (d) { return day(d)[k]; }); return v.length ? Math.round(avg(v) * 10) / 10 : null; });
    }, names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], e2 = byDay('energy'), m2 = byDay('mood');
    if (count >= 10) out += U.chartCard('Energy and mood by weekday', 'Averages for each day of the week, from 1 to 5.', function (w) {
      return CH.groups(w, { name: 'Energy and mood by weekday', series: [{ name: 'Energy', color: PAIR[1], values: e2 }, { name: 'Mood', color: PAIR[0], values: m2 }], labels: names, tips: D.dayNames, max: 5, tickN: 5 });
    }, { head: ['Day', 'Energy', 'Mood'], rows: names.map(function (n, i) { return [D.dayNames[i], e2[i] == null ? '–' : one(e2[i]), m2[i] == null ? '–' : one(m2[i])]; }) }, U.legend([['Energy', PAIR[1]], ['Mood', PAIR[0]]]));
    return out;
  }

  /* ================= workout log ================= */
  var exKey = LD.exKey;
  function lastKg(key, before) {
    var days = Object.keys(S.state.days).sort().reverse();
    for (var i = 0; i < days.length; i++) {
      var w = S.state.days[days[i]].workout;
      if (days[i] < before && w && w.sets && w.sets[key] && w.sets[key].kg) return w.sets[key].kg;
    }
    return null;
  }
  LD.more.workoutCard = function () {
    var U = LD.ui, today = D.today(), w = S.day(today).workout, planId = w && w.kind === 'full' ? w.plan : G.nextPlan(today);
    var plan = C.workouts.plans.filter(function (p) { return p.id === planId; })[0] || C.workouts.plans[0], sets = (w && w.sets) || {};
    var done = plan.exercises.filter(function (e) { return (sets[exKey(e.name)] || {}).d; }).length;
    return '<section class="card span2' + (done === plan.exercises.length ? ' complete' : '') + '"><header><h3>' + U.icon('pulse') + ' Today’s session: ' + esc(plan.name) + '</h3><span class="count">' + done + '/' + plan.exercises.length + '</span></header>' +
      '<p class="sub">Tick each exercise as you finish it; ticking any of them logs the session. The weight is optional, and the Strength charts further down are drawn from it.</p><div class="exgrid">' +
      plan.exercises.map(function (e) {
        var k = exKey(e.name), st = sets[k] || {}, prev = lastKg(k, today);
        return '<div class="exrow"><button class="tick small' + (st.d ? ' on' : '') + '" role="checkbox" aria-checked="' + !!st.d + '" data-act="ex" data-id="' + k + '" data-key="ex-' + k + '"><span class="box">' + U.icon('check') + '</span>' +
          '<span class="lbl">' + esc(e.name) + ' <small>' + esc(e.sets) + '</small></span></button>' +
          '<label class="kg"><input type="number" inputmode="decimal" min="0" max="500" step="0.5" value="' + (st.kg || '') + '" placeholder="' + (prev ? 'last ' + prev : 'weight') + '" data-kg="' + k + '" aria-label="Weight in kilograms for ' + esc(e.name) + '" data-key="kg-' + k + '"><span>kg</span></label></div>';
      }).join('') + '</div></section>';
  };
  LD.actions.ex = function (d, e) {
    var today = D.today(), w = S.day(today).workout, on = w && w.sets && w.sets[d.id] && w.sets[d.id].d;
    LD.ui.view.pop = d.key;
    LD.ui.act(function () { S.setExercise(today, d.id, { d: on ? null : 1 }); }, e);
  };
  var earlier = LD.onChange;
  LD.onChange = function (el, d) {
    if (d.kg === undefined) return earlier ? earlier(el, d) : false;
    var v = parseFloat(el.value);
    LD.ui.act(function () { S.setExercise(D.today(), d.kg, { kg: v > 0 && v <= 500 ? v : null }); }, { target: el });
    return true;
  };
  function strengthCard(color) {
    var U = LD.ui, names = {}, map = {}, rows = [];
    C.workouts.plans.forEach(function (p) { p.exercises.forEach(function (e) { names[exKey(e.name)] = e.name; }); });
    Object.keys(S.state.days).sort().forEach(function (d) {
      var w = S.state.days[d].workout;
      if (!w || !w.sets) return;
      for (var k in w.sets) if (w.sets[k].kg && names[k]) { (map[k] = map[k] || []).push([d, w.sets[k].kg]); rows.push([D.fmt(d), names[k], w.sets[k].kg + ' kg']); }
    });
    var keys = Object.keys(map);
    if (!keys.length) return empty('Strength', 'Fill in a weight when you log a session and a chart appears here for each exercise, so you can watch it climb.');
    return '<section class="card span2"><header><h3>' + U.icon('peak') + ' Strength</h3></header><p class="sub">The weight you used for each exercise, session by session.</p><div class="minis">' + keys.map(function (k) {
      var pts = map[k], first = pts[0][1], last = pts[pts.length - 1][1], up = Math.round((last - first) * 10) / 10;
      return '<div class="mini"><div class="minihead"><b>' + esc(names[k]) + '</b><span class="count">' + last + ' kg' + (pts.length > 1 && up ? (up > 0 ? ' · up ' : ' · down ') + Math.abs(up) : '') + '</span></div>' +
        U.chart(function (w) { return CH.line(w, { name: names[k] + ', weight used', values: pts.map(function (p) { return p[1]; }), labels: pts.map(function (p) { return D.fmt(p[0], short); }),
          tips: pts.map(function (p) { return D.fmt(p[0]); }), color: color, height: 132, fmt: function (v) { return v + ' kg'; } }); }) + '</div>';
    }).join('') + '</div>' + U.tableView({ head: ['Day', 'Exercise', 'Weight'], rows: rows.reverse() }) + '</section>';
  }

  /* ================= extra graphs for each section ================= */
  LD.more.sectionCharts = function (a) {
    var U = LD.ui, weeks = weeksBack(12), wl = weeks.map(wkLabel), tips = wl.map(function (l) { return 'Week of ' + l; }), today = D.today(), out = '';
    var ticksIn = function (id, w) { return weekDates(w).filter(function (d) { return (day(d).checks || {})[id]; }).length; };
    var has = function (id) { return S.habits().some(function (h) { return h.id === id; }); };

    if (a.id === 'sleep' && has('bed') && has('up')) {
      var bed = weeks.map(function (w) { return ticksIn('bed', w); }), up = weeks.map(function (w) { return ticksIn('up', w); });
      out += U.chartCard('On-time nights and mornings', 'How many times each week you were in bed on time and up on time.', function (w) {
        return CH.groups(w, { name: 'On-time nights and mornings per week', series: [{ name: 'In bed on time', color: PAIR[0], values: bed }, { name: 'Up on time', color: PAIR[1], values: up }], labels: wl, tips: tips, max: 7, tickN: 7 });
      }, { head: ['Week of', 'In bed on time', 'Up on time'], rows: weeks.map(function (w, i) { return [wl[i], String(bed[i]), String(up[i])]; }).reverse() },
        U.legend([['In bed on time', PAIR[0]], ['Up on time', PAIR[1]]]), 'span2');
    }

    if (a.id === 'food' && has('homemade')) {
      var home = weeks.map(function (w) { return ticksIn('homemade', w); });
      out += U.chartCard('Home-made days per week', 'Days each week with no takeaway.', function (w) {
        return CH.bars(w, { name: 'Home-made days', values: home, labels: wl, tips: tips, color: a.color, max: 7, tickN: 7 });
      }, { head: ['Week of', 'Home-made days'], rows: weeks.map(function (w, i) { return [wl[i], String(home[i])]; }).reverse() });
    }

    if (a.id === 'upkeep') {
      var gaps = S.chores().filter(function (c) { return c.weekday === undefined && (c.area || 'upkeep') === 'upkeep'; }).map(function (c) {
        var log = (S.state.chores[c.id] || []).slice(-6), g = [];
        for (var i = 1; i < log.length; i++) g.push(D.diff(log[i], log[i - 1]));
        return { c: c, every: S.every(c), gap: avg(g) };
      }).filter(function (x) { return x.gap != null; });
      out += gaps.length ? '<section class="card"><header><h3>How often it really happens</h3></header><p class="sub">The usual gap between the last few times, against the gap you set. A full bar means you are keeping to it.</p><div class="rates" style="--c:' + a.color + '">' +
        gaps.map(function (x) {
          return '<div class="rate"><span class="nm">' + esc(S.text(x.c)) + ' <small>set to every ' + x.every + ' days</small></span><div class="meter" role="img" aria-label="about every ' + one(x.gap) + ' days"><i style="width:' + Math.round(Math.min(1, x.every / x.gap) * 100) + '%"></i></div><span class="val">' + one(x.gap) + 'd</span></div>';
        }).join('') + '</div></section>' : '';
    }

    if (a.id === 'move') {
      var d84 = D.range(today, 84).filter(live), names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      var byDay = [0, 1, 2, 3, 4, 5, 6].map(function (w) { var v = d84.filter(function (d) { return D.dow(d) === w && day(d).steps; }).map(function (d) { return day(d).steps; }); return v.length ? Math.round(avg(v)) : null; });
      var entered = d84.filter(function (d) { return day(d).steps; });
      if (entered.length >= 7) {
        out += U.chartCard('Steps by weekday', 'Your average for each day of the week, over the last 12 weeks.', function (w) {
          return CH.bars(w, { name: 'Average steps', values: byDay, labels: names, tips: D.dayNames, color: a.color, goal: S.state.settings.stepGoal, goalLabel: 'Goal ' + num(S.state.settings.stepGoal) });
        }, { head: ['Day', 'Average steps'], rows: names.map(function (n, i) { return [D.dayNames[i], byDay[i] == null ? '–' : num(byDay[i])]; }) });
        var smooth = d84.map(function (d) { var v = D.range(d, 7).map(function (x) { return day(x).steps; }).filter(Boolean); return v.length ? Math.round(avg(v)) : null; });
        out += U.chartCard('Steps, seven-day average', 'Each point is the average of the week up to that day, which smooths out single good or bad days.', function (w) {
          return CH.line(w, { name: 'Seven-day average steps', values: smooth, labels: d84.map(function (d) { return D.fmt(d, short); }), tips: d84.map(function (d) { return D.fmt(d); }), color: a.color,
            goal: S.state.settings.stepGoal, goalLabel: 'Goal ' + num(S.state.settings.stepGoal) });
        }, { head: ['Day', 'Seven-day average'], rows: d84.map(function (d, i) { return [D.fmt(d), smooth[i] == null ? '–' : num(smooth[i])]; }).reverse() });
        var bins = ['Under 2K', '2K to 4K', '4K to 6K', '6K to 8K', '8K to 10K', '10K or more'], counts = [0, 0, 0, 0, 0, 0];
        entered.forEach(function (d) { counts[Math.min(5, Math.floor(day(d).steps / 2000))]++; });
        out += U.chartCard('How your days spread', 'The number of days that fell in each step range, over the last 12 weeks.', function (w) {
          return CH.bars(w, { name: 'Days', values: counts, labels: ['<2K', '2-4K', '4-6K', '6-8K', '8-10K', '10K+'], tips: bins, color: a.color, unit: ' days' });
        }, { head: ['Steps', 'Days'], rows: bins.map(function (b, i) { return [b, String(counts[i])]; }) });
      }
      out += strengthCard(a.color);
    }
    return out;
  };

  /* ================= Stats page ================= */
  LD.pages.stats = function (st) {
    var U = LD.ui, today = D.today(), areas = S.areas().filter(function (a) { return a.kind !== 'tasks'; });
    var pctOf = function (d) { return live(d) ? (G.dayPct(d) || 0) : null; };
    var mean = function (dates) { var v = dates.map(pctOf).filter(function (x) { return x != null; }); return v.length ? avg(v) : null; };
    var d28 = D.range(today, 28), p28 = D.range(D.add(today, -28), 28), now = mean(d28), before = mean(p28);
    var xp28 = d28.reduce(function (s, d) { return s + ((st.perDay[d] || { total: 0 }).total); }, 0);
    var logged = d28.filter(function (d) { return G.dayPct(d) != null; }).length;
    var d14 = D.range(today, 14).filter(live), pace = d14.length ? d14.reduce(function (s, d) { return s + ((st.perDay[d] || { total: 0 }).total); }, 0) / d14.length : 0;
    var p = G.progress(st.total, C.xp.base), left = p.need - p.into, eta = pace > 0 ? Math.ceil(left / pace) : null, dl = now != null && before != null ? Math.round((now - before) * 100) : null;
    var tiles = '<div class="tiles">' +
      U.tile('Done, last 28 days', now == null ? '–' : Math.round(now * 100) + '%', dl == null ? 'Share of your whole list' : dl > 0 ? '▲ ' + dl + ' points on the 28 days before' : dl < 0 ? '▼ ' + (-dl) + ' points on the 28 days before' : 'Level with the 28 days before', dl > 0) +
      U.tile('Days logged', logged + ' <small>of 28</small>') + U.tile('XP, last 28 days', num(xp28), 'About ' + num(pace) + ' a day lately') +
      U.tile('Level ' + (p.level + 1), eta == null ? '–' : eta + (eta === 1 ? ' <small>day</small>' : ' <small>days</small>'), eta == null ? 'Log a day to see an estimate' : 'At your recent pace, ' + num(left) + ' XP to go') + '</div>';

    var scale = '<div class="legend scale"><span>Less</span><span>' + CH.ramp.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span><span>More</span></div>';
    var year = U.chartCard(U.icon('tree') + ' The long view', 'Every square is a day, going back as far as fits. Brighter means more of the list was done.', function (w) {
      return CH.heat(w, { name: 'Daily completion calendar', end: today, weeks: Math.max(10, Math.min(53, Math.floor((w - 24) / 15))), get: function (d) {
        var v = G.dayPct(d), xp = (st.perDay[d] || { total: 0 }).total;
        return { v: v, t: D.fmt(d), r: v == null ? [['Nothing logged', '']] : [[Math.round(v * 100) + '%', 'of the day’s list', CH.ramp[3]], ['+' + xp + ' XP', '']] };
      } });
    }, { head: ['Day', 'Done', 'XP'], rows: D.range(today, 60).reverse().map(function (d) { var v = G.dayPct(d); return [D.fmt(d), v == null ? 'Nothing logged' : Math.round(v * 100) + '%', String((st.perDay[d] || { total: 0 }).total)]; }) }, scale, 'span2');

    var d90 = D.range(today, 90).filter(live), roll = d90.map(function (d) { var m = mean(D.range(d, 7)); return m == null ? null : Math.round(m * 100); });
    var steady = U.chartCard('Seven-day average', 'How much of your list you have been doing, averaged over the week up to each day. Days with nothing logged count as zero.', function (w) {
      return CH.line(w, { name: 'Seven-day average completion', values: roll, labels: d90.map(function (d) { return D.fmt(d, short); }), tips: d90.map(function (d) { return D.fmt(d); }), color: '#a7c957', max: 100,
        fmt: function (v) { return Math.round(v) + '%'; }, axisFmt: function (v) { return v + '%'; } });
    }, { head: ['Day', 'Seven-day average'], rows: d90.map(function (d, i) { return [D.fmt(d), roll[i] == null ? '–' : roll[i] + '%']; }).reverse() }, '', 'span2');

    var weeks = weeksBack(12), wl = weeks.map(wkLabel);
    var series = areas.map(function (a) { return { name: a.name, color: a.color, values: weeks.map(function (w) { return weekDates(w).reduce(function (s, d) { return s + (((st.perDay[d] || { areas: {} }).areas[a.id]) || 0); }, 0); }) }; });
    var byWeek = U.chartCard('XP by week', 'Where each week’s XP came from.', function (w) {
      return CH.stacked(w, { name: 'XP by week and section', series: series, labels: wl, tips: wl.map(function (l) { return 'Week of ' + l; }), unit: ' XP', height: 220 });
    }, { head: ['Week of'].concat(areas.map(function (a) { return a.name; })), rows: weeks.map(function (w, i) { return [wl[i]].concat(series.map(function (s) { return String(s.values[i]); })); }).reverse() },
      U.legend(areas.map(function (a) { return [a.name, a.color]; })));

    var bal = areas.map(function (a) { var dn = 0, of = 0; d28.filter(live).forEach(function (d) { var r = G.areaDay(a.id, d); dn += r.done; of += r.of; }); return { name: a.name, v: of ? dn / of : 0 }; });
    var balance = bal.length >= 3 ? U.chartCard('Balance', 'How much of each section’s list you did over the last 28 days. An even shape means no section is being left behind.', function (w) {
      return CH.radar(w, { name: 'Balance across sections', axes: bal, color: '#a7c957' });
    }, { head: ['Section', 'Done'], rows: bal.map(function (b) { return [b.name, Math.round(b.v * 100) + '%']; }) }) : '';

    var parts = C.groups.map(function (g) {
      var dn = 0, of = 0;
      d28.filter(live).forEach(function (d) { S.habitsFor(d).forEach(function (h) { if (h.group !== g.id) return; of++; if ((day(d).checks || {})[h.id]) dn++; }); });
      return { name: g.name, v: of ? Math.round(dn / of * 100) : null };
    });
    var times = U.chartCard('By time of day', 'Share of each card’s habits ticked over the last 28 days.', function (w) {
      return CH.bars(w, { name: 'Share ticked', values: parts.map(function (x) { return x.v; }), labels: parts.map(function (x) { return x.name; }), color: '#a7c957', max: 100, tickN: 4, unit: '%' });
    }, { head: ['Time of day', 'Ticked'], rows: parts.map(function (x) { return [x.name, x.v == null ? '–' : x.v + '%']; }) });

    var league = S.habits().map(function (h) {
      var on = d28.filter(function (d) { return live(d) && S.scheduled(h, d); }), n = on.filter(function (d) { return (day(d).checks || {})[h.id]; }).length;
      return { h: h, n: n, of: on.length, rate: on.length ? n / on.length : 0 };
    }).sort(function (x, y) { return y.rate - x.rate; });
    var habits = '<section class="card span2"><header><h3>' + U.icon('check') + ' Every habit</h3></header><p class="sub">All your habits, from most to least often ticked in the last 28 days. The dot shows the section.</p><div class="rates two">' +
      league.map(function (x) {
        var a = LD.areaById[x.h.area];
        return '<div class="rate" style="--c:' + a.color + '"><span class="nm"><i class="dot" style="background:' + a.color + '" title="' + a.name + '"></i>' + esc(U.txt(x.h)) + '</span><div class="meter" role="img" aria-label="' + x.n + ' of ' + x.of + ' days"><i style="width:' + Math.round(x.rate * 100) + '%"></i></div><span class="val">' + x.n + '/' + x.of + '</span></div>';
      }).join('') + '</div></section>';

    var months = [], mx = {}, k;
    for (k = 11; k >= 0; k--) { var m = new Date(D.parse(today).getFullYear(), D.parse(today).getMonth() - k, 1, 12); months.push(D.str(m).slice(0, 7)); }
    st.list.forEach(function (d) { mx[d.slice(0, 7)] = (mx[d.slice(0, 7)] || 0) + st.perDay[d].total; });
    var mv = months.map(function (m) { return mx[m] || 0; }), ml = months.map(function (m) { return D.fmt(m + '-01', { month: 'short' }); });
    var monthly = U.chartCard('XP by month', 'Your total for each of the last twelve months.', function (w) {
      return CH.bars(w, { name: 'XP', values: mv, labels: ml, tips: months.map(function (m) { return D.fmt(m + '-01', { month: 'long', year: 'numeric' }); }), color: '#a7c957', unit: ' XP' });
    }, { head: ['Month', 'XP'], rows: months.map(function (m, i) { return [D.fmt(m + '-01', { month: 'long', year: 'numeric' }), num(mv[i])]; }).reverse() });

    return LD.more.subnav('stats') + '<h2 class="section-title" style="margin-top:4px">Stats</h2>' + tiles + '<div class="cards">' + year + steady + byWeek + balance + times + monthly + habits +
      (S.state.settings.ui.checkin ? feelCards() : '') + '</div>';
  };
})();
