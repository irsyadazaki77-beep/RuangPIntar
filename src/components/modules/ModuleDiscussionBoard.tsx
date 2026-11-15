import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Pin, Send, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch, safeParseJson } from '../../utils/apiClient';
import { signStudentPayload } from '../../utils/studentCrypto';
import type { ModuleDiscussionPost } from '../../utils/edgeEngine';
import type { SubjectVisualTheme } from '../../utils/subjectTheme';

export interface ModuleDiscussionBoardProps {
  moduleId: string;
  moduleTitle: string;
  authorName: string;
  authorAvatar: string;
  theme: SubjectVisualTheme;
}

export const ModuleDiscussionBoard: React.FC<ModuleDiscussionBoardProps> = ({
  moduleId,
  moduleTitle,
  authorName,
  authorAvatar,
  theme,
}) => {
  const [posts, setPosts] = useState<ModuleDiscussionPost[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(
        `/api/sync/discussions?moduleId=${encodeURIComponent(moduleId)}`
      );
      const data = (await safeParseJson(res)) as {
        ok?: boolean;
        posts?: ModuleDiscussionPost[];
      } | null;
      if (data?.posts) {
        setPosts(data.posts);
      }
    } catch {
      setErrorMsg('Diskusi lokal belum tersambung ke simpul guru. Coba segarkan kembali.');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (trimmed.length < 3) {
      setErrorMsg('Tulis minimal 3 karakter untuk mengirim pesan diskusi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const authorEffective = authorName || 'Siswa Lokal';
      const payloadToSign = `${moduleId}:${authorEffective}:${trimmed}`;
      const sigData = await signStudentPayload(payloadToSign);

      const res = await apiFetch('/api/sync/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          authorName: authorEffective,
          authorRole: 'STUDENT',
          avatar: authorAvatar || '🎓',
          message: trimmed,
          clientSignature: sigData?.signatureBase64,
          clientPublicKey: sigData?.publicKeyBase64,
        }),
      });
      const data = (await safeParseJson(res)) as {
        ok?: boolean;
        post?: ModuleDiscussionPost;
        error?: string;
      } | null;
      if (!res.ok || !data?.post) {
        setErrorMsg(data?.error || 'Gagal mengirim pesan diskusi.');
        return;
      }
      setPosts((prev) => [data.post!, ...prev.filter((p) => p.id !== data.post!.id)]);
      setMessageInput('');
    } catch {
      setErrorMsg('Simpul guru sedang luring. Pesan tidak dapat dikirim saat ini.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-display text-base sm:text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <MessageSquare className={`w-4 h-4 ${theme.accentText}`} />
            <span>Forum Diskusi Kelas Lokal (0 KB Kuota)</span>
          </h3>
          <p className="text-xs text-[#475569] mt-0.5">
            Diskusi teman sebaya &amp; guru untuk modul <strong>{moduleTitle}</strong> tersimpan di jaringan kelas lokal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchPosts()}
          disabled={isLoading}
          className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      <form onSubmit={handleSubmitPost} className="space-y-2.5">
        <label htmlFor="discussion-input" className="block text-xs font-bold text-slate-700">
          Kirim Pertanyaan atau Tanggapan ({authorAvatar} {authorName})
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <textarea
            id="discussion-input"
            rows={2}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Contoh: Teman-teman, bagaimana cara menentukan nilai ΔT pada soal nomor 1?"
            maxLength={800}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={isSubmitting || messageInput.trim().length < 3}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Mengirim...' : 'Kirim ke Forum'}</span>
          </button>
        </div>
        {errorMsg && (
          <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            {errorMsg}
          </p>
        )}
      </form>

      {isLoading && posts.length === 0 ? (
        <div className="surface-warm-recessed p-5 rounded-2xl text-center text-xs text-slate-500">
          Memuat percakapan forum kelas...
        </div>
      ) : posts.length === 0 ? (
        <div className="surface-warm-recessed p-6 rounded-2xl text-center space-y-1.5">
          <p className="text-xs font-bold text-slate-800">
            Belum ada diskusi pada modul ini.
          </p>
          <p className="text-[11px] text-slate-600">
            Jadilah yang pertama bertanya atau berbagi catatan penting ke teman sekelas!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className={`rounded-2xl border p-4 space-y-2 ${
                post.isPinned
                  ? 'bg-blue-50/70 border-blue-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900">
                    {post.avatar} {post.authorName}
                  </span>
                  {post.authorRole === 'TEACHER' && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Guru
                    </span>
                  )}
                  {post.isPinned && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                      <Pin className="w-3 h-3" />
                      Disematkan
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-500">{post.createdAt}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {post.message}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
