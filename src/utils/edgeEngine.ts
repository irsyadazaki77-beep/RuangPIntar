import { z } from 'zod';

export const QuestionSubmissionSchema = z.object({
  question: z.string().trim().min(5, 'Pertanyaan harus diisi minimal 5 karakter agar dapat diproses oleh gateway.'),
  moduleId: z.string().trim().min(1, 'Pilih modul pembelajaran terkait terlebih dahulu.'),
  askedByPeerName: z.string().trim().optional(),
  forceCloudRefresh: z.boolean().optional(),
});

export const ModuleSubmissionSchema = z.object({
  title: z.string().trim().min(4, 'Judul modul wajib diisi (minimal 4 karakter).'),
  subject: z.string().trim().min(1, 'Mata pelajaran wajib dipilih.'),
  gradeLevel: z.string().trim().optional(),
  summary: z.string().trim().min(10, 'Ringkasan materi wajib diisi (minimal 10 karakter).'),
  sectionHeading: z.string().trim().optional(),
  sectionBody: z.string().trim().min(15, 'Isi materi utama wajib diisi (minimal 15 karakter).'),
  formula: z.string().trim().optional(),
  keyTakeaway: z.string().trim().optional(),
  sizeMB: z.number().min(1, 'Ukuran paket modul harus berada di antara 1 MB hingga 500 MB.').max(500, 'Ukuran paket modul harus berada di antara 1 MB hingga 500 MB.'),
});

export const HostPinChangeSchema = z.object({
  currentPin: z.string().trim().min(1, 'PIN saat ini wajib diisi.'),
  newPin: z.string().trim().min(4, 'PIN baru harus terdiri dari 4 hingga 12 karakter/angka.').max(12, 'PIN baru harus terdiri dari 4 hingga 12 karakter/angka.'),
});

export const StudentSubmissionSchema = z.object({
  id: z.string().min(1),
  peerId: z.string().trim().min(1),
  studentName: z.string().trim().min(1),
  avatar: z.string().default('🐬 Lumba-lumba'),
  moduleId: z.string().trim().min(1),
  moduleTitle: z.string().trim().min(1),
  quizScore: z.number().min(0),
  totalQuestions: z.number().min(1),
  passed: z.boolean(),
  simulationCompleted: z.boolean().default(false),
  timestamp: z.string(),
  updatedMs: z.number(),
});

export const BinaryChunkPayloadSchema = z.object({
  magic: z.literal('RPE1'),
  moduleCode: z.string().min(1),
  moduleId: z.string().min(1),
  chunkIndex: z.number().min(0),
  totalChunks: z.number().min(1),
  chunkHash: z.string().min(1),
  fromPeerId: z.string().min(1),
  toPeerId: z.string().min(1),
  contentPayload: z.string(),
});

export const SignalingMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('peer:identify'),
    peerId: z.string().min(1),
    studentName: z.string().min(1),
    avatar: z.string().optional(),
    deviceType: z.string().optional(),
  }),
  z.object({
    type: z.literal('webrtc:offer'),
    targetClientId: z.string().min(1),
    sdp: z.any(),
    fromClientId: z.string().optional(),
  }),
  z.object({
    type: z.literal('webrtc:answer'),
    targetClientId: z.string().min(1),
    sdp: z.any(),
    fromClientId: z.string().optional(),
  }),
  z.object({
    type: z.literal('webrtc:ice'),
    targetClientId: z.string().min(1),
    candidate: z.any(),
    fromClientId: z.string().optional(),
  }),
  z.object({
    type: z.literal('webrtc:chunk-request'),
    targetClientId: z.string().min(1),
    moduleId: z.string().min(1),
    chunkIndex: z.number().min(0),
    fromClientId: z.string().optional(),
  }),
]);

export type QuestionSubmissionInput = z.infer<typeof QuestionSubmissionSchema>;
export type ModuleSubmissionInput = z.infer<typeof ModuleSubmissionSchema>;
export type HostPinChangeInput = z.infer<typeof HostPinChangeSchema>;
export type BinaryChunkPayloadData = z.infer<typeof BinaryChunkPayloadSchema>;
export type SignalingMessageData = z.infer<typeof SignalingMessageSchema>;

export type SimulationType =
  | 'microhydro'
  | 'mangrove'
  | 'navigation'
  | 'solar'
  | 'agroforestry'
  | 'desalination';

export type InlineCalculatorId =
  | 'hydro_power'
  | 'penstock_head'
  | 'elc_frequency'
  | 'mangrove_wave'
  | 'blue_carbon'
  | 'vector_drift'
  | 'star_latitude'
  | 'solar_energy'
  | 'lifepo4_autonomy'
  | 'infiltration_rate'
  | 'spring_debit'
  | 'still_distillate'
  | 'biochar_tds'
  | 'sd_unit_convert'
  | 'smp_heat_calorimetry'
  | 'smp_ohms_law'
  | 'smp_pythagoras';

