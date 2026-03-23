@echo off
echo Running Wash Stations Updater...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0update_stations.ps1"
echo Done!
