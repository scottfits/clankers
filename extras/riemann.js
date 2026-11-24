/* The walkthrough for the Riemann Hypothesis episode. walk.js makes the stage and the buttons; this file is
   the six steps. Any <div data-extra="riemann"> on a page gets it. The chart in zeta.js follows it. */
(function () {
  var mine = document.currentScript ? document.currentScript.src : 'extras/riemann.js';

  function isPrime(n) {
    if (n < 2) return false;
    for (var d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  }
  var PRIMES = [];
  for (var n = 2; n <= 100; n++) if (isPrime(n)) PRIMES.push(n);

  /* ---- The sieve: when each number from 1 to 100 gets struck out ---- */
  var SIEVE = [2, 3, 5, 7], PHASE = 1.3;
  function struckAt(n) {
    if (n === 1) return .55;
    for (var j = 0; j < SIEVE.length; j++) if (n % SIEVE[j] === 0 && n !== SIEVE[j]) return 1 + j * PHASE + .9 * n / 100;
    return 0;
  }

  /* ---- A hundred numbers in a row, from four places on the number line ---- */
  var RUNS = null;
  function runs() {
    if (RUNS) return RUNS;
    RUNS = [0, 1e3, 1e6, 1e9].map(function (from) {
      var marks = [], k;
      for (k = 1; k <= 100; k++) marks.push(isPrime(from + k));
      return {
        label: (from + 1).toLocaleString('en-US') + ' to ' + (from + 100).toLocaleString('en-US'),
        marks: marks,
        rule: from ? Math.round(100 / Math.log(from + 50)) : 0     // Gauss: about 1 in ln N near N
      };
    });
    return RUNS;
  }

  /* ---- Counting primes up to 100, and Gauss's smooth guess: the integral of 1 / ln t from 2 ---- */
  var LI = [0], DX = .25;
  (function () {
    for (var x = 2, sum = 0; x < 100; x += DX) {
      // Simpson's rule over one small piece
      sum += DX / 6 * (1 / Math.log(x) + 4 / Math.log(x + DX / 2) + 1 / Math.log(x + DX));
      LI.push(sum);
    }
  })();
  function li(x) { var k = Math.max(0, Math.min(LI.length - 1, (x - 2) / DX)), a = Math.floor(k), b = Math.min(LI.length - 1, a + 1); return LI[a] + (LI[b] - LI[a]) * (k - a); }
  function count(x) { for (var c = 0; c < PRIMES.length && PRIMES[c] <= x; c++); return c; }

  // Heights of the first zeros of the zeta function on the critical line.
  var ZEROS = [14.13, 21.02, 25.01, 30.42, 32.94, 37.59, 40.92, 43.33];

  function steps() {
    return [
      {
        title: 'What’s left is the primes',
        text: 'A prime is a number that only divides by 1 and itself. Strike out every multiple of 2, then of 3, 5 and 7, and the 25 primes below 100 are what is left. Every other whole number is made by multiplying primes together.',
        at: 60, len: 7.2,
        alt: 'The numbers 1 to 100 in a grid. The multiples of 2, 3, 5 and 7 are struck out in turn, leaving the 25 primes highlighted.',
        draw: function (g, t) {
          var c = Math.min((g.h - 28) / 10, (g.w - 16 - 14 - 96 - 12) / 10), G = c * 10, x = 16, y = (g.h - G) / 2, px = x + G + 14;
          var phase = Math.floor((t - 1) / PHASE), end = g.part(t, 6.3, 6.9);
          g.fade(g.part(t, 0, .5), function () {
            g.box(x, y, G, G, 8, g.C.ground, g.ink(.3), 1);
            for (var n = 1; n <= 100; n++) {
              var cx = x + ((n - 1) % 10 + .5) * c, cy = y + (((n - 1) / 10 | 0) + .5) * c;
              var at = struckAt(n), s = at ? g.part(t, at, at + .25) : 0, prime = !at;
              var active = phase >= 0 && phase < 4 && n === SIEVE[phase];
              if (prime && end) g.dot(cx, cy, c * .43, g.gold(.17 * end));
              if (active) g.dot(cx, cy, c * .43, null, g.C.gold, 1.5);
              g.fade(1 - .8 * s, function () {
                g.text(n, cx, cy + .5, { size: c * .42, weight: prime && (end || active) ? 800 : 500, color: prime && (end > .5 || active) ? g.C.gold : g.C.ink, align: 'center' });
              });
              if (s) g.fade(s * .4, function () { g.line(cx - c * .26, cy + c * .26, cx + c * .26, cy - c * .26, g.C.ink, 1); });
            }
          });
          g.fade(g.part(t, .6, 1), function () {
            g.text('Strike out', px, y + 12, { size: 12, color: g.C.muted });
            g.text('multiples of', px, y + 28, { size: 12, color: g.C.muted });
          });
          SIEVE.forEach(function (p, i) {
            g.fade(g.part(t, .9 + i * PHASE, 1.1 + i * PHASE), function () {
              g.text(p, px, y + 62 + i * 30, { size: 20, weight: 800, color: i === phase ? g.C.gold : g.C.ink });
            });
          });
          g.fade(end, function () {
            g.text('25', px, y + 206, { size: 26, weight: 800, color: g.C.gold });
            g.text('primes', px, y + 230, { size: 12.5, color: g.C.body });
            g.text('below 100', px, y + 247, { size: 12.5, color: g.C.body });
          });
        }
      },
      {
        title: 'They never run out',
        text: 'Euclid’s argument, about 2,300 years old. Take any list of primes, multiply them together and add 1. Divide the result by any prime on the list and there is 1 left over. So it has a prime factor the list missed, and no list of primes is ever complete.',
        at: 159, len: 6.5,
        alt: 'The primes 2, 3, 5 and 7 are multiplied to make 210. Adding 1 gives 211. Dividing 211 by each of 2, 3, 5 and 7 leaves a remainder of 1 every time.',
        draw: function (g, t) {
          var cx = g.w / 2, x = cx - 139, i;
          [2, 3, 5, 7].forEach(function (p, i) {
            var bx = x + i * 58;
            g.fade(g.part(t, .3 + i * .25, .6 + i * .25), function () {
              g.box(bx, 43, 30, 30, 7, g.gold(.12), g.C.gold, 1.25);
              g.text(p, bx + 15, 58.5, { size: 16, weight: 800, color: g.C.gold, align: 'center' });
              if (i) g.text('×', bx - 14, 58, { size: 14, color: g.C.muted, align: 'center' });
            });
          });
          g.fade(g.part(t, 1.5, 1.9), function () { g.text('= 210', x + 216, 58.5, { size: 18, weight: 800, color: g.C.ink }); });
          g.fade(g.part(t, 2.2, 2.7), function () {
            var w = g.wide('210 + 1 =  ', { size: 16 }) + g.wide('211', { size: 26, weight: 800 }), sx = cx - w / 2;
            sx += g.text('210 + 1 =  ', sx, 111, { size: 16, color: g.C.body });
            g.text('211', sx, 110, { size: 26, weight: 800, color: g.C.gold });
          });
          [2, 3, 5, 7].forEach(function (p, i) {
            g.fade(g.part(t, 3.2 + i * .5, 3.5 + i * .5), function () {
              var y = 160 + i * 27;
              g.text('211 ÷ ' + p + ' = ' + Math.floor(211 / p), cx - 4, y, { size: 13.5, mono: true, color: g.C.body, align: 'right' });
              var w = g.text('remainder ', cx + 22, y, { size: 12.5, color: g.C.muted });
              g.text(211 % p, cx + 22 + w, y, { size: 14, weight: 800, color: g.C.gold });
            });
          });
          g.fade(g.part(t, 5.5, 6.1), function () {
            g.text('No prime on the list divides 211.', cx, 286, { size: 12.5, weight: 600, color: g.C.gold, align: 'center' });
          });
        }
      },
      {
        title: 'They thin out, and the thinning has a rule',
        text: 'Primes get rarer as numbers grow. Each strip here is 100 numbers in a row, with a tall mark at every prime. As a teenager, Gauss spotted the rule behind the thinning: near a number N, about 1 number in every ln N is prime. Around a million that is about 1 in 14.',
        at: 248, len: 6.2,
        alt: 'Four strips of 100 numbers each, starting at 1, at 1,001, at 1,000,001 and at 1,000,000,001. The strips hold 25, 16, 6 and 7 primes, close to what the rule predicts for the last three: about 14, 7 and 5.',
        draw: function (g, t) {
          var x = 18, w = g.w - 36, sw = w / 100;
          runs().forEach(function (r, i) {
            var t0 = .3 + i * 1.35, sweep = g.part(t, t0, t0 + .9), y = 16 + i * 74, shown = Math.floor(sweep * 100), found = 0, k;
            g.fade(g.part(t, t0 - .1, t0 + .2), function () {
              g.text(r.label, x, y + 8, { size: 12, weight: 600, color: g.C.ink });
              g.line(x, y + 48.5, x + w, y + 48.5, g.ink(.18), 1);
            });
            for (k = 0; k < shown; k++) {
              var bx = x + (k + .5) * sw;
              if (r.marks[k]) { found++; g.line(bx, y + 47, bx, y + 25, g.C.gold, Math.max(1.6, sw * .5)); }
              else g.line(bx, y + 47, bx, y + 42, g.ink(.22), Math.max(1, sw * .3));
            }
            g.fade(g.part(t, t0, t0 + .2), function () {
              var cw = g.text(found + ' primes', x + w, y + 8, { size: 12.5, weight: 800, color: g.C.gold, align: 'right' });
              if (r.rule) g.fade(g.part(t, t0 + .9, t0 + 1.2), function () {
                g.text('rule: about ' + r.rule, x + w - cw - 12, y + 8, { size: 12, color: g.C.muted, align: 'right' });
              });
            });
          });
        }
      },
      {
        title: 'A staircase and a smooth guess',
        text: 'Count the primes as you go and you get a staircase that goes up one step at every prime. Gauss’s rule gives a smooth curve that runs alongside it. The gap between the two is the wobble, and Riemann worked out exactly what it is made of.',
        at: 322, len: 6.2,
        alt: 'A graph up to 100. A staircase climbs one step at each prime, reaching 25. A smooth curve, Gauss’s guess, rises just above it to about 29. The gap between them is shaded.',
        draw: function (g, t) {
          var x0 = 40, x1 = g.w - 20, yT = 20, yB = g.h - 36, top = 34;
          function px(x) { return x0 + x / 100 * (x1 - x0); }
          function py(v) { return yB - v / top * (yB - yT); }
          var ctx = g.ctx, X = 100 * g.ease(g.part(t, .4, 3)), X2 = 2 + 98 * g.ease(g.part(t, 3.2, 4.8)), gap = g.part(t, 5, 5.8), x, i;
          [10, 20, 30].forEach(function (v) {
            g.line(x0, py(v), x1, py(v), g.ink(.08), 1);
            g.text(v, x0 - 8, py(v), { size: 11, color: g.C.muted, align: 'right' });
          });
          [0, 20, 40, 60, 80, 100].forEach(function (v) { g.text(v, px(v), yB + 15, { size: 11, color: g.C.muted, align: 'center' }); });
          g.line(x0, yB, x1, yB, g.ink(.35), 1);
          // the gap between the guess and the count
          if (gap) {
            ctx.beginPath();
            ctx.moveTo(px(2), py(0));
            for (x = 2; x <= 100; x += .5) ctx.lineTo(px(x), py(li(x)));
            for (i = PRIMES.length - 1, x = 100; i >= 0; i--) { ctx.lineTo(px(x), py(i + 1)); x = PRIMES[i]; ctx.lineTo(px(x), py(i + 1)); ctx.lineTo(px(x), py(i)); }
            ctx.closePath();
            ctx.fillStyle = g.gold(.16 * gap); ctx.fill();
          }
          // the staircase, as far as X
          ctx.beginPath();
          ctx.moveTo(px(0), py(0));
          for (i = 0; i < PRIMES.length && PRIMES[i] <= X; i++) { ctx.lineTo(px(PRIMES[i]), py(i)); ctx.lineTo(px(PRIMES[i]), py(i + 1)); }
          ctx.lineTo(px(X), py(i));
          ctx.strokeStyle = g.ink(.78); ctx.lineWidth = 1.5; ctx.lineJoin = 'miter'; ctx.stroke();
          g.fade(g.part(t, 2.4, 3), function () { g.text('primes so far', px(66), py(count(66)) + 22, { size: 12, weight: 600, color: g.C.ink }); });
          // Gauss's curve, as far as X2
          if (X2 > 2) {
            ctx.beginPath();
            ctx.moveTo(px(2), py(0));
            for (x = 2.5; x <= X2; x += .5) ctx.lineTo(px(x), py(li(x)));
            ctx.strokeStyle = g.C.gold; ctx.lineWidth = 2.25; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
          }
          g.fade(g.part(t, 4.4, 5), function () { g.text('Gauss’s smooth guess', px(44), py(li(44)) - 16, { size: 12, weight: 600, color: g.C.gold, align: 'right' }); });
          g.fade(gap, function () {
            g.text('the wobble', px(93), py(li(100)) - 22, { size: 12, italic: true, color: g.C.body, align: 'right' });
            g.line(px(95), py(li(100)) - 22, px(97), py(li(100)) - 22, g.ink(.4), 1);
            g.line(px(97), py(li(100)) - 22, px(97), py((li(97) + count(97)) / 2), g.ink(.4), 1);
          });
        }
      },
      {
        title: 'Zeros on a line',
        text: 'Riemann’s zeta function has special inputs where it comes out as zero. Each of those zeros adds one wave to the smooth guess, and together the waves turn it into the staircase. The hypothesis is about where the zeros are: every one that matters sits on a single line, at real part one half. The chart below lets you add the waves yourself.',
        at: 471, len: 5.8,
        alt: 'A slice of the complex plane with a shaded strip between real part 0 and 1. A dashed line runs up the middle at one half. The first eight zeros appear on that line, at heights from 14.13 to 43.33.',
        draw: function (g, t) {
          var x0 = 20, pw = Math.min(g.w * .44, 240), yB = 284, yT = 20, lx = x0 + pw + 26;
          function px(re) { return x0 + (re + .5) / 2 * pw; }
          function py(im) { return yB - im / 47 * (yB - yT); }
          var up = g.ease(g.part(t, .4, 1.2));
          g.fade(g.part(t, 0, .4), function () {
            g.ctx.fillStyle = g.gold(.09); g.ctx.fillRect(px(0), yT, px(1) - px(0), yB - yT);
            g.line(x0, yB, x0 + pw, yB, g.ink(.35), 1);
            [[0, '0'], [.5, '½'], [1, '1']].forEach(function (k) {
              g.line(px(k[0]), yB, px(k[0]), yB + 4, g.ink(.35), 1);
              g.text(k[1], px(k[0]), yB + 16, { size: 12, weight: k[0] === .5 ? 800 : 500, color: k[0] === .5 ? g.C.gold : g.C.muted, align: 'center' });
            });
            g.text('real part', x0 + pw + 8, yB + 16, { size: 11, color: g.C.muted });
          });
          if (up) g.line(px(.5), yB, px(.5), yB - (yB - yT) * up, g.C.gold, 1.5, [5, 4]);
          ZEROS.forEach(function (z, k) {
            var a = g.part(t, 1.4 + k * .4, 1.7 + k * .4), y = py(z);
            g.fade(a, function () {
              g.line(px(.5) + 8, y, lx - 8, y, g.ink(.14), 1);
              g.grow(px(.5), y, .5 + .5 * g.ease(a), function () { g.dot(px(.5), y, 4.5, g.C.gold, g.C.ground, 1.5); });
              var w = g.text('½', lx, y, { size: 12, weight: 800, color: g.C.gold });
              g.text(' + ' + z.toFixed(2) + ' i', lx + w, y, { size: 11.5, mono: true, color: g.C.body });
            });
          });
          g.fade(g.part(t, 4.9, 5.5), function () {
            g.text('Riemann’s hypothesis:', lx, 236, { size: 12, color: g.C.muted });
            g.text('every zero is on this line', lx, 255, { size: 12.5, weight: 800, color: g.C.gold });
          });
        }
      },
      {
        title: 'From 40% of the zeros to all of them',
        text: 'Computers have checked more than a trillion zeros and found every one on the line. That is evidence, not proof, because the zeros never end. The most anyone had proved was that at least 40% of them are on the line. The proof released on November 20, written with Claude as 17 million lines of Lean, says all of them are.',
        at: 1136, len: 7.4,
        alt: 'A counter runs up to a trillion zeros checked by computer. Below it, a grid of 100 dots stands for all the zeros. Forty of them fill in for what had been proved before, and then all 100 fill in for the new proof.',
        draw: function (g, t) {
          var x = 24, dx = Math.min(24, (g.w - 48) / 20), n = 40 * g.ease(g.part(t, 3.4, 4.6)) + 60 * g.ease(g.part(t, 5.6, 7)), k;
          var after = g.part(t, 5.3, 5.6);
          g.text('Zeros checked by computer', x, 28, { size: 12.5, color: g.C.muted });
          var counted = g.part(t, .3, 2);
          g.text((counted === 1 ? 'more than ' : '') + g.num(1e12 * Math.pow(counted, 4)), x, 58, { size: 22, weight: 800, mono: true, color: g.C.ink });
          g.fade(g.part(t, 2.2, 2.7), function () {
            g.text('Every one on the line. But there are infinitely many.', x, 88, { size: 12.5, italic: true, color: g.C.body });
          });
          g.fade(g.part(t, 2.8, 3.3), function () {
            for (k = 0; k < 100; k++) {
              var on = g.clamp(n - k);
              g.dot(x + 6 + (k % 20) * dx, 126 + ((k / 20) | 0) * 19, 5, on ? g.gold(.25 + .75 * on) : null, on ? null : g.ink(.3), 1.25);
            }
          });
          g.fade(g.part(t, 3.3, 3.6), function () {
            var w = g.text(Math.round(n) + '%', x, 252, { size: 30, weight: 800, color: g.C.gold });
            g.fade(1 - after, function () {
              g.text('At least this share proved to be on the line', x + w + 14, 244, { size: 12.5, weight: 600, color: g.C.ink });
              g.text('the best result before the proof', x + w + 14, 262, { size: 12, color: g.C.muted });
            });
            g.fade(g.part(t, 5.6, 5.9), function () {
              g.text('Every zero on the line', x + w + 14, 244, { size: 12.5, weight: 600, color: g.C.ink });
              g.text('what the new proof says', x + w + 14, 262, { size: 12, color: g.C.muted });
            });
          });
        }
      }
    ];
  }

  function go() { window.Walk('riemann', { label: 'The Riemann Hypothesis in six steps', steps: steps() }); }
  if (window.Walk) go();
  else {
    // walk.js sits next to this file.
    var s = document.createElement('script');
    s.src = mine.replace(/[^\/]*$/, 'walk.js');
    s.onload = go;
    document.head.appendChild(s);
  }
})();
