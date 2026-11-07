# Modernisasi UI/UX & Sistem Warna Tropis Nusantara — RuangPintar Edge

Pembaruan ini mentransformasi tampilan visual dan pengalaman belajar (**UI/UX**) **RuangPintar Edge** menjadi platform edukasi modern yang segar, hidup, dan memotivasi siswa melalui palet warna **Tropis Nusantara Cerah** berbasis identitas mata pelajaran, permukaan navigasi bergaya kaca modern (*glassmorphism*), blok rumus dan kalkulator kontras tinggi, serta sistem perayaan progres dan lencana XP interaktif.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Rancangan visual dan interaksi ini disusun langsung berdasarkan seluruh pilihan yang Anda konfirmasi pada tahap klarifikasi.

- **Tema Palet Warna — Tropis Nusantara Cerah dengan Identitas Mata Pelajaran**: Mengganti nuansa monokrom kertas lama dengan kanvas terang segar yang dipadukan **4 spektrum warna khas mata pelajaran** (*Biru Samudra* untuk Fisika Terapan, *Hijau Zamrud Tropis* untuk Biologi Pesisir, *Nila Bintang Maritim* untuk Matematika Maritim, dan *Amber Surya Kepulauan* untuk Teknik Energi).
- **Pembaruan Komponen Antarmuka Utama**:
  1. **Kartu Modul Bergradasi per Mata Pelajaran** dengan aksen warna identitas, indikator bab, dan bar progres unduhan P2P bergradasi.
  2. **Banner Progres Belajar Visual & Lencana XP Interaktif** lengkap dengan tingkatan level siswa, bar progres gradien, dan kartu pencapaian yang responsif.
  3. **Blok Rumus, Kalkulator Interaktif, & Studi Kasus 3T Kontras Tinggi** dengan tampilan layar digital modern dan penggeser (*slider*) berwarna sesuai mata pelajaran.
  4. **Navigasi Atas & Tab Tahapan Belajar Bergaya Kaca Modern (*Modern Frosted Glass*)** dengan animasi transisi mulus.
- **Gaya Umpan Balik Visual & Gamifikasi**: Menghadirkan **animasi perayaan perolehan XP instan** (`+25 XP`, `+100 XP`, `+150 XP`), bar progres gradien dinamis di setiap bab dan misi laboratorium, serta umpan balik visual seketika saat siswa berinteraksi.

---

## 1. Overview & Core Concept

- **What It Does**: Menghadirkan suasana belajar digital yang setara dengan aplikasi EdTech modern kelas dunia namun tetap ringan dan berjalan 100% secara luring (*offline-first*) di jaringan lokal sekolah 3T. Setiap mata pelajaran memiliki karakter warna tersendiri sehingga siswa langsung merasakan suasana eksplorasi sains yang berbeda saat berpindah dari modul Energi Surya di Sumba ke Ekologi Mangrove di Kepulauan Aru.
- **Target Audience / Persona**: Siswa SMA/SMK usia 15–18 tahun dan guru di wilayah 3T yang membutuhkan antarmuka belajar yang tidak membosankan, memiliki hierarki visual yang jelas untuk rumus sains, serta memberikan apresiasi instan atas setiap kemajuan belajar.
- **Key Value**: Meningkatkan keterlibatan (*engagement*) dan daya tahan fokus siswa saat mempelajari materi teknis melalui kode warna visual yang intuitif, kontras bacaan yang tajam, dan umpan balik pencapaian yang memotivasi.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme: *Tropical Archipelago EdTech*

