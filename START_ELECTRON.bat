@echo off
echo.
echo  ====================================================
echo        PrimeSpace - Electron Dev App
echo  ====================================================
echo.
echo  Starting PrimeSpace in Electron...
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

:: Install root deps for Electron tooling
if not exist "node_modules\electron" (
    echo  Installing Electron tooling...
    call npm install
)

echo.
echo  Launching Electron app (dev mode)...
echo.
echo  Backend:  http://localhost:3000
echo  Frontend: http://localhost:5173
echo.

call npm run electron:dev
