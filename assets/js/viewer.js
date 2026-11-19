/* Stock Motion — viewer. viewer.html?m=<id> */
(function () {
  "use strict";

  var root = document.getElementById("viewer");
  var id = new URLSearchParams(location.search).get("m");
  var m = (window.STOCK_MOTIONS || []).filter(function (x) { return x.id === id; })[0];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  if (!m) {
    var miss = el("div", "viewer__info");
    var box = el("div");
    box.appendChild(el("span", "mono muted", "Not found"));
    box.appendChild(el("h1", "", "No such motion"));
    box.appendChild(el("p", "", "Nothing in motions/registry.js has the id “" + (id || "") + "”."));
    var back = el("a", "btn", "Back to the library");
    back.href = "index.html";
    box.appendChild(back);
    miss.appendChild(box);
    root.appendChild(miss);
    return;
  }

  document.title = m.title + " — Stock Motion";
  var folder = "motions/" + m.id + "/";

  var frame = el("div", "viewer__frame");
  var iframe = document.createElement("iframe");
  iframe.src = folder + "index.html";
  iframe.title = m.title + " demo";
  frame.appendChild(iframe);
  root.appendChild(frame);

  // Motion berbasis scroll/sticky (registry: frame: "viewport") butuh viewport asli di dalam iframe:
  // frame setinggi layar dan demo di-scroll di dalamnya. Kalau tidak, 100vh di dalam iframe ikut membesar tanpa henti.
  if (m.frame === "viewport") {
    frame.classList.add("viewer__frame--viewport");
  } else {
    iframe.addEventListener("load", function () {
      fit();
      try { new ResizeObserver(fit).observe(iframe.contentDocument.body); } catch (e) {}
    });
  }

  // Samakan tinggi frame dengan tinggi demo supaya tidak ada scroll di dalam scroll.
  // Di file:// akses ke dokumen iframe diblokir -> tinggi default dari CSS tetap dipakai.
  function fit() {
    try {
      var h = iframe.contentDocument.documentElement.scrollHeight;
      if (h > 0) frame.style.height = h + "px";
    } catch (e) { /* cross-origin (file://) */ }
  }

  var info = el("div", "viewer__info");

  var left = el("div");
  left.appendChild(el("span", "mono muted", [m.category, m.trigger].filter(Boolean).join(" · ")));
  left.appendChild(el("h1", "", m.title));
  left.appendChild(el("p", "", m.summary));
  if (m.notes && m.notes.length) {
    var notes = el("ul", "notes");
    m.notes.forEach(function (n) { notes.appendChild(el("li", "", n)); });
    left.appendChild(notes);
  }
  var actions = el("div", "actions");
  var open = el("a", "btn mono", "Open standalone");
  open.href = folder + "index.html";
  open.target = "_blank";
  open.rel = "noopener";
  var copy = el("button", "btn btn--ghost mono", "Copy folder path");
  copy.type = "button";
  copy.addEventListener("click", function () {
    var done = function () {
      copy.textContent = "Copied";
      setTimeout(function () { copy.textContent = "Copy folder path"; }, 1400);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(folder).then(done, function () {});
  });
  actions.appendChild(open);
  actions.appendChild(copy);
  left.appendChild(actions);

  var dl = el("dl", "meta");
  function row(label, value) {
    if (value == null || value === "") return;
    var d = el("div");
    d.appendChild(el("dt", "mono", label));
    var dd = el("dd");
    if (value instanceof Node) dd.appendChild(value); else dd.textContent = value;
    d.appendChild(dd);
    dl.appendChild(d);
  }
  var path = el("code", "", folder);
  row("Folder", path);
  if (m.files) {
    var files = el("ul");
    m.files.forEach(function (f) {
      var li = el("li");
      li.appendChild(el("code", "", f));
      files.appendChild(li);
    });
    row("Files", files);
  }
  row("Stack", (m.stack || []).join(", "));
  row("Tags", (m.tags || []).map(function (t) { return "#" + t; }).join("  "));
  if (m.source && m.source.url) {
    var src = el("a", "", m.source.name || m.source.url);
    src.href = m.source.url;
    src.target = "_blank";
    src.rel = "noopener";
    row("Seen on", src);
  }
  row("Added", m.added);
  row("Status", m.status);

  info.appendChild(left);
  info.appendChild(dl);
  root.appendChild(info);
})();
