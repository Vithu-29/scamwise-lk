@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install a supported Node.js LTS version, reopen this file, and try again.
  pause
  exit /b 1
)
start "" http://localhost:8080
node scripts\serve.cjs
pause
