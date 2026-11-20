import React, { useState } from 'react';
import {
  Download,
  UploadCloud,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  Trash2,
} from 'lucide-react';
import type { PeerNode } from '../../utils/edgeEngine';

export interface TeacherNetworkSneakernetTabProps {
  peers: PeerNode[];
  onExportPackage?: () => void;
  onImportPackage?: (pkg: unknown) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onDeletePeer?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

interface ParsedSneakernetPreview {
  fileName: string;
  rawPayload: unknown;
  modulesCount: number;
  cacheCount: number;
  sampleModuleTitles: string[];
}

export const TeacherNetworkSneakernetTab: React.FC<TeacherNetworkSneakernetTabProps> = ({
  peers,
  onExportPackage,
  onImportPackage,
  onDeletePeer,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<ParsedSneakernetPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDeletePeerId, setConfirmDeletePeerId] = useState<string | null>(null);

  const inspectImportFile = (file: File) => {
    setImportStatus(null);
    setPendingPreview(null);
    if (!file.name.endsWith('.json')) {
      setImportStatus({ ok: false, text: 'File harus berformat paket data JSON (.json).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || '');
        const parsed = JSON.parse(text) as {
          modules?: Array<{ title?: string }>;
          cacheEntries?: unknown[];
        };
        const mods = Array.isArray(parsed.modules) ? parsed.modules : [];
        const caches = Array.isArray(parsed.cacheEntries) ? parsed.cacheEntries : [];
        if (mods.length === 0 && caches.length === 0) {
          setImportStatus({
            ok: false,
            text: 'Paket JSON tidak berisi daftar modul atau arsip tanya-jawab yang valid.',
          });
          return;
        }
        setPendingPreview({
          fileName: file.name,
          rawPayload: parsed,
          modulesCount: mods.length,
          cacheCount: caches.length,
          sampleModuleTitles: mods
            .slice(0, 4)
            .map((m) => String(m.title || 'Modul Tanpa Judul')),
        });
      } catch {
        setImportStatus({
          ok: false,
          text: 'Format isi file JSON paket Sneakernet rusak atau tidak valid.',
        });
      }
    };
    reader.onerror = () => {
      setImportStatus({ ok: false, text: 'Gagal membaca file dari penyimpanan USB.' });
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!pendingPreview || !onImportPackage) return;
    setIsImporting(true);
    setImportStatus(null);
    const res = await onImportPackage(pendingPreview.rawPayload);
    setIsImporting(false);
    if (!res.ok) {
      setImportStatus({ ok: false, text: res.error || 'Gagal mengimpor paket Sneakernet.' });
      return;
    }
    setPendingPreview(null);
    setImportStatus({
      ok: true,
      text: res.message || 'Paket Sneakernet berhasil digabungkan ke server lokal kelas.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Sneakernet USB Export & Import with Pre-Import Preview */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
                Distribusi Fisik USB / Flashdisk (Sneakernet 3T)
              </h2>
              <p className="text-xs text-[#64748B]">
                Ekspor seluruh modul &amp; arsip AI untuk dibawa antarsekolah tanpa internet, atau pratinjau paket sebelum mengimpor.
              </p>
            </div>
          </div>

          {onExportPackage && (
            <button
              type="button"
              onClick={onExportPackage}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Paket (.json)</span>
            </button>
          )}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) inspectImportFile(file);
          }}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors space-y-2.5 ${
            isDragging
              ? 'border-[#1D4ED8] bg-[#EFF6FF]'
              : 'border-slate-300 bg-[#F8FAFC] hover:border-slate-400'
          }`}
        >
          <UploadCloud className="w-7 h-7 text-[#1D4ED8] mx-auto" />
          <div className="text-xs sm:text-sm font-semibold text-slate-800">
            Tarik &amp; letakkan file paket <span className="font-mono">.json</span> dari Flashdisk di sini
          </div>
          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer">
            <span>Pilih File dari Komputer / USB</span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) inspectImportFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {/* Pre-Import Preview Confirmation Card */}
        {pendingPreview && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#1D4ED8] font-mono">
                PRATINJAU PAKET: {pendingPreview.fileName}
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                {pendingPreview.modulesCount} Modul · {pendingPreview.cacheCount} Arsip AI
              </div>
            </div>
            {pendingPreview.sampleModuleTitles.length > 0 && (
              <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc">
                {pendingPreview.sampleModuleTitles.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isImporting}
                onClick={confirmImport}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
              >
                {isImporting ? 'Mengimpor...' : 'Konfirmasi Impor ke Simpul Guru'}
              </button>
              <button
                type="button"
                onClick={() => setPendingPreview(null)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {importStatus && (
          <div
            className={`text-xs font-medium px-4 py-3 rounded-xl border flex items-center gap-2 ${
              importStatus.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {importStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importStatus.text}</span>
          </div>
        )}
      </section>

      {/* Connected Peer Devices Management */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#059669]" />
            <h2 className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
              Daftar Perangkat Mesh Terdaftar ({peers.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Subnet 192.168.43.0/24</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500">
                <th className="py-2.5 pr-3">Perangkat</th>
                <th className="py-2.5 px-3">IP Lokal</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Unggah / Unduh</th>
                <th className="py-2.5 pl-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {peers.map((peer) => {
                const isHost = peer.role === 'HOST';
                const isConfirming = confirmDeletePeerId === peer.id;

                return (
                  <tr key={peer.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-900">{peer.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {peer.deviceType} · {peer.latencyMs} ms
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 tabular-nums">
                      {peer.localIp}
                    </td>
                    <td className="py-3 px-3 text-[11px] font-medium">
                      <span
                        className={
                          isHost
                            ? 'text-[#1D4ED8] font-bold'
                            : peer.rtcStatus === 'DataChannel Terhubung' ||
                                peer.rtcStatus === 'Menyemai Pecahan'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-500'
                        }
                      >
                        {peer.rtcStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      <span className="text-emerald-700 font-semibold">
                        ↑{peer.uploadedMB.toFixed(1)}
                      </span>{' '}
                      / ↓{peer.downloadedMB.toFixed(1)} MB
                    </td>
                    <td className="py-3 pl-3 text-right">
                      {isHost ? (
                        <span className="text-[11px] font-mono text-slate-400">Simpul Induk</span>
                      ) : onDeletePeer ? (
                        isConfirming ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeletePeer(peer.id);
                                setConfirmDeletePeerId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Hapus?
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePeerId(null)}
                              className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePeerId(peer.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title="Hapus perangkat tidak aktif"
                            aria-label="Hapus perangkat tidak aktif"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
