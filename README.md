# 🌊 RuangPintar Edge (LMS Terdesentralisasi Wilayah 3T)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL--Mode-003b57.svg)](https://www.sqlite.org/)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-orange.svg)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Platform Learning Management System (LMS) terdesentralisasi offline-first berbasis WebRTC P2P Data Channels dan Single-Gateway Cloud AI dengan cache lokal untuk mendukung pendidikan berkualitas di wilayah 3T (Tertinggal, Terdepan, Terluar) Indonesia.**

---

## 🎯 Latar Belakang & Masalah di Wilayah 3T
Sekolah-sekolah di wilayah kepulauan dan pedalaman Indonesia menghadapi tantangan nyata:
1. **Konektivitas Internet Minim / Mahal:** Sinyal seluler tidak stabil dan kuota internet satelit sangat mahal bagi sekolah dan siswa.
2. **Keterbatasan Bandwidth Router Kelas:** Jika 30 siswa mengunduh modul bersamaan dari laptop guru, router Wi-Fi lokal akan mengalami *bottleneck*.
3. **Ketergantungan Pembelajaran Digital pada Cloud:** Sebagian besar platform LMS modern lumpuh total saat koneksi internet terputus.

---

## 🚀 Solusi & Pilar Arsitektur RuangPintar Edge

```
                     ┌───────────────────────────────────┐
                     │     Cloud Gemini 3.8 Flash        │
                     │  (Hanya diakses saat Cache Miss)  │
                     └─────────────────▲─────────────────┘
                                       │ 1 Sambungan Tethering Guru
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Simpul Guru (Edge Gateway)     │
                     │  - Express + WebSocket Signaling  │
                     │  - SQLite (WAL Mode) Local Cache  │
                     │  - Authoritative Module Chunks    │
                     └───────▲───────────────────▲───────┘
                             │                   │
         WebRTC DataChannel  │                   │ WebRTC DataChannel
           (Chunk Biner)     │                   │   (Chunk Biner)
                             ▼                   ▼
                     ┌───────────────┐   ┌───────────────┐
                     │ Siswa A (Peer)│◄─►│ Siswa B (Peer)│
                     │ IndexedDB IDB │   │ IndexedDB IDB │
                     └───────────────┘   └───────────────┘
                                ▲             ▲
                                └─── WebRTC ──┘
                             (P2P Mesh Swarm Kelas)
```

### 1. Jaringan Mesh P2P WebRTC DataChannel (SCTP)
* Modul kurikulum dipecah menjadi **16 pecahan biner (RPE1 Binary Frame)** dengan header 32-byte.
* Siswa yang telah mengunduh beberapa pecahan bertindak sebagai *seeder* bagi rekan sekelasnya via WebRTC DataChannel.
* **0 KB Kuota Internet ISP:** Seluruh distribusi materi antar gawai berlangsung 100% di jaringan Wi-Fi lokal.

### 2. Single-Gateway Cloud AI & Local Semantic Cache
* Hanya laptop guru yang membutuhkan sambungan internet/tethering satelit (*Single-Gateway*).
* Pertanyaan siswa ke Tutor AI terlebih dahulu dicocokkan dengan **Cache Semantik Lokal di SQLite** (threshold kesamaan kata kunci $\ge 0.45$).
* Jika ada kecocokan (*Cache Hit*), jawaban dilayani seketika (**0 ms latensi, 0 KB kuota**).
* Jika *Cache Miss* dan guru online, request diteruskan ke **Gemini 3.8 Flash**. Jawaban yang diperoleh otomatis di-cache ke SQLite lokal agar pertanyaan berikutnya dari rekan sekelas gratis kuota.
* Jika offline total, sistem otomatis menggunakan **Local Curriculum Edge Synthesis**.

### 3. Progressive Web App (PWA) & IndexedDB Persistence
* Seluruh asset frontend dan simulasi di-precache menggunakan Service Worker (`vite-plugin-pwa` & Workbox).
* Potongan modul yang telah diunduh siswa tersimpan aman di `IndexedDB` (`RuangPintarEdgeIDB`) dengan *fallback* `localStorage`, sehingga tidak hilang saat tab browser ditutup atau di-reload.

