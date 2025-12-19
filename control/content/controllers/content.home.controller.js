'use strict';

(function (angular) {
    angular
        .module('socialPluginContent')
        .controller('ContentHomeCtrl', ['$scope', '$location', 'SocialDataStore', 'Modals', 'Buildfire', 'EVENTS', '$timeout', 'SocialItems', 'Util', 'PerfomanceIndexingService', function ($scope, $location, SocialDataStore, Modals, Buildfire, EVENTS, $timeout, SocialItems, Util, PerfomanceIndexingService) {
            var ContentHome = this;
            ContentHome.usersData = [];
            var userIds = [];
            var initialCommentsLength;
            ContentHome.postText = '';
            ContentHome.posts = [];
            ContentHome.socialAppId;
            ContentHome.parentThreadId;
            ContentHome.modalPopupThreadId;
            ContentHome.startLoadingPosts = false;
            ContentHome.privateThreads = [];
            ContentHome.exportingThreads = false;
            ContentHome.util = Util;
            var counter = 0;
            ContentHome.loading = true;

            $scope.setupImageList = function (post) {
                if (post.imageUrl) {
                    post.imageListId = "imageList_" + (counter++);
                    setTimeout(function () {
                        let imageList = document.getElementById(post.imageListId);
                        if (imageList) {
                            imageList.images = post.imageUrl;
                            if (Array.isArray(post.imageUrl)) {
                                imageList.images = post.imageUrl;
                            } else {
                                imageList.images = [post.imageUrl];
                            }
                        }
                    }, 0);
                }
            };
            var datastoreWriteKey;
            var appId;
            var instanceId;
            var pluginTitle;

            ContentHome.bannerSettings = {
                enabled: false,
                sponsorUrl: '',
                sponsorLogo: '',
                bannerHeight: 90,
                bannerBgColor: '#000000',
                displayMode: 'banner'
            };

            ContentHome.loadBannerSettings = function () {
                Buildfire.datastore.get('Social', function (err, result) {
                    if (err) {
                        console.error('Error loading banner settings:', err);
                        return;
                    }
                    if (result && result.data && result.data.appSettings && result.data.appSettings.bottomLogo) {
                        ContentHome.bannerSettings = Object.assign({}, ContentHome.bannerSettings, result.data.appSettings.bottomLogo);
                        if (!$scope.$$phase) {
                            $scope.$digest();
                        }
                    }
                });
            };

            ContentHome.saveBannerSettings = function () {
                Buildfire.datastore.get('Social', function (err, result) {
                    if (err) {
                        console.error('Error saving banner settings:', err);
                        return;
                    }
                    if (!result.data) {
                        result.data = {};
                    }
                    if (!result.data.appSettings) {
                        result.data.appSettings = {};
                    }

                    result.data.appSettings.bottomLogo = ContentHome.bannerSettings;

                    Buildfire.datastore.save(result.data, 'Social', function (err, savedData) {
                        if (err) {
                            console.error('Error saving banner settings:', err);
                            return;
                        }
                        console.log('Banner settings saved successfully');
                    });
                });
            };

            ContentHome.uploadBannerImage = function () {
                buildfire.imageLib.showDialog({}, function (err, result) {
                    if (err) {
                        console.error('Error uploading banner image:', err);
                        return;
                    }
                    if (result && result.selectedFiles && result.selectedFiles.length > 0) {
                        ContentHome.bannerSettings.sponsorLogo = result.selectedFiles[0];
                        ContentHome.saveBannerSettings();
                        if (!$scope.$$phase) {
                            $scope.$digest();
                        }
                    }
                });
            };

            ContentHome.removeBannerImage = function () {
                ContentHome.bannerSettings.sponsorLogo = '';
                ContentHome.saveBannerSettings();
            };

            var init = function () {
                buildfire.datastore.get("languages", (err, result) => {
                    if (result.data && result.data.screenOne) {
                        let data = result.data;
                        if (Object.keys(data.screenOne).length <= 6) {
                            Object.keys(data.screenOne).forEach((key) => {
                                if (data.screenOne[key].value) {
                                    stringsConfig.screenOne.labels[key].value = data.screenOne[key].value;
                                }
                            });
                            buildfire.datastore.save({ screenOne: stringsConfig.screenOne.labels }, "languages", (err, data) => { console.log(data) });
                        }
                    }
                });
                Buildfire.getContext(function (err, context) {
                    if (err) return console.log(err);
                    datastoreWriteKey = context.datastoreWriteKey;
                    appId = context.appId;
                    instanceId = context.instanceId;
                    Buildfire.datastore.get('Social', function (err, data) {
                        if (err) return console.log(err);

                        if (data && data.data && data.data.appSettings) {
                            ContentHome.appSettings = data.data;
                            if (ContentHome.appSettings.appSettings.pinnedPost) {
                                ContentHome.descriptionWYSIWYG = ContentHome.appSettings.appSettings.pinnedPost;
                                $scope.$digest()
                            }

                        } else {

                        }
						// Only if the data has not been updated yet will it proceed./ indexingUpdateDone = false
						if (!(data && data.data && data.data.appSettings && data.data.appSettings.indexingUpdateDone)){
								buildfire.publicData.search({
								recordCount: true,
								filter: {
									'_buildfire.index.array1.string1': null
								}
							}, 'subscribedUsersData', (err, result1) => {
								if (err) return console.error(err);
								buildfire.publicData.search({
									recordCount: true,
									filter: {
										'_buildfire.index.date1': null
									}
								}, 'posts', (err, result2) => {
									if (err) return console.error(err);
									if (result1.totalRecord > 0 || result2.totalRecord > 0) {
										PerfomanceIndexingService.showIndexingDialog();

									} // initial run or there is no data / no need for indexing fix it will take the updated index.
									else if (data && data.data) {
										if (!data.data.appSettings) {
											data.data.appSettings = {
												indexingUpdateDone: true,
												mainThreadUserTags: [],
												sideThreadUserTags: [],
												showMembers: true,
												allowCommunityFeedFollow: false,
												seeProfile: false,
												allowAutoSubscribe: true,
												allowChat: "allUsers",
											}
										}
										else {
											data.data.appSettings.indexingUpdateDone = true;
										}
										buildfire.datastore.save(data.data, 'Social', (err, data) => {
											if (err) return console.error(err)
										});
									}
								});
							});
						}

						ContentHome.getPosts();
                        ContentHome.loadBannerSettings();
                    });
                });

                function myCustomURLConverter(url, node, on_save, name) {
                    if (!/^https?:\/\//i.test(url)) {
                        return "https://" + url.replace("//", "");
                    }
                    else return url;
                }
                ContentHome.descriptionWYSIWYGOptions = {
                    plugins: 'advlist autolink link image lists charmap print preview',
                    skin: 'lightgray',
                    trusted: true,
                    theme: 'modern',
                    branding: false,
                    urlconverter_callback: myCustomURLConverter,
                    plugin_preview_width: "500",
                    plugin_preview_height: "500"
                };

                ContentHome.setWYSIWYG = function () {
                    if (!ContentHome.appSettings.appSettings) ContentHome.appSettings.appSettings = {};
                    ContentHome.appSettings.appSettings.pinnedPost = ContentHome.descriptionWYSIWYG;
                    Buildfire.datastore.get( 'Social', function (err, result) {
                        if (err) return console.log(err)
                        if(!result.data.appSettings) {
                            result.data.appSettings.appSettings = {
                                pinnedPost: ContentHome.descriptionWYSIWYG
                            }
                        } else result.data.appSettings.pinnedPost = ContentHome.descriptionWYSIWYG;
                        ContentHome.appSettings = result.data.appSettings;
                        Buildfire.datastore.save(result.data, 'Social', function (err, result) {
                            if (err) return console.log(err)
                        });
                    });
                }
                ContentHome.height = window.innerHeight;
                ContentHome.noMore = false;
            };

            ContentHome.moderationEnabled = false;
            ContentHome.filterStatus = 'all';
            ContentHome.pendingCount = 0;
            ContentHome.approvedCount = 0;
            ContentHome.rejectedCount = 0;
            ContentHome.allCount = 0;
            ContentHome.allPosts = [];
            ContentHome.newPendingPost = false;
            ContentHome.pollInterval = null;
            ContentHome.originalTitle = document.title || 'Content';
            ContentHome.titleFlashInterval = null;

            ContentHome.requestNotificationPermission = function() {
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            };

            ContentHome.sendBrowserNotification = function(count) {
                if ('Notification' in window && Notification.permission === 'granted') {
                    var notification = new Notification('New Posts Pending Review', {
                        body: count + ' post' + (count > 1 ? 's' : '') + ' waiting for your approval',
                        icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827379.png',
                        requireInteraction: true,
                        tag: 'pending-posts'
                    });
                    notification.onclick = function() {
                        window.focus();
                        ContentHome.filterByStatus('pending');
                        if (!$scope.$$phase) $scope.$digest();
                        notification.close();
                    };
                }
            };

            ContentHome.playAlertSound = function() {
                try {
                    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    var oscillator = audioContext.createOscillator();
                    var gainNode = audioContext.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);
                } catch (e) {
                    console.log('Could not play alert sound');
                }
            };

            ContentHome.startTitleFlash = function() {
                if (ContentHome.titleFlashInterval) return;
                var isOriginal = true;
                ContentHome.titleFlashInterval = setInterval(function() {
                    if (ContentHome.pendingCount > 0) {
                        document.title = isOriginal ? '(' + ContentHome.pendingCount + ') PENDING POSTS!' : ContentHome.originalTitle;
                        isOriginal = !isOriginal;
                    } else {
                        ContentHome.stopTitleFlash();
                    }
                }, 1000);
            };

            ContentHome.stopTitleFlash = function() {
                if (ContentHome.titleFlashInterval) {
                    clearInterval(ContentHome.titleFlashInterval);
                    ContentHome.titleFlashInterval = null;
                    document.title = ContentHome.originalTitle;
                }
            };

            ContentHome.notifyAdmin = function(newCount) {
                ContentHome.sendBrowserNotification(newCount);
                ContentHome.playAlertSound();
                ContentHome.startTitleFlash();
            };

            ContentHome.getPosts = function () {
                ContentHome.loading = true;

                Buildfire.datastore.get('Social', function (err, result) {
                    if (err) {
                        console.error('Error getting moderation settings:', err);
                    }
                    ContentHome.moderationEnabled = result && result.data && result.data.appSettings && result.data.appSettings.enableModeration;

                    const searchOptions = {
                        sort: { "_buildfire.index.date1": -1 },
                        recordCount: true
                    };

                    buildfire.publicData.search(searchOptions, 'posts', (err, data) => {
                        if (err) {
                            ContentHome.posts = [];
                            ContentHome.loading = false;
                            if (!$scope.$$phase) $scope.$digest();
                            return console.error(err);
                        }
                        if (data && data.result) {
                            ContentHome.allPosts = data.result.map(item => {
                                const mappedItem = { ...item.data, id: item.id };

                                console.log('[ContentDebug] Raw post data:', {
                                    id: item.id,
                                    images: item.data.images,
                                    postImages: item.data.postImages,
                                    imageUrl: item.data.imageUrl
                                });

                                // Map postImages to images for template compatibility
                                if (!mappedItem.images && mappedItem.postImages) {
                                    mappedItem.images = mappedItem.postImages;
                                }
                                // Also check imageUrl field (some posts store images there)
                                if ((!mappedItem.images || mappedItem.images.length === 0) && mappedItem.imageUrl) {
                                    if (Array.isArray(mappedItem.imageUrl)) {
                                        mappedItem.images = mappedItem.imageUrl;
                                    } else if (typeof mappedItem.imageUrl === 'string' && mappedItem.imageUrl) {
                                        mappedItem.images = [mappedItem.imageUrl];
                                    }
                                }
                                if (!mappedItem.images) {
                                    mappedItem.images = [];
                                }

                                console.log('[ContentDebug] Mapped images:', mappedItem.images);

                                // Map postVideos to videos
                                if (!mappedItem.videos && mappedItem.postVideos) {
                                    mappedItem.videos = mappedItem.postVideos;
                                }
                                if (!mappedItem.videos) {
                                    mappedItem.videos = [];
                                }

                                // Map comments' postImages to imageUrl
                                if (mappedItem.comments && Array.isArray(mappedItem.comments)) {
                                    mappedItem.comments = mappedItem.comments.map(function(comment) {
                                        if (!comment.imageUrl && comment.postImages) {
                                            comment.imageUrl = comment.postImages;
                                        }
                                        if (!comment.imageUrl) {
                                            comment.imageUrl = [];
                                        }
                                        if (!comment.videos && comment.postVideos) {
                                            comment.videos = comment.postVideos;
                                        }
                                        if (!comment.videos) {
                                            comment.videos = [];
                                        }
                                        return comment;
                                    });
                                }

                                return mappedItem;
                            });

                            if (ContentHome.moderationEnabled && ContentHome.filterStatus === 'pending') {
                                ContentHome.filterStatus = 'pending';
                            }

                            ContentHome.updateCounts();
                            ContentHome.applyFilter();

                            if (ContentHome.moderationEnabled) {
                                ContentHome.startPolling();
                                ContentHome.requestNotificationPermission();
                                if (ContentHome.pendingCount > 0) {
                                    ContentHome.startTitleFlash();
                                }
                            }
                        } else {
                            ContentHome.posts = [];
                            ContentHome.loading = false;
                            if (!$scope.$$phase) $scope.$digest();
                        }
                        ContentHome.loading = false;
                        if (!$scope.$$phase) $scope.$digest();
                    });
                });
            };

            ContentHome.updateCounts = function() {
                ContentHome.pendingCount = ContentHome.allPosts.filter(p => p.status === 'pending').length;
                ContentHome.approvedCount = ContentHome.allPosts.filter(p => p.status === 'approved' || !p.status).length;
                ContentHome.rejectedCount = ContentHome.allPosts.filter(p => p.status === 'rejected').length;
                ContentHome.allCount = ContentHome.allPosts.filter(p => p.status !== 'rejected').length;
                if (ContentHome.pendingCount === 0) {
                    ContentHome.stopTitleFlash();
                }
            };

            ContentHome.filterByStatus = function(status) {
                ContentHome.filterStatus = status;
                ContentHome.applyFilter();
                if (!$scope.$$phase) $scope.$digest();
            };

            ContentHome.applyFilter = function() {
                if (ContentHome.filterStatus === 'all') {
                    ContentHome.posts = ContentHome.allPosts.filter(post => post.status !== 'rejected');
                } else {
                    ContentHome.posts = ContentHome.allPosts.filter(post => {
                        if (ContentHome.filterStatus === 'approved') {
                            return post.status === 'approved' || !post.status;
                        }
                        return post.status === ContentHome.filterStatus;
                    });
                }
            };

            ContentHome.checkForNewPosts = function() {
                const searchOptions = {
                    filter: { "_buildfire.index.string2": "pending" },
                    sort: { "_buildfire.index.date1": -1 },
                    recordCount: true
                };

                buildfire.publicData.search(searchOptions, 'posts', (err, data) => {
                    if (err) {
                        console.error('[ContentHome] Error checking for new posts:', err);
                        return;
                    }
                    if (data && data.result) {
                        const serverPendingIds = data.result.map(item => item.id);
                        const localPendingIds = ContentHome.allPosts.filter(p => p.status === 'pending').map(p => p.id);

                        const newPosts = data.result.filter(item => !localPendingIds.includes(item.id));
                        if (newPosts.length > 0) {
                            console.log('[ContentHome] Found', newPosts.length, 'new pending posts');
                            newPosts.forEach(item => {
                                const mappedItem = { ...item.data, id: item.id };
                                if (!mappedItem.images && mappedItem.postImages) {
                                    mappedItem.images = mappedItem.postImages;
                                }
                                if (!mappedItem.images) mappedItem.images = [];
                                if (!mappedItem.videos && mappedItem.postVideos) {
                                    mappedItem.videos = mappedItem.postVideos;
                                }
                                if (!mappedItem.videos) mappedItem.videos = [];
                                ContentHome.allPosts.unshift(mappedItem);
                            });
                            ContentHome.updateCounts();
                            ContentHome.newPendingPost = true;
                            if (ContentHome.moderationEnabled) {
                                ContentHome.filterStatus = 'pending';
                            }
                            ContentHome.applyFilter();
                            ContentHome.notifyAdmin(newPosts.length);
                            if (!$scope.$$phase) $scope.$digest();
                        }
                    }
                });
            };

            ContentHome.startPolling = function() {
                if (ContentHome.pollInterval) {
                    clearInterval(ContentHome.pollInterval);
                }
                ContentHome.pollInterval = setInterval(function() {
                    if (ContentHome.moderationEnabled) {
                        ContentHome.checkForNewPosts();
                    }
                }, 5000);
            };

            ContentHome.stopPolling = function() {
                if (ContentHome.pollInterval) {
                    clearInterval(ContentHome.pollInterval);
                    ContentHome.pollInterval = null;
                }
            };

            $scope.$on('$destroy', function() {
                ContentHome.stopPolling();
                ContentHome.stopTitleFlash();
            });

            ContentHome.showComments = function (post) {
                post.viewComments = true;
            }

            // Method for getting User Name by giving userId as its argument
            ContentHome.getUserName = function (userId) {
                var userName = '';
                ContentHome.usersData.some(function (userData) {
                    if (userData && userData.userObject && userData.userObject._id == userId) {
                        userName = userData.userObject.displayName;
                        return true;
                    }
                });
                return userName;
            };

            //Method for getting User Image by giving userId as its argument
            ContentHome.getUserImage = function (userId) {
                var userImageUrl = '';
                ContentHome.usersData.some(function (userData) {
                    if (userData && userData.userObject && userData.userObject._id == userId) {
                        userImageUrl = userData.userObject.imageUrl ? Buildfire.imageLib.cropImage(userData.userObject.imageUrl, {
                            width: 40,
                            height: 40
                        }) : '';
                        return true;
                    }
                });
                return userImageUrl;
            };

            ContentHome.approvePost = function (postId) {
                buildfire.dialog.confirm(
                    {
                        title: "Approve Post",
                        message: "Are you sure you want to approve this post?",
                        confirmButton: {
                            text: "Approve",
                            type: "success",
                        },
                    },
                    (err, isConfirmed) => {
                        if (err) console.error(err);
                        if (isConfirmed) {
                            Buildfire.getContext(function (err, context) {
                                const moderatorName = (context.currentUser && context.currentUser.displayName) || 'Admin';

                                buildfire.publicData.getById(postId, 'posts', function (err, post) {
                                    if (err) {
                                        console.error('Error getting post:', err);
                                        return;
                                    }

                                    post.data.status = 'approved';
                                    post.data.moderatedBy = moderatorName;
                                    post.data.moderatedOn = new Date();
                                    post.data.moderationReason = null;
                                    post.data._buildfire.index.string2 = 'approved';

                                    buildfire.publicData.update(postId, post.data, 'posts', function (err, result) {
                                        if (err) {
                                            console.error('Error approving post:', err);
                                            return;
                                        }

                                        Buildfire.messaging.sendMessageToWidget({ 'name': EVENTS.POST_APPROVED, 'id': postId });

                                        const postIndex = ContentHome.allPosts.findIndex(p => p.id === postId);
                                        if (postIndex !== -1) {
                                            ContentHome.allPosts[postIndex] = { ...result, id: postId };
                                        }
                                        ContentHome.updateCounts();
                                        ContentHome.applyFilter();
                                        if (!$scope.$$phase) $scope.$digest();

                                        buildfire.notifications.pushNotification.schedule({
                                            title: "Post Approved",
                                            text: "Your post has been approved and is now visible in the feed.",
                                            userIds: [post.data.userId]
                                        }, function(err, result) {
                                            if (err) console.error('Error sending notification:', err);
                                        });
                                    });
                                });
                            });
                        }
                    }
                );
            };

            ContentHome.rejectPost = function (postId) {
                buildfire.dialog.confirm(
                    {
                        title: "Reject Post",
                        message: "Are you sure you want to reject this post?",
                        confirmButton: {
                            text: "Reject",
                            type: "danger",
                        },
                    },
                    (err, isConfirmed) => {
                        if (err) console.error(err);
                        if (isConfirmed) {
                            Buildfire.getContext(function (err, context) {
                                const moderatorName = (context.currentUser && context.currentUser.displayName) || 'Admin';

                                buildfire.publicData.getById(postId, 'posts', function (err, post) {
                                    if (err) {
                                        console.error('Error getting post:', err);
                                        return;
                                    }

                                    post.data.status = 'rejected';
                                    post.data.moderatedBy = moderatorName;
                                    post.data.moderatedOn = new Date();
                                    post.data._buildfire.index.string2 = 'rejected';

                                    buildfire.publicData.update(postId, post.data, 'posts', function (err, result) {
                                        if (err) {
                                            console.error('Error rejecting post:', err);
                                            return;
                                        }

                                        Buildfire.messaging.sendMessageToWidget({ 'name': EVENTS.POST_REJECTED, 'id': postId });

                                        const postIndex = ContentHome.allPosts.findIndex(p => p.id === postId);
                                        if (postIndex !== -1) {
                                            ContentHome.allPosts[postIndex] = { ...result, id: postId };
                                        }
                                        ContentHome.updateCounts();
                                        ContentHome.applyFilter();
                                        if (!$scope.$$phase) $scope.$digest();

                                        buildfire.notifications.pushNotification.schedule({
                                            title: "Post Rejected",
                                            text: "Your post was rejected by a moderator.",
                                            userIds: [post.data.userId]
                                        }, function(err, result) {
                                            if (err) console.error('Error sending notification:', err);
                                        });
                                    });
                                });
                            });
                        }
                    }
                );
            };

            // Method for deleting post using SocialDataStore deletePost method
            ContentHome.deletePost = function (postId) {
                ContentHome.modalPopupThreadId = postId;

                buildfire.dialog.confirm(
                    {
                        title: "Delete Post",
                        message: `Are you sure you want to delete this post?`,
                        confirmButton: {
                            text: "Delete",
                            type: "danger",
                        },
                    },
                    (err, isConfirmed) => {
                        if (err) console.error(err);
                        if (isConfirmed) {
                            // Called when getting success from SocialDataStore.deletePost method
                            var success = function (response) {
                                console.log('inside success of delete post', response);
                                if (response) {
                                    Buildfire.messaging.sendMessageToWidget({ 'name': EVENTS.POST_DELETED, 'id': postId });
                                    console.log('post successfully deleted');

                                    ContentHome.posts = ContentHome.posts.filter(function (el) {
                                        return el.id != postId;
                                    });
                                }
                                ContentHome.loading = false;
                                if (!$scope.$$phase)
                                    $scope.$digest();
                            };
                            // Called when getting error from SocialDataStore.deletePost method
                            var error = function (err) {
                                console.log('Error while deleting post ', err);
                                ContentHome.loading = false;
                                if (!$scope.$$phase)
                                    $scope.$digest();
                            };

                            var postToDelete = ContentHome.posts.find(element => element.id === postId);
                            if (postToDelete) SocialDataStore.deleteFeedPost({ userId: postToDelete.userId, postText: postToDelete.text, postImages: postToDelete.imageUrl || [], }, (err, r) => { return });

                            // Deleting post having id as postId
                            SocialDataStore.deletePost(postId, ContentHome.socialAppId, datastoreWriteKey).then(success, error);
                        }
                    }
                );

                console.log('delete post method called', postId);

            };

            // Method for deleting comments of a post
            ContentHome.deleteComment = function (post, commentId) {
                ContentHome.modalPopupThreadId = commentId;

                buildfire.dialog.confirm(
                    {
                        title: "Delete Comment",
                        message: `Are you sure you want to delete this comment?`,
                        confirmButton: {
                            text: "Delete",
                            type: "danger",
                        },
                    },
                    (err, isConfirmed) => {
                        if (err) console.error(err);
                        if (isConfirmed) {
                            // Called when getting success from SocialDataStore.deletePost method
                            var success = function (response) {
                                console.log('inside success of delete comment', response);
                                if (response) {
                                    Buildfire.messaging.sendMessageToWidget({
                                        'name': EVENTS.COMMENT_DELETED,
                                        'comment': commentId,
                                        'postId': post.id
                                    });
                                    console.log('comment successfully deleted');
                                    let index = post.comments.indexOf(commentId);
                                    post.comments.splice(index, 1);
                                    if (!$scope.$$phase)
                                        $scope.$digest();
                                }
                            };
                            // Called when getting error from SocialDataStore.deletePost method
                            var error = function (err) {
                                console.log('Error while deleting post ', err);
                                ContentHome.loading = false;
                                if (!$scope.$$phase)
                                    $scope.$digest();
                            };

                            // Deleting post having id as postId
                            SocialDataStore.deleteComment(post.id, commentId).then(success, error);
                        }
                    }
                );
            };

            // Method for loading comments
            ContentHome.loadMoreComments = function (thread, viewComment) {
                var newUniqueLinksOfComments = [];
                var newUserIds = [];
                initialCommentsLength = (thread.comments && thread.comments.length) || null;
                if (viewComment && viewComment == 'viewComment' && thread.comments.length > 0)
                    thread.viewComments = thread.viewComments ? false : true;

                if (thread.commentsCount > 0 && thread.commentsCount != initialCommentsLength) {
                    SocialDataStore.getCommentsOfAPost({
                        threadId: thread._id,
                        lastCommentId: thread.comments && !viewComment ? thread.comments[thread.comments.length - 1]._id : null,
                        socialAppId: ContentHome.socialAppId
                    }).then(
                        function (data) {
                            console.log('Success in Content get Load more Comments---------', data);
                            if (data && data.data && data.data.result) {
                                thread.uniqueLinksOfComments = thread.uniqueLinksOfComments || [];

                                // Map postImages to imageUrl for each comment
                                const mappedComments = data.data.result.map(function(comment) {
                                    if (!comment.imageUrl && comment.postImages) {
                                        comment.imageUrl = comment.postImages;
                                    }
                                    if (!comment.imageUrl) {
                                        comment.imageUrl = [];
                                    }
                                    if (!comment.videos && comment.postVideos) {
                                        comment.videos = comment.postVideos;
                                    }
                                    if (!comment.videos) {
                                        comment.videos = [];
                                    }
                                    return comment;
                                });

                                thread.comments = thread.comments && !viewComment ? thread.comments.concat(mappedComments) : mappedComments;
                                thread.moreComments = thread.comments && thread.comments.length < thread.commentsCount ? false : true;
                                thread.comments.forEach(function (commentData) {
                                    if (thread.uniqueLinksOfComments.indexOf(commentData.threadId + "cmt" + commentData._id) == -1) {
                                        thread.uniqueLinksOfComments.push(commentData.threadId + "cmt" + commentData._id);
                                        newUniqueLinksOfComments.push(commentData.threadId + "cmt" + commentData._id);
                                    }

                                    if (userIds.indexOf(commentData.userId) == -1) {
                                        userIds.push(commentData.userId);
                                        newUserIds.push(commentData.userId);
                                    }
                                });

                                if (!$scope.$$phase) $scope.$digest();
                            }
                        },
                        function (err) {
                            console.log('Error get Load More Comments----------', err);
                        }
                    );
                }
            };

            ContentHome.seeMore = function (post) {
                post.seeMore = true;
                post.limit = 10000000;
                if (!$scope.$$phase) $scope.$digest();
            };

            ContentHome.seeLess = function (post) {
                post.seeMore = false;
                post.limit = 150;
                if (!$scope.$$phase) $scope.$digest();
            };

            // Method for getting Post's and Comment's creation time in User Readable Time Format
            ContentHome.getDuration = function (timestamp) {
                if (!timestamp) {
                    return '';
                }
                return moment(timestamp.toString()).fromNow();
            };

            ContentHome.exportMainWallPosts = function (mainCallback) {
                if (ContentHome.posts.length === 0)
                    return ;
                var allPosts = [];
                const pageSize = 50;
                var page = 0;
                let wid = ContentHome.posts[0].wid;

                ContentHome.exportingThreads = true;
                function parseToCSV() {
                    var lineArray = [];

                    allPosts.forEach(function (threadData) {
                        var _data = [];
                        _data.push('post');
                        _data.push(moment(threadData.data.createdOn).format('DD/MM/YYYY hh:mm a'));
                        _data.push(threadData.data.userDetails.displayName);
                        _data.push(ContentHome.util.injectAnchors(threadData.data.text));
                        lineArray.push(_data);
                        if (threadData.data.comments.length > 0) {
                            threadData.data.comments.forEach(function (commentData) {
                                var _data = [];
                                _data.push('comment');
                                _data.push(moment(commentData.createdOn).format('DD/MM/YYYY hh:mm a'));
                                _data.push(commentData.userDetails.displayName);
                                _data.push(commentData.comment);
                                lineArray.push(_data);
                            })
                        }
                    });
                    var csv = Papa.unparse({
                        fields: ["type", "date", "username", "text"],
                        data: lineArray,
                        config: {
                            quotes: true,
                            quoteChar: '"',
                            delimiter: ",",
                            header: true,
                            newline: "\r\n"
                        }
                    });


                    csv = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
                    var link = document.createElement("a");
                    var _fileName = "Social App Chat" + ".csv";
                    link.setAttribute("href", csv);
                    link.setAttribute("download", _fileName);
                    link.setAttribute("id", "exportThreadsLink");
                    document.body.appendChild(link); // Required for FF
                    link.click(); // This will download the data file named "my_data.csv".
                    link.parentNode.removeChild(link);
                    ContentHome.exportingThreads = false;
                    buildfire.spinner.hide();
                    if (!$scope.$$phase) $scope.$digest();
                }
                const loadPage = () => {
                    buildfire.spinner.show();
                    let searchOptions = {
                        page, pageSize, sort: { "createdOn": -1 }, recordCount: true,
                    }
                    if (wid === null)
                        searchOptions.filter = { "_buildfire.index.string1": "" }
                    else
                        searchOptions.filter = { "_buildfire.index.string1": { "$regex": wid, "$options": "i" } }
                    buildfire.publicData.search(searchOptions, 'posts', function (err, data) {
                        if (data && data.result.length) {
                            data.result.map(item => allPosts.push(item));
                            if (data.totalRecord > allPosts.length) {
                                page++; loadPage();
                            } else {
                                parseToCSV();
                            }
                        }
                    });
                }
                loadPage();

            }

            ContentHome.decodeText = function (text) {
                return decodeURIComponent(text);
            };

            $scope.initHesGallery = () => {
                setTimeout(() => {
                    HesGallery.init({
                        // disable scrolling when the popup is activated
                        disableScrolling: true,

                        // self-hosted styles
                        hostedStyles: true,

                        // enable/disable animation
                        animations: false,

                        // enable/disable keyboard navigation
                        keyboardControl: true,

                        // disable the plugin when the screen size is smaller than this value
                        minResolution: 0,

                        // enable/disable infinite loop
                        wrapAround: false,

                        // show/hide image count
                        showImageCount: true
                    });
                }, 0);
            }

            $scope.getUserName = function (userDetails) {
                let name = null;
                if (userDetails && userDetails.displayName !== 'Someone'
                    && userDetails.displayName) {
                    name = userDetails.displayName;
                }
                else if (userDetails && userDetails.firstName !== 'Someone' &&
                    userDetails.firstName && userDetails.lastName)
                    name = userDetails.firstName + ' ' + userDetails.lastName;
                else if (userDetails && userDetails.firstName !== 'Someone' &&
                    userDetails.firstName)
                    name = userDetails.firstName;
                else if (userDetails && userDetails.lastName)
                    name = userDetails.lastName;
                else name = 'Someone';
                return name;
            }

            Buildfire.messaging.onReceivedMessage = function (event) {
                console.log('[ContentHome] Received message from widget:', event);
                if (event) {
                    switch (event.name) {
                        case EVENTS.POST_CREATED:
                            console.log('[ContentHome] POST_CREATED event received:', event.post);
                            if (event.post) {
                                // Map postImages to images for template compatibility
                                if (!event.post.images && event.post.postImages) {
                                    event.post.images = event.post.postImages;
                                }
                                if (!event.post.images) {
                                    event.post.images = [];
                                }
                                // Map postVideos to videos
                                if (!event.post.videos && event.post.postVideos) {
                                    event.post.videos = event.post.postVideos;
                                }
                                if (!event.post.videos) {
                                    event.post.videos = [];
                                }
                                ContentHome.allPosts.unshift(event.post);
                                ContentHome.updateCounts();

                                // Auto-switch to pending tab if moderation is enabled and post is pending
                                if (ContentHome.moderationEnabled && event.post.status === 'pending') {
                                    ContentHome.filterStatus = 'pending';
                                    ContentHome.newPendingPost = true;
                                    ContentHome.notifyAdmin(1);
                                }

                                ContentHome.applyFilter();
                                console.log('[ContentHome] Post added, pending count:', ContentHome.pendingCount);
                                if (!$scope.$$phase) $scope.$digest();
                            }
                            break;
                        case EVENTS.POST_LIKED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.id) {
                                    el.likes.push(event.userId);
                                    return true;
                                }
                            });
                            break;
                        case EVENTS.POST_UNLIKED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.id) {
                                    let index = el.likes.indexOf(event.userId)
                                    el.likes.splice(index, 1)
                                    return true;
                                }
                            });
                            break;
                        case EVENTS.COMMENT_ADDED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.id) {
                                    // Map postImages to imageUrl for comment template compatibility
                                    if (event.comment) {
                                        if (!event.comment.imageUrl && event.comment.postImages) {
                                            event.comment.imageUrl = event.comment.postImages;
                                        }
                                        if (!event.comment.imageUrl) {
                                            event.comment.imageUrl = [];
                                        }
                                        // Map postVideos to videos
                                        if (!event.comment.videos && event.comment.postVideos) {
                                            event.comment.videos = event.comment.postVideos;
                                        }
                                        if (!event.comment.videos) {
                                            event.comment.videos = [];
                                        }
                                    }
                                    el.comments.push(event.comment)
                                    return true;
                                }
                            });
                            if (!$scope.$$phase) $scope.$digest();
                            break;
                        case EVENTS.POST_DELETED:
                            ContentHome.allPosts = ContentHome.allPosts.filter(function (el) {
                                return el.id != event.id;
                            });
                            ContentHome.updateCounts();
                            ContentHome.applyFilter();
                            ContentHome.loading = false;
                            if (ContentHome.modalPopupThreadId == event._id)
                                Modals.close('Post already deleted');
                            break;
                        case EVENTS.COMMENT_DELETED:
                            ContentHome.posts.map((post, index) => {
                                if (post.id === event.post.id) {
                                    post.comments.splice(index, 1);
                                }
                            });
                            if (ContentHome.modalPopupThreadId == event._id)
                                Modals.close('Comment already deleted');
                            break;
                        case EVENTS.COMMENT_LIKED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.postId) {
                                    if (el.comments && el.comments.length) {
                                        el.comments.some(function (commentData) {
                                            if (commentData.id == event.id) {
                                                let liked = commentData.likes.find(element => element === event.userId);
                                                let index = commentData.likes.indexOf(liked)
                                                if (liked !== undefined)
                                                    commentData.likes.splice(index, 1)
                                                else
                                                    commentData.likes.push(event.userId);
                                                return true;
                                            }
                                        });
                                    }
                                    return true;
                                }
                            });
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        default:
                            ContentHome.loading = false;
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                    }
                    if (!$scope.$$phase)
                        $scope.$digest();
                }
            };

            // Init WYSIWYG
            let appSettings = {};
            let updateDelay;
            tinymce.init({
                selector: "textarea",
                branding: false,
                statusbar: false,
                setup: (ed) => {
                    ed.on('KeyUp', (e) => {
                        clearTimeout(updateDelay);
                        updateDelay = setTimeout(() => {
                            if(ContentHome.appSettings){
                                appSettings = ContentHome.appSettings.appSettings ? ContentHome.appSettings.appSettings : {};
                            }else{
                                appSettings = {};
                            }
                            appSettings.pinnedPost = ed.getContent();
                            buildfire.datastore.save({ appSettings: appSettings }, "Social", console.log)
                        }, 700);
                    });
                    ed.on('change', (e) => {
                        clearTimeout(updateDelay);
                        updateDelay = setTimeout(() => {
                            if(ContentHome.appSettings){
                                appSettings = ContentHome.appSettings.appSettings ? ContentHome.appSettings.appSettings : {};
                            }else{
                                appSettings = {};
                            }
                            appSettings.pinnedPost = ed.getContent();
                            buildfire.datastore.save({ appSettings: appSettings }, "Social", console.log)
                        }, 700);
                    });
                }
            });

            ContentHome.saveDefaultSocial = () => {
                appSettings=  {
                    ...appSettings,
                    "mainThreadUserTags": appSettings.mainThreadUserTags ? appSettings.mainThreadUserTags : [],
                    "sideThreadUserTags": appSettings.sideThreadUserTags ? appSettings.sideThreadUserTags : [],
                    "showMembers": typeof appSettings.showMembers === 'boolean' ? appSettings.showMembers : true,
                    "allowCommunityFeedFollow": typeof appSettings.allowCommunityFeedFollow === 'boolean' ? appSettings.allowCommunityFeedFollow : false,
                    "seeProfile": typeof appSettings.seeProfile === 'boolean' ? appSettings.seeProfile : false,
                    "allowAutoSubscribe": typeof appSettings.allowAutoSubscribe === 'boolean' ? appSettings.allowAutoSubscribe : true,
                    "allowChat": appSettings.allowChat ? appSettings.allowChat : "allUsers",
                }
                buildfire.datastore.save({ appSettings: appSettings }, "Social", (err, res) => {
                    if (err) return console.error(err);
                })
            }

            window.onload = function () {
                buildfire.datastore.get("Social", function (err, result) {
                    if (result.data && result.data.appSettings) {
                        appSettings = result.data.appSettings;

                        if (appSettings.pinnedPost) tinymce.activeEditor.setContent(result.data.appSettings.pinnedPost);
                    }
                    
                    if (!result.data.appSettings || typeof result.data.appSettings.allowAutoSubscribe !== 'boolean') {
                        ContentHome.saveDefaultSocial();
                    }
                });
                setTimeout(() => {
                    ContentHome.loading = false;
                    if (!$scope.$$phase)
                        $scope.$digest();
                }, 1500)
            }

            init();
        }]);
})(window.angular);

