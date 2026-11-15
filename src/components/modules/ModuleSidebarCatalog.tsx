import React from 'react';
import { Search, Download } from 'lucide-react';
import {
  getModuleEducationTier,
  type EducationTier,
  type LearningModule,
  type PeerNode,
} from '../../utils/edgeEngine';
import { getSubjectTheme } from '../../utils/subjectTheme';

export interface ModuleSidebarCatalogProps {
  catalogPanelRef: React.RefObject<HTMLDivElement | null>;
  modules: LearningModule[];
  deepSearchMatches: Array<{
    module: LearningModule;
    matchedBadges: Array<{ category: string; snippet: string }>;
  }>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tierFilter: EducationTier | 'ALL';
  setTierFilter: (tier: EducationTier | 'ALL') => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
  activeModule: LearningModule | null;
  localStudentPeer?: PeerNode;
  failedModuleImgs: Record<string, boolean>;
  setFailedModuleImgs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  completedChapters: Record<string, boolean>;
  handleSelectModuleWithScroll: (moduleId: string) => void;
  isSyncing: boolean;
  onSyncChunks: (moduleId: string, chunksCount: number) => Promise<void>;
}

export const ModuleSidebarCatalog: React.FC<ModuleSidebarCatalogProps> = ({
  catalogPanelRef,
  modules,
  deepSearchMatches,
  searchQuery,
  setSearchQuery,
  tierFilter,
  setTierFilter,
  subjectFilter,
  setSubjectFilter,
  activeModule,
  localStudentPeer,
  failedModuleImgs,
  setFailedModuleImgs,
  completedChapters,
  handleSelectModuleWithScroll,
  isSyncing,
  onSyncChunks,
}) => {
  return (
    <div ref={catalogPanelRef} className="lg:col-span-4 bento-card p-5 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🗺️</span>
            <span>01. Daftar Buku Pelajaran</span>
          </h2>
          <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            {deepSearchMatches.length}/{modules.length} Buku
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Pilih jenjang kelas atau mata pelajaran di bawah, lalu ketuk buku untuk langsung membacanya tanpa kuota.
        </p>
      </div>

      {/* Deep Search Input */}
      <div className="space-y-2">
        <div className="relative">
          <label htmlFor="search-module-input" className="sr-only">
            Cari Buku, Rumus, atau Pelajaran
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-module-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari buku, rumus, atau daerah (mis. LiFePO4, Alor)..."
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1D4ED8] transition-all min-h-[42px]"
          />
        </div>

        {/* Quick Concept Search Prompts */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-semibold">Topik:</span>
          {(['LiFePO4', 'ELC', 'Karbon Biru', 'Mamar', 'Biochar', 'Crux'] as const).map(
            (kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => setSearchQuery(searchQuery === kw ? '' : kw)}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  searchQuery.toLowerCase() === kw.toLowerCase()
                    ? 'bg-[#1D4ED8] text-[#FFFFFF] shadow-2xs'
                    : 'bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]'
                }`}
              >
                {kw}
              </button>
            )
          )}
        </div>
      </div>

      {/* Jenjang Kelas Filter (SD 1-6, SMP 7-9, SMA/SMK 10-12) */}
      <div
        role="group"
        aria-label="Filter Jenjang Kelas"
        className="flex flex-wrap items-center gap-1.5"
      >
        {(
          [
            { id: 'ALL', label: 'Semua Jenjang' },
            { id: 'SD', label: 'SD (Kelas 1–6)' },
            { id: 'SMP', label: 'SMP (Kelas 7–9)' },
            { id: 'SMA', label: 'SMA/SMK (10–12)' },
          ] as const
        ).map((tier) => {
          const isActiveTier = tierFilter === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => setTierFilter(tier.id)}
              className={`min-h-[36px] px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                isActiveTier
                  ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              {tier.label}
            </button>
          );
        })}
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
              className={`min-h-[40px] px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95 shadow-2xs ${
                isActiveSubj
                  ? subjTheme
                    ? subjTheme.activeTabGradient
                    : 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {subj === 'ALL' ? 'Semua Buku' : subj}
            </button>
          );
        })}
      </div>

      {/* Subject-Gradient Module Cards List */}
      {deepSearchMatches.length === 0 ? (
        <div className="surface-warm-recessed p-6 text-center space-y-2.5">
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            Belum ada buku yang cocok dengan &ldquo;
            {searchQuery || subjectFilter}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubjectFilter('ALL');
              setTierFilter('ALL');
              setSearchQuery('');
            }}
            className="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            Tampilkan Semua Buku
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
            const estimatedMinutes = Math.max(4, mod.sections.length * 2);

            return (
              <article
                key={mod.id}
                onClick={() => handleSelectModuleWithScroll(mod.id)}
                className={`rounded-2xl overflow-hidden border transition-all cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? `${modTheme.selectedCardSurface} border-blue-500 ring-2 ring-blue-500/20 shadow-sm`
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Subject Identity Gradient Ribbon */}
                <div className={`h-2 w-full ${modTheme.ribbonGradient}`} />

                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-slate-900 relative shrink-0 overflow-hidden border border-slate-200/70 group shadow-2xs">
                      {!imgFailed ? (
                        <img
                          src={mod.imageUrl}
                          alt={`Sampul buku modul ${mod.title}`}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedModuleImgs((prev) => ({ ...prev, [mod.id]: true }))
                          }
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center ${modTheme.stepNumberClass} text-xs font-mono font-bold p-2 text-center`}
                        >
                          {mod.code}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                        <span className={`truncate ${modTheme.accentText}`}>
                          {mod.subject}
                        </span>
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 shrink-0 flex items-center gap-0.5">
                          <span>⏱️</span>
                          <span>{estimatedMinutes} menit</span>
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {mod.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                        <span
                          className={`px-1.5 py-0.5 rounded-md border ${
                            getModuleEducationTier(mod) === 'SD'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : getModuleEducationTier(mod) === 'SMP'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mod.gradeLevel}
                        </span>
                      </div>

                      {/* Chapter Progress & Read Bar */}
                      <div className="pt-0.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                          <span>
                            📖 {modChaptersDone}/{mod.sections.length} Bab Selesai
                          </span>
                          <span className={`font-bold ${modTheme.accentText}`}>{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
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
                          className={`text-[11px] ${modTheme.softBg} ${modTheme.accentText} px-2.5 py-1 rounded-lg flex items-center justify-between gap-2`}
                        >
                          <span className="font-bold shrink-0">{b.category}:</span>
                          <span className="truncate text-slate-700">{b.snippet}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status bar: Ready vs Download Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 truncate text-[11px]">
                      📍 {mod.schoolOrigin}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pct >= 100 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100/90 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                          <span>✓</span>
                          <span>Buku Siap Dibaca</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectModuleWithScroll(mod.id);
                            onSyncChunks(mod.id, 4);
                          }}
                          className="min-h-[40px] px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-2xs active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Offline</span>
                        </button>
                      )}
                      <span
                        className={`font-bold text-xs ${
                          isSelected ? modTheme.accentText : 'text-slate-500'
                        }`}
                      >
                        {isSelected ? 'Sedang Dibuka' : 'Buka →'}
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
  );
};
