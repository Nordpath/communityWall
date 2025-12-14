'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
      .controller('WidgetWallCtrl', ['$scope', 'SocialDataStore', 'Buildfire', '$rootScope', 'Location', 'EVENTS', 'GROUP_STATUS', 'MORE_MENU_POPUP', 'FILE_UPLOAD', 'SocialItems', '$q', '$anchorScroll', '$location', '$timeout', 'Util', 'SubscribedUsersData', function ($scope, SocialDataStore, Buildfire, $rootScope, Location, EVENTS, GROUP_STATUS, MORE_MENU_POPUP, FILE_UPLOAD, SocialItems, $q, $anchorScroll, $location, $timeout, util, SubscribedUsersData) {
          var WidgetWall = this;

          WidgetWall.userDetails = {};
          WidgetWall.postText = '';
          WidgetWall.modalPopupThreadId;

          WidgetWall.allowCreateThread = true;
          WidgetWall.allowPrivateChat = false;
          WidgetWall.allowFollowLeaveGroup = true;
          WidgetWall.groupFollowingStatus = false;
          WidgetWall.postsLoaded = false;

          WidgetWall.threadTag = "thread";
          WidgetWall.appTheme = null;

          WidgetWall.loadedPlugin = false;
          WidgetWall.SocialItems = SocialItems.getInstance();
          WidgetWall.util = util;
          $rootScope.showThread = true;
          WidgetWall.loading = true;
          WidgetWall.scrollPosition = null;
          WidgetWall.skeletonActive = false;
          WidgetWall.deeplinkHandled = false;
          WidgetWall.isFromDeepLink= false;
          WidgetWall.skeleton = null;

          // Testing mode: Add ?testVideoRetry=true to URL to simulate delayed API initialization
          var urlParams = new URLSearchParams(window.location.search);
          var testVideoRetry = urlParams.get('testVideoRetry') === 'true';
          if (testVideoRetry && buildfire && buildfire.services && buildfire.services.publicFiles) {
              console.log('[TEST MODE] Simulating delayed video upload API initialization');
              var originalUploadFiles = buildfire.services.publicFiles.uploadFiles;
              var originalUploadFile = buildfire.services.publicFiles.uploadFile;

              // Temporarily hide the upload APIs
              buildfire.services.publicFiles.uploadFiles = undefined;
              buildfire.services.publicFiles.uploadFile = undefined;

              // Restore them after 2.5 seconds to test retry logic
              setTimeout(function() {
                  console.log('[TEST MODE] Restoring video upload API');
                  buildfire.services.publicFiles.uploadFiles = originalUploadFiles;
                  buildfire.services.publicFiles.uploadFile = originalUploadFile;
              }, 2500);
          }

          WidgetWall.activeTab = 'newest';

          WidgetWall.initSkeleton = function () {
            if (!WidgetWall.skeleton) {
              try {
                WidgetWall.skeleton = new Buildfire.components.skeleton('.social-item', {
                  type: 'list-item-avatar, list-item-two-line, image'
                });
              } catch (err) {
                console.warn('Skeleton initialization failed:', err);
              }
            }
          };

          WidgetWall.startSkeleton = function () {
            if (!WidgetWall.skeleton) {
              WidgetWall.initSkeleton();
            }
            if (WidgetWall.skeleton && !WidgetWall.skeletonActive) {
              WidgetWall.skeleton.start();
              WidgetWall.skeletonActive = true;
            }
          }

          WidgetWall.stopSkeleton = function () {
            WidgetWall.postsLoaded = true;
            if (WidgetWall.skeleton && WidgetWall.skeletonActive) {
              WidgetWall.skeleton.stop();
              WidgetWall.skeletonActive = false;
            }
          }

          WidgetWall.initFabButtons = function () {
              if (WidgetWall.fabSpeedDial) {
                  WidgetWall.fabSpeedDial.destroy();
                  WidgetWall.fabSpeedDial = null;
              }
              let options = {}
              let actionItem = WidgetWall.SocialItems.appSettings.actionItem;
              if (actionItem && actionItem.iconUrl && WidgetWall.allowCreateThread) {
                  options = {
                      mainButton: {
                          content: `<span class="material-icons">menu</span>`,
                          type: 'default',
                      },
                      buttons: [
                          {
                              content: '<i class="material-icons">add</i>',
                              type: 'success',
                              onClick: () => WidgetWall.openPostSection()
                          },
                          {
                              content: `<span><img src="${actionItem.iconUrl}"</span>`,
                              onClick: () => WidgetWall.navigateTo()
                          },
                      ]
                  }
              }
              else if (WidgetWall.allowCreateThread) {
                    options = {
                        mainButton: {
                            content: `<span class="material-icons">add</span>`,
                            type: 'success',
                        },
                    }
              }
              else if (actionItem && actionItem.iconUrl) {
                    options = {
                        mainButton: {
                            content: `<span><img src="${actionItem.iconUrl}"</span>`,
                            type: 'default',
                        },
                    }
              }
              else {
                  // Always show the FAB button for creating posts by default
                  options = {
                      mainButton: {
                          content: `<span class="material-icons">add</span>`,
                          type: 'success',
                      },
                  }
              }
              WidgetWall.fabSpeedDial = new buildfire.components.fabSpeedDial('#addBtn',options);
              if (WidgetWall.allowCreateThread || !actionItem || !actionItem.iconUrl) {
                  WidgetWall.fabSpeedDial.onMainButtonClick = () => WidgetWall.openPostSection()

              }
              else if (actionItem && actionItem.iconUrl) {
                  WidgetWall.fabSpeedDial.onMainButtonClick = () => WidgetWall.navigateTo()
              }

              setTimeout(function() {
                  WidgetWall.adjustLayoutForBottomLogo();
              }, 100);
          }

          WidgetWall.initScrollDetection = function () {
          }

          WidgetWall.subscribeToPushNotifications = function (groupName, callback) {
              callback = callback || function() {};

              if (!buildfire || !buildfire.notifications || !buildfire.notifications.pushNotification) {
                  console.warn('Push notification API not available');
                  return callback(new Error('Push notification API not available'));
              }

              if (!buildfire.device || !buildfire.device.onReady) {
                  console.warn('Device API not available (desktop mode)');
                  buildfire.notifications.pushNotification.subscribe({
                      groupName: groupName
                  }, callback);
                  return;
              }

              var attemptSubscribe = function(retryCount) {
                  retryCount = retryCount || 0;
                  var maxRetries = 3;

                  buildfire.device.onReady(function() {
                      buildfire.notifications.pushNotification.subscribe({
                          groupName: groupName
                      }, function(err, result) {
                          if (err) {
                              console.error('Error subscribing to push notifications:', err);
                              if (retryCount < maxRetries) {
                                  setTimeout(function() {
                                      attemptSubscribe(retryCount + 1);
                                  }, 1000 * (retryCount + 1));
                              } else {
                                  callback(err);
                              }
                          } else {
                              console.log('Successfully subscribed to push notifications');
                              callback(null, result);
                          }
                      });
                  }, function(err) {
                      console.warn('Device not ready, retrying push notification subscription...');
                      if (retryCount < maxRetries) {
                          setTimeout(function() {
                              attemptSubscribe(retryCount + 1);
                          }, 1000 * (retryCount + 1));
                      } else {
                          console.error('Device never became ready for push notifications');
                          callback(new Error('Device not ready'));
                      }
                  });
              };

              attemptSubscribe(0);
          }

          WidgetWall.showHideCommentBox = function () {
              if (WidgetWall.SocialItems && WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.allowMainThreadTags &&
                WidgetWall.SocialItems.appSettings.mainThreadUserTags && WidgetWall.SocialItems.appSettings.mainThreadUserTags.length > 0
              ) {
                  var _userTagsObj = WidgetWall.SocialItems.userDetails.userTags;
                  var _userTags = [];
                  if (_userTagsObj) {
                      _userTags = _userTagsObj[Object.keys(_userTagsObj)[0]];
                  }

                  if (_userTags && !WidgetWall.SocialItems.userBanned) {
                      var _hasPermission = false;
                      for (var i = 0; i < WidgetWall.SocialItems.appSettings.mainThreadUserTags.length; i++) {
                          var _mainThreadTag = WidgetWall.SocialItems.appSettings.mainThreadUserTags[i].text;
                          for (var x = 0; x < _userTags.length; x++) {
                              if (_mainThreadTag.toLowerCase() == _userTags[x].tagName.toLowerCase()) {
                                  _hasPermission = true;
                                  break;
                              }
                          }
                      }
                      WidgetWall.allowCreateThread = _hasPermission;
                      if (WidgetWall.SocialItems.userBanned) WidgetWall.allowCreateThread = false;
                  } else {
                      WidgetWall.allowCreateThread = false;
                  }
              } else {
                  if (WidgetWall.SocialItems.userBanned) WidgetWall.allowCreateThread = false;
                  else WidgetWall.allowCreateThread = true;
              }

              if (!WidgetWall.allowCreateThread && WidgetWall.SocialItems.isPrivateChat) {
                  WidgetWall.allowCreateThread = true;
              }
          };

          WidgetWall.showHidePrivateChat = function () {
              if (WidgetWall.SocialItems && WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.disablePrivateChat) {
                  WidgetWall.allowPrivateChat = false;
              } else {
                  WidgetWall.allowPrivateChat = true;
              }
          };

          WidgetWall.followLeaveGroupPermission = function () {
              if (WidgetWall.SocialItems && WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.disableFollowLeaveGroup) {
                  WidgetWall.allowFollowLeaveGroup = false;
              } else {
                  WidgetWall.allowFollowLeaveGroup = true;
              }
          };

          WidgetWall.formatLanguages = function (strings) {
              Object.keys(strings).forEach(e => {
                  strings[e].value ? WidgetWall.SocialItems.languages[e] = strings[e].value : WidgetWall.SocialItems.languages[e] = strings[e].defaultValue;
              });
          }

          WidgetWall.setSettings = function (settings) {
              WidgetWall.SocialItems.appSettings = settings.data && settings.data.appSettings ? settings.data.appSettings : {};
              SubscribedUsersData.indexingUpdateDone = WidgetWall.SocialItems.appSettings.indexingUpdateDone ? WidgetWall.SocialItems.appSettings.indexingUpdateDone : false;
              WidgetWall.SocialItems.indexingUpdateDone = WidgetWall.SocialItems.appSettings.indexingUpdateDone ? WidgetWall.SocialItems.appSettings.indexingUpdateDone : false;
              WidgetWall.showHidePrivateChat();
              WidgetWall.followLeaveGroupPermission();
              WidgetWall.showHideCommentBox();
              WidgetWall.initFabButtons();
              setTimeout(function() {
                  WidgetWall.initScrollDetection();
              }, 200);
              let dldActionItem = new URLSearchParams(window.location.search).get('actionItem');
              if (dldActionItem)
                  WidgetWall.SocialItems.appSettings.actionItem = JSON.parse(dldActionItem);

              let actionItem = WidgetWall.SocialItems.appSettings.actionItem;
              if (actionItem && actionItem.iconUrl) {
                  actionItem.iconUrl = buildfire.imageLib.cropImage(actionItem.iconUrl, {
                      size: 's',
                      aspect: '1:1'
                  })
                  angular.element('#actionBtn').attr('style', `background-image: url(${actionItem.iconUrl}) !important; background-size: cover !important;`);
              }

              if (typeof (WidgetWall.SocialItems.appSettings.showMembers) == 'undefined')
                  WidgetWall.SocialItems.appSettings.showMembers = true;
              if (typeof (WidgetWall.SocialItems.appSettings.allowAutoSubscribe) == 'undefined')
                  WidgetWall.SocialItems.appSettings.allowAutoSubscribe = true;

              let pinnedPostMessage = null;
              if (WidgetWall.SocialItems.appSettings && typeof WidgetWall.SocialItems.appSettings.pinnedPost !== 'undefined' && !WidgetWall.SocialItems.headerContent) {
                  pinnedPostMessage = WidgetWall.SocialItems.appSettings.pinnedPost;
              } else if(WidgetWall.SocialItems.headerContent) {
                  pinnedPostMessage = WidgetWall.SocialItems.headerContent;
              }

              WidgetWall.pinnedPost = pinnedPostMessage;
              pinnedPost.innerHTML = pinnedPostMessage;

              WidgetWall.loadedPlugin = true;
              $scope.$digest();

          }

          WidgetWall.setAppTheme = function () {
              buildfire.appearance.getAppTheme((err, obj) => {
                  let elements = document.getElementsByTagName('svg');
                  for (var i = 0; i < elements.length; i++) {
                      elements[i].style.setProperty("fill", obj.colors.icons, "important");
                  }
                  WidgetWall.appTheme = obj.colors;

                  var socialHeader = document.getElementById('socialHeader');
                  if (socialHeader) {
                      socialHeader.style.setProperty("background-color", obj.colors.backgroundColor, "important");
                  }
                  WidgetWall.loadedPlugin = true;
              });
          }

          WidgetWall.switchTab = function (tab) {
              if (WidgetWall.activeTab === tab) return;

              WidgetWall.activeTab = tab;
              WidgetWall.SocialItems.items = [];
              WidgetWall.SocialItems.page = 0;
              WidgetWall.SocialItems.showMorePosts = false;
              WidgetWall.postsLoaded = false;

              WidgetWall.updateFabVisibility(tab);

              WidgetWall.getPosts(() => {
                  WidgetWall.postsLoaded = true;
                  $scope.$digest();
              });
          }

          WidgetWall.updateFabVisibility = function (tab) {
              var fabElement = document.getElementById('addBtn');
              if (!fabElement) return;

              if (tab === 'myPosts') {
                  fabElement.classList.add('fab-hidden-tab');
              } else {
                  fabElement.classList.remove('fab-hidden-tab');
              }
          }

          WidgetWall.handleImageError = function (event, imageUrl, postId) {
              console.error('[ImageError] Image failed to load:', {
                  imageUrl: imageUrl,
                  postId: postId,
                  errorEvent: event,
                  targetSrc: event && event.target ? event.target.src : 'unknown',
                  timestamp: new Date().toISOString()
              });
              if (event && event.target) {
                  event.target.style.display = 'none';
              }
          }

          WidgetWall.isValidImageUrl = function (url) {
              if (!url || url === '' || url === 'undefined' || url === 'null') {
                  console.warn('[ImageValidation] Invalid URL detected:', url);
                  return false;
              }
              return true;
          }

          WidgetWall.getPosts = function (callback = null)  {
              WidgetWall.SocialItems.getPosts(WidgetWall.activeTab, function (err, data) {
                  window.buildfire.messaging.sendMessageToControl({
                      name: 'SEND_POSTS_TO_CP',
                      posts: WidgetWall.SocialItems.items,
                      pinnedPost: WidgetWall.pinnedPost,
                      wid: WidgetWall.SocialItems.wid
                  });
                  if (callback) {
                      return callback(null, data);
                  }
              });
          }

          $rootScope.isItemLiked = function (post, userId) {
            if (!post || !post.likes || !post.likes.length) return false;
            return post.likes.includes(userId);
          }

          WidgetWall.checkFollowingStatus = function (user = null, callback = null) {
              WidgetWall.loading = true;
              SubscribedUsersData.getGroupFollowingStatus(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                  if (err) {
                      console.log('error while getting initial group following status.', err);
                      if (callback) {
                          return callback(err);
                      }
                  } else {
                      if (!status.length && WidgetWall.SocialItems.appSettings.allowAutoSubscribe) {
                          WidgetWall.loading = false;
                          if (callback) {
                              WidgetWall.followWall();
                              return callback(null);
                          } else {
                              return WidgetWall.followWall();
                          }
                      }
                      if (status.length) {
                          if (!status[0].data.leftWall) {
                              buildfire.notifications.pushNotification.subscribe({
                                  groupName: WidgetWall.SocialItems.wid === '' ?
                                    WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                              }, () => {});
                              WidgetWall.groupFollowingStatus = true;
                          } else if (status[0].data.banned) {

                              WidgetWall.SocialItems.userBanned = true;
                              WidgetWall.allowFollowLeaveGroup = false;
                              WidgetWall.allowCreateThread = false;
                              WidgetWall.SocialItems.appSettings.showMembers = false;
                              WidgetWall.groupFollowingStatus = false;
                          }
                      }
                      WidgetWall.showHideCommentBox();
                      if (user) WidgetWall.statusCheck(status, user);
                      buildfire.spinner.hide();
                      WidgetWall.loading = false;
                      $scope.$digest();
                      if (callback) {
                          return callback(null, status);
                      }
                  }
              });
          }

          WidgetWall.unfollowWall = function () {
              SubscribedUsersData.unfollowWall(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, function (err, result) {
                  if (err) return console.error(err);
                  else {
                      Follows.unfollowPlugin((err, r) => err ? console.log(err) : console.log(r));
                      WidgetWall.groupFollowingStatus = false;
                      buildfire.notifications.pushNotification.unsubscribe({
                          groupName: WidgetWall.SocialItems.wid === '' ?
                            WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                      }, () => {});
                      const options = {
                          text: 'You have left this group'
                      };
                      buildfire.components.toast.showToastMessage(options, () => {});
                      $scope.$digest();
                  }
              });
          }

          WidgetWall.followWall = function () {
              let user = WidgetWall.SocialItems.userDetails;
              var params = {
                  userId: user.userId,
                  userDetails: {
                      displayName: user.displayName,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      imageUrl: user.imageUrl,
                      email: user.email,
                      lastUpdated: new Date().getTime(),
                  },
                  wallId: WidgetWall.SocialItems.wid,
                  posts: [],
                  _buildfire: {
                      index: {
                          text: user.userId + '-' + WidgetWall.SocialItems.wid,
                          string1: WidgetWall.SocialItems.wid
                      }
                  }
              };
              Follows.followPlugin((e, u) => e ? console.log(e) : console.log(u));

              SubscribedUsersData.save(params, function (err) {
                  if (err) console.log('Error while saving subscribed user data.');
                  else {
                      WidgetWall.groupFollowingStatus = true;
                      var groupName = WidgetWall.SocialItems.wid === '' ?
                            WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid;
                      WidgetWall.subscribeToPushNotifications(groupName);
                      buildfire.spinner.hide();
                      WidgetWall.loading = false;
                      $scope.$digest();
                  }
              });
          }

          WidgetWall.followUnfollow = function () {
              if (WidgetWall.groupFollowingStatus) return WidgetWall.unfollowWall();
              else {
                  WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (user) {
                          WidgetWall.loading = true;
                          buildfire.spinner.show();
                          SubscribedUsersData.getGroupFollowingStatus(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                              if (err) console.log('error while getting initial group following status.', err);
                              else {
                                  if (!status.length) return WidgetWall.followWall();
                                  else if (status.length && status[0].data.leftWall) {
                                      status[0].data.leftWall = false;
                                      Follows.followPlugin((e, u) => e ? console.log(e) : console.log(u));
                                      buildfire.publicData.update(status[0].id, SubscribedUsersData.getDataWithIndex(status[0]).data, 'subscribedUsersData', console.log);
                                      var groupName = WidgetWall.SocialItems.wid === '' ?
                                            WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid;
                                      WidgetWall.subscribeToPushNotifications(groupName);
                                      WidgetWall.groupFollowingStatus = true;
                                  } else if (status.length && !status[0].data.leftWall)
                                      return WidgetWall.unfollowWall();
                                  WidgetWall.showHideCommentBox();
                                  if (user) WidgetWall.statusCheck(status, user);
                                  buildfire.spinner.hide();
                                  WidgetWall.loading = false;
                                  $scope.$digest();
                              }
                          });
                      }
                  });
              }
          }

          WidgetWall.scheduleNotification = function (post, text) {
              let options = {
                  title: 'Notification',
                  text: '',
                  users: [],
                  sendToSelf: false
              };

              if (text === 'like' && post.userId === WidgetWall.SocialItems.userDetails.userId) return;

              util.setExpression({ title: WidgetWall.SocialItems.context.title });

              const queryStringObj = {};
              if (WidgetWall.SocialItems.wid) {
                  queryStringObj.wid = WidgetWall.SocialItems.wid;
              }
              else {
                  queryStringObj.postId =post.id;
              }

              if (WidgetWall.SocialItems.pluginTitle) {
                queryStringObj.wTitle = WidgetWall.SocialItems.pluginTitle;
              }

              let titleKey, messageKey, inAppMessageKey;
              if (WidgetWall.SocialItems.isPrivateChat) {
                if (text === 'post') {
                    titleKey = WidgetWall.SocialItems.languages.personalNotificationMessageTitle;
                    messageKey = WidgetWall.SocialItems.languages.personalNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.personalInAppMessageBody;
                } else if (text === 'like') {
                    titleKey = WidgetWall.SocialItems.languages.postLikeNotificationTitle;
                    messageKey = WidgetWall.SocialItems.languages.postLikeNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.postLikeInAppMessageBody;
                }
                    Promise.all([util.evaluateExpression(titleKey), util.evaluateExpression(messageKey), util.evaluateExpression(inAppMessageKey)])
                    .then(([title, message, inAppMessage]) => {
                        options.title = title;
                        options.text = message;
                        options.inAppMessage = inAppMessage;

                        let userIdsTosSend = [];
                        if (WidgetWall.SocialItems.userIds) {
                            queryStringObj.userIds = WidgetWall.SocialItems.userIds;

                            const userIds = WidgetWall.SocialItems.userIds.split(',').filter((userId) => userId !== WidgetWall.SocialItems.userDetails.userId);
                            userIdsTosSend = userIds;
                        } else {
                            const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                            const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                            let userToSend = user1Id === WidgetWall.SocialItems.userDetails.userId ?
                              user2Id : user1Id;
                            userIdsTosSend.push(userToSend);
                            queryStringObj.userIds = [user1Id, user2Id];
                        }

                        options.queryString =`&dld=${encodeURIComponent(JSON.stringify({...queryStringObj }))}`

                        for (const userToSend of userIdsTosSend) {
                            SubscribedUsersData.getGroupFollowingStatus(userToSend, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                                if (err) console.error('Error while getting initial group following status.', err);
                                if (status.length && status[0].data && !status[0].data.leftWall) {
                                    options.users.push(userToSend);

                                    buildfire.notifications.pushNotification.schedule(options, function (err) {
                                        if (err) return console.error('Error while setting PN schedule.', err);
                                    });
                                } else if (!status.length && WidgetWall.SocialItems.appSettings.allowAutoSubscribe) {
                                    buildfire.auth.getUserProfile({
                                        userId: userToSend
                                    }, (err, user) => {
                                        if (err || !user) return console.error(err);
                                        options.users.push(userToSend);

                                        buildfire.notifications.pushNotification.schedule(options, function (err) {
                                            if (err) return console.error('Error while setting PN schedule.', err);
                                        });
                                    });
                                }
                            });
                        }
                    })
              } else {
                if (text === 'post') {
                    titleKey = WidgetWall.SocialItems.languages.publicNotificationMessageTitle;
                    messageKey = WidgetWall.SocialItems.languages.publicNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.publicInAppMessageBody;
                } else if (text === 'like') {
                    titleKey = WidgetWall.SocialItems.languages.postLikeNotificationTitle;
                    messageKey = WidgetWall.SocialItems.languages.postLikeNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.postLikeInAppMessageBody;
                    options.users.push(post.userId);
                }
                    Promise.all([util.evaluateExpression(titleKey), util.evaluateExpression(messageKey), util.evaluateExpression(inAppMessageKey)])
                    .then(([title, message, inAppMessage]) => {
                        options.title = title;
                        options.text = message;
                        options.inAppMessage = inAppMessage;

                        options.queryString =`&dld=${encodeURIComponent(JSON.stringify({...queryStringObj }))}`
                        if (WidgetWall.SocialItems.wid) {
                          options.groupName = WidgetWall.SocialItems.wid;
                        } else {
                          options.groupName = WidgetWall.SocialItems.context.instanceId;
                        }

                        buildfire.notifications.pushNotification.schedule(options, function (err) {
                            if (err) return console.error('Error while setting PN schedule.', err);
                            console.log("SENT NOTIFICATION", options);
                        });
                    })
              }
          }

          WidgetWall.openBottomDrawer = function (post) {
              buildfire.spinner.show();
              let listItems = [];
              let userId = post.userId;
              WidgetWall.modalPopupThreadId = post.id;

              function buildMenuItems(isFollowing, canChat) {
                  if (post.userId === WidgetWall.SocialItems.userDetails.userId) {
                      listItems.push({ id: 'deletePost', text: WidgetWall.SocialItems.languages.deletePost });
                  } else {
                      listItems.push({ id: 'reportPost', text: WidgetWall.SocialItems.languages.reportPost });
                  }

                  if (WidgetWall.SocialItems.appSettings.allowCommunityFeedFollow == true && post.userId != WidgetWall.SocialItems.userDetails.userId) {
                      listItems.push({ text: isFollowing ? 'Unfollow' : 'Follow' });
                  }

                  if (WidgetWall.SocialItems.appSettings.seeProfile && post.userId != WidgetWall.SocialItems.userDetails.userId) {
                      listItems.push({ text: "See Profile" });
                  }

                  var showDM = false;
                  if (post.userId != WidgetWall.SocialItems.userDetails.userId && !WidgetWall.SocialItems.isPrivateChat) {
                      if (WidgetWall.SocialItems.appSettings && !WidgetWall.SocialItems.appSettings.allowChat &&
                          ((WidgetWall.SocialItems.appSettings && !WidgetWall.SocialItems.appSettings.disablePrivateChat) || WidgetWall.SocialItems.appSettings.disablePrivateChat == false)) {
                          showDM = true;
                      } else if (WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.allowChat == "allUsers") {
                          showDM = true;
                      } else if (WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.allowChat == "selectedUsers" && canChat) {
                          showDM = true;
                      }
                  }
                  if (showDM) listItems.push({ text: 'Send Direct Message' });

                  if (post.userId != WidgetWall.SocialItems.userDetails.userId) {
                      listItems.push({ id: 'blockUser', text: WidgetWall.SocialItems.languages.blockUser });
                  }

                  WidgetWall.ContinueDrawer(post, listItems);
              }

              function proceedWithMenu() {
                  WidgetWall.checkFollowingStatus();
                  var isFollowing = false;
                  var canChat = false;
                  var pendingCalls = 0;
                  var needsFollowCheck = WidgetWall.SocialItems.appSettings.allowCommunityFeedFollow == true && post.userId != WidgetWall.SocialItems.userDetails.userId;
                  var needsChatCheck = WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.allowChat == "selectedUsers" &&
                      !WidgetWall.SocialItems.isPrivateChat && post.userId != WidgetWall.SocialItems.userDetails.userId;

                  if (needsFollowCheck) pendingCalls++;
                  if (needsChatCheck) pendingCalls++;

                  function checkComplete() {
                      pendingCalls--;
                      if (pendingCalls <= 0) buildMenuItems(isFollowing, canChat);
                  }

                  if (pendingCalls === 0) {
                      buildMenuItems(isFollowing, canChat);
                      return;
                  }

                  if (needsFollowCheck) {
                      Follows.isFollowingUser(userId, (err, r) => {
                          isFollowing = r;
                          checkComplete();
                      });
                  }

                  if (needsChatCheck) {
                      SubscribedUsersData.checkIfCanChat(userId, (err, response) => {
                          canChat = response;
                          checkComplete();
                      });
                  }
              }

              if (WidgetWall.SocialItems.userDetails && WidgetWall.SocialItems.userDetails.userId) {
                  proceedWithMenu();
              } else {
                  WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                      if (err) { buildfire.spinner.hide(); return console.error("Getting user failed.", err); }
                      if (!userData) { buildfire.spinner.hide(); return false; }
                      proceedWithMenu();
                  });
              }
          }

          WidgetWall.ContinueDrawer = function (post, listItems) {
              buildfire.spinner.hide();
              let userId = post.userId;
              if (listItems.length == 0) return;
              Buildfire.components.drawer.open({
                  enableFilter: false,
                  listItems: listItems
              }, (err, result) => {
                  if (err) return console.error(err);
                  else if (result.text == "Send Direct Message") WidgetWall.SocialItems.openChat(WidgetWall, userId);
                  else if (result.text == "See Profile") buildfire.auth.openProfile(userId);
                  else if (result.text == "Unfollow") Follows.unfollowUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.text == "Follow") Follows.followUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.id == "reportPost") WidgetWall.reportPost(post);
                  else if (result.id == "blockUser") WidgetWall.blockUser(userId, post.userDetails);
                  else if (result.id == "editPost") WidgetWall.editPost(post);
                  else if (result.id == "deletePost") WidgetWall.deletePost(post.id);
                  buildfire.components.drawer.closeDrawer();
              });
          }


          WidgetWall.getBlockedUsers = function(callback) {
              SubscribedUsersData.getBlockedUsers((err, result)=>{
                  if (err) {
                      callback("Fetching Blocked Users Failed", null);
                  }
                  else if(result) callback(null, result);
                  else callback(null, null);
              })
          }
          WidgetWall.bottomLogo = {
              displayMode: 'logo',
              imageUrl: '',
              linkUrl: '',
              enabled: false
          };

          WidgetWall.imageGallery = {
              show: false,
              images: [],
              currentIndex: 0
          };

          WidgetWall.closeImageGallery = function (event) {
              if (event) {
                  event.preventDefault();
                  event.stopPropagation();
              }
              WidgetWall.imageGallery.show = false;
              WidgetWall.imageGallery.images = [];
              WidgetWall.imageGallery.currentIndex = 0;
              if (!$scope.$$phase) {
                  $scope.$apply();
              }
          };

          WidgetWall.prevImage = function (event) {
              if (event) {
                  event.preventDefault();
                  event.stopPropagation();
              }
              if (WidgetWall.imageGallery.currentIndex > 0) {
                  WidgetWall.imageGallery.currentIndex--;
              } else {
                  WidgetWall.imageGallery.currentIndex = WidgetWall.imageGallery.images.length - 1;
              }
              if (!$scope.$$phase) {
                  $scope.$apply();
              }
          };

          WidgetWall.nextImage = function (event) {
              if (event) {
                  event.preventDefault();
                  event.stopPropagation();
              }
              if (WidgetWall.imageGallery.currentIndex < WidgetWall.imageGallery.images.length - 1) {
                  WidgetWall.imageGallery.currentIndex++;
              } else {
                  WidgetWall.imageGallery.currentIndex = 0;
              }
              if (!$scope.$$phase) {
                  $scope.$apply();
              }
          };

          WidgetWall.goToImage = function (event, index) {
              if (event) {
                  event.preventDefault();
                  event.stopPropagation();
              }
              WidgetWall.imageGallery.currentIndex = index;
              if (!$scope.$$phase) {
                  $scope.$apply();
              }
          };

          WidgetWall.downloadImage = function (event) {
              if (event) {
                  event.preventDefault();
                  event.stopPropagation();
              }
              var imageUrl = WidgetWall.imageGallery.images[WidgetWall.imageGallery.currentIndex];
              if (imageUrl) {
                  window.open(imageUrl, '_blank');
              }
          };

          WidgetWall.loadBottomLogoConfig = function () {
              buildfire.datastore.get('Social', function (err, result) {
                  if (err) {
                      console.error('Error loading bottom logo config:', err);
                      return;
                  }
                  if (result && result.data && result.data.appSettings) {
                      if (result.data.appSettings.bottomLogo) {
                          WidgetWall.bottomLogo = result.data.appSettings.bottomLogo;
                          WidgetWall.adjustLayoutForBottomLogo();
                      }
                      if (result.data.appSettings.themeColors) {
                          WidgetWall.applyThemeColors(result.data.appSettings.themeColors);
                      }
                      if (result.data.appSettings.usernameFont) {
                          WidgetWall.applyUsernameFont(result.data.appSettings.usernameFont);
                      }
                      if (!$scope.$$phase) {
                          $scope.$apply();
                      }
                  }
              });
          };

          WidgetWall.applyThemeColors = function (colors) {
              var root = document.documentElement;
              if (colors.fabButton) {
                  root.style.setProperty('--fab-button-color', colors.fabButton);
              }
              if (colors.likeIcon) {
                  root.style.setProperty('--like-icon-color', colors.likeIcon);
              }
              if (colors.commentIcon) {
                  root.style.setProperty('--comment-icon-color', colors.commentIcon);
              }
              if (colors.shareIcon) {
                  root.style.setProperty('--share-icon-color', colors.shareIcon);
              }
              if (colors.menuIcon) {
                  root.style.setProperty('--menu-icon-color', colors.menuIcon);
              }
          };

          WidgetWall.applyUsernameFont = function (font) {
              var root = document.documentElement;

              // Load custom Google Font if specified
              if (font.customFontUrl && font.customFontUrl.trim()) {
                  // Check if the font link already exists
                  var existingLink = document.getElementById('custom-username-font');
                  if (existingLink) {
                      existingLink.remove();
                  }

                  // Create and append new font link
                  var link = document.createElement('link');
                  link.id = 'custom-username-font';
                  link.rel = 'stylesheet';
                  link.href = font.customFontUrl;
                  document.head.appendChild(link);
              } else {
                  // Remove custom font link if switching back to preset
                  var existingLink = document.getElementById('custom-username-font');
                  if (existingLink) {
                      existingLink.remove();
                  }
              }

              if (font.family) {
                  root.style.setProperty('--username-font-family', font.family);
              }
              if (font.weight) {
                  root.style.setProperty('--username-font-weight', font.weight);
              }
              if (font.size) {
                  root.style.setProperty('--username-font-size', font.size);
              }
          };

          WidgetWall.getBannerStyle = function () {
              if (!WidgetWall.bottomLogo) return {};

              var style = {};

              if (WidgetWall.bottomLogo.displayMode === 'banner') {
                  var height = WidgetWall.bottomLogo.bannerHeight || 90;
                  style.height = height + 'px';

                  if (WidgetWall.bottomLogo.bannerBgColor) {
                      style.background = WidgetWall.bottomLogo.bannerBgColor;
                  }
              } else if (WidgetWall.bottomLogo.displayMode === 'logo') {
                  if (WidgetWall.bottomLogo.bannerBgColor) {
                      style.background = WidgetWall.bottomLogo.bannerBgColor;
                  }
              }

              return style;
          };

          WidgetWall.getLogoImageStyle = function () {
              if (!WidgetWall.bottomLogo || WidgetWall.bottomLogo.displayMode !== 'logo') return {};

              var style = {};
              style.maxWidth = (WidgetWall.bottomLogo.logoMaxWidth || 200) + 'px';
              style.maxHeight = (WidgetWall.bottomLogo.logoMaxHeight || 80) + 'px';
              return style;
          };

          WidgetWall.handleLogoClick = function () {
              var url = WidgetWall.bottomLogo.sponsorUrl || WidgetWall.bottomLogo.linkUrl;
              if (url) {
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = 'https://' + url;
                  }

                  buildfire.analytics.trackAction('bottom_logo_clicked', {
                      mode: WidgetWall.bottomLogo.displayMode,
                      url: url
                  });

                  buildfire.navigation.openWindow(url, '_blank');
              }
          };

          WidgetWall.adjustLayoutForBottomLogo = function () {
              var sponsorLogo = WidgetWall.bottomLogo.sponsorLogo || WidgetWall.bottomLogo.imageUrl;
              if (WidgetWall.bottomLogo.enabled && sponsorLogo) {
                  var bannerHeight = WidgetWall.bottomLogo.displayMode === 'banner'
                      ? (WidgetWall.bottomLogo.bannerHeight || 90)
                      : (WidgetWall.bottomLogo.logoMaxHeight || 80) + 24;

                  var fabSize = 56;
                  var fabMargin = 20;
                  var paddingValue = (bannerHeight + fabSize + fabMargin + 30) + 'px';
                  var scrollContainer = document.querySelector('.post-infinite-scroll');
                  if (scrollContainer) {
                      scrollContainer.style.paddingBottom = paddingValue;
                  }

                  var fabButton = document.querySelector('#addBtn');
                  if (fabButton) {
                      var baseOffset = bannerHeight + fabMargin;
                      fabButton.style.bottom = baseOffset + 'px';
                      fabButton.style.bottom = 'calc(' + baseOffset + 'px + env(safe-area-inset-bottom))';
                  }

                  var bottomPost = document.querySelector('.holder.bottom-post');
                  if (bottomPost) {
                      var bottomPostOffset = bannerHeight + 'px';
                      bottomPost.style.bottom = bottomPostOffset;
                  }
              } else {
                  var scrollContainer = document.querySelector('.post-infinite-scroll');
                  if (scrollContainer) {
                      scrollContainer.style.paddingBottom = '120px';
                  }

                  var fabButton = document.querySelector('#addBtn');
                  if (fabButton) {
                      fabButton.style.bottom = '80px';
                      fabButton.style.bottom = 'calc(80px + env(safe-area-inset-bottom))';
                  }

                  var bottomPost = document.querySelector('.holder.bottom-post');
                  if (bottomPost) {
                      bottomPost.style.bottom = '0px';
                  }
              }
          };

          WidgetWall.init = function () {
              console.log('[Performance] Init started at:', Date.now());
              WidgetWall.startSkeleton();

              var settingsPromise = new Promise(function(resolve, reject) {
                  WidgetWall.SocialItems.getSettings(function(err, result) {
                      if (err) reject(err);
                      else resolve(result);
                  });
              });

              var blockedUsersPromise = new Promise(function(resolve) {
                  WidgetWall.getBlockedUsers(function(error, res) {
                      if (error) console.log("Error while fetching blocked users ", error);
                      resolve(res || []);
                  });
              });

              var userPromise = new Promise(function(resolve) {
                  WidgetWall.SocialItems.authenticateUserWOLogin(null, function(err, user) {
                      if (err) {
                          console.error("Getting user failed.", err);
                          resolve(null);
                      } else {
                          resolve(user);
                      }
                  });
              });

              WidgetWall.loadBottomLogoConfig();

              Promise.all([settingsPromise, blockedUsersPromise, userPromise])
                  .then(function(results) {
                      console.log('[Performance] All parallel calls completed at:', Date.now());
                      var result = results[0];
                      var blockedUsers = results[1];
                      var user = results[2];

                      if (!result) {
                          WidgetWall.stopSkeleton();
                          return console.error("Fetching settings failed - no result");
                      }

                      WidgetWall.SocialItems.items = [];
                      WidgetWall.SocialItems.blockedUsers = blockedUsers;

                      WidgetWall.setSettings(result);
                      WidgetWall.showHidePrivateChat();
                      WidgetWall.followLeaveGroupPermission();
                      WidgetWall.setAppTheme();
                      WidgetWall.SocialItems.checkBlockedUsers();

                      WidgetWall.getPosts(function() {
                          console.log('[Performance] Posts loaded at:', Date.now());
                          if (user) {
                              WidgetWall.checkFollowingStatus(user);
                              WidgetWall.checkForPrivateChat();
                              WidgetWall.checkForDeeplinks();
                          } else {
                              WidgetWall.groupFollowingStatus = false;
                          }
                      });
                  })
                  .catch(function(err) {
                      console.error('[Performance] Init error:', err);
                      WidgetWall.stopSkeleton();
                  });
          };

          WidgetWall.init();

          WidgetWall.handleDeepLinkActions = async function (deeplinkData, pushToHistory){
              if (deeplinkData) {
                  if (deeplinkData.fromReportAbuse) {
                      WidgetWall.SocialItems.reportData = deeplinkData;
                      $rootScope.showThread = false;
                      $timeout(function () {
                          Location.go('#/report', pushToHistory);
                          if (pushToHistory) {
                            WidgetWall.stopSkeleton();
                          }
                      });
                      return;
                  }
                  if (deeplinkData.postId) {
                    let isPostExist = WidgetWall.SocialItems.items.find(post => post.id === deeplinkData.postId);
                    if (isPostExist) {
                        return WidgetWall.goInToThread(deeplinkData.postId, pushToHistory);
                    } else {
                        return WidgetWall.SocialItems.getPostById(deeplinkData.postId, (err, res) => {
                            if (err) {
                                WidgetWall.stopSkeleton();
                                console.error(err);
                            } else if (res && res.data && res.id) {
                                WidgetWall.SocialItems.items.push({...res.data, id: res.id});
                                WidgetWall.goInToThread(deeplinkData.postId, pushToHistory);
                            } else {
                                WidgetWall.stopSkeleton();
                            }
                        });
                    }
                  }
                  await WidgetWall.SocialItems.migrateBrokenOneToOneWallPosts(deeplinkData.wid);
                  const wallId = await WidgetWall.SocialItems.getOneToOneWallId(deeplinkData.wid);
                  const userIds = deeplinkData.userIds;
                  const wTitle = deeplinkData.wTitle;
                  if (!userIds && wallId && wallId.length === 48) {
                      const user1Id = wallId.slice(0, 24);
                      const user2Id = wallId.slice(24, 48);
                      const otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0) ?
                        user2Id : user1Id;

                      WidgetWall.SocialItems.openChat(WidgetWall, otherUser)
                  } else {
                      WidgetWall.openGroupChat(userIds, wallId, wTitle);
                  }
                  WidgetWall.SocialItems.items = [];
                  WidgetWall.stopSkeleton();
              } else {
                WidgetWall.stopSkeleton();
              }
          }

          WidgetWall.checkForPrivateChat = function () {
              if (WidgetWall.SocialItems.isPrivateChat) {
                  WidgetWall.SocialItems.checkBlockedUsers();
                  SubscribedUsersData.getUsersWhoFollow(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, function (err, users) {
                      if (err) return console.log(err);

                      const otherUserIds = [];

                      if (!WidgetWall.SocialItems.userIds) {
                          const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                          const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                          var otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0) ?
                            user2Id : user1Id;
                          otherUserIds.push(otherUser)
                      } else {
                          const userIds = WidgetWall.SocialItems.userIds.split(',');
                          for (const uid of userIds) {
                              otherUserIds.push(uid.trim());
                          }
                      }
                      if (!users.length) {
                          for (const userId of otherUserIds) {
                              WidgetWall.followPrivateWall(userId, WidgetWall.SocialItems.wid);
                          }
                      }
                  });
              }
          }

          WidgetWall.checkForDeeplinks = function () {
            if (!WidgetWall.deeplinkHandled){
                Buildfire.deeplink.getData((data) => {
                    WidgetWall.deeplinkHandled = true;
                    const deeplinkData = WidgetWall.util.parseDeeplinkData(data);
                    if (deeplinkData) {
                        WidgetWall.isFromDeepLink = true;
                       const isExistInBlockedList = WidgetWall.SocialItems.checkBlockedUsers(deeplinkData.wid);
                       if (isExistInBlockedList) {
                           WidgetWall.stopSkeleton();
                           return;
                       }
                    }
                    WidgetWall.handleDeepLinkActions(deeplinkData, false);
                }, true);
            }
              Buildfire.deeplink.onUpdate((data) => {
                  let deeplinkData =  null;
                  if (typeof data === 'string') {
                      deeplinkData = Object.fromEntries(new URLSearchParams(data));
                      if (deeplinkData.wid) {
                          if (deeplinkData.wid !== WidgetWall.SocialItems.wid){
                              WidgetWall.SocialItems.page = 0;
                          }
                          WidgetWall.SocialItems.wid = deeplinkData.wid;
                      }
                  }
                  else {
                      deeplinkData = WidgetWall.util.parseDeeplinkData(data);
                  }
                  const isExistInBlockedList = WidgetWall.SocialItems.checkBlockedUsers(deeplinkData.wid);
                  if (isExistInBlockedList) {
                      WidgetWall.stopSkeleton();
                      return;
                  }
                  WidgetWall.handleDeepLinkActions(deeplinkData, true);
              }, true);
          }

          WidgetWall.sanitizeWall = function (callback) {
              buildfire.publicData.search({
                    filter: {
                        '_buildfire.index.string1': WidgetWall.SocialItems.wid
                    }
                },
                'subscribedUsersData',
                function (err, result) {
                    if (err) console.log(err);
                    if (result && result.length > 2) {
                        const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                        const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                        result.map(item => {
                            if (item.data.userId !== user1Id && item.data.userId !== user2Id) {
                                buildfire.publicData.delete(item.id, 'subscribedUsersData');
                            }
                        });
                    }
                });
          }

          WidgetWall.followPrivateWall = function (userId, wid, userName = null) {
              buildfire.auth.getUserProfile({
                  userId: userId
              }, (err, user) => {
                  if (err || !user) return console.log('Error while saving subscribed user data.');
                  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                  if (re.test(String(user.firstName).toLowerCase()))
                      user.firstName = 'Someone';
                  if (re.test(String(user.displayName).toLowerCase()))
                      user.displayName = 'Someone';

                  var params = {
                      userId: userId,
                      userDetails: {
                          displayName: user.displayName,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          imageUrl: user.imageUrl,
                          email: user.email,
                          lastUpdated: new Date().getTime(),
                      },
                      wallId: wid,
                      posts: [],
                      _buildfire: {
                          index: {
                              text: userId + '-' + wid,
                              string1: wid
                          }
                      }
                  };

                  userName = WidgetWall.SocialItems.getUserName(params.userDetails)
                  SubscribedUsersData.save(params, function (err) {
                      if (err) console.log('Error while saving subscribed user data.');
                      if (userName)
                          WidgetWall.navigateToPrivateChat({
                              id: userId,
                              name: userName,
                              wid: wid
                          });
                  });
              })
          }

          WidgetWall.navigateToPrivateChat = function (privateChatData) {
              WidgetWall.SocialItems.isPrivateChat = true;
              WidgetWall.SocialItems.wid = privateChatData.wid;
              WidgetWall.SocialItems.showMorePosts = false;
              WidgetWall.SocialItems.pageSize = 5;
              WidgetWall.SocialItems.page = 0;
              WidgetWall.allowCreateThread = true;
              WidgetWall.initFabButtons();
              WidgetWall.SocialItems.setPrivateChatTitle(privateChatData.wid).then(() => {
                  if (WidgetWall.isFromDeepLink) {
                      buildfire.appearance.titlebar.setText({ text: WidgetWall.SocialItems.pluginTitle}, (err) => {
                          if (err) return console.error(err);
                      });
                  }
                  else {
                      buildfire.history.push(WidgetWall.SocialItems.pluginTitle, {
                          isPrivateChat: true,
                          showLabelInTitlebar: true
                      });
                  }
                  WidgetWall.SocialItems.items = [];
                  WidgetWall.isFromDeepLink = false;
                  WidgetWall.getPosts(() => {
                      document.getElementById('top').scrollTop = 0
                  });
              })
          }

          $rootScope.$on('loadPrivateChat', function (event, error) {
              WidgetWall.init();
          });

          $rootScope.$on('$locationChangeSuccess', function () {
              $rootScope.actualLocation = $location.path();
              if ($rootScope.actualLocation == "/") {
                  WidgetWall.SocialItems.getSettings((err, result) => {
                      if (err) return console.error("Fetching settings failed.", err);
                      if (result) {
                          WidgetWall.SocialItems.appSettings = result.data && result.data.appSettings ? result.data.appSettings : {};
                          WidgetWall.setSettings(result);

                          Buildfire.datastore.onUpdate(function (response) {
                              if (response.tag === "Social") {
                                  WidgetWall.setSettings(response);
                                  setTimeout(function () {
                                      if (!response.data.appSettings.disableFollowLeaveGroup) {
                                          let wallSVG = document.getElementById("WidgetWallSvg")
                                          if (wallSVG) {
                                              wallSVG.style.setProperty("fill", WidgetWall.appTheme.icons, "important");
                                          }
                                      }
                                  }, 100);
                              } else if (response.tag === "languages")
                                  WidgetWall.SocialItems.formatLanguages(response);
                              $scope.$digest();
                          });
                      }
                  });
              }
          });

          $rootScope.$on('navigatedBack', function (event, error) {
              WidgetWall.SocialItems.items = [];
              WidgetWall.SocialItems.isPrivateChat = false;
              WidgetWall.SocialItems.pageSize = 5;
              WidgetWall.SocialItems.page = 0;
              WidgetWall.SocialItems.wid = WidgetWall.SocialItems.mainWallID;
              WidgetWall.SocialItems.pluginTitle = '';
              WidgetWall.init();
          });

          WidgetWall.openGroupChat = function (userIds, wid, wTitle) {
              if (WidgetWall.allowPrivateChat) {
                  WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (user) {
                          WidgetWall.navigateToPrivateChat({
                              id: userIds,
                              name: 'someone',
                              wid: wid,
                              wTitle,
                          });
                      }
                  });
              }
          }

          WidgetWall.openPrivateChat = function (userId, userName) {
              let wid = null;
              if (WidgetWall.SocialItems.userDetails.userId && WidgetWall.SocialItems.userDetails.userId != userId) {
                  if (WidgetWall.SocialItems.userDetails.userId > userId) {
                      wid = WidgetWall.SocialItems.userDetails.userId + userId;
                  } else {
                      wid = userId + WidgetWall.SocialItems.userDetails.userId;
                  }
              }
              SubscribedUsersData.getGroupFollowingStatus(userId, wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                  if (err) console.error('Error while getting initial group following status.', err);
                  if (!status.length) {
                      WidgetWall.followPrivateWall(userId, wid, userName);
                  } else {
                      WidgetWall.navigateToPrivateChat({
                          id: userId,
                          name: userName,
                          wid: wid
                      });
                  }
              });
          }

          $scope.openThread = function (event, post) {
              if (event.target.nodeName != "BF-IMAGE-LIST")
                  window.location.href = " #/thread/" + post.id;
          };
          WidgetWall.Thread = class {
              constructor(record = {}) {
                  if (!record.data) record.data = {};
                  this.id = record.id || undefined;
                  this.isActive =
                    typeof record.data.isActive === "boolean" ? record.data.isActive : true;
                  this.createdOn = record.data.createdOn || new Date();
                  this.createdBy = record.data.createdBy || undefined;
                  this.lastUpdatedOn = record.data.lastUpdatedOn || undefined;
                  this.lastUpdatedBy = record.data.lastUpdatedBy || undefined;
                  this.deletedOn = record.data.deletedOn || undefined;
                  this.deletedBy = record.data.deletedBy || undefined;

                  this.users = record.data.users || [];
                  this.wallId = record.data.wallId || undefined;
                  this.wallTitle = record.data.wallTitle || undefined;
                  this.navigationData = record.data.navigationData || {
                      pluginId: undefined,
                      instanceId: undefined,
                      folderName: undefined
                  };
                  this.isSupportThread = record.data.isSupportThread || undefined;
                  this.lastMessage = record.data.lastMessage || {
                      text: undefined,
                      createdAt: undefined,
                      sender: undefined,
                      isRead: undefined
                  };
              }

              /**
               * Get instance ready for data access with _buildfire index object
               */
              toJSON() {
                  return {
                      id: this.id,
                      isActive: this.isActive,
                      createdOn: this.createdOn,
                      createdBy: this.createdBy,
                      lastUpdatedOn: this.lastUpdatedOn,
                      lastUpdatedBy: this.lastUpdatedBy,
                      deletedOn: this.deletedOn,
                      deletedBy: this.deletedBy,

                      users: this.users,
                      wallId: this.wallId,
                      wallTitle: this.wallTitle,
                      lastMessage: this.lastMessage,
                      navigationData: this.navigationData,
                      isSupportThread: this.isSupportThread,
                      _buildfire: {
                          index: {
                              number1: this.isActive ? 1 : 0,
                              date1: this.lastMessage.createdAt,
                              string1: this.wallId,
                              array1: this.users.map(user => ({
                                  string1: user._id
                              })),
                              text: this.users.map(user => user.displayName).join(" || ")
                          }
                      }
                  };
              }
          }

          WidgetWall.verifyWallId = function (user, wallId, callback) {
              if (!WidgetWall.SocialItems.userIds && (!wallId || wallId.length != 48)) {
                  return callback(new Error("Invalid wall id"));
              }

              const otherUserIds = [];
              if (!WidgetWall.SocialItems.userIds) {
                  const user1Id = wallId.slice(0, 24);
                  const user2Id = wallId.slice(24, 48);
                  otherUserIds.push(user1Id, user2Id);
              } else {
                  const userIds = WidgetWall.SocialItems.userIds.split(',');
                  for (const uid of userIds) {
                      otherUserIds.push(uid.trim());
                  }
                  if (!otherUserIds.includes(user._id)) {
                      otherUserIds.push(user._id);
                  }
              }

              if (otherUserIds.length === 0 || !otherUserIds.includes(user._id)) {
                  return callback(
                    new Error("Logged in user must be one of the wall users")
                  );
              }

              buildfire.auth.getUserProfiles({
                  userIds: otherUserIds
              }, (err, users) => {
                  if (err) return callback(err);

                  callback(null, users);
              });
          }

          WidgetWall.getThread = function (user, wallId, wallTitle, callback) {
              WidgetWall.verifyWallId(user, wallId, (err, users) => {
                  if (err) return callback(err);

                  const filters = {
                      filter: {
                          "_buildfire.index.string1": wallId
                      }
                  };

                  buildfire.appData.search(filters, WidgetWall.threadTag, (err, records) => {
                      if (err) return callback(err);

                      const createdBy = user._id;

                      const haveSameUsers = (arr1, arr2) => {
                          if (arr1.length !== arr2.length) return false;

                          let userIds = {};
                          for (let user of arr1) {
                              userIds[user._id] = true;
                          }

                          for (let user of arr1) {
                              if (!userIds[user._id]) return false;
                          }
                          return true;
                      }

                      if (!records || !records.length) {
                          let thread = new WidgetWall.Thread({
                              data: {
                                  users,
                                  wallId,
                                  wallTitle,
                                  createdBy
                              }
                          });

                          if (WidgetWall.SocialItems.userIds) {
                              thread.isSupportThread = true;
                          }

                          buildfire.appData.insert(
                            thread.toJSON(),
                            WidgetWall.threadTag,
                            false,
                            (err, record) => {
                                if (err) return callback(err);
                                Analytics.trackAction("thread-created");
                                return callback(null, new WidgetWall.Thread(record));
                            }
                          );
                      } else if (!haveSameUsers(records[0].data.users, users)) {
                          let thread = new WidgetWall.Thread(records[0]);
                          thread.users = users;

                          if (WidgetWall.SocialItems.userIds) {
                              thread.isSupportThread = true;
                          }

                          buildfire.appData.update(
                            thread.id,
                            thread.toJSON(),
                            WidgetWall.threadTag,
                            (err, record) => {
                                if (err) return callback(err);
                                return callback(null, new WidgetWall.Thread(record));
                            });
                      } else {
                          if (
                            Array.isArray(records[0].data.users) && records[0].data.users.length === 2 &&
                            records[0].data.users[0] && records[0].data.users[1]
                          ) {
                              records[0].data.wallTitle = WidgetWall.SocialItems.getUserName(records[0].data.users[0]) + ' | ' + WidgetWall.SocialItems.getUserName(records[0].data.users[1]);
                          }
                          return callback(null, new WidgetWall.Thread(records[0]));
                      }
                  });
              });
          }


          WidgetWall.getNavigationData = function (callback) {
              Buildfire.pluginInstance.get(WidgetWall.SocialItems.context.instanceId, function (err, plugin) {
                  return callback({
                      pluginId: WidgetWall.SocialItems.context.pluginId,
                      instanceId: plugin.instanceId,
                      folderName: plugin._buildfire.pluginType.result[0].folderName,
                  })
              });
          }

          WidgetWall.onSendMessage = function (user, message, callback) {
              // GET wallId and wallTitle from query params in PSW2
              const wallId = WidgetWall.SocialItems.wid;
              const wallTitle = WidgetWall.SocialItems.pluginTitle;

              WidgetWall.getThread(user, wallId, wallTitle, (err, thread) => {
                  if (err) return callback(err);

                  WidgetWall.getNavigationData(navigationData => {
                      thread.lastUpdatedOn = new Date();
                      thread.lastUpdatedBy = user._id;
                      thread.lastMessage = {
                          text: message,
                          createdAt: new Date(),
                          sender: user._id,
                          isRead: false
                      };

                      if (WidgetWall.SocialItems.userIds) {
                          thread.isSupportThread = true;
                      }

                      thread.navigationData = navigationData;

                      buildfire.appData.update(
                        thread.id,
                        thread.toJSON(),
                        WidgetWall.threadTag,
                        (err, record) => {
                            if (err) return callback(err);
                            return callback(null, new WidgetWall.Thread(record));
                        }
                      );
                  });
              })
          }
          WidgetWall.loadMorePosts = function () {
              saveScrollPosition();
              WidgetWall.SocialItems.getPosts(function (err, data) {
                  window.buildfire.messaging.sendMessageToControl({
                      name: 'SEND_POSTS_TO_CP',
                      posts: WidgetWall.SocialItems.items,
                      pinnedPost: WidgetWall.pinnedPost,
                      wid: WidgetWall.SocialItems.wid
                  });
                  $scope.$digest();
                  restoreScrollPosition();
              });
          }


          function restoreScrollPosition() {
              const postsContainer = document.querySelector('.post-infinite-scroll');
              if (typeof WidgetWall.scrollPosition === 'number' && postsContainer) {
                  postsContainer.scrollTop = WidgetWall.scrollPosition
              }
          }

          function saveScrollPosition() {
              const postsContainer = document.querySelector('.post-infinite-scroll');
              if (postsContainer) {
                  WidgetWall.scrollPosition =  postsContainer.scrollTop;
              }
          }

          function finalPostCreation(imageUrl, callback) {
              let postData = {};
              postData.userDetails = WidgetWall.SocialItems.userDetails;
              postData.imageUrl = imageUrl || null;
              postData.images = $scope.WidgetWall.images && $scope.WidgetWall.images.length > 0 ? $scope.WidgetWall.images : [];
              postData.videos = $scope.WidgetWall.videos && $scope.WidgetWall.videos.length > 0 ? $scope.WidgetWall.videos : [];
              postData.wid = WidgetWall.SocialItems.wid;
              postData.text = WidgetWall.postText ? WidgetWall.postText.replace(/[#&%+!@^*()-]/g, function (match) {
                  return encodeURIComponent(match)
              }) : '';

              console.log('[finalPostCreation] Starting post creation with:', {
                  hasUserDetails: !!postData.userDetails,
                  userId: postData.userDetails && postData.userDetails.userId,
                  wid: postData.wid,
                  imagesCount: postData.images.length,
                  videosCount: postData.videos.length,
                  text: postData.text
              });

              WidgetWall.onSendMessage({
                    _id: postData.userDetails && postData.userDetails.userId ? postData.userDetails.userId : null
                }, postData.text, (msgErr) => {
                    console.log('[finalPostCreation] onSendMessage callback, error:', msgErr);
                    SocialDataStore.createPost(postData).then((response) => {
                      const isPending = response.data && response.data.status === 'pending';

                      if (!isPending) {
                          WidgetWall.SocialItems.items.unshift(postData);
                      }

                      Buildfire.messaging.sendMessageToControl({
                          name: EVENTS.POST_CREATED,
                          status: 'Success',
                          post: response.data
                      });
                      postData.id = response.data.id;
                      postData.uniqueLink = response.data.uniqueLink;

                      if (isPending) {
                          Buildfire.dialog.toast({
                              message: WidgetWall.SocialItems.languages.postPendingReview || "Your post has been submitted for review. It will appear in the feed once approved by an admin.",
                              type: 'warning',
                              duration: 5000
                          });
                      } else {
                          WidgetWall.scheduleNotification(postData, 'post');
                          Buildfire.dialog.toast({
                              message: WidgetWall.SocialItems.languages.postPublished || "Your post has been published successfully!",
                              type: 'success'
                          });
                      }

                      // window.scrollTo(0, 0);
                      // $location.hash('top');
                      // $anchorScroll();
                      callback(null, response.data);
                  }, (err) => {
                      console.error("[finalPostCreation] Post creation failed:", err);
                      WidgetWall.postText = '';
                      Buildfire.dialog.toast({
                          message: WidgetWall.SocialItems.languages.postCreationFailed || "Failed to create post. Please try again.",
                          type: 'danger',
                          duration: 4000
                      });
                      callback(err);
                  });
              });
          }

          WidgetWall.getPostContent = function (data) {
              if (data && data.results && data.results.length > 0 && !data.cancelled) {
                  $scope.WidgetWall.postText = data.results["0"].textValue;
                  $scope.WidgetWall.images = data.results["0"].images;
                  $scope.WidgetWall.videos = data.results["0"].videos;

                  var gif = getGifUrl(data.results["0"].gifs);
                  if (gif && $scope.WidgetWall.images && $scope.WidgetWall.images.push) {
                      $scope.WidgetWall.images.push(gif);
                  }

                  function getGifUrl(gifs) {
                      if (gifs["0"] && gifs["0"].images.downsided_medium && gifs["0"].images.downsided_medium.url) {
                          return gifs["0"].images.downsided_medium.url;
                      } else if (gifs["0"] && gifs["0"].images.original && gifs["0"].images.original.url) {
                          return gifs["0"].images.original.url;
                      }
                  }
              }
          }

          WidgetWall.showCustomPostDialog = false;
          WidgetWall.showFullScreenCompose = false;
          WidgetWall.customPostText = '';
          WidgetWall.selectedImages = [];
          WidgetWall.selectedVideos = [];
          WidgetWall.selectedImagesText = 'Change selected';
          WidgetWall.selectedVideosText = 'Change selected';
          WidgetWall.editingPost = null;
          WidgetWall.isSubmittingPost = false;
          WidgetWall.isUploadingMedia = false;

          WidgetWall.openPostSection = function () {
              WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (user) {
                      WidgetWall.checkFollowingStatus();
                      WidgetWall.openMediaPickerFirst();
                  }
              });
          }

          WidgetWall.openMediaPickerFirst = function() {
              if (buildfire && buildfire.services && buildfire.services.publicFiles && buildfire.services.publicFiles.showDialog) {
                  console.log('[MediaPicker] Using publicFiles.showDialog');
                  WidgetWall.isUploadingMedia = true;
                  WidgetWall.showFullScreenCompose = true;
                  WidgetWall.customPostText = '';
                  WidgetWall.selectedImages = [];
                  WidgetWall.selectedVideos = [];
                  WidgetWall.editingPost = null;
                  if (!$scope.$$phase) $scope.$apply();

                  buildfire.services.publicFiles.showDialog(
                      { allowMultipleFilesUpload: true },
                      function(onProgress) {
                          console.log('[MediaPicker] Upload progress:', onProgress);
                      },
                      function(onComplete) {
                          console.log('[MediaPicker] File complete:', onComplete);
                      },
                      function(err, files) {
                          console.log('[MediaPicker] showDialog callback:', err, files);
                          if (err) {
                              console.error('[MediaPicker] showDialog error:', err);
                              WidgetWall.isUploadingMedia = false;
                              WidgetWall.showFullScreenCompose = false;
                              if (!$scope.$$phase) $scope.$apply();
                              return;
                          }

                          if (!files || files.length === 0) {
                              WidgetWall.isUploadingMedia = false;
                              WidgetWall.showFullScreenCompose = false;
                              if (!$scope.$$phase) $scope.$apply();
                              return;
                          }

                          var videoExts = ['.mp4', '.mov', '.webm', '.ogg', '.avi', '.mkv', '.m4v', '.3gp', '.qt'];
                          files.forEach(function(file) {
                              if (file.status === 'success' && file.url) {
                                  var isVideo = (file.type && file.type.startsWith('video/'));
                                  if (!isVideo && file.url) {
                                      var urlLower = file.url.toLowerCase();
                                      isVideo = videoExts.some(function(ext) { return urlLower.indexOf(ext) !== -1; });
                                  }
                                  if (isVideo) {
                                      WidgetWall.selectedVideos.push(file.url);
                                  } else {
                                      WidgetWall.selectedImages.push(file.url);
                                  }
                              }
                          });

                          if (WidgetWall.selectedImages.length > 0) {
                              WidgetWall.selectedImagesText = WidgetWall.selectedImages.length === 1 ? '1 image' : WidgetWall.selectedImages.length + ' images';
                          }
                          if (WidgetWall.selectedVideos.length > 0) {
                              WidgetWall.selectedVideosText = WidgetWall.selectedVideos.length === 1 ? '1 video' : WidgetWall.selectedVideos.length + ' videos';
                          }

                          console.log('[MediaPicker] Final state:', {
                              images: WidgetWall.selectedImages,
                              videos: WidgetWall.selectedVideos
                          });

                          WidgetWall.isUploadingMedia = false;
                          if (!$scope.$$phase) $scope.$apply();
                      }
                  );
              } else {
                  console.log('[MediaPicker] showDialog not available, using file input fallback');
                  var input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.avi,.mkv,.m4v,.3gp,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif';
                  input.multiple = true;
                  input.style.display = 'none';
                  document.body.appendChild(input);

                  input.onchange = function(e) {
                      var files = e.target.files;
                      document.body.removeChild(input);

                      if (!files || files.length === 0) return;

                      WidgetWall.isUploadingMedia = true;
                      WidgetWall.showFullScreenCompose = true;
                      WidgetWall.customPostText = '';
                      WidgetWall.selectedImages = [];
                      WidgetWall.selectedVideos = [];
                      WidgetWall.editingPost = null;
                      if (!$scope.$$phase) $scope.$apply();

                      WidgetWall.processSelectedFiles(files);
                  };

                  input.click();
              }
          }

          WidgetWall.processSelectedFiles = function(files) {
              console.log('[ImageUpload] processSelectedFiles called with', files.length, 'files');
              console.log('[ImageUpload] Environment:', {
                  hasImageLib: !!(buildfire && buildfire.imageLib),
                  hasLocalToPublicUrl: !!(buildfire && buildfire.imageLib && buildfire.imageLib.local && buildfire.imageLib.local.toPublicUrl),
                  hasPublicFiles: !!(buildfire && buildfire.services && buildfire.services.publicFiles),
                  platform: navigator.platform,
                  userAgent: navigator.userAgent
              });

              var imageFiles = [];
              var videoFiles = [];

              var imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif'];
              var videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.avi', '.mkv', '.m4v', '.3gp', '.qt'];

              function getFileExtension(filename) {
                  if (!filename) return '';
                  var lastDot = filename.lastIndexOf('.');
                  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
              }

              for (var i = 0; i < files.length; i++) {
                  var file = files[i];
                  var ext = getFileExtension(file.name);
                  console.log('[ImageUpload] File ' + i + ':', {
                      name: file.name,
                      type: file.type,
                      extension: ext,
                      size: file.size,
                      lastModified: file.lastModified
                  });
                  if (file.type && file.type.startsWith('image/')) {
                      imageFiles.push(file);
                  } else if (file.type && file.type.startsWith('video/')) {
                      videoFiles.push(file);
                  } else if (imageExtensions.indexOf(ext) !== -1) {
                      console.log('[ImageUpload] Detected image by extension:', ext);
                      imageFiles.push(file);
                  } else if (videoExtensions.indexOf(ext) !== -1) {
                      console.log('[ImageUpload] Detected video by extension:', ext);
                      videoFiles.push(file);
                  }
              }

              console.log('[ImageUpload] Categorized:', imageFiles.length, 'images,', videoFiles.length, 'videos');

              var imagePromises = imageFiles.map(function(file, index) {
                  return new Promise(function(resolve, reject) {
                      console.log('[ImageUpload] Processing image ' + index + ':', file.name, 'Size:', file.size);

                      // Check if image is too large (max 1GB, but recommend smaller)
                      var maxFileSize = 1024 * 1024 * 1024; // 1GB
                      if (file.size > maxFileSize) {
                          console.error('[ImageUpload] Image exceeds 1GB limit');
                          buildfire.dialog.toast({
                              message: 'Image is too large. Maximum size is 1GB.',
                              type: 'danger'
                          });
                          resolve(null);
                          return;
                      }

                      // Prefer publicFiles.uploadFiles for better performance and reliability
                      if (buildfire && buildfire.services && buildfire.services.publicFiles && buildfire.services.publicFiles.uploadFiles) {
                          console.log('[ImageUpload] Using publicFiles.uploadFiles for image ' + index);

                          buildfire.services.publicFiles.uploadFiles(
                              [file],
                              { allowMultipleFilesUpload: false },
                              function(progress) {
                                  console.log('[ImageUpload] Upload progress for image ' + index + ':', progress);
                              },
                              function(completed) {
                                  console.log('[ImageUpload] Upload completed for image ' + index + ':', completed);
                              },
                              function(err, uploadedFiles) {
                                  if (err) {
                                      console.error('[ImageUpload] publicFiles.uploadFiles ERROR for image ' + index + ':', err);
                                      // Fallback to base64 for small images only
                                      if (file.size < 5 * 1024 * 1024) { // 5MB
                                          console.log('[ImageUpload] Falling back to base64 for small image');
                                          var reader = new FileReader();
                                          reader.onload = function(event) { resolve(event.target.result); };
                                          reader.onerror = function() { resolve(null); };
                                          reader.readAsDataURL(file);
                                      } else {
                                          buildfire.dialog.toast({
                                              message: 'Image upload failed.',
                                              type: 'danger'
                                          });
                                          resolve(null);
                                      }
                                  } else if (uploadedFiles && uploadedFiles.length > 0 && uploadedFiles[0].status === 'success') {
                                      console.log('[ImageUpload] publicFiles.uploadFiles SUCCESS for image ' + index + ':', uploadedFiles[0]);
                                      resolve(uploadedFiles[0].url);
                                  } else {
                                      console.error('[ImageUpload] Upload completed but status is not success');
                                      buildfire.dialog.toast({
                                          message: 'Image upload failed.',
                                          type: 'danger'
                                      });
                                      resolve(null);
                                  }
                              }
                          );
                      } else {
                          console.log('[ImageUpload] publicFiles not available, using legacy imageLib method');
                          // Legacy fallback for older BuildFire versions
                          var reader = new FileReader();
                          reader.onload = function(event) {
                              var base64 = event.target.result;

                              if (buildfire && buildfire.imageLib && buildfire.imageLib.local && buildfire.imageLib.local.toPublicUrl) {
                                  buildfire.imageLib.local.toPublicUrl(base64, function(err, url) {
                                      if (err) {
                                          console.error('[ImageUpload] toPublicUrl ERROR:', err);
                                          resolve(file.size < 5 * 1024 * 1024 ? base64 : null);
                                      } else {
                                          resolve(url);
                                      }
                                  });
                              } else {
                                  resolve(file.size < 5 * 1024 * 1024 ? base64 : null);
                              }
                          };
                          reader.onerror = function(err) {
                              console.error('[ImageUpload] FileReader ERROR:', err);
                              resolve(null);
                          };
                          reader.readAsDataURL(file);
                      }
                  });
              });

              var videoPromises = videoFiles.map(function(file, index) {
                  return new Promise(function(resolve, reject) {
                      console.log('[ImageUpload] Processing video ' + index + ':', file.name, 'Size:', file.size);

                      // Check if file is too large (BuildFire supports up to 1GB)
                      var maxFileSize = 1024 * 1024 * 1024; // 1GB
                      if (file.size > maxFileSize) {
                          console.error('[ImageUpload] Video exceeds 1GB limit');
                          buildfire.dialog.toast({
                              message: 'Video is too large. Maximum size is 1GB.',
                              type: 'danger'
                          });
                          resolve(null);
                          return;
                      }

                      var uploadAttempted = false;

                      function attemptVideoUpload() {
                          if (buildfire && buildfire.services && buildfire.services.publicFiles &&
                              typeof buildfire.services.publicFiles.uploadFiles === 'function') {
                              console.log('[ImageUpload] Using publicFiles.uploadFiles for video ' + index);
                              uploadAttempted = true;

                              buildfire.services.publicFiles.uploadFiles(
                                  [file],
                                  { allowMultipleFilesUpload: false },
                                  function(progress) {
                                      console.log('[ImageUpload] Upload progress for video ' + index + ':', progress);
                                  },
                                  function(completed) {
                                      console.log('[ImageUpload] Upload completed for video ' + index + ':', completed);
                                  },
                                  function(err, uploadedFiles) {
                                      if (err) {
                                          console.error('[ImageUpload] publicFiles.uploadFiles ERROR for video ' + index + ':', err);
                                          buildfire.dialog.toast({
                                              message: err.message || 'Video upload failed. Please try again.',
                                              type: 'danger'
                                          });
                                          resolve(null);
                                      } else if (uploadedFiles && uploadedFiles.length > 0 && uploadedFiles[0].status === 'success') {
                                          console.log('[ImageUpload] publicFiles.uploadFiles SUCCESS for video ' + index + ':', uploadedFiles[0]);
                                          resolve(uploadedFiles[0].url);
                                      } else {
                                          console.error('[ImageUpload] Upload completed but file status is not success');
                                          buildfire.dialog.toast({
                                              message: 'Video upload failed.',
                                              type: 'danger'
                                          });
                                          resolve(null);
                                      }
                                  }
                              );
                              return true;
                          }
                          return false;
                      }

                      function retryUpload(attempt, maxAttempts) {
                          if (attempt >= maxAttempts) {
                              console.error('[ImageUpload] publicFiles.uploadFiles not available after ' + maxAttempts + ' retries');
                              buildfire.auth.getCurrentUser(function(authErr, user) {
                                  if (authErr || !user || !user._id) {
                                      buildfire.dialog.toast({
                                          message: 'Please log in to upload videos.',
                                          type: 'warning',
                                          duration: 5000
                                      });
                                  } else {
                                      buildfire.dialog.toast({
                                          message: 'Video upload is currently unavailable. Please try again or use a different video format.',
                                          type: 'warning',
                                          duration: 5000
                                      });
                                  }
                                  resolve(null);
                              });
                              return;
                          }

                          var delay = attempt === 0 ? 500 : (attempt === 1 ? 1000 : 2000);
                          console.log('[ImageUpload] Retry attempt ' + (attempt + 1) + ' in ' + delay + 'ms');

                          setTimeout(function() {
                              if (!uploadAttempted && !attemptVideoUpload()) {
                                  retryUpload(attempt + 1, maxAttempts);
                              }
                          }, delay);
                      }

                      if (!attemptVideoUpload()) {
                          retryUpload(0, 3);
                      }
                  });
              });

              Promise.all(imagePromises).then(function(imageUrls) {
                  console.log('[ImageUpload] All image promises resolved:', imageUrls);
                  WidgetWall.selectedImages = imageUrls.filter(function(url) { return url !== null && url !== '' && url !== 'undefined'; });
                  console.log('[ImageUpload] Filtered selectedImages:', WidgetWall.selectedImages.length);
                  if (WidgetWall.selectedImages.length > 0) {
                      WidgetWall.selectedImagesText = WidgetWall.selectedImages.length === 1 ? '1 image' : WidgetWall.selectedImages.length + ' images';
                  }

                  return Promise.all(videoPromises);
              }).then(function(videoUrls) {
                  console.log('[ImageUpload] All video promises resolved:', videoUrls);
                  WidgetWall.selectedVideos = videoUrls.filter(function(url) { return url !== null && url !== '' && url !== 'undefined'; });
                  if (WidgetWall.selectedVideos.length > 0) {
                      WidgetWall.selectedVideosText = WidgetWall.selectedVideos.length === 1 ? '1 video' : WidgetWall.selectedVideos.length + ' videos';
                  }

                  console.log('[ImageUpload] FINAL state:', {
                      selectedImages: WidgetWall.selectedImages,
                      selectedVideos: WidgetWall.selectedVideos
                  });

                  WidgetWall.isUploadingMedia = false;
                  if (!$scope.$$phase) $scope.$apply();
              }).catch(function(err) {
                  console.error('[ImageUpload] Promise chain ERROR:', err);
                  WidgetWall.isUploadingMedia = false;
                  if (!$scope.$$phase) $scope.$apply();
              });
          }

          WidgetWall.showComposeAfterMediaSelect = function() {
              WidgetWall.showFullScreenCompose = true;
              if (!$scope.$$phase) $scope.$apply();
          }

          WidgetWall.closeCustomPostDialog = function () {
              WidgetWall.showCustomPostDialog = false;
              WidgetWall.showFullScreenCompose = false;
              WidgetWall.customPostText = '';
              WidgetWall.selectedImages = [];
              WidgetWall.selectedVideos = [];
              WidgetWall.selectedImagesText = 'Change selected';
              WidgetWall.selectedVideosText = 'Change selected';
              WidgetWall.editingPost = null;
              WidgetWall.isUploadingMedia = false;
              if (!$scope.$$phase) {
                  $scope.$apply();
              }
          }

          WidgetWall.removeImage = function (index) {
              WidgetWall.selectedImages.splice(index, 1);
              WidgetWall.selectedImagesText = WidgetWall.selectedImages.length === 0 ? 'Add images' :
                  (WidgetWall.selectedImages.length === 1 ? '1 image' : WidgetWall.selectedImages.length + ' images');
              if (!$scope.$$phase) $scope.$apply();
          }

          WidgetWall.removeVideo = function (index) {
              WidgetWall.selectedVideos.splice(index, 1);
              WidgetWall.selectedVideosText = WidgetWall.selectedVideos.length === 0 ? 'Add videos' :
                  (WidgetWall.selectedVideos.length === 1 ? '1 video' : WidgetWall.selectedVideos.length + ' videos');
              if (!$scope.$$phase) $scope.$apply();
          }

          WidgetWall.selectImages = function () {
              if (buildfire && buildfire.services && buildfire.services.publicFiles && buildfire.services.publicFiles.showDialog) {
                  console.log('[ImageSelect] Using publicFiles.showDialog');
                  WidgetWall.isUploadingMedia = true;
                  if (!$scope.$$phase) $scope.$apply();

                  buildfire.services.publicFiles.showDialog(
                      {
                          allowMultipleFilesUpload: true,
                          filter: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/*']
                      },
                      function(onProgress) {
                          console.log('[ImageSelect] Upload progress:', onProgress);
                      },
                      function(onComplete) {
                          console.log('[ImageSelect] File complete:', onComplete);
                      },
                      function(err, files) {
                          console.log('[ImageSelect] showDialog callback:', err, files);
                          if (err) {
                              console.error('[ImageSelect] showDialog error:', err);
                              WidgetWall.isUploadingMedia = false;
                              if (!$scope.$$phase) $scope.$apply();
                              return;
                          }

                          if (files && files.length > 0) {
                              files.forEach(function(file) {
                                  if (file.status === 'success' && file.url) {
                                      WidgetWall.selectedImages.push(file.url);
                                  }
                              });
                              WidgetWall.selectedImagesText = WidgetWall.selectedImages.length === 1 ? '1 image' : WidgetWall.selectedImages.length + ' images';
                          }

                          WidgetWall.isUploadingMedia = false;
                          if (!$scope.$$phase) $scope.$apply();
                      }
                  );
              } else {
                  console.log('[ImageSelect] showDialog not available, using file input fallback');
                  var input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.style.display = 'none';
                  document.body.appendChild(input);

                  input.onchange = function(e) {
                      var files = e.target.files;
                      document.body.removeChild(input);

                      if (!files || files.length === 0) return;

                      WidgetWall.isUploadingMedia = true;
                      if (!$scope.$$phase) $scope.$apply();

                      var imagePromises = Array.from(files).map(function(file) {
                          return new Promise(function(resolve) {
                              var reader = new FileReader();
                              reader.onload = function(event) {
                                  var base64 = event.target.result;
                                  if (buildfire && buildfire.imageLib && buildfire.imageLib.local && buildfire.imageLib.local.toPublicUrl) {
                                      buildfire.imageLib.local.toPublicUrl(base64, function(err, url) {
                                          resolve(err ? base64 : url);
                                      });
                                  } else {
                                      resolve(base64);
                                  }
                              };
                              reader.onerror = function() { resolve(null); };
                              reader.readAsDataURL(file);
                          });
                      });

                      Promise.all(imagePromises).then(function(urls) {
                          WidgetWall.selectedImages = urls.filter(function(url) { return url !== null; });
                          WidgetWall.selectedImagesText = WidgetWall.selectedImages.length === 1 ? '1 image' : WidgetWall.selectedImages.length + ' images';
                          WidgetWall.isUploadingMedia = false;
                          if (!$scope.$$phase) $scope.$apply();
                      });
                  };

                  input.click();
              }
          }

          WidgetWall.selectVideos = function () {
              console.log('[VideoSelect] Checking video upload capabilities');

              // Check for available upload APIs
              var hasPublicFiles = buildfire && buildfire.services && buildfire.services.publicFiles &&
                               (buildfire.services.publicFiles.showDialog || buildfire.services.publicFiles.uploadFiles);

              var hasImageLibFallback = buildfire && buildfire.imageLib && buildfire.imageLib.showDialog;

              console.log('[VideoSelect] API availability:', {
                  hasPublicFiles: hasPublicFiles,
                  hasImageLibFallback: hasImageLibFallback
              });

              if (!hasPublicFiles && !hasImageLibFallback) {
                  console.error('[VideoSelect] No upload API available');
                  buildfire.dialog.toast({
                      message: 'Video upload requires an updated BuildFire SDK. Please update your BuildFire CLI: npm install -g buildfire@latest',
                      type: 'warning',
                      duration: 8000
                  });
                  return;
              }

              // Check if user is logged in before allowing video upload
              buildfire.auth.getCurrentUser(function(err, currentUser) {
                  if (err || !currentUser || !currentUser._id) {
                      console.error('[VideoSelect] User not logged in:', err);
                      buildfire.dialog.toast({
                          message: 'Please log in to upload videos.',
                          type: 'warning',
                          duration: 4000
                      });
                      return;
                  }

                  console.log('[VideoSelect] User authenticated, proceeding with video selection');

                  if (hasPublicFiles && buildfire.services.publicFiles.showDialog) {
                      console.log('[VideoSelect] Using publicFiles.showDialog');
                      WidgetWall.isUploadingMedia = true;
                      if (!$scope.$$phase) $scope.$apply();

                      buildfire.services.publicFiles.showDialog(
                          {
                              allowMultipleFilesUpload: true,
                              filter: ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg', 'video/avi', 'video/*']
                          },
                          function(onProgress) {
                              console.log('[VideoSelect] Upload progress:', onProgress);
                          },
                          function(onComplete) {
                              console.log('[VideoSelect] File complete:', onComplete);
                          },
                          function(err, files) {
                              console.log('[VideoSelect] showDialog callback:', err, files);
                              if (err) {
                                  console.error('[VideoSelect] showDialog error:', err);
                                  buildfire.dialog.toast({
                                      message: err.message || 'Video upload failed. Please try again.',
                                      type: 'danger'
                                  });
                                  WidgetWall.isUploadingMedia = false;
                                  if (!$scope.$$phase) $scope.$apply();
                                  return;
                              }

                              if (files && files.length > 0) {
                                  files.forEach(function(file) {
                                      if (file.status === 'success' && file.url) {
                                          WidgetWall.selectedVideos.push(file.url);
                                      }
                                  });
                                  WidgetWall.selectedVideosText = WidgetWall.selectedVideos.length === 1 ? '1 video' : WidgetWall.selectedVideos.length + ' videos';
                              }

                              WidgetWall.isUploadingMedia = false;
                              if (!$scope.$$phase) $scope.$apply();
                          }
                      );
                  } else if (hasPublicFiles && buildfire.services.publicFiles.uploadFiles) {
                      console.log('[VideoSelect] showDialog not available, using file input with uploadFiles fallback');
                      var input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.avi,.mkv,.m4v,.3gp';
                      input.multiple = true;
                      input.style.display = 'none';
                      document.body.appendChild(input);

                      input.onchange = function(e) {
                          var files = e.target.files;
                          document.body.removeChild(input);

                          if (!files || files.length === 0) return;

                          WidgetWall.isUploadingMedia = true;
                          if (!$scope.$$phase) $scope.$apply();

                          WidgetWall.processSelectedFiles(files);
                      };

                      input.click();
                  } else if (hasImageLibFallback) {
                      // Fallback to imageLib.showDialog with showFiles option
                      console.log('[VideoSelect] Using imageLib.showDialog fallback (older SDK)');
                      console.warn('[VideoSelect] Note: Video uploads work best with updated BuildFire SDK');

                      WidgetWall.isUploadingMedia = true;
                      if (!$scope.$$phase) $scope.$apply();

                      buildfire.imageLib.showDialog(
                          {
                              showFiles: true,
                              showIcons: false,
                              multiSelection: true
                          },
                          function(err, result) {
                              console.log('[VideoSelect] imageLib callback:', err, result);
                              WidgetWall.isUploadingMedia = false;

                              if (err) {
                                  console.error('[VideoSelect] imageLib error:', err);
                                  buildfire.dialog.toast({
                                      message: err.message || 'Upload failed. For better video support, please update BuildFire SDK.',
                                      type: 'warning',
                                      duration: 5000
                                  });
                                  if (!$scope.$$phase) $scope.$apply();
                                  return;
                              }

                              if (result && result.selectedFiles && result.selectedFiles.length > 0) {
                                  result.selectedFiles.forEach(function(file) {
                                      if (file && typeof file === 'string') {
                                          WidgetWall.selectedVideos.push(file);
                                      }
                                  });
                                  WidgetWall.selectedVideosText = WidgetWall.selectedVideos.length === 1 ? '1 video' : WidgetWall.selectedVideos.length + ' videos';
                                  console.log('[VideoSelect] Files selected via imageLib:', WidgetWall.selectedVideos.length);
                              }

                              if (!$scope.$$phase) $scope.$apply();
                          }
                      );
                  }
              });
          }

          WidgetWall.handlePostKeyPress = function (event) {
              if (event.keyCode === 13) {
                  WidgetWall.submitCustomPost();
              }
          }

          WidgetWall.submitCustomPost = function () {
              if (WidgetWall.editingPost) {
                  WidgetWall.updatePost();
                  return;
              }

              if (WidgetWall.isSubmittingPost) {
                  console.log('[submitCustomPost] Already submitting, ignoring duplicate request');
                  return;
              }

              const hasImages = WidgetWall.selectedImages && WidgetWall.selectedImages.length > 0;
              const hasVideos = WidgetWall.selectedVideos && WidgetWall.selectedVideos.length > 0;
              const hasMedia = hasImages || hasVideos;

              if (!hasMedia) {
                  buildfire.dialog.toast({
                      message: WidgetWall.SocialItems.languages.mediaRequired || "Please add an image or video to post",
                      type: 'warning'
                  });
                  return;
              }

              WidgetWall.isSubmittingPost = true;

              $scope.WidgetWall.images = WidgetWall.selectedImages || [];
              $scope.WidgetWall.videos = WidgetWall.selectedVideos || [];
              WidgetWall.postText = WidgetWall.customPostText;

              console.log('[DEBUG] Submitting post with:', {
                  images: $scope.WidgetWall.images.length,
                  videos: $scope.WidgetWall.videos.length,
                  text: WidgetWall.postText
              });

              WidgetWall.closeCustomPostDialog();

              finalPostCreation($scope.WidgetWall.images, (err) => {
                  WidgetWall.isSubmittingPost = false;
                  if (err) {
                      return;
                  }
                  if (!WidgetWall.SocialItems.isPrivateChat) {
                      buildfire.auth.getCurrentUser((err, currentUser) => {
                          if (err || !currentUser) {
                              console.error('Error getting current user: ', err);
                              return;
                          } else {
                              SocialDataStore.addFeedPost({
                                  postText: WidgetWall.postText ? WidgetWall.postText : "",
                                  postImages: $scope.WidgetWall.images || []
                              }, (err, r) => {
                                  if (err) {
                                      console.error('Error adding feed post: ', err);
                                      return;
                                  }
                                  if (r && r.id) {
                                      followThread(r.id);
                                  }
                              });
                          }
                      })
                  }
              });
          }

          const followThread = (postId) =>{
              if (!postId) {
                  console.error('followThread: postId is required');
                  return;
              }
              WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      SubscribedUsersData.getGroupFollowingStatus(userData._id, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                          if (status.length) {
                              SubscribedUsersData.followThread({
                                  userId: userData._id,
                                  wallId: WidgetWall.SocialItems.wid,
                                  post: postId
                              });
                          }
                      });
                  }
              });
          }

          WidgetWall.navigateTo = function () {
              let privacy = util.getParameterByName("privacy") ? util.getParameterByName("privacy") : null;
              let query = 'wid=' + WidgetWall.SocialItems.wid;
              if (privacy) query += '&privacy=' + privacy;
              if (!WidgetWall.SocialItems.appSettings.actionItem.queryString)
                  WidgetWall.SocialItems.appSettings.actionItem.queryString = query;
              if (WidgetWall.SocialItems.appSettings.actionItem.type === 'navigation') {
                  Buildfire.navigation.navigateTo({
                      pluginId: WidgetWall.SocialItems.appSettings.actionItem.pluginId,
                      queryString: WidgetWall.SocialItems.appSettings.actionItem.queryString
                  });
              } else {
                  buildfire.actionItems.execute(WidgetWall.SocialItems.appSettings.actionItem, (err, action) => {
                      if (err) return console.error(err);
                  });
              }
          }

          WidgetWall.showTopDrawer = function () {
              const listItems = [];
              if (WidgetWall.SocialItems.appSettings.showMembers) {
                  listItems.push({
                      text: WidgetWall.SocialItems.languages.members,
                      id: 'members'
                  });
              }
              listItems.push({
                  text: WidgetWall.SocialItems.languages.blockedUsers,
                  id: 'blockedList'
              });
              Buildfire.components.drawer.open({
                  enableFilter: false,
                  listItems
              }, (err, result) => {
                  if (err) return console.error(err);
                  buildfire.components.drawer.closeDrawer();
                  if (result.id === 'members') {
                      WidgetWall.showMembers();
                  } else if (result.id === 'blockedList') {
                      Location.go('#/blocked-users/');
                  }
              });

          }
          WidgetWall.showMembers = function () {
              WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);

                  if (userData) {
                      if (WidgetWall.SocialItems.wid) {
                          Location.go('#/members/' + WidgetWall.SocialItems.wid);
                      } else {
                          Location.go('#/members/home');
                      }
                  }
              });
          }

          WidgetWall.likeThread = function (post) {
              WidgetWall.SocialItems.authenticateUser(null, function(err, userData) {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      if (WidgetWall.SocialItems.userBanned) return;
                      var liked = post.likes.find(function(element) { return element === WidgetWall.SocialItems.userDetails.userId; });
                      var index = post.likes.indexOf(WidgetWall.SocialItems.userDetails.userId);
                      var postUpdate = WidgetWall.SocialItems.items.find(function(element) { return element.id === post.id; });
                      if (!post._buildfire) post._buildfire = {};
                      if (!post._buildfire.index) post._buildfire.index = {};
                      if (liked !== undefined) {
                          post.likes.splice(index, 1);
                          post.likesCount = post.likes.length;
                          post._buildfire.index.number1 = post.likes.length;
                          Buildfire.messaging.sendMessageToControl({
                              'name': EVENTS.POST_UNLIKED,
                              'id': postUpdate.id,
                              'userId': liked
                          });
                      } else {
                          post.likes = DataUtils.array.addToLimited(post.likes || [], WidgetWall.SocialItems.userDetails.userId, 10000);
                          post.likesCount = post.likes.length;
                          post._buildfire.index.number1 = post.likes.length;
                          Buildfire.messaging.sendMessageToControl({
                              'name': EVENTS.POST_LIKED,
                              'id': postUpdate.id,
                              'userId': liked
                          });
                      }
                      SocialDataStore.updatePost(post).then(function() {
                          SubscribedUsersData.getGroupFollowingStatus(post.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                              if (status.length &&
                                status[0].data && !status[0].data.leftWall && !liked) {
                                  Analytics.trackAction("post-liked");
                                  WidgetWall.scheduleNotification(post, 'like');
                              }
                          });
                      }, function(err) { console.error('Error updating post:', err); });
                  }
              });
          }

          WidgetWall.seeMore = function (post) {
              post.seeMore = true;
              post.limit = 10000000;
              if (!$scope.$$phase) $scope.$digest();
          };

          WidgetWall.seeLess = function (post) {
              post.seeMore = false;
              post.limit = 150;
              if (!$scope.$$phase) $scope.$digest();
          };

          WidgetWall.getDuration = function (timestamp) {
              if (timestamp)
                  return moment(timestamp.toString()).fromNow();
          };

          WidgetWall.goInToThread = function (threadId, pushToHistory) {
              WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                  if (err) {
                    WidgetWall.stopSkeleton();
                    return console.error("Getting user failed.", err);
                  }
                  if (user) {
                      WidgetWall.checkFollowingStatus(null , ()=>{
                          if (threadId && !WidgetWall.SocialItems.userBanned) {
                              Location.go('#/thread/' + threadId, pushToHistory);
                         }
                         if (pushToHistory) {
                            WidgetWall.stopSkeleton();
                          }
                      });
                  }
              });
          };

          WidgetWall.deletePost = function (postId) {
              var success = function (response) {
                  if (response) {
                      Buildfire.messaging.sendMessageToControl({
                          'name': EVENTS.POST_DELETED,
                          'id': postId
                      });
                      let postToDelete = WidgetWall.SocialItems.items.find(element => element.id === postId)
                      console.log(postToDelete);
                      SocialDataStore.deleteFeedPost({
                          userId: postToDelete.userId,
                          postText: postToDelete.text,
                          postImages: postToDelete.imageUrl || [],
                      }, (err, r) => {
                          return
                      });
                      let index = WidgetWall.SocialItems.items.indexOf(postToDelete);
                      WidgetWall.SocialItems.items.splice(index, 1);
                      buildfire.spinner.hide();
                      if (!$scope.$$phase)
                          $scope.$digest();
                  }
              };
              // Called when getting error from SocialDataStore.deletePost method
              var error = function (err) {
                  console.log('Error while deleting post ', err);
              };
              // Deleting post having id as postId
              buildfire.spinner.show();
              buildfire.components.drawer.closeDrawer();
              SocialDataStore.deletePost(postId).then(success, error);
          };

          WidgetWall.editPost = function (post) {
              WidgetWall.editingPost = post;
              WidgetWall.customPostText = post.text || '';
              WidgetWall.selectedImages = post.imageUrl || [];
              WidgetWall.selectedVideos = post.videos || [];
              WidgetWall.selectedImagesText = WidgetWall.selectedImages.length > 0 ? (WidgetWall.selectedImages.length === 1 ? '1 image' : WidgetWall.selectedImages.length + ' images') : 'Add images';
              WidgetWall.selectedVideosText = WidgetWall.selectedVideos.length > 0 ? (WidgetWall.selectedVideos.length === 1 ? '1 video' : WidgetWall.selectedVideos.length + ' videos') : 'Add videos';
              WidgetWall.showCustomPostDialog = true;
              if (!$scope.$$phase) $scope.$apply();
          };

          WidgetWall.updatePost = function () {
              const post = WidgetWall.editingPost;
              post.text = WidgetWall.customPostText;
              post.imageUrl = WidgetWall.selectedImages || [];
              post.videos = WidgetWall.selectedVideos || [];
              post.lastUpdatedOn = new Date();

              SocialDataStore.updatePost(post).then(() => {
                  Buildfire.dialog.toast({
                      message: WidgetWall.SocialItems.languages.postUpdateSuccess || "Post updated successfully",
                      type: 'success'
                  });
                  WidgetWall.closeCustomPostDialog();
                  if (!$scope.$$phase) $scope.$apply();
              }).catch((err) => {
                  console.error('Error updating post:', err);
                  Buildfire.dialog.toast({
                      message: WidgetWall.SocialItems.languages.postUpdateFail || "Failed to update post",
                      type: 'danger'
                  });
              });
          };

          WidgetWall.blockUser = function (userId, userDetails) {
              const userName = WidgetWall.SocialItems.getUserName(userDetails);
              buildfire.dialog.confirm({
                  title: `${WidgetWall.SocialItems.languages.blockUserTitleConfirmation} ${userName}`,
                  message: WidgetWall.SocialItems.languages.blockUserBodyConfirmation,
                  cancelButton: { text: WidgetWall.SocialItems.languages.blockUserCancelBtn },
                  confirmButton: { text: WidgetWall.SocialItems.languages.blockUserConfirmBtn }
              }, (err, isConfirmed) => {
                  if (err) return console.error(err);
                  if (!isConfirmed) return;
                  buildfire.spinner.show();
                  buildfire.components.drawer.closeDrawer();
                  SubscribedUsersData.blockUser(userId, (err, result) => {
                      buildfire.spinner.hide();
                      if (err) {
                          console.log(err);
                      }
                      if (result) {
                          Buildfire.dialog.toast({
                              message: `${userName} ${WidgetWall.SocialItems.languages.blockUserSuccess}`,
                              type: 'info'
                          });
                          Location.goToHome();
                      }
                  });
              });

          }
          WidgetWall.sharePost = function (post) {
              if (!post || !post.id) return;

              console.log("[SharePost] Starting...", post.id);

              buildfire.spinner.show();

              const deeplinkData = {
                  data: {
                      itemId: post.id
                  }
              };

              var wallId = WidgetWall.SocialItems.wid || '';
              if (wallId && wallId !== '') {
                  deeplinkData.data.wid = String(wallId);
              }

              const shareTitle = WidgetWall.sanitizeShareText(WidgetWall.SocialItems.context.title) || 'Community Post';
              const postText = post.text || '';
              const sanitizedPostText = WidgetWall.sanitizeShareText(postText);
              let shareDescription = sanitizedPostText ? sanitizedPostText.substring(0, 200) : '';
              if (!shareDescription || shareDescription.length < 10) {
                  shareDescription = 'Check out this post on ' + shareTitle;
              }

              buildfire.deeplink.generateUrl(deeplinkData, (err, result) => {
                  buildfire.spinner.hide();

                  if (err || !result || !result.url) {
                      console.error("[SharePost] Deep link failed", err);

                      buildfire.device.share({
                          subject: shareTitle,
                          text: shareDescription
                      });
                      return;
                  }

                  console.log("[SharePost] Deep link success:", result.url);

                  WidgetWall.executeShare(result.url, shareTitle, shareDescription, null, post);
              });
          }

          WidgetWall.executeShare = function(url, title, description, image, post) {
              buildfire.getContext((err, context) => {
                  if (err) {
                      console.error('Error getting context:', err);
                      WidgetWall.fallbackShare(url, post);
                      return;
                  }

                  const isDesktop = context.device.platform === 'web';
                  const canUseWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.isSecureContext;

                  if (isDesktop) {
                      if (canUseWebShare) {
                          const shareData = { title: title, text: description, url: url };
                          navigator.share(shareData).then(() => {
                              if (typeof Analytics !== 'undefined') {
                                  Analytics.trackAction("post-shared");
                              }
                          }).catch((shareErr) => {
                              if (shareErr.name === 'AbortError') return;
                              console.log('Web Share not available, falling back to clipboard');
                              WidgetWall.showCopyLinkDialog(url, description);
                          });
                      } else {
                          WidgetWall.showCopyLinkDialog(url, description);
                      }
                  } else {
                      buildfire.device.share({
                          subject: title,
                          text: description,
                          image: image,
                          link: url
                      }, (err, result) => {
                          if (err) {
                              console.error('Native share failed:', err);
                              WidgetWall.fallbackShare(url, post);
                              return;
                          }

                          if (typeof Analytics !== 'undefined') {
                              Analytics.trackAction("post-shared");
                          }
                      });
                  }
              });
          }

          WidgetWall.showCopyLinkDialog = function(url, description) {
              buildfire.dialog.confirm({
                  title: 'Share Post',
                  message: description,
                  confirmButton: { text: 'Copy Link' },
                  cancelButton: { text: 'Cancel' }
              }, (err, isConfirmed) => {
                  if (err) return console.error(err);
                  if (isConfirmed) {
                      WidgetWall.copyToClipboard(url);
                  }
              });
          }

          WidgetWall.copyToClipboard = function(url) {
              var copySuccess = function() {
                  if (typeof Analytics !== 'undefined') {
                      Analytics.trackAction("post-shared");
                  }
              };

              var copyFail = function() {
                  Buildfire.dialog.toast({
                      message: WidgetWall.SocialItems.languages.sharePostFail || "Unable to copy link. Please try again.",
                      type: 'danger'
                  });
              };

              if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(url).then(copySuccess).catch(function() {
                      WidgetWall.legacyCopyToClipboard(url, copySuccess, copyFail);
                  });
              } else {
                  WidgetWall.legacyCopyToClipboard(url, copySuccess, copyFail);
              }
          }

          WidgetWall.legacyCopyToClipboard = function(text, onSuccess, onFail) {
              var textArea = document.createElement('textarea');
              textArea.value = text;
              textArea.style.position = 'fixed';
              textArea.style.top = '0';
              textArea.style.left = '0';
              textArea.style.width = '2em';
              textArea.style.height = '2em';
              textArea.style.padding = '0';
              textArea.style.border = 'none';
              textArea.style.outline = 'none';
              textArea.style.boxShadow = 'none';
              textArea.style.background = 'transparent';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              try {
                  var successful = document.execCommand('copy');
                  if (successful) {
                      onSuccess();
                  } else {
                      onFail();
                  }
              } catch (err) {
                  console.error('Legacy copy failed:', err);
                  onFail();
              }
              document.body.removeChild(textArea);
          }

          WidgetWall.fallbackCopyToClipboard = function(link) {
              const tempInput = document.createElement('input');
              tempInput.value = link;
              document.body.appendChild(tempInput);
              tempInput.select();
              tempInput.setSelectionRange(0, 99999);

              try {
                  document.execCommand('copy');

                  if (typeof Analytics !== 'undefined') {
                      Analytics.trackAction("post-shared");
                  }
              } catch (err) {
                  console.error('Fallback copy failed:', err);
                  Buildfire.dialog.toast({
                      message: WidgetWall.SocialItems.languages.sharePostFail || "Unable to copy link. Please try again.",
                      type: 'danger'
                  });
              } finally {
                  document.body.removeChild(tempInput);
              }
          }

          WidgetWall.sanitizeShareText = function(text) {
              if (!text || typeof text !== 'string') return '';

              try {
                  let sanitized = text;

                  if (text.includes('%')) {
                      try {
                          sanitized = decodeURIComponent(text);
                      } catch (e) {
                          sanitized = text;
                      }
                  }

                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = sanitized;
                  sanitized = tempDiv.textContent || tempDiv.innerText || '';

                  sanitized = sanitized
                      .replace(/[\r\n\t]+/g, ' ')
                      .replace(/\s+/g, ' ')
                      .replace(/[^\x20-\x7E\u00A0-\u024F]/g, '')
                      .trim();

                  return sanitized;
              } catch (error) {
                  console.error('[SharePost] Error sanitizing text:', error);
                  return '';
              }
          };

          WidgetWall.fallbackShare = function(link, post) {
              const postText = post && post.text ? post.text : '';
              const sanitizedPostText = WidgetWall.sanitizeShareText(postText);
              const shareText = sanitizedPostText ? sanitizedPostText.substring(0, 200) : 'Check out this post!';
              const shareTitle = WidgetWall.sanitizeShareText(WidgetWall.SocialItems.context.title) || 'Community Post';

              if (navigator.share) {
                  const shareData = {
                      title: shareTitle,
                      text: shareText
                  };

                  if (link) {
                      shareData.url = link;
                  }

                  navigator.share(shareData).then(() => {
                      if (typeof Analytics !== 'undefined') {
                          Analytics.trackAction("post-shared");
                      }
                  }).catch((shareErr) => {
                      if (shareErr.name !== 'AbortError') {
                          console.error('Share failed:', shareErr);
                          Buildfire.dialog.toast({
                              message: WidgetWall.SocialItems.languages.sharePostFail || "Unable to share post.",
                              type: 'danger'
                          });
                      }
                  });
              } else if (link) {
                  const tempInput = document.createElement('input');
                  tempInput.value = link;
                  document.body.appendChild(tempInput);
                  tempInput.select();
                  tempInput.setSelectionRange(0, 99999);

                  try {
                      document.execCommand('copy');

                      if (typeof Analytics !== 'undefined') {
                          Analytics.trackAction("post-shared");
                      }
                  } catch (err) {
                      console.error('Fallback copy failed:', err);
                  } finally {
                      document.body.removeChild(tempInput);
                  }
              } else {
                  Buildfire.dialog.toast({
                      message: WidgetWall.SocialItems.languages.sharePostFail || "Unable to share post. Please try again.",
                      type: 'danger'
                  });
              }
          }

          WidgetWall.reportPost = function (post) {
              Buildfire.services.reportAbuse.report(
                {
                    "itemId": post.id,
                    "reportedUserId": post.userId,
                    "deeplink": {
                        "fromReportAbuse": true,
                        "postId": post.id,
                        "wallId": WidgetWall.SocialItems.wid
                    },
                    "itemType": "post"
                },
                (err, reportResult) => {
                    if (err && err !== 'Report is cancelled') {
                        Buildfire.dialog.toast({
                            message: WidgetWall.SocialItems.languages.reportPostFail || "This post is already reported.",
                            type: 'info'
                        });
                    }
                    if (reportResult) {
                        Buildfire.dialog.toast({
                            message: WidgetWall.SocialItems.languages.reportPostSuccess || "Report submitted and pending admin review.",
                            type: 'info'
                        });
                    }
                }
              );
          }

          Buildfire.messaging.onReceivedMessage = function (event) {
              if (event) {
                  switch (event.name) {
                      case EVENTS.POST_DELETED:
                          WidgetWall.SocialItems.items = WidgetWall.SocialItems.items.filter(function (el) {
                              return el.id != event.id;
                          });

                          if (WidgetWall.modalPopupThreadId == event.id)
                              Buildfire.dialog.toast({
                                  message: "Post already deleted",
                                  type: 'info'
                              });
                          if (!$scope.$$phase)
                              $scope.$digest();
                          break;
                      case EVENTS.COMMENT_DELETED:
                          let post = WidgetWall.SocialItems.items.find(element => element.id === event.postId)
                          let index = post.comments.indexOf(event.comment);
                          post.comments.splice(index, 1);
                          if (WidgetWall.modalPopupThreadId == event.postId)
                              Buildfire.dialog.toast({
                                  message: "Comment already deleted",
                                  type: 'info'
                              });
                          if (!$scope.$$phase)
                              $scope.$digest();
                          break;
                      case 'ASK_FOR_POSTS':
                          if (WidgetWall.SocialItems.items.length) {
                              window.buildfire.messaging.sendMessageToControl({
                                  name: 'SEND_POSTS_TO_CP',
                                  posts: WidgetWall.SocialItems.items,
                                  pinnedPost: WidgetWall.pinnedPost
                              });
                          }
                          break;
                      case 'ASK_FOR_WALLID':
                          window.buildfire.messaging.sendMessageToControl({
                              name: 'SEND_WALLID',
                              wid: WidgetWall.SocialItems.wid,
                          });
                      default:
                          break;
                  }
              }
          };

          WidgetWall.decodeText = function (text) {
              return decodeURIComponent(text);
          };

          Buildfire.datastore.onUpdate(function (response) {
              console.log(response)
              if (response.tag === "Social") {
                  WidgetWall.setSettings(response);
                  if (response.data && response.data.appSettings && response.data.appSettings.bottomLogo) {
                      WidgetWall.bottomLogo = response.data.appSettings.bottomLogo;
                      WidgetWall.adjustLayoutForBottomLogo();
                  }
                  setTimeout(function () {
                      if (!response.data.appSettings.disableFollowLeaveGroup) {
                          let wallSVG = document.getElementById("WidgetWallSvg")
                          if (wallSVG) {
                              wallSVG.style.setProperty("fill", WidgetWall.appTheme.icons, "important");
                          }
                      }
                  }, 100);
              } else if (response.tag === "languages")
                  WidgetWall.SocialItems.formatLanguages(response);
              if (!$scope.$$phase) {
                  $scope.$apply();
              }
          });

          function updatePostsWithNames(user, status) {
            // update posts with the user details
            buildfire.publicData.searchAndUpdate({
              "_buildfire.index.array1.string1": `createdBy_${user._id}`
              }, {
                $set: {
                  "userDetails": status[0].data.userDetails
                }
              }, 'posts', (err, res) => {
                if (err) console.error('failed to update posts ' + err);

                // update comments with the user details
                buildfire.publicData.searchAndUpdate({
                  "$json.comments.userId": user._id
                }, {
                  $set: {
                    "comments.$.userDetails": status[0].data.userDetails
                  }
                }, 'posts', (err, res) => {
                  if (err) console.error('failed to update comments ' + err);
                });
            });
          }

          WidgetWall.statusCheck = function (status, user) {
              if (status && status[0]) {
                  if (!status[0].data.userDetails.lastUpdated) {
                      status[0].data.userDetails.lastUpdated = user.lastUpdated;
                      window.buildfire.publicData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
                          if (err) return console.error(err);
                      });
                  } else {
                      var lastUpdated = new Date(status[0].data.userDetails.lastUpdated).getTime();
                      var dbLastUpdate = new Date(user.lastUpdated).getTime();
                      if (dbLastUpdate > lastUpdated || (typeof status[0].data.userDetails.firstName === 'undefined' ||
                        typeof status[0].data.userDetails.lastName === 'undefined')) {
                          const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                          if (re.test(String(user.firstName).toLowerCase()))
                              user.firstName = 'Someone';
                          if (re.test(String(user.displayName).toLowerCase()))
                              user.displayName = 'Someone';
                          status[0].data.userDetails.displayName = user.displayName ? user.displayName : "";
                          status[0].data.userDetails.firstName = user.firstName ? user.firstName : "";
                          status[0].data.userDetails.lastName = user.lastName ? user.lastName : "";
                          status[0].data.userDetails.email = user.email;
                          status[0].data.userDetails.imageUrl = user.imageUrl;
                          status[0].data.userDetails.lastUpdated = user.lastUpdated;

                          window.buildfire.publicData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
                              if (err) return console.error(err);
                              updatePostsWithNames(user, status);
                          });

                      }
                  }
              }
          }

          WidgetWall.privateChatSecurity = function () {
              if (WidgetWall.SocialItems.isPrivateChat) {
                  const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                  const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                  var loggedUser = WidgetWall.SocialItems.userDetails.userId;

                  if (loggedUser !== user1Id && loggedUser !== user2Id) {
                      buildfire.history.get({
                          pluginBreadcrumbsOnly: true
                      }, function (err, result) {
                          if (result[result.length - 1].options.isPrivateChat) {
                              result.map(item => buildfire.history.pop());
                              WidgetWall.SocialItems.items = [];
                              WidgetWall.SocialItems.isPrivateChat = false;
                              WidgetWall.SocialItems.pageSize = 5;
                              WidgetWall.SocialItems.page = 0;
                              WidgetWall.SocialItems.wid = WidgetWall.SocialItems.mainWallID;
                              WidgetWall.init();
                          }
                      });
                  }
              }
          }

          $scope.$on('openImageGallery', function(event, data) {
              console.log('[WallController] openImageGallery event received:', data);
              if (data && data.images && data.images.length) {
                  WidgetWall.imageGallery.images = data.images;
                  WidgetWall.imageGallery.currentIndex = data.index || 0;
                  WidgetWall.imageGallery.show = true;
                  console.log('[WallController] Gallery state set:', WidgetWall.imageGallery);
                  if (!$scope.$$phase) {
                      $scope.$apply();
                  }
              }
          });

          document.addEventListener('keydown', function(e) {
              if (WidgetWall.imageGallery.show) {
                  if (e.key === 'Escape') {
                      WidgetWall.closeImageGallery();
                  } else if (e.key === 'ArrowLeft') {
                      WidgetWall.prevImage();
                  } else if (e.key === 'ArrowRight') {
                      WidgetWall.nextImage();
                  }
              }
          });

          // On Login
          Buildfire.auth.onLogin(function (user) {
              if (!WidgetWall.SocialItems.forcedToLogin) {
                  WidgetWall.SocialItems.authenticateUser(user, (err, userData) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (userData) {
                          WidgetWall.checkFollowingStatus();
                      }
                  });
              } else WidgetWall.SocialItems.forcedToLogin = false;
              Location.goToHome();
              if ($scope.$$phase) $scope.$digest();
          });
          // On Logout
          Buildfire.auth.onLogout(function () {
              console.log('User loggedOut from Widget Wall Page');
              buildfire.appearance.titlebar.show();
              WidgetWall.SocialItems.userDetails = {};
              WidgetWall.groupFollowingStatus = false;
              buildfire.notifications.pushNotification.unsubscribe({
                  groupName: WidgetWall.SocialItems.wid === '' ?
                    WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
              }, () => {});
              WidgetWall.privateChatSecurity();
              $scope.$digest();
          });

      }])
})(window.angular);
