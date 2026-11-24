/* The walkthrough for the P vs NP episode. walk.js makes the stage and the buttons; this file is the six steps.
   Any <div data-extra="pvsnp"> on a page gets it. */
(function () {
  var mine = document.currentScript ? document.currentScript.src : 'extras/pvsnp.js';

  /* ---- The Sudoku, solved the slow way so the steps have real numbers to show ---- */
  var PUZZLE = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
  var start = PUZZLE.split('').map(function (c) { return c === '.' ? 0 : +c; });
  // Every digit the solver wrote, as cell * 10 + digit, and every one it took back, as cell * 10.
  var moves = [];
  function fits(b, i, d) {
    var r = (i / 9) | 0, c = i % 9, br = r - r % 3, bc = c - c % 3, k;
    for (k = 0; k < 9; k++) {
      if (b[r * 9 + k] === d || b[k * 9 + c] === d || b[(br + ((k / 3) | 0)) * 9 + bc + k % 3] === d) return false;
    }
    return true;
  }
  function solve(b) {
    var i = b.indexOf(0), d;
    if (i < 0) return true;
    for (d = 1; d <= 9; d++) {
      if (!fits(b, i, d)) continue;
      b[i] = d; moves.push(i * 10 + d);
      if (solve(b)) return true;
      b[i] = 0; moves.push(i * 10);
    }
    return false;
  }
  var solved = start.slice();
  solve(solved);
  var wrote = [0], tookBack = [0];
  moves.forEach(function (m, k) { wrote.push(wrote[k] + (m % 10 ? 1 : 0)); tookBack.push(tookBack[k] + (m % 10 ? 0 : 1)); });
  function boardAfter(k) {
    var b = start.slice(), j;
    for (j = 0; j < k; j++) b[(moves[j] / 10) | 0] = moves[j] % 10;
    return b;
  }
  // The 27 things to check: nine rows, nine columns, nine boxes.
  function group(k) {
    var cells = [], j, n = k % 9;
    for (j = 0; j < 9; j++) {
      if (k < 9) cells.push(n * 9 + j);
      else if (k < 18) cells.push(j * 9 + n);
      else cells.push((((n / 3) | 0) * 3 + ((j / 3) | 0)) * 9 + (n % 3) * 3 + j % 3);
    }
    return cells;
  }

  // The grid on the left, and the room beside it for a few numbers.
  function lay(g) {
    var S = Math.min(g.h - 32, g.w * .56), x = 16, y = (g.h - S) / 2;
    return { x: x, y: y, S: S, px: x + S + 22, pw: g.w - (x + S + 22) - 16 };
  }
  // o.tint: cells to shade. o.at: the cell being worked on. o.plain: every digit in ink, none in gold.
  function grid(g, L, b, o) {
    var ctx = g.ctx, x = L.x, y = L.y, S = L.S, c = S / 9, k, i;
    g.box(x, y, S, S, 6, g.C.ground);
    ctx.save();
    g.round(x, y, S, S, 6); ctx.clip();
    (o.tint || []).forEach(function (i) { ctx.fillStyle = g.gold(.2); ctx.fillRect(x + (i % 9) * c, y + ((i / 9) | 0) * c, c, c); });
    if (o.at != null) { ctx.fillStyle = g.gold(.2); ctx.fillRect(x + (o.at % 9) * c, y + ((o.at / 9) | 0) * c, c, c); }
    ctx.restore();
    for (k = 1; k < 9; k++) {
      var heavy = k % 3 === 0, col = heavy ? g.ink(.5) : g.ink(.13), lw = heavy ? 1.5 : 1;
      g.line(x + k * c, y, x + k * c, y + S, col, lw);
      g.line(x, y + k * c, x + S, y + k * c, col, lw);
    }
    g.box(x, y, S, S, 6, null, g.ink(.6), 1.5);
    for (i = 0; i < 81; i++) {
      if (!b[i]) continue;
      var given = o.plain || start[i];
      g.text(b[i], x + (i % 9 + .5) * c, y + (((i / 9) | 0) + .5) * c + .5,
        { size: c * .54, weight: 600, color: given ? g.C.ink : g.C.gold, align: 'center' });
    }
  }
  function row(g, L, y, label, value, done) {
    g.text(label, L.px, y, { size: 13, weight: 600, color: g.C.ink });
    g.text(value, L.px + L.pw, y, { size: 13, weight: done ? 800 : 500, color: done ? g.C.gold : g.C.muted, align: 'right' });
  }

  /* ---- Easy to solve, easy to check ---- */
  var EASY = ['Sorting a list', 'Multiplying', 'Shortest route'], HARD = ['Sudoku', 'Routing', 'Scheduling'];
  function zones(g) {
    var o = { x: 16, y: 16, w: g.w - 32, h: g.h - 32 };
    var p = { x: o.x + 16, y: o.y + 52, w: Math.round(o.w * .46), h: o.h - 68 };
    var rx = p.x + p.w + 14, rw = o.x + o.w - 14 - rx;
    return { o: o, p: p, pcx: p.x + p.w / 2, rcx: rx + rw / 2, y0: p.y + 72, dy: 40 };
  }
  function pop(g, label, x, y, p, o) {
    g.fade(p, function () { g.grow(x, y, .86 + .14 * g.ease(p), function () { g.chip(label, x, y, o); }); });
  }

  /* ---- Rewriting one problem as another ---- */
  var KINDS = [['Map coloring', 270], ['Routing', 342], ['Scheduling', 54], ['Packing', 126], ['Sudoku', 198]];
  // How far from the middle of a box you have to go, in direction (ux, uy), to be clear of it.
  function clear(hw, hh, ux, uy) { return Math.min(ux ? hw / Math.abs(ux) : 1e9, uy ? hh / Math.abs(uy) : 1e9); }

  /* ---- Determinant and permanent of a 3 by 3 grid: the six ways to pick one letter from each row and column ---- */
  var LETTERS = 'abcdefghi';
  var TERMS = [['aei', 1], ['afh', -1], ['bdi', -1], ['bfg', 1], ['cdh', 1], ['ceg', -1]];

  function steps() {
    return [
      {
        title: 'Checking a finished Sudoku is quick',
        text: 'Hand a computer a filled-in Sudoku and it can tell you whether it’s right by looking once at each row, each column and each box. That is 27 short checks, and the work grows gently as the grid gets bigger.',
        at: 81, len: 6,
        alt: 'A solved Sudoku. A highlight passes over each row, then each column, then each box, and a count reaches 27 checks.',
        draw: function (g, t) {
          var L = lay(g), k = Math.floor((t - .5) / .17), done = Math.max(0, Math.min(27, k));
          grid(g, L, solved, { plain: true, tint: k >= 0 && k < 27 ? group(k) : [] });
          var y = L.y + 22, n;
          [['Rows', 0], ['Columns', 9], ['Boxes', 18]].forEach(function (r, i) {
            n = Math.max(0, Math.min(9, done - r[1]));
            row(g, L, y + i * 30, r[0], n + ' of 9', n === 9);
            g.line(L.px, y + i * 30 + 15, L.px + L.pw, y + i * 30 + 15, g.ink(.12), 1);
          });
          g.fade(g.part(t, 5.1, 5.6), function () {
            g.text('27 checks', L.px, y + 122, { size: 22, weight: 800, color: g.C.gold });
            g.text('No digit repeats.', L.px, y + 150, { size: 12.5, color: g.C.body });
            g.text('The answer is right.', L.px, y + 168, { size: 12.5, color: g.C.body });
          });
        }
      },
      {
        title: 'Solving one is a search',
        text: 'Finding the answer is a different job. The obvious program writes a digit that fits, carries on until it gets stuck, then goes back and tries the next one. This puzzle takes it ' + wrote[moves.length].toLocaleString('en-US') + ' tries. On a bigger grid the number of tries grows out of all proportion.',
        at: 164, len: 10,
        alt: 'The same Sudoku with its empty squares. A program fills them in a digit at a time, wiping digits out when it gets stuck, while a count of tries climbs into the thousands.',
        draw: function (g, t) {
          var L = lay(g), M = moves.length, k = Math.round(M * Math.pow(g.part(t, .4, 9.3), 3.2));
          var busy = k > 0 && k < M;
          grid(g, L, boardAfter(k), { at: busy ? (moves[k - 1] / 10) | 0 : null });
          var y = L.y + 16;
          g.text('Digits tried', L.px, y, { size: 12.5, color: g.C.muted });
          g.text(g.num(wrote[k]), L.px, y + 28, { size: 30, weight: 800, color: g.C.gold });
          g.text('Taken back', L.px, y + 72, { size: 12.5, color: g.C.muted });
          g.text(g.num(tookBack[k]), L.px, y + 96, { size: 22, weight: 800, color: g.C.ink });
          g.fade(k === M ? g.part(t, 9.3, 9.8) : 0, function () {
            g.text('Solved.', L.px, y + 146, { size: 14, weight: 800, color: g.C.gold });
          });
        }
      },
      {
        title: 'P and NP',
        text: 'P is every problem a computer can solve quickly. NP is every problem where a proposed answer can be checked quickly. Anything in P is also in NP. The open question is whether the hard-looking ones really sit outside P, or whether a quick way to solve them exists and nobody has found it.',
        at: 228, len: 4.8,
        alt: 'A large box labeled NP with a smaller box labeled P inside it. Sorting, multiplying and shortest route sit inside P. Sudoku, routing and scheduling sit in NP outside P, marked as unknown.',
        draw: function (g, t) {
          var z = zones(g), o = z.o, p = z.p;
          g.fade(g.ease(g.part(t, 0, .5)), function () { g.box(o.x, o.y, o.w, o.h, 18, g.C.ground, g.ink(.55), 1.5); });
          g.fade(g.part(t, .3, .8), function () {
            var w = g.text('NP', o.x + 18, o.y + 27, { size: 20, weight: 800, color: g.C.ink });
            g.text('an answer is quick to check', o.x + 28 + w, o.y + 28, { size: 12.5, color: g.C.muted });
          });
          g.fade(g.ease(g.part(t, .9, 1.4)), function () {
            g.box(p.x, p.y, p.w, p.h, 14, g.gold(.1), g.C.gold, 1.5);
            var w = g.text('P', p.x + 16, p.y + 26, { size: 20, weight: 800, color: g.C.gold });
            g.text('quick to solve', p.x + 26 + w, p.y + 27, { size: 12.5, color: g.C.muted });
          });
          EASY.forEach(function (s, i) { pop(g, s, z.pcx, z.y0 + i * z.dy, g.part(t, 1.6 + i * .3, 1.95 + i * .3), { stroke: g.C.gold }); });
          HARD.forEach(function (s, i) { pop(g, s, z.rcx, z.y0 + i * z.dy, g.part(t, 2.7 + i * .3, 3.05 + i * .3), { dash: [4, 3] }); });
          g.fade(g.part(t, 3.9, 4.5), function () {
            g.text('Quick to solve? Nobody knows.', z.rcx, p.y + p.h - 16, { size: 12, italic: true, color: g.C.muted, align: 'center' });
          });
        }
      },
      {
        title: 'One master key',
        text: 'In 1971 Stephen Cook showed that every problem in NP can be rewritten as one logic puzzle, called SAT. A year later Richard Karp showed that 21 well-known hard problems can be rewritten as each other. So Sudoku, routing and scheduling are the same problem in disguise.',
        at: 572, len: 5.6,
        alt: 'Five problems, map coloring, routing, scheduling, packing and Sudoku, arranged around a box labeled SAT. Arrows run from each problem into SAT, then back out again, and lines join the problems to each other.',
        draw: function (g, t) {
          var cx = g.w / 2, cy = 150, rx = g.w * .36, ry = 104, hw = 55, hh = 24;
          var at = KINDS.map(function (k) { var a = k[1] * Math.PI / 180; return { label: k[0], x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
          // the problems rewritten as each other
          at.forEach(function (a, i) {
            var b = at[(i + 1) % at.length];
            g.fade(g.part(t, 3.6, 4.4) * .45, function () { g.line(a.x, a.y, b.x, b.y, g.C.gold, 1.25, [3, 4]); });
          });
          at.forEach(function (a, i) {
            var w = g.wide(a.label, { size: 12.5, weight: 600 }) + 26;
            var dx = cx - a.x, dy = cy - a.y, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
            var from = clear(w / 2 + 5, 19, ux, uy), to = len - clear(hw + 5, hh + 5, ux, uy);
            var out = g.part(t, 3.0 + i * .18, 3.5 + i * .18);
            g.arrow(a.x + ux * from, a.y + uy * from, a.x + ux * to, a.y + uy * to,
              g.ease(g.part(t, .9 + i * .25, 1.5 + i * .25)), out ? g.C.gold : g.ink(.6), 1.5, out);
          });
          g.fade(g.ease(g.part(t, .3, .8)), function () {
            g.box(cx - hw, cy - hh, hw * 2, hh * 2, 10, g.gold(.1), g.C.gold, 1.5);
            g.text('SAT', cx, cy - 7, { size: 15, weight: 800, color: g.C.gold, align: 'center' });
            g.text('one logic puzzle', cx, cy + 10, { size: 10.5, color: g.C.muted, align: 'center' });
          });
          at.forEach(function (a, i) { pop(g, a.label, a.x, a.y, g.part(t, .1 + i * .12, .5 + i * .12)); });
          g.fade(g.part(t, .9, 1.4) * (1 - g.part(t, 2.8, 3.1)), function () { g.text('1971, Cook', 20, 26, { size: 12, color: g.C.muted }); });
          g.fade(g.part(t, 3.1, 3.5), function () { g.text('1972, Karp', 20, 26, { size: 12, color: g.C.muted }); });
          g.fade(g.part(t, 4.7, 5.3), function () {
            g.text('A fast way to solve one is a fast way to solve them all.', cx, 298, { size: 12.5, weight: 600, color: g.C.gold, align: 'center' });
          });
        }
      },
      {
        title: 'If P equals NP',
        text: 'Then the outer box collapses into the inner one, and anything quick to check is quick to solve. Most of the encryption in use today could be broken, and finding a route, a schedule or even a mathematical proof would be about as easy as checking one. Most researchers expect the opposite. Nobody has proved it either way.',
        at: 722, len: 4.2,
        alt: 'The same two boxes. The inner box labeled P grows until it fills the outer box labeled NP, and the label becomes P equals NP. Sudoku, routing and scheduling are no longer marked unknown.',
        draw: function (g, t) {
          var z = zones(g), o = z.o, p = z.p, m = g.ease(g.part(t, .9, 2.7));
          function mix(a, b) { return a + (b - a) * m; }
          var x = mix(p.x, o.x), y = mix(p.y, o.y), w = mix(p.w, o.w), h = mix(p.h, o.h), turned = g.part(t, 1.7, 2.3);
          g.box(o.x, o.y, o.w, o.h, 18, g.C.ground, g.ink(.55), 1.5);
          g.fade(1 - g.part(t, .9, 1.5), function () {
            var nw = g.text('NP', o.x + 18, o.y + 27, { size: 20, weight: 800, color: g.C.ink });
            g.text('an answer is quick to check', o.x + 28 + nw, o.y + 28, { size: 12.5, color: g.C.muted });
            g.text('Quick to solve? Nobody knows.', z.rcx, p.y + p.h - 16, { size: 12, italic: true, color: g.C.muted, align: 'center' });
          });
          g.box(x, y, w, h, mix(14, 18), g.gold(.1), g.C.gold, 1.5);
          g.fade(1 - g.part(t, 2.1, 2.5), function () {
            var pw = g.text('P', x + 16, y + 26, { size: 20, weight: 800, color: g.C.gold });
            g.text('quick to solve', x + 26 + pw, y + 27, { size: 12.5, color: g.C.muted });
          });
          g.fade(g.part(t, 2.5, 3.0), function () {
            var ew = g.text('P = NP', o.x + 18, o.y + 27, { size: 20, weight: 800, color: g.C.gold });
            g.text('quick to check is quick to solve', o.x + 28 + ew, o.y + 28, { size: 12.5, color: g.C.muted });
          });
          EASY.forEach(function (s, i) { g.chip(s, z.pcx, z.y0 + i * z.dy, { stroke: g.C.gold }); });
          HARD.forEach(function (s, i) {
            g.fade(1 - turned, function () { g.chip(s, z.rcx, z.y0 + i * z.dy, { dash: [4, 3] }); });
            g.fade(turned, function () { g.chip(s, z.rcx, z.y0 + i * z.dy, { stroke: g.C.gold }); });
          });
          g.fade(g.part(t, 3.2, 3.8), function () {
            g.text('Encryption breaks. Search gets easy.', o.x + o.w / 2, o.y + o.h - 24, { size: 12.5, weight: 600, color: g.C.ink, align: 'center' });
          });
        }
      },
      {
        title: 'The algebraic cousin: VP vs VNP',
        text: 'The determinant and the permanent of a grid of numbers have almost the same formula. One has minus signs and the other doesn’t. The determinant has a fast shortcut. Nobody has found one for the permanent. VP vs VNP asks whether one can exist, and the proof Anthropic posted a few hours before this episode claims it can’t.',
        at: 899, len: 6.4,
        alt: 'A three by three grid of the letters a to i. Six products of three letters appear one at a time in two formulas. In the determinant, three of them are subtracted. In the permanent, all six are added.',
        draw: function (g, t) {
          var cs = 46, M = cs * 3, slot = 62, x = (g.w - (M + 34 + slot * 3)) / 2, y = (g.h - M) / 2, x2 = x + M + 34, y1 = (g.h - 150) / 2;
          var n = Math.floor((t - .5) / .8), live = n >= 0 && n < 6 ? TERMS[n][0] : '';
          // On a wide stage the whole picture is drawn larger.
          g.grow(g.w / 2, g.h / 2, Math.min(1.35, (g.w - 40) / 380), function () {
          g.box(x, y, M, M, 8, g.C.ground, g.ink(.5), 1.5);
          LETTERS.split('').forEach(function (ch, i) {
            var cx = x + (i % 3 + .5) * cs, cy = y + (((i / 3) | 0) + .5) * cs, on = live.indexOf(ch) >= 0;
            if (on) g.box(cx - cs / 2 + 4, cy - cs / 2 + 4, cs - 8, cs - 8, 8, g.gold(.2), g.C.gold, 1.25);
            g.text(ch, cx, cy, { size: 18, weight: on ? 800 : 500, italic: true, color: on ? g.C.gold : g.C.ink, align: 'center' });
          });
          [['Determinant', true, 'a fast shortcut'], ['Permanent', false, 'no shortcut known']].forEach(function (f, r) {
            var top = y1 + r * 92;
            g.text(f[0], x2, top, { size: 12.5, weight: 800, color: g.C.ink });
            g.fade(g.part(t, 5.5, 6.1), function () {
              g.text(f[2], x2 + slot * 3 - 4, top, { size: 12, weight: f[1] ? 600 : 500, italic: !f[1], color: f[1] ? g.C.gold : g.C.muted, align: 'right' });
            });
            TERMS.forEach(function (term, i) {
              var a = g.part(t, .5 + i * .8, .8 + i * .8), tx = x2 + (i % 3) * slot, ty = top + 26 + ((i / 3) | 0) * 24;
              var minus = f[1] && term[1] < 0;
              g.fade(a, function () {
                g.text(minus ? '−' : '+', tx, ty, { size: 14, mono: true, weight: minus ? 800 : 500, color: minus ? g.C.gold : g.C.muted });
                g.text(term[0], tx + 15, ty, { size: 14, mono: true, weight: 600, color: i === n ? g.C.gold : g.C.ink });
              });
            });
          });
          });
        }
      }
    ];
  }

  function go() { window.Walk('pvsnp', { label: 'P vs NP in six steps', steps: steps() }); }
  if (window.Walk) go();
  else {
    // walk.js sits next to this file.
    var s = document.createElement('script');
    s.src = mine.replace(/[^\/]*$/, 'walk.js');
    s.onload = go;
    document.head.appendChild(s);
  }
})();