export interface InlineCalculatorVariable {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface SectionInlineCalculator {
  id: InlineCalculatorId;
  title: string;
  resultLabel: string;
  resultUnit: string;
  variables: InlineCalculatorVariable[];
}

export interface ModuleCheckpoint {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: 'Dasar' | 'Menengah' | 'Analitis Lapangan';
}

export interface ModuleSection {
  heading: string;
  body: string;
  formula?: string;
  keyTakeaway: string;
  visualSchemaTitle?: string;
  visualSteps?: string[];
  calculator?: SectionInlineCalculator;
}

export interface ModuleCaseStudy {
  title: string;
  location: string;
  challenge: string;
  solution: string;
  impactMetrics: string[];
}

export interface ModuleGlossaryItem {
  term: string;
  symbolOrUnit: string;
  definition: string;
}

export interface GuidedExerciseStep {
  stepTitle: string;
  formulaOrHint: string;
  calculationResult: string;
}

export interface ModuleGuidedExercise {
  id: string;
  title: string;
  scenarioContext: string;
  givenData: string[];
  steps: GuidedExerciseStep[];
  finalConclusion: string;
}

export type EducationTier = 'SD' | 'SMP' | 'SMA';

export interface LearningModule {
  id: string;
  code: string;
  title: string;
  subject: 'Fisika Terapan' | 'Biologi Pesisir' | 'Matematika Maritim' | 'Teknik Energi';
  gradeLevel: string;
  educationTier?: EducationTier;
  authorTeacher: string;
  schoolOrigin: string;
  sizeMB: number;
  totalChunks: number;
  chunkSizeKB: number;
  chunkHashes: string[];
  mediaType: 'Video & Simulasi Interaktif' | 'Modul Teks & Diagram' | 'Dokumen & Eksperimen';
  imageUrl: string;
  summary: string;
  sections: ModuleSection[];
  caseStudy?: ModuleCaseStudy;
  glossary?: ModuleGlossaryItem[];
  guidedExercises?: ModuleGuidedExercise[];
  simulationType: SimulationType;
  checkpoints: ModuleCheckpoint[];
  updatedAt: string;
}

export interface PeerNode {
  id: string;
  name: string;
  deviceType: 'Laptop Guru (Host Node)' | 'Laptop Siswa' | 'Ponsel Siswa';
  role: 'HOST' | 'PEER';
  localIp: string;
  rtcStatus: 'DataChannel Terhubung' | 'Siaga Mesh' | 'Menyemai Pecahan';
  latencyMs: number;
  /** Map from moduleId -> array of chunk indices (0..totalChunks-1) held by this peer */
  moduleChunks: Record<string, number[]>;
  uploadedMB: number;
  downloadedMB: number;
  activeConnections: number;
}

export interface ChunkTransferEvent {
  id: string;
  timestamp: string;
  moduleId: string;
  moduleTitle: string;
  chunkIndex: number;
  chunkHash: string;
  fromPeerId: string;
  fromPeerName: string;
  fromPeerRole: 'HOST' | 'PEER';
  toPeerId: string;
  toPeerName: string;
  sizeKB: number;
  channelProtocol: 'WebRTC DataChannel (SCTP)' | 'LAN Seed Fallback';
  zeroIspQuota: boolean;
}

export interface CacheEntry {
  id: string;
  moduleId: string;
  subject: string;
  questionCanonical: string;
  normalizedTokens: string[];
  answerMarkdown: string;
  keyConcepts: string[];
  createdByStudent: string;
  createdAt: string;
  hitCount: number;
  savedQuotaKB: number;
  originSource: 'GEMINI_CLOUD_GATEWAY' | 'TEACHER_PREWARM' | 'LOCAL_EDGE_SYNTHESIS';
}

export interface PendingAiQuestion {
  id: string;
  question: string;
  moduleId: string;
  moduleTitle: string;
  askedByPeerName: string;
  createdAt: string;
  createdMs: number;
}

export interface ClassroomBroadcast {
  message: string;
  focusModuleId?: string;
  examMode: boolean;
  updatedAt: string;
  updatedMs: number;
}

export interface TutorAskResponse {
  queryId: string;
  question: string;
  askedByPeerName: string;
  moduleId: string;
  answerMarkdown: string;
  keyConcepts: string[];
  source: 'LOCAL_CACHE' | 'CLOUD_GEMINI_GATEWAY' | 'LOCAL_EDGE_SYNTHESIS';
  similarityScore: number;
  matchedCanonicalQuestion?: string;
  latencyMs: number;
  ispQuotaBytesUsed: number;
  ispQuotaKBaved: number;
  cacheEntryId: string;
  timestamp: string;
}

export interface SwarmMetrics {
  totalPeers: number;
  studentPeersCount: number;
  totalDataDistributedMB: number;
  peerToPeerOffloadedMB: number;
  hostDirectSeededMB: number;
  meshOffloadPercentage: number;
  ispQuotaSavedMB: number;
  routerBottleneckReductionPct: number;
  totalCacheEntries: number;
  totalCacheHits: number;
  totalCloudQueries: number;
  cacheHitRatioPct: number;
  aiQuotaSavedKB: number;
}

const INDONESIAN_STOPWORDS = new Set([
  'apa', 'apakah', 'bagaimana', 'bagaimanakah', 'mengapa', 'kenapa', 'kapan',
  'dimana', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'dan',
  'atau', 'yang', 'adalah', 'ialah', 'merupakan', 'itu', 'ini', 'tersebut',
  'bisa', 'dapat', 'akan', 'sudah', 'telah', 'sedang', 'oleh', 'karena',
  'jika', 'kalau', 'bila', 'saat', 'ketika', 'tolong', 'jelaskan', 'sebutkan',
  'uraikan', 'ceritakan', 'kasih', 'tahu', 'dong', 'ya', 'pak', 'bu', 'guru',
  'kak', 'saya', 'aku', 'kami', 'kita', 'cara', 'maksud', 'arti', 'fungsi'
]);

/**
 * Normalizes an Indonesian educational query into lowercase alphanumeric root tokens
 * and strips common conversational fillers and light suffixes (-nya, -kan, -lah).
 */
export function normalizeQuestion(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const tokens = cleaned
    .split(' ')
    .map((word) => {
      let stem = word;
      if (stem.length > 5 && stem.endsWith('nya')) {
        stem = stem.slice(0, -3);
      } else if (stem.length > 5 && stem.endsWith('lah')) {
        stem = stem.slice(0, -3);
      }
      return stem;
    })
    .filter((word) => word.length >= 2 && !INDONESIAN_STOPWORDS.has(word));

  return Array.from(new Set(tokens));
}

function getCharTrigrams(text: string): Set<string> {
  const compact = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const trigrams = new Set<string>();
  if (compact.length < 3) {
    if (compact.length > 0) trigrams.add(compact);
    return trigrams;
  }
  for (let i = 0; i <= compact.length - 3; i++) {
    trigrams.add(compact.slice(i, i + 3));
  }
  return trigrams;
}

/**
 * Computes semantic/lexical similarity [0..1] between two questions in Bahasa Indonesia
 * combining token overlap (Jaccard + containment) and character trigram similarity.
 */
export function computeQuestionSimilarity(queryA: string, queryB: string): number {
  const tokensA = normalizeQuestion(queryA);
  const tokensB = normalizeQuestion(queryB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) {
      intersection += 1;
    } else {
      for (const b of setB) {
        if (t.length >= 4 && b.length >= 4 && (t.includes(b) || b.includes(t))) {
          intersection += 0.75;
          break;
        }
      }
    }
  }

  const union = setA.size + setB.size - Math.min(intersection, Math.min(setA.size, setB.size));
  const jaccard = union > 0 ? intersection / union : 0;
  const minSize = Math.min(setA.size, setB.size);
  const containment = minSize > 0 ? Math.min(1, intersection / minSize) : 0;

  const trigramsA = getCharTrigrams(tokensA.join(''));
  const trigramsB = getCharTrigrams(tokensB.join(''));
  let triInter = 0;
  for (const tri of trigramsA) {
    if (trigramsB.has(tri)) triInter++;
  }
  const triUnion = trigramsA.size + trigramsB.size - triInter;
  const trigramScore = triUnion > 0 ? triInter / triUnion : 0;

  const combined = jaccard * 0.45 + containment * 0.35 + trigramScore * 0.2;
  return Number(Math.min(1, combined).toFixed(4));
}

export interface CacheMatchResult {
  entry: CacheEntry;
  similarityScore: number;
}

/**
 * Searches the Teacher Host Node's local cache for a matching question.
 * Prioritizes same-module matches while also allowing high-confidence cross-module hits.
 */
export function findBestCacheMatch(
  question: string,
  moduleId: string,
  cacheEntries: CacheEntry[],
  threshold = 0.42
): CacheMatchResult | null {
  let bestEntry: CacheEntry | null = null;
  let bestScore = 0;

  for (const entry of cacheEntries) {
    const rawScore = computeQuestionSimilarity(question, entry.questionCanonical);
    const moduleBonus = entry.moduleId === moduleId ? 0.06 : 0;
    const effectiveScore = Math.min(1, Number((rawScore + (rawScore >= 0.3 ? moduleBonus : 0)).toFixed(4)));

    if (effectiveScore > bestScore) {
      bestScore = effectiveScore;
      bestEntry = entry;
    }
  }

  if (bestEntry && bestScore >= threshold) {
    return {
      entry: bestEntry,
      similarityScore: bestScore,
    };
  }
  return null;
}

/**
 * Selects the optimal peer to serve a specific chunk to `targetPeerId`.
 */
export function selectOptimalChunkSource(
  moduleId: string,
  chunkIndex: number,
  targetPeerId: string,
  peers: PeerNode[]
): PeerNode | null {
  const candidates = peers.filter((p) => {
    if (p.id === targetPeerId) return false;
    const held = p.moduleChunks[moduleId] || [];
    return held.includes(chunkIndex);
  });

  if (candidates.length === 0) return null;

  const studentCandidates = candidates.filter((p) => p.role === 'PEER');
  if (studentCandidates.length > 0) {
    studentCandidates.sort((a, b) => {
      if (a.uploadedMB !== b.uploadedMB) return a.uploadedMB - b.uploadedMB;
      return a.latencyMs - b.latencyMs;
    });
    return studentCandidates[0];
  }

  const hostCandidates = candidates.filter((p) => p.role === 'HOST');
  return hostCandidates[0] || candidates[0];
}

