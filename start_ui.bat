@echo off
title Notes Saver - Master-Detail UI
cd /d "%~dp0"

echo ========================================================
echo   Launching Notes Saver - Master-Detail Split View UI
echo ========================================================

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Starting with Node.js...
    start http://localhost:3000
    node server.js
    goto end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Starting with Python...
    start http://localhost:3000
    python server.py
    goto end
)

echo No Node.js or Python found in PATH. Opening static UI directly in browser...
start index.html

:end
