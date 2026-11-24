/* The pictures on the VP vs VNP page (vp/index.html). The page tells the story in its own words and has a
   <figure data-fig="name"> wherever a picture goes. This file fills each one in. Three are things to click
   (chores, signs, flip), one is a slider (work), and the rest are drawings that walk.js animates. */
(function () {
  var mine = document.currentScript ? document.currentScript.src : 'extras/vp.js';
  var still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---- A 3 by 3 grid has six picks: one cell from each row, no two in a column ---- */
  // Each is the column picked in rows 1, 2 and 3, and the sign the determinant gives it. The first three
  // slope down to the right and are added. The last three slope down to the left and are subtracted.
  var PICKS = [[[0, 1, 2], 1], [[1, 2, 0], 1], [[2, 0, 1], 1], [[2, 1, 0], -1], [[1, 0, 2], -1], [[0, 2, 1], -1]];
  function cellsOf(pick) { return pick.map(function (c, r) { return r * 3 + c; }); }
  function product(m, pick) { return m[0][pick[0]] * m[1][pick[1]] * m[2][pick[2]]; }
  // The permanent of a grid, or its determinant if signed.
  function total(m, signed) {
    return PICKS.reduce(function (sum, p) { return sum + (signed ? p[1] : 1) * product(m, p[0]); }, 0);
  }

  // The grid of numbers the page keeps coming back to, and what it looks like after each move of the
  // shortcut: row `to` minus k times row `from`.
  var A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]];
  var MOVES = [[1, 0, 2], [2, 0, 4], [2, 1, 3]];
  var STAGES = [A];
  MOVES.forEach(function (mv) {
    var m = STAGES[STAGES.length - 1];
    STAGES.push(m.map(function (row, r) { return r === mv[0] ? row.map(function (v, c) { return v - mv[2] * m[mv[1]][c]; }) : row.slice(); }));
  });
  function moveText(mv) { return 'row ' + (mv[0] + 1) + ' − ' + mv[2] + ' × row ' + (mv[1] + 1); }
  var LAST = STAGES[3], DIAGONAL = [LAST[0][0], LAST[1][1], LAST[2][2]];

  /* ================= The things to click ================= */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (tag === 'button') n.type = 'button';
    return n;
  }
  function signed(n) { return (n < 0 ? '−' : '+') + Math.abs(n); }
  function put(parent, kids) { kids.forEach(function (k) { parent.appendChild(k); }); return parent; }

  // The panel a figure's picture sits on, in front of its caption.
  function panel(root, cls) {
    var stage = el('div', 'fig-stage'), toy = el('div', 'toy ' + cls);
    stage.appendChild(toy);
    root.insertBefore(stage, root.firstChild);
    return toy;
  }

  // The six picks as six small grids, tied to the nine cells of the big grid: pointing at a small grid
  // lights its pick up on the big one.
  function minis(cells) {
    var box = el('div', 'picks');
    var list = PICKS.map(function (p) {
      var b = el('button', 'pick'), g = el('span', 'pick-g'), label = el('span', 'pick-l'), on = cellsOf(p[0]);
      for (var i = 0; i < 9; i++) g.appendChild(el('i', on.indexOf(i) >= 0 ? 'on' : ''));
      box.appendChild(put(b, [g, label]));
      return { b: b, g: g, label: label, on: on, pick: p[0], sign: p[1] };
    });
    function point(k) {
      list.forEach(function (p, j) { p.b.classList.toggle('now', j === k); });
      cells.forEach(function (c, i) { c.classList.toggle('lit', k >= 0 && list[k].on.indexOf(i) >= 0); });
    }
    list.forEach(function (p, k) {
      p.b.addEventListener('pointerenter', function () { point(k); });
      p.b.addEventListener('pointerleave', function () { point(-1); });
      p.b.addEventListener('focus', function () { point(k); });
      p.b.addEventListener('blur', function () { point(-1); });
      p.b.addEventListener('click', function () { point(k); });
    });
    return { box: box, list: list, point: point };
  }

  function seen(node, fn) {
    if (!window.IntersectionObserver) { fn(); return; }
    var io = new IntersectionObserver(function (list) {
      if (!list.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      fn();
    }, { threshold: .4 });
    io.observe(node);
  }
  // The first time node is on screen, goes through the six picks one at a time: step(0) to step(5), then done().
  // Gives back a way to skip to the end.
  function inTurn(node, gap, step, done) {
    var k = 0, timer = 0, over = false;
    function finish() { if (over) return; over = true; clearTimeout(timer); done(); }
    if (still) finish();
    else seen(node, function tick() {
      if (over) return;
      if (k === PICKS.length) { finish(); return; }
      step(k++);
      timer = setTimeout(tick, gap);
    });
    return finish;
  }

  /* ---- Who can do which chore, and how many ways there are to hand the chores out ---- */
  var PEOPLE = ['Ana', 'Ben', 'Cal'], CHORES = ['cooking', 'dishes', 'trash'];
  var CAN = [[1, 1, 0], [1, 1, 1], [0, 1, 1]];

  function chores(root) {
    var toy = panel(root, 'chores'), can = CAN.map(function (r) { return r.slice(); }), shown = 0, cells = [];
    var table = el('table', 'chart'), head = table.insertRow();
    head.appendChild(el('td'));
    CHORES.forEach(function (c) { head.appendChild(el('th', null, c)).scope = 'col'; });
    PEOPLE.forEach(function (who, r) {
      var row = table.insertRow();
      row.appendChild(el('th', null, who)).scope = 'row';
      CHORES.forEach(function (chore, c) {
        var box = el('input');
        box.type = 'checkbox';
        box.checked = !!can[r][c];
        box.setAttribute('aria-label', who + ' can do the ' + chore);
        box.addEventListener('change', function () { can[r][c] = box.checked ? 1 : 0; skip(); render(); });
        cells.push(row.insertCell());
        cells[cells.length - 1].appendChild(box);
      });
    });
    var m = minis(cells), out = el('p', 'toy-out');
    out.setAttribute('aria-live', 'polite');
    put(toy, [table, m.box, out]);

    function render() {
      var ways = 0;
      m.list.forEach(function (p, k) {
        var works = product(can, p.pick) === 1, tried = k < shown;
        if (tried && works) ways++;
        p.b.classList.toggle('wait', !tried);
        p.b.classList.toggle('ok', tried && works);
        p.b.classList.toggle('no', tried && !works);
        // a box this pick needs that isn't checked
        [].forEach.call(p.g.children, function (c, i) { c.classList.toggle('x', tried && p.on.indexOf(i) >= 0 && !can[(i / 3) | 0][i % 3]); });
        p.b.setAttribute('aria-label', PEOPLE.map(function (who, r) { return who + ' ' + CHORES[p.pick[r]]; }).join(', ') +
          (tried ? (works ? ': works' : ': not allowed') : ''));
      });
      out.textContent = '';
      if (shown < 6) put(out, [el('b', null, ways), document.createTextNode(' so far')]);
      else if (!ways) out.textContent = 'None of the 6 ways work.';
      else if (ways === 6) out.textContent = 'All 6 ways work.';
      else put(out, [el('b', null, ways), document.createTextNode(' of the 6 ways work' + (ways === 1 ? 's.' : '.'))]);
    }
    render();
    var skip = inTurn(toy, 520, function (k) { shown = k + 1; m.point(k); render(); }, function () { shown = 6; m.point(-1); render(); });
  }

  /* ---- The same six picks added up two ways: all of them, or with three subtracted ---- */
  function numbers(make) {
    var grid = el('div', 'grid9'), cells = [];
    A.forEach(function (row, r) { row.forEach(function (v, c) { cells.push(grid.appendChild(make(v, r * 3 + c))); }); });
    return { grid: grid, cells: cells };
  }
  function spelled(pick, v) { return A[0][pick[0]] + ' × ' + A[1][pick[1]] + ' × ' + A[2][pick[2]] + ' = ' + v; }

  function signs(root) {
    var toy = panel(root, 'signs'), shown = 0, minus = false;
    var n = numbers(function (v) { return el('span', null, v); }), m = minis(n.cells);
    n.grid.setAttribute('role', 'img');
    n.grid.setAttribute('aria-label', 'A grid of numbers. Row 1: ' + A[0].join(', ') + '. Row 2: ' + A[1].join(', ') + '. Row 3: ' + A[2].join(', ') + '.');
    var add = el('button', 'toy-btn', 'Add all six'), sub = el('button', 'toy-btn', 'Subtract the bottom three');
    var out = el('p', 'toy-out');
    out.setAttribute('aria-live', 'polite');
    put(toy, [n.grid, m.box, put(el('p', 'toy-row'), [add, sub]), out]);

    function render() {
      var sum = 0, line = '';
      m.list.forEach(function (p, k) {
        var v = product(A, p.pick), neg = minus && p.sign < 0, done = k < shown;
        p.b.classList.toggle('wait', !done);
        p.b.classList.toggle('neg', done && neg);
        p.label.textContent = done ? signed(neg ? -v : v) : '';
        p.b.setAttribute('aria-label', spelled(p.pick, v) + (neg ? ', subtracted' : ', added'));
        if (done) { line += (k ? (neg ? ' − ' : ' + ') : '') + v; sum += neg ? -v : v; }
      });
      add.setAttribute('aria-pressed', !minus);
      sub.setAttribute('aria-pressed', minus);
      out.textContent = '';
      put(out, [el('span', 'toy-sum', line)]);
      if (shown === 6) put(out, [el('span', 'toy-sum', ' = '), el('b', null, sum), document.createTextNode(minus ? ', the determinant' : ', the permanent')]);
    }
    add.addEventListener('click', function () { minus = false; skip(); render(); });
    sub.addEventListener('click', function () { minus = true; skip(); render(); });
    render();
    var skip = inTurn(toy, 560, function (k) { shown = k + 1; m.point(k); render(); }, function () { shown = 6; m.point(-1); render(); });
  }

  /* ---- Pólya's question: flip some signs in the grid so that its determinant is the old permanent ---- */
  var WORD = ['none', 'one', 'two', 'three', 'four', 'five', 'all six'];

  function flip(root) {
    var toy = panel(root, 'flip'), mask = 0, busy = 0, want = total(A, false);
    var n = numbers(function (v, i) {
      var b = el('button');
      b.addEventListener('click', function () { if (busy) return; mask ^= 1 << i; say.textContent = ''; render(); });
      return b;
    });
    var m = minis(n.cells), got = el('b'), tally = el('span');
    var out = put(el('p', 'toy-out'), [document.createTextNode('Determinant of your grid: '), got, document.createTextNode('. '), tally]);
    var all = el('button', 'toy-btn', 'Try all 512 for me'), reset = el('button', 'toy-btn', 'Start over');
    var say = el('p', 'toy-say');
    say.setAttribute('aria-live', 'polite');
    put(toy, [n.grid, m.box, out, put(el('p', 'toy-row'), [all, reset]), say]);

    // What the determinant makes of each pick once the cells in msk have had their signs flipped.
    function signsOf(msk) {
      return PICKS.map(function (p) { return cellsOf(p[0]).reduce(function (s, i) { return msk >> i & 1 ? -s : s; }, p[1]); });
    }
    function det(msk) { return signsOf(msk).reduce(function (sum, s, k) { return sum + s * product(A, PICKS[k][0]); }, 0); }
    function pluses(msk) { return signsOf(msk).filter(function (s) { return s > 0; }).length; }

    function render() {
      var s = signsOf(mask), d = det(mask);
      n.cells.forEach(function (b, i) {
        var v = A[(i / 3) | 0][i % 3], neg = !!(mask >> i & 1);
        b.textContent = (neg ? '−' : '') + v;
        b.setAttribute('aria-pressed', neg);
        b.setAttribute('aria-label', (neg ? 'minus ' : '') + v + '. Flip its sign.');
      });
      m.list.forEach(function (p, k) {
        var v = product(A, p.pick);
        p.b.classList.toggle('neg', s[k] < 0);
        p.label.textContent = signed(s[k] * v);
        p.b.setAttribute('aria-label', spelled(p.pick, v) + (s[k] < 0 ? ', subtracted' : ', added'));
      });
      got.textContent = (d < 0 ? '−' : '') + Math.abs(d);
      tally.textContent = 'You need ' + want + '.';
    }
    function lock(on) { [all, reset].concat(n.cells).forEach(function (b) { b.disabled = on; }); }

    // Every pattern of flips, each one a single flip away from the one before it.
    function tryAll() {
      if (busy) return;
      var k = 0, best = -Infinity, at = 0;
      function look(msk) { var d = det(msk); if (d > best) { best = d; at = msk; } }
      function end() {
        busy = 0; mask = at;
        lock(false); render();
        say.textContent = 'All 512 tried. The closest is ' + best + ', with ' + WORD[pluses(at)] + ' of the six picks added. ' +
          (best === want ? 'That one does it.' : 'None of them reaches ' + want + '.');
      }
      say.textContent = '';
      if (still) { for (; k < 512; k++) look(k); end(); return; }
      lock(true);
      busy = requestAnimationFrame(function step() {
        for (var j = 0; j < 3 && k < 512; j++, k++) { mask = k ^ (k >> 1); look(mask); }
        render();
        tally.textContent = k + ' of 512 tried.';
        if (k < 512) busy = requestAnimationFrame(step); else end();
      });
    }
    all.addEventListener('click', tryAll);
    reset.addEventListener('click', function () { if (busy) return; mask = 0; say.textContent = ''; render(); });
    render();
  }

  /* ---- How the work grows with the size of the grid ---- */
  var MIN = 4, MAX = 60, SPEED = 1e9;   // steps a second, for turning steps into time
  function factorial(n) { for (var f = 1, i = 2; i <= n; i++) f *= i; return f; }
  // About how many multiplications each method takes on an n by n grid.
  var METHODS = [
    { name: 'Determinant, by clearing rows', grows: 'n³', steps: function (n) { return n * n * n / 3; } },
    { name: 'Permanent, by Ryser’s method', grows: '2ⁿ', steps: function (n) { return n * Math.pow(2, n); } },
    { name: 'Permanent, by adding up every pick', grows: 'n!', steps: function (n) { return (n - 1) * factorial(n); } }
  ];
  var TOP = Math.log(METHODS[2].steps(MAX));
  var UP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function power(x) { return '10' + String(Math.round(Math.log(x) / Math.LN10)).split('').map(function (d) { return UP[+d]; }).join(''); }
  var NAMES = [[1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  // 21,000,000 becomes "21 million". Anything past the named sizes becomes a power of ten.
  function words(x, from) {
    if (x >= 1e21) return power(x);
    for (var i = 0; i < NAMES.length; i++) {
      if (NAMES[i][0] >= from && x >= NAMES[i][0]) { var v = x / NAMES[i][0]; return (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)) + ' ' + NAMES[i][1]; }
    }
    return Math.round(x).toLocaleString('en-US');
  }
  function plural(v, unit) { return v + ' ' + unit + (v === 1 ? '' : 's'); }
  function time(steps) {
    var s = steps / SPEED, years = s / 31557600;
    if (s < 1e-6) return 'under a millionth of a second';
    if (s < 1e-3) return plural(Math.round(s * 1e6), 'millionth') + ' of a second';
    if (s < 1) return plural(Math.round(s * 1e3), 'thousandth') + ' of a second';
    if (s < 120) return plural(Math.round(s), 'second');
    if (s < 7200) return plural(Math.round(s / 60), 'minute');
    if (s < 172800) return plural(Math.round(s / 3600), 'hour');
    if (years < 2) return plural(Math.round(s / 86400), 'day');
    return 'about ' + words(years, 1e3) + ' years';
  }

  function work(root) {
    var toy = panel(root, 'work-toy');
    var rows = METHODS.map(function (method) {
      var num = el('span', 'work-num'), fill = el('i'), note = el('p', 'work-time');
      toy.appendChild(put(el('div', 'work-row'), [
        put(el('div', 'work-head'), [el('span', 'work-name', method.name), num]), put(el('div', 'work-bar'), [fill]), note
      ]));
      return { m: method, num: num, fill: fill, note: note };
    });
    var label = el('label', null, 'Size of the grid'), out = el('output'), slider = el('input');
    slider.type = 'range'; slider.min = MIN; slider.max = MAX; slider.step = 1; slider.id = 'work-size';
    label.htmlFor = 'work-size'; out.htmlFor = 'work-size';
    toy.appendChild(put(el('div', 'dial'), [put(el('div', 'dial-row'), [label, out]), slider]));

    function set(n) {
      slider.value = n;
      slider.style.setProperty('--p', ((n - MIN) / (MAX - MIN) * 100) + '%');
      out.textContent = n + ' by ' + n;
      rows.forEach(function (r) {
        var steps = r.m.steps(n), took = time(steps);
        r.num.textContent = 'about ' + words(steps, 1e6) + ' steps';
        r.fill.style.width = Math.max(.6, Math.log(steps) / TOP * 100) + '%';
        r.note.textContent = took[0].toUpperCase() + took.slice(1) + '. Grows like ' + r.m.grows + '.';
      });
    }

    // One move, the first time it is on screen: the grid grows from 4 by 4 to 20 by 20.
    var raf = 0, target = 20, moved = false;
    if (still) set(target);
    else {
      set(MIN);
      seen(toy, function () {
        var t0 = 0;
        if (moved) return;
        raf = requestAnimationFrame(function step(now) {
          if (!t0) t0 = now + 400;
          var t = Math.max(0, Math.min(1, (now - t0) / 2600));
          set(Math.round(MIN + (target - MIN) * (1 - Math.pow(1 - t, 3))));
          if (t < 1) raf = requestAnimationFrame(step);
        });
      });
    }
    slider.addEventListener('input', function () {
      moved = true;
      cancelAnimationFrame(raf);
      set(+slider.value);
    });
  }

  /* ================= The drawings ================= */

  // A drawing is laid out for the narrowest stage and drawn larger on a wider one, up to `most` times.
  function fit(g, most, fn) { g.grow(g.w / 2, g.h / 2, Math.min(most, (g.w - 40) / 380), fn); }

  // o.hot: cells to light up. o.row: a row to shade. o.swap: { row, to, p } fades that row's numbers into
  // the numbers in `to`. o.zeros: 0s are drawn faint.
  function grid(g, x, y, cs, m, o) {
    o = o || {};
    var M = cs * 3;
    g.box(x, y, M, M, 8, g.C.ground, g.ink(.5), 1.5);
    if (o.row != null) g.box(x + 4, y + o.row * cs + 4, M - 8, cs - 8, 7, g.gold(.16));
    m.forEach(function (row, r) {
      row.forEach(function (v, c) {
        var cx = x + (c + .5) * cs, cy = y + (r + .5) * cs, on = (o.hot || []).indexOf(r * 3 + c) >= 0;
        if (on) g.box(cx - cs / 2 + 4, cy - cs / 2 + 4, cs - 8, cs - 8, 7, g.gold(.2), g.C.gold, 1.25);
        function write(n, a) {
          g.fade(a, function () {
            g.text(n, cx, cy + .5, { size: cs * .4, weight: on ? 800 : 600, color: on ? g.C.gold : (n === 0 && o.zeros ? g.C.muted : g.C.ink), align: 'center' });
          });
        }
        if (o.swap && o.swap.row === r) { write(v, 1 - o.swap.p); write(o.swap.to[c], o.swap.p); }
        else write(v, 1);
      });
    });
  }

  /* ---- Circuits: an equation drawn as the additions and multiplications it takes ---- */
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
    return { o: o, p: p, pcx: p.x + p.w / 2, rcx: rx + rw / 2 + 8, y0: p.y + 76, dy: 42 };
  }
  function pop(g, label, x, y, p, o) {
    var size;
    g.fade(p, function () { g.grow(x, y, .86 + .14 * g.ease(p), function () { size = g.chip(label, x, y, o); }); });
    return size;
  }

  var DRAWINGS = {
    // Clearing the rows of the grid to get its determinant.
    clear: {
      len: 7.2, high: 270,
      alt: 'A grid of numbers with rows 2 1 1, 4 3 3 and 8 7 9. Three row subtractions turn everything below the diagonal into zeros. The diagonal then reads 2, 1, 2, and multiplying those gives the determinant, 4.',
      draw: function (g, t) {
        var cs = 52, M = cs * 3, x = (g.w - (M + 30 + 170)) / 2, y = (g.h - M) / 2, x2 = x + M + 30, y1 = y + 30;
        var k = Math.floor((t - .9) / 1.5), busy = k >= 0 && k < 3, done = g.part(t, 5.5, 5.8);
        var stage = STAGES[Math.max(0, Math.min(3, k))];
        fit(g, 1.3, function () {
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

    // The same first move, and what it does to the two totals.
    breaks: {
      len: 4.6, high: 250,
      alt: 'The same grid before and after one row subtraction. The determinant is 4 both times. The permanent changes from 208 to 48.',
      draw: function (g, t) {
        var cs = 38, M = cs * 3, gap = 84, x = (g.w - (M * 2 + gap)) / 2, xr = x + M + gap, y = (g.h - M - 62) / 2, B = STAGES[1];
        function values(mx, m, a, b, moved) {
          [['determinant', total(m, true), a, false], ['permanent', total(m, false), b, moved]].forEach(function (v, i) {
            g.fade(v[2], function () {
              g.text(v[0], mx + 16, y + M + 28 + i * 26, { size: 12, color: g.C.muted, align: 'right' });
              g.text(v[1], mx + 26, y + M + 28 + i * 26, { size: 15, weight: 800, color: v[3] ? g.C.gold : g.C.ink });
            });
          });
        }
        fit(g, 1.25, function () {
          g.fade(g.part(t, 0, .5), function () { grid(g, x, y, cs, A); });
          values(x + M / 2, A, g.part(t, .5, .9), g.part(t, .7, 1.1), false);
          g.arrow(x + M + 10, y + M / 2, xr - 10, y + M / 2, g.ease(g.part(t, 1.3, 2)), g.C.gold, 1.5);
          g.fade(g.part(t, 1.3, 1.8), function () {
            g.text('row 2 −', x + M + gap / 2, y + M / 2 - 28, { size: 11.5, color: g.C.body, align: 'center' });
            g.text('2 × row 1', x + M + gap / 2, y + M / 2 - 13, { size: 11.5, color: g.C.body, align: 'center' });
          });
          g.fade(g.part(t, 2, 2.6), function () { grid(g, xr, y, cs, B, { row: 1, zeros: true }); });
          values(xr + M / 2, B, g.part(t, 3, 3.4), g.part(t, 3.8, 4.2), true);
        });
      }
    },

    // One equation, built two ways.
    price: {
      len: 5.2, high: 310,
      alt: 'Two diagrams that compute the same equation from a, b, c and d. The first adds a to b and c to d, then multiplies: 3 steps. The second multiplies four pairs and adds the results: 7 steps.',
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
        function circuit(gates, inputs, equation, cx) {
          var made = 0;
          gates.forEach(function (gt) { var p = g.part(t, gt[2], gt[2] + .3); if (p) made++; gt[3].forEach(function (from) { wire(g, from, gt[0], p); }); });
          inputs.forEach(function (at, i) { input(g, at, 'abcd'[i]); });
          gates.forEach(function (gt) { gate(g, gt[0], gt[1], g.part(t, gt[2], gt[2] + .3)); });
          g.text(equation, cx, 26, { size: 13, mono: true, weight: 600, color: g.C.ink, align: 'center' });
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

    // VP inside VNP, and the permanent outside VP.
    classes: {
      len: 5.2, high: 290,
      alt: 'A large box labeled VNP with a smaller box labeled VP inside it. The determinant sits inside VP. The permanent sits in VNP outside VP, with a crossed-out arrow pointing at VP.',
      draw: function (g, t) {
        var z = zones(g), o = z.o, p = z.p;
        g.fade(g.ease(g.part(t, 0, .5)), function () { g.box(o.x, o.y, o.w, o.h, 18, g.C.ground, g.ink(.55), 1.5); });
        g.fade(g.part(t, .3, .8), function () {
          var w = g.text('VNP', o.x + 18, o.y + 27, { size: 20, weight: 800, color: g.C.ink });
          g.text('a huge sum of cheap terms', o.x + 28 + w, o.y + 28, { size: 12.5, color: g.C.muted });
        });
        g.fade(g.ease(g.part(t, .9, 1.4)), function () {
          g.box(p.x, p.y, p.w, p.h, 14, g.gold(.1), g.C.gold, 1.5);
          var w = g.text('VP', p.x + 16, p.y + 26, { size: 20, weight: 800, color: g.C.gold });
          g.text('has a cheap recipe', p.x + 26 + w, p.y + 27, { size: 12.5, color: g.C.muted });
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
          g.text('VP ≠ VNP: it can’t get in', z.rcx, p.y + p.h - 16, { size: 12, weight: 600, color: g.C.gold, align: 'center' });
        });
      }
    },

    // Which of the two claims would follow from the other.
    needs: {
      len: 5.4, high: 310,
      alt: 'Two boxes, P ≠ NP above and VP ≠ VNP below. An arrow from the top box to the bottom one says P ≠ NP can only be true if VP ≠ VNP is. A crossed-out arrow going back up says VP ≠ VNP does not prove P ≠ NP. The bottom box is marked proof claimed and the top one still open.',
      draw: function (g, t) {
        var cx = g.w / 2, bw = 292, bh = 60, x = cx - bw / 2, top = 30, low = 212, down = cx - 58, up = cx + 58;
        function claim(y, name, note, a) {
          g.fade(a, function () {
            g.box(x, y, bw, bh, 12, g.C.ground, g.ink(.55), 1.5);
            g.text(name, x + 18, y + 23, { size: 17, weight: 800, color: g.C.ink });
            g.text(note, x + 18, y + 43, { size: 11.5, color: g.C.muted });
          });
        }
        fit(g, 1.2, function () {
          claim(top, 'P ≠ NP', 'the Millennium Prize question', g.ease(g.part(t, 0, .5)));
          claim(low, 'VP ≠ VNP', 'the add-and-multiply version', g.ease(g.part(t, .5, 1)));
          g.arrow(down, top + bh + 8, down, low - 8, g.ease(g.part(t, 1.3, 2.1)), g.C.gold, 1.5);
          g.fade(g.part(t, 1.5, 2.1), function () {
            g.text('can only be true', down - 12, 143, { size: 12, weight: 600, color: g.C.ink, align: 'right' });
            g.text('if this one is', down - 12, 160, { size: 12, weight: 600, color: g.C.ink, align: 'right' });
          });
          pop(g, 'proof claimed', x + bw - 62, low + bh / 2, g.part(t, 2.6, 2.95), { stroke: g.C.gold, color: g.C.gold, size: 11.5, h: 24, pad: 10 });
          g.fade(g.part(t, 3.2, 4), function () { g.arrow(up, low - 8, up, top + bh + 8, g.ease(g.part(t, 3.2, 4)), g.ink(.5), 1.5); });
          g.fade(g.part(t, 4, 4.3), function () {
            g.line(up - 7, 144, up + 7, 158, g.C.ink, 2);
            g.line(up - 7, 158, up + 7, 144, g.C.ink, 2);
          });
          g.fade(g.part(t, 3.6, 4.2), function () {
            g.text('doesn’t prove', up + 14, 143, { size: 12, color: g.C.body });
            g.text('the one above', up + 14, 160, { size: 12, color: g.C.body });
          });
          pop(g, 'still open', x + bw - 50, top + bh / 2, g.part(t, 4.6, 4.95), { dash: [4, 3], size: 11.5, h: 24, pad: 10 });
        });
      }
    }
  };

  /* ================= Putting them on the page ================= */

  var TOYS = { chores: chores, signs: signs, flip: flip, work: work };
  Object.keys(TOYS).forEach(function (name) {
    [].forEach.call(document.querySelectorAll('figure[data-fig="' + name + '"]'), function (root) {
      if (root.dataset.on) return;
      root.dataset.on = '1';
      TOYS[name](root);
    });
  });

  function go() { Object.keys(DRAWINGS).forEach(function (name) { window.Walk.figure(name, DRAWINGS[name]); }); }
  if (window.Walk) go();
  else {
    // walk.js sits next to this file.
    var s = document.createElement('script');
    s.src = mine.replace(/[^\/]*$/, 'walk.js');
    s.onload = go;
    document.head.appendChild(s);
  }
})();
