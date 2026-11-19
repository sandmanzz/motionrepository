# Studi: Santioni Spirits

> Situs: https://santionispirits.com/ · Dibuat oleh **Active Theory** (visual & engineering) dan **Plan8** (suara).
> Dipelajari 2026-11-19 dari kode produksi (`app.js` 2 MB, `compiled.vs` 150+ shader, `uil.json`), DOM, dan network.
> Versi ringan yang sudah dibuat di library ini: [`motions/ink-comic`](../motions/ink-comic/).

---

## 1. Ringkasan satu paragraf

Santioni adalah **komik interaktif satu halaman** untuk merek minuman. Halaman di-scroll vertikal. Di balik layar, satu kamera WebGL turun melewati **18 adegan 3D yang ditumpuk vertikal**. Setiap adegan dirender real-time dengan shader yang meniru **ukiran tinta** dalam tiga warna. Tekstur tinta sengaja "bergetar" di 8 fps, sementara scroll dan kursor tetap mulus di 60 fps. Narasi suara diputar hanya saat pengguna **berhenti scroll**, dan kata-katanya menyala merah satu per satu seperti karaoke. Di akhir cerita, komik berubah menjadi halaman produk biasa (DOM) dengan bahasa visual yang sama.

---

## 2. How it's designed (desain)

### 2.1 Konsep & narasi
- **Tagline**: "Indulge now, atone later." Tokoh pengembara berjubah (peziarah/biarawan) berjalan di "negeri kosong", menemukan katedral, memilih minuman, menuang, lalu melayang, dan cerita berakhir di koleksi "Notturno".
- **Struktur bab** mengikuti urutan adegan:

| # | Adegan | Tinggi (layar) | Peran naratif | Interaksi |
| --- | --- | --- | --- | --- |
| 0 | Wander | 2.5 | Pembuka: tokoh berjalan dalam kabut | Scroll, kursor mengaduk awan |
| 1 | Profile | 1.25 | Close-up wajah | Scroll |
| 2 | Approach | 2 (mobile 1.25) | Mendekati portal | Scroll (suara portal) |
| 3 | Near | 3 | Makin dekat | Scroll |
| 4 | Hand | 1.5 | Tangan dan air | Tombol cakram "hold" |
| 5 | Target | auto | Titik tuju | Scroll |
| 6 | Transition | 2 (margin −0.1) | Tirai tinta / retak | Scroll |
| 7 | Cathedral | 4 (margin −0.5) | Katedral, babak baru | Scroll |
| 8 | DrinkSelection | 2.5 | Memilih botol | Carousel, hover botol |
| 9 | DrinkPour | 4 | Menuang minuman | Tahan untuk menuang |
| 10 | AntiGravity | 2 | Daun/benda melayang | Tahan, tarik, lepas |
| 11 | PillarCrumble | 1.25 | Pilar runtuh | Scroll |
| 12 | Colosseum | 3.25 | Batu melayang, judul | Scroll |
| 13 | Taste | auto | Transisi ke konten DOM | — |
| 14–17 | Collection, Products, Retail, Footer | auto | Konten merek biasa | Link, carousel |

- **Ritme**: adegan panjang (3–4 layar) dipakai untuk momen "wah", adegan pendek (1.25) untuk close-up. Margin negatif membuat adegan saling tumpang-tindih, sehingga transisinya terasa menyatu.

### 2.2 Bahasa visual
- **Palet** (diambil dari kode):

| Peran | Warna |
| --- | --- |
| Tinta | `#111111` / `#121212` / `#181818` |
| Langit gelap | `#2c2c2e` (`44,44,46`) |
| Jubah / cokelat krem | `#ae9c74` |
| Kertas | putih + blue-noise |
| Aksen / karaoke | `#c82924` |
| Layar loader | `#1d1d1d` |

- **Tipografi**:
  - **Charles Rosie**: tulisan tangan, untuk logo dan header.
  - **PP Nikkei Maru Ultrabold/Regular**: membulat, KAPITAL, untuk kotak teks komik, tombol, dan kursor.
  - **GT Era Text Light**: teks panjang.
  - Teks di dalam WebGL memakai **MSDF** (atlas `*.png` + `*.json`), jadi tetap tajam di zoom berapa pun.
