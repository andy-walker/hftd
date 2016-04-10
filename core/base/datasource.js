/**
 * Base class for datasource components
 */

"use strict"

class Datasource {

    constructor(config) {
        this.config = config;
    }

    initialize(strategy) {
        this.strategy = strategy;
    }

};

module.exports = Datasource;