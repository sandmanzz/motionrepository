# Card Helix

Kartu yang berputar di jalur heliks dari [ebuka.marketing](https://ebuka.marketing/) (bagian "Trusted by incredible companies"). Aslinya three.js; di sini WebGL2 mentah tanpa library, dengan rumus dan angka yang sama.

## Cara kerja
1. **Bidang melengkung.** Satu geometri (64 segmen) dibengkokkan ke silinder radius R: `x → sin(x/R)·R`, `z → cos(x/R)·R − R`. Semua kartu memakai geometri yang sama.
2. **Heliks.** Kartu ke-i punya posisi relatif terhadap tengah: `n = wrap(i − offset + N/2, N) − N/2`.
   - `sudut = −n · 2π / kartuPerPutaran` (9 → 40° per kartu)
   - `x = sin(sudut)·R`, `z = cos(sudut)·R`, `y = n · 80`, `rotY = sudut`
3. **Kedalaman** `a = (1 − cos sudut)/2` (0 = depan, 1 = belakang) menggerakkan tiga efek:
   - **Miring**: vertex `y += −tan(25°)·a · x`. Kartu belakang condong sehingga terbentuk "pita".
   - **Blur**: `texture(tex, uv, bias)` dengan `bias = log2(1 + 10·smooth(0.3,1,a)·1.6)`. Blur gratis dari mipmap, tanpa pass tambahan. Tekstur diberi margin transparan 64px agar blur tidak terpotong di tepi.
   - **Redup**: `rgb × (1 − 0.5·smooth(0.2,1,a))`.
4. **Pudar ujung**: opasitas `1 − smooth(1 − edgeFade, 1, |n|/(N/2))`, ditambah `mask-image` gradasi atas-bawah di CSS.
5. **Dua sisi**: `gl_FrontFacing` memilih tekstur muka atau punggung (punggung dicerminkan horizontal).
6. **Gerak**:
   - Kecepatan dilerp ke target (exp 7), posisi dilerp lagi (exp 11). Putaran jadi halus dan berhenti lembut saat `prefers-reduced-motion`.
   - Kamera di z = 4000 dengan fov dari `viewHeight`, jadi 1 unit ≈ 1px dan perspektifnya halus.
7. **Urutan gambar**: kartu diurutkan dari belakang ke depan setiap frame (transparan, tanpa depth buffer).
8. **Hemat**: loop berhenti saat kontainer tidak terlihat (IntersectionObserver).

## Pakai
```html
<link rel="stylesheet" href="motion.css">
<div id="helix" style="height:100vh"></div>
<script src="motion.js"></script>
<script>
  CardHelix.mount(document.getElementById("helix"), {
    items: [{ label: "Brand A", suit: "♠" }, { label: "Brand B", suit: "♦", src: "logo-b.svg" }],
    back: null,                 // atau url gambar punggung kartu
    viewHeight: 900, radius: 300, cardWidth: 200, cardHeight: 280
  });
</script>
```

## Opsi (default = situs asli)
| Opsi | Default | Arti |
| --- | --- | --- |
| `items` | `[]` | `{ label, suit, src?, alt? }`. `src` digambar di tengah muka kartu |
| `back` | `null` | Gambar punggung; `null` = ornamen kisi emas |
| `repeat` | `4` | Daftar diulang supaya heliks penuh |
| `speed` / `direction` | `0.5` / `"down"` | Kartu per detik |
| `radius` | `300` | Jari-jari silinder (px) |
| `cardWidth` / `cardHeight` | `200` / `280` | Ukuran kartu (px) |
| `verticalSpacing` | `80` | Turun per kartu |
| `cardsPerTurn` | `9` | Kartu per satu putaran |
| `cardTilt` | `25` | Kemiringan maksimum (derajat) |
| `centerScale` | `0.9` | Skala kartu paling tengah |
| `edgeFade` / `edgeBlur` / `depthDim` | `0.5` / `10` / `0.5` | Pudar ujung, blur, redup |
| `grayscale` | `0` | 0..1 |
| `viewHeight` | tinggi kontainer | Menentukan fov (1 unit ≈ 1px) |
| `drag` | `true` | Tarik vertikal untuk memutar, dilepas dengan inersia (tambahan, tidak ada di aslinya) |
| `colors` / `font` | hitam-emas / DM Serif Display | Gaya muka kartu yang digambar |

## Catatan
- Butuh WebGL2 (mipmap untuk tekstur non-power-of-two). Tanpa WebGL2 kontainer diberi class `ch--nogl`.
- Daftar `.ch__sr` (tersembunyi) berisi nama item untuk pembaca layar.