1. **Proporsi Warna 60-30-10 & Palet Khas Mata Pelajaran**:
   - **60% Kanvas Terang Segar (`--bg-canvas: #F8FAFC` dengan pendaran gradien halus di sudut layar)**: Memberikan kesan lapang, bersih, dan menjaga keterbacaan teks panjang tetap nyaman di layar laptop maupun ponsel siswa.
   - **30% Permukaan Kaca & Kartu Struktural (`#FFFFFF` & `rgba(255, 255, 255, 0.85)` dengan `backdrop-blur-xl`)**: Digunakan pada bilah navigasi, pemilih tahapan belajar, dan kartu ruang baca dengan batas halus yang menyesuaikan tema mata pelajaran aktif.
   - **10% Aksen Identitas 4 Mata Pelajaran Nusantara**:
     - **Fisika Terapan (*Samudra & Hidro*)**: Gradien `sky-600` ke `cyan-500` (`#0284C7` $\to$ `#06B6D4`), latar lembut `#F0F9FF`, aksen fokus biru elektrik.
     - **Biologi Pesisir (*Hutan & Mangrove*)**: Gradien `emerald-600` ke `teal-500` (`#059669` $\to$ `#14B8A6`), latar lembut `#ECFDF5`, aksen fokus hijau zamrud.
     - **Matematika Maritim (*Astronomi & Pelayaran*)**: Gradien `indigo-600` ke `violet-500` (`#4F46E5` $\to$ `#8B5CF6`), latar lembut `#EEF2FF`, aksen fokus nila terang.
     - **Teknik Energi (*Surya & Baterai*)**: Gradien `amber-500` ke `orange-600` (`#F59E0B` $\to$ `#EA580C`), latar lembut `#FFFBEB`, aksen fokus oranye surya.

2. **Kartu Modul Bergradasi & Katalog Visual**:
   - Setiap kartu modul pada daftar katalog menampilkan pita gradien identitas mata pelajaran di bagian atas, sampul visual berbingkai bersih dengan efek *hover zoom* halus, indikator jumlah bab yang telah diselesaikan siswa, serta bar progres pecahan WebRTC dengan warna gradien mata pelajaran terkait.

3. **Navigasi Kaca Modern & Jalur Belajar 4-Tahap (*Frosted Glass Stepper*)**:
   - **Header Utama 3-Zona**: Tetap mematuhi kontrak 3 zona yang bersih (Identitas RuangPintar Edge di kiri, 4 tautan navigasi dengan indikator garis gradien aktif di tengah, dan tombol utama Sinkronisasi P2P bergradasi di kanan) di atas permukaan kaca buram (`backdrop-blur-xl`).
   - **Tab Jalur Belajar Terpandu**: Didesain sebagai kapsul kaca modern 4-tahap (*1. Materi & Kasus*, *2. Lab Simulasi*, *3. Latihan & Kuis*, *4. Diskusi AI 0-Kuota*) di mana tahap aktif menyala dengan gradien warna mata pelajaran modul yang sedang dibuka.

4. **Blok Rumus, Kalkulator Interaktif, & Studi Kasus Kontras Tinggi**:
   - **Panel Rumus & Kalkulator Langsung**: Menggunakan kontras panel gelap *Deep Ocean Slate* (`#0F172A` $\to$ `#1E293B`) berbingkai pendaran warna mata pelajaran aktif. Hasil perhitungan ditampilkan dalam layar metrik digital berukuran tegas dengan angka *tabular-nums*, dilengkapi penggeser (*slider*) interaktif berwarna cerah.
   - **Kartu Studi Kasus Lapangan 3T**: Memiliki header bergradasi sesuai tema modul dan tiga kolom terstruktur (*Tantangan Desa*, *Solusi Rekayasa/Ekologi*, dan *Dampak Terukur*) dengan kontras warna semantik yang memudahkan pemindaian cepat.
   - **Diagram Alur Visual Bab**: Ditampilkan sebagai kartu langkah bernomor dengan penghubung gradien sehingga konsep kerja alat atau proses alam mudah divisualisasikan siswa.

5. **Banner Progres Belajar, Lencana XP, & Animasi Perayaan Instan**:
   - **Dashboard Progres Siswa**: Menampilkan level siswa saat ini (misal: *Level 1: Penjelajah Pesisir* $\to$ *Level 2: Teknisi Muda 3T* $\to$ *Level 3: Inovator Kepulauan*), total skor XP, bar progres gradien menuju level berikutnya, serta 4 kartu lencana pencapaian yang menyala penuh warna saat terbuka.
   - **Animasi Perayaan XP Instan**: Setiap kali siswa menyelesaikan bab bacaan (`+25 XP`), menjawab benar latihan/kuis (`+100 XP`), atau menuntaskan misi simulasi (`+150 XP`), muncul notifikasi perayaan mengambang (*floating XP celebration toast*) dengan animasi pegas yang meriah.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Sistem Warna Dinamis Berbasis Mata Pelajaran (*Subject-Driven Theming*)**
  - *Chosen Approach*: Membuat pemetaan tema warna terpusat berdasarkan mata pelajaran modul yang sedang aktif, sehingga header modul, tab tahapan belajar, bar progres, diagram bab, dan kalkulator secara otomatis menyesuaikan spektrum warnanya.
  - *Why*: Memberikan variasi visual yang kaya dan membantu memori asosiatif siswa (warna biru laut untuk fisika air/uap, hijau zamrud untuk biologi ekosistem, nila untuk astronomi pelayaran, dan kuning-oranye surya untuk teknik energi), tanpa membuat satu layar terlihat terlalu ramai oleh warna yang bertabrakan.
  - *Alternatives Considered*: Menggunakan seluruh warna pelangi sekaligus di setiap kartu — dihindari karena mengaburkan fokus bacaan dan menurunkan keterbacaan rumus.
