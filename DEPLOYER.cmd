@echo off
chcp 65001 >nul
title Kaluta Society - deploiement vers kinjy.com
cd /d "%~dp0"

echo.
echo ==========================================================
echo   KALUTA SOCIETY - deploiement vers kinjy.com
echo ==========================================================
echo.
echo   Serveur : root@<your-server>
echo   Domaine : https://kinjy.com (SSL automatique)
echo.
echo   Le mot de passe root vous sera demande UNE SEULE FOIS,
echo   pour installer votre cle SSH. Rien ne s'affiche pendant
echo   la frappe : c'est normal, tapez puis Entree.
echo.
echo   Tout le reste est automatique. Comptez 5 a 15 minutes
echo   pour la premiere fois (construction des images).
echo.
echo ==========================================================
echo.
echo   Demarrage dans 3 secondes...
timeout /t 3 /nobreak >nul

set "GITBASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%GITBASH%" set "GITBASH=C:\Program Files (x86)\Git\bin\bash.exe"
if not exist "%GITBASH%" (
  echo.
  echo   ERREUR : Git Bash est introuvable.
  echo   Installez Git pour Windows : https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

REM -l pour charger l'environnement, -c pour executer. Le chemin est converti
REM au format POSIX par Git Bash lui-meme via /c/...
"%GITBASH%" -lc "cd \"$(cygpath -u '%CD%')\" && bash bootstrap.sh"

echo.
echo ==========================================================
echo   Termine. La fenetre reste ouverte pour que vous puissiez
echo   lire le resultat et me le transmettre.
echo ==========================================================
echo.
pause
