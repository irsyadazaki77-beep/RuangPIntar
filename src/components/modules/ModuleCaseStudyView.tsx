import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ModuleCaseStudy } from '../../utils/edgeEngine';
import type { SubjectVisualTheme } from '../../utils/subjectTheme';

export interface ModuleCaseStudyViewProps {
  caseStudy: ModuleCaseStudy;
  theme: SubjectVisualTheme;
}

export const ModuleCaseStudyView: React.FC<ModuleCaseStudyViewProps> = ({
  caseStudy,
  theme,
}) => {
  return (
    <section
      id="section-case-study"
      aria-label="Studi Kasus Penerapan Nyata di Wilayah 3T"
      className="blueprint-stage text-slate-100 rounded-2xl overflow-hidden border border-slate-800 scroll-mt-24 shadow-md"
    >
      <div className={`h-1.5 w-full ${theme.ribbonGradient}`} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <span className={`text-xs font-mono font-semibold ${theme.darkAccentText}`}>
              Studi Kasus Lapangan Nusantara 3T · {caseStudy.location}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {caseStudy.title}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm leading-relaxed">
          <div className="bg-amber-950/35 border border-amber-500/30 rounded-xl p-4 space-y-1.5">
            <h4 className="font-mono text-xs font-bold text-amber-300">
              01. Tantangan Komunitas &amp; Geografis
            </h4>
            <p className="text-slate-200 text-xs leading-relaxed">
              {caseStudy.challenge}
            </p>
          </div>

          <div className="bg-cyan-950/35 border border-cyan-500/30 rounded-xl p-4 space-y-1.5">
            <h4 className="font-mono text-xs font-bold text-cyan-300">
              02. Solusi Rekayasa &amp; Kolaborasi Sekolah
            </h4>
            <p className="text-slate-200 text-xs leading-relaxed">
              {caseStudy.solution}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {caseStudy.impactMetrics.map((metric, mIdx) => (
            <div
              key={mIdx}
              className="bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl font-mono text-xs text-emerald-200 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{metric}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