- **Decision 2: Kontras Gelap-Terang Terukur pada Ruang Baca (*Dual-Surface Contrast*)**
  - *Chosen Approach*: Mempertahankan latar putih-segar untuk paragraf teks panjang, namun memberikan latar gelap kontras tinggi (*blueprint slate*) khusus pada blok rumus, kalkulator interaktif, dan kanvas simulasi SVG.
  - *Why*: Mata siswa tidak cepat lelah saat membaca penjelasan berparagraf-paragraf, sementara rumus penting dan simulasi laboratorium langsung menonjol sebagai pusat perhatian (*focal anchor*) di setiap bab.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Visual Theme Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 Sistem Tema Warna Mata Pelajaran Nusantara                   │
│   • Fisika Terapan (Samudra Cyan)     • Matematika Maritim (Nila Bintang)    │
│   • Biologi Pesisir (Zamrud Tropis)   • Teknik Energi (Amber Surya)          │
└──────────────────┬────────────────────────────────────────┬──────────────────┘
                   │                                        │
                   ▼                                        ▼
┌─────────────────────────────────────────┐  ┌─────────────────────────────────┐
│     Shell & Navigasi Kaca Modern        │  │  Gamifikasi & Umpan Balik XP    │
│ ─────────────────────────────────────── │  │ ─────────────────────────────── │
│ • Top Bar 3-Zona (Frosted Glass)        │  │ • Banner Level & Bar Gradien XP │
│ • Banner Hero & Statistik berwarna      │  │ • 4 Kartu Lencana Berwarna      │
│ • Stepper 4-Tahap Bergradasi Dinamis    │  │ • Animasi Toast Perayaan +XP    │
└─────────┬───────────────────┬───────────┘  └─────────────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────┐ ┌──────────────────────────────────────────────────────┐
│ Katalog & Ruang Baca│ │    Komponen Kontras Tinggi & Lab Simulasi            │
│ ─────────────────── │ │ ──────────────────────────────────────────────────── │
│ • Kartu Modul Pita  │ │ • Blok Rumus & Kalkulator Layar Digital              │
│   Gradien Mapel     │ │ • Kartu Studi Kasus 3T 3-Kolom Berwarna              │
│ • Navigasi Bab &    │ │ • Glosarium & Latihan Bertahap Interaktif            │
│   Progres Tuntas    │ │ • 6 Kanvas Simulasi dengan Indikator Misi Gradien    │
└─────────────────────┘ └──────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Pemetaan Tema Mata Pelajaran Otomatis**: Fungsi utilitas tema menerjemahkan mata pelajaran setiap modul ke dalam kelas gradien, warna aksen tombol, warna bar progres, dan bingkai fokus secara konsisten di Pustaka Materi, Jaringan Mesh P2P, Tutor AI, dan Simpul Guru.
- **Sistem Level & Perayaan XP Real-Time**: Poin XP yang dikumpulkan siswa dari penyelesaian bab, misi simulasi, kuis cepat, dan eksplorasi Tutor AI dihitung secara langsung untuk menentukan Level Siswa, menggerakkan bar progres gradien, dan memicu animasi perayaan XP mengambang.
- **Peningkatan Visual Lintas Halaman**: Selain Pustaka Materi, tampilan halaman **Jaringan Mesh P2P**, **Tutor AI Satu Pintu**, dan **Simpul Guru & Cache** turut diselaraskan dengan permukaan kaca modern, indikator warna mata pelajaran, dan kartu metrik yang lebih hidup.