export interface PlannedChunkTransfer {
  moduleId: string;
  chunkIndex: number;
  fromPeerId: string;
  fromPeerName: string;
  fromPeerRole: 'HOST' | 'PEER';
  toPeerId: string;
  toPeerName: string;
  sizeKB: number;
}

/**
 * Computes up to `maxChunksPerStep` chunk transfers for a target student peer
 * downloading a module across the WebRTC mesh swarm.
 */
export function computeNextChunkTransfers(
  module: LearningModule,
  targetPeerId: string,
  peers: PeerNode[],
  maxChunksPerStep = 4
): PlannedChunkTransfer[] {
  const targetPeer = peers.find((p) => p.id === targetPeerId);
  if (!targetPeer) return [];

  const heldSet = new Set(targetPeer.moduleChunks[module.id] || []);
  const missingChunks: number[] = [];
  for (let i = 0; i < module.totalChunks; i++) {
    if (!heldSet.has(i)) {
      missingChunks.push(i);
    }
  }

  if (missingChunks.length === 0) return [];

  const transfers: PlannedChunkTransfer[] = [];
  const chosenChunks = missingChunks.slice(0, maxChunksPerStep);

  const tempPeers = peers.map((p) => ({
    ...p,
    moduleChunks: { ...p.moduleChunks },
  }));

  for (const chunkIdx of chosenChunks) {
    const source = selectOptimalChunkSource(module.id, chunkIdx, targetPeerId, tempPeers);
    if (source) {
      transfers.push({
        moduleId: module.id,
        chunkIndex: chunkIdx,
        fromPeerId: source.id,
        fromPeerName: source.name,
        fromPeerRole: source.role,
        toPeerId: targetPeer.id,
        toPeerName: targetPeer.name,
        sizeKB: module.chunkSizeKB,
      });
      source.uploadedMB = Number((source.uploadedMB + module.chunkSizeKB / 1024).toFixed(2));
    }
  }

  return transfers;
}

/**
 * Calculates aggregate P2P mesh bandwidth offloading and Single-Gateway AI Cache efficiency metrics.
 */
export function calculateSwarmMetrics(
  peers: PeerNode[],
  transferHistory: ChunkTransferEvent[],
  cacheEntries: CacheEntry[],
  cloudQueriesCount: number
): SwarmMetrics {
  const studentPeers = peers.filter((p) => p.role === 'PEER');

  let peerOffloadedKB = 0;
  let hostSeededKB = 0;

  for (const tx of transferHistory) {
    if (tx.fromPeerRole === 'PEER') {
      peerOffloadedKB += tx.sizeKB;
    } else {
      hostSeededKB += tx.sizeKB;
    }
  }

  const peerUploadedBaselineMB = studentPeers.reduce((acc, p) => acc + p.uploadedMB, 0);
  const hostUploadedBaselineMB = peers
    .filter((p) => p.role === 'HOST')
    .reduce((acc, p) => acc + p.uploadedMB, 0);

  const peerToPeerOffloadedMB = Number((peerUploadedBaselineMB + peerOffloadedKB / 1024).toFixed(2));
  const hostDirectSeededMB = Number((hostUploadedBaselineMB + hostSeededKB / 1024).toFixed(2));
  const totalDataDistributedMB = Number((peerToPeerOffloadedMB + hostDirectSeededMB).toFixed(2));

  const meshOffloadPercentage =
    totalDataDistributedMB > 0
      ? Number(((peerToPeerOffloadedMB / totalDataDistributedMB) * 100).toFixed(1))
      : 0;

  const totalCacheHits = cacheEntries.reduce((acc, e) => acc + e.hitCount, 0);
  const totalQueries = totalCacheHits + Math.max(1, cloudQueriesCount);
  const cacheHitRatioPct = Number(((totalCacheHits / totalQueries) * 100).toFixed(1));
  const aiQuotaSavedKB = Number(
    cacheEntries.reduce((acc, e) => acc + e.savedQuotaKB, 0).toFixed(1)
  );

  return {
    totalPeers: peers.length,
    studentPeersCount: studentPeers.length,
    totalDataDistributedMB,
    peerToPeerOffloadedMB,
    hostDirectSeededMB,
    meshOffloadPercentage,
    ispQuotaSavedMB: totalDataDistributedMB,
    routerBottleneckReductionPct: meshOffloadPercentage,
    totalCacheEntries: cacheEntries.length,
    totalCacheHits,
    totalCloudQueries: cloudQueriesCount,
    cacheHitRatioPct,
    aiQuotaSavedKB,
  };
}

export interface ValidationOutcome {
  valid: boolean;
  error?: string;
}

export function validateQuestionSubmission(question: string, moduleId: string): ValidationOutcome {
  const result = QuestionSubmissionSchema.safeParse({ question, moduleId });
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      valid: false,
      error: firstIssue?.message || 'Pertanyaan tidak valid.',
    };
  }
  return { valid: true };
}

export function validateModuleSubmission(input: {
  title?: string;
  subject?: string;
  gradeLevel?: string;
  summary?: string;
  sectionHeading?: string;
  sectionBody?: string;
  formula?: string;
  keyTakeaway?: string;
  sizeMB?: number;
}): ValidationOutcome {
  const result = ModuleSubmissionSchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      valid: false,
      error: firstIssue?.message || 'Format modul tidak valid.',
    };
  }
  return { valid: true };
}

/**
 * 1. Interactive Physics Simulation calculation for Micro-Hydro Power Plant (PLTMH)
 * P = rho * g * Q * H * eta
 */
export function calculateMicrohydroOutput(params: {
  headMeters: number;
  flowLitersPerSec: number;
  efficiencyPct: number;
}): {
  theoreticalPowerKW: number;
  netElectricalPowerKW: number;
  housesPowered: number;
  dailyEnergyKWh: number;
  statusLabel: 'NOMINAL DESA MANDIRI' | 'KAPASITAS RENDAH' | 'OPTIMAL KOMUNITAS';
} {
  const g = 9.81;
  const qCubicMeters = Math.max(0, params.flowLitersPerSec) / 1000;
  const h = Math.max(0, params.headMeters);
  const eta = Math.min(100, Math.max(10, params.efficiencyPct)) / 100;

  const theoreticalPowerKW = Number((qCubicMeters * h * g).toFixed(2));
  const netElectricalPowerKW = Number((theoreticalPowerKW * eta).toFixed(2));
  const housesPowered = Math.floor(netElectricalPowerKW / 0.45);
  const dailyEnergyKWh = Number((netElectricalPowerKW * 24).toFixed(1));

  let statusLabel: 'NOMINAL DESA MANDIRI' | 'KAPASITAS RENDAH' | 'OPTIMAL KOMUNITAS' = 'NOMINAL DESA MANDIRI';
  if (netElectricalPowerKW < 3) {
    statusLabel = 'KAPASITAS RENDAH';
  } else if (netElectricalPowerKW >= 12) {
    statusLabel = 'OPTIMAL KOMUNITAS';
  }

  return {
    theoreticalPowerKW,
    netElectricalPowerKW,
    housesPowered,
    dailyEnergyKWh,
    statusLabel,
  };
}

/**
 * 2. Interactive Biology Simulation calculation for Coastal Mangrove Belt
 */
