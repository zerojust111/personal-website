@echo off
rem Flappy Bird Remastered launcher (Jiang Yucheng, 126090293)
rem Starts a tiny local server and opens the game in your browser.
rem Close this black window to stop the server.
cd /d "%~dp0"
start "" cmd /c "timeout /t 1 /nobreak >nul & start """" http://127.0.0.1:8123/index.html"
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8123 --bind 127.0.0.1
  goto :eof
)
python -m http.server 8123 --bind 127.0.0.1
