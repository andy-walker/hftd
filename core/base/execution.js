/**
 * Base class for execution components
 */

"use strict"

class Execution {

    constructor(config) {
        this.config = config;
    }

    initialize(strategy) {
        this.strategy = strategy;
    }

    execute(orders) {

        let tasks = [];

        if ('create-order' in orders)
            for (let order of orders['create-order'])
                tasks.push(this.createOrder(order));
 
        if ('delete-order' in orders)
            for (let order of orders['delete-order'])
                tasks.push(this.deleteOrder(order));

        if ('modify-order' in orders)
            for (let order of orders['modify-order'])
                tasks.push(this.modifyOrder(order));

        if ('modify-trade' in orders)
            for (let order of orders['modify-trade'])
                tasks.push(this.modifyTrade(order));

        if ('close-trade' in orders)
            for (let order of orders['close-trade'])
                tasks.push(this.closeTrade(order));

        return new Promise((resolve, reject) => {
            Promise.all(tasks).then(() => resolve(), () => reject());
        });

    }

};

module.exports = Execution;