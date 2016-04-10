/**
 * Strategy manager class
 */

"use strict"

var Strategy = require(__dirname + '/strategy/instance.js');

class StrategyManager {

    /**
     * Constructor
     */
    constructor() {      
        this.strategies     = {};
        this.onTickHandlers = {};
    }

    /**
     * Get enabled strategies
     * @return Promise
     */
    getEnabled() {
        return hftd.db.collection('strategies').find({
            enabled: 1
        }).toArray();
    }

    load(strategy) {

        // todo: validate the strategy config?

        this.strategies[strategy.code] = new Strategy(strategy);
        hftd.scheduler.addJob(strategy.schedule, this.strategies[strategy.code].run);

        if (this.strategies[strategy.code].implementsMethod('onTick'))
           this.onTickHandlers[strategy.code] = this.strategies[strategy.code].onTick;

    }

    start(callback) {

        var manager = hftd.strategy;

        manager.getEnabled().then(strategies => {

            hftd.log(sprintf(
                'V2 engine: Initializing strategies (found %d strateg%s) ...', 
                strategies.length, 
                strategies.length == 1 ? 'y' : 'ies'
            ));

            strategies.forEach(manager.load);
            callback();

        }, error => {
            callback(error);
        });

    }

}

module.exports = () => new StrategyManager();