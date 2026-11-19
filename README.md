# Stock Motion

Library pribadi untuk menyimpan motion/interaksi yang ditemukan di web. Front-end murni: tanpa build, tanpa dependency.

## Menjalankan
```bash
node server.js
```
Lalu buka `http://localhost:4173`. Pakai server ini, bukan `python3 -m http.server`: video yang di-scrub butuh HTTP Range, dan motion WebGL tidak bisa membaca gambar dari `file://`.

## Struktur
```
StockMotion/
├── index.html            gallery (cari + filter kategori, preview hidup)
├── viewer.html           halaman detail: viewer.html?m=<id>
├── assets/               HANYA milik shell library (css/js gallery & viewer)
├── motions/
│   ├── registry.js       daftar semua motion  ← satu-satunya file yang diedit saat menambah
│   ├── _template/        kerangka motion baru
│   └── <id>/             satu motion = satu folder mandiri
│       ├── index.html    demo standalone (blok markup ditandai komentar MOTION)
│       ├── motion.css    semua selector ber-prefix unik
│       ├── motion.js     satu global: Nama.mount(el, options) → { destroy }
│       ├── assets/       gambar/video khusus motion ini
│       └── README.md     cara kerja, opsi, cara pakai
├── projects/<nama>/      landing page / konsep utuh (bukan motion lepasan)
├── server.js             dev server statis dengan dukungan Range
└── _raw/<id>/            file sumber (PNG/MP4 asli hasil generate), tidak dipakai site
```

## Aturan supaya motion gampang diambil ke project
- Folder motion **tidak boleh** mengimpor apa pun dari `/assets` atau dari motion lain.
- Konten (teks, path gambar) masuk lewat `options` di `index.html`, bukan di dalam `motion.js`.
- Semua class CSS memakai prefix motion itu (`.ps__…`), tema lewat custom property.
- Selalu sediakan `destroy()` dan hormati `prefers-reduced-motion`.

Mengambil motion ke project = salin `motions/<id>/`, ikuti README di dalamnya.

## Menambah motion
1. Salin `motions/_template` → `motions/<id>`.
2. Bangun motion di dalam folder itu.
3. Tambah satu entri di `motions/registry.js` (`id` = nama folder).

## Isi saat ini
| id | Motion | Sumber |
| --- | --- | --- |
| `product-swap` | Product Swap Conveyor | switchblade-awwwards.vercel.app |
| `particle-hero` | Particle Relief Hero | tigris.lorolabs.ai |
| `outfit-loader` | Outfit Preloader | outfit.hellohello.is |
| `orbit-words` | Orbit Words | switchblade-awwwards.vercel.app |
| `drift-footer` | Drift Footer | floema.com |
| `akaru-projects` | Akaru Projects Scroll | akaru.fr |
| `c2-lenses` | C2 Lenses | c2mtl.koki-kiko.com |
| `zoom-field` | Zoom Field | powerhouse-company.com |
| `ink-comic` | Ink Comic | santionispirits.com (2D) |
| `card-helix` | Card Helix | ebuka.marketing |
| `press-wheels` | Press Wheels | carterogunsola.com |

## Projects
| Folder | Isi |
| --- | --- |
| `projects/arunika-park` | Landing page taman bermain: scroll = naik roller coaster |

## Studi
Bedah mendalam situs referensi (cara kerja, desain, cara pembuatan, playbook reusable):
| File | Situs |
| --- | --- |
| `studies/santioni-spirits.md` | santionispirits.com (Active Theory + Plan8) |

Katalog teknik semua motion: `PATTERNS.md`.
