/*
 * RideSound — semua suara disintesis dengan WebAudio (tanpa file audio).
 * klik rantai saat menanjak, angin + gemuruh mengikuti kecepatan, desis rem di stasiun.
 */
(function (global) {
  "use strict";

  var ctx = null, master = null, noise = null;
  var wind = null, windGain = null, rumbleGain = null;
  var enabled = false, lastClick = 0;

  function noiseBuffer() {
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function init() {
    if (ctx) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    noise = noiseBuffer();

    var src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;

    wind = ctx.createBiquadFilter();
    wind.type = "bandpass";
    wind.frequency.value = 400;
    wind.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    src.connect(wind); wind.connect(windGain); windGain.connect(master);

    var low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 110;
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    src.connect(low); low.connect(rumbleGain); rumbleGain.connect(master);

    src.start();
    return true;
  }

  function setEnabled(on) {
    enabled = !!on;
    if (on && !init()) { enabled = false; return false; }
    if (!ctx) return false;
    if (on && ctx.state === "suspended") ctx.resume();
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.08);
    return enabled;
  }

  function burst(freq, type, dur, gain, q) {
    var src = ctx.createBufferSource();
    src.buffer = noise;
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    var g = ctx.createGain();
    var t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
  }
  function thump(f0, f1, dur, gain) {
    var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  global.RideSound = {
    get enabled() { return enabled; },
    setEnabled: setEnabled,
    /* satu "klik" rantai pengangkat */
    click: function () {
      if (!enabled) return;
      var now = performance.now();
      if (now - lastClick < 45) return;
      lastClick = now;
      burst(2100 + Math.random() * 500, "bandpass", 0.05, 0.22, 4);
      thump(150, 90, 0.06, 0.16);
    },
    /* tuas pengaman terkunci */
    clunk: function () {
      if (!enabled) return;
      thump(120, 45, 0.22, 0.6);
      burst(900, "bandpass", 0.09, 0.3, 1.5);
    },
    /* rem udara di stasiun */
    hiss: function () {
      if (!enabled) return;
      burst(3800, "highpass", 1.1, 0.22, 0.7);
    },
    /* detak jantung di puncak: dua dentum rendah */
    heartbeat: function () {
      if (!enabled) return;
      thump(62, 38, 0.16, 0.75);
      setTimeout(function () { if (enabled) thump(54, 34, 0.2, 0.55); }, 150);
    },
    /* udara tersedot saat kereta jatuh dari bibir puncak */
    whoosh: function () {
      if (!enabled) return;
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
      src.buffer = noise; src.loop = true;
      f.type = "bandpass"; f.Q.value = 0.9;
      f.frequency.setValueAtTime(180, t);
      f.frequency.exponentialRampToValueAtTime(2600, t + 1.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.7, t + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + 2.7);
      thump(70, 28, 1.2, 0.5);
    },
    /* guntur saat keluar gua */
    thunder: function () {
      if (!enabled) return;
      burst(1400, "lowpass", 0.25, 0.9, 0.5);
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
      src.buffer = noise; src.loop = true;
      f.type = "lowpass"; f.frequency.setValueAtTime(420, t); f.frequency.exponentialRampToValueAtTime(70, t + 2.4);
      g.gain.setValueAtTime(0.9, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + 2.7);
    },
    /* speed 0..1 */
    update: function (speed) {
      if (!ctx || !enabled) return;
      var t = ctx.currentTime, s = Math.max(0, Math.min(1, speed));
      wind.frequency.setTargetAtTime(320 + 1700 * s, t, 0.12);
      windGain.gain.setTargetAtTime(Math.pow(s, 1.3) * 0.8, t, 0.1);
      rumbleGain.gain.setTargetAtTime(s * 0.9, t, 0.1);
    }
  };
})(window);
