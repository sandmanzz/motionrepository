# Stock Motion — Katalog Pola

Ringkasan **cara kerja** semua motion di library ini, dipecah jadi blok bangunan yang bisa dipakai ulang dan dicampur untuk desain baru.
README di tiap folder berisi detail per motion; file ini berisi *teknik*-nya.

---

## 1. Peta library

| Motion | Rasa | Teknik inti | Trigger |
| --- | --- | --- | --- |
| [`outfit-loader`](motions/outfit-loader/) | Editorial, tegas | Timeline tween + stagger + `clip-path` reveal + `mix-blend: difference` | Load |
| [`product-swap`](motions/product-swap/) | Katalog, playful | Konveyor kartu di jalur kosinus + z-index dari posisi + crossfade | Auto + klik |
| [`particle-hero`](motions/particle-hero/) | Premium, magis | Gambar → ±90k partikel WebGL, kursor melukis tekstur jejak | Load + hover |
| [`orbit-words`](motions/orbit-words/) | Filosofis, tenang | Interpolasi polar antar jangkar + progres "bertangga" | Scroll |
| [`drift-footer`](motions/drift-footer/) | Arsitektural, ringan | Scrub geser X berbasis atribut data + garis tumbuh + reveal | Scroll |
| [`akaru-projects`](motions/akaru-projects/) | Portofolio agensi | Track horizontal di section sticky + akordeon + scale ke kolom | Scroll |
| [`c2-lenses`](motions/c2-lenses/) | Festival, berwarna | Latar fixed + kanvas lingkaran `difference` + teks bertopeng `lighten` + cincin 3D | Load + scroll + kursor |
| [`zoom-field`](motions/zoom-field/) | Arsitektur, eksploratif | Bidang CSS 3D: zoom (wheel/pinch) + geser (drag) + pantulan tepi + tile mengejar dengan lerp berlapis | Wheel + drag + hover |
| [`ink-comic`](motions/ink-comic/) | Komik, gambar tangan | Shader layar penuh: foto → ukiran (arsir + tone + kontur), awan tinta prosedural, panel bergetar, boil 8 fps | Load + scroll + kursor |
| [`card-helix`](motions/card-helix/) | Premium, kasino/kartu | Bidang melengkung di heliks: shear + blur mipmap + redup berdasarkan kedalaman, loop dengan kecepatan dilerp | Auto + drag |
| [`press-wheels`](motions/press-wheels/) | Portofolio, mekanis | Dua roda berpasangan (θ dan π−θ) bertakik, teks drum per huruf, kilau + cincin orbit saat hover, klik untuk membuka | Wheel + drag + hover + click |
| [`projects/arunika-park`](projects/arunika-park/) | Imersif, sinematik | Scroll men-scrub `video.currentTime` + babak + guncangan + WebAudio | Scroll + otomatis |

---

## 2. Arsitektur yang dipakai semua motion

**Satu folder = satu motion mandiri.** Isinya `index.html` (demo), `motion.css` (semua class ber-prefix unik), `motion.js` (satu global `Nama.mount(root, options) → { destroy, … }`), `assets/` dan `README.md`.

**Loop standar** (paling matang di [akaru-projects/motion.js](motions/akaru-projects/motion.js)):
```
measure()   ← dipanggil HANYA saat load / resize / font siap. Semua baca layout di sini.
frame(now)  ← tiap rAF: baca scrollY → hitung target → lerp → render(t)
render(t)   ← HANYA menulis style.transform / opacity. Tidak ada getBoundingClientRect.
```
- **Jangan baca layout di dalam frame setelah menulis.** Itu sumber patah-patah (layout thrash). Posisi hasil hitungan (offsetLeft cache + transform) lebih baik daripada mengukur ulang.
- **Lerp yang tidak bergantung frame rate:** `cur += (target - cur) * (1 - Math.pow(1 - k, dt / 16.7))`. Nilai `k = 0.1` meniru Lenis.
- **Lewati render saat diam:** `if (Math.abs(cur - last) < 1e-4) return;`.
- **`seek(t)` di API**: render langsung di titik tertentu tanpa smoothing. Berguna untuk debug dan kontrol dari luar.
- **Timeline = fungsi murni dari t.** `seg(t, mulai, durasi, ease)` → progres 0..1. Banyak tween = banyak `seg` yang dijumlahkan ke transform. Satu `t` menggerakkan semuanya, jadi scroll mundur otomatis benar.
- **`prefers-reduced-motion`**: tiap motion punya jalur tenang (tanpa smoothing, tanpa intro, atau langsung ke state akhir).

