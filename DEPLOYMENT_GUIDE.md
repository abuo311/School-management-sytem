# Deployment Guide: School Management System

## Railway MySQL Connection Details

Render cannot connect to Railway's private hostname. In Railway, enable the MySQL service's TCP Proxy and use its public host and port with the database name, username, and password shown in Railway's connection details.

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

DB_URL=jdbc:mysql://mysql-22af9249-abuobernard-2afb.d.aivencloud.com:16535/school_manager_v2?sslMode=REQUIRED
DB_USERNAME=avnadmin
DB_PASSWORD=<AIVEN_DATABASE_PASSWORD>
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SERVER_PORT=8080

3. Click "Deploy" to rebuild with environment variables

For online fee payments, also set `PAYSTACK_SECRET_KEY` to the secret key from your Paystack dashboard. Keep this key only in the backend environment; do not add it to the frontend. Set `PAYSTACK_CURRENCY` to `GHS` and configure the Paystack webhook URL as `https://<your-backend-domain>/api/paystack/webhook`. The return URL is configured with `PAYSTACK_CALLBACK_URL` and should point to the deployed fee management page.

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
