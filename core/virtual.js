var virtual = function() {

    var virtual = this;

    virtual.closePosition = function() {

    };

    virtual.initAccount = function(strategyName, callback) {
        
        var config = hftd.config.strategies[strategyName];
        var db     = hftd.db;

        var accountsToCheck = [[strategyName, ''];

        config.instruments.forEach(function(instrument) {
            accountsToCheck.push([strategyName, instrument]);
        });

        async.forEach(accountsToCheck, function(account, taskCallback) {
            db.query("SELECT 1 FROM virtual_stats WHERE identifier = %s AND instrument = %s LIMIT 1", [
                account[0], account[1]
            ], function(error, results) {
                if (error) {
                    taskCallback(error);
                } else if (!results.length) {
                    db.query("
                        INSERT INTO virtual_stats (indentifier, instrument, timestamp, balance)
                        VALUES (%s, %s, NOW(), %s)
                    ", [
                        account[0], account[1], 1000
                    ], function(error) {
                        taskCallback(error);
                    });
                } else {
                    taskCallback();
                }
            });
        }, callback);
            
    };

    virtual.onTick = function(tick) {

    };

    virtual.openPosition = function() {

    };

    virtual.start = function(callback) {

        async.parallel([
            
            // create accounts
            function(initTaskCallback) {
                
                async.forEach(Object.keys(hftd.config.strategies), function(strategyName, taskCallback) {
                    
                    var config = hftd.config.strategies[strategyName];
                    
                    if ('virtual' in config && config.virtual)
                        virtual.initAccount(strategyName, taskCallback);
                    else 
                        taskCallback();

                }, initTaskCallback);

            }

        ], callback);

    };

};

module.exports = function() {
    return new virtual();
};