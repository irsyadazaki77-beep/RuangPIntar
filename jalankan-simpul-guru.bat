@echo off
title RuangPintar Edge — Simpul Guru (Server Kelas 3T)
color 0B

echo ================================================================
echo           RUANGPINTAR EDGE — SIMPUL SERVER GURU (3T)
echo ================================================================
echo  Platform LMS Terdesentralisasi Offline-First & AI Gateway Lokal
echo ================================================================
echo.

:: 1. Periksa apakah Node.js terpasang
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js belum terpasang di laptop ini!
    echo Silakan unduh dan pasang Node.js terlebih dahulu dari:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Periksa file .env
if not exist ".env" (
    echo [*] Menyiapkan file konfigurasi .env dari .env.example...
    copy .env.example .env >nul
)

:: 3. Tampilkan IP Lokal Laptop Guru untuk panduan siswa
echo [*] Memeriksa alamat IP lokal LAN laptop guru...
set LOCAL_IP=192.168.43.1
for /f "tokens=4" %%a in ('route print 2^>nul ^| findstr 0.0.0.0.*0.0.0.0') do (
    set LOCAL_IP=%%a
)

echo.
echo ================================================================
echo [INFO] PANDUAN KONEKSI SISWA DI RUANG KELAS:
echo ================================================================
echo   1. Alamat IP LAN   : http://%LOCAL_IP%:3000
echo   2. Zero-Config mDNS: http://ruangpintar.local:3000
echo   3. Kode QR Kelas   : Buka panel guru untuk menampilkan QR
echo ================================================================
echo.

:: 4. Buka browser otomatis setelah 2 detik
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: 5. Jalankan server pengembangan
echo [*] Menjalankan server RuangPintar Edge... Tekan Ctrl+C untuk berhenti.
echo.
npm run dev
