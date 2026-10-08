@echo off
rem ============================================================
rem  openclaw wrapper script (Windows batch)
rem
rem  Redirects every OpenClaw path into this folder so that
rem  nothing needs to be written to system directories, and
rem  puts the portable Node 24 at the front of PATH.
rem
rem  NOTE: ASCII-only on purpose. cmd.exe reads .cmd files using
rem  the system ANSI codepage, so non-ASCII comments corrupt the
rem  script. Chinese docs live in README-zh.md instead.
rem
rem  Usage:  oc.cmd <openclaw args>
rem  e.g.    oc.cmd channels list
rem          oc.cmd gateway status
rem          oc.cmd --version
rem ============================================================

setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

rem --- portable Node 24 (the system Node 22 is too old for openclaw) ---
set "NODE_DIR=%ROOT%\runtime\node-v24.21.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

rem --- openclaw stores lock files under
rem     os.homedir()\AppData\Local\OpenClaw\locks on Windows,
rem     so the home directory has to be redirected too ---
set "USERPROFILE=%ROOT%\home"
set "HOME=%ROOT%\home"

rem --- openclaw resolves its sqlite staging / temp cache from
rem     LOCALAPPDATA on Windows (env.LOCALAPPDATA), so redirect it ---
set "LOCALAPPDATA=%ROOT%\localappdata"
set "APPDATA=%ROOT%\home\AppData\Roaming"
set "XDG_CACHE_HOME="

rem --- openclaw state and config ---
set "OPENCLAW_HOME=%ROOT%\npm-global\.openclaw"
set "OPENCLAW_STATE_DIR=%ROOT%\npm-global\.openclaw\state"
set "OPENCLAW_CONFIG_PATH=%ROOT%\npm-global\.openclaw\openclaw.json"

rem --- npm must be redirected as well, or it writes to the system cache ---
set "npm_config_cache=%ROOT%\npm-global\.npm-cache"
set "npm_config_globalconfig=%ROOT%\npm-global\cfg\global-npmrc"
set "npm_config_userconfig=%ROOT%\npm-global\cfg\user-npmrc"

"%NODE_DIR%\node.exe" "%ROOT%\npm-global\node_modules\openclaw\openclaw.mjs" %*

endlocal
