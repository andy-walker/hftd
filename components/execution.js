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
    execution.pendingList = {};

    /**
     * Calculate initial stop loss
     */
    execution.calculateStopLoss = function(direction, amount, percentage) {
                  
        if (direction == 'short' || direction == 'sell')
            return amount + (amount * (percentage / 100));
        else if (direction == 'long' || direction == 'buy')
            return amount - (amount * (percentage / 100));
        else
            hftd.error(sprintf("Unsupported direction: '%s' when calculating stop loss", direction));

    };

    /**
     * Calculate initial take-profit
     */
    execution.calculateTakeProfit = function(direction, amount, percentage) {
        
        if (direction == 'short' || direction == 'sell')
            return amount - (amount * (percentage / 100));
        else if (direction == 'long' || direction == 'buy')
            return amount + (amount * (percentage / 100));
        else
            hftd.error(sprintf("Unsupported direction: '%s' when calculating take-profit", direction));

    };

    execution.checkTrades = function(callback) {
        
        var error = false;

        for (tradeId in execution.trades) {
            if (tradeId == 'undefined') {
                error = true;
                delete execution.trades[undefined];
            }
        }

        if (error) {
            hftd.warning('Data integrity check failed, refreshing trades ...');
            execution.updateOpenPositions(callback);
        } else {
            callback();
        }

    };

    /**
     * Close trade via rest api, delete local entry if successful
     */
    execution.closeTrade = function(strategy, tradeId, callback) {

        hftd.log(sprintf('Closing trade %s ...', tradeId));
        
        var accountId = hftd.config.strategies[strategy].accountId;

        hftd.restAPI.client.closeTrade(accountId, tradeId, function(error, confirmation) {
            
            if (error) {
                
                hftd.error(error);
                
                if (error == 'Trade not found') {
                    hftd.log('Removing local entry');
                    delete execution.trades[tradeId];
                }

            } else {
            
                if (tradeId in execution.trades) {

                    hftd.strategist.archiveTrade({tradeId: tradeId}, execution.trades[tradeId]);
                    delete execution.trades[tradeId];
                    hftd.strategist.updateStats();

                }

                hftd.log(sprintf('Position closed - [ %s ]', color('OK', 'green')));

                if ('mirror' in hftd)
                    hftd.mirror.closeTrades(tradeId);

            }

            if (callback)
                callback(error, confirmation);
        
        });
  
    };

    /**
     * Getter function for account balance
     */
    execution.getAccountBalance = function(strategy) {
        return execution.account[strategy].balance;
    };

    /**
     * Refresh instrument list
     */
    execution.getInstruments = function(callback) {
        
        var account = hftd.config.account;
        var client  = hftd.restAPI.client;

        client.getInstruments(account.accountId, function(error, instruments) {
            
            if (error)
                return callback(error);

            instruments.forEach(function(instrument) {
                execution.instruments[instrument.instrument] = instrument;
            });

            callback();
        
        });
    
    };

    /**
     * Get any open positions for the strategy / instrument
     */
    execution.getOpenTrades = function(strategy, instrument) {
        
        var openTrades = [];

        for (var tid in execution.trades) {
            var trade = execution.trades[tid];
            if (trade.strategy == strategy && trade.instrument == instrument)
                openTrades.push(trade);
        }

        return openTrades;

    };

    /**
     * Retrieve details for open position by strategy / instrument
     * @return bool
     */
    execution.hasOpenPosition = function(strategy, instrument) {
        for (var tid in execution.trades) {
            var trade = execution.trades[tid];
            if (trade.strategy == strategy && trade.instrument == instrument)
                return true;
        }
        if (typeof execution.pendingList[strategy][instrument] !== 'undefined')
            return true;
        return false;
    };

    /**
     * Get pip precision on the specified instruments, necessary for rounding 
     * stop loss / take profits correctly - Oanda is pretty fussy about decimal precision
     * @return int
     */
    execution.getPipPrecision = function(instrument) {

        if (typeof execution.instruments[instrument] == 'undefined')
            return hftd.error(sprintf("Unknown instrument '%s' in execution.getPipPrecision()", instrument));

        var pip = execution.instruments[instrument].pip;

        // no subpips on the following
        if (_.contains(['HK33_HKD', 'UK100_GBP', 'DE30_EUR'], instrument))
            return pip.split('.')[1].length;

        // no decimal point, precision = 1
        if (pip.indexOf('.') === false)
            return 1;

        // return precision + 1 including subpips
        return pip.split('.')[1].length + 1;
    
    };

    /**
     * Query whether market is open for the requested instrument
     */
    execution.isMarketOpen = function(instrument) {
        if (execution.instruments[instrument].halted)
            return false;
        return true;
    };

    /**
     * Get quotes on all instruments - these will be used as a fallback
     * when we have no tick data for the instrument
     */
    execution.getQuotes = function(callback) {
        
        hftd.restAPI.client.getPrice(_.keys(execution.instruments), function(error, prices) {
            
            if (error)
                return callback(error);
            
            prices.forEach(function(quote) {
                execution.quotes[quote.instrument] = quote;
            });
            //console.log(execution.quotes);
            callback();
        
        });
    
    };

    execution.onEvent = function(event) {
        
        hftd.log('Received event:');
        console.log(event);

        var transaction = event.transaction;

        switch (transaction.type) {
            
            case 'STOP_LOSS_FILLED':
            case 'TAKE_PROFIT_FILLED':
            case 'TRADE_CLOSE':
                
                var reason = {
                    'STOP_LOSS_FILLED':   'hit stop loss',
                    'TAKE_PROFIT_FILLED': 'hit take profit',
                    'TRADE_CLOSE':        'trade closed'
                }[transaction.type];

                hftd.log(sprintf('Closed trade %s on %s (%s)', transaction.tradeId, transaction.instrument, reason));
                
                if (transaction.tradeId in execution.trades) {

                    var trade    = execution.trades[transaction.tradeId];
                    var strategy = trade.strategy;

                    hftd.strategist.archiveTrade(transaction, trade);
                    delete execution.trades[transaction.tradeId];
                    
                    execution.account[strategy].balance = transaction.accountBalance;
                    hftd.strategist.updateStats();

                }

                break;
        
        }
    
    };

    /**
     * Open trade via rest api, create local data entry if successful
     */
    execution.openPosition = function(strategy, params, data) {
        
        hftd.log(sprintf('%s: opening %s position on %s ...', strategy, params.side, params.instrument));

        console.log(params);

        if (params.units < 1)
            params.units = 1;

        if (params.side == 'long')
            params.side = 'buy';
        else if (params.side == 'short')
            params.side = 'sell';

        params.type = 'market';

        var accountId = hftd.config.strategies[strategy].accountId;

        if (!accountId)
            return hftd.error(sprintf("No account id set for strategy '%s'", strategy));

        if (typeof execution.pendingList[strategy][params.instrument] !== 'undefined')
            return hftd.error('Skipping as on pending list');

        // push onto pending list, prevents multiple trades being opened in a fast moving market
        execution.pendingList[strategy][params.instrument] = 1;

        hftd.restAPI.client.createOrder(accountId, params, function(error, confirmation) {
            
            if (error) {
                delete execution.pendingList[strategy][params.instrument];
                return hftd.error(error);
            }

            hftd.log(sprintf('Received trade confirmation for %s on %s', strategy, params.instrument));
            console.log(confirmation);
            if (typeof confirmation.tradeOpened.id === 'undefined')
                hftd.warning('No trade id present in confirmation.');

            // remove from pending list
            delete execution.pendingList[strategy][params.instrument];

            if (typeof confirmation.tradeOpened.id !== 'undefined') {

                // copy any metadata we want to store
                for (key in data)
                    params[key] = data[key];

                // record which strategy opened the trade
                params.strategy = strategy;
                params.tid      = confirmation.tradeOpened.id;
                params.id       = confirmation.tradeOpened.id;

                execution.trades[confirmation.tradeOpened.id] = params;

                // perform trade mirroring if component enabled
                if ('mirror' in hftd)
                    hftd.mirror.openTrades(params);

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

        //console.log(execution.trades);
        hftd.log("Refreshing local data ...");

        async.series([
            execution.updateAccount,
            execution.getInstruments,
            execution.getQuotes,
            execution.checkTrades
        ], function(error) {
            if (error)
                return hftd.error(error);
            var numAccounts = Object.keys(execution.account).length;
            var numTrades   = Object.keys(execution.trades).length;
            hftd.log(sprintf("Refresh complete: (%d open trades on %d accounts) - [ %s ]", numTrades, numAccounts, color('OK', 'green')));
        });
    
    };

    /**
     * Initialize
     */
    execution.start = function(callback) {
        
        hftd.log('Initializing execution model ...');

        // initialize pending list
        hftd.strategist.getEnabledStrategies().forEach(function(strategy) {
            execution.pendingList[strategy] = {};
        });
        
        async.series([
            execution.updateAccount,
            execution.getInstruments,
            execution.getQuotes,
            execution.updateOpenPositions
        ], function(error) {
            if (error) {
                hftd.error(error);
                callback(error);
            }
            // if all went ok, schedule refresh every 60 seconds
            console.log('Adding refresher job');
            hftd.scheduler.addJob("0 * * * * *", execution.refreshData);
            callback();
        });

    };

    /**
     * Update account details from rest api
     */
    execution.updateAccount = function(completedCallback) {

        var accounts = hftd.strategist.getAccounts();

        async.forEach(accounts, function(subAccount, taskCallback) {
            
            hftd.restAPI.client.getAccount(subAccount.accountId, function(error, account) {
                if (error) {
                    hftd.error(error);
                    return taskCallback(error);
                }
                execution.account[subAccount.strategy] = account;
                taskCallback();
            });

        }, completedCallback);

    };

    /**
     * Get a list of open trades from broker and store in local data structures.
     * This is used during initialization so we can restart / recover from a crash,
     * and carry on from where we left off.
     */
    execution.updateOpenPositions = function(completedCallback) {
        
        var accounts = hftd.strategist.getAccounts();

        async.forEach(accounts, function(account, taskCallback) {
            
            hftd.restAPI.client.getOpenTrades(account.accountId, function(error, trades) {
                if (error)
                    return taskCallback(error);
                trades.forEach(function(trade) {
                    trade.strategy = account.strategy;
                    execution.trades[trade.id] = trade;
                });
                taskCallback();
            });

        }, function(error) {
            
            if (error) {
                hftd.error(error);
                return completedCallback(error);
            }
            
            completedCallback();
        
        });

    };

};

module.exports = function() {
    return new execution();
};