@echo off
title La Molienda Cafe Bar - Servidor Web
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ========================================================
echo   Iniciando La Molienda Cafe Bar en http://localhost:5173
echo ========================================================
npm.cmd run dev
pause
