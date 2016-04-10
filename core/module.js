/**
 * Module manager component
 */

"use strict"

// todo: move this somewhere appropriate - perhaps config?
var hooks = [
    'install', 'uninstall', 'enable', 'disable', 'init', 'register'
];

class ModuleManager {

    /**
     * Constructor
     */
    constructor() {
        
        // initialize storage for module classes
        this.modules  = {};

        // initialize storage for hook references
        this.registry = {};
        
        hooks.forEach(hook => {
            this.registry[hook] = {};
        });

    }

    disable(moduleKey, callback) {

        var manager = hftd.module;
        var db      = hftd.db;

        async.waterfall([
            
            manager.discover,
            manager.syncDB,
            manager.getAll

        ], (error, modulesAvailable) => {

            var modules   = {};
                
            modulesAvailable.forEach(module => modules[module.key] = module);

            if (!(moduleKey in modules))
                return callback(sprintf("Unknown module: '%s'", moduleKey));

            if (!modules[moduleKey].installed)
                return callback(sprintf("'%s' is not currently installed", modules[moduleKey].name));
       
            if (!modules[moduleKey].enabled)
                return callback(sprintf("'%s' is already disabled", modules[moduleKey].name));

            manager.invoke(moduleKey, 'disable', null, error => {

                if (error)
                    return callback(error);

                manager.unload(moduleKey);

                db.collection('modules').updateOne({
                    key: moduleKey
                }, {
                    $set: { enabled: 0 }
                }).then(
                    ()    => callback(),
                    error => callback(error)
                );

            });

        });

    }

    /**
     * Scan modules directory (recursing into subdirectories) 
     * and attempt to discover all modules
     */
    discover(callback) {

        var path = require('path');

        async.waterfall([

            // recursively get subdirectories
            (taskCallback) => {
                subdirs(path.join(__dirname, '../modules'), (error, dirs) => {
                    if (error)
                        return taskCallback(error);
                    taskCallback(null, dirs);
                });
            },

            // check if subdirectory contains a file of the same name
            // and construct a list of module files
            (dirs, taskCallback) => {

                var files = [];
                
                async.forEach(dirs, (dir, subTaskCallback) => {
                    var filename = path.join(dir, path.basename(dir) + '.js');

                    fs.exists(filename, (exists) => {
                        if (exists)
                            files.push(filename);
                        subTaskCallback();
                    });

                }, (error) => {
                    if (error)
                        return taskCallback(error);
                    taskCallback(null, files);
                });

            },

            // attempt to parse yaml info file for each of those files,
            // pass info object to callback
            (files, taskCallback) => {
                
                var discovered = {};

                // for each module file ..
                async.forEach(files, (file, subTaskCallback) => {

                    async.waterfall([
                        
                        // check if info file exists ..
                        (configCallback) => {

                            var infoFile = path.join(path.dirname(file), 'info.yml');
                            
                            fs.exists(infoFile, (exists) => {
                                
                                if (exists)
                                    return configCallback(null, infoFile);
                                
                                // if it doesn't, post an error and continue to next item
                                configCallback(sprintf("No info.yml found for module: '%s'", path.basename(file, '.js')));
                            
                            });

                        },

                        // read the info file
                        (infoFile, configCallback) => {
                            fs.readFile(infoFile, (error, infoData) => {
                                if (error) 
                                    return subTaskCallback(error);
                                configCallback(null, infoData);
                            });    
                        },

                        // parse the info file
                        (infoData, configCallback) => {
                            try {
                                var info = yaml.load(infoData);
                            } catch (e) {
                                return configCallback(e);
                            }
                            configCallback(null, info);
                        }
                    
                    ], (error, info) => {

                        // if error, post the error, then continue onto next module
                        if (error) {
                            hftd.error(error);
                            return subTaskCallback();
                        }

                        var moduleInfo = { file: file };
                        var moduleKey  = path.basename(file, '.js');

                        for (var key in info) {

                            // if module defines components, load component info
                            if (key.toLowerCase() == 'components') {
                                
                                // check components is an array
                                if (!_.isArray(info[key])) {    
                                    hftd.error(sprintf("'Components' is not an array in info.yml file for '%s' module", moduleKey));
                                } else {
                                    
                                    moduleInfo.components = [];

                                    for (var component of info[key]) {
                                        
                                        var componentInfo = {}
                                        
                                        for (var componentKey in component)
                                            componentInfo[componentKey.toLowerCase()] = component[componentKey];
                                        
                                        if ('file' in componentInfo)
                                            componentInfo.file = path.join(path.dirname(file), componentInfo.file);

                                        moduleInfo.components.push(componentInfo);
                                    
                                    }
                                
                                }
                            
                            } else moduleInfo[key.toLowerCase()] = info[key];
                        
                        }

                        if (!('name' in moduleInfo)) {
                            hftd.error(sprintf("info.yml for module '%s' must specify a name parameter", moduleKey));
                            hftd.log(sprintf("Invalid module info for module '%s' - module ignored [ %s ]", moduleKey, color('FAIL', 'red')));
                            return subTaskCallback();
                        }

                        if (!('description' in moduleInfo))
                            hftd.log(sprintf("info.yml for module '%s' should include a description - [ %s ]", moduleKey, color('WARN', 'yellow')));

                        // if no error, add to list of discovered modules
                        discovered[moduleKey] = moduleInfo;
                        subTaskCallback();

                    });


                }, (error) => {
                    if (error)
                        return taskCallback(error);
                    taskCallback(null, discovered);
                });

            }

        // when all valid modules have been discovered ..
        ], (error, discovered) => {
            
            if (error)
                return callback(error);

            callback(null, discovered);
        
        });

    }

