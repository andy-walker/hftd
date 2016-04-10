#!/usr/local/bin/node

/**
 * Load components
 */
global.hftd = {
    initialized: false
};

require('./core/lib');
require('./core/functions');
require('./core/console');
require('./core/db');

hftd.base = {
    datasource: require('./core/base/datasource'),
    alpha:      require('./core/base/alpha'),
    money:      require('./core/base/money'),
    risk:       require('./core/base/risk'),
    execution:  require('./core/base/execution')
};

hftd.config      = require(__dirname + '/config/config.json');
hftd.component   = require('./core/component')();
hftd.module      = require('./core/module')();
hftd.restAPI     = require('./core/rest-api')();
hftd.streamAPI   = require('./core/stream-api')();

hftd.chartist    = require('./core/chartist')();
hftd.scheduler   = require('./core/scheduler')();
hftd.indicators  = require('./core/indicators')();

hftd.execution   = require('./core/execution')();
hftd.strategist  = require('./core/strategist')(); // legacy component
hftd.strategy    = require('./core/strategy')();   // new component
hftd.stats       = require('./core/stats')();

// override ES6 Promises to use bluebird once all components loaded
global.Promise = require('bluebird');

// construct a list of initialization tasks
var initTasks = [
    
    // initialize database first, then component manager / modules
    initDB,
    hftd.component.start,
    hftd.module.start,

    // initialize broker connections
    hftd.restAPI.start,
    hftd.streamAPI.start,

    //hftd.virtual.start,

    // initialize internal components
    hftd.execution.start

];

// if mirroring enabled, load component / add initialization task
if ('mirrorEnabled' in hftd.config && hftd.config.mirrorEnabled) {
    hftd.mirror = require('./core/mirror')();
    initTasks.push(hftd.mirror.start);
}

// service port
if ('servicePort' in hftd.config) {
    // if service port is explictly enabled, or if enabled property missing (implicitly enabled)
    if (('enabled' in hftd.config.servicePort && hftd.config.servicePort.enabled) || (!('enabled' in hftd.config.servicePort))) {
        // load json-rpc server component, add initialization task
        hftd.servicePort = require('./core/service-port')();
        initTasks.push(hftd.servicePort.start);
    }
}

// web server
if ('webserver' in hftd.config) {
    // if webserver explictly enabled, or if enabled property missing (implicitly enabled)
    if (('enabled' in hftd.config.webserver && hftd.config.webserver.enabled) || (!('enabled' in hftd.config.webserver))) {
        // load webserver component, add initialization task
        hftd.webserver = require('./core/webserver')();
        initTasks.push(hftd.webserver.start);
    }
}

// start / initialize strategies
initTasks.push(hftd.strategist.start);
initTasks.push(hftd.strategy.start);

// initialize metrics (requires strategies to be initialized)
initTasks.push(hftd.stats.initialize);

// load api functions
require('./core/api');

// run initialzation tasks in series
async.series(initTasks, function(error) {
    
    if (error) {
        hftd.error(sprintf("Failed to initialize - %s", error));
        hftd.log('Exiting ...');
        hftd.log(sprintf('[ %s ]', color('FAIL', 'red')));
        process.exit(1);
    }

    hftd.initialized = true;

});
