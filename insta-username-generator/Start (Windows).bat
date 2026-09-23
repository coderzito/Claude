@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org then run this again. & start https://nodejs.org & pause & exit /b)
start "" http://localhost:3000
node server.js
pause