    /**
     * Enable the module specified by moduleKey
     * Perform validation to check the module is present and not already enabled
     */
    enable(moduleKey, callback) {
        
        var manager = hftd.module;
        var db      = hftd.db;

        async.waterfall([
            
            manager.discover,
            manager.syncDB,
            manager.getAll

        ], (error, moduleInfo) => {

            var modules = {};
            moduleInfo.forEach(module => modules[module.key] = module);

            // check module was found ..
            if (!(moduleKey in modules))
                return callback(sprintf("Module '%s' not found", moduleKey));

            var module = modules[moduleKey];

            // check if already enabled ..
            if ('enabled' in module && module.enabled)
                return callback(sprintf("'%s' is already enabled", module.name));

            // initialize task list with initial task of loading module
            var taskList = [
                taskCallback => manager.loadModule(module, taskCallback)
            ];

            // if not installed, add installation tasks
            if (!('installed' in module) || !module.installed) {
                // invoke module's 'install' hook
                taskList.push(taskCallback => manager.invoke(module.key, 'install', null, taskCallback));
                // mark as installed in db
                taskList.push(taskCallback => {
                    db.collection('modules')
                        .updateOne({
                            key: module.key
                        }, {
                            $set: { installed: 1 }
                        })
                        .then(
                            ()    => taskCallback(),
                            error => taskCallback(error)
                        );
                });
            }

            // invoke module's 'enable' hook
            taskList.push(taskCallback => manager.invoke(module.key, 'enable', null, taskCallback));
            
            // mark as enabled in db
            taskList.push(taskCallback => {
                db.collection('modules')
                    .updateOne({
                        key: module.key
                    }, {
                        $set: { enabled: 1 }
                    })
                    .then(
                        ()    => taskCallback(),
                        error => taskCallback(error)
                    );
            });
            
            // invoke module's 'init' hook
            taskList.push(taskCallback => manager.invoke(module.key, 'init', null, taskCallback));         

            // run the task list, calling callback when done
            async.series(taskList, callback);

        });
    
    }

    /**
     * Get all modules, regardless of installed / enabled state
     * @param optional function callback
     * @return Promise if no callback supplied
     */
    getAll(callback) {

        var promise = hftd.db.collection('modules').find().toArray();

        if (!callback)
            return promise;

        promise.then((modules) => {
            callback(null, modules);
        }, (error) => {
            callback(error);
        });

    }

    /**
     * Get enabled modules
     * @param optional function callback
     * @return Promise if no callback supplied
     */
    getEnabled(callback) {

        var promise = hftd.db.collection('modules').find({
            enabled: 1
        }).toArray();

        if (!callback)
            return promise;

        promise.then((modules) => {
            callback(null, modules);
        }, (error) => {
            callback(error);
        });

    }

    /**
     * Invoke hook in a given module
     * @param string module  the module's key
     * @param string hook    hook method to invoke
     * @param array  args    an array of arguments to pass the hook
     */
    invoke(module, hook, args, callback) {

        args = args || [];

        if (hook in this.registry && module in this.registry[hook]) {
            
            // run the method
            var returnValue = this.registry[hook][module].apply(
                this.modules[module], args
            );

            // may return a value (sync) or Promise (async)
            Promise.resolve(returnValue).then((value) => {
                callback(null, value);
            }, (error) => {
                callback(error);
            });

        } else callback();

    }


