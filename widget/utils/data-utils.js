'use strict';

var DataUtils = (function() {
    var MAX_RETRIES = 3;
    var BASE_DELAY_MS = 1000;
    var MAX_DELAY_MS = 10000;
    var CACHE_TTL_MS = 5 * 60 * 1000;
    var MAX_PARALLEL_REQUESTS = 10;
    var MAX_ARRAY_SIZE = 1000;
    var DEFAULT_PAGE_SIZE = 50;

    var cache = {};
    var cacheTimestamps = {};

    function retryWithBackoff(operation, maxRetries, attempt) {
        maxRetries = maxRetries || MAX_RETRIES;
        attempt = attempt || 0;

        return new Promise(function(resolve, reject) {
            operation()
                .then(resolve)
                .catch(function(error) {
                    if (attempt >= maxRetries - 1) {
                        reject(error);
                        return;
                    }

                    var delay = Math.min(
                        BASE_DELAY_MS * Math.pow(2, attempt),
                        MAX_DELAY_MS
                    );
                    delay = delay + Math.random() * delay * 0.1;

                    setTimeout(function() {
                        retryWithBackoff(operation, maxRetries, attempt + 1)
                            .then(resolve)
                            .catch(reject);
                    }, delay);
                });
        });
    }

    function promisifyBuildfire(method, args, tag) {
        return new Promise(function(resolve, reject) {
            var callback = function(error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            };

            if (tag) {
                method.apply(null, args.concat([tag, callback]));
            } else {
                method.apply(null, args.concat([callback]));
            }
        });
    }

    function publicDataSearch(options, tag) {
        return promisifyBuildfire(
            buildfire.publicData.search,
            [options],
            tag
        );
    }

    function publicDataGetById(id, tag) {
        return promisifyBuildfire(
            buildfire.publicData.getById,
            [id],
            tag
        );
    }

    function publicDataInsert(data, tag) {
        return promisifyBuildfire(
            buildfire.publicData.insert,
            [data],
            tag
        );
    }

    function publicDataUpdate(id, data, tag) {
        return promisifyBuildfire(
            buildfire.publicData.update,
            [id, data],
            tag
        );
    }

    function publicDataDelete(id, tag) {
        return promisifyBuildfire(
            buildfire.publicData.delete,
            [id],
            tag
        );
    }

    function searchWithRetry(options, tag) {
        return retryWithBackoff(function() {
            return publicDataSearch(options, tag);
        });
    }

    function getByIdWithRetry(id, tag) {
        return retryWithBackoff(function() {
            return publicDataGetById(id, tag);
        });
    }

    function insertWithRetry(data, tag) {
        return retryWithBackoff(function() {
            return publicDataInsert(data, tag);
        });
    }

    function updateWithRetry(id, data, tag) {
        return retryWithBackoff(function() {
            return publicDataUpdate(id, data, tag);
        });
    }

    function deleteWithRetry(id, tag) {
        return retryWithBackoff(function() {
            return publicDataDelete(id, tag);
        });
    }

    function batchExecute(operations, maxParallel) {
        maxParallel = maxParallel || MAX_PARALLEL_REQUESTS;
        var results = [];
        var index = 0;

        function executeNext() {
            if (index >= operations.length) {
                return Promise.resolve();
            }

            var batch = operations.slice(index, index + maxParallel);
            index += maxParallel;

            return Promise.all(batch.map(function(op) {
                return op().catch(function(err) {
                    return { error: err };
                });
            })).then(function(batchResults) {
                results = results.concat(batchResults);
                return executeNext();
            });
        }

        return executeNext().then(function() {
            return results;
        });
    }

    function fetchAllPages(searchOptions, tag, maxRecords) {
        maxRecords = maxRecords || 10000;
        var pageSize = searchOptions.pageSize || DEFAULT_PAGE_SIZE;
        var allResults = [];

        function fetchPage(page) {
            var options = Object.assign({}, searchOptions, {
                page: page,
                pageSize: pageSize,
                recordCount: true
            });

            return searchWithRetry(options, tag).then(function(response) {
                var results = response.result || response;
                if (Array.isArray(results)) {
                    allResults = allResults.concat(results);
                }

                var totalRecords = response.totalRecord || results.length;
                var hasMore = allResults.length < totalRecords && allResults.length < maxRecords;

                if (hasMore && results.length === pageSize) {
                    return fetchPage(page + 1);
                }

                return {
                    result: allResults.slice(0, maxRecords),
                    totalRecord: totalRecords
                };
            });
        }

        return fetchPage(0);
    }

    function fetchPagesInParallel(searchOptions, tag, maxRecords) {
        maxRecords = maxRecords || 10000;
        var pageSize = searchOptions.pageSize || DEFAULT_PAGE_SIZE;

        var initialOptions = Object.assign({}, searchOptions, {
            page: 0,
            pageSize: pageSize,
            recordCount: true
        });

        return searchWithRetry(initialOptions, tag).then(function(firstResponse) {
            var firstResults = firstResponse.result || firstResponse;
            var totalRecords = Math.min(firstResponse.totalRecord || firstResults.length, maxRecords);

            if (totalRecords <= pageSize) {
                return {
                    result: firstResults,
                    totalRecord: totalRecords
                };
            }

            var totalPages = Math.ceil(totalRecords / pageSize);
            var pageOperations = [];

            for (var i = 1; i < totalPages; i++) {
                (function(pageNum) {
                    pageOperations.push(function() {
                        var options = Object.assign({}, searchOptions, {
                            page: pageNum,
                            pageSize: pageSize
                        });
                        return searchWithRetry(options, tag);
                    });
                })(i);
            }

            return batchExecute(pageOperations).then(function(pageResults) {
                var allResults = firstResults.slice();

                pageResults.forEach(function(pageResponse) {
                    if (!pageResponse.error) {
                        var results = pageResponse.result || pageResponse;
                        if (Array.isArray(results)) {
                            allResults = allResults.concat(results);
                        }
                    }
                });

                return {
                    result: allResults.slice(0, maxRecords),
                    totalRecord: totalRecords
                };
            });
        });
    }

    function getCacheKey(key) {
        return typeof key === 'object' ? JSON.stringify(key) : String(key);
    }

    function getFromCache(key) {
        var cacheKey = getCacheKey(key);
        var timestamp = cacheTimestamps[cacheKey];

        if (timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
            return cache[cacheKey];
        }

        delete cache[cacheKey];
        delete cacheTimestamps[cacheKey];
        return null;
    }

    function setInCache(key, value, ttl) {
        var cacheKey = getCacheKey(key);
        cache[cacheKey] = value;
        cacheTimestamps[cacheKey] = Date.now();

        if (ttl) {
            setTimeout(function() {
                invalidateCache(key);
            }, ttl);
        }
    }

    function invalidateCache(key) {
        if (key) {
            var cacheKey = getCacheKey(key);
            delete cache[cacheKey];
            delete cacheTimestamps[cacheKey];
        } else {
            cache = {};
            cacheTimestamps = {};
        }
    }

    function invalidateCacheByPrefix(prefix) {
        Object.keys(cache).forEach(function(key) {
            if (key.indexOf(prefix) === 0) {
                delete cache[key];
                delete cacheTimestamps[key];
            }
        });
    }

    function limitArray(array, maxSize) {
        maxSize = maxSize || MAX_ARRAY_SIZE;
        if (!Array.isArray(array)) return array;
        if (array.length <= maxSize) return array;
        return array.slice(-maxSize);
    }

    function addToLimitedArray(array, item, maxSize) {
        maxSize = maxSize || MAX_ARRAY_SIZE;
        if (!Array.isArray(array)) array = [];

        array.push(item);

        if (array.length > maxSize) {
            return array.slice(-maxSize);
        }
        return array;
    }

    function chunkArray(array, chunkSize) {
        chunkSize = chunkSize || DEFAULT_PAGE_SIZE;
        var chunks = [];

        for (var i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }

        return chunks;
    }

    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    function throttle(func, limit) {
        var inThrottle;
        var lastResult;
        return function() {
            var context = this;
            var args = arguments;
            if (!inThrottle) {
                lastResult = func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
            return lastResult;
        };
    }

    function createChangeDetector() {
        var lastHash = null;

        return {
            hasChanged: function(data) {
                var newHash = simpleHash(JSON.stringify(data));
                if (newHash !== lastHash) {
                    lastHash = newHash;
                    return true;
                }
                return false;
            },
            reset: function() {
                lastHash = null;
            }
        };
    }

    function simpleHash(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    function createSmartPoller(fetchFn, options) {
        options = options || {};
        var baseInterval = options.baseInterval || 10000;
        var maxInterval = options.maxInterval || 60000;
        var backoffMultiplier = options.backoffMultiplier || 1.5;

        var currentInterval = baseInterval;
        var timeoutId = null;
        var isRunning = false;
        var changeDetector = createChangeDetector();

        function poll() {
            if (!isRunning) return;

            fetchFn().then(function(data) {
                if (changeDetector.hasChanged(data)) {
                    currentInterval = baseInterval;
                    if (options.onChange) {
                        options.onChange(data);
                    }
                } else {
                    currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
                }
            }).catch(function(error) {
                currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
                if (options.onError) {
                    options.onError(error);
                }
            }).finally(function() {
                if (isRunning) {
                    timeoutId = setTimeout(poll, currentInterval);
                }
            });
        }

        return {
            start: function() {
                if (isRunning) return;
                isRunning = true;
                poll();
            },
            stop: function() {
                isRunning = false;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            },
            reset: function() {
                currentInterval = baseInterval;
                changeDetector.reset();
            }
        };
    }

    return {
        retryWithBackoff: retryWithBackoff,

        publicData: {
            search: publicDataSearch,
            getById: publicDataGetById,
            insert: publicDataInsert,
            update: publicDataUpdate,
            delete: publicDataDelete,
            searchWithRetry: searchWithRetry,
            getByIdWithRetry: getByIdWithRetry,
            insertWithRetry: insertWithRetry,
            updateWithRetry: updateWithRetry,
            deleteWithRetry: deleteWithRetry
        },

        batch: {
            execute: batchExecute,
            fetchAllPages: fetchAllPages,
            fetchPagesInParallel: fetchPagesInParallel,
            chunkArray: chunkArray
        },

        cache: {
            get: getFromCache,
            set: setInCache,
            invalidate: invalidateCache,
            invalidateByPrefix: invalidateCacheByPrefix,
            TTL: CACHE_TTL_MS
        },

        array: {
            limit: limitArray,
            addToLimited: addToLimitedArray,
            chunk: chunkArray,
            MAX_SIZE: MAX_ARRAY_SIZE
        },

        timing: {
            debounce: debounce,
            throttle: throttle
        },

        poller: {
            create: createSmartPoller
        },

        change: {
            createDetector: createChangeDetector
        },

        config: {
            MAX_RETRIES: MAX_RETRIES,
            BASE_DELAY_MS: BASE_DELAY_MS,
            MAX_DELAY_MS: MAX_DELAY_MS,
            CACHE_TTL_MS: CACHE_TTL_MS,
            MAX_PARALLEL_REQUESTS: MAX_PARALLEL_REQUESTS,
            MAX_ARRAY_SIZE: MAX_ARRAY_SIZE,
            DEFAULT_PAGE_SIZE: DEFAULT_PAGE_SIZE
        }
    };
})();

if (typeof window !== 'undefined') {
    window.DataUtils = DataUtils;
}
