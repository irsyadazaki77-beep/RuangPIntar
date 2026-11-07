import {
  normalizeQuestion,
  type LearningModule,
  type PeerNode,
  type CacheEntry,
  type ChunkTransferEvent,
} from './edgeEngine';

export const HERO_CLASSROOM_IMAGE = '/src/assets/images/hero_classroom_3t_1793880029303.jpg';

export const INITIAL_MODULES: LearningModule[] = [
  {
    id: 'mod-fisika-mikrohidro',
    code: 'FIS-XI-01',
    title: 'Pembangkit Listrik Tenaga Mikrohidro (PLTMH) Mandiri Desa',
    subject: 'Fisika Terapan',
    gradeLevel: 'Kelas XI SMA / SMK Teknik',
    authorTeacher: 'Ibu Wilhelmina K., S.Pd.',
    schoolOrigin: 'SMAN 1 Kalabahi — Kab. Alor, NTT',
    sizeMB: 38.4,
    totalChunks: 16,
    chunkSizeKB: 2457,
    chunkHashes: [
      'a8f19c20', 'b4e02d11', 'c904fa32', 'd17b8e43',
      'e52a1954', 'f09c4b65', '1a88de76', '2b74cf87',
      '3c61ba98', '4d590ea9', '5e42fbba', '6f318ccb',
      '7a209ddc', '8b194eed', '9c083ffe', '0df7210f',
    ],
    mediaType: 'Video & Simulasi Interaktif',
    imageUrl: '/src/assets/images/module_microhydro_physics_1793880029053.jpg',
    summary:
      'Konversi energi potensial gravitasi air sungai pegunungan menjadi energi listrik tiga fasa menggunakan pipa pesat (penstock) dan turbin impuls Pelton untuk elektrifikasi sekolah dan desa di wilayah 3T.',
    sections: [
      {
        heading: '01. Prinsip Konversi Energi Hidrolik ke Mekanik',
        body: 'Air sungai pada ketinggian tertentu menyimpan energi potensial gravitasi. Ketika dialirkan melalui pipa pesat (penstock) menuju nosel turbin, tekanan hidrostatik berubah menjadi energi kinetik pancaran air berkecepatan tinggi yang memutar sudu-sudu runner turbin Pelton atau Crossflow.',
        formula: 'P_bersih = ρ · g · Q · H · η_total',
        keyTakeaway:
          'Daya listrik berbanding lurus dengan debit aliran sungai (Q) dan tinggi jatuh efektif (H). Menggandakan tinggi jatuh air akan menggandakan potensi daya tanpa menambah volume air.',
        visualSchemaTitle: 'Rantai Transformasi Energi PLTMH',
        visualSteps: [
          'Bendung & Intake Sungai (Energi Potensial E_p = m·g·H)',
          'Pipa Pesat / Penstock (Tekanan Hidrostatik P = ρ·g·H)',
          'Pancaran Nosel & Turbin Pelton (Energi Kinetik Rotasi RPM)',
          'Generator Sinkron 3-Fasa (Energi Listrik AC 220V / 50Hz)',
        ],
        calculator: {
          id: 'hydro_power',
          title: 'Kalkulator Daya Listrik Bersih PLTMH',
          resultLabel: 'Keluaran Daya Listrik Bersih',
          resultUnit: 'kW',
          variables: [
            { key: 'qLps', label: 'Debit Aliran (Q)', unit: 'L/s', min: 15, max: 150, step: 5, defaultValue: 60 },
            { key: 'headM', label: 'Tinggi Jatuh (H)', unit: 'm', min: 5, max: 60, step: 1, defaultValue: 20 },
            { key: 'etaPct', label: 'Efisiensi Sistem (η)', unit: '%', min: 50, max: 85, step: 1, defaultValue: 75 },
          ],
        },
      },
      {
        heading: '02. Perancangan Pipa Pesat (Penstock) & Kehilangan Tekanan',
        body: 'Dalam instalasi lapangan di pegunungan, gesekan antara air dengan dinding bagian dalam pipa HDPE atau baja menyebabkan kehilangan tinggi tekan (head loss). Pemilihan diameter pipa yang memadai menjaga kecepatan aliran tetap efisien (idealnya 1,5 – 3,0 m/s) dan mencegah kavitasi serta efek pukulan air (water hammer) pada nosel.',
        formula: 'H_efektif = H_kotor - h_gesekan (Darcy-Weisbach)',
        keyTakeaway:
          'Sudut kemiringan penstock dan saringan sampah (trash rack) pada bak penenang (forebay) wajib dibersihkan secara berkala agar debit Q tidak turun drastis saat musim hujan.',
        visualSchemaTitle: 'Anatomi Hidrolika Saluran Pembawa ke Rumah Pembangkit',
        visualSteps: [
          'Saluran Pembawa (Headrace) mengendapkan pasir halus',
          'Bak Penenang (Forebay) + Saringan Trash Rack menjaga aliran bebas udara',
          'Pipa Pesat (Penstock) menahan tekanan internal menuju lembah',
          'Katup Utama & Nosel mengarahkan jet air presisi ke sudu turbin',
        ],
        calculator: {
          id: 'penstock_head',
          title: 'Kalkulator Tinggi Jatuh Efektif (Net Head)',
          resultLabel: 'Tinggi Jatuh Efektif (H_efektif)',
          resultUnit: 'meter',
          variables: [
            { key: 'hGross', label: 'Tinggi Kotor (H_kotor)', unit: 'm', min: 10, max: 80, step: 1, defaultValue: 25 },
            { key: 'lossPct', label: 'Rugi Gesekan Pipa', unit: '%', min: 2, max: 25, step: 1, defaultValue: 8 },
          ],
        },
      },
      {
        heading: '03. Stabilisasi Tegangan & Pembagian Beban Komunitas',
        body: 'Berbeda dengan jaringan PLN interkoneksi besar, turbin mikrohidro desa bekerja pada putaran konstan yang diatur oleh Electronic Load Controller (ELC). Jika warga mematikan lampu di siang hari, ELC mengalihkan kelebihan daya ke beban komplemen (pemanas air atau pengering hasil panen) agar frekuensi tetap stabil di 50 Hz.',
        formula: 'f = (N_rpm · P_kutub) / 120 = 50 Hz',
        keyTakeaway:
          'Electronic Load Controller (ELC) menjaga putaran generator tetap 1500 RPM (untuk 4 kutub) sehingga peralatan elektronik sekolah aman dari lonjakan tegangan.',
        visualSchemaTitle: 'Keseimbangan Beban ELC (Electronic Load Controller)',
        visualSteps: [
          'Daya Generator Konstan (P_gen = 10 kW pada 1500 RPM)',
          'Sensor Frekuensi mendeteksi kenaikan > 50,2 Hz saat lampu rumah dimatikan',
          'Triac/Thyristor ELC mengalirkan daya sisa ke Ballast Heater secara instan',
          'Tegangan Kelas & Desa tetap aman pada 220V AC ± 2%',
        ],
        calculator: {
          id: 'elc_frequency',
          title: 'Simulasi Penyeimbang Beban ELC 50 Hz',
          resultLabel: 'Status Frekuensi & Daya Ballast',
          resultUnit: 'Hz',
          variables: [
            { key: 'pGenKW', label: 'Daya Generator Konstan', unit: 'kW', min: 5, max: 25, step: 0.5, defaultValue: 12 },
            { key: 'pVillageKW', label: 'Beban Pakai Warga & Sekolah', unit: 'kW', min: 1, max: 20, step: 0.5, defaultValue: 7.5 },
          ],
        },
      },
    ],
    caseStudy: {
      title: 'Kemandirian Listrik & Pengering Kopi Komunitas di Lembah Pegunungan Alor',
      location: 'Desa Taramana, Kec. Alor Timur Laut — Kab. Alor, NTT',
      challenge:
        'Topografi lembah curam membuat jaringan kabel tegangan menengah sulit menjangkau desa. Sekolah membutuhkan listrik stabil untuk 15 laptop dan router pembelajaran lokal, sementara warga memerlukan pengering hasil panen kopi dan kemiri.',
      solution:
        'Pemasangan turbin Crossflow lokal berkapasitas 14,5 kW memanfaatkan sungai pegunungan berdebit 75 L/detik dan tinggi jatuh efektif 26 meter, dilengkapi panel ELC yang terhubung ke ruang pengering hasil tani saat jam belajar usai.',
      impactMetrics: [
        '14,5 kW Listrik Bersih 24 Jam (0 Liter Solar/Tahun)',
        '32 Rumah Tangga + 1 Lab Komputer Sekolah Terlistriki',
        'Penghematan Biaya Solar Komunitas Rp 68 Juta/Tahun',
      ],
    },
    glossary: [
      {
        term: 'Head Efektif (H_net)',
        symbolOrUnit: 'meter (m)',
        definition: 'Selisih ketinggian vertikal antara permukaan air di bak penenang dengan nosel turbin setelah dikurangi rugi gesekan pipa.',
      },
      {
        term: 'Pipa Pesat (Penstock)',
        symbolOrUnit: 'HDPE / Baja',
        definition: 'Pipa bertekanan tinggi yang menyalurkan air dari bak penenang (forebay) menuruni lereng menuju turbin.',
      },
      {
        term: 'Electronic Load Controller (ELC)',
        symbolOrUnit: 'Hz / kW',
        definition: 'Pengendali beban elektronik yang menjaga frekuensi generator tetap 50 Hz dengan membuang kelebihan daya ke pemanas komplemen (ballast).',
      },
      {
        term: 'Kavitasi Hidrolik',
        symbolOrUnit: 'Tekanan Uap',
        definition: 'Terbentuknya gelembung uap air akibat penurunan tekanan lokal ekstrem yang dapat mengikis permukaan logam sudu turbin.',
      },
    ],
    guidedExercises: [
      {
        id: 'ex-pltmh-1',
        title: 'Perencanaan Kapasitas PLTMH untuk Sekolah & Pos Kesehatan Desa',
        scenarioContext:
          'Tim siswa SMK Teknik diminta menghitung kelayakan sungai lokal di Alor yang memiliki debit kemarau Q = 80 Liter/detik dan tinggi jatuh kotor 25 meter (rugi gesekan pipa 8%). Efisiensi total turbin-generator adalah 74%.',
        givenData: [
          'Debit aliran sungai Q = 80 L/s = 0,08 m³/detik',
          'Tinggi jatuh kotor H_kotor = 25 m (rugi gesekan 8%)',
          'Efisiensi sistem η_total = 74% = 0,74',
          'Percepatan gravitasi g = 9,81 m/s² dan ρ_air = 1.000 kg/m³',
        ],
        steps: [
          {
            stepTitle: 'Langkah 1: Hitung Tinggi Jatuh Efektif (H_efektif)',
            formulaOrHint: 'H_efektif = H_kotor × (1 - 0,08)',
            calculationResult: 'H_efektif = 25 m × 0,92 = 23,0 meter',
          },
          {
            stepTitle: 'Langkah 2: Hitung Daya Hidrolik Teoritis Air (P_teoritis)',
            formulaOrHint: 'P_teoritis = ρ × g × Q × H_efektif',
            calculationResult: 'P_teoritis = 1.000 × 9,81 × 0,08 × 23,0 = 18.050 Watt (18,05 kW)',
          },
          {
            stepTitle: 'Langkah 3: Hitung Daya Listrik Bersih Generator (P_bersih)',
            formulaOrHint: 'P_bersih = P_teoritis × η_total',
            calculationResult: 'P_bersih = 18,05 kW × 0,74 = 13,36 kW',
          },
        ],
        finalConclusion:
          'Daya listrik bersih sebesar 13,36 kW mencukupi untuk menyalakan laboratorium komputer sekolah (2,5 kW), puskesmas pembantu (1,5 kW), serta 20 rumah warga desa (@ 450 VA) secara bersamaan.',
      },
    ],
    simulationType: 'microhydro',
    checkpoints: [
      {
        question:
          'Jika sebuah sungai desa memiliki debit Q = 60 Liter/detik (0,06 m³/s), tinggi jatuh efektif H = 20 meter, percepatan gravitasi g = 9,81 m/s², dan efisiensi sistem total η = 75%, berapakah daya listrik bersih yang dihasilkan?',
        options: [
          '8,83 kW (cukup untuk ~19 rumah tangga desa)',
          '11,77 kW (tanpa memperhitungkan kerugian efisiensi)',
          '4,50 kW (setengah kapasitas teoritis)',
          '18,20 kW (melebihi energi potensial air)',
        ],
        correctIndex: 0,
        explanation:
          'P_teoritis = 1000 × 9,81 × 0,06 × 20 = 11,772 kW. Dikalikan efisiensi total 0,75 menghasilkan daya listrik bersih 8,83 kW.',
        difficulty: 'Menengah',
      },
      {
        question:
          'Mengapa instalasi PLTMH desa mandiri memerlukan Electronic Load Controller (ELC) pada panel utama?',
        options: [
          'Untuk menjaga frekuensi listrik tetap stabil di 50 Hz saat pemakaian warga berubah-ubah',
          'Untuk menaikkan debit air sungai secara otomatis saat musim kemarau',
          'Untuk menggantikan fungsi kincir turbin dengan baterai litium',
          'Untuk menyedot kuota internet dari satelit ke ruang kelas',
        ],
        correctIndex: 0,
        explanation:
          'Karena debit air yang masuk ke turbin konstan, beban listrik total pada generator harus dijaga konstan oleh ELC agar putaran RPM dan frekuensi 50 Hz tidak melonjak.',
        difficulty: 'Dasar',
      },
      {
        question:
          'Apa yang terjadi pada daya keluaran PLTMH apabila saringan bak penenang (forebay trash rack) tersumbat serasah daun hingga debit air turun menjadi separuhnya?',
        options: [
          'Daya listrik bersih turun menjadi 50% dari kapasitas semula karena P berbanding lurus dengan debit Q',
          'Daya listrik tetap sama karena tinggi pipa pesat tidak berubah',
          'Frekuensi generator otomatis naik menjadi 100 Hz',
          'Tekanan hidrostatik meningkat dua kali lipat di ujung nosel',
        ],
        correctIndex: 0,
        explanation:
          'Berdasarkan persamaan P = ρ·g·Q·H·η, penurunan debit Q sebesar 50% akan langsung menurunkan daya keluaran sebesar 50%.',
        difficulty: 'Analitis Lapangan',
      },
    ],
    updatedAt: 'Dipublikasikan 07:30 WITA · Tersedia di 6 Simpul Lokal',
  },
  {
    id: 'mod-biologi-mangrove',
    code: 'BIO-XI-02',
    title: 'Ekologi Sabuk Hutan Mangrove & Mitigasi Abrasi Pesisir Kepulauan',
    subject: 'Biologi Pesisir',
    gradeLevel: 'Kelas XI SMA',
    authorTeacher: 'Bapak Yosef Mandalika, M.Si.',
    schoolOrigin: 'SMAN 2 Kepulauan Aru — Maluku',
    sizeMB: 29.6,
    totalChunks: 16,
    chunkSizeKB: 1894,
    chunkHashes: [
      'm1029a01', 'm2938b02', 'm3847c03', 'm4756d04',
      'm5665e05', 'm6574f06', 'm7483a07', 'm8392b08',
      'm9201c09', 'm0110d10', 'ma221e11', 'mb332f12',
      'mc443a13', 'md554b14', 'me665c15', 'mf776d16',
    ],
    mediaType: 'Video & Simulasi Interaktif',
    imageUrl: '/src/assets/images/module_mangrove_biology_1793880031385.jpg',
    summary:
      'Analisis struktur akar tunjang Rhizophora, redaman energi gelombang pasang, zona asuhan juvenil ikan karang, serta perhitungan sekuestrasi karbon biru (blue carbon) pada sedimen lumpur anaerob.',
    sections: [
      {
        heading: '01. Zonasi Spesies & Adaptasi Fisiologis Salinitas Tinggi',
        body: 'Hutan mangrove pesisir kepulauan memiliki zonasi tegas dari arah laut ke darat: Avicennia dan Sonneratia di garis terdepan berpasir dengan akar napas (pneumatofora), diikuti Rhizophora dengan akar tunjang rapat di zona pasang surut berlumpur, hingga Bruguiera di zona payau belakang.',
        formula: 'E_transmisi = E_datang · exp(-k · Lebar_Sabuk · Kerapatan_Akar)',
        keyTakeaway:
          'Jaringan akar tunjang Rhizophora bekerja sebagai pemecah gelombang biologis yang meluruhkan hingga 85% energi kinetik ombak sebelum mencapai pemukiman pesisir.',
        visualSchemaTitle: 'Gradien Zonasi Ekosistem Mangrove (Laut ke Darat)',
        visualSteps: [
          'Zona Terdepan (Avicennia & Sonneratia): Substrat lumpur berpasir, akar napas vertikal',
          'Zona Tengah (Rhizophora apiculata/mucronata): Akar tunjang menjalin perisai gelombang',
          'Zona Belakang (Bruguiera & Xylocarpus): Akar lutut pada tanah lempung payau',
          'Zona Transisi Darat (Nypa fruticans): Tepi muara sungai berair payau-tawar',
        ],
        calculator: {
          id: 'mangrove_wave',
          title: 'Kalkulator Redaman Energi Ombak oleh Sabuk Mangrove',
          resultLabel: 'Redaman Energi Gelombang',
          resultUnit: '%',
          variables: [
            { key: 'widthM', label: 'Lebar Sabuk Hutan', unit: 'm', min: 15, max: 200, step: 5, defaultValue: 85 },
            { key: 'density', label: 'Kerapatan Pohon', unit: 'phn/100m²', min: 10, max: 60, step: 2, defaultValue: 30 },
          ],
        },
      },
      {
        heading: '02. Penyimpanan Karbon Biru (Blue Carbon) pada Sedimen Anaerob',
        body: 'Berbeda dengan hutan daratan tropis yang menyimpan mayoritas karbon pada biomassa batang pohon, ekosistem mangrove mengunci hingga 75% cadangan karbonnya di dalam lapisan tanah berlumpur yang miskin oksigen (anoksik), sehingga dekomposisi organik berlangsung sangat lambat selama ratusan tahun.',
        formula: 'C_total (ton/ha) = C_biomassa_atas + C_akar_bawah + C_sedimen_anoksik',
        keyTakeaway:
          'Satu hektare hutan mangrove sehat di kepulauan Indonesia mampu menyerap dan menyimpan karbon 4 hingga 5 kali lebih besar dibanding hutan hujan daratan dengan luas yang sama.',
        visualSchemaTitle: 'Mekanisme Penguncian Karbon Biru Bawah Permukaan',
        visualSteps: [
          'Fotosintesis Tajuk Daun menyerap CO₂ atmosfer secara intensif',
          'Guguran Serasah & Akar terjebak di matriks akar tunjang saat air pasang',
          'Sedimen Lumpur Pasang Surut menutup akses oksigen bebas (Kondisi Anoksik)',
          'Dekomposisi bakteri terhambat → Karbon terkunci ratusan tahun di lapisan gambut pesisir',
        ],
        calculator: {
          id: 'blue_carbon',
          title: 'Kalkulator Sekuestrasi Karbon Biru Tahunan',
          resultLabel: 'Total Serapan Karbon',
          resultUnit: 'ton CO₂e/thn',
          variables: [
            { key: 'areaHa', label: 'Luas Hutan Mangrove', unit: 'ha', min: 1, max: 100, step: 1, defaultValue: 15 },
            { key: 'sedimentPct', label: 'Porsi Karbon Sedimen', unit: '%', min: 65, max: 85, step: 1, defaultValue: 76 },
          ],
        },
      },
      {
        heading: '03. Fungsi Bio-Ekologis Nursery Ground & Produktivitas Perikanan',
        body: 'Celah-celah rapat di antara akar tunjang Rhizophora menciptakan perairan tenang yang kaya detritus organik sekaligus terlindung dari predator besar. Sekitar 80% spesies ikan karang dan krustasea komersial (kepiting bakau Scylla serrata, udang penaeid, dan kakap) menghabiskan fase juvenil di ekosistem mangrove sebelum bermigrasi ke terumbu karang.',
        formula: 'B_ikan (kg/thn) ≈ Luas_Ha × Indeks_Detritus × Kepadatan_Akar',
        keyTakeaway:
          'Menjaga 1 hektare sabuk mangrove tetap utuh menghasilkan tangkapan perikanan pesisir berkelanjutan hingga 420–650 kg/tahun bagi nelayan lokal.',
        visualSchemaTitle: 'Rantai Makanan Detritus Pesisir Kepulauan',
        visualSteps: [
          'Serasah daun mangrove diurai oleh jamur dan bakteri halofilik',
          'Detritus kaya protein dimakan oleh moluska, udang kecil, dan kepiting bakau',
          'Juvenil ikan karang berlindung di sela akar tunjang dari predator',
          'Ikan dewasa bermigrasi ke terumbu karang menjadi sumber tangkapan nelayan desa',
        ],
      },
    ],
    caseStudy: {
      title: 'Rehabilitasi Sabuk Hijau & Kebangkitan Kepiting Bakau di Dobo',
      location: 'Pesisir Pulau Wamar, Dobo — Kab. Kepulauan Aru, Maluku',
      challenge:
        'Pembukaan lahan pesisir menyebabkan gelombang pasang musim barat menggerus bibir pantai sejauh 12 meter dan menurunkan hasil tangkapan kepiting bakau nelayan tradisional.',
      solution:
        'Siswa SMAN 2 Kepulauan Aru bersama masyarakat adat menanam 18.000 propagul Rhizophora mucronata dengan teknik rumpun berjarak rapat di sepanjang 1,8 km garis pantai.',
      impactMetrics: [
        'Redaman Gelombang Pasang Mencapai 84% pada Tahun ke-3',
        'Serapan Karbon Biru ~310 Ton CO₂e per Tahun',
        'Peningkatan Hasil Panen Kepiting Bakau Warga +65%',
      ],
    },
    glossary: [
      {
        term: 'Pneumatofora',
        symbolOrUnit: 'Akar Napas',
        definition: 'Akar vertikal berbentuk pensil atau kerucut pada Avicennia dan Sonneratia yang muncul ke atas lumpur untuk menyerap oksigen saat surut.',
      },
      {
        term: 'Propagul (Vivipar)',
        symbolOrUnit: 'Bibit Mangrove',
        definition: 'Buah mangrove Rhizophora yang telah berkecambah selagi masih menempel di pohon induk agar siap menancap di substrat berlumpur.',
      },
      {
        term: 'Sedimen Anoksik',
        symbolOrUnit: 'O₂ ≈ 0 mg/L',
        definition: 'Lapisan tanah lumpur jenuh air yang hampir tidak memiliki oksigen terlarut sehingga memperlambat pelepasan karbon kembali ke udara.',
      },
      {
        term: 'Ultrafiltrasi Akar',
        symbolOrUnit: 'Eksklusi NaCl',
        definition: 'Kemampuan membran sel akar Rhizophora menyaring hingga 90% garam air laut sehingga air yang naik ke pembuluh xilem hampir tawar.',
      },
    ],
    guidedExercises: [
      {
        id: 'ex-mangrove-1',
        title: 'Evaluasi Sabuk Pelindung Pantai & Cadangan Karbon Desa Pesisir',
        scenarioContext:
          'Desa pesisir di Kepulauan Aru memiliki garis pantai sepanjang 2,0 km dengan lebar sabuk mangrove rata-rata 90 meter dan kerapatan 30 pohon/100 m².',
        givenData: [
          'Panjang garis pantai L = 2,0 km = 2.000 meter',
          'Lebar sabuk mangrove W = 90 meter',
          'Laju serapan karbon rata-rata = 18,5 ton CO₂e / hektare / tahun',
        ],
        steps: [
          {
            stepTitle: 'Langkah 1: Hitung Luas Total Sabuk Mangrove dalam Hektare (ha)',
            formulaOrHint: 'Luas (ha) = (Panjang_m × Lebar_m) / 10.000',
            calculationResult: 'Luas = (2.000 m × 90 m) / 10.000 = 18,0 hektare',
          },
          {
            stepTitle: 'Langkah 2: Hitung Serapan Karbon Biru Tahunan',
            formulaOrHint: 'C_tahunan = Luas_ha × 18,5 ton CO₂e/ha/thn',
            calculationResult: 'C_tahunan = 18,0 × 18,5 = 333,0 ton CO₂e/tahun',
          },
          {
            stepTitle: 'Langkah 3: Hitung Porsi Karbon yang Terkunci di Sedimen Lumpur (75%)',
            formulaOrHint: 'C_sedimen = C_tahunan × 0,75',
            calculationResult: 'C_sedimen = 333,0 × 0,75 = 249,75 ton CO₂e/tahun',
          },
        ],
        finalConclusion:
          'Sabuk mangrove seluas 18 hektare tersebut menyerap 333 ton CO₂e setiap tahun dan meredam lebih dari 72% energi gelombang pasang.',
      },
    ],
    simulationType: 'mangrove',
    checkpoints: [
      {
        question:
          'Zona perakaran mangrove manakah yang berada di garis pantai paling depan berhadapan langsung dengan hempasan ombak dan memiliki akar napas vertikal (pneumatofora)?',
        options: [
          'Avicennia dan Sonneratia',
          'Nypa fruticans (Nipah air tawar)',
          'Tanaman pinus pegunungan',
          'Lumut kerak litofit',
        ],
        correctIndex: 0,
        explanation:
          'Avicennia dan Sonneratia memiliki sistem akar napas (pneumatofora) yang muncul ke permukaan substrat untuk mengambil oksigen saat pasang surut.',
        difficulty: 'Dasar',
      },
      {
        question:
          'Mengapa lapisan lumpur hutan mangrove mampu menyimpan cadangan karbon biru selama ratusan tahun tanpa terlepas cepat menjadi gas CO₂?',
        options: [
          'Kondisi tanah tergenang yang anoksik (miskin oksigen) menghambat laju pembusukan organik oleh bakteri',
          'Air laut mengubah seluruh daun menjadi batu kapur dalam waktu satu malam',
          'Pohon mangrove tidak melakukan respirasi seluler',
          'Gelombang pasang memantulkan gas karbon kembali ke dasar palung laut',
        ],
        correctIndex: 0,
        explanation:
          'Tanah berlumpur yang jenuh air pasang bersifat anaerob/anoksik sehingga dekomposisi mikroba berjalan sangat lambat.',
        difficulty: 'Menengah',
      },
      {
        question:
          'Bagaimana dampak ekologis langsung apabila sabuk mangrove di muara pulau ditebang habis untuk tambak terbuka?',
        options: [
          'Hilangnya zona asuhan (nursery ground) juvenil ikan karang dan meningkatnya laju abrasi garis pantai',
          'Bertambahnya populasi kepiting bakau secara permanen',
          'Menurunnya salinitas air laut di sekitar terumbu karang',
          'Meningkatnya cadangan karbon sedimen bawah tanah',
        ],
        correctIndex: 0,
        explanation:
          'Penebangan mangrove menghilangkan pelindung fisik gelombang sekaligus merusak habitat pembesaran anakan ikan dan kepiting.',
        difficulty: 'Analitis Lapangan',
      },
    ],
    updatedAt: 'Dipublikasikan 08:05 WITA · Tersedia di 5 Simpul Lokal',
  },
  {
    id: 'mod-matematika-navigasi',
    code: 'MAT-XI-03',
    title: 'Trigonometri Bola, Arus Monsun & Navigasi Astronomi Nusantara',
    subject: 'Matematika Maritim',
    gradeLevel: 'Kelas XI SMA / SMK Pelayaran',
    authorTeacher: 'Bapak La Ode Hasanuddin, S.Pd.',
    schoolOrigin: 'SMKN 1 Wakatobi — Sulawesi Tenggara',
    sizeMB: 22.8,
    totalChunks: 16,
    chunkSizeKB: 1459,
    chunkHashes: [
      'n901a001', 'n902b002', 'n903c003', 'n904d004',
      'n905e005', 'n906f006', 'n907a007', 'n908b008',
      'n909c009', 'n910d010', 'n911e011', 'n912f012',
      'n913a013', 'n914b014', 'n915c015', 'n916d016',
    ],
    mediaType: 'Modul Teks & Diagram',
    imageUrl: '/src/assets/images/module_archipelago_navigation_1793880031828.jpg',
    summary:
      'Penerapan aturan sinus-kosinus segitiga pelayaran, vektor resultan arus lintas Indonesia (Arlindo), dan penentuan lintang kapal menggunakan sudut elevasi bintang Pari Selatan (Crux).',
    sections: [
      {
        heading: '01. Resultan Vektor Haluan Kapal Terhadap Arus Selat',
        body: 'Ketika perahu layar atau kapal kayu menyeberangi selat antar-pulau dengan kecepatan air v_kapal pada sudut haluan θ, arus laut lintas kepulauan (v_arus) akan menggeser lintasan aktual kapal. Penentuan sudut koreksi haluan menggunakan penjumlahan vektor dua dimensi dan aturan kosinus.',
        formula: '|v_aktual| = √(v_kapal² + v_arus² + 2 · v_kapal · v_arus · cos Δθ)',
        keyTakeaway:
          'Nakhoda harus mengarahkan haluan kapal menyerong melawan komponen arus selat sebesar sudut koreksi α = arcsin((v_arus · sin φ) / v_kapal) agar tiba tepat di dermaga tujuan.',
        visualSchemaTitle: 'Geometri Segitiga Vektor Kecepatan Pelayaran Selat',
        visualSteps: [
          'Vektor v_kapal: Kecepatan dorong mesin/layar terhadap massa air',
          'Vektor v_arus: Kecepatan geser arus pasang-surut selat (tegak lurus/menyudut)',
          'Sudut Koreksi Haluan α = arcsin(v_arus / v_kapal) diarahkan ke hulu arus',
          'Vektor Resultan v_efektif = √(v_kapal² - v_arus²) menuju lurus ke Dermaga Tujuan',
        ],
        calculator: {
          id: 'vector_drift',
          title: 'Kalkulator Sudut Koreksi Haluan & Laju Lintas Selat',
          resultLabel: 'Sudut Koreksi & Laju Efektif',
          resultUnit: 'derajat / knot',
          variables: [
            { key: 'vBoat', label: 'Kecepatan Kapal (v_kapal)', unit: 'knot', min: 5, max: 16, step: 0.5, defaultValue: 10 },
            { key: 'vCurrent', label: 'Kecepatan Arus (v_arus)', unit: 'knot', min: 0.5, max: 4.5, step: 0.5, defaultValue: 3.5 },
          ],
        },
      },
      {
        heading: '02. Penentuan Posisi Lintang dari Elevasi Bintang',
        body: 'Pada pelayaran malam tanpa sinyal GPS di perairan terluar, pengukuran sudut tinggi bintang kutub atau rasi Crux (Pari Selatan / Gubuk Penceng) di atas cakrawala menggunakan busur sekstan memungkinkan perhitungan lintang geografis kapal secara akurat.',
        formula: 'Lintang φ ≈ 90° - Jarak_Zenith + Deklinasi_Bintang δ',
        keyTakeaway:
          'Trigonometri bola menghubungkan posisi benda langit pada bola langit dengan koordinat lintang dan bujur pengamat di permukaan laut.',
        visualSchemaTitle: 'Proyeksi Sudut Elevasi Rasi Bintang Crux (Pari Selatan)',
        visualSteps: [
          'Tarik garis imajiner 4,5 kali panjang sumbu utama rasi Crux ke arah cakrawala selatan',
          'Titik potong tegak lurus menunjukkan arah Kutub Selatan Langit (South Celestial Pole)',
          'Ukur sudut tinggi bintang Acrux (α Crucis, δ = -63,1°) saat melintasi meridian atas',
          'Hitung lintang kapal φ dari komplemen sudut elevasi dikoreksi deklinasi bintang',
        ],
        calculator: {
          id: 'star_latitude',
          title: 'Kalkulator Lintang Astronomi Bintang Acrux',
          resultLabel: 'Koordinat Lintang Kapal',
          resultUnit: 'Derajat LS',
          variables: [
            { key: 'zenithDeg', label: 'Jarak Zenith Terukur (z)', unit: '°', min: 15, max: 40, step: 0.5, defaultValue: 32.4 },
            { key: 'declinationDeg', label: 'Deklinasi Bintang (δ)', unit: '°', min: -65, max: -55, step: 0.1, defaultValue: -63.1 },
          ],
        },
      },
      {
        heading: '03. Perhitungan Jarak Lingkaran Besar (Orthodrom) & Mil Laut',
        body: 'Satu mil laut (Nautical Mile / NM = 1.852 meter) didefinisikan secara presisi sebagai panjang busur satu menit (1/60 derajat) garis lintang pada permukaan bola bumi. Dengan demikian, selisih lintang dan bujur antara dua pulau dapat langsung dikonversi menjadi jarak tempuh pelayaran menggunakan aturan kosinus segitiga bola.',
        formula: 'Jarak (NM) = 60 × arccos(sin φ₁ sin φ₂ + cos φ₁ cos φ₂ cos Δλ)',
        keyTakeaway:
          'Konversi 1 derajat busur meridian = 60 Mil Laut (NM) memudahkan mualim kapal menghitung estimasi waktu tiba (ETA) secara cepat menggunakan mistar jajar di peta laut.',
        visualSchemaTitle: 'Konversi Busur Geografis ke Satuan Mil Laut (NM)',
        visualSteps: [
          '1° Lintang = 60 Menit Busur (60\') = 60 Mil Laut (111,12 km)',
          '1\' (Satu Menit Busur) = 1 Mil Laut (Nautical Mile) = 1.852 meter',
          'Kecepatan 1 Knot = Tempuhan 1 Mil Laut per Jam',
          'Waktu Tempuh (Jam) = Jarak Selat (NM) / Kecepatan Efektif (Knot)',
        ],
      },
    ],
    caseStudy: {
      title: 'Koreksi Haluan Perahu Antarpulau Wangi-Wangi – Kaledupa Saat Monsun Timur',
      location: 'Selat Kaledupa — Kab. Wakatobi, Sulawesi Tenggara',
      challenge:
        'Arus pasang-surut yang menyempit di antara gugusan atol Wakatobi mencapai kecepatan 3,5 hingga 4,2 knot, sering kali menyeret kapal transportasi pelajar dan hasil laut melenceng jauh ke arah Laut Banda bila tidak dikoreksi secara trigonometris.',
      solution:
        'Taruna SMKN 1 Wakatobi menyusun tabel sudut koreksi haluan berbasis kecepatan kapal (8–12 knot) dan fase arus pasang harian untuk ditempel di ruang kemudi kapal kayu antarpulau.',
      impactMetrics: [
        'Penghematan Bahan Bakar Solar Kapal 18% per Penyeberangan',
        'Akurasi Ketibaan Dermaga Meningkat dengan Deviasi < 150 Meter',
        'Digunakan oleh 24 Nakhoda Perahu Penyeberangan Antarpulau',
      ],
    },
    glossary: [
      {
        term: 'Mil Laut (Nautical Mile)',
        symbolOrUnit: '1 NM = 1.852 m',
        definition: 'Satuan jarak pelayaran yang setara dengan panjang busur 1 menit (1/60 derajat) garis lintang bumi.',
      },
      {
        term: 'Knot (Kecepatan Maritim)',
        symbolOrUnit: '1 NM / jam',
        definition: 'Satuan kecepatan kapal atau arus laut yang bernilai satu mil laut per jam (setara ~0,514 m/detik).',
      },
      {
        term: 'Sudut Haluan (Heading)',
        symbolOrUnit: 'Derajat (000°–360°)',
        definition: 'Arah menunjuknya haluan lunas kapal diukur searah jarum jam dari arah Utara sejati atau magnetik.',
      },
      {
        term: 'Deklinasi Bintang (δ)',
        symbolOrUnit: 'Derajat Langit',
        definition: 'Sudut jarak benda langit diukur ke arah utara (+) atau selatan (-) dari ekuator langit, analog dengan garis lintang di bumi.',
      },
    ],
    guidedExercises: [
      {
        id: 'ex-navigasi-1',
        title: 'Menentukan Sudut Koreksi & Waktu Tempuh Lintas Selat Kaledupa',
        scenarioContext:
          'Sebuah kapal kayu pelajar menyeberangi selat selebar 12 Mil Laut (NM) dengan kecepatan mesin terhadap air v_kapal = 10 knot. Arus selat mengalir tegak lurus dari samping dengan kecepatan v_arus = 6 knot.',
        givenData: [
          'Lebar selat d = 12 Mil Laut (NM)',
          'Kecepatan kapal terhadap air v_kapal = 10 knot',
          'Kecepatan arus samping v_arus = 6 knot',
        ],
        steps: [
          {
            stepTitle: 'Langkah 1: Hitung Sudut Koreksi Haluan (α) Melawan Arus',
            formulaOrHint: 'sin(α) = v_arus / v_kapal',
            calculationResult: 'sin(α) = 6 / 10 = 0,6 → α = arcsin(0,6) ≈ 36,87° melawan arah arus',
          },
          {
            stepTitle: 'Langkah 2: Hitung Kecepatan Lintas Efektif Menuju Dermaga (v_efektif)',
            formulaOrHint: 'v_efektif = √(v_kapal² - v_arus²)',
            calculationResult: 'v_efektif = √(10² - 6²) = √(100 - 36) = √64 = 8,0 knot',
          },
          {
            stepTitle: 'Langkah 3: Hitung Waktu Tempuh Penyeberangan (t)',
            formulaOrHint: 't = (d / v_efektif) × 60 menit',
            calculationResult: 't = (12 NM / 8,0 knot) × 60 = 1,5 jam = 90 menit',
          },
        ],
        finalConclusion:
          'Nakhoda wajib mengarahkan haluan menyerong 36,87° ke hulu arus sehingga kapal bergerak lurus ke dermaga seberang dengan kecepatan efektif 8 knot dan tiba tepat dalam 90 menit.',
      },
    ],
    simulationType: 'navigation',
    checkpoints: [
      {
        question:
          'Sebuah kapal berlayar ke arah Timur dengan kecepatan 8 knot, sementara arus selat mengalir ke arah Utara dengan kecepatan 6 knot. Berapakah kecepatan resultan kapal terhadap dasar laut?',
        options: [
          '10 knot (berdasarkan teorema Pythagoras √(8² + 6²))',
          '14 knot (penjumlahan skalar lurus)',
          '2 knot (pengurangan langsung)',
          '48 knot (perkalian kecepatan)',
        ],
        correctIndex: 0,
        explanation:
          'Karena arah Timur dan Utara saling tegak lurus (90°), besar vektor kecepatan resultan adalah √(8² + 6²) = √(64 + 36) = 10 knot.',
        difficulty: 'Dasar',
      },
      {
        question:
          'Jika sebuah kapal berkecepatan 8 knot ingin menyeberang lurus melintasi selat yang memiliki arus samping 4 knot, berapakah sudut koreksi haluan (α) yang harus diambil melawan arus?',
        options: [
          '30° melawan arah arus (karena arcsin(4/8) = arcsin(0,5) = 30°)',
          '45° searah arus selat',
          '60° berbalik arah ke dermaga asal',
          '0° tanpa perlu mengoreksi kemudi',
        ],
        correctIndex: 0,
        explanation:
          'sin(α) = v_arus / v_kapal = 4 / 8 = 0,5. Sudut yang nilai sinusnya 0,5 adalah 30°.',
        difficulty: 'Menengah',
      },
      {
        question:
          'Berapakah jarak dalam satuan Mil Laut (NM) antara dua pulau yang terletak pada garis bujur yang sama namun berbeda lintang sebesar 1,5 derajat?',
        options: [
          '90 Mil Laut (karena 1 derajat lintang = 60 Mil Laut)',
          '15 Mil Laut',
          '150 Mil Laut',
          '45 Mil Laut',
        ],
        correctIndex: 0,
        explanation:
          'Setiap 1 derajat busur lintang bernilai 60 NM, sehingga 1,5 × 60 = 90 Mil Laut.',
        difficulty: 'Analitis Lapangan',
      },
    ],
    updatedAt: 'Dipublikasikan 08:20 WITA · Tersedia di 4 Simpul Lokal',
  },
  {
    id: 'mod-energi-surya',
    code: 'TEK-XI-04',
    title: 'Sistem PLTS Off-Grid Atap Sekolah & Manajemen Baterai LiFePO4',
    subject: 'Teknik Energi',
    gradeLevel: 'Kelas XI SMK Teknik Energi Terbarukan',
    authorTeacher: 'Bapak Umbu Maramba, S.T.',
    schoolOrigin: 'SMKN 1 Waingapu — Sumba Timur, NTT',
    sizeMB: 31.2,
    totalChunks: 16,
    chunkSizeKB: 1996,
    chunkHashes: [
      's101a001', 's102b002', 's103c003', 's104d004',
      's105e005', 's106f006', 's107a007', 's108b008',
      's109c009', 's110d010', 's111e011', 's112f012',
      's113a013', 's114b014', 's115c015', 's116d016',
    ],
    mediaType: 'Video & Simulasi Interaktif',
    imageUrl: '/src/assets/images/module_solar_lifepo4_1794013783706.jpg',
    summary:
      'Perencanaan kapasitas panel fotovoltaik monokristalin, pelacakan titik daya maksimum (MPPT), dan perancangan bank baterai Litium Besi Fosfat (LiFePO4) untuk kemandirian listrik ruang kelas digital 3T.',
    sections: [
      {
        heading: '01. Konversi Fotovoltaik & Perhitungan Peak Sun Hours (PSH)',
        body: 'Wilayah kepulauan Nusa Tenggara Timur memiliki potensi radiasi surya tertinggi di Indonesia dengan nilai Peak Sun Hours (PSH) mencapai 5,0 hingga 5,8 jam/hari. Energi harian yang dipanen array panel surya ditentukan oleh kapasitas Watt-peak (Wp), durasi penyinaran efektif, dan faktor koreksi suhu serta efisiensi MPPT.',
        formula: 'E_harian (Wh) = P_panel (Wp) × PSH (jam) × η_sistem',
        keyTakeaway:
          'Sudut kemiringan panel surya di wilayah lintang selatan Indonesia (8°–10° LS) dioptimalkan menghadap Utara dengan sudut 10°–15° agar pencucian debu oleh air hujan tetap efektif.',
        visualSchemaTitle: 'Arsitektur PLTS Off-Grid Ruang Kelas Kepulauan',
        visualSteps: [
          'Array Panel Monokristalin (DC Tegangan Tinggi 60V–120V)',
          'Solar Charge Controller MPPT (Optimasi Arus Pengisian +25%)',
          'Bank Baterai LiFePO4 24V/48V dilengkapi BMS (Battery Management System)',
          'Inverter Pure Sine Wave 220V AC menyuplai Laptop Host Guru & Router WiFi',
        ],
        calculator: {
          id: 'solar_energy',
          title: 'Kalkulator Panen Energi Harian Panel Surya (PLTS)',
          resultLabel: 'Produksi Energi Harian',
          resultUnit: 'kWh/hari',
          variables: [
            { key: 'wp', label: 'Kapasitas Panel Surya', unit: 'Wp', min: 400, max: 3000, step: 100, defaultValue: 1400 },
            { key: 'psh', label: 'Peak Sun Hours (PSH)', unit: 'jam', min: 3.0, max: 6.5, step: 0.2, defaultValue: 5.4 },
          ],
        },
      },
      {
        heading: '02. Karakteristik Baterai LiFePO4 & Hari Otonomi (Autonomy Days)',
        body: 'Berbeda dengan aki timbal-asam (VRLA) yang hanya aman dikosongkan hingga Depth of Discharge (DoD) 50%, baterai Litium Besi Fosfat (LiFePO4) mampu bekerja aman pada DoD 80%–90% dengan usia pakai mencapai >4.000 siklus (lebih dari 10 tahun operasional di iklim tropis).',
        formula: 'C_baterai (Ah) = (E_beban_harian × Hari_Otonomi) / (V_sistem × DoD × η_inv)',
        keyTakeaway:
          'Pemilihan tegangan sistem 24V atau 48V DC menurunkan arus kabel sebesar separuh hingga seperempat dibanding sistem 12V, sehingga meminimalkan rugi panas I²R.',
        visualSchemaTitle: 'Perbandingan Siklus Hidup & Kapasitas Pakai Baterai',
        visualSteps: [
          'Baterai LiFePO4: DoD 85%, Usia 4.000+ siklus, efisiensi charge/discharge 96%',
          'Proteksi BMS otomatis memutus arus saat suhu sel melebihi ambang aman',
          'Cadangan Hari Otonomi menjamin server sekolah tetap hidup saat mendung 2 hari',
        ],
        calculator: {
          id: 'lifepo4_autonomy',
          title: 'Kalkulator Jam Otonomi Baterai LiFePO4',
          resultLabel: 'Durasi Otonomi Tanpa Matahari',
          resultUnit: 'Jam',
          variables: [
            { key: 'battKWh', label: 'Kapasitas Total LiFePO4', unit: 'kWh', min: 2, max: 15, step: 0.5, defaultValue: 6.5 },
            { key: 'loadW', label: 'Beban Kontinu Kelas', unit: 'Watt', min: 100, max: 600, step: 20, defaultValue: 220 },
          ],
        },
      },
      {
        heading: '03. Pelacakan Titik Daya Maksimum (MPPT) & Proteksi Petir Kepulauan',
        body: 'Kontroler MPPT (Maximum Power Point Tracking) bekerja sebagai konverter DC-ke-DC frekuensi tinggi yang menyesuaikan impedansi beban terhadap kurva I-V panel surya saat awan lewat. Ketika tegangan panel turun karena suhu atap yang panas, MPPT menjaga perkalian V × I tetap berada di puncak kurva daya.',
        formula: 'P_maks = V_mp × I_mp · (Efisiensi Konversi MPPT ≈ 97%)',
        keyTakeaway:
          'Wajib memasang Surge Protection Device (SPD) DC dan pentanahan (grounding < 5 Ohm) untuk melindungi MPPT dari induksi petir di perbukitan terbuka.',
        visualSchemaTitle: 'Alur Kerja Konversi DC-DC pada Kontroler MPPT',
        visualSteps: [
          'Sensor MPPT membaca tegangan V_panel dan arus I_panel setiap milidetik',
          'Algoritma Perturb & Observe mencari titik lutut kurva daya maksimum (V_mp)',
          'Konverter Buck menurunkan tegangan tinggi panel ke tegangan pengisian baterai',
          'Arus pengisian ke baterai meningkat proporsional tanpa membuang daya sebagai panas',
        ],
      },
    ],
    caseStudy: {
      title: 'Laboratorium Komputer Berbasis Surya Otonom di Sabana Sumba Timur',
      location: 'Desa Kamanggih, Kec. Kahaungu Eti — Sumba Timur, NTT',
      challenge:
        'Sekolah menengah di perbukitan sabana memiliki 20 unit laptop bantuan namun tidak dapat digunakan secara optimal karena ketiadaan jaringan listrik siang hari.',
      solution:
        'Pemasangan 4 panel monokristalin @ 450 Wp (total 1.800 Wp) dengan kontroler MPPT 60A dan bank baterai LiFePO4 48V 150Ah (7,2 kWh) yang dirakit dan dirawat langsung oleh siswa jurusan teknik energi.',
      impactMetrics: [
        'Panen Energi Rata-Rata 7,9 kWh per Hari Cerah',
        'Menghidupkan 1 Server Lokal + 20 Laptop Siswa + Proyektor',
        'Otonomi Cadangan Listrik 28 Jam Tanpa Sinar Matahari',
      ],
    },
    glossary: [
      {
        term: 'Peak Sun Hours (PSH)',
        symbolOrUnit: 'jam/hari (kWh/m²)',
        definition: 'Jumlah jam ekuivalen dalam sehari ketika intensitas radiasi matahari mencapai rata-rata standar 1.000 Watt/m².',
      },
      {
        term: 'Depth of Discharge (DoD)',
        symbolOrUnit: 'Persentase (%)',
        definition: 'Persentase kapasitas energi baterai yang boleh dikosongkan dengan aman tanpa merusak struktur kimia sel baterai.',
      },
      {
        term: 'MPPT (Maximum Power Point Tracking)',
        symbolOrUnit: 'Kontroler DC-DC',
        definition: 'Teknologi pengisi baterai surya yang melacak kombinasi tegangan dan arus optimal panel agar daya panen meningkat 20%–30% dibanding PWM.',
      },
    ],
    guidedExercises: [
      {
        id: 'ex-solar-1',
        title: 'Perhitungan Kapasitas Panel Surya & Baterai untuk Server RuangPintar Edge',
        scenarioContext:
          'Sebuah sekolah di Sumba Timur ingin menyalakan Laptop Host Guru, Router Mesh, dan pengisian 12 tablet siswa dengan total konsumsi energi harian 4.200 Wh. Lokasi memiliki PSH 5,2 jam/hari dan efisiensi sistem total 82%.',
        givenData: [
          'Kebutuhan energi harian E_beban = 4.200 Wh (4,2 kWh)',
          'Peak Sun Hours (PSH) Sumba = 5,2 jam/hari',
          'Efisiensi sistem total η = 82% (0,82)',
          'DoD Baterai LiFePO4 = 85% (0,85)',
        ],
        steps: [
          {
            stepTitle: 'Langkah 1: Hitung Kapasitas Minimum Panel Surya (Watt-peak)',
            formulaOrHint: 'P_panel (Wp) = E_beban / (PSH × η)',
            calculationResult: 'P_panel = 4.200 / (5,2 × 0,82) = 4.200 / 4,264 ≈ 985 Wp (Gunakan 3 panel @ 350 Wp = 1.050 Wp)',
          },
          {
            stepTitle: 'Langkah 2: Hitung Kapasitas Bank Baterai LiFePO4 untuk 1,5 Hari Otonomi',
            formulaOrHint: 'E_baterai = (E_beban × 1,5) / DoD',
            calculationResult: 'E_baterai = (4.200 × 1,5) / 0,85 = 6.300 / 0,85 ≈ 7.412 Wh (7,41 kWh)',
          },
        ],
        finalConclusion:
          'Sekolah memerlukan array panel surya minimal 1.050 Wp dan bank baterai LiFePO4 48V 160Ah (7,68 kWh) agar pembelajaran digital berjalan tanpa henti.',
      },
    ],
    simulationType: 'solar',
    checkpoints: [
      {
        question:
          'Jika atap sekolah dipasang panel surya berkapasitas 1.500 Wp di wilayah Sumba yang memiliki Peak Sun Hours (PSH) 5,0 jam dan efisiensi sistem 80%, berapakah energi listrik harian yang dipanen?',
        options: [
          '6,0 kWh per hari (1,5 kW × 5 jam × 0,80)',
          '7,5 kWh per hari (tanpa rugi efisiensi sistem)',
          '3,0 kWh per hari',
          '15,0 kWh per hari',
        ],
        correctIndex: 0,
        explanation:
          'E_harian = 1.500 Wp × 5,0 jam × 0,80 = 6.000 Wh = 6,0 kWh per hari.',
        difficulty: 'Dasar',
      },
      {
        question:
          'Mengapa penggunaan baterai LiFePO4 (Litium Besi Fosfat) jauh lebih unggul dibandingkan aki timbal-asam konvensional untuk sistem PLTS sekolah kepulauan?',
        options: [
          'Memiliki Depth of Discharge (DoD) aman hingga 85% dan usia pakai >4.000 siklus di iklim tropis',
          'Tidak memerlukan panel surya untuk mengisi ulang energi',
          'Langsung menghasilkan tegangan AC 220V tanpa inverter',
          'Memiliki bobot tiga kali lebih berat dibanding aki timbal-asam',
        ],
        correctIndex: 0,
        explanation:
          'Kimia LiFePO4 stabil secara termal, mendukung DoD tinggi (80–90%), dan tahan hingga lebih dari 10 tahun pemakaian harian.',
        difficulty: 'Menengah',
      },
    ],
    updatedAt: 'Dipublikasikan 08:35 WITA · Tersedia di 5 Simpul Lokal',
  },
  {
    id: 'mod-biologi-agroforestri',
    code: 'BIO-XI-05',
    title: 'Agroforestri Lahan Kering & Konservasi Daerah Tangkapan Mata Air',
    subject: 'Biologi Pesisir',
    gradeLevel: 'Kelas XI SMA / SMK Pertanian Kepulauan',
    authorTeacher: 'Ibu Маргарета Ndolu, M.Sc.',
    schoolOrigin: 'SMAN 1 Lobalain — Kab. Rote Ndao, NTT',
    sizeMB: 26.4,
    totalChunks: 16,
    chunkSizeKB: 1689,
    chunkHashes: [
      'a201a001', 'a202b002', 'a203c003', 'a204d004',
      'a205e005', 'a206f006', 'a207a007', 'a208b008',
      'a209c009', 'a210d010', 'a211e011', 'a212f012',
      'a213a013', 'a214b014', 'a215c015', 'a216d016',
    ],
    mediaType: 'Video & Simulasi Interaktif',
    imageUrl: '/src/assets/images/module_dryland_agroforestry_1794013784750.jpg',
    summary:
      'Rekayasa ekohidrologi daerah tangkapan air karst dan sabana kering menggunakan stratifikasi tajuk lontar-kelor-cendana serta terasering batu untuk menjaga debit mata air desa sepanjang musim kemarau.',
    sections: [
      {
        heading: '01. Neraca Air Lahan Kering & Infiltrasi Akuifer Karst',
        body: 'Pulau-pulau kecil di busur luar Nusa Tenggara memiliki musim hujan singkat (3–4 bulan) namun berintensitas deras di atas batuan kapur (karst). Tanpa penutup tajuk vegetasi bertingkat dan teras batu (sengkedan), lebih dari 70% air hujan langsung terbuang ke laut sebagai limpasan permukaan (surface runoff) yang mengikis lapisan tanah atas.',
        formula: 'I_infiltrasi = P_curah_hujan - (R_limpasan + ET_evapotranspirasi)',
        keyTakeaway:
          'Terasering batu karang dikombinasikan dengan serasah agroforestri meningkatkan laju infiltrasi air hujan ke pori-pori akuifer hingga 3 kali lipat.',
        visualSchemaTitle: 'Jalur Hidrologi Infiltrasi Lereng Sabana ke Mata Air',
        visualSteps: [
          'Tajuk Pohon Lontar & Kesambi memecah energi kinetik butiran hujan deras',
          'Teras Batu (Stone Bunds) menahan laju aliran permukaan di lereng bukit',
          'Akar dalam & pori biopori cacing tanah menyalurkan air ke celah batuan karst',
          'Akuifer kapur mengeluarkan air secara perlahan melalui Mata Air Desa di musim kemarau',
        ],
        calculator: {
          id: 'infiltration_rate',
          title: 'Kalkulator Persentase Infiltrasi Air Hujan',
          resultLabel: 'Porsi Air Hujan Meresap ke Tanah',
          resultUnit: '%',
          variables: [
            { key: 'canopyPct', label: 'Tutupan Tajuk Pohon', unit: '%', min: 10, max: 90, step: 5, defaultValue: 65 },
            { key: 'terraces', label: 'Jumlah Teras Batu', unit: 'jalur', min: 2, max: 20, step: 1, defaultValue: 12 },
          ],
        },
      },
      {
        heading: '02. Stratifikasi Tajuk Agroforestri (Lontar, Kelor, & Legum Penutup)',
        body: 'Sistem kebun campuran tradisional (Mamar di Timor/Rote) menggabungkan strata tajuk tinggi pohon Lontar (Borassus flabellifer) dan Beringin penyimpan air, strata tengah Kelor (Moringa oleifera) dan Cendana yang bernilai gizi serta ekonomi tinggi, serta tanaman penutup tanah legum pengikat nitrogen (Arachis pintoi / lamtoro).',
        formula: 'Debit_Kemarau (L/s) ≈ Luas_Tangkapan × Koef_Infiltrasi × Faktor_Retensi_Karst',
        keyTakeaway:
          'Bintil akar tanaman legum bersimbiosis dengan bakteri Rhizobium untuk mengikat nitrogen bebas (N₂) menjadi nutrisi tanah alami tanpa pupuk kimia.',
        visualSchemaTitle: 'Arsitektur 3 Strata Tajuk Mamar / Agroforestri Kepulauan',
        visualSteps: [
          'Strata Atas (>12 m): Lontar, Kemiri, & Beringin — penahan angin kering & pengumpul embun',
          'Strata Tengah (3–8 m): Kelor (Moringa), Cendana, & Pisang — pangan bergizi tinggi',
          'Strata Bawah (<1 m): Kacang Hias / Legum & Sorgum — penahan evaporasi tanah & pengikat N₂',
        ],
        calculator: {
          id: 'spring_debit',
          title: 'Kalkulator Debit Mata Air Musim Kemarau',
          resultLabel: 'Estimasi Debit Mata Air',
          resultUnit: 'Liter/detik',
          variables: [
            { key: 'catchmentHa', label: 'Luas Daerah Tangkapan', unit: 'ha', min: 5, max: 60, step: 5, defaultValue: 25 },
            { key: 'infilPct', label: 'Rasio Infiltrasi Tanah', unit: '%', min: 25, max: 85, step: 5, defaultValue: 70 },
          ],
        },
      },
    ],
    caseStudy: {
      title: 'Revitalisasi Kebun Mamar & Penyelamatan Mata Air Oelaba di Pulau Rote',
      location: 'Kec. Lobalain — Kab. Rote Ndao (Pulau Terselatan Indonesia), NTT',
      challenge:
        'Kemarau panjang 8 bulan menyebabkan debit mata air desa menyusut hingga kurang dari 0,8 Liter/detik, memaksa warga mengantre air bersih berjam-jam.',
      solution:
        'Pembangunan 15 jalur teras batu kontur di bukit tangkapan air dipadukan penanaman 6.500 pohon kelor, lontar, dan beringin lokal oleh siswa SMAN 1 Lobalain dan kelompok tani desa.',
      impactMetrics: [
        'Debit Mata Air Kemarau Naik dari 0,8 L/s Menjadi 3,4 L/s',
        'Erosi Lahan Kering Berkurang 86% Saat Hujan Monsun',
        'Panen Daun Kelor Kering Menambah Pendapatan Kelompok Tani Desa',
      ],
    },
    glossary: [
      {
        term: 'Mamar (Agroforestri Rote/Timor)',
        symbolOrUnit: 'Sistem Ekologi',
        definition: 'Kearifan lokal pengelolaan kebun hutan berlapis di sekitar mata air yang memadukan pohon pelindung, tanaman pangan, dan ternak.',
      },
      {
        term: 'Infiltrasi Hidrologi',
        symbolOrUnit: 'mm/jam atau %',
        definition: 'Proses meresapnya air hujan dari permukaan tanah ke dalam lapisan zona perakaran dan akuifer air tanah.',
      },
      {
        term: 'Fiksasi Nitrogen Simbiotik',
        symbolOrUnit: 'N₂ → NH₄⁺',
        definition: 'Pengikatan gas nitrogen udara oleh bakteri Rhizobium pada bintil akar tanaman polong-polongan menjadi hara penyubur tanah.',
      },
    ],
    guidedExercises: [
      {
        id: 'ex-agro-1',
        title: 'Menghitung Cadangan Air Akuifer dari Restorasi Bukit Tangkapan Air',
        scenarioContext:
          'Bukit tangkapan mata air seluas 20 hektare di Rote menerima curah hujan tahunan 1.100 mm. Setelah diterapkan teras batu dan agroforestri, 65% air hujan berhasil meresap ke dalam tanah.',
        givenData: [
          'Luas daerah tangkapan A = 20 ha = 200.000 m²',
          'Curah hujan tahunan P = 1.100 mm = 1,1 meter',
          'Koefisien infiltrasi I = 65% = 0,65',
        ],
        steps: [
          {
            stepTitle: 'Langkah 1: Hitung Volume Total Air Hujan yang Jatuh per Tahun',
            formulaOrHint: 'V_hujan = Luas (m²) × Tinggi Hujan (m)',
            calculationResult: 'V_hujan = 200.000 m² × 1,1 m = 220.000 m³/tahun',
          },
          {
            stepTitle: 'Langkah 2: Hitung Volume Air yang Meresap ke Akuifer Mata Air',
            formulaOrHint: 'V_infiltrasi = V_hujan × Koefisien_Infiltrasi',
            calculationResult: 'V_infiltrasi = 220.000 × 0,65 = 143.000 m³/tahun (143 Juta Liter)',
          },
        ],
        finalConclusion:
          'Volume resapan 143 juta liter per tahun mampu menyuplai mata air desa secara berkelanjutan sepanjang 240 hari musim kemarau.',
      },
    ],
    simulationType: 'agroforestry',
    checkpoints: [
      {
        question:
          'Apa fungsi utama pembuatan teras batu (stone bunds) mengikuti garis kontur pada lereng bukit sabana kering di Nusa Tenggara?',
        options: [
          'Memperlambat laju limpasan air permukaan sehingga air memiliki waktu meresap ke dalam akuifer tanah',
          'Mempercepat aliran air hujan langsung menuju laut',
          'Meningkatkan suhu permukaan tanah agar rumput cepat mengering',
          'Menghalangi akar pohon menyerap mineral kapur',
        ],
        correctIndex: 0,
        explanation:
          'Teras batu menahan kecepatan aliran permukaan (runoff), mencegah erosi lapisan humus, dan memperbesar infiltrasi air tanah.',
        difficulty: 'Dasar',
      },
      {
        question:
          'Mengapa penanaman pohon legum (seperti lamtoro atau kacang penutup tanah) di sela pohon lontar dan kelor dapat menyuburkan tanah kering tanpa pupuk sintetis?',
        options: [
          'Bintil akarnya bersimbiosis dengan bakteri Rhizobium yang mengikat nitrogen bebas dari udara menjadi amonium',
          'Daunnya mengandung garam laut konsentrasi tinggi',
          'Akarnya menyerap seluruh cadangan air dari pohon utama',
          'Batangnya memancarkan radiasi ultraviolet ke tanah',
        ],
        correctIndex: 0,
        explanation:
          'Simbiosis mutualisme legum dengan bakteri Rhizobium menyediakan nitrogen organik yang sangat dibutuhkan tanah lahan kering.',
        difficulty: 'Menengah',
      },
    ],
    updatedAt: 'Dipublikasikan 08:42 WITA · Tersedia di 5 Simpul Lokal',
  },
  {
    id: 'mod-fisika-desalinasi',
    code: 'FIS-XI-06',
    title: 'Termodinamika Distilasi Surya & Desalinasi Air Payau Pesisir',
    subject: 'Fisika Terapan',
    gradeLevel: 'Kelas XI SMA / SMK',
    authorTeacher: 'Ibu Nurhayati Ranai, S.Pd., M.Si.',
    schoolOrigin: 'SMAN 1 Bunguran Timur — Kab. Natuna, Kepri',
    sizeMB: 27.5,
    totalChunks: 16,
    chunkSizeKB: 1760,
    chunkHashes: [
      'd301a001', 'd302b002', 'd303c003', 'd304d004',
      'd305e005', 'd306f006', 'd307a007', 'd308b008',
      'd309c009', 'd310d010', 'd311e011', 'd312f012',
      'd313a013', 'd314b014', 'd315c015', 'd316d016',
    ],
    mediaType: 'Video & Simulasi Interaktif',
    imageUrl: '/src/assets/images/module_solar_desalination_1794013784758.jpg',
    summary:
      'Penerapan kalor laten penguapan-kondensasi pada kolektor distilasi surya (solar basin still) dan adsorpsi karbon aktif tempurung kelapa (biochar) untuk mengubah air payau pulau kecil menjadi air minum layak konsumsi.',
    sections: [
      {
        heading: '01. Termodinamika Efek Rumah Kaca & Kalor Laten Penguapan',
        body: 'Pada bak distilasi surya (solar still), radiasi gelombang pendek matahari menembus penutup kaca miring dan diserap oleh pelat dasar hitam berisi air payau/laut. Air memanas dan menguap dengan menyerap kalor laten penguapan (h_fg ≈ 2.400 kJ/kg), meninggalkan ion garam NaCl dan logam berat di dasar bak.',
        formula: 'm_distilat = (I_surya × A_kolektor × η_termal) / h_fg',
        keyTakeaway:
          'Uap air murni yang menyentuh permukaan bawah kaca yang lebih dingin akan melepaskan kalor laten (kondensasi) dan mengalir turun ke talang penampung air tawar.',
        visualSchemaTitle: 'Siklus Termodinamika di Dalam Kolektor Solar Basin Still',
        visualSteps: [
          'Radiasi Surya menembus kaca transparan & memanaskan dasar bak berlapis arang hitam',
          'Evaporasi Selektif: Molekul H₂O menguap, sedangkan kristal garam NaCl tertinggal di bak',
          'Kondensasi Film: Uap air menyentuh kaca miring yang didinginkan hembusan angin luar',
          'Tetesan Distilat Murni (<50 ppm TDS) mengalir ke kanal penampung air minum',
        ],
        calculator: {
          id: 'still_distillate',
          title: 'Kalkulator Produksi Air Tawar Distilasi Surya',
          resultLabel: 'Volume Air Minum Murni',
          resultUnit: 'Liter/hari',
          variables: [
            { key: 'areaSqm', label: 'Luas Kolektor Kaca', unit: 'm²', min: 2, max: 40, step: 2, defaultValue: 18 },
            { key: 'irrad', label: 'Radiasi Surya Harian', unit: 'kWh/m²', min: 3.5, max: 6.5, step: 0.2, defaultValue: 5.4 },
          ],
        },
      },
      {
        heading: '02. Adsorpsi Biochar Tempurung Kelapa & Filtrasi Bertingkat',
        body: 'Pulau-pulau kecil di Natuna dan kepulauan Nusantara melimpah akan limbah tempurung kelapa. Ketika dipirolisis pada suhu tinggi dengan minim oksigen, tempurung kelapa membentuk karbon aktif (biochar) berpori mikro sangat luas (500–900 m²/gram) yang efektif menyerap bau, zat organik, dan kontaminan mikro dari air sumur payau.',
        formula: 'TDS_akhir = TDS_awal × (1 - Efisiensi_Pemisahan)',
        keyTakeaway:
          'Kombinasi distilasi surya termal dan kolom remineralisasi biochar kelapa menghasilkan air minum segar dengan TDS < 60 ppm tanpa membutuhkan pompa bertekanan listrik tinggi.',
        visualSchemaTitle: 'Tahapan Pemurnian & Remineralisasi Air Pulau Kecil',
        visualSteps: [
          'Tahap 1: Saringan Pasir Kuarsa & Kerikil menyaring kekeruhan lumpur suspensi',
          'Tahap 2: Bak Distilasi Surya Termal memisahkan >99% garam terlarut (NaCl)',
          'Tahap 3: Kolom Biochar Tempurung Kelapa menyerap bau & menyeimbangkan pH 7,2',
        ],
        calculator: {
          id: 'biochar_tds',
          title: 'Kalkulator Penurunan Salinitas / TDS Air Payau',
          resultLabel: 'Kadar TDS Air Keluaran',
          resultUnit: 'ppm',
          variables: [
            { key: 'rawTds', label: 'TDS Air Payau Awal', unit: 'ppm', min: 1000, max: 10000, step: 200, defaultValue: 3400 },
            { key: 'effPct', label: 'Efisiensi Distilasi+Biochar', unit: '%', min: 90, max: 99.5, step: 0.5, defaultValue: 98.5 },
          ],
        },
      },
    ],
    caseStudy: {
      title: 'Instalasi Distilasi Surya Komunitas Nelayan di Pulau Sedanau, Natuna',
      location: 'Pulau Sedanau, Kec. Bunguran Barat — Kab. Natuna, Kepulauan Riau',
      challenge:
        'Intrusi air laut ke sumur dangkal warga pesisir menyebabkan kadar garam (TDS > 3.200 ppm) tidak layak minum, sementara pembelian air galon dari pulau utama terhambat gelombang tinggi musim utara.',
      solution:
        'Pembangunan 6 modul basin distilasi surya berlapis absorben arang tempurung kelapa (total 20 m²) oleh kelompok karya ilmiah SMAN 1 Bunguran Timur untuk menyuplai air minum sekolah dan posyandu.',
      impactMetrics: [
        'Produksi 78 Liter Air Minum Murni per Hari Cerah (0 Listrik)',
        'Penurunan Salinitas dari 3.400 ppm Menjadi 32 ppm TDS',
        'Memenuhi Kebutuhan Air Minum Harian 35 Siswa & Guru Pesisir',
      ],
    },
    glossary: [
      {
        term: 'Kalor Laten Penguapan (h_fg)',
        symbolOrUnit: '≈ 2.400 kJ/kg',
        definition: 'Jumlah energi panas yang dibutuhkan untuk mengubah 1 kg air cair menjadi uap air tanpa mengubah suhunya.',
      },
      {
        term: 'Total Dissolved Solids (TDS)',
        symbolOrUnit: 'ppm (mg/L)',
        definition: 'Ukuran jumlah total mineral, garam, dan ion terlarut dalam air. Standar air minum sehat berada di bawah 300–500 ppm.',
      },
      {
        term: 'Adsorpsi Karbon Aktif (Biochar)',
        symbolOrUnit: 'Luas Pori Mikro',
        definition: 'Pengikatan molekul pengotor atau bau pada permukaan dinding pori-pori mikroskopik arang tempurung kelapa yang telah diaktivasi.',
      },
    ],
    guidedExercises: [
      {
        id: 'ex-desal-1',
        title: 'Merancang Luas Kolektor Distilasi Surya untuk Pos Kesehatan Pesisir',
        scenarioContext:
          'Sebuah pos kesehatan di pulau terluar Natuna membutuhkan 60 Liter air tawar murni per hari. Radiasi surya rata-rata di lokasi adalah 5,5 kWh/m²/hari, efisiensi termal kolektor 48%, dan kalor laten penguapan air setara 0,667 kWh/Liter.',
        givenData: [
          'Target produksi air tawar V = 60 Liter/hari',
          'Radiasi surya harian I = 5,5 kWh/m²/hari',
          'Efisiensi termal kolektor η = 48% = 0,48',
          'Kalor laten penguapan ekuivalen h_fg = 0,667 kWh/Liter',
        ],
        steps: [
          {
            stepTitle: 'Langkah 1: Hitung Produksi Air Tawar per 1 m² Kolektor',
            formulaOrHint: 'Produksi_per_m² = (I × η) / h_fg',
            calculationResult: 'Produksi_per_m² = (5,5 × 0,48) / 0,667 = 2,64 / 0,667 ≈ 3,96 Liter/m²/hari',
          },
          {
            stepTitle: 'Langkah 2: Hitung Luas Total Kolektor Kaca yang Dibutuhkan',
            formulaOrHint: 'A_kolektor = Target_Liter / Produksi_per_m²',
            calculationResult: 'A_kolektor = 60 / 3,96 ≈ 15,15 m² (Dibulatkan menjadi 16 m² atau 8 modul @ 2 m²)',
          },
        ],
        finalConclusion:
          'Pos kesehatan membutuhkan instalasi kolektor distilasi surya seluas 16 m² untuk menghasilkan sedikitnya 63 Liter air minum murni setiap hari tanpa biaya bahan bakar.',
      },
    ],
    simulationType: 'desalination',
    checkpoints: [
      {
        question:
          'Mengapa kristal garam NaCl tidak ikut terbawa naik bersama uap air di dalam bak distilasi surya (solar basin still)?',
        options: [
          'Ion garam memiliki titik uap sangat tinggi sehingga hanya molekul H₂O murni yang menguap pada suhu 60°–80°C',
          'Kaca penutup memiliki medan magnet penolak garam',
          'Garam berubah menjadi gas oksigen saat terkena sinar matahari',
          'Air laut membeku terlebih dahulu di dasar bak hitam',
        ],
        correctIndex: 0,
        explanation:
          'Pada pemanasan surya suhu rendah (55°–85°C), hanya molekul air (H₂O) yang mengalami perubahan fase menjadi uap, sedangkan garam mineral tetap tertinggal di larutan bawah.',
        difficulty: 'Dasar',
      },
      {
        question:
          'Apa peran lapisan arang tempurung kelapa (biochar) yang diletakkan di dasar bak distilasi surya maupun pada kolom filter akhir?',
        options: [
          'Menyerap radiasi panas matahari secara maksimal di dasar bak sekaligus mengadsorpsi bau dan kontaminan organik',
          'Meningkatkan kadar garam air agar terasa lebih asin',
          'Mengubah air tawar menjadi bahan bakar solar',
          'Menurunkan suhu air di bawah titik beku',
        ],
        correctIndex: 0,
        explanation:
          'Warna hitam legam dan pori mikro biochar meningkatkan absorpsi termal surya di dasar bak sekaligus memurnikan rasa dan bau air hasil kondensasi.',
        difficulty: 'Menengah',
      },
    ],
    updatedAt: 'Dipublikasikan 08:50 WITA · Tersedia di 4 Simpul Lokal',
  },
];

