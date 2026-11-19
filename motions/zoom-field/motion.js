/*
 * Zoom Field
 * Beranda Powerhouse Company: puluhan proyek tersusun spiral dari tengah dalam kolom masonry,
 * melayang di ruang 3D. Scroll/pinch = zoom (maju-mundur), drag = geser, hover = label proyek.
 *
 * Disalin dari kode aslinya (three.js PerspectiveCamera fov 35, z 13) lalu ditulis ulang dengan CSS 3D:
 *   perspective P = (H/2) / tan(17.5°)  ↔  kamera di jarak 13 unit, jadi 1 unit = P/13 px.
 * Tiap tile mengejar targetnya dengan lerp 0.05 (z 0.085) dan sebagian telat 1 frame → gerak "cair".
 *
 * ZoomField.mount(root, { items: [{ src, title, orientation }] }) → { zoomTo, destroy }
 */
(function (global) {
  "use strict";

  var FOV = 35, CAM_Z = 13;
  var RATIO = { square: 1, portrait: 1.5, landscape: 0.8 };

  var DEFAULTS = {
    items: [],
    tile: 0.2326,       // lebar tile saat diam = 23.26% lebar layar (desktop)
    tileMobile: 0.42,
    gapRatio: 0.25,     // jarak antar tile = ¼ tile
    minZ: -10,          // batas zoom keluar (unit)
    maxZ: 5,            //       zoom masuk
    wheel: 0.02,        // unit zoom per deltaY
    drag: 1 / 64,       // unit geser per px drag (touch: 1/32)
    follow: 0.05,       // lerp tile → target (x/y)
    followZ: 0.085,     // lerp z
    intro: true,
    wander: true,       // seluruh bidang hanyut pelan
    word: "STOCKMOTION",
    onOpen: null        // klik tanpa drag pada tile
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerpTo(target, cur, k) { var v = cur + (target - cur) * k; return Math.abs(target - v) < 1e-4 ? target : v; }
  function map01(a, b, v) { return clamp((v - a) / (b - a), 0, 1); }
  var outQuart = function (p) { return 1 - Math.pow(1 - p, 4); };
  var inOutCubic = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

  /* ---------- tata letak: spiral dari tengah (port langsung dari initGrid asli) ---------- */
  function layout(n, aspect) {
    var r = Math.sqrt(n * aspect);
    var cols = r % 2 >= 1 ? Math.floor(r) : Math.ceil(r);
    var rows = Math.ceil(n / cols);
    var a = [];
    for (var y = 0; y < rows; y++) { a.push([]); for (var x = 0; x < cols; x++) a[y].push(-1); }
    (function fill(c0, r0, c1, r1) {
      var u = 0;
      if (c0 < c1 && r0 < r1) {
        u = fill(c0 + 1, r0 + 1, c1 - 1, r1 - 1);
        var line = c1 - c0 === 1 || r1 - r0 === 1, wide = cols > rows;
        var f = wide ? Math.floor((c0 + c1 - 1) / 2) : c0;
        var d = wide ? r0 : Math.floor((r0 + r1 - 1) / 2);
        var hx = wide ? 1 : 0, hy = wide ? 0 : -1, guard = 0;
        while (u < n && a[d] && a[d][f] === -1 && guard++ < 999) {
          a[d][f] = u++;
          f += hx; d += hy;
          if (line) { if (f === c1) f = c0; else if (d < r0) d = r1 - 1; }
          else if (hx === 1 && f === c1) { f -= 1; d += 1; hx = 0; hy = 1; }
          else if (hy === 1 && d === r1) { f -= 1; d -= 1; hx = -1; hy = 0; }
          else if (hx === -1 && f < c0) { f += 1; d -= 1; hx = 0; hy = -1; }
          else if (hy === -1 && d < r0) { f += 1; d += 1; hx = 1; hy = 0; }
        }
      }
      return u;
    })(0, 0, cols, rows);
    return { grid: a, cols: cols, rows: rows };
  }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var win = root.ownerDocument.defaultView || global;
    var doc = root.ownerDocument;

    root.classList.add("zf");
    var stage = doc.createElement("div"); stage.className = "zf__stage";
    var world = doc.createElement("div"); world.className = "zf__world";
    var logo = doc.createElement("div"); logo.className = "zf__logo"; logo.setAttribute("aria-hidden", "true");
    var label = doc.createElement("div"); label.className = "zf__label";
    stage.appendChild(world); root.appendChild(stage); root.appendChild(label);

    Array.from(o.word).forEach(function (ch, i) {
      var s = doc.createElement("span"); s.textContent = ch; s.style.transitionDelay = (0.5 + 0.1 * i) + "s"; logo.appendChild(s);
    });

    /* ---------- tile ---------- */
    var T = o.items.map(function (it, i) {
      var el = doc.createElement("a");
      el.className = "zf__tile";
      el.href = it.href || "#";
      el.setAttribute("aria-label", it.title || "");
      el.draggable = false;
      var img = doc.createElement("img");
      img.src = it.src; img.alt = ""; img.draggable = false; img.decoding = "async";
      el.appendChild(img);
      world.appendChild(el);
      var C = 750 + 1250 * Math.random();
      return {
        el: el, img: img, item: it, index: i,
        ratio: RATIO[it.orientation] || 1,
        px: 0, py: 0,                               // posisi dasar (unit)
        cur: { x: 0, y: 0, z: 0 },
        lagX: [], lagY: [], lagZ: [], lag: Math.ceil(2 * Math.random()),
        scale: 1, scaleT: 1, zoom: 1, zoomT: 1,
        transformDelay: C, duration: 5000 - C + 1000 * Math.random(),
        delay: 2000 * Math.random(), opacityDuration: 1000 + 1000 * Math.random(),
        anim: o.intro && !reduced ? -32 : 0, alpha: o.intro && !reduced ? 0 : 1
      };
    });
    world.appendChild(logo);

    /* ---------- ukuran ---------- */
    var M = { width: 0, height: 0 };
    function measure() {
      M.w = win.innerWidth; M.h = win.innerHeight; M.aspect = M.w / M.h;
      M.tanH = Math.tan(FOV / 2 * Math.PI / 180);
      M.P = (M.h / 2) / M.tanH;                  // perspektif CSS ↔ jarak kamera 13
      M.U = M.P / CAM_Z;                          // px per unit di bidang z = 0
      stage.style.perspective = M.P + "px";
      var mobile = M.w < 768;
      M.c = (mobile ? o.tileMobile : o.tile) * M.w / M.U;   // lebar tile (unit)
      M.g = M.c * o.gapRatio;

      var L = layout(T.length, M.aspect), cols = L.cols;
      var colH = [];
      for (var x = 0; x < cols; x++) {
        colH[x] = L.grid.reduce(function (s, row, ri) {
          var idx = row[x]; if (idx < 0) return s;
          return s + T[idx].ratio * M.c + (ri > 0 ? M.g : 0);
        }, 0);
      }
      var D = Math.max.apply(Math, colH);
      for (x = 0; x < cols; x++) {
        var m = colH[x] / 2;                       // kolom dipusatkan vertikal
        L.grid.forEach(function (row) {
          var idx = row[x]; if (idx < 0) return;
          var t = T[idx];
          t.py = m - t.ratio * M.c / 2; m -= t.ratio * M.c + M.g;
          t.px = (x - (cols / 2 - 0.5)) * (M.g + M.c);
          t.el.style.width = M.c * M.U + "px";
          t.el.style.height = M.c * t.ratio * M.U + "px";
          if (!t.init) { t.init = true; t.cur.x = t.px; t.cur.y = t.py; }
        });
      }
      M.height = D + 2 * M.g;
      M.width = cols * (M.c + M.g) + M.g;

      // wordmark: ±2.26× lebar layar di z = 0 (sama dengan aslinya)
      logo.style.fontSize = "100px";
      var lw = logo.scrollWidth || 1;
      logo.style.fontSize = 100 * (2.26 * M.w) / lw + "px";
      M.logoW = logo.offsetWidth; M.logoH = logo.offsetHeight;
      checkBound();
    }

    /* ---------- kamera & interaksi ---------- */
    var diff = { x: 0, y: 0, z: 0 };
    var should = { x: false, y: false };
    var wanderD = { x: 0, y: 0 }, wanderDir = { x: 1, y: 1 }, wanderAngle = Math.random() * Math.PI * 2;
    var cam = { x: 0, y: 0, z: o.intro && !reduced ? 20 : CAM_Z };
    var mouse = { x: 0, y: 0, cx: 0, cy: 0, moving: false };
    var down = false, dragging = false, last = { x: 0, y: 0 }, start = { x: 0, y: 0 };
    var hovered = null, t0 = performance.now(), logoVirt = { x: 0, y: 0 }, logoAnim = o.intro && !reduced ? -50 : 0;

    function visW(z) { return 2 * M.tanH * (CAM_Z - z) * M.aspect; }
    function visH(z) { return 2 * M.tanH * (CAM_Z - z); }
    function bound() { return { x: M.width - visW(diff.z), y: M.height - visH(diff.z) }; }
    function checkBound() { var b = bound(); should.x = Math.abs(diff.x) > b.x / 2; should.y = Math.abs(diff.y) > b.y / 2; }

    function zoom(dz) { diff.z = clamp(diff.z + dz, o.minZ, o.maxZ); checkBound(); }

    function onWheel(e) { e.preventDefault(); zoom(o.wheel * e.deltaY * (e.deltaMode === 1 ? 16 : 1)); }
    function point(e) { return e.touches ? e.touches[0] : e; }
    var pinchD = 0;
    function onDown(e) {
      if (e.touches && e.touches.length === 2) { pinchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); return; }
      var p = point(e);
      down = true; last.x = start.x = p.clientX; last.y = start.y = p.clientY;
      root.classList.add("is-dragging");
    }
    function onMove(e) {
      if (e.touches && e.touches.length === 2) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoom((d - pinchD) * 0.03); pinchD = d; e.preventDefault(); return;
      }
      var p = point(e), f = e.touches ? o.drag * 2 : o.drag;
      mouse.x = p.clientX; mouse.y = p.clientY; mouse.moving = true;
      if (down) {
        diff.x += (p.clientX - last.x) * f;
        diff.y += -(p.clientY - last.y) * f;
        last.x = p.clientX; last.y = p.clientY;
        if (Math.abs(p.clientX - start.x) + Math.abs(p.clientY - start.y) > 6) dragging = true;
        if (e.touches) e.preventDefault();
      }
      if (!e.touches && !dragging) hover(e.target);
    }
    function onUp(e) {
      if (!down) return;
      var moved = Math.abs(last.x - start.x) + Math.abs(last.y - start.y);
      if (moved < 10 && hovered && typeof o.onOpen === "function") { e.preventDefault && e.preventDefault(); o.onOpen(hovered.item, hovered.index); }
      down = false; dragging = false;
      root.classList.remove("is-dragging");
      checkBound();
    }
    function onLeave() { down = false; dragging = false; root.classList.remove("is-dragging"); hover(null); checkBound(); }
    function onClick(e) { if (e.target.closest(".zf__tile")) e.preventDefault(); }

    function hover(target) {
      var el = target && target.closest ? target.closest(".zf__tile") : null;
      var t = el ? T.filter(function (x) { return x.el === el; })[0] : null;
      if (t === hovered) return;
      if (hovered) { hovered.scaleT = 1; hovered.zoomT = 1; hovered.el.classList.remove("is-hover"); }
      hovered = t;
      if (t) {
        t.scaleT = 1.02; t.zoomT = 1 / 0.98;                // aslinya: scale ×1.02, tekstur zoom 0.98
        t.el.classList.add("is-hover");
        label.textContent = t.item.title || "";
      }
      root.classList.toggle("is-hovering", !!t);
    }

    /* ---------- loop ---------- */
    var raf = 0, alive = true;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var t = now - t0;

      // intro kamera: z 20 → 13 selama 9.5 dtk
      if (o.intro && !reduced) cam.z = 20 - 7 * inOutCubic(map01(0, 9500, t));

      // kamera mengikuti kursor sedikit (±1/3.5 unit), lerp .08
      mouse.cx = lerpTo(mouse.x, mouse.cx, 0.08); mouse.cy = lerpTo(mouse.y, mouse.cy, 0.08);
      cam.x = (mouse.cx / M.w * 2 - 1) / 3.5; cam.y = -(mouse.cy / M.h * 2 - 1) / 3.5;

      // hanyut pelan ±2 unit, berhenti saat hover / drag
      if (o.wander && !reduced && !hovered && !down) {
        ["x", "y"].forEach(function (k) {
          var sp = 0.0015 * (k === "x" ? Math.cos(wanderAngle) : Math.sin(wanderAngle));
          var v = wanderD[k] + wanderDir[k] * sp;
          if (Math.abs(v) > 2) { wanderDir[k] *= -1; wanderAngle = Math.random() * Math.PI * 2; } else wanderD[k] = v;
        });
      }

      // batas: tarik balik pelan (lerp .06) bila keluar setengah batas; keras di ±(b/2 + 2)
      var b = bound();
      ["x", "y"].forEach(function (k) {
        diff[k] = clamp(diff[k], -b[k] / 2 - 2, b[k] / 2 + 2);
        if (should[k] && !down) {
          var tg = b[k] / 2 * Math.sign(diff[k]);
          var v = lerpTo(tg, diff[k], 0.06);
          diff[k] = v; if (v === tg) should[k] = false;
        }
      });

      var U = M.U, camZoff = cam.z - CAM_Z;
      var wx = -cam.x * U, wy = cam.y * U;
      world.style.transform = "translate3d(" + (M.w / 2 + wx).toFixed(1) + "px," + (M.h / 2 + wy).toFixed(1) + "px," + (-camZoff * U).toFixed(1) + "px)";

      for (var i = 0; i < T.length; i++) {
        var p = T[i];
        follow(p, "x", p.px + diff.x, o.follow, p.lagX, p.lag);
        follow(p, "y", p.py + diff.y, o.follow, p.lagY, p.lag);
        follow(p, "z", diff.z, o.followZ, p.lagZ, p.lag * 3);

        // intro: terbang dari z −32 (outQuart), opacity menyusul dengan jeda acak
        if (o.intro && !reduced && (p.anim !== 0 || p.alpha < 1)) {
          var r = p.duration + p.transformDelay;
          p.anim = t < r ? -32 * (1 - outQuart(map01(p.transformDelay, r, t))) : 0;
          var s0 = p.delay + p.transformDelay;
          p.alpha = map01(s0, s0 + p.opacityDuration, t);
        }
        p.scale = lerpTo(p.scaleT, p.scale, 0.1);
        p.zoom = lerpTo(p.zoomT, p.zoom, 0.1);

        var x = (p.cur.x + wanderD.x) * U, y = -(p.cur.y + wanderD.y) * U, z = (p.cur.z + p.anim) * U;
        var w = M.c * U, h = M.c * p.ratio * U;
        p.el.style.transform = "translate3d(" + (x - w / 2).toFixed(1) + "px," + (y - h / 2).toFixed(1) + "px," + z.toFixed(1) + "px) scale(" + p.scale.toFixed(4) + ")";
        p.el.style.opacity = p.alpha.toFixed(3);
        p.el.classList.toggle("is-gray", p.alpha < 0.3);
        p.img.style.transform = "scale(" + p.zoom.toFixed(4) + ")";
      }

      // wordmark mengikuti geseran dengan lerp .1; masuk dari z −50 selama 6 dtk
      logoVirt.x = lerpTo(diff.x, logoVirt.x, 0.1); logoVirt.y = lerpTo(diff.y, logoVirt.y, 0.1);
      if (o.intro && !reduced) logoAnim = -50 * (1 - outQuart(map01(250, 6000, t)));
      label.style.transform = "translate3d(" + mouse.cx.toFixed(1) + "px," + mouse.cy.toFixed(1) + "px,0)";
      logo.style.transform = "translate3d(" + (logoVirt.x * U - M.logoW / 2).toFixed(1) + "px," + (-logoVirt.y * U - M.logoH / 2).toFixed(1) + "px," + ((diff.z + logoAnim) * U).toFixed(1) + "px)";
    }

    // pengejar dengan antrean: tile dengan lag 2 membaca nilai 1 frame lebih lama → gerak berlapis
    function follow(p, k, target, factor, q, size) {
      if (!q.length) for (var j = 0; j < size; j++) q.push(p.cur[k] !== undefined ? (k === "z" ? 0 : p.cur[k]) : 0);
      var newest = q[q.length - 1];
      q.push(newest === target ? target : lerpTo(target, newest, factor));
      if (q.length > size) q.shift();
      p.cur[k] = q[0];
    }

    /* ---------- pasang ---------- */
    var rszT = 0;
    function onResize() { clearTimeout(rszT); rszT = setTimeout(measure, 80); }
    measure();
    requestAnimationFrame(function () { root.classList.add("zf--in"); });

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("mousedown", onDown);
    win.addEventListener("mousemove", onMove);
    win.addEventListener("mouseup", onUp);
    stage.addEventListener("mouseleave", onLeave);
    stage.addEventListener("touchstart", onDown, { passive: true });
    stage.addEventListener("touchmove", onMove, { passive: false });
    stage.addEventListener("touchend", onUp);
    stage.addEventListener("click", onClick);
    win.addEventListener("resize", onResize);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
    raf = requestAnimationFrame(frame);

    return {
      zoomTo: function (z) { diff.z = clamp(z, o.minZ, o.maxZ); checkBound(); },
      destroy: function () {
        alive = false; cancelAnimationFrame(raf); clearTimeout(rszT);
        stage.removeEventListener("wheel", onWheel);
        stage.removeEventListener("mousedown", onDown);
        win.removeEventListener("mousemove", onMove);
        win.removeEventListener("mouseup", onUp);
        stage.removeEventListener("mouseleave", onLeave);
        stage.removeEventListener("touchstart", onDown);
        stage.removeEventListener("touchmove", onMove);
        stage.removeEventListener("touchend", onUp);
        stage.removeEventListener("click", onClick);
        win.removeEventListener("resize", onResize);
        root.innerHTML = "";
        root.classList.remove("zf", "zf--in", "is-dragging", "is-hovering");
      }
    };
  }

  global.ZoomField = { mount: mount };
})(window);
