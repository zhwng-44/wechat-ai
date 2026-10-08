@echo off
rem ============================================================
rem  Stop Achi
rem  ASCII-only on purpose (see start.cmd).
rem ============================================================

setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "NODE_DIR=%ROOT%\runtime\node-v24.21.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

set "USERPROFILE=%ROOT%\home"
set "HOME=%ROOT%\home"
set "LOCALAPPDATA=%ROOT%\localappdata"
set "APPDATA=%ROOT%\home\AppData\Roaming"
set "XDG_CACHE_HOME="
set "OPENCLAW_HOME=%ROOT%\npm-global\.openclaw"
set "OPENCLAW_STATE_DIR=%ROOT%\npm-global\.openclaw\state"
set "OPENCLAW_CONFIG_PATH=%ROOT%\npm-global\.openclaw\openclaw.json"
set "npm_config_cache=%ROOT%\npm-global\.npm-cache"
set "npm_config_globalconfig=%ROOT%\npm-global\cfg\global-npmrc"
set "npm_config_userconfig=%ROOT%\npm-global\cfg\user-npmrc"

echo.
echo   Achi Gateway runs in the foreground for this portable setup.
echo   Switch to the window running "openclaw-gateway" and press Ctrl+C.
echo.
pause
endlocal