- **Bahasa komik**:
  - Panel bertepi pena 3px dengan tepi bergetar.
  - Panel kecil miring yang muncul dari titik tengahnya.
  - Kotak narasi putih bertepi hitam.
  - Garis angin dan garis tanah berupa coretan.
- **Prinsip "digambar tangan"**:
  1. Tekstur tinta selalu di **frame rate rendah** (`floor(time·8)/8`), sedangkan gerak kamera dan scroll di 60 fps.
  2. Semua tepi tajam memakai threshold ber-antialias (`aastep` + `fwidth`), bukan gradasi.
  3. Hanya 2–3 warna per objek. Bentuk lahir dari *threshold* noise, bukan dari gambar.
  4. Garis tidak pernah lurus sempurna: bingkai header adalah SVG path dengan titik-titik yang digoyang (`M0 0 L0 0.75 L10 −0.70 …`) plus `vector-effect: non-scaling-stroke`.

### 2.3 Desain interaksi
- **Kursor khusus** (`GLUICursor`): cakram putih berlabel (mis. "GRAB"/"HOLD") digambar di WebGL. Kursor mengikuti mouse dengan lerp 0.1, dan bentuknya diregangkan sesuai kecepatan mouse (`uVelocity`).
- **Tombol cakram** (`GLUIDiscButton`): bulatan 120px dengan hitbox 1.3×. Momen interaktif umumnya "tahan" (hold to pour, hold to levitate), tidak sekadar klik.
- **Kursor sebagai cairan**: di desktop ada simulasi fluida (`MouseFluid`: advection, divergence, pressure, vorticity, splat). Masker fluidanya dipakai shader langit, border, dan komposit, sehingga kursor seolah menggosok tinta.
- **Tilt DOM**: elemen `[data-tilt]` ikut miring sesuai posisi kamera (±20° / ±5°), sehingga DOM terasa satu ruang dengan 3D.
- **Gerbang usia**: produk alkohol, jadi konten di-`inert` sampai pengguna menyetujui. Gerbang ini juga dipakai untuk membuka kunci Web Audio, karena audio butuh gestur pengguna.

### 2.4 Desain suara (Plan8)
- **Drone berlapis**: 5 lapisan drone dicrossfade berdasarkan `scrollProgress` adegan kunci (Approach, Cathedral, AntiGravity, Taste). Musik "berubah babak" mengikuti posisi cerita.
- **Ambient**: volume angin mengikuti posisi scroll (keras di awal, pudar sekitar unit 22–30), dan jazz naik di Taste.
- **One-shot**:
  - Langkah kaki (7 variasi di dalam dan 6 di luar ruangan).
  - Ketikan kotak teks (6 variasi).
  - Carousel, hover botol, tuang (start/hold/stop), portal, anti-gravitasi, retak transisi, dan klik UI.
- **Transisi adegan**: suara masuk/keluar diputar saat adegan baru menjadi terlihat, sesuai arah scroll.
- **Voice-over**: 16 klip MP3, masing-masing dengan **timestamp per kata** (format ElevenLabs: `words[{text,start,end,type}]`).

### 2.5 Aksesibilitas & ketahanan
- Teks yang digambar di WebGL juga ada di DOM sebagai `.sr-only` (`clip-path: inset(50%)`), jadi pembaca layar tetap bisa membacanya.
- Ada `RotatePrompt` (minta pengguna memutar layar), cookie banner, dan audio toggle.
- Mobile mendapat versi lebih ringan: lerp scroll 0.9 (hampir native), tanpa fluida, tanpa gerak "gaze", dan tinggi adegan diinterpolasi dari 1600px ke 393px.

---

## 3. How it works (cara kerja runtime)

