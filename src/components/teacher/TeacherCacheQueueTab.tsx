import React, { useState } from 'react';
import {
  Sparkles,
  Trash2,
  Database,
  PlusCircle,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Search,
  Clock,
  X,
} from 'lucide-react';
import type {
  LearningModule,
  CacheEntry,
  PendingAiQuestion,
} from '../../utils/edgeEngine';
import type { AiQueueProcessItemResult } from '../../hooks/useTeacherHost';

export interface TeacherCacheQueueTabProps {
  modules: LearningModule[];
  cacheEntries: CacheEntry[];
  pendingAiQuestions: PendingAiQuestion[];
  gatewayTetheringOnline: boolean;
  onSeedCacheEntry: (payload: {
    moduleId: string;
    questionCanonical: string;
    answerMarkdown: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateCacheEntry?: (
    id: string,
    payload: {
      moduleId?: string;
      questionCanonical?: string;
      answerMarkdown?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCacheEntry?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onProcessAiQueue?: () => Promise<{
    ok: boolean;
    message?: string;
    error?: string;
    results?: AiQueueProcessItemResult[];
  }>;
  onDismissPendingQuestion?: (id: string) => Promise<void>;
}

export const TeacherCacheQueueTab: React.FC<TeacherCacheQueueTabProps> = ({
  modules,
  cacheEntries,
  pendingAiQuestions,
  gatewayTetheringOnline,
  onSeedCacheEntry,
  onUpdateCacheEntry,
  onDeleteCacheEntry,
  onProcessAiQueue,
  onDismissPendingQuestion,
}) => {
  // Queue Processing state
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState<{
    ok: boolean;
    text: string;
    results?: AiQueueProcessItemResult[];
  } | null>(null);

  // Cache CRUD state
  const [cacheSearch, setCacheSearch] = useState('');
  const [editingCacheId, setEditingCacheId] = useState<string | null>(null);
  const [formModuleId, setFormModuleId] = useState(modules[0]?.id || 'mod-fisika-mikrohidro');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [isSavingCache, setIsSavingCache] = useState(false);
  const [cacheFeedback, setCacheFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDeleteCacheId, setConfirmDeleteCacheId] = useState<string | null>(null);

  const handleProcessQueue = async () => {
    if (!onProcessAiQueue) return;
    setIsProcessingQueue(true);
    setQueueFeedback(null);
    const res = await onProcessAiQueue();
    setIsProcessingQueue(false);
    setQueueFeedback({
      ok: res.ok,
      text: res.ok
        ? res.message || 'Antrean AI selesai diproses ke arsip kelas.'
        : res.error || 'Gagal memproses antrean pertanyaan.',
      results: res.results,
    });
  };

  const startEditCache = (entry: CacheEntry) => {
    setEditingCacheId(entry.id);
    setFormModuleId(entry.moduleId);
    setFormQuestion(entry.questionCanonical);
    setFormAnswer(entry.answerMarkdown);
    setCacheFeedback(null);
  };

  const cancelEditCache = () => {
    setEditingCacheId(null);
    setFormQuestion('');
    setFormAnswer('');
    setCacheFeedback(null);
  };

  const handleSaveCache = async (e: React.FormEvent) => {
    e.preventDefault();
    setCacheFeedback(null);

    if (formQuestion.trim().length < 5 || formAnswer.trim().length < 15) {
      setCacheFeedback({
        ok: false,
        text: 'Pertanyaan minimal 5 karakter dan jawaban minimal 15 karakter.',
      });
      return;
    }

    setIsSavingCache(true);
    try {
      if (editingCacheId && onUpdateCacheEntry) {
        const res = await onUpdateCacheEntry(editingCacheId, {
          moduleId: formModuleId,
          questionCanonical: formQuestion.trim(),
          answerMarkdown: formAnswer.trim(),
        });
        if (!res.ok) {
          setCacheFeedback({ ok: false, text: res.error || 'Gagal memperbarui entri cache.' });
          return;
        }
        setCacheFeedback({ ok: true, text: 'Entri arsip tanya-jawab berhasil diperbarui.' });
        setEditingCacheId(null);
        setFormQuestion('');
        setFormAnswer('');
      } else {
        const res = await onSeedCacheEntry({
          moduleId: formModuleId,
          questionCanonical: formQuestion.trim(),
          answerMarkdown: formAnswer.trim(),
        });
        if (!res.ok) {
          setCacheFeedback({ ok: false, text: res.error || 'Gagal menambahkan entri cache.' });
          return;
        }
        setCacheFeedback({
          ok: true,
          text: 'Entri arsip baru tersimpan. Siswa kini dapat mengaksesnya 0 ms tanpa kuota.',
        });
        setFormQuestion('');
        setFormAnswer('');
      }
    } finally {
      setIsSavingCache(false);
    }
  };

  const handleDeleteCache = async (id: string) => {
    if (!onDeleteCacheEntry) return;
    const res = await onDeleteCacheEntry(id);
    setConfirmDeleteCacheId(null);
    if (!res.ok) {
      setCacheFeedback({ ok: false, text: res.error || 'Gagal menghapus entri cache.' });
    } else {
      setCacheFeedback({ ok: true, text: 'Entri arsip berhasil dihapus.' });
      if (editingCacheId === id) cancelEditCache();
    }
  };

  const filteredCache = cacheEntries.filter(
    (c) =>
      !cacheSearch.trim() ||
      c.questionCanonical.toLowerCase().includes(cacheSearch.toLowerCase()) ||
      c.subject.toLowerCase().includes(cacheSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Offline AI Question Queue */}
      <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
                Antrean Pertanyaan Siswa Luring ({pendingAiQuestions.length})
              </h2>
              <p className="text-xs text-[#64748B]">
                Pertanyaan siswa saat mode luring otomatis masuk antrean untuk dijawab sekaligus via Gemini 4 Hydrogen ketika tethering aktif.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessingQueue || pendingAiQuestions.length === 0 || !gatewayTetheringOnline}
            onClick={handleProcessQueue}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            title={
              !gatewayTetheringOnline
                ? 'Aktifkan Tethering AI terlebih dahulu di tab Ringkasan'
                : 'Proses semua antrean ke Gemini 4 Hydrogen'
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>
              {isProcessingQueue
                ? 'Memproses Antrean...'
                : `Proses Semua (${pendingAiQuestions.length})`}
            </span>
          </button>
        </div>

        {!gatewayTetheringOnline && pendingAiQuestions.length > 0 && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-xl">
            Tethering Gateway sedang dalam mode luring. Aktifkan Tethering di tab Ringkasan atau tombol header untuk memproses antrean ke cloud.
          </p>
        )}

        {queueFeedback && (
          <div
            className={`text-xs px-4 py-3 rounded-xl border space-y-2 ${
              queueFeedback.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="font-semibold">{queueFeedback.text}</div>
            {queueFeedback.results && queueFeedback.results.length > 0 && (
              <ul className="space-y-1 text-[11px] font-mono">
                {queueFeedback.results.map((r) => (
                  <li key={r.id}>
                    {r.status === 'processed' ? '✓ Berhasil: ' : '✗ Gagal: '}
                    {r.question.slice(0, 70)}
                    {r.error ? ` (${r.error})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {pendingAiQuestions.length === 0 ? (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 text-center text-xs text-slate-500">
            Tidak ada pertanyaan siswa yang menunggu di antrean luring.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {pendingAiQuestions.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[11px] font-mono text-slate-500">
                    {item.askedByPeerName} · {item.createdAt}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">
                    {item.question}
                  </p>
                </div>
                {onDismissPendingQuestion && (
                  <button
                    type="button"
                    onClick={() => void onDismissPendingQuestion(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Local AI Semantic Cache CRUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form: Add / Edit Cache Entry */}
        <form
          onSubmit={handleSaveCache}
          className="lg:col-span-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#1D4ED8]" />
              <h3 className="text-sm font-bold text-[#0F172A]">
                {editingCacheId ? 'Sunting Arsip Tanya-Jawab' : 'Tambah Arsip Pre-Warm Lokal'}
              </h3>
            </div>
            {editingCacheId && (
              <button
                type="button"
                onClick={cancelEditCache}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modul Terkait
              </label>
              <select
                value={formModuleId}
                onChange={(e) => setFormModuleId(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pertanyaan Siswa (Kanonikal)
              </label>
              <input
                type="text"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Mis. Bagaimana mencegah korosi pada turbin mikrohidro di desa?"
                required
                className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jawaban Terkurasi Guru (Markdown)
              </label>
              <textarea
                rows={5}
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Tulis penjelasan terstruktur, langkah perhitungan, dan contoh lapangan 3T..."
                required
                className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingCache}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            {isSavingCache
              ? 'Menyimpan...'
              : editingCacheId
                ? 'Simpan Perubahan Arsip'
                : 'Simpan ke Arsip Lokal (0 ms)'}
          </button>

          {cacheFeedback && (
            <div
              className={`text-xs font-medium px-3 py-2.5 rounded-xl border flex items-center gap-2 ${
                cacheFeedback.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {cacheFeedback.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{cacheFeedback.text}</span>
            </div>
          )}
        </form>

        {/* List: Existing Cache Entries */}
        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#059669]" />
              <h3 className="text-sm font-bold text-[#0F172A]">
                Daftar Arsip Semantik Lokal ({cacheEntries.length})
              </h3>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={cacheSearch}
                onChange={(e) => setCacheSearch(e.target.value)}
                placeholder="Filter arsip..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredCache.map((entry) => {
              const isConfirming = confirmDeleteCacheId === entry.id;
              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    editingCacheId === entry.id
                      ? 'bg-[#EFF6FF] border-[#93C5FD]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                        {entry.subject} · {entry.hitCount}× Hit · Hemat{' '}
                        {entry.savedQuotaKB.toFixed(1)} KB
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {entry.questionCanonical}
                      </h4>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{entry.answerMarkdown}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] text-slate-500">
                      Oleh: {entry.createdByStudent}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {onUpdateCacheEntry && (
                        <button
                          type="button"
                          onClick={() => startEditCache(entry)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-[#1D4ED8]" />
                          <span>Sunting</span>
                        </button>
                      )}
                      {onDeleteCacheEntry && (
                        isConfirming ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleDeleteCache(entry.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Hapus?
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCacheId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCacheId(entry.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title="Hapus entri arsip"
                            aria-label="Hapus entri arsip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
