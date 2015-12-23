/**
 * Execution services 
 */
var execution = function() {

    var execution = this;

    // objects to keep track of account balance / trades
    execution.account     = {};
    execution.trades      = {};
    execution.instruments = {};
    execution.quotes      = {};

    /**
     * Close trade via rest api, delete local entry if successful
     */
    execution.closePosition = function(tradeId) {
        
        hftd.log(sprintf('Closing trade %s ...', tradeId));

        hftd.restAPI.client.closeTrade(tradeId, function(error, confirmation) {
            if (error)
                return hftd.error(error);
            delete execution.trades[tradeId];
            hftd.log(sprintf('Position closed - [ %s ]', color('OK', 'green')));
        });
  
    };

    /**
     * Getter function for account balance
     */
    execution.getAccountBalance = function() {
        return execution.account.balance;
    };

    /**
     * Refresh instrument list
     */
    execution.getInstruments = function(callback) {
        
        var account = hftd.config.account;
        var client  = hftd.restAPI.client;

        client.getInstruments(account.accountId, function(error, instruments) {
            
            if (error)
                callback(error);

            instruments.forEach(function(instrument) {
                execution.instruments[instrument.instrument] = instrument;
            });

            callback();
        
        });
    
    };

    /**
     * Retrieve details for open position by strategy / instrument
     */
    execution.hasOpenPosition = function(strategy, instrument) {
        for (var tid in execution.trades) {
            var trade = execution.trades[tid];
            if (trade.strategy == strategy && trade.instrument == instrument)
                return true;
        }
        return false;
    };

    /**
     * Get pip precision on the specified instruments
     * - necessary for rounding stop loss / take profit correctly
     */
    execution.getPipPrecision = function(instrument) {

        if (typeof execution.instruments[instrument] == 'undefined')
            return hftd.error(sprintf("Unknown instrument '%s' in execution.getPipPrecision()", instrument));

        var pip = execution.instruments[instrument].pip;

        // no subpips on the following
        if (_.contains(['HK33_HKD', 'UK100_GBP'], instrument))
            return pip.split('.')[1].length;

        // no decimal point, precision = 1
        if (pip.indexOf('.') === false)
            return 1;

        // return precision + 1 including subpips
        return pip.split('.')[1].length + 1;
    
    };

    /**
     * Get quotes on all instruments - these will be used as a fallback
     * when we have no tick data for the instrument
     */
    execution.getQuotes = function(callback) {
        
        hftd.restAPI.client.getPrice(Object.keys(execution.instruments), function(error, prices) {
            
            if (error)
                callback(error);
            
            prices.forEach(function(quote) {
                execution.quotes[quote.instrument] = quote;
            });

            callback();
        
        });
    
    };

    execution.onEvent = function(event) {
        hftd.log('Received event:');
        console.log(event);
        switch (event.transaction.type) {
            case 'STOP_LOSS_FILLED':
                hftd.log(sprintf('Closed trade %s on %s (hit stop loss)', event.transaction.tradeId, event.transaction.instrument));
                delete execution.trades[event.transaction.tradeId];
                break;
            case 'TAKE_PROFIT_FILLED':
                hftd.log(sprintf('Closed trade %s on %s (hit take profit)', event.transaction.tradeId, event.transaction.instrument));
                delete execution.trades[event.transaction.tradeId];
                break;               
        }
    };

    /**
     * Open trade via rest api, create local data entry if successful
     */
    execution.openPosition = function(strategy, params) {
        
        hftd.log(sprintf('%s: opening %s position on %s ...', strategy, params.direction, params.instrument));

        console.log(params);

        if (params.units < 1)
            return hftd.error(sprintf('Minimum trade size must be 1 unit (supplied: %d)', params.units));
        
        if (params.side == 'long')
            params.side = 'buy';
        else if (params.side == 'short')
            params.side = 'sell';

        var account = hftd.config.account;
        params.type = 'market';

        hftd.restAPI.client.createOrder(account.accountId, params, function(error, confirmation) {
            
            if (error)
                return hftd.error(error);

            if (typeof confirmation.tradeOpened !== 'undefined') {
                params.strategy = strategy;
                execution.trades[confirmation.tradeOpened.id] = params;
            } else {
                hftd.error('Unable to open trade on ' + params.instrument);
                console.log(confirmation);
            }

        });
        
    };

    /**
     * Refresh internal data from api every minute
     */
    execution.refreshData = function() {

        console.log(execution.trades);

        async.series([
            execution.updateAccount,
            execution.getInstruments,
            execution.getQuotes
        ], function(error) {
            if (error)
                hftd.error(error);
        });
    
    };

    /**
     * Initialize
     */
    execution.start = function(callback) {
        
        hftd.log('Initializing execution model ...');
        
        async.series([
            execution.updateAccount,
            execution.getInstruments,
            execution.getQuotes
        ], function(error) {
            if (error)
                callback(error);
            // if all went ok, schedule refresh every 60 seconds
            hftd.scheduler.addJob("0 * * * * *", execution.refreshData);
            callback();
        });

    };

    /**
     * Update account details from rest api
     */
    execution.updateAccount = function(callback) {
        hftd.restAPI.client.getAccount(hftd.config.account.accountId, function(error, account) {
            if (error)
                return hftd.error(error);
            execution.account = account;
            callback();
        });
    };

};

module.exports = function() {
    return new execution();
};