/* The two walkthroughs on the VP vs VNP page (vp/index.html). walk.js makes the stage and the buttons; this
   file is the steps. <div data-extra="vp-formulas"> gets the first and <div data-extra="vp-classes"> the second. */
(function () {
  var mine = document.currentScript ? document.currentScript.src : 'extras/vp.js';

  /* ---- A 3 by 3 grid: the six ways to pick one cell from each row with no two in a column ---- */
  // Each is the column picked in rows 1, 2 and 3, and the sign the determinant gives it.
  var PICKS = [[[0, 1, 2], 1], [[0, 2, 1], -1], [[1, 0, 2], -1], [[1, 2, 0], 1], [[2, 0, 1], 1], [[2, 1, 0], -1]];
  var LETTERS = 'abcdefghi';
  function cells(pick) { return pick.map(function (c, r) { return r * 3 + c; }); }
  function name(pick) { return cells(pick).map(function (i) { return LETTERS[i]; }).join(''); }
  // The permanent of a grid, or its determinant if signed.
  function total(m, signed) {
    return PICKS.reduce(function (sum, p) { return sum + (signed ? p[1] : 1) * m[0][p[0][0]] * m[1][p[0][1]] * m[2][p[0][2]]; }, 0);
  }

  // The grid the shortcut is shown on, and what it looks like after each move: row `to` minus k times row `from`.
  var A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]];
  var MOVES = [[1, 0, 2], [2, 0, 4], [2, 1, 3]];
  var STAGES = [A];
  MOVES.forEach(function (mv) {
    var m = STAGES[STAGES.length - 1];
    STAGES.push(m.map(function (row, r) { return r === mv[0] ? row.map(function (v, c) { return v - mv[2] * m[mv[1]][c]; }) : row.slice(); }));
  });
  function moveText(mv) { return 'row ' + (mv[0] + 1) + ' − ' + mv[2] + ' × row ' + (mv[1] + 1); }
  var LAST = STAGES[3], DIAGONAL = [LAST[0][0], LAST[1][1], LAST[2][2]];

  // Who can do which job. A 1 means yes.
  var JOBS = [[1, 1, 0], [1, 1, 1], [0, 1, 1]];
  var WORKS = PICKS.map(function (p) { return p[0].every(function (c, r) { return JOBS[r][c] === 1; }); });
  var WAYS = [0];
  WORKS.forEach(function (w, k) { WAYS.push(WAYS[k] + (w ? 1 : 0)); });

  // How many picks an n by n grid has: n factorial.
  var SIZES = [2, 3, 4, 5, 10, 20], WORDS = { 10: '3.6 million', 20: '2.4 quintillion' };
  function factorial(n) { for (var f = 1, i = 2; i <= n; i++) f *= i; return f; }

  // The picture is laid out for the narrowest stage and drawn larger on a wider one, up to `most` times.
  function fit(g, most, fn) { g.grow(g.w / 2, g.h / 2, Math.min(most, (g.w - 40) / 380), fn); }

  // o.hot: cells to light up. o.bad: cells to mark as no good. o.row: a row to shade.
  // o.swap: { row, to, p } fades that row's numbers into the numbers in `to`. o.zeros: 0s are drawn faint. o.italic: for letters.
  function grid(g, x, y, cs, m, o) {
    o = o || {};
    var M = cs * 3;
    g.box(x, y, M, M, 8, g.C.ground, g.ink(.5), 1.5);
    if (o.row != null) g.box(x + 4, y + o.row * cs + 4, M - 8, cs - 8, 7, g.gold(.16));
    m.forEach(function (row, r) {
      row.forEach(function (v, c) {
        var cx = x + (c + .5) * cs, cy = y + (r + .5) * cs, i = r * 3 + c;
        var on = (o.hot || []).indexOf(i) >= 0, bad = (o.bad || []).indexOf(i) >= 0;
        if (on) g.box(cx - cs / 2 + 4, cy - cs / 2 + 4, cs - 8, cs - 8, 7, g.gold(.2), g.C.gold, 1.25);
        if (bad) g.box(cx - cs / 2 + 4, cy - cs / 2 + 4, cs - 8, cs - 8, 7, null, g.ink(.45), 1.25, [3, 3]);
        function write(n, a) {
          g.fade(a, function () {
            g.text(n, cx, cy + .5, { size: cs * .4, weight: on ? 800 : 600, italic: o.italic, color: on ? g.C.gold : (n === 0 && o.zeros ? g.C.muted : g.C.ink), align: 'center' });
          });
        }
        if (o.swap && o.swap.row === r) { write(v, 1 - o.swap.p); write(o.swap.to[c], o.swap.p); }
        else write(v, 1);
      });
    });
  }

  /* ---- Circuits: a formula drawn as the additions and multiplications it takes ---- */
  function wire(g, a, b, p) { g.fade(p, function () { g.line(a[0], a[1] - 14, b[0], b[1] + 14, g.ink(.35), 1.25); }); }
  function gate(g, at, sign, p) {
    g.fade(p, function () {
      g.grow(at[0], at[1], .8 + .2 * g.ease(p), function () {
        g.dot(at[0], at[1], 14, g.C.ground, sign === '×' ? g.C.gold : g.ink(.6), 1.5);
        g.text(sign, at[0], at[1] + .5, { size: 16, weight: 800, color: sign === '×' ? g.C.gold : g.C.ink, align: 'center' });
      });
    });
  }
  function input(g, at, letter) {
    g.box(at[0] - 12, at[1] - 12, 24, 24, 6, g.C.ground, g.ink(.35), 1);
    g.text(letter, at[0], at[1], { size: 14, weight: 600, italic: true, color: g.C.ink, align: 'center' });
  }
  function count(n) { return n + (n === 1 ? ' step' : ' steps'); }

  /* ---- Two boxes, one inside the other ---- */
  function zones(g) {
    var o = { x: 16, y: 16, w: g.w - 32, h: g.h - 32 };
    var p = { x: o.x + 16, y: o.y + 52, w: Math.round(o.w * .46), h: o.h - 68 };
    var rx = p.x + p.w + 14, rw = o.x + o.w - 14 - rx;
    return { o: o, p: p, pcx: p.x + p.w / 2, rcx: rx + rw / 2, y0: p.y + 82, dy: 42 };
  }
  function pop(g, label, x, y, p, o) {
    var size;
    g.fade(p, function () { g.grow(x, y, .86 + .14 * g.ease(p), function () { size = g.chip(label, x, y, o); }); });
    return size;
  }

  var TABLE = [
    ['What it asks about', 'yes-or-no questions', 'formulas'],
    ['The easy side', 'P: quick to solve', 'VP: cheap to compute'],
    ['The hard-looking side', 'NP: quick to check', 'VNP: sums of cheap pieces'],
    ['The hardest member', 'SAT, and Sudoku with it', 'the permanent'],
    ['Where it stands', 'open since 1971', 'proof claimed, 2026']
  ];

  function formulas() {
    return [
      {
        title: 'Two formulas, one sign apart',
        text: 'Take a square grid of numbers. Pick one number from each row so that no two share a column, and multiply the picks together. Do that for every possible pick. Add all the products and you have the permanent. Give half of them a minus sign first and you have the determinant.',
        at: 899, len: 6.4,
        alt: 'A three by three grid of the letters a to i. Six products of three letters appear one at a time in two formulas. In the determinant, three of them are subtracted. In the permanent, all six are added.',
        draw: function (g, t) {
          var cs = 46, M = cs * 3, slot = 62, x = (g.w - (M + 34 + slot * 3)) / 2, y = (g.h - M) / 2, x2 = x + M + 34, y1 = (g.h - 150) / 2;
          var n = Math.floor((t - .5) / .8);
          fit(g, 1.35, function () {
            grid(g, x, y, cs, [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']], { italic: true, hot: n >= 0 && n < 6 ? cells(PICKS[n][0]) : [] });
            [['Determinant', true], ['Permanent', false]].forEach(function (f, r) {
              var top = y1 + r * 92;
              g.text(f[0], x2, top, { size: 12.5, weight: 800, color: g.C.ink });
              PICKS.forEach(function (p, i) {
                var tx = x2 + (i % 3) * slot, ty = top + 26 + ((i / 3) | 0) * 24, minus = f[1] && p[1] < 0;
                g.fade(g.part(t, .5 + i * .8, .8 + i * .8), function () {
                  g.text(minus ? '−' : '+', tx, ty, { size: 14, mono: true, weight: minus ? 800 : 500, color: minus ? g.C.gold : g.C.muted });
                  g.text(name(p[0]), tx + 15, ty, { size: 14, mono: true, weight: 600, color: i === n ? g.C.gold : g.C.ink });
                });
              });
            });
          });
        }
      },
      {
        title: 'The picks pile up',
        text: 'A 3 by 3 grid has 6 possible picks. A 20 by 20 grid has about 2.4 quintillion. Working through them one at a time is hopeless for a grid of any real size, so everything depends on finding a shortcut.',
        len: 5.2,
        alt: 'A table of grid sizes and how many picks each has. 2 by 2 has 2, 3 by 3 has 6, 4 by 4 has 24, 5 by 5 has 120, 10 by 10 has 3,628,800 and 20 by 20 has 2,432,902,008,176,640,000.',
        draw: function (g, t) {
          var x = 24, nx = x + 70;
          g.text('Grid', x, 26, { size: 12, color: g.C.muted });
          g.text('Possible picks', nx, 26, { size: 12, color: g.C.muted });
          g.line(x, 42, g.w - 24, 42, g.ink(.14), 1);
          SIZES.forEach(function (n, i) {
            var t0 = .3 + i * .65, p = g.part(t, t0, t0 + .7), y = 66 + i * 42, f = factorial(n);
            g.fade(g.part(t, t0, t0 + .25), function () {
              g.text(n + ' by ' + n, x, y, { size: 13, weight: 600, color: g.C.ink });
              var w = g.text(g.num(p === 1 ? f : f * Math.pow(p, 3)), nx, y, { size: 13, mono: true, weight: 800, color: g.C.gold });
              if (WORDS[n]) g.fade(g.part(t, t0 + .7, t0 + 1), function () { g.text(WORDS[n], nx + w + 10, y, { size: 11.5, color: g.C.muted }); });
            });
          });
        }
      },
      {
        title: 'The determinant has a shortcut',
        text: 'Subtracting a multiple of one row from another never changes the determinant. So you can clear out everything below the diagonal, then multiply the three numbers left on the diagonal. For a 20 by 20 grid that is a few thousand steps where adding up every pick would take quintillions.',
        len: 7.2,
        alt: 'A grid of numbers with rows 2 1 1, 4 3 3 and 8 7 9. Three row subtractions turn everything below the diagonal into zeros. The diagonal then reads 2, 1, 2, and multiplying those gives the determinant, 4.',
        draw: function (g, t) {
          var cs = 52, M = cs * 3, x = (g.w - (M + 30 + 170)) / 2, y = (g.h - M) / 2, x2 = x + M + 30, y1 = y + 30;
          var k = Math.floor((t - .9) / 1.5), busy = k >= 0 && k < 3, done = g.part(t, 5.5, 5.8);
          var stage = STAGES[Math.max(0, Math.min(3, k))];
          fit(g, 1.35, function () {
            g.fade(g.part(t, 0, .5), function () {
              grid(g, x, y, cs, stage, {
                zeros: true, row: busy ? MOVES[k][0] : null, hot: done ? [0, 4, 8] : [],
                swap: busy ? { row: MOVES[k][0], to: STAGES[k + 1][MOVES[k][0]], p: g.part(t, 1.5 + k * 1.5, 1.9 + k * 1.5) } : null
              });
            });
            g.fade(g.part(t, .4, .9), function () { g.text('Clear below the diagonal', x2, y1 - 26, { size: 12, color: g.C.muted }); });
            MOVES.forEach(function (mv, i) {
              g.fade(g.part(t, .9 + i * 1.5, 1.2 + i * 1.5), function () {
                g.text(moveText(mv), x2, y1 + i * 25, { size: 13, mono: true, weight: 600, color: i === k ? g.C.gold : g.C.ink });
              });
            });
            g.fade(g.part(t, 5.7, 6.2), function () {
              g.text(DIAGONAL.join(' × ') + ' = ' + total(A, true), x2, y1 + 92, { size: 14, mono: true, weight: 600, color: g.C.ink });
            });
            g.fade(g.part(t, 6.3, 6.8), function () {
              g.text('Determinant: ' + total(A, true), x2, y1 + 120, { size: 15, weight: 800, color: g.C.gold });
            });
          });
        }
      },
      {
        title: 'The shortcut breaks for the permanent',
        text: 'Try the same move on the permanent and the answer changes, here from ' + total(A, false) + ' to ' + total(STAGES[1], false) + '. The minus signs were what made the trick work. Without them, the best method anyone has found still takes about 2ⁿ steps for an n by n grid, so the work roughly doubles every time the grid grows by one row.',
        len: 5.6,
        alt: 'The same grid before and after one row subtraction. The determinant is 4 both times. The permanent changes from 208 to 48.',
        draw: function (g, t) {
          var cs = 38, M = cs * 3, gap = 84, x = (g.w - (M * 2 + gap)) / 2, xr = x + M + gap, y = 34, B = STAGES[1];
          function values(mx, m, a, b, moved) {
            [['determinant', total(m, true), a, false], ['permanent', total(m, false), b, moved]].forEach(function (v, i) {
              g.fade(v[2], function () {
                g.text(v[0], mx + 16, y + M + 30 + i * 26, { size: 12, color: g.C.muted, align: 'right' });
                g.text(v[1], mx + 26, y + M + 30 + i * 26, { size: 15, weight: 800, color: v[3] ? g.C.gold : g.C.ink });
              });
            });
          }
          fit(g, 1.2, function () {
            g.fade(g.part(t, 0, .5), function () { grid(g, x, y, cs, A); });
            values(x + M / 2, A, g.part(t, .5, .9), g.part(t, .7, 1.1), false);
            g.arrow(x + M + 10, y + M / 2, xr - 10, y + M / 2, g.ease(g.part(t, 1.3, 2)), g.C.gold, 1.5);
            g.fade(g.part(t, 1.3, 1.8), function () {
              g.text('row 2 −', x + M + gap / 2, y + M / 2 - 28, { size: 11.5, color: g.C.body, align: 'center' });
              g.text('2 × row 1', x + M + gap / 2, y + M / 2 - 13, { size: 11.5, color: g.C.body, align: 'center' });
            });
            g.fade(g.part(t, 2, 2.6), function () { grid(g, xr, y, cs, B, { row: 1, zeros: true }); });
            values(xr + M / 2, B, g.part(t, 3, 3.4), g.part(t, 3.8, 4.2), true);
            g.fade(g.part(t, 3.2, 3.6), function () { g.text('The determinant holds.', g.w / 2, y + M + 96, { size: 12.5, weight: 600, color: g.C.ink, align: 'center' }); });
            g.fade(g.part(t, 4.4, 5), function () { g.text('The permanent doesn’t.', g.w / 2, y + M + 116, { size: 12.5, weight: 800, color: g.C.gold, align: 'center' }); });
          });
        }
      },
      {
        title: 'What the permanent counts',
        text: 'Fill the grid with 1s and 0s, where a 1 means this person can do this job. Now the permanent is the number of ways to give everyone a different job. Finding one way is easy. Counting all of them is as hard as counting the answers to any puzzle in NP, which Leslie Valiant proved in 1979.',
        len: 7,
        alt: 'Three people, A, B and C, and three jobs, with lines for who can do what, beside a grid of 1s and 0s. Each of the six ways to hand out the jobs is tried in turn. Three of them work, so the permanent is 3.',
        draw: function (g, t) {
          var x0 = (g.w - 360) / 2, px = x0 + 30, jx = x0 + 150, ys = [80, 148, 216], cs = 44, gx = x0 + 222, gy = 82;
          var k = Math.floor((t - .9) / .85), live = k >= 0 && k < 6, pick = live ? PICKS[k][0] : null;
          var found = WAYS[Math.max(0, Math.min(6, k + 1))];
          fit(g, 1.15, function () {
            g.fade(g.part(t, 0, .6), function () {
              g.text('people', px, 40, { size: 11.5, color: g.C.muted, align: 'center' });
              g.text('jobs', jx, 40, { size: 11.5, color: g.C.muted, align: 'center' });
              JOBS.forEach(function (row, r) { row.forEach(function (v, c) { if (v) g.line(px + 15, ys[r], jx - 15, ys[c], g.ink(.16), 1.25); }); });
              if (pick) pick.forEach(function (c, r) {
                if (JOBS[r][c]) g.line(px + 15, ys[r], jx - 15, ys[c], WORKS[k] ? g.C.gold : g.gold(.45), 3);
                else g.line(px + 15, ys[r], jx - 15, ys[c], g.ink(.45), 1.5, [4, 4]);
              });
              ys.forEach(function (y, i) {
                g.dot(px, y, 15, g.C.ground, g.ink(.55), 1.5);
                g.text('ABC'[i], px, y + .5, { size: 13, weight: 800, color: g.C.ink, align: 'center' });
                g.dot(jx, y, 15, g.C.ground, g.ink(.55), 1.5);
                g.text(i + 1, jx, y + .5, { size: 13, weight: 800, color: g.C.ink, align: 'center' });
                g.text('ABC'[i], gx - 14, gy + (i + .5) * cs, { size: 12, weight: 600, color: g.C.muted, align: 'center' });
                g.text(i + 1, gx + (i + .5) * cs, gy - 13, { size: 12, weight: 600, color: g.C.muted, align: 'center' });
              });
              grid(g, gx, gy, cs, JOBS, {
                zeros: true,
                hot: pick ? cells(pick).filter(function (i) { return JOBS[(i / 3) | 0][i % 3]; }) : [],
                bad: pick ? cells(pick).filter(function (i) { return !JOBS[(i / 3) | 0][i % 3]; }) : []
              });
              g.text('Ways that work', gx, gy + cs * 3 + 26, { size: 12, color: g.C.muted });
              g.text(found, gx + cs * 3, gy + cs * 3 + 25, { size: 22, weight: 800, color: g.C.gold, align: 'right' });
            });
            if (live) g.text(WORKS[k] ? 'works' : 'not allowed', (px + jx) / 2, 262, { size: 12.5, weight: WORKS[k] ? 800 : 500, color: WORKS[k] ? g.C.gold : g.C.muted, align: 'center' });
            g.fade(g.part(t, 6.2, 6.8), function () {
              g.text(WAYS[6] + ' ways, so the permanent is ' + total(JOBS, false) + '.', x0 + 180, 286, { size: 12.5, weight: 600, color: g.C.gold, align: 'center' });
            });
          });
        }
      }
    ];
  }

  function classes() {
    return [
      {
        title: 'A formula has a price',
        text: 'This kind of maths only allows adding and multiplying. The price of a formula is how many of those steps it takes. The same formula can be cheap or expensive depending on how it is arranged: here, 3 steps or 7. VP vs VNP is a question about the cheapest arrangement there could ever be.',
        len: 5.2,
        alt: 'Two diagrams that compute the same formula from a, b, c and d. The first adds a to b and c to d, then multiplies: 3 steps. The second multiplies four pairs and adds the results: 7 steps.',
        draw: function (g, t) {
          var x0 = (g.w - 352) / 2, L = x0 + 75, R = x0 + 277, iy = 236;
          function ins(cx) { return [-60, -20, 20, 60].map(function (dx) { return [cx + dx, iy]; }); }
          var a = ins(L), b = ins(R);
          // each gate: where it is, its sign, when it appears, and what feeds it
          var P1 = [L - 40, 170], P2 = [L + 40, 170], X = [L, 104];
          var left = [[P1, '+', .5, [a[0], a[1]]], [P2, '+', .9, [a[2], a[3]]], [X, '×', 1.3, [P1, P2]]];
          var M = [-60, -20, 20, 60].map(function (dx) { return [R + dx, 182]; }), S1 = [R - 40, 128], S2 = [R + 40, 128], S3 = [R, 78];
          var right = [[M[0], '×', 2, [b[0], b[2]]], [M[1], '×', 2.3, [b[0], b[3]]], [M[2], '×', 2.6, [b[1], b[2]]], [M[3], '×', 2.9, [b[1], b[3]]],
            [S1, '+', 3.3, [M[0], M[1]]], [S2, '+', 3.6, [M[2], M[3]]], [S3, '+', 4, [S1, S2]]];
          function circuit(gates, inputs, formula, cx) {
            var made = 0;
            gates.forEach(function (gt) { var p = g.part(t, gt[2], gt[2] + .3); if (p) made++; gt[3].forEach(function (from) { wire(g, from, gt[0], p); }); });
            inputs.forEach(function (at, i) { input(g, at, 'abcd'[i]); });
            gates.forEach(function (gt) { gate(g, gt[0], gt[1], g.part(t, gt[2], gt[2] + .3)); });
            g.text(formula, cx, 26, { size: 13, mono: true, weight: 600, color: g.C.ink, align: 'center' });
            g.text(count(made), cx, 284, { size: 17, weight: 800, color: g.C.gold, align: 'center' });
          }
          fit(g, 1.05, function () {
            circuit(left, a, '(a + b) × (c + d)', L);
            circuit(right, b, 'ac + ad + bc + bd', R);
            g.fade(g.part(t, 4.4, 4.9), function () {
              g.text('=', x0 + 176, 26, { size: 15, weight: 600, color: g.C.muted, align: 'center' });
              g.text('same answer', x0 + 176, 284, { size: 11.5, color: g.C.muted, align: 'center' });
            });
          });
        }
      },
      {
        title: 'VP and VNP',
        text: 'In 1979 Valiant sorted formulas into two classes. VP holds the ones with a cheap arrangement, like the determinant. VNP holds the ones that can be written as a huge sum of cheap pieces, like the permanent. He also showed that the permanent is the hardest thing in VNP: a cheap way to compute it would give a cheap way to compute everything there. VP ≠ VNP says no such way exists.',
        at: 899, len: 5.2,
        alt: 'A large box labeled VNP with a smaller box labeled VP inside it. The determinant sits inside VP. The permanent sits in VNP outside VP, with a crossed-out arrow pointing at VP.',
        draw: function (g, t) {
          var z = zones(g), o = z.o, p = z.p;
          g.fade(g.ease(g.part(t, 0, .5)), function () { g.box(o.x, o.y, o.w, o.h, 18, g.C.ground, g.ink(.55), 1.5); });
          g.fade(g.part(t, .3, .8), function () {
            var w = g.text('VNP', o.x + 18, o.y + 27, { size: 20, weight: 800, color: g.C.ink });
            g.text('huge sums of cheap pieces', o.x + 28 + w, o.y + 28, { size: 12.5, color: g.C.muted });
          });
          g.fade(g.ease(g.part(t, .9, 1.4)), function () {
            g.box(p.x, p.y, p.w, p.h, 14, g.gold(.1), g.C.gold, 1.5);
            var w = g.text('VP', p.x + 16, p.y + 26, { size: 20, weight: 800, color: g.C.gold });
            g.text('cheap to compute', p.x + 26 + w, p.y + 27, { size: 12.5, color: g.C.muted });
          });
          pop(g, 'Determinant', z.pcx, z.y0, g.part(t, 1.6, 1.95), { stroke: g.C.gold });
          pop(g, 'Multiplying grids', z.pcx, z.y0 + z.dy, g.part(t, 1.9, 2.25), { stroke: g.C.gold });
          var chip = pop(g, 'Permanent', z.rcx, z.y0, g.part(t, 2.6, 2.95), { dash: [4, 3] }) || { w: 90 };
          g.fade(g.part(t, 3, 3.4), function () { g.text('the hardest one in VNP', z.rcx, z.y0 + 30, { size: 11.5, italic: true, color: g.C.muted, align: 'center' }); });
          var from = z.rcx - chip.w / 2 - 6, to = p.x + p.w + 8, mid = (from + to) / 2;
          g.arrow(from, z.y0, to, z.y0, g.ease(g.part(t, 3.5, 4)), g.C.gold, 1.5);
          g.fade(g.part(t, 4.2, 4.5), function () {
            g.line(mid - 5, z.y0 - 7, mid + 5, z.y0 + 7, g.C.ink, 2);
            g.line(mid - 5, z.y0 + 7, mid + 5, z.y0 - 7, g.C.ink, 2);
          });
          g.fade(g.part(t, 4.4, 4.9), function () {
            g.text('VP ≠ VNP: no cheap way in', z.rcx, p.y + p.h - 16, { size: 12, weight: 600, color: g.C.gold, align: 'center' });
          });
        }
      },
      {
        title: 'The same question, twice',
        text: 'P vs NP and VP vs VNP have the same shape. Each has an easy side, a side that only looks hard, and one hardest member that stands for all the rest. The difference is what gets computed: P vs NP is about programs answering yes or no, and VP vs VNP is about formulas built from adding and multiplying.',
        len: 4.8,
        alt: 'A table comparing P vs NP with VP vs VNP. One is about yes-or-no questions and the other about formulas. P and VP are the easy sides, NP and VNP the hard-looking sides. The hardest members are SAT and the permanent. P vs NP is open since 1971. VP vs VNP has a proof claimed in 2026.',
        draw: function (g, t) {
          var x = 22, cw = (g.w - 44 - 16) / 2, x2 = x + cw + 16;
          g.fade(g.part(t, 0, .4), function () {
            g.text('P vs NP', x, 26, { size: 15, weight: 800, color: g.C.ink });
            g.text('VP vs VNP', x2, 26, { size: 15, weight: 800, color: g.C.gold });
            g.line(x, 44, g.w - 22, 44, g.ink(.2), 1);
          });
          TABLE.forEach(function (row, i) {
            var t0 = .5 + i * .75, y = 64 + i * 51;
            g.fade(g.part(t, t0, t0 + .3), function () {
              g.text(row[0], x, y, { size: 11.5, color: g.C.muted });
              g.text(row[1], x, y + 20, { size: 12.5, weight: 600, color: g.C.ink });
            });
            g.fade(g.part(t, t0 + .3, t0 + .6), function () { g.text(row[2], x2, y + 20, { size: 12.5, weight: 600, color: g.C.gold }); });
            if (i < TABLE.length - 1) g.fade(g.part(t, t0, t0 + .3), function () { g.line(x, y + 37, g.w - 22, y + 37, g.ink(.09), 1); });
          });
        }
      },
      {
        title: 'What a proof would settle',
        text: 'VP ≠ VNP is the easier of the two claims. If P ≠ NP is true in its stronger form, the one about circuits, then VP ≠ VNP has to be true as well, so this was a hurdle that had to fall first. It does not work in reverse. A correct proof of VP ≠ VNP leaves P vs NP open, and the Millennium Prize with it.',
        at: 806, len: 5.4,
        alt: 'Two boxes, P ≠ NP above and VP ≠ VNP below. An arrow from the top box to the bottom one says P ≠ NP can only be true if VP ≠ VNP is. A crossed-out arrow going back up says VP ≠ VNP does not prove P ≠ NP. The bottom box is marked proof claimed and the top one still open.',
        draw: function (g, t) {
          var cx = g.w / 2, bw = 292, bh = 60, x = cx - bw / 2, top = 34, low = 216, down = cx - 58, up = cx + 58;
          function claim(y, name, note, a) {
            g.fade(a, function () {
              g.box(x, y, bw, bh, 12, g.C.ground, g.ink(.55), 1.5);
              g.text(name, x + 18, y + 23, { size: 17, weight: 800, color: g.C.ink });
              g.text(note, x + 18, y + 43, { size: 11.5, color: g.C.muted });
            });
          }
          fit(g, 1.2, function () {
            claim(top, 'P ≠ NP', 'the Millennium Prize question', g.ease(g.part(t, 0, .5)));
            claim(low, 'VP ≠ VNP', 'the algebraic version', g.ease(g.part(t, .5, 1)));
            g.arrow(down, top + bh + 8, down, low - 8, g.ease(g.part(t, 1.3, 2.1)), g.C.gold, 1.5);
            g.fade(g.part(t, 1.5, 2.1), function () {
              g.text('can only be true', down - 12, 147, { size: 12, weight: 600, color: g.C.ink, align: 'right' });
              g.text('if this one is', down - 12, 164, { size: 12, weight: 600, color: g.C.ink, align: 'right' });
            });
            pop(g, 'proof claimed', x + bw - 62, low + bh / 2, g.part(t, 2.6, 2.95), { stroke: g.C.gold, color: g.C.gold, size: 11.5, h: 24, pad: 10 });
            g.fade(g.part(t, 3.2, 4), function () { g.arrow(up, low - 8, up, top + bh + 8, g.ease(g.part(t, 3.2, 4)), g.ink(.5), 1.5); });
            g.fade(g.part(t, 4, 4.3), function () {
              g.line(up - 7, 148, up + 7, 162, g.C.ink, 2);
              g.line(up - 7, 162, up + 7, 148, g.C.ink, 2);
            });
            g.fade(g.part(t, 3.6, 4.2), function () {
              g.text('doesn’t prove', up + 14, 147, { size: 12, color: g.C.body });
              g.text('the one above', up + 14, 164, { size: 12, color: g.C.body });
            });
            pop(g, 'still open', x + bw - 50, top + bh / 2, g.part(t, 4.6, 4.95), { dash: [4, 3], size: 11.5, h: 24, pad: 10 });
          });
        }
      }
    ];
  }

  function go() {
    window.Walk('vp-formulas', { label: 'Determinant vs permanent in five steps', steps: formulas() });
    window.Walk('vp-classes', { label: 'From two formulas to VP vs VNP in four steps', steps: classes() });
  }
  if (window.Walk) go();
  else {
    // walk.js sits next to this file.
    var s = document.createElement('script');
    s.src = mine.replace(/[^\/]*$/, 'walk.js');
    s.onload = go;
    document.head.appendChild(s);
  }
})();
