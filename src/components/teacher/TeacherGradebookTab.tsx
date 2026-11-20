import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Search,
  Trash2,
  Award,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import {
  calculateGradebookSummary,
  computeWeightedFinalScore,
  type LearningModule,
  type StudentSubmission,
} from '../../utils/edgeEngine';

export interface TeacherGradebookTabProps {
  modules: LearningModule[];
  submissions: StudentSubmission[];
  onDeleteSubmission?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const TeacherGradebookTab: React.FC<TeacherGradebookTabProps> = ({
  modules,
  submissions,
  onDeleteSubmission,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PASSED' | 'AT_RISK'>('ALL');
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const summary = useMemo(() => calculateGradebookSummary(submissions), [submissions]);

  // Per-module analytics distribution for visual chart
  const moduleAnalytics = useMemo(() => {
    return modules.map((mod) => {
      const modSubs = submissions.filter((s) => s.moduleId === mod.id);
      if (modSubs.length === 0) {
        return {
          moduleId: mod.id,
          code: mod.code,
          title: mod.title,
          count: 0,
          avgScore: 0,
          passRate: 0,
        };
      }
      const scores = modSubs.map((s) =>
        computeWeightedFinalScore(s.quizScore, s.simulationCompleted)
      );
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const passedCount = scores.filter((sc) => sc >= 70).length;
      const passRate = Math.round((passedCount / scores.length) * 100);
      return {
        moduleId: mod.id,
        code: mod.code,
        title: mod.title,
        count: modSubs.length,
        avgScore,
        passRate,
      };
    });
  }, [modules, submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const finalScore = computeWeightedFinalScore(sub.quizScore, sub.simulationCompleted);
      if (filter === 'PASSED' && finalScore < 70) return false;
      if (filter === 'AT_RISK' && finalScore >= 70) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          sub.studentName.toLowerCase().includes(q) ||
          sub.moduleTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [submissions, filter, search]);

  const uniqueStudentsCount = useMemo(
    () => new Set(submissions.map((s) => s.peerId || s.studentName)).size,
    [submissions]
  );

  const passedTotalCount = useMemo(
    () => Math.max(0, summary.totalSubmissions - summary.atRiskCount),
    [summary.totalSubmissions, summary.atRiskCount]
  );

  const handleExportCsv = () => {
    const header = [
      'Nama Siswa',
      'Modul',
      'Skor Kuis (%)',
      'Simulasi Selesai',
      'Nilai Akhir Berbobot',
      'Status KKM (70)',
      'Waktu Sinkron',
    ];
    const rows = filteredSubmissions.map((sub) => {
      const finalScore = computeWeightedFinalScore(sub.quizScore, sub.simulationCompleted);
      return [
        `"${sub.studentName.replace(/"/g, '""')}"`,
        `"${sub.moduleTitle.replace(/"/g, '""')}"`,
        sub.quizScore,
        sub.simulationCompleted ? 'Ya' : 'Belum',
        finalScore,
        finalScore >= 70 ? 'Tuntas' : 'Perlu Bimbingan',
        `"${sub.timestamp}"`,
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buku-nilai-ruangpintar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Sandbox-safe print transcript using hidden iframe (avoids window.open popup block)
  const handlePrintTranscript = () => {
    const rowsHtml = filteredSubmissions
      .map((sub, idx) => {
        const finalScore = computeWeightedFinalScore(sub.quizScore, sub.simulationCompleted);
        return `<tr>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;">${idx + 1}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;">${escapeHtml(sub.studentName)}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;">${escapeHtml(sub.moduleTitle)}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">${sub.quizScore}%</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;">${sub.simulationCompleted ? 'Selesai' : 'Belum'}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;">${finalScore}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;">${finalScore >= 70 ? 'Tuntas' : 'Bimbingan'}</td>
        </tr>`;
      })
      .join('');

    const htmlDoc = `<!doctype html>
      <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Transkrip Buku Nilai — RuangPintar Edge</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p { font-size: 12px; color: #475569; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Transkrip Capaian Belajar Kelas — RuangPintar Edge</h1>
        <p>Dicetak pada ${escapeHtml(new Date().toLocaleString('id-ID'))} · Rata-rata Kelas: ${summary.weightedAverageScore} · Ketuntasan KKM 70: ${summary.passRatePercent}%</p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>
              <th>Modul Pembelajaran</th>
              <th>Skor Kuis</th>
              <th>Lab Virtual</th>
              <th>Nilai Akhir</th>
              <th>Status KKM</th>
            </tr>
          </thead>
          <tbody>${rowsHtml || '<tr><td colspan="7" style="padding:12px;text-align:center;">Belum ada data nilai.</td></tr>'}</tbody>
        </table>
      </body>
      </html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlDoc);
      frameDoc.close();
      window.setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1200);
      }, 200);
    } else {
      document.body.removeChild(iframe);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
            <GraduationCap className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Total Catatan Nilai</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {summary.totalSubmissions}
          </div>
          <div className="text-[11px] font-mono text-[#64748B]">
            {uniqueStudentsCount} Siswa Aktif
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
            <Award className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Rata-Rata Nilai Akhir</span>
          </div>
          <div className="text-2xl font-bold text-[#1D4ED8] tabular-nums">
            {summary.weightedAverageScore}
          </div>
          <div className="text-[11px] font-mono text-[#64748B]">Bobot Kuis 70% + Lab 30%</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>Ketuntasan KKM (70)</span>
          </div>
          <div className="text-2xl font-bold text-[#059669] tabular-nums">
            {summary.passRatePercent}%
          </div>
          <div className="text-[11px] font-mono text-[#059669]">
            {passedTotalCount} Catatan Tuntas
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Perlu Pendampingan</span>
          </div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums">
            {summary.atRiskCount}
          </div>
          <div className="text-[11px] font-mono text-slate-500">Nilai akhir &lt; 70</div>
        </div>
      </div>

      {/* Visual Score Distribution Bar Chart per Module */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1D4ED8]" />
            <h2 className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
              Analitik Distribusi Nilai per Modul
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">KKM Sekolah: 70</span>
        </div>

        <div className="space-y-3">
          {moduleAnalytics.map((item) => (
            <div key={item.moduleId} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-slate-800 truncate">
                  <span className="font-mono text-[#1D4ED8] mr-1.5">{item.code}</span>
                  <span>{item.title}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-600 tabular-nums shrink-0">
                  {item.count > 0 ? (
                    <>
                      Rata-rata:{' '}
                      <strong
                        className={item.avgScore >= 70 ? 'text-emerald-700' : 'text-amber-700'}
                      >
                        {item.avgScore}
                      </strong>{' '}
                      · Tuntas {item.passRate}% ({item.count} siswa)
                    </>
                  ) : (
                    <span className="text-slate-400">Belum ada pengumpulan</span>
                  )}
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                <div
                  style={{ width: `${item.avgScore}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.count === 0
                      ? 'bg-slate-200'
                      : item.avgScore >= 85
                        ? 'bg-emerald-600'
                        : item.avgScore >= 70
                          ? 'bg-[#1D4ED8]'
                          : 'bg-amber-500'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gradebook Filter Toolbar & Table */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa atau modul..."
                className="w-full min-h-[38px] pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {(['ALL', 'PASSED', 'AT_RISK'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    filter === mode
                      ? 'bg-white text-[#1D4ED8] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'ALL'
                    ? 'Semua'
                    : mode === 'PASSED'
                      ? 'Tuntas (≥70)'
                      : 'Bimbingan (<70)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrintTranscript}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Transkrip</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500">
                <th className="py-2.5 pr-3">Siswa</th>
                <th className="py-2.5 px-3">Modul</th>
                <th className="py-2.5 px-3 text-right">Kuis</th>
                <th className="py-2.5 px-3 text-center">Lab Virtual</th>
                <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pl-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada data nilai yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const finalScore = computeWeightedFinalScore(
                    sub.quizScore,
                    sub.simulationCompleted
                  );
                  const isPassed = finalScore >= 70;
                  const isConfirming = confirmDeleteId === sub.id;

                  return (
                    <tr key={sub.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                        {sub.avatar || '🎓'} {sub.studentName}
                        <div className="text-[10px] font-mono font-normal text-slate-500">
                          {sub.timestamp}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                        {sub.moduleTitle}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {sub.quizScore}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        <span
                          className={
                            sub.simulationCompleted
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-400'
                          }
                        >
                          {sub.simulationCompleted ? 'Selesai' : 'Belum'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {finalScore}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[11px]">
                        <span className={isPassed ? 'text-emerald-700' : 'text-amber-700'}>
                          {isPassed ? 'Tuntas' : 'Perlu Bimbingan'}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {onDeleteSubmission && (
                          isConfirming ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteSubmission(sub.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Hapus?
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sub.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              title="Hapus catatan nilai"
                              aria-label="Hapus catatan nilai"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
