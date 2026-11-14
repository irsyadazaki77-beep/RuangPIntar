import { useState, useCallback } from 'react';
import { useMeshNetwork } from '../context/MeshNetworkContext';
import { apiFetch, safeParseJson } from '../utils/apiClient';

const HOST_SESSION_TOKEN_KEY = 'ruangpintar_host_session_token';
const HOST_SESSION_EXPIRY_KEY = 'ruangpintar_host_session_expires_at';

export function useTeacherHost() {
  const {
    applyServerState,
    setStatusBanner,
    gatewayTetheringOnline,
    setActiveModuleId,
  } = useMeshNetwork();

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      const token = window.sessionStorage.getItem(HOST_SESSION_TOKEN_KEY);
      const expiresAt = Number(window.sessionStorage.getItem(HOST_SESSION_EXPIRY_KEY) || 0);
      if (token && (!expiresAt || expiresAt > Date.now())) {
        return token;
      }
      window.sessionStorage.removeItem(HOST_SESSION_TOKEN_KEY);
      window.sessionStorage.removeItem(HOST_SESSION_EXPIRY_KEY);
      return null;
    } catch {
      return null;
    }
  });

  const handleLockHost = useCallback(async () => {
    const currentToken = sessionToken;
    setSessionToken(null);
    try {
      window.sessionStorage.removeItem(HOST_SESSION_TOKEN_KEY);
      window.sessionStorage.removeItem(HOST_SESSION_EXPIRY_KEY);
    } catch {
      // Ignore storage errors
    }

    if (currentToken) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ token: currentToken }),
        });
      } catch {
        // Suppress network errors during logout
      }
    }
  }, [sessionToken]);

  const handleVerifyHostPin = useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number }> => {
      try {
        const response = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin.trim() }),
        });
        const data = await safeParseJson(response);
        if (!response.ok || !data.token) {
          const retrySec = Number(data.retryAfterSeconds ?? data.retryAfter ?? 0) || undefined;
          return {
            ok: false,
            error: data.error || 'PIN Simpul Guru tidak valid.',
            retryAfterSeconds: retrySec,
          };
        }

        const token = String(data.token).trim();
        const expiresAt = Number(data.expiresAt) || Date.now() + 8 * 3600 * 1000;

        setSessionToken(token);
        try {
          window.sessionStorage.setItem(HOST_SESSION_TOKEN_KEY, token);
          window.sessionStorage.setItem(HOST_SESSION_EXPIRY_KEY, String(expiresAt));
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

  const getAuthHeaders = useCallback(
    (extraHeaders: Record<string, string> = {}) => {
      const headers: Record<string, string> = { ...extraHeaders };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      return headers;
    },
    [sessionToken]
  );

  const handleChangeHostPin = useCallback(
    async (
      currentPin: string,
      newPin: string
    ): Promise<{ ok: boolean; error?: string; message?: string }> => {
      try {
        const response = await apiFetch('/api/host/change-pin', {
          method: 'POST',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
            'x-host-pin': currentPin,
          }),
          body: JSON.stringify({ currentPin, newPin }),
        });
        const data = await safeParseJson(response);
        if (!response.ok || !data.ok) {
          if (response.status === 401) {
            void handleLockHost();
          }
          return { ok: false, error: data.error || 'Gagal memperbarui PIN.' };
        }
        // Re-authenticate session with new PIN to refresh token
        await handleVerifyHostPin(newPin);
        return { ok: true, message: data.message };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [getAuthHeaders, handleLockHost, handleVerifyHostPin]
  );

  const handleToggleGatewayTethering = useCallback(async () => {
    try {
      const response = await apiFetch('/api/gateway/toggle', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ online: !gatewayTetheringOnline }),
      });
      if (response.ok) {
        const data = await safeParseJson(response);
        if (data.state) applyServerState(data.state);
      } else if (response.status === 401) {
        await handleLockHost();
        setStatusBanner('Sesi Simpul Guru berakhir. Silakan login kembali dengan PIN Guru.');
      }
    } catch {
      setStatusBanner('Gagal menghubungi server Simpul Guru.');
    }
  }, [applyServerState, gatewayTetheringOnline, getAuthHeaders, handleLockHost, setStatusBanner]);

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
        const response = await apiFetch('/api/modules', {
          method: 'POST',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(payload),
        });
        const data = await safeParseJson(response);
        if (!response.ok) {
          if (response.status === 401) await handleLockHost();
          return { ok: false, error: data.error || 'Gagal menyimpan modul.' };
        }
        if (data.state) applyServerState(data.state);
        if (data.module?.id) setActiveModuleId(data.module.id);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [applyServerState, getAuthHeaders, handleLockHost, setActiveModuleId]
  );

  const handleSeedCacheEntry = useCallback(
    async (payload: {
      moduleId: string;
      questionCanonical: string;
      answerMarkdown: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await apiFetch('/api/cache/seed', {
          method: 'POST',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(payload),
        });
        const data = await safeParseJson(response);
        if (!response.ok) {
          if (response.status === 401) await handleLockHost();
          return { ok: false, error: data.error || 'Gagal menyimpan cache.' };
        }
        if (data.state) applyServerState(data.state);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [applyServerState, getAuthHeaders, handleLockHost]
  );

  const handleExportPackage = useCallback(async () => {
    try {
      const res = await apiFetch('/api/host/export-package', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await safeParseJson(res);
        if (res.status === 401) await handleLockHost();
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
  }, [getAuthHeaders, handleLockHost, setStatusBanner]);

  const handleImportPackage = useCallback(
    async (pkg: unknown): Promise<{ ok: boolean; error?: string; message?: string }> => {
      try {
        const res = await apiFetch('/api/host/import-package', {
          method: 'POST',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(pkg),
        });
        const data = await safeParseJson(res);
        if (!res.ok || !data.ok) {
          if (res.status === 401) await handleLockHost();
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
    [applyServerState, getAuthHeaders, handleLockHost, setStatusBanner]
  );

  const handleDistributeToAll = useCallback(
    async (moduleId: string): Promise<{ ok: boolean; message?: string; error?: string }> => {
      try {
        const res = await apiFetch('/api/sync/distribute-all', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ moduleId }),
        });
        const data = await safeParseJson(res);
        if (!res.ok || !data.ok) {
          if (res.status === 401) await handleLockHost();
          return { ok: false, error: data.error || 'Gagal membagikan modul ke seluruh siswa.' };
        }
        if (data.state) applyServerState(data.state);
        if (data.message) setStatusBanner(data.message);
        return { ok: true, message: data.message };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [applyServerState, getAuthHeaders, handleLockHost, setStatusBanner]
  );

  const handleBroadcastClassroom = useCallback(
    async (payload: {
      message: string;
      focusModuleId?: string;
      examMode: boolean;
      clear?: boolean;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await apiFetch('/api/sync/broadcast', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        });
        const data = await safeParseJson(res);
        if (!res.ok || !data.ok) {
          if (res.status === 401) await handleLockHost();
          return { ok: false, error: data.error || 'Gagal mengirim pengumuman kelas.' };
        }
        if (data.state) applyServerState(data.state);
        setStatusBanner(
          payload.clear
            ? 'Pengumuman & mode ujian kelas dinonaktifkan.'
            : 'Pengumuman kelas berhasil dikirim ke seluruh perangkat siswa!'
        );
        return { ok: true };
      } catch {
        return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
      }
    },
    [applyServerState, getAuthHeaders, handleLockHost, setStatusBanner]
  );

  const handleProcessAiQueue = useCallback(async (): Promise<{
    ok: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      const res = await apiFetch('/api/tutor/process-queue', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await safeParseJson(res);
      if (!res.ok || !data.ok) {
        if (res.status === 401) await handleLockHost();
        return { ok: false, error: data.error || 'Gagal memproses antrean pertanyaan.' };
      }
      if (data.state) applyServerState(data.state);
      if (data.message) setStatusBanner(data.message);
      return { ok: true, message: data.message };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
    }
  }, [applyServerState, getAuthHeaders, handleLockHost, setStatusBanner]);

  const handleDismissPendingQuestion = useCallback(
    async (id: string): Promise<void> => {
      try {
        const res = await apiFetch(`/api/tutor/queue/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data.state) applyServerState(data.state);
        } else if (res.status === 401) {
          await handleLockHost();
        }
      } catch {
        // Ignore transient network error
      }
    },
    [applyServerState, getAuthHeaders, handleLockHost]
  );

  return {
    sessionToken,
    verifiedHostPin: sessionToken,
    isPinVerified: Boolean(sessionToken),
    handleVerifyHostPin,
    handleChangeHostPin,
    handleLockHost,
    handleToggleGatewayTethering,
    handlePublishModule,
    handleSeedCacheEntry,
    handleExportPackage,
    handleImportPackage,
    handleDistributeToAll,
    handleBroadcastClassroom,
    handleProcessAiQueue,
    handleDismissPendingQuestion,
  };
}

