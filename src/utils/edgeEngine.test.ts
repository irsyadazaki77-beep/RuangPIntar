import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQuestion,
  computeQuestionSimilarity,
  findBestCacheMatch,
  selectOptimalChunkSource,
  computeNextChunkTransfers,
  calculateSwarmMetrics,
  validateQuestionSubmission,
  validateModuleSubmission,
  computeDeterministicChunkHash,
  calculateMicrohydroOutput,
  calculateMangroveMitigation,
  calculateGradebookSummary,
  type CacheEntry,
  type PeerNode,
  type LearningModule,
  type StudentSubmission,
} from './edgeEngine';

test('normalizeQuestion strips Indonesian stopwords and punctuation deterministically', () => {
  const tokens = normalizeQuestion('Pak Guru, bagaimana cara kerja turbin mikrohidro di sungai desa kita?');
  assert.equal(tokens.includes('pak'), false);
  assert.equal(tokens.includes('bagaimana'), false);
  assert.equal(tokens.includes('kerja'), true);
  assert.equal(tokens.includes('turbin'), true);
  assert.equal(tokens.includes('mikrohidro'), true);
});

test('computeQuestionSimilarity detects paraphrased student questions in Bahasa Indonesia', () => {
  const q1 = 'Bagaimana rumus menghitung daya listrik pada pembangkit mikrohidro dari tinggi jatuh air?';
  const q2 = 'Tolong jelaskan cara menghitung daya listrik mikrohidro berdasarkan tinggi jatuh air (head)!';
  const qUnrelated = 'Mengapa akar napas hutan mangrove mampu menahan abrasi gelombang laut?';

  const scoreSimilar = computeQuestionSimilarity(q1, q2);
  const scoreUnrelated = computeQuestionSimilarity(q1, qUnrelated);

  assert.equal(scoreSimilar >= 0.45, true, `Expected similar score >= 0.45, got ${scoreSimilar}`);
  assert.equal(scoreUnrelated < 0.25, true, `Expected unrelated score < 0.25, got ${scoreUnrelated}`);
});

test('findBestCacheMatch returns zero-quota local cache hit when similarity exceeds threshold', () => {
  const sampleCache: CacheEntry[] = [
    {
      id: 'cache-1',
      moduleId: 'mod-fisika-01',
      subject: 'Fisika Terapan',
      questionCanonical: 'Bagaimana cara menghitung daya listrik pembangkit mikrohidro dari debit dan tinggi jatuh air?',
      normalizedTokens: normalizeQuestion(
        'Bagaimana cara menghitung daya listrik pembangkit mikrohidro dari debit dan tinggi jatuh air?'
      ),
      answerMarkdown: 'Gunakan persamaan P = rho * g * Q * H * eta.',
      keyConcepts: ['Debit Air (Q)', 'Tinggi Jatuh (H)', 'Efisiensi Turbin'],
      createdByStudent: 'Yohanes (SMAN 1 Alor)',
      createdAt: '08:15 WITA',
      hitCount: 14,
      savedQuotaKB: 64.4,
      originSource: 'GEMINI_CLOUD_GATEWAY',
    },
  ];

  const hit = findBestCacheMatch(
    'Bagaimana menghitung daya listrik mikrohidro dari tinggi jatuh air dan debit?',
    'mod-fisika-01',
    sampleCache
  );
  assert.notEqual(hit, null);
  assert.equal(hit?.entry.id, 'cache-1');

  const miss = findBestCacheMatch(
    'Berapa sudut deklinasi bintang Pari Selatan saat navigasi malam?',
    'mod-matematika-03',
    sampleCache
  );
  assert.equal(miss, null);
});

