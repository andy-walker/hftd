/**
 * Base class for money manager components
 */

"use strict"

class MoneyManager {

    constructor(config) {
        this.config = config;
    }

    initialize(strategy) {
        this.strategy = strategy;
    }

};

module.exports = MoneyManager;