@echo off
echo Running Paz Wash Stations Updater...
pwsh.exe -ExecutionPolicy Bypass -File "%~dp0update_stations.ps1"

echo.
echo Pushing updated data to GitHub live server...
git add "%~dp0stations.js"
git commit -m "Auto-update stations data (Local Runner) 🚀"
git push

echo.
echo Update Complete! Your live website will automatically refresh online shortly.
