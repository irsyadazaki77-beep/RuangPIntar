#!/usr/bin/env bash
set -e

# ================================================================
#           RUANGPINTAR EDGE — SIMPUL SERVER GURU (3T)
#     Launcher Script untuk Linux, macOS, & Raspberry Pi
# ================================================================

echo "================================================================"
echo "          RUANGPINTAR EDGE — SIMPUL SERVER GURU (3T)           "
echo "================================================================"
echo " Platform LMS Terdesentralisasi Offline-First & AI Gateway Lokal"
echo "================================================================"
echo ""

# 1. Periksa Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[0;31m[ERROR] Node.js belum terpasang di sistem ini!\033[0m"
    echo "Silakan pasang Node.js v18+ atau v20+ melalui package manager:"
    echo "  sudo apt update && sudo apt install -y nodejs npm"
    exit 1
fi

# 2. Periksa file .env
if [ ! -f ".env" ]; then
    echo "[*] Menyiapkan file konfigurasi .env dari .env.example..."
    cp .env.example .env
fi

# 3. Deteksi IP LAN aktif secara otomatis
LAN_IP="127.0.0.1"
if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
    LAN_IP=$(hostname -I | awk '{print $1}')
elif command -v ip >/dev/null 2>&1; then
    LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' || echo "127.0.0.1")
elif command -v ifconfig >/dev/null 2>&1; then
    LAN_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1 || echo "127.0.0.1")
fi

PORT=${PORT:-3000}

echo ""
echo "================================================================"
echo " [INFO] PANDUAN KONEKSI SISWA DI RUANG KELAS:"
echo "================================================================"
echo "   1. Alamat IP LAN   : http://${LAN_IP}:${PORT}"
echo "   2. Zero-Config mDNS: http://ruangpintar.local:${PORT}"
echo "   3. Kode QR Kelas   : Buka panel guru untuk menampilkan QR"
echo "================================================================"
echo ""

# 4. Jalankan server
echo "[*] Menjalankan server RuangPintar Edge... Tekan Ctrl+C untuk berhenti."
echo ""
npm run dev
