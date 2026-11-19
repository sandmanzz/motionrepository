/*
 * Outfit Preloader
 * Kartu foto "dilempar" bertumpuk dengan rotasi acak, huruf wordmark naik dari mask,
 * counter 000 → 100, lalu semuanya keluar dan overlay tersingkap ke atas (clip-path).
 *
 * Timeline disalin dari GSAP aslinya, dijalankan dengan mesin tween kecil tanpa dependency.
 * OutfitLoader.mount(root, options) → { destroy, replay }
 */
(function (global) {
  "use strict";

  /* ---------- easing (setara GSAP) ---------- */
  var E = {
    power3Out: function (p) { return 1 - Math.pow(1 - p, 3); },
    power2InOut: function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; },
    circInOut: function (p) {
      return p < 0.5
        ? (1 - Math.sqrt(1 - Math.pow(2 * p, 2))) / 2
        : (Math.sqrt(1 - Math.pow(-2 * p + 2, 2)) + 1) / 2;
    },
    expoInOut: function (p) {
      if (p === 0 || p === 1) return p;
      return p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
    }
  };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function shuffle(n) {
    var a = []; for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }

  var DEFAULTS = {
    word: "OUTFIT",
    mark: "®",              // tanda kecil di kanan bawah wordmark ("" untuk menghilangkan)
    images: [],             // path gambar; kosong → kartu warna polos
    colors: ["#d9d4cf", "#a8281c", "#ede4dd", "#2b2b2b", "#c7c1ba", "#b9311f"],
    delay: 0.4,             // detik sebelum mulai
    count: 3,               // durasi counter 000 → 100 (detik)
    loop: false,            // putar ulang otomatis (untuk demo/galeri)
    loopGap: 1.6,           // jeda halaman terlihat sebelum loop
    onComplete: null        // dipanggil saat overlay mulai tersingkap (halaman boleh di-unlock)
  };

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var doc = root.ownerDocument;

    /* ---------- markup ---------- */
    root.classList.add("ol");
    root.innerHTML = "";

    var stack = el("div", "ol__stack");
    var n = Math.max(o.images.length, o.images.length ? 0 : 6);
    var cards = [];
    for (var i = 0; i < n; i++) {
      var c;
      if (o.images[i]) {
        c = el("img", "ol__card");
        c.src = o.images[i]; c.alt = ""; c.decoding = "async";
      } else {
        c = el("div", "ol__card");
        c.style.background = o.colors[i % o.colors.length];
      }
      stack.appendChild(c); cards.push(c);
    }

    var center = el("div", "ol__center");
    var word = el("div", "ol__word");
    word.setAttribute("aria-label", o.word);
    var letters = [];
    Array.from(o.word).forEach(function (ch) {
      var s = el("span", "ol__letter"); s.textContent = ch; s.setAttribute("aria-hidden", "true");
      word.appendChild(s); letters.push(s);
    });
    if (o.mark) {
      var m = el("span", "ol__letter ol__mark"); m.textContent = o.mark; m.setAttribute("aria-hidden", "true");
      word.appendChild(m); letters.push(m);
    }
    var countWrap = el("div", "ol__count");
    var count = el("span", "ol__num"); count.textContent = "000";
    countWrap.appendChild(count);
    center.appendChild(word); center.appendChild(countWrap);

    root.appendChild(stack); root.appendChild(center);
    root.setAttribute("role", "progressbar");
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");

    function el(tag, cls) { var e = doc.createElement(tag); e.className = cls; return e; }

    /* ---------- timeline ---------- */
    var tweens, raf = 0, timer = 0, t0 = 0, fired = false, alive = true;

    function build() {
      tweens = [];
      var d = o.delay, L = letters.length, C = cards.length;
      var rotIn = cards.map(function () { return rand(-20, 20); });
      var rotOut = cards.map(function () { return rand(-20, 20); });
      var orderIn = shuffle(L), orderOut = shuffle(L);

      // intro: kartu muncul satu per satu (stagger .2 dari awal), huruf naik (stagger .2 acak)
      cards.forEach(function (c, i) {
        add(d + i * 0.2, 0.6, E.power3Out, function (p) { card(c, lerp(0, 1, p), lerp(0, rotIn[i], p)); });
      });
      letters.forEach(function (l, i) {
        add(d + orderIn[i] * 0.2, 0.6, E.power3Out, function (p) { lift(l, lerp(110, 0, p)); });
      });

      // counter 000 → 100
      add(d, o.count, E.circInOut, function (p) {
        var v = Math.round(p * 100);
        count.textContent = String(v).padStart(3, "0");
        root.setAttribute("aria-valuenow", v);
      });

      // outro dimulai di 90% counter
      var out = d + o.count * 0.9;
      add(out, 1, E.circInOut, function (p) {
        count.style.transform = "translateY(" + lerp(0, -100, p) + "%)";
        count.style.opacity = 1 - p;
      });
      letters.forEach(function (l, i) {
        add(out + orderOut[i] * 0.08, 1.2, E.expoInOut, function (p) { lift(l, lerp(0, -120, p)); });
      });
      cards.forEach(function (c, i) {
        var k = C - 1 - i; // stagger dari belakang
        add(out + k * 0.1, 0.6, E.expoInOut, function (p) { card(c, lerp(1, 0, p), lerp(rotIn[i], rotOut[i], p)); });
      });

      // overlay tersingkap ke atas, mulai di 30% tween kartu terakhir
      var cardsTotal = 0.6 + (C - 1) * 0.1;
      var reveal = out + cardsTotal * 0.3;
      add(reveal, 1.4, E.power2InOut, function (p) {
        root.style.clipPath = "inset(0% 0% " + (p * 100) + "% 0%)";
      });
      tweens.complete = reveal + 1.4 * 0.5;
      tweens.end = reveal + 1.4;
    }

    function add(start, dur, ease, apply) { tweens.push({ s: start, d: dur, e: ease, a: apply }); }
    function card(c, s, r) { c.style.transform = "translate(-50%,-50%) rotate(" + r + "deg) scale(" + s + ")"; }
    function lift(l, y) { l.style.transform = "translateY(" + y + "%)"; }

    // Render: tiap tween yang sudah mulai menimpa yang sebelumnya (urutan = urutan add),
    // tween pertama per properti juga merender nilai awalnya sebelum mulai (seperti immediateRender GSAP).
    function render(t) {
      for (var i = 0; i < tweens.length; i++) {
        var w = tweens[i];
        if (t >= w.s || isFirstFor(w)) w.a(w.e(Math.min(1, Math.max(0, (t - w.s) / w.d))));
      }
      if (!fired && t >= tweens.complete) {
        fired = true;
        root.classList.add("is-done");
        if (typeof o.onComplete === "function") o.onComplete();
      }
    }
    // tween "pembuka" = yang dibuat di fase intro (sebelum outro). Ditandai saat play().
    var firsts;
    function isFirstFor(w) { return firsts.has(w); }

    function frame(now) {
      if (!alive) return;
      var t = (now - t0) / 1000;
      render(t);
      if (t < tweens.end) raf = requestAnimationFrame(frame);
      else {
        root.style.visibility = "hidden";
        if (o.loop) timer = setTimeout(play, o.loopGap * 1000);
      }
    }

    function play() {
      cancelAnimationFrame(raf); clearTimeout(timer);
      fired = false;
      root.classList.remove("is-done");
      root.style.visibility = "";
      root.style.clipPath = "inset(0% 0% 0% 0%)";
      count.style.transform = ""; count.style.opacity = "";
      build();
      // tween intro + counter = 1 + C + L pertama
      firsts = new Set(tweens.slice(0, cards.length + letters.length + 1));

      if (reduced) {
        // tanpa gerak: tampilkan state akhir intro, hitung cepat, lalu pudar
        cards.forEach(function (c) { card(c, 1, 0); });
        letters.forEach(function (l) { lift(l, 0); });
        count.textContent = "100";
        root.style.transition = "opacity .4s";
        timer = setTimeout(function () {
          root.style.opacity = "0";
          if (typeof o.onComplete === "function") o.onComplete();
          timer = setTimeout(function () {
            root.style.visibility = "hidden"; root.style.opacity = ""; root.style.transition = "";
            if (o.loop) timer = setTimeout(play, o.loopGap * 1000);
          }, 400);
        }, 600);
        return;
      }

      render(0);
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // tunggu gambar siap supaya tidak ada kartu kosong saat masuk
    var imgs = cards.filter(function (c) { return c.tagName === "IMG"; });
    Promise.all(imgs.map(function (im) {
      return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
    })).then(function () { if (alive) play(); });

    return {
      replay: play,
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf); clearTimeout(timer);
        root.innerHTML = "";
        root.classList.remove("ol", "is-done");
        root.removeAttribute("style");
        ["role", "aria-valuemin", "aria-valuemax", "aria-valuenow"].forEach(function (a) { root.removeAttribute(a); });
      }
    };
  }

  global.OutfitLoader = { mount: mount };
})(window);
