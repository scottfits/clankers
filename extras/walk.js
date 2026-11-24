/* The walkthrough under an episode: a few steps, each drawn and animated on one stage, with a sentence or
   two under it. An episode's own file in extras/ holds its steps and hands them over with
   Walk('name', { label, steps }). Every <div data-extra="name"> on the page then becomes that walkthrough.
   extras/pvsnp.js is a good one to copy.

   A step is { title, text, at, alt, len, draw }:
     at    where the episode talks about this, in seconds. It has to be the start of a chapter. It becomes a
           link that plays the episode from there.
     alt   what the picture shows, for someone who can't see it.
     len   how many seconds the animation runs.
     draw  draw(g, t) paints the stage as it looks t seconds in. It is called for every frame, so the same t
           must give the same picture. Someone who has asked their device for less motion gets it once, with
           t = len.
   The stage is measured in its own units, not pixels. It is always 320 high, and g.w is its width, between
   420 (a phone) and 600. A step has to look right across that range. */
(function () {
  if (window.Walk) return;

  // The colors of site.css.
  var C = { ink: '#2a241c', body: '#4a4234', muted: '#7b705d', gold: '#8f530a', line: '#d9ccab', raised: '#ece1c6', ground: '#f4ecd8' };
  var SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  var HIGH = 320, NARROW = 420, WIDE = 600;
  var still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  // How far along one part of the animation is, from 0 to 1, when that part runs from second a to second b.
  function part(t, a, b) { return clamp((t - a) / (b - a)); }
  function ease(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function gold(a) { return 'rgba(143,83,10,' + a + ')'; }
  function ink(a) { return 'rgba(42,36,28,' + a + ')'; }

  /* ---- What a step draws with ---- */
  function pen(ctx) {
    function round(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function font(o) { return (o.italic ? 'italic ' : '') + (o.weight || 500) + ' ' + (o.size || 13) + 'px ' + (o.mono ? MONO : SANS); }
    var g = {
      ctx: ctx, w: WIDE, h: HIGH, C: C, part: part, ease: ease, clamp: clamp, gold: gold, ink: ink, round: round,
      // Everything fn draws is faded by a.
      fade: function (a, fn) {
        a = clamp(a);
        if (!a) return;
        var was = ctx.globalAlpha;
        ctx.globalAlpha = was * a; fn(); ctx.globalAlpha = was;
      },
      // Everything fn draws is scaled by s around (x, y).
      grow: function (x, y, s, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); fn(); ctx.restore(); },
      // Writes s and says how wide it came out. o: size, weight, color, align, base, mono, italic.
      text: function (s, x, y, o) {
        o = o || {};
        ctx.font = font(o);
        ctx.textAlign = o.align || 'left';
        ctx.textBaseline = o.base || 'middle';
        ctx.fillStyle = o.color || C.body;
        ctx.fillText(s, x, y);
        return ctx.measureText(s).width;
      },
      wide: function (s, o) { ctx.font = font(o || {}); return ctx.measureText(s).width; },
      box: function (x, y, w, h, r, fill, stroke, lw, dash) {
        round(x, y, w, h, r);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); }
      },
      line: function (x1, y1, x2, y2, color, lw, dash) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = color; ctx.lineWidth = lw || 1; ctx.lineCap = 'round'; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
      },
      dot: function (x, y, r, fill, stroke, lw) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
      },
      // A label in a rounded box, centered on (x, y). Says how big the box is. o: size, weight, color, fill, stroke, dash, h, pad.
      chip: function (label, x, y, o) {
        o = o || {};
        var size = o.size || 12.5, weight = o.weight || 600, h = o.h || 28;
        var w = g.wide(label, { size: size, weight: weight }) + 2 * (o.pad || 13);
        g.box(x - w / 2, y - h / 2, w, h, h / 2, o.fill || C.ground, o.stroke || ink(.5), o.lw || 1.25, o.dash);
        g.text(label, x, y + .5, { size: size, weight: weight, color: o.color || C.ink, align: 'center' });
        return { w: w, h: h };
      },
      // A line from (x1, y1) as far as p of the way to (x2, y2), with a point at the far end, and one at the near end if back is given.
      arrow: function (x1, y1, x2, y2, p, color, lw, back) {
        p = clamp(p);
        if (!p) return;
        var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
        var ex = x1 + dx * p, ey = y1 + dy * p, s = 6;
        function head(x, y, sx, sy, a) {
          g.fade(a, function () {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - sx * s - sy * s * .55, y - sy * s + sx * s * .55);
            ctx.lineTo(x - sx * s + sy * s * .55, y - sy * s - sx * s * .55);
            ctx.closePath(); ctx.fillStyle = color; ctx.fill();
          });
        }
        g.line(x1 + (back ? ux * 3 : 0), y1 + (back ? uy * 3 : 0), ex - ux * 3, ey - uy * 3, color, lw || 1.5);
        head(ex, ey, ux, uy, 1);
        if (back) head(x1, y1, -ux, -uy, back);
      },
      num: function (n) { return Math.round(n).toLocaleString('en-US'); }
    };
    return g;
  }

  /* ---- The stage, the words and the buttons ---- */
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (tag === 'button') n.type = 'button';
    return n;
  }
  function clock(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  function mount(root, def) {
    if (root.dataset.on) return;
    root.dataset.on = '1';
    root.classList.add('walk');
    var steps = def.steps, at = 0, now = 0, raf = 0, begun = false, W = 0, H = 0, dpr = 1;

    var label = make('p', 'walk-label', def.label);
    var cv = make('canvas'), stage = make('div', 'walk-stage');
    cv.setAttribute('role', 'img');
    stage.appendChild(cv);
    var back = make('button', 'walk-step', 'Back'), next = make('button', 'walk-step', 'Next'), dots = make('ol', 'walk-dots');
    var nav = make('div', 'walk-nav');
    [back, dots, next].forEach(function (n) { nav.appendChild(n); });
    var count = make('span', 'walk-count'), again = make('button', 'walk-again', 'Replay');
    var meta = make('p', 'walk-meta'), title = make('p', 'walk-title'), copy = make('p', 'walk-copy'), watch = make('a', 'walk-at');
    meta.appendChild(count); meta.appendChild(again);
    var words = make('div', 'walk-words');
    words.setAttribute('aria-live', 'polite');
    [meta, title, copy].forEach(function (n) { words.appendChild(n); });
    [label, stage, nav, words, watch].forEach(function (n) { root.appendChild(n); });
    steps.forEach(function (s, i) {
      var b = make('button');
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.title);
      b.addEventListener('click', function () { show(i, true); });
      dots.appendChild(make('li')).appendChild(b);
    });

    var ctx = cv.getContext('2d'), g = pen(ctx);

    function paint(t) {
      now = t;
      if (!W) return;
      var wide = Math.max(NARROW, Math.min(WIDE, W)), k = W / wide;
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      ctx.clearRect(0, 0, wide, HIGH);
      ctx.globalAlpha = 1;
      g.w = wide; g.h = HIGH;
      steps[at].draw(g, Math.min(t, steps[at].len));
    }
    function play() {
      cancelAnimationFrame(raf);
      begun = true;
      var len = steps[at].len, t0 = 0;
      if (still) { paint(len); return; }
      paint(0);
      raf = requestAnimationFrame(function tick(ts) {
        if (!t0) t0 = ts;
        var t = (ts - t0) / 1000;
        paint(t);
        if (t < len) raf = requestAnimationFrame(tick);
      });
    }

    // The chapter a step belongs to, found in the list of chapters on the page.
    function chapter(sec) {
      if (sec == null) return null;
      var list = (root.closest('.ep') || document).querySelectorAll('.chapters a[href]'), i, m;
      for (i = 0; i < list.length; i++) {
        m = (list[i].getAttribute('href') || '').match(/[?&]t=(\d+)s?$/);
        if (list[i].dataset.t === String(sec) || (m && +m[1] === sec)) return list[i];
      }
      return null;
    }

    function show(i, go) {
      at = Math.max(0, Math.min(steps.length - 1, i));
      var s = steps[at], c = chapter(s.at);
      count.textContent = 'Step ' + (at + 1) + ' of ' + steps.length;
      title.textContent = s.title;
      copy.textContent = s.text;
      cv.setAttribute('aria-label', s.alt || s.title);
      back.disabled = at === 0;
      next.disabled = at === steps.length - 1;
      [].forEach.call(dots.querySelectorAll('button'), function (b, j) {
        if (j === at) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      watch.hidden = !c;
      if (c) { watch.href = c.href; watch.textContent = 'Watch this part of the episode, ' + clock(s.at); }
      if (go || begun) play(); else { cancelAnimationFrame(raf); paint(0); }
    }

    back.addEventListener('click', function () { show(at - 1, true); });
    next.addEventListener('click', function () { show(at + 1, true); });
    again.addEventListener('click', play);
    cv.addEventListener('click', play);
    root.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' && at < steps.length - 1) { show(at + 1, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft' && at > 0) { show(at - 1, true); e.preventDefault(); }
    });
    // On an episode's own page the chapter list moves the player on that page. Anywhere else the link opens YouTube.
    watch.addEventListener('click', function (e) {
      var c = chapter(steps[at].at);
      if (!c || !c.dataset.t || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      c.click();
    });

    function size() {
      var w = Math.round(stage.clientWidth);
      if (!w || w === W) return;
      W = w;
      H = Math.round(HIGH * W / Math.max(NARROW, Math.min(WIDE, W)));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.height = H + 'px';
      cv.width = W * dpr; cv.height = H * dpr;
      paint(now);
    }
    if (window.ResizeObserver) new ResizeObserver(size).observe(stage); else window.addEventListener('resize', size);
    size();
    show(0, false);

    // The first step starts the first time the stage is on screen.
    if (window.IntersectionObserver && !still) {
      var seen = new IntersectionObserver(function (list) {
        if (!list.some(function (e) { return e.isIntersecting; })) return;
        seen.disconnect();
        if (!begun) play();
      }, { threshold: .4 });
      seen.observe(stage);
    } else play();
    // The stage is drawn before the page's font has arrived, so it is drawn again once each weight is in.
    if (document.fonts && document.fonts.load) ['500', '600', '800'].forEach(function (weight) {
      document.fonts.load(weight + ' 13px Inter').then(function () { paint(now); }, function () {});
    });
  }

  window.Walk = function (name, def) {
    [].forEach.call(document.querySelectorAll('[data-extra="' + name + '"]'), function (root) { mount(root, def); });
  };
})();