export function calculateMangroveMitigation(params: {
  beltWidthMeters: number;
  treeDensityPer100Sqm: number;
  coastlineLengthKm: number;
}): {
  waveEnergyReductionPct: number;
  annualCarbonSequesteredTons: number;
  juvenileFishBiomassKgPerYr: number;
  protectionGrade: 'PERISAI PESISIR KUAT' | 'PERLU REHABILITASI' | 'ZONA INTI KONSERVASI';
} {
  const width = Math.max(5, params.beltWidthMeters);
  const density = Math.max(5, params.treeDensityPer100Sqm);
  const lengthKm = Math.max(0.5, params.coastlineLengthKm);

  const areaHectares = (width * (lengthKm * 1000)) / 10000;
  const waveFactor = Math.min(0.96, 1 - Math.exp(-0.012 * width * (density / 25)));
  const waveEnergyReductionPct = Number((waveFactor * 100).toFixed(1));

  const annualCarbonSequesteredTons = Number(
    (areaHectares * 18.5 * (density / 30)).toFixed(1)
  );
  const juvenileFishBiomassKgPerYr = Math.round(areaHectares * 420 * (density / 25));

  let protectionGrade: 'PERISAI PESISIR KUAT' | 'PERLU REHABILITASI' | 'ZONA INTI KONSERVASI' =
    'PERISAI PESISIR KUAT';
  if (waveEnergyReductionPct < 55) {
    protectionGrade = 'PERLU REHABILITASI';
  } else if (waveEnergyReductionPct >= 82) {
    protectionGrade = 'ZONA INTI KONSERVASI';
  }

  return {
    waveEnergyReductionPct,
    annualCarbonSequesteredTons,
    juvenileFishBiomassKgPerYr,
    protectionGrade,
  };
}

/**
 * 3. Interactive Energy Engineering Simulation calculation for Off-Grid Solar PV & LiFePO4 Battery
 */
export function calculateSolarPvOutput(params: {
  panelCapacityWp: number;
  peakSunHours: number;
  batteryCapacityKWh: number;
}): {
  dailyHarvestKWh: number;
  usableBatteryKWh: number;
  autonomyHours: number;
  laptopsSupported: number;
  statusLabel: 'MANDIRI 24 JAM' | 'DEFISIT MALAM' | 'SURPLUS LABORATORIUM';
} {
  const wp = Math.max(100, params.panelCapacityWp);
  const psh = Math.max(2, params.peakSunHours);
  const batt = Math.max(1, params.batteryCapacityKWh);
  const systemDerating = 0.82; // MPPT + inverter + thermal derating

  const dailyHarvestKWh = Number(((wp / 1000) * psh * systemDerating).toFixed(2));
  const usableBatteryKWh = Number((batt * 0.85).toFixed(2)); // 85% DoD for LiFePO4
  // Classroom Edge load: Teacher Laptop + Router + Student charging = ~0.22 kW continuous
  const autonomyHours = Math.min(72, Math.round(usableBatteryKWh / 0.22));
  const laptopsSupported = Math.max(1, Math.floor((dailyHarvestKWh * 1000) / 145));

  let statusLabel: 'MANDIRI 24 JAM' | 'DEFISIT MALAM' | 'SURPLUS LABORATORIUM' = 'MANDIRI 24 JAM';
  if (dailyHarvestKWh < 3.2 || autonomyHours < 14) {
    statusLabel = 'DEFISIT MALAM';
  } else if (dailyHarvestKWh >= 6.5 && autonomyHours >= 24) {
    statusLabel = 'SURPLUS LABORATORIUM';
  }

  return {
    dailyHarvestKWh,
    usableBatteryKWh,
    autonomyHours,
    laptopsSupported,
    statusLabel,
  };
}

/**
 * 4. Interactive Dryland Agroforestry & Spring Catchment Hydrology Simulation
 */
export function calculateAgroforestryRetention(params: {
  canopyCoverPct: number;
  stoneTerraceCount: number;
  rainfallMmPerYr: number;
}): {
  infiltrationRatePct: number;
  runoffErosionReductionPct: number;
  springDrySeasonDebitLps: number;
  familiesWaterSupplied: number;
  hydrologyGrade: 'MATA AIR LESTARI' | 'RAWAN KEKERINGAN' | 'DAS KONSERVASI UNGGUL';
} {
  const canopy = Math.min(95, Math.max(10, params.canopyCoverPct));
  const terraces = Math.max(1, params.stoneTerraceCount);
  const rain = Math.max(400, params.rainfallMmPerYr);

  const infiltrationRatePct = Number(
    Math.min(88, 18 + canopy * 0.52 + terraces * 2.1).toFixed(1)
  );
  const runoffErosionReductionPct = Number(
    Math.min(94, 22 + canopy * 0.48 + terraces * 2.5).toFixed(1)
  );
  const springDrySeasonDebitLps = Number(
    ((rain / 1000) * (infiltrationRatePct / 100) * (1 + terraces * 0.08) * 4.2).toFixed(2)
  );
  const familiesWaterSupplied = Math.floor((springDrySeasonDebitLps * 86400) / 400);

  let hydrologyGrade: 'MATA AIR LESTARI' | 'RAWAN KEKERINGAN' | 'DAS KONSERVASI UNGGUL' =
    'MATA AIR LESTARI';
  if (infiltrationRatePct < 48) {
    hydrologyGrade = 'RAWAN KEKERINGAN';
  } else if (infiltrationRatePct >= 72 && springDrySeasonDebitLps >= 3.2) {
    hydrologyGrade = 'DAS KONSERVASI UNGGUL';
  }

  return {
    infiltrationRatePct,
    runoffErosionReductionPct,
    springDrySeasonDebitLps,
    familiesWaterSupplied,
    hydrologyGrade,
  };
}

/**
 * 5. Interactive Solar Thermal Desalination & Biochar Filtration Simulation
 */
export function calculateSolarDesalinationOutput(params: {
  collectorAreaSqm: number;
  solarRadiationKWhPerSqm: number;
  biocharFilterStages: number;
}): {
  dailyFreshwaterLiters: number;
  salinityReductionPct: number;
  outputTdsPpm: number;
  studentsDrinkingQuota: number;
  waterQualityStatus: 'LAYAK MINUM WHO' | 'KAPASITAS TERBATAS' | 'SENTRA AIR BERSIH PESISIR';
} {
  const area = Math.max(2, params.collectorAreaSqm);
  const irrad = Math.max(3.0, params.solarRadiationKWhPerSqm);
  const stages = Math.max(1, params.biocharFilterStages);

  // Latent heat of vaporization h_fg ~ 2.4 MJ/kg (~0.667 kWh/L), thermal efficiency ~ 44% + stage boost
  const thermalEfficiency = 0.42 + Math.min(0.12, stages * 0.025);
  const litersPerSqm = (irrad * thermalEfficiency) / 0.667;
  const dailyFreshwaterLiters = Number((area * litersPerSqm).toFixed(1));
  const salinityReductionPct = Number(Math.min(99.6, 94.5 + stages * 1.2).toFixed(1));
  const outputTdsPpm = Math.max(18, Math.round(180 - stages * 35));
  const studentsDrinkingQuota = Math.floor(dailyFreshwaterLiters / 2.5);

  let waterQualityStatus: 'LAYAK MINUM WHO' | 'KAPASITAS TERBATAS' | 'SENTRA AIR BERSIH PESISIR' =
    'LAYAK MINUM WHO';
  if (dailyFreshwaterLiters < 35) {
    waterQualityStatus = 'KAPASITAS TERBATAS';
  } else if (dailyFreshwaterLiters >= 75 && outputTdsPpm <= 60) {
    waterQualityStatus = 'SENTRA AIR BERSIH PESISIR';
  }

  return {
    dailyFreshwaterLiters,
    salinityReductionPct,
    outputTdsPpm,
    studentsDrinkingQuota,
    waterQualityStatus,
  };
}

