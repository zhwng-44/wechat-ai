# 阿池启动器 / openclaw 包装脚本（PowerShell 版）
#
# 与 oc.cmd 等价，给 PowerShell 用。作用是把 OpenClaw 的所有路径
# 重定向到本目录内，避开系统目录写入限制，并把 Node 24 放进 PATH。
#
# 用法:
#   .\oc.ps1 channels list
#   .\oc.ps1 gateway status
#   .\oc.ps1 --version
#
# 如果提示脚本被禁止运行，先执行:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$ErrorActionPreference = 'Continue'
$ROOT = $PSScriptRoot

$NODE_DIR = Join-Path $ROOT 'runtime\node-v24.21.0-win-x64'
$env:PATH = "$NODE_DIR;" + $env:PATH

# openclaw 在 Windows 上用 os.homedir()\AppData\Local\OpenClaw\locks 存锁文件，
# 所以必须把「家目录」也重定向进工作区。
$env:USERPROFILE = Join-Path $ROOT 'home'
$env:HOME = Join-Path $ROOT 'home'

# openclaw resolves its sqlite staging / temp cache from LOCALAPPDATA on
# Windows (env.LOCALAPPDATA), so that has to be redirected as well.
$env:LOCALAPPDATA = Join-Path $ROOT 'localappdata'
$env:APPDATA = Join-Path $ROOT 'home\AppData\Roaming'
$env:XDG_CACHE_HOME = ''

$env:OPENCLAW_HOME = Join-Path $ROOT 'npm-global\.openclaw'
$env:OPENCLAW_STATE_DIR = Join-Path $ROOT 'npm-global\.openclaw\state'
$env:OPENCLAW_CONFIG_PATH = Join-Path $ROOT 'npm-global\.openclaw\openclaw.json'

$env:npm_config_cache = Join-Path $ROOT 'npm-global\.npm-cache'
$env:npm_config_globalconfig = Join-Path $ROOT 'npm-global\cfg\global-npmrc'
$env:npm_config_userconfig = Join-Path $ROOT 'npm-global\cfg\user-npmrc'

$node = Join-Path $NODE_DIR 'node.exe'
$entry = Join-Path $ROOT 'npm-global\node_modules\openclaw\openclaw.mjs'

& $node $entry @args
exit $LASTEXITCODE
