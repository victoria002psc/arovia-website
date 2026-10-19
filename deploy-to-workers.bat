@echo off
title Deploy Arovia to Cloudflare Worker (white-dew-cf00)
color 0A
echo =========================================================================
echo    AROVIA HEALTHCARE - DEPLOY TO CLOUDFLARE WORKER
echo    Target: https://white-dew-cf00.niveditakari1208.workers.dev
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/3] Syncing latest website files, CSS, JS, and images into dist/...
call node sync-dist.js
if %errorlevel% neq 0 (
    echo [ERROR] Failed to sync files. Please ensure Node.js is installed.
    pause
    exit /b %errorlevel%
)
echo.

echo [2/3] Checking Cloudflare Authentication...
call npx wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ---------------------------------------------------------------------
    echo  You need to log in to Cloudflare.
    echo  A browser window will open now. Please click "Allow" to authenticate.
    echo ---------------------------------------------------------------------
    echo.
    call npx wrangler login
    if %errorlevel% neq 0 (
        echo [ERROR] Login failed or was cancelled.
        pause
        exit /b %errorlevel%
    )
) else (
    echo Authenticated with Cloudflare!
)
echo.

echo [3/3] Uploading 194 website files and assets to white-dew-cf00...
call npx wrangler deploy
if %errorlevel% neq 0 (
    echo [ERROR] Deployment failed. Check the error message above.
    pause
    exit /b %errorlevel%
)

echo.
echo =========================================================================
echo  SUCCESS! Your website is live at:
echo  https://white-dew-cf00.niveditakari1208.workers.dev
echo =========================================================================
echo.
pause
