var mirror = function() {

    var mirror = this;

    mirror.client   = [];
    mirror.trades   = {};
    mirror.balances = {};

    mirror.onEvent = function(event) {

        var transaction = event.transaction;

        switch (transaction.type) {
            
            case 'STOP_LOSS_FILLED':
            case 'TAKE_PROFIT_FILLED':
                
                var type = (transaction.type == 'STOP_LOSS_FILLED' ? 'stop loss' : 'take profit');
                hftd.log(sprintf('Closed trade %s on %s (%s filled)', transaction.tradeId, transaction.instrument, type));

                mirror.balances[transaction.accountId] = transaction.accountBalance; 
                delete mirror.trades[transaction.tradeId];
                break;

        }

    };

    mirror.start = function(callback) {
        
        var accounts = hftd.config.mirrorAccounts;
        
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

            mirror.client.push(client);

        }
    
    };

    mirror.trade = function(strategy, params) {

    };

};

module.exports = function() {
    return new mirror();
};