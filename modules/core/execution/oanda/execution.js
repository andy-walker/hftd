"use strict"

class Execution extends hftd.base.execution {

    closeTrade(trade) {

    }

    createOrder(order) {

    }

    deleteOrder(order) {

    }

    getAccount() {

    }

    getRESTConnector() {
    	return this.strategy.datasource.restAPI;
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

module.exports = Execution;