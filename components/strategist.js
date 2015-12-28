/**
 * Strategy manager object
 */
var strategyManager = function() {

    var strategyManager = this;

    // object to hold instanced strategy components indexed by name
    strategyManager.strategies = {};

    // array to hold onTick callbacks, if any strategies define one
    strategyManager.onTickCallbacks = [];

    /**
     * Get an array mapping strategies to accounts for all enabled strategies
     */
    strategyManager.getAccounts = function() {
        
        var config   = hftd.config;
        var accounts = [];
        
        for (strategyName in config.strategies) {
            var strategy = config.strategies[strategyName];
            if (typeof strategy.enabled === 'undefined' || strategy.enabled) {
                accounts.push({
                    strategy:  strategyName,
                    accountId: strategy.accountId
                });
            }
        }

        return accounts;
    
    };

    /**
     * Get an array of enabled strategies
     * @return array  an array of strategy names
     */
    strategyManager.getEnabledStrategies = function() {
        
        var config     = hftd.config;
        var strategies = [];
        
        for (strategyName in config.strategies) {
            var strategy = config.strategies[strategyName];
            if (typeof strategy.enabled === 'undefined' || strategy.enabled) 
                strategies.push(strategyName);
        }

        return strategies;
    
    };

    /**
     * Initialize
     */
    strategyManager.start = function(callback) {

        var config        = hftd.config;
        var numStrategies = strategyManager.getEnabledStrategies().length;

        if (typeof config.strategies === 'undefined' || !numStrategies) {
            hftd.error("No enabled strategies found.");
            process.exit(1);
        }

        hftd.log(sprintf('Initializing strategies (found %d strateg%s) ...', numStrategies, numStrategies > 1 ? 'ies' : 'y'));

        // initialize all enabled strategies defined in config
        for (strategyName in config.strategies) {
            
            // get config for strategy
            var strategy = config.strategies[strategyName];     
            
            if (typeof strategy.enabled === 'undefined' || strategy.enabled) {

                strategy.name = strategyName;

                // instance strategy object, pass config into constructor
                strategyManager.strategies[strategyName] = new require('../alpha/' + strategy.alpha)(strategy);
                
                // if strategy defines a run callback, schedule at the interval specified in config
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

        // initialize stats.csv file if it doesn't exist
        var statsFile = __dirname + '/../data/stats.csv';
        fs.exists(statsFile, function(exists) {
            if (!exists) {
                hftd.log('No stats file found. Creating new file ...');
                var headers = strategyManager.getEnabledStrategies();
                headers.unshift('Date/Time');
                fs.writeFile(statsFile, headers.join(',') + "\n", function(error) {
                    if (error)
                        return hftd.error(error);
                    hftd.log(sprintf('Stats file created - [ %s ]', color('OK', 'green')));
                    strategyManager.updateStats();
                });
            }
            callback();
        });

    };

    strategyManager.onTick = function(tick) {
        strategyManager.onTickCallbacks.forEach(function(callback) {
            callback(tick);
        });
    };

    /**
     * Update stats.csv file with account balances
     * Called after a trade was closed
     */
    strategyManager.updateStats = function() {
        
        var strategies = strategyManager.getEnabledStrategies();
        var rows       = [strftime('%a %Y-%m-%d %H:%M:%S', new Date())];

        strategies.forEach(function(strategyName) {
            rows.push(hftd.execution.getAccountBalance(strategyName));
        });

        fs.appendFile(__dirname + '/../data/stats.csv', rows.join(',') + "\n", function(error) {
            if (error)
                return hftd.error(error);
        });

    };

};

module.exports = function() {
    return new strategyManager();
};