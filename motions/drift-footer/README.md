# Drift Footer

Footer bergaris dari [Floema](https://floema.com/en): ilustrasi garis bergeser horizontal mengikuti scroll sampai mendarat di posisinya, garis pemisah tumbuh dari kiri, teks muncul berurutan. Aslinya GSAP ScrollTrigger; di sini vanilla JS + CSS transition.

## Perilaku asli (Floema)
| Elemen | Gerak | Pemicu |
| --- | --- | --- |
| Meja (baris atas) | `x: -3vw → 0` scrub | top baris di bawah layar → bottom baris di atas layar |
| Tiang (baris alamat) | `x: 2vw → 0` scrub | sama |
| Kursi (baris link, kiri) | `x: -10% → 10%` scrub | top baris di 100% → bottom baris di 100% |
| Air mancur (baris link, kanan) | `x: 100% → 0%` scrub (lebar dirinya sendiri) | sama dengan meja |
| Garis | `width: 0 → 100%`, 1s power2.out, sekali | top garis di 98% layar |
| Teks | fade + naik 14–20px, stagger 0.04–0.08s | top grup di 80% layar |

Karena footer ada di ujung halaman, rentang "bottom keluar atas" tidak pernah tercapai penuh. Di demo, rentang tiap ilustrasi dipendekkan lewat `data-fd-range` supaya benar-benar mendarat saat halaman habis.

## Markup
```html
<div class="fd__row" data-fd-trigger>
  <img class="fd__art" src="lamp.svg" data-fd-drift="2vw,0vw" data-fd-range="1,0.55">
  <div data-fd-reveal> <h5>…</h5> <p>…</p> </div>
  <span class="fd__line" data-fd-line></span>
</div>
```
| Atribut | Arti |
| --- | --- |
| `data-fd-drift="dari,ke"` | Geser X. Satuan `vw`, `vh`, `px`, atau `%` (lebar elemen sendiri). Dua nilai harus satuan sama |
| `data-fd-range="mulai,akhir"` | Default `1,0`. Mulai saat **top** pemicu di `mulai × tinggi layar`, selesai saat **bottom** pemicu di `akhir × tinggi layar` |
| `data-fd-trigger` | Elemen pemicu (default: induk langsung) |
| `data-fd-line` | Garis tumbuh saat top-nya melewati 98% layar |
| `data-fd-reveal` | Anak-anaknya muncul berurutan saat grup di 80% layar |

`DriftFooter.mount(root, { lineAt, revealAt, stagger })` → `{ destroy }`.

## Tema
`--fd-bg`, `--fd-ink`, `--fd-font`, `--fd-pad`, `--fd-line-dur` di `.fd`.

## Catatan
- Ilustrasi (meja, tiang lampu, kursi, tempat sampah) digambar ulang sendiri sebagai SVG garis, bukan aset Floema. Logo besar diganti huruf "S" + ®.
- Tanpa JS, semua tampil di posisi akhir (class `fd--js` baru dipasang saat mount).
- `prefers-reduced-motion`: ilustrasi langsung di posisi akhir, tanpa transisi.
