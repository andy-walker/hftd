/**
 * Component manager class
 */

"use strict"

class ComponentManager {

    /**
     * Constructor
     */
    constructor() {
        
        this.available = {
            datasource: {},
            alpha:      {},
            money:      {},
            risk:       {},
            execution:  {}
        };

        this.components = {
            datasource: {},
            alpha:      {},
            money:      {},
            risk:       {},
            execution:  {}
        };

    }

    /**
     * Return a singleton instance of component
     * @param  string type    component type
     * @param  object config  component config
     * @return object
     */
    get(type, config) {

        var key     = config.component;
        var account = (type == 'datasource' || type == 'execution') ? config.account : null;


        if (!(type in this.available))
            return hftd.error(sprintf(
                "Unrecognized component type (%s) while instancing component '%s'",
                type, key
            ));

        if (!(key in this.available[type]))
            return hftd.error(sprintf(
                "Unrecognized %s component (%s)",
                type, key
            ));

        if (!(key in this.components[type])) 
            this.load(type, key, config);
        
        // for datasource and execution, return reference to singleton object per account
        // for all other types, return a new instance
        return (type == 'datasource' || type == 'execution') ?
            this.components[type][key][account] : new this.components[type][key];
        
    }

    /**
     * Load component
     */
    load(type, key, config) {
        
        var filename = this.available[type][key].file;

        switch (type) {
            
            // datasource and execution are singletons shared between all strategies 
            // that use them - when loading, instance new object and we'll return it 
            // each time via get method
            case 'datasource':
            case 'execution':
                this.components[type][key][config.account] = new requireNew(filename)(config);
                break;
            
            // all other types are object instances - load the class itself,
            // and we'll instance it each time via get method
            default:
                this.components[type][key] = requireNew(filename);
                break;

        }

    }

    /**
     * Register component
     */
    register(type, key, file, params) {

        params = params || {};

        if (!(type in this.available))
            return hftd.error(sprintf(
                "Unrecognized component type (%s) while registering component '%s'",
                type, key
            ));
    
        let component = requireNew(file);

        if ('info' in component && typeof component.info == 'function') {

            let info = component.info();
            
            if (!('name' in params) && 'name' in info)
                params.name = info.name;

            if (!('description' in params) && 'description' in info)
                params.description = info.description;

            // for internal components (eg: backtest execution) which should be
            // hidden from ui
            if ('hidden' in info)
                params.hidden = info.hidden;

        }

        params.file = file;
        this.available[type][key] = params;

    }

    /**
     * Start component manager
     */
    start(callback) {
        
        var component = hftd.component;
        
        Promise.coroutine(function*() {

            // for each component type ..
            for (let type in component.available) {

                // construct a list of component dirs to search including subdirs
                let dir  = path.join(__dirname, '..', 'components', type);
                let dirs = yield subdirs(dir);

                dirs.push(dir);
                
                // for each directory ..
                for (let dir of dirs) {
                    
                    // enumerate files in directory
                    let files = yield pfs.readdir(dir);

                    for (let file of files) {
                        let key = path.basename(file, '.js');
                        component.register(type, key, path.join(dir, file));
                    }
               
                }

            }
              
        })()
        .then(() => callback())
        .catch((error) => callback(error));

    }

    unload(type, key) {

        delete this.components[type][key];
    
    }

    unregister(type, key) {
        // todo:
    }

}

module.exports = () => new ComponentManager();