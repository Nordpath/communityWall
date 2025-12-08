# Mobile File Upload Implementation

## Overview

This BuildFire plugin implements a platform-optimized file upload strategy with different size limits for mobile and desktop platforms to provide the best user experience on each device type.

## Platform-Specific Limits

### Mobile (iOS & Android)

**File Size Limits:**
- **Maximum:** 1GB (1024 MB) per file
- **Enforced by:** BuildFire server (no client-side validation)
- **Rationale:** Mobile devices have native file pickers that handle large files efficiently

**Implementation:**
- Uses `buildfire.services.publicFiles.showDialog` for modern BuildFire apps
- Falls back to `buildfire.imageLib.showDialog` for legacy mobile apps
- Native OS file selection experience (Photos app on iOS, Gallery on Android)
- Supports multiple file selection
- Real-time upload progress indicators
- Server-side validation prevents files over 1GB

**Supported Formats:**
- **Images:** JPEG, JPG, PNG, GIF, WebP
- **Videos:** MP4, MOV, AVI, WebM, QuickTime, M4V, MKV

### Desktop/Web

**File Size Limits:**
- **Images:** 10 MB per file (client-side validation)
- **Videos:** 100 MB per file (client-side validation)
- **Enforced by:** Client-side validation before upload

**Implementation (3-tier fallback):**
1. **Primary:** `buildfire.imageLib.showDialog` with `showFiles: true` option
2. **Secondary:** Native HTML file input with validation
3. **Upload:** `buildfire.imageLib.local.toPublicUrl` for images, `buildfire.services.publicFiles.uploadFile` for videos

**Features:**
- Pre-upload validation prevents unnecessary network traffic
- Clear error messages for oversized files (shows file names)
- Loading state during upload process
- Automatic retry through BuildFire SDK
- Clear success messages showing selection count
- Optimized for web browser environment

## Why Different Limits?

### Mobile Advantages (1GB limit)
1. **Native File Handling:** Mobile OS provides optimized file picker and upload handling
2. **Direct Camera Access:** Users can capture high-quality photos/videos directly
3. **Modern Hardware:** Mobile devices typically have fast cellular/WiFi connections
4. **User Expectations:** Mobile users expect to share full-resolution media from their camera roll

### Desktop Experience (10MB/100MB limits)
1. **Browser Limitations:** Web browsers have less efficient file handling than native apps
2. **Network Reliability:** Desktop uploads may occur over less reliable connections
3. **User Experience:** Faster upload validation provides immediate feedback
4. **Bandwidth Optimization:** Prevents unnecessary large file uploads that may fail
5. **Unified Interface:** Both camera and video buttons support images AND videos for flexibility

## Technical Implementation

### File Selection Flow

```
User clicks camera or video button
    ↓
Check if buildfire.services.publicFiles available
    ↓
[YES - Mobile/Modern]                       [NO - Check imageLib]
    ↓                                           ↓
publicFiles.showDialog              Check if buildfire.imageLib available
    ↓                                           ↓
Native file picker                  [YES]                    [NO]
    ↓                                 ↓                        ↓
No client validation          imageLib.showDialog      HTML file input
    ↓                                 ↓                        ↓
Server enforces 1GB             Standard dialog          Native browser
                                      ↓                   file picker
                               Return URLs                     ↓
                                                    Validate file sizes
                                                    (10MB img/100MB vid)
                                                           ↓
                                                    [VALID]    [INVALID]
                                                       ↓           ↓
                                                  Upload file   Show error
                                                       ↓        with names
                                                  Return URLs
```

### Code References

**Constants:** `widget/enums.js`
```javascript
FILE_UPLOAD: {
    MOBILE_MAX_SIZE: 1024,       // 1GB for mobile
    DESKTOP_IMAGE_MAX_SIZE: 10,  // 10MB for desktop images
    DESKTOP_VIDEO_MAX_SIZE: 100  // 100MB for desktop videos
}
```

**Wall Controller:**
- Image Upload: `widget/controllers/widget.wall.controller.js` - `WidgetWall.selectImages()`
- Video Upload: `widget/controllers/widget.wall.controller.js` - `WidgetWall.selectVideos()`

**Thread Controller:**
- Image Upload: `widget/controllers/widget.thread.controller.js` - `Thread.selectImages()`
- Video Upload: `widget/controllers/widget.thread.controller.js` - `Thread.selectVideos()`

## Error Handling

### Mobile Error Scenarios
- **File > 1GB:** BuildFire server returns error after upload attempt
- **Unsupported format:** Client filters by MIME type before upload
- **Upload failure:** Toast notification with retry option
- **Network issues:** BuildFire SDK handles automatic retry

### Desktop Error Scenarios
- **File too large:** Immediate error message before upload
- **Unsupported format:** File type validation before upload
- **Upload failure:** Clear error message with retry option

## Testing Checklist

### Mobile Testing
- [ ] Test image upload on iOS device (Photos app picker)
- [ ] Test image upload on Android device (Gallery picker)
- [ ] Test video upload on iOS device
- [ ] Test video upload on Android device
- [ ] Verify multi-file selection works
- [ ] Test upload of file close to 1GB limit
- [ ] Verify error handling for files over 1GB
- [ ] Check upload progress indicators display correctly
- [ ] Test on older BuildFire SDK versions (fallback API)

### Desktop Testing
- [ ] Test image upload on Chrome browser
- [ ] Test image upload on Safari browser
- [ ] Test image upload on Firefox browser
- [ ] Test video upload on all browsers
- [ ] Verify 10MB limit enforced for images
- [ ] Verify 100MB limit enforced for videos
- [ ] Test error messages display correctly
- [ ] Verify multi-file selection works

## Future Considerations

### Potential Enhancements
1. **Progressive Upload:** Chunk large files for better reliability
2. **Compression Options:** Offer to compress images/videos before upload
3. **Format Conversion:** Auto-convert incompatible formats
4. **Cloud Storage:** Direct upload to user's cloud storage
5. **Offline Queue:** Queue uploads when offline, process when online

### Monitoring Recommendations
1. Track upload success rates by platform
2. Monitor average file sizes uploaded
3. Analyze upload failure reasons
4. Measure user engagement with media uploads
5. Track server-side file rejection rates

## Support & Documentation

For BuildFire API documentation:
- Public Files API: https://docs.buildfire.com/docs/public-files
- Image Library API: https://docs.buildfire.com/docs/image-library
- File Upload Best Practices: https://docs.buildfire.com/docs/file-uploads

## Version History

- **v1.0.0** - Initial implementation with platform-specific limits
  - Mobile: 1GB limit via BuildFire server
  - Desktop: 10MB/100MB client-side validation