test('selectOptimalChunkSource prioritizes student peers over Teacher Host to prevent router bottleneck', () => {
  const peers: PeerNode[] = [
    {
      id: 'host-guru',
      name: 'Laptop Guru (Simpul Utama)',
      deviceType: 'Laptop Guru (Host Node)',
      role: 'HOST',
      localIp: '192.168.43.1',
      rtcStatus: 'Menyemai Pecahan',
      latencyMs: 4,
      moduleChunks: { 'mod-1': [0, 1, 2, 3] },
      uploadedMB: 45,
      downloadedMB: 0,
      activeConnections: 6,
    },
    {
      id: 'peer-siswa-a',
      name: 'Siswa Maria (Peer 01)',
      deviceType: 'Laptop Siswa',
      role: 'PEER',
      localIp: '192.168.43.102',
      rtcStatus: 'DataChannel Terhubung',
      latencyMs: 6,
      moduleChunks: { 'mod-1': [0, 1] },
      uploadedMB: 8,
      downloadedMB: 12,
      activeConnections: 3,
    },
    {
      id: 'peer-siswa-b',
      name: 'Siswa Lukas (Peer 02)',
      deviceType: 'Laptop Siswa',
      role: 'PEER',
      localIp: '192.168.43.103',
      rtcStatus: 'DataChannel Terhubung',
      latencyMs: 7,
      moduleChunks: { 'mod-1': [] },
      uploadedMB: 0,
      downloadedMB: 0,
      activeConnections: 2,
    },
  ];

  // Chunk 0 is available on both Host and Siswa Maria -> must pick Siswa Maria (PEER)
  const sourceChunk0 = selectOptimalChunkSource('mod-1', 0, 'peer-siswa-b', peers);
  assert.equal(sourceChunk0?.id, 'peer-siswa-a');
  assert.equal(sourceChunk0?.role, 'PEER');

  // Chunk 3 is only on Host -> falls back to Host
  const sourceChunk3 = selectOptimalChunkSource('mod-1', 3, 'peer-siswa-b', peers);
  assert.equal(sourceChunk3?.id, 'host-guru');
  assert.equal(sourceChunk3?.role, 'HOST');
});

test('computeNextChunkTransfers schedules missing chunks and calculateSwarmMetrics tallies savings', () => {
  const dummyModule: LearningModule = {
    id: 'mod-1',
    code: 'FIS-3T-01',
    title: 'Fisika Energi Mikrohidro',
    subject: 'Fisika Terapan',
    gradeLevel: 'Kelas XI SMA/SMK',
    authorTeacher: 'Ibu Maria K.',
    schoolOrigin: 'SMAN 1 Kalabahi',
    sizeMB: 32,
    totalChunks: 4,
    chunkSizeKB: 2048,
    chunkHashes: ['c0', 'c1', 'c2', 'c3'],
    mediaType: 'Video & Simulasi Interaktif',
    imageUrl: '/test.jpg',
    summary: 'Ringkasan modul mikrohidro lengkap.',
    sections: [],
    simulationType: 'microhydro',
    checkpoints: [],
    updatedAt: '2026-11-05',
  };

  const peers: PeerNode[] = [
    {
      id: 'host-guru',
      name: 'Simpul Guru',
      deviceType: 'Laptop Guru (Host Node)',
      role: 'HOST',
      localIp: '192.168.43.1',
      rtcStatus: 'Menyemai Pecahan',
      latencyMs: 3,
      moduleChunks: { 'mod-1': [0, 1, 2, 3] },
      uploadedMB: 20,
      downloadedMB: 0,
      activeConnections: 4,
    },
    {
      id: 'peer-1',
      name: 'Peer Siswa 1',
      deviceType: 'Laptop Siswa',
      role: 'PEER',
      localIp: '192.168.43.11',
      rtcStatus: 'DataChannel Terhubung',
      latencyMs: 5,
      moduleChunks: { 'mod-1': [0, 1] },
      uploadedMB: 30,
      downloadedMB: 16,
      activeConnections: 3,
    },
    {
      id: 'peer-2',
      name: 'Peer Siswa 2',
      deviceType: 'Ponsel Siswa',
      role: 'PEER',
      localIp: '192.168.43.12',
      rtcStatus: 'DataChannel Terhubung',
      latencyMs: 8,
      moduleChunks: { 'mod-1': [0] },
      uploadedMB: 10,
      downloadedMB: 4,
      activeConnections: 2,
    },
  ];

  const transfers = computeNextChunkTransfers(dummyModule, 'peer-2', peers, 2);
  assert.equal(transfers.length, 2);
  assert.equal(transfers[0].chunkIndex, 1);
  assert.equal(transfers[0].fromPeerRole, 'PEER'); // Chunk 1 served from peer-1
  assert.equal(transfers[1].chunkIndex, 2);
  assert.equal(transfers[1].fromPeerRole, 'HOST'); // Chunk 2 served from host-guru

  const metrics = calculateSwarmMetrics(peers, [], [], 5);
  assert.equal(metrics.totalPeers, 3);
  assert.equal(metrics.studentPeersCount, 2);
  assert.equal(metrics.totalDataDistributedMB, 60);
  assert.equal(metrics.meshOffloadPercentage > 60, true);
});

