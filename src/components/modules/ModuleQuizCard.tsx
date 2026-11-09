import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lightbulb,
  Timer,
  Zap,
  CheckCircle2,
  ArrowRight,
  Smile,
  Sparkles,
  RotateCcw,
  BookOpen,
  Volume2,
  VolumeX,
  Star,
  Award,
} from 'lucide-react';
import type { LearningModule } from '../../utils/edgeEngine';
import type { SubjectVisualTheme } from '../../utils/subjectTheme';
import {
  playSuccessSound,
  playRetrySound,
  isAudioMuted,
  toggleAudioMuted,
} from '../../utils/soundEffects';

export interface ModuleQuizCardProps {
  activeModule: LearningModule;
  theme: SubjectVisualTheme;
  selectedAnswers: Record<string, number>;
  revealedExerciseSteps: Record<string, number>;
  isTimedQuizMode: boolean;
  remainingSeconds: number;
  onStartTimedChallenge: () => void;
  onExitTimedChallenge: () => void;
  onSelectQuizOption: (questionIdx: number, optionIdx: number, correctIndex: number) => void;
  onToggleRevealAllSteps: (exerciseId: string, totalSteps: number, currentlyAllRevealed: boolean) => void;
  onRevealNextStep: (exerciseId: string, totalSteps: number) => void;
  onAskTutorAboutQuiz: () => void;
  onResetQuiz?: () => void;
  onNextChapter?: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const ModuleQuizCard: React.FC<ModuleQuizCardProps> = ({
  activeModule,
  theme,
  selectedAnswers,
  revealedExerciseSteps,
  isTimedQuizMode,
  remainingSeconds,
  onStartTimedChallenge,
  onExitTimedChallenge,
  onSelectQuizOption,
  onToggleRevealAllSteps,
  onRevealNextStep,
  onAskTutorAboutQuiz,
  onResetQuiz,
  onNextChapter,
}) => {
  const [muted, setMuted] = useState<boolean>(() => isAudioMuted());
  const totalQuestions = activeModule.checkpoints.length;
  let answeredCount = 0;
  let correctCount = 0;

  activeModule.checkpoints.forEach((cp, qIdx) => {
    const answerKey = `${activeModule.id}-${qIdx}`;
    const chosen = selectedAnswers[answerKey];
    if (typeof chosen === 'number') {
      answeredCount++;
      if (chosen === cp.correctIndex) {
        correctCount++;
      }
    }
  });

  const isAllAnswered = answeredCount === totalQuestions && totalQuestions > 0;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Step-by-Step Guided Problem Solver Section */}
      {activeModule.guidedExercises && activeModule.guidedExercises.length > 0 && (
        <section
          aria-label="Latihan Hitungan Bertahap"
          className={`${theme.softBg} p-5 rounded-2xl border ${theme.softBorder} space-y-4`}
        >
          {activeModule.guidedExercises.map((ex) => {
            const revealedCount = revealedExerciseSteps[ex.id] ?? 1;
            const allRevealed = revealedCount >= ex.steps.length;

            return (
              <div key={ex.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold ${theme.accentText}`}
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>Latihan Hitungan Terpandu Langkah demi Langkah</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{ex.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onToggleRevealAllSteps(ex.id, ex.steps.length, allRevealed)
                    }
                    className="min-h-[42px] px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-2xs active:scale-95"
                  >
                    {allRevealed
                      ? 'Sembunyikan Langkah'
                      : `Buka Semua Langkah (${ex.steps.length} Tahap · +40 XP)`}
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {ex.scenarioContext}
                </p>

                <div className="bg-white p-4 rounded-xl border border-slate-200/90 space-y-1.5 shadow-2xs">
                  <div className="text-xs font-bold text-slate-900">
                    Parameter Diketahui di Lapangan:
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-700">
                    {ex.givenData.map((d, dIdx) => (
                      <li key={dIdx}>• {d}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2.5">
                  {ex.steps.slice(0, revealedCount).map((st, sIdx) => (
                    <motion.div
                      key={sIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-4 rounded-xl border border-slate-200/90 space-y-1.5 shadow-2xs"
                    >
                      <div className="text-xs font-bold text-slate-900">{st.stepTitle}</div>
                      <div
                        className={`text-xs font-mono ${theme.accentText} ${theme.softBg} px-2.5 py-1 rounded-md inline-block font-semibold`}
                      >
                        Rumus: {st.formulaOrHint}
                      </div>
                      <p className="text-xs font-mono font-bold text-emerald-700 pt-0.5">
                        → {st.calculationResult}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {!allRevealed ? (
                  <button
                    type="button"
                    onClick={() => onRevealNextStep(ex.id, ex.steps.length)}
                    className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs ${theme.primaryBtn}`}
                  >
                    Buka Langkah Berikutnya ({revealedCount + 1}/{ex.steps.length}) →
                  </button>
                ) : (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 p-4 rounded-xl text-xs sm:text-sm text-emerald-950 leading-relaxed">
                    <strong>Kesimpulan Rekayasa Lapangan: </strong>
                    {ex.finalConclusion}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Timed Quiz Checkpoints Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🎯</span>
            <span>Kuis Pemahaman Konsep ({totalQuestions} Soal)</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
            Pilih jawaban yang paling tepat. Dapatkan umpan balik langsung dan kumpulkan bintang XP!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Mute Audio Toggle Button */}
          <button
            type="button"
            onClick={() => setMuted(toggleAudioMuted())}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title={muted ? 'Aktifkan efek suara' : 'Bisukan efek suara'}
          >
            {muted ? (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Suara: Senyap</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>Suara: Aktif</span>
              </>
            )}
          </button>

          {!isTimedQuizMode ? (
            <button
              type="button"
              onClick={onStartTimedChallenge}
              className="min-h-[40px] px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              <Timer className="w-4 h-4" />
              <span>Mulai Tantangan 30 Detik</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3.5 py-2 rounded-xl tabular-nums flex items-center gap-1.5 min-h-[40px]">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Sisa Waktu: {remainingSeconds} dtk</span>
              </span>
              <button
                type="button"
                onClick={onExitTimedChallenge}
                className="min-h-[40px] px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              >
                Mode Santai
              </button>
            </div>
          )}
        </div>
      </div>

      {isTimedQuizMode && (
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-300 ${
              remainingSeconds > 10
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-rose-500 to-red-600'
            }`}
            style={{ width: `${Math.round((remainingSeconds / 30) * 100)}%` }}
          />
        </div>
      )}

      {/* Questions list with Large A/B/C/D Touch Options and Supportive Micro-interactions */}
      <div className="space-y-5">
        {activeModule.checkpoints.map((cp, qIdx) => {
          const answerKey = `${activeModule.id}-${qIdx}`;
          const chosen = selectedAnswers[answerKey];
          const isAnswered = typeof chosen === 'number';
          const isCorrect = chosen === cp.correctIndex;

          return (
            <div
              key={qIdx}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className={`font-bold px-3 py-1 rounded-full ${theme.softBg} ${theme.accentText}`}>
                  SOAL 0{qIdx + 1}
                </span>
                {cp.difficulty && (
                  <span className="text-slate-500 font-semibold">Tingkat: {cp.difficulty}</span>
                )}
              </div>

              <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {cp.question}
              </p>

              {/* Large Options with A, B, C, D (min-h-[56px] for touch accessibility) */}
              <div className="space-y-3">
                {cp.options.map((opt, oIdx) => {
                  const isThisChosen = chosen === oIdx;
                  const letter = OPTION_LETTERS[oIdx] || `${oIdx + 1}`;

                  let optionStyle =
                    'bg-slate-50/80 border-slate-200 text-slate-800 hover:bg-sky-50/50 hover:border-sky-300';
                  let letterStyle = 'bg-white border-slate-300 text-slate-700';

                  if (isThisChosen) {
                    if (isCorrect) {
                      optionStyle =
                        'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold ring-2 ring-emerald-300/60 shadow-xs';
                      letterStyle = 'bg-emerald-600 text-white border-transparent';
                    } else {
                      optionStyle =
                        'bg-amber-50 border-amber-400 text-amber-950 font-semibold ring-2 ring-amber-300/50';
                      letterStyle = 'bg-amber-500 text-white border-transparent';
                    }
                  }

                  return (
                    <motion.button
                      key={oIdx}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectQuizOption(qIdx, oIdx, cp.correctIndex);
                        if (oIdx === cp.correctIndex) {
                          playSuccessSound();
                        } else {
                          playRetrySound();
                        }
                      }}
                      className={`w-full text-left p-3.5 sm:p-4 min-h-[56px] rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center font-bold text-sm sm:text-base shrink-0 shadow-2xs ${letterStyle}`}
                        >
                          {letter}
                        </span>
                        <span className="text-xs sm:text-sm font-medium leading-snug break-words text-slate-800">
                          {opt}
                        </span>
                      </div>

                      {isThisChosen && (
                        <AnimatePresence>
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="font-bold text-xs shrink-0 px-2.5 py-1 rounded-lg"
                          >
                            {isCorrect ? (
                              <span className="text-emerald-700 flex items-center gap-1 font-bold">
                                <span>✓</span>
                                <span className="hidden sm:inline">Tepat Sekali!</span>
                              </span>
                            ) : (
                              <span className="text-amber-800 flex items-center gap-1 font-bold">
                                <span>💡</span>
                                <span className="hidden sm:inline">Coba Lagi</span>
                              </span>
                            )}
                          </motion.span>
                        </AnimatePresence>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Instant Supportive Feedback */}
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`pt-3.5 border-t rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed space-y-1.5 ${
                    isCorrect
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {isCorrect ? (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-800">
                          Hebat sekali! Jawabanmu tepat dan menambah XP petualanganmu.
                        </span>
                      </>
                    ) : (
                      <>
                        <Smile className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-900">
                          Jangan berkecil hati! Mari kita pelajari kembali penjelasan di bawah ini:
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-slate-700 pl-5">
                    <strong>Penjelasan:</strong> {cp.explanation}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Encouragement & Score Summary Card with Visual Stars & Friendly Actions (FASE 3) */}
      {answeredCount > 0 && (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/30 border border-sky-200/90 rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h4 className="text-base sm:text-lg font-bold text-slate-900">
                  {isAllAnswered
                    ? 'Selamat! Kamu Telah Menuntaskan Semua Soal'
                    : `Progres Kuis: ${answeredCount} dari ${totalQuestions} Soal Terjawab`}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                {scorePercent >= 70
                  ? 'Pemahaman konsepmu sangat baik! Terus tingkatkan eksperimen di laboratorium virtual.'
                  : 'Bagus sudah mencoba! Kamu bisa membaca ulang materi bab untuk memperkuat konsep.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white border border-sky-200 px-4 py-2.5 rounded-2xl text-center shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500">Skor Kuis</div>
                <div className="text-xl sm:text-2xl font-bold text-sky-700">{scorePercent}%</div>
              </div>
              <div className="bg-white border border-emerald-200 px-4 py-2.5 rounded-2xl text-center shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500">Benar</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-700">
                  {correctCount}/{answeredCount}
                </div>
              </div>
            </div>
          </div>

          {/* Star Rating & Visual Recap Banner */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/90 via-white to-sky-50/90 rounded-2xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {/* Visual Stars Rating (1-3 stars) */}
                <div className="flex items-center gap-1 text-2xl sm:text-3xl" aria-label={`Rating ${scorePercent === 100 ? 3 : scorePercent >= 70 ? 2 : 1} Bintang`}>
                  {[1, 2, 3].map((starIdx) => {
                    const starsEarned = scorePercent === 100 ? 3 : scorePercent >= 70 ? 2 : 1;
                    const isEarned = starIdx <= starsEarned;
                    return (
                      <span
                        key={starIdx}
                        className={isEarned ? 'text-amber-400 drop-shadow-xs' : 'text-slate-300'}
                      >
                        ★
                      </span>
                    );
                  })}
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 ml-1">
                  {scorePercent === 100
                    ? '3 Bintang: Sempurna! Pemahaman Luar Biasa'
                    : scorePercent >= 70
                    ? '2 Bintang: Hebat Sekali! Tinggal Sedikit Lagi'
                    : '1 Bintang: Terus Semangat! Ayo Coba Lagi'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {scorePercent === 100
                  ? 'Selamat! Semua pertanyaan berhasil kamu jawab dengan benar tanpa cela.'
                  : scorePercent >= 70
                  ? 'Hasil yang sangat bagus! Kamu bisa mencoba lagi sekali untuk menyempurnakan 3 bintang penuh.'
                  : 'Tetap semangat! Pelajari kembali rumus dan penjelasan di atas untuk mendapatkan bintang maksimal.'}
              </p>
            </div>

            {/* Friendly Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {scorePercent < 100 && onResetQuiz && (
                <button
                  type="button"
                  onClick={onResetQuiz}
                  className="min-h-[42px] px-4 py-2 text-xs font-bold text-amber-950 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Coba Lagi untuk Dapat 3 Bintang</span>
                </button>
              )}
              {onNextChapter && (
                <button
                  type="button"
                  onClick={onNextChapter}
                  className="min-h-[42px] px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                >
                  <span>Lanjut ke Bab Berikutnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Supportive Chapter Review Recommendation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="text-slate-700">
                <strong>Rekomendasi Belajar:</strong>{' '}
                {scorePercent === 100
                  ? 'Konsep sudah mantap! Lanjutkan eksplorasi di Lab Eksperimen.'
                  : `Buka kembali Bab 01 "${activeModule.sections[0]?.heading.replace(/^\d+\.\s*/, '') || 'Materi Inti'}" untuk mengulang rumus penting.`}
              </span>
            </div>

            {isTimedQuizMode && (
              <button
                type="button"
                onClick={onStartTimedChallenge}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Coba Ulang Tantangan Cepat</span>
              </button>
            )}
          </div>
        </motion.section>
      )}

      {/* AI Tutor Gateway Callout Banner */}
      <div className="blueprint-stage text-white rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
        <div className={`h-2 w-full ${theme.ribbonGradient}`} />
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Sahabat Belajar AI (Tersimpan di Kelas · 0 Kuota)</span>
            </div>
            <h4 className="text-sm sm:text-base font-bold">
              Ada soal kuis yang masih membingungkan?
            </h4>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Tanyakan langsung ke Sahabat Belajar AI untuk mendapatkan penjelasan ramah anak dengan contoh sehari-hari tanpa internet.
            </p>
          </div>

          <button
            type="button"
            onClick={onAskTutorAboutQuiz}
            className={`min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 shadow-xs ${theme.primaryBtn}`}
          >
            <span>Tanya Sahabat Belajar AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
