@echo off
rem Sign in this local OpenClaw agent to ChatGPT/Codex for Talk GPT-Live.
call "%~dp0oc.cmd" models auth login --provider openai --device-code
if errorlevel 1 (
  echo.
  echo Talk sign-in did not complete. Review the message above.
) else (
  echo.
  echo Talk sign-in completed.
)
echo.
pause
