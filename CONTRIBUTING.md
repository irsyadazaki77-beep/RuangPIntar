# 🤝 Panduan Kontribusi RuangPintar Edge

Terima kasih atas ketertarikan Anda untuk berkontribusi pada **RuangPintar Edge**! Platform ini dibangun secara sumber terbuka (*open-source*) untuk memajukan pemerataan pendidikan digital di wilayah 3T (Tertinggal, Terdepan, Terluar) Indonesia.

---

## 🧭 Cara Berkontribusi

Anda dapat berkontribusi dalam berbagai bentuk:
1. **Pendidikan & Kurikulum**: Menambahkan modul pelajaran sains kepulauan, studi kasus lokal (misal: NTT, Maluku, Papua, Natuna), atau kuis latihan.
2. **Kamus Dialek Lisan (`INDONESIAN_DIALECT_MAP`)**: Memperkaya kosakata lisan dan dialek daerah agar pencocokan Q&A luring semakin cerdas.
3. **Rekayasa Perangkat Lunak**: Mengoptimalkan transfer WebRTC SCTP, efisiensi SQLite WAL, atau kalkulator sains interaktif.
4. **Dokumentasi & Terjemahan**: Memperbaiki panduan instalasi di Raspberry Pi atau panduan guru di sekolah pedalaman.

---

## 🛠️ Alur Pengembangan Lokal

### 1. Prasyarat
* [Node.js](https://nodejs.org/) v20+
* Git

### 2. Fork & Clone
```bash
git clone https://github.com/<username>/RuangPIntar.git
cd RuangPIntar
npm install
```

### 3. Salin Lingkungan Pengembangan
```bash
cp .env.example .env
```

### 4. Menjalankan Server Lokal
```bash
npm run dev
```
Buka browser pada `http://localhost:3000`.

---

## 🧪 Pengujian Kualitas Kode (Quality Gate)

Sebelum mengajukan *Pull Request*, pastikan seluruh verifikasi berhasil tanpa error:

```bash
# Jalankan seluruh pengecekan (TypeScript lint + Unit test + Build PWA)
npm run check
```

Atau secara terpisah:
```bash
# 1. Pengecekan tipe data
npm run lint

# 2. Pengujian unit & integrasi (20+ tests)
npm test

# 3. Pengujian kompilasi produksi Vite
npm run build
```

---

## 📚 Format Menambahkan Modul Baru

Modul pembelajaran tersimpan di [`src/utils/seedData.ts`](src/utils/seedData.ts). Setiap modul memiliki format:

```typescript
{
  id: 'mod-nama-pelajaran',
  code: 'FIS-3T-07',
  title: 'Judul Modul Kontekstual Wilayah',
  subject: 'Fisika Terapan' | 'Biologi Pesisir' | 'Matematika Maritim' | 'Teknik Energi',
  gradeLevel: 'SMA / SMK Kelas 10',
  schoolOrigin: 'Nama Sekolah Daerah 3T',
  imageUrl: '/assets/images/...',
  totalChunks: 16,
  sections: [
    {
      title: 'Bab 1: Konsep Alam',
      content: 'Teks bacaan format Markdown...',
      interactiveCalculatorId: 'optional_inline_calc_id'
    }
  ],
  checkpoints: [
    {
      question: 'Pertanyaan pemahaman konsep?',
      options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
      correctAnswerIndex: 0,
      explanation: 'Penjelasan ilmiah...'
    }
  ]
}
```

---

## 💬 Standar Commit & Pull Request

* Gunakan format pesan commit yang jelas:
  * `feat:` Fitur baru
  * `fix:` Perbaikan bug
  * `docs:` Perubahan dokumentasi
  * `test:` Penambahan atau perbaikan unit test
  * `refactor:` Restrukturisasi kode tanpa mengubah fungsionalitas
* Pastikan GitHub Actions CI melewati seluruh pengujian sebelum meminta review.
