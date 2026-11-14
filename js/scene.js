/* Grove scene: the living picture at the top of Today, on the Grove page and on section banners.

   The picture is built as stacked layers inside one box, back to front:
     1. sky SVG        sky, stars, sun or moon, two mountain ridges
     2. clouds         HTML, moved by CSS
     3. forest SVG     three rows of trees with mist between, light shafts, ground, decorations
     4. plants         one link per section: its plant (swaying) and its label
     5. small life     butterflies, fireflies, the campfire's flicker
     6. frame SVG      dark trunks at the edges and leaves hanging in from the top corners
     7. drifting       leaves in autumn, snow in winter, specks of light in spring and summer
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
    spring: { name: 'Spring', pine: '#4a8a52', round: '#79b75f', ground: ['#4a8f48', '#33703a', '#24552c'], grass: '#7fc463', water: '#5fb0a6', accent: '#b5d56a', accent2: '#7fb069', fall: 'mote', blossom: '#f7d9e3' },
    summer: { name: 'Summer', pine: '#3a774a', round: '#4f9a4f', ground: ['#3d7e41', '#2a5f33', '#1c4526'], grass: '#62ac55', water: '#4aa39a', accent: '#a7c957', accent2: '#7fb069', fall: 'mote' },
    autumn: { name: 'Autumn', pine: '#466f47', round: '#c9772e', ground: ['#6a6a31', '#4d4f24', '#383a1a'], grass: '#9a9a40', water: '#5a9a8c', accent: '#e8b45a', accent2: '#c98a3a', fall: 'leaf' },
    winter: { name: 'Winter', pine: '#487268', round: '#93a3a1', ground: ['#e1eaec', '#c3d1d6', '#a8bac0'], grass: '#a9bcbc', water: '#cfe3ea', accent: '#a9d3e0', accent2: '#7fb3c4', fall: 'snow', snow: true }
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

  /* ---------------- where the sun and moon are ----------------
     Worked out from the date, the clock and the time zone, with no location permission needed.
     A time zone names a city, so its latitude and longitude stand in for the owner's. Other zones get an estimate. */
  var rad = Math.PI / 180;
  var ZONES = {
    'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96], 'Australia/Brisbane': [-27.47, 153.03],
    'Australia/Perth': [-31.95, 115.86], 'Australia/Adelaide': [-34.93, 138.6], 'Australia/Hobart': [-42.88, 147.33],
    'Australia/Darwin': [-12.46, 130.84], 'Australia/Canberra': [-35.28, 149.13], 'Pacific/Auckland': [-36.85, 174.76],
    'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26], 'Europe/Paris': [48.86, 2.35], 'Europe/Berlin': [52.52, 13.4],
    'America/New_York': [40.71, -74.01], 'America/Chicago': [41.88, -87.63], 'America/Denver': [39.74, -104.99],
    'America/Los_Angeles': [34.05, -118.24], 'America/Toronto': [43.65, -79.38], 'Asia/Singapore': [1.35, 103.82], 'Asia/Tokyo': [35.68, 139.69]
  };
  P.now = function () { return new Date(); };   /* tests can replace this to look at another time of day */
  P.zone = function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } };
  function place(hemi) {
    var z = ZONES[P.zone()], lat, lon;
    if (z) { lat = z[0]; lon = z[1]; }
    else {
      var y = new Date().getFullYear(), std = Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset());
      lat = P.southern() ? -35 : 40; lon = -std / 4;   /* the middle of the time zone, at a typical latitude */
    }
    if (hemi === 'north') lat = Math.abs(lat);
    if (hemi === 'south') lat = -Math.abs(lat);
    return { lat: lat, lon: lon };
  }
  /* the sun: height above the horizon in degrees, hour angle H (0 at its highest, negative in the morning),
     H0 (the hour angle at sunrise and sunset), and rise, noon and set as minutes on the clock */
  P.sunAt = function (when, hemi) {
    var pl = place(hemi), N = Math.floor((when - new Date(when.getFullYear(), 0, 0)) / 864e5);
    var decl = -23.44 * Math.cos(2 * Math.PI / 365 * (N + 10));
    var B = 2 * Math.PI * (N - 81) / 364, eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    var noon = 720 - 4 * pl.lon - when.getTimezoneOffset() - eot;
    var mins = when.getHours() * 60 + when.getMinutes() + when.getSeconds() / 60;
    var sl = Math.sin(pl.lat * rad) * Math.sin(decl * rad), cl = Math.cos(pl.lat * rad) * Math.cos(decl * rad);
    var c0 = (Math.sin(-0.833 * rad) - sl) / cl, H0 = c0 <= -1 ? 180 : c0 >= 1 ? 0 : Math.acos(c0) / rad;
    var H = (((mins - noon) / 4 + 180) % 360 + 360) % 360 - 180;
    return { alt: Math.asin(sl + cl * Math.cos(H * rad)) / rad, H: H, H0: H0, noon: noon, rise: noon - 4 * H0, set: noon + 4 * H0, south: pl.lat < 0 };
  };
  /* the moon: phase p (0 new, .5 full), how much is lit, and roughly where it is. It crosses the sky p of a day behind the sun. */
  P.moonAt = function (when, sun) {
    var syn = 29.530588853, p = ((((when.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn) + syn) % syn / syn;
    var H = ((sun.H - p * 360 + 180) % 360 + 360) % 360 - 180;
    return { p: p, lit: (1 - Math.cos(2 * Math.PI * p)) / 2, H: H, alt: 58 * Math.cos(H * rad) };
  };
  /* What the sky looks like: { phase, sun {x, alt}, moon {x, alt, p} or none, south, rise, set, p, lit }.
     x runs 0 (left) to 1 (right). The view faces the sun's half of the sky, so east is on the left in the
     north and on the right in the south: in Australia the sun rises on the right and sets on the left.
     choice: 'auto' for the real sky now, or a fixed dawn, day, dusk or night. center puts things mid-sky (banners). */
  P.sky = function (choice, hemi, center) {
    var when = P.now(), sun = P.sunAt(when, hemi), moon = P.moonAt(when, sun), south = sun.south;
    var side = function (fr) { return center ? 0.5 : south ? 1 - fr : fr; };
    var out = { south: south, rise: sun.rise, set: sun.set, p: moon.p, lit: moon.lit };
    if (PHASE[choice]) {
      var fx = { dawn: [0.1, 4], day: [0.5, 56], dusk: [0.9, 4], night: [0.5, -40] }[choice];
      out.phase = choice;
      out.sun = { x: side(fx[0]), alt: fx[1] };
      if (choice === 'night') out.moon = { x: side(0.36), alt: 52, p: Math.max(0.07, Math.min(0.93, moon.p)) };
      return out;
    }
    out.phase = sun.alt > 9 ? 'day' : sun.alt < -7 ? 'night' : sun.H < 0 ? 'dawn' : 'dusk';
    out.sun = { x: side(sun.H0 > 0 ? Math.max(-0.06, Math.min(1.06, (sun.H + sun.H0) / (2 * sun.H0))) : 0.5), alt: sun.alt };
    if (moon.alt > 4 && moon.lit > 0.04) out.moon = { x: side((moon.H + 90) / 180), alt: moon.alt, p: moon.p };
    return out;
  };
  /* today's sunrise, sunset and moon in words, for the Grove page */
  P.skyText = function (hemi) {
    var s = P.sky('auto', hemi), p = s.p;
    var t = function (m) { m = ((Math.round(m) % 1440) + 1440) % 1440; var hh = Math.floor(m / 60), mm = m % 60; return (((hh + 11) % 12) + 1) + ':' + (mm < 10 ? '0' : '') + mm + (hh < 12 ? ' am' : ' pm'); };
    var name = p < 0.03 || p > 0.97 ? 'new moon' : p < 0.22 ? 'waxing crescent' : p < 0.28 ? 'first quarter' : p < 0.47 ? 'waxing gibbous' : p < 0.53 ? 'full moon' : p < 0.72 ? 'waning gibbous' : p < 0.78 ? 'last quarter' : 'waning crescent';
    return { rise: t(s.rise), set: t(s.set), moon: name, lit: Math.round(s.lit * 100), zone: P.zone(), known: !!ZONES[P.zone()], south: s.south };
  };

  /* ---------------- things that unlock ----------------
     at: 0..1 across the scene, snapped to the nearest gap between plants; dx nudges it within the gap.
     layer: edge stands at the forest edge across the creek, back at the back of the clearing, front near the viewer,
     air is not a placed object. On wide screens the owl perches on a branch instead of its stump. */
  P.decor = [
    { id: 'stones',      name: 'Stepping stones', level: 2,  at: 0.5,  layer: 'front', dy: 8 },
    { id: 'lantern',     name: 'Lantern',         level: 3,  at: 0,    layer: 'front', dx: -0.2, dy: 3 },
    { id: 'butterflies', name: 'Butterflies',     level: 4,  layer: 'air' },
    { id: 'bench',       name: 'Bench',           level: 5,  at: 0.5,  layer: 'back' },
    { id: 'pond',        name: 'Lily pond',       level: 6,  at: 0.25, layer: 'front', dy: 7 },
    { id: 'beehive',     name: 'Beehive',         level: 7,  at: 1,    layer: 'back', dx: 0.1 },
    { id: 'planter',     name: 'Garden bed',      level: 8,  at: 0.75, layer: 'back' },
    { id: 'campfire',    name: 'Campfire',        level: 9,  at: 0.25, layer: 'back' },
    { id: 'arch',        name: 'Stone arch',      level: 10, at: 1,    layer: 'edge', dx: -0.12 },
    { id: 'owl',         name: 'Owl',             level: 12, at: 0,    layer: 'front', dx: 0.22 },
    { id: 'treehouse',   name: 'Treehouse',       level: 14, at: 0.5,  layer: 'edge' },
    { id: 'deer',        name: 'Deer',            level: 16, at: 0.75, layer: 'edge' }
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
    owl: function (c, S, onBranch) {
      var eye = c.lit ? '#ffe27a' : '#f6ecd4';
      return [(onBranch ? '<g transform="translate(0 11.5)">' : '<g><rect x="-5.5" y="-11" width="11" height="11" fill="#5a4230"/><ellipse cx="0" cy="-11" rx="5.5" ry="1.8" fill="#8a6a4c"/><ellipse cx="-3" cy="-1" rx="5" ry="1.6" fill="#5d8a3c"/>') +
        '<ellipse cx="0" cy="-21" rx="7.4" ry="9.4" fill="#8a6a4c"/><ellipse cx="0" cy="-18.6" rx="4.6" ry="6" fill="#c9ad85"/>' +
        '<path d="M-6.6 -27l1.6 -5 3 3.6zM6.6 -27l-1.6 -5 -3 3.6z" fill="#7a5c44"/>' +
        '<circle cx="-2.9" cy="-24.2" r="2.7" fill="' + eye + '"/><circle cx="2.9" cy="-24.2" r="2.7" fill="' + eye + '"/><circle cx="-2.9" cy="-24.2" r="1.2" fill="#22180e"/><circle cx="2.9" cy="-24.2" r="1.2" fill="#22180e"/>' +
        '<path d="M-1.2 -22.4L0 -20.2L1.2 -22.4Z" fill="#e2a03f"/><path d="M-2.4 -16.6q1.2 1 2.4 0q1.2 1 2.4 0" stroke="#8a6a4c" stroke-width=".7" fill="none"/></g>', []];
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
  /* one row of forest. detail 0 = far and plain, 1 = middle, 2 = near: layered boughs and round crowns.
     lightX is where the sun or moon is, so each tree is lit on the side that faces it (null = no light).
     c: { pine, pineLit, round, roundLit, trunk, hill, snow } */
  function forest(w, base, hmin, hmax, step, r, c, S, detail, lightX) {
    var dark = '', lit = '', trunks = '', crowns = '', hi = '', extra = '';
    for (var x = -step; x < w + step; x += step * (0.62 + r() * 0.7)) {
      var hh = hmin + r() * (hmax - hmin), sg = lightX == null ? 0 : lightX < x ? -1 : 1;
      if (detail && r() < 0.27) {
        var cr = hh * 0.3, cy = base - hh * 0.6, tw = Math.max(1.2, hh * 0.035);
        trunks += 'M' + f(x - tw) + ' ' + base + 'V' + f(cy) + 'H' + f(x + tw) + 'V' + base + 'Z';
        [[0, 0, 1], [-0.72, 0.38, 0.7], [0.72, 0.34, 0.72], [0.05, -0.55, 0.62]].forEach(function (k) { crowns += '<circle cx="' + f(x + k[0] * cr) + '" cy="' + f(cy + k[1] * cr) + '" r="' + f(k[2] * cr) + '"/>'; });
        if (detail > 1 && sg) [[0.32, -0.38, 0.5], [-0.36, -0.12, 0.32], [0.62, 0.22, 0.3]].forEach(function (k) { hi += '<circle cx="' + f(x + sg * k[0] * cr) + '" cy="' + f(cy + k[1] * cr) + '" r="' + f(k[2] * cr) + '"/>'; });
        if (S.blossom && detail > 1) for (var b = 0; b < 6; b++) extra += '<circle cx="' + f(x + (r() - 0.5) * cr * 2.2) + '" cy="' + f(cy + (r() - 0.6) * cr * 1.3) + '" r="' + f(1.1 + r() * 0.9) + '" fill="' + S.blossom + '" opacity=".8"/>';
        if (S.snow) extra += '<path d="M' + f(x - cr * 0.8) + ' ' + f(cy - cr * 0.6) + 'Q' + f(x) + ' ' + f(cy - cr * 1.75) + ' ' + f(x + cr * 0.8) + ' ' + f(cy - cr * 0.6) + 'Q' + f(x) + ' ' + f(cy - cr * 1.0) + ' ' + f(x - cr * 0.8) + ' ' + f(cy - cr * 0.6) + 'Z" fill="' + c.snow + '" opacity=".88"/>';
      } else {
        var tiers = detail === 0 ? 1 : detail === 1 ? 3 : 4, ww = hh * (0.38 + r() * 0.12), seg = hh * 0.86 / tiers;
        trunks += 'M' + f(x - 1.3) + ' ' + base + 'V' + f(base - hh * 0.2) + 'H' + f(x + 1.3) + 'V' + base + 'Z';
        for (var t = 0; t < tiers; t++) {
          var yb = base - (tiers > 1 ? hh * 0.1 + t * seg * 0.8 : 0), yt = t === tiers - 1 ? base - hh : yb - seg * 1.55, tw2 = ww * (1 - t / (tiers + 0.35)), ym = yb - (yb - yt) * 0.42;
          dark += 'M' + f(x - tw2 / 2) + ' ' + f(yb) + 'Q' + f(x - tw2 * 0.14) + ' ' + f(ym) + ' ' + f(x) + ' ' + f(yt) + 'Q' + f(x + tw2 * 0.14) + ' ' + f(ym) + ' ' + f(x + tw2 / 2) + ' ' + f(yb) + 'Q' + f(x) + ' ' + f(yb + (yb - yt) * 0.1) + ' ' + f(x - tw2 / 2) + ' ' + f(yb) + 'Z';
          if (detail > 1 && sg) lit += 'M' + f(x + sg * tw2 / 2) + ' ' + f(yb) + 'Q' + f(x + sg * tw2 * 0.14) + ' ' + f(ym) + ' ' + f(x) + ' ' + f(yt) + 'L' + f(x + sg * tw2 * 0.07) + ' ' + f(yb + (yb - yt) * 0.05) + 'Z';
        }
        if (S.snow) extra += '<path d="M' + f(x - ww * 0.17) + ' ' + f(base - hh * 0.7) + 'Q' + f(x - ww * 0.04) + ' ' + f(base - hh * 0.86) + ' ' + f(x) + ' ' + f(base - hh) + 'Q' + f(x + ww * 0.04) + ' ' + f(base - hh * 0.86) + ' ' + f(x + ww * 0.17) + ' ' + f(base - hh * 0.7) + 'Q' + f(x) + ' ' + f(base - hh * 0.62) + ' ' + f(x - ww * 0.17) + ' ' + f(base - hh * 0.7) + 'Z" fill="' + c.snow + '" opacity=".88"/>';
      }
    }
    return '<rect x="0" y="' + (base - 1) + '" width="' + w + '" height="700" fill="' + c.hill + '"/><path d="' + trunks + '" fill="' + c.trunk + '"/><path d="' + dark + '" fill="' + c.pine + '"/>' +
      (lit ? '<path d="' + lit + '" fill="' + c.pineLit + '" opacity=".55"/>' : '') + '<g fill="' + c.round + '">' + crowns + '</g>' + (hi ? '<g fill="' + c.roundLit + '" opacity=".6">' + hi + '</g>' : '') + extra;
  }
  /* a cumulus cloud: a row of puffs, larger in the middle, sitting on a flat base and shaded from top to bottom */
  function cloudSVG(r, s, top, bottom, id) {
    var W = 140, H = 54, base = 44, n = 6 + Math.floor(r() * 4), puffs = '', hi = '';
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1), px = 22 + 96 * t + (r() - 0.5) * 8, pr = (8 + 14 * Math.sin(Math.PI * (0.1 + 0.8 * t))) * (0.8 + r() * 0.4);
      puffs += '<circle cx="' + f(px) + '" cy="' + f(base - pr * 0.7) + '" r="' + f(pr) + '"/>';
      if (r() < 0.65) hi += '<circle cx="' + f(px - pr * 0.22) + '" cy="' + f(base - pr * 1.02) + '" r="' + f(pr * 0.52) + '"/>';
    }
    return '<svg width="' + f(W * s) + '" height="' + f(H * s) + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><defs>' +
      '<linearGradient id="cg-' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="' + base + '"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/></linearGradient>' +
      '<clipPath id="cc"><rect x="0" y="0" width="' + W + '" height="' + base + '"/></clipPath></defs>' +
      '<g clip-path="url(#cc)"><g fill="url(#cg-' + id + ')"><ellipse cx="70" cy="' + (base - 3) + '" rx="56" ry="10"/>' + puffs + '</g><g fill="' + top + '" opacity=".5">' + hi + '</g></g></svg>';
  }
  /* the moon at phase p (0 new, .5 full). Its lit edge faces west while it grows, which is the left side when you face north. */
  function moonShape(cx, cy, r, p, south, bright, dark) {
    var lit = (1 - Math.cos(2 * Math.PI * p)) / 2, rx = r * Math.abs(Math.cos(2 * Math.PI * p)), onRight = p < 0.5 ? !south : south;
    return '<g transform="translate(' + f(cx) + ' ' + f(cy) + ')' + (onRight ? '' : ' scale(-1 1)') + '">' + (dark ? '<circle r="' + r + '" fill="' + dark + '"/>' : '') +
      '<path d="M0 ' + (-r) + 'A' + r + ' ' + r + ' 0 0 1 0 ' + r + 'A' + f(rx) + ' ' + r + ' 0 0 ' + (lit < 0.5 ? 0 : 1) + ' 0 ' + (-r) + 'Z" fill="' + bright + '"/></g>';
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
     o: sky (from P.sky), season, items [{id,name,plant,stage,level}], decor {id:true}, still (no motion),
        falling (false hides the drifting leaves, snow and specks), grew (section id that just grew),
        banner (one large plant on the right, no labels or links), big (the taller Grove page version)
     Returns HTML for a box of the given size. */
  P.scene = function (w, h, o) {
    o = Object.create(o);
    o.big = o.big && w >= 560;   /* on a phone the Grove page uses the normal proportions, just taller */
    var narrow = w < 560, sky = o.sky, phase = sky.phase, ph = PHASE[phase], S = SEASON[o.season] || SEASON.summer, lit = phase === 'night' || phase === 'dusk';
    var gy = h - (o.banner ? 16 : 44), r = rng(42), i, x, dim = ph.dim, glow = '', html = '', now = Date.now() / 1000;
    var shade = function (c) { return mix(c, '#06100c', 1 - dim); };
    var svgOpen = function (cls) { return '<svg class="lay ' + cls + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">'; };
    /* animation offsets come from the clock, so redrawing the picture never makes anything jump back to its start */
    var at = function (dur, offset) { return '-' + f((now + offset) % dur) + 's'; };

    /* the lines everything hangs from: far, middle and near forest, the horizon, and the top of the usable sky */
    var fb = gy - (o.big ? 122 : o.banner ? 58 : 74), mb = gy - (o.big ? 72 : o.banner ? 38 : 44), nb = gy - (o.big ? 28 : 20), hz = fb - 2, top = o.banner ? 14 : narrow ? 64 : 30;
    var up = function (alt) { return hz - Math.max(-8, alt) / 90 * (hz - top); };
    var sunUp = sky.sun.alt > -1, sx = w * (0.07 + 0.86 * sky.sun.x), sy = up(sky.sun.alt);
    var mx = sky.moon ? w * (0.07 + 0.86 * sky.moon.x) : 0, my = sky.moon ? up(sky.moon.alt) : 0;
    var lightX = sunUp ? sx : phase === 'night' && sky.moon ? mx : null;
    var sunCol = sky.sun.alt < 14 ? mix('#ffab62', ph.sun, Math.max(0, sky.sun.alt) / 14) : ph.sun;

    /* 1. sky: the sun sits where it really is, low and orange near the horizon, and the moon shows its real phase */
    var a = svgOpen('s-sky') + '<defs><linearGradient id="sky-' + phase + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + ph.sky[0] + '"/><stop offset=".72" stop-color="' + mix(ph.sky[0], ph.sky[1], 0.82) + '"/><stop offset="1" stop-color="' + ph.sky[1] + '"/></linearGradient>' +
      '<radialGradient id="glow"><stop offset="0" stop-color="' + sunCol + '" stop-opacity=".8"/><stop offset="1" stop-color="' + sunCol + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="mglow"><stop offset="0" stop-color="#e9edd8" stop-opacity=".6"/><stop offset="1" stop-color="#e9edd8" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#sky-' + phase + ')"/>';
    if (phase === 'night') for (i = 0; i < Math.round(w / 14); i++) a += '<circle cx="' + f(r() * w) + '" cy="' + f(r() * hz * 0.9) + '" r="' + f(0.5 + r() * 0.8) + '" fill="#e9edd8" opacity="' + f(0.3 + r() * 0.6) + '"/>';
    if (sky.sun.alt > -9 && sky.sun.alt < 14) a += '<ellipse cx="' + f(sx) + '" cy="' + f(hz + 4) + '" rx="' + f(w * 0.3) + '" ry="' + f((hz - top) * 0.55) + '" fill="url(#glow)" opacity=".6"/>';
    if (sunUp) a += '<circle cx="' + f(sx) + '" cy="' + f(sy) + '" r="' + (o.banner ? 72 : 104) + '" fill="url(#glow)"/><circle cx="' + f(sx) + '" cy="' + f(sy) + '" r="13" fill="' + sunCol + '"/>';
    if (sky.moon) {
      var night = phase === 'night', mlit = (1 - Math.cos(2 * Math.PI * sky.moon.p)) / 2;
      a += (night ? '<circle cx="' + f(mx) + '" cy="' + f(my) + '" r="54" fill="url(#mglow)" opacity="' + f(0.25 + 0.5 * mlit) + '"/>' : '') +
        '<g opacity="' + (phase === 'day' ? 0.5 : night ? 1 : 0.8) + '">' + moonShape(mx, my, 12, sky.moon.p, sky.south, '#eef0df', night ? mix(ph.sky[0], '#ffffff', 0.12) : null) + '</g>';
    }
    a += ridge(w, fb + 6, o.big ? 120 : 64, rng(5), mix(mix(S.pine, ph.haze, 0.82), ph.sky[1], 0.35), 6) +
         ridge(w, fb + 10, o.big ? 74 : 40, rng(9), mix(mix(S.pine, ph.haze, 0.7), ph.sky[1], 0.18), 9);
    html += a + '</svg>';

    /* 2. clouds: big ones high up, small ones far off near the horizon, lit from above by day and from below at dusk */
    var cl = { day: ['#ffffff', mix('#ffffff', ph.sky[0], 0.34)], dawn: ['#fff5e4', mix('#e9b99c', ph.sky[0], 0.25)], dusk: [mix('#77688a', ph.sky[0], 0.3), '#f4a86c'], night: ['#34524c', '#182d29'] }[phase];
    var nc = o.banner ? 2 : Math.max(3, Math.round(w / 240));
    for (i = 0; i < nc; i++) {
      var far = i % 3 === 2, cs = far ? 0.36 + r() * 0.22 : 0.7 + r() * 0.75, dur = (far ? 520 : 300) / (0.5 + cs * 0.5);
      var cyy = far ? hz - 30 - r() * 22 : top * 0.3 + r() * (hz - top) * 0.4;
      html += '<div class="scloud' + (o.still ? ' still' : '') + '" style="top:' + f(cyy) + 'px;--w:' + w + 'px;--x:' + f(r() * w * 0.8) + 'px;opacity:' + (far ? 0.72 : phase === 'night' ? 0.7 : 0.94) +
        ';animation-duration:' + f(dur) + 's;animation-delay:' + at(dur, r() * dur) + '">' + cloudSVG(rng(100 + i), cs, cl[0], cl[1], phase) + '</div>';
    }

    /* 3. forest, light, creek, clearing, decorations */
    var snow = shade('#f2f7f8');
    var layer = function (hazeT, darkT) {
      /* nearer rows are less hazy and darker; the whole forest dims as the light goes */
      var p = shade(mix(mix(S.pine, ph.haze, hazeT), '#07130e', darkT)), rd = shade(mix(mix(S.round, ph.haze, hazeT), '#07130e', darkT * 0.6));
      return { pine: p, pineLit: mix(p, ph.sun, 0.32 * dim), round: rd, roundLit: mix(rd, ph.sun, 0.36 * dim), trunk: mix(p, '#1c120a', 0.45),
               hill: mix(p, S.snow ? shade('#c6d5da') : p, 0.5), snow: mix(snow, ph.haze, hazeT * 0.5) };
    };
    var g1 = shade(S.ground[0]), g2 = shade(S.ground[1]), g3 = shade(S.ground[2]), near = layer(0.1, 0.3), cTop = nb + 6, water = shade(mix(S.water, ph.sky[1], 0.4));
    var b = svgOpen('s-forest') + '<defs>' + P.defs +
      '<radialGradient id="lamp"><stop offset="0" stop-color="#ffdf8a" stop-opacity=".8"/><stop offset="1" stop-color="#ffdf8a" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + ph.haze + '" stop-opacity="0"/><stop offset="1" stop-color="' + mix(ph.haze, '#ffffff', 0.35) + '" stop-opacity=".5"/></linearGradient>' +
      '<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sunCol + '" stop-opacity=".26"/><stop offset="1" stop-color="' + sunCol + '" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="crk" gradientUnits="userSpaceOnUse" x1="0" y1="' + cTop + '" x2="0" y2="' + gy + '"><stop offset="0" stop-color="' + mix(water, near.pine, 0.55) + '"/><stop offset="1" stop-color="' + mix(water, '#ffffff', 0.12) + '"/></linearGradient>' +
      '<radialGradient id="clr" gradientUnits="userSpaceOnUse" cx="' + f(lightX == null ? w / 2 : lightX) + '" cy="' + gy + '" r="' + f(w * 0.5) + '"><stop offset="0" stop-color="' + mix(g1, ph.sun, lit ? 0.12 : 0.3) + '"/><stop offset="1" stop-color="' + g1 + '"/></radialGradient></defs>';
    b += forest(w, fb, o.big ? 24 : 16, o.big ? 52 : 34, o.big ? 15 : 11, rng(11), layer(0.66, 0), S, 0, lightX) +
         '<rect x="0" y="' + (fb - 30) + '" width="' + w + '" height="' + (mb - fb + 34) + '" fill="url(#mist)"/>' +
         forest(w, mb, o.big ? 44 : 28, o.big ? 86 : 56, o.big ? 26 : 19, rng(21), layer(0.36, 0.08), S, 1, lightX);
    if (sunUp && sky.sun.alt > 2) {   /* shafts of light fan out from the sun to the ground */
      [[-0.26, 0.035], [-0.09, 0.02], [0.08, 0.03], [0.27, 0.04]].forEach(function (ry) {
        var bx = sx + ry[0] * w;
        b += '<path d="M' + f(sx - 4) + ' ' + f(sy) + 'L' + f(bx - w * ry[1]) + ' ' + (gy + 8) + 'H' + f(bx + w * ry[1]) + 'L' + f(sx + 4) + ' ' + f(sy) + 'Z" fill="url(#ray)"/>';
      });
    }
    b += '<rect x="0" y="' + (mb - 28) + '" width="' + w + '" height="' + (nb - mb + 30) + '" fill="url(#mist)" opacity=".8"/>' +
         forest(w, nb, o.big ? 70 : 44, o.big ? 150 : 92, o.big ? 46 : 34, rng(31), near, S, 2, lightX);

    /* where things stand: one slot per plant, gaps between them for everything else */
    var items = o.items || [], n = items.length || 1, k = Math.max(0.6, Math.min(1.15, w / (n * 150)));
    if (o.big) k = Math.min(k * 1.45, (w / (n + 1)) / 96);
    if (o.banner) k = Math.min(1.2, (h - 30) / 132);
    var slots = items.map(function (_, idx) { return o.banner ? w * 0.84 : w * (idx + 1) / (n + 1); });
    var gap = w / (n + 1), show = o.banner ? {} : (o.decor || {}), dctx = { lit: lit, sky: ph.sky[1] }, flame = null, taken = [], perch = !narrow && !o.banner;
    var live = 'filter:brightness(' + f(0.5 + dim * 0.5) + ') saturate(' + f(0.6 + dim * 0.4) + ')';
    var place = function (d, baseY, scale) {
      var px = (Math.round(d.at * n) + 0.5 + (d.dx || 0)) * gap, res = DECOR[d.id](dctx, S);
      taken.push(px);
      res[1].forEach(function (gl) { if (lit) glow += '<circle cx="' + f(px + gl[0] * scale) + '" cy="' + f(baseY + gl[1] * scale) + '" r="' + f(gl[2] * scale) + '" fill="url(#lamp)"/>'; });
      if (d.id === 'campfire') flame = [px, baseY - 12 * scale, 34 * scale];
      return '<g transform="translate(' + f(px) + ' ' + f(baseY) + ') scale(' + f(scale) + ')">' + res[0] + '</g>';
    };
    var layerOf = function (name, baseY, scale) {
      var out = '';
      P.decor.forEach(function (d) { if (d.layer === name && show[d.id] && !(d.id === 'owl' && perch)) out += place(d, baseY + (d.dy || 0) * k, scale); });
      return out ? '<g style="' + live + '">' + out + '</g>' : '';
    };
    var edge = layerOf('edge', cTop - 1, k), back = layerOf('back', gy - 2, k * 0.96), front = layerOf('front', gy + 3, k * 1.04);

    /* the forest edge: things standing among the trees, then a line of undergrowth along the far bank */
    b += edge;
    var under = '', underHi = '';
    for (x = -6; x < w + 10; x += 10 + r() * 16) { var br = 7 + r() * 9; under += '<circle cx="' + f(x) + '" cy="' + f(nb + 1) + '" r="' + f(br) + '"/>'; if (lightX != null && r() < 0.5) underHi += '<circle cx="' + f(x + (lightX < x ? -1 : 1) * br * 0.25) + '" cy="' + f(nb - br * 0.4) + '" r="' + f(br * 0.45) + '"/>'; }
    b += '<g fill="' + near.round + '">' + under + '</g><g fill="' + near.roundLit + '" opacity=".45">' + underHi + '</g>';

    /* a creek runs along the back of the clearing and catches the light */
    b += '<path d="M0 ' + cTop + 'q' + f(w / 8) + ' -2.4 ' + f(w / 4) + ' 0t' + f(w / 4) + ' 0t' + f(w / 4) + ' 0t' + f(w / 4) + ' 0V' + (gy + 6) + 'H0Z" fill="url(#crk)"/>';
    var gl = '';
    for (x = 4 + r() * 20; x < w; x += 16 + r() * 40) gl += 'M' + f(x) + ' ' + f(cTop + 2.5 + r() * Math.max(1, gy - cTop - 9)) + 'h' + f(4 + r() * 9);
    b += '<path d="' + gl + '" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="' + (phase === 'night' ? 0.22 : 0.5) + '" fill="none"/>';
    if (lightX != null) b += '<ellipse cx="' + f(lightX) + '" cy="' + (cTop + 4) + '" rx="' + f(w * 0.07) + '" ry="3.2" fill="' + (sunUp ? sunCol : '#e9edd8') + '" opacity="' + (sunUp ? 0.5 : 0.3) + '"/>';
    for (i = 0; i < Math.round(w / 230); i++) { x = r() * w; var rr = 4 + r() * 4; b += '<ellipse cx="' + f(x) + '" cy="' + (cTop + 5) + '" rx="' + f(rr) + '" ry="' + f(rr * 0.45) + '" fill="' + shade('#66736a') + '"/><ellipse cx="' + f(x - 1) + '" cy="' + f(cTop + 4.2) + '" rx="' + f(rr * 0.6) + '" ry="' + f(rr * 0.22) + '" fill="' + shade('#5d8a3c') + '"/>'; }

    /* the clearing: three rolling bands, brightest where the light falls */
    var edgePath = 'M0 ' + (gy - 4) + 'Q' + f(w * 0.2) + ' ' + (gy - 10) + ' ' + f(w * 0.45) + ' ' + (gy - 4) + 'T' + w + ' ' + (gy - 6);
    b += '<path d="' + edgePath + 'V' + h + 'H0Z" fill="url(#clr)"/><path d="' + edgePath + '" stroke="' + mix(g1, '#ffffff', 0.3) + '" stroke-width="1.4" fill="none" opacity=".45"/>' +
         '<path d="M0 ' + (gy + 6) + 'Q' + f(w * 0.3) + ' ' + gy + ' ' + f(w * 0.6) + ' ' + (gy + 6) + 'T' + w + ' ' + (gy + 3) + 'V' + h + 'H0Z" fill="' + g2 + '" opacity=".8"/>' +
         '<path d="M0 ' + (gy + 24) + 'Q' + f(w * 0.35) + ' ' + (gy + 16) + ' ' + f(w * 0.7) + ' ' + (gy + 24) + 'T' + w + ' ' + (gy + 20) + 'V' + h + 'H0Z" fill="' + g3 + '"/>';
    if (phase !== 'night') for (i = 0; i < Math.round(w / 150); i++) b += '<ellipse cx="' + f(r() * w) + '" cy="' + f(gy + 2 + r() * 12) + '" rx="' + f(30 + r() * 46) + '" ry="' + f(3 + r() * 3) + '" fill="' + ph.sun + '" opacity="' + f(0.07 + r() * 0.08) + '"/>';
    b += back;
    /* grass, flowers and small finds, kept clear of the plants and decorations */
    var clear = function (px) { return slots.every(function (s2) { return Math.abs(s2 - px) > 46 * k; }) && taken.every(function (t2) { return Math.abs(t2 - px) > 34 * k; }); };
    var tufts = '', fl = '', litter = '', finds = '', fcol = ['#f3e9a8', '#ffffff', '#c9a7ee', '#f6d98a'];
    for (x = 8; x < w; x += 11 + r() * 24) {
      var th = 5 + r() * 7, ty = gy + 2 + r() * 5;
      tufts += 'M' + f(x) + ' ' + f(ty) + 'l-3 ' + f(-th) + 'M' + f(x) + ' ' + f(ty) + 'l0 ' + f(-th - 2) + 'M' + f(x) + ' ' + f(ty) + 'l3.5 ' + f(-th + 1);
      if (!S.snow && r() < (o.season === 'spring' ? 0.7 : 0.4)) fl += '<circle cx="' + f(x + 6) + '" cy="' + f(ty - 2 - r() * 4) + '" r="1.5" fill="' + fcol[Math.floor(r() * fcol.length)] + '" opacity=".9"/>';
      if (o.season === 'autumn' && r() < 0.6) litter += leaf(x + 3, ty + 1 + r() * 3, 5, 2, r() * 360, ['#d9822b', '#c9552a', '#e8b45a'][Math.floor(r() * 3)]);
    }
    for (i = 0; i < Math.round(w / 120); i++) {
      x = 24 + r() * (w - 48);
      var fy = gy + 5 + r() * 9, kind = r();
      if (!clear(x)) continue;
      if (kind < 0.45) finds += '<g transform="translate(' + f(x) + ' ' + f(fy) + ')"><rect x="-1" y="-5" width="2" height="5" fill="#e9dfc6"/><path d="M-4.5 -4.6Q0 -11 4.5 -4.6Z" fill="#b5532f"/><rect x="4" y="-3.4" width="1.6" height="3.4" fill="#e9dfc6"/><path d="M1.6 -3Q4.8 -8 8 -3Z" fill="#c9703a"/></g>';
      else if (kind < 0.8) { for (var q = -2; q <= 2; q++) finds += leaf(x, fy, 9 + r() * 5, 2.4, -90 + q * 27, q % 2 ? shade(S.grass) : shade(mix(S.grass, '#1c4526', 0.35))); }
      else finds += '<ellipse cx="' + f(x) + '" cy="' + f(fy) + '" rx="7" ry="3.2" fill="' + shade('#66736a') + '"/><ellipse cx="' + f(x - 1) + '" cy="' + f(fy - 1.2) + '" rx="4.6" ry="1.6" fill="' + shade('#5d8a3c') + '"/>';
    }
    b += '<path d="' + tufts + '" stroke="' + shade(S.grass) + '" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".85"/>' + fl + litter + finds;
    var stagger = function (idx) { return o.banner ? 0 : idx % 2 ? 5 : 0; };   /* alternate plants stand a little nearer, so they do not line up */
    items.forEach(function (it, idx) { b += '<ellipse cx="' + f(slots[idx]) + '" cy="' + (gy + 3 + stagger(idx)) + '" rx="' + f(34 * k) + '" ry="' + f(4.6 * k) + '" fill="#081209" opacity=".42"/>'; });
    b += front + glow;
    html += b + '</svg>';

    /* 4. the plants: each one a link with its label */
    var ink = S.snow && phase !== 'night' ? ['#30444a', '#16262b'] : ['#c7d8c4', '#f1f6ee'];
    items.forEach(function (it, idx) {
      var pk = k * (stagger(idx) ? 1.05 : 1), bw = 130 * pk, left = slots[idx] - bw / 2, topY = gy + 2 + stagger(idx) - 122 * pk, sd = 5.5 + (idx % 3) * 1.3;
      var art = '<div class="' + (o.grew === it.id ? 'grew' : '') + '"><div class="' + (o.still ? '' : 'sway') + '" style="animation-duration:' + f(sd) + 's;animation-delay:' + at(sd * 2, idx * 1.7) + '">' +
        '<svg viewBox="-65 -122 130 132" width="' + f(bw) + '" height="' + f(132 * pk) + '" style="' + live + '" aria-hidden="true"><defs>' + P.defs + '</defs>' + P.draw(it.plant, it.stage) + '</svg></div></div>';
      html += o.banner ? '<div class="splant" style="left:' + f(left) + 'px;top:' + f(topY) + 'px;width:' + f(bw) + 'px">' + art + '</div>' :
        '<a class="splant" href="#/' + it.id + '" style="left:' + f(left) + 'px;top:' + f(topY) + 'px;width:' + f(bw) + 'px" aria-label="' + it.name + ', level ' + it.level + '">' + art +
        '<span class="plab" style="top:' + f(gy + 11 - topY) + 'px"><span class="pn" style="color:' + ink[0] + '">' + it.name + '</span><span class="pl" style="color:' + ink[1] + '">Lv ' + it.level + '</span></span></a>';
    });

    /* 5. small life */
    if (show.butterflies && !lit && !S.snow && !o.still) {
      items.slice(0, 4).forEach(function (it, idx) {
        html += '<div class="sfly" style="left:' + f(slots[idx] + (idx % 2 ? 26 : -34) * k) + 'px;top:' + f(gy - 44 * k - idx * 6) + 'px;animation-delay:' + at(9, idx * 2.3) + '">' +
          '<svg class="flap" width="14" height="12" viewBox="-7 -7 14 12" aria-hidden="true"><path d="M0 0q-5 -6 -6 0q1 5 6 0q5 -6 6 0q-1 5 -6 0" fill="' + ['#f4c531', '#9db4f5', '#f08a6a', '#c9a7ee'][idx % 4] + '"/></svg></div>';
      });
    }
    if (flame && lit && !o.still) html += '<i class="sflame" style="left:' + f(flame[0] - flame[2]) + 'px;top:' + f(flame[1] - flame[2]) + 'px;width:' + f(flame[2] * 2) + 'px;height:' + f(flame[2] * 2) + 'px"></i>';
    if (lit && !S.snow) for (i = 0; i < Math.round(w / 70); i++) html += '<i class="' + (o.still ? 'ffs' : 'ff') + '" style="left:' + f(r() * w) + 'px;top:' + f(gy - 6 - r() * 76) + 'px;animation-delay:' + at(5, r() * 5) + '"></i>';

    /* 6. the frame: trunks at the edges, leaves hanging in from the top corners, foliage in the bottom corners */
    var cols = [mix('#0d2416', '#06100c', 1 - dim), mix('#17381f', '#06100c', 1 - dim), mix('#234f2c', '#06100c', 1 - dim), mix('#2f6a3a', '#06100c', 1 - dim)];
    if (o.season === 'autumn') cols[3] = mix('#8a5a22', '#06100c', 1 - dim);
    var c = svgOpen('s-frame') + '<defs>' + P.defs + '</defs>', span = Math.min(w * 0.34, 330), depth = o.banner ? 34 : o.big ? 78 : 58, tw = narrow ? 7 : Math.max(12, Math.min(40, w * 0.036)), bark = mix('#17100a', '#050806', 1 - dim);
    if (!o.banner) c += edgeTrunk(w, h, 0, tw, rng(51), bark) + edgeTrunk(w, h, 1, tw * 0.8, rng(52), bark);
    if (show.owl && perch) {   /* the owl sits on a branch reaching out from the left trunk */
      var oy = h * 0.47, ox = tw * 0.6;
      c += '<path d="M' + f(ox) + ' ' + f(oy + 5) + 'Q' + f(ox + 32) + ' ' + f(oy + 4) + ' ' + f(ox + 66) + ' ' + f(oy - 6) + '" stroke="' + bark + '" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
        leaf(ox + 62, oy - 6, 13, 4.2, -28, cols[2]) + leaf(ox + 54, oy - 3, 12, 3.8, 42, cols[1]) + leaf(ox + 66, oy - 5, 11, 3.6, 12, cols[3]) +
        '<g transform="translate(' + f(ox + 36) + ' ' + f(oy + 1.5) + ') scale(1.1)" style="' + live + '">' + DECOR.owl(dctx, S, true)[0] + '</g>';
    }
    c += canopy(w, rng(61), 0, cols, span, depth) + (o.banner ? '' : canopy(w, rng(62), 1, cols, span * 0.8, depth * 0.85));
    if (!o.banner && !narrow) {   /* left out on a phone, where it would cover the outer plant labels */
      var bl = '';
      [[0, 1], [w, -1]].forEach(function (cn) {
        for (i = 0; i < 9; i++) { var bh = 26 + r() * 34, bxx = cn[0] + cn[1] * (r() * 50 - 4); bl += 'M' + f(bxx) + ' ' + h + 'Q' + f(bxx + cn[1] * bh * 0.1) + ' ' + f(h - bh * 0.6) + ' ' + f(bxx + cn[1] * bh * 0.45) + ' ' + f(h - bh) + 'Q' + f(bxx + cn[1] * bh * 0.2) + ' ' + f(h - bh * 0.5) + ' ' + f(bxx + cn[1] * 5) + ' ' + h + 'Z'; }
        for (i = 0; i < 4; i++) c += leaf(cn[0] + cn[1] * (2 + r() * 26), h + 3, 30 + r() * 30, 7 + r() * 4, cn[1] > 0 ? -(48 + r() * 36) : -(132 - r() * 36), cols[1 + (i % 2)], cols[0]);
      });
      c += '<path d="' + bl + '" fill="' + cols[0] + '"/>';
    }
    html += c + '</svg>';

    /* 7. whatever drifts through the air this season */
    if (!o.still && o.falling !== false) {
      var kind2 = S.fall, count = Math.round(w / (kind2 === 'mote' ? 90 : o.banner ? 120 : 60)), pal = { leaf: ['#d9822b', '#c9552a', '#e8b45a', '#a8482b'], snow: ['#ffffff'], mote: ['#fff3c4'] }[kind2];
      for (i = 0; i < count; i++) {
        var fd = kind2 === 'snow' ? 9 + r() * 8 : kind2 === 'mote' ? 16 + r() * 12 : 8 + r() * 9;
        html += '<i class="fall ' + kind2 + '" style="--x:' + f(r() * w) + 'px;--dx:' + f((r() - 0.3) * 90) + 'px;--h:' + (h - 26) + 'px;--r:' + Math.round(200 + r() * 500) + 'deg;background:' + pal[Math.floor(r() * pal.length)] +
          ';animation-duration:' + f(fd) + 's;animation-delay:' + at(fd, r() * fd) + '"></i>';
      }
    }
    return '<div class="sc ' + phase + (o.banner ? ' sbanner' : '') + '" style="width:' + w + 'px;height:' + h + 'px"' + (o.banner ? ' aria-hidden="true"' : '') + '>' + html + '</div>';
  };
})();
