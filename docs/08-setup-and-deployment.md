# 08 - Setup & Deployment Guide

## Prerequisites

Ensure your system meets the following requirements:
- **Node.js**: v18.x or v20.x LTS
- **npm**: v9.x or later
- **MongoDB**: v6.0+ local instance or MongoDB Atlas cluster connection string
- **Operating System**: Windows / Linux / macOS

---

## ⚙️ Environment Variables Reference (`backend/.env`)

Create a `.env` file inside the `backend/` directory based on the following keys:

```ini
# Server Configuration
PORT=5003
NODE_ENV=development

# Database Connection
MONGO_URI=mongodb://localhost:27017/employee_management
# Or MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/employee_management

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Hikvision Artemis / HikCentral Biometric API Connection
HIK_HOST=https://192.168.1.100:443
HIK_KEY=28374659
HIK_SECRET=abcdef1234567890qwertyuiop

# Email Configuration (Resend or Zoho Mail)
RESEND_API_KEY=re_123456789
ZOHO_MAIL_USER=hr@company.com
ZOHO_MAIL_PASS=your_zoho_password

# File Upload Settings
MARRIAGE_ALLOWANCE_UPLOAD_ROOT=C:\uploads\marriage
```

---

## 🚀 Local Development Setup

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd employee-react-main

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Seed Admin User Account

Run the setup script to initialize the primary administrator user:

```bash
cd backend
node setup-admin.js
```
*Default Credentials created by setup script:*
- **Username / Email**: `admin@caldim.com`
- **Password**: `Admin@123`

### 3. Start Development Servers

#### Terminal 1: Backend API Server
```bash
cd backend
npm start
# Server listens at http://localhost:5003
```

#### Terminal 2: React Frontend App
```bash
cd frontend
npm start
# App starts at http://localhost:3000 (Proxies API requests to port 5003)
```

---

## 🏗 Production Build

To build the production bundle for the React frontend:

```bash
cd frontend
cmd /c npm run build
```

This generates an optimized static build directory inside `frontend/build/`.

### Serving with NGINX / Node Static Server
You can host the frontend build using NGINX or serve it directly via Express static middleware:

```javascript
// In backend server.js (Production mode):
app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"));
});
```

---

## 🛠 Troubleshooting & Maintenance

### 1. PowerShell Script Execution Error on Windows
If `npm` command fails with script execution policy error:
Use `cmd /c npm start` or run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Hikvision Connection Timeout
- Ensure the backend server can reach the HikCentral server IP address over port 443 / 80.
- Check that SSL self-signed certificate rejection is disabled in `hikProxy` (`rejectUnauthorized: false`).
