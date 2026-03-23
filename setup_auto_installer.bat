@echo off
color 0A
echo ==============================================================
echo Installing Paz Wash Station Auto-Updater...
echo ==============================================================
echo.

set "VBS_PATH=%~dp0run_silent.vbs"

echo This will create a Windows Task to run the updater every hour in the background.
echo You will never see a popup window, and it will silently push to GitHub!
echo.

schtasks /create /tn "PazStationUpdater" /tr "wscript.exe \"%VBS_PATH%\"" /sc hourly /f

echo.
echo ==============================================================
echo SUCCESS! Your computer will now update your website every hour.
echo You can close this window.
echo ==============================================================
pause
