#!/usr/local/bin/node

/**
 * Load components
 */
global.hftd = {};

require('./components/lib');
require('./components/functions');
require('./components/console');

hftd.restAPI     = new require('./components/rest-api')();
hftd.streamAPI   = new require('./components/stream-api')();

hftd.data        = new require('./components/data');
hftd.config      = new require(__dirname + '/config/config.json');
hftd.chartist    = new require('./components/chartist')();
hftd.scheduler   = new require('./components/scheduler')();
hftd.execution   = new require('./components/execution')();
hftd.servicePort = new require('./components/service-port')(); 
hftd.strategist  = new require('./components/strategist')();
//hftd.streamAPI.start();
//hftd.streamAPI.start();

/**
 * Initialize / start components
 */

async.series([
    
    // initialize strategies
    hftd.strategist.start,

    // initialize api connections
    hftd.streamAPI.start,
    //hftd.restAPI.start,
    /*
    // initialize components
    // hftd.chartist.start,
    hftd.servicePort.start,
    hftd.execution.start,

    */
],  function(error) {
        if (error)
            hftd.log(error, 'error');
    }
    
);