export const INITIAL_PEERS: PeerNode[] = [
  {
    id: 'host-guru-01',
    name: 'Laptop Guru — Simpul Host (Ibu Wilhelmina)',
    deviceType: 'Laptop Guru (Host Node)',
    role: 'HOST',
    localIp: '192.168.43.1',
    rtcStatus: 'Menyemai Pecahan',
    latencyMs: 2,
    moduleChunks: {
      'mod-fisika-mikrohidro': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-biologi-mangrove': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-matematika-navigasi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-energi-surya': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-biologi-agroforestri': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-fisika-desalinasi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    },
    uploadedMB: 142.8,
    downloadedMB: 0,
    activeConnections: 5,
  },
  {
    id: 'peer-siswa-01',
    name: 'Yohanes K. (Meja Depan · Peer 01)',
    deviceType: 'Laptop Siswa',
    role: 'PEER',
    localIp: '192.168.43.102',
    rtcStatus: 'DataChannel Terhubung',
    latencyMs: 5,
    moduleChunks: {
      'mod-fisika-mikrohidro': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-biologi-mangrove': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-matematika-navigasi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-energi-surya': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-biologi-agroforestri': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-fisika-desalinasi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
    uploadedMB: 118.4,
    downloadedMB: 135.0,
    activeConnections: 4,
  },
  {
    id: 'peer-siswa-02',
    name: 'Maria Fransiska (Meja Tengah · Peer 02)',
    deviceType: 'Laptop Siswa',
    role: 'PEER',
    localIp: '192.168.43.105',
    rtcStatus: 'DataChannel Terhubung',
    latencyMs: 6,
    moduleChunks: {
      'mod-fisika-mikrohidro': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-biologi-mangrove': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-matematika-navigasi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-energi-surya': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-biologi-agroforestri': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-fisika-desalinasi': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    },
    uploadedMB: 109.5,
    downloadedMB: 128.4,
    activeConnections: 4,
  },
  {
    id: 'peer-siswa-03',
    name: 'Lukas Blegur (Meja Tengah · Peer 03)',
    deviceType: 'Ponsel Siswa',
    role: 'PEER',
    localIp: '192.168.43.108',
    rtcStatus: 'DataChannel Terhubung',
    latencyMs: 8,
    moduleChunks: {
      'mod-fisika-mikrohidro': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-biologi-mangrove': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      'mod-matematika-navigasi': [0, 1, 2, 3, 4, 5, 6, 7],
      'mod-energi-surya': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-biologi-agroforestri': [0, 1, 2, 3, 4, 5, 6, 7],
      'mod-fisika-desalinasi': [0, 1, 2, 3, 4, 5, 6, 7],
    },
    uploadedMB: 78.1,
    downloadedMB: 96.8,
    activeConnections: 3,
  },
  {
    id: 'peer-siswa-04',
    name: 'Siti Rahmawati (Meja Belakang · Peer 04)',
    deviceType: 'Laptop Siswa',
    role: 'PEER',
    localIp: '192.168.43.114',
    rtcStatus: 'DataChannel Terhubung',
    latencyMs: 7,
    moduleChunks: {
      'mod-fisika-mikrohidro': [0, 1, 2, 3, 4, 5, 6, 7],
      'mod-biologi-mangrove': [0, 1, 2, 3, 4, 5, 6, 7],
      'mod-matematika-navigasi': [0, 1, 2, 3, 4, 5],
      'mod-energi-surya': [0, 1, 2, 3, 4, 5, 6, 7],
      'mod-biologi-agroforestri': [0, 1, 2, 3, 4, 5, 6, 7],
      'mod-fisika-desalinasi': [0, 1, 2, 3, 4, 5],
    },
    uploadedMB: 54.4,
    downloadedMB: 68.6,
    activeConnections: 3,
  },
  {
    id: 'peer-siswa-05',
    name: 'Hendrikus D. (Perangkat Anda · Peer 05)',
    deviceType: 'Laptop Siswa',
    role: 'PEER',
    localIp: '192.168.43.119',
    rtcStatus: 'DataChannel Terhubung',
    latencyMs: 5,
    moduleChunks: {
      'mod-fisika-mikrohidro': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      'mod-biologi-mangrove': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-matematika-navigasi': [0, 1, 2, 3, 4, 5, 6, 7],
      'mod-energi-surya': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      'mod-biologi-agroforestri': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      'mod-fisika-desalinasi': [0, 1, 2, 3, 4, 5, 6, 7],
    },
    uploadedMB: 48.0,
    downloadedMB: 89.6,
    activeConnections: 4,
  },
];

export const INITIAL_TRANSFER_HISTORY: ChunkTransferEvent[] = [
  {
    id: 'tx-101',
    timestamp: '08:41:12 WITA',
    moduleId: 'mod-fisika-mikrohidro',
    moduleTitle: 'PLTMH Mandiri Desa',
    chunkIndex: 9,
    chunkHash: '4d590ea9',
    fromPeerId: 'peer-siswa-01',
    fromPeerName: 'Yohanes K. (Peer 01)',
    fromPeerRole: 'PEER',
    toPeerId: 'peer-siswa-05',
    toPeerName: 'Hendrikus D. (Peer 05)',
    sizeKB: 2457,
    channelProtocol: 'WebRTC DataChannel (SCTP)',
    zeroIspQuota: true,
  },
  {
    id: 'tx-102',
    timestamp: '08:41:08 WITA',
    moduleId: 'mod-energi-surya',
    moduleTitle: 'Sistem PLTS Off-Grid & Baterai LiFePO4',
    chunkIndex: 11,
    chunkHash: 's112f012',
    fromPeerId: 'peer-siswa-01',
    fromPeerName: 'Yohanes K. (Peer 01)',
    fromPeerRole: 'PEER',
    toPeerId: 'peer-siswa-05',
    toPeerName: 'Hendrikus D. (Peer 05)',
    sizeKB: 1996,
    channelProtocol: 'WebRTC DataChannel (SCTP)',
    zeroIspQuota: true,
  },
  {
    id: 'tx-103',
    timestamp: '08:40:54 WITA',
    moduleId: 'mod-biologi-mangrove',
    moduleTitle: 'Ekologi Sabuk Hutan Mangrove',
    chunkIndex: 11,
    chunkHash: 'mb332f12',
    fromPeerId: 'peer-siswa-03',
    fromPeerName: 'Lukas Blegur (Peer 03)',
    fromPeerRole: 'PEER',
    toPeerId: 'peer-siswa-05',
    toPeerName: 'Hendrikus D. (Peer 05)',
    sizeKB: 1894,
    channelProtocol: 'WebRTC DataChannel (SCTP)',
    zeroIspQuota: true,
  },
  {
    id: 'tx-104',
    timestamp: '08:39:30 WITA',
    moduleId: 'mod-fisika-mikrohidro',
    moduleTitle: 'PLTMH Mandiri Desa',
    chunkIndex: 0,
    chunkHash: 'a8f19c20',
    fromPeerId: 'host-guru-01',
    fromPeerName: 'Laptop Guru (Simpul Host)',
    fromPeerRole: 'HOST',
    toPeerId: 'peer-siswa-01',
    toPeerName: 'Yohanes K. (Peer 01)',
    sizeKB: 2457,
    channelProtocol: 'WebRTC DataChannel (SCTP)',
    zeroIspQuota: true,
  },
];

export const INITIAL_CACHE_ENTRIES: CacheEntry[] = [
  {
    id: 'cache-pltmh-rumus',
    moduleId: 'mod-fisika-mikrohidro',
    subject: 'Fisika Terapan',
    questionCanonical:
      'Bagaimana cara menghitung daya listrik pembangkit mikrohidro dari debit sungai dan tinggi jatuh air?',
    normalizedTokens: normalizeQuestion(
      'Bagaimana cara menghitung daya listrik pembangkit mikrohidro dari debit sungai dan tinggi jatuh air?'
    ),
    answerMarkdown:
      'Untuk menghitung daya listrik bersih pada **Pembangkit Listrik Tenaga Mikrohidro (PLTMH)**, gunakan persamaan konversi energi potensial hidrodinamika:\n\n`P_bersih = ρ × g × Q × H × η_total`\n\n**Rincian Variabel Fisika:**\n- **ρ (Massa jenis air):** 1.000 kg/m³\n- **g (Percepatan gravitasi):** 9,81 m/s²\n- **Q (Debit aliran sungai):** dinyatakan dalam m³/detik (jika diukur dalam Liter/detik, bagi dengan 1.000)\n- **H (Tinggi jatuh efektif / Net Head):** selisih ketinggian vertikal antara bak penenang (forebay) dan nosel turbin dikurangi rugi gesekan pipa (head loss)\n- **η (Efisiensi total sistem):** perkalian efisiensi turbin, transmisi sabuk, dan generator (umumnya 0,65 hingga 0,78)\n\n**Contoh Perhitungan Lapangan di Desa:**\nJika sungai desa memiliki debit `Q = 50 L/s = 0,05 m³/s`, tinggi jatuh efektif `H = 20 m`, dan efisiensi sistem `η = 70% (0,70)`, maka:\n`P_bersih = 1.000 × 9,81 × 0,05 × 20 × 0,70 = 6.867 Watt ≈ 6,87 kW`\nDaya 6,87 kW ini mampu menyuplai listrik mandiri untuk sekitar **15 rumah warga** beserta laboratorium komputer sekolah tanpa bahan bakar solar.',
    keyConcepts: ['Persamaan Daya Hidrolik', 'Tinggi Jatuh Efektif (Head)', 'Efisiensi Turbin & Generator'],
    createdByStudent: 'Yohanes K. (Peer 01)',
    createdAt: '08:12 WITA',
    hitCount: 19,
    savedQuotaKB: 91.2,
    originSource: 'GEMINI_CLOUD_GATEWAY',
  },
  {
    id: 'cache-pltmh-elc',
    moduleId: 'mod-fisika-mikrohidro',
    subject: 'Fisika Terapan',
    questionCanonical:
      'Apa fungsi Electronic Load Controller (ELC) pada turbin mikrohidro desa dan mengapa frekuensi bisa naik turun?',
    normalizedTokens: normalizeQuestion(
      'Apa fungsi Electronic Load Controller (ELC) pada turbin mikrohidro desa dan mengapa frekuensi bisa naik turun?'
    ),
    answerMarkdown:
      '**Electronic Load Controller (ELC)** berfungsi sebagai penyeimbang beban elektronik otomatis agar frekuensi listrik generator tetap stabil di **50 Hz** dan tegangan terjaga pada **220 V AC**.\n\n**Mengapa sangat penting pada PLTMH desa 3T?**\n- **Debit Air Masuk Konstan:** Aliran air sungai yang memutar turbin relatif tetap setiap detik, sehingga daya mekanik masuk (`P_masuk`) bersifat konstan.\n- **Perubahan Beban Warga:** Pada siang hari ketika warga mematikan lampu rumah, beban pemakaian warga (`P_warga`) turun drastis. Tanpa pengendali, putaran generator akan melonjak (over-speed) hingga frekuensi naik di atas 55 Hz yang berisiko merusak adaptor laptop dan peralatan elektronik sekolah.\n- **Pengalihan ke Ballast Load:** ELC mendeteksi penurunan beban warga dalam hitungan milidetik lalu mengalihkan kelebihan daya ke **beban komplemen (ballast heater)** seperti pemanas air atau pengering hasil panen desa, sehingga persamaan `P_warga + P_ballast = Konstan` selalu terpenuhi.',
    keyConcepts: ['Electronic Load Controller (ELC)', 'Stabilisasi Frekuensi 50 Hz', 'Beban Komplemen (Ballast Load)'],
    createdByStudent: 'Maria Fransiska (Peer 02)',
    createdAt: '08:18 WITA',
    hitCount: 14,
    savedQuotaKB: 67.2,
    originSource: 'GEMINI_CLOUD_GATEWAY',
  },
  {
    id: 'cache-mangrove-karbon',
    moduleId: 'mod-biologi-mangrove',
    subject: 'Biologi Pesisir',
    questionCanonical:
      'Mengapa hutan mangrove dapat menyimpan karbon biru jauh lebih banyak dibandingkan hutan daratan biasa?',
    normalizedTokens: normalizeQuestion(
      'Mengapa hutan mangrove dapat menyimpan karbon biru jauh lebih banyak dibandingkan hutan daratan biasa?'
    ),
    answerMarkdown:
      'Ekosistem mangrove mampu menyimpan **karbon biru (blue carbon) 4 hingga 5 kali lebih besar per hektare** dibandingkan hutan hujan daratan karena dua mekanisme ekologis utama:\n\n- **Penguncian Karbon pada Sedimen Lumpur Anaerob (Miskin Oksigen):** Akar tunjang Rhizophora dan akar napas Avicennia menjebak serasah daun serta partikel organik yang terbawa pasang surut. Karena substrat lumpur mangrove selalu tergenang air pasang, tanah berada dalam kondisi **anoksik (tanpa oksigen bebas)**. Akibatnya, dekomposisi oleh bakteri berlangsung sangat lambat sehingga karbon organik tidak lepas ke atmosfer sebagai CO₂, melainkan terkunci di lapisan sedimen selama ratusan tahun.\n- **Rasio Biomassa Perakaran Bawah Tanah yang Rapat:** Struktur perakaran mangrove tumbuh sangat padat dan dalam untuk menopang pohon di lumpur lunak sekaligus melakukan ultrafiltrasi garam air laut.',
    keyConcepts: ['Karbon Biru (Blue Carbon)', 'Sedimen Anoksik / Anaerob', 'Akar Tunjang Rhizophora'],
    createdByStudent: 'Lukas Blegur (Peer 03)',
    createdAt: '08:25 WITA',
    hitCount: 16,
    savedQuotaKB: 76.8,
    originSource: 'GEMINI_CLOUD_GATEWAY',
  },
  {
    id: 'cache-navigasi-arus',
    moduleId: 'mod-matematika-navigasi',
    subject: 'Matematika Maritim',
    questionCanonical:
      'Bagaimana cara menentukan sudut koreksi haluan kapal saat menyeberangi selat yang memiliki arus samping kuat?',
    normalizedTokens: normalizeQuestion(
      'Bagaimana cara menentukan sudut koreksi haluan kapal saat menyeberangi selat yang memiliki arus samping kuat?'
    ),
    answerMarkdown:
      'Saat kapal menyeberangi selat dengan kecepatan terhadap air `v_kapal` dan terdapat arus melintang dengan kecepatan `v_arus`, nakhoda harus mengarahkan haluan menyerong melawan arah datangnya arus sebesar **sudut koreksi (α)**.\n\n`sin(α) = (v_arus × sin(θ)) / v_kapal`\n\n**Langkah Perhitungan Praktis (Arus Tegak Lurus 90°):**\n- Hitung sudut koreksi haluan: `α = arcsin(v_arus / v_kapal)`\n- Hitung kecepatan lintas efektif mendekati dermaga tujuan: `v_efektif = √(v_kapal² - v_arus²)`\n- Jika `v_arus ≥ v_kapal`, perahu tidak akan mampu melawan arus secara tegak lurus dan wajib menunggu pergantian pasang surut selat.',
    keyConcepts: ['Vektor Kecepatan Relatif', 'Sudut Koreksi Haluan (arcsin)', 'Navigasi Selat Kepulauan'],
    createdByStudent: 'Ibu Wilhelmina K. (Pre-warm Simpul Guru)',
    createdAt: '07:45 WITA',
    hitCount: 11,
    savedQuotaKB: 52.8,
    originSource: 'TEACHER_PREWARM',
  },
  {
    id: 'cache-surya-lifepo4',
    moduleId: 'mod-energi-surya',
    subject: 'Teknik Energi',
    questionCanonical:
      'Bagaimana cara menghitung kapasitas panel surya Wp dan baterai LiFePO4 untuk laboratorium komputer sekolah 3T?',
    normalizedTokens: normalizeQuestion(
      'Bagaimana cara menghitung kapasitas panel surya Wp dan baterai LiFePO4 untuk laboratorium komputer sekolah 3T?'
    ),
    answerMarkdown:
      'Perencanaan sistem **PLTS Off-Grid Sekolah Kepulauan** dilakukan dalam dua tahap perhitungan utama:\n\n`P_panel (Wp) = E_beban_harian (Wh) / (PSH × η_sistem)`\n\n**1. Menghitung Kapasitas Array Panel Surya:**\n- Tentukan beban harian total (`E_beban`), misalnya 15 laptop + server guru + router = `3.600 Wh/hari`.\n- Bagi dengan **Peak Sun Hours (PSH)** wilayah (misal NTT = `5,2 jam`) dan efisiensi sistem `0,82`:\n- `P_panel = 3.600 / (5,2 × 0,82) ≈ 845 Wp` (gunakan 3 keping panel `@ 350 Wp = 1.050 Wp`).\n\n**2. Menghitung Kapasitas Bank Baterai LiFePO4:**\n- Gunakan persamaan: `E_baterai = (E_beban × Hari_Otonomi) / DoD`\n- Karena baterai **LiFePO4** aman pada **Depth of Discharge (DoD) 85%**, untuk cadangan 1,5 hari mendung dibutuhkan: `(3.600 × 1,5) / 0,85 ≈ 6.350 Wh (6,35 kWh)`.',
    keyConcepts: ['Peak Sun Hours (PSH)', 'Depth of Discharge (DoD 85%)', 'Sizing PLTS Off-Grid'],
    createdByStudent: 'Bapak Umbu Maramba (Pre-warm Simpul Guru)',
    createdAt: '07:50 WITA',
    hitCount: 15,
    savedQuotaKB: 72.0,
    originSource: 'TEACHER_PREWARM',
  },
  {
    id: 'cache-surya-mppt',
    moduleId: 'mod-energi-surya',
    subject: 'Teknik Energi',
    questionCanonical:
      'Apa perbedaan Solar Charge Controller MPPT dengan PWM pada instalasi panel surya atap sekolah?',
    normalizedTokens: normalizeQuestion(
      'Apa perbedaan Solar Charge Controller MPPT dengan PWM pada instalasi panel surya atap sekolah?'
    ),
    answerMarkdown:
      '**MPPT (Maximum Power Point Tracking)** menghasilkan panen energi surya **20% hingga 30% lebih besar** dibandingkan kontroler PWM biasa karena cara kerjanya yang berbeda:\n\n- **Kontroler PWM (Pulse Width Modulation):** Hanya menghubungkan panel surya langsung ke terminal baterai sehingga tegangan panel dipaksa turun mengikuti tegangan baterai (misal dari 36V dipangkas ke 24V). Selisih tegangan tersebut hilang terbuang.\n- **Kontroler MPPT:** Bekerja sebagai konverter **DC-ke-DC pintar** yang melacak titik daya maksimum (`V_mp × I_mp`) panel surya, kemudian mengonversi kelebihan tegangan panel menjadi **tambahan arus pengisian (Ampere)** ke baterai LiFePO4.',
    keyConcepts: ['Konverter DC-DC MPPT', 'Kurva I-V Fotovoltaik', 'Efisiensi Pengisian Baterai'],
    createdByStudent: 'Yohanes K. (Peer 01)',
    createdAt: '08:30 WITA',
    hitCount: 9,
    savedQuotaKB: 43.2,
    originSource: 'GEMINI_CLOUD_GATEWAY',
  },
  {
    id: 'cache-agro-mamar',
    moduleId: 'mod-biologi-agroforestri',
    subject: 'Biologi Pesisir',
    questionCanonical:
      'Bagaimana sistem agroforestri Mamar dan teras batu menjaga mata air tetap mengalir saat musim kemarau panjang di NTT?',
    normalizedTokens: normalizeQuestion(
      'Bagaimana sistem agroforestri Mamar dan teras batu menjaga mata air tetap mengalir saat musim kemarau panjang di NTT?'
    ),
    answerMarkdown:
      'Kombinasi **kebun agroforestri bertingkat (Mamar)** dan **terasering batu kontur** bekerja sebagai spons hidrologi alami pada lahan kering karst:\n\n`I_infiltrasi = P_hujan - (R_limpasan + ET_evapotranspirasi)`\n\n- **Redaman Energi Hujan oleh 3 Strata Tajuk:** Tajuk lontar, beringin, dan kelor memecah butiran hujan deras sehingga tidak memadatkan pori permukaan tanah.\n- **Penahanan Limpasan oleh Teras Batu:** Barisan batu karang di sepanjang garis kontur lereng memperlambat kecepatan aliran permukaan (*runoff*), memberi waktu bagi air untuk meresap melalui jalur perakaran dalam menuju celah akuifer batuan kapur.\n- **Pelepasan Lambat di Musim Kemarau:** Air yang tersimpan di rongga akuifer karst keluar secara bertahap melalui mata air desa sepanjang 7–8 bulan musim kemarau.',
    keyConcepts: ['Infiltrasi Akuifer Karst', 'Stratifikasi Tajuk Mamar', 'Konservasi Mata Air 3T'],
    createdByStudent: 'Ibu Margareta Ndolu (Pre-warm Simpul Guru)',
    createdAt: '07:55 WITA',
    hitCount: 12,
    savedQuotaKB: 57.6,
    originSource: 'TEACHER_PREWARM',
  },
  {
    id: 'cache-desal-surya',
    moduleId: 'mod-fisika-desalinasi',
    subject: 'Fisika Terapan',
    questionCanonical:
      'Bagaimana prinsip kerja distilasi surya (solar basin still) dan arang tempurung kelapa dalam memurnikan air payau pesisir?',
    normalizedTokens: normalizeQuestion(
      'Bagaimana prinsip kerja distilasi surya (solar basin still) dan arang tempurung kelapa dalam memurnikan air payau pesisir?'
    ),
    answerMarkdown:
      'Sistem **Distilasi Surya Termal & Filtrasi Biochar** memurnikan air payau pulau kecil melalui dua tahapan fisika-kimia tanpa membutuhkan listrik PLN:\n\n`m_distilat = (I_surya × A_kolektor × η_termal) / h_fg`\n\n- **1. Evaporasi & Kondensasi Kalor Laten:** Sinar matahari menembus kaca miring dan memanaskan air payau di atas dasar bak berlapis arang hitam. Molekul air murni (`H₂O`) menguap pada suhu 60°–75°C dengan menyerap kalor laten `h_fg ≈ 2.400 kJ/kg`, meninggalkan 99% garam `NaCl` di dasar bak. Saat uap menyentuh kaca dingin di atasnya, uap mengembun menjadi air tawar murni.\n- **2. Adsorpsi Biochar Tempurung Kelapa:** Air distilat dialirkan melewati kolom karbon aktif tempurung kelapa berpori mikro untuk mengikat sisa senyawa organik volatil dan menyeimbangkan rasa air agar segar diminum (`TDS < 50 ppm`).',
    keyConcepts: ['Kalor Laten Penguapan (h_fg)', 'Adsorpsi Biochar Kelapa', 'Desalinasi Termal 0-Listrik'],
    createdByStudent: 'Siti Rahmawati (Peer 04)',
    createdAt: '08:36 WITA',
    hitCount: 13,
    savedQuotaKB: 62.4,
    originSource: 'GEMINI_CLOUD_GATEWAY',
  },
];
