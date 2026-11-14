import React, { useState, useEffect } from 'react';
import { UserCheck, X } from 'lucide-react';
import {
  useMeshNetwork,
  DEFAULT_AVATARS,
  STUDENT_PROFILE_KEY,
} from '../../context/MeshNetworkContext';

function stripAvatarEmoji(label: string): string {
  const parts = label.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : label;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { studentProfile, setStudentProfile, setStatusBanner } = useMeshNetwork();
  const [nameInput, setNameInput] = useState(studentProfile.studentName);
  const [avatarInput, setAvatarInput] = useState(studentProfile.avatar);

  useEffect(() => {
    if (isOpen) {
      setNameInput(studentProfile.studentName);
      setAvatarInput(studentProfile.avatar);
    }
  }, [isOpen, studentProfile.avatar, studentProfile.studentName]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...studentProfile,
      studentName: nameInput.trim() || 'Hendrikus D.',
      avatar: avatarInput,
    };
    setStudentProfile(updated);
    try {
      window.localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(updated));
    } catch {}
    setStatusBanner(`Identitas siswa diperbarui: ${updated.studentName} (${stripAvatarEmoji(updated.avatar)})`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1D4ED8]" />
            <h3 id="student-profile-title" className="font-display text-base font-bold text-slate-900">
              Profil Perangkat Siswa
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Nama Siswa
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={30}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] bg-white text-slate-900"
              placeholder="Contoh: Hendrikus D."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2">
              Kelompok Lencana Nusantara
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_AVATARS.map((av) => {
                const selected = avatarInput === av;
                return (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatarInput(av)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8] font-semibold ring-1 ring-[#1D4ED8]'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        selected ? 'bg-[#1D4ED8]' : 'bg-slate-300'
                      }`}
                    />
                    <span className="truncate">{stripAvatarEmoji(av)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-mono">
            ID Perangkat: <span className="font-semibold text-slate-900">{studentProfile.peerId}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl cursor-pointer"
            >
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