export interface SimulationMissionEvaluation {
  missionTitle: string;
  targetDescription: string;
  currentProgressText: string;
  progressPct: number;
  completed: boolean;
  rewardXp: number;
}

/**
 * Evaluates guided laboratory mission completion and progress percentage
 * across all 6 contextual 3T simulations.
 */
export function evaluateSimulationMission(
  simulationType: SimulationType,
  metrics: {
    netElectricalPowerKW?: number;
    housesPowered?: number;
    waveEnergyReductionPct?: number;
    annualCarbonSequesteredTons?: number;
    effectiveSpeedKnots?: number;
    crossingTimeMinutes?: number;
    dailyHarvestKWh?: number;
    autonomyHours?: number;
    infiltrationRatePct?: number;
    springDrySeasonDebitLps?: number;
    dailyFreshwaterLiters?: number;
    outputTdsPpm?: number;
  }
): SimulationMissionEvaluation {
  if (simulationType === 'microhydro') {
    const power = metrics.netElectricalPowerKW ?? 0;
    const houses = metrics.housesPowered ?? 0;
    const targetPower = 14.0;
    const progressPct = Math.min(100, Math.round((power / targetPower) * 100));
    const completed = power >= targetPower;

    return {
      missionTitle: 'Misi Elektrifikasi Desa Mandiri',
      targetDescription: 'Capai daya listrik bersih minimal 14,0 kW (menerangi ≥ 31 rumah warga & sekolah)',
      currentProgressText: `${power.toFixed(2)} / 14,00 kW (${houses} rumah)`,
      progressPct,
      completed,
      rewardXp: 150,
    };
  }

  if (simulationType === 'mangrove') {
    const reduction = metrics.waveEnergyReductionPct ?? 0;
    const carbon = metrics.annualCarbonSequesteredTons ?? 0;
    const targetReduction = 85.0;
    const progressPct = Math.min(100, Math.round((reduction / targetReduction) * 100));
    const completed = reduction >= targetReduction && carbon >= 250;

    return {
      missionTitle: 'Misi Perisai Pesisir & Karbon Biru',
      targetDescription: 'Redam minimal 85% energi gelombang pasang & serap ≥ 250 ton CO₂e/tahun',
      currentProgressText: `Redaman ${reduction.toFixed(1)}% · Karbon ${carbon.toFixed(1)} ton/thn`,
      progressPct,
      completed,
      rewardXp: 150,
    };
  }

  if (simulationType === 'solar') {
    const harvest = metrics.dailyHarvestKWh ?? 0;
    const autonomy = metrics.autonomyHours ?? 0;
    const targetHarvest = 6.5;
    const progressPct = Math.min(100, Math.round((harvest / targetHarvest) * 100));
    const completed = harvest >= targetHarvest && autonomy >= 24;

    return {
      missionTitle: 'Misi Sekolah Kepulauan Mandiri Energi 24 Jam',
      targetDescription: 'Panen energi surya ≥ 6,5 kWh/hari dengan otonomi baterai LiFePO4 ≥ 24 jam',
      currentProgressText: `${harvest.toFixed(2)} kWh/hr · Otonomi ${autonomy} jam`,
      progressPct,
      completed,
      rewardXp: 150,
    };
  }

  if (simulationType === 'agroforestry') {
    const infil = metrics.infiltrationRatePct ?? 0;
    const debit = metrics.springDrySeasonDebitLps ?? 0;
    const targetInfil = 72.0;
    const progressPct = Math.min(100, Math.round((infil / targetInfil) * 100));
    const completed = infil >= targetInfil && debit >= 3.2;

    return {
      missionTitle: 'Misi Konservasi Mata Air Sabana Kering',
      targetDescription: 'Capai infiltrasi air tanah ≥ 72% & debit mata air kemarau ≥ 3,2 Liter/detik',
      currentProgressText: `Infiltrasi ${infil.toFixed(1)}% · Debit ${debit.toFixed(2)} L/s`,
      progressPct,
      completed,
      rewardXp: 150,
    };
  }

  if (simulationType === 'desalination') {
    const liters = metrics.dailyFreshwaterLiters ?? 0;
    const tds = metrics.outputTdsPpm ?? 180;
    const targetLiters = 75.0;
    const progressPct = Math.min(100, Math.round((liters / targetLiters) * 100));
    const completed = liters >= targetLiters && tds <= 60;

    return {
      missionTitle: 'Misi Sentra Air Minum Pesisir Bebas Garam',
      targetDescription: 'Produksi air tawar distilasi ≥ 75 Liter/hari dengan kemurnian TDS ≤ 60 ppm',
      currentProgressText: `${liters.toFixed(1)} L/hari · TDS ${tds} ppm`,
      progressPct,
      completed,
      rewardXp: 150,
    };
  }

  const speed = metrics.effectiveSpeedKnots ?? 0;
  const timeMin = metrics.crossingTimeMinutes ?? 999;
  const targetSpeed = 10.5;
  const progressPct = Math.min(100, Math.round((speed / targetSpeed) * 100));
  const completed = speed >= targetSpeed && timeMin <= 70;

  return {
    missionTitle: 'Misi Lintas Selat Tepat Dermaga',
    targetDescription: 'Capai kecepatan lintas efektif ≥ 10,5 knot dengan waktu tempuh ≤ 70 menit',
    currentProgressText: `${speed.toFixed(2)} knot · ${timeMin} menit`,
    progressPct,
    completed,
    rewardXp: 150,
  };
}

/**
 * Evaluates inline chapter formula calculators in real-time as students read a chapter.
 */
