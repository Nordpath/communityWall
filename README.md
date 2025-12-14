# socialPlugin ![](https://api.travis-ci.org/BuildFire/socialPlugin.svg)
Social wall

## Testing Video Uploads

### Important: SDK Version Requirements

Video uploads require the BuildFire `services.publicFiles` API. If you see errors like "publicFiles.uploadFiles not available", update your SDK:

```bash
# Update BuildFire CLI to latest version
npm install -g buildfire@latest

# Or update local SDK
npm update buildfire
```

**Fallback Support:** The plugin now includes automatic fallback to `imageLib.showDialog` for older SDK versions, but for best results, update to the latest BuildFire SDK.

### Method 1: BuildFire Emulator (Recommended)
```bash
# Install BuildFire CLI globally (if not already installed)
npm install -g buildfire

# Navigate to plugin directory
cd /path/to/socialPlugin

# Run the emulator
buildfire run
```

This will start the BuildFire emulator where you can test video uploads with the full API support.

### Method 2: Test Retry Logic with URL Parameter
Add `?testVideoRetry=true` to your URL to simulate delayed API initialization:
- APIs will be unavailable for 2.5 seconds
- Retry logic attempts uploads at 500ms, 1s, 2s intervals
- APIs restore after 2.5s and upload succeeds
- Check console for `[TEST MODE]` logs

### Method 3: Unit Testing with Mock APIs
The mock APIs are available in `test/assets/buildfire.js`:
- `buildfire.services.publicFiles.showDialog()` - File selection dialog
- `buildfire.services.publicFiles.uploadFile()` - Single file upload
- `buildfire.services.publicFiles.uploadFiles()` - Multiple file upload

Open `test-video-upload.html` in your browser to see the testing dashboard.

## Troubleshooting Video Uploads

### Error: "publicFiles.uploadFiles not available after 3 retries"

**Cause:** Your BuildFire SDK doesn't include the `services.publicFiles` API.

**Solutions:**
1. **Update BuildFire CLI** (recommended):
   ```bash
   npm install -g buildfire@latest
   ```

2. **Restart emulator** after updating:
   ```bash
   buildfire run
   ```

3. **Use fallback**: The plugin automatically falls back to `imageLib.showDialog` for older SDKs

### Checking API Availability

Open browser console and check:
```javascript
// Should return true for modern SDK
console.log(!!buildfire.services.publicFiles);

// Should return true for fallback support
console.log(!!buildfire.imageLib);
```

### Console Logs to Watch For

- `[VideoSelect] API availability` - Shows which APIs are detected
- `[VideoSelect] Using publicFiles.showDialog` - Modern API in use
- `[VideoSelect] Using imageLib.showDialog fallback` - Older SDK fallback
- `[ImageUpload] Environment` - Shows detailed API detection

## Navigation

To pass a spcific Wall ID and Title to load make sure you navigate to this plugin using
````
 buildfire.navigation.navigateTo(
  ...pluginInstanceData
  ,queryString: 'wid=' + wid + "&wTitle=" + title
 )
 ````
