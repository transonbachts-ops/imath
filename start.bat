@echo off
title H2bmath - Smart Edu ONLINE Server
echo.
echo  ========================================
echo   H2bmath - KICH HOAT CHE DO ONLINE
echo  ========================================
echo.

:: 1. Kiem tra MySQL
echo  [1/3] Kiem tra MySQL (Laragon)...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    echo  [!!] LOI: Hay mo Laragon va nhan Start All truoc!
    pause
    exit /b 1
)
echo  [OK] MySQL dang chay.

:: 2. Kiem tra Node v22
echo  [2/3] Kiem tra Node.js...
SET PATH=C:\laragon\bin\nodejs\node-v22;%PATH%
node -v >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [!!] LOI: Khong tim thay Node-v22 cua Laragon!
    pause
    exit /b 1
)

:: 3. Chay Web Server
echo  [3/3] Dang khoi tao Web Server...
cd /d "%~dp0"
taskkill /F /IM node.exe /T 2>nul
start "H2bmath-Web-Server" /min cmd /c "npm run dev"

echo.
echo  Dang khoi tao server (Vui long cho 5-10 giay)...
timeout /t 5 /nobreak >nul

echo  ----------------------------------------
echo  [KET QUA]
echo  ----------------------------------------

echo  >>> LINK TRUY CAP: http://26.170.136.218:3000/
echo  (Vui long dam bao Radmin VPN dang bat)
echo.
echo  DANG MO TRINH DUYET...
start http://26.170.136.218:3000/

echo.
echo  Nhan phim bat ky de ket thuc (Web van chay).
pause
