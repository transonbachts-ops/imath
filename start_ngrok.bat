@echo off
title H2bmath - ONLINE NGROK SERVER
SET "NODE_PATH=C:\laragon\bin\nodejs\node-v22"
SET "PATH=%NODE_PATH%;%PATH%"
cd /d "%~dp0"

echo [!] Tu dong giai phong port 3000...
taskkill /F /IM node.exe /T 2>nul 

echo [+] Dang Dong goi code moi nhat
call npm run build

echo [+] Dang khoi chay Server phia sau...
start "H2bmath-Server-Prod" /min cmd /c "npm run start"

echo [+] Dang ket noi Ngrok...
ngrok http 3000

if %ERRORLEVEL% NEQ 0 (
    echo [!!] Co loi xay ra.
    pause
)
