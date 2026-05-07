@echo off
setlocal

cd /d "%~dp0"

if "%~1"=="" (
    echo Usage: git.bat "Commit message"
    exit /b 1
)

set "COMMIT_MSG=%*"

git.exe status
if errorlevel 1 exit /b 1

git.exe add .
if errorlevel 1 exit /b 1

git.exe commit -m "%COMMIT_MSG%"
if errorlevel 1 exit /b 1

git.exe pull --rebase
if errorlevel 1 exit /b 1

git.exe push
if errorlevel 1 exit /b 1

echo Done.
