# Product Swap Conveyor

Sumber inspirasi: https://switchblade-awwwards.vercel.app/ (section "One Standard. Every Part Of Life.")
Kode ditulis ulang dari nol (vanilla JS), aset di-generate sendiri — tidak ada file dari situs aslinya.

## Cara kerja
- Daftar produk diulang sampai memenuhi lebar stage, lalu tiap kartu diposisikan per frame:
  `x` bergerak linear ke kiri dan di-wrap, `y = top + depth * (0.5 - 0.5 * cos(x / wavelength * 2π))`.
- `z-index` kartu mengikuti `x`, jadi kartu di kanan menumpuk di atas kartu di kirinya.
- Model ada di tengah dengan `z-index` di atas semua kartu, sehingga kartu "lewat di belakang" model.
- **Auto:** kartu yang paling dekat titik fokus (sedikit di kanan model) jadi aktif.
- **Lock:** klik kartu atau chip mengunci produk itu. Klik lagi, chip `Auto`, atau `Esc` untuk melepas.
- Swap model = crossfade 250 ms antar foto utuh yang ditumpuk (semua dimuat di awal).
- Loop berhenti saat stage di luar viewport / tab tersembunyi. `prefers-reduced-motion` mematikan aliran, klik tetap jalan.

## Cara pakai di project
1. Salin folder `product-swap/` (tanpa `README.md` kalau tidak perlu).
2. Tempel blok markup di antara komentar `MOTION` dari `index.html`.
3. Muat `motion.css` dan `motion.js`, lalu:

```js
const swap = ProductSwap.mount(document.querySelector("[data-product-swap]"), {
  base: "assets/model/base.webp",
  products: [
    { key: "cap", label: "Cap", image: "assets/products/cap.webp", worn: "assets/model/cap.webp" },
    // ...
  ],
  onChange: (key, mode) => {}
});
swap.select("cap");  // kunci produk
swap.auto();         // kembali ke auto
swap.destroy();      // wajib saat unmount (React/Vue/SPA)
```

## Opsi
| Opsi | Default | Fungsi |
| --- | --- | --- |
| `speed` | `1/2.9` | Kecepatan alir, dalam lebar kartu per detik |
| `focusOffset` | `0.9` | Titik fokus = tengah stage + n × lebar kartu |
| `waveTop` | `0.03` | Posisi puncak gelombang (fraksi tinggi stage) |
| `waveDepth` | `0.55` | Kedalaman gelombang (fraksi tinggi stage) |
| `waveLength` | `1.2` | Panjang gelombang (fraksi lebar stage) |
| `fade` | `250` | Durasi crossfade (ms), samakan dengan `--ps-fade` |

Tema lewat custom property di `.ps`: `--ps-bg`, `--ps-ink`, `--ps-accent`, `--ps-card`, `--ps-gap`, `--ps-model-ratio`.

## Aset
- `assets/products/*.webp` — cutout produk transparan (kartu).
- `assets/model/base.webp` + satu file per produk — model yang sama, framing identik (688×1024), background transparan.
- File PNG asli dari Higgsfield ada di `/_raw/product-swap/`.

### Mengganti dengan produk/model sendiri (Higgsfield, GPT Image 2.6, `background: transparent`)
1. Generate model dasar 2:3 tanpa aksesori, subjek hanya mengisi ±½ lebar gambar.
2. Generate tiap produk 1:1 sebagai packshot transparan.
3. Untuk tiap produk: edit dengan referensi `[model dasar, produk]` dan prompt
   "the same woman now wears the exact … from the second image. Keep everything else exactly identical …".
4. Semua foto model harus berukuran sama; kalau rasionya berubah, set `--ps-model-ratio`.
