@echo off
title Subir La Molienda a GitHub
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%PATH%"
echo ========================================================
echo   SUBIENDO PROYECTO LA MOLIENDA A GITHUB
echo   Repositorio: https://github.com/EstebanRiascos/LA-MOLIENDA.git
echo ========================================================
echo.
git push -u origin main
echo.
echo ========================================================
echo Proceso finalizado. Puedes presionar cualquier tecla para cerrar.
echo ========================================================
pause
