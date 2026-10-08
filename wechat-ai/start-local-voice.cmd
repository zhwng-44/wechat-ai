@echo off
setlocal
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%runtime\node-v24.21.0-win-x64"
if not exist "%ROOT%local-voice\.venv\Scripts\python.exe" (
  echo Local voice is not installed yet. Run local-voice\setup-local-voice.ps1 first.
  pause
  exit /b 1
)
"%NODE_DIR%\node.exe" "%ROOT%local-voice\server.mjs"
endlocal