### 3.1 Arsitektur halaman
```
<canvas>  ← satu WebGL, layar penuh, DPR dibatasi
Story (Frag3D)
 ├─ kamera perspektif, ikut scroll
 ├─ 18 Scene (BaseView) ── masing-masing punya pasangan DOM: <Nama>UI
 │    group 3D diposisikan di "world units" setara posisi DOM-nya
 ├─ NukePass "CompositeShader"  ← post-process layar penuh
 ├─ Scrollbar GL, AudioToggleGl, HeaderMenu (DOM), CookieBanner, RotatePrompt
 └─ storyRoot (DOM) ← kolom div berurutan; tingginya = total panjang scroll
```
- **Kunci:** DOM menentukan tinggi dan urutan, WebGL menentukan tampilan. Setiap `*UI` adalah div dengan `--height: tinggi × Stage.height`, dan `order` flex sesuai urutan adegan. Konten akhir (Taste dan seterusnya) memang konten DOM sungguhan dengan tinggi `auto`. 3D membaca tinggi itu.
- **Layout 3D** (`setLayout`): `heightWorld = tinggi × screenHeightWorld`. Grup adegan diletakkan di `y = 0.5·layar − totalSebelumnya − 0.5·heightWorld`. Akumulasi `totalHeight` termasuk margin (bisa negatif). Saat resize, semuanya dihitung ulang dari nol.
- **Scroll virtual** (`Scroll`): target scroll menerima wheel, drag (mobile), dan keyboard. Nilai aktual mengejar target dengan faktor 0.5 per frame, lalu `Story` melerp lagi (`lerpDelta` 0.08 desktop / 0.9 mobile). Nilai akhir dikali `unitsPerPixelY` menjadi posisi Y kamera.
- **Kemiringan kamera dari kecepatan scroll**: `rotation.x = clamp(lerp(0.002 × deltaScroll), ±0.2)`. Scroll cepat membuat kamera sedikit menunduk/mendongak, sehingga terasa bermassa.
- **Culling per adegan** (`toggleVisibility`): adegan hanya dirender jika rentang world-nya beririsan dengan layar (ditambah padding 0.1). Setiap adegan mendapat `scrollProgress` 0..1 (dari bawah layar masuk sampai atas keluar) yang menjadi penggerak semua animasinya.
- **Clipping per adegan**: shader memakai `uDiscardTop` / `uDiscardBottom` (dalam NDC) untuk membuang piksel di luar "pita" adegannya. Adegan yang tumpang-tindih tidak saling bocor.

### 3.2 Pipeline render
1. **Render adegan** ke render target.
2. **Panel kecil (FloatingFrame)**: objek yang sama dirender ulang dengan kamera atau parameter lain, lalu dipotong per piksel ke segi empat 4 titik (fungsi `isLeft` per sisi → SDF). Lebar garis tepi = `3px × DPR × fwidth`. Sudut bergerak dari `uCenter` ke titik akhir (`uTransition`), dan tepinya diberi noise ber-frame-rate rendah.
3. **Komposit** (`CompositeShader`): blue-noise yang **ikut bergeser bersama scroll** (`uScrollY × 1.5`) di-multiply 10% sebagai butiran kertas. Saat gerbang usia aktif, masker fluida dari kursor mencerahkan area yang disapu.
4. **Teks kotak narasi** dirender terpisah setelah post-process (`BEFORE_POST_RENDER`, `autoClear=false`) agar tetap tajam.

### 3.3 Shader kunci (resep)

**Ukiran tokoh** (`FloatingFrameBaseShader`, `SkinShader`, `StaticCharacterBaseShader`):
```glsl
lighting   = dot(normal, lightDir);
lines      = texture(tLines, rotatedPos.xy * tile + vec2(-steppedTime*3., 0.)).r * 2. - 1.;
mid        = aastep(0.0, lighting + lines*0.1);      // batas terang/gelap bergerigi oleh garis
masked     = lines + max(lighting,0.)*0.7;           // garis menipis di area terang
masked    += noise * pow(max(lighting,0.),2.) * 3.;  // pecah jadi titik di area paling terang
masked     = aastep(0.01, masked);
color      = mix(black, tan, mid) * masked;          // + topeng kulit/mata/latar dari vertex attribute colorid
```
- Koordinat garis berasal dari **posisi objek yang diputar** (bukan UV), jadi arsir tetap miring konsisten seperti ukiran.
- `colorid` per vertex menandai kulit, mata, iris, dan latar. Setiap area mendapat warna datar sendiri.
- Gerak "idle" dibuat di vertex shader: rotasi kecil dengan waktu yang dibulatkan (`floor(t·8)`), seperti animasi stop-motion.

**Langit & awan** (`WanderBackgroundShader`, `WanderSkyShader`):
```glsl
uv     = vUv*3 - stepped(time)*drift;
noise  = tex(clouds, uv*.75) * tex(clouds, uv + t*.5);  noise = pow(clamp(noise,0,1), 2);
value  = halo*1.75 + horizon*1.95; value = value*.5 + .325;
value -= (1-noise²)*.6 + roughNoise*.35;  value += fluidMask*.03;
scan   = pow(smoothstep(0,.8,vUv.y) - scrollProgress, 2);   // awan "disapu" masuk oleh scroll
alpha  = aastep(scan, value);                                // noda tinta bertepi tajam
```

