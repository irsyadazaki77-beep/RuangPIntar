# 🌊 RuangPintar Edge (LMS Terdesentralisasi Wilayah 3T)

[![CI](https://github.com/irsyadazaki77-beep/RuangPIntar/actions/workflows/ci.yml/badge.svg)](https://github.com/irsyadazaki77-beep/RuangPIntar/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL--Mode-003b57.svg)](https://www.sqlite.org/)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-orange.svg)](https://web.dev/progressive-web-apps/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](Dockerfile)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Platform Learning Management System (LMS) terdesentralisasi offline-first berbasis WebRTC P2P Data Channels, Kriptografi Perangkat Siswa (ECDSA P-256), dan Single-Gateway Cloud AI dengan cache lokal untuk mendukung pendidikan berkualitas di wilayah 3T (Tertinggal, Terdepan, Terluar) Indonesia.**

---

## 🎯 Latar Belakang & Masalah di Wilayah 3T
Sekolah-sekolah di wilayah kepulauan dan pedalaman Indonesia menghadapi tantangan nyata:
1. **Konektivitas Internet Minim & Mahal:** Sinyal seluler tidak stabil dan kuota internet satelit sangat mahal bagi sekolah dan siswa.
2. **Keterbatasan Bandwidth Router Kelas:** Jika 30 siswa mengunduh modul bersamaan dari laptop guru, router Wi-Fi lokal akan mengalami *bottleneck* dan freeze.
3. **Ketergantungan Pembelajaran Digital pada Cloud:** Sebagian besar platform LMS modern lumpuh total saat koneksi internet terputus.
4. **Keaslian Nilai & Keamanan Tanpa Akun Cloud:** Dalam jaringan luring tanpa server OAuth terpusat, pengiriman nilai rawan dipalsukan antar-siswa (*identity impersonation*).

---

## 🚀 Solusi & Arsitektur Sistem

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
                     │  - ECDSA P-256 Device Verifier    │
                     │  - Hot Backup & Brownout Recovery │
                     └───────▲───────────────────▲───────┘
                             │                   │
         WebRTC DataChannel  │ (Unicast Relay)   │ WebRTC DataChannel
           (Chunk Biner)     │                   │   (Chunk Biner)
                             ▼                   ▼
                     ┌───────────────┐   ┌───────────────┐
                     │ Siswa A (Peer)│◄─►│ Siswa B (Peer)│
                     │ IndexedDB IDB │   │ IndexedDB IDB │
                     │ ECDSA KeyPair │   │ ECDSA KeyPair │
                     └───────────────┘   └───────────────┘
                                ▲             ▲
                                └─── WebRTC ──┘
                             (P2P Mesh Swarm Kelas)
```

---

## 💎 6 Pilar Keunggulan Rekayasa

### 1. Jaringan Mesh P2P WebRTC DataChannel (SCTP) & K-Cluster Topology
* Modul kurikulum dipecah menjadi **16 pecahan biner (RPE1 Binary Frame)** dengan header 32-byte.
* **Targeted Unicast Relay**: Menggantikan broadcast biner yang memenuhi router kelas dengan transmisi terarah langsung ke peer target (`toPeerId`).
* **K-Cluster Topology**: Membatasi handshake WebRTC maksimal **4 peer per gawai** (`MAX_CLUSTER_PEERS = 4`) guna mencegah $O(N^2)$ koneksi yang dapat membuat browser pada ponsel siswa Android murah mengalami crash.
* **0 KB Kuota Internet ISP:** Seluruh distribusi materi antar gawai berlangsung 100% di jaringan Wi-Fi lokal sekolah.

### 2. Single-Gateway Cloud AI & Cache Semantik Cerdas Berbahasa Daerah
* Hanya laptop guru yang membutuhkan sambungan internet/tethering satelit (*Single-Gateway*).
* **Kamus Dialek Lisan 3T (`INDONESIAN_DIALECT_MAP`)**: Memetakan kata sehari-hari siswa (contoh: `aer`/`banyu` $\rightarrow$ `air`, `gimana` $\rightarrow$ `bagaimana`, `pake` $\rightarrow$ `pakai`, `krn` $\rightarrow$ `karena`, `h2o` $\rightarrow$ `air`, `co2` $\rightarrow$ `karbon`, `evaporasi` $\rightarrow$ `uap`, `presipitasi` $\rightarrow$ `hujan`).
* **Pencocokan Tipografi Toleran & Pembobotan Konsep**: Pertanyaan lisan seperti *"gimana aer bisa jadi uap pas kena panas"* langsung cocok dengan arsip *"Bagaimana proses siklus air dan terjadinya hujan?"*, menghasilkan jawaban instan (**0 ms latensi, 0 KB kuota**).
* Jika *Cache Miss* dan guru online, request diteruskan ke **Gemini 3.8 Flash**. Jawaban yang diperoleh otomatis di-cache ke SQLite lokal agar pertanyaan berikutnya dari rekan sekelas gratis kuota.
* Jika offline total, sistem otomatis mengaktifkan **Local Curriculum Edge Synthesis**.

### 3. Tanda Tangan Kriptografis Perangkat Siswa (ECDSA P-256 via Web Crypto)
* Kunci privat ECDSA P-256 dibuat langsung di peramban siswa dan disimpan aman di `IndexedDB` lokal.
* Setiap pengiriman nilai kuis dan pos forum ditandatangani secara digital dengan format DER Base64.
* Server Simpul Guru memvalidasi tanda tangan dan mengikat *public key* ke `studentId` pada tabel `student_devices`. Siswa lain tidak dapat memalsukan nama temannya (*impersonation rejected with HTTP 403*).

### 4. Hot Backup Non-Blocking & Brownout Auto-Recovery
* Pemadaman listrik mendadak di daerah 3T sering merusak berkas database SQLite.
* `backupDatabase()` menjalankan pencadangan hot non-blocking ke berkas pementasan `.tmp` lalu di-*atomic rename* ke `${config.dbPath}.backup`.
* Mekanisme *brownout startup recovery* mendeteksi kerusakan berkas saat booting dan memulihkan data dari salinan backup secara otomatis.

### 5. Progressive Web App (PWA) & IndexedDB Persistence
* Seluruh asset frontend dan simulasi di-precache menggunakan Service Worker (`vite-plugin-pwa` & Workbox).
* Potongan modul yang telah diunduh siswa tersimpan aman di `IndexedDB` (`RuangPintarEdgeIDB`) dengan *fallback* `localStorage`.
* Dilengkapi *Web App Shortcuts* (Pustaka Luring & Tanya Pintar) dan dukungan *Add to Home Screen* di Android.

### 6. 6 Simulasi Sains & Vokasi Terapan Kontekstual 3T
Dilengkapi modul pembelajaran dan kalkulator sains interaktif:
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
* **Backend & P2P:** Node.js 20, Express, WebSocket (`ws`), WebRTC (RTCDataChannel).
* **Database:** `better-sqlite3` (SQLite mode WAL & Online Backup API).
* **Security & Auth:** Web Crypto API (Client ECDSA P-256), Node.js `crypto` (Server SHA-256 verification), Zod runtime validation.
* **AI Engine:** Google GenAI SDK (`@google/genai` - Gemini 3.8 Flash).
* **Containerization:** Docker multi-stage build, Docker Compose.

---

## 📦 Panduan Instalasi & Penggunaan

### 1. Prasyarat
* [Node.js](https://nodejs.org/) v20+ atau [Docker](https://www.docker.com/)
* Git

### 2. Clone Repository
```bash
git clone https://github.com/irsyadazaki77-beep/RuangPIntar.git
cd RuangPIntar
```

### 3. Instalasi Dependensi & Lingkungan
```bash
npm install
cp .env.example .env
```
Isi konfigurasi pada `.env`:
```env
# Gemini API Key untuk Gateway AI Guru (Opsional jika offline)
GEMINI_API_KEY="AIzaSy..."

# Port server lokal Laptop Guru (default: 3000)
PORT=3000

# PIN Keamanan Simpul Guru (default: 1945)
HOST_PIN="1945"

# Path database SQLite lokal
RUANGPINTAR_DB_PATH="./ruangpintar-edge.db"
```

### 4. Menjalankan Server Pengembangan

* **Opsi A — Cara Cepat (Windows):** Klik ganda berkas **`jalankan-simpul-guru.bat`**. Browser akan otomatis membuka `http://localhost:3000`.
* **Opsi B — Terminal:**
  ```bash
  npm run dev
  ```
* **Opsi C — Docker / Edge Server (Raspberry Pi & Linux):**
  ```bash
  docker compose up -d
  ```

---

## ⚡ Live Multi-Peer Swarm Simulator CLI

Ingin melihat simulasi pertukaran pecahan antar 3 gawai siswa secara langsung di terminal tanpa perlu 3 ponsel fisik?

1. Jalankan server di satu terminal:
   ```bash
   npm run dev
   ```
2. Buka terminal kedua dan jalankan simulator swarm:
   ```bash
   npm run demo:swarm
   ```
Sistem akan menghubungkan 3 siswa virtual (Alor, Rote, Natuna) dan menukar pecahan biner modul secara live via WebRTC DataChannel dengan kalkulasi penghematan kuota ISP!

---

## 🔒 Hak Akses Simpul Guru & Distribusi Sneakernet
* Untuk membuka tab **Simpul Guru & Cache**, masukkan PIN default: **`1945`**.
* Guru dapat mengubah PIN kapan saja di panel pengaturan Simpul Guru.
* Endpoint verifikasi PIN dilengkapi proteksi *cooldown rate-limiting* otomatis untuk mencegah *brute-force*.
* **Fitur Sneakernet (USB Flashdisk):** Guru dapat mengekspor paket data modul kurikulum & cache (`.json`) saat berada di kota berinternet, lalu mengimpornya via flashdisk ke laptop sekolah pedalaman tanpa kuota satelit.

---

## 🧪 Pengujian Kualitas Kode (Quality Gate)

```bash
# Menjalankan seluruh Quality Gate (Lint + 20 Unit & Integration Tests + Vite Build)
npm run check

# Atau jalankan pengujian unit secara spesifik:
npm test
```

---

## 📁 Struktur Direktori

```text
RuangPIntar/
├── .github/workflows/      # CI/CD Pipeline GitHub Actions
├── public/                 # Favicon, ikon PWA manifest, dan aset statis
├── scripts/
│   └── simulate-mesh-swarm.ts # Simulator 3 siswa virtual pertukaran chunk
├── server/
│   ├── config/             # Konfigurasi env & konstanta keamanan
│   ├── controllers/        # Controller AI, Auth, dan Sync
│   ├── db/                 # SQLite connection, hot-backup & repositories
│   ├── middleware/         # Auth, validation, rateLimiter, errorHandler
│   ├── routes/             # Modular express routes (/api/auth, /api/sync, dll)
│   ├── schemas/            # Skema validasi Zod
│   ├── state/              # In-memory authoritative classroom state
│   ├── utils/              # Verifikasi tanda tangan kriptografi siswa
│   ├── websocket/          # WebSocket signaling & targeted unicast relay
│   ├── app.ts              # Express factory & /api/health endpoint
│   └── server.test.ts      # Automated server API & security integration tests
├── src/
│   ├── components/
│   │   ├── modules/        # ModuleHeroHeader, ModuleSidebarCatalog, Quiz, Discussion
│   │   ├── simulations/    # 6 Komponen simulasi interaktif sains 3T
│   │   ├── AiTutorGatewayView.tsx    # Antarmuka Single-Gateway AI & Cache
│   │   ├── InteractiveSimulations.tsx # Switcher simulasi sains
│   │   ├── MeshTopologyView.tsx      # Visualisasi topologi jaringan P2P
│   │   ├── ModuleLibraryView.tsx     # Pustaka materi terbagi modular
│   │   └── TeacherHostView.tsx       # Simpul Guru (Manajemen modul & PIN)
│   ├── utils/
│   │   ├── edgeEngine.ts             # Algoritma P2P chunking, dialek, cache matcher
│   │   ├── edgeEngine.test.ts        # Unit test suite engine edge
│   │   ├── studentCrypto.ts          # Web Crypto ECDSA P-256 keypair manager
│   │   └── seedData.ts               # Data modul, peers, dan cache awal
│   ├── App.tsx             # Root application component
│   └── main.tsx            # React root DOM mount
├── Dockerfile              # Multi-stage container untuk edge/Raspberry Pi
├── docker-compose.yml      # Orchestration container Simpul Guru
├── LICENSE                 # Lisensi resmi MIT
├── CONTRIBUTING.md         # Panduan kontribusi modul & kurikulum
└── vite.config.ts          # Vite & PWA configuration
```

---

## 📜 Lisensi
Proyek ini dilisensikan di bawah lisensi **MIT**. Bebas dikembangkan untuk memajukan pemerataan pendidikan di seluruh pelosok Indonesia.
