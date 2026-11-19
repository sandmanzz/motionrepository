/*
 * Product Swap Conveyor
 * ---------------------------------------------------------------
 * Kartu produk mengalir dari kanan ke kiri mengikuti kurva cosinus.
 * Mode AUTO  : kartu yang paling dekat titik fokus menentukan apa yang dipakai model.
 * Mode LOCK  : klik kartu / chip mengunci produk itu; klik lagi (atau Esc / chip Auto) melepas.
 *
 * Pemakaian:
 *   const swap = ProductSwap.mount(document.querySelector('[data-product-swap]'), {
 *     base: 'assets/model/base.webp',
 *     products: [{ key, label, image, worn }, ...]
 *   });
 *   swap.select('cap'); swap.auto(); swap.destroy();
 *
 * Tanpa dependency. Butuh markup dari index.html dan style dari motion.css.
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    base: "",            // foto model tanpa produk (tampil sebelum ada pilihan)
    products: [],        // { key, label, image (cutout kartu), worn (model memakai produk) }
    speed: 1 / 2.9,      // kecepatan alir, dalam "lebar kartu per detik"
    focusOffset: 0.9,    // titik fokus = tengah stage + focusOffset * lebar kartu
    waveTop: 0.03,       // posisi puncak gelombang (fraksi tinggi stage)
    waveDepth: 0.55,     // kedalaman gelombang (fraksi tinggi stage)
    waveLength: 1.2,     // panjang gelombang (fraksi lebar stage)
    fade: 250,           // ms, samakan dengan --ps-fade di CSS
    onChange: null       // function (key, mode) {}
  };

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var products = o.products;
    if (!root || !products.length) return null;

    var stage = root.querySelector("[data-ps-stage]");
    var track = root.querySelector("[data-ps-track]");
    var model = root.querySelector("[data-ps-model]");
    var controls = root.querySelector("[data-ps-controls]");
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- model layers (semua dimuat di awal agar swap instan) ---------- */
    var layers = {};
    function addLayer(key, src) {
      var img = new Image();
      img.className = "ps__layer";
      img.alt = "";
      img.decoding = "async";
      img.src = src;
      model.appendChild(img);
      layers[key] = img;
    }
    addLayer("__base", o.base || products[0].worn);
    products.forEach(function (p) { addLayer(p.key, p.worn); });
    layers.__base.classList.add("is-on", "is-top");
    model.setAttribute("role", "img");

    var shown = "__base";
    var fadeTimer = 0;
    function show(key) {
      if (key === shown || !layers[key]) return;
      var next = layers[key];
      var prev = layers[shown];
      Object.keys(layers).forEach(function (k) {
        if (layers[k] !== next && layers[k] !== prev) layers[k].classList.remove("is-on", "is-top");
      });
      prev.classList.remove("is-top");
      next.classList.add("is-on", "is-top");       // fade-in di atas layer lama
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function () { prev.classList.remove("is-on"); }, o.fade);
      shown = key;
    }

    /* ---------- state ---------- */
    var cards = [];          // elemen kartu (produk diulang sampai memenuhi lebar)
    var zCache = [];
    var W = 0, H = 0, cardW = 0;
    var offsetTime = 0;      // detik "aktif" (berhenti saat tidak terlihat)
    var last = 0, raf = 0, visible = true, destroyed = false;
    var locked = null;       // key produk yang dikunci, null = auto
    var focusIndex = -1;
    var activeKey = null;

    function label(key) {
      for (var i = 0; i < products.length; i++) if (products[i].key === key) return products[i].label;
      return "";
    }

    function setActive(key) {
      if (key === activeKey) return;
      activeKey = key;
      show(key);
      model.setAttribute("aria-label", "Model memakai: " + label(key));
      if (typeof o.onChange === "function") o.onChange(key, locked ? "lock" : "auto");
    }

    function paintCards() {
      for (var i = 0; i < cards.length; i++) {
        var on = locked ? cards[i].dataset.key === locked : i === focusIndex;
        cards[i].classList.toggle("is-active", on);
      }
    }

    function paintChips() {
      if (!controls) return;
      var chips = controls.querySelectorAll("[data-ps-chip]");
      for (var i = 0; i < chips.length; i++) {
        var k = chips[i].dataset.psChip;
        chips[i].setAttribute("aria-pressed", String(k === "auto" ? !locked : k === locked));
      }
    }

    function select(key) {
      locked = locked === key ? null : key;   // klik produk yang sama = lepas kunci
      if (locked) setActive(locked);
      else if (focusIndex > -1) setActive(cards[focusIndex].dataset.key);
      paintCards();
      paintChips();
    }
    function auto() { if (locked) select(locked); }

    /* ---------- build ---------- */
    function buildCards(count) {
      track.textContent = "";
      cards = [];
      zCache = [];
      for (var i = 0; i < count; i++) {
        var p = products[i % products.length];
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ps__card";
        b.dataset.key = p.key;
        b.tabIndex = -1;                       // keyboard memakai chip di bawah stage
        b.setAttribute("aria-hidden", "true");
        var img = new Image();
        img.className = "ps__card-img";
        img.alt = "";
        img.draggable = false;
        img.src = p.image;
        var s = document.createElement("span");
        s.className = "ps__card-label";
        s.textContent = p.label;
        b.appendChild(img);
        b.appendChild(s);
        track.appendChild(b);
        cards.push(b);
      }
    }

    function buildChips() {
      if (!controls) return;
      controls.textContent = "";
      [{ key: "auto", label: "Auto" }].concat(products).forEach(function (p) {
        var c = document.createElement("button");
        c.type = "button";
        c.className = "ps__chip";
        c.dataset.psChip = p.key;
        c.textContent = p.label;
        controls.appendChild(c);
      });
      paintChips();
    }

    function measure() {
      W = stage.clientWidth;
      H = stage.clientHeight;
      var probe = cards[0];
      if (!probe) { buildCards(products.length); probe = cards[0]; }
      cardW = probe.offsetWidth;
      var gap = parseFloat(getComputedStyle(root).getPropertyValue("--ps-gap")) ||
        Math.min(Math.max(16, 0.016 * global.innerWidth), 32);
      // getPropertyValue pada clamp() mengembalikan string mentah -> hitung manual bila NaN/kecil
      if (!(gap >= 1) || /clamp|vw/.test(getComputedStyle(root).getPropertyValue("--ps-gap"))) {
        gap = Math.min(Math.max(16, 0.016 * global.innerWidth), 32);
      }
      var need = Math.ceil((W + 2 * cardW) / (cardW + gap));
      var count = Math.max(products.length, Math.ceil(need / products.length) * products.length);
      if (count !== cards.length) buildCards(count);
    }

    /* ---------- frame ---------- */
    function render() {
      var n = cards.length;
      if (!n || !W) return;
      var span = W + 2 * cardW;
      var step = span / n;
      var shift = reduced ? 0 : offsetTime * o.speed * cardW;
      var focusX = W / 2 + o.focusOffset * cardW;
      var best = -1, bestD = Infinity;

      for (var i = 0; i < n; i++) {
        var x = (i * step - shift) % span;
        if (x < 0) x += span;
        x -= cardW;
        var y = o.waveTop * H +
          o.waveDepth * H * (0.5 - 0.5 * Math.cos((x / (o.waveLength * W)) * Math.PI * 2));
        cards[i].style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0)";
        var z = String(Math.round((x + cardW) / 20));   // kartu di kanan menumpuk di atas
        if (zCache[i] !== z) { zCache[i] = z; cards[i].style.zIndex = z; }
        var d = Math.abs(x + cardW / 2 - focusX);
        if (d < bestD) { bestD = d; best = i; }
      }

      if (best !== focusIndex) {
        focusIndex = best;
        if (!locked) { setActive(cards[best].dataset.key); paintCards(); }
      }
      root.classList.add("is-ready");
    }

    function tick(now) {
      if (destroyed) return;
      var dt = Math.min((now - last) / 1000, 0.1);   // clamp: tab yang baru aktif tidak melompat
      last = now;
      offsetTime += dt;
      render();
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (reduced || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    /* ---------- events ---------- */
    function onTrackClick(e) {
      var card = e.target.closest(".ps__card");
      if (card) select(card.dataset.key);
    }
    function onControlsClick(e) {
      var chip = e.target.closest("[data-ps-chip]");
      if (!chip) return;
      if (chip.dataset.psChip === "auto") auto(); else select(chip.dataset.psChip);
    }
    function onKey(e) { if (e.key === "Escape") auto(); }
    function onVisibility() { if (document.hidden) stop(); else start(); }

    var ro = new ResizeObserver(function () { measure(); focusIndex = -1; render(); paintCards(); });
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    });

    track.addEventListener("click", onTrackClick);
    if (controls) controls.addEventListener("click", onControlsClick);
    root.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);

    buildChips();
    measure();
    render();
    ro.observe(stage);
    io.observe(stage);
    start();

    return {
      select: function (key) { if (locked !== key) select(key); },
      auto: auto,
      get active() { return activeKey; },
      get mode() { return locked ? "lock" : "auto"; },
      destroy: function () {
        destroyed = true;
        stop();
        clearTimeout(fadeTimer);
        ro.disconnect();
        io.disconnect();
        track.removeEventListener("click", onTrackClick);
        if (controls) controls.removeEventListener("click", onControlsClick);
        root.removeEventListener("keydown", onKey);
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }

  global.ProductSwap = { mount: mount };
})(window);
