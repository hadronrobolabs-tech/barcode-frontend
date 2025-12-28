# Fixing 403 Forbidden Error on Hostinger

## Quick Fix Checklist

Follow these steps in order:

### Step 1: Check File Permissions

**Via Hostinger File Manager:**
1. Log into Hostinger Control Panel
2. Go to File Manager
3. Navigate to `public_html/`
4. Right-click on `index.html` → **Change Permissions**
5. Set to: `644` (or `rw-r--r--`)
6. Right-click on the folder → **Change Permissions**
7. Set to: `755` (or `rwxr-xr-x`)
8. Apply to all files and folders

**Via FTP/SSH:**
```bash
# Set file permissions
find . -type f -exec chmod 644 {} \;

# Set directory permissions
find . -type d -exec chmod 755 {} \;
```

### Step 2: Verify File Structure

Ensure your `public_html/` contains:
```
public_html/
  ├── index.html          ← MUST EXIST
  ├── .htaccess           ← MUST EXIST
  ├── main.*.js
  ├── polyfills.*.js
  ├── runtime.*.js
  ├── styles.*.css
  └── ... (other build files)
```

**Important:**
- Upload **contents** of `dist/qr-scan/`, not the folder itself
- `index.html` must be in the root of `public_html/`

### Step 3: Check .htaccess File

1. **Verify .htaccess exists** in `public_html/`
2. **Check file content** - it should start with:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
   ```
3. **If .htaccess is missing**, upload it from your project root
4. **If still getting 403**, temporarily rename `.htaccess` to `.htaccess.bak` to test

### Step 4: Minimal .htaccess Test

If the full `.htaccess` causes issues, try this minimal version:

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

### Step 5: Verify index.html

1. Open `index.html` in File Manager
2. Check if it's not empty
3. Verify it contains:
   ```html
   <!doctype html>
   <html lang="en">
   <head>
     ...
   </head>
   <body>
     <app-root></app-root>
     ...
   </body>
   </html>
   ```

### Step 6: Check Hostinger Settings

1. **Directory Index**: Should be set to `index.html`
2. **Directory Browsing**: Should be **disabled**
3. **No security rules** blocking access

### Step 7: Test Direct File Access

Try accessing files directly:
- `https://your-domain.com/index.html` - Should work
- `https://your-domain.com/main.*.js` - Should work
- `https://your-domain.com/styles.*.css` - Should work

If these work but root URL doesn't, it's a routing issue, not 403.

### Step 8: Rebuild and Re-upload

If nothing works:

1. **Clean build locally:**
   ```bash
   cd scan-barcode-frontend
   rm -rf dist/
   npm run build
   ```

2. **Delete all files** from `public_html/` (keep a backup!)

3. **Upload fresh build:**
   - Upload all contents from `dist/qr-scan/`
   - Upload `.htaccess` file
   - Set permissions (644 for files, 755 for folders)

### Step 9: Check Error Logs

1. Go to Hostinger Control Panel
2. Navigate to **Error Logs** or **Logs**
3. Look for specific 403 error messages
4. Common messages:
   - "Options FollowSymLinks" → Contact Hostinger support
   - "AllowOverride" → Contact Hostinger support
   - "Directory index forbidden" → Check DirectoryIndex setting

### Step 10: Contact Hostinger Support

If all else fails, contact Hostinger support with:

**Information to provide:**
- Domain name
- Exact error message (screenshot)
- File structure (screenshot of File Manager)
- .htaccess content
- Steps you've already tried

**Ask them to check:**
- Apache `AllowOverride` setting
- `mod_rewrite` module status
- Directory index configuration
- Any security rules blocking access

## Common Causes

1. **Wrong file permissions** (most common) - Files need 644, folders need 755
2. **Missing index.html** - Must exist in root
3. **Corrupted .htaccess** - Check syntax
4. **Files in wrong location** - Must be in `public_html/` root, not subfolder
5. **Hostinger security settings** - May need support to adjust

## Quick Test

After fixing, test with:
```bash
curl -I https://your-domain.com/
```

Should return: `HTTP/1.1 200 OK` (not 403)

## Still Not Working?

1. Try accessing `https://your-domain.com/index.html` directly
2. Check browser console (F12) for errors
3. Try incognito/private browsing mode
4. Clear browser cache
5. Try different browser

If `index.html` works directly but root doesn't, it's `.htaccess` routing issue.
If `index.html` also gives 403, it's a permissions or file structure issue.