test('validation helpers reject empty inputs and accept valid payloads', () => {
  assert.equal(validateQuestionSubmission('abc', 'mod-1').valid, false);
  assert.equal(validateQuestionSubmission('Bagaimana prinsip kerja turbin Pelton?', 'mod-1').valid, true);

  assert.equal(validateModuleSubmission({ title: 'A' }).valid, false);
  assert.equal(
    validateModuleSubmission({
      title: 'Instalasi Surya Atap Sekolah',
      subject: 'Teknik Energi',
      summary: 'Panduan perhitungan panel surya otonom untuk laboratorium sekolah.',
      sectionBody: 'Panel fotovoltaik mengubah radiasi foton matahari menjadi arus searah (DC).',
      sizeMB: 24,
    }).valid,
    true
  );
});

test('interactive simulation calculators produce accurate physics and ecology metrics', () => {
  const hydro = calculateMicrohydroOutput({
    headMeters: 25,
    flowLitersPerSec: 80,
    efficiencyPct: 75,
  });
  assert.equal(hydro.netElectricalPowerKW > 14, true);
  assert.equal(hydro.housesPowered >= 30, true);

  const mangrove = calculateMangroveMitigation({
    beltWidthMeters: 120,
    treeDensityPer100Sqm: 35,
    coastlineLengthKm: 2,
  });
  assert.equal(mangrove.waveEnergyReductionPct > 80, true);
  assert.equal(mangrove.protectionGrade, 'ZONA INTI KONSERVASI');
});

test('evaluateSimulationMission, calculateQuizChallengeScore, and computeStudentAchievements work deterministically', async () => {
  const {
    evaluateSimulationMission,
    calculateQuizChallengeScore,
    computeStudentAchievements,
  } = await import('./edgeEngine');

  const missionIncomplete = evaluateSimulationMission('microhydro', {
    netElectricalPowerKW: 10.5,
    housesPowered: 23,
  });
  assert.equal(missionIncomplete.completed, false);
  assert.equal(missionIncomplete.progressPct, 75);

  const missionComplete = evaluateSimulationMission('microhydro', {
    netElectricalPowerKW: 15.2,
    housesPowered: 33,
  });
  assert.equal(missionComplete.completed, true);
  assert.equal(missionComplete.progressPct, 100);

  const score = calculateQuizChallengeScore({
    isCorrect: true,
    isTimedMode: true,
    remainingSeconds: 20,
    currentStreak: 1,
  });
  assert.equal(score.earnedXp, 100 + 60 + 25);
  assert.equal(score.nextStreak, 2);

  const achievements = computeStudentAchievements({
    completedMissionsCount: 1,
    totalMissionsCount: 6,
    peerUploadedMB: 40,
    completedModulesChunksCount: 1,
    quizCorrectCount: 2,
    quizTimedWinsCount: 1,
    cacheHitsTriggered: 2,
  });
  assert.equal(achievements.unlockedCount, 4);
});

