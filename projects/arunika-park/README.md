# Arunika — landing page wahana

Konsep landing page taman bermain. Seluruh halaman adalah satu putaran roller coaster dari sudut pandang penumpang; scroll menggerakkan kereta.
Nama taman, angka, jam buka, dan alamat email adalah placeholder.

Buka: `node server.js` di root, lalu `http://localhost:4173/projects/arunika-park/`.

## Naskah (posisi dalam vh, lihat `BEATS` di `js/ride.js`)
| Babak | Scroll | Video | Kendali | Isi |
| --- | --- | --- | --- | --- |
| Gerbang | terkunci | poster | tombol Mulai | Judul, tuas pengaman |
| Tanjakan | 0–300 | `lift.mp4` | scroll, lambat | Tiga kalimat, klik rantai + sentakan kecil |
| Puncak | 300–400 | `ride.mp4` 0–1,9 dtk | scroll, hampir diam | Detak jantung, peta tiga dunia (bisa diklik) |
| Wahana | 400–640 | `ride.mp4` 1,9–14,6 dtk | **otomatis ±12,7 dtk**, scroll dikunci | Terjun → Tirta → gua lava → badai & putaran (Guntur) → pasar malam |
| Rem | 640–900 | `ride.mp4` 14,6–20,6 dtk | scroll, melambat sampai berhenti | Papan Pasar Malam, masuk stasiun |
| Stasiun akhir | 900–960 | frame terakhir | diam | Hubungi kami, Naik lagi |

## Cara kerja
- `.stage` fixed berisi dua `<video>`; `.track` hanya memberi panjang scroll.
- Tiap frame: posisi scroll → babak → waktu video (dihaluskan) → `video.currentTime`.
- **Tidak ada potongan.** Dari puncak sampai stasiun adalah satu file (`ride.mp4`), dan frame akhir `lift.mp4` = frame awal `ride.mp4`. Yang berubah hanya suasananya: siang → gua → badai senja → malam.
- Wahana otomatis: melewati 400vh sambil turun memutar video secara native dan menggerakkan scroll mengikuti video. Setelah 14,6 dtk kereta meluncur sendiri sebentar, lalu kendali kembali ke scroll. Scroll ke atas tetap di-scrub biasa.
- Sensasi (`tick()` di `js/ride.js`): layar digetarkan, di-zoom, dan pandangan disempitkan (`.tunnel`) sebanding kecepatan. `EVENTS` memberi sentakan + suara di momen tertentu (jatuh, cipratan, masuk gua, petir, cakrawala terbalik).
- Papan Tirta dan Guntur muncul berdasarkan waktu video (`ZONE_T`), bukan posisi scroll tetap.
- Kecepatan di HUD mengikuti gerak scroll: berhenti scroll, kereta berhenti. Di atas 80 km/jam angkanya memerah.
- Suara disintesis WebAudio (`js/sound.js`): klik rantai, detak jantung, whoosh, guntur, angin, desis rem.
- `prefers-reduced-motion`: tanpa otomatis, tanpa getar.

## Aset (Higgsfield)
- Keyframe GPT Image 2.6 (16:9): stasiun, puncak, pasar malam. Keyframe stasiun jadi referensi agar kereta dan tangan konsisten.
- Klip Seedance 2.0 Mini 720p tanpa audio:
  - `lift` 5 dtk: start = stasiun, end = puncak.
  - `ride-a` 8 dtk: start = puncak → terjun → laguna → mulut gua.
  - `ride-b` 8 dtk: start = **frame terakhir `ride-a`**, end = keyframe pasar malam → gua lava → badai → putaran → malam.
  - `pasar` 5 dtk: start = keyframe pasar malam → berhenti di stasiun.
- `ride.mp4` = `ride-a` + `ride-b` + `pasar` digabung dengan crossfade 0,2–0,35 dtk di sambungan:
  `ffmpeg -i ride-a.mp4 -i ride-b.mp4 -i pasar.mp4 -filter_complex "...xfade=duration=0.2:offset=7.84...xfade=duration=0.35:offset=15.53" -c:v libx264 -crf 26 -g 3 -bf 0 ...`
  (`-g 3` = keyframe tiap 3 frame supaya seek cepat.)
- Sumber asli: `/_raw/arunika-park/` (termasuk klip area lama `tirta`, `dongeng`, `guntur`, `drop` yang tidak lagi dipakai).

## Yang belum
- Berat: ±20 MB video. Untuk produksi perlu versi 540p untuk mobile dan pemuatan bertahap per babak.
- Mobile tegak memotong video 16:9 ke tengah; idealnya ada klip 9:16 sendiri.
- Tombol "Hubungi kami" masih `mailto:` placeholder.
- Hanya tiga dunia yang dilewati rekaman. Menambah dunia keempat berarti menyisipkan satu klip bersambung lagi (start = frame terakhir klip sebelumnya).
