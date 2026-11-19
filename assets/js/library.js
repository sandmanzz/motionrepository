/* Stock Motion — gallery. Membaca window.STOCK_MOTIONS dari motions/registry.js */
(function () {
  "use strict";

  var motions = (window.STOCK_MOTIONS || []).slice().sort(function (a, b) {
    return String(b.added).localeCompare(String(a.added));
  });
  var grid = document.getElementById("grid");
  var filters = document.getElementById("filters");
  var search = document.getElementById("search");
  var count = document.getElementById("count");
  var state = { category: "All", query: "" };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- filters ---------- */
  var categories = ["All"].concat(
    motions.map(function (m) { return m.category; })
      .filter(function (c, i, a) { return c && a.indexOf(c) === i; })
      .sort()
  );
  categories.forEach(function (c) {
    var b = el("button", "chip mono", c);
    b.type = "button";
    b.setAttribute("aria-pressed", String(c === state.category));
    b.addEventListener("click", function () {
      state.category = c;
      [].forEach.call(filters.children, function (x) {
        x.setAttribute("aria-pressed", String(x === b));
      });
      render();
    });
    filters.appendChild(b);
  });
  search.addEventListener("input", function () {
    state.query = search.value.trim().toLowerCase();
    render();
  });

  /* ---------- live preview: iframe 1280x800 yang diskalakan ke lebar kartu ---------- */
  var scaler = new ResizeObserver(function (entries) {
    entries.forEach(function (e) {
      var f = e.target.querySelector("iframe");
      if (f) f.style.transform = "scale(" + e.contentRect.width / 1280 + ")";
    });
  });
  var lazy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var box = e.target;
      if (e.isIntersecting && !box.firstElementChild.src) {
        box.firstElementChild.src = box.dataset.src;   // muat hanya saat terlihat
      }
    });
  }, { rootMargin: "200px" });

  function card(m) {
    var a = el("a", "card");
    a.href = "viewer.html?m=" + encodeURIComponent(m.id);

    var pv = el("div", "card__preview");
    pv.dataset.src = "motions/" + m.id + "/index.html";
    var f = document.createElement("iframe");
    f.title = "";
    f.tabIndex = -1;
    f.setAttribute("aria-hidden", "true");
    f.loading = "lazy";
    pv.appendChild(f);
    if (m.status && m.status !== "ready") pv.appendChild(el("span", "card__status mono", m.status));
    scaler.observe(pv);
    lazy.observe(pv);

    var body = el("div", "card__body");
    var row = el("div", "card__row mono");
    row.appendChild(el("span", "", m.category || ""));
    row.appendChild(el("span", "", m.trigger || ""));
    body.appendChild(row);
    body.appendChild(el("h2", "card__title", m.title));
    body.appendChild(el("p", "card__summary", m.summary));
    var tags = el("ul", "tags mono");
    (m.tags || []).forEach(function (t) { tags.appendChild(el("li", "", t)); });
    body.appendChild(tags);

    a.appendChild(pv);
    a.appendChild(body);
    return a;
  }

  function addCard() {
    var d = el("div", "card card--add");
    d.appendChild(el("span", "mono muted", "Add a motion"));
    d.appendChild(el("h3", "", "Found another one?"));
    var ol = el("ol");
    ol.innerHTML =
      "<li>Copy <code>motions/_template</code> to <code>motions/&lt;id&gt;</code></li>" +
      "<li>Build it inside that folder only</li>" +
      "<li>Add one entry to <code>motions/registry.js</code></li>";
    d.appendChild(ol);
    return d;
  }

  function matches(m) {
    if (state.category !== "All" && m.category !== state.category) return false;
    if (!state.query) return true;
    var hay = [m.title, m.summary, m.category, m.trigger, (m.tags || []).join(" "), (m.source || {}).name]
      .join(" ").toLowerCase();
    return hay.indexOf(state.query) > -1;
  }

  function render() {
    scaler.disconnect();
    lazy.disconnect();
    grid.textContent = "";
    var list = motions.filter(matches);
    list.forEach(function (m) { grid.appendChild(card(m)); });
    if (!list.length) {
      grid.appendChild(el("p", "empty", "No motion matches that. Try another word or clear the filter."));
    } else if (state.category === "All" && !state.query) {
      grid.appendChild(addCard());
    }
    count.textContent = list.length + " / " + motions.length + (motions.length === 1 ? " motion" : " motions");
  }

  render();
})();
