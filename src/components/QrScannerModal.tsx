import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, X, Check, Wifi, ExternalLink, ArrowRight } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (hostUrl: string) => Promise<boolean> | boolean;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('192.168.43.1:3000');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopScanner = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleDetectedUrl = useCallback(
    async (rawUrl: string) => {
      setScannedResult(rawUrl);
      setIsConnecting(true);
      try {
        const success = await onConnect(rawUrl);
        if (success) {
          stopScanner();
          onClose();
        }
      } finally {
        setIsConnecting(false);
      }
    },
    [onConnect, onClose, stopScanner]
  );

  const scanQrLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanQrLoop);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      void handleDetectedUrl(code.data);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanQrLoop);
  }, [handleDetectedUrl]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScannedResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(scanQrLoop);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Kamera tidak dapat diakses atau izin ditolak. Masukkan IP laptop guru secara manual di bawah.';
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [scanQrLoop]);

  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, startCamera, stopScanner]);

  if (!isOpen) return null;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setIsConnecting(true);
    try {
      const success = await onConnect(manualInput.trim());
      if (success) {
        stopScanner();
        onClose();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 id="qr-scanner-title" className="text-base font-bold text-slate-900 leading-tight">
                Hubungkan ke Laptop Guru
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pindai QR Code di layar guru atau ketik IP LAN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup jendela pemindai QR"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Target Overlay */}
          {cameraActive && !scannedResult && (
            <div className="absolute inset-8 border-2 border-dashed border-sky-400/90 rounded-2xl pointer-events-none animate-pulse flex items-center justify-center">
              <div className="w-3 h-3 bg-sky-400 rounded-full" />
            </div>
          )}

          {cameraError && (
            <div className="p-4 text-center text-rose-200 text-xs space-y-2 max-w-xs">
              <CameraOff className="w-8 h-8 mx-auto text-rose-400" />
              <p className="font-medium">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Coba Kamera Lagi
              </button>
            </div>
          )}

          {!cameraActive && !cameraError && (
            <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-slate-500 animate-spin" />
              <span>Mengaktifkan kamera perangkat...</span>
            </div>
          )}
        </div>

        {/* Detection Status or Fallback */}
        {scannedResult ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>QR Guru Terdeteksi:</span>
            </div>
            <div className="font-mono text-emerald-950 break-all select-all font-semibold bg-white p-2 rounded-lg border border-emerald-200">
              {scannedResult}
            </div>
            <div className="text-[11px] text-emerald-800">
              {isConnecting ? 'Menghubungkan ke simpul guru...' : 'Berhasil terhubung ke Laptop Guru!'}
            </div>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <label htmlFor="manual-host-input" className="font-semibold flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-sky-600" />
                <span>Atau Masukkan IP Laptop Guru:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">contoh: 192.168.43.1:3000</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="manual-host-input"
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="192.168.43.1:3000"
                className="flex-1 px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 text-slate-900"
              />
              <button
                type="submit"
                disabled={isConnecting}
                className="min-h-[38px] px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <span>{isConnecting ? '...' : 'Hubungkan'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
