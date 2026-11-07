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
echo [*] Memeriksa alamat IP lokal laptop guru...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0') do (
    set LOCAL_IP=%%a
)
echo.
echo [INFO] Beritahukan siswa di kelas untuk membuka alamat ini di HP mereka:
echo        -----------------------------------------------
echo        URL Kelas: http://%LOCAL_IP%:3000
echo        -----------------------------------------------
echo.

:: 4. Buka browser otomatis setelah 2 detik
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: 5. Jalankan server pengembangan
echo [*] Menjalankan server RuangPintar Edge... Tekan Ctrl+C untuk berhenti.
echo.
npm run dev
