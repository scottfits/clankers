/* "How the work grows", on the VP vs VNP page: pick the size of the grid and see how many steps three
   methods take. Any <div data-extra="vp-work"> on a page gets the bars, the slider and the note under it. */
(function () {
  var MIN = 4, MAX = 60, SPEED = 1e9;   // steps a second, for turning steps into time
  function factorial(n) { for (var f = 1, i = 2; i <= n; i++) f *= i; return f; }
  // About how many multiplications each method takes on an n by n grid.
  var METHODS = [
    { name: 'Determinant, by clearing rows', grows: 'n³', steps: function (n) { return n * n * n / 3; } },
    { name: 'Permanent, by the best method known', grows: '2ⁿ', steps: function (n) { return n * Math.pow(2, n); } },
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

  function make(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function mount(root) {
    if (root.dataset.on) return;
    root.dataset.on = '1';
    root.classList.add('work');
    root.appendChild(make('p', 'walk-label', 'Try it: how the work grows'));
    var rows = METHODS.map(function (m) {
      var row = make('div', 'work-row'), head = make('div', 'work-head'), bar = make('div', 'work-bar');
      var num = make('span', 'work-num'), fill = make('i'), note = make('p', 'work-time');
      head.appendChild(make('span', 'work-name', m.name));
      head.appendChild(num);
      bar.appendChild(fill);
      [head, bar, note].forEach(function (n) { row.appendChild(n); });
      root.appendChild(row);
      return { m: m, num: num, fill: fill, note: note };
    });
    var dial = make('div', 'dial'), line = make('div', 'dial-row'), label = make('label', null, 'Size of the grid'), out = make('output');
    var slider = make('input');
    slider.type = 'range'; slider.min = MIN; slider.max = MAX; slider.step = 1; slider.id = 'work-size';
    label.htmlFor = 'work-size'; out.htmlFor = 'work-size';
    line.appendChild(label); line.appendChild(out);
    dial.appendChild(line); dial.appendChild(slider);
    root.appendChild(dial);
    root.appendChild(make('p', 'stair-note', 'Here n is the size of the grid, and the times are for a computer doing a billion steps a second. The length of a bar shows how many digits the number of steps has, not the number itself. For comparison, the universe is about 14 billion years old.'));

    function set(n) {
      slider.value = n;
      slider.style.setProperty('--p', ((n - MIN) / (MAX - MIN) * 100) + '%');
      out.textContent = n + ' by ' + n;
      rows.forEach(function (r) {
        var steps = r.m.steps(n);
        r.num.textContent = 'about ' + words(steps, 1e6) + ' steps';
        r.fill.style.width = Math.max(.6, Math.log(steps) / TOP * 100) + '%';
        var took = time(steps);
        r.note.textContent = took[0].toUpperCase() + took.slice(1) + '. The steps grow like ' + r.m.grows + '.';
      });
    }

    // One move, the first time it is on screen: the grid grows from 4 by 4 to 20 by 20.
    var raf = 0, started = false, watch = null, target = 20;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function start() {
      if (started) return;
      started = true;
      var t0 = 0;
      raf = requestAnimationFrame(function step(now) {
        if (!t0) t0 = now + 400;
        var t = Math.max(0, Math.min(1, (now - t0) / 2600));
        set(Math.round(MIN + (target - MIN) * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(step);
      });
    }
    if (still) set(target);
    else {
      set(MIN);
      if (window.IntersectionObserver) {
        watch = new IntersectionObserver(function (seen) {
          if (seen.some(function (e) { return e.isIntersecting; })) { watch.disconnect(); start(); }
        }, { threshold: .4 });
        watch.observe(root);
      } else start();
    }
    slider.addEventListener('input', function () {
      started = true;
      cancelAnimationFrame(raf);
      if (watch) watch.disconnect();
      set(+slider.value);
    });
  }

  [].forEach.call(document.querySelectorAll('[data-extra="vp-work"]'), mount);
})();
