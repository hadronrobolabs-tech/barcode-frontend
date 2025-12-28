# Hostinger Frontend Deployment Guide

## Prerequisites

- Node.js 18.x or higher (Angular 15 requires Node 18.9+)
- npm 9.x or higher
- Access to Hostinger hosting (Shared, Cloud, or VPS)

## Step-by-Step Deployment

### Option 1: Build Locally and Upload (Recommended)

#### Step 1: Prepare Production Build

1. **Update Environment Configuration** (if needed):
   - Edit `src/environments/environment.prod.ts`
   - Update `BASE_URL` to your backend API URL on Hostinger

2. **Install Dependencies** (if not already done):
   ```bash
   cd scan-barcode-frontend
   npm install
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```
   
   This will create optimized production files in `dist/qr-scan/` directory.

4. **Verify Build Output**:
   ```bash
   ls -la dist/qr-scan/
   ```
   
   You should see files like:
   - `index.html`
   - `main.*.js`
   - `polyfills.*.js`
   - `runtime.*.js`
   - `styles.*.css`
   - Other chunk files

#### Step 2: Upload to Hostinger

**For Shared/Cloud Hosting:**

1. **Access File Manager** or use **FTP/SFTP**:
   - Log into your Hostinger control panel
   - Navigate to File Manager or use an FTP client (FileZilla, WinSCP, etc.)

2. **Upload Files**:
   - Navigate to your domain's `public_html` folder (or `www` folder)
   - Upload **ALL contents** from `dist/qr-scan/` folder
   - **Important**: Upload the files inside `dist/qr-scan/`, not the folder itself
   - Your structure should be:
     ```
     public_html/
       ├── index.html
       ├── main.*.js
       ├── polyfills.*.js
       ├── runtime.*.js
       ├── styles.*.css
       └── ... (other files)
     ```

