/**
 * Base class for risk manager components
 */

"use strict"

class RiskManager {

    constructor(config) {
        this.config = config;
    }

    initialize(strategy) {
        this.strategy = strategy;
    }

};

module.exports = RiskManager;