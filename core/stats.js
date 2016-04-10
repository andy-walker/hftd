"use strict"

class Stats {

    /**
     * Calculate profit/loss in the base (account) currency
     * @todo move this elsewhere
     */
    calculateProfitLoss(side, entryPrice, lastPrice) {
        
        if (side == 'buy')
            return lastPrice - entryPrice;
        else if (side == 'sell')
            return entryPrice - lastPrice;
        else {
            hftd.error(sprintf("Unsupported trade direction: '%s' in stats.calculateProfitLossBase", side));
            return 0;
        }

    }

    /**
     * Calculate profit/loss in percent
     * @todo move this elsewhere
     */
    calculateProfitLossPercent(side, entryPrice, lastPrice) {

        var multiplier;

        if (side == 'buy') {
            multiplier = lastPrice / entryPrice;
        } else if (side == 'sell') {
            var profit = entryPrice - lastPrice;
            multiplier = (entryPrice + profit) / entryPrice;
        } else {
            hftd.error(sprintf("Unsupported trade direction: '%s' in stats.calculateProfitLossPercent", side));
            return 0;
        }
    
        return (multiplier - 1) * 100;      

    }

    /**
     * Initialize metrics - create initial per-instrument db records
     * where none exist
     */
    initialize(callback) {

        hftd.log('Initializing account balance metrics ...');

        var strategies = hftd.strategist.getEnabledStrategies();
        var db         = hftd.db;
        
        async.forEach(strategies, (strategy, strategyCallback) => {

            var instruments = hftd.config.strategies[strategy].instruments;
            var accountId   = hftd.strategist.getAccountId(strategy);

            async.forEach(instruments, (instrument, instrumentCallback) => {

                db.collection('balances').find({
                    accountId:  accountId,
                    instrument: instrument
                })
                    .limit(1)
                    .toArray()
                    .then(

                        records => {
                            // if no record exists, create one with balance initialized at zero
                            if (!records.length) {
                                hftd.log(sprintf("Initializing instrument balance for %s (%s)", instrument, strategy));
                                return db.collection('balances').insertOne({
                                    accountId:  accountId,
                                    instrument: instrument,
                                    date:       new Date(),
                                    balance:    0
                                });
                            }
                            
                            return Promise.resolve();
                        
                        },

                        error => hftd.error(error)

                    )

                    .then(

                        ()    => instrumentCallback(),
                        error => instrumentCallback(error)

                    );

            }, strategyCallback);

        }, error => {
            
            if (error)
                return callback(error);
            
            hftd.log(sprintf("Account balance initialization complete - [ %s ]", color('OK', 'green')));
            callback();

        });

    }

    updateAccountBalanceHistory(strategy, instrument, pl) {

        var accountId = hftd.strategist.getAccountId(strategy);
        var balance   = hftd.execution.account[strategy].balance;
        var db        = hftd.db;

        // update account balance
        db.collection('balances').insertOne({     
            accountId: accountId,
            date:      new Date(),
            balance:   balance
        });

        // update per-instrument balance
        db.collection('balances').find({
            accountId:  accountId,
            instrument: instrument
        })
            .sort({ date: -1})
            .limit(1)
            .toArray()
            .then(
                
                account => {

                    db.collection('balances').insertOne({
                        accountId:  accountId,
                        instrument: instrument,
                        date:       new Date(),
                        balance:    account.balance + pl
                    });

                }, 
                
                error => hftd.error(sprintf(
                    "An error occurred updating balance history for strategy '%s' on instrument '%s': %s",
                    strategy, instrument, error
                ))

            );

 
    }

}

module.exports = () => new Stats();