@echo off
cd /d "%~dp0"
if not exist "server.js" (
  echo Can't find server.js. Unzip the whole folder first ^(right-click the zip, Extract All^), then run this file from the unzipped folder.
  pause
  exit /b
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed, or Windows can't find it yet.
  echo Install it from https://nodejs.org . If you just installed it, restart your computer, then run this again.
  start "" https://nodejs.org
  pause
  exit /b
)
echo Starting... keep this window open while you use the app. Close it to stop.
rem Open the browser after the server has had a few seconds to start.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" http://localhost:3000"
node server.js
echo.
echo The app stopped. If you see an error above, send a screenshot of this window.
pause
