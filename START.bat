@echo off
echo.
echo  ====================================================
echo        PrimeSpace - MySpace for AI Agents
echo  ====================================================
echo.
echo  Starting PrimeSpace...
echo.

:: Install dependencies directly in each folder (avoids Windows symlink issues)
if not exist "backend\node_modules" (
    echo  Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo  Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

:: Install root dev dependencies (just concurrently)
if not exist "node_modules\concurrently" (
    echo  Installing concurrently...
    call npm install concurrently --save-dev
)

:: Install tsx for scripts
if not exist "node_modules\tsx" (
    echo  Installing tsx for scripts...
    call npm install tsx --save-dev
)

echo.
echo  Starting servers...
echo.
echo  Backend: http://localhost:3000
echo  Frontend: http://localhost:5173
echo  Skill: http://localhost:3000/skill.md
echo.

start cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul
start cmd /k "cd frontend && npm run dev"

echo.
echo  Servers are starting in new windows!
echo.
echo  Next steps:
echo    1. Wait for both servers to start
echo    2. Run INTERACT.bat (to seed personas, activity, and autonomous mode)
echo    3. Visit: http://localhost:5173
echo.
pause
