# 🚀 BAM Burgers - Hostinger Deployment Guide

## 📋 Prerequisites

Before deploying, ensure you have:
- A **Hostinger Business Plan** (or higher) subscription
- Access to Hostinger control panel (hPanel)
- Your Supabase credentials ready
- GitHub account (optional, for version control)

## 🎯 Deployment Overview

This guide will help you deploy the BAM Burgers full-stack application (React frontend + FastAPI backend + MongoDB) on Hostinger Business Plan hosting.

---

## 📦 Step 1: Prepare Your Application

### 1.1 Download Your Code
From Emergent platform:
1. Click on the **"Download Code"** button in the chat interface
2. This will download a `.zip` file with your complete application

### 1.2 Extract Files
Extract the downloaded zip file. You should have:
```
bam-burgers/
├── frontend/          # React application
├── backend/           # FastAPI Python backend
└── README.md
```

---

## 🌐 Step 2: Hostinger Setup

### 2.1 Access Hostinger hPanel
1. Log in to your Hostinger account: https://hpanel.hostinger.com
2. Navigate to your **Business Plan** hosting

### 2.2 Domain Configuration
1. In hPanel, go to **Domains**
2. Either:
   - Use an existing domain, or
   - Add a new domain
3. Note your domain (e.g., `bamburgers.com`)

---

## 🗄️ Step 3: Database Setup (MongoDB Atlas)

Since Hostinger doesn't provide MongoDB hosting, we'll use **MongoDB Atlas** (free tier available):

### 3.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new **Free Cluster**

### 3.2 Configure Database
1. Click **"Database Access"** → Add new user
   - Username: `bamburgers`
   - Password: (generate a strong password)
   - Role: Read and write to any database

2. Click **"Network Access"** → Add IP Address
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0)

3. Click **"Connect"** → **"Connect your application"**
   - Copy the connection string
   - Example: `mongodb+srv://bamburgers:<password>@cluster0.xxxxx.mongodb.net/`

4. Replace `<password>` with your actual password
5. Add database name at the end: `/bam_burgers`
   - Final: `mongodb+srv://bamburgers:yourpass@cluster0.xxxxx.mongodb.net/bam_burgers`

---

## 🖥️ Step 4: Backend Deployment (Python/FastAPI)

### 4.1 Access Hostinger File Manager
1. In hPanel, go to **"File Manager"**
2. Navigate to `public_html` directory

### 4.2 Create Backend Directory
1. Create a new folder: `api` (or `backend`)
2. Upload all files from your `backend/` folder to this directory

### 4.3 Configure Backend Environment
1. In the `api` folder, locate the `.env` file (or create it)
2. Update with your actual values:
```env
MONGO_URL=mongodb+srv://bamburgers:yourpass@cluster0.xxxxx.mongodb.net/bam_burgers
DB_NAME=bam_burgers
CORS_ORIGINS=https://bamburgers.com,https://www.bamburgers.com
SUPABASE_URL=https://sqhjsctsxlnivcbeclrn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=1ZDGhOVBN2HtWcKJXpkdi5/h/y1z8RUZ...
```

### 4.4 Install Python Dependencies
**Via SSH (Recommended):**
1. In hPanel, go to **"Advanced"** → **"SSH Access"**
2. Enable SSH access
3. Connect via terminal:
```bash
ssh u123456789@bamburgers.com
```

4. Navigate to backend directory:
```bash
cd public_html/api
```

5. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

6. Install requirements:
```bash
pip install -r requirements.txt
```

**Alternative - Upload pre-packaged:**
If SSH is not available, you can package dependencies locally and upload them.

### 4.5 Configure WSGI/ASGI
Create a file `passenger_wsgi.py` in your `api` folder:
```python
import sys
import os

# Add your project directory to the sys.path
sys.path.insert(0, os.path.dirname(__file__))

# Activate virtual environment
VENV_PATH = os.path.join(os.path.dirname(__file__), 'venv')
activate_this = os.path.join(VENV_PATH, 'bin', 'activate_this.py')
exec(open(activate_this).read(), {'__file__': activate_this})

from server import app as application
```

### 4.6 Configure .htaccess for Backend
Create/edit `.htaccess` in your `api` folder:
```apache
PassengerEnabled On
PassengerAppRoot /home/u123456789/public_html/api
PassengerAppType wsgi
PassengerStartupFile passenger_wsgi.py
PassengerPython /home/u123456789/public_html/api/venv/bin/python3
```
*(Replace `u123456789` with your actual Hostinger username)*

---

## 🎨 Step 5: Frontend Deployment (React)

### 5.1 Build Frontend Locally
On your local machine:
```bash
cd frontend
npm install
# or
yarn install

# Build for production
npm run build
# or  
yarn build
```

This creates a `build/` folder with optimized production files.

### 5.2 Configure Frontend Environment
Before building, update `frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://bamburgers.com/api
REACT_APP_SUPABASE_URL=https://sqhjsctsxlnivcbeclrn.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5.3 Upload Frontend Files
1. Go to Hostinger **File Manager**
2. Navigate to `public_html`
3. Upload **all contents** from the `build/` folder (not the folder itself)
   - Files: `index.html`, `asset-manifest.json`, etc.
   - Folders: `static/`, etc.

### 5.4 Configure .htaccess for React Router
Create/edit `.htaccess` in `public_html`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Don't rewrite API requests
  RewriteCond %{REQUEST_URI} !^/api
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
</IfModule>
```

---

## ⚙️ Step 6: Final Configuration

