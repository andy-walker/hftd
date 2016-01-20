var OANDAAdapter = require('oanda-adapter');

var mirror = function() {

    var mirror = this;

    mirror.dataFile = __dirname + '/../data/mirror/trades.json';

    mirror.client   = {};
    mirror.trades   = {};
    mirror.accounts = {};

    mirror.closeTrades = function(masterTradeId, jobCallback) {
        
        if (!(masterTradeId in mirror.trades))
            return;

        // iterate over linked trades for the master id ..
        async.forEach(Object.keys(mirror.trades[masterTradeId]), function(accountName, taskCallback) {

            var tradeId = mirror.trades[masterTradeId][accountName]
            var client  = mirror.client[accountName];

            var accountId = mirror.getAccountId(accountName);
            if (!accountId)
                return hftd.error(sprintf("Unable to get account id for '%s' during mirror trade close", trade.accountName));

            client.closeTrade(accountId, tradeId, function(error, confirmation) {
                
                if (error) {
                    
                    hftd.error(error);
                    
                    if (error == 'Trade not found') {
                        hftd.log('Removing local entry');
                        delete mirror.trades[masterTradeId][accountName];
                    }

                } else {

                    if (masterTradeId in mirror.trades && accountName in mirror.trades[masterTradeId]) {

                        // not sure if we want to archive mirrored trades or not? probably at some point
                        // hftd.strategist.archiveTrade({tradeId: tradeId}, execution.trades[tradeId]);
                        delete mirror.trades[masterTradeId][accountName];

                    }

                    hftd.log(sprintf("Mirrored position closed (%s on '%s') - [ %s ]", tradeId, accountName, color('OK', 'green')));

                }

                if (!Object.keys(mirror.trades[masterTradeId]).length)
                    delete mirror.trades[masterTradeId];
            
            }); 

        }, function(error) {
            // commit data to disk regardless of whether there was an error or not.
            // we'll trust this to work for the moment, remove the need for another nested callback
            mirror.saveData(); 
            if (jobCallback)
                jobCallback(error);
        });
    

    };

    /**
     * Retrieve account stats (balance, marginUsed etc) by accountName
     */
    mirror.getAccount = function(accountName) {
        if (accountName in mirror.accounts)
            return mirror.accounts[accountName];
        return false;
    };

    /**
     * Get the account id for a named account
     */
    mirror.getAccountId = function(accountName) {
        var accounts = hftd.config.mirrorAccounts;
        if (accountName in accounts && 'accountId' in accounts[accountName])
            return accounts[accountName].accountId;
        return false;      
    };

    /**
     * Get accounts to mirror onto and associated multipliers based on 
     * strategy - return false if mirroring disabled / not configured
     */
    mirror.getAccountMultipliers = function(strategy) {
        
        if ('mirror' in hftd.config.strategies[strategy]) {
            
            var mirror      = hftd.config.strategies[strategy].mirror;
            var multipliers = {};

            for (var accountName in mirror) {
                multipliers[accountName] = mirror[accountName];
            }
            
            if (Object.keys(multipliers).length)
                return multipliers;

        }

        return false;
    
    };

    /**
     * Search trades data for masterTradeId when supplied with a tradeId
     */
    mirror.getMasterTradeId = function(tradeId) {
        for (var masterTradeId in mirror.trades) {
            for (var accountName in mirror.trades[masterTradeId]) {
                if (mirror.trades[masterTradeId][accountName] == tradeId)
                    return masterTradeId;
            }
        }
        return false;
    };

    /**
     * Determine if mirroring enabled for a given strategy
     */
    mirror.isEnabled = function(strategy) {
        return ('mirror' in hftd.config.strategies[strategy]);
    };

    mirror.onEvent = function(event) {

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

                //mirror.balances[transaction.accountId] = transaction.accountBalance; 
                var masterTradeId = mirror.getMasterTradeId(transaction.tradeId);

                if (!masterTradeId)
                    return hftd.warning("Master trade id not found for trade id " + transaction.tradeId);

                for (var accountName in mirror.trades[masterTradeId]) {
                    if (mirror.trades[masterTradeId] == transaction.tradeId) {
                        delete mirror.trades[masterTradeId][accountName];
                        if (!Object.keys(mirror.trades[masterTradeId]).length)
                            delete mirror.trades[masterTradeId];   
                        mirror.saveData();            
                    }
                }


                break;

        }

    };

    mirror.openTrade = function(accountName, masterTradeId, params) {

        var client    = mirror.client[accountName];
        var accountId = mirror.getAccountId(accountName);

        params.type = 'market';

        client.createOrder(accountId, params, function(error, confirmation) {
            
            if (error)
                return hftd.error(error);

            if (typeof confirmation.tradeOpened.id !== 'undefined') {
                
                if (!(masterTradeId in mirror.trades))
                    mirror.trades[masterTradeId] = {};
                
                mirror.trades[masterTradeId][accountName] = confirmation.tradeOpened.id;
                mirror.saveData();

            } else {
                hftd.error(sprintf('Unable to open %s trade on %s', params.instrument, accountName));
                console.log(confirmation);
            }

        });

    };

    mirror.openTrades = function(params) {

        var multipliers = mirror.getAccountMultipliers(params.strategy);
        var config      = hftd.config.strategies[params.strategy];
        var execution   = hftd.execution;
        var chartist    = hftd.chartist;

        if (!multipliers)
            return;

        for (var accountName in multipliers) {
            
            var multiplier = multipliers[accountName];
            var account    = mirror.getAccount(accountName);

            if (!account) {
                hftd.warning(sprintf("Unable to load account details for '%'", accountName));
                continue;
            }

            // if multiplier is zero, indicates a disabled state - skip account
            if (!multiplier)
                continue;

            var instrument = params.instrument;
            var quote      = chartist.getQuote(instrument);

            if (params.side == 'buy') {

                // prepare to open long position
                var quotePrice    = quote.ask;
                var oppositePrice = quote.bid;
                var gbpAmount     = account.balance * ((config.positionSize * multiplier) / 100);
                var units         = Math.floor(chartist.convert(gbpAmount, 'GBP', instrument.split('_')[0]) * 20);
                var stopLoss      = execution.calculateStopLoss('buy', oppositePrice, config.stopLoss);

            } else if (params.side == 'sell') {

                // open short position
                var quotePrice    = quote.bid;
                var oppositePrice = quote.ask;
                var gbpAmount     = account.balance * ((config.positionSize * multiplier) / 100);
                var units         = Math.floor(chartist.convert(gbpAmount, 'GBP', instrument.split('_')[0]) * 20);
                var stopLoss      = execution.calculateStopLoss('sell', oppositePrice, config.stopLoss);

            }

            // adjust stop-loss to correct precision
            var precision = execution.getPipPrecision(instrument);
            stopLoss      = stopLoss.toFixed(precision);

            mirror.openTrade(accountName, params.id, {
                side:       params.side,
                instrument: instrument,
                units:      units,
                stopLoss:   stopLoss
            });

        }

    };

    /**
     * Save internal data to disk
     */
    mirror.saveData = function(callback) {
        fs.writeFile(mirror.dataFile, JSON.stringify(mirror.trades), function(error) {
            if (error)
                hftd.error(error);
            if (callback)
                return callback(error);
        });       
    };

    /**
     * Initialize component
     */
    mirror.start = function(callback) {
        
        var accounts  = hftd.config.mirrorAccounts;
        mirror.trades = require(mirror.dataFile); 
        
        for (var accountName in accounts) {
            
            var account     = accounts[accountName];
            var environment = account.accountType == 'demo' ? 'practice' : 'live';
            var client      = new OANDAAdapter({
                environment: environment,
                accessToken: account.accessToken
            });

            client.subscribeEvents(function(event) {
                mirror.onEvent(event);
            });

            mirror.client[accountName] = client;

        }
    
        // update accounts (balances etc) now, and 20 seconds past each minute
        mirror.updateAccounts();
        hftd.scheduler.addJob("20 * * * * *", mirror.updateAccounts);
        callback();

    };

    mirror.updateAccounts = function() {

        var accounts = hftd.config.mirrorAccounts;
        async.forEach(Object.keys(accounts), function(accountName, taskCallback) {
            var accountId = accounts[accountName].accountId;
            mirror.client[accountName].getAccount(accountId, function(error, account) {
                if (error)
                    return taskCallback(error);
                mirror.accounts[accountName] = account;
                taskCallback();
            });
        }, function(error) {
            if (error)
                return hftd.error(error);
        });

    };

};

module.exports = function() {
    return new mirror();
};