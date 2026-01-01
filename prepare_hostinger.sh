#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  BAM BURGERS - 1-CLICK HOSTINGER DEPLOYMENT PREP          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if in correct directory
if [ ! -d "frontend" ] || [ ! -d "api" ]; then
    echo "❌ ERROR: Run this from the root directory"
    exit 1
fi

echo "Step 1/4: Building frontend..."
cd frontend
yarn install > /dev/null 2>&1
yarn build
cd ..
echo "✓ Frontend built"

echo ""
echo "Step 2/4: Creating deployment structure..."
rm -rf hostinger_upload
mkdir -p hostinger_upload/api

echo "✓ Created hostinger_upload/ folder"

echo ""
echo "Step 3/4: Copying files..."
# Copy frontend build to root
cp -r frontend/build/* hostinger_upload/
# Copy backend to api subfolder
cp -r api/* hostinger_upload/api/
echo "✓ Files copied"

echo ""
echo "Step 4/4: Creating config files..."

# .htaccess for frontend (root)
cat > hostinger_upload/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/api
  RewriteRule ^ index.html [L]
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
EOF

# .htaccess for API
cat > hostinger_upload/api/.htaccess << 'EOF'
PassengerEnabled On
PassengerNodejs /home/USERNAME/nodevenv/public_html/api/18/bin/node
PassengerAppRoot /home/USERNAME/public_html/api
PassengerStartupFile server.js
PassengerAppType node

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /api/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ server.js [L]
</IfModule>
EOF

# Create simple instructions
cat > hostinger_upload/UPLOAD_INSTRUCTIONS.txt << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║         HOSTINGER UPLOAD INSTRUCTIONS (SIMPLIFIED)            ║
╚═══════════════════════════════════════════════════════════════╝

STEP 1: UPDATE ENVIRONMENT FILE
─────────────────────────────────────────────────────────────────
Edit: api/.env in this folder

Update with YOUR values:
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/bam_burgers
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

Save the file.

─────────────────────────────────────────────────────────────────
STEP 2: UPLOAD TO HOSTINGER
─────────────────────────────────────────────────────────────────
1. Login: https://hpanel.hostinger.com
2. Go to: Files → File Manager
3. Navigate to: public_html/
4. DELETE all existing files
5. Upload ALL files from this folder (index.html, static/, api/, etc.)
6. Wait for upload to complete

─────────────────────────────────────────────────────────────────
STEP 3: SETUP NODE.JS APP IN HOSTINGER
─────────────────────────────────────────────────────────────────
1. In hPanel, go to: Advanced → Node.js
2. Click "Create Application"
3. Fill in:
   - Node.js Version: 18 or 20
   - Application Mode: Production
   - Application Root: /public_html/api
   - Application URL: yourdomain.com/api
   - Application Startup File: server.js
4. Click "Create"
5. Wait 1-2 minutes

─────────────────────────────────────────────────────────────────
STEP 4: UPDATE .htaccess WITH YOUR USERNAME
─────────────────────────────────────────────────────────────────
1. In File Manager, go to: public_html/api/
2. Edit .htaccess
3. Find USERNAME and replace with your actual username (e.g., u123456789)
4. Save

Your username format: uXXXXXXXXX (you can see it in hPanel URL)

─────────────────────────────────────────────────────────────────
STEP 5: INSTALL DEPENDENCIES (SSH or hPanel)
─────────────────────────────────────────────────────────────────
In hPanel Node.js section:
- Find your application
- Click "NPM Install"
- Wait for completion

OR via SSH:
ssh username@ssh.hostinger.com -p 65002
cd ~/public_html/api
npm install

─────────────────────────────────────────────────────────────────
STEP 6: TEST YOUR SITE
─────────────────────────────────────────────────────────────────
1. Frontend: https://yourdomain.com
2. Backend: https://yourdomain.com/api/health
3. Admin: https://yourdomain.com/admin
4. Seed data: https://yourdomain.com/api/seed

If backend not working:
- Check: hPanel → Node.js → Your App → View Logs
- Restart app in Node.js section

─────────────────────────────────────────────────────────────────
✓ DONE!
─────────────────────────────────────────────────────────────────
Your site should be live!

Login: https://yourdomain.com/admin
Username: admin
Password: admin123
(Change password after first login!)
EOF

echo "✓ Config files created"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                      SUCCESS!                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Folder ready: hostinger_upload/"
echo ""
echo "Next steps:"
echo "1. Edit: hostinger_upload/api/.env (add your MongoDB URL & domain)"
echo "2. Upload entire 'hostinger_upload' folder contents to Hostinger"
echo "3. Read: hostinger_upload/UPLOAD_INSTRUCTIONS.txt"
echo ""
echo "That's it! Everything is ready for Hostinger deployment."
echo ""
