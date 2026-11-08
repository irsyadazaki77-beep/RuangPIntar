import { useState, useCallback } from 'react';
import { useMeshNetwork } from '../context/MeshNetworkContext';

const HOST_PIN_STORAGE_KEY = 'ruangpintar_verified_host_pin';

async function safeParseJson(res: Response): Promise<Record<string, any>> {
  try {
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      return {};
    }
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function useTeacherHost() {
  const {
    applyServerState,
    setStatusBanner,
    gatewayTetheringOnline,
    setActiveModuleId,
  } = useMeshNetwork();

  const [verifiedHostPin, setVerifiedHostPin] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem(HOST_PIN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const handleLockHost = useCallback(() => {
    setVerifiedHostPin(null);
    try {
      window.sessionStorage.removeItem(HOST_PIN_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleVerifyHostPin = useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number }> => {
      try {
        const response = await fetch('/api/host/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin.trim() }),
        });
        const data = await safeParseJson(response);
        if (!response.ok || !data.valid) {
          const retrySec = Number(data.retryAfterSeconds ?? data.retryAfter ?? 0) || undefined;
          return {
            ok: false,
            error: data.error || 'PIN Simpul Guru tidak valid.',
            retryAfterSeconds: retrySec,
          };
        }
        const cleanPin = pin.trim();
        setVerifiedHostPin(cleanPin);
        try {
          window.sessionStorage.setItem(HOST_PIN_STORAGE_KEY, cleanPin);
        } catch {
          // Ignore storage errors
        }
        return { ok: true };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    []
  );

  const handleChangeHostPin = useCallback(
    async (
      currentPin: string,
      newPin: string
    ): Promise<{ ok: boolean; error?: string; message?: string }> => {
      try {
        const response = await fetch('/api/host/change-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-host-pin': verifiedHostPin || currentPin,
          },
          body: JSON.stringify({ currentPin, newPin }),
        });
        const data = await safeParseJson(response);
        if (!response.ok || !data.ok) {
          return { ok: false, error: data.error || 'Gagal memperbarui PIN.' };
        }
        const cleanNew = newPin.trim();
        setVerifiedHostPin(cleanNew);
        try {
          window.sessionStorage.setItem(HOST_PIN_STORAGE_KEY, cleanNew);
        } catch {
          // Ignore storage errors
        }
        return { ok: true, message: data.message };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [verifiedHostPin]
  );

  const handleToggleGatewayTethering = useCallback(async () => {
    try {
      const response = await fetch('/api/gateway/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-host-pin': verifiedHostPin || '',
        },
        body: JSON.stringify({ online: !gatewayTetheringOnline }),
      });
      if (response.ok) {
        const data = await safeParseJson(response);
        if (data.state) applyServerState(data.state);
      } else if (response.status === 401) {
        handleLockHost();
        setStatusBanner('Sesi PIN Simpul Guru berakhir. Silakan masukkan kembali PIN Simpul Guru.');
      }
    } catch {
      setStatusBanner('Gagal menghubungi server Simpul Guru.');
    }
  }, [applyServerState, gatewayTetheringOnline, handleLockHost, setStatusBanner, verifiedHostPin]);

  const handlePublishModule = useCallback(
    async (payload: {
      title: string;
      subject: string;
      gradeLevel: string;
      summary: string;
      sectionHeading: string;
      sectionBody: string;
      formula: string;
      keyTakeaway: string;
      sizeMB: number;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/modules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-host-pin': verifiedHostPin || '',
          },
          body: JSON.stringify(payload),
        });
        const data = await safeParseJson(response);
        if (!response.ok) {
          if (response.status === 401) handleLockHost();
          return { ok: false, error: data.error || 'Gagal menyimpan modul.' };
        }
        if (data.state) applyServerState(data.state);
        if (data.module?.id) setActiveModuleId(data.module.id);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [applyServerState, handleLockHost, setActiveModuleId, verifiedHostPin]
  );

  const handleSeedCacheEntry = useCallback(
    async (payload: {
      moduleId: string;
      questionCanonical: string;
      answerMarkdown: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/cache/seed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-host-pin': verifiedHostPin || '',
          },
          body: JSON.stringify(payload),
        });
        const data = await safeParseJson(response);
        if (!response.ok) {
          if (response.status === 401) handleLockHost();
          return { ok: false, error: data.error || 'Gagal menyimpan cache.' };
        }
        if (data.state) applyServerState(data.state);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [applyServerState, handleLockHost, verifiedHostPin]
  );

  const handleExportPackage = useCallback(async () => {
    try {
      const pinHeader = verifiedHostPin || '';
      const res = await fetch('/api/host/export-package', {
        headers: { 'x-host-pin': pinHeader },
      });
      if (!res.ok) {
        const data = await safeParseJson(res);
        if (res.status === 401) handleLockHost();
        setStatusBanner(data.error || 'Gagal mengekspor paket data Sneakernet.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruangpintar-sneakernet-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setStatusBanner('Paket data Sneakernet (.json) berhasil diunduh ke penyimpanan perangkat!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi lokal terputus.';
      setStatusBanner('Gagal mengekspor data: ' + msg);
    }
  }, [handleLockHost, setStatusBanner, verifiedHostPin]);

  const handleImportPackage = useCallback(
    async (pkg: unknown): Promise<{ ok: boolean; error?: string; message?: string }> => {
      try {
        const pinHeader = verifiedHostPin || '';
        const res = await fetch('/api/host/import-package', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-host-pin': pinHeader,
          },
          body: JSON.stringify(pkg),
        });
        const data = await safeParseJson(res);
        if (!res.ok || !data.ok) {
          if (res.status === 401) handleLockHost();
          return { ok: false, error: data.error || 'Gagal mengimpor paket data Sneakernet.' };
        }
        if (data.state) {
          applyServerState(data.state);
        }
        if (data.message) {
          setStatusBanner(data.message);
        }
        return { ok: true, message: data.message };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error jaringan';
        return {
          ok: false,
          error: 'Koneksi lokal gagal saat mengimpor paket: ' + msg,
        };
      }
    },
    [applyServerState, handleLockHost, setStatusBanner, verifiedHostPin]
  );

  return {
    verifiedHostPin,
    isPinVerified: Boolean(verifiedHostPin),
    handleVerifyHostPin,
    handleChangeHostPin,
    handleLockHost,
    handleToggleGatewayTethering,
    handlePublishModule,
    handleSeedCacheEntry,
    handleExportPackage,
    handleImportPackage,
  };
}