test('new 3T simulation calculators (solar, agroforestry, desalination), inline calculators, and deep curriculum search work accurately', async () => {
  const {
    calculateSolarPvOutput,
    calculateAgroforestryRetention,
    calculateSolarDesalinationOutput,
    evaluateInlineSectionCalculator,
    searchCurriculumModules,
  } = await import('./edgeEngine');
  const { INITIAL_MODULES } = await import('./seedData');

  const solar = calculateSolarPvOutput({
    panelCapacityWp: 1800,
    peakSunHours: 5.4,
    batteryCapacityKWh: 10,
  });
  assert.equal(solar.dailyHarvestKWh >= 7.5, true);
  assert.equal(solar.usableBatteryKWh, 8.5);
  assert.equal(solar.laptopsSupported >= 50, true);

  const agro = calculateAgroforestryRetention({
    canopyCoverPct: 75,
    stoneTerraceCount: 12,
    rainfallMmPerYr: 1100,
  });
  assert.equal(agro.infiltrationRatePct >= 75, true);
  assert.equal(agro.runoffErosionReductionPct >= 80, true);
  assert.equal(agro.springDrySeasonDebitLps >= 3.2, true);

  const desal = calculateSolarDesalinationOutput({
    collectorAreaSqm: 20,
    solarRadiationKWhPerSqm: 5.8,
    biocharFilterStages: 4,
  });
  assert.equal(desal.dailyFreshwaterLiters >= 75, true);
  assert.equal(desal.outputTdsPpm <= 60, true);

  const inlineHydro = evaluateInlineSectionCalculator('hydro_power', {
    headM: 20,
    qLps: 60,
    etaPct: 75,
  });
  assert.equal(inlineHydro.formattedValue.includes('kW'), true);

  const searchHits = searchCurriculumModules(INITIAL_MODULES, 'LiFePO4', 'ALL');
  assert.equal(searchHits.length >= 1, true);
  assert.equal(searchHits[0].module.id, 'mod-energi-surya');

  const { getSubjectTheme, getStudentLevelInfo } = await import('./subjectTheme');
  assert.equal(getSubjectTheme('Fisika Terapan').id, 'fisika');
  assert.equal(getSubjectTheme('Biologi Pesisir').id, 'biologi');
  assert.equal(getSubjectTheme('Matematika Maritim').id, 'matematika');
  assert.equal(getSubjectTheme('Teknik Energi').id, 'energi');

  const level2 = getStudentLevelInfo(345);
  assert.equal(level2.level, 2);
  assert.equal(level2.progressPct > 0, true);

  const {
    encodeBinaryChunkPayload,
    decodeBinaryChunkPayload,
    validateHostPinChange,
  } = await import('./edgeEngine');
  const encodedFrame = encodeBinaryChunkPayload(
    INITIAL_MODULES[0],
    2,
    'peer-siswa-01',
    'peer-siswa-05'
  );
  assert.equal(encodedFrame instanceof Uint8Array, true);
  assert.equal(encodedFrame.byteLength > 20, true);

  const decodedFrame = decodeBinaryChunkPayload(encodedFrame.buffer);
  assert.notEqual(decodedFrame, null);
  assert.equal(decodedFrame?.valid, true);
  assert.equal(decodedFrame?.moduleId, INITIAL_MODULES[0].id);
  assert.equal(decodedFrame?.chunkIndex, 2);
  assert.equal(decodedFrame?.fromPeerId, 'peer-siswa-01');
  assert.equal(decodedFrame?.toPeerId, 'peer-siswa-05');

  assert.equal(validateHostPinChange('wrong', '1945', '2026').valid, false);
  assert.equal(validateHostPinChange('1945', '1945', '2026').valid, true);
});

test('computeDeterministicChunkHash generates stable deterministic hashes for identical inputs', () => {
  const hash1 = computeDeterministicChunkHash('mod-fisika-01', 0, 'payload-content');
  const hash2 = computeDeterministicChunkHash('mod-fisika-01', 0, 'payload-content');
  const hashDiff = computeDeterministicChunkHash('mod-fisika-01', 1, 'payload-content');

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashDiff);
  assert.equal(hash1.startsWith('chk-'), true);
});
test('calculateGradebookSummary aggregates student quiz scores and simulation badges accurately', () => {
  const sampleSubs: StudentSubmission[] = [
    {
      id: 'sub-1',
      peerId: 'peer-1',
      studentName: 'Hendrikus',
      avatar: '🐬 Lumba-lumba',
      moduleId: 'mod-1',
      moduleTitle: 'Fisika Mikrohidro',
      quizScore: 100,
      totalQuestions: 1,
      passed: true,
      simulationCompleted: true,
      timestamp: '08:00 WITA',
      updatedMs: 1000,
    },
    {
      id: 'sub-2',
      peerId: 'peer-2',
      studentName: 'Maria',
      avatar: '🦅 Cendrawasih',
      moduleId: 'mod-1',
      moduleTitle: 'Fisika Mikrohidro',
      quizScore: 60,
      totalQuestions: 1,
      passed: false,
      simulationCompleted: false,
      timestamp: '08:05 WITA',
      updatedMs: 2000,
    },
  ];

  const summary = calculateGradebookSummary(sampleSubs);
  assert.equal(summary.totalSubmissions, 2);
  assert.equal(summary.averageScore, 80);
  assert.equal(summary.passRatePercent, 50);
  assert.equal(summary.simulationsCompletedCount, 1);
});

