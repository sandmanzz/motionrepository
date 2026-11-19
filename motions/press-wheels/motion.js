/*
 * Press Wheels
 * Beranda Carter Ogunsola: dua "roller" mesin cetak yang bersentuhan di tengah (nip).
 *   kiri  = roda kartu proyek  (sudut θ, kartu ikut berputar)
 *   kanan = roda pelat logo    (sudut π − θ, dicerminkan) → keduanya naik-turun bersamaan seperti roda gigi
 * Scroll / drag / panah memutar roda satu takik (9 slot per putaran) dan selalu berhenti di detent.
 * Kartu aktif membesar 1.6×; hover = kilau + cincin cahaya mengorbit; klik kartu aktif = buka (video/gambar besar),
 * klik item lain = putar ke item itu. Teks tengah berganti dengan efek "drum" per huruf.
 *
 * Angka dari kode asli: kamera fov 30° z 3.2 · radius 1.14 · overlap .42 · cardW .7 (16:9) · focus 1.6 · plateW .3
 * · tilt X −5° Y 14° · wheel .0011 rad/px · drag .0034 · damp .08 · drift .15 · dim .22
 *
 * PressWheels.mount(root, { items }) → { go, open, close, destroy }
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    items: [],              // [{ title, collab, year, img, mono, video?, href? }]
    slots: 9,               // item per putaran
    fov: 30, camZ: 3.2,
    radius: 1.14, overlap: 0.42,
    cardW: 0.7, focusS: 1.6, plateW: 0.24, plateScale: 1.45,
    tiltX: -5, tiltY: 14,
    drift: 0.15, dim: 0.22,
    wheel: 0.0011, drag: 0.0034,
    damp: 0.08,             // lerp per frame @60fps untuk sudut yang dirender
    calm: 260,              // ms tanpa input sebelum berlabuh ke detent
    shear: 9,               // derajat skew per rad/frame kecepatan (pengganti "kain" shader)
    onOpen: null
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mod(v, m) { return ((v % m) + m) % m; }
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  var D2R = Math.PI / 180;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- teks "drum": tiap huruf berputar keluar/masuk ---------- */
  function drum(node) {
    var cur = null;
    return function set(text, dir) {
      if (text === cur) return;
      var old = node.querySelector(".pw__dl:not(.is-out)");
      var line = el("span", "pw__dl");
      Array.from(String(text)).forEach(function (ch, i) {
        var s = el("span", "pw__dc"); s.textContent = ch === " " ? " " : ch;
        s.style.transitionDelay = (i * 0.018) + "s";
        s.style.transform = "translateY(" + (dir >= 0 ? 105 : -105) + "%) rotateX(" + (dir >= 0 ? -70 : 70) + "deg)";
        line.appendChild(s);
      });
      node.appendChild(line);
      line.getBoundingClientRect();                                   // reflow sekali agar transisi jalan
      Array.from(line.children).forEach(function (s) { s.style.transform = ""; s.style.opacity = 1; });
      if (old) {
        old.classList.add("is-out");
        Array.from(old.children).forEach(function (s, i) {
          s.style.transitionDelay = (i * 0.012) + "s";
          s.style.transform = "translateY(" + (dir >= 0 ? -105 : 105) + "%) rotateX(" + (dir >= 0 ? 70 : -70) + "deg)";
          s.style.opacity = 0;
        });
        setTimeout(function () { old.remove(); }, 700);
      }
      cur = text;
    };
  }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var items = o.items, K = items.length;
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)");
    var win = root.ownerDocument.defaultView || global;
    var Z = Math.PI * 2 / o.slots;                                    // sudut per takik

    root.classList.add("pw");
    root.tabIndex = 0;
    root.setAttribute("role", "listbox");
    root.setAttribute("aria-label", "Proyek");
    var stage = el("div", "pw__stage"); root.appendChild(stage);
    var wl = el("div", "pw__wheel pw__wheel--l"), wr = el("div", "pw__wheel pw__wheel--r");
    stage.appendChild(wl); stage.appendChild(wr);

    // kartu & pelat
    var cards = items.map(function (it, i) {
      var c = el("div", "pw__card");
      c.innerHTML = '<div class="pw__cardIn"><img alt="" draggable="false"><span class="pw__sheen"></span></div><span class="pw__ring"></span>';
      c.querySelector("img").src = it.img;
      c.dataset.i = i; wl.appendChild(c);
      var p = el("div", "pw__plate");
      p.innerHTML = '<span class="pw__mono"></span>';
      p.querySelector(".pw__mono").textContent = it.mono || (it.title || "").slice(0, 2).toUpperCase();
      p.dataset.i = i; p.style.setProperty("--seed", (i * 0.618) % 1); wr.appendChild(p);
      return { c: c, p: p, img: c.querySelector("img"), ring: c.querySelector(".pw__ring"), hov: 0, hovT: 0 };
    });

    // kolom tengah
    var mid = el("div", "pw__mid");
    mid.innerHTML = '<div class="pw__eyebrow"></div><div class="pw__title"></div><div class="pw__chips"><span class="pw__chip pw__c1"></span><span class="pw__chip pw__c2"></span></div><a class="pw__cta" href="#">View project</a>';
    root.appendChild(mid);
    var setEyebrow = drum(mid.querySelector(".pw__eyebrow")), setTitle = drum(mid.querySelector(".pw__title"));
    var setC1 = drum(mid.querySelector(".pw__c1")), setC2 = drum(mid.querySelector(".pw__c2"));
    var cta = mid.querySelector(".pw__cta");
    var live = el("div", "pw__sr"); live.setAttribute("aria-live", "polite"); root.appendChild(live);

    // panel buka
    var openBox = el("div", "pw__open");
    openBox.innerHTML = '<button class="pw__close" type="button" aria-label="Tutup">Close</button>';
    root.appendChild(openBox);

    /* ---------- ukuran ---------- */
    var M = {};
    function measure() {
      M.w = root.clientWidth; M.h = root.clientHeight;
      var visH = 2 * Math.tan(o.fov / 2 * D2R) * o.camZ;           // tinggi terlihat di z=0 (unit dunia)
      M.U = M.h / visH;                                             // px per unit
      M.mobile = M.w < 820;
      stage.style.perspective = (o.camZ * M.U) + "px";
      var visW = visH * M.w / M.h;
      var R = o.radius;
      M.R = R;
      M.Mt = visW / 2 - R * o.overlap;                              // jarak nip → tepi roda
      if (M.mobile) M.Mt = visW / 2 - R * 0.15;
      M.cardW = o.cardW * M.U; M.cardH = M.cardW * 9 / 16;
      M.plate = o.plateW * M.U;
      cards.forEach(function (k) {
        k.c.style.width = M.cardW + "px"; k.c.style.height = M.cardH + "px";
        k.c.style.marginLeft = (-M.cardW / 2) + "px"; k.c.style.marginTop = (-M.cardH / 2) + "px";
        k.p.style.width = M.plate + "px"; k.p.style.height = (M.plate * 1.12) + "px";
        k.p.style.marginLeft = (-M.plate / 2) + "px"; k.p.style.marginTop = (-M.plate * 0.56) + "px";
      });
      var cx = M.w / 2, cy = M.h / 2;
      wl.style.transform = "translate3d(" + (cx - (M.Mt + R) * M.U) + "px," + cy + "px,0) rotateX(" + (-o.tiltX) + "deg) rotateY(" + o.tiltY + "deg)";
      wr.style.transform = "translate3d(" + (cx + (M.Mt + R) * M.U) + "px," + cy + "px,0) rotateX(" + (-o.tiltX) + "deg) rotateY(" + (-o.tiltY) + "deg)";
    }

    /* ---------- status putaran ---------- */
    var V = 0, B = 0, Bprev = 0, vel = 0, lastInput = -1e9, active = -1, dragging = false;
    var openState = 0, openT = 0, openIdx = -1;
    function indexOf(angle) { return mod(Math.round(-angle / Z), K); }
    function go(i) {                                                 // putar ke item i lewat jalur terpendek
      var cur = Math.round(-V / Z), d = mod(i - cur + K / 2, K) - K / 2;
      V = -(cur + Math.round(d)) * Z; lastInput = performance.now() - o.calm;
    }

    /* ---------- input ---------- */
    var lastWheel = 0;
    function onWheel(e) {
      if (e.ctrlKey) return;
      e.preventDefault();
      if (openState) { close(); return; }
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? M.h : 1);
      var now = performance.now(), gap = now - lastWheel; lastWheel = now;
      if (gap > 40 && Math.abs(dy) >= 60) {                         // roda mouse bertakik → tepat satu item
        V = (Math.round(V / Z) - Math.sign(dy)) * Z;
      } else {                                                       // trackpad → kontinu
        var step = -dy * o.wheel, lim = gap > 40 ? Z * 0.5 : Infinity;
        V += clamp(step, -lim, lim);
      }
      lastInput = now;
    }
    var px0 = 0, py0 = 0, lx = 0, ly = 0, flickV = 0, moved = false, downTarget = null;
    function onDown(e) {
      if (e.button !== 0 || e.target.closest(".pw__cta, .pw__close")) return;
      dragging = true; moved = false; downTarget = e.target;
      px0 = lx = e.clientX; py0 = ly = e.clientY; flickV = 0;
      try { root.setPointerCapture(e.pointerId); } catch (_) {}
      root.classList.add("is-grab");
    }
    function onMove(e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (!dragging) return;
      var d = (ly - e.clientY) + (e.clientX - lx);
      if (Math.hypot(e.clientX - px0, e.clientY - py0) > 8) moved = true;
      var f = e.pointerType === "touch" ? Z / 90 : o.drag;
      V += d * f; flickV = flickV * 0.7 + d * 0.3;
      lx = e.clientX; ly = e.clientY; lastInput = performance.now();
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false; root.classList.remove("is-grab");
      try { root.releasePointerCapture(e.pointerId); } catch (_) {}
      if (!moved) { click(downTarget); return; }
      V += flickV * 90 * o.drag * 0.02; lastInput = performance.now();   // = Wt·flick(90)·drag·0.02 seperti aslinya
    }
    function click(t) {
      if (openState) { close(); return; }
      var hit = t && t.closest && t.closest(".pw__card, .pw__plate");
      if (!hit) return;
      var i = +hit.dataset.i;
      if (i === active && hit.classList.contains("pw__card")) open(i); else go(i);
    }
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); V = (Math.round(V / Z) - 1) * Z; lastInput = performance.now() - o.calm; }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); V = (Math.round(V / Z) + 1) * Z; lastInput = performance.now() - o.calm; }
      if (e.key === "Enter" && !openState) open(active);
      if (e.key === "Escape") close();
    }
    var mouse = { x: -1e4, y: -1e4 };

    /* ---------- buka / tutup ---------- */
    var vid = null;
    function open(i) {
      if (i < 0) return;
      openIdx = i; openState = 1; root.classList.add("is-open");
      var it = items[i];
      if (it.video && !reduced.matches) {
        vid = el("video", "pw__video"); vid.muted = true; vid.loop = true; vid.playsInline = true; vid.src = it.video;
        cards[i].c.querySelector(".pw__cardIn").appendChild(vid); vid.play().catch(function () {});
      }
      if (typeof o.onOpen === "function") o.onOpen(it, i);
    }
    function close() {
      if (!openState) return;
      openState = 0; root.classList.remove("is-open");
      if (vid) { vid.pause(); vid.remove(); vid = null; }
    }
    openBox.querySelector(".pw__close").addEventListener("click", function (e) { e.stopPropagation(); close(); });
    cta.addEventListener("click", function (e) { e.preventDefault(); open(active); });

    /* ---------- loop ---------- */
    var raf = 0, prev = performance.now(), t0 = prev;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(now - prev, 64) / 1000; prev = now;
      var k60 = dt * 60;

      // berlabuh ke detent setelah tenang
      if (!dragging && now - lastInput > o.calm) V += (Math.round(V / Z) * Z - V) * (1 - Math.pow(1 - 0.24, k60));
      Bprev = B;
      B += (V - B) * (reduced.matches ? 1 : 1 - Math.pow(1 - o.damp * 1.6, k60));
      vel += ((B - Bprev) / Math.max(k60, 0.001) - vel) * 0.25;
      openT += (openState - openT) * (1 - Math.pow(1 - 0.12, k60));

      var idx = indexOf(V);
      if (idx !== active) {
        var dir = active < 0 ? 1 : (mod(idx - active + K / 2, K) - K / 2 > 0 ? 1 : -1);
        active = idx;
        var it = items[idx];
        setEyebrow("N°" + String(idx + 1).padStart(2, "0") + " / " + K, dir);
        setTitle(it.title, dir);
        setC1((it.collab || "").toUpperCase(), dir); setC2(String(it.year || ""), dir);
        cta.href = it.href || "#";
        live.textContent = it.title + ", " + (it.collab || "") + ", " + (it.year || "") + ". " + (idx + 1) + " of " + K + ".";
        cards.forEach(function (c, j) { c.c.setAttribute("aria-selected", j === idx); });
      }

      // kilau & cincin di kartu aktif — dibaca SEBELUM menulis transform frame ini (tanpa layout thrash)
      var a = cards[active];
      if (a) {
        var rc = a.c.getBoundingClientRect();
        var inside = mouse.x > rc.left && mouse.x < rc.right && mouse.y > rc.top && mouse.y < rc.bottom;
        cards.forEach(function (c) { c.hovT = c === a && inside && !dragging ? 1 : 0; });
        if (inside) {
          var mx = (mouse.x - rc.left) / rc.width, my = (mouse.y - rc.top) / rc.height;
          a.c.style.setProperty("--mx", (mx * 100).toFixed(1) + "%"); a.c.style.setProperty("--my", (my * 100).toFixed(1) + "%");
          a.img.style.transform = "scale(1.06) translate(" + ((0.5 - mx) * 10).toFixed(1) + "px," + ((0.5 - my) * 8).toFixed(1) + "px)";
          a.ring.style.setProperty("--cur", (Math.atan2(my - 0.5, mx - 0.5) / D2R + 90).toFixed(1) + "deg");
        } else a.img.style.transform = "";
        a.c.style.setProperty("--hov", a.hov.toFixed(3));
        a.ring.style.setProperty("--head", (((now - t0) * 0.055) % 360).toFixed(1) + "deg");
        root.classList.toggle("is-hover", inside && !openState);
      }
      var U = M.U, R = M.R * U, half = o.slots / 2;
      var shear = clamp(vel * o.shear * 60, -18, 18);
      var speed = Math.min(Math.abs(vel) * 40, 1);
      for (var i = 0; i < K; i++) {
        var k = cards[i];
        var n = mod(i + B / Z + K / 2, K) - K / 2;                 // posisi relatif terhadap slot aktif
        var vis = 1 - sstep(Math.abs(n) - (half - 1));
        var f = 1 - sstep(Math.abs(n));                             // 1 = aktif
        var th = n * Z;
        var isOpen = openT > 0.001 && i === openIdx;

        // kartu (roda kiri): pusat di tepi lingkaran, ikut berputar
        var sc = (0.9 + (o.focusS - 0.9) * f) * (1 / 0.9 * 0.9);
        var drift = o.drift * o.focusS * f * U * o.cardW;
        k.hov += (k.hovT - k.hov) * (1 - Math.pow(1 - 0.14, k60));
        var x = Math.cos(th) * R + drift, y = -Math.sin(th) * R, z = (f * 0.06 + k.hov * 0.025) * U;
        var rot = -th / D2R, extra = "";
        if (isOpen) {                                              // kartu terbuka: ke tengah layar, lebih besar, tegak
          var e = openT, cxw = (M.Mt + M.R) * U;
          x = x + (cxw - x) * e; y = y * (1 - e); z = z + (0.4 * U - z) * e; rot *= (1 - e);
          sc = sc + (Math.min(M.w * 0.62 / M.cardW, M.h * 0.66 / M.cardH) - sc) * e;
          extra = " rotateY(" + (-o.tiltY * e) + "deg) rotateX(" + (o.tiltX * e) + "deg)";
        }
        k.c.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + z.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)" + extra +
          " skewY(" + (shear * (1 - f * 0.4)).toFixed(2) + "deg) scale(" + sc.toFixed(4) + ")";
        var dim = isOpen ? 1 : 1 - o.dim * (1 - f) - 0.25 * speed * (1 - f);
        k.c.style.filter = "brightness(" + dim.toFixed(3) + ")";
        k.c.style.opacity = (openT > 0.01 && !isOpen ? vis * (1 - openT * 0.85) : vis).toFixed(3);
        k.c.style.zIndex = isOpen ? 50 : Math.round(f * 10) + 1;
        k.c.style.visibility = vis < 0.01 ? "hidden" : "visible";
        k.c.classList.toggle("is-active", f > 0.5);

        // pelat (roda kanan): sudut π − θ → bergerak bersama di nip
        var pf = f, psc = 0.85 + (o.plateScale - 0.85) * pf;
        var px = -Math.cos(th) * R, py = -Math.sin(th) * R;
        k.p.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px," + (pf * 0.05 * U).toFixed(1) + "px) rotate(" + (th / D2R).toFixed(2) + "deg) scale(" + psc.toFixed(4) + ")";
        k.p.style.opacity = (vis * (1 - openT * 0.85)).toFixed(3);
        k.p.style.filter = "brightness(" + (1 - o.dim * (1 - pf)).toFixed(3) + ")";
        k.p.style.visibility = vis < 0.01 ? "hidden" : "visible";
        k.p.style.zIndex = Math.round(pf * 10) + 1;
        k.p.style.setProperty("--sweep", (((now - t0) / 4000 + B * 0.35 + i * 0.13) % 2).toFixed(3));
      }

    }

    var ro = new ResizeObserver(measure);
    measure(); ro.observe(root);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onDown);
    win.addEventListener("pointermove", onMove);
    win.addEventListener("pointerup", onUp);
    root.addEventListener("keydown", onKey);
    raf = requestAnimationFrame(frame);

    return {
      go: go, open: function (i) { open(i == null ? active : i); }, close: close,
      destroy: function () {
        cancelAnimationFrame(raf); ro.disconnect(); close();
        root.removeEventListener("wheel", onWheel); root.removeEventListener("pointerdown", onDown);
        win.removeEventListener("pointermove", onMove); win.removeEventListener("pointerup", onUp);
        root.removeEventListener("keydown", onKey);
        root.innerHTML = ""; root.classList.remove("pw", "is-open", "is-hover", "is-grab");
      }
    };
  }

  global.PressWheels = { mount: mount };
})(window);
