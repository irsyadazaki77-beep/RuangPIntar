import React, { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  CameraOff,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X,
  Smartphone,
} from 'lucide-react';

interface NetworkInfoResponse {
  ok: boolean;
  primaryIp: string;
  allIps: string[];
  port: number;
  mdnsHost: string;
  lanUrl: string;
  mdnsUrl: string;
  hostname: string;
}

interface Props {
  className?: string;
}

export const HostQrConnector: React.FC<Props> = ({ className = '' }) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoResponse | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Student QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Fetch host network IP addresses from backend
  const fetchNetworkInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/host/network-info');
      if (res.ok) {
        const data: NetworkInfoResponse = await res.json();
        setNetworkInfo(data);
        const initialUrl = data.lanUrl || `http://${window.location.host}`;
        setSelectedUrl(initialUrl);
      } else {
        const fallbackUrl = `http://${window.location.host}`;
        setSelectedUrl(fallbackUrl);
      }
    } catch {
      const fallbackUrl = `http://${window.location.host}`;
      setSelectedUrl(fallbackUrl);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  // Generate dynamic QR Code when selected URL changes
  useEffect(() => {
    if (!selectedUrl) return;

    let mounted = true;
    void QRCode.toDataURL(selectedUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (mounted) setQrDataUrl(url);
    });

    return () => {
      mounted = false;
    };
  }, [selectedUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(selectedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Start Camera QR Scanner
  const startScanner = async () => {
    setIsScannerOpen(true);
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
        scanQrLoop();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Kamera tidak dapat diakses atau izin ditolak oleh peramban.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

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
    setIsScannerOpen(false);
  }, []);

  const scanQrLoop = () => {
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
      setScannedResult(code.data);
      // Valid QR code found
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanQrLoop);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className={`bg-[#FFFDF8] rounded-2xl border border-[#DED4BE] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-[#EFE9DC]/70 border-b border-[#DED4BE] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#163A5F] text-[#FFFDF8]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-[#17232F]">
              Konektivitas Zero-Config (QR Code &amp; mDNS Discovery)
            </h3>
            <p className="text-xs text-[#4A5562]">
              Siswa cukup memindai QR Code atau membuka <span className="font-mono text-[#163A5F] font-semibold">ruangpintar.local</span> tanpa kuota internet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchNetworkInfo}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
            title="Muat ulang status alamat IP"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={startScanner}
            className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-100/90 hover:bg-sky-200/90 border border-sky-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-sky-700" />
            <span>Pindai QR Siswa</span>
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* QR Code Canvas */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code Simpul Guru"
              className="w-48 h-48 rounded-lg shadow-xs border border-slate-300 bg-white p-2"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-slate-200 rounded-lg animate-pulse text-slate-500 text-xs">
              Membuat QR Code...
            </div>
          )}
          <span className="mt-3 text-[11px] font-mono font-medium text-slate-600 text-center">
            Pindai dengan kamera ponsel siswa
          </span>
        </div>

        {/* Network & LAN IP Configuration */}
        <div className="md:col-span-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-sky-600" />
              <span>Pilih Alamat Akses Kelas LAN:</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {networkInfo?.allIps?.map((ip) => {
                const url = `http://${ip}:${networkInfo.port}`;
                const isSelected = selectedUrl === url;
                return (
                  <button
                    key={ip}
                    type="button"
                    onClick={() => setSelectedUrl(url)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    LAN IPv4: {ip}
                  </button>
                );
              })}
              {networkInfo?.mdnsHost && (
                <button
                  type="button"
                  onClick={() => setSelectedUrl(`http://${networkInfo.mdnsHost}:${networkInfo.port}`)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    selectedUrl === `http://${networkInfo.mdnsHost}:${networkInfo.port}`
                      ? 'bg-teal-600 text-white border-teal-600 font-semibold shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-teal-800 border-teal-200'
                  }`}
                >
                  mDNS: {networkInfo.mdnsHost}
                </button>
              )}
            </div>
          </div>

          {/* Active URL bar */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-mono text-slate-700 flex-1 truncate font-medium select-all">
              {selectedUrl || 'Memeriksa konfigurasi jaringan...'}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Salin URL</span>
                </>
              )}
            </button>
          </div>

          {/* Operational Guidance Card */}
          <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl text-xs text-sky-950 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-sky-600" />
              <span>Panduan Kelas Luar Jaringan (Zero-Config 3T):</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              1. Pastikan laptop guru menyalakan Mobile Hotspot / Wi-Fi lokal desa.<br />
              2. Sambungkan ponsel/laptop siswa ke Wi-Fi yang sama tanpa perlu koneksi internet.<br />
              3. Siswa cukup membuka kamera untuk memindai QR di atas atau mengetikkan alamat URL kelas.
            </p>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal for Students */}
      {isScannerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-scanner-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-600" />
                <h3 id="qr-scanner-title" className="text-base font-bold text-slate-900">
                  Pemindai QR Simpul Guru
                </h3>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Arahkan kamera ke QR Code yang terpampang di laptop Simpul Guru untuk langsung tersambung otomatis.
            </p>

            {/* Video Viewport */}
            <div className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlay */}
              {cameraActive && !scannedResult && (
                <div className="absolute inset-8 border-2 border-dashed border-sky-400/80 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                  <div className="w-4 h-4 bg-sky-400 rounded-full" />
                </div>
              )}

              {cameraError && (
                <div className="p-4 text-center text-rose-300 text-xs space-y-2">
                  <CameraOff className="w-8 h-8 mx-auto text-rose-400" />
                  <p>{cameraError}</p>
                </div>
              )}
            </div>

            {/* Scanned Result / Manual Fallback */}
            {scannedResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Simpul Guru Terdeteksi:</span>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-950 break-all select-all">
                  {scannedResult}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={scannedResult}
                    className="flex-1 py-2 text-center text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Buka URL Simpul Guru</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedResult(null);
                      scanQrLoop();
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Pindai Ulang
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500 text-center">
                  Atau masukkan URL host secara manual:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue="http://ruangpintar.local:3000"
                    id="manual-url-input"
                    className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('manual-url-input') as HTMLInputElement;
                      if (input?.value) window.location.href = input.value;
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100"
                  >
                    Buka
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
