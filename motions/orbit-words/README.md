# Orbit Words

Section scroll dari [Switchblade](https://switchblade-awwwards.vercel.app/): objek di tengah, lalu kata-kata muncul satu per satu di atas dan berputar searah jarum jam mengelilinginya (atas → kanan → bawah → kiri), berhenti sejenak di tiap titik.

## Cara kerja (sama dengan aslinya)
1. 4 jangkar diposisikan dengan CSS (atas, kanan, bawah, kiri). Pusat tiap jangkar diukur, lalu diubah ke koordinat polar (radius + sudut) terhadap centroid keempatnya.
2. Progres scroll section (`0 → orbitEnd`) dihaluskan: `V += (G − V) × 0.045` per frame, jadi kata terasa "berat" dan menyusul.
3. `n = 3.5 × V / 0.9`, lalu dibuat **tangga**: bagian bulat = jangkar, bagian pecahan lewat smoothstep di jendela 0.2–0.8. Inilah yang membuat kata diam sebentar di tiap titik.
4. Kata ke-i muncul saat `n` melewati gilirannya (`order`, default `[0,3,2,1]`), fade + blur 3px → 0 dalam 0.16 unit.
5. Posisi kata = titik orbit di `s − giliran`. Sudut selalu maju searah jarum jam dan radius di-lerp antar jangkar, jadi lintasannya melengkung, bukan garis lurus.
6. Di akhir section, ring memudar + blur.

## Pakai
```html
<link rel="stylesheet" href="motion.css">
<section class="ow">
  <div class="ow__stage">
    <div class="ow__eyebrow"><span>A Mark</span><span class="ow__pill">That Radiates</span></div>
    <div class="ow__object"><img src="assets/star.svg" alt=""></div>
    <div class="ow__ring"></div>
  </div>
</section>
<script src="motion.js"></script>
<script>OrbitWords.mount(document.querySelector(".ow"), { words: ["Clarity", "Conviction", "Collaboration", "Care"] });</script>
```

## Opsi
| Opsi | Default | Arti |
| --- | --- | --- |
| `words` | 4 kata | Urutan jangkar: atas, kanan, bawah, kiri (tepat 4) |
| `order` | `[0,3,2,1]` | Giliran muncul tiap kata |
| `orbitEnd` | `0.72` | Bagian progres section untuk orbit |
| `fadeStart` | `0.86` | Mulai pudar |
| `smooth` | `0.045` | Faktor lerp per frame |
| `spin` | `24` | Goyang rotateY objek tengah (derajat), `0` = diam |

## Tema & posisi
`--ow-bg`, `--ow-ink`, `--ow-muted`, `--ow-height` (panjang scroll), `--ow-object`, `--ow-font`, `--ow-word-size`, plus posisi jangkar `--ow-top-y`, `--ow-bottom-y`, `--ow-side-y`, `--ow-right-x`, `--ow-left-x` (nilai per breakpoint disalin dari aslinya).

## Catatan
- Bintang asli adalah objek 3D WebGL + video scrub. Di sini diganti render bintang chrome transparan (`assets/star.webp`, Higgsfield). Isi `.ow__object` bisa diganti apa saja: gambar, video, canvas.
- `prefers-reduced-motion`: tanpa smoothing, kata langsung mengikuti scroll.
