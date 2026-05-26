@echo off
echo Starting Backend Server...
start "Backend" cmd /k "cd server && npm start"

echo Starting Frontend Server...
start "Frontend" cmd /k "npm run dev"

echo Both servers are starting in new windows!