export function evaluateInlineSectionCalculator(
  calcId: InlineCalculatorId,
  values: Record<string, number>
): {
  formattedValue: string;
  interpretation: string;
} {
  switch (calcId) {
    case 'hydro_power': {
      const q = (values.qLps ?? 60) / 1000;
      const h = values.headM ?? 20;
      const eta = (values.etaPct ?? 75) / 100;
      const kw = 9.81 * q * h * eta;
      const houses = Math.floor(kw / 0.45);
      return {
        formattedValue: `${kw.toFixed(2)} kW`,
        interpretation: `Daya bersih ${kw.toFixed(2)} kW sanggup menerangi sekitar ${houses} rumah warga desa (450 VA/rumah).`,
      };
    }
    case 'penstock_head': {
      const hGross = values.hGross ?? 25;
      const lossPct = values.lossPct ?? 8;
      const hNet = hGross * (1 - lossPct / 100);
      return {
        formattedValue: `${hNet.toFixed(2)} meter`,
        interpretation: `Setelah dikurangi rugi gesekan pipa ${lossPct}%, tinggi jatuh efektif yang memutar nosel adalah ${hNet.toFixed(2)} m.`,
      };
    }
    case 'elc_frequency': {
      const pGen = values.pGenKW ?? 10;
      const pVillage = Math.min(pGen, values.pVillageKW ?? 6.5);
      const pBallast = Math.max(0, pGen - pVillage);
      return {
        formattedValue: `50,0 Hz (Ballast: ${pBallast.toFixed(2)} kW)`,
        interpretation: `ELC mengalihkan ${pBallast.toFixed(2)} kW ke pemanas beban komplemen agar putaran 1500 RPM & frekuensi 50 Hz tetap terkunci stabil.`,
      };
    }
    case 'mangrove_wave': {
      const width = values.widthM ?? 80;
      const density = values.density ?? 30;
      const redPct = Math.min(96, (1 - Math.exp(-0.012 * width * (density / 25))) * 100);
      return {
        formattedValue: `${redPct.toFixed(1)}% Redaman`,
        interpretation: `Sabuk Rhizophora selebar ${width} m meluruhkan ${redPct.toFixed(1)}% energi kinetik gelombang pasang sebelum mencapai pemukiman.`,
      };
    }
    case 'blue_carbon': {
      const ha = values.areaHa ?? 12;
      const sedimentRatio = values.sedimentPct ?? 76;
      const totalTons = ha * 18.5;
      const sedimentTons = totalTons * (sedimentRatio / 100);
      return {
        formattedValue: `${totalTons.toFixed(1)} ton CO₂e/thn`,
        interpretation: `Sekitar ${sedimentTons.toFixed(1)} ton CO₂e/thn terkunci permanen di dalam lapisan lumpur anaerob bawah tanah.`,
      };
    }
    case 'vector_drift': {
      const vBoat = Math.max(2, values.vBoat ?? 9);
      const vCurrent = Math.min(vBoat - 0.5, values.vCurrent ?? 3.5);
      const alpha = (Math.asin(vCurrent / vBoat) * 180) / Math.PI;
      const vEff = Math.sqrt(vBoat ** 2 - vCurrent ** 2);
      return {
        formattedValue: `α = ${alpha.toFixed(1)}° (v_efektif: ${vEff.toFixed(2)} kt)`,
        interpretation: `Arahkan haluan ${alpha.toFixed(1)}° melawan arus selat agar kapal melaju lurus ke dermaga tujuan dengan laju efektif ${vEff.toFixed(2)} knot.`,
      };
    }
    case 'star_latitude': {
      const zenith = values.zenithDeg ?? 28.5;
      const decl = values.declinationDeg ?? -63.1;
      const lat = 90 - zenith + decl;
      return {
        formattedValue: `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'LS' : 'LU'}`,
        interpretation: `Posisi perahu berada pada koordinat lintang ${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'Lintang Selatan (Perairan Timur Indonesia)' : 'Lintang Utara'}.`,
      };
    }
    case 'solar_energy': {
      const wp = values.wp ?? 1200;
      const psh = values.psh ?? 5.2;
      const kwh = (wp / 1000) * psh * 0.82;
      return {
        formattedValue: `${kwh.toFixed(2)} kWh/hari`,
        interpretation: `Array surya ${wp} Wp memanen ${kwh.toFixed(2)} kWh energi bersih setiap hari untuk laboratorium komputer & server lokal.`,
      };
    }
    case 'lifepo4_autonomy': {
      const kwh = values.battKWh ?? 5.12;
      const loadW = Math.max(50, values.loadW ?? 220);
      const hours = (kwh * 1000 * 0.85) / loadW;
      return {
        formattedValue: `${hours.toFixed(1)} Jam Otonom`,
        interpretation: `Pada Depth of Discharge (DoD) 85%, bank baterai LiFePO4 menopang beban ${loadW} W selama ${hours.toFixed(1)} jam penuh tanpa matahari.`,
      };
    }
    case 'infiltration_rate': {
      const canopy = values.canopyPct ?? 65;
      const terraces = values.terraces ?? 12;
      const infil = Math.min(88, 18 + canopy * 0.52 + terraces * 2.1);
      return {
        formattedValue: `${infil.toFixed(1)}% Air Meresap`,
        interpretation: `Kombinasi tajuk pohon ${canopy}% dan ${terraces} teras batu menahan limpasan permukaan sehingga ${infil.toFixed(1)}% air hujan mengisi akuifer.`,
      };
    }
    case 'spring_debit': {
      const areaHa = values.catchmentHa ?? 25;
      const infilPct = values.infilPct ?? 70;
      const lps = areaHa * (infilPct / 100) * 0.18;
      return {
        formattedValue: `${lps.toFixed(2)} Liter/detik`,
        interpretation: `Menjamin pasokan mata air musim kemarau sebesar ${(lps * 86400 / 1000).toFixed(0)} m³/hari bagi warga desa.`,
      };
    }
    case 'still_distillate': {
      const area = values.areaSqm ?? 18;
      const irrad = values.irrad ?? 5.5;
      const liters = (area * irrad * 0.48) / 0.667;
      return {
        formattedValue: `${liters.toFixed(1)} Liter/hari`,
        interpretation: `Kolektor distilasi surya seluas ${area} m² menghasilkan ${liters.toFixed(1)} Liter air tawar murni bebas garam setiap hari.`,
      };
    }
    case 'biochar_tds': {
      const rawTds = values.rawTds ?? 3200;
      const effPct = values.effPct ?? 98.5;
      const finalTds = Math.max(12, Math.round(rawTds * (1 - effPct / 100)));
      return {
        formattedValue: `${finalTds} ppm TDS`,
        interpretation: `Kadar garam/padatan terlarut turun dari ${rawTds} ppm menjadi ${finalTds} ppm (jauh di bawah ambang aman air minum WHO 500 ppm).`,
      };
    }
    case 'sd_unit_convert': {
      const kg = values.kg ?? 2;
      const meter = values.meter ?? 3;
      const gram = Math.round(kg * 1000);
      const cm = Math.round(meter * 100);
      return {
        formattedValue: `${gram.toLocaleString('id-ID')} g · ${cm.toLocaleString('id-ID')} cm`,
        interpretation: `${kg} kg sama dengan ${gram.toLocaleString('id-ID')} gram (×1.000), dan ${meter} meter sama dengan ${cm.toLocaleString('id-ID')} cm (×100).`,
      };
    }
    case 'smp_heat_calorimetry': {
      const massa = values.massaKg ?? 2;
      const deltaT = values.deltaT ?? 50;
      const qJoule = massa * 4200 * deltaT;
      const qKj = qJoule / 1000;
      return {
        formattedValue: `${qKj.toLocaleString('id-ID')} kJ (${qJoule.toLocaleString('id-ID')} J)`,
        interpretation: `Untuk menaikkan suhu ${massa} kg air sebesar ${deltaT}°C (c = 4.200 J/kg°C) dibutuhkan energi kalor Q = ${qJoule.toLocaleString('id-ID')} Joule.`,
      };
    }
    case 'smp_ohms_law': {
      const volt = values.volt ?? 12;
      const ohm = Math.max(1, values.ohm ?? 6);
      const ampere = volt / ohm;
      const watt = volt * ampere;
      return {
        formattedValue: `${ampere.toFixed(2)} A · ${watt.toFixed(1)} W`,
        interpretation: `Pada tegangan ${volt} V dan hambatan ${ohm} Ω, kuat arus I = V/R = ${ampere.toFixed(2)} A dengan daya P = V·I = ${watt.toFixed(1)} Watt.`,
      };
    }
    case 'smp_pythagoras': {
      const a = values.sisiA ?? 6;
      const b = values.sisiB ?? 8;
      const c = Math.sqrt(a * a + b * b);
      return {
        formattedValue: `c = ${Number.isInteger(c) ? c : c.toFixed(2)} km`,
        interpretation: `Dengan sisi tegak a = ${a} km dan b = ${b} km, jarak lurus terpendek c = √(${a}² + ${b}²) = ${Number.isInteger(c) ? c : c.toFixed(2)} km.`,
      };
    }
  }
}

