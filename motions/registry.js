/*
 * Stock Motion — registry
 * Satu entri = satu folder di /motions/<id>/.
 * Ini satu-satunya file yang perlu diedit saat menambah motion baru.
 * Sengaja berupa .js (bukan .json) supaya site tetap jalan saat dibuka langsung dari file://
 */
window.STOCK_MOTIONS = [
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
