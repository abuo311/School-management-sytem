# Deployment Guide: School Management System

## Railway MySQL Connection Details
- Database: school_management
- User: root
- Host: ${{RAILWAY_PRIVATE_DOMAIN}} (internal)
- Port: 3306
- Password: ${{MYSQL_ROOT_PASSWORD}} (Railway managed)

## Deployment Steps

### 1. Install Git (if not already installed)
Download from: https://git-scm.com/download/win
Restart PowerShell after installation.

### 2. Initialize Git Repository
```powershell
cd C:\Users\Abuo_Bernard\Desktop\Spring_Boot_Projects\School-management-sytem

git init
git add .
git commit -m "Initial commit: School Management System with Railway MySQL"
```

### 3. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `School-management-sytem`
3. Make it Public
4. Click "Create repository"
5. Copy the HTTPS URL

### 4. Push to GitHub
```powershell
git remote add origin https://github.com/abuobernard/School-management-sytem.git
git branch -M main
git push -u origin main
```

### 5. Deploy on Render
1. Go to https://render.com
2. Sign in with GitHub
3. Click "New +" → "Web Service"
4. Select your repository
5. Configure:
   - Name: school-management-backend
   - Environment: Docker
   - Region: Oregon (or closest)
   - Branch: main
   - Plan: Free
6. Click "Create Web Service"

### 6. Add Environment Variables (After deployment starts)
Go to your Render service dashboard:
1. Click "Environment" tab
2. Add these environment variables:

SPRING_DATASOURCE_URL=jdbc:mysql://${{RAILWAY_PRIVATE_DOMAIN}}:3306/school_management?useSSL=false&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=${{MYSQL_ROOT_PASSWORD}}
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SERVER_PORT=8080

3. Click "Deploy" to rebuild with environment variables

### 7. Test Your Application
Once deployed:
- Render will give you a URL: https://school-management-backend-XXXX.onrender.com
- Try: https://school-management-backend-XXXX.onrender.com/login

## Local Testing (Optional)
To test with Railway MySQL locally:
1. Get your Railway MySQL public URL from Variables tab
2. Update application.properties with public URL
3. Run: mvn spring-boot:run

## Notes
- Free tier services sleep after 15 minutes inactivity
- Suitable for demo/testing, not production
- MySQL database stays up 24/7 on free tier
