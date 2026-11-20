import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  School,
  MessageSquare,
  Share2,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HERO_CLASSROOM_IMAGE } from '../../utils/seedData';
import type { SwarmMetrics } from '../../utils/edgeEngine';
import type { StudentLevelInfo } from '../../utils/subjectTheme';

export interface ModuleHeroHeaderProps {
  totalModulesCount: number;
  metrics: SwarmMetrics;
  levelInfo: StudentLevelInfo;
  studentXp: number;
  quizStreak: number;
  achievementsData: {
    unlockedCount: number;
    badges: {
      id: string;
      category: string;
      title: string;
      description: string;
      unlocked: boolean;
      progressPct: number;
      progressText: string;
    }[];
  };
  lastXpToast: { xpDelta: number; message: string } | null;
  onCloseToast: () => void;
  onNavigateTab: (tab: 'pustaka' | 'mesh' | 'tutor' | 'guru') => void;
  onOpenSimulation: () => void;
  onOpenQuiz: () => void;
}

export const ModuleHeroHeader: React.FC<ModuleHeroHeaderProps> = ({
  totalModulesCount,
  metrics,
  levelInfo,
  studentXp,
  quizStreak,
  achievementsData,
  lastXpToast,
  onCloseToast,
  onNavigateTab,
  onOpenSimulation,
  onOpenQuiz,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [isBadgesExpanded, setIsBadgesExpanded] = useState(false);

  return (
    <div className="bento-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8 p-6 sm:p-8 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#475569]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#1D4ED8]">
                <School className="w-3.5 h-3.5 shrink-0" />
                <span>Simpul Guru (192.168.43.1)</span>
              </span>
              <span className="text-[#CBD5E1]" aria-hidden="true">·</span>
              <span className="font-mono text-[11px] tabular-nums text-[#0F172A] font-semibold">
                {totalModulesCount} Buku Pelajaran
              </span>
              <span className="text-[#CBD5E1]" aria-hidden="true">·</span>
              <span className="font-mono text-[11px] text-[#059669] font-semibold">
                6 Lab Sains Luring
              </span>
            </div>

            <h1
              className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[#0F172A] leading-snug"
              style={{ textWrap: 'balance' }}
            >
              Pustaka Sains Nusantara — Belajar Mandiri Bebas Kuota
            </h1>

            <p className="text-sm text-[#475569] leading-relaxed max-w-2xl">
              Buka buku pelajaran, aktifkan suara pembaca jika lelah membaca, uji rumus di
              laboratorium kelas, dan catat kemajuanmu tanpa koneksi internet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateTab('tutor')}
              className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#FFFFFF] bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#FBBF24]" />
              <span>Tanya Pintar (0 Kuota)</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigateTab('mesh')}
              className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0F172A] bg-[#F1F5F9] border border-[#E2E8F0] hover:bg-[#E2E8F0] rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#1D4ED8]" />
              <span>Lihat Jaringan Kelas</span>
            </motion.button>
          </div>
        </div>

        <div className="lg:col-span-4 relative min-h-[210px] lg:min-h-full bg-[#0F172A] flex flex-col justify-end overflow-hidden group border-t lg:border-t-0 lg:border-l border-[#E2E8F0]">
          {!heroImgFailed ? (
            <img
              src={HERO_CLASSROOM_IMAGE}
              alt="Siswa dan guru di kelas wilayah 3T berkolaborasi menggunakan jaringan lokal RuangPintar"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-[#0F172A]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/95 via-[#0F172A]/45 to-transparent" />
          <div className="relative z-10 p-5 text-[#FFFFFF] space-y-1.5">
            <p className="text-[11px] font-mono text-[#FBBF24] font-semibold">
              Alor · Kepulauan Aru · Wakatobi · Sumba · Rote · Natuna
            </p>
            <p className="text-xs font-medium text-[#F1F5F9] leading-snug">
              Kurikulum berbasis potensi energi terbarukan, ekologi pesisir, dan kemaritiman
              Nusantara yang berjalan 100% di jaringan lokal sekolah.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#F1F5F9]/65 border-t border-[#E2E8F0] px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
          <div className="xl:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[11px] font-medium text-[#64748B]">Kuota Dihemat</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-[#059669] tabular-nums">
                  {metrics.ispQuotaSavedMB.toFixed(1)} MB
                </span>
                <span className="text-[10px] text-[#059669] font-semibold">Gratis</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[11px] font-medium text-[#64748B]">Berbagi Teman</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-[#1D4ED8] tabular-nums">
                  {metrics.meshOffloadPercentage}%
                </span>
                <span className="text-[10px] text-[#64748B] font-medium tabular-nums">
                  {metrics.peerToPeerOffloadedMB} MB
                </span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[11px] font-medium text-[#64748B]">Arsip Tanya Pintar</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-[#1D4ED8] tabular-nums">
                  {metrics.cacheHitRatioPct}% Instan
                </span>
                <span className="text-[10px] text-[#64748B] font-medium tabular-nums">
                  {metrics.totalCacheHits}× 0ms
                </span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3">
              <p className="text-[11px] font-medium text-[#64748B]">Teman Terhubung</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-[#0F172A] tabular-nums">
                  {metrics.studentPeersCount} Murid
                </span>
                <span className="text-[10px] text-[#64748B] font-medium">1 Guru</span>
              </div>
            </div>
          </div>

          <div className="xl:col-span-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1D4ED8] text-[#FFFFFF] flex items-center justify-center font-mono text-xs font-bold">
                  L{levelInfo.level}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{levelInfo.title}</div>
                  <div className="text-[10px] font-mono text-[#64748B] tabular-nums">
                    Total: <strong className="text-[#1D4ED8]">{studentXp} XP</strong> · Rentetan
                    Kuis: <strong className="text-[#059669]">{quizStreak}×</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-expanded={isBadgesExpanded}
                onClick={() => setIsBadgesExpanded((prev) => !prev)}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] border border-[#E2E8F0] hover:bg-[#E2E8F0] rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-[#1D4ED8]" />
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
              <div className="flex justify-between text-[10px] font-mono text-[#64748B] tabular-nums">
                <span>
                  Menuju Level {Math.min(5, levelInfo.level + 1)} ({levelInfo.nextTitle})
                </span>
                <span className="font-bold text-[#1D4ED8]">
                  {levelInfo.progressPct}% ({levelInfo.xpNeededForNext} XP lagi)
                </span>
              </div>
              <div className="w-full h-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full overflow-hidden">
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

        <AnimatePresence mode="popLayout">
          {lastXpToast && (
            <motion.div
              key={`${lastXpToast.message}-${studentXp}`}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              role="status"
              className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold border ${
                lastXpToast.xpDelta > 0
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0F172A]'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {lastXpToast.xpDelta > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] text-[#FFFFFF] font-mono text-xs font-bold tabular-nums">
                    +{lastXpToast.xpDelta} XP
                  </span>
                )}
                <span>{lastXpToast.message}</span>
              </div>
              <button
                type="button"
                onClick={onCloseToast}
                className="font-mono text-xs text-[#0F172A] hover:bg-[#F1F5F9] bg-[#FFFFFF] px-2.5 py-1 rounded-md border border-[#E2E8F0] cursor-pointer shrink-0"
              >
                Tutup
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
                      border: 'border-[#A7F3D0]',
                      bg: 'bg-[#ECFDF5]',
                      bar: 'bg-[#059669]',
                      text: 'text-[#059669]',
                      actionLabel: 'Buka Lab Simulasi →',
                      onClick: onOpenSimulation,
                    },
                    {
                      border: 'border-[#BFDBFE]',
                      bg: 'bg-[#EFF6FF]',
                      bar: 'bg-[#1D4ED8]',
                      text: 'text-[#1D4ED8]',
                      actionLabel: 'Buka Jaringan Kelas →',
                      onClick: () => onNavigateTab('mesh'),
                    },
                    {
                      border: 'border-[#FDE68A]',
                      bg: 'bg-[#FFFBEB]',
                      bar: 'bg-[#D97706]',
                      text: 'text-[#92400E]',
                      actionLabel: 'Buka Kuis Latihan →',
                      onClick: onOpenQuiz,
                    },
                    {
                      border: 'border-[#BFDBFE]',
                      bg: 'bg-[#EFF6FF]',
                      bar: 'bg-[#1D4ED8]',
                      text: 'text-[#1D4ED8]',
                      actionLabel: 'Buka Tanya Pintar →',
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
    </div>
  );
};
