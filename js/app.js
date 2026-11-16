/* Grove pages and interaction.
   render() rebuilds the current page from LD.store.state. Pages: Today (home), one page per
   section, Journey and Settings. Buttons use data-act; see the click handler at the bottom. */
(function () {
  'use strict';
  var C = LD.config, S = LD.store, G = LD.game, D = LD.date, CH = LD.charts, P = LD.plants;
  var esc = CH.esc, num = CH.num;
  var $app = document.getElementById('app'), $nav = document.getElementById('nav'), $fx = document.getElementById('fx'), $tip = document.getElementById('tip');
  var view = { date: null }, charts = [];
  var pad = function (n) { return String(n).padStart(2, '0'); };

  var ICON = {
    leaf: 'M5 19C5 10 10 5 19 5c0 9-5 14-13 14M5 19l8-8',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    pulse: 'M3 12h4l3-8 4 16 3-8h4',
    apple: 'M12 8c-3-2.5-7-.5-7 4.5 0 4 2.5 7.5 5 7.5 1 0 1.4-.5 2-.5s1 .5 2 .5c2.5 0 5-3.5 5-7.5 0-5-4-7-7-4.5zM12 8c0-2 1-3.5 3-4',
    home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
    peak: 'M3 20l6-12 4 7 2-3 6 8z',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
    book: 'M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2zM5 20a2 2 0 0 0 2 2h12',
    star: 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
    tree: 'M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5',
    list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    pencil: 'M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM14.5 6.5l3 3',
    cloud: 'M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5a4.25 4.25 0 0 1 .5 8.5z',
    sprout: 'M12 21V11M12 11C12 7 9 5 5 5c0 4 3 6 7 6M12 13c0-3 2.5-5 6.5-5 0 3.5-2.5 5-6.5 5',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2'
  };
  function icon(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICON[n] || '') + '"/></svg>'; }

  /* ---------------- small helpers ---------------- */
  function fmtTime(t) { var p = t.split(':').map(Number); return (((p[0] + 11) % 12) + 1) + ':' + pad(p[1]) + (p[0] < 12 ? ' am' : ' pm'); }
  function shift(t, min) { var p = t.split(':').map(Number), x = ((p[0] * 60 + p[1] + min) % 1440 + 1440) % 1440; return pad(Math.floor(x / 60)) + ':' + pad(x % 60); }
  function txt(h) {
    var s = S.state.settings;
    return S.text(h).replace('{wake}', fmtTime(s.wake)).replace('{bed}', fmtTime(s.bed)).replace('{screens}', fmtTime(shift(s.bed, -s.screensDownMin)));
  }
  function dueText(n) { return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }
  function pct(v) { return v == null ? '–' : Math.round(v * 100) + '%'; }
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function tile(label, value, sub, up) {
    return '<div class="tile"><div class="tl">' + label + '</div><div class="tv2">' + value + '</div>' + (sub ? '<div class="ts' + (up ? ' up' : '') + '">' + sub + '</div>' : '') + '</div>';
  }
  function chart(fn) { charts.push(fn); return '<div class="chart" data-chart="' + (charts.length - 1) + '"></div>'; }
  function tableView(t) {
    return '<details class="tview"><summary>View as table</summary><div class="tvwrap"><table><thead><tr>' +
      t.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      t.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></details>';
  }
  function chartCard(title, sub, fn, table, extra, cls) {
    return '<section class="card ' + (cls || '') + '"><header><h3>' + title + '</h3></header>' + (sub ? '<p class="sub">' + sub + '</p>' : '') +
      (extra || '') + chart(fn) + (table ? tableView(table) : '') + '</section>';
  }
  function legend(items) {
    return '<div class="legend">' + items.map(function (i) { return '<span><i style="background:' + i[1] + '"></i>' + esc(i[0]) + '</span>'; }).join('') + '</div>';
  }
  function weekDays(date) { return D.range(D.add(D.weekStart(date), 6), 7); }
  function xpBar(p) { return '<div class="xpbar"><i style="width:' + (p.pct * 100).toFixed(1) + '%"></i></div>'; }

  /* ---------------- navigation ---------------- */
  function route() { return (location.hash || '#/').replace(/^#\/?/, ''); }
  function nav(r, st) {
    var items = [{ r: '', n: 'Today', i: 'leaf' }, { r: 'grove', n: 'Grove', i: 'sprout' }]
      .concat(S.areas().map(function (a) { return { r: a.id, n: a.name, i: a.icon }; }))
      .concat([{ r: 'journey', n: 'Journey', i: 'peak' }, { r: 'settings', n: 'Settings', i: 'sliders' }]);
    var p = G.progress(st.total, C.xp.base);
    return '<div class="navin"><a class="brand" href="#/">' + icon('tree') + '<span>' + esc(S.name()) + '</span></a><nav aria-label="Sections">' +
      items.map(function (it) { return '<a href="#/' + it.r + '"' + (it.r === r || (it.r === 'journey' && (r === 'stats' || r === 'week')) ? ' class="on" aria-current="page"' : '') + '>' + icon(it.i) + '<span>' + it.n + '</span></a>'; }).join('') +
      '</nav>' + syncDot() + '<a class="lvchip" href="#/journey" aria-label="Level ' + p.level + ', open Journey"><b>Lv ' + p.level + '</b><span class="mini"><i style="width:' + (p.pct * 100).toFixed(0) + '%"></i></span></a></div>';
  }
  /* small cloud in the top bar once sync is on: shows whether the last sync worked */
  function syncDot() {
    var Y = LD.sync;
    if (!Y.on()) return '';
    var state = Y.busy ? 'busy' : Y.cfg.err ? 'err' : 'ok', label = Y.busy ? 'Syncing' : Y.cfg.err ? 'Sync problem, open Settings' : 'Synced';
    return '<a class="syncdot ' + state + '" href="#/settings" aria-label="' + label + '" title="' + label + '">' + icon('cloud') + (state === 'err' ? '<b>!</b>' : '') + '</a>';
  }
  function banner() {
    var out = '';
    if (S.noStorage) out += '<div class="banner"><b>Saving is blocked in this browser window.</b> Your ticks will be lost when you close it. Open the page in a normal Chrome window.</div>';
    if (S.state.demo) out += '<div class="banner"><span><b>Demo data.</b> Ten weeks of made-up history so you can see the charts. Your own data is set aside.</span><span class="sp"></span><button class="btn sm primary" data-act="demo-clear">Clear demo data</button></div>';
    return out;
  }

  /* ================= TODAY ================= */
  function tickRow(h, date, key) {
    var on = !!S.day(date).checks[h.id], a = LD.areaById[h.area];
    return '<button class="tick' + (on ? ' on' : '') + '" role="checkbox" aria-checked="' + on + '" data-act="check" data-id="' + h.id + '" data-date="' + date + '" data-key="' + (key || 'h-') + h.id + '">' +
      '<span class="box">' + icon('check') + '</span><span class="lbl">' + esc(txt(h)) + '</span><span class="dot" style="background:' + a.color + '" title="' + a.name + '"></span><span class="xp">+' + (h.xp || S.xp('tick')) + '</span></button>';
  }
  function hero(st, date, isToday) {
    var p = G.progress(st.total, C.xp.base), rank = G.rank(p.level), hr = D.hour();
    var todayXP = (st.perDay[date] || { total: 0 }).total;
    var phase = phaseNow(isToday);
    var greet = !isToday ? D.fmt(date, { weekday: 'long' }) : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    return '<section class="hero"><div class="scene" data-scene="' + phase + '"></div><div class="herotop"><div class="hgreet"><h1>' + greet + '</h1>' +
      '<div class="datenav"><button data-act="date" data-d="-1" aria-label="Previous day">‹</button><span>' + D.fmt(date, { weekday: 'long', day: 'numeric', month: 'long' }) + '</span>' +
      '<button data-act="date" data-d="1" aria-label="Next day"' + (isToday ? ' disabled' : '') + '>›</button>' + (isToday ? '' : '<button class="link" data-act="date" data-d="0">Back to today</button>') + '</div></div></div>' +
      '<a class="hlevel" href="#/journey"><div class="badge">' + p.level + '</div><div class="hl2"><div class="rank">' + rank.name + '</div>' + xpBar(p) +
      '<div class="xpnum">' + num(p.into) + ' / ' + num(p.need) + ' XP to level ' + (p.level + 1) + (todayXP ? ' · +' + todayXP + ' today' : '') + '</div></div></a></section>';
  }
  function lastNight(date) {
    var y = D.add(date, -1), hs = S.habitsFor(y).filter(function (h) { return h.late; });
    var ui = S.state.settings.ui, needSteps = S.isOn('areas', LD.areaById.move) && !S.day(y).steps;   /* steps are easy to forget at night */
    if (!ui.lastNight || (!hs.length && !needSteps) || D.hour() >= ui.lastNightUntil || y < S.state.startDate) return '';
    return '<section class="card"><header><h3>' + icon('moon') + ' Last night</h3><span class="count">' + D.fmt(y, { weekday: 'short' }) + '</span></header>' +
      (hs.length ? '<div class="ticks">' + hs.map(function (h) { return tickRow(h, y, 'ln-'); }).join('') + '</div><p class="hint">Tick what you managed before you fell asleep.</p>' : '') +
      (needSteps ? '<div class="stepsin ystep"><label for="steps-y">Yesterday’s steps</label><input id="steps-y" type="number" inputmode="numeric" min="0" max="99999" placeholder="From your watch" data-steps data-date="' + y + '" data-key="steps-y"></div>' : '') + '</section>';
  }
  function areaOptions(sel) {
    return S.areas().filter(function (a) { return a.kind !== 'tasks'; }).map(function (a) { return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + a.name + '</option>'; }).join('');
  }
  function groupOptions(sel) {
    return C.groups.map(function (g) { return '<option value="' + g.id + '"' + (g.id === sel ? ' selected' : '') + '>' + g.name + '</option>'; }).join('');
  }
  function groupCard(g, date, now, isToday) {
    var hs = S.habitsFor(date).filter(function (h) { return h.group === g.id; });
    if (!hs.length) return '';
    var done = hs.filter(function (h) { return S.day(date).checks[h.id]; }).length;
    var all = done === hs.length;
    /* a habit can be added straight onto this card */
    var add = !isToday ? '' : view.addTo === g.id ?
      '<form class="addhere" data-form="add-here" data-group="' + g.id + '"><input type="text" name="t" maxlength="80" placeholder="For example: Take tablets" aria-label="New habit" required data-key="add-here">' +
      '<label class="mini">Counts towards<select name="area">' + areaOptions('upkeep') + '</select></label><div class="btnrow"><button class="btn sm primary">Add</button><button type="button" class="btn sm ghost" data-act="add-here-cancel">Cancel</button></div></form>' :
      '<button class="addlink" data-act="add-here" data-group="' + g.id + '" data-key="addto-' + g.id + '">+ Add a habit here</button>';
    return '<section class="card' + (now && !all ? ' now' : '') + (all ? ' complete' : '') + '"><header><h3>' + icon(g.icon) + ' ' + g.name + '</h3>' + (now && !all ? '<span class="tag">Now</span>' : '') +
      '<span class="count">' + (all ? 'All done' : done + '/' + hs.length) + '</span></header><div class="ticks">' + hs.map(function (h) { return tickRow(h, date); }).join('') + '</div>' + add + '</section>';
  }
  function moveCard(date, isToday) {
    var s = S.state.settings, day = S.day(date), goal = day.steps ? G.goalFor(day) : s.stepGoal, a = LD.areaById.move;
    var sessions = weekDays(date).filter(function (d) { return S.day(d).workout; }).length, pips = '';
    for (var i = 0; i < Math.max(s.workoutsPerWeek, sessions); i++) pips += '<i' + (i < sessions ? ' class="on"' : '') + '></i>';
    var kind = day.workout ? day.workout.kind : null, plan = C.workouts.plans.filter(function (p) { return p.id === G.nextPlan(date); })[0];
    return '<section class="card"><header><h3>' + icon('pulse') + ' Movement</h3><a class="more" href="#/move">Details</a></header>' +
      '<div class="steps">' + CH.ring(104, day.steps ? day.steps / goal : 0, a.color, day.steps ? num(day.steps) : '–', 'of ' + num(goal)) +
      '<div class="stepsin"><label for="steps">Steps ' + (isToday ? 'today' : 'that day') + '</label><input id="steps" data-steps type="number" inputmode="numeric" min="0" max="99999" value="' + (day.steps || '') +
      '" placeholder="From your watch" data-date="' + date + '" data-key="steps"><p class="hint">Type the number from your Garmin, then press Enter.</p></div></div>' +
      '<div class="wo"><div class="worow"><span class="lab">Workouts</span><span class="pips">' + pips + '</span><span class="count">' + sessions + '/' + s.workoutsPerWeek + ' this week</span></div>' +
      '<div class="btnrow"><button class="btn' + (kind === 'full' ? ' on' : '') + '" aria-pressed="' + (kind === 'full') + '" data-act="workout" data-kind="full" data-date="' + date + '" data-key="wo-full">' + (kind === 'full' ? 'Full session logged' : 'Full session') + '</button>' +
      '<button class="btn ghost' + (kind === 'min' ? ' on' : '') + '" aria-pressed="' + (kind === 'min') + '" data-act="workout" data-kind="min" data-date="' + date + '" data-key="wo-min">' + (kind === 'min' ? '10 minutes logged' : '10-minute minimum') + '</button></div>' +
      '<p class="hint">' + (kind ? 'Tap again to undo.' : 'Next up: ' + esc(plan.name) + '. A short one still counts.') + '</p></div></section>';
  }
  function choreTick(c, date, stt) {
    var a = LD.areaById[c.area || 'upkeep'];
    return '<button class="tick' + (stt.doneToday ? ' on' : '') + '" role="checkbox" aria-checked="' + stt.doneToday + '" data-act="chore" data-id="' + c.id + '" data-date="' + date + '" data-key="c-' + c.id + '">' +
      '<span class="box">' + icon('check') + '</span><span class="lbl">' + esc(S.text(c)) + '</span><span class="dot" style="background:' + a.color + '" title="' + a.name + '"></span><span class="xp">+' + c.xp + '</span></button>';
  }
  function choreCard(date) {
    var list = S.chores().map(function (c) { return { c: c, s: S.choreStatus(c, date) }; });
    if (!list.length) return '';
    var due = list.filter(function (x) { return x.s.due || x.s.doneToday; });
    var up = list.filter(function (x) { return !x.s.due && !x.s.doneToday; }).sort(function (a, b) { return a.s.dueIn - b.s.dueIn; });
    return '<section class="card"><header><h3>' + icon('home') + ' Chores</h3><a class="more" href="#/upkeep">Details</a></header>' +
      (due.length ? '<div class="ticks">' + due.map(function (x) { return choreTick(x.c, date, x.s); }).join('') + '</div>' : '<p class="empty">Nothing is due. The den is in order.</p>') +
      (up.length ? '<p class="hint">Next: ' + esc(S.text(up[0].c)) + ', ' + dueText(up[0].s.dueIn) + '.</p>' : '') + LD.more.menuHint() + '</section>';
  }
  function taskCard(date) {
    if (!S.isOn('areas', LD.areaById.tasks)) return '';
    var t = S.day(date).tasks || [];
    return '<section class="card"><header><h3>' + icon('list') + ' Top three</h3><span class="count">' + t.filter(function (x) { return x.d; }).length + '/' + t.length + '</span></header><div class="ticks">' +
      t.map(function (x, i) {
        return '<div style="display:flex;gap:6px;align-items:center"><button class="tick' + (x.d ? ' on' : '') + '" role="checkbox" aria-checked="' + !!x.d + '" data-act="task" data-i="' + i + '" data-date="' + date + '" data-key="t-' + i + '">' +
          '<span class="box">' + icon('check') + '</span><span class="lbl">' + esc(x.t) + '</span><span class="xp">+' + C.xp.task + '</span></button><button class="x" data-act="task-del" data-i="' + i + '" data-date="' + date + '" aria-label="Remove task">×</button></div>';
      }).join('') + '</div>' +
      (t.length < 3 ? '<form class="taskadd" data-form="task" data-date="' + date + '"><input type="text" name="t" maxlength="80" placeholder="Add a task for today" aria-label="New task" data-key="task-new"><button class="btn sm">Add</button></form>' : '') + '</section>';
  }
  function weekSection(date) {
    var days = weekDays(date), today = D.today();
    var head = '<div class="wkhead"><span></span><div class="d">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><span></span></div>';
    var rows = S.areas().map(function (a) {
      var done = 0, of = 0;
      var cells = days.map(function (d) {
        if (d > today) return '<i class="wc fut"></i>';
        var r = G.areaDay(a.id, d), wo = a.id === 'move' && S.day(d).workout;
        done += r.done; of += r.of;
        return '<i class="wc' + (d === date ? ' today' : '') + (wo ? ' wo' : '') + '" style="--v:' + (r.pct || 0).toFixed(2) + ';--c:' + a.color + '" data-tip="' +
          CH.tip(D.fmt(d), [[pct(r.pct || 0), a.name, a.color]].concat(wo ? [['Workout', wo.kind === 'full' ? 'full session' : '10 minutes']] : [])) + '"></i>';
      }).join('');
      var sum = a.id === 'move' ? days.filter(function (d) { return S.day(d).workout; }).length + '/' + S.state.settings.workoutsPerWeek + ' sessions' : Math.round(done) + ' of ' + of;
      return '<a class="wkrow" href="#/' + a.id + '"><span class="nm"><i style="background:' + a.color + '"></i>' + a.name + '</span><span class="wkcells">' + cells + '</span><span class="sum">' + sum + '</span></a>';
    }).join('');
    return '<section class="card"><header><h3>' + icon('leaf') + ' This week</h3></header><p class="sub">Brighter squares mean more of that day’s list was done. A white dot marks a workout.</p><div class="week">' + head + rows + '</div></section>';
  }
  function canopyCard(st) {
    var today = D.today(), last = D.range(today, 28).reverse();
    var scale = '<div class="legend scale"><span>Less</span><span>' + CH.ramp.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span><span>More</span></div>';
    return chartCard(icon('tree') + ' The canopy', 'Every square is a day. It fills in as you go, and gaps are simply gaps.', function (w) {
      return CH.heat(w, { name: 'Daily completion calendar', end: today, weeks: Math.max(8, Math.min(26, Math.floor((w - 24) / 23))), get: function (d) {
        var v = G.dayPct(d), xp = (st.perDay[d] || { total: 0 }).total;
        return { v: v, t: D.fmt(d), r: v == null ? [['Nothing logged', '']] : [[pct(v), 'of the day’s list', CH.ramp[3]], ['+' + xp + ' XP', '']] };
      } });
    }, { head: ['Day', 'Done', 'XP'], rows: last.map(function (d) { var v = G.dayPct(d); return [D.fmt(d), v == null ? 'Nothing logged' : pct(v), String((st.perDay[d] || { total: 0 }).total)]; }) }, scale);
  }
  function home(st) {
    var today = D.today(), date = view.date && view.date <= today ? view.date : today, isToday = date === today, hr = D.hour();
    var welcome = (!S.hasData() && !S.state.welcomed) ?
      '<div class="banner"><span><b>Welcome to your grove.</b> Tick things off as you do them and your plants grow. Want to see what it looks like after ten weeks?</span><span class="sp"></span>' +
      '<button class="btn sm primary" data-act="demo-load">Show demo data</button><button class="btn sm ghost" data-act="welcome-hide">Hide</button></div>' : '';
    var prev = 0, cards = '';
    C.groups.forEach(function (g) {
      var now = isToday && hr >= prev && hr < g.until; prev = g.until;
      if (g.id === 'day') cards += moveCard(date, isToday);
      cards += groupCard(g, date, now, isToday);
    });
    return welcome + (isToday ? LD.more.welcomeBack(st) + LD.more.recapBanner() : '') + hero(st, date, isToday) + '<div class="cards flow">' + (isToday ? lastNight(date) : '') + cards + choreCard(date) + taskCard(date) + (S.state.settings.ui.checkin ? LD.more.feelCard(date) : '') + (isToday ? LD.more.questsCard() : '') + '</div>' +
      '<h2 class="section-title">How it is going</h2><div class="cards">' + weekSection(date) + canopyCard(st) + '</div>';
  }

  /* ================= SECTION PAGES ================= */
  function areaHead(a, st) {
    var p = G.progress(st.areaXP[a.id] || 0, C.xp.areaBase), stage = G.stage(p.level), ns = G.nextStageLevel(p.level);
    var plant = S.plantOf(a), sky = { sleep: 'night', move: 'dawn', upkeep: 'dusk' }[a.id] || 'day';   /* each section has its own time of day */
    return '<section class="hero pagebanner"><div class="scene" data-scene="' + sky + '" data-mode="banner" data-area="' + a.id + '"></div>' +
      '<div class="herotop"><div class="ph-main"><p class="eyebrow">Skill · stage ' + (stage + 1) + ' of 6</p><h1>' + a.name + '</h1>' +
      '<p class="blurb">' + esc(a.blurb || '') + '</p><div class="lvrow"><span class="badge sm">' + p.level + '</span>' + xpBar(p) + '<span class="xpnum">' + num(p.into) + ' / ' + num(p.need) + ' XP</span></div>' +
      '<p class="hint">' + (ns ? 'Your ' + P.names[plant] + ' will grow again at level ' + ns + '.' : 'Your ' + P.names[plant] + ' has finished growing.') + '</p></div></div></section>';
  }
  function span28() { return Math.min(28, Math.max(1, D.diff(D.today(), S.state.startDate) + 1)); }
  function habitStats(a) {
    var sp = span28(), dates = D.range(D.today(), sp);
    return S.habits(a.id).map(function (h) {
      /* only the days the habit applies on are counted */
      var on = dates.filter(function (d) { return S.scheduled(h, d); }), n = on.filter(function (d) { return S.day(d).checks[h.id]; }).length;
      return { h: h, n: n, span: on.length, rate: on.length ? n / on.length : 0 };
    });
  }
  function weekScore(a, ws) {
    var today = D.today(), done = 0, of = 0, any = false;
    D.range(D.add(ws, 6), 7).forEach(function (d) {
      if (d > today || d < S.state.startDate) return;
      var r = G.areaDay(a.id, d); done += r.done; of += r.of; any = true;
    });
    return any && of ? { done: done, of: of, pct: done / of } : null;
  }
  function genericTiles(a) {
    var ws = D.weekStart(D.today()), w = weekScore(a, ws), lw = weekScore(a, D.add(ws, -7)), hs = habitStats(a), out = '';
    var delta = w && lw ? Math.round((w.pct - lw.pct) * 100) : null;
    out += tile('This week', w ? Math.round(w.done) + ' <small>of ' + w.of + '</small>' : '–',
      delta == null ? 'Ticks so far' : delta > 0 ? '▲ ' + delta + ' points on last week' : delta < 0 ? '▼ ' + (-delta) + ' points on last week' : 'Level with last week', delta > 0);
    if (hs.length) {
      out += tile('Last ' + span28() + ' days', pct(avg(hs.map(function (x) { return x.rate; }))), 'Average across these habits');
      var sorted = hs.slice().sort(function (x, y) { return y.rate - x.rate; });
      out += tile('Strongest habit', pct(sorted[0].rate), esc(txt(sorted[0].h)));
      if (sorted.length > 1) out += tile('Most room to grow', pct(sorted[sorted.length - 1].rate), esc(txt(sorted[sorted.length - 1].h)));
    }
    return out;
  }
  function habitGridCard(a) {
    var dates = D.range(D.today(), 28), hs = S.habits(a.id);
    if (!hs.length) return '';
    var rows = hs.map(function (h) { return { label: txt(h), cells: dates.map(function (d) { return S.scheduled(h, d) ? !!S.day(d).checks[h.id] : null; }) }; });
    return chartCard('Last four weeks', 'One row per habit, one square per day.', function (w) {
      return CH.grid(w, { name: a.name + ' habits, last 28 days', rows: rows, dates: dates, color: a.color });
    }, { head: ['Day'].concat(rows.map(function (r) { return r.label; })), rows: dates.slice().reverse().map(function (d, i) {
      return [D.fmt(d)].concat(rows.map(function (r) { var c = r.cells[27 - i]; return c == null ? 'Not that day' : c ? 'Done' : '–'; }));
    }) }, '', 'span2');
  }
  function trendCard(a) {
    var ws = D.weekStart(D.today()), weeks = [], k;
    for (k = 11; k >= 0; k--) weeks.push(D.add(ws, -7 * k));
    var vals = weeks.map(function (w) { var r = weekScore(a, w); return r ? Math.round(r.pct * 100) : null; });
    var labels = weeks.map(function (w) { return D.fmt(w, { day: 'numeric', month: 'short' }); });
    return chartCard('Week by week', 'Share of this section’s list done each week.', function (w) {
      return CH.line(w, { name: a.name + ' weekly completion', values: vals, labels: labels, tips: labels.map(function (l) { return 'Week of ' + l; }),
        color: a.color, max: 100, fmt: function (v) { return Math.round(v) + '%'; }, axisFmt: function (v) { return v + '%'; } });
    }, { head: ['Week of', 'Done'], rows: weeks.map(function (w, i) { return [labels[i], vals[i] == null ? '–' : vals[i] + '%']; }).reverse() });
  }
  function ratesCard(a) {
    var hs = habitStats(a);
    if (!hs.length) return '';
    return '<section class="card"><header><h3>Habit by habit</h3></header><p class="sub">Days ticked in the last ' + span28() + ', out of the days each habit applies.</p><div class="rates" style="--c:' + a.color + '">' +
      hs.map(function (x) {
        return '<div class="rate"><span class="nm">' + esc(txt(x.h)) + '</span><div class="meter" role="img" aria-label="' + x.n + ' of ' + x.span + ' days"><i style="width:' + (x.rate * 100).toFixed(0) + '%"></i></div><span class="val">' + x.n + '/' + x.span + '</span></div>';
      }).join('') + '</div></section>';
  }
  function notesCard(a) {
    var n = C.notes[a.id];
    if (!n || !n.length) return '';
    return '<section class="card span2"><header><h3>' + icon('leaf') + ' Field notes</h3></header><div class="notes">' +
      n.map(function (x) { return '<div class="note"><b>' + esc(x.title) + '</b><p>' + esc(x.body) + '</p></div>'; }).join('') + '</div></section>';
  }

  /* ---- sleep ---- */
  function nightCard() {
    var s = S.state.settings;
    var rel = function (t) { var p = t.split(':').map(Number), m = p[0] * 60 + p[1] - 1200; return m < 0 ? m + 1440 : m; };
    var bed = rel(s.bed), wake = rel(s.wake), scr = bed - s.screensDownMin, hrs = Math.round((wake - bed) / 6) / 10;
    var bands = [
      { from: scr, to: bed, color: '#9085e9', name: 'Wind down', label: fmtTime(shift(s.bed, -s.screensDownMin)) + ' to ' + fmtTime(s.bed) },
      { from: bed, to: wake, color: '#3987e5', name: 'In bed', label: fmtTime(s.bed) + ' to ' + fmtTime(s.wake) },
      { from: wake, to: wake + 60, color: '#c98500', name: 'Daylight', label: fmtTime(s.wake) + ' to ' + fmtTime(shift(s.wake, 60)) }
    ];
    return chartCard(icon('moon') + ' Your night', 'The plan from 8 pm to noon: ' + hrs + ' hours in bed. Change the times in Settings.', function (w) { return CH.night(w, bands); },
      { head: ['Part', 'Time'], rows: bands.map(function (b) { return [b.name, b.label]; }) },
      legend([['Screens down ' + fmtTime(shift(s.bed, -s.screensDownMin)), '#9085e9'], ['In bed ' + fmtTime(s.bed) + ', up ' + fmtTime(s.wake), '#3987e5'], ['Daylight by ' + fmtTime(shift(s.wake, 60)), '#c98500']]), 'span2');
  }

  /* ---- movement ---- */
  function movePage(a, st) {
    var s = S.state.settings, today = D.today(), d30 = D.range(today, 30);
    var steps = d30.map(function (d) { return S.day(d).steps || null; });
    var get7 = function (end) { return D.range(end, 7).map(function (d) { return S.day(d).steps; }).filter(Boolean); };
    var a7 = avg(get7(today)), p7 = avg(get7(D.add(today, -7)));
    var goalDays = d30.filter(function (d) { var x = S.day(d); return x.steps && x.steps >= G.goalFor(x); }).length;
    var sess = weekDays(today).filter(function (d) { return S.day(d).workout; }).length;
    var dl = a7 != null && p7 != null ? Math.round(a7 - p7) : null;
    var tiles = tile('Average steps, last 7 days', a7 == null ? '–' : num(a7), dl == null ? 'Enter a few days to see a trend' : dl > 0 ? '▲ ' + num(dl) + ' on the week before' : dl < 0 ? '▼ ' + num(-dl) + ' on the week before' : 'Level with the week before', dl > 0) +
      tile('Goal days, last 30', String(goalDays), 'Goal is ' + num(s.stepGoal) + ' steps') +
      tile('Sessions this week', sess + ' <small>of ' + s.workoutsPerWeek + '</small>', st.totals.workouts + ' logged all time') +
      tile('Distance all time', num(st.totals.steps * 0.00075) + ' <small>km</small>', num(st.totals.steps) + ' steps, best day ' + num(st.totals.bestSteps));
    var sg = S.state.settings.ui.suggestGoal ? G.suggestGoal() : null;
    var suggest = sg ? '<div class="banner"><span><b>' + (sg > s.stepGoal ? 'You are hitting your goal most days.' : 'The goal looks out of reach right now.') + '</b> Try ' + num(sg) + ' steps a day?</span><span class="sp"></span><button class="btn sm primary" data-act="goal" data-v="' + sg + '">Set goal to ' + num(sg) + '</button></div>' : '';
    var labels = d30.map(function (d) { return D.fmt(d, { day: 'numeric', month: 'short' }); });
    var stepsCard = chartCard('Steps, last 30 days', 'One bar per day against your goal.', function (w) {
      return CH.bars(w, { name: 'Steps', values: steps, labels: labels, tips: d30.map(function (d) { return D.fmt(d); }), color: a.color, goal: s.stepGoal, goalLabel: 'Goal ' + num(s.stepGoal), height: 220 });
    }, { head: ['Day', 'Steps'], rows: d30.map(function (d, i) { return [D.fmt(d), steps[i] == null ? '–' : num(steps[i])]; }).reverse() }, '', 'span2');
    var ws = D.weekStart(today), weeks = [], k;
    for (k = 11; k >= 0; k--) weeks.push(D.add(ws, -7 * k));
    var wk = weeks.map(function (w) {
      var full = 0, min = 0;
      D.range(D.add(w, 6), 7).forEach(function (d) { var x = S.day(d).workout; if (x) { if (x.kind === 'full') full++; else min++; } });
      return { full: full, min: min, n: full + min };
    });
    var wl = weeks.map(function (w) { return D.fmt(w, { day: 'numeric', month: 'short' }); });
    var top = Math.max(s.workoutsPerWeek + 1, Math.max.apply(null, wk.map(function (x) { return x.n; })));
    var sessCard = chartCard('Sessions per week', 'Full sessions and 10-minute minimums both count.', function (w) {
      return CH.bars(w, { name: 'Sessions', values: wk.map(function (x) { return x.n; }), labels: wl, tips: wl.map(function (l) { return 'Week of ' + l; }), color: a.color,
        goal: s.workoutsPerWeek, goalLabel: 'Target ' + s.workoutsPerWeek, max: top, tickN: top, extra: wk.map(function (x) { return [x.full + ' full, ' + x.min + ' short', '']; }) });
    }, { head: ['Week of', 'Full', '10-minute'], rows: weeks.map(function (w, i) { return [wl[i], String(wk[i].full), String(wk[i].min)]; }).reverse() });
    var next = G.nextPlan(today);
    var plans = '<section class="card span2"><header><h3>' + icon('pulse') + ' Training plan</h3></header><p class="sub">Two sessions that alternate, built around your home gym. Three a week, with a day between.</p><div class="cards">' +
      C.workouts.plans.map(function (p) {
        return '<div class="plan' + (p.id === next ? ' next' : '') + '"><h4>' + esc(p.name) + (p.id === next ? ' <span class="tag">Next up</span>' : '') + '</h4><ol>' +
          p.exercises.map(function (e) { return '<li><b>' + esc(e.name) + '</b> ' + esc(e.sets) + ' <span>· ' + esc(e.kit) + '</span></li>'; }).join('') + '</ol></div>';
      }).join('') + '<div class="plan"><h4>' + esc(C.workouts.minimum.name) + '</h4><p style="font-size:14px;color:var(--text2)">' + esc(C.workouts.minimum.text) + '</p></div></div></section>';
    var recent = Object.keys(S.state.days).filter(function (d) { return S.state.days[d].workout; }).sort().reverse().slice(0, 12);
    var log = '<section class="card"><header><h3>Recent sessions</h3></header>' + (recent.length ? '<div class="loglist">' + recent.map(function (d) {
      var x = S.state.days[d].workout, p = C.workouts.plans.filter(function (q) { return q.id === x.plan; })[0];
      return '<div><b>' + esc(x.kind === 'full' ? (p ? p.name : 'Full session') : C.workouts.minimum.name) + '</b><span>' + D.fmt(d) + '</span></div>';
    }).join('') + '</div>' : '<p class="empty">No sessions logged yet. Log one from the Today page.</p>') + '</section>';
    return areaHead(a, st) + suggest + '<div class="tiles">' + tiles + '</div><div class="cards">' + LD.more.workoutCard() + stepsCard + sessCard + log + LD.more.sectionCharts(a) + habitGridCard(a) + plans + notesCard(a) + '</div>';
  }

  /* ---- upkeep ---- */
  function choreRow(c, date) {
    var x = S.choreStatus(c, date), a = LD.areaById[c.area || 'upkeep'];
    var when = x.doneToday ? 'Done today' : x.fixed ? (x.due ? 'Tonight' : 'Every ' + D.dayNames[c.weekday]) : x.due ? 'Ready when you are' : 'Due ' + dueText(x.dueIn);
    return '<div class="chore"><div class="ch1"><b>' + esc(S.text(c)) + '</b><span class="when' + (x.due ? ' due' : '') + '">' + when + '</span></div>' +
      (x.fixed ? '' : '<div class="meter" style="--c:' + a.color + '" role="img" aria-label="' + Math.round(x.pct * 100) + '% of the way to due"><i style="width:' + (x.pct * 100).toFixed(0) + '%"></i></div>') +
      '<div class="ch2"><span>' + (x.fixed ? '' : 'Every ' + x.every + ' days · ') + (x.last ? 'last done ' + D.fmt(x.last, { day: 'numeric', month: 'short' }) : 'not done yet') + '</span>' +
      '<button class="btn sm' + (x.doneToday ? ' on' : '') + '" aria-pressed="' + x.doneToday + '" data-act="chore" data-id="' + c.id + '" data-date="' + date + '" data-key="cr-' + c.id + '">' + (x.doneToday ? 'Done today' : 'Mark done') + '</button></div></div>';
  }
  function choreBlocks(a, filter) {
    var today = D.today(), list = S.chores().filter(filter);
    if (!list.length) return '';
    var start = D.add(D.weekStart(today), -77);
    var rows = list.map(function (c) { return { label: S.text(c), dates: S.state.chores[c.id] || [] }; });
    var weeks = [], k;
    for (k = 11; k >= 0; k--) weeks.push(D.add(D.weekStart(today), -7 * k));
    var perWeek = weeks.map(function (w) { var e = D.add(w, 6), n = 0; rows.forEach(function (r) { r.dates.forEach(function (d) { if (d >= w && d <= e) n++; }); }); return n; });
    var wl = weeks.map(function (w) { return D.fmt(w, { day: 'numeric', month: 'short' }); });
    var all = [];
    rows.forEach(function (r) { r.dates.forEach(function (d) { if (d >= start) all.push([d, r.label]); }); });
    all.sort().reverse();
    var top = Math.max(4, Math.max.apply(null, perWeek));
    return '<section class="card"><header><h3>' + icon('home') + ' Chores</h3></header><p class="sub">The bar fills as a chore comes due. Mark it done and it empties.</p>' +
      list.map(function (c) { return choreRow(c, today); }).join('') + '</section>' +
      chartCard('When each got done', 'A dot for every completion over the last 12 weeks.', function (w) {
        return CH.strip(w, { name: 'Chore completions', rows: rows, start: start, end: today, color: a.color });
      }, { head: ['Day', 'Chore'], rows: all.map(function (x) { return [D.fmt(x[0]), x[1]]; }) }) +
      chartCard('Chores per week', '', function (w) {
        return CH.bars(w, { name: 'Chores done', values: perWeek, labels: wl, tips: wl.map(function (l) { return 'Week of ' + l; }), color: a.color, max: top % 2 ? top + 1 : top, tickN: Math.min(4, top) });
      }, { head: ['Week of', 'Chores done'], rows: weeks.map(function (w, i) { return [wl[i], String(perWeek[i])]; }).reverse() });
  }

  /* ---- food ---- */
  function swapsCard() {
    return '<section class="card span2"><header><h3>Swaps</h3></header><div class="tvwrap" style="max-height:none;margin:0"><table><thead><tr><th>Instead of</th><th>Try</th></tr></thead><tbody>' +
      C.swaps.map(function (x) { return '<tr><td>' + esc(x.from) + '</td><td>' + esc(x.to) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  }
  function tasksPage(a, st) {
    var days = Object.keys(S.state.days).filter(function (d) { return (S.state.days[d].tasks || []).length; }).sort().reverse().slice(0, 14);
    return areaHead(a, st) + '<div class="cards"><section class="card span2"><header><h3>Recent tasks</h3></header>' + (days.length ? '<div class="loglist" style="max-height:none">' + days.map(function (d) {
      return S.state.days[d].tasks.map(function (t) { return '<div><b>' + (t.d ? '✓ ' : '') + esc(t.t) + '</b><span>' + D.fmt(d) + '</span></div>'; }).join('');
    }).join('') + '</div>' : '<p class="empty">Add up to three tasks a day from the Today page.</p>') + '</section></div>';
  }
  function areaPage(a, st) {
    if (a.id === 'move') return movePage(a, st);
    if (a.kind === 'tasks') return tasksPage(a, st);
    var extraTiles = '', top = '', bottom = '';
    if (a.id === 'sleep') top = nightCard();
    if (a.id === 'food') {
      var d14 = D.range(D.today(), 14), since = D.add(D.today(), -27);
      extraTiles = tile('Home-made days, last 14', String(d14.filter(function (d) { return S.day(d).checks.homemade; }).length), 'Days without takeaway') +
        tile('Batch cooks, last 28 days', String((S.state.chores.mealprep || []).filter(function (d) { return d >= since; }).length), 'From the meal prep chore');
      top = LD.more.mealPlan();
      bottom = choreBlocks(a, function (c) { return c.area === 'food'; }) + LD.more.mealBook() + swapsCard();
    }
    if (a.id === 'upkeep') {
      var since2 = D.add(D.today(), -27), n = 0, ready = 0;
      S.chores().forEach(function (c) { if ((c.area || 'upkeep') !== 'upkeep') return; n += (S.state.chores[c.id] || []).filter(function (d) { return d >= since2; }).length; if (S.choreStatus(c, D.today()).due) ready++; });
      extraTiles = tile('Chores done, last 28 days', String(n), ready ? ready + ' ready now' : 'Nothing waiting');
      bottom = choreBlocks(a, function (c) { return (c.area || 'upkeep') === 'upkeep'; });
    }
    return areaHead(a, st) + '<div class="tiles">' + genericTiles(a) + extraTiles + '</div><div class="cards">' + top + habitGridCard(a) + trendCard(a) + ratesCard(a) + LD.more.sectionCharts(a) + bottom + notesCard(a) + '</div>';
  }

  /* ================= JOURNEY ================= */
  function journey(st) {
    var p = G.progress(st.total, C.xp.base), rank = G.rank(p.level), nr = G.nextRank(p.level), today = D.today(), areas = S.areas();
    var head = '<section class="card pagehead"><div class="badge" style="width:74px;height:84px;font-size:32px">' + p.level + '</div><div class="ph-main"><p class="eyebrow">Your journey</p><h1>' + rank.name + '</h1>' +
      '<p class="blurb">' + (nr ? 'You become a ' + nr.name + ' at level ' + nr.level + '.' : 'You have reached the highest rank.') + ' XP is never lost, and a missed day costs nothing.</p>' +
      '<div class="lvrow">' + xpBar(p) + '<span class="xpnum">' + num(p.into) + ' / ' + num(p.need) + ' XP to level ' + (p.level + 1) + '</span></div></div></section>';
    var trail = '<section class="card span2"><header><h3>' + icon('peak') + ' The trail</h3></header><div class="trail">' + C.ranks.map(function (r, i) {
      var nx = C.ranks[i + 1], cur = p.level >= r.level && (!nx || p.level < nx.level);
      return '<div class="stop' + (cur ? ' cur' : p.level >= r.level ? ' done' : '') + '"><b>' + r.name + '</b>Level ' + r.level + '</div>';
    }).join('') + '</div></section>';
    var skills = '<section class="card span2"><header><h3>' + icon('leaf') + ' Skills</h3></header><p class="sub">Each section levels up on its own and grows its own plant.</p><div class="skills">' + areas.map(function (a) {
      var q = G.progress(st.areaXP[a.id] || 0, C.xp.areaBase);
      return '<a class="skill" href="#/' + a.id + '">' + P.single(S.plantOf(a), G.stage(q.level), 76) + '<div class="sk2"><b>' + a.name + '</b> <span class="count">Lv ' + q.level + '</span>' + xpBar(q) + '<div class="xpnum">' + num(q.into) + ' / ' + num(q.need) + ' XP</div></div></a>';
    }).join('') + '</div></section>';
    var d30 = D.range(today, 30), labels = d30.map(function (d) { return D.fmt(d, { day: 'numeric', month: 'short' }); });
    var series = areas.map(function (a) { return { name: a.name, color: a.color, values: d30.map(function (d) { return ((st.perDay[d] || { areas: {} }).areas[a.id]) || 0; }) }; });
    var xpCard = chartCard('XP by day', 'Where each day’s XP came from, last 30 days.', function (w) {
      return CH.stacked(w, { name: 'XP by day and section', series: series, labels: labels, tips: d30.map(function (d) { return D.fmt(d); }), unit: ' XP', height: 230 });
    }, { head: ['Day'].concat(areas.map(function (a) { return a.name; })).concat(['Total']), rows: d30.map(function (d, i) {
      return [D.fmt(d)].concat(series.map(function (s) { return String(s.values[i]); })).concat([String((st.perDay[d] || { total: 0 }).total)]);
    }).reverse() }, legend(areas.map(function (a) { return [a.name, a.color]; })), 'span2');
    var span = Math.min(120, Math.max(14, D.diff(today, S.state.startDate) + 1)), dn = D.range(today, span), run = 0;
    st.list.forEach(function (d) { if (d < dn[0]) run += st.perDay[d].total; });
    var cum = dn.map(function (d) { run += (st.perDay[d] || { total: 0 }).total; return run; });
    var cl = dn.map(function (d) { return D.fmt(d, { day: 'numeric', month: 'short' }); });
    var cumCard = chartCard('Total XP', 'It only ever goes up.', function (w) {
      return CH.line(w, { name: 'Total XP', values: cum, labels: cl, tips: dn.map(function (d) { return D.fmt(d); }), color: '#a7c957', fmt: function (v) { return num(v) + ' XP'; } });
    }, { head: ['Day', 'Total XP'], rows: dn.map(function (d, i) { return [D.fmt(d), num(cum[i])]; }).reverse() });
    var log = '<section class="card"><header><h3>Level log</h3></header>' + (st.levelLog.length ? '<div class="loglist">' + st.levelLog.slice().reverse().map(function (x) {
      return '<div><b>Level ' + x.level + (C.ranks.some(function (r) { return r.level === x.level; }) ? ' · ' + G.rank(x.level).name : '') + '</b><span>' + D.fmt(x.date) + '</span></div>';
    }).join('') + '</div>' : '<p class="empty">Your first level-up will be recorded here.</p>') + '</section>';
    var miles = '<section class="card span2"><header><h3>' + icon('star') + ' Milestones</h3></header><div class="miles">' + C.milestones.map(function (m) {
      var g = m.get(st), got = g[0] >= g[1];
      return '<div class="mile' + (got ? ' got' : '') + '"><b>' + icon(got ? 'check' : 'lock') + esc(m.name) + '</b><p>' + esc(m.text) + '</p><div class="meter" role="img" aria-label="' + num(Math.min(g[0], g[1])) + ' of ' + num(g[1]) + '"><i style="width:' + Math.min(100, g[0] / g[1] * 100).toFixed(0) + '%"></i></div>' +
        '<p style="margin:5px 0 0">' + (got ? 'Earned' : num(g[0]) + ' of ' + num(g[1])) + '</p></div>';
    }).join('') + '</div></section>';
    var tiles = '<div class="tiles">' + tile('Total XP', num(st.total)) + tile('Days logged', String(st.totals.daysLogged)) + tile('Habit ticks', num(st.totals.ticks)) +
      tile('Workouts', String(st.totals.workouts)) + tile('Chores done', String(st.totals.chores)) + tile('Steps walked', num(st.totals.steps)) + '</div>';
    return LD.more.subnav('journey') + head + tiles + '<div class="cards">' + trail + skills + xpCard + cumCard + log + miles + '</div>' + LD.more.insights();
  }

  /* ================= SETTINGS ================= */
  function toggle(kind, item, label) {
    return '<input type="checkbox" data-on="' + kind + '" data-id="' + item.id + '"' + (S.isOn(kind, item) ? ' checked' : '') + ' aria-label="Show ' + esc(label) + '" data-key="sw-' + kind + '-' + item.id + '">';
  }
  /* a habit or chore row: name, optional extra control, rename button, on/off. Turns into a small form while renaming. */
  function itemRow(kind, item, label, small, extra) {
    if (view.edit === kind + ':' + item.id) {
      var raw = S.text(item);
      return '<form class="sw edit" data-form="rename" data-id="' + item.id + '"><input type="text" name="t" maxlength="80" value="' + esc(raw) + '" aria-label="Name" data-key="rename">' +
        '<button class="btn sm primary">Save</button><button type="button" class="btn sm ghost" data-act="edit-cancel">Cancel</button>' +
        (item.custom ? '<button type="button" class="btn sm danger" data-act="remove" data-kind="' + kind + '" data-id="' + item.id + '">Remove</button>' : '') +
        (raw.indexOf('{') >= 0 ? '<small>{wake}, {bed} and {screens} are filled in from your target times.</small>' : '') + '</form>';
    }
    return '<div class="sw"><span class="nm">' + esc(label) + (small ? '<small>' + esc(small) + '</small>' : '') + '</span>' + (extra || '') +
      '<button class="x" data-act="edit" data-kind="' + kind + '" data-id="' + item.id + '" aria-label="Rename ' + esc(label) + '" title="Rename" data-key="ed-' + item.id + '">' + icon('pencil') + '</button>' + toggle(kind, item, label) + '</div>';
  }
  /* a habit in Settings. The pencil opens a small form: rename it, move it to another time of day, change its place in the list. */
  function habitRow(h) {
    var a = LD.areaById[h.area], label = txt(h), dys = S.state.settings.days[h.id];
    if (view.edit === 'habits:' + h.id) {
      var raw = S.text(h);
      var chips = '<div class="daysrow"><span>On these days</span>' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (L, i) {
        return '<label class="daychip"><input type="checkbox" name="d' + i + '"' + (!dys || dys.indexOf(i) >= 0 ? ' checked' : '') + ' aria-label="' + D.dayNames[i] + '"><span>' + L + '</span></label>';
      }).join('') + '</div>';
      return '<form class="sw edit" data-form="edit-habit" data-id="' + h.id + '"><input type="text" name="t" maxlength="80" value="' + esc(raw) + '" aria-label="Name" data-key="rename">' +
        '<label class="mini">Shows in<select name="group">' + groupOptions(h.group) + '</select></label>' +
        (h.custom ? '<label class="mini">Counts towards<select name="area">' + areaOptions(h.area) + '</select></label>' : '') + chips +
        '<div class="btnrow"><button class="btn sm primary">Save</button><button type="button" class="btn sm ghost" data-act="edit-cancel">Cancel</button>' +
        '<button type="button" class="btn sm ghost" data-act="move" data-id="' + h.id + '" data-dir="-1" aria-label="Move up the list" title="Move up" data-key="mv-up">▲</button>' +
        '<button type="button" class="btn sm ghost" data-act="move" data-id="' + h.id + '" data-dir="1" aria-label="Move down the list" title="Move down" data-key="mv-down">▼</button>' +
        (h.custom ? '<button type="button" class="btn sm danger" data-act="remove" data-kind="habits" data-id="' + h.id + '">Remove</button>' : '') + '</div>' +
        (raw.indexOf('{') >= 0 ? '<small>{wake}, {bed} and {screens} are filled in from your target times.</small>' : '') + '</form>';
    }
    return '<div class="sw"><span class="dot" style="background:' + a.color + '" title="Counts towards ' + a.name + '"></span><span class="nm">' + esc(label) +
      (dys ? '<small>' + dys.map(function (i) { return D.dayNames[i].slice(0, 3); }).join(', ') + ' only</small>' : '') + '</span>' +
      '<button class="x" data-act="edit" data-kind="habits" data-id="' + h.id + '" aria-label="Change ' + esc(label) + '" title="Rename, move or reorder" data-key="ed-' + h.id + '">' + icon('pencil') + '</button>' + toggle('habits', h, label) + '</div>';
  }
  function settings(st) {
    var s = S.state.settings, ui = s.ui;
    var fld = function (label, attr, key, type, value, attrs) {
      var id = 'f-' + attr + '-' + key;
      return '<div class="fld"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + type + '" data-' + attr + '="' + key + '" value="' + esc(value) + '" ' + (attrs || '') + ' data-key="' + id + '"></div>';
    };
    var options = function (opts, value) { return opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); };
    var check = function (label, small, key) {
      return '<label class="sw"><span class="nm">' + label + (small ? '<small>' + small + '</small>' : '') + '</span><input type="checkbox" data-ui="' + key + '"' + (ui[key] ? ' checked' : '') + ' data-key="ui-' + key + '"></label>';
    };
    var active = C.areas.filter(function (a) { return S.isOn('areas', a); });

    var targets = '<section class="card"><header><h3>' + icon('sliders') + ' Targets</h3></header><div class="fields">' +
      fld('Wake time', 'set', 'wake', 'time', s.wake) + fld('Bedtime', 'set', 'bed', 'time', s.bed) +
      fld('Screens down (minutes before bed)', 'set', 'screensDownMin', 'number', s.screensDownMin, 'min="0" max="180" step="5"') +
      fld('Daily step goal', 'set', 'stepGoal', 'number', s.stepGoal, 'min="1000" max="30000" step="500"') +
      fld('Workouts per week', 'set', 'workoutsPerWeek', 'number', s.workoutsPerWeek, 'min="1" max="7"') + '</div></section>';

    var look = '<section class="card"><header><h3>' + icon('sun') + ' Look and feel</h3></header><div class="fields">' +
      fld('Dashboard name', 'ui', 'name', 'text', ui.name, 'maxlength="24" placeholder="' + esc(C.appName) + '"') + '</div>' +
      check('Animations and celebrations', 'Moving plants and falling leaves, XP pop-ups and the level-up screen.', 'fx') +
      '<p class="hint">Plants, decorations, the season and the sky are on the <a href="#/grove">Grove page</a>.</p></section>';

    var sections = '<section class="card"><header><h3>' + icon('leaf') + ' Sections</h3></header><p class="sub">Switch a section on when you are ready for it. Turning one off hides it and keeps its history.</p>' +
      C.areas.map(function (a) { return '<label class="sw"><span class="nm">' + a.name + '<small>' + esc(a.blurb || '') + '</small></span>' + toggle('areas', a, a.name) + '</label>'; }).join('') + '</section>';

    var all = S.allHabits();
    var habits = '<section class="card"><header><h3>' + icon('check') + ' Daily habits</h3></header><p class="sub">Listed by the card they appear on. The pencil renames a habit, moves it to another time of day, or changes its place in the list. The dot shows which section it counts towards.</p>' +
      C.groups.map(function (g) {
        var hs = all.filter(function (h) { return h.group === g.id && S.isOn('areas', LD.areaById[h.area]); });
        return '<p class="grp">' + g.name + '</p>' + (hs.length ? hs.map(habitRow).join('') : '<p class="empty">Nothing here yet.</p>');
      }).join('') +
      '<form class="addrow" data-form="add-habit"><p class="grp" style="flex-basis:100%;margin:0">Add a habit</p><input type="text" name="t" maxlength="80" placeholder="For example: Take tablets" aria-label="New habit" required>' +
      '<label class="mini">Shows in<select name="group">' + groupOptions('morning') + '</select></label>' +
      '<label class="mini">Counts towards<select name="area">' + areaOptions('upkeep') + '</select></label><button class="btn sm primary">Add habit</button></form></section>';

    var chores = '<section class="card"><header><h3>' + icon('home') + ' Chores</h3></header><p class="sub">The number is how many days between each time.</p>' + S.allChores().map(function (c) {
      var label = S.text(c);
      return itemRow('chores', c, label, c.weekday !== undefined ? 'Every ' + D.dayNames[c.weekday] : '',
        c.weekday !== undefined ? '' : '<input type="number" min="1" max="120" value="' + S.every(c) + '" data-every="' + c.id + '" aria-label="Days between: ' + esc(label) + '" data-key="ev-' + c.id + '">');
    }).join('') +
      '<form class="addrow" data-form="add-chore"><input type="text" name="t" maxlength="80" placeholder="New chore" aria-label="New chore" required>' +
      '<label class="every">every <input type="number" name="every" min="1" max="120" value="7" aria-label="Days between"> days</label><button class="btn sm primary">Add chore</button></form></section>';

    var day = '<section class="card"><header><h3>' + icon('moon') + ' Day and reminders</h3></header><div class="fields">' +
      fld('New day starts at (hour, 0 to 8)', 'set', 'dayStartsHour', 'number', s.dayStartsHour, 'min="0" max="8"') +
      fld('Last night card shows until (hour)', 'ui', 'lastNightUntil', 'number', ui.lastNightUntil, 'min="6" max="23"') + '</div>' +
      check('Show the Last night card', 'Lets you tick the bedtime habits the next morning.', 'lastNight') +
      check('Daily energy and mood check-in', 'Two optional taps on the Today page that feed the Stats charts.', 'checkin') +
      check('Suggest a new step goal', 'Offers a higher goal when you keep hitting it, or a lower one when it is out of reach.', 'suggestGoal') + '</section>';

    var rewards = '<section class="card"><header><h3>' + icon('star') + ' Rewards</h3></header><p class="sub">How much XP things are worth. Changing these re-scores your history too.</p><div class="fields">' +
      fld('Each habit tick', 'xp', 'tick', 'number', S.xp('tick'), 'min="1" max="100"') + fld('Full workout', 'xp', 'workoutFull', 'number', S.xp('workoutFull'), 'min="1" max="200"') +
      fld('10-minute workout', 'xp', 'workoutMin', 'number', S.xp('workoutMin'), 'min="1" max="200"') + '</div></section>';

    var data = '<section class="card"><header><h3>Your data</h3></header><p class="sub">Saved in this browser on this device. Download a backup now and then.</p><div class="btnrow">' +
      '<button class="btn" data-act="export">Download backup</button><label class="btn" style="cursor:pointer">Restore backup<input type="file" accept="application/json,.json" data-import hidden></label>' +
      (S.state.demo ? '<button class="btn primary" data-act="demo-clear">Clear demo data</button>' : '<button class="btn ghost" data-act="demo-load">Show demo data</button>') +
      '<button class="btn danger" data-act="reset">Erase everything</button></div>' + LD.more.safetyCopies() + '</section>';
    return '<h2 class="section-title" style="margin-top:4px">Settings</h2><div class="cards flow wide">' + targets + look + sections + habits + chores + day + LD.more.remindersCard() + rewards + syncCard() + data + '</div>' +
      '<p class="version">' + esc(S.name()) + ' version ' + esc(C.version) + '</p>';
  }
  /* choose what grows for each section (shown on the Grove page) */
  function plantsCard(st) {
    return '<section class="card"><header><h3>' + icon('tree') + ' Plants</h3></header><p class="sub">Choose what grows for each section. The picture shows it fully grown.</p>' +
      S.areas().map(function (a) {
        var cur = S.plantOf(a), stage = G.stage(G.level(st.areaXP[a.id] || 0, C.xp.areaBase));
        return '<div class="plantrow">' + P.single(cur, 5, 68) + '<div class="nm"><b>' + a.name + '</b><small>Growth stage ' + (stage + 1) + ' of 6 so far</small>' +
          '<select data-plant="' + a.id + '" aria-label="Plant for ' + a.name + '" data-key="pl-' + a.id + '">' +
          P.list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>';
      }).join('') + '</section>';
  }
  function ago(ts) {
    var m = Math.round((Date.now() - ts) / 60000);
    return m < 1 ? 'just now' : m < 60 ? m + (m === 1 ? ' minute ago' : ' minutes ago') : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? ' hour ago' : ' hours ago') : 'on ' + new Date(ts).toLocaleDateString();
  }
  function syncCard() {
    var Y = LD.sync, c = Y.cfg, head = '<header><h3>' + icon('cloud') + ' Sync between devices</h3>';
    if (Y.on()) {
      var stat = S.state.demo ? 'Paused while demo data is showing.' : Y.busy ? 'Syncing now.' : c.err ? Y.MSG[c.err] : 'Up to date. Last synced ' + (c.last ? ago(c.last) : 'just now') + '.';
      return '<section class="card">' + head + '<span class="tag">On</span></header><p class="sub">' + esc(stat) + '</p>' +
        '<div class="btnrow"><button class="btn" data-act="sync-now">Sync now</button><button class="btn" data-act="sync-code">Copy connection code</button>' +
        '<button class="btn ghost" data-act="sync-off">Disconnect this device</button></div>' +
        '<p class="hint">To add another device, copy the connection code, send it to yourself, and paste it into this card there. Treat the code like a password.</p></section>';
    }
    return '<section class="card">' + head + '</header><p class="sub">Keeps your PC and phone in step through a Google Sheet that only you own. The steps are for the very first setup. Every other device, browser or copy of this page just needs a connection code pasted below.</p>' +
      '<ol class="steps-list"><li>In Chrome, open <b>sheets.new</b> to make a Google Sheet. Name it Grove data.</li>' +
      '<li>In the sheet, open <b>Extensions</b>, then <b>Apps Script</b>. Delete the few lines already there.</li>' +
      '<li><button class="btn sm primary" data-act="sync-script">Copy the script</button> then paste it in and press Save.</li>' +
      '<li>Press <b>Deploy</b>, then <b>New deployment</b>. Type: <b>Web app</b>. Execute as: <b>Me</b>. Who has access: <b>Anyone</b>. Press Deploy.</li>' +
      '<li>Google asks you to approve your own script: pick your account, then <b>Advanced</b>, then <b>Go to the project</b>, then <b>Allow</b>.</li>' +
      '<li>Copy the <b>Web app URL</b> it shows and paste it here.</li></ol>' +
      '<form class="addrow" data-form="sync-connect"><input type="text" name="t" placeholder="Web app link, or a connection code" aria-label="Web app link or connection code" required data-key="sync-in">' +
      '<input type="text" name="k" placeholder="Key (only if the script was copied on a different page or device)" aria-label="Key from line 6 of the script, optional" autocomplete="off" data-key="sync-key">' +
      '<button class="btn sm primary">Connect</button></form>' +
      (view.syncMsg ? '<p class="hint warn">' + esc(view.syncMsg) + '</p>' : '') +
      '<details class="tview"><summary>Show the script</summary><textarea readonly rows="8" class="code" aria-label="Google script">' + esc(Y.script()) + '</textarea></details></section>';
  }
  function copyText(text, okMsg) {
    var fail = function () { window.prompt('Copy this:', text); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fail);
    else fail();
  }

  /* ================= render ================= */
  function mount() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-chart]'), function (el) {
      var w = Math.floor(el.clientWidth); if (w < 160) w = 320;
      el.innerHTML = charts[+el.dataset.chart](w);
    });
    /* every picture of the grove: the Today header, the big one on the Grove page, and section banners */
    var scenes = document.querySelectorAll('[data-scene]');
    if (scenes.length) {
      var st = G.compute(), ui = S.state.settings.ui, hidden = S.state.settings.decor, shown = {};
      var items = S.areas().map(function (a) {
        var L = G.level(st.areaXP[a.id] || 0, C.xp.areaBase);
        return { id: a.id, name: a.name, plant: S.plantOf(a), stage: G.stage(L), level: L };
      });
      P.decor.forEach(function (d) { if (st.level >= d.level && hidden[d.id] !== false) shown[d.id] = true; });
      Array.prototype.forEach.call(scenes, function (sc) {
        var mode = sc.dataset.mode || 'hero', only = sc.dataset.area;
        sc.innerHTML = P.scene(Math.max(300, Math.floor(sc.clientWidth)), sc.clientHeight || 270, {
          sky: P.sky(sc.dataset.scene === 'auto' ? ui.sky : sc.dataset.scene, ui.hemi, mode === 'banner'), falling: ui.falling,
          season: P.seasonNow(ui.season, ui.hemi), still: !ui.fx, decor: shown, grew: view.grew,
          items: only ? items.filter(function (i) { return i.id === only; }) : items, banner: mode === 'banner', big: mode === 'grove'
        });
      });
      view.grew = null;
    }
  }
  /* the sky to show: the owner's fixed choice, or by the clock */
  function phaseNow(live) { return live ? 'auto' : 'day'; }   /* 'auto' means the owner's Sky setting: the real sky, or a fixed one */
  /* Everything is drawn through render(), so a fault shows a message with a way out instead of a blank page. */
  function render() { try { draw(); } catch (err) { crash(err); } }
  function crash(err) {
    if (window.console) console.error(err);
    if (document.getElementById('crash')) return;
    var el = document.createElement('div');
    el.id = 'crash'; el.className = 'banner crash';
    el.innerHTML = '<span><b>Something went wrong on this page.</b> What you have logged is still saved. Reloading usually fixes it. If it keeps happening, download a backup first.</span><span class="sp"></span>' +
      '<button class="btn sm primary" data-act="reload">Reload</button><button class="btn sm" data-act="export">Download backup</button>';
    $app.parentNode.insertBefore(el, $app);
  }
  function draw() {
    var r = route(), st = G.compute(), a = LD.areaById[r], html;
    var ae = document.activeElement, key = ae && ae.dataset ? ae.dataset.key : null;
    charts = [];
    $nav.innerHTML = nav(a && !S.isOn('areas', a) ? '' : r, st);
    var extra = LD.pages[r];
    if (r === 'journey') html = journey(st);
    else if (r === 'settings') html = settings(st);
    else if (extra) html = extra(st);
    else if (a && S.isOn('areas', a)) html = areaPage(a, st);
    else html = home(st);
    document.body.classList.toggle('nofx', !S.state.settings.ui.fx);
    var season = P.seasons[P.seasonNow(S.state.settings.ui.season, S.state.settings.ui.hemi)];   /* the season tints the whole page */
    document.body.style.setProperty('--accent', season.accent);
    document.body.style.setProperty('--accent2', season.accent2);
    $app.innerHTML = banner() + html;
    mount();
    $tip.hidden = true;
    if (view.pop) {   /* the box that was just ticked gives a small bounce */
      var pe = $app.querySelector('[data-key="' + view.pop + '"]');
      if (pe && pe.classList.contains('on')) pe.classList.add('pop');
      view.pop = null;
    }
    if (key) { var el = $app.querySelector('[data-key="' + key + '"]'); if (el) el.focus({ preventScroll: true }); }
    document.title = ({ journey: 'Journey', settings: 'Settings', grove: 'Grove', week: 'Week in review', stats: 'Stats' }[r] || (a && S.isOn('areas', a) ? a.name : 'Today')) + ' · ' + S.name();
  }

  /* ---------------- effects ---------------- */
  function floatXP(x, y, text) {
    var el = document.createElement('div'); el.className = 'xpfloat'; el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px'; $fx.appendChild(el);
    setTimeout(function () { el.remove(); }, 1100);
  }
  function toast(text) {
    var el = document.createElement('div'); el.className = 'toast'; el.textContent = text; $fx.appendChild(el);
    setTimeout(function () { el.remove(); }, 3700);
  }
  function levelUp(L) {
    var old = $fx.querySelector('.levelup'); if (old) old.remove();
    var el = document.createElement('div'), r = G.rank(L), isNew = C.ranks.some(function (x) { return x.level === L; });
    el.className = 'levelup';
    var found = P.decor.filter(function (d) { return d.level === L; })[0];
    el.innerHTML = '<div class="lu"><p class="eyebrow">Level up</p><div class="badge">' + L + '</div><h2>' + (isNew ? 'You are now a ' + esc(r.name) : 'Level ' + L) + '</h2><p>' + (isNew ? 'A new rank on the trail.' : esc(r.name) + ', and climbing.') + '</p>' +
      (found ? '<div class="found">' + P.decorIcon(found.id, 64) + '<span>New in your grove<b>' + found.name + '</b></span></div>' : '') + '<small>Click anywhere to carry on</small></div>';
    el.addEventListener('click', function () { el.remove(); });
    $fx.appendChild(el);
    setTimeout(function () { el.remove(); }, 6000);
  }
  function snap() {
    var st = G.compute(), o = { total: st.total, level: st.level, areas: {}, quests: {}, bonus: (st.perDay[D.today()] || {}).bonus || 0 };
    C.areas.forEach(function (a) { o.areas[a.id] = G.level(st.areaXP[a.id] || 0, C.xp.areaBase); });
    LD.quests.state(D.weekStart(D.today())).forEach(function (q) { if (q.done) o.quests[q.q.id] = q.text; });
    return o;
  }
  /* run a change, redraw, then celebrate whatever it earned */
  function act(fn, ev) {
    var b = snap(); fn(); var a = snap(), d = a.total - b.total, fx = S.state.settings.ui.fx;
    C.areas.forEach(function (ar) { if (G.stage(a.areas[ar.id]) > G.stage(b.areas[ar.id])) view.grew = ar.id; });   /* that plant grows in front of you */
    render();
    for (var qid in a.quests) if (!b.quests[qid]) toast('Quest complete: ' + a.quests[qid]);
    if (a.bonus > b.bonus) toast('Welcome back. Bonus: +' + a.bonus + ' XP');
    if (!fx) { if (a.level > b.level) toast('Level ' + a.level + ' reached'); return; }
    if (d > 0 && ev) {
      var x = ev.clientX, y = ev.clientY;
      if (!x && !y && ev.target && ev.target.getBoundingClientRect) { var bx = ev.target.getBoundingClientRect(); x = bx.left + bx.width / 2; y = bx.top; }
      floatXP(x, y, '+' + d + ' XP');
    }
    if (a.level > b.level) levelUp(a.level);
    else C.areas.forEach(function (ar) {
      if (a.areas[ar.id] > b.areas[ar.id]) toast(ar.name + ' reached level ' + a.areas[ar.id] + (G.stage(a.areas[ar.id]) > G.stage(b.areas[ar.id]) ? '. Your ' + P.names[S.plantOf(ar)] + ' grew.' : '.'));
    });
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var d = el.dataset;
    switch (d.act) {
      case 'check': view.pop = d.key; act(function () { S.toggleCheck(d.date, d.id); }, e); break;
      case 'chore': view.pop = d.key; act(function () { S.toggleChore(d.id, d.date); }, e); break;
      case 'workout': act(function () { S.setWorkout(d.date, d.kind); }, e); break;
      case 'task': act(function () { S.toggleTask(d.date, +d.i); }, e); break;
      case 'task-del': act(function () { S.removeTask(d.date, +d.i); }); break;
      case 'date':
        var t = D.today(), cur = view.date || t;
        view.date = d.d === '0' ? t : D.add(cur, +d.d);
        if (view.date > t) view.date = t;
        render(); break;
      case 'goal': S.state.settings.stepGoal = +d.v; S.save(); render(); toast('Step goal set to ' + num(+d.v)); break;
      case 'edit':
        view.edit = d.kind + ':' + d.id; render();
        var inp = $app.querySelector('[data-key="rename"]'); if (inp) { inp.focus(); inp.select(); }
        break;
      case 'edit-cancel': view.edit = null; render(); break;
      case 'move': S.moveHabit(d.id, +d.dir); render(); break;
      case 'add-here':
        view.addTo = d.group; render();
        var ai = $app.querySelector('[data-key="add-here"]'); if (ai) ai.focus();
        break;
      case 'add-here-cancel': view.addTo = null; render(); break;
      case 'reload': location.reload(); break;
      case 'remove':
        if (confirm('Remove this from your lists? Everything you already ticked, and its XP, is kept.')) { S.removeCustom(d.kind, d.id); view.edit = null; render(); }
        break;
      case 'welcome-hide': S.state.welcomed = true; S.save(); render(); break;
      case 'demo-load': S.loadDemo(); view.date = null; render(); window.scrollTo(0, 0); break;
      case 'demo-clear': S.clearDemo(); view.date = null; render(); window.scrollTo(0, 0); break;
      case 'export':
        var blob = new Blob([S.exportText()], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'grove-backup-' + D.today() + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); break;
      case 'reset':
        if (LD.sync.on()) {
          if (!confirm('Erase all Grove data on this device and in your synced sheet? Your other devices will be cleared too. This cannot be undone.')) break;
          LD.sync.wipe().then(function (ok) {
            if (!ok) { toast('Could not reach the sheet, so nothing was erased.'); return; }
            S.reset(); view.date = null; render(); toast('Everything erased');
          });
        } else if (confirm('Erase all Grove data in this browser? This cannot be undone.')) { S.reset(); view.date = null; render(); }
        break;
      case 'sync-script': copyText(LD.sync.script(), 'Script copied. Paste it into Apps Script.'); break;
      case 'sync-code': copyText(LD.sync.code(), 'Connection code copied'); break;
      case 'sync-now': LD.sync.run().then(function (err) { toast(err || 'Synced'); }); break;
      case 'sync-off':
        if (confirm('Stop syncing on this device? Your data stays here and in the sheet.')) { LD.sync.disconnect(); view.syncMsg = null; render(); }
        break;
      default:
        if (LD.actions[d.act]) LD.actions[d.act](d, e);   /* buttons that belong to pages-more.js */
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target, d = el.dataset;
    if (LD.onChange && LD.onChange(el, d)) return;   /* controls that belong to pages-more.js */
    if (d.steps !== undefined) { act(function () { S.setSteps(d.date, parseInt(el.value, 10) || 0); }, { target: el }); return; }
    if (d.set) {
      var s = S.state.settings, v = el.value;
      if (el.type === 'number') { v = parseInt(v, 10); if (!(v >= +el.min && v <= +el.max)) { render(); return; } }
      else if (!/^\d\d:\d\d$/.test(v)) { render(); return; }
      s[d.set] = v; S.save(); render(); return;
    }
    if (d.on) { S.setOn(d.on, d.id, el.checked); render(); return; }
    if (d.plant) { S.state.settings.plants[d.plant] = el.value; S.save(); render(); return; }
    if (d.ui || d.xp) {
      var val = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'number') { val = parseInt(val, 10); if (!(val >= +el.min && val <= +el.max)) { render(); return; } }
      if (el.type === 'text') val = val.trim().slice(0, 24);
      if (d.ui) S.state.settings.ui[d.ui] = val; else S.state.settings.xp[d.xp] = val;
      S.save(); render(); return;
    }
    if (d.every) { var n = parseInt(el.value, 10); if (n >= 1 && n <= 120) { S.state.settings.every[d.every] = n; S.save(); } render(); return; }
    if (d.import !== undefined && el.files && el.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { S.importText(String(fr.result)); view.date = null; render(); toast('Backup restored'); }
        catch (err) { toast('That file is not a Grove backup'); }
      };
      fr.readAsText(el.files[0]);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.steps !== undefined) e.target.blur(); });
  document.addEventListener('submit', function (e) {
    var f = e.target, kind = f.dataset.form;
    if (!kind) return;
    e.preventDefault();
    var v = f.elements.t.value.trim();
    if (!v) return;
    if (LD.onSubmit(kind, f, v)) { /* handled by pages-more.js */ }
    else if (kind === 'task') S.addTask(f.dataset.date, v);
    else if (kind === 'sync-connect') {
      view.syncMsg = 'Connecting.';
      LD.sync.connect(v, f.elements.k.value).then(function (err) { view.syncMsg = err; render(); if (!err) toast('Connected. Your data is syncing.'); });
    }
    else if (kind === 'rename') { S.rename(f.dataset.id, v); view.edit = null; }
    else if (kind === 'edit-habit') {
      var hb = S.habit(f.dataset.id);
      S.rename(f.dataset.id, hb && v === hb.text ? '' : v);
      S.setGroup(f.dataset.id, f.elements.group.value);
      if (f.elements.area) S.setArea(f.dataset.id, f.elements.area.value);
      var days = [];
      for (var di = 0; di < 7; di++) if (f.elements['d' + di] && f.elements['d' + di].checked) days.push(di);
      S.setDays(f.dataset.id, days);
      view.edit = null;
    }
    else if (kind === 'add-here') { S.addHabit(v, f.elements.area.value, f.dataset.group); view.addTo = null; toast('Habit added'); }
    else if (kind === 'add-habit') { S.addHabit(v, f.elements.area.value, f.elements.group.value); toast('Habit added'); }
    else if (kind === 'add-chore') { var n = parseInt(f.elements.every.value, 10); S.addChore(v, n >= 1 && n <= 120 ? n : 7); toast('Chore added'); }
    render();
  });

  /* tooltips: built with textContent so labels are never treated as markup */
  function showTip(el, x, y) {
    var data; try { data = JSON.parse(el.getAttribute('data-tip')); } catch (e) { return; }
    $tip.textContent = '';
    var t = document.createElement('div'); t.className = 'tt'; t.textContent = data.t; $tip.appendChild(t);
    (data.r || []).forEach(function (r) {
      var row = document.createElement('div'); row.className = 'tr';
      if (r[2]) { var k = document.createElement('i'); k.style.background = r[2]; row.appendChild(k); }
      var v = document.createElement('b'); v.textContent = r[0]; row.appendChild(v);
      if (r[1]) { var l = document.createElement('span'); l.textContent = r[1]; row.appendChild(l); }
      $tip.appendChild(row);
    });
    $tip.hidden = false;
    var bw = $tip.offsetWidth, bh = $tip.offsetHeight, L = x + 14, T = y - bh - 10;
    if (L + bw > window.innerWidth - 8) L = x - bw - 14;
    if (L < 8) L = 8;
    if (T < 8) T = y + 18;
    $tip.style.left = L + 'px'; $tip.style.top = T + 'px';
  }
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el) showTip(el, e.clientX, e.clientY); else $tip.hidden = true;
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el) { var b = el.getBoundingClientRect(); showTip(el, b.left + b.width / 2, b.top); }
  });
  document.addEventListener('focusout', function () { $tip.hidden = true; });

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(mount, 150); });
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  /* sync hooks: redraw when data arrives, unless the owner is in the middle of typing */
  function typing() { var t = document.activeElement && document.activeElement.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'; }
  LD.sync.onChange = function () { if (!typing()) render(); };
  LD.sync.onStatus = function () {
    if (route() === 'settings' && !typing()) render();
    else $nav.innerHTML = nav(route(), G.compute());
  };
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (!typing()) render();          /* also rolls the page over to a new day */
    LD.sync.run();
  });
  window.addEventListener('online', function () { LD.sync.run(); });
  /* the sun and moon keep moving while the page sits open */
  setInterval(function () { if (!document.hidden && !typing()) mount(); }, 5 * 60 * 1000);

  /* helpers that pages-more.js and extras.js use */
  LD.ui = { icon: icon, tile: tile, chart: chart, chartCard: chartCard, tableView: tableView, legend: legend, xpBar: xpBar, txt: txt, fmtTime: fmtTime, shift: shift,
            num: num, toast: toast, render: render, act: act, view: view, phaseNow: phaseNow, copyText: copyText, plantsCard: plantsCard };

  window.addEventListener('error', function (e) { if (e.filename && e.filename.indexOf('/js/') >= 0) crash(e.error || e.message); });
  /* On the published site, keep a copy of the app on the device so it opens without a connection (see sw.js). */
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});

  S.load();
  render();
  LD.sync.run();
  LD.render = render;
})();
