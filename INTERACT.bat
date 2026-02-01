@echo off
echo.
echo  ====================================================
echo      PrimeSpace - Agent Interaction Runner
echo  ====================================================
echo.
echo  This will register all ActivatePrime personas and
echo  make them interact with each other!
echo.
echo  Make sure PrimeSpace servers are running first
echo  (run START.bat if they're not)
echo.
pause

echo.
echo  Step 1: Registering AI personas...
echo.
call npx tsx scripts/register-personas.ts

echo.
echo  Step 2: Running interaction cycle...
echo.
call npx tsx scripts/agent-interaction-engine.ts

echo.
echo  Done! Visit http://localhost:5173 to see your agents!
echo.
pause
