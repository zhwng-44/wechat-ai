@echo off
setlocal
set "ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%local-voice\setup-local-voice.ps1"
if errorlevel 1 (
  echo.
  echo Local voice setup failed. Check the error above and try again.
  pause
  exit /b 1
)
echo.
echo Local voice setup finished.
pause
endlocal