3. **Configure .htaccess** (for Apache servers):
   - Create or update `.htaccess` file in `public_html/`
   - Add the following content:
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
     </IfModule>
     ```
   - This ensures Angular routing works correctly (handles client-side routing)

**For VPS Hosting:**

1. **Upload via SCP/SSH**:
   ```bash
   scp -r dist/qr-scan/* user@your-server-ip:/var/www/html/
   ```

2. **Or use Git** (if you have Git on server):
   ```bash
   # On server
   cd /var/www/html
   git clone your-repo-url
   cd scan-barcode-frontend
   npm install
   npm run build
   cp -r dist/qr-scan/* /var/www/html/
   ```

#### Step 3: Configure Web Server

**For Apache (Shared/Cloud Hosting):**
- The `.htaccess` file should handle routing automatically
- Ensure `mod_rewrite` is enabled (usually enabled by default)

**For Nginx (VPS):**
Create or update `/etc/nginx/sites-available/default`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Then restart Nginx:
```bash
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### Option 2: Build on Hostinger Server (VPS Only)

If you have VPS access with Node.js installed:

1. **Upload Source Code**:
   ```bash
   # Upload entire project folder to server
   scp -r scan-barcode-frontend user@your-server-ip:/home/user/
   ```

2. **SSH into Server**:
   ```bash
   ssh user@your-server-ip
   ```

3. **Install Node.js** (if not installed):
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   ```

4. **Build on Server**:
   ```bash
   cd scan-barcode-frontend
   npm install
   npm run build
   ```

5. **Copy Build Files**:
   ```bash
   cp -r dist/qr-scan/* /var/www/html/
   ```

## Post-Deployment Checklist

- [ ] Build completed without errors
- [ ] All files uploaded to `public_html` (or web root)
- [ ] `.htaccess` file created (for Apache)
- [ ] `index.html` is accessible
- [ ] Backend API URL is correct in `environment.prod.ts`
- [ ] CORS is configured on backend for your frontend domain
- [ ] Test the application in browser
- [ ] Test all routes (ensure client-side routing works)
- [ ] Test API connections
- [ ] Check browser console for errors

## Troubleshooting

### Issue: 404 Error on Page Refresh

**Solution**: Ensure `.htaccess` (Apache) or Nginx configuration is set up correctly for client-side routing.

### Issue: API Calls Failing

**Solutions**:
1. Check `BASE_URL` in `environment.prod.ts` matches your backend URL
2. Verify CORS settings on backend allow your frontend domain
3. Check browser console for CORS errors
4. Verify backend is running and accessible

### Issue: 403 Forbidden Error

**This is the most common issue on Hostinger. Try these solutions in order:**

1. **Check File Permissions** (via File Manager or FTP):
   ```bash
   # Files should be 644
   chmod 644 index.html
   chmod 644 *.js
   chmod 644 *.css
   
   # Directories should be 755
   chmod 755 .
   ```
   
   **Via Hostinger File Manager:**
   - Right-click on files → Change Permissions
   - Files: `644` (rw-r--r--)
   - Folders: `755` (rwxr-xr-x)

2. **Verify index.html exists**:
   - Ensure `index.html` is in the root directory (`public_html/`)
   - Check if file name is exactly `index.html` (case-sensitive)

3. **Check .htaccess file**:
   - Ensure `.htaccess` is uploaded to root directory
   - Verify it's not corrupted (should start with `<IfModule mod_rewrite.c>`)
   - Try temporarily renaming it to `.htaccess.bak` to test if it's causing issues

4. **Check Directory Index**:
   - In Hostinger File Manager, ensure "Directory Index" is set to `index.html`
   - Or add `DirectoryIndex index.html` to `.htaccess` (already included)

5. **Verify File Structure**:
   ```
   public_html/
     ├── index.html          ← Must exist
     ├── .htaccess           ← Must exist
     ├── main.*.js
     ├── polyfills.*.js
     ├── runtime.*.js
     ├── styles.*.css
     └── ... (other files)
   ```

6. **Check Hostinger Settings**:
   - Go to Hostinger Control Panel
   - Check if "Directory Browsing" is disabled (should be disabled)
   - Verify no security rules are blocking access

7. **Test with Minimal .htaccess**:
   If still getting 403, try this minimal `.htaccess`:
   ```apache
   DirectoryIndex index.html
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule ^ index.html [L]
   </IfModule>
   ```

8. **Check Server Error Logs**:
   - In Hostinger Control Panel → Error Logs
   - Look for specific 403 error messages
   - Common causes: "Options FollowSymLinks", "AllowOverride", etc.

9. **Contact Hostinger Support**:
   If none of the above works, contact Hostinger support with:
   - Your domain name
   - Exact error message
   - File structure screenshot
   - Request them to check Apache configuration

### Issue: Blank Page

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify all files were uploaded correctly
3. Check file permissions (should be readable: `chmod 644` for files, `chmod 755` for directories)
4. Verify `index.html` exists in root directory

### Issue: Assets Not Loading

**Solutions**:
1. Check `angular.json` `baseHref` setting (if using subdirectory)
2. Verify asset paths are relative
3. Check file permissions

### Issue: Build Fails

**Solutions**:
1. Clear `node_modules` and `package-lock.json`, then reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```
2. Check Node.js version: `node --version` (should be 18.9+)
3. Check npm version: `npm --version` (should be 9+)
4. Review build error messages

## Updating the Application

When you need to update the frontend:

1. **Make changes** to your code
2. **Rebuild**:
   ```bash
   npm run build
   ```
3. **Upload new files** from `dist/qr-scan/` to replace old files
4. **Clear browser cache** or do hard refresh (Ctrl+F5)

## Performance Optimization

1. **Enable Gzip Compression** (usually enabled by default on Hostinger)
2. **Use CDN** for static assets (optional)
3. **Enable Browser Caching** via `.htaccess`:
   ```apache
   <IfModule mod_expires.c>
     ExpiresActive On
     ExpiresByType text/css "access plus 1 year"
     ExpiresByType application/javascript "access plus 1 year"
     ExpiresByType image/png "access plus 1 year"
     ExpiresByType image/jpg "access plus 1 year"
     ExpiresByType image/jpeg "access plus 1 year"
   </IfModule>
   ```

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build with verbose output (for debugging)
npm run build -- --verbose

# Check build output size
du -sh dist/qr-scan/

# Test production build locally
npx http-server dist/qr-scan -p 8080
```

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check server error logs
3. Verify all configuration files
4. Test backend API independently
5. Review Hostinger documentation for your hosting plan

