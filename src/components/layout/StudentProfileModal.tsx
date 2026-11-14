import React, { useState, useEffect } from 'react';
import { UserCheck, X } from 'lucide-react';
import {
  useMeshNetwork,
  DEFAULT_AVATARS,
  STUDENT_PROFILE_KEY,
} from '../../context/MeshNetworkContext';

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
    setStatusBanner(`Identitas siswa diperbarui: ${updated.avatar} ${updated.studentName}`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-600" />
            <h3 id="student-profile-title" className="text-base font-bold text-slate-900">
              Profil Perangkat Siswa
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Siswa
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={30}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              placeholder="Contoh: Hendrikus D."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pilih Avatar Karakter 3T
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatarInput(av)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                    avatarInput === av
                      ? 'border-sky-500 bg-sky-50/80 text-sky-950 font-semibold ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-base">{av.split(' ')[0]}</span>
                  <span className="truncate">{av.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 font-mono">
            ID Simpul Siswa: <span className="font-semibold text-slate-900">{studentProfile.peerId}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-xs"
            >
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
