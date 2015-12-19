/**
 * Execution services 
 */
var execution = function() {};

/**
 * Retrieve details for open position by strategy / instrument
 */
execution.prototype.getOpenPosition = function(strategy, instrument) {
    return hftd.data.trade.get({
        strategy: strategy,
        instrument: instrument
    });
};

/**
 * Open trade via rest api, create local data entry if successful
 */
execution.prototype.openPosition = function(strategy, params) {
    hftd.restAPI.openPosition(strategy, params, function(error, result) {
        if (error)
            return hftd.error(error);
        hftd.data.trade.create(strategy, params, result);
    });
};

/**
 * Close trade via rest api, delete local entry if successful
 */
execution.prototype.closePosition = function(tradeId) {
    hftd.restAPI.closePosition(strategy, params, function(error, result) {
        if (error)
            return hftd.error(error);
        hftd.data.trade.remove(tradeId);
    });   
};

module.exports = function() {
    return new execution();
};