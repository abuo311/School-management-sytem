@echo off
setlocal

title School Management System - Local Portal
cls

echo ===================================================================
echo              SCHOOL MANAGEMENT SYSTEM - LOCAL RUNNER
echo ===================================================================
echo.

cd /d "%~dp0"

:: --- STEP 1: Verify Java (Required for Backend) ---
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Java JDK is not installed or not added to your PATH!
    echo Please install JDK 17 or higher to run the Spring Boot backend.
    echo.
    pause
    exit /b
)

:: --- STEP 2: Verify Node.js (Required for Frontend) ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/ to run the frontend.
    echo.
    pause
    exit /b
)

set BACKEND_DIR=%~dp0School-backend
set BACKEND_JAR=%BACKEND_DIR%\target\School-management-sytem-0.0.1-SNAPSHOT.jar
set FRONTEND_DIR=%~dp0School-frontend\School-frontend
set FRONTEND_DIST=%FRONTEND_DIR%\dist

:: --- STEP 3: Package Spring Boot Backend if needed ---
echo [1/3] Preparing Spring Boot backend package...
if not exist "%BACKEND_JAR%" (
    echo [Backend] JAR not found. Building backend package...
    cd /d "%BACKEND_DIR%"
    if exist mvnw.cmd (
        call mvnw.cmd -DskipTests package
    ) else (
        call mvn -DskipTests package
    )
    if errorlevel 1 (
        echo [ERROR] Backend packaging failed.
        pause
        exit /b
    )
) else (
    echo [Backend] Found packaged backend jar.
)

:: --- STEP 4: Package React Frontend if needed ---
echo [2/3] Preparing frontend production bundle...
if not exist "%FRONTEND_DIST%" (
    echo [Frontend] dist folder not found. Installing dependencies and building frontend...
    cd /d "%FRONTEND_DIR%"
    call npm install --no-fund --no-audit
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Frontend build failed.
        pause
        exit /b
    )
) else (
    echo [Frontend] Found production bundle.
)

:: --- STEP 5: Launch packaged services ---
echo [3/3] Starting packaged services...
start "School System - Backend" cmd /k "cd /d "%BACKEND_DIR%" && java -jar target\School-management-sytem-0.0.1-SNAPSHOT.jar"
start "School System - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run preview -- --host 0.0.0.0 --port 4173"
start "" http://localhost:4173

echo.
echo ===================================================================
echo  SUCCESS: Local packaged app is starting in separate windows!
echo  
echo  - Backend API: http://localhost:8080/api
echo  - Frontend UI: http://localhost:4173
echo.
echo  Note: Make sure your local MySQL server is running on port 3306!
echo ===================================================================
endlocal
pause