#!/usr/local/bin/node

/**
 * Load components
 */
global.hftd = {};

require('./components/lib');
require('./components/functions');
require('./components/console');

hftd.initialized = false;

hftd.restAPI     = new require('./components/rest-api')();
hftd.streamAPI   = new require('./components/stream-api')();

hftd.config      = new require(__dirname + '/config/config.json');
hftd.chartist    = new require('./components/chartist')();
hftd.scheduler   = new require('./components/scheduler')();
hftd.execution   = new require('./components/execution')();
hftd.servicePort = new require('./components/service-port')(); 
hftd.strategist  = new require('./components/strategist')();

/**
 * Initialize / start components
 */
async.series([
    
    // initialize api connections
    hftd.restAPI.start,
    hftd.streamAPI.start,

    // initialize internal components
    hftd.execution.start,
    hftd.strategist.start

],  function(error) {
        if (error)
            hftd.log(error, 'error');
        hftd.initialized = true;
    }
    
);


