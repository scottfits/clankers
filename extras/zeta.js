/* The staircase from the Riemann episode: von Mangoldt's explicit formula for Chebyshev's psi(x).
   Any <div data-extra="zeta"> on a page gets the chart, its slider and the note under it. */
(function () {
  // Imaginary parts of the first 150 zeros of the zeta function on the critical line.
  var G = [14.1347,21.0220,25.0109,30.4249,32.9351,37.5862,40.9187,43.3271,48.0052,49.7738,52.9703,56.4462,59.3470,60.8318,65.1125,67.0798,69.5464,72.0672,75.7047,77.1448,79.3374,82.9104,84.7355,87.4253,88.8091,92.4919,94.6513,95.8706,98.8312,101.3179,103.7255,105.4466,107.1686,111.0295,111.8747,114.3202,116.2267,118.7908,121.3701,122.9468,124.2568,127.5167,129.5787,131.0877,133.4977,134.7565,138.1160,139.7362,141.1237,143.1118,146.0010,147.4228,150.0535,150.9253,153.0247,156.1129,157.5976,158.8500,161.1890,163.0307,165.5371,167.1844,169.0945,169.9120,173.4115,174.7542,176.4414,178.3774,179.9165,182.2071,184.8745,185.5988,187.2289,189.4162,192.0267,193.0797,195.2654,196.8765,198.0153,201.2648,202.4936,204.1897,205.3947,207.9063,209.5765,211.6909,213.3479,214.5470,216.1695,219.0676,220.7149,221.4307,224.0070,224.9833,227.4214,229.3374,231.2502,231.9872,233.6934,236.5242,237.7698,239.5555,241.0492,242.8233,244.0709,247.1370,248.1020,249.5737,251.0149,253.0700,255.3063,256.3807,258.6104,259.8744,260.8051,263.5739,265.5579,266.6150,267.9219,269.9704,271.4941,273.4596,275.5875,276.4520,278.2507,279.2293,282.4651,283.2112,284.8360,286.6674,287.9119,289.5799,291.8463,293.5584,294.9654,295.5733,297.9793,299.8403,301.6493,302.6967,304.8644,305.7289,307.2195,310.1095,311.1651,312.4278,313.9853,315.4756,317.7348,318.8531];
  var X0 = 1.4, X1 = 55, Y0 = -3, Y1 = 56;

  // Primes below X1, and every prime power, where psi takes a step of log p.
  var primes = [], steps = [];
  for (var i = 2; i < X1; i++) {
    var isP = true;
    for (var d = 2; d * d <= i; d++) if (i % d === 0) { isP = false; break; }
    if (isP) { primes.push(i); for (var q = i; q < X1; q *= i) steps.push({ x: q, h: Math.log(i) }); }
  }
  steps.sort(function (a, b) { return a.x - b.x; });

  function psi(x, n) {
    var L = Math.log(x), full = Math.floor(n), frac = n - full, sum = 0, g, k;
    for (k = 0; k < full; k++) { g = G[k]; sum += (0.5 * Math.cos(g * L) + g * Math.sin(g * L)) / (0.25 + g * g); }
    if (frac > 0 && full < G.length) { g = G[full]; sum += frac * (0.5 * Math.cos(g * L) + g * Math.sin(g * L)) / (0.25 + g * g); }
    return x - 2 * Math.sqrt(x) * sum - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x));
  }

  function mount(root) {
    if (root.dataset.on) return;
    root.dataset.on = '1';
    root.classList.add('stair');
    root.innerHTML =
      '<canvas role="img" aria-label="A graph. A straight gold line picks up one wave for each zero of the zeta function until it matches the staircase of the primes."></canvas>' +
      '<div class="dial">' +
        '<div class="dial-row"><label for="zeros">Zeros of the zeta function</label><output id="zeros-out" for="zeros">0</output></div>' +
        '<input type="range" id="zeros" min="0" max="150" step="1" value="0">' +
      '</div>' +
      '<p class="stair-note">This is the idea the episode builds up to. The thin staircase goes up a step at every prime. The heavy line is a guess at it. Drag the slider to add zeros of the zeta function and the guess turns into the staircase.</p>';

    var cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
    var slider = root.querySelector('input'), out = root.querySelector('output');
    var css = getComputedStyle(document.documentElement);
    var GOLD = css.getPropertyValue('--gold').trim() || '#8f530a';
    var MUTED = css.getPropertyValue('--muted').trim() || '#7b705d';
    var W = 0, H = 0, dpr = 1, n = 0;

    function draw() {
      if (!W) return;
      var padT = 14, padB = 34, plotH = H - padT - padB;
      function px(x) { return (x - X0) / (X1 - X0) * W; }
      function py(y) { return padT + plotH - (y - Y0) / (Y1 - Y0) * plotH; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // the primes, written along the bottom
      ctx.font = '500 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      var last = -99;
      primes.forEach(function (p) {
        var X = px(p);
        ctx.fillStyle = 'rgba(42,36,28,.3)';
        ctx.fillRect(X - 0.5, H - padB + 6, 1, 5);
        if (X - last >= 19) { ctx.fillStyle = MUTED; ctx.fillText(p, Math.max(9, Math.min(W - 9, X)), H - 6); last = X; }
      });

      // the true staircase
      ctx.beginPath();
      var cum = 0; ctx.moveTo(px(X0), py(0));
      steps.forEach(function (s) { ctx.lineTo(px(s.x), py(cum)); cum += s.h; ctx.lineTo(px(s.x), py(cum)); });
      ctx.lineTo(px(X1), py(cum));
      ctx.lineWidth = 1.25; ctx.strokeStyle = 'rgba(42,36,28,.38)'; ctx.lineJoin = 'miter'; ctx.stroke();

      // the estimate with n zeros added
      ctx.beginPath();
      for (var i = 0; i <= W; i++) {
        var x = X0 + (X1 - X0) * i / W, y = py(psi(x, n));
        if (i) ctx.lineTo(i, y); else ctx.moveTo(i, y);
      }
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.25;
      ctx.stroke();
    }

    function setN(v) {
      n = v;
      var k = Math.round(v);
      slider.value = k;
      slider.style.setProperty('--p', (v / 150 * 100) + '%');
      out.textContent = k;
      draw();
    }

    function size() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(r.width); H = Math.round(r.height);
      cv.width = W * dpr; cv.height = H * dpr;
      draw();
    }
    if (window.ResizeObserver) new ResizeObserver(size).observe(cv); else window.addEventListener('resize', size);
    size();

    // One move, the first time the chart is on screen: the line starts straight and takes on its first 30 zeros.
    var raf = 0, target = 30, started = false, watch = null;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function start() {
      if (started) return;
      started = true;
      var t0 = 0;
      var step = function (now) {
        if (!t0) t0 = now + 450;
        var t = Math.max(0, Math.min(1, (now - t0) / 2600));
        setN(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    if (still) setN(target);
    else {
      setN(0);
      if (window.IntersectionObserver) {
        watch = new IntersectionObserver(function (seen) {
          if (seen.some(function (e) { return e.isIntersecting; })) { watch.disconnect(); start(); }
        }, { threshold: 0.4 });
        watch.observe(cv);
      } else start();
    }
    slider.addEventListener('input', function () {
      started = true;
      cancelAnimationFrame(raf);
      if (watch) watch.disconnect();
      setN(+slider.value);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  }

  document.querySelectorAll('[data-extra="zeta"]').forEach(mount);
})();
