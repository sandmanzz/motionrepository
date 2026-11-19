/*
 * MOTION NAME
 * Satu global, satu fungsi mount(root, options) yang mengembalikan { destroy }.
 * Konten (teks, gambar) masuk lewat options, bukan di-hardcode di sini.
 */
(function (global) {
  "use strict";

  function mount(root, options) {
    var o = Object.assign({}, options);
    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    return {
      destroy: function () { /* lepas listener, observer, rAF */ }
    };
  }

  global.MotionName = { mount: mount };
})(window);
