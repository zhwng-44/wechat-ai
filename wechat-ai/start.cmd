@echo off
rem ============================================================
rem  Start Achi (the WeChat AI companion)
rem
rem  ASCII-only on purpose: cmd.exe reads .cmd files using the
rem  system ANSI codepage, so Chinese comments would corrupt it.
rem  Chinese docs: see 使用说明.md
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
echo   ==========================================
echo    Achi - WeChat AI companion
echo   ==========================================
echo.
echo   Starting Achi in this window...
echo.
echo   Keep this window open while using Achi.
echo   Press Ctrl+C in this window to stop the Gateway.
echo.

if not exist "%NODE_DIR%\node.exe" (
  echo ERROR: Portable Node was not found at:
  echo   "%NODE_DIR%\node.exe"
  pause
  exit /b 9009
)
if not exist "%ROOT%\npm-global\node_modules\openclaw\openclaw.mjs" (
  echo ERROR: OpenClaw entry point was not found at:
  echo   "%ROOT%\npm-global\node_modules\openclaw\openclaw.mjs"
  pause
  exit /b 9009
)

"%NODE_DIR%\node.exe" "%ROOT%\npm-global\node_modules\openclaw\openclaw.mjs" gateway run
set "GATEWAY_EXIT=%ERRORLEVEL%"
if "%GATEWAY_EXIT%"=="0" goto :done

echo.
echo   Gateway exited with code %GATEWAY_EXIT%.
echo   Check the logs with:
echo     "%ROOT%\oc.cmd" channels logs
echo.
pause

:done
endlocal & exit /b %GATEWAY_EXIT%
