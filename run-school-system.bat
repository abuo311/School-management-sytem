@echo off
title School Management System - Local Portal
cls

echo ===================================================================
echo              SCHOOL MANAGEMENT SYSTEM - LOCAL RUNNER
echo ===================================================================
echo.

:: --- STEP 1: Verify Java (Required for Backend) ---
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java JDK is not installed or not added to your PATH!
    echo Please install JDK 17 or higher to run the Spring Boot backend.
    echo.
    pause
    exit /b
)

:: --- STEP 2: Verify Node.js (Required for Frontend) ---
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/ to run the frontend.
    echo.
    pause
    exit /b
)

:: --- STEP 3: Handle Spring Boot Backend ---
echo [1/2] Preparing Spring Boot Backend...
cd School-backend

:: Start backend using Maven Wrapper (avoids needing local Maven installed)
if exist mvnw.cmd (
    echo [Backend] Starting Spring Boot via Maven Wrapper...
    start "School System - Backend (Port 8080)" cmd /k "mvnw.cmd spring-boot:run"
) else if exist gradlew.bat (
    echo [Backend] Starting Spring Boot via Gradle Wrapper...
    start "School System - Backend (Port 8080)" cmd /k "gradlew.bat bootRun"
) else (
    echo [WARNING] No Wrapper found. Attempting to run via global Maven...
    start "School System - Backend (Port 8080)" cmd /k "mvn spring-boot:run"
)

cd ..
echo.

:: --- STEP 4: Handle Vite React Frontend ---
echo [2/2] Preparing React-Vite Frontend...
:: Navigating into the nested frontend directory
cd School-frontend\School-frontend

:: Check if node_modules exists; if not, automatically install packages
if not exist node_modules (
    echo [Frontend] "node_modules" not found. Installing all packages...
    echo (This may take 1-2 minutes on the first run...)
    call npm install
)

echo [Frontend] Starting Vite Development Server...
:: Runs Vite dev server and forces it to open the browser automatically
start "School System - Frontend" cmd /k "npm run dev -- --open"

cd ..\..
echo.
echo ===================================================================
echo  SUCCESS: Both systems are spinning up in separate windows!
echo  
echo  - Backend API: http://localhost:8080/api
echo  - Frontend Client: (Check the browser tab that opens up!)
echo.
echo  Note: Make sure your local MySQL server is running on port 3306!
echo ===================================================================
pause