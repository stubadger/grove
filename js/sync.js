/* Grove sync: keeps this device in step with a Google Sheet through a private link.

   How it works
   - The owner pastes SCRIPT (below) into a Google Sheet's Apps Script and deploys it as a web app.
     That gives a link. The link plus a secret key (baked into the script) is all a device needs.
   - The data is split into records (settings, meta, one per day, one per chore). Each record carries
     the time it last changed. On every sync this device sends the records it changed and receives
     the ones that changed elsewhere. For any one record, the newest change wins.
   - The link and key are kept in this browser only, under 'grove.sync'. They are never part of the
     synced data or the backup file.
   - Demo data is never sent. */
(function () {
  'use strict';
  var S = LD.store, CFG = 'grove.sync';

  /* The Google Apps Script. %KEY% is replaced with this device's generated key when copied. */
  var SCRIPT = [
    '/**',
    ' * Grove sync. Paste this whole file into Extensions > Apps Script of your Google Sheet.',
    ' * It only ever touches the sheet it is attached to.',
    ' * @OnlyCurrentDoc',
    ' */',
    "var KEY = '%KEY%';   // the secret. Change it to cut off every device, then reconnect them.",
    '',
    'function doGet() {',
    "  return out({ ok: true, app: 'grove', note: 'This link is working. Paste it into Grove.' });",
    '}',
    '',
    'function doPost(e) {',
    '  var lock = LockService.getScriptLock();',
    '  try {',
    '    lock.waitLock(20000);',
    '    var req = JSON.parse(e.postData.contents);',
    "    if (req.key !== KEY) return out({ ok: false, error: 'key' });",
    '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
    "    var sh = ss.getSheetByName('grove') || ss.insertSheet('grove');",
    "    var head = [['id', 'modified', 'stamp', 'data']];",
    '    if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 4).setValues(head);',
    '    var props = PropertiesService.getScriptProperties();',
    "    var epoch = props.getProperty('epoch') || '1';",
    '    var now = Date.now();',
    "    if (req.op === 'wipe') {",
    '      sh.clear();',
    '      sh.getRange(1, 1, 1, 4).setValues(head);',
    '      epoch = String(now);',
    "      props.setProperty('epoch', epoch);",
    '      return out({ ok: true, epoch: epoch, now: now, records: [] });',
    '    }',
    '    var last = sh.getLastRow();',
    '    var rows = last > 1 ? sh.getRange(2, 1, last - 1, 4).getValues() : [];',
    '    var index = {};',
    '    rows.forEach(function (r, i) { index[r[0]] = i; });',
    '    var changed = false;',
    '    (req.records || []).forEach(function (rec) {',
    '      var i = index[rec.id];',
    '      if (i === undefined) { rows.push([rec.id, rec.mod, now, rec.data]); index[rec.id] = rows.length - 1; changed = true; }',
    '      else if (rec.mod > rows[i][1]) { rows[i] = [rec.id, rec.mod, now, rec.data]; changed = true; }',
    '    });',
    '    if (changed) sh.getRange(2, 1, rows.length, 4).setValues(rows);',
    '    var since = req.since || 0;',
    '    var back = rows.filter(function (r) { return r[2] >= since; })',
    '                   .map(function (r) { return { id: r[0], mod: r[1], data: r[3] }; });',
    '    return out({ ok: true, epoch: epoch, now: now, records: back });',
    '  } catch (err) {',
    '    return out({ ok: false, error: String(err) });',
    '  } finally {',
    '    lock.releaseLock();',
    '  }',
    '}',
    '',
    'function out(o) {',
    '  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);',
    '}',
    ''
  ].join('\n');

  var MSG = {
    link: 'That does not look like a Google script link or a connection code.',
    key: 'The key did not match. Copy the script again, paste it over the old one in Google, and make a new deployment.',
    net: 'Could not reach the sheet. Check you are online, that the link ends in /exec, and that access is set to Anyone.'
  };

  function okUrl(u) { return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u) || /^http:\/\/localhost(:\d+)?\//.test(u); }
  function newKey() {
    var a = new Uint8Array(18), s = '';
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2);
    return s;
  }
  function post(body) {
    /* text/plain keeps this a "simple" request, which Apps Script accepts from any page */
    return fetch(Y.cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.json(); });
  }
  function status() { if (Y.onStatus) Y.onStatus(); }

  var Y = LD.sync = {
    cfg: {},          // { url, key, since, epoch, last, err }
    busy: false,
    again: false,
    timer: null,
    onChange: null,   // called when records arrived from the sheet
    onStatus: null,   // called when the sync state changes
    MSG: MSG,

    load: function () { try { Y.cfg = JSON.parse(localStorage.getItem(CFG)) || {}; } catch (e) { Y.cfg = {}; } },
    saveCfg: function () { try { localStorage.setItem(CFG, JSON.stringify(Y.cfg)); } catch (e) {} },
    on: function () { return !!(Y.cfg.url && Y.cfg.key); },
    key: function () { if (!Y.cfg.key) { Y.cfg.key = newKey(); Y.saveCfg(); } return Y.cfg.key; },
    script: function () { return SCRIPT.replace('%KEY%', Y.key()); },
    /* one line that carries the link and key to another device */
    code: function () { return 'grove1:' + btoa(Y.cfg.url + '|' + Y.cfg.key); },
    parse: function (text) {
      text = String(text || '').trim();
      if (text.indexOf('grove1:') === 0) {
        try { var p = atob(text.slice(7)).split('|'); if (okUrl(p[0]) && p[1]) return { url: p[0], key: p[1] }; } catch (e) {}
        return null;
      }
      return okUrl(text) ? { url: text, key: Y.key() } : null;
    },

    /* Connect this device. The sheet wins for anything it already has; everything else here is sent up.
       Resolves with null, or a message saying what went wrong. */
    connect: function (text) {
      var c = Y.parse(text);
      if (!c) return Promise.resolve(MSG.link);
      if (S.state.demo) return Promise.resolve('Clear the demo data first.');
      var prev = Y.cfg;
      Y.cfg = { url: c.url, key: c.key, since: 0 };
      Y.busy = true; status();
      return post({ key: c.key, since: 0, records: [] }).then(function (resp) {
        if (!resp || !resp.ok) throw new Error(resp && resp.error === 'key' ? 'key' : 'net');
        var have = {};
        (resp.records || []).forEach(function (r) { have[r.id] = 1; });
        var n = S.applyRemote(resp.records || [], true);
        S.markAll(have);
        Y.cfg.epoch = resp.epoch; Y.cfg.since = resp.now; Y.cfg.last = Date.now(); Y.cfg.err = null;
        Y.saveCfg(); Y.busy = false; status();
        if (n && Y.onChange) Y.onChange();
        return Y.run();
      }).catch(function (e) {
        Y.busy = false; Y.cfg = { key: prev.key || c.key }; Y.saveCfg(); status();
        return e.message === 'key' ? MSG.key : MSG.net;
      });
    },
    disconnect: function () { Y.cfg = { key: Y.cfg.key }; Y.saveCfg(); status(); },

    /* One round trip: send what changed here, take what changed elsewhere. Resolves with null or an error message. */
    run: function () {
      if (!Y.on() || S.state.demo) return Promise.resolve(null);
      if (Y.busy) { Y.again = true; return Promise.resolve(null); }
      Y.busy = true; status();
      var sent = S.dirtyRecords();
      return post({ key: Y.cfg.key, since: Y.cfg.since || 0, records: sent }).then(function (resp) {
        if (!resp || !resp.ok) throw new Error(resp && resp.error === 'key' ? 'key' : 'net');
        Y.busy = false;
        if (Y.cfg.epoch && resp.epoch !== Y.cfg.epoch) {
          /* the sheet was erased from another device: drop what is here and take the sheet as it now stands */
          S.reset(); Y.cfg.epoch = resp.epoch; Y.cfg.since = 0; Y.saveCfg();
          if (Y.onChange) Y.onChange();
          return Y.run();
        }
        Y.cfg.epoch = resp.epoch;
        S.clearDirty(sent);
        var n = S.applyRemote(resp.records || []);
        Y.cfg.since = resp.now; Y.cfg.last = Date.now(); Y.cfg.err = null; Y.saveCfg();
        status();
        if (n && Y.onChange) Y.onChange();
        if (Y.again) { Y.again = false; return Y.run(); }
        return null;
      }).catch(function (e) {
        Y.busy = false; Y.again = false;
        Y.cfg.err = e.message === 'key' ? 'key' : 'net'; Y.saveCfg(); status();
        return MSG[Y.cfg.err];
      });
    },
    /* a change was saved: sync shortly, once things settle */
    schedule: function () {
      if (!Y.on()) return;
      clearTimeout(Y.timer);
      Y.timer = setTimeout(Y.run, 2500);
    },
    /* erase the sheet's copy. Resolves true when done. */
    wipe: function () {
      return post({ key: Y.cfg.key, op: 'wipe' }).then(function (resp) {
        if (!resp || !resp.ok) return false;
        Y.cfg.epoch = resp.epoch; Y.cfg.since = resp.now; Y.cfg.last = Date.now(); Y.cfg.err = null; Y.saveCfg();
        return true;
      }).catch(function () { return false; });
    }
  };

  Y.load();
})();
