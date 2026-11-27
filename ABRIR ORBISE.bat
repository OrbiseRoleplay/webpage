@echo off
title ORBISE ROLEPLAY
cd /d "%~dp0"
if not exist node_modules call npm.cmd install
echo Preparando ORBISE...
call npm.cmd run build
if errorlevel 1 (echo Error al preparar la app. & pause & exit /b 1)
rem Se abre en Edge como ventana de aplicación (Opera GX no permite instalar apps web)
start "" msedge --app=http://localhost:5173 || start "" http://localhost:5173
echo ORBISE ROLEPLAY en marcha. Deja esta ventana abierta mientras juegas.
call npx.cmd vite preview --port 5173 --strictPort
