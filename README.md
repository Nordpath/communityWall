# socialPlugin ![](https://api.travis-ci.org/BuildFire/socialPlugin.svg)
Social wall

## Testing Video Uploads

### Method 1: BuildFire Emulator (Recommended)
```bash
# Install BuildFire CLI globally
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

## Navigation

To pass a spcific Wall ID and Title to load make sure you navigate to this plugin using
````
 buildfire.navigation.navigateTo(
  ...pluginInstanceData
  ,queryString: 'wid=' + wid + "&wTitle=" + title
 )
 ````
