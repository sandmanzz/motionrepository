/*
 * Particle Relief Hero
 * ---------------------------------------------------------------
 * Satu gambar relief (subjek terang di atas hitam) di-sampling jadi puluhan ribu
 * partikel WebGL. Partikel "lahir" dari badai acak, lalu bernapas & berkelip.
 * HOVER: kursor meninggalkan jejak kuas yang memudar; partikel yang tersentuh
 * dipoles jadi warna highlight + kilau, lalu pulih sendiri. Posisi tidak digeser.
 *
 * Pemakaian:
 *   const hero = ParticleHero.mount(document.querySelector('[data-particle-hero]'), {
 *     image: 'assets/relief.webp'
 *   });
 *   hero.replay(); hero.destroy();
 *
 * Tanpa dependency (WebGL1 murni). Butuh markup dari index.html + motion.css.
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    image: "",                 // subjek terang di atas hitam; area merah murni = warna aksen
    count: 90000,              // jumlah partikel desktop
    countMobile: 42000,        // < 768px
    sampleWidth: 460,          // gambar diperkecil ke lebar ini sebelum di-sampling
    threshold: 0.085,          // luminance minimum agar piksel ikut jadi partikel
    gamma: 0.55,               // < 1 = area gelap tetap dapat partikel
    fitWidth: 0.86,            // lebar maksimum subjek (fraksi lebar hero)
    fitHeight: 0.74,           // tinggi maksimum gambar (fraksi tinggi hero)
    offsetY: 0.02,             // geser vertikal (fraksi tinggi hero, + = naik)
    size: 2.6,                 // ukuran titik (px CSS) pada tinggi gambar 600px
    colors: { base: "#d2a23c", highlight: "#f6d27e", accent: "#d3222f" },
    birth: 2.8,                // detik animasi pembentukan
    brush: 0.14,               // radius kuas hover (fraksi tinggi gambar)
    trailDecay: 0.7,           // detik; makin besar makin lama jejak bertahan
    titleDim: 0.5,             // 0..1 peredupan partikel di belakang judul
    onFormed: null
  };

  var VERT = [
    "attribute vec2 aPos;",
    "attribute vec2 aMat;",    // x = luminance, y = kind (0 base, 1 aksen)
    "attribute vec4 aRand;",
    "uniform float uTime, uBirth, uSize, uMotion, uTrailOn, uTitleDim;",
    "uniform vec2 uScale, uOffset, uTitleC, uTitleR;",
    "uniform vec4 uBounds;",
    "uniform sampler2D uTrail;",
    "uniform vec3 uBase, uHi, uAccent;",
    "varying vec3 vColor;",
    "varying float vAlpha;",
    "float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) * .5; }",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float vnoise(vec2 p){",
    "  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);",
    "  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);",
    "}",
    "void main(){",
    "  float r1 = aRand.x, r2 = aRand.y, r3 = aRand.z, r4 = aRand.w;",
    "  vec2 P = aPos;",
    // napas: seluruh bentuk mengembang halus, paling terasa di tengah
    "  float breath = sin(uTime * .85) * .012 * uMotion;",
    "  P *= 1. + breath * (.3 + .7 * exp(-dot(P, P) * 3.));",
    // hanyut: dua lapis gelombang murah sebagai pengganti curl noise
    "  vec2 flow = vec2(sin(P.y * 9. + uTime * .55 + r1 * 6.283), cos(P.x * 8. - uTime * .47 + r2 * 6.283));",
    "  flow += .6 * vec2(sin(P.x * 17. + uTime * .9 + r3 * 6.283), cos(P.y * 15. + uTime * .8 + r4 * 6.283));",
    "  P += flow * .0055 * uMotion;",
    // lahir: tiap partikel punya jeda sendiri, datang berputar dari awan acak
    "  float stag = r1 * .45;",
    "  float bb = ease(clamp((uBirth - stag) / (1. - stag), 0., 1.));",
    "  vec2 chaos = normalize(vec2(r2 - .5, r3 - .5) + 1e-4) * (1.1 + r1 * 1.9);",
    "  float ang = (1. - bb) * (r3 - .5) * 7.;",
    "  float ca = cos(ang), sa = sin(ang);",
    "  chaos = mat2(ca, -sa, sa, ca) * chaos;",
    "  chaos += vec2(sin(uTime * .7 + r4 * 20.), cos(uTime * .6 + r1 * 20.)) * .16 * (1. - bb);",
    "  P = mix(chaos, P, bb);",
    // hover: baca jejak kuas di posisi ASLI partikel, tepi dibuat organik dengan noise
    "  float touched = texture2D(uTrail, (aPos - uBounds.xy) / uBounds.zw).r * uTrailOn;",
    "  float edge = (vnoise(aPos * 14. + uTime * .18) - .5) * .2;",
    "  float finish = smoothstep(.10, .60, touched - edge) * bb;",
    // warna
    "  float lum = aMat.x;",
    "  float isBase = 1. - step(.5, aMat.y);",
    "  vec3 col = mix(mix(uBase, uHi, lum * lum * lum) * 1.22, uAccent * 1.5, 1. - isBase);",
    "  float polish = finish * isBase;",                    // aksen mempertahankan warnanya
    "  col = mix(col, uHi * (1.02 + .3 * lum), polish);",
    "  float twinkle = .88 + .18 * sin(uTime * (1.4 + r2 * 2.6) + r1 * 6.2831);",
    "  float density = mix(1.25, .95, lum * lum);",        // area terang punya lebih banyak partikel -> sedikit diredupkan
    "  float sparkle = pow(max(0., sin(uTime * 1.5 + r4 * 240.)), 24.) * step(mix(.994, .93, finish), r2);",
    "  col += vec3(1., .96, .84) * sparkle * 1.5;",
    "  vColor = col * twinkle * density * (1. + (1. - bb) * .25 + polish * .12);",
    "  vAlpha = .15 + .85 * bb;",
    "  vec2 clip = P * uScale + uOffset;",
    "  gl_Position = vec4(clip, 0., 1.);",
    // zona judul: debu menipis di belakang wordmark supaya teks terbaca tanpa scrim
    "  float tz = 1. - smoothstep(.35, 1., length((clip - uTitleC) * uTitleR));",
    "  vAlpha *= 1. - tz * uTitleDim * bb;",
    "  gl_PointSize = max(1., uSize * (.5 + r3 * .95) * (1. + sparkle * .9 + polish * .3));",
    "}"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "varying vec3 vColor;",
    "varying float vAlpha;",
    "void main(){",
    "  float d = length(gl_PointCoord - .5);",
    "  float a = (1. - smoothstep(.05, .45, d)) * vAlpha * .9;",
    "  if (a < .004) discard;",
    "  float core = 1. - smoothstep(0., .2, d);",
    "  gl_FragColor = vec4(vColor * (.72 + core * 1.05) * a, a);",   // premultiplied
    "}"
  ].join("\n");

  function rgb(hex) {
    var n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function loadPixels(src, maxW) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, maxW / img.naturalWidth);
        var w = Math.max(2, Math.round(img.naturalWidth * s));
        var h = Math.max(2, Math.round(img.naturalHeight * s));
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        var ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve({ data: ctx.getImageData(0, 0, w, h).data, w: w, h: h }); }
        catch (e) { reject(e); }   // file:// men-taint canvas -> butuh http
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /* gambar -> buffer partikel. Ruang gambar: y ∈ [-0.5, 0.5], x ∈ [-A/2, A/2] */
  function sample(px, n, o) {
    var d = px.data, w = px.w, h = px.h, pool = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        var red = r > 0.3 && r > g * 1.9 && r > b * 1.9;
        var lum = red ? r * 0.8 : 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > o.threshold) pool.push(x, y, lum, red ? 1 : 0);
      }
    }
    var m = pool.length / 4;
    if (!m) throw new Error("ParticleHero: gambar tidak punya piksel terang");
    var aspect = w / h;
    var buf = new Float32Array(n * 8);   // pos(2) mat(2) rand(4)
    var minX = Infinity, maxX = -Infinity;
    for (var p = 0; p < n; p++) {
      var k = (Math.random() * m | 0) * 4;
      for (var t = 0; t < 4 && Math.random() > Math.pow(pool[k + 2], o.gamma); t++) {
        k = (Math.random() * m | 0) * 4;   // rejection sampling: terang = lebih padat
      }
      var u = (pool[k] + Math.random()) / w;
      var v = (pool[k + 1] + Math.random()) / h;
      var X = (u - 0.5) * aspect, j = p * 8;
      buf[j] = X;
      buf[j + 1] = 0.5 - v;
      buf[j + 2] = pool[k + 2];
      buf[j + 3] = pool[k + 3];
      buf[j + 4] = Math.random(); buf[j + 5] = Math.random();
      buf[j + 6] = Math.random(); buf[j + 7] = Math.random();
      if (X < minX) minX = X;
      if (X > maxX) maxX = X;
    }
    return { buffer: buf, aspect: aspect, minX: minX, maxX: maxX };
  }

  /* jejak kuas: grid kecil yang meluruh, dilukis elips searah gerak kursor */
  function createTrail(bounds, o) {
    var W = 192, H = 128;
    var f = new Float32Array(W * H), bytes = new Uint8Array(W * H);
    var peak = 0;
    function update(dt, mouse, flow, active) {
      var inside = active &&
        mouse.x >= bounds[0] && mouse.x <= bounds[0] + bounds[2] &&
        mouse.y >= bounds[1] && mouse.y <= bounds[1] + bounds[3];
      if (!inside && peak === 0) return false;
      var decay = Math.exp(-dt / o.trailDecay), i;
      for (i = 0; i < f.length; i++) f[i] *= decay;
      if (inside) {
        var a = o.brush * (1 + flow.speed * 0.35);   // memanjang saat kursor cepat
        var b = o.brush * 0.85, reach = a * 1.65;
        var c0 = Math.max(0, Math.floor((mouse.x - reach - bounds[0]) / bounds[2] * W));
        var c1 = Math.min(W - 1, Math.ceil((mouse.x + reach - bounds[0]) / bounds[2] * W));
        var r0 = Math.max(0, Math.floor((mouse.y - reach - bounds[1]) / bounds[3] * H));
        var r1 = Math.min(H - 1, Math.ceil((mouse.y + reach - bounds[1]) / bounds[3] * H));
        var gain = 1 - Math.exp(-Math.min(dt, 0.1) * 9);
        for (var r = r0; r <= r1; r++) {
          for (var c = c0; c <= c1; c++) {
            var dx = bounds[0] + (c + 0.5) / W * bounds[2] - mouse.x;
            var dy = bounds[1] + (r + 0.5) / H * bounds[3] - mouse.y;
            var along = (dx * flow.x + dy * flow.y) / a;
            var across = (-dx * flow.y + dy * flow.x) / b;
            var q = along * along + across * across;
            if (q > 2.6) continue;
            var k = r * W + c;
            f[k] += (1 - f[k]) * gain * Math.exp(-q * 1.5) * (1 - q / 2.6);
          }
        }
      }
      peak = 0;
      for (i = 0; i < f.length; i++) {
        if (f[i] > peak) peak = f[i];
        bytes[i] = Math.round(f[i] * 255);
      }
      if (peak < 0.004) { f.fill(0); bytes.fill(0); peak = 0; }
      return true;
    }
    return { w: W, h: H, bytes: bytes, update: update };
  }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    o.colors = Object.assign({}, DEFAULTS.colors, options && options.colors);
    var canvas = root.querySelector("[data-ph-canvas]");
    var titleEl = root.querySelector("[data-ph-title]");
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    var destroyed = false, raf = 0, visible = true;
    var api = { replay: function () {}, destroy: function () { destroyed = true; } };

    function fail() { root.classList.add("is-fallback", "is-formed"); }
    if (!gl) { fail(); return api; }

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }

    loadPixels(o.image, o.sampleWidth).then(function (px) {
      if (destroyed) return;
      var n = global.innerWidth < 768 ? o.countMobile : o.count;
      var geo = sample(px, n, o);
      var A = geo.aspect, margin = 0.12;
      var bounds = [-A / 2 - margin, -0.5 - margin, A + margin * 2, 1 + margin * 2];
      var trail = createTrail(bounds, o);

      var prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);

      var vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, geo.buffer, gl.STATIC_DRAW);
      [["aPos", 2, 0], ["aMat", 2, 8], ["aRand", 4, 16]].forEach(function (a) {
        var loc = gl.getAttribLocation(prog, a[0]);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, a[1], gl.FLOAT, false, 32, a[2]);
      });

      var U = {};
      ["uTime", "uBirth", "uSize", "uMotion", "uTrailOn", "uTitleDim", "uScale", "uOffset",
        "uTitleC", "uTitleR", "uBounds", "uTrail", "uBase", "uHi", "uAccent"].forEach(function (k) {
        U[k] = gl.getUniformLocation(prog, k);
      });

      var tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, trail.w, trail.h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, trail.bytes);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var canTrail = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;

      gl.uniform1i(U.uTrail, 0);
      gl.uniform1f(U.uTrailOn, canTrail ? 1 : 0);
      gl.uniform1f(U.uMotion, reduced ? 0 : 1);
      gl.uniform1f(U.uTitleDim, titleEl ? o.titleDim : 0);
      gl.uniform4fv(U.uBounds, bounds);
      gl.uniform3fv(U.uBase, rgb(o.colors.base));
      gl.uniform3fv(U.uHi, rgb(o.colors.highlight));
      gl.uniform3fv(U.uAccent, rgb(o.colors.accent));
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      /* ---------- layout ---------- */
      var W = 1, H = 1, sx = 1, sy = 1, oy = 0, dpr = 1;
      function resize() {
        W = root.clientWidth || 1;
        H = root.clientHeight || 1;
        dpr = Math.min(global.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        var subjectW = Math.max(0.2, geo.maxX - geo.minX);
        var hpx = Math.min(H * o.fitHeight, W * o.fitWidth / subjectW);   // tinggi gambar di layar (px)
        sx = 2 * hpx / W; sy = 2 * hpx / H; oy = o.offsetY * 2;
        gl.uniform2f(U.uScale, sx, sy);
        gl.uniform2f(U.uOffset, -((geo.minX + geo.maxX) / 2) * sx, oy);
        gl.uniform1f(U.uSize, o.size * dpr * Math.min(1.25, Math.max(0.6, hpx / 600)));
        if (titleEl) {
          var a = root.getBoundingClientRect(), t = titleEl.getBoundingClientRect();
          gl.uniform2f(U.uTitleC,
            ((t.left + t.width / 2 - a.left) / W) * 2 - 1,
            1 - ((t.top + t.height / 2 - a.top) / H) * 2);
          gl.uniform2f(U.uTitleR, 1 / Math.max(0.01, t.width / W * 0.95), 1 / Math.max(0.01, t.height / H * 0.9));
        }
      }

      /* ---------- pointer ---------- */
      var ptr = { x: 0, y: 0, on: false };
      var mouse = { x: 999, y: 999, primed: false };
      var flow = { x: 1, y: 0, speed: 0, angle: 0 };
      function onMove(e) {
        var r = root.getBoundingClientRect();
        var cx = ((e.clientX - r.left) / r.width) * 2 - 1;
        var cy = 1 - ((e.clientY - r.top) / r.height) * 2;
        ptr.x = (cx + ((geo.minX + geo.maxX) / 2) * sx) / sx;   // clip -> ruang gambar
        ptr.y = (cy - oy) / sy;
        ptr.on = true;
        start();
      }
      function onLeave() { ptr.on = false; mouse.primed = false; }

      /* ---------- loop ---------- */
      var time = 0, birth = reduced ? 1 : 0, last = 0, formed = false, dirty = true;
      function frame(now) {
        raf = 0;
        if (destroyed) return;
        var dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        if (!reduced) time += dt;
        if (birth < 1) birth = Math.min(1, birth + dt / o.birth);
        if (!formed && birth > 0.72) {
          formed = true;
          root.classList.add("is-formed");
          if (typeof o.onFormed === "function") o.onFormed();
        }

        var w = 1 - Math.exp(-dt * 12), v = 0;
        if (ptr.on) {
          if (!mouse.primed) { mouse.x = ptr.x; mouse.y = ptr.y; mouse.primed = true; }
          var px0 = mouse.x, py0 = mouse.y;
          mouse.x += (ptr.x - mouse.x) * w;
          mouse.y += (ptr.y - mouse.y) * w;
          var dx = mouse.x - px0, dy = mouse.y - py0;
          v = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001);
          if (v > 0.02) {
            var target = Math.atan2(dy, dx);
            flow.angle += Math.atan2(Math.sin(target - flow.angle), Math.cos(target - flow.angle)) * w;
            flow.x = Math.cos(flow.angle); flow.y = Math.sin(flow.angle);
          }
        }
        flow.speed += (Math.min(1, v * 0.9) - flow.speed) * w;

        var painted = canTrail && trail.update(dt, mouse, flow, ptr.on && birth > 0.75);
        if (painted) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, trail.w, trail.h, gl.LUMINANCE, gl.UNSIGNED_BYTE, trail.bytes);
        }

        gl.uniform1f(U.uTime, time);
        gl.uniform1f(U.uBirth, birth);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, n);
        dirty = false;

        // reduced motion: hanya render saat ada yang berubah (jejak hover)
        if (!reduced || painted || ptr.on) start();
      }
      function start() {
        if (raf || destroyed || !visible || document.hidden) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; }

      var ro = new ResizeObserver(function () { resize(); dirty = true; start(); });
      var io = new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) start(); else stop();
      });
      function onVis() { if (document.hidden) stop(); else start(); }

      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerdown", onMove);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("pointercancel", onLeave);
      global.addEventListener("blur", onLeave);
      document.addEventListener("visibilitychange", onVis);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) resize(); });

      resize();
      ro.observe(root);
      io.observe(root);
      root.classList.add("is-ready");
      start();

      api.replay = function () {
        if (reduced) return;
        birth = 0; formed = false;
        root.classList.remove("is-formed");
        start();
      };
      api.destroy = function () {
        destroyed = true;
        stop();
        ro.disconnect();
        io.disconnect();
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerdown", onMove);
        root.removeEventListener("pointerleave", onLeave);
        root.removeEventListener("pointercancel", onLeave);
        global.removeEventListener("blur", onLeave);
        document.removeEventListener("visibilitychange", onVis);
        gl.deleteBuffer(vbo);
        gl.deleteTexture(tex);
        gl.deleteProgram(prog);
      };
    }).catch(function (err) {
      if (global.console) console.warn("ParticleHero:", err && err.message ? err.message : err);
      fail();
    });

    return api;
  }

  global.ParticleHero = { mount: mount };
})(window);