**Garis angin** (`WindLinesSketchShader`): kurva 3D dari JSON (Blender → `wind-curves.json`). Di vertex shader setiap titik diproyeksikan, lalu diberi normal layar dan diekstrusi menjadi pita setebal `0.01 × w`. Di fragment shader pita dipotong noise per-garis (`vRandom`) dengan waktu dibulatkan, sehingga terlihat sebagai coretan putus-putus yang mengalir.

**Bingkai panel besar** (`WanderBorderShader`): mesh border dengan atribut `inner/outer/dist`. Padding bingkai = `max(uProgress, expoIn(expoOut(scroll)))`, sehingga bingkai menyusut dari layar penuh ke posisinya saat scroll atau intro. Lebarnya dibatasi `uMaxWidth` 2100px.

**Tirai transisi** (`TransitionLineShader`): gradasi hitam-ke-putih ditambah noise dan tekstur garis, lalu di-threshold `step(0.4)`. Hasilnya tepi tinta bergerigi yang menyapu layar saat scroll.

**Kotak teks** (`BorderBGShader`): tepi 3px yang ketebalannya digoyang noise ber-8fps.

**Karaoke** (`TextBoxTextShader`): setiap glyph membawa atribut `vKaraoke = (start, end)` dari timestamp. Glyph menyala merah saat `uKaraokeTime` berada di antara keduanya, dengan transisi lembut 0.4 detik.

### 3.4 Sistem narasi (VOManager)
1. Kotak teks yang masuk layar memanggil `addToQueue(id)`.
2. Setiap frame: jika |delta scroll| > 0.6, catat sebagai "aktif". Narasi diputar hanya jika pengguna diam ≥ 100 ms dan tidak ada narasi lain yang sedang diputar.
3. Saat diputar: one-shot `vo-<id>`, lalu `startVoAnimation(timestamps)` → karaoke berjalan.
4. Selesai: status direset. Scroll ke atas (`scrollToTop`) membersihkan antrean.

> **Inti UX-nya:** suara tidak pernah menyaingi gerak. Cerita "berbicara" saat pengguna berhenti untuk melihat.

---

## 4. How it's built (cara pembuatan & produksi)

### 4.1 Stack
- **Hydra** (framework internal Active Theory):
  - Komponen `Class(function X(){ Inherit(this, …) })`.
  - Komponen kebanyakan dihasilkan oleh *compiler* fragmen (`fragName`, `initClass`, `createFragment`).
  - State global `AppState`, event `fire/listen/bind`, `startRender(fn, RenderManager.BEFORE_RENDER/AFTER_LOOPS)`.
  - Render pipeline `World.NUKE` (post-process).
- **UIL**: editor visual milik Active Theory. Hampir semua angka (warna, posisi, threshold, kurva tween) bisa disetel di panel UIL saat pengembangan, lalu dibekukan ke `uil.json` (270 KB) untuk produksi. Setiap uniform shader otomatis muncul di panel kecuali ditandai `ignoreUIL`.
- **Shader** ditulis per file `.glsl` dengan blok `#!ATTRIBUTES / #!UNIFORMS / #!VARYINGS / #!SHADER: Vertex/Fragment` dan `#require(lib.glsl)`. Semuanya dibundel menjadi satu file `compiled.vs`.
- **Lottie** hanya untuk animasi loader.

### 4.2 Pipeline aset
| Jenis | Format | Catatan |
| --- | --- | --- |
| Model & rig | glTF + **Draco** (wasm decoder) | Karakter ber-skinning (`skinning.glsl`), animasi diputar di GPU |
| Tekstur | **KTX2 / Basis** (transcoder wasm) dan PNG/JPG | Tekstur kecil yang di-*tile*: `lines.jpg`, `perlin.png`, `clouds_noise.png`, `cell_noise.png`, `bluenoise0.png` |
| HDR / IBL | WebP + **gain-map** (`_sdr.webp`, `_gainmap.webp`, `_metadata.json`) | Untuk botol kaca PBR (refraksi) |
| Kurva | JSON (`*-curves.json`) | Garis angin dan tanah diekspor dari tool 3D |
| Teks GL | MSDF (`Font.png` + `Font.json`) | Teks tajam di WebGL |
| Suara | OGG (efek), MP3 (narasi) | Timestamp narasi berupa JSON per klip |