export interface DeepSearchMatch {
  module: LearningModule;
  matchedBadges: {
    category: 'Judul/Mapel' | 'Bab Materi' | 'Rumus Fisika/Mat' | 'Glosarium' | 'Studi Kasus 3T';
    snippet: string;
    targetSubTab: 'materi' | 'simulasi' | 'kuis';
  }[];
}

/**
 * Infer education tier ('SD' | 'SMP' | 'SMA') from explicit metadata or gradeLevel string.
 */
export function getModuleEducationTier(
  mod: Pick<LearningModule, 'educationTier' | 'gradeLevel'>
): EducationTier {
  if (mod.educationTier) return mod.educationTier;
  const g = mod.gradeLevel.toUpperCase();
  if (g.includes('SD') || /\bKELAS\s*[1-6]\b/.test(g) || /\b(I|II|III|IV|V|VI)\b/.test(g)) {
    return 'SD';
  }
  if (g.includes('SMP') || /\bKELAS\s*[7-9]\b/.test(g) || /\b(VII|VIII|IX)\b/.test(g)) {
    return 'SMP';
  }
  return 'SMA';
}

/**
 * Deep search across modules, chapter headings, formulas, glossary terms, and 3T case studies.
 */
export function searchCurriculumModules(
  modules: LearningModule[],
  query: string,
  subjectFilter: string,
  tierFilter: 'ALL' | EducationTier = 'ALL'
): DeepSearchMatch[] {
  const q = query.trim().toLowerCase();

  return modules
    .filter((m) => subjectFilter === 'ALL' || m.subject === subjectFilter)
    .filter((m) => tierFilter === 'ALL' || getModuleEducationTier(m) === tierFilter)
    .map((m) => {
      if (!q) {
        return { module: m, matchedBadges: [] };
      }

      const badges: DeepSearchMatch['matchedBadges'] = [];

      if (
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.gradeLevel.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.schoolOrigin.toLowerCase().includes(q)
      ) {
        badges.push({
          category: 'Judul/Mapel',
          snippet: `${m.code} · ${m.schoolOrigin}`,
          targetSubTab: 'materi',
        });
      }

      for (const sec of m.sections) {
        if (sec.formula && sec.formula.toLowerCase().includes(q)) {
          badges.push({
            category: 'Rumus Fisika/Mat',
            snippet: sec.formula,
            targetSubTab: 'materi',
          });
        } else if (
          sec.heading.toLowerCase().includes(q) ||
          sec.body.toLowerCase().includes(q) ||
          sec.keyTakeaway.toLowerCase().includes(q)
        ) {
          badges.push({
            category: 'Bab Materi',
            snippet: sec.heading,
            targetSubTab: 'materi',
          });
        }
      }

      if (m.glossary) {
        for (const g of m.glossary) {
          if (
            g.term.toLowerCase().includes(q) ||
            g.definition.toLowerCase().includes(q) ||
            g.symbolOrUnit.toLowerCase().includes(q)
          ) {
            badges.push({
              category: 'Glosarium',
              snippet: `${g.term} (${g.symbolOrUnit})`,
              targetSubTab: 'materi',
            });
          }
        }
      }

      if (m.caseStudy) {
        if (
          m.caseStudy.title.toLowerCase().includes(q) ||
          m.caseStudy.location.toLowerCase().includes(q) ||
          m.caseStudy.challenge.toLowerCase().includes(q) ||
          m.caseStudy.solution.toLowerCase().includes(q)
        ) {
          badges.push({
            category: 'Studi Kasus 3T',
            snippet: m.caseStudy.location,
            targetSubTab: 'materi',
          });
        }
      }

      return {
        module: m,
        matchedBadges: badges.slice(0, 3),
      };
    })
    .filter((item) => !q || item.matchedBadges.length > 0);
}

/**
 * Calculates student XP score for answering a timed quiz checkpoint.
 */
export function calculateQuizChallengeScore(params: {
  isCorrect: boolean;
  isTimedMode: boolean;
  remainingSeconds: number;
  currentStreak: number;
}): {
  earnedXp: number;
  speedBonusXp: number;
  streakBonusXp: number;
  nextStreak: number;
} {
  if (!params.isCorrect) {
    return {
      earnedXp: 0,
      speedBonusXp: 0,
      streakBonusXp: 0,
      nextStreak: 0,
    };
  }

  const baseXp = 100;
  const speedBonusXp = params.isTimedMode
    ? Math.max(10, Math.min(90, Math.round(params.remainingSeconds * 3)))
    : 20;
  const nextStreak = params.currentStreak + 1;
  const streakBonusXp = nextStreak >= 2 ? (nextStreak - 1) * 25 : 0;

  return {
    earnedXp: baseXp + speedBonusXp + streakBonusXp,
    speedBonusXp,
    streakBonusXp,
    nextStreak,
  };
}

export interface StudentAchievementBadge {
  id: string;
  title: string;
  category: 'Eksperimen Sains' | 'Gotong Royong P2P' | 'Tantangan Kuis' | 'Literasi AI Lokal';
  description: string;
  unlocked: boolean;
  progressText: string;
  progressPct: number;
}

/**
 * Computes the 4 contextual student achievement badges from real learning & P2P activity.
 */
export function computeStudentAchievements(params: {
  completedMissionsCount: number;
  totalMissionsCount: number;
  peerUploadedMB: number;
  completedModulesChunksCount: number;
  quizCorrectCount: number;
  quizTimedWinsCount: number;
  cacheHitsTriggered: number;
}): {
  badges: StudentAchievementBadge[];
  unlockedCount: number;
} {
  const missionPct = Math.min(
    100,
    Math.round((params.completedMissionsCount / Math.max(1, params.totalMissionsCount)) * 100)
  );
  const p2pUnlocked = params.peerUploadedMB >= 35 || params.completedModulesChunksCount >= 1;
  const p2pPct = p2pUnlocked
    ? 100
    : Math.min(95, Math.round((params.peerUploadedMB / 35) * 100));

  const quizUnlocked = params.quizCorrectCount >= 1;
  const quizPct = Math.min(100, params.quizCorrectCount * 50);

  const aiUnlocked = params.cacheHitsTriggered >= 1;
  const aiPct = aiUnlocked ? 100 : 50;

  const badges: StudentAchievementBadge[] = [
    {
      id: 'badge-eksperimen',
      title: 'Eksperimenter Sains 3T',
      category: 'Eksperimen Sains',
      description: 'Menuntaskan target misi laboratorium virtual melalui penyesuaian parameter fisis.',
      unlocked: params.completedMissionsCount >= 1,
      progressText: `${params.completedMissionsCount}/${params.totalMissionsCount} Misi Lab Tuntas`,
      progressPct: Math.max(params.completedMissionsCount >= 1 ? 100 : 35, missionPct),
    },
    {
      id: 'badge-seeder-p2p',
      title: 'Pahlawan Seeder Mesh P2P',
      category: 'Gotong Royong P2P',
      description: 'Membagikan pecahan data modul ke teman sekelas via WebRTC tanpa kuota internet.',
      unlocked: p2pUnlocked,
      progressText: `${params.peerUploadedMB.toFixed(1)} MB Dibagikan ke Kelas`,
      progressPct: p2pPct,
    },
    {
      id: 'badge-kuis-cepat',
      title: 'Juara Tantangan Konsep',
      category: 'Tantangan Kuis',
      description: 'Menjawab tepat pada evaluasi pemahaman konsep atau Mode Tantangan 30 Detik.',
      unlocked: quizUnlocked,
      progressText: `${params.quizCorrectCount} Jawaban Tepat (${params.quizTimedWinsCount} Mode Cepat)`,
      progressPct: quizPct,
    },
    {
      id: 'badge-cache-ai',
      title: 'Penjelajah Cerdas 0-Kuota',
      category: 'Literasi AI Lokal',
      description: 'Memanfaatkan memori Cache Lokal Simpul Guru dengan latensi 0 ms dan 0 KB kuota.',
      unlocked: aiUnlocked,
      progressText: `${params.cacheHitsTriggered}× Eksplorasi Tutor AI`,
      progressPct: aiPct,
    },
  ];

  return {
    badges,
    unlockedCount: badges.filter((b) => b.unlocked).length,
  };
}

