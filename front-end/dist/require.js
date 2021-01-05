/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.3.6 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, https://github.com/requirejs/requirejs/blob/master/LICENSE
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global, setTimeout) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.3.6',
        commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    //Could match something like ')//comment', do not lose the prefix to comment.
    function commentReplace(match, singlePrefix) {
        return singlePrefix || '';
    }

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttps://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (isNormalized) {
                        normalizedName = name;
                    } else if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                each(globalDefQueue, function(queueItem) {
                    var id = queueItem[0];
                    if (typeof id === 'string') {
                        context.defQueueMap[id] = true;
                    }
                    defQueue.push(queueItem);
                });
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    // Only fetch if not already in the defQueue.
                    if (!hasProp(context.defQueueMap, id)) {
                        this.fetch();
                    }
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                var resLoadMaps = [];
                                each(this.depMaps, function (depMap) {
                                    resLoadMaps.push(depMap.normalizedMap || depMap);
                                });
                                req.onResourceLoad(context, this.map, resLoadMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap,
                                                      true);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.map.normalizedMap = normalizedMap;
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            if (this.undefed) {
                                return;
                            }
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        } else if (this.events.error) {
                            // No direct errback on this module, but something
                            // else is listening for errors, so be sure to
                            // propagate the error correctly.
                            on(depMap, 'error', bind(this, function(err) {
                                this.emit('error', err);
                            }));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' +
                        args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
            context.defQueueMap = {};
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            defQueueMap: {},
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                // Convert old style urlArgs string to a function.
                if (typeof cfg.urlArgs === 'string') {
                    var urlArgs = cfg.urlArgs;
                    cfg.urlArgs = function(id, url) {
                        return (url.indexOf('?') === -1 ? '?' : '&') + urlArgs;
                    };
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? {name: pkgObj} : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id, null, true);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        mod.undefed = true;
                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });
                        delete context.defQueueMap[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }
                context.defQueueMap = {};

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|^blob\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs && !/^blob\:/.test(url) ?
                       url + config.urlArgs(moduleName, url) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    var parents = [];
                    eachProp(registry, function(value, key) {
                        if (key.indexOf('_@r') !== 0) {
                            each(value.depMaps, function(depMap) {
                                if (depMap.id === data.id) {
                                    parents.push(key);
                                    return true;
                                }
                            });
                        }
                    });
                    return onError(makeError('scripterror', 'Script error for "' + data.id +
                                             (parents.length ?
                                             '", needed by: ' + parents.join(', ') :
                                             '"'), evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/requirejs/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/requirejs/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //Calling onNodeCreated after all properties on the node have been
            //set, but before it is placed in the DOM.
            if (config.onNodeCreated) {
                config.onNodeCreated(node, config, moduleName, url);
            }

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation is that a build has been done so
                //that only one script needs to be loaded anyway. This may need
                //to be reevaluated if other use cases become common.

                // Post a task to the event loop to work around a bug in WebKit
                // where the worker gets garbage-collected after calling
                // importScripts(): https://webkit.org/b/153317
                setTimeout(function() {}, 0);
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one,
                //but only do so if the data-main value is not a loader plugin
                //module ID.
                if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, commentReplace)
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        if (context) {
            context.defQueue.push([name, deps, callback]);
            context.defQueueMap[name] = true;
        } else {
            globalDefQueue.push([name, deps, callback]);
        }
    };

    define.amd = {
        jQuery: true
    };

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this, (typeof setTimeout === 'undefined' ? undefined : setTimeout)));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJyZXF1aXJlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiB2aW06IGV0OnRzPTQ6c3c9NDpzdHM9NFxuICogQGxpY2Vuc2UgUmVxdWlyZUpTIDIuMy42IENvcHlyaWdodCBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzLlxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2UsIGh0dHBzOi8vZ2l0aHViLmNvbS9yZXF1aXJlanMvcmVxdWlyZWpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqL1xuLy9Ob3QgdXNpbmcgc3RyaWN0OiB1bmV2ZW4gc3RyaWN0IHN1cHBvcnQgaW4gYnJvd3NlcnMsICMzOTIsIGFuZCBjYXVzZXNcbi8vcHJvYmxlbXMgd2l0aCByZXF1aXJlanMuZXhlYygpL3RyYW5zcGlsZXIgcGx1Z2lucyB0aGF0IG1heSBub3QgYmUgc3RyaWN0LlxuLypqc2xpbnQgcmVnZXhwOiB0cnVlLCBub21lbjogdHJ1ZSwgc2xvcHB5OiB0cnVlICovXG4vKmdsb2JhbCB3aW5kb3csIG5hdmlnYXRvciwgZG9jdW1lbnQsIGltcG9ydFNjcmlwdHMsIHNldFRpbWVvdXQsIG9wZXJhICovXG5cbnZhciByZXF1aXJlanMsIHJlcXVpcmUsIGRlZmluZTtcbihmdW5jdGlvbiAoZ2xvYmFsLCBzZXRUaW1lb3V0KSB7XG4gICAgdmFyIHJlcSwgcywgaGVhZCwgYmFzZUVsZW1lbnQsIGRhdGFNYWluLCBzcmMsXG4gICAgICAgIGludGVyYWN0aXZlU2NyaXB0LCBjdXJyZW50bHlBZGRpbmdTY3JpcHQsIG1haW5TY3JpcHQsIHN1YlBhdGgsXG4gICAgICAgIHZlcnNpb24gPSAnMi4zLjYnLFxuICAgICAgICBjb21tZW50UmVnRXhwID0gL1xcL1xcKltcXHNcXFNdKj9cXCpcXC98KFteOlwiJz1dfF4pXFwvXFwvLiokL21nLFxuICAgICAgICBjanNSZXF1aXJlUmVnRXhwID0gL1teLl1cXHMqcmVxdWlyZVxccypcXChcXHMqW1wiJ10oW14nXCJcXHNdKylbXCInXVxccypcXCkvZyxcbiAgICAgICAganNTdWZmaXhSZWdFeHAgPSAvXFwuanMkLyxcbiAgICAgICAgY3VyckRpclJlZ0V4cCA9IC9eXFwuXFwvLyxcbiAgICAgICAgb3AgPSBPYmplY3QucHJvdG90eXBlLFxuICAgICAgICBvc3RyaW5nID0gb3AudG9TdHJpbmcsXG4gICAgICAgIGhhc093biA9IG9wLmhhc093blByb3BlcnR5LFxuICAgICAgICBpc0Jyb3dzZXIgPSAhISh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZG9jdW1lbnQpLFxuICAgICAgICBpc1dlYldvcmtlciA9ICFpc0Jyb3dzZXIgJiYgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnLFxuICAgICAgICAvL1BTMyBpbmRpY2F0ZXMgbG9hZGVkIGFuZCBjb21wbGV0ZSwgYnV0IG5lZWQgdG8gd2FpdCBmb3IgY29tcGxldGVcbiAgICAgICAgLy9zcGVjaWZpY2FsbHkuIFNlcXVlbmNlIGlzICdsb2FkaW5nJywgJ2xvYWRlZCcsIGV4ZWN1dGlvbixcbiAgICAgICAgLy8gdGhlbiAnY29tcGxldGUnLiBUaGUgVUEgY2hlY2sgaXMgdW5mb3J0dW5hdGUsIGJ1dCBub3Qgc3VyZSBob3dcbiAgICAgICAgLy90byBmZWF0dXJlIHRlc3Qgdy9vIGNhdXNpbmcgcGVyZiBpc3N1ZXMuXG4gICAgICAgIHJlYWR5UmVnRXhwID0gaXNCcm93c2VyICYmIG5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gJ1BMQVlTVEFUSU9OIDMnID9cbiAgICAgICAgICAgICAgICAgICAgICAvXmNvbXBsZXRlJC8gOiAvXihjb21wbGV0ZXxsb2FkZWQpJC8sXG4gICAgICAgIGRlZkNvbnRleHROYW1lID0gJ18nLFxuICAgICAgICAvL09oIHRoZSB0cmFnZWR5LCBkZXRlY3Rpbmcgb3BlcmEuIFNlZSB0aGUgdXNhZ2Ugb2YgaXNPcGVyYSBmb3IgcmVhc29uLlxuICAgICAgICBpc09wZXJhID0gdHlwZW9mIG9wZXJhICE9PSAndW5kZWZpbmVkJyAmJiBvcGVyYS50b1N0cmluZygpID09PSAnW29iamVjdCBPcGVyYV0nLFxuICAgICAgICBjb250ZXh0cyA9IHt9LFxuICAgICAgICBjZmcgPSB7fSxcbiAgICAgICAgZ2xvYmFsRGVmUXVldWUgPSBbXSxcbiAgICAgICAgdXNlSW50ZXJhY3RpdmUgPSBmYWxzZTtcblxuICAgIC8vQ291bGQgbWF0Y2ggc29tZXRoaW5nIGxpa2UgJykvL2NvbW1lbnQnLCBkbyBub3QgbG9zZSB0aGUgcHJlZml4IHRvIGNvbW1lbnQuXG4gICAgZnVuY3Rpb24gY29tbWVudFJlcGxhY2UobWF0Y2gsIHNpbmdsZVByZWZpeCkge1xuICAgICAgICByZXR1cm4gc2luZ2xlUHJlZml4IHx8ICcnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRnVuY3Rpb24oaXQpIHtcbiAgICAgICAgcmV0dXJuIG9zdHJpbmcuY2FsbChpdCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBcnJheShpdCkge1xuICAgICAgICByZXR1cm4gb3N0cmluZy5jYWxsKGl0KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgZnVuY3Rpb24gZm9yIGl0ZXJhdGluZyBvdmVyIGFuIGFycmF5LiBJZiB0aGUgZnVuYyByZXR1cm5zXG4gICAgICogYSB0cnVlIHZhbHVlLCBpdCB3aWxsIGJyZWFrIG91dCBvZiB0aGUgbG9vcC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlYWNoKGFyeSwgZnVuYykge1xuICAgICAgICBpZiAoYXJ5KSB7XG4gICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBhcnkubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJ5W2ldICYmIGZ1bmMoYXJ5W2ldLCBpLCBhcnkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhlbHBlciBmdW5jdGlvbiBmb3IgaXRlcmF0aW5nIG92ZXIgYW4gYXJyYXkgYmFja3dhcmRzLiBJZiB0aGUgZnVuY1xuICAgICAqIHJldHVybnMgYSB0cnVlIHZhbHVlLCBpdCB3aWxsIGJyZWFrIG91dCBvZiB0aGUgbG9vcC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlYWNoUmV2ZXJzZShhcnksIGZ1bmMpIHtcbiAgICAgICAgaWYgKGFyeSkge1xuICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICBmb3IgKGkgPSBhcnkubGVuZ3RoIC0gMTsgaSA+IC0xOyBpIC09IDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJ5W2ldICYmIGZ1bmMoYXJ5W2ldLCBpLCBhcnkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhc1Byb3Aob2JqLCBwcm9wKSB7XG4gICAgICAgIHJldHVybiBoYXNPd24uY2FsbChvYmosIHByb3ApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE93bihvYmosIHByb3ApIHtcbiAgICAgICAgcmV0dXJuIGhhc1Byb3Aob2JqLCBwcm9wKSAmJiBvYmpbcHJvcF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3ljbGVzIG92ZXIgcHJvcGVydGllcyBpbiBhbiBvYmplY3QgYW5kIGNhbGxzIGEgZnVuY3Rpb24gZm9yIGVhY2hcbiAgICAgKiBwcm9wZXJ0eSB2YWx1ZS4gSWYgdGhlIGZ1bmN0aW9uIHJldHVybnMgYSB0cnV0aHkgdmFsdWUsIHRoZW4gdGhlXG4gICAgICogaXRlcmF0aW9uIGlzIHN0b3BwZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFjaFByb3Aob2JqLCBmdW5jKSB7XG4gICAgICAgIHZhciBwcm9wO1xuICAgICAgICBmb3IgKHByb3AgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAoaGFzUHJvcChvYmosIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZ1bmMob2JqW3Byb3BdLCBwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaW1wbGUgZnVuY3Rpb24gdG8gbWl4IGluIHByb3BlcnRpZXMgZnJvbSBzb3VyY2UgaW50byB0YXJnZXQsXG4gICAgICogYnV0IG9ubHkgaWYgdGFyZ2V0IGRvZXMgbm90IGFscmVhZHkgaGF2ZSBhIHByb3BlcnR5IG9mIHRoZSBzYW1lIG5hbWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gbWl4aW4odGFyZ2V0LCBzb3VyY2UsIGZvcmNlLCBkZWVwU3RyaW5nTWl4aW4pIHtcbiAgICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICAgICAgZWFjaFByb3Aoc291cmNlLCBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgICAgICAgICBpZiAoZm9yY2UgfHwgIWhhc1Byb3AodGFyZ2V0LCBwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVlcFN0cmluZ01peGluICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICFpc0FycmF5KHZhbHVlKSAmJiAhaXNGdW5jdGlvbih2YWx1ZSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICEodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0W3Byb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BdID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXhpbih0YXJnZXRbcHJvcF0sIHZhbHVlLCBmb3JjZSwgZGVlcFN0cmluZ01peGluKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICAvL1NpbWlsYXIgdG8gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQsIGJ1dCB0aGUgJ3RoaXMnIG9iamVjdCBpcyBzcGVjaWZpZWRcbiAgICAvL2ZpcnN0LCBzaW5jZSBpdCBpcyBlYXNpZXIgdG8gcmVhZC9maWd1cmUgb3V0IHdoYXQgJ3RoaXMnIHdpbGwgYmUuXG4gICAgZnVuY3Rpb24gYmluZChvYmosIGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjcmlwdHMoKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVmYXVsdE9uRXJyb3IoZXJyKSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICAvL0FsbG93IGdldHRpbmcgYSBnbG9iYWwgdGhhdCBpcyBleHByZXNzZWQgaW5cbiAgICAvL2RvdCBub3RhdGlvbiwgbGlrZSAnYS5iLmMnLlxuICAgIGZ1bmN0aW9uIGdldEdsb2JhbCh2YWx1ZSkge1xuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGcgPSBnbG9iYWw7XG4gICAgICAgIGVhY2godmFsdWUuc3BsaXQoJy4nKSwgZnVuY3Rpb24gKHBhcnQpIHtcbiAgICAgICAgICAgIGcgPSBnW3BhcnRdO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhbiBlcnJvciB3aXRoIGEgcG9pbnRlciB0byBhbiBVUkwgd2l0aCBtb3JlIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBpZCB0aGUgZXJyb3IgSUQgdGhhdCBtYXBzIHRvIGFuIElEIG9uIGEgd2ViIHBhZ2UuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgaHVtYW4gcmVhZGFibGUgZXJyb3IuXG4gICAgICogQHBhcmFtIHtFcnJvcn0gW2Vycl0gdGhlIG9yaWdpbmFsIGVycm9yLCBpZiB0aGVyZSBpcyBvbmUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7RXJyb3J9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWFrZUVycm9yKGlkLCBtc2csIGVyciwgcmVxdWlyZU1vZHVsZXMpIHtcbiAgICAgICAgdmFyIGUgPSBuZXcgRXJyb3IobXNnICsgJ1xcbmh0dHBzOi8vcmVxdWlyZWpzLm9yZy9kb2NzL2Vycm9ycy5odG1sIycgKyBpZCk7XG4gICAgICAgIGUucmVxdWlyZVR5cGUgPSBpZDtcbiAgICAgICAgZS5yZXF1aXJlTW9kdWxlcyA9IHJlcXVpcmVNb2R1bGVzO1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBlLm9yaWdpbmFsRXJyb3IgPSBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vSWYgYSBkZWZpbmUgaXMgYWxyZWFkeSBpbiBwbGF5IHZpYSBhbm90aGVyIEFNRCBsb2FkZXIsXG4gICAgICAgIC8vZG8gbm90IG92ZXJ3cml0ZS5cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgcmVxdWlyZWpzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihyZXF1aXJlanMpKSB7XG4gICAgICAgICAgICAvL0RvIG5vdCBvdmVyd3JpdGUgYW4gZXhpc3RpbmcgcmVxdWlyZWpzIGluc3RhbmNlLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNmZyA9IHJlcXVpcmVqcztcbiAgICAgICAgcmVxdWlyZWpzID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vQWxsb3cgZm9yIGEgcmVxdWlyZSBjb25maWcgb2JqZWN0XG4gICAgaWYgKHR5cGVvZiByZXF1aXJlICE9PSAndW5kZWZpbmVkJyAmJiAhaXNGdW5jdGlvbihyZXF1aXJlKSkge1xuICAgICAgICAvL2Fzc3VtZSBpdCBpcyBhIGNvbmZpZyBvYmplY3QuXG4gICAgICAgIGNmZyA9IHJlcXVpcmU7XG4gICAgICAgIHJlcXVpcmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV3Q29udGV4dChjb250ZXh0TmFtZSkge1xuICAgICAgICB2YXIgaW5DaGVja0xvYWRlZCwgTW9kdWxlLCBjb250ZXh0LCBoYW5kbGVycyxcbiAgICAgICAgICAgIGNoZWNrTG9hZGVkVGltZW91dElkLFxuICAgICAgICAgICAgY29uZmlnID0ge1xuICAgICAgICAgICAgICAgIC8vRGVmYXVsdHMuIERvIG5vdCBzZXQgYSBkZWZhdWx0IGZvciBtYXBcbiAgICAgICAgICAgICAgICAvL2NvbmZpZyB0byBzcGVlZCB1cCBub3JtYWxpemUoKSwgd2hpY2hcbiAgICAgICAgICAgICAgICAvL3dpbGwgcnVuIGZhc3RlciBpZiB0aGVyZSBpcyBubyBkZWZhdWx0LlxuICAgICAgICAgICAgICAgIHdhaXRTZWNvbmRzOiA3LFxuICAgICAgICAgICAgICAgIGJhc2VVcmw6ICcuLycsXG4gICAgICAgICAgICAgICAgcGF0aHM6IHt9LFxuICAgICAgICAgICAgICAgIGJ1bmRsZXM6IHt9LFxuICAgICAgICAgICAgICAgIHBrZ3M6IHt9LFxuICAgICAgICAgICAgICAgIHNoaW06IHt9LFxuICAgICAgICAgICAgICAgIGNvbmZpZzoge31cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWdpc3RyeSA9IHt9LFxuICAgICAgICAgICAgLy9yZWdpc3RyeSBvZiBqdXN0IGVuYWJsZWQgbW9kdWxlcywgdG8gc3BlZWRcbiAgICAgICAgICAgIC8vY3ljbGUgYnJlYWtpbmcgY29kZSB3aGVuIGxvdHMgb2YgbW9kdWxlc1xuICAgICAgICAgICAgLy9hcmUgcmVnaXN0ZXJlZCwgYnV0IG5vdCBhY3RpdmF0ZWQuXG4gICAgICAgICAgICBlbmFibGVkUmVnaXN0cnkgPSB7fSxcbiAgICAgICAgICAgIHVuZGVmRXZlbnRzID0ge30sXG4gICAgICAgICAgICBkZWZRdWV1ZSA9IFtdLFxuICAgICAgICAgICAgZGVmaW5lZCA9IHt9LFxuICAgICAgICAgICAgdXJsRmV0Y2hlZCA9IHt9LFxuICAgICAgICAgICAgYnVuZGxlc01hcCA9IHt9LFxuICAgICAgICAgICAgcmVxdWlyZUNvdW50ZXIgPSAxLFxuICAgICAgICAgICAgdW5ub3JtYWxpemVkQ291bnRlciA9IDE7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyaW1zIHRoZSAuIGFuZCAuLiBmcm9tIGFuIGFycmF5IG9mIHBhdGggc2VnbWVudHMuXG4gICAgICAgICAqIEl0IHdpbGwga2VlcCBhIGxlYWRpbmcgcGF0aCBzZWdtZW50IGlmIGEgLi4gd2lsbCBiZWNvbWVcbiAgICAgICAgICogdGhlIGZpcnN0IHBhdGggc2VnbWVudCwgdG8gaGVscCB3aXRoIG1vZHVsZSBuYW1lIGxvb2t1cHMsXG4gICAgICAgICAqIHdoaWNoIGFjdCBsaWtlIHBhdGhzLCBidXQgY2FuIGJlIHJlbWFwcGVkLiBCdXQgdGhlIGVuZCByZXN1bHQsXG4gICAgICAgICAqIGFsbCBwYXRocyB0aGF0IHVzZSB0aGlzIGZ1bmN0aW9uIHNob3VsZCBsb29rIG5vcm1hbGl6ZWQuXG4gICAgICAgICAqIE5PVEU6IHRoaXMgbWV0aG9kIE1PRElGSUVTIHRoZSBpbnB1dCBhcnJheS5cbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYXJ5IHRoZSBhcnJheSBvZiBwYXRoIHNlZ21lbnRzLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gdHJpbURvdHMoYXJ5KSB7XG4gICAgICAgICAgICB2YXIgaSwgcGFydDtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBhcnkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYXJ0ID0gYXJ5W2ldO1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0ID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJ5LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocGFydCA9PT0gJy4uJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiBhdCB0aGUgc3RhcnQsIG9yIHByZXZpb3VzIHZhbHVlIGlzIHN0aWxsIC4uLFxuICAgICAgICAgICAgICAgICAgICAvLyBrZWVwIHRoZW0gc28gdGhhdCB3aGVuIGNvbnZlcnRlZCB0byBhIHBhdGggaXQgbWF5XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0aWxsIHdvcmsgd2hlbiBjb252ZXJ0ZWQgdG8gYSBwYXRoLCBldmVuIHRob3VnaFxuICAgICAgICAgICAgICAgICAgICAvLyBhcyBhbiBJRCBpdCBpcyBsZXNzIHRoYW4gaWRlYWwuIEluIGxhcmdlciBwb2ludFxuICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlcywgbWF5IGJlIGJldHRlciB0byBqdXN0IGtpY2sgb3V0IGFuIGVycm9yLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gMCB8fCAoaSA9PT0gMSAmJiBhcnlbMl0gPT09ICcuLicpIHx8IGFyeVtpIC0gMV0gPT09ICcuLicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcnkuc3BsaWNlKGkgLSAxLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkgLT0gMjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHaXZlbiBhIHJlbGF0aXZlIG1vZHVsZSBuYW1lLCBsaWtlIC4vc29tZXRoaW5nLCBub3JtYWxpemUgaXQgdG9cbiAgICAgICAgICogYSByZWFsIG5hbWUgdGhhdCBjYW4gYmUgbWFwcGVkIHRvIGEgcGF0aC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIHJlbGF0aXZlIG5hbWVcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGJhc2VOYW1lIGEgcmVhbCBuYW1lIHRoYXQgdGhlIG5hbWUgYXJnIGlzIHJlbGF0aXZlXG4gICAgICAgICAqIHRvLlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFwcGx5TWFwIGFwcGx5IHRoZSBtYXAgY29uZmlnIHRvIHRoZSB2YWx1ZS4gU2hvdWxkXG4gICAgICAgICAqIG9ubHkgYmUgZG9uZSBpZiB0aGlzIG5vcm1hbGl6YXRpb24gaXMgZm9yIGEgZGVwZW5kZW5jeSBJRC5cbiAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gbm9ybWFsaXplZCBuYW1lXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBub3JtYWxpemUobmFtZSwgYmFzZU5hbWUsIGFwcGx5TWFwKSB7XG4gICAgICAgICAgICB2YXIgcGtnTWFpbiwgbWFwVmFsdWUsIG5hbWVQYXJ0cywgaSwgaiwgbmFtZVNlZ21lbnQsIGxhc3RJbmRleCxcbiAgICAgICAgICAgICAgICBmb3VuZE1hcCwgZm91bmRJLCBmb3VuZFN0YXJNYXAsIHN0YXJJLCBub3JtYWxpemVkQmFzZVBhcnRzLFxuICAgICAgICAgICAgICAgIGJhc2VQYXJ0cyA9IChiYXNlTmFtZSAmJiBiYXNlTmFtZS5zcGxpdCgnLycpKSxcbiAgICAgICAgICAgICAgICBtYXAgPSBjb25maWcubWFwLFxuICAgICAgICAgICAgICAgIHN0YXJNYXAgPSBtYXAgJiYgbWFwWycqJ107XG5cbiAgICAgICAgICAgIC8vQWRqdXN0IGFueSByZWxhdGl2ZSBwYXRocy5cbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICBsYXN0SW5kZXggPSBuYW1lLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB3YW50aW5nIG5vZGUgSUQgY29tcGF0aWJpbGl0eSwgc3RyaXAgLmpzIGZyb20gZW5kXG4gICAgICAgICAgICAgICAgLy8gb2YgSURzLiBIYXZlIHRvIGRvIHRoaXMgaGVyZSwgYW5kIG5vdCBpbiBuYW1lVG9VcmxcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIG5vZGUgYWxsb3dzIGVpdGhlciAuanMgb3Igbm9uIC5qcyB0byBtYXBcbiAgICAgICAgICAgICAgICAvLyB0byBzYW1lIGZpbGUuXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5ub2RlSWRDb21wYXQgJiYganNTdWZmaXhSZWdFeHAudGVzdChuYW1lW2xhc3RJbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWVbbGFzdEluZGV4XSA9IG5hbWVbbGFzdEluZGV4XS5yZXBsYWNlKGpzU3VmZml4UmVnRXhwLCAnJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU3RhcnRzIHdpdGggYSAnLicgc28gbmVlZCB0aGUgYmFzZU5hbWVcbiAgICAgICAgICAgICAgICBpZiAobmFtZVswXS5jaGFyQXQoMCkgPT09ICcuJyAmJiBiYXNlUGFydHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9Db252ZXJ0IGJhc2VOYW1lIHRvIGFycmF5LCBhbmQgbG9wIG9mZiB0aGUgbGFzdCBwYXJ0LFxuICAgICAgICAgICAgICAgICAgICAvL3NvIHRoYXQgLiBtYXRjaGVzIHRoYXQgJ2RpcmVjdG9yeScgYW5kIG5vdCBuYW1lIG9mIHRoZSBiYXNlTmFtZSdzXG4gICAgICAgICAgICAgICAgICAgIC8vbW9kdWxlLiBGb3IgaW5zdGFuY2UsIGJhc2VOYW1lIG9mICdvbmUvdHdvL3RocmVlJywgbWFwcyB0b1xuICAgICAgICAgICAgICAgICAgICAvLydvbmUvdHdvL3RocmVlLmpzJywgYnV0IHdlIHdhbnQgdGhlIGRpcmVjdG9yeSwgJ29uZS90d28nIGZvclxuICAgICAgICAgICAgICAgICAgICAvL3RoaXMgbm9ybWFsaXphdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgbm9ybWFsaXplZEJhc2VQYXJ0cyA9IGJhc2VQYXJ0cy5zbGljZSgwLCBiYXNlUGFydHMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBub3JtYWxpemVkQmFzZVBhcnRzLmNvbmNhdChuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cmltRG90cyhuYW1lKTtcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZS5qb2luKCcvJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vQXBwbHkgbWFwIGNvbmZpZyBpZiBhdmFpbGFibGUuXG4gICAgICAgICAgICBpZiAoYXBwbHlNYXAgJiYgbWFwICYmIChiYXNlUGFydHMgfHwgc3Rhck1hcCkpIHtcbiAgICAgICAgICAgICAgICBuYW1lUGFydHMgPSBuYW1lLnNwbGl0KCcvJyk7XG5cbiAgICAgICAgICAgICAgICBvdXRlckxvb3A6IGZvciAoaSA9IG5hbWVQYXJ0cy5sZW5ndGg7IGkgPiAwOyBpIC09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZVNlZ21lbnQgPSBuYW1lUGFydHMuc2xpY2UoMCwgaSkuam9pbignLycpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYXNlUGFydHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vRmluZCB0aGUgbG9uZ2VzdCBiYXNlTmFtZSBzZWdtZW50IG1hdGNoIGluIHRoZSBjb25maWcuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NvLCBkbyBqb2lucyBvbiB0aGUgYmlnZ2VzdCB0byBzbWFsbGVzdCBsZW5ndGhzIG9mIGJhc2VQYXJ0cy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IGJhc2VQYXJ0cy5sZW5ndGg7IGogPiAwOyBqIC09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBWYWx1ZSA9IGdldE93bihtYXAsIGJhc2VQYXJ0cy5zbGljZSgwLCBqKS5qb2luKCcvJykpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9iYXNlTmFtZSBzZWdtZW50IGhhcyBjb25maWcsIGZpbmQgaWYgaXQgaGFzIG9uZSBmb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3RoaXMgbmFtZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWFwVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwVmFsdWUgPSBnZXRPd24obWFwVmFsdWUsIG5hbWVTZWdtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hcFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL01hdGNoLCB1cGRhdGUgbmFtZSB0byB0aGUgbmV3IHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRNYXAgPSBtYXBWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kSSA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhayBvdXRlckxvb3A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBhIHN0YXIgbWFwIG1hdGNoLCBidXQganVzdCBob2xkIG9uIHRvIGl0LFxuICAgICAgICAgICAgICAgICAgICAvL2lmIHRoZXJlIGlzIGEgc2hvcnRlciBzZWdtZW50IG1hdGNoIGxhdGVyIGluIGEgbWF0Y2hpbmdcbiAgICAgICAgICAgICAgICAgICAgLy9jb25maWcsIHRoZW4gZmF2b3Igb3ZlciB0aGlzIHN0YXIgbWFwLlxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kU3Rhck1hcCAmJiBzdGFyTWFwICYmIGdldE93bihzdGFyTWFwLCBuYW1lU2VnbWVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kU3Rhck1hcCA9IGdldE93bihzdGFyTWFwLCBuYW1lU2VnbWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFySSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWZvdW5kTWFwICYmIGZvdW5kU3Rhck1hcCkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZE1hcCA9IGZvdW5kU3Rhck1hcDtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRJID0gc3Rhckk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kTWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWVQYXJ0cy5zcGxpY2UoMCwgZm91bmRJLCBmb3VuZE1hcCk7XG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lUGFydHMuam9pbignLycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIG5hbWUgcG9pbnRzIHRvIGEgcGFja2FnZSdzIG5hbWUsIHVzZVxuICAgICAgICAgICAgLy8gdGhlIHBhY2thZ2UgbWFpbiBpbnN0ZWFkLlxuICAgICAgICAgICAgcGtnTWFpbiA9IGdldE93bihjb25maWcucGtncywgbmFtZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBwa2dNYWluID8gcGtnTWFpbiA6IG5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW1vdmVTY3JpcHQobmFtZSkge1xuICAgICAgICAgICAgaWYgKGlzQnJvd3Nlcikge1xuICAgICAgICAgICAgICAgIGVhY2goc2NyaXB0cygpLCBmdW5jdGlvbiAoc2NyaXB0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NyaXB0Tm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVxdWlyZW1vZHVsZScpID09PSBuYW1lICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0Tm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVxdWlyZWNvbnRleHQnKSA9PT0gY29udGV4dC5jb250ZXh0TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0Tm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNjcmlwdE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhc1BhdGhGYWxsYmFjayhpZCkge1xuICAgICAgICAgICAgdmFyIHBhdGhDb25maWcgPSBnZXRPd24oY29uZmlnLnBhdGhzLCBpZCk7XG4gICAgICAgICAgICBpZiAocGF0aENvbmZpZyAmJiBpc0FycmF5KHBhdGhDb25maWcpICYmIHBhdGhDb25maWcubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIC8vUG9wIG9mZiB0aGUgZmlyc3QgYXJyYXkgdmFsdWUsIHNpbmNlIGl0IGZhaWxlZCwgYW5kXG4gICAgICAgICAgICAgICAgLy9yZXRyeVxuICAgICAgICAgICAgICAgIHBhdGhDb25maWcuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnJlcXVpcmUudW5kZWYoaWQpO1xuXG4gICAgICAgICAgICAgICAgLy9DdXN0b20gcmVxdWlyZSB0aGF0IGRvZXMgbm90IGRvIG1hcCB0cmFuc2xhdGlvbiwgc2luY2VcbiAgICAgICAgICAgICAgICAvL0lEIGlzIFwiYWJzb2x1dGVcIiwgYWxyZWFkeSBtYXBwZWQvcmVzb2x2ZWQuXG4gICAgICAgICAgICAgICAgY29udGV4dC5tYWtlUmVxdWlyZShudWxsLCB7XG4gICAgICAgICAgICAgICAgICAgIHNraXBNYXA6IHRydWVcbiAgICAgICAgICAgICAgICB9KShbaWRdKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9UdXJucyBhIHBsdWdpbiFyZXNvdXJjZSB0byBbcGx1Z2luLCByZXNvdXJjZV1cbiAgICAgICAgLy93aXRoIHRoZSBwbHVnaW4gYmVpbmcgdW5kZWZpbmVkIGlmIHRoZSBuYW1lXG4gICAgICAgIC8vZGlkIG5vdCBoYXZlIGEgcGx1Z2luIHByZWZpeC5cbiAgICAgICAgZnVuY3Rpb24gc3BsaXRQcmVmaXgobmFtZSkge1xuICAgICAgICAgICAgdmFyIHByZWZpeCxcbiAgICAgICAgICAgICAgICBpbmRleCA9IG5hbWUgPyBuYW1lLmluZGV4T2YoJyEnKSA6IC0xO1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSBuYW1lLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKGluZGV4ICsgMSwgbmFtZS5sZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFtwcmVmaXgsIG5hbWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBtb2R1bGUgbWFwcGluZyB0aGF0IGluY2x1ZGVzIHBsdWdpbiBwcmVmaXgsIG1vZHVsZVxuICAgICAgICAgKiBuYW1lLCBhbmQgcGF0aC4gSWYgcGFyZW50TW9kdWxlTWFwIGlzIHByb3ZpZGVkIGl0IHdpbGxcbiAgICAgICAgICogYWxzbyBub3JtYWxpemUgdGhlIG5hbWUgdmlhIHJlcXVpcmUubm9ybWFsaXplKClcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIG1vZHVsZSBuYW1lXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyZW50TW9kdWxlTWFwXSBwYXJlbnQgbW9kdWxlIG1hcFxuICAgICAgICAgKiBmb3IgdGhlIG1vZHVsZSBuYW1lLCB1c2VkIHRvIHJlc29sdmUgcmVsYXRpdmUgbmFtZXMuXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNOb3JtYWxpemVkOiBpcyB0aGUgSUQgYWxyZWFkeSBub3JtYWxpemVkLlxuICAgICAgICAgKiBUaGlzIGlzIHRydWUgaWYgdGhpcyBjYWxsIGlzIGRvbmUgZm9yIGEgZGVmaW5lKCkgbW9kdWxlIElELlxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFwcGx5TWFwOiBhcHBseSB0aGUgbWFwIGNvbmZpZyB0byB0aGUgSUQuXG4gICAgICAgICAqIFNob3VsZCBvbmx5IGJlIHRydWUgaWYgdGhpcyBtYXAgaXMgZm9yIGEgZGVwZW5kZW5jeS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIG1ha2VNb2R1bGVNYXAobmFtZSwgcGFyZW50TW9kdWxlTWFwLCBpc05vcm1hbGl6ZWQsIGFwcGx5TWFwKSB7XG4gICAgICAgICAgICB2YXIgdXJsLCBwbHVnaW5Nb2R1bGUsIHN1ZmZpeCwgbmFtZVBhcnRzLFxuICAgICAgICAgICAgICAgIHByZWZpeCA9IG51bGwsXG4gICAgICAgICAgICAgICAgcGFyZW50TmFtZSA9IHBhcmVudE1vZHVsZU1hcCA/IHBhcmVudE1vZHVsZU1hcC5uYW1lIDogbnVsbCxcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE5hbWUgPSBuYW1lLFxuICAgICAgICAgICAgICAgIGlzRGVmaW5lID0gdHJ1ZSxcbiAgICAgICAgICAgICAgICBub3JtYWxpemVkTmFtZSA9ICcnO1xuXG4gICAgICAgICAgICAvL0lmIG5vIG5hbWUsIHRoZW4gaXQgbWVhbnMgaXQgaXMgYSByZXF1aXJlIGNhbGwsIGdlbmVyYXRlIGFuXG4gICAgICAgICAgICAvL2ludGVybmFsIG5hbWUuXG4gICAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgICAgICBpc0RlZmluZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIG5hbWUgPSAnX0ByJyArIChyZXF1aXJlQ291bnRlciArPSAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmFtZVBhcnRzID0gc3BsaXRQcmVmaXgobmFtZSk7XG4gICAgICAgICAgICBwcmVmaXggPSBuYW1lUGFydHNbMF07XG4gICAgICAgICAgICBuYW1lID0gbmFtZVBhcnRzWzFdO1xuXG4gICAgICAgICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gbm9ybWFsaXplKHByZWZpeCwgcGFyZW50TmFtZSwgYXBwbHlNYXApO1xuICAgICAgICAgICAgICAgIHBsdWdpbk1vZHVsZSA9IGdldE93bihkZWZpbmVkLCBwcmVmaXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0FjY291bnQgZm9yIHJlbGF0aXZlIHBhdGhzIGlmIHRoZXJlIGlzIGEgYmFzZSBuYW1lLlxuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vcm1hbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWROYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwbHVnaW5Nb2R1bGUgJiYgcGx1Z2luTW9kdWxlLm5vcm1hbGl6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9QbHVnaW4gaXMgbG9hZGVkLCB1c2UgaXRzIG5vcm1hbGl6ZSBtZXRob2QuXG4gICAgICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkTmFtZSA9IHBsdWdpbk1vZHVsZS5ub3JtYWxpemUobmFtZSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9ybWFsaXplKG5hbWUsIHBhcmVudE5hbWUsIGFwcGx5TWFwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgbmVzdGVkIHBsdWdpbiByZWZlcmVuY2VzLCB0aGVuIGRvIG5vdCB0cnkgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vcm1hbGl6ZSwgYXMgaXQgd2lsbCBub3Qgbm9ybWFsaXplIGNvcnJlY3RseS4gVGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxhY2VzIGEgcmVzdHJpY3Rpb24gb24gcmVzb3VyY2VJZHMsIGFuZCB0aGUgbG9uZ2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0ZXJtIHNvbHV0aW9uIGlzIG5vdCB0byBub3JtYWxpemUgdW50aWwgcGx1Z2lucyBhcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxvYWRlZCBhbmQgYWxsIG5vcm1hbGl6YXRpb25zIHRvIGFsbG93IGZvciBhc3luY1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbG9hZGluZyBvZiBhIGxvYWRlciBwbHVnaW4uIEJ1dCBmb3Igbm93LCBmaXhlcyB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbW1vbiB1c2VzLiBEZXRhaWxzIGluICMxMTMxXG4gICAgICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkTmFtZSA9IG5hbWUuaW5kZXhPZignIScpID09PSAtMSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZShuYW1lLCBwYXJlbnROYW1lLCBhcHBseU1hcCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9BIHJlZ3VsYXIgbW9kdWxlLlxuICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkTmFtZSA9IG5vcm1hbGl6ZShuYW1lLCBwYXJlbnROYW1lLCBhcHBseU1hcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy9Ob3JtYWxpemVkIG5hbWUgbWF5IGJlIGEgcGx1Z2luIElEIGR1ZSB0byBtYXAgY29uZmlnXG4gICAgICAgICAgICAgICAgICAgIC8vYXBwbGljYXRpb24gaW4gbm9ybWFsaXplLiBUaGUgbWFwIGNvbmZpZyB2YWx1ZXMgbXVzdFxuICAgICAgICAgICAgICAgICAgICAvL2FscmVhZHkgYmUgbm9ybWFsaXplZCwgc28gZG8gbm90IG5lZWQgdG8gcmVkbyB0aGF0IHBhcnQuXG4gICAgICAgICAgICAgICAgICAgIG5hbWVQYXJ0cyA9IHNwbGl0UHJlZml4KG5vcm1hbGl6ZWROYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gbmFtZVBhcnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkTmFtZSA9IG5hbWVQYXJ0c1sxXTtcbiAgICAgICAgICAgICAgICAgICAgaXNOb3JtYWxpemVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBjb250ZXh0Lm5hbWVUb1VybChub3JtYWxpemVkTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0lmIHRoZSBpZCBpcyBhIHBsdWdpbiBpZCB0aGF0IGNhbm5vdCBiZSBkZXRlcm1pbmVkIGlmIGl0IG5lZWRzXG4gICAgICAgICAgICAvL25vcm1hbGl6YXRpb24sIHN0YW1wIGl0IHdpdGggYSB1bmlxdWUgSUQgc28gdHdvIG1hdGNoaW5nIHJlbGF0aXZlXG4gICAgICAgICAgICAvL2lkcyB0aGF0IG1heSBjb25mbGljdCBjYW4gYmUgc2VwYXJhdGUuXG4gICAgICAgICAgICBzdWZmaXggPSBwcmVmaXggJiYgIXBsdWdpbk1vZHVsZSAmJiAhaXNOb3JtYWxpemVkID9cbiAgICAgICAgICAgICAgICAgICAgICdfdW5ub3JtYWxpemVkJyArICh1bm5vcm1hbGl6ZWRDb3VudGVyICs9IDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICcnO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHByZWZpeDogcHJlZml4LFxuICAgICAgICAgICAgICAgIG5hbWU6IG5vcm1hbGl6ZWROYW1lLFxuICAgICAgICAgICAgICAgIHBhcmVudE1hcDogcGFyZW50TW9kdWxlTWFwLFxuICAgICAgICAgICAgICAgIHVubm9ybWFsaXplZDogISFzdWZmaXgsXG4gICAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxOYW1lOiBvcmlnaW5hbE5hbWUsXG4gICAgICAgICAgICAgICAgaXNEZWZpbmU6IGlzRGVmaW5lLFxuICAgICAgICAgICAgICAgIGlkOiAocHJlZml4ID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZpeCArICchJyArIG5vcm1hbGl6ZWROYW1lIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWROYW1lKSArIHN1ZmZpeFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldE1vZHVsZShkZXBNYXApIHtcbiAgICAgICAgICAgIHZhciBpZCA9IGRlcE1hcC5pZCxcbiAgICAgICAgICAgICAgICBtb2QgPSBnZXRPd24ocmVnaXN0cnksIGlkKTtcblxuICAgICAgICAgICAgaWYgKCFtb2QpIHtcbiAgICAgICAgICAgICAgICBtb2QgPSByZWdpc3RyeVtpZF0gPSBuZXcgY29udGV4dC5Nb2R1bGUoZGVwTWFwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG1vZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uKGRlcE1hcCwgbmFtZSwgZm4pIHtcbiAgICAgICAgICAgIHZhciBpZCA9IGRlcE1hcC5pZCxcbiAgICAgICAgICAgICAgICBtb2QgPSBnZXRPd24ocmVnaXN0cnksIGlkKTtcblxuICAgICAgICAgICAgaWYgKGhhc1Byb3AoZGVmaW5lZCwgaWQpICYmXG4gICAgICAgICAgICAgICAgICAgICghbW9kIHx8IG1vZC5kZWZpbmVFbWl0Q29tcGxldGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICdkZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBmbihkZWZpbmVkW2lkXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb2QgPSBnZXRNb2R1bGUoZGVwTWFwKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kLmVycm9yICYmIG5hbWUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgZm4obW9kLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtb2Qub24obmFtZSwgZm4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uRXJyb3IoZXJyLCBlcnJiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaWRzID0gZXJyLnJlcXVpcmVNb2R1bGVzLFxuICAgICAgICAgICAgICAgIG5vdGlmaWVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmIChlcnJiYWNrKSB7XG4gICAgICAgICAgICAgICAgZXJyYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlYWNoKGlkcywgZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtb2QgPSBnZXRPd24ocmVnaXN0cnksIGlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9TZXQgZXJyb3Igb24gbW9kdWxlLCBzbyBpdCBza2lwcyB0aW1lb3V0IGNoZWNrcy5cbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZC5lcnJvciA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtb2QuZXZlbnRzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm90aWZpZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZC5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmICghbm90aWZpZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogSW50ZXJuYWwgbWV0aG9kIHRvIHRyYW5zZmVyIGdsb2JhbFF1ZXVlIGl0ZW1zIHRvIHRoaXMgY29udGV4dCdzXG4gICAgICAgICAqIGRlZlF1ZXVlLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gdGFrZUdsb2JhbFF1ZXVlKCkge1xuICAgICAgICAgICAgLy9QdXNoIGFsbCB0aGUgZ2xvYmFsRGVmUXVldWUgaXRlbXMgaW50byB0aGUgY29udGV4dCdzIGRlZlF1ZXVlXG4gICAgICAgICAgICBpZiAoZ2xvYmFsRGVmUXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZWFjaChnbG9iYWxEZWZRdWV1ZSwgZnVuY3Rpb24ocXVldWVJdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpZCA9IHF1ZXVlSXRlbVswXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZGVmUXVldWVNYXBbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZWZRdWV1ZS5wdXNoKHF1ZXVlSXRlbSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZ2xvYmFsRGVmUXVldWUgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGhhbmRsZXJzID0ge1xuICAgICAgICAgICAgJ3JlcXVpcmUnOiBmdW5jdGlvbiAobW9kKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1vZC5yZXF1aXJlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb2QucmVxdWlyZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG1vZC5yZXF1aXJlID0gY29udGV4dC5tYWtlUmVxdWlyZShtb2QubWFwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdleHBvcnRzJzogZnVuY3Rpb24gKG1vZCkge1xuICAgICAgICAgICAgICAgIG1vZC51c2luZ0V4cG9ydHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2QubWFwLmlzRGVmaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2QuZXhwb3J0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChkZWZpbmVkW21vZC5tYXAuaWRdID0gbW9kLmV4cG9ydHMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChtb2QuZXhwb3J0cyA9IGRlZmluZWRbbW9kLm1hcC5pZF0gPSB7fSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ21vZHVsZSc6IGZ1bmN0aW9uIChtb2QpIHtcbiAgICAgICAgICAgICAgICBpZiAobW9kLm1vZHVsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9kLm1vZHVsZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG1vZC5tb2R1bGUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbW9kLm1hcC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVyaTogbW9kLm1hcC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0T3duKGNvbmZpZy5jb25maWcsIG1vZC5tYXAuaWQpIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydHM6IG1vZC5leHBvcnRzIHx8IChtb2QuZXhwb3J0cyA9IHt9KVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gY2xlYW5SZWdpc3RyeShpZCkge1xuICAgICAgICAgICAgLy9DbGVhbiB1cCBtYWNoaW5lcnkgdXNlZCBmb3Igd2FpdGluZyBtb2R1bGVzLlxuICAgICAgICAgICAgZGVsZXRlIHJlZ2lzdHJ5W2lkXTtcbiAgICAgICAgICAgIGRlbGV0ZSBlbmFibGVkUmVnaXN0cnlbaWRdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYnJlYWtDeWNsZShtb2QsIHRyYWNlZCwgcHJvY2Vzc2VkKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBtb2QubWFwLmlkO1xuXG4gICAgICAgICAgICBpZiAobW9kLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgbW9kLmVtaXQoJ2Vycm9yJywgbW9kLmVycm9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJhY2VkW2lkXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZWFjaChtb2QuZGVwTWFwcywgZnVuY3Rpb24gKGRlcE1hcCwgaSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVwSWQgPSBkZXBNYXAuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXAgPSBnZXRPd24ocmVnaXN0cnksIGRlcElkKTtcblxuICAgICAgICAgICAgICAgICAgICAvL09ubHkgZm9yY2UgdGhpbmdzIHRoYXQgaGF2ZSBub3QgY29tcGxldGVkXG4gICAgICAgICAgICAgICAgICAgIC8vYmVpbmcgZGVmaW5lZCwgc28gc3RpbGwgaW4gdGhlIHJlZ2lzdHJ5LFxuICAgICAgICAgICAgICAgICAgICAvL2FuZCBvbmx5IGlmIGl0IGhhcyBub3QgYmVlbiBtYXRjaGVkIHVwXG4gICAgICAgICAgICAgICAgICAgIC8vaW4gdGhlIG1vZHVsZSBhbHJlYWR5LlxuICAgICAgICAgICAgICAgICAgICBpZiAoZGVwICYmICFtb2QuZGVwTWF0Y2hlZFtpXSAmJiAhcHJvY2Vzc2VkW2RlcElkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdldE93bih0cmFjZWQsIGRlcElkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZC5kZWZpbmVEZXAoaSwgZGVmaW5lZFtkZXBJZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZC5jaGVjaygpOyAvL3Bhc3MgZmFsc2U/XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrQ3ljbGUoZGVwLCB0cmFjZWQsIHByb2Nlc3NlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWRbaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNoZWNrTG9hZGVkKCkge1xuICAgICAgICAgICAgdmFyIGVyciwgdXNpbmdQYXRoRmFsbGJhY2ssXG4gICAgICAgICAgICAgICAgd2FpdEludGVydmFsID0gY29uZmlnLndhaXRTZWNvbmRzICogMTAwMCxcbiAgICAgICAgICAgICAgICAvL0l0IGlzIHBvc3NpYmxlIHRvIGRpc2FibGUgdGhlIHdhaXQgaW50ZXJ2YWwgYnkgdXNpbmcgd2FpdFNlY29uZHMgb2YgMC5cbiAgICAgICAgICAgICAgICBleHBpcmVkID0gd2FpdEludGVydmFsICYmIChjb250ZXh0LnN0YXJ0VGltZSArIHdhaXRJbnRlcnZhbCkgPCBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICBub0xvYWRzID0gW10sXG4gICAgICAgICAgICAgICAgcmVxQ2FsbHMgPSBbXSxcbiAgICAgICAgICAgICAgICBzdGlsbExvYWRpbmcgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBuZWVkQ3ljbGVDaGVjayA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vRG8gbm90IGJvdGhlciBpZiB0aGlzIGNhbGwgd2FzIGEgcmVzdWx0IG9mIGEgY3ljbGUgYnJlYWsuXG4gICAgICAgICAgICBpZiAoaW5DaGVja0xvYWRlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaW5DaGVja0xvYWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vRmlndXJlIG91dCB0aGUgc3RhdGUgb2YgYWxsIHRoZSBtb2R1bGVzLlxuICAgICAgICAgICAgZWFjaFByb3AoZW5hYmxlZFJlZ2lzdHJ5LCBmdW5jdGlvbiAobW9kKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcCA9IG1vZC5tYXAsXG4gICAgICAgICAgICAgICAgICAgIG1vZElkID0gbWFwLmlkO1xuXG4gICAgICAgICAgICAgICAgLy9Ta2lwIHRoaW5ncyB0aGF0IGFyZSBub3QgZW5hYmxlZCBvciBpbiBlcnJvciBzdGF0ZS5cbiAgICAgICAgICAgICAgICBpZiAoIW1vZC5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hcC5pc0RlZmluZSkge1xuICAgICAgICAgICAgICAgICAgICByZXFDYWxscy5wdXNoKG1vZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFtb2QuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9JZiB0aGUgbW9kdWxlIHNob3VsZCBiZSBleGVjdXRlZCwgYW5kIGl0IGhhcyBub3RcbiAgICAgICAgICAgICAgICAgICAgLy9iZWVuIGluaXRlZCBhbmQgdGltZSBpcyB1cCwgcmVtZW1iZXIgaXQuXG4gICAgICAgICAgICAgICAgICAgIGlmICghbW9kLmluaXRlZCAmJiBleHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzUGF0aEZhbGxiYWNrKG1vZElkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzaW5nUGF0aEZhbGxiYWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGlsbExvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub0xvYWRzLnB1c2gobW9kSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZVNjcmlwdChtb2RJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIW1vZC5pbml0ZWQgJiYgbW9kLmZldGNoZWQgJiYgbWFwLmlzRGVmaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGlsbExvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXAucHJlZml4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9ObyByZWFzb24gdG8ga2VlcCBsb29raW5nIGZvciB1bmZpbmlzaGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9sb2FkaW5nLiBJZiB0aGUgb25seSBzdGlsbExvYWRpbmcgaXMgYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vcGx1Z2luIHJlc291cmNlIHRob3VnaCwga2VlcCBnb2luZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2JlY2F1c2UgaXQgbWF5IGJlIHRoYXQgYSBwbHVnaW4gcmVzb3VyY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2lzIHdhaXRpbmcgb24gYSBub24tcGx1Z2luIGN5Y2xlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAobmVlZEN5Y2xlQ2hlY2sgPSBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGV4cGlyZWQgJiYgbm9Mb2Fkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvL0lmIHdhaXQgdGltZSBleHBpcmVkLCB0aHJvdyBlcnJvciBvZiB1bmxvYWRlZCBtb2R1bGVzLlxuICAgICAgICAgICAgICAgIGVyciA9IG1ha2VFcnJvcigndGltZW91dCcsICdMb2FkIHRpbWVvdXQgZm9yIG1vZHVsZXM6ICcgKyBub0xvYWRzLCBudWxsLCBub0xvYWRzKTtcbiAgICAgICAgICAgICAgICBlcnIuY29udGV4dE5hbWUgPSBjb250ZXh0LmNvbnRleHROYW1lO1xuICAgICAgICAgICAgICAgIHJldHVybiBvbkVycm9yKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vTm90IGV4cGlyZWQsIGNoZWNrIGZvciBhIGN5Y2xlLlxuICAgICAgICAgICAgaWYgKG5lZWRDeWNsZUNoZWNrKSB7XG4gICAgICAgICAgICAgICAgZWFjaChyZXFDYWxscywgZnVuY3Rpb24gKG1vZCkge1xuICAgICAgICAgICAgICAgICAgICBicmVha0N5Y2xlKG1vZCwge30sIHt9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9JZiBzdGlsbCB3YWl0aW5nIG9uIGxvYWRzLCBhbmQgdGhlIHdhaXRpbmcgbG9hZCBpcyBzb21ldGhpbmdcbiAgICAgICAgICAgIC8vb3RoZXIgdGhhbiBhIHBsdWdpbiByZXNvdXJjZSwgb3IgdGhlcmUgYXJlIHN0aWxsIG91dHN0YW5kaW5nXG4gICAgICAgICAgICAvL3NjcmlwdHMsIHRoZW4ganVzdCB0cnkgYmFjayBsYXRlci5cbiAgICAgICAgICAgIGlmICgoIWV4cGlyZWQgfHwgdXNpbmdQYXRoRmFsbGJhY2spICYmIHN0aWxsTG9hZGluZykge1xuICAgICAgICAgICAgICAgIC8vU29tZXRoaW5nIGlzIHN0aWxsIHdhaXRpbmcgdG8gbG9hZC4gV2FpdCBmb3IgaXQsIGJ1dCBvbmx5XG4gICAgICAgICAgICAgICAgLy9pZiBhIHRpbWVvdXQgaXMgbm90IGFscmVhZHkgaW4gZWZmZWN0LlxuICAgICAgICAgICAgICAgIGlmICgoaXNCcm93c2VyIHx8IGlzV2ViV29ya2VyKSAmJiAhY2hlY2tMb2FkZWRUaW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tMb2FkZWRUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrTG9hZGVkVGltZW91dElkID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrTG9hZGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGluQ2hlY2tMb2FkZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIE1vZHVsZSA9IGZ1bmN0aW9uIChtYXApIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzID0gZ2V0T3duKHVuZGVmRXZlbnRzLCBtYXAuaWQpIHx8IHt9O1xuICAgICAgICAgICAgdGhpcy5tYXAgPSBtYXA7XG4gICAgICAgICAgICB0aGlzLnNoaW0gPSBnZXRPd24oY29uZmlnLnNoaW0sIG1hcC5pZCk7XG4gICAgICAgICAgICB0aGlzLmRlcEV4cG9ydHMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuZGVwTWFwcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5kZXBNYXRjaGVkID0gW107XG4gICAgICAgICAgICB0aGlzLnBsdWdpbk1hcHMgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuZGVwQ291bnQgPSAwO1xuXG4gICAgICAgICAgICAvKiB0aGlzLmV4cG9ydHMgdGhpcy5mYWN0b3J5XG4gICAgICAgICAgICAgICB0aGlzLmRlcE1hcHMgPSBbXSxcbiAgICAgICAgICAgICAgIHRoaXMuZW5hYmxlZCwgdGhpcy5mZXRjaGVkXG4gICAgICAgICAgICAqL1xuICAgICAgICB9O1xuXG4gICAgICAgIE1vZHVsZS5wcm90b3R5cGUgPSB7XG4gICAgICAgICAgICBpbml0OiBmdW5jdGlvbiAoZGVwTWFwcywgZmFjdG9yeSwgZXJyYmFjaywgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgLy9EbyBub3QgZG8gbW9yZSBpbml0cyBpZiBhbHJlYWR5IGRvbmUuIENhbiBoYXBwZW4gaWYgdGhlcmVcbiAgICAgICAgICAgICAgICAvL2FyZSBtdWx0aXBsZSBkZWZpbmUgY2FsbHMgZm9yIHRoZSBzYW1lIG1vZHVsZS4gVGhhdCBpcyBub3RcbiAgICAgICAgICAgICAgICAvL2Egbm9ybWFsLCBjb21tb24gY2FzZSwgYnV0IGl0IGlzIGFsc28gbm90IHVuZXhwZWN0ZWQuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5pdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmZhY3RvcnkgPSBmYWN0b3J5O1xuXG4gICAgICAgICAgICAgICAgaWYgKGVycmJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgLy9SZWdpc3RlciBmb3IgZXJyb3JzIG9uIHRoaXMgbW9kdWxlLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdlcnJvcicsIGVycmJhY2spO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5ldmVudHMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9JZiBubyBlcnJiYWNrIGFscmVhZHksIGJ1dCB0aGVyZSBhcmUgZXJyb3IgbGlzdGVuZXJzXG4gICAgICAgICAgICAgICAgICAgIC8vb24gdGhpcyBtb2R1bGUsIHNldCB1cCBhbiBlcnJiYWNrIHRvIHBhc3MgdG8gdGhlIGRlcHMuXG4gICAgICAgICAgICAgICAgICAgIGVycmJhY2sgPSBiaW5kKHRoaXMsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL0RvIGEgY29weSBvZiB0aGUgZGVwZW5kZW5jeSBhcnJheSwgc28gdGhhdFxuICAgICAgICAgICAgICAgIC8vc291cmNlIGlucHV0cyBhcmUgbm90IG1vZGlmaWVkLiBGb3IgZXhhbXBsZVxuICAgICAgICAgICAgICAgIC8vXCJzaGltXCIgZGVwcyBhcmUgcGFzc2VkIGluIGhlcmUgZGlyZWN0bHksIGFuZFxuICAgICAgICAgICAgICAgIC8vZG9pbmcgYSBkaXJlY3QgbW9kaWZpY2F0aW9uIG9mIHRoZSBkZXBNYXBzIGFycmF5XG4gICAgICAgICAgICAgICAgLy93b3VsZCBhZmZlY3QgdGhhdCBjb25maWcuXG4gICAgICAgICAgICAgICAgdGhpcy5kZXBNYXBzID0gZGVwTWFwcyAmJiBkZXBNYXBzLnNsaWNlKDApO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5lcnJiYWNrID0gZXJyYmFjaztcblxuICAgICAgICAgICAgICAgIC8vSW5kaWNhdGUgdGhpcyBtb2R1bGUgaGFzIGJlIGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5pZ25vcmUgPSBvcHRpb25zLmlnbm9yZTtcblxuICAgICAgICAgICAgICAgIC8vQ291bGQgaGF2ZSBvcHRpb24gdG8gaW5pdCB0aGlzIG1vZHVsZSBpbiBlbmFibGVkIG1vZGUsXG4gICAgICAgICAgICAgICAgLy9vciBjb3VsZCBoYXZlIGJlZW4gcHJldmlvdXNseSBtYXJrZWQgYXMgZW5hYmxlZC4gSG93ZXZlcixcbiAgICAgICAgICAgICAgICAvL3RoZSBkZXBlbmRlbmNpZXMgYXJlIG5vdCBrbm93biB1bnRpbCBpbml0IGlzIGNhbGxlZC4gU29cbiAgICAgICAgICAgICAgICAvL2lmIGVuYWJsZWQgcHJldmlvdXNseSwgbm93IHRyaWdnZXIgZGVwZW5kZW5jaWVzIGFzIGVuYWJsZWQuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZW5hYmxlZCB8fCB0aGlzLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9FbmFibGUgdGhpcyBtb2R1bGUgYW5kIGRlcGVuZGVuY2llcy5cbiAgICAgICAgICAgICAgICAgICAgLy9XaWxsIGNhbGwgdGhpcy5jaGVjaygpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5hYmxlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGRlZmluZURlcDogZnVuY3Rpb24gKGksIGRlcEV4cG9ydHMpIHtcbiAgICAgICAgICAgICAgICAvL0JlY2F1c2Ugb2YgY3ljbGVzLCBkZWZpbmVkIGNhbGxiYWNrIGZvciBhIGdpdmVuXG4gICAgICAgICAgICAgICAgLy9leHBvcnQgY2FuIGJlIGNhbGxlZCBtb3JlIHRoYW4gb25jZS5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGVwTWF0Y2hlZFtpXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlcE1hdGNoZWRbaV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlcENvdW50IC09IDE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVwRXhwb3J0c1tpXSA9IGRlcEV4cG9ydHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mZXRjaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5mZXRjaGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGNvbnRleHQuc3RhcnRUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBtYXAgPSB0aGlzLm1hcDtcblxuICAgICAgICAgICAgICAgIC8vSWYgdGhlIG1hbmFnZXIgaXMgZm9yIGEgcGx1Z2luIG1hbmFnZWQgcmVzb3VyY2UsXG4gICAgICAgICAgICAgICAgLy9hc2sgdGhlIHBsdWdpbiB0byBsb2FkIGl0IG5vdy5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zaGltKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQubWFrZVJlcXVpcmUodGhpcy5tYXAsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZUJ1aWxkQ2FsbGJhY2s6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSkodGhpcy5zaGltLmRlcHMgfHwgW10sIGJpbmQodGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hcC5wcmVmaXggPyB0aGlzLmNhbGxQbHVnaW4oKSA6IHRoaXMubG9hZCgpO1xuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9SZWd1bGFyIGRlcGVuZGVuY3kuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXAucHJlZml4ID8gdGhpcy5jYWxsUGx1Z2luKCkgOiB0aGlzLmxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBsb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMubWFwLnVybDtcblxuICAgICAgICAgICAgICAgIC8vUmVndWxhciBkZXBlbmRlbmN5LlxuICAgICAgICAgICAgICAgIGlmICghdXJsRmV0Y2hlZFt1cmxdKSB7XG4gICAgICAgICAgICAgICAgICAgIHVybEZldGNoZWRbdXJsXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQubG9hZCh0aGlzLm1hcC5pZCwgdXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENoZWNrcyBpZiB0aGUgbW9kdWxlIGlzIHJlYWR5IHRvIGRlZmluZSBpdHNlbGYsIGFuZCBpZiBzbyxcbiAgICAgICAgICAgICAqIGRlZmluZSBpdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2hlY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCB0aGlzLmVuYWJsaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgZXJyLCBjanNNb2R1bGUsXG4gICAgICAgICAgICAgICAgICAgIGlkID0gdGhpcy5tYXAuaWQsXG4gICAgICAgICAgICAgICAgICAgIGRlcEV4cG9ydHMgPSB0aGlzLmRlcEV4cG9ydHMsXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydHMgPSB0aGlzLmV4cG9ydHMsXG4gICAgICAgICAgICAgICAgICAgIGZhY3RvcnkgPSB0aGlzLmZhY3Rvcnk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaW5pdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgZmV0Y2ggaWYgbm90IGFscmVhZHkgaW4gdGhlIGRlZlF1ZXVlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc1Byb3AoY29udGV4dC5kZWZRdWV1ZU1hcCwgaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIHRoaXMuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuZGVmaW5pbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9UaGUgZmFjdG9yeSBjb3VsZCB0cmlnZ2VyIGFub3RoZXIgcmVxdWlyZSBjYWxsXG4gICAgICAgICAgICAgICAgICAgIC8vdGhhdCB3b3VsZCByZXN1bHQgaW4gY2hlY2tpbmcgdGhpcyBtb2R1bGUgdG9cbiAgICAgICAgICAgICAgICAgICAgLy9kZWZpbmUgaXRzZWxmIGFnYWluLiBJZiBhbHJlYWR5IGluIHRoZSBwcm9jZXNzXG4gICAgICAgICAgICAgICAgICAgIC8vb2YgZG9pbmcgdGhhdCwgc2tpcCB0aGlzIHdvcmsuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmaW5pbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlcENvdW50IDwgMSAmJiAhdGhpcy5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihmYWN0b3J5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vSWYgdGhlcmUgaXMgYW4gZXJyb3IgbGlzdGVuZXIsIGZhdm9yIHBhc3NpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3RvIHRoYXQgaW5zdGVhZCBvZiB0aHJvd2luZyBhbiBlcnJvci4gSG93ZXZlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL29ubHkgZG8gaXQgZm9yIGRlZmluZSgpJ2QgIG1vZHVsZXMuIHJlcXVpcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2VycmJhY2tzIHNob3VsZCBub3QgYmUgY2FsbGVkIGZvciBmYWlsdXJlcyBpblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vdGhlaXIgY2FsbGJhY2tzICgjNjk5KS4gSG93ZXZlciBpZiBhIGdsb2JhbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vb25FcnJvciBpcyBzZXQsIHVzZSB0aGF0LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgodGhpcy5ldmVudHMuZXJyb3IgJiYgdGhpcy5tYXAuaXNEZWZpbmUpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbkVycm9yICE9PSBkZWZhdWx0T25FcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0cyA9IGNvbnRleHQuZXhlY0NiKGlkLCBmYWN0b3J5LCBkZXBFeHBvcnRzLCBleHBvcnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydHMgPSBjb250ZXh0LmV4ZWNDYihpZCwgZmFjdG9yeSwgZGVwRXhwb3J0cywgZXhwb3J0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmF2b3IgcmV0dXJuIHZhbHVlIG92ZXIgZXhwb3J0cy4gSWYgbm9kZS9janMgaW4gcGxheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGVuIHdpbGwgbm90IGhhdmUgYSByZXR1cm4gdmFsdWUgYW55d2F5LiBGYXZvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1vZHVsZS5leHBvcnRzIGFzc2lnbm1lbnQgb3ZlciBleHBvcnRzIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5tYXAuaXNEZWZpbmUgJiYgZXhwb3J0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNqc01vZHVsZSA9IHRoaXMubW9kdWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2pzTW9kdWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRzID0gY2pzTW9kdWxlLmV4cG9ydHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy51c2luZ0V4cG9ydHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vZXhwb3J0cyBhbHJlYWR5IHNldCB0aGUgZGVmaW5lZCB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydHMgPSB0aGlzLmV4cG9ydHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyci5yZXF1aXJlTWFwID0gdGhpcy5tYXA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyci5yZXF1aXJlTW9kdWxlcyA9IHRoaXMubWFwLmlzRGVmaW5lID8gW3RoaXMubWFwLmlkXSA6IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyci5yZXF1aXJlVHlwZSA9IHRoaXMubWFwLmlzRGVmaW5lID8gJ2RlZmluZScgOiAncmVxdWlyZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvbkVycm9yKCh0aGlzLmVycm9yID0gZXJyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vSnVzdCBhIGxpdGVyYWwgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRzID0gZmFjdG9yeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBvcnRzID0gZXhwb3J0cztcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubWFwLmlzRGVmaW5lICYmICF0aGlzLmlnbm9yZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluZWRbaWRdID0gZXhwb3J0cztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXEub25SZXNvdXJjZUxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc0xvYWRNYXBzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVhY2godGhpcy5kZXBNYXBzLCBmdW5jdGlvbiAoZGVwTWFwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNMb2FkTWFwcy5wdXNoKGRlcE1hcC5ub3JtYWxpemVkTWFwIHx8IGRlcE1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXEub25SZXNvdXJjZUxvYWQoY29udGV4dCwgdGhpcy5tYXAsIHJlc0xvYWRNYXBzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQ2xlYW4gdXBcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFuUmVnaXN0cnkoaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmluZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy9GaW5pc2hlZCB0aGUgZGVmaW5lIHN0YWdlLiBBbGxvdyBjYWxsaW5nIGNoZWNrIGFnYWluXG4gICAgICAgICAgICAgICAgICAgIC8vdG8gYWxsb3cgZGVmaW5lIG5vdGlmaWNhdGlvbnMgYmVsb3cgaW4gdGhlIGNhc2Ugb2YgYVxuICAgICAgICAgICAgICAgICAgICAvL2N5Y2xlLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmluaW5nID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVmaW5lZCAmJiAhdGhpcy5kZWZpbmVFbWl0dGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmluZUVtaXR0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdkZWZpbmVkJywgdGhpcy5leHBvcnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmaW5lRW1pdENvbXBsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY2FsbFBsdWdpbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXAgPSB0aGlzLm1hcCxcbiAgICAgICAgICAgICAgICAgICAgaWQgPSBtYXAuaWQsXG4gICAgICAgICAgICAgICAgICAgIC8vTWFwIGFscmVhZHkgbm9ybWFsaXplZCB0aGUgcHJlZml4LlxuICAgICAgICAgICAgICAgICAgICBwbHVnaW5NYXAgPSBtYWtlTW9kdWxlTWFwKG1hcC5wcmVmaXgpO1xuXG4gICAgICAgICAgICAgICAgLy9NYXJrIHRoaXMgYXMgYSBkZXBlbmRlbmN5IGZvciB0aGlzIHBsdWdpbiwgc28gaXRcbiAgICAgICAgICAgICAgICAvL2NhbiBiZSB0cmFjZWQgZm9yIGN5Y2xlcy5cbiAgICAgICAgICAgICAgICB0aGlzLmRlcE1hcHMucHVzaChwbHVnaW5NYXApO1xuXG4gICAgICAgICAgICAgICAgb24ocGx1Z2luTWFwLCAnZGVmaW5lZCcsIGJpbmQodGhpcywgZnVuY3Rpb24gKHBsdWdpbikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9hZCwgbm9ybWFsaXplZE1hcCwgbm9ybWFsaXplZE1vZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1bmRsZUlkID0gZ2V0T3duKGJ1bmRsZXNNYXAsIHRoaXMubWFwLmlkKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgPSB0aGlzLm1hcC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50TmFtZSA9IHRoaXMubWFwLnBhcmVudE1hcCA/IHRoaXMubWFwLnBhcmVudE1hcC5uYW1lIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsUmVxdWlyZSA9IGNvbnRleHQubWFrZVJlcXVpcmUobWFwLnBhcmVudE1hcCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZUJ1aWxkQ2FsbGJhY2s6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vSWYgY3VycmVudCBtYXAgaXMgbm90IG5vcm1hbGl6ZWQsIHdhaXQgZm9yIHRoYXRcbiAgICAgICAgICAgICAgICAgICAgLy9ub3JtYWxpemVkIG5hbWUgdG8gbG9hZCBpbnN0ZWFkIG9mIGNvbnRpbnVpbmcuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm1hcC51bm5vcm1hbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vTm9ybWFsaXplIHRoZSBJRCBpZiB0aGUgcGx1Z2luIGFsbG93cyBpdC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbHVnaW4ubm9ybWFsaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IHBsdWdpbi5ub3JtYWxpemUobmFtZSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZShuYW1lLCBwYXJlbnROYW1lLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9wcmVmaXggYW5kIG5hbWUgc2hvdWxkIGFscmVhZHkgYmUgbm9ybWFsaXplZCwgbm8gbmVlZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy9mb3IgYXBwbHlpbmcgbWFwIGNvbmZpZyBhZ2FpbiBlaXRoZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkTWFwID0gbWFrZU1vZHVsZU1hcChtYXAucHJlZml4ICsgJyEnICsgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWFwLnBhcmVudE1hcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb24obm9ybWFsaXplZE1hcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGVmaW5lZCcsIGJpbmQodGhpcywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWFwLm5vcm1hbGl6ZWRNYXAgPSBub3JtYWxpemVkTWFwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXQoW10sIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHZhbHVlOyB9LCBudWxsLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWdub3JlOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbm9ybWFsaXplZE1vZCA9IGdldE93bihyZWdpc3RyeSwgbm9ybWFsaXplZE1hcC5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9ybWFsaXplZE1vZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vTWFyayB0aGlzIGFzIGEgZGVwZW5kZW5jeSBmb3IgdGhpcyBwbHVnaW4sIHNvIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9jYW4gYmUgdHJhY2VkIGZvciBjeWNsZXMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXBNYXBzLnB1c2gobm9ybWFsaXplZE1hcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5ldmVudHMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9ybWFsaXplZE1vZC5vbignZXJyb3InLCBiaW5kKHRoaXMsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRNb2QuZW5hYmxlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vSWYgYSBwYXRocyBjb25maWcsIHRoZW4ganVzdCBsb2FkIHRoYXQgZmlsZSBpbnN0ZWFkIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vcmVzb2x2ZSB0aGUgcGx1Z2luLCBhcyBpdCBpcyBidWlsdCBpbnRvIHRoYXQgcGF0aHMgbGF5ZXIuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidW5kbGVJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXAudXJsID0gY29udGV4dC5uYW1lVG9VcmwoYnVuZGxlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsb2FkID0gYmluZCh0aGlzLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5pdChbXSwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdmFsdWU7IH0sIG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbG9hZC5lcnJvciA9IGJpbmQodGhpcywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvciA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVyci5yZXF1aXJlTW9kdWxlcyA9IFtpZF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vUmVtb3ZlIHRlbXAgdW5ub3JtYWxpemVkIG1vZHVsZXMgZm9yIHRoaXMgbW9kdWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zaW5jZSB0aGV5IHdpbGwgbmV2ZXIgYmUgcmVzb2x2ZWQgb3RoZXJ3aXNlIG5vdy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2hQcm9wKHJlZ2lzdHJ5LCBmdW5jdGlvbiAobW9kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vZC5tYXAuaWQuaW5kZXhPZihpZCArICdfdW5ub3JtYWxpemVkJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYW5SZWdpc3RyeShtb2QubWFwLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgb25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvL0FsbG93IHBsdWdpbnMgdG8gbG9hZCBvdGhlciBjb2RlIHdpdGhvdXQgaGF2aW5nIHRvIGtub3cgdGhlXG4gICAgICAgICAgICAgICAgICAgIC8vY29udGV4dCBvciBob3cgdG8gJ2NvbXBsZXRlJyB0aGUgbG9hZC5cbiAgICAgICAgICAgICAgICAgICAgbG9hZC5mcm9tVGV4dCA9IGJpbmQodGhpcywgZnVuY3Rpb24gKHRleHQsIHRleHRBbHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8qanNsaW50IGV2aWw6IHRydWUgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtb2R1bGVOYW1lID0gbWFwLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTWFwID0gbWFrZU1vZHVsZU1hcChtb2R1bGVOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNJbnRlcmFjdGl2ZSA9IHVzZUludGVyYWN0aXZlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0FzIG9mIDIuMS4wLCBzdXBwb3J0IGp1c3QgcGFzc2luZyB0aGUgdGV4dCwgdG8gcmVpbmZvcmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2Zyb21UZXh0IG9ubHkgYmVpbmcgY2FsbGVkIG9uY2UgcGVyIHJlc291cmNlLiBTdGlsbFxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zdXBwb3J0IG9sZCBzdHlsZSBvZiBwYXNzaW5nIG1vZHVsZU5hbWUgYnV0IGRpc2NhcmRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGhhdCBtb2R1bGVOYW1lIGluIGZhdm9yIG9mIHRoZSBpbnRlcm5hbCByZWYuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGV4dEFsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgPSB0ZXh0QWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1R1cm4gb2ZmIGludGVyYWN0aXZlIHNjcmlwdCBtYXRjaGluZyBmb3IgSUUgZm9yIGFueSBkZWZpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY2FsbHMgaW4gdGhlIHRleHQsIHRoZW4gdHVybiBpdCBiYWNrIG9uIGF0IHRoZSBlbmQuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzSW50ZXJhY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1ByaW1lIHRoZSBzeXN0ZW0gYnkgY3JlYXRpbmcgYSBtb2R1bGUgaW5zdGFuY2UgZm9yXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2l0LlxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0TW9kdWxlKG1vZHVsZU1hcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVHJhbnNmZXIgYW55IGNvbmZpZyB0byB0aGlzIG90aGVyIG1vZHVsZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNQcm9wKGNvbmZpZy5jb25maWcsIGlkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5jb25maWdbbW9kdWxlTmFtZV0gPSBjb25maWcuY29uZmlnW2lkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXEuZXhlYyh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb25FcnJvcihtYWtlRXJyb3IoJ2Zyb210ZXh0ZXZhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZnJvbVRleHQgZXZhbCBmb3IgJyArIGlkICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyBmYWlsZWQ6ICcgKyBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtpZF0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0ludGVyYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL01hcmsgdGhpcyBhcyBhIGRlcGVuZGVuY3kgZm9yIHRoZSBwbHVnaW5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vcmVzb3VyY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVwTWFwcy5wdXNoKG1vZHVsZU1hcCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3VwcG9ydCBhbm9ueW1vdXMgbW9kdWxlcy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuY29tcGxldGVMb2FkKG1vZHVsZU5hbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0JpbmQgdGhlIHZhbHVlIG9mIHRoYXQgbW9kdWxlIHRvIHRoZSB2YWx1ZSBmb3IgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9yZXNvdXJjZSBJRC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsUmVxdWlyZShbbW9kdWxlTmFtZV0sIGxvYWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvL1VzZSBwYXJlbnROYW1lIGhlcmUgc2luY2UgdGhlIHBsdWdpbidzIG5hbWUgaXMgbm90IHJlbGlhYmxlLFxuICAgICAgICAgICAgICAgICAgICAvL2NvdWxkIGJlIHNvbWUgd2VpcmQgc3RyaW5nIHdpdGggbm8gcGF0aCB0aGF0IGFjdHVhbGx5IHdhbnRzIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vcmVmZXJlbmNlIHRoZSBwYXJlbnROYW1lJ3MgcGF0aC5cbiAgICAgICAgICAgICAgICAgICAgcGx1Z2luLmxvYWQobWFwLm5hbWUsIGxvY2FsUmVxdWlyZSwgbG9hZCwgY29uZmlnKTtcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0LmVuYWJsZShwbHVnaW5NYXAsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luTWFwc1twbHVnaW5NYXAuaWRdID0gcGx1Z2luTWFwO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZW5hYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZW5hYmxlZFJlZ2lzdHJ5W3RoaXMubWFwLmlkXSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIC8vU2V0IGZsYWcgbWVudGlvbmluZyB0aGF0IHRoZSBtb2R1bGUgaXMgZW5hYmxpbmcsXG4gICAgICAgICAgICAgICAgLy9zbyB0aGF0IGltbWVkaWF0ZSBjYWxscyB0byB0aGUgZGVmaW5lZCBjYWxsYmFja3NcbiAgICAgICAgICAgICAgICAvL2ZvciBkZXBlbmRlbmNpZXMgZG8gbm90IHRyaWdnZXIgaW5hZHZlcnRlbnQgbG9hZFxuICAgICAgICAgICAgICAgIC8vd2l0aCB0aGUgZGVwQ291bnQgc3RpbGwgYmVpbmcgemVyby5cbiAgICAgICAgICAgICAgICB0aGlzLmVuYWJsaW5nID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIC8vRW5hYmxlIGVhY2ggZGVwZW5kZW5jeVxuICAgICAgICAgICAgICAgIGVhY2godGhpcy5kZXBNYXBzLCBiaW5kKHRoaXMsIGZ1bmN0aW9uIChkZXBNYXAsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlkLCBtb2QsIGhhbmRsZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBkZXBNYXAgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL0RlcGVuZGVuY3kgbmVlZHMgdG8gYmUgY29udmVydGVkIHRvIGEgZGVwTWFwXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FuZCB3aXJlZCB1cCB0byB0aGlzIG1vZHVsZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcE1hcCA9IG1ha2VNb2R1bGVNYXAoZGVwTWFwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5tYXAuaXNEZWZpbmUgPyB0aGlzLm1hcCA6IHRoaXMubWFwLnBhcmVudE1hcCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAhdGhpcy5za2lwTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVwTWFwc1tpXSA9IGRlcE1hcDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlciA9IGdldE93bihoYW5kbGVycywgZGVwTWFwLmlkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlcEV4cG9ydHNbaV0gPSBoYW5kbGVyKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXBDb3VudCArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBvbihkZXBNYXAsICdkZWZpbmVkJywgYmluZCh0aGlzLCBmdW5jdGlvbiAoZGVwRXhwb3J0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVuZGVmZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmluZURlcChpLCBkZXBFeHBvcnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmVycmJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbihkZXBNYXAsICdlcnJvcicsIGJpbmQodGhpcywgdGhpcy5lcnJiYWNrKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZXZlbnRzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gZGlyZWN0IGVycmJhY2sgb24gdGhpcyBtb2R1bGUsIGJ1dCBzb21ldGhpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBlbHNlIGlzIGxpc3RlbmluZyBmb3IgZXJyb3JzLCBzbyBiZSBzdXJlIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvcGFnYXRlIHRoZSBlcnJvciBjb3JyZWN0bHkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb24oZGVwTWFwLCAnZXJyb3InLCBiaW5kKHRoaXMsIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZCA9IGRlcE1hcC5pZDtcbiAgICAgICAgICAgICAgICAgICAgbW9kID0gcmVnaXN0cnlbaWRdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vU2tpcCBzcGVjaWFsIG1vZHVsZXMgbGlrZSAncmVxdWlyZScsICdleHBvcnRzJywgJ21vZHVsZSdcbiAgICAgICAgICAgICAgICAgICAgLy9BbHNvLCBkb24ndCBjYWxsIGVuYWJsZSBpZiBpdCBpcyBhbHJlYWR5IGVuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIC8vaW1wb3J0YW50IGluIGNpcmN1bGFyIGRlcGVuZGVuY3kgY2FzZXMuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzUHJvcChoYW5kbGVycywgaWQpICYmIG1vZCAmJiAhbW9kLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZW5hYmxlKGRlcE1hcCwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICAvL0VuYWJsZSBlYWNoIHBsdWdpbiB0aGF0IGlzIHVzZWQgaW5cbiAgICAgICAgICAgICAgICAvL2EgZGVwZW5kZW5jeVxuICAgICAgICAgICAgICAgIGVhY2hQcm9wKHRoaXMucGx1Z2luTWFwcywgYmluZCh0aGlzLCBmdW5jdGlvbiAocGx1Z2luTWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtb2QgPSBnZXRPd24ocmVnaXN0cnksIHBsdWdpbk1hcC5pZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2QgJiYgIW1vZC5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmVuYWJsZShwbHVnaW5NYXAsIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5lbmFibGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVjaygpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb246IGZ1bmN0aW9uIChuYW1lLCBjYikge1xuICAgICAgICAgICAgICAgIHZhciBjYnMgPSB0aGlzLmV2ZW50c1tuYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAoIWNicykge1xuICAgICAgICAgICAgICAgICAgICBjYnMgPSB0aGlzLmV2ZW50c1tuYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYnMucHVzaChjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBlbWl0OiBmdW5jdGlvbiAobmFtZSwgZXZ0KSB7XG4gICAgICAgICAgICAgICAgZWFjaCh0aGlzLmV2ZW50c1tuYW1lXSwgZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKGV2dCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9Ob3cgdGhhdCB0aGUgZXJyb3IgaGFuZGxlciB3YXMgdHJpZ2dlcmVkLCByZW1vdmVcbiAgICAgICAgICAgICAgICAgICAgLy90aGUgbGlzdGVuZXJzLCBzaW5jZSB0aGlzIGJyb2tlbiBNb2R1bGUgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICAgICAgLy9jYW4gc3RheSBhcm91bmQgZm9yIGEgd2hpbGUgaW4gdGhlIHJlZ2lzdHJ5LlxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5ldmVudHNbbmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGxHZXRNb2R1bGUoYXJncykge1xuICAgICAgICAgICAgLy9Ta2lwIG1vZHVsZXMgYWxyZWFkeSBkZWZpbmVkLlxuICAgICAgICAgICAgaWYgKCFoYXNQcm9wKGRlZmluZWQsIGFyZ3NbMF0pKSB7XG4gICAgICAgICAgICAgICAgZ2V0TW9kdWxlKG1ha2VNb2R1bGVNYXAoYXJnc1swXSwgbnVsbCwgdHJ1ZSkpLmluaXQoYXJnc1sxXSwgYXJnc1syXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihub2RlLCBmdW5jLCBuYW1lLCBpZU5hbWUpIHtcbiAgICAgICAgICAgIC8vRmF2b3IgZGV0YWNoRXZlbnQgYmVjYXVzZSBvZiBJRTlcbiAgICAgICAgICAgIC8vaXNzdWUsIHNlZSBhdHRhY2hFdmVudC9hZGRFdmVudExpc3RlbmVyIGNvbW1lbnQgZWxzZXdoZXJlXG4gICAgICAgICAgICAvL2luIHRoaXMgZmlsZS5cbiAgICAgICAgICAgIGlmIChub2RlLmRldGFjaEV2ZW50ICYmICFpc09wZXJhKSB7XG4gICAgICAgICAgICAgICAgLy9Qcm9iYWJseSBJRS4gSWYgbm90IGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IsIHdoaWNoIHdpbGwgYmVcbiAgICAgICAgICAgICAgICAvL3VzZWZ1bCB0byBrbm93LlxuICAgICAgICAgICAgICAgIGlmIChpZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5kZXRhY2hFdmVudChpZU5hbWUsIGZ1bmMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGZ1bmMsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHaXZlbiBhbiBldmVudCBmcm9tIGEgc2NyaXB0IG5vZGUsIGdldCB0aGUgcmVxdWlyZWpzIGluZm8gZnJvbSBpdCxcbiAgICAgICAgICogYW5kIHRoZW4gcmVtb3ZlcyB0aGUgZXZlbnQgbGlzdGVuZXJzIG9uIHRoZSBub2RlLlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBldnRcbiAgICAgICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldFNjcmlwdERhdGEoZXZ0KSB7XG4gICAgICAgICAgICAvL1VzaW5nIGN1cnJlbnRUYXJnZXQgaW5zdGVhZCBvZiB0YXJnZXQgZm9yIEZpcmVmb3ggMi4wJ3Mgc2FrZS4gTm90XG4gICAgICAgICAgICAvL2FsbCBvbGQgYnJvd3NlcnMgd2lsbCBiZSBzdXBwb3J0ZWQsIGJ1dCB0aGlzIG9uZSB3YXMgZWFzeSBlbm91Z2hcbiAgICAgICAgICAgIC8vdG8gc3VwcG9ydCBhbmQgc3RpbGwgbWFrZXMgc2Vuc2UuXG4gICAgICAgICAgICB2YXIgbm9kZSA9IGV2dC5jdXJyZW50VGFyZ2V0IHx8IGV2dC5zcmNFbGVtZW50O1xuXG4gICAgICAgICAgICAvL1JlbW92ZSB0aGUgbGlzdGVuZXJzIG9uY2UgaGVyZS5cbiAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKG5vZGUsIGNvbnRleHQub25TY3JpcHRMb2FkLCAnbG9hZCcsICdvbnJlYWR5c3RhdGVjaGFuZ2UnKTtcbiAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKG5vZGUsIGNvbnRleHQub25TY3JpcHRFcnJvciwgJ2Vycm9yJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICBpZDogbm9kZSAmJiBub2RlLmdldEF0dHJpYnV0ZSgnZGF0YS1yZXF1aXJlbW9kdWxlJylcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpbnRha2VEZWZpbmVzKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3M7XG5cbiAgICAgICAgICAgIC8vQW55IGRlZmluZWQgbW9kdWxlcyBpbiB0aGUgZ2xvYmFsIHF1ZXVlLCBpbnRha2UgdGhlbSBub3cuXG4gICAgICAgICAgICB0YWtlR2xvYmFsUXVldWUoKTtcblxuICAgICAgICAgICAgLy9NYWtlIHN1cmUgYW55IHJlbWFpbmluZyBkZWZRdWV1ZSBpdGVtcyBnZXQgcHJvcGVybHkgcHJvY2Vzc2VkLlxuICAgICAgICAgICAgd2hpbGUgKGRlZlF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGFyZ3MgPSBkZWZRdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzWzBdID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvbkVycm9yKG1ha2VFcnJvcignbWlzbWF0Y2gnLCAnTWlzbWF0Y2hlZCBhbm9ueW1vdXMgZGVmaW5lKCkgbW9kdWxlOiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbYXJncy5sZW5ndGggLSAxXSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vYXJncyBhcmUgaWQsIGRlcHMsIGZhY3RvcnkuIFNob3VsZCBiZSBub3JtYWxpemVkIGJ5IHRoZVxuICAgICAgICAgICAgICAgICAgICAvL2RlZmluZSgpIGZ1bmN0aW9uLlxuICAgICAgICAgICAgICAgICAgICBjYWxsR2V0TW9kdWxlKGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRleHQuZGVmUXVldWVNYXAgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQgPSB7XG4gICAgICAgICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgICAgICAgIGNvbnRleHROYW1lOiBjb250ZXh0TmFtZSxcbiAgICAgICAgICAgIHJlZ2lzdHJ5OiByZWdpc3RyeSxcbiAgICAgICAgICAgIGRlZmluZWQ6IGRlZmluZWQsXG4gICAgICAgICAgICB1cmxGZXRjaGVkOiB1cmxGZXRjaGVkLFxuICAgICAgICAgICAgZGVmUXVldWU6IGRlZlF1ZXVlLFxuICAgICAgICAgICAgZGVmUXVldWVNYXA6IHt9LFxuICAgICAgICAgICAgTW9kdWxlOiBNb2R1bGUsXG4gICAgICAgICAgICBtYWtlTW9kdWxlTWFwOiBtYWtlTW9kdWxlTWFwLFxuICAgICAgICAgICAgbmV4dFRpY2s6IHJlcS5uZXh0VGljayxcbiAgICAgICAgICAgIG9uRXJyb3I6IG9uRXJyb3IsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IGEgY29uZmlndXJhdGlvbiBmb3IgdGhlIGNvbnRleHQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gY2ZnIGNvbmZpZyBvYmplY3QgdG8gaW50ZWdyYXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjb25maWd1cmU6IGZ1bmN0aW9uIChjZmcpIHtcbiAgICAgICAgICAgICAgICAvL01ha2Ugc3VyZSB0aGUgYmFzZVVybCBlbmRzIGluIGEgc2xhc2guXG4gICAgICAgICAgICAgICAgaWYgKGNmZy5iYXNlVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYmFzZVVybC5jaGFyQXQoY2ZnLmJhc2VVcmwubGVuZ3RoIC0gMSkgIT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ZnLmJhc2VVcmwgKz0gJy8nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ29udmVydCBvbGQgc3R5bGUgdXJsQXJncyBzdHJpbmcgdG8gYSBmdW5jdGlvbi5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNmZy51cmxBcmdzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXJsQXJncyA9IGNmZy51cmxBcmdzO1xuICAgICAgICAgICAgICAgICAgICBjZmcudXJsQXJncyA9IGZ1bmN0aW9uKGlkLCB1cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAodXJsLmluZGV4T2YoJz8nKSA9PT0gLTEgPyAnPycgOiAnJicpICsgdXJsQXJncztcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL1NhdmUgb2ZmIHRoZSBwYXRocyBzaW5jZSB0aGV5IHJlcXVpcmUgc3BlY2lhbCBwcm9jZXNzaW5nLFxuICAgICAgICAgICAgICAgIC8vdGhleSBhcmUgYWRkaXRpdmUuXG4gICAgICAgICAgICAgICAgdmFyIHNoaW0gPSBjb25maWcuc2hpbSxcbiAgICAgICAgICAgICAgICAgICAgb2JqcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGhzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYnVuZGxlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgZWFjaFByb3AoY2ZnLCBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9ianNbcHJvcF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29uZmlnW3Byb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnW3Byb3BdID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXhpbihjb25maWdbcHJvcF0sIHZhbHVlLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ1twcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL1JldmVyc2UgbWFwIHRoZSBidW5kbGVzXG4gICAgICAgICAgICAgICAgaWYgKGNmZy5idW5kbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhY2hQcm9wKGNmZy5idW5kbGVzLCBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2godmFsdWUsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYgIT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVuZGxlc01hcFt2XSA9IHByb3A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vTWVyZ2Ugc2hpbVxuICAgICAgICAgICAgICAgIGlmIChjZmcuc2hpbSkge1xuICAgICAgICAgICAgICAgICAgICBlYWNoUHJvcChjZmcuc2hpbSwgZnVuY3Rpb24gKHZhbHVlLCBpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9Ob3JtYWxpemUgdGhlIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcHM6IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgodmFsdWUuZXhwb3J0cyB8fCB2YWx1ZS5pbml0KSAmJiAhdmFsdWUuZXhwb3J0c0ZuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUuZXhwb3J0c0ZuID0gY29udGV4dC5tYWtlU2hpbUV4cG9ydHModmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2hpbVtpZF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5zaGltID0gc2hpbTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL0FkanVzdCBwYWNrYWdlcyBpZiBuZWNlc3NhcnkuXG4gICAgICAgICAgICAgICAgaWYgKGNmZy5wYWNrYWdlcykge1xuICAgICAgICAgICAgICAgICAgICBlYWNoKGNmZy5wYWNrYWdlcywgZnVuY3Rpb24gKHBrZ09iaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uLCBuYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBwa2dPYmogPSB0eXBlb2YgcGtnT2JqID09PSAnc3RyaW5nJyA/IHtuYW1lOiBwa2dPYmp9IDogcGtnT2JqO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gcGtnT2JqLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbiA9IHBrZ09iai5sb2NhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5wYXRoc1tuYW1lXSA9IHBrZ09iai5sb2NhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TYXZlIHBvaW50ZXIgdG8gbWFpbiBtb2R1bGUgSUQgZm9yIHBrZyBuYW1lLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy9SZW1vdmUgbGVhZGluZyBkb3QgaW4gbWFpbiwgc28gbWFpbiBwYXRocyBhcmUgbm9ybWFsaXplZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYW5kIHJlbW92ZSBhbnkgdHJhaWxpbmcgLmpzLCBzaW5jZSBkaWZmZXJlbnQgcGFja2FnZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9lbnZzIGhhdmUgZGlmZmVyZW50IGNvbnZlbnRpb25zOiBzb21lIHVzZSBhIG1vZHVsZSBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zb21lIHVzZSBhIGZpbGUgbmFtZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5wa2dzW25hbWVdID0gcGtnT2JqLm5hbWUgKyAnLycgKyAocGtnT2JqLm1haW4gfHwgJ21haW4nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKGN1cnJEaXJSZWdFeHAsICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKGpzU3VmZml4UmVnRXhwLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vSWYgdGhlcmUgYXJlIGFueSBcIndhaXRpbmcgdG8gZXhlY3V0ZVwiIG1vZHVsZXMgaW4gdGhlIHJlZ2lzdHJ5LFxuICAgICAgICAgICAgICAgIC8vdXBkYXRlIHRoZSBtYXBzIGZvciB0aGVtLCBzaW5jZSB0aGVpciBpbmZvLCBsaWtlIFVSTHMgdG8gbG9hZCxcbiAgICAgICAgICAgICAgICAvL21heSBoYXZlIGNoYW5nZWQuXG4gICAgICAgICAgICAgICAgZWFjaFByb3AocmVnaXN0cnksIGZ1bmN0aW9uIChtb2QsIGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vSWYgbW9kdWxlIGFscmVhZHkgaGFzIGluaXQgY2FsbGVkLCBzaW5jZSBpdCBpcyB0b29cbiAgICAgICAgICAgICAgICAgICAgLy9sYXRlIHRvIG1vZGlmeSB0aGVtLCBhbmQgaWdub3JlIHVubm9ybWFsaXplZCBvbmVzXG4gICAgICAgICAgICAgICAgICAgIC8vc2luY2UgdGhleSBhcmUgdHJhbnNpZW50LlxuICAgICAgICAgICAgICAgICAgICBpZiAoIW1vZC5pbml0ZWQgJiYgIW1vZC5tYXAudW5ub3JtYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2QubWFwID0gbWFrZU1vZHVsZU1hcChpZCwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vSWYgYSBkZXBzIGFycmF5IG9yIGEgY29uZmlnIGNhbGxiYWNrIGlzIHNwZWNpZmllZCwgdGhlbiBjYWxsXG4gICAgICAgICAgICAgICAgLy9yZXF1aXJlIHdpdGggdGhvc2UgYXJncy4gVGhpcyBpcyB1c2VmdWwgd2hlbiByZXF1aXJlIGlzIGRlZmluZWQgYXMgYVxuICAgICAgICAgICAgICAgIC8vY29uZmlnIG9iamVjdCBiZWZvcmUgcmVxdWlyZS5qcyBpcyBsb2FkZWQuXG4gICAgICAgICAgICAgICAgaWYgKGNmZy5kZXBzIHx8IGNmZy5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnJlcXVpcmUoY2ZnLmRlcHMgfHwgW10sIGNmZy5jYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbWFrZVNoaW1FeHBvcnRzOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBmbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmluaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IHZhbHVlLmluaXQuYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQgfHwgKHZhbHVlLmV4cG9ydHMgJiYgZ2V0R2xvYmFsKHZhbHVlLmV4cG9ydHMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbWFrZVJlcXVpcmU6IGZ1bmN0aW9uIChyZWxNYXAsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGxvY2FsUmVxdWlyZShkZXBzLCBjYWxsYmFjaywgZXJyYmFjaykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaWQsIG1hcCwgcmVxdWlyZU1vZDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5lbmFibGVCdWlsZENhbGxiYWNrICYmIGNhbGxiYWNrICYmIGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5fX3JlcXVpcmVKc0J1aWxkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZGVwcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vSW52YWxpZCBjYWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uRXJyb3IobWFrZUVycm9yKCdyZXF1aXJlYXJncycsICdJbnZhbGlkIHJlcXVpcmUgY2FsbCcpLCBlcnJiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9JZiByZXF1aXJlfGV4cG9ydHN8bW9kdWxlIGFyZSByZXF1ZXN0ZWQsIGdldCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdmFsdWUgZm9yIHRoZW0gZnJvbSB0aGUgc3BlY2lhbCBoYW5kbGVycy4gQ2F2ZWF0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy90aGlzIG9ubHkgd29ya3Mgd2hpbGUgbW9kdWxlIGlzIGJlaW5nIGRlZmluZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVsTWFwICYmIGhhc1Byb3AoaGFuZGxlcnMsIGRlcHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJzW2RlcHNdKHJlZ2lzdHJ5W3JlbE1hcC5pZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmNocm9ub3VzIGFjY2VzcyB0byBvbmUgbW9kdWxlLiBJZiByZXF1aXJlLmdldCBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9hdmFpbGFibGUgKGFzIGluIHRoZSBOb2RlIGFkYXB0ZXIpLCBwcmVmZXIgdGhhdC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXEuZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcS5nZXQoY29udGV4dCwgZGVwcywgcmVsTWFwLCBsb2NhbFJlcXVpcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL05vcm1hbGl6ZSBtb2R1bGUgbmFtZSwgaWYgaXQgY29udGFpbnMgLiBvciAuLlxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwID0gbWFrZU1vZHVsZU1hcChkZXBzLCByZWxNYXAsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkID0gbWFwLmlkO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc1Byb3AoZGVmaW5lZCwgaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uRXJyb3IobWFrZUVycm9yKCdub3Rsb2FkZWQnLCAnTW9kdWxlIG5hbWUgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1wiIGhhcyBub3QgYmVlbiBsb2FkZWQgeWV0IGZvciBjb250ZXh0OiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0TmFtZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHJlbE1hcCA/ICcnIDogJy4gVXNlIHJlcXVpcmUoW10pJykpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkZWZpbmVkW2lkXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vR3JhYiBkZWZpbmVzIHdhaXRpbmcgaW4gdGhlIGdsb2JhbCBxdWV1ZS5cbiAgICAgICAgICAgICAgICAgICAgaW50YWtlRGVmaW5lcygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vTWFyayBhbGwgdGhlIGRlcGVuZGVuY2llcyBhcyBuZWVkaW5nIHRvIGJlIGxvYWRlZC5cbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NvbWUgZGVmaW5lcyBjb3VsZCBoYXZlIGJlZW4gYWRkZWQgc2luY2UgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3JlcXVpcmUgY2FsbCwgY29sbGVjdCB0aGVtLlxuICAgICAgICAgICAgICAgICAgICAgICAgaW50YWtlRGVmaW5lcygpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlTW9kID0gZ2V0TW9kdWxlKG1ha2VNb2R1bGVNYXAobnVsbCwgcmVsTWFwKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3RvcmUgaWYgbWFwIGNvbmZpZyBzaG91bGQgYmUgYXBwbGllZCB0byB0aGlzIHJlcXVpcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY2FsbCBmb3IgZGVwZW5kZW5jaWVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZU1vZC5za2lwTWFwID0gb3B0aW9ucy5za2lwTWFwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlTW9kLmluaXQoZGVwcywgY2FsbGJhY2ssIGVycmJhY2ssIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tMb2FkZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2FsUmVxdWlyZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtaXhpbihsb2NhbFJlcXVpcmUsIHtcbiAgICAgICAgICAgICAgICAgICAgaXNCcm93c2VyOiBpc0Jyb3dzZXIsXG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIENvbnZlcnRzIGEgbW9kdWxlIG5hbWUgKyAuZXh0ZW5zaW9uIGludG8gYW4gVVJMIHBhdGguXG4gICAgICAgICAgICAgICAgICAgICAqICpSZXF1aXJlcyogdGhlIHVzZSBvZiBhIG1vZHVsZSBuYW1lLiBJdCBkb2VzIG5vdCBzdXBwb3J0IHVzaW5nXG4gICAgICAgICAgICAgICAgICAgICAqIHBsYWluIFVSTHMgbGlrZSBuYW1lVG9VcmwuXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICB0b1VybDogZnVuY3Rpb24gKG1vZHVsZU5hbWVQbHVzRXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gbW9kdWxlTmFtZVBsdXNFeHQubGFzdEluZGV4T2YoJy4nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWdtZW50ID0gbW9kdWxlTmFtZVBsdXNFeHQuc3BsaXQoJy8nKVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1JlbGF0aXZlID0gc2VnbWVudCA9PT0gJy4nIHx8IHNlZ21lbnQgPT09ICcuLic7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSGF2ZSBhIGZpbGUgZXh0ZW5zaW9uIGFsaWFzLCBhbmQgaXQgaXMgbm90IHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9kb3RzIGZyb20gYSByZWxhdGl2ZSBwYXRoLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSAmJiAoIWlzUmVsYXRpdmUgfHwgaW5kZXggPiAxKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dCA9IG1vZHVsZU5hbWVQbHVzRXh0LnN1YnN0cmluZyhpbmRleCwgbW9kdWxlTmFtZVBsdXNFeHQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lUGx1c0V4dCA9IG1vZHVsZU5hbWVQbHVzRXh0LnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0Lm5hbWVUb1VybChub3JtYWxpemUobW9kdWxlTmFtZVBsdXNFeHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxNYXAgJiYgcmVsTWFwLmlkLCB0cnVlKSwgZXh0LCAgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAgICAgZGVmaW5lZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFzUHJvcChkZWZpbmVkLCBtYWtlTW9kdWxlTWFwKGlkLCByZWxNYXAsIGZhbHNlLCB0cnVlKS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkID0gbWFrZU1vZHVsZU1hcChpZCwgcmVsTWFwLCBmYWxzZSwgdHJ1ZSkuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFzUHJvcChkZWZpbmVkLCBpZCkgfHwgaGFzUHJvcChyZWdpc3RyeSwgaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL09ubHkgYWxsb3cgdW5kZWYgb24gdG9wIGxldmVsIHJlcXVpcmUgY2FsbHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlbE1hcCkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFJlcXVpcmUudW5kZWYgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQmluZCBhbnkgd2FpdGluZyBkZWZpbmUoKSBjYWxscyB0byB0aGlzIGNvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2ZpeCBmb3IgIzQwOFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFrZUdsb2JhbFF1ZXVlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBtYWtlTW9kdWxlTWFwKGlkLCByZWxNYXAsIHRydWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZCA9IGdldE93bihyZWdpc3RyeSwgaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2QudW5kZWZlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVTY3JpcHQoaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGVmaW5lZFtpZF07XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdXJsRmV0Y2hlZFttYXAudXJsXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB1bmRlZkV2ZW50c1tpZF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQ2xlYW4gcXVldWVkIGRlZmluZXMgdG9vLiBHbyBiYWNrd2FyZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vaW4gYXJyYXkgc28gdGhhdCB0aGUgc3BsaWNlcyBkbyBub3RcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vbWVzcyB1cCB0aGUgaXRlcmF0aW9uLlxuICAgICAgICAgICAgICAgICAgICAgICAgZWFjaFJldmVyc2UoZGVmUXVldWUsIGZ1bmN0aW9uKGFyZ3MsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJnc1swXSA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmUXVldWUuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbnRleHQuZGVmUXVldWVNYXBbaWRdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Ib2xkIG9uIHRvIGxpc3RlbmVycyBpbiBjYXNlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vbW9kdWxlIHdpbGwgYmUgYXR0ZW1wdGVkIHRvIGJlIHJlbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy91c2luZyBhIGRpZmZlcmVudCBjb25maWcuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vZC5ldmVudHMuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZkV2ZW50c1tpZF0gPSBtb2QuZXZlbnRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFuUmVnaXN0cnkoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhbFJlcXVpcmU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENhbGxlZCB0byBlbmFibGUgYSBtb2R1bGUgaWYgaXQgaXMgc3RpbGwgaW4gdGhlIHJlZ2lzdHJ5XG4gICAgICAgICAgICAgKiBhd2FpdGluZyBlbmFibGVtZW50LiBBIHNlY29uZCBhcmcsIHBhcmVudCwgdGhlIHBhcmVudCBtb2R1bGUsXG4gICAgICAgICAgICAgKiBpcyBwYXNzZWQgaW4gZm9yIGNvbnRleHQsIHdoZW4gdGhpcyBtZXRob2QgaXMgb3ZlcnJpZGRlbiBieVxuICAgICAgICAgICAgICogdGhlIG9wdGltaXplci4gTm90IHNob3duIGhlcmUgdG8ga2VlcCBjb2RlIGNvbXBhY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVuYWJsZTogZnVuY3Rpb24gKGRlcE1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBtb2QgPSBnZXRPd24ocmVnaXN0cnksIGRlcE1hcC5pZCk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZCkge1xuICAgICAgICAgICAgICAgICAgICBnZXRNb2R1bGUoZGVwTWFwKS5lbmFibGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEludGVybmFsIG1ldGhvZCB1c2VkIGJ5IGVudmlyb25tZW50IGFkYXB0ZXJzIHRvIGNvbXBsZXRlIGEgbG9hZCBldmVudC5cbiAgICAgICAgICAgICAqIEEgbG9hZCBldmVudCBjb3VsZCBiZSBhIHNjcmlwdCBsb2FkIG9yIGp1c3QgYSBsb2FkIHBhc3MgZnJvbSBhIHN5bmNocm9ub3VzXG4gICAgICAgICAgICAgKiBsb2FkIGNhbGwuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbW9kdWxlTmFtZSB0aGUgbmFtZSBvZiB0aGUgbW9kdWxlIHRvIHBvdGVudGlhbGx5IGNvbXBsZXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjb21wbGV0ZUxvYWQ6IGZ1bmN0aW9uIChtb2R1bGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kLCBhcmdzLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgIHNoaW0gPSBnZXRPd24oY29uZmlnLnNoaW0sIG1vZHVsZU5hbWUpIHx8IHt9LFxuICAgICAgICAgICAgICAgICAgICBzaEV4cG9ydHMgPSBzaGltLmV4cG9ydHM7XG5cbiAgICAgICAgICAgICAgICB0YWtlR2xvYmFsUXVldWUoKTtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChkZWZRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncyA9IGRlZlF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzWzBdID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzWzBdID0gbW9kdWxlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSWYgYWxyZWFkeSBmb3VuZCBhbiBhbm9ueW1vdXMgbW9kdWxlIGFuZCBib3VuZCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgLy90byB0aGlzIG5hbWUsIHRoZW4gdGhpcyBpcyBzb21lIG90aGVyIGFub24gbW9kdWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3dhaXRpbmcgZm9yIGl0cyBjb21wbGV0ZUxvYWQgdG8gZmlyZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFyZ3NbMF0gPT09IG1vZHVsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vRm91bmQgbWF0Y2hpbmcgZGVmaW5lIGNhbGwgZm9yIHRoaXMgc2NyaXB0IVxuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbEdldE1vZHVsZShhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGV4dC5kZWZRdWV1ZU1hcCA9IHt9O1xuXG4gICAgICAgICAgICAgICAgLy9EbyB0aGlzIGFmdGVyIHRoZSBjeWNsZSBvZiBjYWxsR2V0TW9kdWxlIGluIGNhc2UgdGhlIHJlc3VsdFxuICAgICAgICAgICAgICAgIC8vb2YgdGhvc2UgY2FsbHMvaW5pdCBjYWxscyBjaGFuZ2VzIHRoZSByZWdpc3RyeS5cbiAgICAgICAgICAgICAgICBtb2QgPSBnZXRPd24ocmVnaXN0cnksIG1vZHVsZU5hbWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFmb3VuZCAmJiAhaGFzUHJvcChkZWZpbmVkLCBtb2R1bGVOYW1lKSAmJiBtb2QgJiYgIW1vZC5pbml0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5lbmZvcmNlRGVmaW5lICYmICghc2hFeHBvcnRzIHx8ICFnZXRHbG9iYWwoc2hFeHBvcnRzKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNQYXRoRmFsbGJhY2sobW9kdWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvbkVycm9yKG1ha2VFcnJvcignbm9kZWZpbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ05vIGRlZmluZSBjYWxsIGZvciAnICsgbW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbbW9kdWxlTmFtZV0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQSBzY3JpcHQgdGhhdCBkb2VzIG5vdCBjYWxsIGRlZmluZSgpLCBzbyBqdXN0IHNpbXVsYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3RoZSBjYWxsIGZvciBpdC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxHZXRNb2R1bGUoW21vZHVsZU5hbWUsIChzaGltLmRlcHMgfHwgW10pLCBzaGltLmV4cG9ydHNGbl0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2hlY2tMb2FkZWQoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgYSBtb2R1bGUgbmFtZSB0byBhIGZpbGUgcGF0aC4gU3VwcG9ydHMgY2FzZXMgd2hlcmVcbiAgICAgICAgICAgICAqIG1vZHVsZU5hbWUgbWF5IGFjdHVhbGx5IGJlIGp1c3QgYW4gVVJMLlxuICAgICAgICAgICAgICogTm90ZSB0aGF0IGl0ICoqZG9lcyBub3QqKiBjYWxsIG5vcm1hbGl6ZSBvbiB0aGUgbW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAqIGl0IGlzIGFzc3VtZWQgdG8gaGF2ZSBhbHJlYWR5IGJlZW4gbm9ybWFsaXplZC4gVGhpcyBpcyBhblxuICAgICAgICAgICAgICogaW50ZXJuYWwgQVBJLCBub3QgYSBwdWJsaWMgb25lLiBVc2UgdG9VcmwgZm9yIHRoZSBwdWJsaWMgQVBJLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBuYW1lVG9Vcmw6IGZ1bmN0aW9uIChtb2R1bGVOYW1lLCBleHQsIHNraXBFeHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aHMsIHN5bXMsIGksIHBhcmVudE1vZHVsZSwgdXJsLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRQYXRoLCBidW5kbGVJZCxcbiAgICAgICAgICAgICAgICAgICAgcGtnTWFpbiA9IGdldE93bihjb25maWcucGtncywgbW9kdWxlTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocGtnTWFpbikge1xuICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lID0gcGtnTWFpbjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBidW5kbGVJZCA9IGdldE93bihidW5kbGVzTWFwLCBtb2R1bGVOYW1lKTtcblxuICAgICAgICAgICAgICAgIGlmIChidW5kbGVJZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5uYW1lVG9VcmwoYnVuZGxlSWQsIGV4dCwgc2tpcEV4dCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9JZiBhIGNvbG9uIGlzIGluIHRoZSBVUkwsIGl0IGluZGljYXRlcyBhIHByb3RvY29sIGlzIHVzZWQgYW5kIGl0IGlzIGp1c3RcbiAgICAgICAgICAgICAgICAvL2FuIFVSTCB0byBhIGZpbGUsIG9yIGlmIGl0IHN0YXJ0cyB3aXRoIGEgc2xhc2gsIGNvbnRhaW5zIGEgcXVlcnkgYXJnIChpLmUuID8pXG4gICAgICAgICAgICAgICAgLy9vciBlbmRzIHdpdGggLmpzLCB0aGVuIGFzc3VtZSB0aGUgdXNlciBtZWFudCB0byB1c2UgYW4gdXJsIGFuZCBub3QgYSBtb2R1bGUgaWQuXG4gICAgICAgICAgICAgICAgLy9UaGUgc2xhc2ggaXMgaW1wb3J0YW50IGZvciBwcm90b2NvbC1sZXNzIFVSTHMgYXMgd2VsbCBhcyBmdWxsIHBhdGhzLlxuICAgICAgICAgICAgICAgIGlmIChyZXEuanNFeHRSZWdFeHAudGVzdChtb2R1bGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAvL0p1c3QgYSBwbGFpbiBwYXRoLCBub3QgbW9kdWxlIG5hbWUgbG9va3VwLCBzbyBqdXN0IHJldHVybiBpdC5cbiAgICAgICAgICAgICAgICAgICAgLy9BZGQgZXh0ZW5zaW9uIGlmIGl0IGlzIGluY2x1ZGVkLiBUaGlzIGlzIGEgYml0IHdvbmt5LCBvbmx5IG5vbi0uanMgdGhpbmdzIHBhc3NcbiAgICAgICAgICAgICAgICAgICAgLy9hbiBleHRlbnNpb24sIHRoaXMgbWV0aG9kIHByb2JhYmx5IG5lZWRzIHRvIGJlIHJld29ya2VkLlxuICAgICAgICAgICAgICAgICAgICB1cmwgPSBtb2R1bGVOYW1lICsgKGV4dCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9BIG1vZHVsZSB0aGF0IG5lZWRzIHRvIGJlIGNvbnZlcnRlZCB0byBhIHBhdGguXG4gICAgICAgICAgICAgICAgICAgIHBhdGhzID0gY29uZmlnLnBhdGhzO1xuXG4gICAgICAgICAgICAgICAgICAgIHN5bXMgPSBtb2R1bGVOYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vRm9yIGVhY2ggbW9kdWxlIG5hbWUgc2VnbWVudCwgc2VlIGlmIHRoZXJlIGlzIGEgcGF0aFxuICAgICAgICAgICAgICAgICAgICAvL3JlZ2lzdGVyZWQgZm9yIGl0LiBTdGFydCB3aXRoIG1vc3Qgc3BlY2lmaWMgbmFtZVxuICAgICAgICAgICAgICAgICAgICAvL2FuZCB3b3JrIHVwIGZyb20gaXQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IHN5bXMubGVuZ3RoOyBpID4gMDsgaSAtPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRNb2R1bGUgPSBzeW1zLnNsaWNlKDAsIGkpLmpvaW4oJy8nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50UGF0aCA9IGdldE93bihwYXRocywgcGFyZW50TW9kdWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnRQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9JZiBhbiBhcnJheSwgaXQgbWVhbnMgdGhlcmUgYXJlIGEgZmV3IGNob2ljZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9DaG9vc2UgdGhlIG9uZSB0aGF0IGlzIGRlc2lyZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShwYXJlbnRQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRQYXRoID0gcGFyZW50UGF0aFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ltcy5zcGxpY2UoMCwgaSwgcGFyZW50UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvL0pvaW4gdGhlIHBhdGggcGFydHMgdG9nZXRoZXIsIHRoZW4gZmlndXJlIG91dCBpZiBiYXNlVXJsIGlzIG5lZWRlZC5cbiAgICAgICAgICAgICAgICAgICAgdXJsID0gc3ltcy5qb2luKCcvJyk7XG4gICAgICAgICAgICAgICAgICAgIHVybCArPSAoZXh0IHx8ICgvXmRhdGFcXDp8XmJsb2JcXDp8XFw/Ly50ZXN0KHVybCkgfHwgc2tpcEV4dCA/ICcnIDogJy5qcycpKTtcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gKHVybC5jaGFyQXQoMCkgPT09ICcvJyB8fCB1cmwubWF0Y2goL15bXFx3XFwrXFwuXFwtXSs6LykgPyAnJyA6IGNvbmZpZy5iYXNlVXJsKSArIHVybDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlnLnVybEFyZ3MgJiYgIS9eYmxvYlxcOi8udGVzdCh1cmwpID9cbiAgICAgICAgICAgICAgICAgICAgICAgdXJsICsgY29uZmlnLnVybEFyZ3MobW9kdWxlTmFtZSwgdXJsKSA6IHVybDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vRGVsZWdhdGVzIHRvIHJlcS5sb2FkLiBCcm9rZW4gb3V0IGFzIGEgc2VwYXJhdGUgZnVuY3Rpb24gdG9cbiAgICAgICAgICAgIC8vYWxsb3cgb3ZlcnJpZGluZyBpbiB0aGUgb3B0aW1pemVyLlxuICAgICAgICAgICAgbG9hZDogZnVuY3Rpb24gKGlkLCB1cmwpIHtcbiAgICAgICAgICAgICAgICByZXEubG9hZChjb250ZXh0LCBpZCwgdXJsKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRXhlY3V0ZXMgYSBtb2R1bGUgY2FsbGJhY2sgZnVuY3Rpb24uIEJyb2tlbiBvdXQgYXMgYSBzZXBhcmF0ZSBmdW5jdGlvblxuICAgICAgICAgICAgICogc29sZWx5IHRvIGFsbG93IHRoZSBidWlsZCBzeXN0ZW0gdG8gc2VxdWVuY2UgdGhlIGZpbGVzIGluIHRoZSBidWlsdFxuICAgICAgICAgICAgICogbGF5ZXIgaW4gdGhlIHJpZ2h0IHNlcXVlbmNlLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGV4ZWNDYjogZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrLCBhcmdzLCBleHBvcnRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KGV4cG9ydHMsIGFyZ3MpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBjYWxsYmFjayBmb3Igc2NyaXB0IGxvYWRzLCB1c2VkIHRvIGNoZWNrIHN0YXR1cyBvZiBsb2FkaW5nLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGV2dCB0aGUgZXZlbnQgZnJvbSB0aGUgYnJvd3NlciBmb3IgdGhlIHNjcmlwdFxuICAgICAgICAgICAgICogdGhhdCB3YXMgbG9hZGVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBvblNjcmlwdExvYWQ6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICAvL1VzaW5nIGN1cnJlbnRUYXJnZXQgaW5zdGVhZCBvZiB0YXJnZXQgZm9yIEZpcmVmb3ggMi4wJ3Mgc2FrZS4gTm90XG4gICAgICAgICAgICAgICAgLy9hbGwgb2xkIGJyb3dzZXJzIHdpbGwgYmUgc3VwcG9ydGVkLCBidXQgdGhpcyBvbmUgd2FzIGVhc3kgZW5vdWdoXG4gICAgICAgICAgICAgICAgLy90byBzdXBwb3J0IGFuZCBzdGlsbCBtYWtlcyBzZW5zZS5cbiAgICAgICAgICAgICAgICBpZiAoZXZ0LnR5cGUgPT09ICdsb2FkJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKHJlYWR5UmVnRXhwLnRlc3QoKGV2dC5jdXJyZW50VGFyZ2V0IHx8IGV2dC5zcmNFbGVtZW50KS5yZWFkeVN0YXRlKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9SZXNldCBpbnRlcmFjdGl2ZSBzY3JpcHQgc28gYSBzY3JpcHQgbm9kZSBpcyBub3QgaGVsZCBvbnRvIGZvclxuICAgICAgICAgICAgICAgICAgICAvL3RvIGxvbmcuXG4gICAgICAgICAgICAgICAgICAgIGludGVyYWN0aXZlU2NyaXB0ID0gbnVsbDtcblxuICAgICAgICAgICAgICAgICAgICAvL1B1bGwgb3V0IHRoZSBuYW1lIG9mIHRoZSBtb2R1bGUgYW5kIHRoZSBjb250ZXh0LlxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGdldFNjcmlwdERhdGEoZXZ0KTtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5jb21wbGV0ZUxvYWQoZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDYWxsYmFjayBmb3Igc2NyaXB0IGVycm9ycy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgb25TY3JpcHRFcnJvcjogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZ2V0U2NyaXB0RGF0YShldnQpO1xuICAgICAgICAgICAgICAgIGlmICghaGFzUGF0aEZhbGxiYWNrKGRhdGEuaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGVhY2hQcm9wKHJlZ2lzdHJ5LCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LmluZGV4T2YoJ19AcicpICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWFjaCh2YWx1ZS5kZXBNYXBzLCBmdW5jdGlvbihkZXBNYXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlcE1hcC5pZCA9PT0gZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uRXJyb3IobWFrZUVycm9yKCdzY3JpcHRlcnJvcicsICdTY3JpcHQgZXJyb3IgZm9yIFwiJyArIGRhdGEuaWQgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHBhcmVudHMubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdcIiwgbmVlZGVkIGJ5OiAnICsgcGFyZW50cy5qb2luKCcsICcpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdcIicpLCBldnQsIFtkYXRhLmlkXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb250ZXh0LnJlcXVpcmUgPSBjb250ZXh0Lm1ha2VSZXF1aXJlKCk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1haW4gZW50cnkgcG9pbnQuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgb25seSBhcmd1bWVudCB0byByZXF1aXJlIGlzIGEgc3RyaW5nLCB0aGVuIHRoZSBtb2R1bGUgdGhhdFxuICAgICAqIGlzIHJlcHJlc2VudGVkIGJ5IHRoYXQgc3RyaW5nIGlzIGZldGNoZWQgZm9yIHRoZSBhcHByb3ByaWF0ZSBjb250ZXh0LlxuICAgICAqXG4gICAgICogSWYgdGhlIGZpcnN0IGFyZ3VtZW50IGlzIGFuIGFycmF5LCB0aGVuIGl0IHdpbGwgYmUgdHJlYXRlZCBhcyBhbiBhcnJheVxuICAgICAqIG9mIGRlcGVuZGVuY3kgc3RyaW5nIG5hbWVzIHRvIGZldGNoLiBBbiBvcHRpb25hbCBmdW5jdGlvbiBjYWxsYmFjayBjYW5cbiAgICAgKiBiZSBzcGVjaWZpZWQgdG8gZXhlY3V0ZSB3aGVuIGFsbCBvZiB0aG9zZSBkZXBlbmRlbmNpZXMgYXJlIGF2YWlsYWJsZS5cbiAgICAgKlxuICAgICAqIE1ha2UgYSBsb2NhbCByZXEgdmFyaWFibGUgdG8gaGVscCBDYWphIGNvbXBsaWFuY2UgKGl0IGFzc3VtZXMgdGhpbmdzXG4gICAgICogb24gYSByZXF1aXJlIHRoYXQgYXJlIG5vdCBzdGFuZGFyZGl6ZWQpLCBhbmQgdG8gZ2l2ZSBhIHNob3J0XG4gICAgICogbmFtZSBmb3IgbWluaWZpY2F0aW9uL2xvY2FsIHNjb3BlIHVzZS5cbiAgICAgKi9cbiAgICByZXEgPSByZXF1aXJlanMgPSBmdW5jdGlvbiAoZGVwcywgY2FsbGJhY2ssIGVycmJhY2ssIG9wdGlvbmFsKSB7XG5cbiAgICAgICAgLy9GaW5kIHRoZSByaWdodCBjb250ZXh0LCB1c2UgZGVmYXVsdFxuICAgICAgICB2YXIgY29udGV4dCwgY29uZmlnLFxuICAgICAgICAgICAgY29udGV4dE5hbWUgPSBkZWZDb250ZXh0TmFtZTtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgaGF2ZSBjb25maWcgb2JqZWN0IGluIHRoZSBjYWxsLlxuICAgICAgICBpZiAoIWlzQXJyYXkoZGVwcykgJiYgdHlwZW9mIGRlcHMgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBkZXBzIGlzIGEgY29uZmlnIG9iamVjdFxuICAgICAgICAgICAgY29uZmlnID0gZGVwcztcbiAgICAgICAgICAgIGlmIChpc0FycmF5KGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgICAgIC8vIEFkanVzdCBhcmdzIGlmIHRoZXJlIGFyZSBkZXBlbmRlbmNpZXNcbiAgICAgICAgICAgICAgICBkZXBzID0gY2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBlcnJiYWNrO1xuICAgICAgICAgICAgICAgIGVycmJhY2sgPSBvcHRpb25hbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVwcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcuY29udGV4dCkge1xuICAgICAgICAgICAgY29udGV4dE5hbWUgPSBjb25maWcuY29udGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQgPSBnZXRPd24oY29udGV4dHMsIGNvbnRleHROYW1lKTtcbiAgICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dHNbY29udGV4dE5hbWVdID0gcmVxLnMubmV3Q29udGV4dChjb250ZXh0TmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnKSB7XG4gICAgICAgICAgICBjb250ZXh0LmNvbmZpZ3VyZShjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbnRleHQucmVxdWlyZShkZXBzLCBjYWxsYmFjaywgZXJyYmFjayk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFN1cHBvcnQgcmVxdWlyZS5jb25maWcoKSB0byBtYWtlIGl0IGVhc2llciB0byBjb29wZXJhdGUgd2l0aCBvdGhlclxuICAgICAqIEFNRCBsb2FkZXJzIG9uIGdsb2JhbGx5IGFncmVlZCBuYW1lcy5cbiAgICAgKi9cbiAgICByZXEuY29uZmlnID0gZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICByZXR1cm4gcmVxKGNvbmZpZyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgc29tZXRoaW5nIGFmdGVyIHRoZSBjdXJyZW50IHRpY2tcbiAgICAgKiBvZiB0aGUgZXZlbnQgbG9vcC4gT3ZlcnJpZGUgZm9yIG90aGVyIGVudnNcbiAgICAgKiB0aGF0IGhhdmUgYSBiZXR0ZXIgc29sdXRpb24gdGhhbiBzZXRUaW1lb3V0LlxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBmdW5jdGlvbiB0byBleGVjdXRlIGxhdGVyLlxuICAgICAqL1xuICAgIHJlcS5uZXh0VGljayA9IHR5cGVvZiBzZXRUaW1lb3V0ICE9PSAndW5kZWZpbmVkJyA/IGZ1bmN0aW9uIChmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCA0KTtcbiAgICB9IDogZnVuY3Rpb24gKGZuKSB7IGZuKCk7IH07XG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgcmVxdWlyZSBhcyBhIGdsb2JhbCwgYnV0IG9ubHkgaWYgaXQgZG9lcyBub3QgYWxyZWFkeSBleGlzdC5cbiAgICAgKi9cbiAgICBpZiAoIXJlcXVpcmUpIHtcbiAgICAgICAgcmVxdWlyZSA9IHJlcTtcbiAgICB9XG5cbiAgICByZXEudmVyc2lvbiA9IHZlcnNpb247XG5cbiAgICAvL1VzZWQgdG8gZmlsdGVyIG91dCBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgYWxyZWFkeSBwYXRocy5cbiAgICByZXEuanNFeHRSZWdFeHAgPSAvXlxcL3w6fFxcP3xcXC5qcyQvO1xuICAgIHJlcS5pc0Jyb3dzZXIgPSBpc0Jyb3dzZXI7XG4gICAgcyA9IHJlcS5zID0ge1xuICAgICAgICBjb250ZXh0czogY29udGV4dHMsXG4gICAgICAgIG5ld0NvbnRleHQ6IG5ld0NvbnRleHRcbiAgICB9O1xuXG4gICAgLy9DcmVhdGUgZGVmYXVsdCBjb250ZXh0LlxuICAgIHJlcSh7fSk7XG5cbiAgICAvL0V4cG9ydHMgc29tZSBjb250ZXh0LXNlbnNpdGl2ZSBtZXRob2RzIG9uIGdsb2JhbCByZXF1aXJlLlxuICAgIGVhY2goW1xuICAgICAgICAndG9VcmwnLFxuICAgICAgICAndW5kZWYnLFxuICAgICAgICAnZGVmaW5lZCcsXG4gICAgICAgICdzcGVjaWZpZWQnXG4gICAgXSwgZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgLy9SZWZlcmVuY2UgZnJvbSBjb250ZXh0cyBpbnN0ZWFkIG9mIGVhcmx5IGJpbmRpbmcgdG8gZGVmYXVsdCBjb250ZXh0LFxuICAgICAgICAvL3NvIHRoYXQgZHVyaW5nIGJ1aWxkcywgdGhlIGxhdGVzdCBpbnN0YW5jZSBvZiB0aGUgZGVmYXVsdCBjb250ZXh0XG4gICAgICAgIC8vd2l0aCBpdHMgY29uZmlnIGdldHMgdXNlZC5cbiAgICAgICAgcmVxW3Byb3BdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGN0eCA9IGNvbnRleHRzW2RlZkNvbnRleHROYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBjdHgucmVxdWlyZVtwcm9wXS5hcHBseShjdHgsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBpZiAoaXNCcm93c2VyKSB7XG4gICAgICAgIGhlYWQgPSBzLmhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuICAgICAgICAvL0lmIEJBU0UgdGFnIGlzIGluIHBsYXksIHVzaW5nIGFwcGVuZENoaWxkIGlzIGEgcHJvYmxlbSBmb3IgSUU2LlxuICAgICAgICAvL1doZW4gdGhhdCBicm93c2VyIGRpZXMsIHRoaXMgY2FuIGJlIHJlbW92ZWQuIERldGFpbHMgaW4gdGhpcyBqUXVlcnkgYnVnOlxuICAgICAgICAvL2h0dHA6Ly9kZXYuanF1ZXJ5LmNvbS90aWNrZXQvMjcwOVxuICAgICAgICBiYXNlRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdiYXNlJylbMF07XG4gICAgICAgIGlmIChiYXNlRWxlbWVudCkge1xuICAgICAgICAgICAgaGVhZCA9IHMuaGVhZCA9IGJhc2VFbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBbnkgZXJyb3JzIHRoYXQgcmVxdWlyZSBleHBsaWNpdGx5IGdlbmVyYXRlcyB3aWxsIGJlIHBhc3NlZCB0byB0aGlzXG4gICAgICogZnVuY3Rpb24uIEludGVyY2VwdC9vdmVycmlkZSBpdCBpZiB5b3Ugd2FudCBjdXN0b20gZXJyb3IgaGFuZGxpbmcuXG4gICAgICogQHBhcmFtIHtFcnJvcn0gZXJyIHRoZSBlcnJvciBvYmplY3QuXG4gICAgICovXG4gICAgcmVxLm9uRXJyb3IgPSBkZWZhdWx0T25FcnJvcjtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIG5vZGUgZm9yIHRoZSBsb2FkIGNvbW1hbmQuIE9ubHkgdXNlZCBpbiBicm93c2VyIGVudnMuXG4gICAgICovXG4gICAgcmVxLmNyZWF0ZU5vZGUgPSBmdW5jdGlvbiAoY29uZmlnLCBtb2R1bGVOYW1lLCB1cmwpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBjb25maWcueGh0bWwgP1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCcsICdodG1sOnNjcmlwdCcpIDpcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgICAgbm9kZS50eXBlID0gY29uZmlnLnNjcmlwdFR5cGUgfHwgJ3RleHQvamF2YXNjcmlwdCc7XG4gICAgICAgIG5vZGUuY2hhcnNldCA9ICd1dGYtOCc7XG4gICAgICAgIG5vZGUuYXN5bmMgPSB0cnVlO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRG9lcyB0aGUgcmVxdWVzdCB0byBsb2FkIGEgbW9kdWxlIGZvciB0aGUgYnJvd3NlciBjYXNlLlxuICAgICAqIE1ha2UgdGhpcyBhIHNlcGFyYXRlIGZ1bmN0aW9uIHRvIGFsbG93IG90aGVyIGVudmlyb25tZW50c1xuICAgICAqIHRvIG92ZXJyaWRlIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHQgdGhlIHJlcXVpcmUgY29udGV4dCB0byBmaW5kIHN0YXRlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtb2R1bGVOYW1lIHRoZSBuYW1lIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHVybCB0aGUgVVJMIHRvIHRoZSBtb2R1bGUuXG4gICAgICovXG4gICAgcmVxLmxvYWQgPSBmdW5jdGlvbiAoY29udGV4dCwgbW9kdWxlTmFtZSwgdXJsKSB7XG4gICAgICAgIHZhciBjb25maWcgPSAoY29udGV4dCAmJiBjb250ZXh0LmNvbmZpZykgfHwge30sXG4gICAgICAgICAgICBub2RlO1xuICAgICAgICBpZiAoaXNCcm93c2VyKSB7XG4gICAgICAgICAgICAvL0luIHRoZSBicm93c2VyIHNvIHVzZSBhIHNjcmlwdCB0YWdcbiAgICAgICAgICAgIG5vZGUgPSByZXEuY3JlYXRlTm9kZShjb25maWcsIG1vZHVsZU5hbWUsIHVybCk7XG5cbiAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdkYXRhLXJlcXVpcmVjb250ZXh0JywgY29udGV4dC5jb250ZXh0TmFtZSk7XG4gICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZSgnZGF0YS1yZXF1aXJlbW9kdWxlJywgbW9kdWxlTmFtZSk7XG5cbiAgICAgICAgICAgIC8vU2V0IHVwIGxvYWQgbGlzdGVuZXIuIFRlc3QgYXR0YWNoRXZlbnQgZmlyc3QgYmVjYXVzZSBJRTkgaGFzXG4gICAgICAgICAgICAvL2Egc3VidGxlIGlzc3VlIGluIGl0cyBhZGRFdmVudExpc3RlbmVyIGFuZCBzY3JpcHQgb25sb2FkIGZpcmluZ3NcbiAgICAgICAgICAgIC8vdGhhdCBkbyBub3QgbWF0Y2ggdGhlIGJlaGF2aW9yIG9mIGFsbCBvdGhlciBicm93c2VycyB3aXRoXG4gICAgICAgICAgICAvL2FkZEV2ZW50TGlzdGVuZXIgc3VwcG9ydCwgd2hpY2ggZmlyZSB0aGUgb25sb2FkIGV2ZW50IGZvciBhXG4gICAgICAgICAgICAvL3NjcmlwdCByaWdodCBhZnRlciB0aGUgc2NyaXB0IGV4ZWN1dGlvbi4gU2VlOlxuICAgICAgICAgICAgLy9odHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFjay9kZXRhaWxzLzY0ODA1Ny9zY3JpcHQtb25sb2FkLWV2ZW50LWlzLW5vdC1maXJlZC1pbW1lZGlhdGVseS1hZnRlci1zY3JpcHQtZXhlY3V0aW9uXG4gICAgICAgICAgICAvL1VORk9SVFVOQVRFTFkgT3BlcmEgaW1wbGVtZW50cyBhdHRhY2hFdmVudCBidXQgZG9lcyBub3QgZm9sbG93IHRoZSBzY3JpcHRcbiAgICAgICAgICAgIC8vc2NyaXB0IGV4ZWN1dGlvbiBtb2RlLlxuICAgICAgICAgICAgaWYgKG5vZGUuYXR0YWNoRXZlbnQgJiZcbiAgICAgICAgICAgICAgICAgICAgLy9DaGVjayBpZiBub2RlLmF0dGFjaEV2ZW50IGlzIGFydGlmaWNpYWxseSBhZGRlZCBieSBjdXN0b20gc2NyaXB0IG9yXG4gICAgICAgICAgICAgICAgICAgIC8vbmF0aXZlbHkgc3VwcG9ydGVkIGJ5IGJyb3dzZXJcbiAgICAgICAgICAgICAgICAgICAgLy9yZWFkIGh0dHBzOi8vZ2l0aHViLmNvbS9yZXF1aXJlanMvcmVxdWlyZWpzL2lzc3Vlcy8xODdcbiAgICAgICAgICAgICAgICAgICAgLy9pZiB3ZSBjYW4gTk9UIGZpbmQgW25hdGl2ZSBjb2RlXSB0aGVuIGl0IG11c3QgTk9UIG5hdGl2ZWx5IHN1cHBvcnRlZC5cbiAgICAgICAgICAgICAgICAgICAgLy9pbiBJRTgsIG5vZGUuYXR0YWNoRXZlbnQgZG9lcyBub3QgaGF2ZSB0b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgIC8vTm90ZSB0aGUgdGVzdCBmb3IgXCJbbmF0aXZlIGNvZGVcIiB3aXRoIG5vIGNsb3NpbmcgYnJhY2UsIHNlZTpcbiAgICAgICAgICAgICAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vcmVxdWlyZWpzL3JlcXVpcmVqcy9pc3N1ZXMvMjczXG4gICAgICAgICAgICAgICAgICAgICEobm9kZS5hdHRhY2hFdmVudC50b1N0cmluZyAmJiBub2RlLmF0dGFjaEV2ZW50LnRvU3RyaW5nKCkuaW5kZXhPZignW25hdGl2ZSBjb2RlJykgPCAwKSAmJlxuICAgICAgICAgICAgICAgICAgICAhaXNPcGVyYSkge1xuICAgICAgICAgICAgICAgIC8vUHJvYmFibHkgSUUuIElFIChhdCBsZWFzdCA2LTgpIGRvIG5vdCBmaXJlXG4gICAgICAgICAgICAgICAgLy9zY3JpcHQgb25sb2FkIHJpZ2h0IGFmdGVyIGV4ZWN1dGluZyB0aGUgc2NyaXB0LCBzb1xuICAgICAgICAgICAgICAgIC8vd2UgY2Fubm90IHRpZSB0aGUgYW5vbnltb3VzIGRlZmluZSBjYWxsIHRvIGEgbmFtZS5cbiAgICAgICAgICAgICAgICAvL0hvd2V2ZXIsIElFIHJlcG9ydHMgdGhlIHNjcmlwdCBhcyBiZWluZyBpbiAnaW50ZXJhY3RpdmUnXG4gICAgICAgICAgICAgICAgLy9yZWFkeVN0YXRlIGF0IHRoZSB0aW1lIG9mIHRoZSBkZWZpbmUgY2FsbC5cbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICBub2RlLmF0dGFjaEV2ZW50KCdvbnJlYWR5c3RhdGVjaGFuZ2UnLCBjb250ZXh0Lm9uU2NyaXB0TG9hZCk7XG4gICAgICAgICAgICAgICAgLy9JdCB3b3VsZCBiZSBncmVhdCB0byBhZGQgYW4gZXJyb3IgaGFuZGxlciBoZXJlIHRvIGNhdGNoXG4gICAgICAgICAgICAgICAgLy80MDRzIGluIElFOSsuIEhvd2V2ZXIsIG9ucmVhZHlzdGF0ZWNoYW5nZSB3aWxsIGZpcmUgYmVmb3JlXG4gICAgICAgICAgICAgICAgLy90aGUgZXJyb3IgaGFuZGxlciwgc28gdGhhdCBkb2VzIG5vdCBoZWxwLiBJZiBhZGRFdmVudExpc3RlbmVyXG4gICAgICAgICAgICAgICAgLy9pcyB1c2VkLCB0aGVuIElFIHdpbGwgZmlyZSBlcnJvciBiZWZvcmUgbG9hZCwgYnV0IHdlIGNhbm5vdFxuICAgICAgICAgICAgICAgIC8vdXNlIHRoYXQgcGF0aHdheSBnaXZlbiB0aGUgY29ubmVjdC5taWNyb3NvZnQuY29tIGlzc3VlXG4gICAgICAgICAgICAgICAgLy9tZW50aW9uZWQgYWJvdmUgYWJvdXQgbm90IGRvaW5nIHRoZSAnc2NyaXB0IGV4ZWN1dGUsXG4gICAgICAgICAgICAgICAgLy90aGVuIGZpcmUgdGhlIHNjcmlwdCBsb2FkIGV2ZW50IGxpc3RlbmVyIGJlZm9yZSBleGVjdXRlXG4gICAgICAgICAgICAgICAgLy9uZXh0IHNjcmlwdCcgdGhhdCBvdGhlciBicm93c2VycyBkby5cbiAgICAgICAgICAgICAgICAvL0Jlc3QgaG9wZTogSUUxMCBmaXhlcyB0aGUgaXNzdWVzLFxuICAgICAgICAgICAgICAgIC8vYW5kIHRoZW4gZGVzdHJveXMgYWxsIGluc3RhbGxzIG9mIElFIDYtOS5cbiAgICAgICAgICAgICAgICAvL25vZGUuYXR0YWNoRXZlbnQoJ29uZXJyb3InLCBjb250ZXh0Lm9uU2NyaXB0RXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBjb250ZXh0Lm9uU2NyaXB0TG9hZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBjb250ZXh0Lm9uU2NyaXB0RXJyb3IsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGUuc3JjID0gdXJsO1xuXG4gICAgICAgICAgICAvL0NhbGxpbmcgb25Ob2RlQ3JlYXRlZCBhZnRlciBhbGwgcHJvcGVydGllcyBvbiB0aGUgbm9kZSBoYXZlIGJlZW5cbiAgICAgICAgICAgIC8vc2V0LCBidXQgYmVmb3JlIGl0IGlzIHBsYWNlZCBpbiB0aGUgRE9NLlxuICAgICAgICAgICAgaWYgKGNvbmZpZy5vbk5vZGVDcmVhdGVkKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLm9uTm9kZUNyZWF0ZWQobm9kZSwgY29uZmlnLCBtb2R1bGVOYW1lLCB1cmwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0ZvciBzb21lIGNhY2hlIGNhc2VzIGluIElFIDYtOCwgdGhlIHNjcmlwdCBleGVjdXRlcyBiZWZvcmUgdGhlIGVuZFxuICAgICAgICAgICAgLy9vZiB0aGUgYXBwZW5kQ2hpbGQgZXhlY3V0aW9uLCBzbyB0byB0aWUgYW4gYW5vbnltb3VzIGRlZmluZVxuICAgICAgICAgICAgLy9jYWxsIHRvIHRoZSBtb2R1bGUgbmFtZSAod2hpY2ggaXMgc3RvcmVkIG9uIHRoZSBub2RlKSwgaG9sZCBvblxuICAgICAgICAgICAgLy90byBhIHJlZmVyZW5jZSB0byB0aGlzIG5vZGUsIGJ1dCBjbGVhciBhZnRlciB0aGUgRE9NIGluc2VydGlvbi5cbiAgICAgICAgICAgIGN1cnJlbnRseUFkZGluZ1NjcmlwdCA9IG5vZGU7XG4gICAgICAgICAgICBpZiAoYmFzZUVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBoZWFkLmluc2VydEJlZm9yZShub2RlLCBiYXNlRWxlbWVudCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyZW50bHlBZGRpbmdTY3JpcHQgPSBudWxsO1xuXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1dlYldvcmtlcikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvL0luIGEgd2ViIHdvcmtlciwgdXNlIGltcG9ydFNjcmlwdHMuIFRoaXMgaXMgbm90IGEgdmVyeVxuICAgICAgICAgICAgICAgIC8vZWZmaWNpZW50IHVzZSBvZiBpbXBvcnRTY3JpcHRzLCBpbXBvcnRTY3JpcHRzIHdpbGwgYmxvY2sgdW50aWxcbiAgICAgICAgICAgICAgICAvL2l0cyBzY3JpcHQgaXMgZG93bmxvYWRlZCBhbmQgZXZhbHVhdGVkLiBIb3dldmVyLCBpZiB3ZWIgd29ya2Vyc1xuICAgICAgICAgICAgICAgIC8vYXJlIGluIHBsYXksIHRoZSBleHBlY3RhdGlvbiBpcyB0aGF0IGEgYnVpbGQgaGFzIGJlZW4gZG9uZSBzb1xuICAgICAgICAgICAgICAgIC8vdGhhdCBvbmx5IG9uZSBzY3JpcHQgbmVlZHMgdG8gYmUgbG9hZGVkIGFueXdheS4gVGhpcyBtYXkgbmVlZFxuICAgICAgICAgICAgICAgIC8vdG8gYmUgcmVldmFsdWF0ZWQgaWYgb3RoZXIgdXNlIGNhc2VzIGJlY29tZSBjb21tb24uXG5cbiAgICAgICAgICAgICAgICAvLyBQb3N0IGEgdGFzayB0byB0aGUgZXZlbnQgbG9vcCB0byB3b3JrIGFyb3VuZCBhIGJ1ZyBpbiBXZWJLaXRcbiAgICAgICAgICAgICAgICAvLyB3aGVyZSB0aGUgd29ya2VyIGdldHMgZ2FyYmFnZS1jb2xsZWN0ZWQgYWZ0ZXIgY2FsbGluZ1xuICAgICAgICAgICAgICAgIC8vIGltcG9ydFNjcmlwdHMoKTogaHR0cHM6Ly93ZWJraXQub3JnL2IvMTUzMzE3XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHt9LCAwKTtcbiAgICAgICAgICAgICAgICBpbXBvcnRTY3JpcHRzKHVybCk7XG5cbiAgICAgICAgICAgICAgICAvL0FjY291bnQgZm9yIGFub255bW91cyBtb2R1bGVzXG4gICAgICAgICAgICAgICAgY29udGV4dC5jb21wbGV0ZUxvYWQobW9kdWxlTmFtZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5vbkVycm9yKG1ha2VFcnJvcignaW1wb3J0c2NyaXB0cycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpbXBvcnRTY3JpcHRzIGZhaWxlZCBmb3IgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lICsgJyBhdCAnICsgdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbbW9kdWxlTmFtZV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRJbnRlcmFjdGl2ZVNjcmlwdCgpIHtcbiAgICAgICAgaWYgKGludGVyYWN0aXZlU2NyaXB0ICYmIGludGVyYWN0aXZlU2NyaXB0LnJlYWR5U3RhdGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnRlcmFjdGl2ZVNjcmlwdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGVhY2hSZXZlcnNlKHNjcmlwdHMoKSwgZnVuY3Rpb24gKHNjcmlwdCkge1xuICAgICAgICAgICAgaWYgKHNjcmlwdC5yZWFkeVN0YXRlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpbnRlcmFjdGl2ZVNjcmlwdCA9IHNjcmlwdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaW50ZXJhY3RpdmVTY3JpcHQ7XG4gICAgfVxuXG4gICAgLy9Mb29rIGZvciBhIGRhdGEtbWFpbiBzY3JpcHQgYXR0cmlidXRlLCB3aGljaCBjb3VsZCBhbHNvIGFkanVzdCB0aGUgYmFzZVVybC5cbiAgICBpZiAoaXNCcm93c2VyICYmICFjZmcuc2tpcERhdGFNYWluKSB7XG4gICAgICAgIC8vRmlndXJlIG91dCBiYXNlVXJsLiBHZXQgaXQgZnJvbSB0aGUgc2NyaXB0IHRhZyB3aXRoIHJlcXVpcmUuanMgaW4gaXQuXG4gICAgICAgIGVhY2hSZXZlcnNlKHNjcmlwdHMoKSwgZnVuY3Rpb24gKHNjcmlwdCkge1xuICAgICAgICAgICAgLy9TZXQgdGhlICdoZWFkJyB3aGVyZSB3ZSBjYW4gYXBwZW5kIGNoaWxkcmVuIGJ5XG4gICAgICAgICAgICAvL3VzaW5nIHRoZSBzY3JpcHQncyBwYXJlbnQuXG4gICAgICAgICAgICBpZiAoIWhlYWQpIHtcbiAgICAgICAgICAgICAgICBoZWFkID0gc2NyaXB0LnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vTG9vayBmb3IgYSBkYXRhLW1haW4gYXR0cmlidXRlIHRvIHNldCBtYWluIHNjcmlwdCBmb3IgdGhlIHBhZ2VcbiAgICAgICAgICAgIC8vdG8gbG9hZC4gSWYgaXQgaXMgdGhlcmUsIHRoZSBwYXRoIHRvIGRhdGEgbWFpbiBiZWNvbWVzIHRoZVxuICAgICAgICAgICAgLy9iYXNlVXJsLCBpZiBpdCBpcyBub3QgYWxyZWFkeSBzZXQuXG4gICAgICAgICAgICBkYXRhTWFpbiA9IHNjcmlwdC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbWFpbicpO1xuICAgICAgICAgICAgaWYgKGRhdGFNYWluKSB7XG4gICAgICAgICAgICAgICAgLy9QcmVzZXJ2ZSBkYXRhTWFpbiBpbiBjYXNlIGl0IGlzIGEgcGF0aCAoaS5lLiBjb250YWlucyAnPycpXG4gICAgICAgICAgICAgICAgbWFpblNjcmlwdCA9IGRhdGFNYWluO1xuXG4gICAgICAgICAgICAgICAgLy9TZXQgZmluYWwgYmFzZVVybCBpZiB0aGVyZSBpcyBub3QgYWxyZWFkeSBhbiBleHBsaWNpdCBvbmUsXG4gICAgICAgICAgICAgICAgLy9idXQgb25seSBkbyBzbyBpZiB0aGUgZGF0YS1tYWluIHZhbHVlIGlzIG5vdCBhIGxvYWRlciBwbHVnaW5cbiAgICAgICAgICAgICAgICAvL21vZHVsZSBJRC5cbiAgICAgICAgICAgICAgICBpZiAoIWNmZy5iYXNlVXJsICYmIG1haW5TY3JpcHQuaW5kZXhPZignIScpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAvL1B1bGwgb2ZmIHRoZSBkaXJlY3Rvcnkgb2YgZGF0YS1tYWluIGZvciB1c2UgYXMgdGhlXG4gICAgICAgICAgICAgICAgICAgIC8vYmFzZVVybC5cbiAgICAgICAgICAgICAgICAgICAgc3JjID0gbWFpblNjcmlwdC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgICAgICBtYWluU2NyaXB0ID0gc3JjLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBzdWJQYXRoID0gc3JjLmxlbmd0aCA/IHNyYy5qb2luKCcvJykgICsgJy8nIDogJy4vJztcblxuICAgICAgICAgICAgICAgICAgICBjZmcuYmFzZVVybCA9IHN1YlBhdGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9TdHJpcCBvZmYgYW55IHRyYWlsaW5nIC5qcyBzaW5jZSBtYWluU2NyaXB0IGlzIG5vd1xuICAgICAgICAgICAgICAgIC8vbGlrZSBhIG1vZHVsZSBuYW1lLlxuICAgICAgICAgICAgICAgIG1haW5TY3JpcHQgPSBtYWluU2NyaXB0LnJlcGxhY2UoanNTdWZmaXhSZWdFeHAsICcnKTtcblxuICAgICAgICAgICAgICAgIC8vSWYgbWFpblNjcmlwdCBpcyBzdGlsbCBhIHBhdGgsIGZhbGwgYmFjayB0byBkYXRhTWFpblxuICAgICAgICAgICAgICAgIGlmIChyZXEuanNFeHRSZWdFeHAudGVzdChtYWluU2NyaXB0KSkge1xuICAgICAgICAgICAgICAgICAgICBtYWluU2NyaXB0ID0gZGF0YU1haW47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9QdXQgdGhlIGRhdGEtbWFpbiBzY3JpcHQgaW4gdGhlIGZpbGVzIHRvIGxvYWQuXG4gICAgICAgICAgICAgICAgY2ZnLmRlcHMgPSBjZmcuZGVwcyA/IGNmZy5kZXBzLmNvbmNhdChtYWluU2NyaXB0KSA6IFttYWluU2NyaXB0XTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIGRlZmluaXRpb25zIG9mIG1vZHVsZXMuIERpZmZlcnMgZnJvbVxuICAgICAqIHJlcXVpcmUoKSBpbiB0aGF0IGEgc3RyaW5nIGZvciB0aGUgbW9kdWxlIHNob3VsZCBiZSB0aGUgZmlyc3QgYXJndW1lbnQsXG4gICAgICogYW5kIHRoZSBmdW5jdGlvbiB0byBleGVjdXRlIGFmdGVyIGRlcGVuZGVuY2llcyBhcmUgbG9hZGVkIHNob3VsZFxuICAgICAqIHJldHVybiBhIHZhbHVlIHRvIGRlZmluZSB0aGUgbW9kdWxlIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGZpcnN0IGFyZ3VtZW50J3NcbiAgICAgKiBuYW1lLlxuICAgICAqL1xuICAgIGRlZmluZSA9IGZ1bmN0aW9uIChuYW1lLCBkZXBzLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgbm9kZSwgY29udGV4dDtcblxuICAgICAgICAvL0FsbG93IGZvciBhbm9ueW1vdXMgbW9kdWxlc1xuICAgICAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvL0FkanVzdCBhcmdzIGFwcHJvcHJpYXRlbHlcbiAgICAgICAgICAgIGNhbGxiYWNrID0gZGVwcztcbiAgICAgICAgICAgIGRlcHMgPSBuYW1lO1xuICAgICAgICAgICAgbmFtZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvL1RoaXMgbW9kdWxlIG1heSBub3QgaGF2ZSBkZXBlbmRlbmNpZXNcbiAgICAgICAgaWYgKCFpc0FycmF5KGRlcHMpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGRlcHM7XG4gICAgICAgICAgICBkZXBzID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vSWYgbm8gbmFtZSwgYW5kIGNhbGxiYWNrIGlzIGEgZnVuY3Rpb24sIHRoZW4gZmlndXJlIG91dCBpZiBpdCBhXG4gICAgICAgIC8vQ29tbW9uSlMgdGhpbmcgd2l0aCBkZXBlbmRlbmNpZXMuXG4gICAgICAgIGlmICghZGVwcyAmJiBpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgZGVwcyA9IFtdO1xuICAgICAgICAgICAgLy9SZW1vdmUgY29tbWVudHMgZnJvbSB0aGUgY2FsbGJhY2sgc3RyaW5nLFxuICAgICAgICAgICAgLy9sb29rIGZvciByZXF1aXJlIGNhbGxzLCBhbmQgcHVsbCB0aGVtIGludG8gdGhlIGRlcGVuZGVuY2llcyxcbiAgICAgICAgICAgIC8vYnV0IG9ubHkgaWYgdGhlcmUgYXJlIGZ1bmN0aW9uIGFyZ3MuXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2subGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoY29tbWVudFJlZ0V4cCwgY29tbWVudFJlcGxhY2UpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKGNqc1JlcXVpcmVSZWdFeHAsIGZ1bmN0aW9uIChtYXRjaCwgZGVwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL01heSBiZSBhIENvbW1vbkpTIHRoaW5nIGV2ZW4gd2l0aG91dCByZXF1aXJlIGNhbGxzLCBidXQgc3RpbGxcbiAgICAgICAgICAgICAgICAvL2NvdWxkIHVzZSBleHBvcnRzLCBhbmQgbW9kdWxlLiBBdm9pZCBkb2luZyBleHBvcnRzIGFuZCBtb2R1bGVcbiAgICAgICAgICAgICAgICAvL3dvcmsgdGhvdWdoIGlmIGl0IGp1c3QgbmVlZHMgcmVxdWlyZS5cbiAgICAgICAgICAgICAgICAvL1JFUVVJUkVTIHRoZSBmdW5jdGlvbiB0byBleHBlY3QgdGhlIENvbW1vbkpTIHZhcmlhYmxlcyBpbiB0aGVcbiAgICAgICAgICAgICAgICAvL29yZGVyIGxpc3RlZCBiZWxvdy5cbiAgICAgICAgICAgICAgICBkZXBzID0gKGNhbGxiYWNrLmxlbmd0aCA9PT0gMSA/IFsncmVxdWlyZSddIDogWydyZXF1aXJlJywgJ2V4cG9ydHMnLCAnbW9kdWxlJ10pLmNvbmNhdChkZXBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vSWYgaW4gSUUgNi04IGFuZCBoaXQgYW4gYW5vbnltb3VzIGRlZmluZSgpIGNhbGwsIGRvIHRoZSBpbnRlcmFjdGl2ZVxuICAgICAgICAvL3dvcmsuXG4gICAgICAgIGlmICh1c2VJbnRlcmFjdGl2ZSkge1xuICAgICAgICAgICAgbm9kZSA9IGN1cnJlbnRseUFkZGluZ1NjcmlwdCB8fCBnZXRJbnRlcmFjdGl2ZVNjcmlwdCgpO1xuICAgICAgICAgICAgaWYgKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLXJlcXVpcmVtb2R1bGUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHRzW25vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLXJlcXVpcmVjb250ZXh0JyldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9BbHdheXMgc2F2ZSBvZmYgZXZhbHVhdGluZyB0aGUgZGVmIGNhbGwgdW50aWwgdGhlIHNjcmlwdCBvbmxvYWQgaGFuZGxlci5cbiAgICAgICAgLy9UaGlzIGFsbG93cyBtdWx0aXBsZSBtb2R1bGVzIHRvIGJlIGluIGEgZmlsZSB3aXRob3V0IHByZW1hdHVyZWx5XG4gICAgICAgIC8vdHJhY2luZyBkZXBlbmRlbmNpZXMsIGFuZCBhbGxvd3MgZm9yIGFub255bW91cyBtb2R1bGUgc3VwcG9ydCxcbiAgICAgICAgLy93aGVyZSB0aGUgbW9kdWxlIG5hbWUgaXMgbm90IGtub3duIHVudGlsIHRoZSBzY3JpcHQgb25sb2FkIGV2ZW50XG4gICAgICAgIC8vb2NjdXJzLiBJZiBubyBjb250ZXh0LCB1c2UgdGhlIGdsb2JhbCBxdWV1ZSwgYW5kIGdldCBpdCBwcm9jZXNzZWRcbiAgICAgICAgLy9pbiB0aGUgb25zY3JpcHQgbG9hZCBjYWxsYmFjay5cbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGNvbnRleHQuZGVmUXVldWUucHVzaChbbmFtZSwgZGVwcywgY2FsbGJhY2tdKTtcbiAgICAgICAgICAgIGNvbnRleHQuZGVmUXVldWVNYXBbbmFtZV0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2xvYmFsRGVmUXVldWUucHVzaChbbmFtZSwgZGVwcywgY2FsbGJhY2tdKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBkZWZpbmUuYW1kID0ge1xuICAgICAgICBqUXVlcnk6IHRydWVcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZXMgdGhlIHRleHQuIE5vcm1hbGx5IGp1c3QgdXNlcyBldmFsLCBidXQgY2FuIGJlIG1vZGlmaWVkXG4gICAgICogdG8gdXNlIGEgYmV0dGVyLCBlbnZpcm9ubWVudC1zcGVjaWZpYyBjYWxsLiBPbmx5IHVzZWQgZm9yIHRyYW5zcGlsaW5nXG4gICAgICogbG9hZGVyIHBsdWdpbnMsIG5vdCBmb3IgcGxhaW4gSlMgbW9kdWxlcy5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dCB0aGUgdGV4dCB0byBleGVjdXRlL2V2YWx1YXRlLlxuICAgICAqL1xuICAgIHJlcS5leGVjID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgICAgICAgLypqc2xpbnQgZXZpbDogdHJ1ZSAqL1xuICAgICAgICByZXR1cm4gZXZhbCh0ZXh0KTtcbiAgICB9O1xuXG4gICAgLy9TZXQgdXAgd2l0aCBjb25maWcgaW5mby5cbiAgICByZXEoY2ZnKTtcbn0odGhpcywgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHNldFRpbWVvdXQpKSk7Il0sImZpbGUiOiJyZXF1aXJlLmpzIn0=
