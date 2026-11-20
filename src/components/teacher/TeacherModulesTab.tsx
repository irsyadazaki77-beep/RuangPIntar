import React, { useState } from 'react';
import {
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookOpen,
  X,
  Plus,
} from 'lucide-react';
import type { LearningModule, ModuleSection, ModuleCheckpoint, SimulationType } from '../../utils/edgeEngine';
import type { PublishModulePayload, UpdateModulePayload } from '../../hooks/useTeacherHost';
import { getSubjectTheme } from '../../utils/subjectTheme';

export interface TeacherModulesTabProps {
  modules: LearningModule[];
  onPublishModule: (payload: PublishModulePayload) => Promise<{ ok: boolean; error?: string }>;
  onUpdateModule?: (
    id: string,
    payload: UpdateModulePayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteModule?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

const SUBJECT_OPTIONS: LearningModule['subject'][] = [
  'Fisika Terapan',
  'Biologi Pesisir',
  'Matematika Maritim',
  'Teknik Energi',
];

const SIMULATION_OPTIONS: { value: SimulationType; label: string }[] = [
  { value: 'microhydro', label: 'Lab Turbin Mikrohidro' },
  { value: 'solar', label: 'Lab Panel Surya & Baterai LiFePO4' },
  { value: 'mangrove', label: 'Lab Ekologi Mangrove' },
  { value: 'navigation', label: 'Lab Navigasi Maritim' },
  { value: 'agroforestry', label: 'Lab Agroforestri Lahan Kering' },
  { value: 'desalination', label: 'Lab Distilasi Surya Air Payau' },
];

const createEmptySection = (index: number): ModuleSection => ({
  heading: `0${index + 1}. Materi Pokok`,
  body: '',
  formula: '',
  keyTakeaway: '',
});

const createEmptyCheckpoint = (): ModuleCheckpoint => ({
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
});

export const TeacherModulesTab: React.FC<TeacherModulesTabProps> = ({
  modules,
  onPublishModule,
  onUpdateModule,
  onDeleteModule,
}) => {
  const [searchText, setSearchText] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<LearningModule['subject']>('Teknik Energi');
  const [gradeLevel, setGradeLevel] = useState('Kelas XI SMA / SMK');
  const [sizeMB, setSizeMB] = useState<number>(24);
  const [simulationType, setSimulationType] = useState<SimulationType>('solar');
  const [summary, setSummary] = useState('');
  const [sections, setSections] = useState<ModuleSection[]>([createEmptySection(0)]);
  const [checkpoints, setCheckpoints] = useState<ModuleCheckpoint[]>([createEmptyCheckpoint()]);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const openCreateForm = () => {
    setEditingModuleId(null);
    setTitle('');
    setSubject('Teknik Energi');
    setGradeLevel('Kelas XI SMA / SMK');
    setSizeMB(24);
    setSimulationType('solar');
    setSummary('');
    setSections([
      {
        heading: '01. Prinsip Kerja & Perhitungan Kapasitas',
        body: '',
        formula: 'E_harian = P_panel × H_matahari × η_inverter',
        keyTakeaway: '',
      },
    ]);
    setCheckpoints([createEmptyCheckpoint()]);
    setFeedback(null);
    setIsEditorOpen(true);
  };

  const openEditForm = (mod: LearningModule) => {
    setEditingModuleId(mod.id);
    setTitle(mod.title);
    setSubject(mod.subject);
    setGradeLevel(mod.gradeLevel);
    setSizeMB(mod.sizeMB);
    setSimulationType(mod.simulationType);
    setSummary(mod.summary);
    setSections(
      mod.sections.length > 0
        ? mod.sections.map((s) => ({ ...s, formula: s.formula || '' }))
        : [createEmptySection(0)]
    );
    setCheckpoints(
      mod.checkpoints.length > 0
        ? mod.checkpoints.map((cp) => ({
            ...cp,
            options: [...cp.options],
          }))
        : [createEmptyCheckpoint()]
    );
    setFeedback(null);
    setIsEditorOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (title.trim().length < 5 || summary.trim().length < 10) {
      setFeedback({
        ok: false,
        text: 'Judul modul minimal 5 karakter dan ringkasan minimal 10 karakter.',
      });
      return;
    }

    const validSections = sections
      .map((s) => ({
        heading: s.heading.trim() || 'Materi Pokok',
        body: s.body.trim(),
        formula: s.formula?.trim() || undefined,
        keyTakeaway: s.keyTakeaway.trim() || 'Konsep utama siap diterapkan di lingkungan sekolah.',
      }))
      .filter((s) => s.body.length >= 10);

    if (validSections.length === 0) {
      setFeedback({
        ok: false,
        text: 'Minimal satu bab materi harus memiliki isi minimal 10 karakter.',
      });
      return;
    }

    const validCheckpoints = checkpoints
      .map((cp) => ({
        question: cp.question.trim(),
        options: cp.options.map((o) => o.trim()).filter(Boolean),
        correctIndex: cp.correctIndex,
        explanation: cp.explanation.trim() || 'Pembahasan sesuai rumus pada bab materi.',
      }))
      .filter((cp) => cp.question.length >= 5 && cp.options.length >= 2)
      .map((cp) => ({
        ...cp,
        correctIndex: Math.min(cp.correctIndex, cp.options.length - 1),
      }));

    setIsSaving(true);
    try {
      if (editingModuleId && onUpdateModule) {
        const res = await onUpdateModule(editingModuleId, {
          title: title.trim(),
          subject,
          gradeLevel: gradeLevel.trim(),
          summary: summary.trim(),
          sizeMB,
          simulationType,
          sections: validSections,
          checkpoints: validCheckpoints.length > 0 ? validCheckpoints : undefined,
        });
        if (!res.ok) {
          setFeedback({ ok: false, text: res.error || 'Gagal menyimpan perubahan modul.' });
          return;
        }
        setFeedback({ ok: true, text: 'Perubahan modul berhasil disimpan dan disinkronkan.' });
        setIsEditorOpen(false);
        setEditingModuleId(null);
      } else {
        const primarySec = validSections[0];
        const res = await onPublishModule({
          title: title.trim(),
          subject,
          gradeLevel: gradeLevel.trim(),
          summary: summary.trim(),
          sectionHeading: primarySec.heading,
          sectionBody: primarySec.body,
          formula: primarySec.formula || '',
          keyTakeaway: primarySec.keyTakeaway,
          sizeMB,
          simulationType,
          sections: validSections,
          checkpoints: validCheckpoints.length > 0 ? validCheckpoints : undefined,
        });
        if (!res.ok) {
          setFeedback({ ok: false, text: res.error || 'Gagal menerbitkan modul baru.' });
          return;
        }
        setFeedback({ ok: true, text: 'Modul baru berhasil diterbitkan ke katalog kelas.' });
        setIsEditorOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteModule) return;
    setDeletingId(id);
    const res = await onDeleteModule(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      setFeedback({ ok: false, text: res.error || 'Gagal menghapus modul.' });
    } else {
      setFeedback({ ok: true, text: 'Modul berhasil dihapus dari Simpul Guru.' });
    }
  };

  const filteredModules = modules.filter(
    (m) =>
      !searchText.trim() ||
      m.title.toLowerCase().includes(searchText.toLowerCase()) ||
      m.code.toLowerCase().includes(searchText.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cari kode, judul, atau mata pelajaran modul..."
            className="w-full min-h-[42px] pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Modul &amp; Kuis Baru</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`text-xs font-medium px-4 py-3 rounded-xl border flex items-center justify-between gap-2 ${
            feedback.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-900 cursor-pointer"
            aria-label="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create / Edit Form Panel */}
      {isEditorOpen && (
        <form
          onSubmit={handleSaveModule}
          className="bg-[#FFFFFF] border-2 border-[#1D4ED8]/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-display text-base font-bold text-[#0F172A]">
                {editingModuleId ? 'Sunting Modul & Kuis Kelas' : 'Terbitkan Modul Kurikulum Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Modul akan otomatis dipecah menjadi 16 chunk terverifikasi SHA-256 untuk distribusi P2P.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Tutup editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Modul Pembelajaran
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mis. Energi Biomassa Sekam Padi untuk Pengeringan Hasil Panen"
                required
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mata Pelajaran
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as LearningModule['subject'])}
                className="w-full min-h-[38px] px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900"
              >
                {SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenjang / Kelas
              </label>
              <input
                type="text"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lab Simulasi Terkait
              </label>
              <select
                value={simulationType}
                onChange={(e) => setSimulationType(e.target.value as SimulationType)}
                className="w-full min-h-[38px] px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900"
              >
                {SIMULATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimasi Paket (MB)
              </label>
              <input
                type="number"
                min={2}
                max={200}
                value={sizeMB}
                onChange={(e) => setSizeMB(Number(e.target.value) || 12)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900 tabular-nums"
              />
            </div>

            <div className="md:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ringkasan Singkat Modul
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Jelaskan konteks lokal dan kompetensi inti yang dipelajari siswa..."
                required
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>
          </div>

          {/* Multi-Section Content Builder */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Bab Materi ({sections.length})
              </h4>
              <button
                type="button"
                onClick={() => setSections((prev) => [...prev, createEmptySection(prev.length)])}
                className="px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bab</span>
              </button>
            </div>

            <div className="space-y-3">
              {sections.map((sec, idx) => (
                <div
                  key={`sec-${idx}`}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#1D4ED8]">
                      BAB 0{idx + 1}
                    </span>
                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSections((prev) => prev.filter((_, sIdx) => sIdx !== idx))
                        }
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Hapus Bab
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={sec.heading}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, heading: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Judul Bab"
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                    <input
                      type="text"
                      value={sec.formula || ''}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, formula: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Rumus Kunci (opsional)"
                      className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={sec.body}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, body: e.target.value } : item
                        )
                      )
                    }
                    placeholder="Isi penjelasan materi secara lengkap..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <input
                    type="text"
                    value={sec.keyTakeaway}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, keyTakeaway: e.target.value } : item
                        )
                      )
                    }
                    placeholder="Intisari Lapangan 3T..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quiz Checkpoints Builder */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Soal Kuis Pemahaman ({checkpoints.length})
              </h4>
              <button
                type="button"
                onClick={() => setCheckpoints((prev) => [...prev, createEmptyCheckpoint()])}
                className="px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Soal</span>
              </button>
            </div>

            <div className="space-y-3">
              {checkpoints.map((cp, qIdx) => (
                <div
                  key={`cp-${qIdx}`}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      SOAL 0{qIdx + 1}
                    </span>
                    {checkpoints.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCheckpoints((prev) => prev.filter((_, idx) => idx !== qIdx))
                        }
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Hapus Soal
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={cp.question}
                    onChange={(e) =>
                      setCheckpoints((prev) =>
                        prev.map((item, idx) =>
                          idx === qIdx ? { ...item, question: e.target.value } : item
                        )
                      )
                    }
                    placeholder="Tulis pertanyaan kuis..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cp.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-q-${qIdx}`}
                          checked={cp.correctIndex === oIdx}
                          onChange={() =>
                            setCheckpoints((prev) =>
                              prev.map((item, idx) =>
                                idx === qIdx ? { ...item, correctIndex: oIdx } : item
                              )
                            )
                          }
                          title="Tandai sebagai kunci jawaban"
                          className="accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) =>
                            setCheckpoints((prev) =>
                              prev.map((item, idx) =>
                                idx === qIdx
                                  ? {
                                      ...item,
                                      options: item.options.map((o, i) =>
                                        i === oIdx ? e.target.value : o
                                      ),
                                    }
                                  : item
                              )
                            )
                          }
                          placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={cp.explanation}
                    onChange={(e) =>
                      setCheckpoints((prev) =>
                        prev.map((item, idx) =>
                          idx === qIdx ? { ...item, explanation: e.target.value } : item
                        )
                      )
                    }
                    placeholder="Pembahasan jawaban benar..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {isSaving
                ? 'Menyimpan...'
                : editingModuleId
                  ? 'Simpan Perubahan Modul'
                  : 'Terbitkan ke Katalog Kelas'}
            </button>
          </div>
        </form>
      )}

      {/* Module Catalog List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((mod) => {
          const theme = getSubjectTheme(mod.subject);
          const isConfirming = confirmDeleteId === mod.id;
          const isDeleting = deletingId === mod.id;

          return (
            <article
              key={mod.id}
              className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className={`h-1.5 w-full ${theme.ribbonGradient}`} />
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className={`font-bold ${theme.accentText}`}>
                      {mod.code} · {mod.subject}
                    </span>
                    <span className="text-slate-500 tabular-nums">{mod.sizeMB} MB</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0F172A] leading-snug">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {mod.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-slate-500 pt-1 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {mod.sections.length} Bab
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{mod.checkpoints.length} Soal Kuis</span>
                    <span aria-hidden="true">·</span>
                    <span>{mod.gradeLevel}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openEditForm(mod)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Sunting</span>
                </button>

                {onDeleteModule && (
                  isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(mod.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                      >
                        {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={modules.length <= 1}
                      onClick={() => setConfirmDeleteId(mod.id)}
                      className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title={
                        modules.length <= 1
                          ? 'Minimal 1 modul harus tetap tersedia'
                          : 'Hapus modul ini'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
