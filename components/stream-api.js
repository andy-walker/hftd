/**
 * Stream API component
 */

var streamAPI = function() {
    
};

/**
 * Initialize Oanda streaming connection
 */
streamAPI.prototype.start = function(callback) {
    
    hftd.log('Establishing Oanda rate stream connections ...');

    var streamAPI   = hftd.streamAPI;
    var instruments = streamAPI.getInstrumentList();
    
    if (!instruments.length)
        return callback('No instruments found to subscribe to.');
    
    var splitInstruments = streamAPI.splitInstruments(instruments);
    
    streamAPI.rateStream = {};

    // initialize rate stream A
    streamAPI.rateStream.A = new streamAPI.createRateStream(splitInstruments[0], streamAPI.onTickUpdate);
    
    // if more than two instruments defined, initialize a second connection - workload
    // will be shared equally between the two connections
    if (splitInstruments[1].length)
        streamAPI.rateStream.B = new streamAPI.createRateStream(splitInstruments[1], streamAPI.onTickUpdate);
    
    hftd.log('Establishing Oanda event stream connection ...');
    hftd.restAPI.client.subscribeEvents(function(event) {
        hftd.execution.onEvent(event);
    });

    callback();

};

/**
 * Get a list of instruments to subscribe to from strategy config
 */
streamAPI.prototype.getInstrumentList = function() {
    
    var config      = hftd.config;
    var instruments = [];

    for (var strategyName in config.strategies) {
        var strategy = config.strategies[strategyName];
        if (Array.isArray(strategy.instruments) && strategy.instruments.length) {
            strategy.instruments.forEach(function(instrument) {
                if (!_.contains(instruments, instrument))
                    instruments.push(instrument);
            });
        } else {
            hftd.warning(sprintf("No instruments defined for strategy '%s'", strategyName));
        }

    }

    return instruments;

};

/**
 * Callback handler for rate stream updates
 */
streamAPI.prototype.onTickUpdate = function(tick) {
    
    if (tick.heartbeat !== undefined) {
        //hftd.log('Heartbeat');
    } else if (tick.tick !== undefined) {
        //hftd.log(sprintf('%s: %s <=> %s', tick.tick.instrument, tick.tick.bid, tick.tick.ask));
        hftd.chartist.onTick(tick.tick);
        hftd.strategist.onTick(tick.tick);
        //var tickTimestamp = getTimestamp(tick.tick.time);
    }

};

/**
 * Instance a rate stream connection
 */
streamAPI.prototype.createRateStream = function(instruments, tickUpdateCallback) {

    var account = hftd.config.account;

    var domain = 'stream-sandbox.oanda.com'
    var access_token = account.accessToken;
    var account_id = account.accountId;

    instruments = instruments.join('%2C');

    var https;

    if (domain.indexOf("stream-sandbox") > -1) {
        https = require('http');
    } else {
        https = require('https');
    }

    var options = {
        host:    domain,
        path:    '/v1/prices?accountId=' + account_id + '&instruments=' + instruments,
        method:  'GET',
        headers: {"Authorization" : "Bearer " + access_token}
    };

    var request = https.request(options, function(response){
        
        var incompleteChunk = '';
        
        response.on("data", function(chunk){

            var bodyChunk = chunk.toString().split("\r\n").forEach(function(tick) {
                
                //console.log(tick);

                if (incompleteChunk) {
                    tick = incompleteChunk + tick;
                    incompleteChunk = ''; 
                } else if (!tick.endsWith('}}')) {
                    incompleteChunk = tick;
                } 

                if (tick && !incompleteChunk) {
                    //console.log(JSON.parse(tick));
                    
                    var message;
                    
                    try {
                        message = JSON.parse(tick);
                    } catch (e) {
                        return console.error(e);
                    }
                    tickUpdateCallback(message);
                
                }

            });
             
        });
        
        response.on("end", function(chunk){
            hftd.log("Error connecting to OANDA HTTP Rates Server");
            console.log("HTTP - " + response.statusCode);
            console.log(chunk);
            process.exit(1);
        });

    });

    request.end();    
};

/**
 * Split instruments into two equal(ish) size arrays
 * for initializing dual rate streams
 */
streamAPI.prototype.splitInstruments = function(instruments) {
    
    var i, numInstruments  = instruments.length, results = [[], []];
    var halfNumInstruments = Math.ceil(numInstruments / 2);

    for (i=0;i<numInstruments;i++) 
        results[i < halfNumInstruments ? 0 : 1].push(instruments[i]);
    
    return results;

};

module.exports = function() {
    return new streamAPI();
};