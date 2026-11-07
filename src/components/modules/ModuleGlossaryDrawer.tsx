import React, { useState } from 'react';
import type { ModuleGlossaryItem } from '../../utils/edgeEngine';
import type { SubjectVisualTheme } from '../../utils/subjectTheme';

export interface ModuleGlossaryDrawerProps {
  glossary: ModuleGlossaryItem[];
  theme: SubjectVisualTheme;
}

export const ModuleGlossaryDrawer: React.FC<ModuleGlossaryDrawerProps> = ({
  glossary,
  theme,
}) => {
  const [glossaryFilter, setGlossaryFilter] = useState<string>('');

  const filteredItems = glossary.filter(
    (g) =>
      !glossaryFilter.trim() ||
      g.term.toLowerCase().includes(glossaryFilter.toLowerCase()) ||
      g.definition.toLowerCase().includes(glossaryFilter.toLowerCase())
  );

  return (
    <section
      id="section-glossary"
      aria-label="Glosarium Istilah Teknis"
      className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4 scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Kamus &amp; Glosarium Teknis Modul ({glossary.length} Istilah)
          </h3>
          <p className="text-xs text-slate-600">
            Daftar definisi istilah fisis, ekologis, dan satuan ukuran pada modul ini.
          </p>
        </div>

        <input
          type="search"
          aria-label="Saring istilah glosarium"
          value={glossaryFilter}
          onChange={(e) => setGlossaryFilter(e.target.value)}
          placeholder="Saring istilah glosarium..."
          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((g, gIdx) => (
          <div
            key={gIdx}
            className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-1 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">{g.term}</h4>
              <span
                className={`font-mono text-[11px] font-bold ${theme.accentText} ${theme.softBg} px-2 py-0.5 rounded-md`}
              >
                {g.symbolOrUnit}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{g.definition}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
