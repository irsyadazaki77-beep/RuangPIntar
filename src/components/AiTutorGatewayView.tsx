import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  ShieldCheck,
  Repeat,
  Sparkles,
  Database,
  User,
  Bot,
  Zap,
  ArrowRight,
  Volume2,
  Square,
} from 'lucide-react';
import type {
  LearningModule,
  PeerNode,
  CacheEntry,
  TutorAskResponse,
  SwarmMetrics,
} from '../utils/edgeEngine';
import { getSubjectTheme } from '../utils/subjectTheme';
import { playIndonesianSpeech, stopSpeech } from '../utils/speechUtils';

interface Props {
  modules: LearningModule[];
  peers: PeerNode[];
  cacheEntries: CacheEntry[];
  recentQueries: TutorAskResponse[];
  metrics: SwarmMetrics;
  gatewayTetheringOnline: boolean;
  activeModuleId?: string;
  initialQuestionPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  onAskQuestion: (payload: {
    question: string;
    moduleId: string;
    askedByPeerName: string;
    forceCloudRefresh?: boolean;
  }) => Promise<TutorAskResponse | null>;
  isAsking: boolean;
}

type TutorSidebarTab = 'skenario' | 'cache';

const tutorContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const tutorItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 bg-sky-50 border border-sky-200/80 text-sky-900 rounded font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function FormattedAnswer({
  markdown,
  isTyping,
}: {
  markdown: string;
  isTyping?: boolean;
}) {
  const blocks = markdown.split(/\n\n+/);
  return (
    <div className="space-y-3.5 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('`') && trimmed.endsWith('`') && !trimmed.slice(1, -1).includes('`')) {
          return (
            <div
              key={idx}
              className="p-3.5 blueprint-stage text-cyan-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800"
            >
              {trimmed.slice(1, -1)}
            </div>
          );
        }

        const lines = trimmed.split('\n');
        const isList = lines.every((l) => l.trim().startsWith('- ') || /^\d+\.\s/.test(l.trim()));
        if (isList) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1.5">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>
                  {renderInlineFormatting(line.trim().replace(/^(-|\d+\.)\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        const isLastBlock = idx === blocks.length - 1;
        return (
          <p key={idx}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInlineFormatting(line)}
              </React.Fragment>
            ))}
            {isTyping && isLastBlock && (
              <span
                aria-hidden="true"
                className="inline-block w-2 h-4 ml-1 align-middle bg-sky-600 animate-cursor-blink"
              />
            )}
          </p>
        );
      })}
    </div>
  );
}

