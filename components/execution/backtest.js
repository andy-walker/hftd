"use strict"

class Backtest extends hftd.base.execution {

    static info() {
        return {
            name:        'Backtest',
            description: 'Internal component for executing backtest trades',
            hidden:       true
        };
    }

    closeTrade(trade) {

    }

    createOrder(order) {

    }

    deleteOrder(order) {

    }

    getAccount() {

    }

    getOpenOrders() {

    }

    getOpenTrades() {

    }

    modifyOrder(order) {

    }

    modifyTrade(trade) {

    }

};

module.exports = Backtest;