### 6.1 Directory Structure on Hostinger
```
/home/u123456789/public_html/
├── index.html              # Frontend entry
├── asset-manifest.json
├── favicon.ico
├── static/                 # Frontend assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── media/
├── api/                    # Backend application
│   ├── server.py
│   ├── .env
│   ├── requirements.txt
│   ├── passenger_wsgi.py
│   ├── .htaccess
│   └── venv/
└── .htaccess               # React router config
```

### 6.2 Verify API Endpoint
Test your backend:
```
https://bamburgers.com/api/health
```
Should return: `{"status":"healthy","timestamp":"..."}`

### 6.3 Test Full Application
1. Visit your domain: `https://bamburgers.com`
2. Check menu page loads with Supabase data
3. Test cart functionality
4. Test order placement

---

## 🔧 Step 7: Troubleshooting

### Issue: Backend 500 Error
**Solution:**
1. Check Hostinger error logs:
   - hPanel → "Advanced" → "Error Logs"
2. Verify Python version compatibility:
```bash
python3 --version  # Should be 3.8+
```
3. Check `.env` file has correct values
4. Verify all dependencies installed

### Issue: Frontend Shows Blank Page
**Solution:**
1. Check browser console (F12) for errors
2. Verify `REACT_APP_BACKEND_URL` in build matches your domain
3. Check `.htaccess` rewrite rules
4. Clear browser cache (Ctrl+Shift+R)

### Issue: CORS Errors
**Solution:**
Update `backend/.env`:
```env
CORS_ORIGINS=https://bamburgers.com,https://www.bamburgers.com
```
Restart backend service.

### Issue: Database Connection Failed
**Solution:**
1. Verify MongoDB Atlas connection string
2. Check IP whitelist includes `0.0.0.0/0`
3. Test connection string locally first
4. Ensure database name is appended to URL

### Issue: API Routes Not Working
**Solution:**
1. Check `.htaccess` in both `public_html` and `api` folders
2. Ensure `PassengerEnabled On` is set
3. Verify `passenger_wsgi.py` is correctly configured
4. Restart application via hPanel

---

## 📊 Step 8: Performance Optimization

### 8.1 Enable Cloudflare (Free CDN)
1. In hPanel, go to **"Advanced"** → **"Cloudflare"**
2. Enable Cloudflare for your domain
3. This provides:
   - Free SSL certificate
   - DDoS protection
   - CDN caching
   - Performance optimization

### 8.2 Database Indexing
Connect to MongoDB Atlas and create indexes:
```javascript
// In MongoDB Atlas → Collections → Indexes
db.items.createIndex({ tenant_id: 1, status: 1 })
db.orders.createIndex({ status: 1, created_at: -1 })
db.categories.createIndex({ tenant_id: 1, sort_order: 1 })
```

### 8.3 Image Optimization
- Use WebP format for images
- Compress images before upload
- Consider using a CDN (Cloudinary, ImageKit) for menu images

---

## 🔒 Step 9: Security Checklist

- ✅ SSL certificate enabled (via Cloudflare or Hostinger)
- ✅ Environment variables secured (not in code)
- ✅ MongoDB credentials are strong
- ✅ Supabase RLS (Row Level Security) policies enabled
- ✅ CORS origins restricted to your domain
- ✅ API rate limiting configured (if high traffic)
- ✅ Regular backups scheduled (MongoDB Atlas auto-backup)

---

## 📱 Step 10: Admin Panel Access

After deployment:
1. Navigate to: `https://bamburgers.com/admin`
2. Login with seeded credentials:
   - **Username:** `admin`
   - **Password:** `admin123`
3. **IMPORTANT:** Change admin password immediately in Settings!

---

## 🎉 Step 11: Post-Deployment

### Seed Initial Data
Your backend automatically seeds data on first run. To manually trigger:
```bash
curl -X POST https://bamburgers.com/api/seed
```

### Monitor Application
1. Check Hostinger usage stats regularly
2. Monitor MongoDB Atlas metrics
3. Set up Supabase alerts for database issues
4. Test all features thoroughly

### Regular Maintenance
- Weekly: Check error logs
- Monthly: Review database performance
- Quarterly: Update dependencies for security patches

---

## 🆘 Getting Help

### Hostinger Support
- Live Chat: Available 24/7 in hPanel
- Knowledge Base: https://support.hostinger.com

### Application Issues
- Check `/app/test_result.md` for common issues
- Review backend error logs in Hostinger
- Test API endpoints using Postman or curl

---

## 📝 Quick Reference

### Hostinger File Locations
- Frontend: `/home/uXXXXXXXXX/public_html/`
- Backend: `/home/uXXXXXXXXX/public_html/api/`
- Logs: Available in hPanel → Error Logs

### Important URLs
- Frontend: `https://bamburgers.com`
- Backend Health: `https://bamburgers.com/api/health`
- Admin Panel: `https://bamburgers.com/admin`
- MongoDB Atlas: https://cloud.mongodb.com

### Emergency Rollback
If something breaks:
1. Keep a backup of your previous `public_html` folder
2. Replace files via File Manager
3. Restart services
4. Test application

---

## ✨ Success Checklist

Before going live:
- [ ] All menu items display correctly
- [ ] Cart and checkout flow works
- [ ] Orders are created in database
- [ ] Admin panel accessible and functional
- [ ] Real-time order notifications work
- [ ] Payment methods configured (if using MyFatoorah/UPay)
- [ ] Delivery areas tested with OpenStreetMap
- [ ] SSL certificate active (https://)
- [ ] Mobile responsive design verified
- [ ] Admin password changed from default

---

**🎊 Congratulations! Your BAM Burgers application is now live on Hostinger!**

For additional features like payment gateway integration and delivery API setup, refer to the admin panel's Integrations section.
