var subscriptions = function() {

    var subscriptions = this;

    subscriptions.subscribers = {
        tradeUpdates: []
    };

    subscriptions.subscribe = function(socket, subscription) {
        subscriptions.subscribers[subscription].push(socket);
        console.log('subscribed!');
    };

    subscriptions.unsubscribe = function(socket, subscription) {
        for (var i=0;i<subscriptions.subscribers[subscription].length;i++) {
            if (subscriptions.subscribers[subscription][i] == socket) {
                subscriptions.subscribers[subscription].splice(i, 1);
                break;
            }
        }
    };

    subscriptions.tradeClose = function(tradeId) {
        subscriptions.subscribers.tradeUpdates.forEach(function(socket) {
            socket.emit('trades:close', tradeId);
        });
    };

    subscriptions.tradeOpen = function(srcTrade) {

        var chartist = hftd.chartist;

        var trade = {};
        for (var property in srcTrade)
            trade[property] = srcTrade[property];

        var quote = hftd.chartist.getQuote(trade.instrument);

        trade.current = trade.side == 'buy' ? quote.bid : quote.ask;         
        trade.profit  = {
            base:    (chartist.convert(hftd.stats.calculateProfitLoss(trade.side, trade.price, trade.current), trade.instrument.split('_')[1], 'GBP') * trade.units).toFixed(2),
            percent: hftd.stats.calculateProfitLossPercent(trade.side, trade.price, trade.current).toFixed(2)
        };

        subscriptions.subscribers.tradeUpdates.forEach(function(socket) {
            socket.emit('trades:open', trade);
        });             

    };

    subscriptions.tradesUpdate = function(tick) {

        // return early if no subscribers
        if (!subscriptions.subscribers.tradeUpdates.length)
            return;

        var tradeUpdates = {};
        var trades       = hftd.execution.trades;
        var chartist     = hftd.chartist;

        for (var tid in trades) {

            if (trades[tid].instrument == tick.instrument) {

                var trade = {};
                for (var property in trades[tid])
                    trade[property] = trades[tid][property];

                //var quote = chartist.getQuote(trades[tid].instrument); 
                
                trade.current = trade.side == 'buy' ? tick.bid : tick.ask;         
                trade.profit  = {
                    base:    (chartist.convert(hftd.stats.calculateProfitLoss(trade.side, trade.price, trade.current), trade.instrument.split('_')[1], 'GBP') * trade.units).toFixed(2),
                    percent: hftd.stats.calculateProfitLossPercent(trade.side, trade.price, trade.current).toFixed(2)
                };

                tradeUpdates[tid] = trade;

            }
        
        }

        subscriptions.subscribers.tradeUpdates.forEach(function(socket) {
            socket.emit('trades:update', tradeUpdates);
        });

    };

};

module.exports = function() {
    return new subscriptions();
};