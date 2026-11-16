/* Grove, more pages: the Grove tab, the week in review, and the cards for quests, insights and the meal planner.
   Logic lives in extras.js. Shared page helpers (icons, tiles, charts, toast, redraw) come from app.js as LD.ui,
   which is only read when a function here runs, so this file can load first.

   LD.pages[route](stats)  a whole page
   LD.more.name()          a card or section another page includes
   LD.actions[name](data)  what a button with data-act="name" does
   LD.onSubmit(kind, form, text)  forms with data-form */
(function () {
  'use strict';
  var C = LD.config, S = LD.store, G = LD.game, D = LD.date, CH = LD.charts, P = LD.plants, Q = LD.quests, M = LD.meals;
  var esc = CH.esc, num = CH.num;
  LD.pages = {}; LD.more = {}; LD.actions = {};
  var thisWeek = function () { return D.weekStart(D.today()); };
  var pcnt = function (v) { return v == null ? '–' : Math.round(v * 100) + '%'; };

  /* ================= Grove tab ================= */
  LD.pages.grove = function (st) {
    var U = LD.ui, s = S.state.settings, season = P.seasons[P.seasonNow(s.ui.season, s.ui.hemi)], sk = P.skyText(s.ui.hemi);
    var have = P.decor.filter(function (d) { return d.level <= st.level; }), next = P.decor.filter(function (d) { return d.level > st.level; })[0];
    var opts = function (list, v) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
    var scene = '<section class="hero grovebig"><div class="scene" data-scene="' + U.phaseNow(true) + '" data-mode="grove"></div>' +
      '<div class="herotop"><div class="hgreet"><h1>Your grove</h1><div class="datenav"><span>' + season.name + ' · level ' + st.level + ' · ' + have.length + ' of ' + P.decor.length + ' things found</span></div></div></div></section>';
    var tray = '<section class="card"><header><h3>' + U.icon('star') + ' In your grove</h3></header><p class="sub">New things arrive by themselves as you level up. Tap one to hide it or bring it back.' +
      (next ? ' Next: ' + next.name + ' at level ' + next.level + '.' : ' You have found everything.') + '</p><div class="decorgrid">' +
      P.decor.map(function (d) {
        var locked = d.level > st.level, on = !locked && s.decor[d.id] !== false;
        return '<button class="decor' + (locked ? ' locked' : on ? ' on' : '') + '"' + (locked ? ' disabled' : ' data-act="decor" data-id="' + d.id + '" aria-pressed="' + on + '"') + ' data-key="dc-' + d.id + '">' +
          P.decorIcon(d.id, 52) + '<b>' + d.name + '</b><span>' + (locked ? 'Level ' + d.level : on ? 'Showing' : 'Hidden') + '</span></button>';
      }).join('') + '</div></section>';
    var look = '<section class="card"><header><h3>' + U.icon('sun') + ' Season and sky</h3></header><div class="fields">' +
      '<div class="fld"><label for="g-season">Season</label><select id="g-season" data-ui="season" data-key="g-season">' +
      opts([['auto', 'Follows the calendar'], ['spring', 'Always spring'], ['summer', 'Always summer'], ['autumn', 'Always autumn'], ['winter', 'Always winter']], s.ui.season) + '</select></div>' +
      '<div class="fld"><label for="g-hemi">Where you are</label><select id="g-hemi" data-ui="hemi" data-key="g-hemi">' +
      opts([['auto', 'Work it out for me'], ['south', 'Southern half of the world'], ['north', 'Northern half of the world']], s.ui.hemi) + '</select></div>' +
      '<div class="fld"><label for="g-sky">Sky</label><select id="g-sky" data-ui="sky" data-key="g-sky">' +
      opts([['auto', 'The real sky right now'], ['dawn', 'Always dawn'], ['day', 'Always day'], ['dusk', 'Always dusk'], ['night', 'Always night']], s.ui.sky) + '</select></div></div>' +
      '<label class="sw"><span class="nm">Things drifting through the air<small>Leaves in autumn, snow in winter, specks of light in spring and summer.</small></span>' +
      '<input type="checkbox" data-ui="falling"' + (s.ui.falling ? ' checked' : '') + ' data-key="ui-falling"></label>' +
      '<p class="hint">Today the sun rises at ' + sk.rise + ' and sets at ' + sk.set + ', and the moon is a ' + sk.moon + ' (' + sk.lit + '% lit). The sun and moon in the picture are placed from this, ' +
      (sk.known ? 'worked out for ' + esc(sk.zone.split('/').pop().replace(/_/g, ' ')) + ' from your time zone.' : 'estimated from your time zone.') +
      (sk.south ? ' The view faces north, so the sun rises on the right and sets on the left.' : ' The view faces south, so the sun rises on the left and sets on the right.') + '</p>' +
      '<p class="hint">The season changes the trees, the ground, what drifts through the air, and the accent colour of the whole page.</p></section>';
    return scene + '<div class="cards flow wide">' + tray + U.plantsCard(st) + look + '</div>';
  };
  LD.actions.decor = function (d) {
    var dc = S.state.settings.decor;
    if (dc[d.id] === false) delete dc[d.id]; else dc[d.id] = false;
    S.save(); LD.ui.render();
  };

  /* ================= weekly quests ================= */
  function questRow(q) {
    var a = LD.areaById[q.q.area];
    return '<div class="quest' + (q.done ? ' done' : '') + '"><div class="q1"><span class="dot" style="background:' + a.color + '" title="' + a.name + '"></span><b>' + esc(q.text) + '</b>' +
      '<span class="count">' + (q.done ? 'Done · +' + C.questXP + ' XP' : Math.min(q.cur, q.target) + ' of ' + q.target) + '</span></div>' +
      '<div class="meter" role="img" aria-label="' + Math.min(q.cur, q.target) + ' of ' + q.target + '"><i style="width:' + Math.min(100, q.cur / q.target * 100).toFixed(0) + '%"></i></div></div>';
  }
  LD.more.questsCard = function () {
    var ws = thisWeek();
    Q.ensure(ws);
    var qs = Q.state(ws);
    if (!qs.length) return '';
    return '<section class="card"><header><h3>' + LD.ui.icon('peak') + ' This week’s quests</h3><a class="more" href="#/week">Week so far</a></header>' + qs.map(questRow).join('') +
      '<p class="hint">Worth ' + C.questXP + ' XP each. Two new ones arrive every Monday, set by how last week went.</p></section>';
  };
  /* shown from Sunday afternoon to Tuesday, until the review has been opened */
  LD.more.recapBanner = function () {
    var today = D.today(), dow = D.dow(today), ws = dow === 6 ? thisWeek() : D.add(thisWeek(), -7);
    if ((dow === 6 && D.hour() < 15) || (dow > 1 && dow < 6)) return '';
    if (S.week(ws).recapSeen || !Q.dates(ws).some(function (d) { return G.dayPct(d) != null; })) return '';
    return '<div class="banner"><span><b>Your week in review is ready.</b> Two minutes: what went well, and a quick check-up.</span><span class="sp"></span><a class="btn sm primary" href="#/week">Open it</a></div>';
  };

  /* ================= week in review ================= */
  LD.pages.week = function (st) {
    var U = LD.ui, today = D.today(), cur = thisWeek(), last = D.add(cur, -7), firstWeek = D.weekStart(S.state.startDate);
    var sel = U.view.week || (D.dow(today) === 6 || last < firstWeek ? 'this' : 'last');
    if (sel === 'last' && last < firstWeek) sel = 'this';
    var ws = sel === 'this' ? cur : last, dates = Q.dates(ws), upto = dates.filter(function (d) { return d <= today; }), finished = sel === 'last' || D.dow(today) === 6;
    var day = function (d) { return S.state.days[d] || {}; };
    var xp = 0, best = null, ticks = 0, chores = 0, id;
    upto.forEach(function (d) {
      var t = (st.perDay[d] || { total: 0 }).total;
      xp += t; if (t && (!best || t > best[1])) best = [d, t];
      ticks += Object.keys(day(d).checks || {}).length;
      for (id in S.state.chores) if (S.state.chores[id].indexOf(d) >= 0) chores++;
    });
    var logged = upto.filter(function (d) { return G.dayPct(d) != null; }).length;
    var steps = upto.map(function (d) { return day(d).steps; }).filter(Boolean), sAvg = steps.length ? steps.reduce(function (a, b) { return a + b; }, 0) / steps.length : null;
    var workouts = upto.filter(function (d) { return day(d).workout; }).length;
    if (finished && !S.week(ws).recapSeen) { S.week(ws, true).recapSeen = true; S.save(); }

    var head = '<section class="card weekhead"><p class="eyebrow">' + (finished ? 'Week in review' : 'Week so far') + '</p><h1>' + D.fmt(ws, { day: 'numeric', month: 'long' }) + ' to ' + D.fmt(D.add(ws, 6), { day: 'numeric', month: 'long' }) + '</h1>' +
      '<div class="btnrow"><button class="btn sm' + (sel === 'last' ? ' on' : '') + '" data-act="week-sel" data-v="last"' + (last < firstWeek ? ' disabled' : '') + '>Last week</button>' +
      '<button class="btn sm' + (sel === 'this' ? ' on' : '') + '" data-act="week-sel" data-v="this">This week</button></div></section>';
    var tiles = '<div class="tiles">' + U.tile('XP earned', num(xp), best ? 'Best day: ' + D.fmt(best[0], { weekday: 'long' }) : '') + U.tile('Days logged', logged + ' <small>of ' + upto.length + '</small>') +
      U.tile('Habit ticks', String(ticks)) + U.tile('Average steps', sAvg == null ? '–' : num(sAvg), steps.length + (steps.length === 1 ? ' day entered' : ' days entered')) +
      U.tile('Workouts', workouts + ' <small>of ' + S.state.settings.workoutsPerWeek + '</small>') + U.tile('Chores done', String(chores)) + '</div>';

    var score = function (a, ds) { var dn = 0, of = 0; ds.forEach(function (d) { if (d > today || d < S.state.startDate) return; var r = G.areaDay(a.id, d); dn += r.done; of += r.of; }); return of ? dn / of : null; };
    var prevDates = Q.dates(D.add(ws, -7));
    var sections = '<section class="card"><header><h3>' + U.icon('leaf') + ' Section by section</h3></header><p class="sub">Share of each list done, against the week before.</p><div class="rates">' +
      S.areas().filter(function (a) { return a.kind !== 'tasks'; }).map(function (a) {
        var v = score(a, dates), p = score(a, prevDates), dl = v != null && p != null ? Math.round((v - p) * 100) : null;
        return '<div class="rate" style="--c:' + a.color + '"><span class="nm">' + a.name + (dl == null ? '' : dl > 0 ? ' <small class="up">▲ ' + dl + ' points</small>' : dl < 0 ? ' <small>▼ ' + (-dl) + ' points</small>' : ' <small>no change</small>') + '</span>' +
          '<div class="meter" role="img" aria-label="' + pcnt(v) + '"><i style="width:' + Math.round((v || 0) * 100) + '%"></i></div><span class="val">' + pcnt(v) + '</span></div>';
      }).join('') + '</div></section>';

    var qs = Q.state(ws), quests = qs.length ? '<section class="card"><header><h3>' + U.icon('peak') + ' Quests</h3><span class="count">' + qs.filter(function (q) { return q.done; }).length + ' of ' + qs.length + ' done</span></header>' + qs.map(questRow).join('') + '</section>' : '';

    var ins = LD.insights().filter(function (x) { return x.ready; })[0], pattern = ins ? insightCard(ins) : '';

    var checkup = '';
    if (finished) {
      var sug = LD.checkin(ws);
      checkup = '<section class="card span2"><header><h3>' + U.icon('sliders') + ' Check-up</h3></header>' + (sug.length ?
        '<p class="sub">Small adjustments based on the last two weeks. Nothing changes unless you say so.</p><div class="cards">' + sug.map(function (x) {
          return '<div class="checkup"><b>' + esc(x.title) + '</b><p>' + esc(x.text) + '</p><div class="btnrow">' +
            (x.href ? '<a class="btn sm primary" href="' + x.href + '">' + esc(x.label) + '</a>' : '<button class="btn sm primary" data-act="checkin-apply" data-id="' + esc(x.id) + '" data-ws="' + ws + '">' + esc(x.label) + '</button>') +
            '<button class="btn sm ghost" data-act="checkin-skip" data-id="' + esc(x.id) + '" data-ws="' + ws + '">Not now</button></div></div>';
        }).join('') + '</div>' : '<p class="empty">Nothing needs changing. Your targets fit how the last two weeks went, so carry on as you are.</p>') + '</section>';
    }
    var nextUp = finished && sel === 'this' ? '<section class="card"><header><h3>' + U.icon('sun') + ' Next week</h3></header><p class="empty">Two new quests arrive on Monday, set by how this week went. You can plan next week’s meals on the <a href="#/food">Food page</a>.</p></section>' : '';
    return LD.more.subnav('week') + head + tiles + '<div class="cards">' + sections + quests + pattern + nextUp + checkup + '</div>';
  };
  LD.actions['week-sel'] = function (d) { LD.ui.view.week = d.v; LD.ui.render(); };
  LD.actions['checkin-apply'] = function (d) {
    var x = LD.checkin(d.ws).filter(function (s) { return s.id === d.id; })[0];
    if (!x || !x.apply) return;
    x.apply(); S.save(); LD.ui.render(); LD.ui.toast('Done: ' + x.label.charAt(0).toLowerCase() + x.label.slice(1));
  };
  LD.actions['checkin-skip'] = function (d) {
    var w = S.week(d.ws, true);
    w.skip = w.skip || {}; w.skip[d.id] = 1;
    S.save(); LD.ui.render();
  };

  /* ================= insights ================= */
  function insightCard(x) {
    if (!x.ready) return '<section class="card insight"><header><h3>' + esc(x.title) + '</h3></header><p class="empty">Still gathering. About ' + x.need + ' more logged ' + (x.need === 1 ? 'day' : 'days') + ' of each kind and this fills in.</p></section>';
    var diff = x.a.v - x.b.v, isPct = x.max === 1, size = isPct ? Math.abs(Math.round(diff * 100)) + ' points' : num(Math.abs(diff));
    var line = Math.abs(diff) < (isPct ? 0.03 : x.max * 0.03) ? 'About the same either way.' : (diff > 0 ? size + ' higher' : size + ' lower') + ' on ' + x.la.toLowerCase() + '.';
    var row = function (label, g, strong) {
      return '<div class="rate"' + (strong ? '' : ' style="--c:#6f8573"') + '><span class="nm">' + esc(label) + ' <small>' + g.n + ' days</small></span><div class="meter" role="img" aria-label="' + x.fmt(g.v) + '"><i style="width:' + Math.min(100, g.v / x.max * 100).toFixed(0) + '%"></i></div><span class="val">' + x.fmt(g.v) + '</span></div>';
    };
    return '<section class="card insight"><header><h3>' + esc(x.title) + '</h3></header><p class="lead">' + line + '</p><div class="rates">' + row(x.la, x.a, true) + row(x.lb, x.b, false) + '</div></section>';
  }
  LD.more.insights = function () {
    var U = LD.ui, list = LD.insights(), wd = LD.weekdays(), names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var days = wd.ready ? U.chartCard('Day by day', 'How much of your list gets done on each day of the week, on average.', function (w) {
      return CH.bars(w, { name: 'Share of list done', values: wd.values, labels: names, tips: D.dayNames, color: '#a7c957', max: 100, tickN: 4, unit: '%' });
    }, { head: ['Day', 'Done', 'Days counted'], rows: names.map(function (n, i) { return [D.dayNames[i], wd.values[i] == null ? '–' : wd.values[i] + '%', String(wd.n[i])]; }) }) :
      '<section class="card insight"><header><h3>Day by day</h3></header><p class="empty">Still gathering. About ' + wd.need + ' more logged days and this fills in.</p></section>';
    return '<h2 class="section-title">Patterns</h2><p class="lede">What your own log shows. These describe what happened; they cannot prove one thing causes another.</p><div class="cards">' + list.map(insightCard).join('') + days + '</div>';
  };

  /* ================= meal planner ================= */
  LD.more.mealPlan = function () {
    var U = LD.ui, ws = thisWeek(), plan = M.plan(ws), list = M.list(ws), left = M.left(ws);
    var chosen = plan.length ? '<div class="chips">' + plan.map(function (m) {
      return '<span class="chip">' + esc(m.name) + '<button class="x" data-act="meal-toggle" data-id="' + m.id + '" aria-label="Take ' + esc(m.name) + ' off this week" data-key="mp-' + m.id + '">×</button></span>';
    }).join('') + '</div>' : '<p class="empty">Nothing planned yet. Choose one or two meals from the list below to cook this week.</p>';
    var shop = list.length ? '<div class="shop"><div class="shophead"><b>Shopping list</b><span class="count">' + (left ? left + ' to get' : 'All got') + '</span><button class="btn sm" data-act="shop-copy">Copy list</button></div><div class="shopgrid">' +
      list.map(function (g) {
        return '<div><p class="grp">' + esc(g.meal.name) + '</p><div class="ticks">' + g.items.map(function (i) {
          return '<button class="tick small' + (i.got ? ' on' : '') + '" role="checkbox" aria-checked="' + i.got + '" data-act="shop-tick" data-id="' + esc(i.key) + '" data-key="sh-' + esc(i.key) + '"><span class="box">' + U.icon('check') + '</span><span class="lbl">' + esc(i.text) + '</span></button>';
        }).join('') + '</div></div>';
      }).join('') + '</div></div>' : '';
    return '<section class="card span2"><header><h3>' + U.icon('apple') + ' This week’s meals</h3><span class="count">' + plan.length + ' planned</span></header>' + chosen + shop + '</section>';
  };
  LD.more.mealBook = function () {
    var U = LD.ui, ws = thisWeek();
    return '<section class="card span2"><header><h3>' + U.icon('book') + ' Meals</h3></header><p class="sub">Add a meal to this week and its ingredients go on the shopping list. Calories are rough estimates per serve.</p><div class="cards">' +
      M.all().map(function (m) {
        var on = M.planned(ws, m.id), meta = [m.tag, m.kcal ? 'about ' + m.kcal + ' kcal' : '', m.serves ? 'serves ' + m.serves : ''].filter(Boolean).join(' · ');
        return '<div class="meal"><h4>' + esc(m.name) + '</h4><div class="meta">' + esc(meta) + '</div>' + (m.why ? '<p>' + esc(m.why) + '</p>' : '') +
          '<div class="btnrow" style="margin-top:8px"><button class="btn sm' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="meal-toggle" data-id="' + m.id + '" data-key="mb-' + m.id + '">' + (on ? 'On this week’s plan' : 'Add to this week') + '</button>' +
          (m.custom ? '<button class="btn sm ghost" data-act="meal-remove" data-id="' + m.id + '">Remove</button>' : '') + '</div>' +
          '<details><summary>Ingredients and method</summary><ul>' + (m.items || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' + (m.steps ? '<p>' + esc(m.steps) + '</p>' : '') + '</details></div>';
      }).join('') + '</div>' +
      '<details class="tview"><summary>Add your own meal</summary><form class="mealform" data-form="add-meal"><input type="text" name="t" maxlength="60" placeholder="Meal name" aria-label="Meal name" required>' +
      '<textarea name="items" rows="5" placeholder="Ingredients, one per line" aria-label="Ingredients, one per line" required></textarea><textarea name="steps" rows="3" placeholder="Method (optional)" aria-label="Method"></textarea>' +
      '<button class="btn sm primary">Save meal</button></form></details></section>';
  };
  /* a line for the Today page when meals are planned */
  LD.more.menuHint = function () {
    var ws = thisWeek(), plan = M.plan(ws), left = M.left(ws);
    if (!plan.length) return '';
    return '<p class="hint">On the menu this week: ' + plan.map(function (m) { return esc(m.name); }).join(', ') + '. ' + (left ? '<a href="#/food">' + left + ' things still to buy</a>.' : 'Shopping done.') + '</p>';
  };
  LD.actions['meal-toggle'] = function (d) { M.toggle(thisWeek(), d.id); LD.ui.render(); };
  LD.actions['shop-tick'] = function (d) { M.tick(thisWeek(), d.id); LD.ui.render(); };
  LD.actions['shop-copy'] = function () { LD.ui.copyText(M.text(thisWeek()), 'Shopping list copied'); };
  LD.actions['meal-remove'] = function (d) {
    if (confirm('Remove this meal from your list?')) { M.remove(d.id); LD.ui.render(); }
  };
  /* ================= coming back, reminders, safety copies ================= */
  /* shown after a couple of days away: nothing was lost, and coming back is rewarded rather than punished */
  LD.more.welcomeBack = function (st) {
    var today = D.today(), last = st.lastLogged;
    if (!last || last >= today) return '';
    var gap = D.diff(today, last);
    if (gap < 2) return '';
    return '<div class="banner"><span><b>Welcome back.</b> Nothing was lost while you were away: you are still level ' + st.level + ' and your grove kept all its growth. ' +
      (gap >= 3 ? 'Your first tick today earns a ' + C.xp.comeback + ' XP welcome-back bonus.' : 'One tick is enough to get going again.') + '</span></div>';
  };
  LD.more.remindersCard = function () {
    var U = LD.ui, s = S.state.settings, r = s.remind;
    var chk = function (key, label, small) {
      return '<label class="sw"><span class="nm">' + label + '<small>' + small + '</small></span><input type="checkbox" data-remind="' + key + '"' + (r[key] ? ' checked' : '') + ' data-key="rm-' + key + '"></label>';
    };
    return '<section class="card"><header><h3>' + U.icon('clock') + ' Phone reminders</h3></header><p class="sub">A web page cannot send notifications by itself. This makes a calendar file with daily reminders: add it to your phone’s calendar once, and your phone does the reminding.</p>' +
      chk('morning', 'Morning check-in', 'At your wake time, ' + U.fmtTime(s.wake) + '.') +
      chk('winddown', 'Screens down', 'At ' + U.fmtTime(U.shift(s.bed, -s.screensDownMin)) + ', ' + s.screensDownMin + ' minutes before bed.') +
      chk('evening', 'Evening check-in', 'For your steps and the evening list.') +
      '<div class="fields" style="margin-top:10px"><div class="fld"><label for="rm-at">Evening check-in time</label><input id="rm-at" type="time" data-remind="eveningAt" value="' + r.eveningAt + '" data-key="rm-at"></div></div>' +
      '<div class="btnrow" style="margin-top:12px"><button class="btn primary" data-act="ics"' + (LD.reminders.list().length ? '' : ' disabled') + '>Download reminders file</button></div>' +
      '<p class="hint">Do this on your iPhone: open Grove there, press the button, open the file and choose Add All. Each reminder links back to Grove. If you change the times, download a new file and add it again.</p></section>';
  };
  LD.actions.ics = function () {
    var blob = new Blob([LD.reminders.ics()], { type: 'text/calendar' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'grove-reminders.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    LD.ui.toast('Reminders file downloaded');
  };
  LD.onChange = function (el, d) {
    if (d.remind === undefined) return false;
    var r = S.state.settings.remind;
    if (el.type === 'checkbox') r[d.remind] = el.checked;
    else if (/^\d\d:\d\d$/.test(el.value)) r[d.remind] = el.value;
    S.save(); LD.ui.render();
    return true;
  };
  var longDay = { weekday: 'long', day: 'numeric', month: 'long' };
  LD.more.safetyCopies = function () {
    var list = S.snapshots();
    return '<p class="grp">Safety copies</p>' + (list.length ?
      '<p class="hint" style="margin-top:0">Grove keeps a copy of everything from the first time you open it each day, on this device. Restoring one puts things back as they were then.</p>' +
      list.map(function (d) { return '<div class="sw"><span class="nm">Start of ' + D.fmt(d, longDay) + '</span><button class="btn sm" data-act="snap-restore" data-date="' + d + '">Restore</button></div>'; }).join('') :
      '<p class="hint" style="margin-top:0">Once you have logged something, Grove keeps a copy from the start of each day on this device, in case anything ever goes wrong.</p>');
  };
  LD.actions['snap-restore'] = function (d) {
    if (!confirm('Put everything back as it was at the start of ' + D.fmt(d.date, longDay) + '? Anything logged since then will be cleared.')) return;
    if (S.restoreSnapshot(d.date)) { LD.ui.render(); LD.ui.toast('Restored'); }
  };

  LD.onSubmit = function (kind, form, text) {
    if (kind !== 'add-meal') return false;
    var items = form.elements.items.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!items.length) return true;
    M.add(text, items, form.elements.steps.value.trim());
    LD.ui.toast('Meal saved');
    return true;
  };
})();
