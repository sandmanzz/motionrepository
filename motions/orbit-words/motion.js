/*
 * Orbit Words
 * Section sticky setinggi beberapa layar. Saat di-scroll, kata-kata muncul satu per satu di posisi atas
 * lalu berputar searah jarum jam mengelilingi objek di tengah, berhenti sejenak di tiap titik (atas → kanan → bawah → kiri).
 *
 * Algoritma disalin dari Switchblade: posisi dihitung dalam koordinat polar (radius + sudut) antar 4 jangkar,
 * progres scroll dihaluskan (lerp 0.045/frame) lalu "ditangga" dengan smoothstep supaya ada jeda di tiap titik.
 *
 * OrbitWords.mount(root, options) → { destroy }
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    words: ["Clarity", "Conviction", "Collaboration", "Care"], // urutan jangkar: atas, kanan, bawah, kiri
    order: [0, 3, 2, 1],   // giliran muncul tiap kata (indeks sama dengan words)
    orbitEnd: 0.72,        // bagian progres section yang dipakai untuk orbit (sisanya: diam lalu pudar)
    fadeStart: 0.86,       // mulai pudar di progres ini
    smooth: 0.045,         // faktor lerp per frame (60fps) — makin kecil makin "berat"
    spin: 24               // derajat goyang objek tengah (rotateY) sepanjang scroll; 0 = diam
  };

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var win = root.ownerDocument.defaultView || global;

    var ring = root.querySelector(".ow__ring");
    var object = root.querySelector(".ow__object");
    var eyebrow = root.querySelector(".ow__eyebrow");
    var POS = ["top", "right", "bottom", "left"];

    // bangun 4 jangkar + item (titik + kata)
    ring.innerHTML = "";
    var anchors = [], items = [];
    o.words.slice(0, 4).forEach(function (w, i) {
      var a = document.createElement("div");
      a.className = "ow__anchor ow__anchor--" + POS[i];
      var it = document.createElement("div");
      it.className = "ow__item";
      it.innerHTML = '<span class="ow__dot"></span><span class="ow__word"></span>';
      it.lastChild.textContent = w;
      a.appendChild(it); ring.appendChild(a);
      anchors.push(a); items.push(it);
    });

    /* ---------- geometri: pusat jangkar → polar terhadap centroid ---------- */
    var home = null, polar = [], centre = { x: 0, y: 0 };
    function measure() {
      var rb = ring.getBoundingClientRect();
      home = anchors.map(function (a) {
        var r = a.getBoundingClientRect();
        return { x: r.left + r.width / 2 - rb.left, y: r.top + r.height / 2 - rb.top };
      });
      centre.x = home.reduce(function (s, p) { return s + p.x; }, 0) / home.length;
      centre.y = home.reduce(function (s, p) { return s + p.y; }, 0) / home.length;
      polar = home.map(function (p) {
        return { r: Math.hypot(p.x - centre.x, p.y - centre.y), a: Math.atan2(p.y - centre.y, p.x - centre.x) };
      });
    }
    // titik di orbit untuk nilai e (0 = atas, 1 = kanan, 2 = bawah, 3 = kiri), sudut selalu maju searah jarum jam
    function orbit(e) {
      var k = ((Math.floor(e) % 4) + 4) % 4, f = e - Math.floor(e);
      var A = polar[k], B = polar[(k + 1) % 4];
      var d = B.a - A.a;
      while (d <= 0) d += Math.PI * 2;
      var ang = A.a + d * f, rad = A.r + (B.r - A.r) * f;
      return { x: centre.x + Math.cos(ang) * rad, y: centre.y + Math.sin(ang) * rad };
    }

    /* ---------- render per frame ---------- */
    var V = 0, raf = 0, last = 0, alive = true;

    function progress() {
      var r = root.getBoundingClientRect();
      var span = root.offsetHeight - win.innerHeight;
      return span > 0 ? clamp01(-r.top / span) : 0;
    }

    function apply(v, p) {
      if (!home) measure();
      var n = 3.5 * clamp01(v / 0.9);
      var a = Math.min(n, 3), fl = Math.floor(a);
      var t = clamp01((a - fl - 0.2) / 0.6);
      var s = Math.min(fl + t * t * (3 - 2 * t), 3);   // tangga: jeda di tiap jangkar, pindah dengan smoothstep

      items.forEach(function (it, i) {
        var turn = o.order[i];
        var op = clamp01((n - turn) / 0.16);
        it.style.opacity = op;
        it.style.filter = op < 1 ? "blur(" + ((1 - op) * 3).toFixed(2) + "px)" : "";
        if (op <= 0) return;
        var pt = orbit(Math.max(0, s - turn));
        it.style.transform = "translate(" + (pt.x - home[i].x).toFixed(1) + "px," + (pt.y - home[i].y).toFixed(1) + "px)";
      });

      // pudar di akhir section
      var f = clamp01((p - o.fadeStart) / (1 - o.fadeStart));
      ring.style.opacity = 1 - f;
      ring.style.filter = f > 0 ? "blur(" + (f * 3).toFixed(2) + "px)" : "";
      if (eyebrow) {
        var e = clamp01(p / 0.04) * (1 - f);
        eyebrow.style.opacity = e;
        eyebrow.style.transform = "translate(-50%," + ((1 - clamp01(p / 0.04)) * -14) + "px)";
      }
      if (object && o.spin) {
        object.style.transform = "translate(-50%,-50%) rotateY(" + (Math.sin(p * Math.PI * 2) * o.spin).toFixed(2) + "deg)";
      }
    }

    function frame(now) {
      if (!alive) return;
      var dt = last ? Math.min(64, now - last) : 16.7; last = now;
      var p = progress();
      var G = clamp01(p / o.orbitEnd);
      if (reduced) V = G;
      else V += (G - V) * (1 - Math.pow(1 - o.smooth, dt / 16.7));
      apply(V, p);
      raf = requestAnimationFrame(frame);
    }

    function onResize() { home = null; }
    win.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    raf = requestAnimationFrame(frame);

    return {
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        win.removeEventListener("resize", onResize);
        ring.innerHTML = "";
        ring.removeAttribute("style");
        if (eyebrow) eyebrow.removeAttribute("style");
        if (object) object.style.transform = "";
      }
    };
  }

  global.OrbitWords = { mount: mount };
})(window);
