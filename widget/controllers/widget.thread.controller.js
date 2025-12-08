'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
      .controller('ThreadCtrl', ['$scope', '$routeParams', '$location', '$anchorScroll', 'SocialDataStore', '$rootScope', 'Buildfire', 'EVENTS', 'THREAD_STATUS', 'FILE_UPLOAD', 'SocialItems', '$q', '$timeout', 'Location', 'Util', 'GROUP_STATUS', 'SubscribedUsersData', function ($scope, $routeParams, $location, $anchorScroll, SocialDataStore, $rootScope, Buildfire, EVENTS, THREAD_STATUS, FILE_UPLOAD, SocialItems, $q, $timeout, Location, Util, GROUP_STATUS, SubscribedUsersData) {
          var Thread = this;
          Thread.userDetails = {};
          Thread.SocialItems = SocialItems.getInstance();
          Thread.allowCreateThread = false;
          Thread.allowPrivateChat = false;
          Thread.allowFollowLeaveGroup = false;
          Thread.post = {};
          Thread.showImageLoader = true;
          Thread.modalPopupThreadId;
          Thread.followingStatus = false;
          Thread.util = Util;
          Thread.loaded = false;
          Thread.processedComments = false;
          Thread.bottomLogo = {};
          Thread.skeletonPost = new Buildfire.components.skeleton('.social-item', {
              type: 'list-item-avatar, list-item-two-line, image'
          });
          Thread.skeletonComments = new Buildfire.components.skeleton('.social-item-comment', {
              type: 'list-item-avatar, list-item-two-line'
          });

          Thread.showHideCommentBox = function () {
              if (Thread.SocialItems && Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.allowSideThreadTags &&
                Thread.SocialItems.appSettings.sideThreadUserTags && Thread.SocialItems.appSettings.sideThreadUserTags.length > 0
              ) {
                  var _userTagsObj = Thread.SocialItems.userDetails.userTags;
                  var _userTags = [];
                  if (_userTagsObj) {
                      _userTags = _userTagsObj[Object.keys(_userTagsObj)[0]];
                  }

                  if (_userTags) {
                      var _hasPermission = false;
                      for (var i = 0; i < Thread.SocialItems.appSettings.sideThreadUserTags.length; i++) {
                          var _sideThreadTag = Thread.SocialItems.appSettings.sideThreadUserTags[i].text;
                          for (var x = 0; x < _userTags.length; x++) {
                              if (_sideThreadTag.toLowerCase() == _userTags[x].tagName.toLowerCase()) {
                                  _hasPermission = true;
                                  break;
                              }
                          }
                      }
                      Thread.allowCreateThread = _hasPermission;
                  } else {
                      Thread.allowCreateThread = false;
                  }
              } else {
                  Thread.allowCreateThread = true;
              }

              $scope.$digest();
          };
          Thread.showHidePrivateChat = function () {
              if (Thread.SocialItems && Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.disablePrivateChat) {
                  Thread.allowPrivateChat = false;
              } else {
                  Thread.allowPrivateChat = true;
              }
          };

          Thread.loadBottomLogoConfig = function () {
              buildfire.datastore.get('Social', function (err, result) {
                  if (err) {
                      console.error('Error loading bottom logo config:', err);
                      return;
                  }
                  if (result && result.data && result.data.appSettings) {
                      if (result.data.appSettings.bottomLogo) {
                          Thread.bottomLogo = result.data.appSettings.bottomLogo;
                          Thread.adjustLayoutForBottomLogo();
                      }
                  }
              });
          };

          Thread.adjustLayoutForBottomLogo = function () {
              if (Thread.bottomLogo && Thread.bottomLogo.enabled && Thread.bottomLogo.imageUrl) {
                  var paddingValue = Thread.bottomLogo.displayMode === 'banner' ? '150px' : '80px';
                  var scrollContainer = document.querySelector('.social-plugin.social-thread .post-section');
                  if (scrollContainer) {
                      scrollContainer.style.paddingBottom = paddingValue;
                  }
              } else {
                  var scrollContainer = document.querySelector('.social-plugin.social-thread .post-section');
                  if (scrollContainer) {
                      scrollContainer.style.paddingBottom = '7rem';
                  }
              }
          };

          Thread.followLeaveGroupPermission = function () {
              if (Thread.SocialItems && Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.disableFollowLeaveGroup) {
                  Thread.allowFollowLeaveGroup = false;
              } else {
                  Thread.allowFollowLeaveGroup = true;
              }
          }


          Thread.setupThreadImage = function () {
              if (Thread.post.imageUrl) {
                  setTimeout(function () {
                      let imageList = document.getElementById("commentPostImage");
                      if (!imageList) return;
                      imageList.images = Thread.post.imageUrl;
                      imageList.addEventListener('imageSelected', (e) => {
                          let selectedImage = e.detail.filter(image => image.selected);
                          if (selectedImage && selectedImage[0]) {
                              var imageUrl = selectedImage[0].url || selectedImage[0].name || selectedImage[0];
                              if (imageUrl) {
                                  window.open(imageUrl, '_blank');
                              }
                          }
                      });

                  });
              }
          }

          Thread.showComments = () => {
              Thread.organizeThreadedComments();
              Thread.processedComments = true;
              if (!$scope.$$phase) $scope.$digest();
          }

          Thread.getDisplayName = (userId, userDetails) => {
              const blockedUsers = Thread.SocialItems.blockedUsers;
              if (blockedUsers.includes(userId)) return Thread.SocialItems.languages.blockedUser || "Blocked User";
              else return Thread.SocialItems.getUserName(userDetails);
          }

          Thread.isBlockedUser = (userId) => {
              const blockedUsers = Thread.SocialItems.blockedUsers;
              return blockedUsers.includes(userId);
          }

          Thread.organizeThreadedComments = function () {
              if (!Thread.post.comments || !Thread.post.comments.length) {
                  Thread.threadedComments = [];
                  return;
              }

              const commentMap = {};
              const rootComments = [];

              Thread.post.comments.forEach(comment => {
                  if (!comment.replies) {
                      comment.replies = [];
                  }
                  if (!comment.parentCommentId) {
                      comment.parentCommentId = null;
                  }
                  commentMap[comment.commentId] = comment;
              });

              Thread.post.comments.forEach(comment => {
                  if (comment.parentCommentId && commentMap[comment.parentCommentId]) {
                      commentMap[comment.parentCommentId].replies.push(comment);
                  } else {
                      rootComments.push(comment);
                  }
              });

              // Add depth calculation for styling
              const setDepth = (comments, depth = 0) => {
                  comments.forEach(comment => {
                      comment.depth = depth;
                      if (comment.replies && comment.replies.length > 0) {
                          setDepth(comment.replies, depth + 1);
                      }
                  });
              };
              setDepth(rootComments);

              Thread.threadedComments = rootComments;
          }

          Thread.handleDeletedUsers = function () {
              if (!Thread.post.comments.length) return Thread.showComments();

              let userIds = [...new Set(Thread.post.comments.map(comment => comment.userId))];
              if (userIds.length)
                  Thread.getUserProfiles(userIds);
          }

          Thread.getUserProfiles = (userIds) => {
              let userProfilesChunks = Util.splitArrayIntoChunks(userIds);
              let userProfilesIds = [];

              const extractAndProcessDeletedUsers = () => {
                  let deletedUsers = userIds.filter(id => !userProfilesIds.includes(id)).filter(el => el);

                  if (!deletedUsers.length) return Thread.showComments();

                  deletedUsers.forEach(userId => {
                      let comments = Thread.post.comments.filter(comment => comment.userId == userId);
                      comments.forEach(comment => {
                          comment.comment = "MESSAGE DELETED";
                          comment.deletedOn = new Date();
                          comment.originalUserId = userId;
                          comment.userId = null;
                          comment.userDetails = null;
                          comment.imageUrl = [];
                      });
                  });

                  SocialDataStore.updatePost(Thread.post).then(() => {
                      return Thread.showComments();
                  }, (err) => console.error(err));
              }

              const getUserProfiles = (userIds) => {
                  return new Promise((resolve, reject) => {
                      buildfire.auth.getUserProfiles({userIds}, (err, users) => {
                          if (err) return reject(err);
                          resolve(users);
                      });
                  });
              }

              let promises = userProfilesChunks.map(chunk => getUserProfiles(chunk));

              Promise.all(promises).then((results) => {
                  results.forEach((result) => userProfilesIds = userProfilesIds.concat(result.map(el => el._id)));
                  extractAndProcessDeletedUsers();
              }).catch((error) => console.error(error));
          }

          Thread.loadThemeColors = function () {
              buildfire.datastore.get('Social', function (err, result) {
                  if (err) {
                      console.error('Error loading theme colors:', err);
                      return;
                  }
                  if (result && result.data && result.data.appSettings) {
                      if (result.data.appSettings.themeColors) {
                          Thread.applyThemeColors(result.data.appSettings.themeColors);
                      }
                      if (result.data.appSettings.usernameFont) {
                          Thread.applyUsernameFont(result.data.appSettings.usernameFont);
                      }
                  }
              });
          };

          Thread.applyThemeColors = function (colors) {
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

          Thread.applyUsernameFont = function (font) {
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

          Thread.init = function () {
              Thread.skeletonPost.start();
              Thread.skeletonComments.start();
              Thread.loadBottomLogoConfig();
              Thread.loadThemeColors();
              if ($routeParams.threadId) {
                  let post = Thread.SocialItems.items.find(el => el.id === $routeParams.threadId);
                  Thread.post = post || {};
                  $rootScope.showThread = false;

                  Thread.SocialItems.authenticateUser(null, (err, userData) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (userData) {
                          Thread.showHideCommentBox();
                          Thread.showHidePrivateChat();
                          Thread.followLeaveGroupPermission();
                          Thread.handleDeletedUsers();
                          SubscribedUsersData.getThreadFollowingStatus(userData._id, Thread.post.id, Thread.SocialItems.wid, Thread.SocialItems.context.instanceId, function (err, status) {
                              if (status) {
                                    let followsPost = status.posts.find(el => el === Thread.post.id);
                                    Thread.followingStatus = !!followsPost;
                              }
                              Thread.loaded = true;
                              Thread.skeletonPost.stop();
                              Thread.skeletonComments.stop();
                              Thread.setupThreadImage();
                              $scope.$digest();
                          });
                      }
                  });
              }
          }

          Thread.init();

          var watcher = $scope.$watch(function () {
              return SocialItems.getInstance().items;
          }, function (newVal, oldVal) {
              Thread.post = newVal.find(el => el.id === $routeParams.threadId);
              if (Thread.post === undefined) {
                  Location.goToHome();
              }
          }, true);

          Thread.navigateToPrivateChat = function (user) {
              Thread.SocialItems.isPrivateChat = true;
              Thread.SocialItems.items = [];
              Thread.SocialItems.wid = user.wid;
              Thread.SocialItems.pageSize = 5;
              Thread.SocialItems.page = 0;
              $rootScope.showThread = true;
              // destroy the watcher
              watcher();
              $rootScope.$broadcast("loadPrivateChat");
              Thread.SocialItems.setPrivateChatTitle(Thread.SocialItems.wid).then(() => {
                  buildfire.history.push(Thread.SocialItems.pluginTitle, {
                      isPrivateChat: true,
                      showLabelInTitlebar: true
                  });
              });
          }

          Thread.followPrivateWall = function (userId, wid, userName = null) {
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
                  userName = Thread.SocialItems.getUserName(params.userDetails)
                  console.log("SACUVAVA KORISNIKA ZA PRIVATE", params)
                  SubscribedUsersData.save(params, function (err) {
                      if (err) console.log('Error while saving subscribed user data.');
                      if (userName)
                          Thread.navigateToPrivateChat({
                              id: userId,
                              name: userName,
                              wid: wid
                          });
                  });
              })
          }

          Thread.openBottomDrawer = function (post) {
              let listItems = [];
              let userId = post.userId;
              Thread.modalPopupThreadId = post.id;
              Thread.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      // Add options based on user conditions
                      if (post.userId === Thread.SocialItems.userDetails.userId) {
                          listItems.push(
                            {
                                id: 'editPost',
                                text: Thread.SocialItems.languages.editPost || 'Edit Post'
                            },
                            {
                                id: 'deletePost',
                                text: Thread.SocialItems.languages.deletePost
                            }
                          );
                      } else {
                          listItems.push(
                            {
                                id: 'reportPost',
                                text: Thread.SocialItems.languages.reportPost
                            },
                            {
                                id: 'blockUser',
                                text: Thread.SocialItems.languages.blockUser
                            }
                          );
                      }
                  } else return false;

                  Follows.isFollowingUser(userId, (err, r) => {
                      if (Thread.SocialItems.appSettings.allowCommunityFeedFollow == true && post.userId != Thread.SocialItems.userDetails.userId)
                          listItems.push({
                              text: r ? 'Unfollow' : 'Follow'
                          });

                      if (Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.seeProfile == true && post.userId != Thread.SocialItems.userDetails.userId)
                          listItems.push({
                              text: 'See Profile'
                          });

                      if (Thread.SocialItems.appSettings && !Thread.SocialItems.appSettings.allowChat && !Thread.SocialItems.isPrivateChat
                        && post.userId != Thread.SocialItems.userDetails.userId && ((Thread.SocialItems.appSettings && !Thread.SocialItems.appSettings.disablePrivateChat) || Thread.SocialItems.appSettings.disablePrivateChat == false)) {
                          listItems.push({
                              text: 'Send Direct Message'
                          });
                      }

                      if (Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.allowChat == "allUsers" && !Thread.SocialItems.isPrivateChat
                        && post.userId != Thread.SocialItems.userDetails.userId)
                          listItems.push({
                              text: 'Send Direct Message'
                          });

                      if (Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.allowChat == "selectedUsers" && !Thread.SocialItems.isPrivateChat
                        && post.userId != Thread.SocialItems.userDetails.userId) {
                          SubscribedUsersData.checkIfCanChat(userId, (err, response) => {
                              if (response) {
                                  listItems.push({
                                      text: 'Send Direct Message'
                                  });
                              }
                              Thread.ContinueDrawer(post, listItems)
                          })
                      } else {
                          Thread.ContinueDrawer(post, listItems)
                      }
                  });
              });
          }

          Thread.ContinueDrawer = function (post, listItems) {
              let userId = post.userId;
              if (listItems.length == 0) return;
              Buildfire.components.drawer.open({
                  enableFilter: false,
                  listItems: listItems
              }, (err, result) => {
                  if (err) return console.error(err);
                  else if (result.text == "Send Direct Message") Thread.SocialItems.openChat(Thread, userId);
                  else if (result.text == "See Profile") buildfire.auth.openProfile(userId);
                  else if (result.text == "Unfollow") Follows.unfollowUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.text == "Follow") Follows.followUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.id == "reportPost") Thread.reportPost(post);
                  else if (result.id == "blockUser") Thread.blockUser(userId, post.userDetails);
                  else if (result.id == "editPost") Thread.editPost(post);
                  else if (result.id == "deletePost") Thread.deletePost(post.id)
                  buildfire.components.drawer.closeDrawer();
              });
          }

          Thread.openChatOrProfile = function (userId, comment) {
              if (comment.deletedOn) return;
              if (Thread.allowPrivateChat) {
                  Thread.SocialItems.authenticateUser(null, (err, user) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (userId === Thread.SocialItems.userDetails.userId) return;
                      buildfire.auth.getUserProfile({
                          userId: userId
                      }, function (err, otherUser) {
                          if (err || !otherUser) return console.error("Getting user profile failed.", err);
                          Thread.openPrivateChat(userId, Thread.SocialItems.getUserName(otherUser));
                      });
                  });
              }
          };

          Thread.openPrivateChat = function (userId, userName) {
              let wid = null;
              if (Thread.SocialItems.userDetails.userId && Thread.SocialItems.userDetails.userId != userId) {
                  if (Thread.SocialItems.userDetails.userId > userId) {
                      wid = Thread.SocialItems.userDetails.userId + userId;
                  } else {
                      wid = userId + Thread.SocialItems.userDetails.userId;
                  }
              }
              SubscribedUsersData.getGroupFollowingStatus(userId, wid, Thread.SocialItems.context.instanceId, function (err, status) {
                  if (err) console.error('Error while getting initial group following status.', err);
                  if (!status.length) {
                      Thread.followPrivateWall(userId, wid, userName);
                  } else {
                      Thread.navigateToPrivateChat({
                          id: userId,
                          name: userName,
                          wid: wid
                      });
                  }
              });
          }

          Thread.showMoreOptionsComment = function (comment) {
              Thread.modalPopupThreadId = comment.threadId;
              Thread.SocialItems.authenticateUser(null, (err, user) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (user) {
                      const drawerOptions = {
                          listItems: []
                      };

                      // Add options based on user conditions
                      if (comment.userId === Thread.SocialItems.userDetails.userId) {
                          drawerOptions.listItems.push({
                              id: 'editComment',
                              text: Thread.SocialItems.languages.editComment || 'Edit Comment'
                          }, {
                              id: 'deleteComment',
                              text: Thread.SocialItems.languages.deleteComment
                          });
                      } else {
                          const blockedUsers = Thread.SocialItems.blockedUsers;
                          if (!blockedUsers.includes(comment.userId)) {
                              drawerOptions.listItems.push(
                                {
                                    id: 'blockUser',
                                    text: Thread.SocialItems.languages.blockUser
                                }
                              );
                          }

                          drawerOptions.listItems.push(
                            {
                                id: 'reportComment',
                                text: Thread.SocialItems.languages.reportComment
                            }
                          );
                      }

                      buildfire.components.drawer.open(drawerOptions, (err, result) => {
                          if (err) return console.error("Error opening drawer.", err);
                          if (result) {
                              switch (result.id) {
                                  case 'editComment':
                                      // Call the edit comment function
                                      Thread.editComment(comment);
                                      break;
                                  case 'deleteComment':
                                      // Call the existing deleteComment function
                                      Thread.deleteComment(comment);
                                      break;
                                  case 'reportComment':
                                      // Call the existing reportComment function
                                      Thread.reportComment(comment);
                                      break;
                                  case 'blockUser':
                                      // Call the existing block function
                                      Thread.blockUser(comment.userId, comment.userDetails);
                                      break;
                              }
                              buildfire.components.drawer.closeDrawer();
                          }
                      });
                  }
              });
          };

          /**
           * likeThread method is used to like a post.
           * @param post
           * @param type
           */
          Thread.scheduleNotification = function (post, text) {
              let options = {
                  title: 'Notification',
                  text: '',
                  sendToSelf: false
              };

              Util.setExpression({title: Thread.SocialItems.context.title});

              let titleKey, messageKey, inAppMessageKey;
              if (text === 'likedComment') {
                  options.users = [post.userId];
                  titleKey = Thread.SocialItems.languages.commentLikeNotificationTitle;
                  messageKey = Thread.SocialItems.languages.commentLikeNotificationMessageBody;
                  inAppMessageKey = Thread.SocialItems.languages.commentLikeInAppMessageBody;
              } else if (text === 'likedPost') {
                  options.users = [Thread.post.userId];
                  titleKey = Thread.SocialItems.languages.postLikeNotificationTitle;
                  messageKey = Thread.SocialItems.languages.postLikeNotificationMessageBody;
                  inAppMessageKey = Thread.SocialItems.languages.postLikeInAppMessageBody;
              } else if (text === 'comment') {
                  options.users = [Thread.post.userId];
                  titleKey = Thread.SocialItems.languages.commentNotificationMessageTitle;
                  messageKey = Thread.SocialItems.languages.commentNotificationMessageBody;
                  inAppMessageKey = Thread.SocialItems.languages.commentInAppMessageBody;
              }

              if (Thread.SocialItems.wid) {
                  options.queryString = `&dld=${encodeURIComponent(JSON.stringify({wid: Thread.SocialItems.wid}))}`
              } else {
                  options.queryString = `&dld=${encodeURIComponent(JSON.stringify({postId: Thread.post.id}))}`
              }

              Promise.all([Util.evaluateExpression(titleKey), Util.evaluateExpression(messageKey), Util.evaluateExpression(inAppMessageKey)])
                .then(([title, message, inAppMessage]) => {
                    options.title = title;
                    options.text = message;
                    options.inAppMessage = inAppMessage;

                    buildfire.notifications.pushNotification.schedule(options, function (err) {
                        if (err) return console.error('Error while setting PN schedule.', err);
                        console.log("SENT NOTIFICATION", options);
                    });
                })
          }
          Thread.likeThread = function (post) {
              Thread.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      let liked = post.likes.find(element => element === Thread.SocialItems.userDetails.userId);
                      let index = post.likes.indexOf(Thread.SocialItems.userDetails.userId);
                      if (liked !== undefined) {
                          post.likes.splice(index, 1)
                          Buildfire.messaging.sendMessageToControl({
                              'name': EVENTS.POST_UNLIKED,
                              'id': post.id,
                              'userId': Thread.SocialItems.userDetails.userId
                          });
                      } else {
                          post.likes.push(Thread.SocialItems.userDetails.userId);
                          Buildfire.messaging.sendMessageToControl({
                              'name': EVENTS.POST_LIKED,
                              'id': post.id,
                              'userId': Thread.SocialItems.userDetails.userId
                          });
                      }

                      SocialDataStore.updatePost(post).then(() => {
                          if (!liked)
                              Thread.scheduleNotification(post, 'likedPost');
                      }, (err) => console.log(err));
                  }
              });
          }

          Thread.likeComment = function (comment) {
              Thread.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      let liked = comment.likes.find(element => element === Thread.SocialItems.userDetails.userId);
                      let index = comment.likes.indexOf(Thread.SocialItems.userDetails.userId)
                      if (liked !== undefined) {
                          comment.likes.splice(index, 1)
                      } else {
                          comment.likes.push(Thread.SocialItems.userDetails.userId);
                          Buildfire.messaging.sendMessageToControl({
                              'name': EVENTS.COMMENT_LIKED,
                              'userId': comment.userId,
                              'comment': comment,
                              'postId': Thread.post.id
                          });
                      }
                      let commentIndex = Thread.post.comments.indexOf(comment);
                      Thread.post.comments[commentIndex] = comment;
                      SocialDataStore.updatePost(Thread.post).then(() => {
                          if (!liked)
                              Thread.scheduleNotification(comment, 'likedComment');
                      }, (err) => console.log(err));
                  }
              });
          }

          /**
           * follow method is used to follow the thread/post.
           */
          Thread.followUnfollow = function () {
              let params = {
                  userId: Thread.SocialItems.userDetails.userId,
                  wallId: Thread.SocialItems.wid,
                  instanceId: Thread.SocialItems.context.instanceId,
                  post: Thread.post.id,
                  _buildfire: {
                      index: {
                          text: Thread.SocialItems.userDetails.userId + '-' + Thread.SocialItems.wid
                      }
                  }
              };
              if (Thread.followingStatus) {
                  SubscribedUsersData.unFollowThread(params, function (err) {
                      if (err) return console.log(err);
                  });
              } else {
                  SubscribedUsersData.followThread(params, function (err) {
                      if (err) return console.log(err);
                  });
              }
              Thread.followingStatus = !Thread.followingStatus;
              setTimeout(function () {
                  buildfire.spinner.hide();
              }, 50);
          };
          /**
           * getDuration method to used to show the time from current.
           * @param timestamp
           * @returns {*}
           */
          Thread.getDuration = function (timestamp) {
              if (timestamp)
                  return moment(timestamp.toString()).fromNow();
          };

          Thread.deleteComment = function (comment) {
              SocialDataStore.deleteComment(Thread.post.id, comment).then(
                function (data) {
                    Buildfire.messaging.sendMessageToControl({
                        name: EVENTS.COMMENT_DELETED,
                        comment: comment,
                        post: Thread.post
                    });
                    let commentToDelete = Thread.post.comments.find(element => element.comment === comment.comment)
                    let index = Thread.post.comments.indexOf(commentToDelete);
                    Thread.post.comments.splice(index, 1);
                    if (!$scope.$$phase)
                        $scope.$digest();
                    console.log('Comment deleted=============================success----------data', data);
                },
                function (err) {
                    console.log('Comment deleted=============================Error----------err', err);
                }
              );
          };

          Thread.reportComment = function (comment) {
              Buildfire.services.reportAbuse.report(
                {
                    "itemId": comment.commentId,
                    "reportedUserId": Thread.post.userId,
                    "deeplink": {
                        "fromReportAbuse": true,
                        "postId": Thread.post.id,
                        "wallId": Thread.SocialItems.wid,
                        "commentId": comment.commentId
                    },
                    "itemType": "comment"
                },
                (err, result) => {
                    if (err && err != 'Report is cancelled') {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportCommentFail || "This comment is already reported.",
                            type: 'info'
                        });
                    }
                    if (result) {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportCommentSuccess || "Report submitted and pending admin review.",
                            type: 'info'
                        });
                    }
                }
              );
          }

          Thread.sharePost = function (post) {
              if (!post || !post.id) return;

              buildfire.spinner.show();

              const deepLinkData = {
                  postId: post.id
              };

              if (Thread.SocialItems.wid) {
                  deepLinkData.wid = Thread.SocialItems.wid;
              }

              if (Thread.SocialItems.pluginTitle) {
                  deepLinkData.wTitle = Thread.SocialItems.pluginTitle;
              }

              const shareTitle = Thread.SocialItems.context.title || 'Community Post';
              const shareDescription = post.text ? decodeURIComponent(post.text).substring(0, 200) : 'Check out this post!';
              const shareImage = post.imageUrl && post.imageUrl[0];

              buildfire.deeplink.generateUrl({
                  title: shareTitle,
                  description: shareDescription,
                  data: deepLinkData,
                  imageUrl: shareImage
              }, (err, result) => {
                  buildfire.spinner.hide();

                  if (err) {
                      console.error('Error creating deep link:', err);
                      Buildfire.dialog.toast({
                          message: Thread.SocialItems.languages.sharePostFail || "Unable to share post. Please try again.",
                          type: 'danger'
                      });
                      return;
                  }

                  if (result && result.url) {
                      Thread.executeShare(result.url, shareTitle, shareDescription, shareImage, post);
                  }
              });
          }

          Thread.executeShare = function(url, title, description, image, post) {
              buildfire.getContext((err, context) => {
                  if (err) {
                      console.error('Error getting context:', err);
                      Thread.fallbackShare(url, post);
                      return;
                  }

                  const isDesktop = context.device.platform === 'web';

                  if (isDesktop) {
                      buildfire.dialog.confirm({
                          title: 'Share Post',
                          message: description,
                          confirmButton: { text: 'Copy Link' },
                          cancelButton: { text: 'Cancel' }
                      }, (err, isConfirmed) => {
                          if (err) return console.error(err);
                          if (isConfirmed) {
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                  navigator.clipboard.writeText(url).then(() => {
                                      Buildfire.dialog.toast({
                                          message: Thread.SocialItems.languages.sharePostSuccess || "Link copied to clipboard!",
                                          type: 'success'
                                      });

                                      if (typeof Analytics !== 'undefined') {
                                          Analytics.trackAction("post-shared");
                                      }
                                  }).catch((clipboardErr) => {
                                      console.error('Clipboard write failed:', clipboardErr);
                                      Thread.fallbackCopyToClipboard(url);
                                  });
                              } else {
                                  Thread.fallbackCopyToClipboard(url);
                              }
                          }
                      });
                  } else {
                      buildfire.device.share({
                          subject: title,
                          text: description,
                          image: image,
                          link: url
                      }, (err, result) => {
                          if (err) {
                              console.error('Native share failed:', err);
                              Thread.fallbackShare(url, post);
                              return;
                          }

                          Buildfire.dialog.toast({
                              message: Thread.SocialItems.languages.sharePostSuccess || "Post shared successfully!",
                              type: 'success'
                          });

                          if (typeof Analytics !== 'undefined') {
                              Analytics.trackAction("post-shared");
                          }
                      });
                  }
              });
          }

          Thread.fallbackCopyToClipboard = function(link) {
              const tempInput = document.createElement('input');
              tempInput.value = link;
              document.body.appendChild(tempInput);
              tempInput.select();
              tempInput.setSelectionRange(0, 99999);

              try {
                  document.execCommand('copy');
                  Buildfire.dialog.toast({
                      message: Thread.SocialItems.languages.sharePostSuccess || "Link copied to clipboard!",
                      type: 'success'
                  });

                  if (typeof Analytics !== 'undefined') {
                      Analytics.trackAction("post-shared");
                  }
              } catch (err) {
                  console.error('Fallback copy failed:', err);
                  Buildfire.dialog.toast({
                      message: Thread.SocialItems.languages.sharePostFail || "Unable to copy link. Please try again.",
                      type: 'danger'
                  });
              } finally {
                  document.body.removeChild(tempInput);
              }
          }

          Thread.fallbackShare = function(link, post) {
              if (navigator.share) {
                  const shareData = {
                      title: Thread.SocialItems.context.title || 'Community Post',
                      text: post.text ? post.text.substring(0, 100) + (post.text.length > 100 ? '...' : '') : 'Check out this post!',
                      url: link
                  };

                  navigator.share(shareData).then(() => {
                      Buildfire.dialog.toast({
                          message: Thread.SocialItems.languages.sharePostSuccess || "Post shared successfully!",
                          type: 'success'
                      });

                      if (typeof Analytics !== 'undefined') {
                          Analytics.trackAction("post-shared");
                      }
                  }).catch((shareErr) => {
                      if (shareErr.name !== 'AbortError') {
                          console.error('Share failed:', shareErr);
                      }
                  });
              } else {
                  const tempInput = document.createElement('input');
                  tempInput.value = link;
                  document.body.appendChild(tempInput);
                  tempInput.select();
                  tempInput.setSelectionRange(0, 99999);

                  try {
                      document.execCommand('copy');
                      Buildfire.dialog.toast({
                          message: Thread.SocialItems.languages.sharePostSuccess || "Link copied to clipboard!",
                          type: 'success'
                      });

                      if (typeof Analytics !== 'undefined') {
                          Analytics.trackAction("post-shared");
                      }
                  } catch (err) {
                      console.error('Fallback copy failed:', err);
                      Buildfire.dialog.toast({
                          message: Thread.SocialItems.languages.sharePostFail || "Unable to share post. Please try again.",
                          type: 'danger'
                      });
                  } finally {
                      document.body.removeChild(tempInput);
                  }
              }
          }

          Thread.reportPost = function () {
              Buildfire.services.reportAbuse.report(
                {
                    "itemId": Thread.post.id,
                    "reportedUserId": Thread.post.userId,
                    "deeplink": {
                        "fromReportAbuse": true,
                        "postId": Thread.post.id,
                        "wallId": Thread.SocialItems.wid
                    },
                    "itemType": "post"
                },
                (err, reportResult) => {
                    if (err && err !== 'Report is cancelled') {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportPostFail || "This post is already reported.",
                            type: 'info'
                        });
                    }
                    if (reportResult) {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportPostSuccess || "Report submitted and pending admin review.",
                            type: 'info'
                        });
                    }
                }
              );
          }

          Thread.addComment = function (parentCommentId = null) {
              let commentData = {
                  threadId: Thread.post.id,
                  comment: Thread.comment ? Thread.comment.replace(/[#&%+!@^*()-]/g, function (match) {
                      return encodeURIComponent(match)
                  }) : '',
                  commentId: Util.UUID(),
                  userToken: Thread.SocialItems.userDetails.userToken,
                  imageUrl: Thread.images || [],
                  videos: Thread.videos || [],
                  userId: Thread.SocialItems.userDetails.userId,
                  likes: [],
                  userDetails: Thread.SocialItems.userDetails,
                  createdOn: new Date(),
                  parentCommentId: parentCommentId,
                  replies: []
              };
              SocialDataStore.addComment(commentData).then(
                function (data) {
                    console.log('Add Comment Successsss------------------', data);
                    Thread.comment = '';
                    Thread.waitAPICompletion = false;
                    commentData.id = data.data.id;
                    $rootScope.$broadcast(EVENTS.COMMENT_ADDED);
                    Buildfire.messaging.sendMessageToControl({
                        'name': EVENTS.COMMENT_ADDED,
                        'id': Thread.post.id,
                        'comment': commentData
                    });
                    Thread.post.comments.push(commentData);
                    Thread.organizeThreadedComments();
                    Thread.scheduleNotification(commentData, 'comment');
                });
          }

          Thread.blockUser = function (userId, userDetails) {
              const defaultUserName = Thread.SocialItems.languages.someone;
              const userName = Thread.SocialItems.getUserName(userDetails) || defaultUserName;

              buildfire.dialog.confirm({
                  title: `${Thread.SocialItems.languages.blockUserTitleConfirmation} ${userName}`,
                  message: Thread.SocialItems.languages.blockUserBodyConfirmation,
                  cancelButton: { text: Thread.SocialItems.languages.blockUserCancelBtn },
                  confirmButton: { text: Thread.SocialItems.languages.blockUserConfirmBtn }
              }, (err, isConfirmed) => {
                  if (err) return console.error(err);
                  if (!isConfirmed) return;

                  buildfire.spinner.show();
                  buildfire.components.drawer.closeDrawer();
                  SubscribedUsersData.blockUser(userId, (blockErr, blockResult) => {
                      buildfire.spinner.hide();
                      if (blockErr) {
                          return console.error("Error blocking user.", blockErr);
                      }
                      if (blockResult) {
                          const successMessage = Thread.SocialItems.languages.blockUserSuccess
                              ? `${userName} ${Thread.SocialItems.languages.blockUserSuccess}`
                              : `${userName} has been blocked successfully.`;
                          Buildfire.dialog.toast({
                              message: successMessage,
                              type: 'info'
                          });
                          Location.goToHome();
                      }
                  });
              });
          }

          Thread.getPostContent = function (data) {
              if (data && data.results && data.results.length > 0 && !data.cancelled) {
                  $scope.Thread.comment = data.results["0"].textValue;
                  $scope.Thread.images = data.results["0"].images;
                  $scope.Thread.videos = data.results["0"].videos;

                  var gif = getGifUrl(data.results["0"].gifs);
                  if (gif && $scope.Thread.images && $scope.Thread.images.push) {
                      $scope.Thread.images.push(gif);
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

          Thread.showCustomPostDialog = false;
          Thread.customPostText = '';
          Thread.replyingToComment = null;
          Thread.selectedImages = [];
          Thread.selectedVideos = [];
          Thread.selectedImagesText = 'Add Images';
          Thread.selectedVideosText = 'Add Videos';
          Thread.editingComment = null;
          Thread.editingPost = null;

          Thread.openCommentSection = function (parentComment = null) {
              Thread.SocialItems.authenticateUser(null, (err, user) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (user) {
                      Thread.showCustomPostDialog = true;
                      Thread.customPostText = '';
                      Thread.replyingToComment = parentComment;
                      Thread.selectedImages = [];
                      Thread.selectedVideos = [];
                      Thread.selectedImagesText = 'Add Images';
                      Thread.selectedVideosText = 'Add Videos';
                      Thread.editingComment = null;
                      Thread.editingPost = null;
                      $scope.$apply();
                  }
              });
          }

          Thread.closeCustomPostDialog = function () {
              Thread.showCustomPostDialog = false;
              Thread.customPostText = '';
              Thread.replyingToComment = null;
              Thread.selectedImages = [];
              Thread.selectedVideos = [];
              Thread.selectedImagesText = 'Add Images';
              Thread.selectedVideosText = 'Add Videos';
              Thread.editingComment = null;
              Thread.editingPost = null;
              if (!$scope.$$phase) $scope.$apply();
          }


          Thread.handlePostKeyPress = function (event) {
              if (event.keyCode === 13) {
                  Thread.submitCustomPost();
              }
          }

          Thread.submitCustomPost = function () {
              if (!Thread.customPostText || Thread.customPostText.trim() === '') {
                  buildfire.dialog.toast({
                      message: Thread.SocialItems.languages.commentTextRequired || "Please enter a comment",
                      type: 'warning'
                  });
                  return;
              }

              if (Thread.editingComment) {
                  Thread.updateComment();
              } else if (Thread.editingPost) {
                  Thread.updatePost();
              } else {
                  Thread.comment = Thread.customPostText;
                  Thread.images = Thread.selectedImages || [];
                  Thread.videos = Thread.selectedVideos || [];
                  const parentCommentId = Thread.replyingToComment ? Thread.replyingToComment.commentId : null;
                  Thread.closeCustomPostDialog();
                  Thread.addComment(parentCommentId);
              }
          }

          Thread.decodeText = function (text) {
              return decodeURIComponent(text);
          };

          Thread.selectImages = function () {
              try {
                  var maxSizeMB = FILE_UPLOAD.DESKTOP_IMAGE_MAX_SIZE || 10;
                  var maxSizeBytes = maxSizeMB * 1024 * 1024;

                  if (!buildfire || !buildfire.getContext) {
                      Thread.tryImageLibFallback(maxSizeBytes);
                      return;
                  }

                  buildfire.getContext(function(err, context) {
                      var isMobile = context && context.device && context.device.platform !== 'web';

                      if (isMobile && buildfire.services && buildfire.services.publicFiles && buildfire.services.publicFiles.showDialog) {
                          try {
                              buildfire.services.publicFiles.showDialog(
                                  {
                                      allowMultipleFilesUpload: true,
                                      filter: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                                  },
                                  null,
                                  null,
                                  function(err, files) {
                                      if (err) {
                                          console.error('[ImageUpload] Error from publicFiles:', err);
                                          buildfire.dialog.toast({
                                              message: 'Unable to open image picker. Please try again.',
                                              type: 'warning'
                                          });
                                          Thread.tryImageLibFallback(maxSizeBytes);
                                          return;
                                      }
                                      if (!files || files.length === 0) return;
                                      Thread.selectedImages = files.map(function(f) { return f.url; });
                                      Thread.selectedImagesText = files.length === 1 ? '1 image' : files.length + ' images';
                                      if (!$scope.$$phase) $scope.$apply();
                                  }
                              );
                          } catch (e) {
                              console.error('[ImageUpload] Exception in publicFiles:', e);
                              Thread.tryImageLibFallback(maxSizeBytes);
                          }
                      } else {
                          Thread.tryImageLibFallback(maxSizeBytes);
                      }
                  });
              } catch (e) {
                  console.error('[ImageUpload] Exception:', e);
                  var maxSizeBytes = (FILE_UPLOAD.DESKTOP_IMAGE_MAX_SIZE || 10) * 1024 * 1024;
                  Thread.tryImageLibFallback(maxSizeBytes);
              }
          }

          Thread.tryImageLibFallback = function(maxSizeBytes) {
              if (buildfire.imageLib && buildfire.imageLib.showDialog) {
                  buildfire.imageLib.showDialog({
                      multiSelection: true,
                      showIcons: false
                  }, function(err, result) {
                      if (err) {
                          console.error('[ImageUpload] Error from imageLib:', err);
                          buildfire.dialog.toast({
                              message: 'Unable to open image picker. Please try again.',
                              type: 'warning'
                          });
                          return;
                          }
                      if (!result || !result.selectedFiles || result.cancelled) return;
                      Thread.selectedImages = result.selectedFiles;
                      Thread.selectedImagesText = result.selectedFiles.length === 1 ? '1 image' : result.selectedFiles.length + ' images';
                      if (!$scope.$$phase) $scope.$apply();
                  });
              } else {
                  var input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
                  input.multiple = true;
                  input.onchange = function(e) {
                      var files = e.target.files;
                      if (!files || files.length === 0) return;

                      var oversizedFiles = [];
                      var validFiles = [];
                      for (var i = 0; i < files.length; i++) {
                          if (files[i].size > maxSizeBytes) {
                              oversizedFiles.push(files[i].name);
                          } else {
                              validFiles.push(files[i]);
                          }
                      }

                      if (oversizedFiles.length > 0) {
                          buildfire.dialog.toast({
                              message: 'Images must be under ' + maxSizeMB + 'MB: ' + oversizedFiles.join(', '),
                              type: 'warning'
                          });
                          if (validFiles.length === 0) return;
                      }

                      var uploadPromises = validFiles.map(function(file) {
                          return new Promise(function(resolve, reject) {
                              var reader = new FileReader();
                              reader.onload = function(event) {
                                  var base64 = event.target.result;
                                  if (buildfire.imageLib && buildfire.imageLib.local && buildfire.imageLib.local.toPublicUrl) {
                                      buildfire.imageLib.local.toPublicUrl(base64, function(err, url) {
                                          if (err) reject(err);
                                          else resolve(url);
                                      });
                                  } else {
                                      resolve(base64);
                                  }
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                          });
                      });

                      Promise.all(uploadPromises).then(function(urls) {
                          Thread.selectedImages = urls;
                          Thread.selectedImagesText = urls.length === 1 ? '1 image' : urls.length + ' images';
                          if (!$scope.$$phase) $scope.$apply();
                      }).catch(function(err) {
                          console.error('[ImageUpload] Upload failed:', err);
                          buildfire.dialog.toast({
                              message: 'Failed to upload images. Please try again.',
                              type: 'danger'
                          });
                      });
                  };
                  input.click();
              }
          }

          Thread.selectVideos = function () {
              try {
                  var maxSizeMB = FILE_UPLOAD.DESKTOP_VIDEO_MAX_SIZE || 100;
                  var maxSizeBytes = maxSizeMB * 1024 * 1024;

                  if (!buildfire || !buildfire.getContext) {
                      Thread.tryVideoLibFallback(maxSizeBytes);
                      return;
                  }

                  buildfire.getContext(function(err, context) {
                      var isMobile = context && context.device && context.device.platform !== 'web';

                      if (isMobile && buildfire.services && buildfire.services.publicFiles && buildfire.services.publicFiles.showDialog) {
                          try {
                              buildfire.services.publicFiles.showDialog(
                                  {
                                      allowMultipleFilesUpload: true,
                                      filter: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/webm', 'video/mov']
                                  },
                                  null,
                                  null,
                                  function(err, files) {
                                      if (err) {
                                          console.error('[VideoUpload] Error from publicFiles:', err);
                                          buildfire.dialog.toast({
                                              message: 'Unable to open video picker. Please try again.',
                                              type: 'warning'
                                          });
                                          Thread.tryVideoLibFallback(maxSizeBytes);
                                          return;
                                      }
                                      if (!files || files.length === 0) return;
                                      Thread.selectedVideos = files.map(function(f) { return f.url; });
                                      Thread.selectedVideosText = files.length === 1 ? '1 video' : files.length + ' videos';
                                      if (!$scope.$$phase) $scope.$apply();
                                  }
                              );
                          } catch (e) {
                              console.error('[VideoUpload] Exception in publicFiles:', e);
                              Thread.tryVideoLibFallback(maxSizeBytes);
                          }
                      } else {
                          Thread.tryVideoLibFallback(maxSizeBytes);
                      }
                  });
              } catch (e) {
                  console.error('[VideoUpload] Exception:', e);
                  var maxSizeBytes = (FILE_UPLOAD.DESKTOP_VIDEO_MAX_SIZE || 100) * 1024 * 1024;
                  Thread.tryVideoLibFallback(maxSizeBytes);
              }
          }

          Thread.tryVideoLibFallback = function(maxSizeBytes) {
              if (buildfire.imageLib && buildfire.imageLib.showDialog) {
                  buildfire.imageLib.showDialog({
                      multiSelection: true,
                      showIcons: false,
                      showFiles: true
                  }, function(err, result) {
                      if (err) {
                          console.error('[VideoUpload] Error from imageLib:', err);
                          buildfire.dialog.toast({
                              message: 'Unable to open video picker. Please try again.',
                              type: 'warning'
                          });
                          return;
                      }
                      if (!result || !result.selectedFiles || result.cancelled) return;
                      Thread.selectedVideos = result.selectedFiles;
                      Thread.selectedVideosText = result.selectedFiles.length === 1 ? '1 video' : result.selectedFiles.length + ' videos';
                      if (!$scope.$$phase) $scope.$apply();
                  });
              } else {
                  var input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/mp4,video/quicktime,video/x-msvideo,video/avi,video/webm,video/mov';
                  input.multiple = true;
                  input.onchange = function(e) {
                      var files = e.target.files;
                      if (!files || files.length === 0) return;

                      var oversizedFiles = [];
                      var validFiles = [];
                      for (var i = 0; i < files.length; i++) {
                          if (files[i].size > maxSizeBytes) {
                              oversizedFiles.push(files[i].name);
                          } else {
                              validFiles.push(files[i]);
                          }
                      }

                      if (oversizedFiles.length > 0) {
                          buildfire.dialog.toast({
                              message: 'Videos must be under ' + maxSizeMB + 'MB: ' + oversizedFiles.join(', '),
                              type: 'warning'
                          });
                          if (validFiles.length === 0) return;
                      }

                      Thread.uploadingVideos = true;
                      if (!$scope.$$phase) $scope.$apply();

                      var uploadPromises = validFiles.map(function(file) {
                          return new Promise(function(resolve, reject) {
                              if (buildfire.services && buildfire.services.publicFiles && buildfire.services.publicFiles.uploadFile) {
                                  buildfire.services.publicFiles.uploadFile(
                                      file,
                                      { allowMultipleFilesUpload: false },
                                      function(err, result) {
                                          if (err) reject(err);
                                          else resolve(result.url);
                                      }
                                  );
                              } else {
                                  var reader = new FileReader();
                                  reader.onload = function(event) {
                                      resolve(event.target.result);
                                  };
                                  reader.onerror = reject;
                                  reader.readAsDataURL(file);
                              }
                          });
                      });

                      Promise.all(uploadPromises).then(function(urls) {
                          Thread.selectedVideos = urls;
                          Thread.selectedVideosText = urls.length === 1 ? '1 video' : urls.length + ' videos';
                          Thread.uploadingVideos = false;
                          if (!$scope.$$phase) $scope.$apply();
                      }).catch(function(err) {
                          console.error('[VideoUpload] Upload failed:', err);
                          Thread.uploadingVideos = false;
                          buildfire.dialog.toast({
                              message: 'Failed to upload videos. Please try again.',
                              type: 'danger'
                          });
                          if (!$scope.$$phase) $scope.$apply();
                      });
                  };
                  input.click();
              }
          }

          Thread.editPost = function (post) {
              Thread.editingPost = post;
              Thread.customPostText = post.text || '';
              Thread.selectedImages = post.imageUrl || [];
              Thread.selectedVideos = post.videos || [];
              Thread.selectedImagesText = Thread.selectedImages.length > 0 ? (Thread.selectedImages.length === 1 ? '1 image' : Thread.selectedImages.length + ' images') : 'Add Images';
              Thread.selectedVideosText = Thread.selectedVideos.length > 0 ? (Thread.selectedVideos.length === 1 ? '1 video' : Thread.selectedVideos.length + ' videos') : 'Add Videos';
              Thread.showCustomPostDialog = true;
              Thread.replyingToComment = null;
              if (!$scope.$$phase) $scope.$apply();
          }

          Thread.editComment = function (comment) {
              Thread.editingComment = comment;
              Thread.customPostText = comment.comment ? decodeURIComponent(comment.comment) : '';
              Thread.selectedImages = comment.imageUrl || [];
              Thread.selectedVideos = comment.videos || [];
              Thread.selectedImagesText = Thread.selectedImages.length > 0 ? (Thread.selectedImages.length === 1 ? '1 image' : Thread.selectedImages.length + ' images') : 'Add Images';
              Thread.selectedVideosText = Thread.selectedVideos.length > 0 ? (Thread.selectedVideos.length === 1 ? '1 video' : Thread.selectedVideos.length + ' videos') : 'Add Videos';
              Thread.showCustomPostDialog = true;
              Thread.replyingToComment = null;
              if (!$scope.$$phase) $scope.$apply();
          }

          Thread.updatePost = function () {
              Thread.post.text = Thread.customPostText;
              Thread.post.imageUrl = Thread.selectedImages || [];
              Thread.post.videos = Thread.selectedVideos || [];
              Thread.post.lastUpdatedOn = new Date();

              SocialDataStore.updatePost(Thread.post).then(() => {
                  Buildfire.dialog.toast({
                      message: Thread.SocialItems.languages.postUpdateSuccess || "Post updated successfully",
                      type: 'success'
                  });
                  Thread.closeCustomPostDialog();
                  if (!$scope.$$phase) $scope.$apply();
              }).catch((err) => {
                  console.error('Error updating post:', err);
                  Buildfire.dialog.toast({
                      message: Thread.SocialItems.languages.postUpdateFail || "Failed to update post",
                      type: 'danger'
                  });
              });
          }

          Thread.updateComment = function () {
              const comment = Thread.editingComment;
              comment.comment = Thread.customPostText.replace(/[#&%+!@^*()-]/g, function (match) {
                  return encodeURIComponent(match);
              });
              comment.imageUrl = Thread.selectedImages || [];
              comment.videos = Thread.selectedVideos || [];
              comment.lastUpdatedOn = new Date();

              SocialDataStore.updateComment(Thread.post.id, comment).then(() => {
                  Buildfire.dialog.toast({
                      message: Thread.SocialItems.languages.commentUpdateSuccess || "Comment updated successfully",
                      type: 'success'
                  });
                  Thread.organizeThreadedComments();
                  Thread.closeCustomPostDialog();
                  if (!$scope.$$phase) $scope.$apply();
              }).catch((err) => {
                  console.error('Error updating comment:', err);
                  Buildfire.dialog.toast({
                      message: Thread.SocialItems.languages.commentUpdateFail || "Failed to update comment",
                      type: 'danger'
                  });
              });
          }

          Buildfire.history.onPop(function (breadcrumb) {
              Thread.goFullScreen = false;
              if (!$scope.$$phase) $scope.$digest();
          }, true);

          Thread.deletePost = function (postId) {
              buildfire.spinner.show();
              var success = function (response) {
                  if (response) {
                      Buildfire.messaging.sendMessageToControl({
                          'name': EVENTS.POST_DELETED,
                          'id': postId
                      });
                      let postToDelete = Thread.SocialItems.items.find(element => element.id === postId)
                      let index = Thread.SocialItems.items.indexOf(postToDelete);
                      Thread.SocialItems.items.splice(index, 1);

                      if (!$scope.$$phase)
                          $scope.$digest();
                      Buildfire.components.drawer.closeDrawer();
                      Buildfire.spinner.hide();
                      Buildfire.dialog.toast({
                          message: Thread.SocialItems.languages.postDeleteSuccess || "Post successfully deleted",
                          type: 'info'
                      });

                      Location.goToHome();
                  }
              };
              // Called when getting error from SocialDataStore.deletePost method
              var error = function (err) {
                  console.log('Error while deleting post ', err);
              };
              console.log('Post id appid usertoken-- in delete ---------------', postId);
              // Deleting post having id as postId
              SocialDataStore.deletePost(postId).then(success, error);
          };

          Buildfire.messaging.onReceivedMessage = function (event) {
              console.log('Widget syn called method in controller Thread called-----', event);
              if (event) {
                  switch (event.name) {
                      case EVENTS.POST_DELETED:
                          Thread.deletePost(event.id);
                          let postToDelete = Thread.SocialItems.items.find(element => element.id === postId)
                          let index = Thread.SocialItems.items.indexOf(postToDelete);
                          Thread.SocialItems.items.splice(index, 1);
                          if (event.id == Thread.modalPopupThreadId) {
                              Buildfire.history.pop();
                              Buildfire.dialog.toast({
                                  message: "Post already deleted",
                                  type: 'info'
                              });
                          }
                          if (!$scope.$$phase)
                              $scope.$digest();
                          break;
                      case EVENTS.COMMENT_DELETED:
                          console.log('Comment Deleted in thread controlled event called-----------', event);
                          if (event.postId == Thread.post.id) {
                              let commentToDelete = Thread.post.comments.find(element => element.comment === event.comment.comment)
                              let index = Thread.post.comments.indexOf(commentToDelete);
                              Thread.post.comments.splice(index, 1);
                              $rootScope.$broadcast(EVENTS.COMMENT_DELETED);

                              if (!$scope.$$phase)
                                  $scope.$digest();
                          }
                          if (Thread.modalPopupThreadId == event._id)
                              Buildfire.dialog.toast({
                                  message: "Comment already deleted",
                                  type: 'info'
                              });
                          break;
                      case "ASK_FOR_WALLID":
                          window.buildfire.messaging.sendMessageToControl({
                              name: 'SEND_WALLID',
                              wid: Thread.SocialItems.wid,
                          });
                      default:
                          break;
                  }
              }
          };
          // On Login
          Buildfire.datastore.onUpdate(function (response) {
              if (response.tag === "languages")
                  Thread.SocialItems.formatLanguages(response);
              else if (response.tag === "Social") {
                  Thread.SocialItems.appSettings.allowSideThreadTags = response.data.appSettings.allowSideThreadTags;
                  Thread.SocialItems.appSettings.sideThreadUserTags = response.data.appSettings.sideThreadUserTags;
                  Thread.SocialItems.appSettings.allowChat = response.data.appSettings.allowChat;
                  Thread.showHideCommentBox();
                  $scope.$digest();
              }
              //Thread.init();
          });

          Buildfire.auth.onLogin(function (user) {
              Thread.SocialItems.authenticateUser(user, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      Thread.showHideCommentBox();
                      $scope.$digest();
                  }
                  Location.goToHome();
              });
          });
          // On Logout
          Buildfire.auth.onLogout(function () {
              console.log('User loggedOut from Widget Thread page');
              Thread.SocialItems.userDetails.userToken = null;
              Thread.SocialItems.userDetails.userId = null;
              $scope.$digest();
          });


          /**
           * Implementation of pull down to refresh
           */
          var onRefresh = Buildfire.datastore.onRefresh(function () {
              Location.go('#/thread/' + $routeParams.threadId);
          });
          /**
           * Unbind the onRefresh
           */
          $scope.$on('$destroy', function () {
              $rootScope.$broadcast('ROUTE_CHANGED', {
                  _id: Thread.post.id,
              });
              onRefresh.clear();
              Buildfire.datastore.onRefresh(function () {
                  if (Thread.fabSpeedDial) {
                        Thread.fabSpeedDial.destroy();
                  }
                  Location.goToHome();
              });
          });

      }])
})(window.angular);
