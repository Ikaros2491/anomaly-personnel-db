@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

echo Starting dev server...
call npm run dev