    invokeAll(hook, args, callback) {

        args = args || [];

        var manager = hftd.module;
        var results = [];

        async.forEach(Object.keys(this.registry[hook]), (moduleKey, taskCallback) => {
            manager.invoke(moduleKey, hook, args, (error, result) => {
                if (error)
                    hftd.error(error);
                else if (result)
                    results.push(result);
                taskCallback();
            });
        }, (error) => {
            callback(null, results);
        });

    }

    /**
     * Instantiate main module class and register its hooks
     */
    loadModule(module, callback) {
        
        hftd.log('Loading module: ' + module.name);
        this.modules[module.key] = require(module.file)();
        this.registerHooks(module.key);
        this.registerComponents(module);

        if (callback)
            callback();

    }

    loadModules(modules, callback) {

        var manager = hftd.module;

        async.forEach(modules, (module, taskCallback) => {
            manager.loadModule(module, taskCallback);
        }, callback);

    }

    /**
     * If module defines components, register them
     */
    registerComponents(module) {
        
        if ('components' in module && _.isArray(module.components)) {

            for (let component of module.components) {
                
                try {

                    let errors = false;
                    
                    // required params ..
                    for (let param of ['type', 'code', 'file']) {
                        if (!(param in component)) {
                            hftd.error(sprintf(
                                "Unable to load component from module '%s': " +
                                "Component does not specify a '%s' parameter",
                                module.name,
                                param
                            ));
                            errors = true;
                        }    
                    }

                    if (!errors) {

                        let params = {};

                        // optional params ..
                        if ('label' in component)
                            params.label = component.label;

                        if ('description' in component)
                            params.description = component.description;

                        hftd.component.register(component.type, component.code, component.file, params);

                    } else throw new Error("Unable to register component");

                } catch (e) {
                    hftd.error(e);
                }

            }
        
        }

    }

    registerHooks(moduleKey) {
        for (var hook in this.registry)
            if (typeof this.modules[moduleKey][hook] == 'function')
                this.registry[hook][moduleKey] = this.modules[moduleKey][hook];
    };

    /**
     * Start component - discover modules, sync db records, load 
     * enabled modules and invoke their init hooks
     */
    start(callback) {
        
        var manager = hftd.module;

        async.waterfall([

            manager.discover,       // discover modules present
            manager.syncDB,         // make sure db collection is in sync
            manager.getEnabled,     // retrieve modules enabled
            manager.loadModules,    // load them
            
            (taskCallback) => {
                manager.invokeAll('init', null, taskCallback);
            }
            
        ], (error) => {
            
            if (error)
                return callback(error);
            
            hftd.log(sprintf('Module loading complete - [ %s ]', color('OK', 'green')));
            callback();

        });
    }

    syncDB(modules, callback) {

        var db = hftd.db;

        async.forEach(Object.keys(modules), function(moduleKey, taskCallback) {
            
            var module = modules[moduleKey];
            module.key = moduleKey;

            db.collection('modules').updateOne({
                key: moduleKey
            }, {
                $set: module,
                $setOnInsert: {
                    installed: 0,
                    enabled:   0
                }
            }, {
                upsert: true
            }, taskCallback);

        }, callback);

    }

    uninstall(moduleKey, callback) {

        var manager = hftd.module;
        var db      = hftd.db;

        async.waterfall([
            
            manager.discover,
            manager.syncDB,
            manager.getAll

        ], (error, modulesAvailable) => {

            var modules   = {};
                
            modulesAvailable.forEach(module => modules[module.key] = module);

            if (!(moduleKey in modules))
                return callback(sprintf("Unknown module: '%s'", moduleKey));

            if (!modules[moduleKey].installed)
                return callback(sprintf("'%s' is already uninstalled", modules[moduleKey].name));
       
            if (modules[moduleKey].enabled)
                return callback(sprintf("'%s' is enabled. Please disable the module before uninstalling.", modules[moduleKey].name));

            var module = require(modules[moduleKey].file)();

            if ('uninstall' in module && typeof module.uninstall == 'function') {
                var returnValue = module.uninstall();
            } else {
                var returnValue = 1;
            }

            Promise.resolve(returnValue)
                .then(() => {
                    return db.collection('modules').updateOne({
                        key: moduleKey   
                    }, {
                        $set: {
                            installed: 0
                        }
                    });
                })
                .then(() => {
                    callback();
                }, (error) => {
                    callback(error);
                });

        });   
    }

    unload(moduleKey) {
        this.unregisterHooks(moduleKey);
        delete this.modules[moduleKey];
    }

    /**
     * Unregister any hooks that the module implements
     * @param string module  the module key to unregister
     */
    unregisterHooks(module) {
        for (var hook in this.registry)
            if (module in this.registry[hook])
                delete this.registry[hook][module];     
    }

}

module.exports = () => new ModuleManager();