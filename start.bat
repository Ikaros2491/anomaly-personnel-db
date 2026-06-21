@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if not exist "server\node_modules\" (
  echo Installing backend dependencies...
  call npm install --prefix server
  if errorlevel 1 exit /b 1
)

if not exist "server\prisma\dev.db" (
  echo Setting up database...
  call npm run db:setup
  if errorlevel 1 exit /b 1
)

echo Starting ANOREP frontend and API...
call npm run dev:all
