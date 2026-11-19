/*
 * Arunika — mesin wahana (v3: satu file video dari puncak sampai stasiun).
 * Scroll (dalam vh) dipetakan ke waktu video per babak.
 *   lift.mp4 : tanjakan, di-scrub pelan. Frame akhirnya = frame awal ride.mp4.
 *   ride.mp4 : SATU rekaman 20,6 dtk tanpa potongan:
 *              0–1,9 merayap di puncak (di-scrub) → terjun → laguna → gua lava → badai &
 *              putaran → pasar malam (semua OTOMATIS, scroll dikunci) → rem masuk stasiun (di-scrub).
 * Tidak ada pergantian klip setelah puncak, jadi tidak ada yang bisa terlihat terpotong.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PI = Math.PI;

  /* ---------- angka yang disetel dari isi klip ---------- */
  var CREEP = 1.9;                       // dtk: kereta masih merayap di puncak
  var BRAKE_T = 14.6;                    // dtk: otomatis berakhir di sini (sudah datar di atas pasar malam)
  var ZONE_T = {                         // jendela waktu (dtk) tiap dunia terlihat
    tirta: [4.4, 6.9],
    guntur: [8.2, 12.6]
  };
  /* kejadian di dalam rekaman: sentakan layar + suara */
  var EVENTS = [
    { t: 2.3, punch: 1.0, sound: "whoosh" },     // jatuh dari bibir puncak
    { t: 5.0, punch: 0.6 },                      // menghantam cipratan laguna
    { t: 7.9, punch: 0.7, sound: "whoosh" },     // ditelan gua
    { t: 10.5, punch: 0.9, sound: "thunder" },   // keluar gua ke badai
    { t: 12.1, punch: 0.8, sound: "thunder" }    // cakrawala terbalik
  ];
  /* profil kecepatan sepanjang bagian otomatis: [progres 0..1, km/jam] */
  var RIDE_SPEED = [[0, 16], [0.05, 84], [0.1, 121], [0.3, 108], [0.45, 99], [0.6, 116], [0.8, 104], [0.92, 76], [1, 56]];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lin(p) { return p; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 1.5); }
  function curve(pts, p) {
    for (var i = 1; i < pts.length; i++) {
      if (p <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (p - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
    }
    return pts[pts.length - 1][1];
  }

  /* ---------- naskah wahana (from/to dalam vh) ---------- */
  var BEATS = [
    { id: "lift",  clip: "lift", from: 0,   to: 300, t0: 0,       t1: null,    ease: lin,     zone: "Tanjakan", speed: function () { return 9; } },
    { id: "crest", clip: "ride", from: 300, to: 400, t0: 0,       t1: CREEP,   ease: lin,     zone: "Puncak",   speed: function () { return 3; } },
    { id: "ride",  clip: "ride", from: 400, to: 640, t0: CREEP,   t1: BRAKE_T, ease: lin,     zone: "Turunan",  speed: function (p) { return curve(RIDE_SPEED, clamp(p, 0, 1)); } },
    { id: "brake", clip: "ride", from: 640, to: 900, t0: BRAKE_T, t1: null,    ease: easeOut, zone: "03 Pasar Malam", speed: function (p) { return 56 * Math.pow(1 - p, 1.25); } },
    { id: "end",   clip: "ride", from: 900, to: 960, t0: null,    t1: null,    ease: lin,     zone: "Stasiun",  speed: function () { return 0; } }
  ];
  var TOTAL = 960, END_AT = 902;
  var RIDE = BEATS[2];
  var GLIDE = 16;                        // vh: setelah klip habis, kereta masih meluncur sendiri sejauh ini
  var JUMPS = { "0": 0, crest: 332, tirta: 470, guntur: 560, pasar: 700, end: TOTAL };
  var RAIL_AT = [0, 300, 450, 540, 640, END_AT];

  /* ---------- elemen ---------- */
  var body = document.body;
  var track = document.getElementById("track");
  var media = document.getElementById("media");
  var flash = document.getElementById("flash");
  var tunnel = document.getElementById("tunnel");
  var startBtn = document.getElementById("start");
  var soundBtn = document.getElementById("sound");
  var againBtn = document.getElementById("again");
  var hint = document.getElementById("scrollhint");
  var speedEl = document.getElementById("speed");
  var zoneEl = document.getElementById("zone");
  var railCar = document.getElementById("railcar");
  var railBtns = [].slice.call(document.querySelectorAll(".rail button"));
  var clips = {};
  [].forEach.call(document.querySelectorAll("#media video"), function (v) { clips[v.dataset.clip] = v; });

  var overlays = [].map.call(document.querySelectorAll("[data-beat]"), function (el) {
    return { el: el, zone: el.dataset.zone || null, a: +el.dataset.in || 0, b: +el.dataset.out || 0, fade: +(el.dataset.fade || 12), on: false };
  });

  function dur(v) { return v && isFinite(v.duration) && v.duration > 0 ? v.duration - 0.04 : 5; }
  /* detik klip "ride" -> posisi scroll (vh) */
  function rideAt(t) {
    return lerp(RIDE.from, RIDE.to, clamp((t - CREEP) / (BRAKE_T - CREEP), 0, 1));
  }
  /* papan dunia & rail mengikuti isi rekaman */
  function layoutZones() {
    var win = {
      tirta: [rideAt(ZONE_T.tirta[0]), rideAt(ZONE_T.tirta[1])],
      guntur: [rideAt(ZONE_T.guntur[0]), rideAt(ZONE_T.guntur[1])],
      pasar: [648, 738]
    };
    overlays.forEach(function (o) {
      if (!o.zone || !win[o.zone]) return;
      o.a = win[o.zone][0]; o.b = win[o.zone][1]; o.fade = o.zone === "pasar" ? 12 : 7;
    });
    JUMPS.tirta = (win.tirta[0] + win.tirta[1]) / 2;
    JUMPS.guntur = (win.guntur[0] + win.guntur[1]) / 2;
    RAIL_AT[2] = win.tirta[0];
    RAIL_AT[3] = win.guntur[0];
  }
  layoutZones();

  /* ---------- ukuran ---------- */
  var vh = window.innerHeight / 100, lastW = 0, railY = [];
  function measure(force) {
    // di mobile tinggi berubah saat bilah alamat muncul/hilang: abaikan, hanya ikuti perubahan lebar
    if (!force && window.innerWidth === lastW) return;
    var keep = window.scrollY / vh;
    lastW = window.innerWidth;
    vh = window.innerHeight / 100;
    track.style.height = (TOTAL + 100) * vh + "px";
    if (keep > 0) window.scrollTo(0, keep * vh);
    railY = railBtns.map(function (b) { return b.offsetTop + b.offsetHeight / 2; });
  }

  /* ---------- state ---------- */
  var s = 0, prevS = 0, vel = 0, shownSpeed = 0, last = performance.now();
  var active = null, curT = 0;
  var auto = null;                 // { phase: 1 | 2, t0 }
  var jump = null;                 // { to, t0, done }
  var liftTick = -1, wasEnded = false, nextBeat = 0, evt = 0, punch = 0;

  function beatAt(x) {
    for (var i = BEATS.length - 1; i >= 0; i--) if (x >= BEATS[i].from) return BEATS[i];
    return BEATS[0];
  }
  function timeFor(b, p) {
    var end = dur(clips[b.clip]);
    var t0 = b.t0 == null ? end : b.t0, t1 = b.t1 == null ? end : b.t1;
    return lerp(t0, t1, b.ease(clamp(p, 0, 1)));
  }
  function show(name) {
    if (active === name) return false;
    active = name;
    for (var k in clips) clips[k].classList.toggle("is-active", k === name);
    return true;
  }
  function seek(v, t) {
    if (v.readyState < 1 || v.seeking) return;
    if (Math.abs(v.currentTime - t) > 0.021) v.currentTime = t;
  }

  /* ---------- wahana otomatis ---------- */
  function lockEvt(e) { if (auto) e.preventDefault(); }
  function lockKey(e) {
    if (auto && [" ", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].indexOf(e.key) > -1) e.preventDefault();
  }
  window.addEventListener("wheel", lockEvt, { passive: false });
  window.addEventListener("touchmove", lockEvt, { passive: false });
  window.addEventListener("keydown", lockKey);

  function startRide(now) {
    var v = clips.ride;
    if (v.readyState < 2) return;                 // belum siap: biarkan di-scrub biasa
    auto = { phase: 1, t0: now };
    evt = 0;
    body.classList.add("is-riding");
    show("ride");
    v.currentTime = CREEP;
    v.playbackRate = 1;
    var p = v.play();
    if (p && p.catch) p.catch(function () { endRide(); });
  }
  function endRide() {
    if (!auto) return;
    clips.ride.pause();
    auto = null;
    body.classList.remove("is-riding");
  }
  function stepRide(now) {
    var v = clips.ride;
    if (auto.phase === 1) {
      var q = clamp((v.currentTime - CREEP) / (BRAKE_T - CREEP), 0, 1);
      window.scrollTo(0, lerp(RIDE.from, RIDE.to, q) * vh);
      while (evt < EVENTS.length && v.currentTime >= EVENTS[evt].t) {
        punch = Math.max(punch, EVENTS[evt].punch);
        if (EVENTS[evt].sound && window.RideSound) RideSound[EVENTS[evt].sound]();
        evt++;
      }
      if (v.ended || q >= 1 || now - auto.t0 > 24000) {
        v.pause();
        auto = { phase: 2, t0: now };
      }
    } else {
      // otomatis selesai: kereta masih meluncur sendiri sambil melambat, lalu kendali kembali ke scroll
      var k = clamp((now - auto.t0) / 1500, 0, 1);
      window.scrollTo(0, lerp(RIDE.to, RIDE.to + GLIDE, 1 - Math.pow(1 - k, 2.4)) * vh);
      if (k >= 1) endRide();
    }
  }

  /* ---------- lompat (rail, lewati, naik lagi) ---------- */
  function jumpTo(key) {
    if (auto) return;
    if (body.classList.contains("is-gated")) openGate(false);
    jump = { to: JUMPS[key] != null ? JUMPS[key] : 0, t0: performance.now(), done: false };
  }
  function stepJump(now) {
    var t = now - jump.t0, o;
    if (reduced) { window.scrollTo(0, jump.to * vh); jump = null; return 0; }
    if (t < 240) o = t / 240;
    else {
      if (!jump.done) { window.scrollTo(0, jump.to * vh); jump.done = true; active = null; }
      o = 1 - (t - 240) / 420;
      if (o <= 0) { jump = null; return 0; }
    }
    return clamp(o, 0, 1);
  }

  /* ---------- gerbang ---------- */
  function openGate(withSound) {
    body.classList.remove("is-gated");
    hint.classList.add("is-on");
    for (var k in clips) {                       // iOS: video baru bisa di-seek setelah pernah diputar oleh gestur
      (function (v) {
        var p = v.play();
        if (p && p.then) p.then(function () { if (!auto) v.pause(); }).catch(function () {});
      })(clips[k]);
    }
    if (withSound && window.RideSound) {
      setSound(RideSound.setEnabled(true));
      RideSound.clunk();
    }
  }
  function setSound(on) {
    soundBtn.setAttribute("aria-pressed", String(!!on));
    soundBtn.textContent = on ? "Suara: nyala" : "Suara: mati";
  }
  function ready() {
    if (!startBtn.disabled) return;
    startBtn.disabled = false;
    startBtn.querySelector(".start__label").textContent = "Mulai";
  }
  if (clips.lift.readyState >= 2) ready();
  clips.lift.addEventListener("loadeddata", ready);
  setTimeout(ready, 7000);                       // jaringan lambat: tetap boleh mulai, poster jadi cadangan

  startBtn.addEventListener("click", function () { openGate(true); });
  soundBtn.addEventListener("click", function () {
    if (!window.RideSound) return;
    setSound(RideSound.setEnabled(!RideSound.enabled));
  });
  againBtn.addEventListener("click", function () {
    jumpTo("0");
    setTimeout(function () { hint.classList.add("is-on"); }, 700);   // ajak scroll lagi dari stasiun
  });
  document.addEventListener("click", function (e) {
    var j = e.target.closest("[data-jump]");
    if (!j) return;
    e.preventDefault();
    jumpTo(j.dataset.jump);
  });

  /* ---------- frame ---------- */
  function tick(now) {
    var dt = Math.min((now - last) / 1000, 0.1) || 0.016;
    last = now;

    if (auto) stepRide(now);
    var jumpFlash = jump ? stepJump(now) : 0;

    s = clamp(window.scrollY / vh, 0, TOTAL);
    var ds = s - prevS;
    vel += (Math.abs(ds) / dt - vel) * (1 - Math.exp(-dt * 8));

    // lewat bibir puncak sambil turun -> lepas kendali
    if (!reduced && !auto && !jump && ds > 0 && prevS < RIDE.from && s >= RIDE.from && s < RIDE.from + 30 && prevS >= 300) {
      startRide(now);
    }

    var b = beatAt(s);
    var p = (s - b.from) / (b.to - b.from);
    var target = timeFor(b, p);
    var changed = show(b.clip);
    var v = clips[b.clip];
    if (auto && auto.phase === 1) {
      curT = v.currentTime;
    } else {
      curT = changed || jump ? target : curT + (target - curT) * (1 - Math.exp(-dt * 11));
      seek(v, curT);
    }

    /* overlay teks */
    for (var i = 0; i < overlays.length; i++) {
      var o = overlays[i];
      var op = clamp((s - o.a) / o.fade, 0, 1) * clamp((o.b - s) / o.fade, 0, 1);
      if (jump) op = 0;
      var on = op > 0.001;
      if (on || o.on) {
        o.el.style.opacity = op.toFixed(3);
        o.el.style.setProperty("--t", clamp((s - o.a) / (o.b - o.a), 0, 1).toFixed(3));
        if (on !== o.on) { o.el.style.visibility = on ? "visible" : "hidden"; o.on = on; }
      }
    }

    /* kilatan hanya dipakai saat melompat lewat rail */
    flash.style.opacity = jumpFlash.toFixed(3);

    /* HUD: kereta hanya "melaju" selama kamu menggerakkannya (kecuali saat otomatis) */
    var moving = auto ? 1 : clamp(vel / 26, 0, 1);
    shownSpeed += (b.speed(p) * moving - shownSpeed) * (1 - Math.exp(-dt * 6));
    speedEl.textContent = Math.round(shownSpeed);
    var zone = b.zone;
    if (b.id === "ride") {
      if (s >= RAIL_AT[3]) zone = "02 Guntur";
      else if (s >= RAIL_AT[2]) zone = "01 Tirta";
    }
    if (zoneEl.textContent !== zone) zoneEl.textContent = zone;

    /* sensasi: getar, zoom, dan pandangan menyempit mengikuti kecepatan */
    var k = reduced ? 0 : clamp((shownSpeed - 14) / 100, 0, 1);
    punch *= Math.exp(-dt * 2.2);
    if (k > 0.004 || punch > 0.004) {
      var amp = (k * k * 7 + punch * 9);
      var jx = (Math.sin(now * 0.071) + Math.sin(now * 0.113 + 1.7)) * 0.5 * amp;
      var jy = (Math.sin(now * 0.093 + 0.6) + Math.sin(now * 0.057 + 2.9)) * 0.5 * amp;
      var rot = Math.sin(now * 0.0031) * k * 0.9;
      media.style.transform = "translate3d(" + jx.toFixed(2) + "px," + jy.toFixed(2) + "px,0) scale(" +
        (1.03 + k * 0.07 + punch * 0.05).toFixed(4) + ") rotate(" + rot.toFixed(3) + "deg)";
      tunnel.style.opacity = (k * 0.85 + punch * 0.25).toFixed(3);
    } else if (media.style.transform) {
      media.style.transform = "";
      tunnel.style.opacity = "0";
    }
    body.classList.toggle("is-fast", shownSpeed > 80);

    /* rail */
    var here = 0;
    for (var r = 0; r < RAIL_AT.length; r++) if (s >= RAIL_AT[r] - 0.5) here = r;
    for (r = 0; r < railBtns.length; r++) {
      railBtns[r].classList.toggle("is-passed", r <= here);
      railBtns[r].classList.toggle("is-here", r === here);
    }
    if (railY.length) {
      var nx = Math.min(here + 1, RAIL_AT.length - 1);
      var span = RAIL_AT[nx] - RAIL_AT[here] || 1;
      var y = lerp(railY[here], railY[nx], clamp((s - RAIL_AT[here]) / span, 0, 1));
      railCar.style.setProperty("--y", (y - 14).toFixed(1));
    }

    if (s > 14) hint.classList.remove("is-on");
    var ended = s >= END_AT;
    if (ended !== wasEnded) {
      body.classList.toggle("is-ended", ended);
      if (ended && ds > 0 && window.RideSound) RideSound.hiss();
      wasEnded = ended;
    }

    /* suara */
    if (window.RideSound) {
      if (b.id === "lift") {
        var n = Math.floor(p * 78);
        if (n !== liftTick) { if (liftTick !== -1 && !jump) { RideSound.click(); punch = Math.max(punch, 0.045); } liftTick = n; }   // tiap klik rantai = sentakan kecil
      }
      if (b.id === "crest" && !body.classList.contains("is-gated")) {
        // rantai berhenti; yang terdengar tinggal detak jantung yang makin cepat menjelang bibir puncak
        if (now >= nextBeat) { RideSound.heartbeat(); nextBeat = now + lerp(980, 430, clamp(p, 0, 1)); }
      }
      RideSound.update(shownSpeed / 110);
    }

    prevS = s;
    requestAnimationFrame(tick);
  }

  /* ---------- mulai ---------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  measure(true);
  window.addEventListener("resize", function () { measure(false); });
  window.addEventListener("orientationchange", function () { setTimeout(function () { measure(true); }, 200); });
  show("lift");
  requestAnimationFrame(tick);
})();
