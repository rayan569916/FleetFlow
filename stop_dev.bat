@echo off
echo Stopping Captain Cargo Development Environment...

taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1

echo All processes stopped.
pause
