@echo off
chcp 437 >nul
title Escudo de Fe - Instalacion Automatica

echo.
echo =====================================================
echo   ESCUDO DE FE - Instalacion Automatica
echo   Apologetica Catolica con IA
echo =====================================================
echo.
echo Este script configura y publica tu app en internet.
echo Solo necesitas pegar tus claves cuando te las pida.
echo.
pause

:: PASO 1: Verificar Node.js
echo.
echo [1/7] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js no esta instalado.
    echo.
    echo Por favor descargalo e instalalo desde:
    echo https://nodejs.org  ^(version LTS, boton verde^)
    echo.
    echo Despues de instalarlo, cierra esta ventana y
    echo vuelve a ejecutar este script.
    echo.
    pause
    exit /b 1
)
echo OK - Node.js encontrado:
node --version

:: PASO 2: Instalar Wrangler
echo.
echo [2/7] Instalando Wrangler ^(herramienta de Cloudflare^)...
call npm install -g wrangler
if %errorlevel% neq 0 (
    echo ERROR al instalar Wrangler. Verifica tu conexion a internet.
    pause
    exit /b 1
)
echo OK - Wrangler instalado

:: PASO 3: Login en Cloudflare
echo.
echo [3/7] Conectando con tu cuenta de Cloudflare...
echo.
echo Se abrira tu navegador para iniciar sesion en Cloudflare.
echo Si no tienes cuenta, creala GRATIS en: https://cloudflare.com
echo.
echo Presiona cualquier tecla para continuar...
pause >nul
call wrangler login
if %errorlevel% neq 0 (
    echo ERROR al conectar con Cloudflare.
    pause
    exit /b 1
)
echo OK - Sesion de Cloudflare iniciada

:: PASO 4: Preparar archivos
echo.
echo [4/7] Preparando archivos del backend...
if not exist "escudo-de-fe-backend" mkdir escudo-de-fe-backend
cd escudo-de-fe-backend

if exist "..\worker-backend.js" (
    copy "..\worker-backend.js" "worker.js" >nul
    echo OK - Archivo worker.js copiado
) else (
    echo ERROR: No encontre worker-backend.js en esta carpeta.
    echo Asegurate de que este script esta en la misma carpeta
    echo que los archivos descargados de Escudo de Fe.
    pause
    exit /b 1
)

:: PASO 5: Crear KV Namespace
echo.
echo [5/7] Creando almacen de datos en Cloudflare ^(KV^)...
echo.
echo IMPORTANTE: El siguiente comando mostrara una linea con:
echo   id = "abc123..."
echo Necesitaras copiar ese valor en el siguiente paso.
echo.
pause
call wrangler kv:namespace create "ESCUDO_KV"

echo.
echo -------------------------------------------------------
echo Copia el valor del "id" que aparecio arriba.
echo Solo los caracteres entre comillas, sin las comillas.
echo Ejemplo: abc123def456789abcdef
echo -------------------------------------------------------
echo.
set /p KV_ID="Pega aqui el ID del KV y presiona Enter: "

if "%KV_ID%"=="" (
    echo ERROR: No ingresaste el ID del KV.
    pause
    exit /b 1
)

:: Crear wrangler.toml
echo name = "escudo-de-fe-backend"> wrangler.toml
echo main = "worker.js">> wrangler.toml
echo compatibility_date = "2024-09-01">> wrangler.toml
echo.>> wrangler.toml
echo [[kv_namespaces]]>> wrangler.toml
echo binding = "ESCUDO_KV">> wrangler.toml
echo id = "%KV_ID%">> wrangler.toml
echo.>> wrangler.toml
echo [vars]>> wrangler.toml
echo ALLOWED_ORIGIN = "*">> wrangler.toml
echo DAILY_LIMIT = "500">> wrangler.toml
echo PER_IP_LIMIT = "15">> wrangler.toml

echo OK - Configuracion creada correctamente

:: PASO 6: API Key de Anthropic
echo.
echo [6/7] Configurando tu API Key de Anthropic...
echo.
echo Esta clave se guarda CIFRADA en Cloudflare.
echo Nunca queda visible en el codigo.
echo.
echo Obten tu clave en: https://console.anthropic.com
echo ^(Los primeros $5 USD son gratis al crear la cuenta^)
echo.
echo Cuando te pregunte el valor, pega tu API Key y Enter:
echo.
call wrangler secret put ANTHROPIC_API_KEY
if %errorlevel% neq 0 (
    echo ERROR al guardar la API Key.
    pause
    exit /b 1
)
echo OK - API Key guardada de forma segura

:: PASO 7: Publicar
echo.
echo [7/7] Publicando el backend en Cloudflare...
echo.
call wrangler deploy

echo.
echo =====================================================
echo   BACKEND PUBLICADO EXITOSAMENTE
echo =====================================================
echo.
echo Tu URL de backend aparece arriba como:
echo   https://escudo-de-fe-backend.TU-USUARIO.workers.dev
echo.
echo ANOTA ESA URL - la necesitas para el siguiente paso.
echo.
echo ULTIMO PASO MANUAL:
echo Abre el archivo escudo-de-fe.html con el Bloc de notas,
echo busca esta linea:
echo.
echo   const BACKEND_URL = 'https://escudo-de-fe-backend.tu-usuario.workers.dev';
echo.
echo Y reemplaza la URL con la tuya real.
echo.
echo =====================================================
echo.
echo Ahora ejecuta el archivo publicar-github.bat
echo para poner la app en internet.
echo.
pause
