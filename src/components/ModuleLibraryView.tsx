import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  RefreshCw,
  ArrowRight,
  Search,
  Share2,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp,
  Sliders,
  HelpCircle,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  BookOpen,
  Compass,
  BookmarkCheck,
  PenLine,
  Copy,
  Check,
  Volume2,
  Square,
} from 'lucide-react';
import { playIndonesianSpeech, stopSpeech } from '../utils/speechUtils';
import {
  calculateQuizChallengeScore,
  computeStudentAchievements,
  searchCurriculumModules,
  type LearningModule,
  type PeerNode,
  type SwarmMetrics,
  type SimulationType,
} from '../utils/edgeEngine';
import {
  getSubjectTheme,
  getStudentLevelInfo,
} from '../utils/subjectTheme';
import { HERO_CLASSROOM_IMAGE } from '../utils/seedData';
import { InteractiveSimulations } from './InteractiveSimulations';
import { InlineChapterCalculator } from './modules/InlineChapterCalculator';
import { ModuleCaseStudyView } from './modules/ModuleCaseStudyView';
import { ModuleGlossaryDrawer } from './modules/ModuleGlossaryDrawer';
import { ModuleQuizCard } from './modules/ModuleQuizCard';

interface Props {
  modules: LearningModule[];
  peers: PeerNode[];
  metrics: SwarmMetrics;
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  onSyncChunks: (moduleId: string, chunksCount: number) => Promise<void>;
  onResetPeerChunks: (moduleId: string) => Promise<void>;
  onNavigateTab: (tab: 'pustaka' | 'mesh' | 'tutor' | 'guru') => void;
  onAskTutorWithPrompt?: (moduleId: string, questionPrompt: string) => void;
  isSyncing: boolean;
  onSyncStudentSubmission?: (payload: { moduleId: string; moduleTitle: string; quizScore: number; totalQuestions: number; passed: boolean; simulationCompleted: boolean }) => void;
}

type ModuleWorkspaceSubTab = 'materi' | 'simulasi' | 'kuis';

const bentoContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const bentoItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export const ModuleLibraryView: React.FC<Props> = ({
  modules,
  peers,
  metrics,
  activeModuleId,
  onSelectModule,
  onSyncChunks,
  onResetPeerChunks,
  onNavigateTab,
  onAskTutorWithPrompt,
  isSyncing,
  onSyncStudentSubmission,
}) => {
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<ModuleWorkspaceSubTab>('materi');
  const [isFocusReaderMode, setIsFocusReaderMode] = useState<boolean>(false);
  const [readerTextSize, setReaderTextSize] = useState<'normal' | 'large'>('normal');
  const [isBadgesExpanded, setIsBadgesExpanded] = useState<boolean>(true);
  const [isBitfieldExpanded, setIsBitfieldExpanded] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedModuleImgs, setFailedModuleImgs] = useState<Record<string, boolean>>({});

  // Audio narration state (Task 5)
  const [speakingChapterIndex, setSpeakingChapterIndex] = useState<number | null>(null);

  useEffect(() => {
    stopSpeech();
    setSpeakingChapterIndex(null);
    return () => {
      stopSpeech();
    };
  }, [activeModuleId, activeSubTab]);

  // Chapter completion, guided exercise step reveals, and local student notes
  const [completedChapters, setCompletedChapters] = useState<Record<string, boolean>>(() => {
    try {
      const saved = window.localStorage.getItem('ruangpintar_completed_chapters');
      return saved ? JSON.parse(saved) : { 'mod-fisika-mikrohidro-0': true };
    } catch {
      return { 'mod-fisika-mikrohidro-0': true };
    }
  });

  const [studentNotes, setStudentNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = window.localStorage.getItem('ruangpintar_student_notes');
      return saved
        ? JSON.parse(saved)
        : {
            'mod-fisika-mikrohidro':
              'Catatan Lapangan Alor: Rumus P = 9,81 × Q × H × η. Pastikan saringan bak penenang (forebay) dibersihkan setiap minggu agar debit Q tidak turun.',
          };
    } catch {
      return {};
    }
  });

  const [copiedNote, setCopiedNote] = useState<boolean>(false);
  const [revealedExerciseSteps, setRevealedExerciseSteps] = useState<Record<string, number>>({});

  // Student gamification, timed quiz challenge & mission states
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>({});
  const [studentXp, setStudentXp] = useState<number>(345);
  const [quizStreak, setQuizStreak] = useState<number>(1);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(1);
  const [quizTimedWinsCount, setQuizTimedWinsCount] = useState<number>(0);
  const [isTimedQuizMode, setIsTimedQuizMode] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [lastXpToast, setLastXpToast] = useState<{
    message: string;
    xpDelta: number;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'ruangpintar_completed_chapters',
        JSON.stringify(completedChapters)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [completedChapters]);

  useEffect(() => {
    try {
      window.localStorage.setItem('ruangpintar_student_notes', JSON.stringify(studentNotes));
    } catch {
      // Ignore storage quota errors
    }
  }, [studentNotes]);

  const localStudentPeer =
    peers.find((p) => p.id === 'peer-siswa-05') ||
    peers.find((p) => p.role === 'PEER') ||
    peers[0];

  const deepSearchMatches = searchCurriculumModules(modules, searchQuery, subjectFilter);
  const filteredModules = deepSearchMatches.map((m) => m.module);

  const activeModule =
    modules.find((m) => m.id === activeModuleId) ||
    filteredModules[0] ||
    modules[0];

  const activeTheme = getSubjectTheme(activeModule?.subject);
  const levelInfo = getStudentLevelInfo(studentXp);

  const heldChunksForActive = localStudentPeer?.moduleChunks[activeModule?.id || ''] || [];
  const completionPct = activeModule
    ? Math.round((heldChunksForActive.length / activeModule.totalChunks) * 100)
    : 0;

  const completedModulesChunksCount = modules.filter((m) => {
    const held = localStudentPeer?.moduleChunks[m.id] || [];
    return held.length >= m.totalChunks;
  }).length;

  const completedMissionsCount = Object.keys(completedMissions).length;

  const activeModuleCompletedChaptersCount = activeModule
    ? activeModule.sections.filter((_, idx) => completedChapters[`${activeModule.id}-${idx}`])
        .length
    : 0;

  const activeModuleChapterPct = activeModule
    ? Math.round(
        (activeModuleCompletedChaptersCount / Math.max(1, activeModule.sections.length)) * 100
      )
    : 0;

  const activeModuleAnsweredQuizCount = activeModule
    ? activeModule.checkpoints.filter(
        (_, idx) => typeof selectedAnswers[`${activeModule.id}-${idx}`] === 'number'
      ).length
    : 0;

  const achievementsData = computeStudentAchievements({
    completedMissionsCount,
    totalMissionsCount: modules.length,
    peerUploadedMB: localStudentPeer?.uploadedMB || 48,
    completedModulesChunksCount,
    quizCorrectCount,
    quizTimedWinsCount,
    cacheHitsTriggered: metrics.totalCacheHits,
  });

  const triggerXpCelebration = useCallback((xpDelta: number, message: string) => {
    setLastXpToast({ xpDelta, message });
  }, []);

  const handleMissionComplete = useCallback(
    (simType: SimulationType) => {
      setCompletedMissions((prev) => {
        if (prev[simType]) return prev;
        setStudentXp((xp) => xp + 150);
        triggerXpCelebration(
          150,
          'Misi Laboratorium Virtual Tuntas & Lencana Eksperimenter Sains Terbuka!'
        );
        if (onSyncStudentSubmission && activeModule) {
          onSyncStudentSubmission({
            moduleId: activeModule.id,
            moduleTitle: activeModule.title,
            quizScore: 100,
            totalQuestions: activeModule.checkpoints.length,
            passed: true,
            simulationCompleted: true,
          });
        }
        return { ...prev, [simType]: true };
      });
    },
    [triggerXpCelebration, onSyncStudentSubmission, activeModule]
  );

  const handleToggleChapterComplete = (moduleId: string, sectionIdx: number) => {
    const key = `${moduleId}-${sectionIdx}`;
    setCompletedChapters((prev) => {
      const nextVal = !prev[key];
      if (nextVal) {
        setStudentXp((xp) => xp + 25);
        triggerXpCelebration(
          25,
          `Bab 0${sectionIdx + 1} selesai dipelajari! Progres modul Anda bertambah.`
        );
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // Countdown timer effect for Timed Quiz Mode
  useEffect(() => {
    if (!isTimedQuizMode || !isTimerRunning) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((sec) => {
        if (sec <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTimedQuizMode, isTimerRunning]);

  const handleStartTimedChallenge = () => {
    setIsTimedQuizMode(true);
    setRemainingSeconds(30);
    setIsTimerRunning(true);
    if (activeModule) {
      setSelectedAnswers((prev) => {
        const next = { ...prev };
        activeModule.checkpoints.forEach((_, idx) => {
          delete next[`${activeModule.id}-${idx}`];
        });
        return next;
      });
    }
  };

  const handleSelectQuizOption = (questionIdx: number, optionIdx: number, correctIndex: number) => {
    if (!activeModule) return;
    const answerKey = `${activeModule.id}-${questionIdx}`;
    const alreadyAnswered = typeof selectedAnswers[answerKey] === 'number';

    setSelectedAnswers((prev) => ({
      ...prev,
      [answerKey]: optionIdx,
    }));

    const isCorrect = optionIdx === correctIndex;
    if (!alreadyAnswered) {
      const score = calculateQuizChallengeScore({
        isCorrect,
        isTimedMode: isTimedQuizMode && remainingSeconds > 0,
        remainingSeconds,
        currentStreak: quizStreak,
      });

      setQuizStreak(score.nextStreak);
      if (isCorrect) {
        setQuizCorrectCount((c) => c + 1);
        if (isTimedQuizMode && remainingSeconds > 0) {
          setQuizTimedWinsCount((w) => w + 1);
          setIsTimerRunning(false);
        }
        setStudentXp((xp) => xp + score.earnedXp);
        triggerXpCelebration(
          score.earnedXp,
          `Jawaban Kuis Tepat! ${
            isTimedQuizMode ? `(Bonus Kecepatan +${score.speedBonusXp} XP)` : 'Rentetan bertambah!'
          }`
        );
      } else {
        triggerXpCelebration(0, 'Belum tepat — simak pembahasan rumus di bawah soal.');
      }
      if (onSyncStudentSubmission && activeModule) {
        const currentCorrect = quizCorrectCount + (isCorrect ? 1 : 0);
        const total = activeModule.checkpoints.length;
        const scorePercent = Math.round((currentCorrect / Math.max(1, total)) * 100);
        onSyncStudentSubmission({
          moduleId: activeModule.id,
          moduleTitle: activeModule.title,
          quizScore: scorePercent,
          totalQuestions: total,
          passed: scorePercent >= 70,
          simulationCompleted: Boolean(completedMissions[activeModule.simulationType]),
        });
      }
    }
  };

  const handleCopyNotes = () => {
    if (!activeModule) return;
    const text = studentNotes[activeModule.id] || '';
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedNote(true);
    window.setTimeout(() => setCopiedNote(false), 1800);
  };

  const scrollToElement = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.div
      variants={bentoContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Tropical Nusantara Context Banner + Interactive Student Level & XP Dashboard */}
      <motion.section
        variants={bentoItemVariants}
        aria-label="Ringkasan Arsitektur RuangPintar Edge dan Progres Belajar Siswa"
        className="bento-card overflow-hidden"
      >
        {/* Top Multi-Subject Tropical Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-emerald-500 via-indigo-500 to-amber-500" />

        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 sm:p-7 flex flex-col justify-between space-y-5 bg-gradient-to-br from-white via-sky-50/25 to-emerald-50/20">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                <span className="text-sky-700 font-semibold">
                  Simpul Aktif: 192.168.43.1 (Host Guru)
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">
                  {modules.length} Modul Kurikulum 3T
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-indigo-700 font-semibold">
                  6 Laboratorium Virtual Tanpa Kuota
                </span>
              </div>

              <h1
                className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-[1.22]"
                style={{ textWrap: 'balance' }}
              >
                Eksplorasi Sains Kepulauan &amp; Distribusi Materi P2P Tanpa Kuota Internet
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Pilih modul sesuai warna mata pelajaran, uji rumus interaktif langsung di dalam bab,
                pelajari studi kasus nyata dari Alor hingga Natuna, dan kumpulkan XP untuk membuka
                lencana ilmuwan muda 3T.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateTab('tutor')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Tanya Tutor AI (Cache 0 Kuota)</span>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateTab('mesh')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Inspeksi Topologi Mesh P2P</span>
              </motion.button>
            </div>
          </div>

          {/* Right Documentary Visual Panel */}
          <div className="lg:col-span-4 relative min-h-[210px] lg:min-h-full bg-slate-900 flex flex-col justify-end overflow-hidden group border-t lg:border-t-0 lg:border-l border-slate-200">
            {!heroImgFailed ? (
              <img
                src={HERO_CLASSROOM_IMAGE}
                alt="Siswa dan guru di kelas wilayah 3T berkolaborasi menggunakan jaringan lokal RuangPintar Edge"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-sky-950 to-emerald-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <div className="relative z-10 p-5 text-white space-y-1.5">
              <p className="text-[11px] font-mono text-cyan-300 font-semibold">
                Alor · Kepulauan Aru · Wakatobi · Sumba · Rote · Natuna
              </p>
              <p className="text-xs font-medium text-slate-100 leading-snug">
                Kurikulum berbasis potensi energi terbarukan, ekologi pesisir, dan kemaritiman
                Nusantara yang berjalan 100% di jaringan lokal sekolah.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Learning Progress & Interactive XP Banner */}
        <div className="bg-slate-50/90 border-t border-slate-200/90 px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
            {/* Left 7 Cols: 4 Colorful Telemetry KPI Blocks */}
            <div className="xl:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-emerald-200/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500">Kuota Siswa Dihemat</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {metrics.ispQuotaSavedMB.toFixed(1)} MB
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">0 Rp</span>
                </div>
              </div>

              <div className="bg-white border border-sky-200/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500">Mesh Offload P2P</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-sky-700 tabular-nums">
                    {metrics.meshOffloadPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                    {metrics.peerToPeerOffloadedMB} MB
                  </span>
                </div>
              </div>

              <div className="bg-white border border-teal-200/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500">Efisiensi Cache AI</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-teal-700 tabular-nums">
                    {metrics.cacheHitRatioPct}% Hit
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                    {metrics.totalCacheHits}× 0ms
                  </span>
                </div>
              </div>

              <div className="bg-white border border-indigo-200/80 rounded-xl p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-slate-500">Simpul Kelas Aktif</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-indigo-700 tabular-nums">
                    {metrics.totalPeers} Simpul
                  </span>
                  <span className="text-[10px] text-slate-500">
                    1 Guru · {metrics.studentPeersCount} Siswa
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Visual Student Level Progress Bar & Badge Toggle */}
            <div className="xl:col-span-5 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-sky-50/80 border border-amber-200/90 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-mono text-xs font-bold shadow-xs">
                    L{levelInfo.level}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{levelInfo.title}</div>
                    <div className="text-[10px] font-mono text-slate-600 tabular-nums">
                      Total: <strong className="text-amber-800">{studentXp} XP</strong> · Rentetan
                      Kuis: <strong className="text-emerald-700">{quizStreak}×</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  aria-expanded={isBadgesExpanded}
                  onClick={() => setIsBadgesExpanded((prev) => !prev)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-amber-200 hover:bg-amber-50/70 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {achievementsData.unlockedCount}/{achievementsData.badges.length} Lencana
                  </span>
                  {isBadgesExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-600 tabular-nums">
                  <span>Progres ke Level {Math.min(5, levelInfo.level + 1)} ({levelInfo.nextTitle})</span>
                  <span className="font-bold text-amber-800">
                    {levelInfo.progressPct}% ({levelInfo.xpNeededForNext} XP lagi)
                  </span>
                </div>
                <div className="w-full h-2 bg-white/90 border border-amber-200/70 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progressPct}%` }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-full ${levelInfo.badgeGradient}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Animated Instant XP Celebration Toast */}
          <AnimatePresence mode="popLayout">
            {lastXpToast && (
              <motion.div
                key={`${lastXpToast.message}-${studentXp}`}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                role="status"
                className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold shadow-sm border ${
                  lastXpToast.xpDelta > 0
                    ? 'bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-sky-500/15 border-emerald-300 text-slate-900'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {lastXpToast.xpDelta > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-mono text-xs font-bold shadow-2xs tabular-nums">
                      +{lastXpToast.xpDelta} XP
                    </span>
                  )}
                  <span>{lastXpToast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLastXpToast(null)}
                  className="font-mono text-xs text-slate-700 hover:text-slate-950 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shrink-0"
                >
                  Tutup
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive 4 Achievement Badges Drawer */}
          <AnimatePresence initial={false}>
            {isBadgesExpanded && (
              <motion.div
                key="badges-drawer"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {achievementsData.badges.map((badge, bIdx) => {
                    const badgePalettes = [
                      {
                        border: 'border-emerald-300/90',
                        bg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white',
                        bar: 'bg-gradient-to-r from-emerald-500 to-teal-500',
                        text: 'text-emerald-700',
                        actionLabel: 'Buka Lab Simulasi →',
                        onClick: () => setActiveSubTab('simulasi'),
                      },
                      {
                        border: 'border-sky-300/90',
                        bg: 'bg-gradient-to-br from-sky-50/90 via-cyan-50/40 to-white',
                        bar: 'bg-gradient-to-r from-sky-500 to-cyan-500',
                        text: 'text-sky-700',
                        actionLabel: 'Buka Topologi Mesh →',
                        onClick: () => onNavigateTab('mesh'),
                      },
                      {
                        border: 'border-amber-300/90',
                        bg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white',
                        bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
                        text: 'text-amber-700',
                        actionLabel: 'Buka Kuis Tantangan →',
                        onClick: () => setActiveSubTab('kuis'),
                      },
                      {
                        border: 'border-indigo-300/90',
                        bg: 'bg-gradient-to-br from-indigo-50/90 via-violet-50/40 to-white',
                        bar: 'bg-gradient-to-r from-indigo-500 to-violet-500',
                        text: 'text-indigo-700',
                        actionLabel: 'Buka Tutor AI 0-Kuota →',
                        onClick: () => onNavigateTab('tutor'),
                      },
                    ];
                    const style = badgePalettes[bIdx % badgePalettes.length];

                    return (
                      <div
                        key={badge.id}
                        onClick={style.onClick}
                        className={`rounded-xl p-3.5 border transition-all cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between space-y-2.5 shadow-2xs ${
                          badge.unlocked ? `${style.bg} ${style.border}` : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className={`font-semibold ${style.text}`}>{badge.category}</span>
                            <span
                              className={
                                badge.unlocked
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-slate-400 font-medium'
                              }
                            >
                              {badge.unlocked ? '★ TERBUKA' : 'PROGRES'}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-slate-900">{badge.title}</h3>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {badge.description}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                          <div className="flex justify-between text-[11px] font-mono text-slate-700 tabular-nums">
                            <span>{badge.progressText}</span>
                            <span className="font-bold">{badge.progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${badge.progressPct}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                            />
                          </div>
                          <div className={`text-[11px] font-semibold ${style.text} pt-0.5`}>
                            {style.actionLabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Main Focused Split-Panel Workspace (4:8 or 12-col in Focus Reader Mode) */}
      <motion.section
        variants={bentoItemVariants}
        aria-label="Ruang Kerja Pustaka Modul & Laboratorium"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* LEFT PANEL (4 cols): Subject-Coded Module Catalog & Deep Concept Search */}
        {!isFocusReaderMode && (
          <div className="lg:col-span-4 bento-card p-5 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  01. Katalog &amp; Pencarian Lintas Konsep
                </h2>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {deepSearchMatches.length}/{modules.length} Modul
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Setiap kartu memiliki warna khas mata pelajaran. Cari judul, rumus, atau lokasi 3T.
              </p>
            </div>

            {/* Deep Search Input */}
            <div className="space-y-2">
              <div className="relative">
                <label htmlFor="search-module-input" className="sr-only">
                  Cari Modul, Rumus, atau Istilah Teknis
                </label>
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="search-module-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari rumus, istilah (mis. LiFePO4, Mamar, Biochar)..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-600 transition-all"
                />
              </div>

              {/* Quick Concept Search Prompts */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 font-mono">Cepat:</span>
                {(['LiFePO4', 'ELC', 'Karbon Biru', 'Mamar', 'Biochar', 'Crux'] as const).map(
                  (kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setSearchQuery(searchQuery === kw ? '' : kw)}
                      className={`px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer whitespace-nowrap ${
                        searchQuery.toLowerCase() === kw.toLowerCase()
                          ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white font-semibold shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                      }`}
                    >
                      {kw}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Color-Coded Segmented Subject Filter */}
            <div
              role="group"
              aria-label="Filter Mata Pelajaran"
              className="flex flex-wrap items-center gap-1.5"
            >
              {(
                [
                  'ALL',
                  'Fisika Terapan',
                  'Biologi Pesisir',
                  'Matematika Maritim',
                  'Teknik Energi',
                ] as const
              ).map((subj) => {
                const isActiveSubj = subjectFilter === subj;
                const subjTheme = subj === 'ALL' ? null : getSubjectTheme(subj);
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSubjectFilter(subj)}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isActiveSubj
                        ? subjTheme
                          ? subjTheme.activeTabGradient
                          : 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/75 hover:text-slate-900'
                    }`}
                  >
                    {subj === 'ALL' ? 'Semua Mapel' : subj}
                  </button>
                );
              })}
            </div>

            {/* Subject-Gradient Module Cards List */}
            {deepSearchMatches.length === 0 ? (
              <div className="surface-warm-recessed p-6 text-center space-y-2.5">
                <p className="text-xs font-medium text-slate-700">
                  Tidak ada modul, rumus, atau istilah yang cocok dengan &ldquo;
                  {searchQuery || subjectFilter}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubjectFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Tampilkan Semua Modul
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {deepSearchMatches.map(({ module: mod, matchedBadges }) => {
                  const peerHeld = localStudentPeer?.moduleChunks[mod.id] || [];
                  const pct = Math.round((peerHeld.length / mod.totalChunks) * 100);
                  const isSelected = activeModule?.id === mod.id;
                  const imgFailed = failedModuleImgs[mod.id];
                  const modTheme = getSubjectTheme(mod.subject);
                  const modChaptersDone = mod.sections.filter(
                    (_, sIdx) => completedChapters[`${mod.id}-${sIdx}`]
                  ).length;

                  return (
                    <article
                      key={mod.id}
                      onClick={() => onSelectModule(mod.id)}
                      className={`rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        isSelected
                          ? `${modTheme.selectedCardSurface} border-transparent`
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Subject Identity Gradient Ribbon */}
                      <div className={`h-1.5 w-full ${modTheme.ribbonGradient}`} />

                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-start gap-3">
                          <div className="w-20 h-20 rounded-lg bg-slate-900 relative shrink-0 overflow-hidden border border-slate-200/70 group">
                            {!imgFailed ? (
                              <img
                                src={mod.imageUrl}
                                alt={`Ilustrasi modul ${mod.title}`}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setFailedModuleImgs((prev) => ({ ...prev, [mod.id]: true }))
                                }
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div
                                className={`w-full h-full flex items-center justify-center ${modTheme.stepNumberClass} text-[10px] font-mono font-bold p-2 text-center`}
                              >
                                {mod.code}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 text-[11px] font-mono tabular-nums">
                              <span className={`font-bold truncate ${modTheme.accentText}`}>
                                {mod.code} · {mod.subject}
                              </span>
                              <span className="text-slate-500 shrink-0">{mod.sizeMB} MB</span>
                            </div>

                            <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                              {mod.title}
                            </h3>

                            <div className="pt-0.5 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                                <span className="text-slate-500">
                                  {peerHeld.length}/{mod.totalChunks} pecahan · {modChaptersDone}/
                                  {mod.sections.length} bab
                                </span>
                                <span className={`font-bold ${modTheme.accentText}`}>{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className={`h-full rounded-full transition-all duration-300 ${modTheme.progressGradient}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Deep Search Matched Snippets */}
                        {matchedBadges.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/70 space-y-1">
                            {matchedBadges.map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className={`text-[11px] font-mono ${modTheme.softBg} ${modTheme.accentText} px-2.5 py-1 rounded-md flex items-center justify-between gap-2`}
                              >
                                <span className="font-bold shrink-0">{b.category}:</span>
                                <span className="truncate text-slate-700">{b.snippet}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-500 truncate">{mod.schoolOrigin}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {pct < 100 && (
                              <button
                                type="button"
                                disabled={isSyncing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectModule(mod.id);
                                  onSyncChunks(mod.id, 4);
                                }}
                                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${modTheme.softBg} ${modTheme.accentText}`}
                              >
                                <Download className="w-3 h-3" />
                                <span>Unduh P2P</span>
                              </button>
                            )}
                            <span
                              className={`font-bold ${
                                isSelected ? modTheme.accentText : 'text-slate-500'
                              }`}
                            >
                              {isSelected ? 'Sedang Dibuka' : 'Pelajari →'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RIGHT PANEL (8 cols or 12 cols in Focus Mode): Subject-Themed Editorial Workspace */}
        {activeModule && (
          <div
            aria-label={`Pembaca Modul ${activeModule.title}`}
            className={`${
              isFocusReaderMode ? 'lg:col-span-12' : 'lg:col-span-8'
            } bento-card overflow-hidden transition-all`}
          >
            {/* Active Subject Top Gradient Ribbon */}
            <div className={`h-2 w-full ${activeTheme.ribbonGradient}`} />

            <div className="p-6 sm:p-8 space-y-6">
              {/* Editorial Module Header + Focus Mode Controls */}
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span className={`font-bold ${activeTheme.accentText}`}>
                      {activeModule.code} · {activeModule.subject}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeTheme.domainSubtitle}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeModule.gradeLevel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeModule.schoolOrigin}</span>
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug"
                    style={{ textWrap: 'balance' }}
                  >
                    {activeModule.title}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                    {activeModule.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFocusReaderMode((prev) => !prev)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
                      isFocusReaderMode
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isFocusReaderMode ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Tampilkan Katalog</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className={`w-3.5 h-3.5 ${activeTheme.accentText}`} />
                        <span>Mode Baca Fokus</span>
                      </>
                    )}
                  </button>

                  {completionPct < 100 ? (
                    <>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        disabled={isSyncing}
                        onClick={() => onSyncChunks(activeModule.id, 4)}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeTheme.primaryBtn}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh +4 Pecahan P2P</span>
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        disabled={isSyncing}
                        onClick={() => onSyncChunks(activeModule.id, 16)}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Lengkapi 100%
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      disabled={isSyncing}
                      onClick={() => onResetPeerChunks(activeModule.id)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset Unduhan P2P</span>
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Focus Mode Module Switcher & Typography Comfort Bar */}
              {isFocusReaderMode && (
                <div className="frosted-glass-bar rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-slate-600">Pilih Modul:</span>
                    <select
                      aria-label="Pilih Modul pada Mode Baca Fokus"
                      value={activeModule.id}
                      onChange={(e) => onSelectModule(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">Ukuran Teks Bacaan:</span>
                    <button
                      type="button"
                      onClick={() => setReaderTextSize('normal')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                        readerTextSize === 'normal'
                          ? activeTheme.activeTabGradient
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      Standar
                    </button>
                    <button
                      type="button"
                      onClick={() => setReaderTextSize('large')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                        readerTextSize === 'large'
                          ? activeTheme.activeTabGradient
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      Besar (Nyaman)
                    </button>
                  </div>
                </div>
              )}

              {/* Frosted Glass 4-Step Guided Learning Path Bar */}
              <div className="frosted-glass-bar p-1.5 rounded-2xl">
                <div
                  role="tablist"
                  aria-label="Jalur Belajar Terpandu Modul"
                  className="grid grid-cols-1 sm:grid-cols-4 gap-1.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubTab === 'materi'}
                    onClick={() => setActiveSubTab('materi')}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSubTab === 'materi'
                        ? activeTheme.activeTabGradient
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      1. Materi &amp; Kasus ({activeModuleCompletedChaptersCount}/
                      {activeModule.sections.length} Bab)
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubTab === 'simulasi'}
                    onClick={() => setActiveSubTab('simulasi')}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSubTab === 'simulasi'
                        ? activeTheme.activeTabGradient
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      2. Lab Simulasi{' '}
                      {completedMissions[activeModule.simulationType] ? '(✓ Tuntas)' : '(+150 XP)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubTab === 'kuis'}
                    onClick={() => setActiveSubTab('kuis')}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSubTab === 'kuis'
                        ? activeTheme.activeTabGradient
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      3. Latihan &amp; Kuis ({activeModuleAnsweredQuizCount}/
                      {activeModule.checkpoints.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onAskTutorWithPrompt) {
                        onAskTutorWithPrompt(
                          activeModule.id,
                          `Jelaskan rangkuman rumus utama dan studi kasus lapangan dari modul ${activeModule.title}!`
                        );
                      } else {
                        onNavigateTab('tutor');
                      }
                    }}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${activeTheme.softBg} ${activeTheme.accentText} hover:opacity-90`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>4. Diskusi AI 0-Kuota →</span>
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: Deep Curriculum Reading, High-Contrast Formula Calculators, 3T Case Study, Glossary, & Student Notes */}
              {activeSubTab === 'materi' && (
                <div className="space-y-6">
                  {/* Quick Section Jump Bar + Chapter & P2P Progress */}
                  <div className={`${activeTheme.softBg} border ${activeTheme.softBorder} rounded-2xl p-4 space-y-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <BookOpen className={`w-4 h-4 ${activeTheme.accentText} shrink-0`} />
                        <span className="font-bold text-slate-800 mr-1">Lompat ke Bagian:</span>
                        {activeModule.sections.map((_, sIdx) => {
                          const isDone = completedChapters[`${activeModule.id}-${sIdx}`];
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => scrollToElement(`chapter-${sIdx}`)}
                              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                                isDone
                                  ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {isDone ? '✓ ' : ''}Bab 0{sIdx + 1}
                            </button>
                          );
                        })}
                        {activeModule.caseStudy && (
                          <button
                            type="button"
                            onClick={() => scrollToElement('section-case-study')}
                            className="px-2.5 py-1 rounded-lg font-mono text-[11px] bg-white text-slate-700 border border-slate-200 hover:border-slate-300 cursor-pointer whitespace-nowrap"
                          >
                            Studi Kasus 3T
                          </button>
                        )}
                        {activeModule.glossary && (
                          <button
                            type="button"
                            onClick={() => scrollToElement('section-glossary')}
                            className="px-2.5 py-1 rounded-lg font-mono text-[11px] bg-white text-slate-700 border border-slate-200 hover:border-slate-300 cursor-pointer whitespace-nowrap"
                          >
                            Glosarium ({activeModule.glossary.length})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => scrollToElement('section-student-notes')}
                          className="px-2.5 py-1 rounded-lg font-mono text-[11px] bg-white text-slate-700 border border-slate-200 hover:border-slate-300 cursor-pointer whitespace-nowrap"
                        >
                          Catatan Siswa
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-700 tabular-nums">
                          Progres Baca: <strong className={activeTheme.accentText}>{activeModuleChapterPct}%</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsBitfieldExpanded((prev) => !prev)}
                          className={`text-xs font-bold ${activeTheme.accentText} hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>
                            Pecahan P2P: {heldChunksForActive.length}/{activeModule.totalChunks}
                          </span>
                          {isBitfieldExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sleek 16-Segment Subject-Colored Mini Bar */}
                    <div className="grid grid-cols-16 gap-1">
                      {Array.from({ length: activeModule.totalChunks }, (_, idx) => {
                        const isHeld = heldChunksForActive.includes(idx);
                        return (
                          <div
                            key={`mini-${idx}`}
                            title={`Pecahan #${idx} (${activeModule.chunkHashes[idx]})`}
                            className={`h-1.5 rounded-full transition-all ${
                              isHeld ? activeTheme.progressGradient : 'bg-white/80'
                            }`}
                          />
                        );
                      })}
                    </div>

                    <AnimatePresence initial={false}>
                      {isBitfieldExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                            {Array.from({ length: activeModule.totalChunks }, (_, idx) => {
                              const isHeld = heldChunksForActive.includes(idx);
                              return (
                                <div
                                  key={`${activeModule.id}-chunk-${idx}`}
                                  className={`px-2 py-1.5 rounded-lg flex items-center justify-between font-mono text-[10px] tabular-nums border ${
                                    isHeld
                                      ? `${activeTheme.chunkActiveClass} font-bold shadow-2xs`
                                      : 'bg-white text-slate-400 border-slate-200'
                                  }`}
                                >
                                  <span>#{idx}</span>
                                  <span className="opacity-80">
                                    {activeModule.chunkHashes[idx]?.slice(0, 4)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Editorial Curriculum Chapters with High-Contrast Formula Calculators & Visual Flows */}
                  <div className="divide-y divide-slate-200/90">
                    {activeModule.sections.map((sec, idx) => {
                      const isChapterDone = Boolean(
                        completedChapters[`${activeModule.id}-${idx}`]
                      );

                      return (
                        <article
                          key={idx}
                          id={`chapter-${idx}`}
                          className="py-6 first:pt-2 space-y-4 scroll-mt-24"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-7 h-7 rounded-lg ${activeTheme.stepNumberClass} font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs`}
                              >
                                0{idx + 1}
                              </span>
                              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                                {sec.heading.replace(/^\d+\.\s*/, '')}
                              </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (speakingChapterIndex === idx) {
                                    stopSpeech();
                                    setSpeakingChapterIndex(null);
                                  } else {
                                    setSpeakingChapterIndex(idx);
                                    playIndonesianSpeech(
                                      `${sec.heading}. ${sec.body}. Intisari: ${sec.keyTakeaway}`,
                                      undefined,
                                      () => setSpeakingChapterIndex(null)
                                    );
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                                  speakingChapterIndex === idx
                                    ? 'bg-amber-500 text-white border-transparent shadow-xs animate-pulse'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                                }`}
                              >
                                {speakingChapterIndex === idx ? (
                                  <>
                                    <Square className="w-3.5 h-3.5 fill-current" />
                                    <span>Hentikan Suara</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-sky-700" />
                                    <span>Dengarkan Materi</span>
                                  </>
                                )}
                              </button>

                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={() => handleToggleChapterComplete(activeModule.id, idx)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                                  isChapterDone
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                                }`}
                              >
                                <BookmarkCheck className="w-3.5 h-3.5" />
                                <span>
                                  {isChapterDone
                                    ? '✓ Bab Selesai Dipelajari'
                                    : 'Tandai Bab Selesai (+25 XP)'}
                                </span>
                              </motion.button>

                              <button
                                type="button"
                                onClick={() => {
                                  const qPrompt = `Tolong jelaskan lebih mendalam tentang "${sec.heading.replace(/^\d+\.\s*/, '')}" beserta penerapan rumusnya pada modul ${activeModule.title}.`;
                                  if (onAskTutorWithPrompt) {
                                    onAskTutorWithPrompt(activeModule.id, qPrompt);
                                  } else {
                                    onNavigateTab('tutor');
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold ${activeTheme.softBg} ${activeTheme.accentText} border ${activeTheme.softBorder} rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap hover:opacity-90`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Tanya Bab Ini ke AI</span>
                              </button>
                            </div>
                          </div>

                          <p
                            className={`${
                              readerTextSize === 'large'
                                ? 'text-base sm:text-[17px] leading-[1.8]'
                                : 'text-sm sm:text-[15px] leading-relaxed'
                            } text-slate-700 max-w-3xl`}
                          >
                            {sec.body}
                          </p>

                          {/* High-Contrast Formula + Subject-Tinted Key Takeaway Row */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
                            {sec.formula && (
                              <div
                                className={`md:col-span-5 p-4 blueprint-stage ${activeTheme.darkAccentText} font-mono text-xs sm:text-sm font-semibold rounded-xl flex items-center overflow-x-auto border border-slate-800 shadow-xs`}
                              >
                                <code>{sec.formula}</code>
                              </div>
                            )}

                            <div
                              className={`${
                                sec.formula ? 'md:col-span-7' : 'md:col-span-12'
                              } p-4 ${activeTheme.softBg} rounded-xl flex items-center border ${activeTheme.softBorder}`}
                            >
                              <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed">
                                <strong className={`${activeTheme.accentText} font-bold`}>
                                  Intisari Lapangan 3T:{' '}
                                </strong>
                                {sec.keyTakeaway}
                              </p>
                            </div>
                          </div>

                          {/* Visual Concept Schema Flow */}
                          {sec.visualSteps && sec.visualSteps.length > 0 && (
                            <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 space-y-3">
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Compass className={`w-4 h-4 ${activeTheme.accentText}`} />
                                <span>{sec.visualSchemaTitle || 'Skema Alur Konsep & Sistem'}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                {sec.visualSteps.map((stepText, stepIdx) => (
                                  <div
                                    key={stepIdx}
                                    className="bg-white p-3.5 rounded-xl border border-slate-200/90 flex flex-col justify-between space-y-2 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${activeTheme.stepNumberClass}`}
                                      >
                                        TAHAP 0{stepIdx + 1}
                                      </span>
                                      {stepIdx < (sec.visualSteps?.length || 0) - 1 && (
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 hidden lg:block" />
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-700 leading-snug font-medium">
                                      {stepText}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interactive High-Contrast Inline Formula Calculator */}
                          {sec.calculator && (
                            <InlineChapterCalculator
                              calculator={sec.calculator}
                              theme={activeTheme}
                            />
                          )}
                        </article>
                      );
                    })}
                  </div>

                  {/* Authentic 3T Field Case Study Section with Subject Gradient Header */}
                  {activeModule.caseStudy && (
                    <ModuleCaseStudyView
                      caseStudy={activeModule.caseStudy}
                      theme={activeTheme}
                    />
                  )}

                  {/* Technical Glossary & Concept Dictionary */}
                  {activeModule.glossary && activeModule.glossary.length > 0 && (
                    <ModuleGlossaryDrawer
                      glossary={activeModule.glossary}
                      theme={activeTheme}
                    />
                  )}

                  {/* Local Student Study Notes (Offline-First Persistence) */}
                  <section
                    id="section-student-notes"
                    aria-label="Catatan Belajar Siswa Lokal"
                    className="bg-gradient-to-br from-amber-50/70 via-white to-sky-50/40 border border-amber-200/90 rounded-2xl p-5 space-y-3.5 scroll-mt-24"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-2xs">
                          <PenLine className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Catatan Belajar Pribadi Siswa (Tersimpan Luring di Perangkat)
                          </h3>
                          <p className="text-[11px] text-slate-600">
                            Catatan Anda untuk modul {activeModule.code} otomatis tersimpan di memori
                            lokal peramban tanpa memerlukan koneksi internet.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const formulas = activeModule.sections
                              .map((s) => (s.formula ? `• ${s.heading}: ${s.formula}` : null))
                              .filter(Boolean)
                              .join('\n');
                            setStudentNotes((prev) => ({
                              ...prev,
                              [activeModule.id]: `${
                                prev[activeModule.id] ? prev[activeModule.id] + '\n\n' : ''
                              }Rumus Kunci ${activeModule.code}:\n${formulas}`,
                            }));
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 rounded-xl transition-colors cursor-pointer"
                        >
                          + Sisipkan Semua Rumus
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyNotes}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          {copiedNote ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Catatan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={studentNotes[activeModule.id] || ''}
                      onChange={(e) =>
                        setStudentNotes((prev) => ({
                          ...prev,
                          [activeModule.id]: e.target.value,
                        }))
                      }
                      placeholder={`Tulis rangkuman rumus, hasil pengamatan lapangan, atau pertanyaan untuk modul ${activeModule.title}...`}
                      className="w-full p-3.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                  </section>

                  {/* Next Step Action Bar */}
                  <div className="pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      Sudah memahami konsep dan studi kasus? Uji rumus secara visual di laboratorium
                      virtual.
                    </p>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('simulasi')}
                        className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeTheme.primaryBtn}`}
                      >
                        <span>Buka Lab Simulasi Interaktif</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('kuis')}
                        className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                      >
                        Lanjut ke Latihan &amp; Kuis
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: Interactive Simulation Sandbox */}
              {activeSubTab === 'simulasi' && (
                <div className="space-y-5">
                  <InteractiveSimulations
                    simulationType={activeModule.simulationType}
                    moduleTitle={activeModule.title}
                    onMissionComplete={handleMissionComplete}
                  />

                  <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('materi')}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                    >
                      Kembali ke Materi Bacaan
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('kuis')}
                      className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeTheme.primaryBtn}`}
                    >
                      <span>Lanjut ke Latihan Hitungan &amp; Kuis</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: Step-by-Step Guided Calculation Exercises + Timed Comprehension Quiz */}
              {activeSubTab === 'kuis' && (
                <ModuleQuizCard
                  activeModule={activeModule}
                  theme={activeTheme}
                  selectedAnswers={selectedAnswers}
                  revealedExerciseSteps={revealedExerciseSteps}
                  isTimedQuizMode={isTimedQuizMode}
                  remainingSeconds={remainingSeconds}
                  onStartTimedChallenge={handleStartTimedChallenge}
                  onExitTimedChallenge={() => {
                    setIsTimedQuizMode(false);
                    setIsTimerRunning(false);
                  }}
                  onSelectQuizOption={handleSelectQuizOption}
                  onToggleRevealAllSteps={(exerciseId, totalSteps, currentlyAllRevealed) => {
                    setRevealedExerciseSteps((prev) => ({
                      ...prev,
                      [exerciseId]: currentlyAllRevealed ? 1 : totalSteps,
                    }));
                    if (!currentlyAllRevealed) {
                      setStudentXp((xp) => xp + 40);
                      triggerXpCelebration(
                        40,
                        'Menuntaskan telaah Latihan Hitungan Bertahap!'
                      );
                    }
                  }}
                  onRevealNextStep={(exerciseId, totalSteps) => {
                    setRevealedExerciseSteps((prev) => ({
                      ...prev,
                      [exerciseId]: Math.min(totalSteps, (prev[exerciseId] ?? 1) + 1),
                    }));
                  }}
                  onAskTutorAboutQuiz={() => {
                    if (onAskTutorWithPrompt) {
                      onAskTutorWithPrompt(
                        activeModule.id,
                        activeModule.checkpoints[0]?.question ||
                          `Jelaskan konsep utama modul ${activeModule.title}`
                      );
                    } else {
                      onNavigateTab('tutor');
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};