export const AiTutorGatewayView: React.FC<Props> = ({
  modules,
  peers,
  cacheEntries,
  recentQueries,
  metrics,
  gatewayTetheringOnline,
  activeModuleId,
  initialQuestionPrompt,
  onClearInitialPrompt,
  onAskQuestion,
  isAsking,
}) => {
  const studentPeers = peers.filter((p) => p.role === 'PEER');

  const [selectedStudentName, setSelectedStudentName] = useState<string>(
    studentPeers[4]?.name || 'Hendrikus D. (Perangkat Anda · Peer 05)'
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    activeModuleId || modules[0]?.id || 'mod-fisika-mikrohidro'
  );
  const [sidebarTab, setSidebarTab] = useState<TutorSidebarTab>('skenario');
  const [questionText, setQuestionText] = useState<string>(initialQuestionPrompt || '');
  const [cacheFilterText, setCacheFilterText] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedModuleObj = modules.find((m) => m.id === selectedModuleId) || modules[0];
  const activeTheme = getSubjectTheme(selectedModuleObj?.subject);

  const defaultInitialResponse: TutorAskResponse | null =
    recentQueries[0] ||
    (cacheEntries[0]
      ? {
          question: cacheEntries[0].questionCanonical,
          moduleId: cacheEntries[0].moduleId,
          askedByPeerName: cacheEntries[0].createdByStudent,
          source: 'LOCAL_CACHE',
          latencyMs: 0,
          similarityScore: 1,
          queryId: 'init-cache-0',
          cacheEntryId: cacheEntries[0].id,
          matchedCanonicalQuestion: cacheEntries[0].questionCanonical,
          answerMarkdown: cacheEntries[0].answerMarkdown,
          keyConcepts: cacheEntries[0].keyConcepts,
          ispQuotaBytesUsed: 0,
          ispQuotaKBaved: 14.5,
          timestamp: cacheEntries[0].createdAt,
        }
      : null);

  const [activeResponse, setActiveResponse] = useState<TutorAskResponse | null>(
    defaultInitialResponse
  );

  // Fast progressive typing reveal state for new responses
  const [revealedChars, setRevealedChars] = useState<number>(99999);
  const [isTypingEffect, setIsTypingEffect] = useState<boolean>(false);
  const [isSpeakingAnswer, setIsSpeakingAnswer] = useState<boolean>(false);

  useEffect(() => {
    stopSpeech();
    setIsSpeakingAnswer(false);
    return () => {
      stopSpeech();
    };
  }, [activeResponse]);

  useEffect(() => {
    if (!activeResponse?.answerMarkdown) return;
    const totalLen = activeResponse.answerMarkdown.length;
    setRevealedChars(Math.min(48, totalLen));
    setIsTypingEffect(true);

    const stepSize = Math.max(24, Math.ceil(totalLen / 14));
    const timer = window.setInterval(() => {
      setRevealedChars((prev) => {
        if (prev + stepSize >= totalLen) {
          window.clearInterval(timer);
          setIsTypingEffect(false);
          return totalLen;
        }
        return prev + stepSize;
      });
    }, 30);

    return () => window.clearInterval(timer);
  }, [activeResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText || questionText.trim().length < 5) {
      setValidationError(
        'Pertanyaan harus berisi minimal 5 karakter sebelum dikirim ke gateway lokal guru.'
      );
      return;
    }
    setValidationError(null);
    const res = await onAskQuestion({
      question: questionText,
      moduleId: selectedModuleId,
      askedByPeerName: selectedStudentName,
    });
    if (res) {
      setActiveResponse(res);
    }
  };

  const handleQuickPrompt = async (q: string, modId: string, studentName?: string) => {
    setValidationError(null);
    setQuestionText(q);
    setSelectedModuleId(modId);
    const caller = studentName || selectedStudentName;
    if (studentName) setSelectedStudentName(caller);

    const res = await onAskQuestion({
      question: q,
      moduleId: modId,
      askedByPeerName: caller,
    });
    if (res) {
      setActiveResponse(res);
    }
  };

  useEffect(() => {
    if (activeModuleId) {
      setSelectedModuleId(activeModuleId);
    }
  }, [activeModuleId]);

  useEffect(() => {
    if (initialQuestionPrompt && initialQuestionPrompt.trim().length > 0) {
      const q = initialQuestionPrompt;
      const modId = activeModuleId || selectedModuleId;
      setQuestionText(q);
      if (onClearInitialPrompt) onClearInitialPrompt();
      onAskQuestion({
        question: q,
        moduleId: modId,
        askedByPeerName: selectedStudentName,
      }).then((res) => {
        if (res) setActiveResponse(res);
      });
    }
  }, [initialQuestionPrompt, activeModuleId, selectedModuleId, selectedStudentName, onAskQuestion, onClearInitialPrompt]);

  const isLocalHit = activeResponse?.source === 'LOCAL_CACHE';

  return (
    <motion.div
      variants={tutorContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Unified Header + Compact 1-Line Pipeline Status Ribbon */}
      <motion.section
        variants={tutorItemVariants}
        aria-label="Arsitektur Single-Gateway Cloud AI dan Cache Lokal"
        className="bento-card overflow-hidden"
      >
        <div className={`h-1.5 w-full ${activeTheme.ribbonGradient}`} />
        <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
              <span className={`font-bold ${activeTheme.accentText}`}>
                Arsitektur: Single-Gateway Cloud AI
              </span>
              <span aria-hidden="true">·</span>
              <span>Model Cloud: Gemini 3.8 Flash (Server-Side Guru)</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold">
                Tethering Guru:{' '}
                {gatewayTetheringOnline ? 'Aktif (Hemat Kuota >90%)' : 'Mode Luring 100% Lokal'}
              </span>
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold text-slate-900"
              style={{ textWrap: 'balance' }}
            >
              Asisten Tutor AI Satu Pintu dengan Memori Cache Lokal Cerdas
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Perangkat siswa tidak pernah terhubung langsung ke internet atau menyimpan API key.
              Pertanyaan dikirim via WiFi lokal ke laptop guru: topik serupa disajikan dalam{' '}
              <strong>0 milidetik</strong> dan <strong>0 KB kuota</strong>.
            </p>
          </div>

          <div className="text-right font-mono text-xs tabular-nums shrink-0 space-y-0.5 bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200/90 rounded-xl px-4 py-3 shadow-2xs">
            <div className="text-slate-600">Efisiensi Cache Kelas</div>
            <div className="text-base font-bold text-emerald-700">
              {metrics.cacheHitRatioPct}% Jawaban dari Cache Lokal
            </div>
            <div className="text-slate-600">
              {metrics.totalCacheHits} Cache Hit · {metrics.totalCloudQueries} Cloud Call
            </div>
          </div>
        </div>

        {/* Sleek Single-Line Pipeline Status Ribbon */}
        <div className="bg-slate-50 border-t border-slate-200/90 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-mono font-semibold text-slate-500">Alur Eksekusi:</span>
            <span className="font-medium text-slate-900">
              01. Siswa → WiFi Lokal (192.168.43.1)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span
              className={`px-2.5 py-0.5 rounded-md font-mono font-semibold transition-colors ${
                activeResponse && isLocalHit
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs'
                  : 'text-slate-700 bg-white border border-slate-200'
              }`}
            >
              02. Pencocokan Cache Lokal {activeResponse && isLocalHit ? '(HIT · 0ms)' : ''}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span
              className={`px-2.5 py-0.5 rounded-md font-mono font-semibold transition-colors ${
                activeResponse && !isLocalHit
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-2xs'
                  : 'text-slate-700 bg-white border border-slate-200'
              }`}
            >
              03. Cloud Gemini Guru → Simpan Cache {activeResponse && !isLocalHit ? '(BARU)' : ''}
            </span>
          </div>

          <span className="font-mono text-[11px] text-emerald-700 font-bold">
            0 Byte Kuota Siswa Terpakai
          </span>
        </div>
      </motion.section>

      {/* Focused 2-Column Chat & Cache Workspace (4:8) */}
      <motion.section
        variants={tutorItemVariants}
        aria-label="Ruang Tanya Jawab Tutor AI dan Inspektor Cache"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* LEFT SIDEBAR (4 cols): Context Selectors + Tabbed Scenarios / Cache List */}
        <div className="lg:col-span-4 bento-card p-5 space-y-5">
          {/* Context Selectors */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Konfigurasi Perangkat &amp; Konteks Modul
            </h2>

            <div className="space-y-2.5">
              <div>
                <label
                  htmlFor="tutor-student-select"
                  className="block text-[11px] font-medium text-slate-700 mb-1"
                >
                  Identitas Perangkat Siswa (Peer)
                </label>
                <select
                  id="tutor-student-select"
                  value={selectedStudentName}
                  onChange={(e) => setSelectedStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-600"
                >
                  {studentPeers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tutor-module-select"
                  className="block text-[11px] font-medium text-slate-700 mb-1"
                >
                  Konteks Modul Pembelajaran
                </label>
                <select
                  id="tutor-module-select"
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-600"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} · {m.subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Segmented Switcher to Prevent Sidebar Stacking Overload */}
          <div className="pt-4 border-t border-slate-200 space-y-3.5">
            <div
              role="tablist"
              aria-label="Pilih Skenario atau Memori Cache"
              className="grid grid-cols-2 gap-1 frosted-glass-bar p-1 rounded-xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === 'skenario'}
                onClick={() => setSidebarTab('skenario')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  sidebarTab === 'skenario'
                    ? activeTheme.activeTabGradient
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Skenario Uji Cepat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === 'cache'}
                onClick={() => setSidebarTab('cache')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                  sidebarTab === 'cache'
                    ? activeTheme.activeTabGradient
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3 h-3 shrink-0" />
                <span>Cache Lokal ({cacheEntries.length})</span>
              </button>
            </div>

            {sidebarTab === 'skenario' ? (
              <div className="space-y-2.5">
                <p className="text-[11px] text-stone-500">
                  Klik skenario di bawah untuk menguji perbedaan respons Cache Hit (0 ms) dan Cloud Miss lintas 6 modul:
                </p>

                <button
                  type="button"
                  disabled={isAsking}
                  onClick={() =>
                    handleQuickPrompt(
                      'Bagaimana menghitung daya listrik mikrohidro dari debit dan tinggi jatuh air?',
                      'mod-fisika-mikrohidro'
                    )
                  }
                  className="w-full text-left p-3 rounded-xl border border-[#e6e2d8] hover:border-emerald-600 bg-[#faf8f5] hover:bg-emerald-50/40 transition-colors text-xs cursor-pointer space-y-1"
                >
                  <div className="font-mono text-[10px] text-emerald-700 font-semibold">
                    FIS-XI-01 · Cache Hit · 0 ms · 0 Kuota
                  </div>
                  <div className="text-stone-800 font-medium line-clamp-2">
                    &ldquo;Bagaimana menghitung daya listrik mikrohidro dari debit dan tinggi jatuh air?&rdquo;
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isAsking}
                  onClick={() =>
                    handleQuickPrompt(
                      'Bagaimana cara menghitung kapasitas panel surya Wp dan baterai LiFePO4 untuk laboratorium komputer sekolah 3T?',
                      'mod-energi-surya'
                    )
                  }
                  className="w-full text-left p-3 rounded-xl border border-[#e6e2d8] hover:border-emerald-600 bg-[#faf8f5] hover:bg-emerald-50/40 transition-colors text-xs cursor-pointer space-y-1"
                >
                  <div className="font-mono text-[10px] text-emerald-700 font-semibold">
                    TEK-XI-04 · Cache Hit PLTS &amp; LiFePO4 · 0 ms
                  </div>
                  <div className="text-stone-800 font-medium line-clamp-2">
                    &ldquo;Bagaimana cara menghitung kapasitas panel surya Wp dan baterai LiFePO4 untuk laboratorium komputer sekolah 3T?&rdquo;
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isAsking}
                  onClick={() =>
                    handleQuickPrompt(
                      'Bagaimana sistem agroforestri Mamar dan teras batu menjaga mata air tetap mengalir saat musim kemarau panjang di NTT?',
                      'mod-biologi-agroforestri'
                    )
                  }
                  className="w-full text-left p-3 rounded-xl border border-[#e6e2d8] hover:border-emerald-600 bg-[#faf8f5] hover:bg-emerald-50/40 transition-colors text-xs cursor-pointer space-y-1"
                >
                  <div className="font-mono text-[10px] text-emerald-700 font-semibold">
                    BIO-XI-05 · Cache Hit Agroforestri Mamar · 0 ms
                  </div>
                  <div className="text-stone-800 font-medium line-clamp-2">
                    &ldquo;Bagaimana sistem agroforestri Mamar dan teras batu menjaga mata air tetap mengalir saat musim kemarau panjang di NTT?&rdquo;
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isAsking}
                  onClick={() =>
                    handleQuickPrompt(
                      'Bagaimana prinsip kerja distilasi surya (solar basin still) dan arang tempurung kelapa dalam memurnikan air payau pesisir?',
                      'mod-fisika-desalinasi'
                    )
                  }
                  className="w-full text-left p-3 rounded-xl border border-[#e6e2d8] hover:border-emerald-600 bg-[#faf8f5] hover:bg-emerald-50/40 transition-colors text-xs cursor-pointer space-y-1"
                >
                  <div className="font-mono text-[10px] text-emerald-700 font-semibold">
                    FIS-XI-06 · Cache Hit Distilasi Surya · 0 ms
                  </div>
                  <div className="text-stone-800 font-medium line-clamp-2">
                    &ldquo;Bagaimana prinsip kerja distilasi surya dan arang tempurung kelapa dalam memurnikan air payau pesisir?&rdquo;
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isAsking}
                  onClick={() =>
                    handleQuickPrompt(
                      'Bagaimana langkah perawatan saringan bak penenang (forebay) dan pipa pesat saat musim hujan deras di desa?',
                      'mod-fisika-mikrohidro'
                    )
                  }
                  className="w-full text-left p-3 rounded-xl border border-[#e6e2d8] hover:border-sky-600 bg-[#faf8f5] hover:bg-sky-50/40 transition-colors text-xs cursor-pointer space-y-1"
                >
                  <div className="font-mono text-[10px] text-sky-800 font-semibold">
                    Pertanyaan Baru · Cloud → Otomatis Simpan ke Cache
                  </div>
                  <div className="text-stone-800 font-medium line-clamp-2">
                    &ldquo;Bagaimana langkah perawatan saringan bak penenang (forebay) dan pipa pesat saat musim hujan deras di desa?&rdquo;
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <input
                  type="search"
                  value={cacheFilterText}
                  onChange={(e) => setCacheFilterText(e.target.value)}
                  placeholder="Cari pertanyaan di memori cache lokal..."
                  className="w-full px-3 py-1.5 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700"
                />
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 divide-y divide-[#ece8df]">
                  {cacheEntries
                    .filter(
                      (entry) =>
                        !cacheFilterText.trim() ||
                        entry.questionCanonical
                          .toLowerCase()
                          .includes(cacheFilterText.toLowerCase()) ||
                        entry.subject.toLowerCase().includes(cacheFilterText.toLowerCase())
                    )
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="py-2.5 first:pt-0 last:pb-0 flex flex-col justify-between gap-1.5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 tabular-nums">
                            <span>{entry.subject}</span>
                            <span className="text-emerald-700 font-semibold">
                              {entry.hitCount}× Hit · Hemat {entry.savedQuotaKB.toFixed(1)} KB
                            </span>
                          </div>
                          <p className="text-xs font-medium text-stone-900 leading-snug line-clamp-2">
                            {entry.questionCanonical}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-stone-500 truncate">
                            Oleh: {entry.createdByStudent.split(' ')[0]}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickPrompt(entry.questionCanonical, entry.moduleId)
                            }
                            className="px-2 py-0.5 text-[11px] font-semibold text-sky-800 hover:text-sky-950 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Panggil Cache 0ms →
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (8 cols): Clean Warm Conversational Workspace & Bottom Composer */}
        <div className="lg:col-span-8 bento-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
          {/* Top Conversation Security Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#e6e2d8]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center">
                <Bot className="w-4 h-4 text-sky-800" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Ruang Diskusi Tutor AI Satu Pintu
                </h2>
                <p className="text-[11px] text-stone-500">
                  Gateway Lokal: 192.168.43.1 · Dijawab dari Cache Lokal atau Gemini Cloud
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>API Key Terkunci di Server Guru</span>
            </div>
          </div>

          {/* Conversation Stream Area */}
          <AnimatePresence initial={false} mode="wait">
            {activeResponse ? (
              <motion.div
                key={`${activeResponse.question}-${activeResponse.timestamp}`}
                initial={{ opacity: 0.92, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {/* Student Question Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 surface-warm-recessed rounded-2xl rounded-tl-xs p-4 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                      <span>
                        Ditanyakan oleh <strong className="text-stone-800">{activeResponse.askedByPeerName}</strong>
                      </span>
                      <span className="font-mono tabular-nums">{activeResponse.timestamp}</span>
                    </div>
                    <h3 className="text-base font-bold text-stone-900 leading-snug">
                      &ldquo;{activeResponse.question}&rdquo;
                    </h3>
                  </div>
                </div>

                {/* AI Gateway Response Bubble + Streamlined Telemetry Header */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      activeResponse.source === 'LOCAL_CACHE'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-sky-700 text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>

                  <div className="flex-1 border border-[#e6e2d8] rounded-2xl rounded-tl-xs overflow-hidden bg-white">
                    {/* Compact Telemetry Ribbon */}
                    <div
                      className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
                        activeResponse.source === 'LOCAL_CACHE'
                          ? 'bg-emerald-50/70 border-emerald-200/80'
                          : 'bg-sky-50/70 border-sky-200/80'
                      }`}
                    >
                      <span
                        className={`font-bold ${
                          activeResponse.source === 'LOCAL_CACHE'
                            ? 'text-emerald-800'
                            : 'text-sky-800'
                        }`}
                      >
                        {activeResponse.source === 'LOCAL_CACHE'
                          ? '● CACHE LOKAL SIMPUL GURU (0 DETIK · 0 KUOTA)'
                          : activeResponse.source === 'CLOUD_GEMINI_GATEWAY'
                          ? '▲ SATU PINTU CLOUD GEMINI → TERSIMPAN KE CACHE'
                          : '◆ SINTESIS KURIKULUM EDGE LOKAL → TERSIMPAN KE CACHE'}
                      </span>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-700 tabular-nums">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSpeakingAnswer) {
                              stopSpeech();
                              setIsSpeakingAnswer(false);
                            } else if (activeResponse?.answerMarkdown) {
                              setIsSpeakingAnswer(true);
                              playIndonesianSpeech(
                                activeResponse.answerMarkdown,
                                undefined,
                                () => setIsSpeakingAnswer(false)
                              );
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                            isSpeakingAnswer
                              ? 'bg-amber-500 text-white border-transparent shadow-2xs animate-pulse'
                              : 'bg-white text-slate-800 border-slate-300 hover:border-sky-400'
                          }`}
                        >
                          {isSpeakingAnswer ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Hentikan Suara</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-sky-700" />
                              <span>Dengarkan Jawaban</span>
                            </>
                          )}
                        </button>
                        <span aria-hidden="true">·</span>
                        <span>
                          Respons: <strong>{activeResponse.latencyMs} ms</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Kemiripan: <strong>{(activeResponse.similarityScore * 100).toFixed(0)}%</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-semibold">
                          Hemat +{activeResponse.ispQuotaKBaved} KB
                        </span>
                        {isTypingEffect && (
                          <button
                            type="button"
                            onClick={() => {
                              setRevealedChars(activeResponse.answerMarkdown.length);
                              setIsTypingEffect(false);
                            }}
                            className="text-sky-800 hover:underline cursor-pointer ml-1"
                          >
                            Tampilkan Instan
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Answer Content Body */}
                    <div className="p-5 sm:p-6 space-y-4">
                      {activeResponse.matchedCanonicalQuestion &&
                        activeResponse.source === 'LOCAL_CACHE' && (
                          <p className="text-xs text-emerald-800 bg-emerald-50/50 border border-emerald-200/60 rounded-lg px-3 py-1.5">
                            Cocok dengan rekaman cache lokal:{' '}
                            <em>&ldquo;{activeResponse.matchedCanonicalQuestion}&rdquo;</em>
                          </p>
                        )}

                      <FormattedAnswer
                        markdown={activeResponse.answerMarkdown.slice(0, revealedChars)}
                        isTyping={isTypingEffect}
                      />

                      {/* Unboxed Inline Key Concepts */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 font-mono pt-3 border-t border-[#ece8df]">
                        <span className="font-semibold text-stone-900">Konsep Kunci:</span>
                        {activeResponse.keyConcepts.map((concept, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span aria-hidden="true">·</span>}
                            <span>{concept}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Re-Query Proof Bar */}
                    <div className="px-5 py-3 bg-[#f6f4ee] border-t border-[#e6e2d8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-stone-600">
                        <strong className="text-stone-900">Uji Bukti Cache Lokal:</strong> Tanyakan
                        ulang dari perangkat teman sekelas untuk membuktikan latensi 0 ms.
                      </div>
                      <button
                        type="button"
                        disabled={isAsking}
                        onClick={() =>
                          handleQuickPrompt(
                            activeResponse.question,
                            activeResponse.moduleId,
                            'Siti Rahmawati (Meja Belakang · Peer 04)'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200/80 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        <span>Tanyakan Ulang dari Perangkat Siti (Peer 04)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 space-y-2.5 text-sm text-stone-500">
                <Sparkles className="w-6 h-6 text-sky-700" />
                <p className="font-medium text-stone-800">
                  Ruang Jawaban Tutor AI Satu Pintu Siap Digunakan
                </p>
                <p className="text-xs text-stone-500 max-w-md">
                  Pilih salah satu skenario uji cepat di panel kiri atau ketik pertanyaan kurikulum di bawah.
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Bottom Docked Question Composer Form */}
          <form
            onSubmit={handleSubmit}
            className="pt-4 border-t border-[#e6e2d8] space-y-3"
            noValidate
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor="student-question-textarea"
                className="text-xs font-semibold text-stone-800"
              >
                Ketik Pertanyaan Siswa ke Gateway Lokal Guru
              </label>
              <span className="text-[11px] font-mono text-stone-500">
                Pengirim: {selectedStudentName.split(' ')[0]}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <textarea
                id="student-question-textarea"
                rows={2}
                value={questionText}
                onChange={(e) => {
                  setQuestionText(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Contoh: Bagaimana cara menghitung daya listrik mikrohidro dari debit sungai dan tinggi jatuh air?"
                className="flex-1 p-3 text-xs sm:text-sm bg-[#faf8f5] border border-[#d6d1c4] rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
              />

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isAsking}
                className="px-5 py-3 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isAsking ? 'Memproses...' : 'Kirim Pertanyaan'}
                </span>
              </motion.button>
            </div>

            {validationError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {validationError}
              </p>
            )}
          </form>
        </div>
      </motion.section>
    </motion.div>
  );
};
