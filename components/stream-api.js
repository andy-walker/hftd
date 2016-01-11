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
    
    //instruments = ["AUD_CAD","AUD_CHF","AUD_HKD","AUD_JPY","AUD_NZD","AUD_SGD","AUD_USD","BCO_USD","CAD_CHF","CAD_HKD","CAD_JPY","CAD_SGD","CHF_HKD","CHF_JPY","CHF_ZAR","CORN_USD","EUR_AUD","EUR_CAD","EUR_CHF","EUR_CZK","EUR_DKK","EUR_GBP","EUR_HKD","EUR_HUF","EUR_JPY","EUR_NOK","EUR_NZD","EUR_PLN","EUR_SEK","EUR_SGD","EUR_TRY","EUR_USD","EUR_ZAR","GBP_AUD","GBP_CAD","GBP_CHF","GBP_HKD","GBP_JPY","GBP_NZD","GBP_PLN","GBP_SGD","GBP_USD","GBP_ZAR","HKD_JPY","NATGAS_USD","NZD_CAD","NZD_CHF","NZD_HKD","NZD_JPY","NZD_SGD","NZD_USD","SGD_CHF","SGD_HKD","SGD_JPY","SOYBN_USD","SUGAR_USD","TRY_JPY","USD_CAD","USD_CHF","USD_CZK","USD_DKK","USD_HKD","USD_HUF","USD_INR","USD_JPY","USD_MXN","USD_NOK","USD_PLN","USD_SAR","USD_SEK","USD_SGD","USD_THB","USD_TRY","USD_TWD","USD_ZAR","WHEAT_USD","WTICO_USD","XAG_AUD","XAG_CAD","XAG_CHF","XAG_EUR","XAG_GBP","XAG_HKD","XAG_JPY","XAG_NZD","XAG_SGD","XAG_USD","XAU_AUD","XAU_CAD","XAU_CHF","XAU_EUR","XAU_GBP","XAU_HKD","XAU_JPY","XAU_NZD","XAU_SGD","XAU_USD","XAU_XAG","XCU_USD","XPD_USD","ZAR_JPY","UK100_GBP","US30_USD","SPX500_USD","HK33_HKD","NAS100_USD","DE30_EUR","JP225_USD" ];  

    if (!instruments.length)
        return callback('No instruments found to subscribe to.');
    
    var splitInstruments = streamAPI.splitInstruments(instruments);
    
    streamAPI.rateStream = {};

    // initialize rate stream A
    streamAPI.rateStream.A = new streamAPI.createRateStream(splitInstruments[0], streamAPI.onTickUpdate);
    
    // if more than two instruments defined, initialize a second connection since Oanda allow 
    // that - workload will then be shared equally between the two connections
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
        
        if (hftd.initialized) {
            hftd.chartist.onTick(tick.tick);
            hftd.strategist.onTick(tick.tick);
        }

    }

};

/**
 * Instance a rate stream connection
 */
streamAPI.prototype.createRateStream = function(instruments, tickUpdateCallback) {

    var account = hftd.config.account;

    var domain = 'stream-fxpractice.oanda.com';
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