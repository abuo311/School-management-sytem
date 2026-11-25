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
SPRING_MAIL_USERNAME=<SMTP sender email>
SPRING_MAIL_PASSWORD=<new SMTP app password>
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
ARKESEL_API_KEY=<new Arkesel API key>
ARKESEL_SENDER_ID=<approved Arkesel sender ID>
ARKESEL_API_URL=https://sms.arkesel.com/sms/api

3. Click "Deploy" to rebuild with environment variables

For Gmail, use a newly generated Google App Password (not your normal account password). If you use another email provider, set its SMTP host and port instead. Register and get approval for the sender ID in Arkesel before sending messages, and ensure the account has SMS credit. Keep all passwords and API keys in Render's Environment settings, never in source control or chat.

The previous SMTP and Arkesel credentials were present in tracked configuration. Treat them as compromised: revoke/rotate them before deployment. Removing them from the current source does not remove them from existing Git history.

For online fee and subscription payments, set `PAYSTACK_SECRET_KEY` in the Render backend environment to the secret key from your Paystack dashboard. Keep this key only in the backend environment; do not add it to the frontend. Render is configured with `PAYSTACK_CURRENCY=GHS`, `PAYSTACK_CALLBACK_URL=https://school-management-sytem-seven.vercel.app/dashboard/fees`, and `PAYSTACK_SUBSCRIPTION_CALLBACK_URL=https://school-management-sytem-seven.vercel.app/dashboard/subscription`. If subscription checkout returns to localhost, set `PAYSTACK_SUBSCRIPTION_CALLBACK_URL` to that exact Vercel URL in the Render service's Environment settings and deploy the change. In the Paystack dashboard, configure the subscription webhook URL as `https://school-management-sytem.onrender.com/api/subscription/webhook` (and the fee webhook as `https://school-management-sytem.onrender.com/api/paystack/webhook` if using fee webhooks).

Each school database receives one free month beginning on first authenticated use. The available plans are Standard/Premium for four months (GHS 1,000/GHS 2,000) and Standard/Premium for one academic year (GHS 2,000/GHS 3,500); an academic year is currently treated as 12 months.

### 7. Test Your Application
Once deployed:
- Render will give you a URL: https://school-management-backend-XXXX.onrender.com
- Try: https://school-management-backend-XXXX.onrender.com/login

## Local Testing (Optional)
To test with Railway MySQL locally:
1. Set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` in `School-backend/.env` using your Railway MySQL public connection details.
2. Set `PAYSTACK_SECRET_KEY` in `School-backend/.env` to your Paystack test secret key. Keep secret keys out of source control.
3. Add `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `ARKESEL_API_KEY`, and `ARKESEL_SENDER_ID` to your existing `School-backend/.env`, using `School-backend/.env.example` as a reference. Do not overwrite existing database or Paystack settings. Keep `.env` out of source control.
4. Set `PAYSTACK_CURRENCY=GHS`, `PAYSTACK_CALLBACK_URL=http://localhost:5173/dashboard/fees`, and `PAYSTACK_SUBSCRIPTION_CALLBACK_URL=http://localhost:5173/dashboard/subscription` in that file for local checkout. The backend loads `.env` automatically when started from `School-backend`.
5. In one terminal, run `mvn spring-boot:run` from `School-backend`. In another, run `npm run dev` from `School-frontend/School-frontend`.
6. To test subscription checkout, sign in as an administrator, open **Subscription**, choose a Standard or Premium plan, enter a receipt email, and complete Paystack checkout. Fee-payment checkout remains available to administrators and bursars.

## Notes
- Free tier services sleep after 15 minutes inactivity
- Suitable for demo/testing, not production
- MySQL database stays up 24/7 on free tier