export interface BinaryChunkPacketMetadata {
  magic: string;
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
  chunkIndex: number;
  totalChunks: number;
  chunkHash: string;
  fromPeerId: string;
  toPeerId: string;
  sizeKB: number;
  simulationType: SimulationType;
  contentPayload: string;
  timestampMs: number;
}

export interface DecodedBinaryChunkPacket extends BinaryChunkPacketMetadata {
  valid: boolean;
  byteLength: number;
}

/**
 * Encodes a real module chunk into a binary Uint8Array (ArrayBuffer) frame
 * suitable for transmission over WebRTC RTCDataChannel (binaryType = 'arraybuffer')
 * or binary WebSocket frames.
 *
 * Frame layout:
 * - Bytes 0..3: ASCII Magic Header "RPE1" (0x52, 0x50, 0x45, 0x31)
 * - Bytes 4..5: uint16 chunkIndex (Big Endian)
 * - Bytes 6..7: uint16 totalChunks (Big Endian)
 * - Bytes 8..11: uint32 JSON payload length in bytes (Big Endian)
 * - Bytes 12..N: UTF-8 encoded JSON payload containing real curriculum & simulation slice
 */
export function encodeBinaryChunkPayload(
  module: LearningModule,
  chunkIndex: number,
  fromPeerId: string,
  toPeerId: string
): Uint8Array {
  const safeIndex = Math.max(0, Math.min(module.totalChunks - 1, chunkIndex));
  const sectionIdx = safeIndex % Math.max(1, module.sections.length);
  const sec = module.sections[sectionIdx];
  const contentSlice = sec
    ? `[${module.code} Pecahan #${safeIndex}/${module.totalChunks}] ${sec.heading} | Rumus: ${sec.formula || '-'} | Intisari: ${sec.keyTakeaway} | Isi: ${sec.body.slice(0, 280)}`
    : `[${module.code} Pecahan #${safeIndex}] ${module.summary}`;

  const meta: BinaryChunkPacketMetadata = {
    magic: 'RPE1',
    moduleId: module.id,
    moduleCode: module.code,
    moduleTitle: module.title,
    chunkIndex: safeIndex,
    totalChunks: module.totalChunks,
    chunkHash: module.chunkHashes[safeIndex] || `chk-${safeIndex}`,
    fromPeerId,
    toPeerId,
    sizeKB: module.chunkSizeKB,
    simulationType: module.simulationType,
    contentPayload: contentSlice,
    timestampMs: Date.now(),
  };

  const jsonStr = JSON.stringify(meta);
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(jsonStr);

  const frame = new Uint8Array(12 + payloadBytes.byteLength);
  const view = new DataView(frame.buffer);

  // Magic "RPE1"
  frame[0] = 0x52; // 'R'
  frame[1] = 0x50; // 'P'
  frame[2] = 0x45; // 'E'
  frame[3] = 0x31; // '1'

  view.setUint16(4, safeIndex, false);
  view.setUint16(6, module.totalChunks, false);
  view.setUint32(8, payloadBytes.byteLength, false);

  frame.set(payloadBytes, 12);
  return frame;
}

/**
 * Decodes and validates a binary ArrayBuffer or Uint8Array received via WebRTC DataChannel.
 */
export function decodeBinaryChunkPayload(
  input: ArrayBufferLike | Uint8Array
): DecodedBinaryChunkPacket | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 12) return null;

  if (
    bytes[0] !== 0x52 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x45 ||
    bytes[3] !== 0x31
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerChunkIndex = view.getUint16(4, false);
  const headerTotalChunks = view.getUint16(6, false);
  const payloadLength = view.getUint32(8, false);

  if (bytes.byteLength < 12 + payloadLength) {
    return null;
  }

  try {
    const payloadSlice = bytes.subarray(12, 12 + payloadLength);
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(payloadSlice);
    const parsed = JSON.parse(jsonStr) as BinaryChunkPacketMetadata;

    if (
      parsed.magic !== 'RPE1' ||
      typeof parsed.moduleId !== 'string' ||
      parsed.chunkIndex !== headerChunkIndex
    ) {
      return null;
    }

    return {
      ...parsed,
      totalChunks: headerTotalChunks,
      valid: true,
      byteLength: bytes.byteLength,
    };
  } catch {
    return null;
  }
}

/**
 * Validates Teacher Host Node PIN change request.
 */
export function validateHostPinChange(
  currentPinInput: string,
  actualCurrentPin: string,
  newPinInput: string
): ValidationOutcome {
  if (!currentPinInput || currentPinInput.trim() !== actualCurrentPin) {
    return {
      valid: false,
      error: 'PIN Simpul Guru saat ini tidak sesuai.',
    };
  }
  const result = HostPinChangeSchema.safeParse({ currentPin: currentPinInput, newPin: newPinInput });
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      valid: false,
      error: firstIssue?.message || 'PIN baru tidak memenuhi kriteria keamanan.',
    };
  }
  return { valid: true };
}


/**
 * Fast, deterministic FNV-1a checksum for chunk verification in local P2P networks.
 * Ensures data integrity across WebRTC SCTP chunk transfers without Math.random().
 */
export function computeDeterministicChunkHash(
  moduleId: string,
  chunkIndex: number,
  contentPayload = ''
): string {
  let hash = 0x811c9dc5;
  const str = `${moduleId}:${chunkIndex}:${contentPayload}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `chk-${hex.slice(0, 4)}-${String(chunkIndex).padStart(2, '0')}`;
}
export interface StudentProfile {
  peerId: string;
  studentName: string;
  avatar: string;
  deviceType: string;
}

export interface StudentSubmission {
  id: string;
  peerId: string;
  studentName: string;
  avatar: string;
  moduleId: string;
  moduleTitle: string;
  quizScore: number;
  totalQuestions: number;
  passed: boolean;
  simulationCompleted: boolean;
  timestamp: string;
  updatedMs: number;
}

export interface GradebookSummary {
  totalSubmissions: number;
  averageScore: number;
  passRatePercent: number;
  simulationsCompletedCount: number;
}

export function calculateGradebookSummary(submissions: StudentSubmission[]): GradebookSummary {
  if (!submissions || submissions.length === 0) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      passRatePercent: 0,
      simulationsCompletedCount: 0,
    };
  }
  const totalSubmissions = submissions.length;
  const scoreSum = submissions.reduce((sum, s) => sum + s.quizScore, 0);
  const passedCount = submissions.filter((s) => s.passed).length;
  const simulationsCompletedCount = submissions.filter((s) => s.simulationCompleted).length;

  return {
    totalSubmissions,
    averageScore: Math.round(scoreSum / totalSubmissions),
    passRatePercent: Math.round((passedCount / totalSubmissions) * 100),
    simulationsCompletedCount,
  };
}
