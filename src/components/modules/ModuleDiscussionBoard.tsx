import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Pin, Send, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { apiFetch, safeParseJson } from '../../utils/apiClient';
import { signStudentPayload } from '../../utils/studentCrypto';
import { useMeshNetwork } from '../../context/MeshNetworkContext';
import type { ModuleDiscussionPost } from '../../utils/edgeEngine';
import type { SubjectVisualTheme } from '../../utils/subjectTheme';

export interface ModuleDiscussionBoardProps {
  moduleId: string;
  moduleTitle: string;
  authorName: string;
  authorAvatar: string;
  theme: SubjectVisualTheme;
  teacherSessionToken?: string | null;
}

export const ModuleDiscussionBoard: React.FC<ModuleDiscussionBoardProps> = ({
  moduleId,
  moduleTitle,
  authorName,
  authorAvatar,
  theme,
  teacherSessionToken,
}) => {
  const { discussionEventRevision } = useMeshNetwork();
  const [posts, setPosts] = useState<ModuleDiscussionPost[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [moderatingPostId, setModeratingPostId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isTeacherAuthenticated = Boolean(teacherSessionToken);

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
  }, [fetchPosts, discussionEventRevision]);

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
          authorRole: isTeacherAuthenticated ? 'TEACHER' : 'STUDENT',
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

  const handleTogglePin = async (post: ModuleDiscussionPost) => {
    if (!teacherSessionToken) return;
    setModeratingPostId(post.id);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/sync/discussions/${encodeURIComponent(post.id)}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-host-pin': teacherSessionToken,
        },
        body: JSON.stringify({ pinned: !post.isPinned }),
      });
      if (!res.ok) {
        setErrorMsg('Gagal mengubah status sematan diskusi.');
        return;
      }
      await fetchPosts();
    } catch {
      setErrorMsg('Koneksi ke simpul guru terputus saat menyematkan pesan.');
    } finally {
      setModeratingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!teacherSessionToken) return;
    setModeratingPostId(postId);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/sync/discussions/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers: {
          'x-host-pin': teacherSessionToken,
        },
      });
      if (!res.ok) {
        setErrorMsg('Gagal menghapus pesan diskusi.');
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setConfirmDeleteId(null);
    } catch {
      setErrorMsg('Koneksi ke simpul guru terputus saat menghapus pesan.');
    } finally {
      setModeratingPostId(null);
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
            Diskusi teman sebaya &amp; guru untuk modul <strong>{moduleTitle}</strong> tersinkron otomatis lewat jaringan lokal kelas.
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
          Kirim Pertanyaan atau Tanggapan ({authorAvatar} {authorName}
          {isTeacherAuthenticated ? ' · Mode Guru' : ''})
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
          <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            {errorMsg}
          </p>
        )}
      </form>

      {isLoading && posts.length === 0 ? (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded-2xl text-center text-xs text-slate-500">
          Memuat percakapan forum kelas...
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-6 rounded-2xl text-center space-y-1.5">
          <p className="text-xs font-bold text-slate-800">
            Belum ada diskusi pada modul ini.
          </p>
          <p className="text-[11px] text-slate-600">
            Jadilah yang pertama bertanya atau berbagi catatan penting ke teman sekelas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isBusy = moderatingPostId === post.id;
            const isConfirmingDelete = confirmDeleteId === post.id;

            return (
              <article
                key={post.id}
                className={`rounded-2xl border p-4 space-y-2 ${
                  post.isPinned
                    ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-bold text-slate-900">
                      {post.avatar} {post.authorName}
                    </span>
                    {post.authorRole === 'TEACHER' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1D4ED8]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Guru</span>
                      </span>
                    )}
                    {post.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309]">
                        <Pin className="w-3 h-3" />
                        <span>Disematkan</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {post.createdAt}
                    </span>
                    {isTeacherAuthenticated && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleTogglePin(post)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                            post.isPinned
                              ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                          title={post.isPinned ? 'Lepas sematan' : 'Sematkan di atas'}
                        >
                          <Pin className="w-3 h-3" />
                          <span>{post.isPinned ? 'Lepas' : 'Sematkan'}</span>
                        </button>

                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDeletePost(post.id)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                            >
                              Hapus?
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(post.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Hapus pesan diskusi"
                            aria-label="Hapus pesan diskusi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {post.message}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