test('chunk integrity verification detects tampered bytes and corrupt payloads', async () => {
  const {
    encodeBinaryChunkPayload,
    decodeBinaryChunkPayload,
    computeDeterministicChunkHash,
  } = await import('./edgeEngine');
  const { INITIAL_MODULES } = await import('./seedData');

  const testModule = INITIAL_MODULES[0];
  const chunkIndex = 0;
  const originalPayload = testModule.sections[0].body;

  const validHash = computeDeterministicChunkHash(testModule.id, chunkIndex, originalPayload);
  assert.equal(typeof validHash, 'string');
  assert.equal(validHash.startsWith('chk-'), true);

  // Tampered payload must produce different hash
  const tamperedPayload = originalPayload + ' [TAMPERED DATA INJECTION]';
  const tamperedHash = computeDeterministicChunkHash(testModule.id, chunkIndex, tamperedPayload);
  assert.notEqual(validHash, tamperedHash);

  // Binary payload encoding and decoding verification
  const binaryFrame = encodeBinaryChunkPayload(testModule, chunkIndex, 'host-guru', 'peer-siswa-01');
  const decodedValid = decodeBinaryChunkPayload(binaryFrame);
  assert.notEqual(decodedValid, null);
  assert.equal(decodedValid?.valid, true);
  assert.equal(decodedValid?.moduleId, testModule.id);
  assert.equal(decodedValid?.chunkIndex, 0);

  // Tamper with binary frame bytes (flip header byte in magic marker)
  const corruptedFrame = new Uint8Array(binaryFrame);
  corruptedFrame[0] = 0x58; // Replace 'R' with 'X'
  const decodedCorrupt = decodeBinaryChunkPayload(corruptedFrame);
  assert.equal(decodedCorrupt, null);
});

test('zod runtime validation schemas enforce strict contracts', async () => {
  const {
    QuestionSubmissionSchema,
    ModuleSubmissionSchema,
    HostPinChangeSchema,
    StudentSubmissionSchema,
    BinaryChunkPayloadSchema,
  } = await import('./edgeEngine');

  // Question submission schema
  const validQuestion = QuestionSubmissionSchema.safeParse({
    question: 'Bagaimana prinsip kerja turbin air mikrohidro?',
    moduleId: 'mod-fisika-01',
  });
  assert.equal(validQuestion.success, true);

  const invalidQuestion = QuestionSubmissionSchema.safeParse({
    question: 'apa',
    moduleId: '',
  });
  assert.equal(invalidQuestion.success, false);

  // Module submission schema
  const invalidModule = ModuleSubmissionSchema.safeParse({
    title: 'abc',
    subject: '',
    sizeMB: 9999, // exceeds max 500 MB
  });
  assert.equal(invalidModule.success, false);

  // Host PIN change schema
  const invalidPin = HostPinChangeSchema.safeParse({
    currentPin: '',
    newPin: '12', // too short (< 4)
  });
  assert.equal(invalidPin.success, false);

  const validPin = HostPinChangeSchema.safeParse({
    currentPin: '1945',
    newPin: '2026',
  });
  assert.equal(validPin.success, true);

  // Student submission schema
  const validSubmission = StudentSubmissionSchema.safeParse({
    id: 'sub-test-1',
    peerId: 'peer-siswa-05',
    studentName: 'Hendrikus',
    avatar: '🐬 Lumba-lumba',
    moduleId: 'mod-fisika-01',
    moduleTitle: 'Fisika Mikrohidro',
    quizScore: 90,
    totalQuestions: 2,
    passed: true,
    simulationCompleted: true,
    timestamp: '09:00 WITA',
    updatedMs: Date.now(),
  });
  assert.equal(validSubmission.success, true);

  // Binary chunk payload schema
  const validChunkPayload = BinaryChunkPayloadSchema.safeParse({
    magic: 'RPE1',
    moduleCode: 'FIS-01',
    moduleId: 'mod-1',
    chunkIndex: 0,
    totalChunks: 16,
    chunkHash: 'chk-abc-00',
    fromPeerId: 'host-guru',
    toPeerId: 'peer-01',
    contentPayload: 'sample curriculum content',
  });
  assert.equal(validChunkPayload.success, true);
});
