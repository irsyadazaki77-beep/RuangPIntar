import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import {
  evaluateInlineSectionCalculator,
  type SectionInlineCalculator,
} from '../../utils/edgeEngine';
import type { SubjectVisualTheme } from '../../utils/subjectTheme';

export interface InlineChapterCalculatorProps {
  calculator: SectionInlineCalculator;
  theme: SubjectVisualTheme;
}

export const InlineChapterCalculator: React.FC<InlineChapterCalculatorProps> = ({
  calculator,
  theme,
}) => {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const v of calculator.variables) {
      init[v.key] = v.defaultValue;
    }
    return init;
  });

  useEffect(() => {
    const reset: Record<string, number> = {};
    for (const v of calculator.variables) {
      reset[v.key] = v.defaultValue;
    }
    setValues(reset);
  }, [calculator]);

  const outcome = evaluateInlineSectionCalculator(calculator.id, values);

  return (
    <div className="formula-calculator-deck overflow-hidden text-slate-100">
      <div className={`h-1.5 w-full ${theme.ribbonGradient}`} />
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg ${theme.stepNumberClass} flex items-center justify-center shadow-xs`}
            >
              <Calculator className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 block">
                Kalkulator Rumus Interaktif Langsung
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-white">{calculator.title}</h4>
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-700/90 px-3.5 py-2 rounded-xl font-mono tabular-nums flex items-center gap-2 shadow-inner">
            <span className="text-xs text-slate-400">{calculator.resultLabel}:</span>
            <strong className={`text-sm sm:text-base font-bold ${theme.darkAccentText}`}>
              {outcome.formattedValue}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {calculator.variables.map((v) => {
            const currentVal = values[v.key] ?? v.defaultValue;
            const pct = Math.min(
              100,
              Math.max(
                0,
                Math.round(((currentVal - v.min) / Math.max(1e-6, v.max - v.min)) * 100)
              )
            );
            return (
              <div
                key={v.key}
                className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                  <label htmlFor={`calc-${calculator.id}-${v.key}`}>{v.label}</label>
                  <span className={`font-mono font-bold tabular-nums ${theme.darkAccentText}`}>
                    {currentVal} {v.unit}
                  </span>
                </div>
                <input
                  id={`calc-${calculator.id}-${v.key}`}
                  type="range"
                  min={v.min}
                  max={v.max}
                  step={v.step}
                  value={currentVal}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [v.key]: Number(e.target.value),
                    }))
                  }
                  className={`w-full cursor-pointer ${theme.sliderAccent}`}
                />
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full ${theme.progressGradient}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                  <span>
                    Min: {v.min} {v.unit}
                  </span>
                  <span>
                    Maks: {v.max} {v.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
          <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${theme.darkAccentText}`} />
          <p>
            <strong className="text-white">Makna Fisis &amp; Lapangan: </strong>
            {outcome.interpretation}
          </p>
        </div>
      </div>
    </div>
  );
};
