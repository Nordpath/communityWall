'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .constant('SERVER_URL', {
            link: 'http://social.buildfire.com/src/server.js',
            secureLink: 'https://social.buildfire.com/src/server.js'
        })
        .constant('MORE_MENU_POPUP', {
            REPORT: 'Report Post',
            BLOCK: 'Delete Post'
        })
        .constant('EVENTS',{
            COMMENT_DELETED:"COMMENT_DELETED",
            POST_DELETED:"POST_DELETED",
            BAN_USER:"BAN_USER",
            POST_UNLIKED:"POST_UNLIKED",
            POST_LIKED:"POST_LIKED",
            POST_CREATED:"POST_CREATED",
            COMMENT_ADDED:"COMMENT_ADDED",
            COMMENT_LIKED: "COMMENT_LIKED",
            COMMENT_UNLIKED: "COMMENT_UNLIKED",
            APP_RESET: "APP_RESET"
        })
        .constant('THREAD_STATUS', {
            FOLLOW: "Follow Thread",
            FOLLOWING: "Leave Thread"
        })
        .constant('GROUP_STATUS', {
            FOLLOW: "Follow Group",
            FOLLOWING: "Leave Group"
        })
        .constant('FILE_UPLOAD', {
            CANCELLED : "Cancelled",
            SIZE_EXCEED : "File Too Large",
            MAX_SIZE : 20,        // Desktop fallback: upload file max size in MB (deprecated for mobile)

            // Platform-specific file size limits:
            // - Mobile (iOS/Android): No client-side validation, BuildFire server enforces 1GB limit
            //   Uses native file pickers via buildfire.services.publicFiles.showDialog
            // - Desktop/Web: Client-side validation at 10MB for images, 100MB for videos
            //   Falls back to HTML file input with pre-upload size checks

            MOBILE_MAX_SIZE: 1024,      // BuildFire server-side limit: 1GB (1024 MB)
            DESKTOP_IMAGE_MAX_SIZE: 10, // Desktop client-side limit for images: 10 MB
            DESKTOP_VIDEO_MAX_SIZE: 100 // Desktop client-side limit for videos: 100 MB
        })
})(window.angular);
