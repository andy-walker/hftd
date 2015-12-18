/**
 * Strategy manager object
 */

var strategyManager = function() {

};

// object to hold instanced strategy components indexed by name
strategyManager.strategies = {};

// array to hold onTick callbacks, if any strategies define one
strategyManager.onTickCallbacks = [];

/**
 * Initialize
 */
strategyManager.prototype.start = function(callback) {

    var config = hftd.config;
    var numStrategies = Object.keys(config.strategies).length;

    if (typeof config.strategies === 'undefined' || !numStrategies) {
        hftd.error("No strategies defined.");
        process.exit(1);
    }

    hftd.log(sprintf('Initializing strategies (found %d strateg%s) ...', numStrategies, numStrategies > 1 ? 'ies' : 'y'));

    // initialize all enabled strategies defined in config
    for (strategyName in config.strategies) {
        
        // get config for strategy
        var strategy = config.strategies[strategyName];     
        
        if (typeof strategy.enabled === 'undefined' || strategy.enabled) {

            // instance strategy object, pass config into constructor
            strategyManager.strategies[strategyName] = new require('../strategies/' + strategyName)(strategy);
            
            // if strategy defines an run callback, schedule at the interval specified in config
            if (typeof strategyManager.strategies[strategyName].run == 'function') {
                if (!strategy.schedule) {
                    hftd.error(sprintf("Strategy '%s' defines a 'run' method, but no schedule defined in config", strategyName));
                    process.exit(1);
                } 
                hftd.scheduler.addJob(strategy.schedule, strategyManager.strategies[strategyName].run);
            }
            
            // if strategy defines an onTick callback, add to list of callbacks
            if (typeof strategyManager.strategies[strategyName].onTick == 'function')
                strategyManager.onTickCallbacks.push(strategyManager.strategies[strategyName].onTick);
        
            hftd.log(sprintf("Initialized strategy: '%s' - [ %s ]", strategyName, color('OK', 'green')));

        }    
    
    }

    callback();

};

strategyManager.prototype.onTick = function(tick) {
    strategyManager.onTickCallbacks.forEach(function(callback) {
        callback(tick);
    });
};

module.exports = function() {
    return new strategyManager();
};