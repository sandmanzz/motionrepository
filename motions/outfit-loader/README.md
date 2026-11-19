# Outfit Preloader

Preloader dari [OUTFIT® by ++hellohello](https://outfit.hellohello.is/), ditulis ulang tanpa GSAP.

## Urutan (detik, setelah `delay` 0.4)
| Waktu | Yang terjadi | Easing |
| --- | --- | --- |
| 0 – 1.6 | 6 kartu foto scale 0 → 1 + rotasi acak ±20°, stagger 0.2 | power3.out, 0.6s |
| 0 – 1.6 | Huruf wordmark naik dari mask (110% → 0), stagger 0.2 urutan acak | power3.out, 0.6s |
| 0 – 3.0 | Counter `000` → `100` | circ.inOut |
| 2.7 | Counter naik keluar + pudar | circ.inOut, 1s |
| 2.7 | Huruf naik keluar (0 → −120%), stagger 0.08 acak | expo.inOut, 1.2s |
| 2.7 | Kartu mengecil ke 0, stagger 0.1 dari kartu teratas | expo.inOut, 0.6s |
| ±3.0 | Overlay `clip-path: inset(0 0 100% 0)` → tersingkap ke atas | power2.inOut, 1.4s |
| ±3.7 | `onComplete()` (di aslinya: buka scroll + class `loaded`) | |

## Pakai
```html
<link rel="stylesheet" href="motion.css">
<div class="ol ol--fixed" id="preloader"></div>
<script src="motion.js"></script>
<script>
  document.documentElement.style.overflow = "hidden";
  OutfitLoader.mount(document.getElementById("preloader"), {
    word: "OUTFIT",
    mark: "®",
    images: ["a.webp", "b.webp", "c.webp", "d.webp", "e.webp", "f.webp"],
    onComplete: function () { document.documentElement.style.overflow = ""; }
  });
</script>
```

## Opsi
| Opsi | Default | Arti |
| --- | --- | --- |
| `word` | `"OUTFIT"` | Teks wordmark, dipecah per huruf |
| `mark` | `"®"` | Tanda kecil di ujung, `""` untuk menghilangkan |
| `images` | `[]` | Path foto (rasio 9:12). Kosong → 6 blok warna dari `colors` |
| `colors` | 6 warna | Warna kartu polos |
| `delay` | `0.4` | Jeda sebelum mulai |
| `count` | `3` | Durasi counter; seluruh outro ikut bergeser |
| `loop` | `false` | Putar ulang otomatis (demo/galeri) |
| `loopGap` | `1.6` | Jeda sebelum loop |
| `onComplete` | `null` | Dipanggil saat overlay setengah tersingkap |

Mengembalikan `{ replay(), destroy() }`.

## Tema (custom property di `.ol`)
`--ol-bg`, `--ol-ink`, `--ol-card`, `--ol-word`, `--ol-count`, `--ol-font`, `--ol-word-font`, `--ol-word-weight`.

## Catatan
- Wordmark asli adalah SVG per huruf; di sini teks per huruf. Untuk logo SVG, ganti isi `.ol__word` dengan `<svg>` dan beri tiap `<path>` class `ol__letter` (perlu sedikit ubah di `motion.js`).
- `mix-blend-mode: difference` di wordmark membuat huruf jadi gelap saat lewat di atas foto. Jangan beri `transform`/`opacity` pada `.ol__center`, nanti blend-nya terputus.
- `prefers-reduced-motion`: kartu & huruf langsung tampil, counter langsung 100, overlay hanya pudar.
