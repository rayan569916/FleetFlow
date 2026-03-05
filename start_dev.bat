@echo off
echo ==========================================
echo   Starting FleetFlow Development Environment
echo ==========================================

echo.
echo [0/2] Cleaning up previous processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1

echo.
echo [1/2] Starting Backend Server (Flask)...
start "Captain Cargo Backend" cmd /k "cd backend && python app.py"

echo.
echo [2/2] Starting Frontend Server (Angular)...
echo Note: This may take a moment to compile.
start "Captain Cargo Frontend" cmd /k "cd fleetflow-dashboard && npm start"

echo.
echo ==========================================
echo   Servers are starting in new windows.
echo   Frontend: http://localhost:4200
echo   Backend:  http://127.0.0.1:5000
echo ==========================================
pause
