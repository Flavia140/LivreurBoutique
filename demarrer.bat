@echo off
chcp 65001 >nul
setlocal
rem Adresse IP du PC sur le Wi-Fi, pour que le telephone joigne le serveur
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress"`) do set IP=%%i
if "%IP%"=="" set IP=localhost
echo Serveur : http://%IP%:8000   Back-office : http://localhost:8000/admin
start "YAKO serveur" cmd /k "cd /d "%~dp0backend" && php artisan serve --host=0.0.0.0 --port=8000"
start "YAKO app" cmd /k "cd /d "%~dp0mobile" && set EXPO_PUBLIC_API_URL=http://%IP%:8000/api/v1&& npx expo start --lan"