### 4. 6 Simulasi Sains & Vokasi Terapan Interaktif
Dilengkapi modul pembelajaran dan kalkulator interaktif kontekstual alam kepulauan Indonesia:
1. 🌊 **Mikrohidro Pesisir & Sungai:** Perhitungan debit ($Q$), tinggi jatuh air ($H$), dan efisiensi turbin Pelton/Crossflow.
2. 🌿 **Biologi Ekosistem Mangrove:** Kalkulasi zona redaman gelombang dan mitigasi abrasi pantai.
3. ☀️ **PLTS Terdesentralisasi & Baterai LiFePO4:** Perancangan kapasitas panel surya dan *Depth-of-Discharge (DoD)* baterai desa.
4. 🌾 **Agroforestri Lahan Kering:** Konservasi air tanah dan pola tanam berstrata di wilayah pulau tandus/berbatu.
5. 💧 **Desalinasi Surya Termal:** Efisiensi produksi air tawar dari air laut menggunakan kondensasi matahari.
6. 🧭 **Navigasi Bahari Tradisional & Astrometri:** Penentuan azimuth arah lintang kapal menggunakan rasi Bintang Pari Selatan (*Crux*).

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript 5.8, Tailwind CSS v4, Motion (Framer Motion), Lucide React.
* **Build Tool & PWA:** Vite 8, `vite-plugin-pwa` (Workbox).
* **Backend & P2P:** Node.js, Express, WebSocket (`ws`), WebRTC (RTCDataChannel).
* **Database:** `better-sqlite3` (SQLite dengan mode Write-Ahead Logging / WAL).
* **AI Engine:** Google GenAI SDK (`@google/genai` - Gemini 3.8 Flash).

---

## 📦 Panduan Instalasi & Penggunaan

### 1. Prasyarat
* [Node.js](https://nodejs.org/) v20+ atau [Bun](https://bun.sh/)
* Git

### 2. Clone Repository
```bash
git clone https://github.com/irsyadazaki77-beep/RuangPIntar.git
cd RuangPIntar
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi pada `.env`:
```env
# Gemini API Key untuk Gateway AI Guru (Dapatkan gratis di https://aistudio.google.com/app/apikey)
GEMINI_API_KEY="AIzaSy..."

# Port server lokal Laptop Guru (default: 3000)
PORT=3000

# PIN Keamanan Simpul Guru (default: 1945)
HOST_PIN="1945"

# Path database SQLite lokal
RUANGPINTAR_DB_PATH="./ruangpintar-edge.db"
```

### 5. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 🔒 Hak Akses Simpul Guru
* Untuk membuka tab **Simpul Guru & Cache**, masukkan PIN default: **`1945`**.
* Guru dapat mengubah PIN kapan saja di panel pengaturan Simpul Guru.
* Endpoint verifikasi PIN dilengkapi proteksi *cooldown* otomatis (maksimal 5 kali salah per menit) untuk mencegah percobaan tebakan siswa.

---

## 🧪 Pengujian Unit & Validasi Kode

```bash
# Menjalankan 9 unit test engine edge & simulasi
npm test

# Pengecekan tipe data TypeScript
npm run lint

# Kompilasi build PWA produksi
npm run build
```

---

## 📁 Struktur Direktori

```text
RuangPIntar/
├── public/                 # Favicon, ikon PWA manifest, dan aset statis
├── src/
│   ├── assets/images/      # Ilustrasi kurikulum & hero banner
│   ├── components/
│   │   ├── modules/        # Kartu kuis, glosarium, kalkulator inline
│   │   ├── simulations/    # 6 Komponen simulasi interaktif sains 3T
│   │   ├── AiTutorGatewayView.tsx    # Antarmuka Single-Gateway AI & Cache
│   │   ├── InteractiveSimulations.tsx # Switcher simulasi
│   │   ├── MeshTopologyView.tsx      # Visualisasi topologi jaringan P2P
│   │   ├── ModuleLibraryView.tsx     # Pustaka materi & reader mode
│   │   ├── PWAInstallButton.tsx      # Tombol install PWA & status online
│   │   └── TeacherHostView.tsx       # Simpul Guru (Manajemen modul & PIN)
│   ├── utils/
│   │   ├── clientStorage.ts          # IndexedDB & localStorage manager
│   │   ├── db.ts                     # SQLite (better-sqlite3) data layer
│   │   ├── edgeEngine.ts             # Algoritma P2P chunking, RPE1 binary, cache matcher
│   │   ├── edgeEngine.test.ts        # Unit test suite
│   │   ├── seedData.ts               # Data modul, peers, dan cache awal
│   │   └── subjectTheme.ts           # Desain tema warna tiap mata pelajaran
│   ├── App.tsx             # Root application component & WebRTC orchestration
│   ├── index.css           # Tailwind v4 styles, ambient background, bento cards
│   └── main.tsx            # React root DOM mount
├── .env.example            # Template variabel lingkungan
├── .gitignore              # Daftar file yang diabaikan Git
├── index.html              # HTML entry point PWA
├── package.json            # Daftar dependensi & npm scripts
├── server.ts               # Express, WebSocket signaling, SQLite host, Gemini gateway
├── tsconfig.json           # Konfigurasi TypeScript
└── vite.config.ts          # Vite & VitePWA configuration
```

---

## 📜 Lisensi
Proyek ini dilisensikan di bawah lisensi **MIT**. Bebas dikembangkan untuk memajukan pemerataan pendidikan di seluruh pelosok Indonesia.
