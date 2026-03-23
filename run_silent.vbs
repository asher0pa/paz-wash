Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")

' The 0 at the end forces the command prompt window to be completely invisible '
WshShell.Run chr(34) & currentDir & "\run_updater.bat" & chr(34), 0
Set WshShell = Nothing
