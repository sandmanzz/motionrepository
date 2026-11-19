/*
 * Drift Footer
 * Footer bergaris: ilustrasi garis bergeser horizontal mengikuti scroll sampai "mendarat" di posisinya
 * (scrub, linear), garis pemisah tumbuh dari kiri, teks muncul berurutan.
 *
 * Disalin dari footer Floema (GSAP ScrollTrigger) dan dibuat generik lewat atribut data:
 *   data-fd-drift="dari,ke"        mis. "-3vw,0vw" | "100%,0%" (% = lebar elemen itu sendiri) | "-40px,0px"
 *   data-fd-range="mulai,akhir"    opsional, default "1,0": mulai saat TOP pemicu di 100% tinggi layar,
 *                                  selesai saat BOTTOM pemicu di 0% (keluar atas). Floema kursi: "1,1".
 *   data-fd-trigger                pada elemen induk yang jadi pemicu (default: induk langsung)
 *   data-fd-line                   garis yang tumbuh 0 → 100% saat top-nya melewati 98% layar
 *   data-fd-reveal                 grup; anak-anaknya muncul (fade + naik) berurutan saat top grup di 80% layar
 *
 * DriftFooter.mount(root, options) → { destroy }
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    lineAt: 0.98,     // garis mulai tumbuh saat top-nya di 98% tinggi layar
    revealAt: 0.8,    // grup teks muncul saat top-nya di 80% tinggi layar
    stagger: 0.07     // detik antar anak dalam satu grup
  };

  function parse(v) {
    var m = String(v).trim().match(/^(-?[\d.]+)(vw|vh|%|px)?$/);
    return m ? { n: parseFloat(m[1]), u: m[2] || "px" } : { n: 0, u: "px" };
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var win = root.ownerDocument.defaultView || global;

    root.classList.add("fd--js");

    var drifts = Array.from(root.querySelectorAll("[data-fd-drift]")).map(function (el) {
      var parts = el.getAttribute("data-fd-drift").split(",");
      var range = (el.getAttribute("data-fd-range") || "1,0").split(",").map(parseFloat);
      return {
        el: el,
        from: parse(parts[0]), to: parse(parts[1]),
        start: range[0], end: range[1],
        trigger: el.closest("[data-fd-trigger]") || el.parentElement
      };
    });
    var lines = Array.from(root.querySelectorAll("[data-fd-line]"));
    var groups = Array.from(root.querySelectorAll("[data-fd-reveal]")).map(function (g) {
      var kids = Array.from(g.children);
      kids.forEach(function (k, i) { k.classList.add("fd__rv"); k.style.transitionDelay = (i * o.stagger) + "s"; });
      return { el: g, kids: kids, done: false };
    });

    function update() {
      var vh = win.innerHeight;

      drifts.forEach(function (d) {
        var r = d.trigger.getBoundingClientRect();
        var a = vh * d.start;                 // top saat mulai
        var b = vh * d.end - r.height;        // top saat selesai (bottom di vh*end)
        var p = reduced ? 1 : clamp01((a - r.top) / (a - b || 1));
        var u = d.to.u;                       // diasumsikan satuan dari & ke sama
        var x = d.from.n + (d.to.n - d.from.n) * p;
        d.el.style.transform = "translate3d(" + x.toFixed(3) + u + ",0,0)";
      });

      lines.forEach(function (l) {
        if (!l.classList.contains("is-in") && l.getBoundingClientRect().top <= vh * o.lineAt) l.classList.add("is-in");
      });

      groups.forEach(function (g) {
        if (g.done) return;
        var r = g.el.getBoundingClientRect();
        if (r.top <= vh * o.revealAt && r.bottom >= 0) {
          g.done = true;
          g.kids.forEach(function (k) { k.classList.add("is-in"); });
        }
      });
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }
    win.addEventListener("scroll", onScroll, { passive: true });
    win.addEventListener("resize", onScroll);
    update();

    return {
      destroy: function () {
        win.removeEventListener("scroll", onScroll);
        win.removeEventListener("resize", onScroll);
        root.classList.remove("fd--js");
        drifts.forEach(function (d) { d.el.style.transform = ""; });
        lines.forEach(function (l) { l.classList.remove("is-in"); });
        groups.forEach(function (g) { g.kids.forEach(function (k) { k.classList.remove("fd__rv", "is-in"); k.style.transitionDelay = ""; }); });
      }
    };
  }

  global.DriftFooter = { mount: mount };
})(window);
