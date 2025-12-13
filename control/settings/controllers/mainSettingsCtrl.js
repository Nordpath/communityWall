/**
 * Created by ahmadfhamed on 2/5/2017.
 */
app.controller('MainSettingsCtrl', ['$scope', function ($scope) {
    var _pluginData = {
        data: {}
    };

    //init tags = [] to avoid on-tag-added bug https://github.com/mbenford/ngTagsInput/issues/622
    $scope.data = {
        mainThreadUserTags: [],
        sideThreadUserTags: []
    };
    var mainThreadUserTagsContainer = null;
    var sideThreadUserTagsContainer = null;

    var load = function () {
        var editor = new buildfire.components.actionItems.sortableList("#actions");
        buildfire.datastore.get('Social', function (err, result) {
            if (err) {
                console.error('App settings -- ', err);
            } else {
                if (result && result.data) {
                    _pluginData = result;
                    if (result.data.appSettings) {
                        if (!result.data.appSettings.mainThreadUserTags) {
                            result.data.appSettings.mainThreadUserTags = [];
                        }
                        if (!result.data.appSettings.sideThreadUserTags) {
                            result.data.appSettings.sideThreadUserTags = [];
                        }
                        if (result.data.appSettings.actionItem) {
                            let items = [];
                            items.push(result.data.appSettings.actionItem);
                            editor.loadItems(items);
                        }
                        if (typeof (result.data.appSettings.showMembers) == 'undefined') {
                            result.data.appSettings.showMembers = true;
                        }
                        if (typeof (result.data.appSettings.allowCommunityFeedFollow) == 'undefined') {
                            result.data.appSettings.allowCommunityFeedFollow = false;
                        }
                        if (typeof (result.data.appSettings.seeProfile) == 'undefined') {
                            result.data.appSettings.seeProfile = false;
                        }
                        if (typeof (result.data.appSettings.allowAutoSubscribe) == 'undefined') {
                            result.data.appSettings.allowAutoSubscribe = true;
                        }
                        if (typeof (result.data.appSettings.allowChat) == 'undefined') {
                            if (result.data.appSettings.disablePrivateChat && result.data.appSettings.disablePrivateChat == true) {
                                result.data.appSettings.allowChat = "noUsers";
                            } else
                                result.data.appSettings.allowChat = "allUsers";
                        }
                        if (!result.data.appSettings.chatFeature) {
                            result.data.appSettings.chatFeature = {
                                value: "default",
                                actionItem: null
                            };
                        }
                        if (typeof (result.data.appSettings.enableModeration) == 'undefined') {
                            result.data.appSettings.enableModeration = false;
                        }
                        if (typeof (result.data.appSettings.notifyAdminsOnPost) == 'undefined') {
                            result.data.appSettings.notifyAdminsOnPost = false;
                        }
                        if (!result.data.appSettings.bottomLogo) {
                            result.data.appSettings.bottomLogo = {
                                displayMode: 'logo',
                                imageUrl: '',
                                linkUrl: '',
                                enabled: false,
                                bannerHeight: 90,
                                logoMaxWidth: 200,
                                logoMaxHeight: 80,
                                bannerBgColor: ''
                            };
                        }
                        if (typeof result.data.appSettings.bottomLogo.bannerHeight === 'undefined') {
                            result.data.appSettings.bottomLogo.bannerHeight = 90;
                        }
                        if (typeof result.data.appSettings.bottomLogo.logoMaxWidth === 'undefined') {
                            result.data.appSettings.bottomLogo.logoMaxWidth = 200;
                        }
                        if (typeof result.data.appSettings.bottomLogo.logoMaxHeight === 'undefined') {
                            result.data.appSettings.bottomLogo.logoMaxHeight = 80;
                        }
                        if (typeof result.data.appSettings.bottomLogo.bannerBgColor === 'undefined') {
                            result.data.appSettings.bottomLogo.bannerBgColor = '';
                        }
                        if (!result.data.appSettings.themeColors) {
                            result.data.appSettings.themeColors = {
                                fabButton: '#FF6B35',
                                likeIcon: '#E63946',
                                commentIcon: '#457B9D',
                                shareIcon: '#06A77D',
                                menuIcon: '#9B59B6'
                            };
                        }
                        if (!result.data.appSettings.usernameFont) {
                            result.data.appSettings.usernameFont = {
                                family: 'inherit',
                                weight: '400',
                                size: '13px',
                                familyType: 'preset',
                                customFontName: '',
                                customFontUrl: ''
                            };
                        }
                        // Initialize new fields for existing configs
                        if (!result.data.appSettings.usernameFont.familyType) {
                            result.data.appSettings.usernameFont.familyType = 'preset';
                        }
                        if (!result.data.appSettings.usernameFont.customFontName) {
                            result.data.appSettings.usernameFont.customFontName = '';
                        }
                        if (!result.data.appSettings.usernameFont.customFontUrl) {
                            result.data.appSettings.usernameFont.customFontUrl = '';
                        }
                    } else if (!result.data.appSettings) {
                        result.data.appSettings = {};
                        result.data.appSettings.showMembers = true;
                        result.data.appSettings.allowAutoSubscribe = true;
                        result.data.appSettings.allowChat = "allUsers";
                        result.data.appSettings.chatFeature = {
                            value: "default",
                            actionItem: null
                        };
                        result.data.appSettings.enableModeration = false;
                        result.data.appSettings.notifyAdminsOnPost = false;
                        result.data.appSettings.bottomLogo = {
                            displayMode: 'logo',
                            imageUrl: '',
                            linkUrl: '',
                            enabled: false,
                            bannerHeight: 90,
                            logoMaxWidth: 200,
                            logoMaxHeight: 80,
                            bannerBgColor: ''
                        };
                        result.data.appSettings.themeColors = {
                            fabButton: '#FF6B35',
                            likeIcon: '#E63946',
                            commentIcon: '#457B9D',
                            shareIcon: '#06A77D',
                            menuIcon: '#9B59B6'
                        };
                        result.data.appSettings.usernameFont = {
                            family: 'inherit',
                            weight: '400',
                            size: '13px',
                            familyType: 'preset',
                            customFontName: '',
                            customFontUrl: ''
                        };
                    }
                    $scope.data = result.data.appSettings;

                    $scope.handleChatFeatureActionItem();
                    $scope.fillUsers();
                    $scope.$digest();


                    document.getElementById('noUsers').addEventListener('change', () => {
                        $scope.save();
                    })

                    document.getElementById('AllUsers').addEventListener('change', () => {
                        $scope.save();
                    })

                    document.getElementById('selectedUsers').addEventListener('change', () => {
                        $scope.save();
                    })

                    document.getElementById('ChatFeaturePluginsDefault').addEventListener('change', () => {
                        $scope.save();
                    })
                    document.getElementById('chatFeatureActionItem').addEventListener('change', () => {
                        $scope.save();
                    })
                }
                initUserTags();
            }
        });


        editor.onDeleteItem = function (event) {
            delete $scope.data.actionItem;
            $scope.save();
        }

        editor.onItemChange = function (event) {
            $scope.data.actionItem = editor.items[0];
            $scope.save();
        }

        editor.onAddItems = function (items) {
            if (!$scope.data.actionItem) {
                $scope.data.actionItem = editor.items[0];
                $scope.save();
            } else {
                let items = [];
                items.push($scope.data.actionItem);
                editor.loadItems(items)
                buildfire.notifications.alert({
                    title: "Adding Denied",
                    message: "You can only have one action item",
                    okButton: {
                        text: 'Ok'
                    }
                }, function (e, data) {
                    if (e) console.error(e);
                    if (data) console.log(data);
                });
            }

        }
    }

    var initUserTags = function () {
        mainThreadUserTagsContainer = new buildfire.components.control.userTagsInput("#allowMainThreadTags", {});

        mainThreadUserTagsContainer.onUpdate = (tags) => {
            $scope.data.mainThreadUserTags = tags.tags.map(tag => ({ text: tag.tagName }));
            $scope.save();
        };

        if ($scope.data.mainThreadUserTags && $scope.data.mainThreadUserTags.length) {
            const tags = $scope.data.mainThreadUserTags.map(tag => ({
                value: tag.text,
                tagName: tag.text,
            }));
            mainThreadUserTagsContainer.append(tags);
        }

        sideThreadUserTagsContainer = new buildfire.components.control.userTagsInput("#allowSideThreadUserTags", {});

        sideThreadUserTagsContainer.onUpdate = (tags) => {
            $scope.data.sideThreadUserTags = tags.tags.map(tag => ({ text: tag.tagName }));
            $scope.save();
        };

        if ($scope.data.sideThreadUserTags && $scope.data.sideThreadUserTags.length) {
            const tags = $scope.data.sideThreadUserTags.map(tag => ({
                value: tag.text,
                tagName: tag.text,
            }));
            sideThreadUserTagsContainer.append(tags);
        }

    }

    $scope.handleChatFeatureActionItem = function () {
        var chatFeatureActionsItems = new buildfire.components.actionItems.sortableList("#chatFeatureActions");
        if ($scope.data.chatFeature.actionItem) {
            chatFeatureActionsItems.loadItems([$scope.data.chatFeature.actionItem]);
        }
        chatFeatureActionsItems.onDeleteItem = function (event) {
            delete $scope.data.chatFeature.actionItem;
            $scope.save();
        }

        chatFeatureActionsItems.onItemChange = function (event) {
            $scope.data.chatFeature.actionItem = chatFeatureActionsItems.items[0];
            $scope.save();
        }

        chatFeatureActionsItems.onAddItems = function (items) {
            if (!$scope.data.chatFeature.actionItem) {
                $scope.data.chatFeature.actionItem = chatFeatureActionsItems.items[0];
                $scope.save();
            } else {
                let items = [];
                items.push($scope.data.chatFeature.actionItem);
                chatFeatureActionsItems.loadItems(items)
                buildfire.notifications.alert({
                    title: "Adding Denied",
                    message: "You can only have one action item",
                    okButton: {
                    text: 'Ok'
                    }
                }, function (e, data) {
                    if (e) console.error(e);
                    if (data) console.log(data);
                });
            }
        }
    }

    $scope.warn = function () {
        let el = document.getElementById("seeProfile");
        if (el.checked) {
            buildfire.dialog.confirm({
                    message: "Are you sure you want to enable this option?",
                    confirmButton: {
                        text: "Confirm",
                        type: "success"
                    }
                },
                (err, isConfirmed) => {
                    if (err) el.checked = false;

                    if (isConfirmed) {
                        el.checked = true;
                        $scope.save()
                    } else {
                        el.checked = false;
                    }
                }
            );
        } else {
            el.checked = false;
            $scope.save();
        }
    }

    $scope.save = function () {
        buildfire.spinner.show();

        const clonedData = structuredClone($scope.data);

        // handle action item not selected
        if (
            clonedData.chatFeature &&
            clonedData.chatFeature.value === 'actionItem' &&
            !clonedData.chatFeature.actionItem
        ) {
            clonedData.chatFeature.value = 'default';
        }

        _pluginData.data.appSettings = clonedData;

        buildfire.datastore.save(_pluginData.data, 'Social', function (err, data) {
            if (err) {
                console.error('App settings -- ', err);
            } else {
                console.log('Data saved using datastore-------------', data);
            }
            buildfire.spinner.hide();
            $scope.$digest();
        });
    };

    $scope.init = function () {
        load()
    }

    $scope.fillUsers = function () {
        $scope.searchTableHelper = new SearchTableHelper(
            "searchResults",
            searchTableConfig,
            "loading",
            "headTable",
            "emptyTableContainer",
        );
        $scope.searchTableHelper.search();
    }

    $scope.selectUsers = function () {
        buildfire.auth.showUsersSearchDialog(null, (err, result) => {
            if (err) return console.log(err);

            if (result) {
                verifyUsers(result);
            }
        });
    }

    var verifyUsers = function (result) {
        let nonSubscribedUsersLength = 0;
        result.userIds.forEach((userId, index) => {
            $scope.getById(userId, (err, res) => {
                if (res) {
                    res.data.userDetails.hasAllowChat = true;
                    $scope.update(res.id, res.data, (err, res2) => {
                        if (index === result.userIds.length - 1) {
                            if (nonSubscribedUsersLength > 0) {
                                buildfire.dialog.toast({
                                    message: "Only subscribed users can be added.",
                                    type: 'danger'
                                });
                            }
                            $scope.searchTableHelper.search();
                            }
                    });
                } else {
                    nonSubscribedUsersLength++;
                    if (index === result.userIds.length - 1) {
                        if (nonSubscribedUsersLength > 0) {
                            buildfire.dialog.toast({
                                message: "Only subscribed users can be added.",
                                type: 'danger'
                            });
                        }
                        $scope.searchTableHelper.search();
                    }
                }
            })
        });
    }

    $scope.update = function (id, obj, callback) {
        window.buildfire.publicData.update(id, obj, 'subscribedUsersData', function (err, data) {
            if (err) callback ? callback(err) : console.error(err);
            else
                callback && callback(null, data);
        });
    }

    $scope.getById = function (userId, callback) {

        window.buildfire.publicData.search({
            filter: {
                $and: [{
                    "_buildfire.index.array1.string1": `${userId}-`
                }, {
                    "_buildfire.index.string1": ""
                }]
            }
        }, 'subscribedUsersData', function (err, data) {
            if (err) callback ? callback(err) : console.error(err);
            else if (data && data.length > 0) {
                callback && callback(null, data[0]);
            } else {
                callback && callback(null, null);
            }
        })
    }

    $scope.selectBottomLogoImage = function () {
        buildfire.imageLib.showDialog({}, function (err, result) {
            if (err) {
                console.error('Error selecting image:', err);
                buildfire.dialog.toast({
                    message: "Error selecting image",
                    type: 'danger'
                });
                return;
            }

            if (result && result.selectedFiles && result.selectedFiles.length > 0) {
                $scope.data.bottomLogo.imageUrl = result.selectedFiles[0];
                $scope.save();
                $scope.$digest();
            }
        });
    };

    $scope.removeBottomLogo = function () {
        buildfire.dialog.confirm({
            message: "Are you sure you want to remove the bottom logo?",
            confirmButton: {
                text: "Remove",
                type: "danger"
            }
        }, function (err, isConfirmed) {
            if (err) {
                console.error('Error confirming removal:', err);
                return;
            }

            if (isConfirmed) {
                $scope.data.bottomLogo = {
                    displayMode: 'logo',
                    imageUrl: '',
                    linkUrl: '',
                    enabled: false,
                    bannerHeight: 90,
                    logoMaxWidth: 200,
                    logoMaxHeight: 80,
                    bannerBgColor: ''
                };
                $scope.save();
                buildfire.dialog.toast({
                    message: "Bottom logo removed successfully",
                    type: 'success'
                });
                $scope.$digest();
            }
        });
    };

    $scope.handleFontTypeChange = function () {
        if ($scope.data.usernameFont.familyType === 'preset') {
            // Reset to default preset font
            if (!$scope.data.usernameFont.family || $scope.data.usernameFont.family.startsWith('custom-')) {
                $scope.data.usernameFont.family = 'inherit';
            }
            $scope.data.usernameFont.customFontUrl = '';
        } else if ($scope.data.usernameFont.familyType === 'custom') {
            // Switch to custom mode
            if (!$scope.data.usernameFont.customFontName) {
                $scope.data.usernameFont.customFontName = '';
            }
        }
        $scope.save();
    };

    $scope.handleCustomFontChange = function () {
        if ($scope.data.usernameFont.customFontName && $scope.data.usernameFont.customFontName.trim()) {
            const fontName = $scope.data.usernameFont.customFontName.trim();
            const encodedFontName = fontName.replace(/ /g, '+');

            // Generate Google Fonts URL with multiple weights
            $scope.data.usernameFont.customFontUrl =
                `https://fonts.googleapis.com/css2?family=${encodedFontName}:wght@300;400;500;600;700;800;900&display=swap`;

            // Set the font family for CSS
            $scope.data.usernameFont.family = `'${fontName}', sans-serif`;

            buildfire.dialog.toast({
                message: `Custom font "${fontName}" will be loaded`,
                type: 'success'
            });
        } else {
            $scope.data.usernameFont.customFontUrl = '';
            $scope.data.usernameFont.family = 'inherit';
        }
        $scope.save();
    };

    $scope.validateBannerHeight = function () {
        var value = parseInt($scope.data.bottomLogo.bannerHeight, 10);
        if (isNaN(value) || value < 50) {
            $scope.data.bottomLogo.bannerHeight = 50;
        } else if (value > 300) {
            $scope.data.bottomLogo.bannerHeight = 300;
        } else {
            $scope.data.bottomLogo.bannerHeight = value;
        }
        $scope.save();
    };

    $scope.validateLogoMaxWidth = function () {
        var value = parseInt($scope.data.bottomLogo.logoMaxWidth, 10);
        if (isNaN(value) || value < 100) {
            $scope.data.bottomLogo.logoMaxWidth = 100;
        } else if (value > 400) {
            $scope.data.bottomLogo.logoMaxWidth = 400;
        } else {
            $scope.data.bottomLogo.logoMaxWidth = value;
        }
        $scope.save();
    };

    $scope.validateLogoMaxHeight = function () {
        var value = parseInt($scope.data.bottomLogo.logoMaxHeight, 10);
        if (isNaN(value) || value < 50) {
            $scope.data.bottomLogo.logoMaxHeight = 50;
        } else if (value > 200) {
            $scope.data.bottomLogo.logoMaxHeight = 200;
        } else {
            $scope.data.bottomLogo.logoMaxHeight = value;
        }
        $scope.save();
    };

    $scope.clearBgColor = function () {
        $scope.data.bottomLogo.bannerBgColor = '';
        $scope.save();
    };

    $scope.getPreviewStyle = function () {
        if (!$scope.data.bottomLogo) return {};
        var style = {};
        if ($scope.data.bottomLogo.displayMode === 'banner') {
            style.height = ($scope.data.bottomLogo.bannerHeight || 90) + 'px';
            style.width = '100%';
            if ($scope.data.bottomLogo.bannerBgColor) {
                style.background = $scope.data.bottomLogo.bannerBgColor;
            }
        } else {
            style.maxWidth = ($scope.data.bottomLogo.logoMaxWidth || 200) + 'px';
            style.maxHeight = ($scope.data.bottomLogo.logoMaxHeight || 80) + 'px';
            if ($scope.data.bottomLogo.bannerBgColor) {
                style.background = $scope.data.bottomLogo.bannerBgColor;
            }
        }
        return style;
    };

    $scope.getPreviewContainerStyle = function () {
        if (!$scope.data.bottomLogo) return {};
        var style = {};
        if ($scope.data.bottomLogo.bannerBgColor) {
            style.background = $scope.data.bottomLogo.bannerBgColor;
        }
        if ($scope.data.bottomLogo.displayMode === 'banner') {
            style.height = ($scope.data.bottomLogo.bannerHeight || 90) + 'px';
        }
        return style;
    };
}]);
