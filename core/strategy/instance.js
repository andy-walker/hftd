/**
 * Strategy instance class
 */

"use strict"

class Strategy {

    constructor(config) {
        
        var component = hftd.component;
        this.config   = config;
        
        this.datasource = component.get('datasource', config.datasource);
        
        if ('backtest' in config && config.backtest)
            this.execution = component.get('execution', 'backtest');
        else
            this.execution  = component.get('execution', config.execution); 

        if ('money' in config)
            this.moneyManager = component.get('money', config.money);

        if ('risk' in config)
            this.riskManager = component.get('risk', config.risk);
 
        // instantiate alpha last, as constructor may want to perform startup
        // initialization that depends on other components
        this.alpha = component.get('alpha', config.alpha);
        
        this.datasource.initialize(this);
        this.alpha.initialize(this);
        this.execution.initialize(this);

        if ('moneyManager' in this)
            this.moneyManager.initialize(this);

        if ('riskManager' in this)
            this.riskManager.initialize(this);

    }

    /**
     * Run strategy
     */
    execute(instrument, alphaMethod, params, taskCallback) {
        
        var strategy = this;

        sync.fiber(() => {

            Promise.resolve(alphaMehod(params))
            
            .then(() => {

                if (!(instrument in strategy.proposed))
                    return taskCallback();

                if ('moneyManager' in strategy)
                    return Promise.resolve(this.moneyManager.run(this.proposed[instrument]))
            
                return Promise.resolve(strategy.proposed[instrument]);

            }).then(trades => {

                if (!trades)
                    taskCallback();

                if ('riskManager' in strategy)
                    return Promise.resolve(this.riskManager.run(trades));

                return Promise.resolve(trades);

            }).then(trades => {

                if (!trades)
                    taskCallback();
                
                return this.execution.execute(trades);

            }).then(result => {

                if (instrument in strategy.proposed)
                    delete strategy.proposed[instrument];

                taskCallback(null, result);  

            }, error => {

                if (instrument in strategy.proposed)
                    delete strategy.proposed[instrument];
              
                taskCallback(error);
            
            });

        });

    }

    implementsMethod(method) {
        return typeof this.alpha[method] == 'function';
    }

    onTick(tick, callback) {

        callback = callback || function() {};
        this.execute(tick.instrument, this.alpha.onTick, tick, callback);

    }

    run(callback) {

        var strategy = this;

        async.forEach(strategy.config.instruments, (instrument, taskCallback) => {
            strategy.execute(instrument, strategy.alpha.run, instrument, taskCallback);
        }, callback);

    }

};

module.exports = Strategy;