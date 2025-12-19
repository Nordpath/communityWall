const stringsConfig = {
	mainWall: {
		title: "Main Wall labels",
		subtitle: "Change values to update main wall labels and messages",
		labels: {
			leaveGroup: {
				title: "Leave Group"
				, placeholder: "Leave Group"
				, maxLength: 30
				, defaultValue: "Leave Group"
			},
			joinGroup: {
				title: "Join Group"
				, placeholder: "Join Group"
				, maxLength: 30
				, defaultValue: "Join Group"
			},
			specificChat: {
				title: "Restricted Chat"
				, placeholder: 'Direct message is only set for specific users!'
				, maxLength: 100
				, defaultValue: 'Direct message is only set for specific users!'
			},
			messageDeleted: {
				title: "Message Deleted"
				, placeholder: 'This message has been deleted.'
				, maxLength: 50
				, defaultValue: 'This message has been deleted.'
			}
		}
	},
	sideThread: {
		title: "Side Wall labels",
		subtitle: "Change values to update side wall labels and messages",
		labels: {
			followPost: {
				title: "Follow Post"
				, placeholder: "Follow Post"
				, maxLength: 30
				, defaultValue: "Follow Post"
			},
			unfollowPost: {
				title: "Unfollow Post"
				, placeholder: "Unfollow Post"
				, maxLength: 30
				, defaultValue: "Unfollow Post"
			},
			deleteComment: {
				title: "Delete Comment"
				, placeholder: "Delete Comment"
				, maxLength: 30
				, defaultValue: "Delete Comment"
			},
			reportComment: {
				title: "Report Comment"
				, placeholder: "Report Comment"
				, maxLength: 30
				, defaultValue: "Report Comment"
			},
			postDeleteSuccess: {
				title: "Delete Post Success"
				, placeholder: "Post successfully deleted"
				, maxLength: 50
				, defaultValue: "Post successfully deleted"
			},
			blockedUser: {
				title: "Blocked User"
				, placeholder: "Blocked User"
				, maxLength: 30
				, defaultValue: "Blocked User"
			}
		}
	},
	members: {
		title: "Members labels",
		subtitle: "Change values to update members labels and messages",
		labels: {
			members: {
				title: "Members"
				, placeholder: "Members"
				, maxLength: 30
				, defaultValue: "Members"
			},
			membersBlankState: {
				title: "Members Blank State Message"
				, placeholder: "There are no other members except you."
				, maxLength: 60
				, defaultValue: "There are no other members except you."
			},
			membersNoResults: {
				title: "Members No Results Found"
				, placeholder: "No results found."
				, maxLength: 60
				, defaultValue: "No results found."
			}
		}
	},
	input: {
		title: "Input Dialog labels",
		subtitle: "Change values to update input dialog labels and messages",
		labels: {
			cancelPost: {
				title: "Cancel Post"
				, placeholder: "Cancel"
				, maxLength: 9
				, defaultValue: "Cancel"
			},
			confirmPost: {
				title: "Confirm Post"
				, placeholder: "Post"
				, maxLength: 9
				, defaultValue: "Post"
			},
			writePost: {
				title: "Input Placeholder"
				, placeholder: "Write a post"
				, maxLength: 30
				, defaultValue: "Write a post"
			}
		}
	},
	unblockUser: {
		title: "Unblock User",
		labels: {
			unblockUserTitleConfirmation: {
				title: "Title"
				, placeholder: "Unblock"
				, maxLength: 20
				, defaultValue: "Unblock"
				},
			unblockUserBodyConfirmation: {
				title: "Body"
				, placeholder: "Both of you will again be able to see each other's posts and send messages. The user won’t be notified that you unblocked them."
				, maxLength: 150
				, defaultValue: "Both of you will again be able to see each other's posts and send messages. The user won’t be notified that you unblocked them."
				},
			unblockUserConfirmBtn: {
				title: "Confirm Button"
				,placeholder: "Unblock"
				,maxLength: 20
				,defaultValue: "Unblock"
				},
			unblockUserCancelBtn: {
				title: "Cancel Button"
				, placeholder: "Cancel"
				, maxLength: 20
				, defaultValue: "Cancel"
				}
			}
        },
	blockUser: {
		title: "Block User",
		labels: {
			blockUserTitleConfirmation: {
				title: "Title"
				, placeholder: "Block"
				, maxLength: 20
				, defaultValue: "Block"
				},
			blockUserBodyConfirmation: {
				title: "Body"
				, placeholder: "Both of you won't be able to see each other's posts and send messages. The user won’t be notified that you blocked them."
				, maxLength: 150
				, defaultValue: "Both of you won't be able to see each other's posts and send messages. The user won’t be notified that you blocked them."
			},
			blockUserConfirmBtn: {
				title: "Confirm Button"
				, placeholder: "Block"
				, maxLength: 20
				, defaultValue: "Block"
                        },
			blockUserCancelBtn: {
				title: "Cancel Button"
				, placeholder: "Cancel"
				, maxLength: 20
				, defaultValue: "Cancel"
                        }
                }
        },
	modal: {
		title: "Modal labels",
		subtitle: "Change values to update modal labels and messages",
		labels: {
			moreOptions: {
				title: "More Options"
				, placeholder: "More Options"
				, maxLength: 30
				, defaultValue: "More Options"
			},
			sharePost: {
				title: "Share Post"
				, placeholder: "Share Post"
				, maxLength: 30
				, defaultValue: "Share Post"
			},
			reportPost: {
				title: "Report Post"
				, placeholder: "Report Post"
				, maxLength: 30
				, defaultValue: "Report Post"
			},
			blockUser: {
				title: "Block User"
				, placeholder: "Block User"
				, maxLength: 30
				, defaultValue: "Block User"
			},
			deletePost: {
				title: "Delete Post"
				, placeholder: "Delete Post"
				, maxLength: 30
				, defaultValue: "Delete Post"
			},
			reportPostSuccess: {
				title: "Report Post Success"
				, placeholder: "Report submitted and pending admin review."
				, maxLength: 50
				, defaultValue: "Report submitted and pending admin review."
			},
			reportPostFail: {
				title: "Report Post Failure"
				, placeholder: "This post is already reported."
				, maxLength: 100
				, defaultValue: "This post is already reported."
			},
			blockUserSuccess : {
				title: "Block User Success"
				, placeholder: "has been blocked"
				, maxLength: 50
				, defaultValue: "has been blocked"
			},

			unblockUserSuccess : {
				title: "Unblock User Success"
				, placeholder: "has been unblocked"
				, maxLength: 50
				, defaultValue: "has been unblocked"
			},
			reportComemntSuccess: {
				title: "Report Comment Success"
				, placeholder: "Report submitted and pending admin review."
				, maxLength: 50
				, defaultValue: "Report submitted and pending admin review."
			},
			reportCommentFail: {
				title: "Report Comment Failure"
				, placeholder: "This comment is already reported."
				, maxLength: 100
				, defaultValue: "This comment is already reported."
			},
			reportPostAlreadyReported: {
				title: "This Post Has Already Been Reported"
				, placeholder: "This post has already been reported."
				, maxLength: 50
				, defaultValue: "This post has already been reported."
			},
			reportPostUserBanned: {
				title: "Owner of This Post is Already Banned."
				, placeholder: "Owner of this post is already banned."
				, maxLength: 50
				, defaultValue: "Owner of this post is already banned."
			},
			sharePostSuccess: {
				title: "Share Post Success"
				, placeholder: "Link copied to clipboard!"
				, maxLength: 50
				, defaultValue: "Link copied to clipboard!"
			},
			sharePostFail: {
				title: "Share Post Failure"
				, placeholder: "Unable to share post. Please try again."
				, maxLength: 50
				, defaultValue: "Unable to share post. Please try again."
			},
			postPendingReview: {
				title: "Post Pending Review"
				, placeholder: "Your post has been submitted for review. It will appear in the feed once approved by an admin."
				, maxLength: 150
				, defaultValue: "Your post has been submitted for review. It will appear in the feed once approved by an admin."
			},
			postPublished: {
				title: "Post Published"
				, placeholder: "Your post has been published successfully!"
				, maxLength: 50
				, defaultValue: "Your post has been published successfully!"
			},
			postApproved: {
				title: "Post Approved"
				, placeholder: "Your post has been approved and is now visible in the feed."
				, maxLength: 100
				, defaultValue: "Your post has been approved and is now visible in the feed."
			},
			postRejected: {
				title: "Post Rejected"
				, placeholder: "Your post was rejected."
				, maxLength: 50
				, defaultValue: "Your post was rejected."
			}
		}
	},
	pushNotifications: {
		title: "Push Notifications",
		labels: {
			personalNotificationMessageTitle: {
				title: "Title"
				, subtitle: "Private Message Notification"
				, placeholder: "New Private Message"
				, maxLength: 25
				, defaultValue: "New Private Message"
			},
			personalNotificationMessageBody: {
				title: "Body"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} sent you a private message."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} sent you a private message."
			},
			personalInAppMessageBody: {
				title: "In App Message"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} sent you a private message."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} sent you a private message."
			},

			publicNotificationMessageTitle: {
				title: "Title"
				, subtitle: "New Post Notification"
				, placeholder: "New Post"
				, maxLength: 25
				, defaultValue: "New Post"
			},
			publicNotificationMessageBody: {
				title: "Body"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} added a new post on ${context.plugin.title}"
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} added a new post on ${context.plugin.title}"
			},
			publicInAppMessageBody: {
				title: "In App Message"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} added a new post on ${context.plugin.title}"
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} added a new post on ${context.plugin.title}"
			},

			commentNotificationMessageTitle: {
				title: "Title"
				, subtitle: "New Comment Notification"
				, placeholder: "New Comment"
				, maxLength: 25
				, defaultValue: "New Comment"
			},
			commentNotificationMessageBody: {
				title: "Body"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} commented on a post on ${context.plugin.title}"
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} commented on a post on ${context.plugin.title}"
			},
			commentInAppMessageBody: {
				title: "In App Message"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} commented on a post on ${context.plugin.title}"
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} commented on a post on ${context.plugin.title}"
			},

			postLikeNotificationTitle: {
				title: "Title"
				, subtitle: "Post Like Notification"
				, placeholder: "Post Like"
				, maxLength: 25
				, defaultValue: "Post Like"
			},
			postLikeNotificationMessageBody: {
				title: "Body"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} liked your post."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your post."
			},
			postLikeInAppMessageBody: {
				title: "In App Message"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} liked your post."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your post."
			},

			commentLikeNotificationTitle: {
				title: "Title"
				, subtitle: "Comment Like Notification"
				, placeholder: "Comment Like"
				, maxLength: 25
				, defaultValue: "Comment Like"
			},
			commentLikeNotificationMessageBody: {
				title: "Body"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} liked your comment."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your comment."
			},
			commentLikeInAppMessageBody: {
				title: "In App Message"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} liked your comment."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your comment."
			},

			commentReplyNotificationTitle: {
				title: "Title"
				, subtitle: "Comment Reply Notification"
				, placeholder: "New Reply"
				, maxLength: 25
				, defaultValue: "New Reply"
			},
			commentReplyNotificationMessageBody: {
				title: "Body"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} replied to your comment."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} replied to your comment."
			},
			commentReplyInAppMessageBody: {
				title: "In App Message"
				, placeholder: "${context.appUser?context.appUser.displayName:'Someone'} replied to your comment."
				, maxLength: 150
				, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} replied to your comment."
			},
		}
	},
	postingLimitations: {
		title: "Posting Limitations",
		subtitle: "Change values to update posting limitation messages",
		labels: {
			limitationsTitle: {
				title: "Limitations Dialog Title"
				, placeholder: "Posting Guidelines"
				, maxLength: 50
				, defaultValue: "Posting Guidelines"
			},
			limitationsMessage: {
				title: "Limitations Message"
				, placeholder: "Please note the following when creating posts:"
				, maxLength: 200
				, defaultValue: "Please note the following when creating posts:"
			},
			moderationEnabled: {
				title: "Moderation Enabled Notice"
				, placeholder: "Posts require admin approval before appearing in the feed."
				, maxLength: 150
				, defaultValue: "Posts require admin approval before appearing in the feed."
			},
			tagRestriction: {
				title: "Tag Restriction Notice"
				, placeholder: "Posting is restricted to users with specific permissions."
				, maxLength: 150
				, defaultValue: "Posting is restricted to users with specific permissions."
			},
			noRestrictions: {
				title: "No Restrictions Message"
				, placeholder: "Your posts will be published immediately."
				, maxLength: 150
				, defaultValue: "Your posts will be published immediately."
			},
			continueButton: {
				title: "Continue Button Text"
				, placeholder: "Continue"
				, maxLength: 20
				, defaultValue: "Continue"
			},
			cancelButton: {
				title: "Cancel Button Text"
				, placeholder: "Cancel"
				, maxLength: 20
				, defaultValue: "Cancel"
			},
			fileSizeLimit: {
				title: "File Size Limit Notice"
				, placeholder: "Images and videos must be under 1GB."
				, maxLength: 100
				, defaultValue: "Images and videos must be under 1GB."
			}
		}
	},
	general: {
		title: "General",
		labels: {
			someone: {
				title: "Someone"
				, placeholder: "Someone"
				, maxLength: 30
				, defaultValue: "Someone"
			},
			you: {
				title: "You"
				, placeholder: "(You)"
				, maxLength: 15
				, defaultValue: "(You)"
			},
			unblockBtn: {
				title: "Unblock Button"
				, placeholder: "Unblock"
				, maxLength: 30
				, defaultValue: "Unblock"
			},
			blockedUsers: {
				title: "Blocked Users"
				, placeholder: "Blocked Users"
				, maxLength: 30
				, defaultValue: "Blocked Users"
			},
			noBlockedUsers: {
				title: "Blocked Users Empty State"
				, placeholder: "No blocked users."
				, maxLength: 50
				, defaultValue: "No blocked users."
			}
		}
        },
	fileSizeLimits: {
		title: "File Size Limits",
		subtitle: "Change values to update file size error messages",
		labels: {
			imageTooLarge: {
				title: "Image Too Large Error"
				, placeholder: "Image is too large. Maximum size is 1GB."
				, maxLength: 100
				, defaultValue: "Image is too large. Maximum size is 1GB."
			},
			videoTooLarge: {
				title: "Video Too Large Error"
				, placeholder: "Video is too large. Maximum size is 1GB."
				, maxLength: 100
				, defaultValue: "Video is too large. Maximum size is 1GB."
			}
		}
	},
};
