/* Grove core: dates, saved data (LD.store) and levelling (LD.game).
   All data lives in one object, LD.store.state, saved to the browser.
   To sync somewhere else later, replace load() and save(). */
(function () {
  'use strict';
  var C = LD.config;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  /* the hour a new day begins: the Settings value once data is loaded, else the config default */
  var dayStart = function () {
    var st = LD.store && LD.store.state, v = st && st.settings ? st.settings.dayStartsHour : undefined;
    return v === undefined ? C.dayStartsHour : v;
  };

  /* ---------------- dates (local, as 'YYYY-MM-DD') ---------------- */
  var D = LD.date = {
    str: function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    parse: function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); },
    today: function () { var n = new Date(); n.setHours(n.getHours() - dayStart()); return D.str(n); },
    hour: function () { var h = new Date().getHours(); return h < dayStart() ? h + 24 : h; },
    add: function (s, n) { var d = D.parse(s); d.setDate(d.getDate() + n); return D.str(d); },
    diff: function (a, b) { return Math.round((D.parse(a) - D.parse(b)) / 864e5); },
    dow: function (s) { return (D.parse(s).getDay() + 6) % 7; },
    weekStart: function (s) { return D.add(s, -D.dow(s)); },
    range: function (end, n) { var out = []; for (var i = n - 1; i >= 0; i--) out.push(D.add(end, -i)); return out; },
    fmt: function (s, opt) { return D.parse(s).toLocaleDateString(undefined, opt || { weekday: 'short', day: 'numeric', month: 'short' }); },
    dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  };

  LD.areaById = {}; C.areas.forEach(function (a) { LD.areaById[a.id] = a; });
  /* the key an exercise is saved under, made from its name */
  LD.exKey = function (name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var cfgHabit = {}; C.habits.forEach(function (h) { cfgHabit[h.id] = h; });
  var UI_DEFAULTS = { sky: 'auto', season: 'auto', hemi: 'auto', falling: true, checkin: true, fx: true, lastNight: true, lastNightUntil: 15, suggestGoal: true, name: '' };

  /* ---------------- store ---------------- */
  var KEY = 'grove.v1', REAL = 'grove.v1.real', SNAP = 'grove.v1.snap.';
  var snap = {};   // record id -> its JSON at the last save, to spot what changed
  var S = LD.store = {
    state: null,
    noStorage: false,

    blank: function () {
      var s = {};
      for (var k in C.defaults) s[k] = C.defaults[k];
      s.enabled = { areas: {}, habits: {}, chores: {} };
      s.every = {};                              // chore id -> days between
      s.plants = {};                             // section id -> plant id
      s.text = {};                               // habit or chore id -> renamed text
      s.xp = {};                                 // overrides for config xp values
      s.custom = { habits: [], chores: [], meals: [] };   // items added by the owner
      s.decor = {};                              // decoration id -> false when hidden
      s.days = {};                               // habit id -> weekdays it applies on (0 = Monday); absent means every day
      s.group = {};                              // habit id -> the card it was moved to (morning, day, evening)
      s.order = [];                              // habit ids in the owner's chosen order
      s.remind = { morning: true, winddown: true, evening: true, eveningAt: '20:30' };   // phone reminders to put in the calendar file
      s.ui = {};
      for (var u in UI_DEFAULTS) s.ui[u] = UI_DEFAULTS[u];
      s.dayStartsHour = C.dayStartsHour;
      /* weeks: Monday date -> { quests, meals, shop, skip, recapSeen } */
      return { v: 1, startDate: D.today(), settings: s, days: {}, chores: {}, weeks: {}, _mod: {}, _dirty: {} };
    },
    normalise: function (st) {
      var b = S.blank();
      if (!st || typeof st !== 'object') return b;
      var s = st.settings || {};
      for (var k in b.settings) if (s[k] === undefined) s[k] = b.settings[k];
      ['areas', 'habits', 'chores'].forEach(function (k) { if (!s.enabled[k]) s.enabled[k] = {}; });
      for (var u in UI_DEFAULTS) if (s.ui[u] === undefined) s.ui[u] = UI_DEFAULTS[u];
      if (!s.custom.habits) s.custom.habits = [];
      if (!s.custom.chores) s.custom.chores = [];
      if (!s.custom.meals) s.custom.meals = [];
      st.settings = s;
      st.days = st.days || {};
      st.chores = st.chores || {};
      st.weeks = st.weeks || {};
      st.startDate = st.startDate || b.startDate;
      st._mod = st._mod || {};       // record id -> when it last changed (for sync)
      st._dirty = st._dirty || {};   // record ids changed here and not yet sent
      return st;
    },
    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { S.noStorage = true; }
      var st = null;
      if (raw) { try { st = JSON.parse(raw); } catch (e) { st = null; } }
      S.state = S.normalise(st);
      S.resnap();
      S.snapshot();
      return S.state;
    },
    /* Safety copies: the first time the app opens each day it keeps a copy of everything as it stood, on this device.
       The newest five are kept. They are separate from sync and from the backup file. */
    snapshot: function () {
      if (S.state.demo || !S.hasData()) return;
      try {
        var key = SNAP + D.today();
        if (localStorage.getItem(key)) return;
        var js = JSON.stringify(S.state);
        if (js.length > 1500000) return;
        localStorage.setItem(key, js);
        S.snapshots().slice(5).forEach(function (d) { localStorage.removeItem(SNAP + d); });
      } catch (e) {}
    },
    snapshots: function () {
      var out = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(SNAP) === 0) out.push(k.slice(SNAP.length)); } } catch (e) {}
      return out.sort().reverse();
    },
    restoreSnapshot: function (date) {
      var raw = null;
      try { raw = localStorage.getItem(SNAP + date); } catch (e) {}
      if (!raw) return false;
      var old = S.state, k;
      S.importText(raw);
      /* anything logged since the copy was made is emptied rather than dropped, so other devices are told too */
      for (k in old.days) if (!S.state.days[k]) S.state.days[k] = { checks: {} };
      for (k in old.chores) if (!S.state.chores[k]) S.state.chores[k] = [];
      for (k in old.weeks) if (!S.state.weeks[k]) S.state.weeks[k] = {};
      S.save();
      return true;
    },
    /* Saves to this browser. Also notes which records changed since the last save, so sync knows what to send.
       Demo data is never marked, so it can never reach the synced sheet. */
    save: function () {
      if (!S.state.demo) {
        var rec = S.records(), now = Date.now(), changed = false;
        for (var id in rec) {
          var js = JSON.stringify(rec[id]);
          if (snap[id] !== js) { snap[id] = js; S.state._mod[id] = now; S.state._dirty[id] = 1; changed = true; }
        }
        if (changed && LD.sync) LD.sync.schedule();
      }
      S.persist();
    },
    persist: function () {
      try { localStorage.setItem(KEY, JSON.stringify(S.state)); } catch (e) { S.noStorage = true; }
    },

    /* ---- sync support: the state split into records (settings, meta, one per day, one per chore) ---- */
    records: function () {
      var st = S.state, r = { settings: st.settings, meta: { startDate: st.startDate, welcomed: !!st.welcomed } }, k;
      for (k in st.days) r['day:' + k] = st.days[k];
      for (k in st.chores) r['chore:' + k] = st.chores[k];
      for (k in st.weeks) r['week:' + k] = st.weeks[k];
      return r;
    },
    resnap: function () { snap = {}; var rec = S.records(); for (var id in rec) snap[id] = JSON.stringify(rec[id]); },
    /* queue every record for sending (used when first connecting); `skip` holds ids the sheet already has */
    markAll: function (skip) {
      var rec = S.records();
      for (var id in rec) { if (skip && skip[id]) continue; if (!S.state._mod[id]) S.state._mod[id] = 1; S.state._dirty[id] = 1; }
      S.persist();
    },
    dirtyRecords: function () {
      var rec = S.records(), out = [];
      for (var id in S.state._dirty) if (rec[id] !== undefined) out.push({ id: id, mod: S.state._mod[id] || 1, data: JSON.stringify(rec[id]) });
      return out;
    },
    clearDirty: function (sent) {
      sent.forEach(function (r) { if ((S.state._mod[r.id] || 1) === r.mod) delete S.state._dirty[r.id]; });
      S.persist();
    },
    /* take records from the sheet. Newer wins, record by record; `force` makes the sheet win regardless. Returns how many changed. */
    applyRemote: function (records, force) {
      var n = 0, st = S.state;
      records.forEach(function (r) {
        if (!force && !(r.mod > (st._mod[r.id] || 0))) return;
        var v; try { v = JSON.parse(r.data); } catch (e) { return; }
        if (r.id === 'settings') { st.settings = v; S.normalise(st); }
        else if (r.id === 'meta') { if (v.startDate) st.startDate = v.startDate; st.welcomed = !!v.welcomed; }
        else if (r.id.indexOf('day:') === 0) st.days[r.id.slice(4)] = v;
        else if (r.id.indexOf('chore:') === 0) st.chores[r.id.slice(6)] = v;
        else if (r.id.indexOf('week:') === 0) st.weeks[r.id.slice(5)] = v;
        else return;
        st._mod[r.id] = r.mod; delete st._dirty[r.id]; n++;
      });
      if (n) { S.resnap(); S.persist(); }
      return n;
    },

    day: function (date, create) {
      var x = S.state.days[date];
      if (!x && create) x = S.state.days[date] = { checks: {} };
      if (x && !x.checks) x.checks = {};
      return x || { checks: {} };
    },
    hasData: function () {
      for (var d in S.state.days) return true;
      for (var c in S.state.chores) if (S.state.chores[c].length) return true;
      return false;
    },

    /* on/off: settings override the config default */
    isOn: function (kind, item) {
      var o = S.state.settings.enabled[kind][item.id];
      return o === undefined ? item.on !== false : !!o;
    },
    setOn: function (kind, id, v) { S.state.settings.enabled[kind][id] = !!v; S.save(); },
    areas: function () { return C.areas.filter(function (a) { return S.isOn('areas', a); }); },

    /* Everything defined: the config lists plus items added in Settings.
       Removed custom items stay findable by id so their past XP still counts. */
    allHabits: function () {
      var st = S.state.settings, ord = st.order || [];
      return C.habits.concat(st.custom.habits.filter(function (h) { return !h.removed; })).map(function (h, i) {
        var g = st.group[h.id], o = ord.indexOf(h.id), c = h, k;
        if (g && g !== h.group) { c = {}; for (k in h) c[k] = h[k]; c.group = g; }   /* moved to another card */
        return { h: c, k: o < 0 ? 1e6 + i : o };
      }).sort(function (a, b) { return a.k - b.k; }).map(function (x) { return x.h; });
    },
    /* A habit can be limited to certain weekdays. On other days it is not shown and does not count for or against anything. */
    scheduled: function (h, date) { var d = S.state.settings.days[h.id]; return !d || d.indexOf(D.dow(date)) >= 0; },
    habitsFor: function (date, areaId) { return S.habits(areaId).filter(function (h) { return S.scheduled(h, date); }); },
    setDays: function (id, days) {
      if (!days.length || days.length === 7) delete S.state.settings.days[id]; else S.state.settings.days[id] = days;
      S.save();
    },
    /* energy or mood for a day, 1 to 5. Tapping the same value again clears it. */
    setFeel: function (date, key, v) {
      var d = S.day(date, true);
      if (d[key] === v) delete d[key]; else d[key] = v;
      S.save();
    },
    /* one exercise in a day's workout: ticked or not, and the weight used. Ticking anything logs a full session. */
    setExercise: function (date, key, change) {
      var d = S.day(date, true), k;
      if (!d.workout || d.workout.kind !== 'full') d.workout = { kind: 'full', plan: LD.game.nextPlan(date) };
      d.workout.sets = d.workout.sets || {};
      var e = d.workout.sets[key] || (d.workout.sets[key] = {});
      for (k in change) { if (change[k] == null) delete e[k]; else e[k] = change[k]; }
      S.save();
    },
    /* put a habit on another card (morning, day, evening), or change which section a habit the owner added counts towards */
    setGroup: function (id, group) { S.state.settings.group[id] = group; S.save(); },
    setArea: function (id, area) {
      S.state.settings.custom.habits.forEach(function (h) { if (h.id === id) h.area = area; });
      S.save();
    },
    /* move a habit one place up (-1) or down (1) within its card */
    moveHabit: function (id, dir) {
      var all = S.allHabits(), h = all.filter(function (x) { return x.id === id; })[0];
      if (!h) return;
      var peers = all.filter(function (x) { return x.group === h.group; }), other = peers[peers.indexOf(h) + dir];
      if (!other) return;
      var ids = all.map(function (x) { return x.id; }), a = ids.indexOf(id), b = ids.indexOf(other.id);
      ids[a] = other.id; ids[b] = id;
      S.state.settings.order = ids; S.save();
    },
    allChores: function () { return C.chores.concat(S.state.settings.custom.chores.filter(function (c) { return !c.removed; })); },
    habit: function (id) {
      return cfgHabit[id] || S.state.settings.custom.habits.filter(function (h) { return h.id === id; })[0] || null;
    },
    text: function (item) { return S.state.settings.text[item.id] || item.text; },
    xp: function (key) { var o = S.state.settings.xp[key]; return o === undefined ? C.xp[key] : o; },
    plantOf: function (area) { return S.state.settings.plants[area.id] || area.plant; },
    name: function () { return S.state.settings.ui.name || C.appName; },

    habits: function (areaId) {
      return S.allHabits().filter(function (h) {
        return S.isOn('habits', h) && S.isOn('areas', LD.areaById[h.area]) && (!areaId || h.area === areaId);
      });
    },
    chores: function () {
      return S.allChores().filter(function (c) { return S.isOn('chores', c) && S.isOn('areas', LD.areaById[c.area || 'upkeep']); });
    },
    every: function (ch) { return S.state.settings.every[ch.id] || ch.every; },

    addHabit: function (text, area, group) {
      S.state.settings.custom.habits.push({ id: 'u' + Date.now().toString(36), area: area, group: group, text: text, custom: true });
      S.save();
    },
    addChore: function (text, every, area) {
      S.state.settings.custom.chores.push({ id: 'u' + Date.now().toString(36), text: text, every: every, xp: 15, area: area || 'upkeep', firstDueIn: 0, custom: true });
      S.save();
    },
    removeCustom: function (kind, id) {
      S.state.settings.custom[kind].forEach(function (x) { if (x.id === id) x.removed = true; });
      S.save();
    },
    rename: function (id, text) {
      if (text) S.state.settings.text[id] = text; else delete S.state.settings.text[id];
      S.save();
    },

    toggleCheck: function (date, id) {
      var d = S.day(date, true);
      if (d.checks[id]) delete d.checks[id]; else d.checks[id] = 1;
      S.save();
    },
    setSteps: function (date, n) {
      var d = S.day(date, true);
      if (n > 0) { d.steps = Math.round(n); d.goal = S.state.settings.stepGoal; }
      else { delete d.steps; delete d.goal; }
      S.save();
    },
    setWorkout: function (date, kind) {
      var d = S.day(date, true);
      if (d.workout && d.workout.kind === kind) delete d.workout;
      else d.workout = { kind: kind, plan: kind === 'full' ? LD.game.nextPlan(date) : 'min' };
      S.save();
    },
    toggleChore: function (id, date) {
      var a = S.state.chores[id] || (S.state.chores[id] = []);
      var i = a.indexOf(date);
      if (i >= 0) a.splice(i, 1); else { a.push(date); a.sort(); }
      S.save();
    },
    /* Where a chore stands on a given date. Nothing is ever "overdue": it is either ready or not yet. */
    choreStatus: function (ch, date) {
      var log = (S.state.chores[ch.id] || []).filter(function (d) { return d <= date; });
      var doneToday = log.indexOf(date) >= 0;
      var last = log.length ? log[log.length - 1] : null;
      if (ch.weekday !== undefined) {
        var isDay = D.dow(date) === ch.weekday;
        return { fixed: true, due: isDay && !doneToday, doneToday: doneToday, last: last,
                 dueIn: isDay ? 0 : (ch.weekday - D.dow(date) + 7) % 7, pct: null };
      }
      var every = S.every(ch);
      var prev = log.filter(function (d) { return d < date; }).pop() || null;
      var dueDate = prev ? D.add(prev, every) : D.add(S.state.startDate, ch.firstDueIn || 0);
      var dueIn = D.diff(dueDate, date);
      var pct;
      if (doneToday) pct = 0;
      else if (prev) pct = Math.max(0, Math.min(1, D.diff(date, prev) / every));
      else pct = dueIn <= 0 ? 1 : Math.max(0, 1 - dueIn / Math.max(1, ch.firstDueIn || 1));
      return { fixed: false, due: dueIn <= 0 && !doneToday, doneToday: doneToday, last: last,
               dueIn: doneToday ? every : Math.max(0, dueIn), pct: pct, every: every };
    },

    addTask: function (date, text) {
      var d = S.day(date, true);
      d.tasks = d.tasks || [];
      if (d.tasks.length < 3) d.tasks.push({ t: text, d: false });
      S.save();
    },
    toggleTask: function (date, i) { var t = S.day(date, true).tasks; if (t && t[i]) { t[i].d = !t[i].d; S.save(); } },
    removeTask: function (date, i) { var t = S.day(date, true).tasks; if (t) { t.splice(i, 1); S.save(); } },

    exportText: function () { return JSON.stringify(S.state, null, 1); },
    importText: function (text) {
      var st = JSON.parse(text);
      if (!st || typeof st !== 'object' || !st.days) throw new Error('Not a Grove backup');
      S.state = S.normalise(st); S.save();
    },
    reset: function () { S.state = S.blank(); S.resnap(); S.persist(); try { localStorage.removeItem(REAL); } catch (e) {} },

    /* Demo data: 10 weeks of plausible history so the charts can be seen. Real data is set aside and restored. */
    loadDemo: function () {
      if (!S.state.demo) { try { localStorage.setItem(REAL, JSON.stringify(S.state)); } catch (e) {} }
      var st = S.blank(), end = D.today(), n = 70, seed = 20261114;
      var rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      st.demo = true; st.startDate = D.add(end, -n); st.settings.stepGoal = 8000;
      var flip = 0;
      for (var i = n; i >= 0; i--) {
        var d = D.add(end, -i), prog = 1 - i / n;
        if (i > 0 && rnd() < 0.14 * (1 - prog) + 0.03) continue;
        var day = { checks: {} };
        C.habits.forEach(function (h) {
          if (h.on === false || LD.areaById[h.area].on === false) return;
          if (i === 0 && h.group !== 'morning') return;
          if (rnd() < 0.38 + 0.47 * prog) day.checks[h.id] = 1;
        });
        if (i > 0) {
          day.goal = prog < 0.35 ? 6000 : prog < 0.7 ? 7000 : 8000;
          day.steps = Math.max(1200, Math.round((3600 + 4600 * prog + (rnd() - 0.5) * 3800) / 10) * 10);
          if ([0, 2, 4].indexOf(D.dow(d)) >= 0 && rnd() < 0.4 + 0.5 * prog) {
            var full = rnd() < 0.75;
            var pl = C.workouts.plans[flip % C.workouts.plans.length];
            day.workout = { kind: full ? 'full' : 'min', plan: full ? pl.id : 'min' };
            if (full) {
              flip++; day.workout.sets = {};
              pl.exercises.forEach(function (e, ei) {
                var set = { d: 1 };
                if (!/bodyweight|^bar,|rope/.test(e.kit)) set.kg = Math.round((8 + ei * 4 + prog * 10 + rnd() * 2) * 2) / 2;
                day.workout.sets[LD.exKey(e.name)] = set;
              });
            }
          }
          if (rnd() < 0.8) {
            var lift = day.checks.bed ? 0.5 : 0;
            day.energy = Math.max(1, Math.min(5, Math.round(2.3 + prog * 1.2 + lift + (rnd() - 0.5) * 2)));
            day.mood = Math.max(1, Math.min(5, Math.round(2.6 + prog * 1.1 + (day.workout ? 0.5 : 0) + (rnd() - 0.5) * 2)));
          }
        }
        st.days[d] = day;
      }
      C.chores.forEach(function (ch) {
        if (ch.on === false) return;
        var arr = [], k;
        if (ch.weekday !== undefined) {
          for (k = n; k >= 1; k--) { var dd = D.add(end, -k); if (D.dow(dd) === ch.weekday && rnd() < 0.8) arr.push(dd); }
        } else {
          k = n - Math.floor(rnd() * ch.every);
          while (k >= 1) { arr.push(D.add(end, -k)); k -= ch.every + Math.floor(rnd() * 3); }
        }
        st.chores[ch.id] = arr;
      });
      S.state = st;
      if (LD.quests) {   /* give every demo week its quests, oldest first, as real use would */
        for (var wk = D.weekStart(st.startDate); wk <= D.weekStart(end); wk = D.add(wk, 7)) st.weeks[wk] = { quests: LD.quests.pick(wk) };
      }
      S.save();
    },
    clearDemo: function () {
      var raw = null;
      try { raw = localStorage.getItem(REAL); localStorage.removeItem(REAL); } catch (e) {}
      var st = null;
      if (raw) { try { st = JSON.parse(raw); } catch (e) {} }
      S.state = S.normalise(st); S.resnap(); S.persist();
    }
  };

  /* ---------------- game: XP, levels, scores ---------------- */
  var G = LD.game = {
    xpForLevel: function (L, base) { return base * (L - 1) * L; },
    level: function (xp, base) { return Math.floor((1 + Math.sqrt(1 + 4 * xp / base)) / 2); },
    progress: function (xp, base) {
      var L = G.level(xp, base), a = G.xpForLevel(L, base), b = G.xpForLevel(L + 1, base);
      return { level: L, into: xp - a, need: b - a, pct: (xp - a) / (b - a), next: b };
    },
    rank: function (L) { var r = C.ranks[0]; C.ranks.forEach(function (x) { if (L >= x.level) r = x; }); return r; },
    nextRank: function (L) { return C.ranks.filter(function (x) { return x.level > L; })[0] || null; },
    /* plant growth stage 0..5 from a skill level */
    stage: function (L) { return L >= 12 ? 5 : L >= 8 ? 4 : L >= 5 ? 3 : L >= 3 ? 2 : L >= 2 ? 1 : 0; },
    nextStageLevel: function (L) { return [2, 3, 5, 8, 12].filter(function (x) { return x > L; })[0] || null; },

    goalFor: function (day) { return day.goal || S.state.settings.stepGoal; },
    stepsXP: function (day) {
      if (!day.steps) return 0;
      var g = G.goalFor(day);
      return Math.floor(Math.min(1, day.steps / g) * C.xp.stepsMax) + (day.steps >= g ? C.xp.stepsGoalBonus : 0);
    },
    /* XP earned on one date, split by section */
    dayXP: function (date) {
      var out = {}, add = function (a, x) { if (x) out[a] = (out[a] || 0) + x; };
      var day = S.state.days[date];
      if (day) {
        for (var id in (day.checks || {})) { var h = S.habit(id); if (h) add(h.area, h.xp || S.xp('tick')); }
        add('move', G.stepsXP(day));
        if (day.workout) add('move', S.xp(day.workout.kind === 'full' ? 'workoutFull' : 'workoutMin'));
        (day.tasks || []).forEach(function (t) { if (t.d) add('tasks', C.xp.task); });
        if (day.energy) add('upkeep', C.xp.checkin);   /* noticing how you are counts as looking after yourself */
        if (day.mood) add('upkeep', C.xp.checkin);
      }
      C.chores.concat(S.state.settings.custom.chores).forEach(function (ch) {
        if ((S.state.chores[ch.id] || []).indexOf(date) >= 0) add(ch.area || 'upkeep', ch.xp);
      });
      return out;
    },
    /* everything derived from the log, recomputed on each render */
    compute: function () {
      var set = {}, id, d, quest = LD.quests ? LD.quests.xpByDate() : {};
      for (d in S.state.days) set[d] = 1;
      for (id in S.state.chores) S.state.chores[id].forEach(function (x) { set[x] = 1; });
      for (d in quest) set[d] = 1;
      var list = Object.keys(set).sort(), lastLogged = null;
      var st = { list: list, perDay: {}, total: 0, areaXP: {}, levelLog: [], level: 1,
                 totals: { steps: 0, workouts: 0, ticks: 0, daysLogged: 0, goalDays: 0, chores: 0, bestSteps: 0 } };
      list.forEach(function (date) {
        var x = G.dayXP(date), sum = 0, qa;
        for (qa in (quest[date] || {})) x[qa] = (x[qa] || 0) + quest[date][qa];   /* weekly quest rewards land on the day they were finished */
        /* coming back after three or more days away earns a bonus, added to that day's strongest section */
        var best = null, bonus = 0;
        for (qa in x) if (x[qa] > 0 && (!best || x[qa] > x[best])) best = qa;
        if (best && lastLogged && D.diff(date, lastLogged) >= 3) { bonus = C.xp.comeback || 0; x[best] += bonus; }
        if (best) lastLogged = date;
        for (var a in x) { st.areaXP[a] = (st.areaXP[a] || 0) + x[a]; sum += x[a]; }
        st.perDay[date] = { areas: x, total: sum, bonus: bonus };
        st.total += sum;
        if (sum > 0) st.totals.daysLogged++;
        var L = G.level(st.total, C.xp.base);
        for (var k = st.level + 1; k <= L; k++) st.levelLog.push({ level: k, date: date });
        st.level = L;
        var day = S.state.days[date];
        if (day) {
          st.totals.ticks += Object.keys(day.checks || {}).length;
          if (day.steps) {
            st.totals.steps += day.steps;
            if (day.steps > st.totals.bestSteps) st.totals.bestSteps = day.steps;
            if (day.steps >= G.goalFor(day)) st.totals.goalDays++;
          }
          if (day.workout) st.totals.workouts++;
        }
      });
      for (id in S.state.chores) st.totals.chores += S.state.chores[id].length;
      st.lastLogged = lastLogged;
      return st;
    },

    /* which plan the next full session should be (they alternate) */
    nextPlan: function (date) {
      var plans = C.workouts.plans, days = Object.keys(S.state.days).sort(), last = null;
      days.forEach(function (d) { var w = S.state.days[d].workout; if (d < date && w && w.kind === 'full') last = w.plan; });
      var i = -1;
      plans.forEach(function (p, k) { if (p.id === last) i = k; });
      return plans[(i + 1) % plans.length].id;
    },

    /* one section on one day: how much of what was possible got done */
    areaDay: function (areaId, date) {
      var day = S.day(date), hs = S.habitsFor(date, areaId), done = 0, of = hs.length;
      hs.forEach(function (h) { if (day.checks[h.id]) done++; });
      if (areaId === 'move') { of += 1; if (day.steps) done += Math.min(1, day.steps / G.goalFor(day)); }
      if (areaId === 'tasks') { var t = day.tasks || []; of = t.length; done = t.filter(function (x) { return x.d; }).length; }
      return { done: done, of: of, pct: of ? done / of : null };
    },
    /* whole-day completion 0..1, or null when nothing was logged */
    dayPct: function (date) {
      var day = S.state.days[date];
      var any = day && (Object.keys(day.checks || {}).length || day.steps || day.workout || day.energy || day.mood);
      if (!any) {
        for (var id in S.state.chores) if (S.state.chores[id].indexOf(date) >= 0) { any = true; break; }
      }
      if (!any) return null;
      var done = 0, of = 0;
      S.areas().forEach(function (a) { if (a.kind === 'tasks') return; var r = G.areaDay(a.id, date); done += r.done; of += r.of; });
      return of ? Math.min(1, done / of) : 0;
    },
    /* a new step goal to offer, or null. Up when you are hitting it, down when it is out of reach. */
    suggestGoal: function () {
      var cur = S.state.settings.stepGoal, vals = [];
      D.range(D.add(D.today(), -1), 7).forEach(function (d) { var x = S.state.days[d]; if (x && x.steps) vals.push(x.steps); });
      if (vals.length < 5) return null;
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var hits = vals.filter(function (v) { return v >= cur; }).length;
      if (hits >= 5 && cur < 10000) return Math.min(10000, cur + 500);
      if (hits <= 1) { var g = Math.max(2000, Math.round((avg + 1000) / 500) * 500); if (g <= cur - 500) return g; }
      return null;
    }
  };
})();