**Easing yang sering dipakai (padanan GSAP):**
| Nama | Rumus | Kesan |
| --- | --- | --- |
| power1.out | `1-(1-p)²` | Geser track yang natural |
| power2.out | `1-(1-p)³` | Garis tumbuh, reveal ringan |
| power3.out | `1-(1-p)⁴` | Muncul tegas (huruf, kartu) |
| power1/2.inOut | `p<.5 ? 2p² : 1-(-2p+2)²/2` | Scale & perpindahan fase |
| circ.inOut | lingkaran | Counter loader |
| expo.inOut | `2^(20p-10)/2 …` | Keluar dramatis (huruf/kartu menghilang) |
| expo.out (CSS) | `cubic-bezier(.19,1,.22,1)` | Huruf rotateX, hover tombol |

---

## 3. Blok bangunan

### A. Teks
| Teknik | Cara | Di mana |
| --- | --- | --- |
| **Huruf naik dari mask** | Wadah `overflow:hidden`, tiap huruf `translateY(110%)` → 0, stagger acak 0.2s | outfit-loader |
| **Huruf berputar naik** | Per huruf `translateY(10rem) rotateX(-90deg)` + opacity → 0, transisi 1.2s expo.out, delay +0.035s/huruf | c2-lenses (`split()`) |
| **Teks sebagai jendela** | Section terang + teks gelap + `mix-blend-mode: lighten` di atas latar fixed berwarna. Tanpa JS | c2-lenses `.c2__masked` |
| **Huruf membalik warna** | Wordmark `mix-blend-mode: difference` di atas foto → otomatis gelap di atas foto terang | outfit-loader |
| **Kata mengorbit** | Jangkar CSS → polar (r, θ) terhadap centroid → lerp sudut (selalu maju) + radius = lintasan melengkung | orbit-words `orbit()` |
| **Progres bertangga** | `n = 3.5·v/0.9`; bagian bulat = jangkar; pecahan lewat smoothstep di jendela 0.2–0.8 → diam sebentar di tiap titik | orbit-words |
| **Cincin kata 3D** | Item `transform-origin: 50% 50% -R`, `rotateX(-step·(i+1))`, list diputar `+(n+1)·step` sepanjang scroll; huruf masuk/keluar terjadwal | c2-lenses |
| **Counter** | Tween angka 0→100, `padStart(3,"0")`, lalu naik keluar | outfit-loader |
| **Daftar bergaris** | Nomor + teks naik dari 200% (stagger 0.15), garis `scaleX` dari kanan | akaru-projects `.ak__desc` |

### B. Gambar & kartu
| Teknik | Cara | Di mana |
| --- | --- | --- |
| **Tumpukan dilempar** | Kartu di satu titik, `scale 0→1` + `rotate random(±20°)`, stagger 0.2 | outfit-loader |
| **Konveyor gelombang** | `x` linear + wrap; `y = top + depth·(0.5-0.5·cos(2πx/λ))`; z-index dari x supaya lewat "di belakang" model | product-swap |
| **Crossfade state** | Semua foto ditumpuk & dimuat di awal, opacity 250ms. Framing identik wajib | product-swap |
| **Akordeon horizontal** | Panel berukuran sama, ditumpuk overlap (z naik). Panel ke-n mulai di −Xvw lalu menyusul; latar `scaleX .2→1` | akaru-projects |
| **Foto tumbuh di panel** | Wadah foto `scale .2→1` + turun (origin kiri), isi foto `scale 1.8→1` (counter-zoom) | akaru-projects |
| **Kolom dari panel** | Panel terakhir + daftar `scale(.5)` dari pojok kiri atas → kolom kiri; lalu semua naik `−(H·.5)+vh` | akaru-projects |
| **Parallax foto dalam kartu** | Foto lebih tinggi dari kartu (+2×offset), geser `−off → +off` linear | akaru-projects |
| **Ilustrasi mendarat** | `data-fd-drift="dari,ke"` + `data-fd-range`; % = lebar elemen sendiri | drift-footer |

