/*
 * Card Helix
 * Kartu remi yang melengkung mengikuti silinder, tersusun di jalur heliks dan berputar terus (ebuka.marketing).
 *   posisi kartu ke-n dari tengah:  sudut = −n · 2π/kartuPerPutaran,  y = n · jarakVertikal
 *   x = sin(sudut)·R,  z = cos(sudut)·R,  rotY = sudut
 *   a = (1 − cos sudut)/2  (0 = paling depan, 1 = paling belakang) → miring (shear), blur (mip bias), redup
 * Ditulis ulang dengan WebGL2 mentah (aslinya three.js). Muka kartu digambar sendiri di canvas 2D,
 * atau pakai gambar (opsi items[].src). Sisi belakang kartu = gambar/ornamen terpisah.
 *
 * CardHelix.mount(root, options) → { destroy }
 */
(function (global) {
  "use strict";

  var VERT = [
    "#version 300 es",
    "in vec3 aPos; in vec2 aUv;",
    "uniform mat4 uProj, uView, uModel; uniform float uShear;",
    "out vec2 vUv;",
    "void main(){ vUv = aUv; vec3 p = aPos; p.y += uShear * p.x; gl_Position = uProj * uView * uModel * vec4(p, 1.0); }"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uFront, uBack; uniform float uBlur, uDim, uOpacity, uGray;",
    "in vec2 vUv; out vec4 o;",
    "void main(){",
    "  vec4 c = gl_FrontFacing ? texture(uFront, vUv, uBlur) : texture(uBack, vec2(1.0 - vUv.x, vUv.y), uBlur);",
    "  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));",
    "  c.rgb = mix(c.rgb, vec3(l), uGray) * uDim;",
    "  o = c * uOpacity;",                                   // tekstur premultiplied
    "}"
  ].join("\n");

  var TEX_W = 400, PAD = 64;                     // lebar muka kartu di tekstur + margin transparan (ruang untuk blur)

  var DEFAULTS = {
    items: [],              // [{ label, suit, src? }]
    back: null,             // url gambar sisi belakang; null = ornamen digambar sendiri
    repeat: 4,              // daftar diulang supaya heliks penuh
    speed: 0.5,             // kartu per detik
    direction: "down",
    radius: 300,
    cardWidth: 200,
    cardHeight: 280,
    verticalSpacing: 80,
    perspective: 4000,
    cardsPerTurn: 9,
    rotation: 0,
    cardTilt: 25,           // derajat kemiringan di belakang
    centerScale: 0.9,
    edgeFade: 0.5,
    edgeBlur: 10,
    depthDim: 0.5,
    grayscale: 0,
    viewHeight: null,       // null = tinggi kontainer
    drag: true,             // tarik untuk memutar (tambahan; aslinya otomatis saja)
    colors: { card: "#141414", gold: "#c9a64b", ink: "#e7cf8a" },
    font: "'DM Serif Display', Georgia, serif"
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap(v, m) { return ((v % m) + m) % m; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t); }

  /* ---------- matriks kecil (kolom-mayor) ---------- */
  function perspective(fovy, asp, n, f) {
    var t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
  }
  function model(x, y, z, ry, s) {
    var c = Math.cos(ry), sn = Math.sin(ry);
    return new Float32Array([c * s, 0, -sn * s, 0, 0, s, 0, 0, sn * s, 0, c * s, 0, x, y, z, 1]);
  }

  /* ---------- muka & punggung kartu digambar di canvas ---------- */
  function cardCanvas(h, draw) {
    var cv = document.createElement("canvas");
    cv.width = TEX_W + PAD * 2; cv.height = h + PAD * 2;
    var g = cv.getContext("2d");
    g.translate(PAD, PAD);
    draw(g, TEX_W, h);
    return cv;
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }

  function drawFace(o, item) {
    return function (g, w, h) {
      var C = o.colors;
      roundRect(g, 0, 0, w, h, 10); g.fillStyle = C.card; g.fill();
      g.lineWidth = 7; g.strokeStyle = C.gold; roundRect(g, 3.5, 3.5, w - 7, h - 7, 8); g.stroke();
      g.fillStyle = C.gold; g.textAlign = "center"; g.textBaseline = "middle";
      var suit = item.suit || "♠";
      // indeks pojok
      g.font = "34px " + o.font; g.fillText("A", 34, 44); g.font = "26px serif"; g.fillText(suit, 34, 78);
      g.save(); g.translate(w - 34, h - 44); g.rotate(Math.PI);
      g.font = "34px " + o.font; g.fillText("A", 0, 0); g.font = "26px serif"; g.fillText(suit, 0, -34); g.restore();
      if (item.image) {
        var iw = w * 0.62, ih = iw * item.image.height / item.image.width;
        g.drawImage(item.image, (w - iw) / 2, (h - ih) / 2, iw, ih);
      } else {
        // label merek di tengah, dipecah per kata
        var words = String(item.label || "").split(" ");
        var size = words.length > 1 ? 46 : 54;
        g.font = size + "px " + o.font; g.fillStyle = C.ink;
        words.forEach(function (wd, i) { g.fillText(wd, w / 2, h / 2 + (i - (words.length - 1) / 2) * size * 1.05); });
        g.fillStyle = C.gold; g.fillRect(w / 2 - 22, h / 2 + words.length * size * 0.6 + 6, 44, 3);
      }
    };
  }
  function drawBack(o) {
    return function (g, w, h) {
      var C = o.colors;
      roundRect(g, 0, 0, w, h, 10); g.fillStyle = C.card; g.fill();
      g.save(); roundRect(g, 18, 18, w - 36, h - 36, 6); g.clip();
      g.strokeStyle = C.gold; g.globalAlpha = 0.55; g.lineWidth = 1.5;
      for (var i = -h; i < w + h; i += 22) {                 // kisi berlian
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
        g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
      }
      g.restore();
      g.globalAlpha = 1; g.lineWidth = 6; g.strokeStyle = C.gold; roundRect(g, 3, 3, w - 6, h - 6, 8); g.stroke();
      g.lineWidth = 2; roundRect(g, 18, 18, w - 36, h - 36, 6); g.stroke();
      g.beginPath(); g.arc(w / 2, h / 2, 52, 0, Math.PI * 2); g.fillStyle = C.card; g.fill(); g.lineWidth = 3; g.stroke();
      g.fillStyle = C.gold; g.font = "64px " + o.font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("S", w / 2, h / 2 + 4);
    };
  }

  /* ---------- geometri: bidang 64 segmen dibengkokkan ke silinder ---------- */
  function bentPlane(w, h, R) {
    var seg = 64, pos = [], uv = [], idx = [];
    for (var i = 0; i <= seg; i++) {
      var u = i / seg, x = (u - 0.5) * w, t = x / R;
      [0, 1].forEach(function (j) {
        pos.push(Math.sin(t) * R, (j - 0.5) * h, Math.cos(t) * R - R);
        uv.push(u, j);
      });
    }
    for (i = 0; i < seg; i++) { var a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }   // CCW dari depan → muka depan menghadap kamera
    return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
  }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    o.colors = Object.assign({}, DEFAULTS.colors, options && options.colors);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)");
    var win = root.ownerDocument.defaultView || global;

    root.classList.add("ch");
    var canvas = document.createElement("canvas"); canvas.className = "ch__canvas"; root.appendChild(canvas);
    var sr = document.createElement("ul"); sr.className = "ch__sr"; sr.setAttribute("aria-label", "Galeri kartu berputar");
    o.items.forEach(function (it) { var li = document.createElement("li"); li.textContent = it.alt || it.label || ""; sr.appendChild(li); });
    root.appendChild(sr);

    var gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) { root.classList.add("ch--nogl"); return { destroy: function () {} }; }

    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    var U = {};
    ["uProj", "uView", "uModel", "uShear", "uFront", "uBack", "uBlur", "uDim", "uOpacity", "uGray"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    gl.uniform1i(U.uFront, 0); gl.uniform1i(U.uBack, 1);

    // geometri dengan ukuran termasuk margin tekstur
    var F = o.cardWidth / TEX_W;
    var geo = bentPlane(o.cardWidth + PAD * 2 * F, o.cardHeight + PAD * 2 * F, o.radius);
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    function attr(name, data, size) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      var l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
    }
    attr("aPos", geo.pos, 3); attr("aUv", geo.uv, 2);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);

    gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    function texture(cv) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.generateMipmap(gl.TEXTURE_2D);                       // mipmap = sumber blur (bias)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var an = gl.getExtension("EXT_texture_filter_anisotropic");
      if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return t;
    }
    function load(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }

    var texH = Math.round(TEX_W * o.cardHeight / o.cardWidth);
    var backTex = null, faces = [];
    var fontsReady = (document.fonts && document.fonts.load) ? document.fonts.load("54px " + o.font).catch(function () {}) : Promise.resolve();
    fontsReady.then(function () {
      var backP = o.back ? load(o.back).then(function (img) {
        return texture(cardCanvas(texH, function (g, w, h) { roundRect(g, 0, 0, w, h, 10); g.save(); g.clip(); g.drawImage(img, 0, 0, w, h); g.restore(); }));
      }) : Promise.resolve(texture(cardCanvas(texH, drawBack(o))));
      backP.then(function (t) { backTex = t; });
      o.items.forEach(function (it, i) {
        (it.src ? load(it.src).then(function (img) { return Object.assign({}, it, { image: img }); }) : Promise.resolve(it))
          .then(function (item) { faces[i] = texture(cardCanvas(texH, drawFace(o, item))); });
      });
    });

    var cards = [];
    for (var r = 0; r < Math.max(o.repeat, 1); r++) o.items.forEach(function (_, i) { cards.push({ face: i }); });

    /* ---------- ukuran ---------- */
    var M = {};
    function resize() {
      var rc = root.getBoundingClientRect();
      M.w = Math.max(rc.width, 1); M.h = Math.max(rc.height, 1);
      var dpr = Math.min(win.devicePixelRatio || 1, 2);
      canvas.width = Math.round(M.w * dpr); canvas.height = Math.round(M.h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      var vh = o.viewHeight || M.h;
      M.proj = perspective(2 * Math.atan(vh / 2 / o.perspective), M.w / M.h, 1, 20000);
      M.view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -o.perspective, 1]);
    }

    /* ---------- tarik untuk memutar ---------- */
    var dragV = 0, down = false, lastY = 0, lastT = 0;
    function onDown(e) { if (!o.drag) return; down = true; lastY = e.clientY; lastT = performance.now(); root.classList.add("is-dragging"); }
    function onMove(e) {
      if (!down) return;
      var now = performance.now(), dy = e.clientY - lastY, dt = Math.max(now - lastT, 1) / 1000;
      k += -dy / o.verticalSpacing; dragV = -dy / o.verticalSpacing / dt; lastY = e.clientY; lastT = now;
    }
    function onUp() { if (!down) return; down = false; root.classList.remove("is-dragging"); A = clamp(dragV, -12, 12); }

    /* ---------- loop (sama dengan aslinya: kecepatan lerp exp 7, posisi lerp exp 11) ---------- */
    var A = 0, k = 0, O = 0, raf = 0, last = performance.now(), visible = true;
    var tilt = Math.tan(o.cardTilt * Math.PI / 180);
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      var dir = o.direction === "up" ? -1 : 1;
      var target = reduced.matches ? 0 : o.speed * dir;
      if (!down) { A += (target - A) * (1 - Math.exp(-dt * 7)); k += A * dt; }
      O += (k - O) * (1 - Math.exp(-dt * 11));

      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (!backTex) return;
      gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.uniformMatrix4fv(U.uProj, false, M.proj); gl.uniformMatrix4fv(U.uView, false, M.view);
      gl.uniform1f(U.uGray, clamp(o.grayscale, 0, 1));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, backTex);

      var u = cards.length, half = u / 2, fadeStart = clamp(1 - o.edgeFade, 0, 0.98), per = Math.max(o.cardsPerTurn, 1), step = Math.PI * 2 / per;
      var list = [];
      for (var i = 0; i < u; i++) {
        var n = wrap(i - O + half, u) - half;
        var ang = -n * step + o.rotation * Math.PI / 180, c = Math.cos(ang), a = (1 - c) / 2;
        var dist = Math.min(Math.abs(n) / Math.max(half, 1), 1);
        var op = 1 - smooth(fadeStart, 1, dist);
        if (op <= 0.005 || !faces[cards[i].face]) continue;
        var centre = 1 - Math.min(Math.abs(n) / (per * 0.5), 1);
        list.push({
          i: i, z: c * o.radius, a: a, op: op,
          m: model(Math.sin(ang) * o.radius, n * o.verticalSpacing,c * o.radius, ang, 1 + (o.centerScale - 1) * centre)
        });
      }
      list.sort(function (p, q) { return p.z - q.z; });          // belakang dulu (transparan, tanpa depth)
      list.forEach(function (it) {
        gl.uniformMatrix4fv(U.uModel, false, it.m);
        gl.uniform1f(U.uShear, -tilt * it.a);
        gl.uniform1f(U.uBlur, Math.log2(1 + o.edgeBlur * smooth(0.3, 1, it.a) * 1.6));
        gl.uniform1f(U.uDim, 1 - o.depthDim * smooth(0.2, 1, it.a));
        gl.uniform1f(U.uOpacity, it.op);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, faces[cards[it.i].face]);
        gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
      });
    }

    // jalan hanya saat terlihat
    var io = new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting; cancelAnimationFrame(raf);
      if (visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    var ro = new ResizeObserver(resize);
    resize(); ro.observe(root); io.observe(root);
    root.addEventListener("pointerdown", onDown);
    win.addEventListener("pointermove", onMove);
    win.addEventListener("pointerup", onUp);

    return {
      destroy: function () {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        root.removeEventListener("pointerdown", onDown); win.removeEventListener("pointermove", onMove); win.removeEventListener("pointerup", onUp);
        var lc = gl.getExtension("WEBGL_lose_context"); if (lc) lc.loseContext();
        canvas.remove(); sr.remove(); root.classList.remove("ch", "ch--nogl", "is-dragging");
      }
    };
  }

  global.CardHelix = { mount: mount };
})(window);
