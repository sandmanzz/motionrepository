# Ink Comic

Versi 2D ringan dari adegan komik [Santioni Spirits](https://santionispirits.com/). Aslinya model 3D ber-rig dengan shader arsir; di sini **satu foto biasa** diukir oleh satu fragment shader WebGL layar penuh. Tanpa library.

## Lapisan (semua dalam satu shader, dari belakang)
1. **Kertas**: krem `#f2f1ee` dengan butiran yang berubah 24× per detik.
2. **Panel utama**: segi empat miring bertepi pena 2px. Sudut-sudutnya digoyang noise tiap 1/8 detik. Saat intro, panel menyusut dari layar penuh ke bingkai (expo-out).
3. **Langit**: abu tua `#2c2c2e` dengan noda awan putih (`fbm × fbm`, dipangkatkan, ditambah halo di belakang kepala). Hasilnya di-threshold tajam dengan `aastep`, sehingga tepinya seperti tinta tumpah. Awan muncul seiring progres, dan kursor "mendorong" noda di dekatnya.
4. **Tanah**: 6 garis angin bergelombang yang dipotong-potong noise jadi coretan putus.
5. **Tokoh (foto → ukiran)**:
   - **Tone**: luminance di-threshold menjadi 2 warna datar (cokelat krem untuk bayangan, kertas untuk terang). Area sangat gelap menjadi tinta pekat.
   - **Arsir**: garis miring (−30°) dengan ketebalan sesuai kegelapan. Arsir silang (+42°) hanya muncul di area gelap.
   - **Kontur**: gradien luminance dan alpha (Sobel kecil) menjadi garis pena.
   - **Boil**: arah dan offset garis digeser acak tiap 1/8 detik.
6. **Panel close-up**: crop wajah (kiri) dan tangan (kanan) dari foto yang sama, berlatar gelap dan bertepi 3px. Panel tumbuh dari titik tengahnya, lalu bergeser parallax dengan scroll dan kursor.
7. **Kotak narasi** (DOM): muncul lalu diketik 18 ms per huruf.

## Kenapa terasa "mulus tapi digambar tangan"
- Render, scroll, dan kursor berjalan penuh 60 fps (scroll di-lerp 0.1, tidak bergantung frame rate).
- Hanya **tekstur tinta** yang sengaja patah-patah: `floor(time·8)/8` untuk garis, tepi, dan arsir, serta `floor(time·24)/24` untuk awan. Ini trik yang sama dengan situs aslinya.

## Pakai
```js
InkComic.mount(document.querySelector(".ic"), {
  image: "tokoh.webp",                          // PNG/WebP dengan latar transparan
  levels: [0.03, 0.48],                         // luminance hitam/putih foto → 0/1 (foto gelap: turunkan angka kedua)
  caption: ["BARIS PERTAMA.", "BARIS KEDUA."],
  faceCrop: [x, y, w, h],                       // 0..1; w/h (dalam px) ≈ 1.82 = rasio panel
  handCrop: [x, y, w, h],
  colors: { ink: "#141414", tan: "#a8915f", paper: "#f2f1ee", sky: "#2c2c2e" }
});
```
`maxDpr` (default 1.5) membatasi resolusi supaya tetap ringan di layar retina.

## Catatan
- Sumber terbaik: ilustrasi atau foto berkontras jelas dengan latar **transparan**. Wajah dan tangan perlu cukup besar agar panel close-up bagus.
- Tokoh demo (`assets/wanderer.webp`) adalah pengembara berjubah yang di-generate dengan Higgsfield (GPT Image 2.6, medium 2K, `background: transparent`, 1 kredit). Sumbernya ada di `_raw/ink-comic/`. Prompt intinya: "full-body three-quarter side view, hooded ochre wool cloak, hard side lighting, strong contrast, transparent background".
- Foto yang gelap perlu `levels` supaya tone terbagi rata menjadi tinta, cokelat krem, dan putih. Tanpa itu, hampir semua bagian menjadi tinta pekat.
- Tanpa WebGL: class `ic--nogl`, hanya latar kertas.
- `prefers-reduced-motion`: waktu dibekukan (tanpa boil), langsung ke state akhir intro, teks tidak diketik.
