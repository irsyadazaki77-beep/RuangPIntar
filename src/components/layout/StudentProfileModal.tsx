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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17232F]/60 backdrop-blur-xs"
    >
      <div className="bg-[#FFFDF8] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DED4BE] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFE9DC]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#163A5F]" />
            <h3 id="student-profile-title" className="font-display text-base font-bold text-[#17232F]">
              Profil Perangkat Siswa
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5A6572] hover:text-[#17232F] p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17232F] mb-1">
              Nama Siswa
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={30}
              className="w-full px-3 py-2 text-sm border border-[#DED4BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#163A5F] bg-[#FFFDF8] text-[#17232F]"
              placeholder="Contoh: Hendrikus D."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17232F] mb-2">
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
                        ? 'border-[#163A5F] bg-[#EDF3F7] text-[#163A5F] font-semibold ring-1 ring-[#163A5F]'
                        : 'border-[#DED4BE] bg-[#FFFDF8] hover:bg-[#EFE9DC]/60 text-[#17232F]'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        selected ? 'bg-[#C85A32]' : 'bg-[#DED4BE]'
                      }`}
                    />
                    <span className="truncate">{stripAvatarEmoji(av)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-[#EFE9DC] border border-[#DED4BE] rounded-xl text-[11px] text-[#4A5562] font-mono">
            ID Perangkat: <span className="font-semibold text-[#17232F]">{studentProfile.peerId}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#4A5562] hover:bg-[#EFE9DC] rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-[#FFFDF8] bg-[#163A5F] hover:bg-[#1E4D7B] rounded-xl cursor-pointer"
            >
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
