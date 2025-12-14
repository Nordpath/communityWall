'use strict';

var MediaUtils = (function() {
    var nsfwModel = null;
    var modelLoading = false;
    var modelLoadPromise = null;

    function generateVideoThumbnail(videoUrl, seekTime) {
        seekTime = seekTime || 1.5;

        return new Promise(function(resolve) {
            try {
                var video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.muted = true;
                video.playsInline = true;
                video.preload = 'metadata';

                var timeoutId = setTimeout(function() {
                    cleanup();
                    resolve(null);
                }, 15000);

                function cleanup() {
                    clearTimeout(timeoutId);
                    video.removeEventListener('loadedmetadata', onMetadataLoaded);
                    video.removeEventListener('seeked', onSeeked);
                    video.removeEventListener('error', onError);
                    video.src = '';
                    video.load();
                }

                function onError() {
                    console.warn('[MediaUtils] Video thumbnail generation failed for:', videoUrl);
                    cleanup();
                    resolve(null);
                }

                function onMetadataLoaded() {
                    var targetTime = Math.min(seekTime, video.duration * 0.1);
                    if (video.duration < 0.5) {
                        targetTime = 0;
                    }
                    video.currentTime = targetTime;
                }

                function onSeeked() {
                    try {
                        var canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth || 640;
                        canvas.height = video.videoHeight || 360;

                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        var thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                        cleanup();
                        resolve(thumbnailUrl);
                    } catch (e) {
                        console.warn('[MediaUtils] Canvas capture failed:', e);
                        cleanup();
                        resolve(null);
                    }
                }

                video.addEventListener('loadedmetadata', onMetadataLoaded);
                video.addEventListener('seeked', onSeeked);
                video.addEventListener('error', onError);

                video.src = videoUrl;
                video.load();
            } catch (e) {
                console.warn('[MediaUtils] Thumbnail generation error:', e);
                resolve(null);
            }
        });
    }

    function generateThumbnailsForVideos(videoUrls) {
        if (!videoUrls || !videoUrls.length) {
            return Promise.resolve([]);
        }

        var promises = videoUrls.map(function(url) {
            return generateVideoThumbnail(url);
        });

        return Promise.all(promises);
    }

    function loadNSFWModel() {
        if (nsfwModel) {
            return Promise.resolve(nsfwModel);
        }

        if (modelLoadPromise) {
            return modelLoadPromise;
        }

        if (modelLoading) {
            return new Promise(function(resolve) {
                var checkInterval = setInterval(function() {
                    if (nsfwModel) {
                        clearInterval(checkInterval);
                        resolve(nsfwModel);
                    }
                }, 100);
                setTimeout(function() {
                    clearInterval(checkInterval);
                    resolve(null);
                }, 10000);
            });
        }

        modelLoading = true;

        modelLoadPromise = new Promise(function(resolve) {
            if (typeof nsfwjs === 'undefined') {
                console.warn('[MediaUtils] NSFWJS library not loaded, skipping moderation');
                modelLoading = false;
                resolve(null);
                return;
            }

            nsfwjs.load().then(function(model) {
                nsfwModel = model;
                modelLoading = false;
                console.log('[MediaUtils] NSFW model loaded successfully');
                resolve(model);
            }).catch(function(err) {
                console.warn('[MediaUtils] Failed to load NSFW model:', err);
                modelLoading = false;
                resolve(null);
            });
        });

        return modelLoadPromise;
    }

    function checkImageNSFW(imageUrl) {
        return new Promise(function(resolve) {
            loadNSFWModel().then(function(model) {
                if (!model) {
                    resolve({ safe: true, skipped: true });
                    return;
                }

                var img = new Image();
                img.crossOrigin = 'anonymous';

                var timeoutId = setTimeout(function() {
                    console.warn('[MediaUtils] Image load timeout for NSFW check');
                    resolve({ safe: true, skipped: true });
                }, 10000);

                img.onload = function() {
                    clearTimeout(timeoutId);
                    model.classify(img).then(function(predictions) {
                        var dominated = false;
                        var dominatedClass = null;
                        var dominatedProb = 0;

                        predictions.forEach(function(p) {
                            if ((p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.6) {
                                dominated = true;
                                if (p.probability > dominatedProb) {
                                    dominatedClass = p.className;
                                    dominatedProb = p.probability;
                                }
                            }
                        });

                        resolve({
                            safe: !dominated,
                            flagged: dominated,
                            reason: dominated ? dominatedClass : null,
                            confidence: dominatedProb,
                            predictions: predictions
                        });
                    }).catch(function(err) {
                        console.warn('[MediaUtils] NSFW classification error:', err);
                        resolve({ safe: true, skipped: true });
                    });
                };

                img.onerror = function() {
                    clearTimeout(timeoutId);
                    console.warn('[MediaUtils] Failed to load image for NSFW check');
                    resolve({ safe: true, skipped: true });
                };

                img.src = imageUrl;
            });
        });
    }

    function checkImagesNSFW(imageUrls) {
        if (!imageUrls || !imageUrls.length) {
            return Promise.resolve({ safe: true, results: [] });
        }

        var promises = imageUrls.map(function(url) {
            return checkImageNSFW(url);
        });

        return Promise.all(promises).then(function(results) {
            var flaggedIndex = -1;
            var flaggedResult = null;

            for (var i = 0; i < results.length; i++) {
                if (results[i].flagged) {
                    flaggedIndex = i;
                    flaggedResult = results[i];
                    break;
                }
            }

            return {
                safe: flaggedIndex === -1,
                flaggedIndex: flaggedIndex,
                flaggedResult: flaggedResult,
                results: results
            };
        });
    }

    function preloadModel() {
        loadNSFWModel();
    }

    return {
        generateVideoThumbnail: generateVideoThumbnail,
        generateThumbnailsForVideos: generateThumbnailsForVideos,
        checkImageNSFW: checkImageNSFW,
        checkImagesNSFW: checkImagesNSFW,
        preloadModel: preloadModel
    };
})();

if (typeof window !== 'undefined') {
    window.MediaUtils = MediaUtils;
}
