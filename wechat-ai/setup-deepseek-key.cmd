@echo off
rem Secure interactive DeepSeek API-key setup for the portable OpenClaw workspace.
call "%~dp0oc.cmd" models auth login --provider deepseek --method api-key --set-default
if errorlevel 1 (
  echo.
  echo Setup did not complete. Review the message above; never paste the key into chat.
) else (
  echo.
  echo DeepSeek API key setup completed.
)
echo.
pause
