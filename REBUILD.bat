@echo off
echo.
echo  ====================================================
echo        PrimeSpace - Rebuild Desktop App
echo  ====================================================
echo.
echo  Installing dependencies and rebuilding...
echo.

:: Install backend deps
if not exist "backend\node_modules" (
    echo  Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Install frontend deps
if not exist "frontend\node_modules" (
    echo  Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

:: Install root deps
if not exist "node_modules" (
    echo  Installing root dependencies...
    call npm install
)

echo.
echo  Building backend and frontend...
echo.
call npm run build

echo.
echo  Packaging Electron app...
echo.
call npm run electron:pack

echo.
echo  Done!
echo.
pause