- **Worker threads** (`hydra-thread.js` ×8): decode dan loading aset dilakukan di luar main thread, jadi scroll tidak tersendat saat aset masuk.
- **Preload per adegan**: `Initializer3D.uploadAll(group)` meng-upload geometri dan tekstur ke GPU sebelum adegan terlihat (menghindari *jank* saat pertama kali tampil).

### 4.3 Proses produksi (direkonstruksi)
1. **Naskah dan storyboard komik**: bab, kalimat narasi, dan momen interaksi (tuang, tahan, tarik).
2. **Narasi direkam/disintesis**, lalu ditranskrip dengan timestamp per kata.
3. **3D**: tokoh dimodel dan di-rig, ditambah prop (botol, pilar, batu, daun). Kurva angin dan tanah digambar di Blender lalu diekspor ke JSON.
4. **Look-dev shader** per adegan di UIL, ditambah playground (`isPlayground`) untuk menguji satu adegan secara terisolasi.
5. **Layout scroll**: tinggi setiap adegan dalam satuan layar, ditambah margin negatif untuk tumpang-tindih.
6. **Desain suara** (Plan8): drone per babak, one-shot, transisi, dan mix berbasis progres scroll.
7. **Optimasi**: Draco, KTX2, worker, culling per adegan, DPR dibatasi, jalur mobile terpisah.

### 4.4 Kenapa terasa mulus
- Satu canvas dan satu kamera, tanpa reflow DOM di setiap frame. DOM hanya di-`translate3d`.
- Hanya adegan yang terlihat yang dirender (culling + discard pita).
- Scroll dua tahap: target dikejar 0.5, lalu kamera dilerp 0.08 (desktop).
- Aset di-decode di worker dan di-upload ke GPU sebelum dibutuhkan.
- "Kasar" yang disengaja (8 fps) hanya ada di **tekstur**, bukan di **gerak**.

---

## 5. Playbook: memakai teknik ini di website apa pun

Bagian ini dirancang supaya bisa dipakai untuk merek atau tema apa pun, bukan hanya komik.

### 5.1 Pola yang bisa dibawa ke mana saja
| Pola | Inti | Kapan dipakai | Versi murah (tanpa 3D) |
| --- | --- | --- | --- |
| **Cerita = tumpukan adegan** | Tinggi adegan dalam satuan layar; adegan mendapat `progress` 0..1; culling | Landing page bercerita, peluncuran produk, laporan tahunan | Section `position: sticky` + progres scroll per section (seperti `akaru-projects`) |
| **DOM menentukan tinggi, kanvas menentukan tampilan** | `*UI` div = panjang scroll; grup visual mengikuti `offsetTop` | Situs WebGL yang tetap SEO-friendly dan bisa dibaca | Kanvas fixed + section DOM transparan |
| **Gerak 60 fps, tekstur 8 fps** | `floor(time·8)/8` untuk noise/garis | Gaya ilustrasi, tangan, zine, kartun, cat air, kapur | SVG `feTurbulence` dengan seed berganti 8×/detik, atau sprite 3 frame bergantian |
| **Bentuk dari threshold noise** | `aastep(threshold, noise × gradasi)` | Awan, asap, cat tumpah, transisi organik, reveal | Canvas 2D + `ImageData` threshold, atau `mask-image` noise PNG |
| **Ukiran / arsir dari cahaya** | garis × cahaya → threshold | Gaya cetak, vintage, editorial, merek heritage | `ink-comic`: luminance foto sebagai "cahaya" |
| **Panel yang tumbuh dari tengah** | 4 sudut di-lerp dari pusat, tepi SDF + noise | Galeri, highlight produk, kutipan | `clip-path: polygon()` dengan sudut dianimasi |
| **Narasi saat diam** | Antrean dan putar saat idle ≥ 100 ms, karaoke per kata | Storytelling, edukasi, museum, aksesibilitas | `<audio>` + timestamp ElevenLabs + `<span>` per kata |
| **Kursor sebagai alat** | Label kursor ("TAHAN", "TARIK") + interaksi tahan | Momen interaktif yang perlu diajarkan tanpa teks panjang | Div kursor kustom + `pointerdown`/`pointerup` dengan timer |
| **Kamera bermassa** | Kemiringan kamera ∝ kecepatan scroll, dibatasi | Semua situs scroll berat | `rotateX(clamp(v·k))` di wrapper |
| **Suara mengikuti cerita** | Crossfade lapisan berdasarkan progres adegan | Situs imersif, game, pameran | Web Audio `GainNode` + progres section |
| **Butiran ikut scroll** | Blue-noise × 10% yang bergeser bersama scroll | Kesan kertas/film di atas apa pun | Pseudo-element dengan background noise + `background-position` dari scroll |
| **Teks GL tetap terbaca** | Duplikat `.sr-only` di DOM | Wajib setiap kali teks digambar di kanvas | — |

