import React from 'react';
import { Lightbulb, Timer, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import type { LearningModule } from '../../utils/edgeEngine';
import type { SubjectVisualTheme } from '../../utils/subjectTheme';

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
}

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
}) => {
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
                      className={`flex items-center gap-1.5 text-xs font-mono ${theme.accentText} font-bold`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>Latihan Hitungan Terpandu Langkah demi Langkah</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{ex.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onToggleRevealAllSteps(ex.id, ex.steps.length, allRevealed)
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    {allRevealed
                      ? 'Sembunyikan Langkah'
                      : `Buka Semua Langkah (${ex.steps.length} Tahap · +40 XP)`}
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {ex.scenarioContext}
                </p>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-1.5 shadow-2xs">
                  <div className="text-xs font-bold text-slate-900">
                    Parameter Diketahui di Lapangan:
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono text-slate-700">
                    {ex.givenData.map((d, dIdx) => (
                      <li key={dIdx}>• {d}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2.5">
                  {ex.steps.slice(0, revealedCount).map((st, sIdx) => (
                    <div
                      key={sIdx}
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
                    </div>
                  ))}
                </div>

                {!allRevealed ? (
                  <button
                    type="button"
                    onClick={() => onRevealNextStep(ex.id, ex.steps.length)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${theme.primaryBtn}`}
                  >
                    Buka Langkah Berikutnya ({revealedCount + 1}/{ex.steps.length}) →
                  </button>
                ) : (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 p-3.5 rounded-xl text-xs text-emerald-950 leading-relaxed">
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
          <h3 className="text-base font-bold text-slate-900">
            Uji Pemahaman Konsep &amp; Mode Tantangan Cepat ({activeModule.checkpoints.length}{' '}
            Soal)
          </h3>
          <p className="text-xs text-slate-600">
            Jawab pertanyaan evaluasi untuk mengumpulkan XP dan membuka lencana Juara Tantangan
            Konsep.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isTimedQuizMode ? (
            <button
              type="button"
              onClick={onStartTimedChallenge}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Mulai Tantangan Cepat (30 Detik)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl tabular-nums flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Sisa Waktu: {remainingSeconds} dtk</span>
              </span>
              <button
                type="button"
                onClick={onExitTimedChallenge}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Mode Santai
              </button>
            </div>
          )}
        </div>
      </div>

      {isTimedQuizMode && (
        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
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

      <div className="space-y-4">
        {activeModule.checkpoints.map((cp, qIdx) => {
          const answerKey = `${activeModule.id}-${qIdx}`;
          const chosen = selectedAnswers[answerKey];
          const isAnswered = typeof chosen === 'number';
          const isCorrect = chosen === cp.correctIndex;

          return (
            <div
              key={qIdx}
              className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                <span className={`font-bold ${theme.accentText}`}>
                  PERTANYAAN 0{qIdx + 1}
                </span>
                {cp.difficulty && <span>Tingkat: {cp.difficulty}</span>}
              </div>
              <p className="text-sm font-bold text-slate-900">{cp.question}</p>
              <div className="space-y-2">
                {cp.options.map((opt, oIdx) => {
                  const isThisChosen = chosen === oIdx;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => onSelectQuizOption(qIdx, oIdx, cp.correctIndex)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isThisChosen
                          ? isCorrect
                            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-500 text-emerald-950 font-semibold shadow-2xs'
                            : 'bg-amber-50 border-amber-500 text-amber-950 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <span>{opt}</span>
                      {isThisChosen && (
                        <span className="font-mono text-[11px] font-bold shrink-0">
                          {isCorrect ? '✓ TEPAT (+XP)' : '× KURANG TEPAT'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {isAnswered && (
                <div className="pt-2.5 border-t border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Pembahasan:</strong> {cp.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact AI Tutor Gateway Callout Banner */}
      <div className="blueprint-stage text-white rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
        <div className={`h-1.5 w-full ${theme.ribbonGradient}`} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Single-Gateway Cloud AI + Local Cache (0 Kuota Siswa)</span>
            </div>
            <h4 className="text-sm font-bold">
              Ingin mendiskusikan soal latihan modul {activeModule.code} lebih lanjut?
            </h4>
            <p className="text-xs text-slate-300">
              Tanyakan langsung ke server lokal laptop guru untuk mendapatkan penjelasan instan 0
              milidetik.
            </p>
          </div>

          <button
            type="button"
            onClick={onAskTutorAboutQuiz}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${theme.primaryBtn}`}
          >
            <span>Buka Tutor AI Satu Pintu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
