@echo off
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

netstat -ano -p tcp | findstr /R /C:"127\.0\.0\.1:18789 .*LISTENING" >nul
if errorlevel 1 start "Achi Gateway" cmd.exe /d /c ""%ROOT%\start.cmd""

netstat -ano -p tcp | findstr /R /C:"127\.0\.0\.1:18790 .*LISTENING" >nul
if errorlevel 1 start "Achi Voice" cmd.exe /d /c ""%ROOT%\start-local-voice.cmd""

endlocal
