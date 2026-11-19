/*
 * Ink Comic
 * Versi 2D ringan dari adegan komik Santioni Spirits. Satu canvas WebGL, satu fragment shader layar penuh:
 *   - foto (PNG/WebP transparan) → ukiran tinta: tone datar 3 warna + arsir garis miring + kontur Sobel
 *   - langit gelap dengan noda awan tinta prosedural (fbm × fbm, di-threshold), bisa diaduk kursor
 *   - panel komik bertepi pena yang bergetar (sudut digoyang noise tiap 1/8 detik)
 *   - garis angin putus-putus di tanah
 *   - "boil": semua tekstur tinta bergerak di 8 fps (waktu dibulatkan), tapi scroll & kursor tetap 60 fps
 * Kotak narasi adalah DOM (teks diketik per huruf).
 *
 * InkComic.mount(root, { image, caption }) → { destroy }
 */
(function (global) {
  "use strict";

  var VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

  var FRAG = [
    "#extension GL_OES_standard_derivatives : enable",
    "precision highp float;",
    "uniform vec2 uRes; uniform float uDpr; uniform float uTime; uniform vec2 uMouse;",
    "uniform sampler2D uImg; uniform vec4 uFig;",                    // figur: x,y,w,h (px CSS)
    "uniform vec2 uA0, uA1, uA2, uA3;",                               // panel utama (TL,TR,BR,BL)
    "uniform vec2 uB0, uB1, uB2, uB3; uniform vec4 uBCrop; uniform float uBT;",
    "uniform vec2 uC0, uC1, uC2, uC3; uniform vec4 uCCrop; uniform float uCT;",
    "uniform float uClouds; uniform float uHorizon;",
    "uniform vec3 uInk, uTan, uPaper, uSky; uniform vec2 uTexel; uniform vec2 uLevels;",

    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }",
    "float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }",
    "float aastep(float t, float v){ float w = length(vec2(dFdx(v), dFdy(v))) * 0.7071; return smoothstep(t - w, t + w, v); }",

    // jarak bertanda ke segi empat (negatif = di dalam), dalam px
    "float edge(vec2 a, vec2 b, vec2 p){ vec2 e = b - a; vec2 n = normalize(vec2(e.y, -e.x)); return dot(p - a, n); }",
    "float quad(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d){ return max(max(edge(a,b,p), edge(b,c,p)), max(edge(c,d,p), edge(d,a,p))); }",

    // ukiran: tone 3 warna + arsir + kontur. return rgba (a = alpha figur)
    "vec4 engrave(vec2 uv, vec2 px, float s8, float scale){",
    "  vec4 t = texture2D(uImg, uv);",
    "  if (t.a < 0.5) return vec4(0.0);",
    "  float lum = clamp((dot(t.rgb, vec3(0.299, 0.587, 0.114)) - uLevels.x) / (uLevels.y - uLevels.x), 0.0, 1.0);",
    "  vec2 boil = vec2(hash(vec2(s8, 1.3)), hash(vec2(s8, 7.1))) * 3.0;",       // garis bergeser tiap 1/8 dtk
    "  float wob = (noise(px * 0.02 + s8 * 3.0) - 0.5) * 2.5;",
    "  float sp = 5.0 * scale;",
    "  float h1 = abs(fract((dot(px + boil, normalize(vec2(1.0, -0.55))) + wob) / sp) - 0.5) * 2.0;",
    "  float h2 = abs(fract((dot(px - boil, normalize(vec2(1.0, 0.9))) - wob) / (sp * 1.2)) - 0.5) * 2.0;",
    "  float dark = 1.0 - lum;",
    "  float tone = aastep(0.62, lum + (noise(px * 0.05 + s8) - 0.5) * 0.08);",   // 0 = bayangan, 1 = terang
    "  vec3 col = mix(uTan, uPaper, tone);",
    "  float lines1 = 1.0 - aastep(clamp(dark * 0.95 - 0.3, 0.0, 0.9), h1);",
    "  float lines2 = 1.0 - aastep(clamp(dark * 1.3 - 0.75, 0.0, 0.9), h2);",
    "  col = mix(col, uInk, max(lines1 * (1.0 - tone * 0.6), lines2));",
    "  float solid = 1.0 - aastep(0.1, lum);",
    "  col = mix(col, uInk, solid);",
    // kontur: gradien luminance (Sobel kecil), digoyang boil
    "  vec2 o = uTexel * 1.5 * (1.0 + 0.3 * hash(vec2(s8, 3.0)));",
    "  float l1 = dot(texture2D(uImg, uv + vec2(o.x, 0.0)).rgb, vec3(0.333));",
    "  float l2 = dot(texture2D(uImg, uv - vec2(o.x, 0.0)).rgb, vec3(0.333));",
    "  float l3 = dot(texture2D(uImg, uv + vec2(0.0, o.y)).rgb, vec3(0.333));",
    "  float l4 = dot(texture2D(uImg, uv - vec2(0.0, o.y)).rgb, vec3(0.333));",
    "  float a1 = texture2D(uImg, uv + vec2(o.x, 0.0)).a, a2 = texture2D(uImg, uv - vec2(o.x, 0.0)).a;",
    "  float a3 = texture2D(uImg, uv + vec2(0.0, o.y)).a, a4 = texture2D(uImg, uv - vec2(0.0, o.y)).a;",
    "  float g = length(vec2(l1 - l2, l3 - l4)) + length(vec2(a1 - a2, a3 - a4)) * 2.0;",
    "  col = mix(col, uInk, smoothstep(0.08, 0.2, g));",
    "  return vec4(col, 1.0);",
    "}",

    // langit: noda awan tinta
    "vec3 sky(vec2 px, vec2 lo, vec2 size, float s24, float s8){",
    "  vec2 uv = (px - lo) / size.y;",
    "  vec2 q = uv * 3.0 + vec2(s24 * 0.06, -s24 * 0.02);",
    "  float n = fbm(q * 0.75) * fbm(q + s24 * 0.03);",
    "  n = clamp(n * 2.2, 0.0, 1.0); n = n * n;",
    "  float rough = noise(q * 6.0 + s8);",
    "  vec2 c = (px - (lo + vec2(size.x * 0.5, size.y * 0.62))) / size.y;",
    "  float halo = pow(smoothstep(0.55, 0.05, length(c * vec2(0.8, 1.4))), 2.0);",
    "  float m = exp(-pow(length(px - uMouse) / (size.y * 0.12), 2.0));",          // kursor mendorong awan
    "  float v = halo * 0.85 + n * 1.05 - rough * 0.18 + m * 0.25;",
    "  float k = aastep(mix(1.6, 0.74, uClouds), v);",
    "  return mix(uSky, uPaper, k);",
    "}",

    // garis angin
    "float wind(vec2 px, vec2 lo, vec2 size, float s8){",
    "  float ink = 0.0;",
    "  for (int i = 0; i < 6; i++){",
    "    float fi = float(i);",
    "    float y = lo.y + size.y * (uHorizon + 0.06 + fi * 0.065) + sin(px.x * (0.0035 + fi * 0.0007) + fi * 1.7 + s8 * 0.4) * size.y * 0.03;",
    "    float d = abs(px.y - y);",
    "    float dash = step(0.52, noise(vec2(px.x * 0.008 - s8 * (0.6 + fi * 0.15), fi * 3.1)));",
    "    ink = max(ink, (1.0 - smoothstep(0.6, 1.6, d)) * dash);",
    "  }",
    "  return ink;",
    "}",

    // panel kecil: crop foto yang diukir, latar gelap, garis tepi 3px
    "vec4 frame(vec2 px, vec2 a, vec2 b, vec2 c, vec2 d, vec4 crop, float tr, float s8){",
    "  if (tr <= 0.001) return vec4(0.0);",
    "  vec2 ctr = (a + b + c + d) * 0.25;",
    "  vec2 j = vec2(hash(vec2(s8, 11.0)), hash(vec2(s8, 17.0))) - 0.5;",
    "  a = mix(ctr, a, tr) + j * 2.0; b = mix(ctr, b, tr) - j * 2.0; c = mix(ctr, c, tr) + j.yx * 2.0; d = mix(ctr, d, tr) - j.yx * 2.0;",
    "  float sd = quad(px, a, b, c, d);",
    "  float lw = 3.0;",
    "  if (sd > lw) return vec4(0.0);",
    "  vec2 lo = min(min(a, b), min(c, d)), hi = max(max(a, b), max(c, d));",
    "  vec2 f = (px - lo) / (hi - lo);",
    "  vec2 uv = crop.xy + f * crop.zw;",
    "  vec4 e = engrave(uv, px, s8, 0.8);",
    "  vec3 col = mix(uSky, e.rgb, e.a);",
    "  col = mix(col, uInk, 1.0 - smoothstep(lw - 1.0, lw, abs(sd)) );",
    "  return vec4(col, 1.0);",
    "}",

    "void main(){",
    "  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;",
    "  float s8 = floor(uTime * 8.0) / 8.0;",
    "  float s24 = floor(uTime * 24.0) / 24.0;",
    "  vec3 col = uPaper * (1.0 - 0.035 * hash(floor(px) + s24));",               // butiran kertas
    // panel utama (sudut ikut bergetar)
    "  vec2 j = (vec2(hash(vec2(s8, 2.0)), hash(vec2(s8, 5.0))) - 0.5) * 2.5;",
    "  vec2 A0 = uA0 + j, A1 = uA1 - j.yx, A2 = uA2 + j.yx, A3 = uA3 - j;",
    "  float sd = quad(px, A0, A1, A2, A3);",
    "  vec2 lo = min(min(A0, A1), min(A2, A3)), hi = max(max(A0, A1), max(A2, A3)), size = hi - lo;",
    "  if (sd < 0.0){",
    "    float horizon = lo.y + size.y * uHorizon + sin(px.x * 0.004 + 1.0) * size.y * 0.02;",
    "    if (px.y < horizon) col = sky(px, lo, size, s24, s8);",
    "    else col = mix(uPaper, uInk, wind(px, lo, size, s8));",
    "    vec2 fuv = (px - uFig.xy) / uFig.zw;",
    "    if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0){",
    "      vec4 e = engrave(fuv, px, s8, 1.0);",
    "      col = mix(col, e.rgb, e.a);",
    "    }",
    "  }",
    "  col = mix(col, uInk, 1.0 - smoothstep(1.5, 2.5, abs(sd)));",               // tepi pena panel utama
    "  vec4 fb = frame(px, uB0, uB1, uB2, uB3, uBCrop, uBT, s8);",
    "  col = mix(col, fb.rgb, fb.a);",
    "  vec4 fc = frame(px, uC0, uC1, uC2, uC3, uCCrop, uCT, s8 + 0.37);",
    "  col = mix(col, fc.rgb, fc.a);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  var DEFAULTS = {
    image: "assets/wanderer.webp",
    caption: ["IN AN IMMENSE LAND OF NOTHINGNESS.", "A LONELY FIGURE WANDERS THROUGH THE MIST."],
    faceCrop: [0.62, 0.1, 0.26, 0.095], // area wajah di foto (x, y, w, h dalam 0..1) untuk panel kiri — rasio = rasio panel
    handCrop: [0.40, 0.435, 0.36, 0.131],  // area tangan untuk panel kanan
    colors: { ink: "#141414", tan: "#a8915f", paper: "#f2f1ee", sky: "#2c2c2e" },
    levels: [0.03, 0.48], // hitam/putih luminance foto → 0/1 (normalisasi tone sebelum diukir)
    maxDpr: 1.5,
    smooth: 0.1
  };

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function expoOut(p) { return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); }
  function lerp(a, b, p) { return a + (b - a) * p; }

  function mount(root, options) {
    var o = Object.assign({}, DEFAULTS, options);
    o.colors = Object.assign({}, DEFAULTS.colors, options && options.colors);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var win = root.ownerDocument.defaultView || global;

    var stage = root.querySelector(".ic__stage");
    var canvas = root.querySelector(".ic__canvas");
    var box = root.querySelector(".ic__caption");
    var gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) { root.classList.add("ic--nogl"); return { destroy: function () {} }; }
    gl.getExtension("OES_standard_derivatives");

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["uRes", "uDpr", "uTime", "uMouse", "uImg", "uFig", "uA0", "uA1", "uA2", "uA3", "uB0", "uB1", "uB2", "uB3", "uBCrop", "uBT",
      "uC0", "uC1", "uC2", "uC3", "uCCrop", "uCT", "uClouds", "uHorizon", "uInk", "uTan", "uPaper", "uSky", "uTexel", "uLevels"].forEach(function (k) {
      U[k] = gl.getUniformLocation(prog, k);
    });
    gl.uniform3fv(U.uInk, hex(o.colors.ink)); gl.uniform3fv(U.uTan, hex(o.colors.tan));
    gl.uniform3fv(U.uPaper, hex(o.colors.paper)); gl.uniform3fv(U.uSky, hex(o.colors.sky));
    gl.uniform4fv(U.uBCrop, o.faceCrop); gl.uniform4fv(U.uCCrop, o.handCrop);
    gl.uniform1i(U.uImg, 0);
    gl.uniform2fv(U.uLevels, o.levels);

    // tekstur foto
    var tex = gl.createTexture(), ready = false;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    var img = new Image();
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      M.imgAspect = img.width / img.height; gl.uniform2f(U.uTexel, 1 / img.width, 1 / img.height); ready = true;
    };
    img.src = o.image;

    // teks narasi: per huruf, diketik saat panel siap
    box.innerHTML = "";
    var chars = [];
    o.caption.forEach(function (line) {
      var p = document.createElement("p");
      Array.from(line).forEach(function (ch) {
        var s = document.createElement("span"); s.textContent = ch; p.appendChild(s); chars.push(s);
      });
      box.appendChild(p);
    });

    /* ---------- ukuran ---------- */
    var M = { imgAspect: 688 / 1024 };
    function measure() {
      M.w = stage.clientWidth; M.h = stage.clientHeight;
      M.dpr = Math.min(win.devicePixelRatio || 1, o.maxDpr);
      canvas.width = Math.round(M.w * M.dpr); canvas.height = Math.round(M.h * M.dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      M.top = root.getBoundingClientRect().top + win.scrollY;
      M.span = Math.max(1, root.offsetHeight - M.h);
      M.mobile = M.w < 768;
    }

    /* ---------- loop ---------- */
    var mouse = { x: -9999, y: -9999, cx: -9999, cy: -9999 };
    function onMove(e) {
      var r = stage.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (mouse.cx < -999) { mouse.cx = mouse.x; mouse.cy = mouse.y; }
    }
    var raf = 0, alive = true, t0 = performance.now(), prev = 0, sp = 0, typed = -1;

    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var dt = prev ? Math.min(64, now - prev) : 16.7; prev = now;
      var time = (now - t0) / 1000;
      var k = 1 - Math.pow(1 - o.smooth, dt / 16.7);
      var target = clamp01((win.scrollY - M.top) / M.span);
      sp = reduced ? target : sp + (target - sp) * k;
      mouse.cx += (mouse.x - mouse.cx) * k; mouse.cy += (mouse.y - mouse.cy) * k;

      // progres adegan: intro otomatis 0 → 0.42 (3 dtk), lalu scroll membawa 0.42 → 1
      var intro = reduced ? 1 : clamp01(time / 3);
      var P = intro * 0.42 + sp * 0.58;

      var W = M.w, H = M.h;
      // panel utama: dari full-bleed menyusut ke bingkai miring (seperti panel komik)
      var e = expoOut(clamp01(P / 0.35));
      var padX = (M.mobile ? 0.04 : 0.08) * W * e, padT = 0.05 * H * e, padB = 0.06 * H * e;
      var A0 = [-6 + padX, -6 + padT], A1 = [W + 6 - padX * 0.9, -6 + padT * 1.6], A2 = [W + 6 - padX * 0.95, H + 6 - padB * 1.1], A3 = [-6 + padX * 0.85, H + 6 - padB * 0.8];
      gl.uniform2fv(U.uA0, A0); gl.uniform2fv(U.uA1, A1); gl.uniform2fv(U.uA2, A2); gl.uniform2fv(U.uA3, A3);
      var pl = Math.min(A0[0], A3[0]), pr = Math.max(A1[0], A2[0]), pt = Math.min(A0[1], A1[1]), pb = Math.max(A2[1], A3[1]);

      // figur: berdiri di tanah, sedikit parallax kursor & scroll
      var fh = (pb - pt) * (M.mobile ? 0.62 : 0.86), fw = fh * M.imgAspect;
      var mx = mouse.cx > -999 ? (mouse.cx / W - 0.5) : 0, my = mouse.cy > -999 ? (mouse.cy / H - 0.5) : 0;
      var fx = (pl + pr) / 2 - fw / 2 - mx * 14, fy = pb - fh + 8 - my * 8 - sp * 30;
      gl.uniform4f(U.uFig, fx, fy, fw, fh);
      gl.uniform1f(U.uHorizon, 0.52);
      gl.uniform1f(U.uClouds, expoOut(clamp01((P - 0.08) / 0.4)));

      // panel kecil: wajah (kiri) dan tangan (kanan), masuk dari titik tengah
      var tb = expoOut(clamp01((P - 0.45) / 0.15)), tc = expoOut(clamp01((P - 0.56) / 0.15));
      var bw = W * (M.mobile ? 0.42 : 0.22), bh = bw * 0.55, bx = W * 0.005 + mx * -10, by = H * 0.38 + my * -6 - sp * 60;
      gl.uniform2f(U.uB0, bx, by); gl.uniform2f(U.uB1, bx + bw, by + 4); gl.uniform2f(U.uB2, bx + bw - 3, by + bh); gl.uniform2f(U.uB3, bx, by + bh - 2);
      gl.uniform1f(U.uBT, tb);
      var cw = W * (M.mobile ? 0.4 : 0.22), ch = cw * 0.55, cx = W * 0.72 + mx * -16, cy = H * 0.6 + my * -10 - sp * 90;
      gl.uniform2f(U.uC0, cx, cy + 2); gl.uniform2f(U.uC1, cx + cw, cy); gl.uniform2f(U.uC2, cx + cw + 4, cy + ch + 4); gl.uniform2f(U.uC3, cx + 2, cy + ch);
      gl.uniform1f(U.uCT, tc);

      // kotak narasi: muncul lalu huruf diketik (18 ms/huruf)
      var tcap = clamp01((P - 0.62) / 0.06);
      box.style.opacity = tcap > 0 ? 1 : 0;
      box.style.transform = "translate3d(0," + (-sp * 40) + "px,0) rotate(-0.6deg) scale(" + (0.96 + 0.04 * expoOut(tcap)) + ")";
      if (tcap > 0 && typed < 0) typed = now;
      if (tcap <= 0) typed = -1;
      var n = typed < 0 ? 0 : Math.floor((now - typed) / 18);
      for (var i = 0; i < chars.length; i++) chars[i].style.visibility = (reduced || i < n) ? "visible" : "hidden";

      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, M.dpr);
      gl.uniform1f(U.uTime, reduced ? 0 : time);
      gl.uniform2f(U.uMouse, mouse.cx, mouse.cy);
      if (ready) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    var rszT = 0;
    function onResize() { clearTimeout(rszT); rszT = setTimeout(measure, 80); }
    measure();
    win.addEventListener("resize", onResize);
    win.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);

    return {
      destroy: function () {
        alive = false; cancelAnimationFrame(raf); clearTimeout(rszT);
        win.removeEventListener("resize", onResize);
        win.removeEventListener("pointermove", onMove);
        var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
      }
    };
  }

  global.InkComic = { mount: mount };
})(window);