### C. Latar & kanvas
| Teknik | Cara | Di mana |
| --- | --- | --- |
| **Latar fixed berlapis** | Panel gradasi `position:fixed`; konten transparan di atasnya. Panel bisa diparallax keluar | c2-lenses |
| **Kanvas `difference`** | Kanvas fixed `mix-blend-mode: difference`: satu set bentuk menghasilkan warna berbeda di tiap latar | c2-lenses |
| **Lingkaran additive** | Canvas 2D `globalCompositeOperation = "lighter"` + gradasi vertikal → tumpukan menyala | c2-lenses `draw()` |
| **Kamera ortografis** | `layar = (dunia − kamera)·zoom + tengah`; zoom 2→1 + geser kamera sepanjang hero = "zoom out ke logo" | c2-lenses |
| **Bentuk menghindar kursor** | Kursor → koordinat dunia; dorong jika jarak < 2·kekuatan; kembali lerp 0.05 | c2-lenses |
| **Denyut koin** | `scaleX` 1 → 0.8 → 1 per bentuk, stagger 0.08 (kesan berputar 3D) | c2-lenses |
| **Partikel dari gambar** | Downsample → luminance → rejection sampling `lum^γ`; warna aksen dari piksel merah murni | particle-hero |
| **Jejak kuas** | Grid 192×128 dilukis elips mengikuti kursor, meluruh `exp(-dt/decay)`; shader membaca grid → ganti warna, bukan posisi | particle-hero |
| **Redup di belakang judul** | Partikel di area judul dikali `titleDim` → teks terbaca tanpa scrim | particle-hero |

### D. Scroll & struktur
| Teknik | Cara | Di mana |
| --- | --- | --- |
| **Section sticky + timeline** | Wadah tinggi `units·unit + 100vh`, isi `position:sticky; height:100vh`; progres → t | akaru, orbit-words, c2 |
| **Tempo per unit** | 1 unit ≈ 0.79 layar terasa "cepat & responsif"; 1 unit = 1 layar terasa berat | akaru-projects |
| **Video di-scrub** | Babak (vh) → waktu video (dihaluskan) → `currentTime`; encode `-g 3 -bf 0` agar seek cepat | arunika-park |
| **Babak otomatis** | Kunci scroll, putar video native, lalu sinkronkan scroll ke video; kembalikan kendali | arunika-park |
| **Sensasi kecepatan** | Getar + zoom + vignette "tunnel" ∝ kecepatan scroll; sentakan + suara di momen tertentu | arunika-park |
| **Suara sintetis** | WebAudio tanpa file: klik, detak, whoosh, guntur | arunika-park `sound.js` |
| **Bidang zoom & geser** | CSS 3D: `perspective=(H/2)/tan(fov/2)`, 1 unit = perspective/jarak; wheel → z, drag → x/y (1/64 unit/px) | zoom-field |
| **Pantulan tepi** | Batas = bidang − area terlihat di kedalaman z; lewat b/2 → lerp .06 balik setelah dilepas | zoom-field |
| **Lerp berlapis** | Tiap item lerp .05 ke target, sebagian membaca nilai 1 frame lebih lama → gerak cair, tidak kaku | zoom-field |
| **Spiral dari tengah** | Isi grid cincin demi cincin dari pusat; kolom masonry dipusatkan vertikal | zoom-field |
| **Heliks kartu** | sudut −n·2π/k, y = n·jarak; kedalaman a=(1−cos)/2 → miring, blur, redup; ujung memudar | card-helix |
| **Blur murah via mipmap** | `texture(tex, uv, bias)` dengan bias log2(1+k) — tanpa pass blur; beri margin transparan di tekstur | card-helix |
| **Bidang melengkung** | Plane 64 segmen: x→sin(x/R)·R, z→cos(x/R)·R−R; double-sided dengan tekstur punggung | card-helix |
| **Roda berpasangan (gear)** | Kiri θ, kanan π−θ → y sama, x dicerminkan; nip di tengah untuk judul | press-wheels |
| **Takik & labuh** | Notch mouse = 1 item; trackpad kontinu; setelah tenang 260 ms → lerp ke round(V/Z)·Z; render dilerp lagi | press-wheels |
| **Teks drum** | Baris baru per huruf masuk dari bawah (rotateX), baris lama keluar ke atas; arah ikut arah putar | press-wheels |
| **Cincin cahaya orbit** | conic-gradient berputar (`--head`) + kilau di sudut kursor (`--cur`), di-mask jadi garis tepi | press-wheels |

