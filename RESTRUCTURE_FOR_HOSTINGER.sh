#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════
# BAM BURGERS - HOSTINGER DEPLOYMENT RESTRUCTURING SCRIPT
# ════════════════════════════════════════════════════════════════════════════
# This script restructures your application for Hostinger deployment
# Run this AFTER downloading your code from Emergent
# ════════════════════════════════════════════════════════════════════════════

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   BAM BURGERS - Hostinger Deployment Restructuring           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ ERROR: frontend/ and backend/ directories not found!"
    echo "Please run this script from the root directory of your downloaded code."
    exit 1
fi

echo "✓ Directories found. Starting restructuring..."
echo ""

# Step 1: Build Frontend
echo "Step 1/6: Building frontend for production..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    yarn install || npm install
fi

echo "  Building production version..."
yarn build || npm run build

if [ ! -d "build" ]; then
    echo "❌ ERROR: Build failed! build/ directory not created."
    exit 1
fi

cd ..
echo "✓ Frontend built successfully"
echo ""

# Step 2: Create new structure
echo "Step 2/6: Creating deployment directory structure..."
mkdir -p deployment
mkdir -p deployment/api
echo "✓ Deployment directories created"
echo ""

# Step 3: Move frontend build to root of deployment
echo "Step 3/6: Moving frontend files..."
cp -r frontend/build/* deployment/
echo "✓ Frontend files moved to deployment root"
echo ""

# Step 4: Move backend to api subdirectory
echo "Step 4/6: Moving backend files..."
cp -r backend/* deployment/api/
echo "✓ Backend files moved to deployment/api"
echo ""

# Step 5: Create necessary configuration files
echo "Step 5/6: Creating configuration files..."

# Create .htaccess for frontend (in deployment root)
cat > deployment/.htaccess << 'EOF'
# React Router Configuration
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

# Enable Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
EOF

# Create .htaccess for backend (in deployment/api/)
cat > deployment/api/.htaccess << 'EOF'
PassengerEnabled On
PassengerPython /home/uXXXXXXXXX/public_html/api/venv/bin/python3
PassengerAppRoot /home/uXXXXXXXXX/public_html/api

RewriteEngine On
RewriteBase /api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ passenger_wsgi.py/$1 [QSA,L]
EOF

# Create passenger_wsgi.py
cat > deployment/api/passenger_wsgi.py << 'EOF'
import sys
import os

# Path to virtual environment
INTERP = "/home/uXXXXXXXXX/public_html/api/venv/bin/python3"
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

# Add application directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import the FastAPI app
from server import app as application
EOF

echo "✓ Configuration files created"
echo ""

# Step 6: Create deployment instructions
echo "Step 6/6: Creating deployment instructions..."
cat > deployment/DEPLOY_TO_HOSTINGER.txt << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════╗
║                   HOSTINGER DEPLOYMENT INSTRUCTIONS                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

STEP 1: PREPARE ENVIRONMENT VARIABLES
──────────────────────────────────────────────────────────────────────────────

Before uploading, update these files:

1. Edit: api/.env
   
   Update these values:
   MONGO_URL=mongodb+srv://your_user:your_password@cluster.mongodb.net/bam_burgers
   DB_NAME=bam_burgers
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

2. Update in index.html (already built, but verify):
   REACT_APP_BACKEND_URL should be: https://yourdomain.com/api

──────────────────────────────────────────────────────────────────────────────
STEP 2: UPLOAD TO HOSTINGER
──────────────────────────────────────────────────────────────────────────────

METHOD A: Using File Manager (Recommended)
───────────────────────────────────────────
1. Login to hPanel: https://hpanel.hostinger.com
2. Go to: Files → File Manager
3. Navigate to: public_html/
4. DELETE all default files (index.html, etc.)
5. Upload ALL contents from this "deployment" folder
   - Upload: index.html, asset-manifest.json, favicon.ico, etc.
   - Upload: static/ folder
   - Upload: api/ folder (entire folder)
   - Upload: .htaccess file
6. Wait for upload to complete

METHOD B: Using FTP
───────────────────
1. Get FTP credentials from hPanel → Files → FTP Accounts
2. Use FileZilla or any FTP client
3. Connect to your server
4. Navigate to: /public_html/
5. Upload all contents from "deployment" folder

──────────────────────────────────────────────────────────────────────────────
STEP 3: SETUP BACKEND VIA SSH
──────────────────────────────────────────────────────────────────────────────

1. Enable SSH in hPanel:
   - Go to: Advanced → SSH Access
   - Click "Enable SSH"
   - Note your username (e.g., u123456789)

2. Connect via SSH:
   ssh u123456789@ssh.hostinger.com -p 65002
   (Enter your hPanel password)

3. Navigate to API directory:
   cd ~/public_html/api

4. Create virtual environment:
   python3 -m venv venv

5. Activate virtual environment:
   source venv/bin/activate

6. Install dependencies:
   pip install --upgrade pip
   pip install -r requirements.txt

7. Get your actual username:
   whoami
   (Copy the output, e.g., u123456789)

8. Update .htaccess in api/ folder:
   nano .htaccess
   
   Replace uXXXXXXXXX with your actual username in these lines:
   PassengerPython /home/YOUR_USERNAME/public_html/api/venv/bin/python3
   PassengerAppRoot /home/YOUR_USERNAME/public_html/api
   
   Save: Ctrl+O, Enter, Ctrl+X

9. Update passenger_wsgi.py:
   nano passenger_wsgi.py
   
   Replace uXXXXXXXXX with your actual username in:
   INTERP = "/home/YOUR_USERNAME/public_html/api/venv/bin/python3"
   
   Save: Ctrl+O, Enter, Ctrl+X

──────────────────────────────────────────────────────────────────────────────
STEP 4: CONFIGURE PYTHON APP (Optional - if hPanel has Python App option)
──────────────────────────────────────────────────────────────────────────────

1. In hPanel, go to: Advanced → Python App
2. Click "Create Application"
3. Configuration:
   - Python Version: 3.11 (or latest)
   - Application Root: /public_html/api
   - Application URL: yourdomain.com/api
   - Application Startup File: server.py
   - Application Entry Point: app
4. Click "Create"

──────────────────────────────────────────────────────────────────────────────
STEP 5: ENABLE SSL
──────────────────────────────────────────────────────────────────────────────

1. In hPanel, go to: Security → SSL
2. Find your domain
3. Click "Install SSL" (Free Let's Encrypt SSL)
4. Wait 2-5 minutes for activation

──────────────────────────────────────────────────────────────────────────────
STEP 6: TEST YOUR DEPLOYMENT
──────────────────────────────────────────────────────────────────────────────

1. Test Backend API:
   https://yourdomain.com/api/health
   Should show: {"status":"healthy","timestamp":"..."}

2. Test Frontend:
   https://yourdomain.com
   Should show BAM Burgers homepage

3. Test Menu:
   https://yourdomain.com/menu
   Should load menu items from Supabase

4. Test Admin:
   https://yourdomain.com/admin
   Should show admin login page
   Login: admin / admin123

5. Test Language Toggle:
   Click عربي button (bottom right)
   All text should change to Arabic

──────────────────────────────────────────────────────────────────────────────
STEP 7: SEED INITIAL DATA
──────────────────────────────────────────────────────────────────────────────

Visit: https://yourdomain.com/api/seed

This creates:
- Admin account (username: admin, password: admin123)
- Sample coupon (WELCOME10)
- Loyalty settings

IMPORTANT: Change admin password immediately after first login!

──────────────────────────────────────────────────────────────────────────────
TROUBLESHOOTING
──────────────────────────────────────────────────────────────────────────────

Problem: Backend shows 500 error
Solution:
1. Check error logs: hPanel → Advanced → Error Logs
2. Verify MongoDB connection string in api/.env
3. Ensure virtual environment created and activated
4. Check Python version: python3 --version (should be 3.8+)

Problem: Frontend shows blank page
Solution:
1. Check browser console (F12) for errors
2. Verify .htaccess in root public_html/
3. Clear browser cache (Ctrl+Shift+R)

Problem: API routes not working
Solution:
1. Verify .htaccess in api/ folder has correct username
2. Verify passenger_wsgi.py has correct username
3. Check api/.env has correct CORS_ORIGINS

Problem: "ModuleNotFoundError"
Solution:
1. SSH into server
2. cd ~/public_html/api
3. source venv/bin/activate
4. pip install -r requirements.txt

──────────────────────────────────────────────────────────────────────────────
✓ DEPLOYMENT COMPLETE
──────────────────────────────────────────────────────────────────────────────

Your BAM Burgers application should now be live!

Website: https://yourdomain.com
Admin Panel: https://yourdomain.com/admin

Remember to:
1. Change default admin password
2. Add payment gateway credentials in admin settings
3. Test all features thoroughly
4. Set up regular backups

Need help? Check Hostinger support: https://support.hostinger.com
EOF

echo "✓ Deployment instructions created"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    RESTRUCTURING COMPLETE!                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Your deployment-ready files are in the 'deployment' folder."
echo ""
echo "Next Steps:"
echo "1. Review and update: deployment/api/.env"
echo "2. Read: deployment/DEPLOY_TO_HOSTINGER.txt"
echo "3. Upload 'deployment' folder contents to Hostinger"
echo ""
echo "Important Files Created:"
echo "  ✓ deployment/             (Upload ALL contents to public_html/)"
echo "  ✓ deployment/api/         (Backend files)"
echo "  ✓ deployment/.htaccess    (Frontend routing)"
echo "  ✓ deployment/api/.htaccess (Backend config)"
echo "  ✓ deployment/api/passenger_wsgi.py"
echo "  ✓ deployment/DEPLOY_TO_HOSTINGER.txt (Detailed instructions)"
echo ""
echo "═══════════════════════════════════════════════════════════════"
