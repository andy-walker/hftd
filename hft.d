#!/usr/local/bin/node

/**
 * Load components
 */
global.hftd = {};

require('./components/lib');
require('./components/functions');
require('./components/console');

hftd.initialized = false;

hftd.config      = new require(__dirname + '/config/config.json');
hftd.db          = new require('./components/db')(hftd.config.db);
hftd.restAPI     = new require('./components/rest-api')();
hftd.streamAPI   = new require('./components/stream-api')();

hftd.chartist    = new require('./components/chartist')();
hftd.scheduler   = new require('./components/scheduler')();
hftd.execution   = new require('./components/execution')();
hftd.servicePort = new require('./components/service-port')(); 
hftd.strategist  = new require('./components/strategist')();
//hftd.virtual     = new require('./components/virtual')();


// construct a list of initialization tasks
var initTasks = [
    
    // initialize api connections
    hftd.restAPI.start,
    hftd.streamAPI.start,

    // initialize internal components
    hftd.execution.start

];

// if mirroring enabled, load component / add initialization task
if (typeof hftd.config.mirrorEnabled !== 'undefined' && hftd.config.mirrorEnabled) {
    hftd.mirror = new require('./components/mirror')();
    initTasks.push(hftd.mirror.start);
}

// start json-rpc server
initTasks.push(hftd.servicePort.start);

// start / initialize strategies last, once all other components have been loaded
initTasks.push(hftd.strategist.start);

// run initialzation tasks in series
async.series(initTasks, function(error) {
    if (error)
        return hftd.error(sprintf("Failed to initialize - %s", error));
    hftd.initialized = true;
});
