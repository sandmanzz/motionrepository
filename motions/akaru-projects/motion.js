/*
 * Akaru Projects Scroll
 * Hero setengah layar + 3 panel proyek berwarna yang "mengintip" di kanan. Saat scroll:
 *   0–5    seluruh track bergeser ke kiri; panel 2 & 3 menyusul (seperti akordeon), foto membesar & naik ke atas panel.
 *   5–8    panel terakhir + daftar proyek mengecil 50% dari pojok kiri atas → jadi kolom kiri.
 *   5–13.5 kolom kiri bergulir ke atas (foto parallax), di kanan muncul judul + daftar keahlian yang garisnya tergambar.
 *
 * Timeline disalin dari GSAP aslinya. Di situs asli satu unit ≈ 0.79 tinggi layar scroll
 * (timeline 16.5 unit di section setinggi 14 layar), jadi tempo di sini disamakan lewat --ak-unit.
 *
 * Performa: semua ukuran dibaca sekali di measure() (resize/font load). Loop per frame hanya
 * membaca scrollY lalu MENULIS transform — tidak ada baca layout di tengah frame (tanpa layout thrash).
 *
 * AkaruProjects.mount(root, options) → { destroy }
 */
(function (global) {
  "use strict";

  var ease = {
    p1Out: function (p) { return 1 - (1 - p) * (1 - p); },                  // power1.out
    p1InOut: function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }, // power1.inOut
    p2Out: function (p) { return 1 - Math.pow(1 - p, 3); },                  // power2.out
    p3Out: function (p) { return 1 - Math.pow(1 - p, 4); }                   // power3.out
  };
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(t, a, d, e) { var p = clamp01((t - a) / d); return e ? e(p) : p; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function px(v) { return Math.round(v * 10) / 10; }

  var DEFAULTS = {
    units: 14,     // panjang timeline yang dipakai (0 → 14)
    unit: 0.79,    // 1 unit = 0.79 × tinggi layar scroll (tempo situs asli)
    smooth: 0.1,   // lerp progres per frame @60fps, meniru Lenis (lerp 0.1). 1 = tanpa smoothing
    mobile: 900    // di bawah lebar ini: layout statis bertumpuk
  };

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var win = root.ownerDocument.defaultView || global;
    var docEl = root.ownerDocument.documentElement;

    var $ = function (s) { return root.querySelector(s); };
    var $$ = function (s) { return Array.from(root.querySelectorAll(s)); };

    var track = $(".ak__track");
    var list = $(".ak__list");
    var desc = $(".ak__desc");
    var lines = $$(".ak__skillLine");
    var cards = $$(".ak__card").map(function (c) {
      return { img: c.querySelector("img"), inner: c.querySelector(".ak__cardInner") };
    });
    var F = $$(".ak__feat").map(function (f) {
      return {
        el: f,
        bg: f.querySelector(".ak__featBg"),
        img: f.querySelector(".ak__featImg"),
        pic: f.querySelector(".ak__featImg img"),
        slide: Array.from(f.querySelectorAll(".ak__featDetails, .ak__featBtn")),
        left: 0,
        shown: false
      };
    });

    root.style.setProperty("--ak-units", o.units);
    root.style.setProperty("--ak-unit", o.unit * 100 + "vh");

    /* ---------- ukuran: dibaca sekali ---------- */
    var M = {};
    function measure() {
      M.w = win.innerWidth;
      M.h = win.innerHeight;
      M.vw = M.w / 100;
      M.rem = M.w / 144;   // situs asli: html font-size = 10px di lebar 1440 → 1rem = 1/144 lebar layar
      M.mobile = M.w < o.mobile;
      root.classList.toggle("ak--static", M.mobile);
      if (M.mobile) return;
      M.top = root.getBoundingClientRect().top + win.scrollY;
      M.span = Math.max(1, root.offsetHeight - M.h);
      M.trackEnd = track.offsetWidth - M.w;   // bukan scrollWidth: anak yang di-transform ikut menggelembungkannya
      M.listH = list ? list.offsetHeight : 0;
      var c = $(".ak__featContent");
      M.u = c ? c.offsetHeight : M.h * 0.34;
      F.forEach(function (f) { f.left = f.el.offsetLeft; });
      last = -1; // paksa render ulang
    }

    /* ---------- intro saat load ---------- */
    root.classList.add("ak--intro");
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("ak--in"); }); });

    /* ---------- render: hanya menulis ---------- */
    var appeared = false;
    function render(t) {
      var a = seg(t, 0, 5, ease.p1Out);                                     // 0–5 track ke kiri
      var tx = -M.trackEnd * a;
      var lift = seg(t, 5, 8.5, ease.p1InOut) * (M.h - M.listH * 0.5);       // 5–13.5 naik
      track.style.transform = "translate3d(" + px(tx) + "px," + px(lift) + "px,0)";

      // akordeon 3 unit, linear di dalam — tapi progresnya berjalan dengan power3.out (diukur dari situs asli:
      // panel sudah hampir selesai saat track baru 65% jalan)
      var ft = ease.p3Out(clamp01(t / 5)) * 3;
      var sc = lerp(1, 0.5, seg(t, 5, 3, ease.p1InOut));                     // 5–8 scale 0.5
      for (var i = 0; i < F.length; i++) {
        var f = F[i];
        var x = i === 1 ? lerp(-31, 0, clamp01(ft)) * M.vw
              : i === 2 ? lerp(-87, 0, clamp01(ft / 2)) * M.vw : 0;
        f.el.style.transform = "translate3d(" + px(x) + "px,0,0) scale(" + sc.toFixed(4) + ")";

        var p = clamp01(ft / (i + 1));
        var s0 = [0.6, 0.4, 0.2][i], y0 = [5, 25, 35][i], k0 = [1.4, 1.6, 1.8][i];
        f.img.style.transform = "translate3d(0," + px(lerp(y0, 0, p) * M.rem) + "px,0) scale(" + lerp(s0, 1, p).toFixed(4) + ")";
        f.pic.style.transform = "scale(" + lerp(k0, 1, p).toFixed(4) + ")";
        if (i === 2) {
          f.bg.style.transform = "scaleX(" + lerp(0.2, 1, p).toFixed(4) + ")";
          var sx = "translate3d(" + px(lerp(-70, 0, p) * M.rem) + "px,0,0)";
          for (var k = 0; k < f.slide.length; k++) f.slide[k].style.transform = sx;
        }
        // judul panel muncul saat panel sudah melewati 45% layar (dihitung, bukan diukur)
        var show = f.left + tx + x < M.w * 0.45;
        if (show !== f.shown) { f.shown = show; f.el.classList.toggle("is-shown", show); }
      }

      if (list) {
        list.style.transform = "translate3d(0," + px(lift) + "px,0) scale(" + sc.toFixed(4) + ")";
        var par = "translate3d(0," + px(lerp(-9, 9, seg(t, 5, 8.5)) * M.rem) + "px,0)";
        var up = seg(t, 5, 1, ease.p1InOut);
        for (var j = 0; j < cards.length; j++) {
          if (cards[j].img) cards[j].img.style.transform = par;
          if (j < 2) cards[j].inner.style.transform = "translate3d(0," + px(lerp(M.u, 0, up)) + "px,0)";
        }
      }

      var w = seg(t, 3.5, 6, ease.p1InOut);                                  // garis keahlian
      var total = 1 + 0.15 * (lines.length - 1);
      for (var l = 0; l < lines.length; l++) {
        lines[l].style.transform = "scaleX(" + ease.p2Out(clamp01(w * total - l * 0.15)).toFixed(4) + ")";
      }
      var on = t >= 7.5;
      if (on !== appeared) { appeared = on; desc.classList.toggle("is-in", on); }
    }

    /* ---------- loop: baca scrollY → lerp → tulis ---------- */
    var cur = 0, last = -1, prev = 0, raf = 0, alive = true;
    function target() { return clamp01((win.scrollY - M.top) / M.span) * o.units; }
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (M.mobile) return;
      var dt = prev ? Math.min(100, now - prev) : 16.7; prev = now;
      var tg = target();
      if (reduced || o.smooth >= 1) cur = tg;
      else {
        cur += (tg - cur) * (1 - Math.pow(1 - o.smooth, dt / 16.7));
        if (Math.abs(tg - cur) < 0.0002) cur = tg;
      }
      if (Math.abs(cur - last) < 0.00005) return; // diam → tidak menulis apa-apa
      last = cur;
      render(cur);
    }

    var rszT = 0;
    function onResize() { clearTimeout(rszT); rszT = setTimeout(measure, 80); }

    measure();
    cur = M.mobile ? 0 : target();
    win.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    win.addEventListener("load", measure);
    raf = requestAnimationFrame(frame);

    return {
      // render langsung di unit t (0..units) tanpa smoothing — untuk debug / kontrol dari luar
      seek: function (t) { if (!M.mobile) { cur = last = t; render(t); } },
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        clearTimeout(rszT);
        win.removeEventListener("resize", onResize);
        win.removeEventListener("load", measure);
        root.classList.remove("ak--intro", "ak--in", "ak--static");
        root.querySelectorAll("[style]").forEach(function (e) { e.style.transform = ""; });
      }
    };
  }

  global.AkaruProjects = { mount: mount };
})(window);
