/* Grove extras: the logic behind weekly quests, the weekly check-up, insights and the meal planner.
   No page markup here (that is in pages-more.js). Everything is worked out from the saved log, so
   nothing here stores results, only choices: which quests a week has, which meals are planned,
   which shopping items are ticked, which check-up suggestions were set aside.

   A week is identified by its Monday date. Its record lives in state.weeks[monday]:
     { quests: [{id, target}], meals: [mealId], shop: {key: 1}, skip: {suggestionId: 1}, recapSeen: true } */
(function () {
  'use strict';
  var C = LD.config, S = LD.store, G = LD.game, D = LD.date;
  var avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
  var checks = function (d) { return (S.state.days[d] || {}).checks || {}; };

  S.week = function (ws, create) {
    var w = S.state.weeks[ws];
    if (!w && create) w = S.state.weeks[ws] = {};
    return w || {};
  };

  /* ================= weekly quests ================= */
  var Q = LD.quests = {
    def: function (id) { return C.quests.filter(function (q) { return q.id === id; })[0]; },
    dates: function (ws) { return D.range(D.add(ws, 6), 7); },
    /* how many times the quest's thing happened on these dates */
    count: function (q, dates) {
      var n = 0, group = q.kind === 'group' ? S.habits().filter(function (h) { return h.group === q.ref; }) : null;
      dates.forEach(function (d) {
        var day = S.state.days[d] || {}, ck = day.checks || {}, id;
        if (q.kind === 'habit') { if (ck[q.ref]) n++; }
        else if (q.kind === 'workouts') { if (day.workout) n++; }
        else if (q.kind === 'stepgoal') { if (day.steps && day.steps >= G.goalFor(day)) n++; }
        else if (q.kind === 'chore') { if ((S.state.chores[q.ref] || []).indexOf(d) >= 0) n++; }
        else if (q.kind === 'chores') { for (id in S.state.chores) if (S.state.chores[id].indexOf(d) >= 0) n++; }
        else if (q.kind === 'group') { if (group.length && group.every(function (h) { return ck[h.id]; })) n++; }
      });
      return n;
    },
    eligible: function (q) {
      if (!S.isOn('areas', LD.areaById[q.area])) return false;
      if (q.kind === 'habit') return S.habits().some(function (h) { return h.id === q.ref; });
      if (q.kind === 'chore') return S.chores().some(function (c) { return c.id === q.ref; });
      if (q.kind === 'chores') return S.chores().length > 0;
      if (q.kind === 'group') return S.habits().some(function (h) { return h.group === q.ref; });
      return true;
    },
    target: function (q, prev) {
      return q.fixed ? S.state.settings[q.fixed] : Math.max(q.min, Math.min(q.max, prev + 1));
    },
    /* Two quests for a week, from different sections: the one with most room to grow, and one that is going well.
       Targets come from the week before, so the quests adjust to how things have been going. */
    pick: function (ws) {
      var prevDates = Q.dates(D.add(ws, -7)), rot = Math.abs(Math.floor(D.diff(ws, '2024-01-01') / 7));
      var list = C.quests.filter(Q.eligible).map(function (q, i) {
        var prev = Q.count(q, prevDates), top = q.fixed ? S.state.settings[q.fixed] : q.max;
        return { q: q, prev: prev, ratio: Math.min(1, prev / top), i: i };
      });
      if (!list.length) return [];
      var n = list.length, turn = function (x) { return (x.i + n - rot % n) % n; };
      var low = list.slice().sort(function (a, b) { return a.ratio - b.ratio || turn(a) - turn(b); })[0];
      var high = list.filter(function (x) { return x.q.area !== low.q.area; }).sort(function (a, b) { return b.ratio - a.ratio || turn(a) - turn(b); })[0];
      return [low, high].filter(Boolean).map(function (x) { return { id: x.q.id, target: Q.target(x.q, x.prev) }; });
    },
    /* make sure a week has its quests (called when the current week is first shown) */
    ensure: function (ws) {
      if (S.state.weeks[ws] && S.state.weeks[ws].quests) return;
      S.week(ws, true).quests = Q.pick(ws);
      S.save();
    },
    /* progress on a week's quests: [{q, text, target, cur, done, doneOn}] */
    state: function (ws) {
      var wk = S.state.weeks[ws], today = D.today();
      if (!wk || !wk.quests) return [];
      var dates = Q.dates(ws).filter(function (d) { return d <= today; });
      return wk.quests.map(function (x) {
        var q = Q.def(x.id);
        if (!q) return null;
        var cur = Q.count(q, dates), doneOn = null;
        if (cur >= x.target) {
          for (var i = 0; i < dates.length; i++) { if (Q.count(q, dates.slice(0, i + 1)) >= x.target) { doneOn = dates[i]; break; } }
        }
        return { q: q, text: q.text.replace('{n}', x.target), target: x.target, cur: cur, done: cur >= x.target, doneOn: doneOn };
      }).filter(Boolean);
    },
    /* quest rewards by the date each was finished: { date: { sectionId: xp } } */
    xpByDate: function () {
      var out = {};
      for (var ws in S.state.weeks) {
        Q.state(ws).forEach(function (s) {
          if (!s.doneOn) return;
          var o = out[s.doneOn] || (out[s.doneOn] = {});
          o[s.q.area] = (o[s.q.area] || 0) + C.questXP;
        });
      }
      return out;
    }
  };

  /* ================= weekly check-up =================
     Looks at the last two weeks and offers up to three small adjustments. Nothing changes unless accepted.
     Each: { id, title, text, label, apply() } or { ..., href } for one that only points somewhere. */
  LD.checkin = function (ws) {
    var s = S.state.settings, U = LD.ui, out = [], skip = S.week(ws).skip || {};
    var w1 = Q.dates(ws), w0 = Q.dates(D.add(ws, -7)), age = D.diff(D.add(ws, 6), S.state.startDate);
    var ticks = function (id, dates) { return dates.filter(function (d) { return checks(d)[id]; }).length; };
    var has = function (id) { return S.habits().some(function (h) { return h.id === id; }); };

    var sg = s.ui.suggestGoal ? G.suggestGoal() : null;
    if (sg) out.push({ id: 'steps', title: 'Step goal',
      text: sg > s.stepGoal ? 'You have been reaching ' + U.num(s.stepGoal) + ' steps most days.' : U.num(s.stepGoal) + ' steps has been out of reach lately. A goal you can hit keeps you moving.',
      label: 'Set it to ' + U.num(sg), apply: function () { s.stepGoal = sg; } });

    if (has('up') && age >= 13) {
      var u1 = ticks('up', w1), u0 = ticks('up', w0);
      if (u1 <= 2 && u0 <= 2) out.push({ id: 'later', title: 'Wake time',
        text: 'Up by ' + U.fmtTime(s.wake) + ' happened ' + (u1 + u0) + ' times in two weeks. A time you can keep works better than one you cannot.',
        label: 'Move both times 30 minutes later', apply: function () { s.wake = U.shift(s.wake, 30); s.bed = U.shift(s.bed, 30); } });
      else if (u1 >= 6 && u0 >= 6 && s.wake > '06:30') out.push({ id: 'earlier', title: 'Wake time',
        text: 'Up on time on ' + (u1 + u0) + ' of the last 14 days. You could bring things a little earlier, or leave them as they are.',
        label: 'Move both times 15 minutes earlier', apply: function () { s.wake = U.shift(s.wake, -15); s.bed = U.shift(s.bed, -15); } });
    }

    if (age >= 13) {
      var worst = null;
      S.habits().forEach(function (h) {
        var c = ticks(h.id, w1) + ticks(h.id, w0);
        if (h.id !== 'up' && c <= 1 && (!worst || c < worst.c)) worst = { h: h, c: c };
      });
      if (worst) out.push({ id: 'pause:' + worst.h.id, title: 'A habit that is not sticking',
        text: '"' + U.txt(worst.h) + '" was ticked ' + (worst.c ? 'once' : 'not at all') + ' in two weeks. Pausing it keeps your list honest. You can switch it back on in Settings whenever you like.',
        label: 'Pause it for now', apply: function () { s.enabled.habits[worst.h.id] = false; } });
    }

    S.chores().forEach(function (c) {
      if (c.weekday !== undefined) return;
      var log = (S.state.chores[c.id] || []).slice(-4);
      if (log.length < 4) return;
      var gaps = [1, 2, 3].map(function (i) { return D.diff(log[i], log[i - 1]); }), a = avg(gaps), every = S.every(c), nn = Math.round(a);
      if (a >= every * 1.4 && nn !== every) out.push({ id: 'every:' + c.id, title: 'Chore timing',
        text: '"' + S.text(c) + '" is set to every ' + every + ' days but usually happens about every ' + nn + '.',
        label: 'Change it to every ' + nn + ' days', apply: function () { s.every[c.id] = nn; } });
    });

    var score = function (dates) {
      var v = dates.map(function (d) { return G.dayPct(d); }).filter(function (x) { return x != null; });
      return v.length >= 4 ? avg(v) : null;
    };
    var s1 = score(w1), s0 = score(w0), off = C.areas.filter(function (a) { return !S.isOn('areas', a); });
    if (s1 != null && s0 != null && s1 >= 0.75 && s0 >= 0.75 && off.length) out.push({ id: 'more', title: 'Room for more',
      text: 'You did about ' + Math.round(s1 * 100) + '% of your list two weeks running. ' + off.map(function (a) { return a.name; }).join(', ') + (off.length > 1 ? ' are' : ' is') + ' waiting in Settings if you want to add something.',
      label: 'Open Settings', href: '#/settings' });

    return out.filter(function (x) { return !skip[x.id]; }).slice(0, 3);
  };

  /* ================= insights =================
     Each compares two kinds of day. They describe what happened; they do not prove one thing causes another.
     Returns [{id, title, a:{n,v}, b:{n,v}, la, lb, fmt, max, ready, need}]. */
  LD.insights = function () {
    var today = D.today(), span = Math.min(120, D.diff(today, S.state.startDate)), MIN = 5, out = [];
    var dates = span > 0 ? D.range(D.add(today, -1), span) : [];
    var logged = dates.filter(function (d) { return G.dayPct(d) != null; });
    var on = function (id) { return S.habits().some(function (h) { return h.id === id; }); };
    var rest = function (d, skipId) {
      var hs = S.habits().filter(function (h) { return h.id !== skipId; });
      return hs.length ? hs.filter(function (h) { return checks(d)[h.id]; }).length / hs.length : null;
    };
    var pc = function (v) { return Math.round(v * 100) + '%'; };
    var split = function (o) {
      var a = [], b = [];
      logged.forEach(function (d) { var y = o.yes(d), v = o.val(d); if (y == null || v == null) return; (y ? a : b).push(v); });
      var A = { n: a.length, v: avg(a) }, B = { n: b.length, v: avg(b) };
      out.push({ id: o.id, title: o.title, a: A, b: B, la: o.la, lb: o.lb, fmt: o.fmt, max: o.max || Math.max(A.v || 0, B.v || 0) * 1.1 || 1,
                 ready: A.n >= MIN && B.n >= MIN, need: Math.max(0, MIN - A.n) + Math.max(0, MIN - B.n) });
    };
    if (on('light')) split({ id: 'light', title: 'Morning daylight and the rest of your list', la: 'Days with daylight', lb: 'Days without', fmt: pc, max: 1,
      yes: function (d) { return !!checks(d).light; }, val: function (d) { return rest(d, 'light'); } });
    if (on('bed')) split({ id: 'bed', title: 'The day after getting to bed on time', la: 'After an on-time night', lb: 'After a late night', fmt: pc, max: 1,
      yes: function (d) { var y = D.add(d, -1); return S.state.days[y] ? !!checks(y).bed : null; }, val: function (d) { return rest(d, null); } });
    if (on('screens') && on('bed')) split({ id: 'screens', title: 'Screens down and getting to bed on time', la: 'Screens down on time', lb: 'Screens still on', fmt: pc, max: 1,
      yes: function (d) { return !!checks(d).screens; }, val: function (d) { return checks(d).bed ? 1 : 0; } });
    if (S.isOn('areas', LD.areaById.move)) split({ id: 'workout', title: 'Steps on workout days', la: 'Workout days', lb: 'Other days', fmt: LD.charts.num,
      yes: function (d) { return !!(S.state.days[d] || {}).workout; }, val: function (d) { return (S.state.days[d] || {}).steps || null; } });
    if (on('homemade') && S.chores().some(function (c) { return c.id === 'mealprep'; })) split({ id: 'prep', title: 'Home-made meals after a batch cook', la: 'Within three days of a batch cook', lb: 'Other days', fmt: pc, max: 1,
      yes: function (d) { return (S.state.chores.mealprep || []).some(function (x) { var g = D.diff(d, x); return g >= 0 && g <= 3; }); }, val: function (d) { return checks(d).homemade ? 1 : 0; } });
    return out;
  };
  /* how much of the list gets done on each day of the week */
  LD.weekdays = function () {
    var today = D.today(), span = Math.min(84, D.diff(today, S.state.startDate)), sums = [0, 0, 0, 0, 0, 0, 0], ns = [0, 0, 0, 0, 0, 0, 0], total = 0;
    (span > 0 ? D.range(D.add(today, -1), span) : []).forEach(function (d) {
      var v = G.dayPct(d);
      if (v == null) return;
      sums[D.dow(d)] += v; ns[D.dow(d)]++; total++;
    });
    return { values: sums.map(function (x, i) { return ns[i] ? Math.round(x / ns[i] * 100) : null; }), n: ns, ready: total >= 14, need: Math.max(0, 14 - total) };
  };

  /* ================= phone reminders =================
     A web page cannot schedule notifications by itself, so the reminders go into a calendar file (.ics)
     that the owner adds to their phone's calendar. Times are "floating", meaning local time wherever the phone is. */
  LD.reminders = {
    list: function () {
      var s = S.state.settings, r = s.remind, U = LD.ui, out = [];
      if (r.morning) out.push({ id: 'morning', at: s.wake, title: 'Grove: morning check-in', note: 'Open Grove and tick your morning list.' });
      if (r.winddown) out.push({ id: 'winddown', at: U.shift(s.bed, -s.screensDownMin), title: 'Grove: screens down', note: 'Wind-down time. Bed at ' + U.fmtTime(s.bed) + '.' });
      if (r.evening) out.push({ id: 'evening', at: r.eveningAt, title: 'Grove: evening check-in', note: 'Enter your steps and tick the evening list.' });
      return out;
    },
    ics: function () {
      var url = location.protocol === 'https:' ? location.origin + location.pathname : C.siteUrl, now = new Date();
      var p = function (n) { return (n < 10 ? '0' : '') + n; }, clean = function (t) { return String(t).replace(/([,;\\])/g, '\\$1'); };
      var day = '' + now.getFullYear() + p(now.getMonth() + 1) + p(now.getDate()), stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Grove//Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
      LD.reminders.list().forEach(function (e) {
        lines.push('BEGIN:VEVENT', 'UID:grove-' + e.id + '@grove.local', 'DTSTAMP:' + stamp, 'SEQUENCE:' + Math.floor(now.getTime() / 60000),
          'DTSTART:' + day + 'T' + e.at.replace(':', '') + '00', 'DURATION:PT5M', 'RRULE:FREQ=DAILY', 'SUMMARY:' + clean(e.title),
          'DESCRIPTION:' + clean(e.note) + '\\n' + url, 'URL:' + url,
          'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + clean(e.title), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      return lines.join('\r\n') + '\r\n';
    }
  };

  /* ================= meal planner ================= */
  var M = LD.meals = {
    all: function () { return C.meals.concat(S.state.settings.custom.meals.filter(function (m) { return !m.removed; })); },
    get: function (id) { return M.all().filter(function (m) { return m.id === id; })[0]; },
    plan: function (ws) { return (S.week(ws).meals || []).map(M.get).filter(Boolean); },
    planned: function (ws, id) { return (S.week(ws).meals || []).indexOf(id) >= 0; },
    toggle: function (ws, id) {
      var w = S.week(ws, true), i;
      w.meals = w.meals || [];
      i = w.meals.indexOf(id);
      if (i >= 0) w.meals.splice(i, 1); else w.meals.push(id);
      S.save();
    },
    /* the shopping list for a week: [{meal, items: [{key, text, got}]}] */
    list: function (ws) {
      var got = S.week(ws).shop || {};
      return M.plan(ws).map(function (m) {
        return { meal: m, items: (m.items || []).map(function (t, i) { var key = m.id + ':' + i; return { key: key, text: t, got: !!got[key] }; }) };
      });
    },
    tick: function (ws, key) {
      var w = S.week(ws, true);
      w.shop = w.shop || {};
      if (w.shop[key]) delete w.shop[key]; else w.shop[key] = 1;
      S.save();
    },
    left: function (ws) { var n = 0; M.list(ws).forEach(function (g) { g.items.forEach(function (i) { if (!i.got) n++; }); }); return n; },
    /* the list as plain text, for pasting into a note or message */
    text: function (ws) {
      return M.list(ws).map(function (g) {
        return g.meal.name + '\n' + g.items.filter(function (i) { return !i.got; }).map(function (i) { return '- ' + i.text; }).join('\n');
      }).join('\n\n');
    },
    add: function (name, items, steps) {
      S.state.settings.custom.meals.push({ id: 'm' + Date.now().toString(36), name: name, items: items, steps: steps, tag: 'Yours', custom: true });
      S.save();
    },
    remove: function (id) {
      S.state.settings.custom.meals.forEach(function (m) { if (m.id === id) m.removed = true; });
      S.save();
    }
  };
})();
