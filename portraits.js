/* portraits.js — portraits SVG des clients de « L'Architecte ».
   Script classique : expose window.Portrait = { svg(spec, mood, size), MOODS, SAMPLES }.
   Aucun accès réseau, SVG pur, identifiants uniques par appel (compteur global). */
(function () {
  'use strict';
  var INK = '#1f3a5f';   // contour bleu nuit
  var uid = 0;           // compteur global pour les ids de clip / dégradé

  /* ---------- utilitaires couleur ---------- */
  function rgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // mélange la couleur a vers b (t de 0 à 1)
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b), o = '#';
    for (var i = 0; i < 3; i++) {
      var v = Math.round(x[i] + (y[i] - x[i]) * t);
      o += (v < 16 ? '0' : '') + v.toString(16);
    }
    return o;
  }
  var dark = function (c, t) { return mix(c, '#101a2b', t); };
  var light = function (c, t) { return mix(c, '#ffffff', t); };

  /* ---------- primitives SVG ---------- */
  // tracé rempli avec contour fin (stroke = 'none' pour l'enlever)
  function P(d, fill, stroke, sw) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + (stroke || INK) +
      '" stroke-width="' + (sw || 1.2) + '"/>';
  }
  // simple trait (sans remplissage)
  function L(d, col, sw, op) {
    return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + sw +
      '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
  }
  function C(x, y, r, fill, stroke) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="1.2"' : '') + '/>';
  }
  function E(x, y, rx, ry, fill, stroke) {
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="1.2"' : '') + '/>';
  }
  // étoile à 4 branches (étincelle)
  function spark(x, y, s) {
    return P('M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) +
      ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z', '#ffd75e', '#d9a21b', 0.8);
  }

  /* ---------- valeurs par défaut ---------- */
  var DEF = {
    skin: '#f2c9a5', hair: '#4a3426', age: 30, hairStyle: 'short', beard: 'none',
    glasses: false, clothes: '#5b8def', collar: 'shirt', accessory: 'none',
    freckles: false, bg: '#cfe3f5', accent: '#d4574a'
  };

  /* ---------- cheveux ---------- */
  // cercles pour les coiffures bouclées : contour d'abord, remplissage ensuite (union propre)
  function blob(list, col) {
    var o = '';
    list.forEach(function (c) { o += C(c[0], c[1], c[2] + 1.3, INK); });
    list.forEach(function (c) { o += C(c[0], c[1], c[2], col); });
    list.forEach(function (c) { o += C(c[0] - c[2] * 0.3, c[1] - c[2] * 0.35, c[2] * 0.3, light(col, 0.35)).replace('/>', ' opacity=".4"/>'); });
    return o;
  }
  // cercles répartis sur un arc d'ellipse
  function ring(cx, cy, rx, ry, r, a0, a1, n) {
    var l = [];
    for (var i = 0; i < n; i++) {
      var a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
      l.push([+(cx + rx * Math.cos(a)).toFixed(1), +(cy + ry * Math.sin(a)).toFixed(1), r]);
    }
    return l;
  }

  // derrière le visage
  function hairBack(s, h) {
    switch (s.hairStyle) {
      case 'long':
        return P('M32 56 C26 22 44 15 60 15 C76 15 94 22 88 56 C88 76 94 90 92 102 Q60 110 28 102 C26 90 32 76 32 56Z', h);
      case 'bob':
        return P('M31 62 C25 24 44 16 60 16 C76 16 95 24 89 62 C90 74 90 82 86 90 L34 90 C30 82 30 74 31 62Z', h);
      case 'ponytail':
        return P('M80 38 C102 30 112 54 102 78 C99 86 91 90 90 82 C96 70 94 56 82 50Z', h) +
          P('M84 36 L92 44 L84 50 L78 42Z', mix(h, '#d4574a', 0.7));
      case 'bun':
        return C(60, 15, 11, h, INK) + L('M54 11 Q59 8 65 11', light(h, 0.4), 2, 0.6);
      case 'curly':
        return blob(ring(60, 44, 31, 27, 10, 168, 372, 9).concat([[31, 58, 8], [89, 58, 8]]), h);
      case 'afro':
        return blob(ring(60, 47, 33, 28, 13, 160, 380, 10).concat([[28, 58, 10], [92, 58, 10], [29, 47, 11], [91, 47, 11]]), h);
    }
    return '';
  }

  // devant le visage (frange, calotte)
  function hairFront(s, h) {
    var hl = light(h, 0.38), o = '';
    switch (s.hairStyle) {
      case 'short':
        o = P('M34 54 C31 30 44 20 60 20 C76 20 89 30 86 54 C84 44 80 38 74 35 C66 40 52 40 44 35 C40 38 36 44 34 54Z', h) +
          L('M44 27 Q54 21 66 22', hl, 2.4, 0.65); break;
      case 'side':
        o = P('M34 54 C30 30 44 19 62 19 C80 20 90 32 86 54 C85 46 83 40 78 36 C68 38 54 34 47 42 C41 40 37 46 34 54Z', h) +
          L('M40 38 C48 28 62 25 74 29', hl, 2.4, 0.65) + L('M47 41 C52 33 62 31 72 33', dark(h, 0.35), 1, 0.5); break;
      case 'spiky':
        o = P('M34 52 C32 42 35 35 40 31 L37 20 L46 26 L49 14 L57 24 L62 12 L68 24 L76 15 L77 27 L85 22 L82 32 C86 38 88 44 86 52 C83 44 80 40 74 37 C66 41 52 41 46 37 C40 40 36 45 34 52Z', h) +
          L('M45 29 L49 19', hl, 2, 0.6); break;
      case 'long':
        o = P('M33 58 C29 30 45 18 60 18 C75 18 91 30 87 58 C85 46 78 38 62 30 C48 40 37 46 33 58Z', h) +
          L('M42 30 Q50 22 62 21', hl, 2.4, 0.65); break;
      case 'bob':
        o = P('M33 54 C30 30 45 18 60 18 C75 18 90 30 87 54 C80 43 70 40 60 40 C50 40 40 43 33 54Z', h) +
          L('M40 29 Q50 21 62 21', hl, 2.4, 0.65); break;
      case 'ponytail':
        o = P('M34 54 C31 30 44 20 60 20 C76 20 89 30 86 54 C84 44 80 38 74 35 C66 40 52 40 44 35 C40 38 36 44 34 54Z', h) +
          L('M44 27 Q54 21 66 22', hl, 2.4, 0.65); break;
      case 'bun':
        o = P('M35 54 C33 32 44 22 60 22 C76 22 87 32 85 54 C82 42 74 34 60 34 C46 34 38 42 35 54Z', h) +
          L('M44 28 Q54 23 66 24', hl, 2.4, 0.65); break;
      case 'curly':
        o = [[42, 36, 7], [51, 32, 7], [60, 31, 7], [69, 32, 7], [78, 36, 7]].map(function (c) { return C(c[0], c[1], c[2], h); }).join('') +
          C(49, 29, 2.2, hl).replace('/>', ' opacity=".5"/>'); break;
      case 'afro':
        o = [[40, 34, 8], [49, 30, 8], [60, 29, 8], [71, 30, 8], [80, 34, 8]].map(function (c) { return C(c[0], c[1], c[2], h); }).join('') +
          C(50, 26, 2.6, hl).replace('/>', ' opacity=".5"/>'); break;
      case 'bald':
        o = E(52, 33, 8, 3, '#ffffff').replace('/>', ' opacity=".35" transform="rotate(-18 52 33)"/>'); break;
    }
    return o;
  }

  /* ---------- corps et vêtements ---------- */
  var BODY = 'M12 122 C12 98 34 89 60 89 C86 89 108 98 108 122 Z';

  function wheelchairBack() {
    var o = '', g = '#4b5563';
    // dossier avec poignées
    o += P('M26 72 L94 72 Q100 72 100 78 L100 122 L20 122 L20 78 Q20 72 26 72Z', g);
    o += P('M16 64 L24 64 L24 76 L16 76Z', '#2b2f36') + P('M96 64 L104 64 L104 76 L96 76Z', '#2b2f36');
    return o;
  }
  // roues (devant le buste) : seul le haut est visible de chaque côté des épaules
  function wheelchairWheels() {
    var o = '';
    [8, 112].forEach(function (x) {
      o += C(x, 116, 25, 'rgba(235,240,246,.75)', INK);
      o += C(x, 116, 25, 'none', '#2b2f36').replace('stroke-width="1.2"', 'stroke-width="5"');
      o += C(x, 116, 19.5, 'none', '#9aa3ad').replace('stroke-width="1.2"', 'stroke-width="1.4"');
      for (var a = 0; a < 6; a++) {
        var r = a * Math.PI / 3 + 0.3;
        o += L('M' + x + ' 116 L' + (x + 19.5 * Math.cos(r)).toFixed(1) + ' ' + (116 + 19.5 * Math.sin(r)).toFixed(1), '#9aa3ad', 0.9);
      }
      o += C(x, 116, 4, '#2b2f36');
    });
    return o;
  }

  // détails du vêtement dessinés AVANT le cou (capuche)
  function clothesBack(s) {
    if (s.collar === 'hoodie')
      return P('M34 104 C30 80 42 77 60 77 C78 77 90 80 86 104Z', dark(s.clothes, 0.2));
    return '';
  }

  // détails dessinés APRÈS le cou
  function clothesFront(s, skinD) {
    var c = s.clothes, W = '#f7f9fc', o = '';
    switch (s.collar) {
      case 'shirt':
        o += P('M50 90 L60 104 L70 90Z', skinD, 'none');
        o += P('M48 87 L60 105 L47 108 L39 94Z', W) + P('M72 87 L60 105 L73 108 L81 94Z', W);
        o += L('M60 105 L60 122', dark(c, 0.3), 1, 0.5); break;
      case 'tie':
        o += P('M49 89 L60 122 L71 89Z', W);
        o += P('M47 87 L60 103 L46 106 L39 94Z', W) + P('M73 87 L60 103 L74 106 L81 94Z', W);
        o += P('M60 103 L53 108 L48 122 L56 122Z', dark(c, 0.15), INK, 1) + P('M60 103 L67 108 L72 122 L64 122Z', dark(c, 0.15), INK, 1);
        o += P('M57 102 L63 102 L64.5 108 L55.5 108Z', s.accent) +
          P('M55.5 108 L64.5 108 L67 122 L60 124 L53 122Z', s.accent); break;
      case 'scarf':
        o += P('M64 100 L77 103 L80 122 L66 122Z', mix(s.accent, '#ffffff', 0.15));
        o += P('M40 92 Q60 108 80 92 L82 102 Q60 118 38 102Z', s.accent);
        o += L('M46 100 Q60 110 74 100', light(s.accent, 0.4), 1.2, 0.7);
        o += L('M69 108 L70 120 M73 106 L74 120', dark(s.accent, 0.25), 0.9, 0.6); break;
      case 'hoodie':
        o += P('M46 88 Q60 112 74 88 L80 100 Q60 124 40 100Z', dark(c, 0.12));
        o += P('M50 90 Q60 104 70 90Z', skinD, 'none');
        o += L('M54 104 L53 117 M66 104 L67 117', '#f4f4f4', 1.6) + C(53, 118, 1.6, '#f4f4f4', INK) + C(67, 118, 1.6, '#f4f4f4', INK);
        break;
      default: // 'none' : encolure ronde
        o += P('M46 90 Q60 108 74 90Z', skinD, INK, 1);
    }
    return o;
  }

  /* ---------- visage ---------- */
  var FACE = 'M35 54 C35 36 46 28 60 28 C74 28 85 36 85 54 C85 72 74 86 60 86 C46 86 35 72 35 54Z';

  function eyes(mood, kid, glass) {
    var o = '', ry = kid ? 3.9 : 3.2, rx = kid ? 3.2 : 2.7, y = 56;
    [49, 71].forEach(function (x, i) {
      var d = i ? 1 : -1; // -1 gauche, +1 droite (côté extérieur)
      if (mood === 'delighted') {
        o += L('M' + (x - 4.5) + ' ' + (y + 1.5) + ' Q' + x + ' ' + (y - 5) + ' ' + (x + 4.5) + ' ' + (y + 1.5), INK, 2.2);
      } else {
        var r = mood === 'worried' ? ry + 0.5 : mood === 'angry' ? ry - 0.7 : ry;
        var px = mood === 'worried' ? -d * 0 : 0;
        o += E(x + px, y, rx, r, INK);
        o += C(x + px + 1, y - r * 0.4, 0.95, '#ffffff');
        if (mood === 'angry') // paupière tombante
          o += P('M' + (x - 4) + ' ' + (y - r - 0.5) + ' L' + (x + 4) + ' ' + (y - r - 0.5) + ' L' + (x - d * 4) + ' ' + (y - r + 2.6) + 'Z', 'rgba(0,0,0,0)', 'none');
        // cils légers côté extérieur
        o += L('M' + (x + d * 2.6) + ' ' + (y - r + 0.6) + ' L' + (x + d * 5) + ' ' + (y - r - 1.2), INK, 1);
        if (mood === 'happy' || mood === 'neutral')
          o += L('M' + (x + d * 2.8) + ' ' + (y - r + 1.6) + ' L' + (x + d * 5.2) + ' ' + (y - r + 0.6), INK, 0.8);
      }
    });
    return o;
  }

  function brows(mood, col) {
    var o = '', sw = 2.2;
    // [extérieur, intérieur] pour le côté gauche ; le droit est le miroir autour de x=60
    var B = {
      neutral:   ['43 48.5', '48 46', '55 48'],
      happy:     ['43 47.5', '49 44.5', '55 46.5'],
      delighted: ['43 46', '49 42', '55 44.5'],
      worried:   ['43 50', '48 47', '55 44'],
      angry:     ['43 45', '49 47', '55 51']
    }[mood];
    var d = 'M' + B[0] + ' Q' + B[1] + ' ' + B[2];
    o += L(d, col, sw);
    // miroir : on recalcule les points avec x -> 120 - x
    var m = B.map(function (p) { var q = p.split(' '); return (120 - q[0]) + ' ' + q[1]; });
    o += L('M' + m[0] + ' Q' + m[1] + ' ' + m[2], col, sw);
    return o;
  }

  function mouth(mood) {
    switch (mood) {
      case 'happy':     return L('M52 71 Q60 80 68 71', INK, 1.7) + L('M52 71 L51 69.8 M68 71 L69 69.8', INK, 1.2);
      case 'delighted': return P('M50 70 Q60 72 70 70 Q69 83 60 83 Q51 83 50 70Z', '#8c2f3f', INK, 1.4) +
        '<path d="M53 80 Q60 76 67 80 Q64 83 60 83 Q56 83 53 80Z" fill="#e9707f"/>' +
        '<path d="M52 71.2 Q60 73 68 71.2 L67.5 73.6 Q60 75 52.5 73.6Z" fill="#fff"/>';
      case 'worried':   return L('M54 75 q2 -2.4 4 0 t4 0 t4 0', INK, 1.6);
      case 'angry':     return L('M53 76.5 Q60 72.5 67 76.5', INK, 1.8);
    }
    return L('M54 74 Q60 75.5 66 74', INK, 1.6);
  }

  /* ---------- barbe ---------- */
  function beardBack(s, h, mood) {
    if (s.beard === 'full') {
      var o = P('M35 56 C35 70 40 84 60 88 C80 84 85 70 85 56 C84 64 80 66 76 66 C72 63 66 64 60 64 C54 64 48 63 44 66 C40 66 36 64 35 56Z', h);
      // zone peau autour de la bouche
      o += E(60, 75, 8.5, mood === 'delighted' ? 8 : 5.5, '__SKIN__', 'none');
      return o;
    }
    if (s.beard === 'stubble') {
      var d = '';
      for (var i = 0; i < 26; i++) { // pointillé régulier (déterministe)
        var a = (i / 25) * Math.PI;
        var x = 60 + Math.cos(a) * (14 + (i % 3) * 3), y = 66 + Math.sin(a) * (11 + (i % 2) * 3);
        d += C(x.toFixed(1), y.toFixed(1), 0.6, dark(h, 0.1)).replace('/>', ' opacity=".55"/>');
      }
      return P('M36 58 C37 74 46 85 60 86 C74 85 83 74 84 58 C80 66 76 67 72 66 C66 64 54 64 48 66 C44 67 40 66 36 58Z', h, 'none').replace('/>', ' opacity=".3"/>') + d;
    }
    return '';
  }
  function moustache(s, h) {
    if (s.beard !== 'moustache' && s.beard !== 'full') return '';
    return P('M60 67 C56 64 50 65 47 68 C49 71.5 55 70 60 69.5 C65 70 71 71.5 73 68 C70 65 64 64 60 67Z', h, s.beard === 'full' ? 'none' : INK, 1);
  }

  /* ---------- lunettes ---------- */
  function glasses(type) {
    var o = '', fr = '#2a3d5c';
    if (type === 'round') {
      o += C(49, 56, 8.6, 'rgba(190,225,255,.28)', fr) + C(71, 56, 8.6, 'rgba(190,225,255,.28)', fr);
      o += L('M57.4 55 Q60 53 62.6 55', fr, 1.4);
    } else {
      o += P('M41 49.5 H57 V60 Q57 63.5 53 63.5 H45 Q41 63.5 41 60Z', 'rgba(190,225,255,.28)', fr, 1.7);
      o += P('M63 49.5 H79 V60 Q79 63.5 75 63.5 H67 Q63 63.5 63 60Z', 'rgba(190,225,255,.28)', fr, 1.7);
      o += L('M57 53 Q60 51.5 63 53', fr, 1.5);
    }
    o += L('M40.5 55 L35.5 54', fr, 1.4) + L('M79.5 55 L84.5 54', fr, 1.4);
    // reflet
    o += L('M43.5 52.5 L46 50.8', '#ffffff', 1.1, 0.8) + L('M65.5 52.5 L68 50.8', '#ffffff', 1.1, 0.8);
    return o;
  }

  /* ---------- accessoires de tête ---------- */
  function headAcc(s, hairIsBald) {
    var a = s.accessory, col = s.accent;
    if (a === 'cap') {
      return P('M33 45 C30 20 46 12 60 12 C74 12 90 20 87 45 C74 41 46 41 33 45Z', col) +
        C(60, 12.5, 2.2, dark(col, 0.2), INK) +
        L('M60 13 L60 41', dark(col, 0.25), 0.9, 0.6) +
        L('M42 22 Q48 17 56 16', light(col, 0.4), 2, 0.6) +
        P('M30 45 Q60 59 90 45 Q82 40 60 40 Q38 40 30 45Z', dark(col, 0.18));
    }
    if (a === 'beanie') {
      return P('M33 44 C29 18 46 10 60 10 C74 10 91 18 87 44Z', col) +
        L('M44 16 Q50 12 58 12', light(col, 0.4), 2.2, 0.6) +
        P('M31 48 Q31 38 34 37 Q60 33 86 37 Q89 38 89 48 Q60 44 31 48Z', dark(col, 0.12)) +
        L('M38 38.5 L37 46 M46 37.5 L45.5 45.5 M54 37 L54 45 M62 37 L62 45 M70 37.5 L70.5 45.5 M78 38 L79 46', dark(col, 0.35), 0.8, 0.5) +
        C(60, 8, 6, light(col, 0.25), INK);
    }
    if (a === 'headband') {
      return P('M34.5 44 Q60 31 85.5 44 L85.5 49 Q60 37 34.5 49Z', col) +
        L('M42 41.5 Q60 34 78 41.5', light(col, 0.45), 1.2, 0.7);
    }
    return '';
  }

  function earrings(s) {
    if (s.accessory !== 'earrings') return '';
    return C(35, 67, 2.4, '#f2c744', INK).replace('stroke-width="1.2"', 'stroke-width="0.8"') +
      C(85, 67, 2.4, '#f2c744', INK).replace('stroke-width="1.2"', 'stroke-width="0.8"');
  }

  /* ---------- rides ---------- */
  function wrinkles(age) {
    if (age <= 55) return '';
    var op = age > 70 ? 0.5 : 0.35, c = '#7a5a4a', o = '';
    o += L('M43 38 Q50 36 56 38 M64 38 Q70 36 77 38', c, 0.9, op);          // front
    o += L('M40 53 L44 54.5 M40 58 L44 57.5 M80 53 L76 54.5 M80 58 L76 57.5', c, 0.9, op); // pattes d'oie
    o += L('M52 66 Q49 71 51 76 M68 66 Q71 71 69 76', c, 0.9, op);          // plis nasogéniens
    if (age > 70) o += L('M43 63 Q49 66 55 63 M65 63 Q71 66 77 63', c, 0.8, 0.35); // poches
    return o;
  }

  /* ---------- effets d'humeur ---------- */
  function moodFx(mood) {
    switch (mood) {
      case 'delighted': return spark(20, 30, 6) + spark(101, 24, 7) + spark(105, 50, 4) + spark(15, 56, 3.5);
      case 'worried':
        return P('M92 34 Q96 41 96 44.5 A4 4 0 0 1 88 44.5 Q88 41 92 34Z', '#bfe3ff', '#4a8fc7', 1) +
          L('M90.3 45 Q90.5 46.8 92 47.3', '#ffffff', 1, 0.9);
      case 'angry': // petite veine sur la tempe
        return L('M78 35 Q81 36 80.5 39 M84 38 Q81 39 82 42 M77.5 41 Q80.5 40 81 43 M85 43 Q82 42 80 40', '#d63d3d', 1.5);
    }
    return '';
  }

  /* ---------- assemblage ---------- */
  function svg(spec, mood, size) {
    var s = {}, k;
    for (k in DEF) s[k] = DEF[k];
    for (k in (spec || {})) if (spec[k] !== undefined) s[k] = spec[k];
    mood = Portrait.MOODS.indexOf(mood) < 0 ? 'neutral' : mood;
    size = size || 96;
    var id = ++uid, clipId = 'pclip' + id, shId = 'pshade' + id;
    var skin = s.skin, skinD = dark(skin, 0.14), h = s.hair;
    var kid = s.age < 16, wheel = s.accessory === 'wheelchair';
    var browCol = dark(h, 0.25);
    var cheek = mood === 'delighted' ? 0.5 : mood === 'happy' ? 0.32 : mood === 'angry' ? 0.3 : 0.14;
    var cheekCol = mood === 'angry' ? '#e8604f' : '#f08a8a';

    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="' + size + '" height="' + size +
      '" role="img" aria-label="portrait"><defs><clipPath id="' + clipId + '"><rect width="120" height="120" rx="26"/></clipPath>' +
      '<linearGradient id="' + shId + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".1"/>' +
      '<stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a1a10" stop-opacity=".16"/></linearGradient></defs>' +
      '<g clip-path="url(#' + clipId + ')" stroke-linejoin="round" stroke-linecap="round">';

    o += '<rect width="120" height="120" fill="' + s.bg + '"/>';
    o += E(60, 112, 46, 10, '#000', 'none').replace('/>', ' opacity=".07"/>');
    if (wheel) o += wheelchairBack();

    // buste (plus étroit pour un enfant)
    o += '<g' + (kid ? ' transform="translate(9 0) scale(.85 1)"' : '') + '>';
    o += clothesBack(s);
    o += P(BODY, s.clothes);
    o += L('M18 122 C18 104 32 96 46 93', light(s.clothes, 0.35), 2, 0.4);
    o += '</g>';
    if (wheel) o += wheelchairWheels();

    // tête (légèrement plus grosse pour un enfant)
    var tr = kid ? ' transform="translate(-3.6 -5.2) scale(1.06)"' : '';
    o += '<g' + tr + '>';
    o += hairBack(s, h);
    // cou + ombre portée du menton
    o += P('M51 76 L51 95 Q60 100 69 95 L69 76Z', skin);
    o += '<path d="M51 78 L51 92 Q60 96 69 92 L69 78 Q60 90 51 78Z" fill="' + skinD + '" opacity=".5"/>';
    o += '<path d="M51 80 Q60 96 69 80 L69 94 Q60 99 51 94Z" fill="#6a3a2a" opacity=".18"/>';
    o += L('M51 76 L51 95 M69 76 L69 95', INK, 1.1);
    o += '<g transform="translate(0 0)">' + clothesFront(s, skinD) + '</g>';

    // oreilles
    o += E(35, 58, 3.6, 5.2, skin, INK) + E(85, 58, 3.6, 5.2, skin, INK);
    o += L('M34.5 56 Q36.5 58 34.8 60.5 M85.5 56 Q83.5 58 85.2 60.5', skinD, 0.9);

    // visage
    o += P(FACE, skin);
    o += '<path d="' + FACE + '" fill="url(#' + shId + ')"/>';
    o += '<path d="M44 84 Q60 91 76 84 Q60 87 44 84Z" fill="#6a3a2a" opacity=".12"/>';
    // joues
    o += E(44, 66, 5.5, 3.4, cheekCol, 'none').replace('/>', ' opacity="' + cheek + '"/>');
    o += E(76, 66, 5.5, 3.4, cheekCol, 'none').replace('/>', ' opacity="' + cheek + '"/>');
    if (s.freckles) {
      var fp = [[43, 62], [47, 64], [44.5, 66.5], [50, 62.5], [77, 62], [73, 64], [75.5, 66.5], [70, 62.5], [46, 60.5], [74, 60.5]];
      fp.forEach(function (p) { o += C(p[0], p[1], 0.75, '#b8704a').replace('/>', ' opacity=".8"/>'); });
    }
    // nez discret
    o += L('M59 59 Q56.8 65 59 67 Q61 68.2 63.2 66.5', mix(skin, INK, 0.45), 1.2);
    o += L('M63.5 60 Q64.8 63 63.8 65', light(skin, 0.4), 1, 0.7);
    o += wrinkles(s.age);
    o += eyes(mood, kid);

    // barbe / moustache / bouche
    var bb = beardBack(s, h, mood).replace('__SKIN__', skin);
    o += bb + moustache(s, h) + mouth(mood);
    if (s.beard === 'full') o += L('M44 67 Q50 64 56 66.5 M64 66.5 Q70 64 76 67', light(h, 0.3), 1, 0.4);

    if (s.glasses) o += glasses(s.glasses);
    o += hairFront(s, h);
    if (s.accessory === 'cap' || s.accessory === 'beanie') {
      // cheveux dépassant sous le couvre-chef : on ne redessine que la calotte
    }
    o += brows(mood, browCol);
    o += headAcc(s);
    o += earrings(s);
    o += moodFx(mood);
    o += '</g>';

    o += '</g>';
    // contour doux du fond
    o += '<rect x=".6" y=".6" width="118.8" height="118.8" rx="25.5" fill="none" stroke="' + INK + '" stroke-opacity=".25" stroke-width="1.2"/>';
    return o + '</svg>';
  }

  /* ---------- jeu d'exemples (12) ---------- */
  var SAMPLES = [
    /* 0 */ { skin: '#f2c9a5', hair: '#2e2118', age: 34, hairStyle: 'long', glasses: 'round', clothes: '#c0583f', collar: 'scarf', accent: '#e9c46a', accessory: 'earrings' },
    /* 1 */ { skin: '#a8714b', hair: '#1c1512', age: 38, hairStyle: 'short', beard: 'stubble', clothes: '#34495e', collar: 'tie', accent: '#c0392b' },
    /* 2 */ { skin: '#e8b890', hair: '#6b4226', age: 42, hairStyle: 'side', beard: 'moustache', clothes: '#4f8a6b', collar: 'shirt', accessory: 'wheelchair' },
    /* 3 */ { skin: '#f4d3b8', hair: '#cfd2d6', age: 74, hairStyle: 'bun', glasses: 'round', clothes: '#8e6bb0', collar: 'shirt' },
    /* 4 */ { skin: '#f6d2b0', hair: '#b5651d', age: 13, hairStyle: 'spiky', freckles: true, clothes: '#e07a2f', collar: 'hoodie' },
    /* 5 */ { skin: '#8d5a3b', hair: '#2a1a12', age: 33, hairStyle: 'bald', beard: 'full', clothes: '#3d6fb5', collar: 'hoodie', accessory: 'beanie', accent: '#d4574a' },
    /* 6 */ { skin: '#efc29c', hair: '#c9ccd1', age: 71, hairStyle: 'bald', beard: 'moustache', glasses: 'square', clothes: '#6b6f78', collar: 'tie', accent: '#2f6f8f' },
    /* 7 */ { skin: '#6e4129', hair: '#1a110c', age: 28, hairStyle: 'afro', clothes: '#e8c547', collar: 'none', accessory: 'headband', accent: '#d4574a' },
    /* 8 */ { skin: '#f7d9c2', hair: '#b4412a', age: 25, hairStyle: 'bob', freckles: true, clothes: '#2f8f83', collar: 'shirt' },
    /* 9 */ { skin: '#f0c7a0', hair: '#d9b45f', age: 46, hairStyle: 'ponytail', glasses: 'square', clothes: '#5a5fb0', collar: 'shirt' },
    /* 10 */ { skin: '#c68e63', hair: '#3b2a20', age: 52, hairStyle: 'curly', beard: 'full', clothes: '#7a4e3a', collar: 'tie', accent: '#e9c46a' },
    /* 11 */ { skin: '#f2c9a5', hair: '#3a2b22', age: 22, hairStyle: 'short', beard: 'stubble', clothes: '#4a4f58', collar: 'hoodie', accessory: 'cap', accent: '#2f80c4' }
  ];

  var Portrait = window.Portrait = {
    svg: svg,
    MOODS: ['neutral', 'happy', 'delighted', 'worried', 'angry'],
    SAMPLES: SAMPLES
  };
})();

