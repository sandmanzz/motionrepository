# Zoom Field

Beranda [Powerhouse Company](https://www.powerhouse-company.com/): semua proyek melayang di satu bidang 3D. **Scroll / pinch = zoom**, **drag = geser**, **hover = label proyek**, klik tanpa drag = buka proyek.
Aslinya three.js; di sini CSS 3D tanpa dependency, dengan angka yang disalin dari kodenya.

## Cara kerja
1. **Ruang.** Kamera perspektif fov 35° di jarak 13 unit. Di CSS: `perspective = (H/2) / tan(17.5°)`, dan `1 unit = perspective / 13` px. Elemen di `translateZ(z·unit)` membesar persis seperti di three.js.
2. **Tata letak spiral.** `kolom = √(n·aspek)` (dibulatkan ke ganjil/genap seperti aslinya). Indeks 0 di tengah, lalu berputar keluar cincin demi cincin. Tiap kolom adalah masonry yang dipusatkan vertikal. Tinggi tile: square 1, portrait 1.5, landscape 0.8 × lebar.
3. **Ukuran.** Lebar tile = 23.26% lebar layar saat diam (42% di mobile), jarak = ¼ tile.
4. **Zoom.** `diff.z += 0.02 × deltaY`, dibatasi −10…+5. Bidang yang bergerak, bukan kamera: z +5 berarti jarak 8 (×1.63), −10 berarti jarak 23 (×0.57).
5. **Geser.** `diff.x += dx/64`, `diff.y −= dy/64` (touch /32).
   - **Batas** = lebar bidang − lebar terlihat di kedalaman saat ini.
   - Lewat setengah batas → setelah dilepas ditarik balik dengan lerp 0.06. Batas keras di ±(b/2 + 2).
6. **Rasa cair.** Tiap tile mengejar targetnya dengan lerp 0.05 (z: 0.085). Separuh tile membaca nilai 1 frame lebih lama (antrean 1 atau 2), jadi bidang bergerak berlapis, tidak kaku.
7. **Hidup.**
   - Seluruh bidang hanyut ±2 unit (0.0015/frame, arah acak) dan berhenti saat hover/drag.
   - Kamera ikut kursor ±1/3.5 unit (lerp 0.08).
8. **Hover.** Tile `scale 1.02`, foto di dalamnya zoom 1/0.98, dan label hitam mengikuti kursor.
9. **Intro.**
   - Kamera bergerak dari z 20 ke 13 selama 9.5 dtk.
   - Tiap tile terbang dari z −32 (outQuart) dengan jeda acak 0.75–2 dtk, dan opacity menyusul 1–2 dtk.
   - Selama opacity < 0.3, tile hitam-putih.
   - Wordmark masuk dari z −50 dan hurufnya muncul satu per satu (+0.1 dtk).

## Pakai
```html
<link rel="stylesheet" href="motion.css">
<div id="field"></div>
<script src="motion.js"></script>
<script>
  const field = ZoomField.mount(document.getElementById("field"), {
    items: [{ src: "a.webp", title: "Proyek A", orientation: "landscape", href: "/a" } /* … */],
    word: "STUDIO",
    onOpen: (item) => location.href = item.href
  });
  field.zoomTo(3);   // zoom terprogram
  field.destroy();
</script>
```

## Opsi
| Opsi | Default | Arti |
| --- | --- | --- |
| `items` | `[]` | `{ src, title, orientation: square/portrait/landscape, href }` |
| `tile` / `tileMobile` | `0.2326` / `0.42` | Lebar tile terhadap lebar layar |
| `gapRatio` | `0.25` | Jarak terhadap lebar tile |
| `minZ` / `maxZ` | `-10` / `5` | Batas zoom |
| `wheel` | `0.02` | Unit zoom per deltaY |
| `drag` | `1/64` | Unit geser per px |
| `follow` / `followZ` | `0.05` / `0.085` | Kelembaman tile |
| `intro` | `true` | Animasi pembuka |
| `wander` | `true` | Hanyut pelan |
| `word` | `"STOCKMOTION"` | Wordmark raksasa di tengah (±2.26× lebar layar) |
| `onOpen` | `null` | Klik tile tanpa drag |

Tema: `--zf-bg`, `--zf-ink`, `--zf-font`, `--zf-logo-font`.

## Catatan
- Butuh ±40 item supaya bidang lebih besar dari layar di zoom terjauh. Demo memakai 20 foto library yang diulang.
- Wheel di dalam bidang memanggil `preventDefault`, jadi motion ini dimaksudkan sebagai layar penuh (halaman tanpa scroll).
- `prefers-reduced-motion`: tanpa intro dan hanyut. Zoom dan geser tetap berfungsi.
