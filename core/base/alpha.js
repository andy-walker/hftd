/**
 * Base class for alpha models
 */

"use strict"

class AlphaModel {

    constructor(config) {
        this.config = config;
        sync(this, 'ohlc');
    }

    initialize(strategy) {
        this.strategy = strategy;
    }

    ohlc(instrument, timeframe, options, callback) {
        //this.strategy.datasource
    }

    open(direction, instrument, options) {
        this.strategy.open(direction, instrument, options);
    }

    ticks(instrument, count) {

    }

};

module.exports = AlphaModel;