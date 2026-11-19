# Particle Relief Hero

Sumber inspirasi: https://tigris.lorolabs.ai/ (hero section + hover)
Ditulis ulang dari nol dengan WebGL1 murni (aslinya three.js). Subjek, wordmark, palet, dan gambar sumber dibuat sendiri.

## Cara kerja
1. **Sampling.** `assets/relief.webp` diperkecil ke lebar 460px lalu dibaca pikselnya. Piksel dengan luminance > `threshold` masuk pool; partikel dipilih dengan rejection sampling (`lum^gamma`) sehingga area terang lebih padat. Piksel merah murni ditandai sebagai `kind = 1` (warna aksen).
2. **Lahir.** Tiap partikel mulai dari awan acak dan berputar masuk ke posisinya, masing-masing dengan jeda acak (`uBirth` 0→1 selama `birth` detik). Di ±72% class `is-formed` dipasang dan teks masuk bertahap.
3. **Hidup.** Napas (skala halus dari tengah), hanyut (dua lapis gelombang), kelip per partikel, dan kilau acak.
4. **Hover.** Posisi kursor dihaluskan lalu melukis elips ke grid 192×128 yang meluruh (`trailDecay`). Elips memanjang searah gerak saat kursor cepat. Vertex shader membaca grid itu di posisi asli partikel: partikel dasar dicampur ke warna highlight dan peluang kilaunya naik; partikel aksen tetap. **Posisi tidak digeser.** Tepi sapuan dibuat organik dengan noise.
5. **Zona judul.** Partikel di belakang `[data-ph-title]` diredupkan (`titleDim`) supaya wordmark terbaca tanpa scrim.
6. Nav: garis emas menyapu masuk dari kiri saat hover dan keluar ke kanan.

Loop berhenti saat hero di luar viewport / tab tersembunyi. `prefers-reduced-motion`: bentuk langsung jadi, tanpa hanyut, hover tetap bekerja.

## Cara pakai di project
1. Salin folder `particle-hero/`.
2. Tempel blok markup di antara komentar `MOTION` dari `index.html`.
3. Muat `motion.css` + `motion.js`, lalu:

```js
const hero = ParticleHero.mount(document.querySelector("[data-particle-hero]"), {
  image: "assets/relief.webp",
  colors: { base: "#d2a23c", highlight: "#f6d27e", accent: "#d3222f" }
});
hero.replay();   // ulangi animasi pembentukan
hero.destroy();  // wajib saat unmount
```

Harus lewat http(s). Gambar dari domain lain butuh header CORS.

## Opsi
| Opsi | Default | Fungsi |
| --- | --- | --- |
| `count` / `countMobile` | `90000` / `42000` | Jumlah partikel (mobile = lebar < 768px) |
| `threshold` | `0.085` | Luminance minimum piksel |
| `gamma` | `0.55` | Sebaran kepadatan; lebih kecil = lebih rata |
| `fitWidth` / `fitHeight` | `0.86` / `0.74` | Ukuran maksimum subjek terhadap hero |
| `offsetY` | `0.02` | Geser vertikal |
| `size` | `2.6` | Ukuran titik |
| `colors` | emas / emas terang / merah | `base`, `highlight` (warna saat di-hover), `accent` |
| `birth` | `2.8` | Durasi pembentukan (detik) |
| `brush` | `0.14` | Radius kuas hover (fraksi tinggi gambar) |
| `trailDecay` | `0.7` | Lama jejak bertahan (detik) |
| `titleDim` | `0.5` | Peredupan di belakang judul |

Tema CSS di `.ph`: `--ph-bg`, `--ph-bg-glow`, `--ph-ink`, `--ph-gold`, `--ph-serif`, `--ph-sans`.
Font demo (Bodoni Moda, Space Grotesk) dimuat dari Google Fonts di `index.html`; opsional.

## Aset
- `assets/relief.webp` (920×515) — dipakai untuk sampling dan sebagai fallback tanpa WebGL.
- PNG asli: `/_raw/particle-hero/relief.png`.

### Membuat gambar sumber sendiri (Higgsfield, GPT Image 2.6, 16:9, `background: opaque`)
Prompt inti: subjek profil samping, "rendered as a luminous bas-relief sculpture in bright polished gold with strong tonal modelling", bagian aksen "painted in pure saturated red (#ff0000), flat", "background perfectly flat pure black, no glow, no shadow", dengan margin hitam di semua sisi.
