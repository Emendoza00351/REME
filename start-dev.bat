@echo off
chcp 65001

REM Inicia el backend en una ventana nueva
start "REME Backend" cmd /k "cd /d "E:\APLICACIONES WEB\REME\backend" && powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "npm run dev""

REM Inicia el frontend en otra ventana nueva
start "REME Frontend" cmd /k "cd /d "E:\APLICACIONES WEB\REME\frontend" && powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "npm run dev -- --host 0.0.0.0""

echo.
echo Proyecto REME iniciado.
echo Backend: http://localhost:3001

echo Frontend: http://localhost:5173
echo.
echo Cierra estas ventanas cuando quieras parar la app.
exit /b 0
