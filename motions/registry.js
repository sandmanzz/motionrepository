/*
 * Stock Motion — registry
 * Satu entri = satu folder di /motions/<id>/.
 * Ini satu-satunya file yang perlu diedit saat menambah motion baru.
 * Sengaja berupa .js (bukan .json) supaya site tetap jalan saat dibuka langsung dari file://
 */
window.STOCK_MOTIONS = [
  {
    id: "press-wheels",
    frame: "viewport",              // demo layar penuh (wheel ditangkap) di viewer
    title: "Press Wheels",
    summary:
      "Beranda portofolio sebagai mesin cetak: roda kartu proyek di kiri dan roda pelat logo di kanan berputar bersamaan seperti roda gigi yang bertemu di tengah. Scroll, drag, atau panah memutar satu takik; hover memberi kilau & cincin cahaya; klik kartu aktif membukanya, klik item lain memutar ke sana.",
    category: "Interaction",
    tags: ["carousel", "wheel", "gear", "snap", "drag", "hover", "click", "portfolio", "css-3d", "text-roll"],
    trigger: "Wheel + drag + hover + click",
    stack: ["CSS 3D", "Vanilla JS"],
    source: { name: "Carter Ogunsola", url: "https://carterogunsola.com/" },
    added: "2026-11-20",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/w*.webp"],
    notes: [
      "Kiri: item di (cos θ, sin θ)·R berotasi θ. Kanan: sudut π − θ → posisi y sama → kedua roda naik-turun bersamaan.",
      "9 slot per putaran, item di luar ±4 slot memudar; roda bertakik selalu berlabuh ke detent setelah 260 ms tenang.",
      "Roda mouse bertakik (≥60 px, jeda >40 ms) = tepat satu item; trackpad = kontinu 0.0011 rad/px; drag 0.0034 rad/px + flick.",
      "Aslinya WebGL (kain melengkung oleh kecepatan, pelat chrome ber-relief, peta kedalaman). Di sini CSS 3D: skew dari kecepatan, kilau radial, cincin conic-gradient, monogram chrome background-clip."
    ]
  },
  {
    id: "card-helix",
    title: "Card Helix",
    summary:
      "Kartu remi yang melengkung mengikuti silinder, tersusun di jalur heliks dan terus berputar. Kartu di belakang miring, buram, dan redup; ujung heliks memudar. Bisa ditarik untuk memutar.",
    category: "Layout",
    tags: ["webgl2", "3d", "helix", "cards", "carousel", "logos", "blur", "loop"],
    trigger: "Auto + drag",
    stack: ["WebGL2", "GLSL", "Vanilla JS", "CSS"],
    source: { name: "Ebuka Marketing", url: "https://ebuka.marketing/" },
    added: "2026-11-20",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js"],
    notes: [
      "Posisi: sudut = −n·2π/9, y = n·80, x = sin·R, z = cos·R, rotY = sudut. a = (1−cos)/2 menggerakkan shear (tan 25°), blur, dan redup.",
      "Blur gratis: bias mipmap di texture() — tekstur kartu diberi margin transparan 64px supaya blur tidak terpotong.",
      "Bidang 64 segmen dibengkokkan ke silinder radius R; sisi belakang memakai tekstur punggung (dicerminkan).",
      "Muka & punggung kartu digambar di canvas 2D (tanpa aset); items[].src bisa diisi logo/gambar."
    ]
  },
  {
    id: "ink-comic",
    frame: "viewport",              // demo butuh viewport asli (sticky) di viewer
    title: "Ink Comic",
    summary:
      "Panel komik bergaya ukiran tinta dari satu foto biasa: arsir garis, tone 3 warna, kontur pena, langit gelap dengan noda awan tinta, garis angin, dan panel close-up yang bergetar seperti gambar tangan (8 fps) sementara scroll & kursor tetap 60 fps.",
    category: "Scroll",
    tags: ["webgl", "shader", "ink", "comic", "engraving", "boil", "illustration", "scroll"],
    trigger: "Load + scroll + kursor",
    stack: ["WebGL1", "GLSL", "Vanilla JS", "CSS"],
    source: { name: "Santioni Spirits (versi 2D ringan)", url: "https://santionispirits.com/" },
    added: "2026-11-19",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/wanderer.webp"],
    notes: [
      "Aslinya 3D real-time (model ber-rig + shader arsir). Di sini 2D: satu fragment shader layar penuh mengukir foto PNG/WebP transparan.",
      "Kesan gambar tangan = waktu dibulatkan floor(t*8)/8 untuk garis/tepi, floor(t*24)/24 untuk awan.",
      "Panel close-up = crop foto yang sama; rasio crop harus = rasio panel (default 0.55).",
      "Tokoh pengembara berjubah di-generate dengan Higgsfield (GPT Image 2.6, transparan, 1 kredit). Foto gelap dinormalisasi dulu lewat opsi levels."
    ]
  },
  {
    id: "zoom-field",
    frame: "viewport",              // demo butuh viewport asli (layar penuh) di viewer
    title: "Zoom Field",
    summary:
      "Bidang proyek 3D tanpa scroll halaman: tile tersusun spiral dari tengah dalam kolom masonry. Scroll/pinch untuk zoom maju-mundur, drag untuk menggeser dengan pantulan di tepi, hover menampilkan label proyek. Tile mengejar posisi dengan lerp lembut sehingga terasa cair.",
    category: "Interaction",
    tags: ["zoom", "pan", "drag", "3d", "perspective", "gallery", "portfolio", "intro"],
    trigger: "Wheel + drag + hover",
    stack: ["CSS 3D", "Vanilla JS"],
    source: { name: "Powerhouse Company", url: "https://www.powerhouse-company.com/" },
    added: "2026-11-19",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/p*.webp"],
    notes: [
      "Aslinya three.js (PerspectiveCamera fov 35, z 13). Di sini CSS 3D: perspective = (H/2)/tan(17.5°), 1 unit = perspective/13 px.",
      "Zoom = bidang maju ke kamera (z −10…+5, 0.02 per deltaY). Drag = 1/64 unit per px. Lerp tile 0.05 (z 0.085), sebagian telat 1 frame.",
      "Intro: tile terbang dari z −32 dengan jeda acak, abu-abu selama opacity < 0.3; kamera mundur→maju 20→13 selama 9.5 dtk.",
      "Foto sementara memakai ulang foto library (akaru, c2, outfit, arunika)."
    ]
  },
  {
    id: "c2-lenses",
    frame: "viewport",              // demo butuh viewport asli (sticky / 100vh) di viewer
    title: "C2 Lenses",
    summary:
      "Latar gradasi fixed + 26 lingkaran membentuk logo \"C2\" yang di-blend difference, zoom keluar sepanjang hero dan menghindar dari kursor. Huruf hero berputar naik, carousel kata 3D, lalu judul besar bertopeng: teks gelap dengan mix-blend lighten jadi jendela ke latar.",
    category: "Scroll",
    tags: ["scroll", "mix-blend", "canvas", "cursor", "3d", "text-mask", "parallax", "intro"],
    trigger: "Load + scroll + cursor",
    stack: ["Canvas 2D", "Vanilla JS", "CSS"],
    source: { name: "C2 Montréal (Koki-Kiko)", url: "https://c2mtl.koki-kiko.com/" },
    added: "2026-11-19",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/*.webp"],
    notes: [
      "Efek judul bertopeng hanya CSS: section terang dengan teks gelap + mix-blend-mode: lighten di atas latar fixed.",
      "Aslinya three.js (cylinder instanced + shader gradasi). Di sini Canvas 2D: lingkaran bergradasi, composite 'lighter', kanvas difference ke latar.",
      "Posisi 26 lingkaran, warna, zoom kamera 2→1 dan timeline carousel (15/25/34.5 masuk, 23.5/32/40 keluar) disalin dari kode asli.",
      ".c2 tidak boleh punya transform/opacity/isolation supaya blend bisa melihat latar fixed.",
      "2 foto (CTA & slot video) di-generate dengan Higgsfield (GPT Image 2.6)."
    ]
  },
  {
    id: "akaru-projects",
    frame: "viewport",              // demo butuh viewport asli (sticky / 100vh) di viewer
    title: "Akaru Projects Scroll",
    summary:
      "Hero setengah layar + 3 panel proyek berwarna yang mengintip di kanan. Scroll menggeser semuanya ke kiri seperti akordeon, foto membesar ke atas panel, lalu panel terakhir mengecil jadi kolom kiri daftar proyek dan judul \"Projects\" muncul di kanan.",
    category: "Scroll",
    tags: ["scroll", "horizontal", "sticky", "accordion", "parallax", "portfolio", "hero"],
    trigger: "Scroll",
    stack: ["Vanilla JS", "CSS"],
    source: { name: "Akaru", url: "https://www.akaru.fr/" },
    added: "2026-11-19",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/*.webp"],
    notes: [
      "Satu timeline 14 unit (1 unit = 1 tinggi layar scroll), disalin dari GSAP aslinya dan dijalankan manual.",
      "Panel ke-2 & ke-3 mulai bergeser -31vw / -87vw lalu menyusul; foto tiap panel mulai kecil (0.6 / 0.4 / 0.2) dan turun.",
      "Fase 2: panel terakhir + daftar di-scale 0.5 dari pojok kiri atas → jadi kolom kiri yang bergulir dengan parallax foto.",
      "Di bawah 900px berubah jadi layout statis bertumpuk.",
      "Foto di-generate dengan Higgsfield (GPT Image 2.6)."
    ]
  },
  {
    id: "orbit-words",
    frame: "viewport",              // demo butuh viewport asli (sticky / 100vh) di viewer
    title: "Orbit Words",
    summary:
      "Section sticky: kata-kata muncul satu per satu di atas objek tengah, lalu berputar searah jarum jam mengelilinginya mengikuti scroll, berhenti sejenak di tiap titik.",
    category: "Scroll",
    tags: ["scroll", "sticky", "orbit", "text", "polar", "smoothing"],
    trigger: "Scroll",
    stack: ["Vanilla JS", "CSS"],
    source: { name: "Switchblade", url: "https://switchblade-awwwards.vercel.app/" },
    added: "2026-11-19",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/star.webp"],
    notes: [
      "Posisi dihitung polar (radius + sudut) antar 4 jangkar, jadi lintasannya melengkung, bukan garis lurus.",
      "Progres scroll di-lerp 0.045/frame lalu ditangga dengan smoothstep: kata diam sebentar di tiap jangkar.",
      "Objek asli 3D WebGL; di sini render bintang chrome transparan (Higgsfield, GPT Image 2.6). Isi .ow__object bebas diganti."
    ]
  },
  {
    id: "drift-footer",
    frame: "viewport",              // demo butuh viewport asli (sticky / 100vh) di viewer
    title: "Drift Footer",
    summary:
      "Footer bergaris: ilustrasi garis bergeser horizontal mengikuti scroll sampai mendarat di posisinya, garis pemisah tumbuh dari kiri, teks muncul berurutan.",
    category: "Scroll",
    tags: ["scroll", "scrub", "parallax", "footer", "line-art", "reveal"],
    trigger: "Scroll",
    stack: ["Vanilla JS", "CSS"],
    source: { name: "Floema", url: "https://floema.com/en" },
    added: "2026-11-19",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/*.svg"],
    notes: [
      "Generik lewat atribut: data-fd-drift=\"dari,ke\", data-fd-range, data-fd-line, data-fd-reveal.",
      "Satuan % pada drift = lebar elemen itu sendiri (seperti x: \"100%\" di GSAP).",
      "Ilustrasi digambar ulang sendiri (bukan aset Floema)."
    ]
  },
  {
    id: "outfit-loader",
    frame: "viewport",              // demo butuh viewport asli (sticky / 100vh) di viewer
    title: "Outfit Preloader",
    summary:
      "Preloader layar penuh: foto-foto dilempar bertumpuk dengan rotasi acak, huruf wordmark naik dari mask, counter 000 → 100. Di akhir semuanya keluar dan overlay tersingkap ke atas lewat clip-path.",
    category: "Loader",
    tags: ["preloader", "counter", "stagger", "clip-path", "intro", "fashion"],
    trigger: "Load",
    stack: ["Vanilla JS", "CSS"],
    source: { name: "OUTFIT® by ++hellohello", url: "https://outfit.hellohello.is/" },
    added: "2026-11-19",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/look-*.webp"],
    notes: [
      "Timeline disalin dari GSAP aslinya (durasi, stagger, easing power3/circ/expo) lalu dijalankan dengan mesin tween kecil tanpa GSAP.",
      "Wordmark asli berupa SVG per huruf; di sini diganti teks per huruf (opsi word & mark) dengan mix-blend-mode: difference.",
      "6 foto lookbook editorial 3:4 di-generate dengan Higgsfield (GPT Image 2.6). Tanpa opsi images, kartu jadi blok warna polos.",
      "Pakai class .ol--fixed + onComplete untuk membuka scroll halaman saat overlay mulai tersingkap."
    ]
  },
  {
    id: "particle-hero",
    title: "Particle Relief Hero",
    summary:
      "Satu gambar relief di-sampling jadi ±90 ribu partikel WebGL yang terbentuk dari badai acak di belakang wordmark. Hover menyapukan jejak kuas yang memoles partikel emas jadi terang berkilau, lalu memudar sendiri.",
    category: "Hover",
    tags: ["webgl", "particles", "hero", "hover", "cursor-trail", "intro"],
    trigger: "Load + hover",
    stack: ["WebGL1", "GLSL", "Vanilla JS", "CSS"],
    source: { name: "Tigris (Loro Labs)", url: "https://tigris.lorolabs.ai/" },
    added: "2026-11-17",
    status: "ready",
    files: ["index.html", "motion.css", "motion.js", "assets/relief.webp"],
    notes: [
      "Hanya butuh 1 gambar: subjek terang di atas hitam pekat. Area merah murni otomatis jadi warna aksen.",
      "Hover tidak menggeser partikel; ia mengubah warna + kilau lewat tekstur jejak 192×128 yang meluruh.",
      "Harus dijalankan lewat http (bukan file://) karena gambar dibaca dengan getImageData. Kalau gagal, gambar statis tampil sebagai fallback.",
      "Aset di-generate dengan Higgsfield (GPT Image 2.6)."
    ]
  },
  {
    id: "product-swap",                 // harus sama dengan nama folder
    title: "Product Swap Conveyor",
    summary:
      "Kartu produk mengalir di jalur gelombang di belakang model. Kartu yang lewat titik fokus (atau yang diklik) mengganti apa yang dipakai model lewat crossfade.",
    category: "Interaction",            // Interaction | Scroll | Hover | Loader | Text | Transition | Layout
    tags: ["marquee", "crossfade", "click", "e-commerce", "hero"],
    trigger: "Auto + click",
    stack: ["Vanilla JS", "CSS"],
    source: { name: "Switchblade", url: "https://switchblade-awwwards.vercel.app/" },
    added: "2026-11-17",
    status: "ready",                    // ready | wip
    files: ["index.html", "motion.css", "motion.js", "assets/model/*.webp", "assets/products/*.webp"],
    notes: [
      "Tiap produk butuh 2 gambar: cutout produk (kartu) dan foto model yang memakai produk itu, dengan framing identik.",
      "Semua foto model harus punya rasio & posisi yang sama supaya crossfade tidak terlihat bergeser.",
      "Aset di-generate dengan Higgsfield (GPT Image 2.6, background transparan)."
    ]
  }
];
