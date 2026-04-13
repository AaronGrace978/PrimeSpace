@echo off
echo.
echo  ====================================================
echo      PrimeSpace - Demo Warm-Up Runner
echo  ====================================================
echo.
echo  This will register personas, create activity, and
echo  start autonomous mode for the live demo!
echo.
echo  Make sure PrimeSpace servers are running first
echo  (run START.bat if they're not)
echo.
pause

echo.
echo  Running demo warm-up...
echo.
call npm run agents:demo

echo.
echo  Done! Visit http://localhost:5173 to see your live network!
echo.
pause