### E. Transisi & reveal
| Teknik | Cara | Di mana |
| --- | --- | --- |
| **Overlay tersingkap** | `clip-path: inset(0 0 100% 0)` 1.4s power2.inOut | outfit-loader |
| **Kotak naik** | Pseudo-element `translateY(100%)→0` dalam wadah `overflow:hidden` | c2-lenses `.c2__black` |
| **Panel masuk dari tepi** | Inner `translateY(±100%)→0`, 1.6s `cubic-bezier(.22,1,.36,1)` | c2-lenses latar |
| **Garis tumbuh** | `width 0→100%` / `scaleX`, sekali saat masuk layar | drift-footer, akaru |
| **Tombol isi** | `::before scaleY(0→1)`, origin berganti atas/bawah saat masuk/keluar | c2-lenses `.c2__ctaBtn` |

---

## 4. Jebakan yang sudah pernah kena

1. **Stacking context membunuh blend.** `mix-blend-mode` hanya melihat lapisan di stacking context yang sama. Induknya tidak boleh punya `transform`, `opacity<1`, `filter` atau `isolation`.
2. **`scrollWidth` menggelembung** karena anak yang di-transform. Pakai `offsetWidth` atau lebar eksplisit.
3. **`rem` situs sumber ≠ 16px.** Banyak situs memakai `html { font-size: 10px }` atau berbasis vw. Cek `getComputedStyle(html).fontSize` sebelum menyalin angka.
4. **Easing GSAP bawaan = `power1.out`**, dan progres anak timeline bisa punya ease berbeda dari track. Ukur posisi di 2–3 titik, jangan menebak.
5. **Iframe setinggi dokumen merusak `vh`/sticky.** Motion scroll di viewer perlu `frame: "viewport"` di registry.
6. **Browser pane di sesi ini dibatasi ±7 fps.** Screenshot tertinggal satu langkah. Verifikasi dengan angka (`getBoundingClientRect`, `seek(t)`), bukan screenshot.
7. **Elemen `<a>` inline mengabaikan `height`.** Kartu perlu `display:block`.
8. **Transisi CSS + transform dari JS di elemen yang sama** = gerak tertinggal. Pisahkan: CSS di wrapper, JS di dalamnya (atau `transition:none`).

---

## 5. Metode mengambil motion dari situs

1. `curl` halaman, unduh semua chunk JS/CSS ke scratchpad, lalu `grep` nama class yang terlihat di DOM.
2. Baca timeline GSAP atau komponen. Catat durasi, posisi (`"<"`, `">-1.5"`), easing, dan rentang ScrollTrigger (`start/end`).
3. Ukur DOM nyata di 1440×820: posisi, ukuran, `font-size` root, transform di beberapa titik scroll.
4. Tulis ulang tanpa dependency. Bandingkan angka posisi dengan aslinya di titik yang sama (target selisih < 30px).
5. Ganti merek, logo, foto dan teks dengan milik sendiri. Aset dibuat dengan Higgsfield, sumber PNG di `_raw/<id>/`.

---

## 6. Resep aset (Higgsfield)

| Kebutuhan | Model & setelan | Biaya |
| --- | --- | --- |
| Foto proyek / editorial | GPT Image 2.6, medium, 2K | 1 kredit |
| Objek 3D transparan (chrome, produk) | GPT Image 2.6, high, 2K, `background: transparent` | 2.75 kredit |
| Model + produk yang sama framing | Edit dengan referensi `[model dasar, produk]`, "keep everything else identical" | per gambar |
| Sumber partikel | Relief emas di hitam pekat, aksen merah murni `#ff0000` | 1–2.75 kredit |
| Video sinematik bersambung | Seedance; start klip berikut = frame terakhir klip sebelumnya | mahal, rencanakan dulu |

Konversi: `cwebp -q 80 -resize 1600 0` (foto), `-alpha_q 100` untuk transparan. Batch maksimal ±12 permintaan; error 429 = tidak ditagih, kirim ulang.

---

## 7. Resep campuran (titik awal desain baru)

