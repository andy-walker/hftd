// Initialize UI
angular.module('webclient').controller('TradeMonitorCtrl', function($scope, socket) {

    socket.on('trades:all', function(trades) {
        $scope.trades = trades;
    });

    socket.on('trades:open', function(trade) {
        $scope.trades[trade.id] = trade;
    });

    socket.on('trades:close', function(tradeId) {
        delete $scope.trades[tradeId];
    });

    socket.on('trades:update', function(trades) {
        for (var tid in trades)
            $scope.trades[tid] = trades[tid];
    });

    socket.emit('trades:get');
    socket.emit('subscribe:tradeUpdates');
 
});