### 5.2 Resep membangun versi kita
1. **Tentukan bab**: daftar adegan dengan tinggi (layar), peran, dan satu interaksi per adegan maksimal.
2. **Kerangka**:
   ```js
   const scenes = [{ id: "intro", h: 2.5 }, { id: "close", h: 1.25, marginTop: -0.1 }, …];
   // tinggi DOM = h × innerHeight; progress = clamp((scrollY + vh − top) / (heightPx + vh))
   ```
   Satu loop: baca `scrollY` → lerp → untuk setiap adegan yang terlihat hitung `progress` → panggil `scene.render(progress, time)`.
3. **Visual**:
   - **Kanvas 2D/WebGL ringan**: satu shader layar penuh per gaya (lihat `ink-comic`). Inputnya foto atau ilustrasi transparan, ditambah noise prosedural.
   - **3D penuh** jika perlu: three.js atau OGL + glTF Draco + KTX2, culling per adegan, dan shader toon/hatching seperti §3.3.
4. **Gaya "digambar"**: waktu dibulatkan, `aastep`, 2–3 warna, tepi bergetar.
5. **Teks**: DOM biasa (paling mudah) atau MSDF jika harus berada di dalam 3D. Selalu sediakan versi `.sr-only`.
6. **Suara (opsional)**: buka kunci di gestur pertama. Siapkan satu ambient atau drone per babak plus beberapa one-shot. Narasi diputar saat idle.
7. **Mobile**: lerp mendekati native (0.9), matikan fluida dan efek kursor, perpendek tinggi adegan, dan batasi DPR 1.5.
8. **Verifikasi**: ukur posisi di beberapa titik progres. Kemulusan dinilai di perangkat asli.

### 5.3 Jebakan yang perlu dihindari
- Jangan membuat **gerak** ber-frame-rate rendah. Hanya **tekstur**. Kalau tidak, situs terasa lag, bukan "digambar".
- Margin negatif antar-adegan butuh **clipping per adegan** (discard / `clip-path`). Tanpanya adegan saling bocor.
- Web Audio tidak boleh berbunyi sebelum gestur pengguna. Sediakan gerbang atau tombol suara.
- Teks di kanvas tidak terbaca mesin pencari maupun pembaca layar, jadi wajib ada duplikat DOM.
- Aset 3D tanpa kompresi (Draco/KTX2) dan tanpa preload per adegan menyebabkan *jank* saat adegan pertama muncul.

---

## 6. Referensi cepat (angka dari kode)

| Hal | Nilai |
| --- | --- |
| Lerp scroll | desktop 0.08, mobile 0.9; scroll dalam 0.5/frame |
| Kemiringan kamera | 0.002 × delta scroll, lerp 0.05, batas ±0.2 rad |
| Padding visibilitas adegan | 0.1 layar |
| Boil tekstur | 8 fps (garis, tepi, noise), 24 fps (awan, latar) |
| Garis arsir | tile 4.5, cahaya (−0.75, 0.75, 2), threshold (0.4, 0.7) |
| Tepi panel | 3px × DPR, noise 0.0002 |
| Lebar maks bingkai | 2100 px |
| Kursor | lerp 0.1, cakram 120 px, hitbox 1.3× |
| Narasi | idle ≥ 100 ms, ambang delta scroll 0.6, karaoke padding 0.4 dtk |
| Butiran komposit | blue-noise × 5, bergeser `scrollY × 1.5`, multiply 10% |
| Tinggi adegan mobile | diinterpolasi dari lebar 1600px ke 393px |
