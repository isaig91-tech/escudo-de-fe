@echo off
chcp 437 >nul
title Escudo de Fe - Publicar en GitHub Pages

echo.
echo =====================================================
echo   ESCUDO DE FE - Publicar en GitHub Pages
echo   Tu app en internet, gratis
echo =====================================================
echo.

:: Verificar Git
echo [1/5] Verificando Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Git no esta instalado.
    echo Descargalo en: https://git-scm.com/download/win
    echo Instalalo y vuelve a ejecutar este script.
    pause
    exit /b 1
)
echo OK - Git disponible

:: Pedir datos
echo.
echo [2/5] Datos de tu cuenta de GitHub
echo.
echo Si no tienes cuenta en GitHub, creala GRATIS en:
echo https://github.com/signup
echo.
set /p GH_USER="Tu nombre de usuario de GitHub: "
set /p GH_EMAIL="Tu correo de GitHub: "

if "%GH_USER%"=="" (
    echo ERROR: Debes ingresar tu usuario de GitHub.
    pause
    exit /b 1
)

:: Pedir URL del backend
echo.
echo [3/5] URL de tu backend de Cloudflare
echo.
set /p BACKEND_URL="Pega tu URL de Cloudflare (https://...workers.dev): "

if "%BACKEND_URL%"=="" (
    echo AVISO: Sin URL el modo IA no funcionara online.
    set "BACKEND_URL=https://escudo-de-fe-backend.tu-usuario.workers.dev"
)

:: Verificar que existe el HTML
if not exist "escudo-de-fe.html" (
    echo ERROR: No encuentro escudo-de-fe.html en esta carpeta.
    echo Asegurate de ejecutar este script en la carpeta correcta.
    pause
    exit /b 1
)

:: Actualizar la URL en el HTML usando PowerShell
echo.
echo [4/5] Actualizando la app con tu URL de backend...
powershell -Command "(Get-Content 'escudo-de-fe.html') -replace 'https://escudo-de-fe-backend\.tu-usuario\.workers\.dev', '%BACKEND_URL%' | Set-Content 'escudo-de-fe.html' -Encoding UTF8"
echo OK - URL actualizada en la app

:: Publicar en GitHub
echo.
echo [5/5] Subiendo a GitHub...
echo.

git config --global user.name "%GH_USER%"
git config --global user.email "%GH_EMAIL%"

if not exist ".git" (
    git init
    git checkout -b main 2>nul || git branch -m main
)

copy "escudo-de-fe.html" "index.html" >nul
echo OK - Archivo index.html preparado

echo # Escudo de Fe > README.md
echo Apologetica Catolica con IA - App gratuita para todos los catolicos. >> README.md

git add .
git commit -m "Escudo de Fe v1.0 - Apologetica Catolica IA"

echo.
echo -------------------------------------------------------
echo Ahora crea el repositorio en GitHub:
echo.
echo 1. Se abrira https://github.com/new en tu navegador
echo 2. En "Repository name" escribe:  escudo-de-fe
echo 3. Selecciona PUBLIC
echo 4. NO marques ninguna opcion extra
echo 5. Clic en "Create repository"
echo 6. Copia la URL que aparece (https://github.com/TU-USUARIO/escudo-de-fe.git)
echo -------------------------------------------------------
echo.
echo Presiona cualquier tecla para abrir GitHub...
pause >nul
start https://github.com/new

echo.
set /p REPO_URL="Pega aqui la URL de tu repositorio (.git): "

if "%REPO_URL%"=="" (
    echo ERROR: No ingresaste la URL del repositorio.
    pause
    exit /b 1
)

git remote remove origin 2>nul
git remote add origin "%REPO_URL%"
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo Si te pide contrasena de GitHub, NO uses tu contrasena normal.
    echo Debes usar un Token de acceso personal:
    echo.
    echo 1. Ve a https://github.com/settings/tokens/new
    echo 2. En "Note" escribe: escudo-de-fe
    echo 3. Marca la casilla "repo"
    echo 4. Clic "Generate token"
    echo 5. Copia el token y usalo como contrasena
    echo.
    start https://github.com/settings/tokens/new
    pause
    git push -u origin main
)

echo.
echo =====================================================
echo   APP PUBLICADA EN GITHUB
echo =====================================================
echo.
echo ULTIMO PASO - Activar GitHub Pages:
echo.
echo 1. Ve a tu repositorio en GitHub
echo 2. Clic en la pestana "Settings"
echo 3. En el menu izquierdo busca "Pages"
echo 4. En "Branch" selecciona "main" y clic "Save"
echo 5. En 1-2 minutos tu app estara en:
echo.
echo    https://%GH_USER%.github.io/escudo-de-fe
echo.
echo =====================================================
echo.
set /p OPEN="Abrir tu repositorio en GitHub ahora? (S/N): "
if /i "%OPEN%"=="S" (
    set "REPO_WEB=%REPO_URL:.git=%"
    start "" "%REPO_WEB%"
)

echo.
echo Ad Maiorem Dei Gloriam
echo.
pause
