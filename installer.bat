@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0backend"
echo === Serveur Laravel ===
if not exist .env copy .env.example .env >nul
powershell -NoProfile -Command "(Get-Content .env) -replace '^YAKO_DEMO=.*','YAKO_DEMO=true' -replace '^YAKO_SERVICE_START=.*','YAKO_SERVICE_START=06:00' -replace '^YAKO_SERVICE_END=.*','YAKO_SERVICE_END=23:59' -replace '^ADMIN_PASSWORD=.*','ADMIN_PASSWORD=admin-yako' | Set-Content .env"
call composer install --no-interaction || goto :err
php artisan key:generate --force || goto :err
if not exist database\database.sqlite type nul > database\database.sqlite
php artisan migrate:fresh --seed --force || goto :err
php artisan db:seed --class=DemoSeeder --force || goto :err
php artisan storage:link
cd /d "%~dp0mobile"
echo === App mobile ===
call npm install || goto :err
echo.
echo Installation terminee. Lancez demarrer.bat
pause
exit /b 0
:err
echo.
echo ERREUR pendant l'installation. Copiez le message ci-dessus et envoyez-le.
pause
exit /b 1
