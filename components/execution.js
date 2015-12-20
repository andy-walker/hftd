/**
 * Execution services 
 */
var execution = function() {};

/**
 * Close trade via rest api, delete local entry if successful
 */
execution.prototype.closePosition = function(tradeId) {
    hftd.log(sprintf('Closing trade %s ...', tradeId));
    hftd.restAPI.closePosition(strategy, params, function(error, result) {
        if (error)
            return hftd.error(error);
        hftd.data.trade.remove(tradeId);
        hftd.log(sprintf('Position closed - [ %s ]', color('OK', 'green')));
    });   
};

/**
 * Retrieve details for open position by strategy / instrument
 */
execution.prototype.getOpenPosition = function(strategy, instrument) {
    /*return hftd.data.trade.get({
        strategy: strategy,
        instrument: instrument
    });*/
};

/**
 * Open trade via rest api, create local data entry if successful
 */
execution.prototype.openPosition = function(strategy, params) {
    hftd.log(sprintf('%s: opening %s position on %s ...', strategy, params.direction, params.instrument));
    /*
    hftd.restAPI.openPosition(strategy, params, function(error, result) {
        if (error)
            return hftd.error(error);
        hftd.data.trade.create(strategy, params, result);
        hftd.log(sprintf('Trade successfully opened - [ %s ]', color('OK', 'green')));
    });
    */
};

/**
 * Initialize
 */
execution.prototype.start = function() {
    // on startup, close any open trades which might be hanging around
    for (var tradeId in hftd.data.trade.getAll()) {
        execution.closePosition(tradeId);
    }
};

module.exports = function() {
    return new execution();
};