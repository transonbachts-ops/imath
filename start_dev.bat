@echo off
title iMath - DEV SERVER
SET "NODE_PATH=C:\laragon\bin\nodejs\node-v22"
SET "PATH=%NODE_PATH%;%PATH%"
cd /d "%~dp0"

echo [!] Tu dong giai phong port 3000...
taskkill /F /IM node.exe /T 2>nul 

echo [+] Dang khoi chay DEV...
call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo [!!] Co loi xay ra.
    pause
)
