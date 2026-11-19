/*
 * C2 Lenses
 * Pembuka c2mtl.koki-kiko.com sampai judul bertopeng:
 *   - Latar fixed: panel gradasi peach (kiri) + biru (penuh), masuk dari bawah/atas saat load.
 *   - Kanvas lingkaran membentuk logo "C2" (26 lingkaran bergradasi ungu→pink→oranye, additive),
 *     di-blend `difference` ke latar. Awalnya zoom 2× di lengkung "C", zoom keluar ke 1× sepanjang hero.
 *     Lingkaran menghindar dari kursor dan berdenyut saat masuk carousel kata.
 *   - Hero: huruf berputar naik (rotateX), kotak hitam & highlight parallax.
 *   - Carousel kata 3D (rotateX) setinggi 400vh.
 *   - Judul bertopeng: latar terang + teks gelap dengan `mix-blend-mode: lighten` →
 *     huruf jadi jendela ke latar gradasi + lingkaran di belakangnya.
 *
 * Angka (posisi lingkaran, warna, zoom kamera, timeline carousel) disalin dari kode situs aslinya.
 * C2Lenses.mount(root, options) → { destroy }
 */
(function (global) {
  "use strict";

  // posisi 26 lingkaran logo (unit dunia, y ke atas) — 13 pertama huruf C, sisanya angka 2
  var LOGO = [
    [-69.27, 130.55], [-120, 212.87], [-216.65, 257], [-321.41, 248.78], [-406, 194.4], [-463, 105], [-483, -10],
    [-463, -105], [-406, -199.22], [-320.65, -251], [-216.65, -260.62], [-120, -215.72], [-69.27, -133.4],
    [148.29, 132.79], [205.16, 223.34], [310.66, 257], [425.16, 231.58], [482, 147.75], [460.34, 50],
    [376.53, -29.36], [271.72, -92.51], [182.71, -163.31], [149.04, -260.62], [260.52, -260.62],
    [372.81, -260.62], [484.27, -260.62]
  ];

  var DEFAULTS = {
    radius: 125,          // jari-jari lingkaran (unit dunia @1440px)
    zoomFrom: 2,          // kamera awal: zoom 2× …
    camFrom: [-400, 200], // … diarahkan ke lengkung kiri huruf C
    lerp: 0.1,            // lerp kamera terhadap progres hero
    repelMin: 50,         // kekuatan dorong kursor (naik sesuai progres hero)
    repelMax: 150,
    alpha: 0.91,
    colors: ["#7022E2", "#EC53C9", "#FA6104"]  // bawah → atas
  };

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  var expoOut = function (p) { return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); };
  var p2Out = function (p) { return 1 - (1 - p) * (1 - p); };
  var p4InOut = function (p) { return p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2; };

  /* ---------- pecah teks jadi karakter ---------- */
  function split(el, baseDelay) {
    var text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    var chars = [];
    Array.from(text).forEach(function (ch, i) {
      var s = document.createElement("span");
      s.className = "c2__char";
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch === " " ? " " : ch;
      s.style.transitionDelay = (baseDelay || 0) + i * 0.035 + "s";
      el.appendChild(s);
      chars.push(s);
    });
    return chars;
  }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var win = root.ownerDocument.defaultView || global;
    var $ = function (s) { return root.querySelector(s); };
    var $$ = function (s) { return Array.from(root.querySelectorAll(s)); };

    var hero = $(".c2__hero");
    var date = $(".c2__date");
    var peach = $(".c2__bgPeach");
    var black = $(".c2__black");
    var grad = $(".c2__grad");
    var cta = $(".c2__cta");
    var slide = $$(".c2__video, .c2__hl");
    var wc = $(".c2__words");
    var wcItems = $$(".c2__word");
    var canvasWrap = $(".c2__logo");
    var canvas = $(".c2__logo canvas");
    var ctx = canvas.getContext("2d");

    // split teks: judul hero, tanggal, kata carousel
    $$("[data-split]").forEach(function (el) { split(el, parseFloat(el.getAttribute("data-split")) || 0); });
    var words = wcItems.map(function (w) { return Array.from(w.querySelectorAll(".c2__char")); });
    words.forEach(function (cs) { cs.forEach(function (c) { c.style.transitionDelay = ""; }); });

    /* ---------- intro ---------- */
    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    root.classList.add("c2--intro");
    later(function () { root.classList.add("c2--bg"); }, 50);        // latar masuk (1.6s)
    later(function () { root.classList.add("c2--logo"); revealStart = performance.now(); }, 500);
    later(function () { root.classList.add("c2--title"); }, 900);    // huruf hero + kotak hitam

    /* ---------- ukuran ---------- */
    var M = {};
    var circles = LOGO.map(function (p) { return { x: 0, y: 0, hx: 0, hy: 0, s: 0 }; });
    function measure() {
      M.w = win.innerWidth; M.h = win.innerHeight;
      M.dpr = Math.min(win.devicePixelRatio || 1, 2);
      M.sf = Math.min(M.w / 1440, 1.1);
      M.mobile = M.w < 1024;
      canvas.width = Math.round(M.w * M.dpr); canvas.height = Math.round(M.h * M.dpr);
      canvas.style.width = M.w + "px"; canvas.style.height = M.h + "px";
      var sy = win.scrollY;
      M.heroTop = hero.getBoundingClientRect().top + sy; M.heroH = hero.offsetHeight;
      M.dateTop = date.getBoundingClientRect().top + sy; M.dateH = date.offsetHeight;
      M.wcTop = wc.getBoundingClientRect().top + sy; M.wcH = wc.offsetHeight;
      M.r = o.radius * (M.mobile ? M.w / 375 * 0.42 : M.sf);
      LOGO.forEach(function (p, i) {
        var c = circles[i];
        c.hx = p[0] * (M.mobile ? M.w / 375 * 0.42 : M.sf); c.hy = p[1] * (M.mobile ? M.w / 375 * 0.42 : M.sf);
        if (!c.init) { c.x = c.hx; c.y = c.hy; c.init = true; }
      });
      // gradasi lingkaran (bawah → atas), dibuat sekali per ukuran
      var g = ctx.createLinearGradient(0, M.r, 0, -M.r);
      g.addColorStop(0, o.colors[0]); g.addColorStop(0.05, o.colors[0]);
      g.addColorStop(0.27, mixHex(o.colors[0], o.colors[1], 0.6));
      g.addColorStop(0.48, o.colors[1]); g.addColorStop(0.56, o.colors[1]);
      g.addColorStop(0.78, mixHex(o.colors[1], o.colors[2], 0.6));
      g.addColorStop(1, o.colors[2]);
      M.grad = g;
      M.camOff = 0.35 * 0; // situs asli: 0.35 × lebar sidebar kanan; demo ini tanpa sidebar
    }
    function mixHex(a, b, t) {
      var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      var r = Math.round(lerp(pa >> 16, pb >> 16, t)), g = Math.round(lerp(pa >> 8 & 255, pb >> 8 & 255, t)), bl = Math.round(lerp(pa & 255, pb & 255, t));
      return "rgb(" + r + "," + g + "," + bl + ")";
    }

    /* ---------- kursor ---------- */
    var mouse = { x: -9999, y: -9999 };
    function onMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
    function onLeave() { mouse.x = mouse.y = -9999; }

    /* ---------- denyut saat masuk carousel ---------- */
    var pulseStart = -1, revealStart = -1, inWords = false;
    var dateLines = $$(".c2__date .c2__line"), dateShown = false;

    /* ---------- loop ---------- */
    var raf = 0, alive = true, camP = 0;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var sy = win.scrollY;

      // progres hero (top top → bottom top), kamera di-lerp seperti aslinya
      var hp = clamp01((sy - M.heroTop) / M.heroH);
      camP += (hp - camP) * (reduced ? 1 : o.lerp);
      var zoom = lerp(o.zoomFrom, 1, camP);
      var camX = lerp(o.camFrom[0] * (M.mobile ? 0 : M.sf), M.camOff, camP);
      var camY = lerp(o.camFrom[1] * (M.mobile ? 0 : M.sf), 0, camP);

      // parallax DOM (scrub, linear)
      black.style.transform = "translate3d(0," + (-90 * hp) + "%,0)";
      if (!M.mobile) {
        grad.style.transform = "translate3d(0," + (20 * hp) + "%,0)";
        cta.style.transform = "translate3d(0," + lerp(50, 0, hp) + "%,0)";
        var vy = lerp(-50, 100, hp) + "px";
        slide.forEach(function (s) { s.style.transform = "translate3d(0," + vy + ",0)"; });
      }
      var pp = clamp01((sy - M.dateTop) / Math.max(1, M.dateH - M.h));       // date: top top → bottom bottom
      peach.style.transform = "translate3d(0," + (-100 * pp) + "%,0)";

      // carousel kata: rotasi (top top → bottom bottom), karakter (top bottom → bottom bottom)
      var n = wcItems.length, step = 360 / (n + 5);
      var rp = clamp01((sy - M.wcTop) / Math.max(1, M.wcH - M.h));
      var cp = clamp01((sy - (M.wcTop - M.h)) / M.wcH);
      var rad = n * (M.w < 768 ? 30 : 70) * (M.w / 1440 < 1 ? 1 : 1);
      wcItems.forEach(function (it, i) {
        it.style.transformOrigin = "50% 50% -" + rad + "px";
        it.style.transform = "translate(-50%,-50%) translateZ(" + rad + "px) rotateX(" + (-step * (i + 1) + rp * (n + 1) * step) + "deg)";
      });
      var T = cp * 44.5;                                       // timeline karakter (unit GSAP asli)
      var IN = [15, 25, 34.5], OUT = [23.5, 32, 40];
      words.forEach(function (cs, w) {
        cs.forEach(function (c, k) {
          var a = clamp01((T - IN[w] - k * 0.3) / 2);          // masuk: stagger .3, durasi 2
          var b = clamp01((T - OUT[w] - k * 0.5) / 2);         // keluar: stagger .5, durasi 2
          var y = lerp(100, 0, a), rx = lerp(-90, 0, a) + 90 * b;
          c.style.opacity = (a * (1 - b)).toFixed(3);
          c.style.transform = "translateY(" + y.toFixed(1) + "px) rotateX(" + rx.toFixed(1) + "deg)";
        });
      });
      // baris tanggal muncul saat masuk layar (InViewTracker di aslinya)
      if (!dateShown && M.dateTop - sy < M.h * 0.8) {
        dateShown = true;
        dateLines.forEach(function (l) { l.classList.add("is-in"); });
      }

      var nowIn = sy >= M.wcTop && sy <= M.wcTop + M.wcH;
      if (nowIn && !inWords) pulseStart = now;
      inWords = nowIn;

      draw(now, zoom, camX, camY, hp);
    }

    function draw(now, zoom, camX, camY, hp) {
      var W = M.w, H = M.h, d = M.dpr;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";              // additive seperti material aslinya
      ctx.globalAlpha = o.alpha;
      var strength = lerp(o.repelMin, o.repelMax, hp) * (M.mobile ? 0 : 1);
      // kursor → koordinat dunia
      var mx = (mouse.x - W / 2) / zoom + camX, my = -(mouse.y - H / 2) / zoom + camY;
      var R = M.r;
      for (var i = 0; i < circles.length; i++) {
        var c = circles[i];
        // dorong menjauh dari kursor, lalu kembali pelan (lerp .05)
        var dx = c.x - mx, dy = c.y - my, dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < strength * 2) {
          var f = (1 - dist / (strength * 2)) * strength * 0.12;
          c.x += dx / dist * f; c.y += dy / dist * f;
        }
        c.x += (c.hx - c.x) * 0.05; c.y += (c.hy - c.y) * 0.05;

        // skala: reveal saat load (stagger .1, power2.out 1.2s) dan denyut di carousel
        var sx = 1;
        if (revealStart < 0) sx = 0;
        else if (!reduced) sx = p2Out(clamp01((now - revealStart) / 1000 / 1.2 - i * 0.1 / 1.2));
        if (pulseStart > 0 && !reduced) {
          var t = (now - pulseStart) / 1000 - i * 0.08;
          if (t > 0 && t < 1.2) sx *= 1 - 0.2 * p2Out(t / 1.2);
          else if (t >= 1 && t < 4.5) sx *= 0.8 + 0.2 * p4InOut(clamp01((t - 1) / 3.5));
        }
        if (sx <= 0.001) continue;

        var px = (c.x - camX) * zoom + W / 2, py = -(c.y - camY) * zoom + H / 2, pr = R * zoom;
        if (px + pr < 0 || px - pr > W || py + pr < 0 || py - pr > H) continue;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(zoom * sx, zoom);
        ctx.fillStyle = M.grad;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    var rszT = 0;
    function onResize() { clearTimeout(rszT); rszT = setTimeout(measure, 80); }

    measure();
    win.addEventListener("resize", onResize);
    win.addEventListener("load", measure);
    win.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if (reduced) { root.classList.add("c2--bg", "c2--logo", "c2--title"); revealStart = 0; }
    raf = requestAnimationFrame(frame);

    return {
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout); clearTimeout(rszT);
        win.removeEventListener("resize", onResize);
        win.removeEventListener("load", measure);
        win.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
        root.classList.remove("c2--intro", "c2--bg", "c2--logo", "c2--title");
      }
    };
  }

  global.C2Lenses = { mount: mount };
})(window);
