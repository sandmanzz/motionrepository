# Press Wheels

Beranda [Carter Ogunsola](https://carterogunsola.com/) sebagai **mesin cetak**. Roda kiri membawa kartu proyek ("proof"), roda kanan membawa pelat logo ("die"). Keduanya bersentuhan di tengah (nip, tempat judul) dan berputar bersamaan seperti roda gigi.
Aslinya three.js dengan shader sangat detail. Di sini CSS 3D tanpa library, dengan angka tata letak dan input dari kodenya.

## Cara kerja
1. **Ruang**: kamera fov 30° di z 3.2, jadi tinggi terlihat 1.715 unit dan `1 unit = tinggi layar / 1.715` px. CSS `perspective = 3.2 × unit`.
2. **Roda**: radius 1.14. Pusat roda kiri di `−(lebarTerlihat/2 − 0.42·R + R)`, roda kanan dicerminkan. Kedua roda dimiringkan (X −5°, Y ±14°).
3. **Item di roda**:
   - **Kiri**: kartu di `(cos θ, sin θ)·R` dengan rotasi θ (ikut berputar).
   - **Kanan**: pelat di sudut `π − θ`. Karena `sin(π − θ) = sin θ`, posisi vertikal kiri dan kanan **selalu sama**. Itulah rasa roda gigi.
4. **Slot**: 9 per putaran (40°). Posisi relatif `n = wrap(i + B/Z)`. Item di luar ±4 slot memudar. Item aktif (n≈0) membesar 1.6×, sedikit maju ke tengah (drift 0.15), dan tidak diredupkan (yang lain −22%).
5. **Input**:
   - Roda mouse bertakik (|deltaY| ≥ 60, jeda > 40 ms) → tepat satu item.
   - Trackpad → kontinu `0.0011 rad/px` (dibatasi setengah takik di awal gesture).
   - Drag (vertikal + horizontal) → `0.0034 rad/px`, plus flick `Wt·90·0.0034·0.02` saat dilepas.
   - Panah ↑↓←→ untuk satu item, Enter untuk membuka, Esc untuk menutup.
6. **Labuh**: setelah 260 ms tanpa input, sudut target melerp ke detent terdekat (0.24/frame). Sudut yang dirender melerp lagi ke target, jadi berhentinya lembut dan selalu tepat.
7. **Kecepatan terasa**: kartu non-aktif di-skew sesuai kecepatan putar dan diredupkan saat melaju (pengganti shader "kain" asli yang melengkung dan berkibar).
8. **Hover kartu aktif**:
   - Kilau radial mengikuti kursor (`mix-blend: screen`).
   - Foto bergeser parallax ±5px.
   - **Cincin cahaya**: tepi tipis + satu kilau yang mengorbit (conic-gradient berputar) + kilau lebar di sudut terdekat kursor. Ini anatomi "PS5" dari situs asli.
9. **Klik**:
   - Kartu aktif → **terbuka**: kartu ke tengah, tegak, ±62% lebar layar; video diputar jika `item.video` ada; item lain memudar.
   - Item lain (kartu atau pelat) → roda berputar ke item itu lewat jalur terpendek.
10. **Teks tengah "drum"**: nomor, judul, dan chip berganti per huruf. Baris baru berputar masuk (rotateX + translateY) dan baris lama keluar ke arah berlawanan, mengikuti arah putaran. Ada juga live region untuk pembaca layar.

## Pakai
```html
<link rel="stylesheet" href="motion.css">
<div id="wheels" style="position:fixed; inset:0"></div>
<script src="motion.js"></script>
<script>
  const w = PressWheels.mount(document.getElementById("wheels"), {
    items: [{ title: "Clay", collab: "w/clay", year: 2026, mono: "CL", img: "clay.webp", video: "clay.mp4", href: "/clay" } /* … */],
    onOpen: (item, i) => {}
  });
  w.go(3); w.open(); w.close(); w.destroy();
</script>
```

## Opsi utama
| Opsi | Default | Arti |
| --- | --- | --- |
| `slots` | `9` | Item per putaran |
| `radius` / `overlap` | `1.14` / `0.42` | Ukuran roda dan seberapa jauh roda masuk layar |
| `cardW` / `focusS` | `0.7` / `1.6` | Lebar kartu (unit) dan skala kartu aktif |
| `plateW` / `plateScale` | `0.24` / `1.45` | Ukuran pelat dan skala pelat aktif |
| `tiltX` / `tiltY` | `-5` / `14` | Kemiringan roda (derajat) |
| `wheel` / `drag` | `0.0011` / `0.0034` | rad per px |
| `damp` / `calm` | `0.08` / `260` | Kehalusan putar, jeda sebelum berlabuh (ms) |
| `drift` / `dim` / `shear` | `0.15` / `0.22` / `9` | Geser kartu aktif, redup item lain, skew per kecepatan |

Tema: `--pw-paper`, `--pw-ink`, `--pw-muted`, `--pw-font`, `--pw-mono`.

## Catatan
- Demo memakai 14 foto library. HUD, nav, dan kursor "tamu" di `index.html` hanya hiasan (meniru presence multiplayer situs asli) dan bukan bagian motion.
- Wheel di dalam kontainer memanggil `preventDefault`, jadi motion ini dimaksudkan sebagai layar penuh seperti aslinya.
- `prefers-reduced-motion`: tanpa smoothing, teks langsung berganti; input tetap berfungsi.
