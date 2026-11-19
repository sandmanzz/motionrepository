# C2 Lenses

Pembuka [C2 Montréal](https://c2mtl.koki-kiko.com/) (oleh Koki-Kiko) sampai judul besar bertopeng "Combined lenses bring the world into sharper focus".

## Lapisan (dari belakang ke depan)
1. **Latar fixed**: panel gradasi biru penuh layar + panel peach di separuh kiri. Saat load peach masuk dari bawah, biru dari atas (1.6s). Peach naik keluar (−100%) selama blok tanggal di-scroll.
2. **Kanvas lingkaran** (fixed, `mix-blend-mode: difference`): 26 lingkaran membentuk logo "C2".
   - Gradasi vertikal ungu `#7022E2` → pink `#EC53C9` → oranye `#FA6104`, alpha 0.91, composite `lighter` (additive) supaya tumpukan lebih terang.
   - Kamera mulai zoom 2× di lengkung kiri huruf C, lalu zoom keluar ke 1× sepanjang hero (lerp 0.1).
   - Lingkaran terdorong menjauh dari kursor (kekuatan 50 → 150 mengikuti progres hero) dan kembali pelan.
   - Saat load muncul satu per satu (stagger 0.1). Saat masuk carousel kata, tiap lingkaran "berdenyut" pipih lalu kembali.
3. **Konten**:
   - Hero: huruf berputar naik (`rotateX(-90deg)` → 0, 1.2s). Kotak hitam di belakang judul naik −90% sepanjang hero.
   - Blok tanggal: CTA naik (50% → 0), highlight & slot video bergeser −50 → 100px.
   - Carousel kata 3D setinggi 400vh: tiga kata di cincin `rotateX` (45° per kata) yang berputar 180°. Karakter masuk dan keluar dengan jadwal asli (15/25/34.5 dan 23.5/32/40 dari 44.5).
4. **Judul bertopeng**: section `#f2f2f2` dengan teks `#141414` dan `mix-blend-mode: lighten`. Bagian terang tetap terang, sedangkan huruf gelap memperlihatkan latar gradasi + lingkaran di belakangnya. Tanpa JS.

## Pakai
Salin blok `.c2` dari `index.html` (latar dan kanvas fixed ada di dalamnya), lalu:
```js
C2Lenses.mount(document.querySelector(".c2"), { radius: 125, zoomFrom: 2, camFrom: [-400, 200] });
```
| Opsi | Default | Arti |
| --- | --- | --- |
| `radius` | `125` | Jari-jari lingkaran (unit dunia di lebar 1440) |
| `zoomFrom` | `2` | Zoom kamera di awal hero |
| `camFrom` | `[-400, 200]` | Titik fokus kamera di awal |
| `lerp` | `0.1` | Kelembaman kamera |
| `repelMin` / `repelMax` | `50` / `150` | Kekuatan dorong kursor |
| `alpha` | `0.91` | Opasitas lingkaran |
| `colors` | 3 warna | Gradasi lingkaran, bawah → atas |

Teks yang diberi `data-split` dipecah per huruf otomatis. Nilainya adalah delay dasar dalam detik.

## Catatan
- `.c2` dan induknya **tidak boleh** membuat stacking context (`transform`, `opacity < 1`, `isolation`, `filter`). Kalau ada, `difference` dan `lighten` tidak bisa melihat latar fixed.
- Aslinya three.js (cylinder ter-instance + shader). Di sini Canvas 2D tanpa dependency. Hasilnya sama untuk lingkaran datar.
- Font asli Neue Montreal diganti Inter 500.
- Kedua foto (CTA dan slot video) di-generate dengan Higgsfield; sumbernya ada di `_raw/c2-lenses/`.
- `prefers-reduced-motion`: tanpa intro dan denyut, kamera langsung mengikuti scroll.
