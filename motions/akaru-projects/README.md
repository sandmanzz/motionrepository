# Akaru Projects Scroll

Bagian pembuka [Akaru](https://www.akaru.fr/) sampai masuk ke section proyek. Satu section sticky panjang dengan satu timeline yang di-scrub oleh scroll. Aslinya GSAP; di sini vanilla JS.

## Timeline (1 unit = 0.79 tinggi layar scroll, dipakai 0–14)
Di situs asli timeline-nya 16.5 unit di section setinggi 14 layar, jadi 1 unit ≈ 0.79 layar. Tempo itu disamakan lewat `--ak-unit` / opsi `unit`.
Semua offset `rem` memakai rem situs asli: **1rem = 1/144 lebar layar** (html 10px di lebar 1440), bukan 16px.
| Unit | Yang terjadi | Easing |
| --- | --- | --- |
| 0 – 5 | Track (hero + 3 panel) bergeser ke kiri sampai panel terakhir tepat di x = 0 | power1.out |
| 0 – 5 | Akordeon: panel 2 mulai di −31vw, panel 3 di −87vw, lalu menyusul ke posisi aslinya | linear di dalam, progres power3.out (lebih cepat dari track — diukur dari situs asli) |
| 0 – 5 | Foto panel 1/2/3 mulai di scale 0.6/0.4/0.2 dan turun 5/25/35rem, isi foto zoom 1.4/1.6/1.8 → 1 | linear |
| 0 – 5 | Panel 3: latar `scaleX` 0.2 → 1, detail & tombol meluncur dari −70rem | linear |
| 3.5 – 9.5 | Garis daftar keahlian di kanan tergambar dari kanan, stagger 0.15 | power1.inOut |
| 5 – 6 | 2 kartu pertama daftar naik (isi kartu & foto berlawanan arah) | power1.inOut |
| 5 – 8 | Panel + daftar di-scale 0.5 dari pojok kiri atas → jadi kolom kiri | power1.inOut |
| 5 – 13.5 | Kolom kiri bergulir ke atas sampai ujung daftar; foto kartu parallax ±9rem | power1.inOut / linear |
| 7.5 | Judul "Projects", nomor & teks keahlian, paragraf muncul (reverse cepat saat scroll naik) | power3.out |

Saat load: panel meluncur masuk dari kanan (power4.out, 1.2s) dan wordmark hero naik dari mask.

## Pakai
Salin blok `<section class="ak">` dari `index.html`, lalu:
```js
AkaruProjects.mount(document.querySelector(".ak"), { units: 14, smooth: 0.12, mobile: 900 });
```
| Opsi | Default | Arti |
| --- | --- | --- |
| `units` | `14` | Panjang timeline yang dipakai |
| `unit` | `0.79` | 1 unit = sekian × tinggi layar scroll. Tinggi section = units × unit + 100vh |
| `smooth` | `0.1` | Lerp progres per frame @60fps (meniru Lenis), tidak bergantung frame rate. `1` = tanpa smoothing |
| `mobile` | `900` | Di bawah lebar ini: layout statis bertumpuk |

Mengembalikan `{ seek(t), destroy() }`. `seek(t)` merender langsung di unit `t` tanpa smoothing (debug / kontrol dari luar).

Performa: semua ukuran dibaca sekali (load, resize, font siap). Tiap frame hanya membaca `scrollY` lalu menulis `transform`, jadi tidak ada layout thrash. Saat diam, loop tidak menulis apa pun.

Aturan markup:
- Tepat **3** `.ak__feat` dengan `--i: 0/1/2` dan `--c` (warna panel).
- `.ak__list` boleh berisi berapa saja `.ak__card`; tinggi daftar menentukan seberapa jauh kolom bergulir.
- Delay muncul teks kanan diatur lewat `--d` (detik) di tiap elemen.

## Tema
`--ak-bg`, `--ak-ink`, `--ak-accent`, `--ak-w` (lebar panel, default 66.667vw), `--ak-font`, `--ak-display`.

## Catatan
- Font asli (Alliance Neue + display kustom) diganti Inter Tight + Anton dari Google Fonts.
- Semua foto di-generate dengan Higgsfield (GPT Image 2.6); file sumber ada di `_raw/akaru-projects/`.
- `prefers-reduced-motion`: tanpa smoothing dan tanpa transisi CSS; timeline tetap mengikuti scroll.
