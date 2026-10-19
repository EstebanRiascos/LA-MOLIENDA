@echo off
title La Molienda Cafe Bar - Aplicacion de Escritorio
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ========================================================
echo   Iniciando La Molienda Cafe Bar en modo Escritorio
echo ========================================================
npm.cmd run electron:dev
pause