- **Landing produk premium:** `particle-hero` (logo/produk jadi partikel) → `orbit-words` (nilai merek mengelilingi produk chrome) → `drift-footer`.
- **Situs event / festival:** `outfit-loader` (counter + foto acara) → `c2-lenses` (latar warna + teks bertopeng) → kartu pembicara gaya `akaru` kolom.
- **Studio arsitektur / galeri eksploratif:** `zoom-field` sebagai beranda (zoom & geser), klik tile → transisi `clip-path` ke halaman proyek bergaya `akaru` kolom.
- **Portofolio agensi:** hero setengah layar + akordeon `akaru-projects`, judul daftar dengan huruf rotateX `c2`, footer `drift-footer`.
- **E-commerce fashion:** `outfit-loader` sebagai intro → `product-swap` sebagai hero interaktif → teks bertopeng `lighten` di atas foto lookbook fixed.
- **Storytelling / wisata:** video scrub `arunika` per babak + papan informasi yang muncul berdasarkan waktu video + overlay `clip-path` antar babak.

Aturan memilih: **satu ide besar per layar**, gerak pendukung harus lebih tenang dari gerak utama, dan setiap motion harus tetap terbaca saat `prefers-reduced-motion`.

---

## 8. Dibedah (versi ringan sudah dibuat: `ink-comic`)

### Santioni Spirits — komik ukiran hidup ([santionispirits.com](https://santionispirits.com/))
> **Studi lengkap (cara kerja, desain, cara pembuatan, dan playbook untuk website apa pun): [studies/santioni-spirits.md](studies/santioni-spirits.md)**
**Bukan video, bukan SVG.** Satu `<canvas>` WebGL layar penuh (engine Hydra dari Active Theory). Semua yang terlihat adalah adegan 3D real-time yang diberi shader supaya tampak seperti ilustrasi tinta/ukiran.
- **Tokoh berjubah** = model 3D ber-rig (skinning, Draco), bukan gambar. Kesan ukiran berasal dari shader:
  - Tekstur garis `lines.jpg` diproyeksikan miring ke permukaan, lalu di-threshold (`aastep`) berdasarkan cahaya `dot(normal, lightDir)`. Bagian gelap mendapat garis rapat, bagian terang garis putus jadi titik (noise × cahaya²), dan batas terang-gelap menjadi tepi tinta.
  - Hanya 2–3 warna datar: hitam, krem kecokelatan, putih.
- **"Boiling" khas animasi tangan**: waktu dibulatkan `floor(time·8)/8` atau `·24`, jadi garis dan noise bergerak patah-patah seperti 8–24 fps gambar tangan, walau render tetap 60 fps.
- **Panel komik kecil** (wajah dari samping, tangan) = "floating frame". Model yang sama dirender lagi dengan kamera lain, lalu dipotong per piksel ke segi empat 4 titik (`isLeft` per sisi). Tepinya diberi noise supaya bergetar seperti garis pena dan membesar dari titik tengah saat transisi.
- **Langit dan awan** = shader prosedural. Dua tekstur noise dikalikan lalu di-threshold → noda tinta putih bertepi tajam, ditambah gradasi halo di tengah. Awan "menyapu" masuk sesuai scroll, dan noda bisa diaduk kursor (simulasi fluida `mousefluid`).
- **Garis angin & tanah** = kurva 3D dari file JSON (`wind-curves.json`). Garis dibangun sebagai pita di vertex shader dan dipotong-potong noise menjadi coretan putus-putus.
- **Bingkai panel besar** = mesh border yang menyusut dari layar penuh ke posisinya mengikuti scroll (expo easing).
- **Kotak teks** = teks MSDF di WebGL, disinkronkan dengan narasi suara (`vo/*.mp3` + `all_timestamps.json`) dan suara ketik.
- **Biaya**: setara produksi game kecil (model + rig + animasi + puluhan shader khusus).

**Versi ringan yang realistis untuk library ini** (tanpa 3D):
1. Ilustrasi 2D berlapis (latar, tokoh, panel) dari Higgsfield dengan gaya "woodcut / engraving, flat 3 colors" lalu di-parallax.
2. "Boiling" dengan SVG `feTurbulence` + `feDisplacementMap`, `seed` diganti tiap 1/8 detik.
3. Awan/noda tinta = noise di Canvas/WebGL kecil + threshold (`step`).
4. Panel bergetar = `clip-path: polygon()` dengan titik sudut digoyang acak per langkah waktu.
5. Teks narasi diketik per huruf.
