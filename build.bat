@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

if exist "%USERPROFILE%\.cargo\bin" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

title Lyra Database Studio - Build Pipeline

echo ===============================================================================
echo                 LYRA DATABASE STUDIO - BUILD AUTOMATION
echo          HavenCore BFA 8.3.7.35662 Open-Source Management Suite
echo ===============================================================================
echo Working Directory: %CD%
echo.

REM 1. Verify Node.js and npm
echo [*] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js v18 or higher from https://nodejs.org/
    goto :FAIL
)

REM 2. Verify Rust and Cargo
echo [*] Checking Rust toolchain...
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Cargo or Rust is not installed or not found in system PATH.
    echo Please install Rust from https://rustup.rs/
    goto :FAIL
)

REM 3. NPM Package Check
if not exist "node_modules\" (
    echo.
    echo [*] Installing NPM packages...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install NPM dependencies.
        goto :FAIL
    )
) else (
    echo [*] Node dependencies verified.
)

REM 4. Build Vite frontend bundle
echo.
echo [*] Compiling React + TypeScript frontend bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    goto :FAIL
)

REM 5. Compile Tauri Native Standalone Executable
echo.
echo [*] Compiling native standalone binary via Tauri v2...
call npx tauri build --no-bundle
if %errorlevel% neq 0 (
    echo [ERROR] Tauri binary compilation failed.
    goto :FAIL
)

REM 6. Locate output executable and copy to bin folder
echo.
echo ===============================================================================
echo                           BUILD SUCCESSFUL!
echo ===============================================================================
if not exist "bin" mkdir "bin"

if exist "src-tauri\target\release\lyra.exe" (
    copy /y "src-tauri\target\release\lyra.exe" "bin\Lyra.exe" >nul
    echo Standalone executable produced at:
    echo   -^> %CD%\bin\Lyra.exe
)

echo.
echo Standalone binary is ready in: %CD%\bin\Lyra.exe
goto :END

:FAIL
echo.
echo ===============================================================================
echo                            BUILD FAILED!
echo ===============================================================================
echo Please review the output above to diagnose the issue.

:END
echo.
echo ===============================================================================
pause
