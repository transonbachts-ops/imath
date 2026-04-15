@echo off
title iMath - Smart Edu Server
echo.
echo  ========================================
echo   iMath Smart Edu - Starting Dev Server
echo  ========================================
echo.
echo  [1/2] Checking MySQL (Laragon)...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if %ERRORLEVEL% == 0 (
    echo  [OK] MySQL is running.
) else (
    echo  [!!] MySQL is NOT running! Please open Laragon and click "Start All" first.
    pause
    exit /b 1
)

echo.
echo  [2/2] Starting Next.js Dev Server...
echo  => Website: http://localhost:3000
echo  => Press Ctrl+C to stop the server
echo.
SET PATH=C:\laragon\bin\nodejs\node-v22;%PATH%
cd /d "%~dp0"
"C:\laragon\bin\nodejs\node-v22\npm.cmd" run dev
pause
