/**
 * Chartist component
 * Maintains a local cache of pricing data, for use by strategies
 */
var chartist = function() {

    // objects to construct candlestick data into
    chartist.candles   = {};
    chartist.haCandles = {};

    // store 360 candles (around half an hour's worth of S5 data)
    chartist.maxCacheSize = 360;
    hftd.streamAPI.getInstrumentList().forEach(function(instrument) {
        // just collect S5 data for now ..
        chartist.candles[instrument]   = {"S5": []};
        chartist.haCandles[instrument] = {"S5": []};
    });

};

/**
 * Delete expired entries from cache
 */
chartist.prototype.deleteOldEntries = function(instrument) {
    for (var interval in chartist.candles[instrument])
        while (chartist.candles[instrument][interval].length > chartist.maxCacheSize)
            chartist.candles[instrument][interval].shift(); 
};

/**
 * Get the last candle from the cache for instrument / interval
 */
chartist.prototype.getLastCandle(instrument, interval) {
    return _.last(chartist.candles[instrument][interval]);
};

/**
 * Get the start time for candle based on tick timestamp and interval
 */
chartist.prototype.getNextCandleStart(tickTimestamp, interval) {
    // currently only supports S5
    switch (interval) {
        case "S5":
            return tickTimestamp - (tickTimestamp % 5);
    }
};

/**
 * Retrieve a set of candles
 */
chartist.prototype.getCandles = function(instrument, interval, numCandles, type) {
    
    var candles;
    type = type || 'c';

    switch (type) {
        case 'c':
            candles = chartist.candles[instrument][interval].slice(0 - numCandles);
            break;
        case 'ha':
            candles = chartist.haCandles[instrument][interval].slice(0 - numCandles);
            break;
        default:
            hftd.error(sprintf("Unrecognized candle type: '%s'", type));
            return;
    }
    
    // if we don't yet have sufficient data to fulfil the request, return false
    if (candles.length < numCandles)
        return false;

    return candles;

}

/**
 * When new tick received, update internal cache
 */
chartist.prototype.onTick = function(tick) {
    
    var instrument    = tick.instrument;
    var tickTimestamp = getTimestamp(tick.time);
    var lastCandle    = chartist.getLastCandle(instrument, "S5");

    tick.mid = (tick.bid + tick.ask) / 2;

    // if last candle open time more than 5 seconds ago (or if the array is empty), 
    // start new candle
    if (!lastCandle || (tickTimestamp - lastCandle.time) >= 5) {
        
        var candleStartTime = chartist.getNextCandleStart(tickTimestamp, "S5");
        
        var newCandle = {
            time:     candleStartTime,
            openBid:  tick.bid,
            openMid:  tick.mid,
            openAsk:  tick.ask,
            highBid:  tick.bid,
            highMid:  tick.mid,
            highAsk:  tick.ask,
            lowBid:   tick.bid,
            lowMid:   tick.mid,
            lowAsk:   tick.ask,
            closeBid: tick.bid,
            closeMid: tick.mid,
            closeAsk: tick.ask,
            complete: false
        };

        // if there's a previous candle (always the case except on startup),
        // mark it as complete
        if (lastCandle) {
            var candle = chartist.candles[instrument]['S5'].pop();
            candle.complete = true;
            chartist.candles[instrument]['S5'].push(candle);
        }
        
        chartist.candles[instrument]['S5'].push(newCandle);
        chartist.deleteOldEntries(instrument);
    
    // otherwise, update existing candle
    } else {
        
        var candle = chartist.candles[instrument]['S5'].pop();
        
        if (tick.bid > candle.highBid)
            candle.highBid = tick.bid;

        if (tick.mid > candle.highMid)
            candle.highMid = tick.mid;

        if (tick.ask > candle.highAsk)
            candle.highAsk = tick.ask;

        if (tick.bid < candle.lowBid)
            candle.lowBid = tick.bid;

        if (tick.mid < candle.lowMid)
            candle.lowMid = tick.mid;

        if (tick.ask < candle.lowAsk)
            candle.lowAsk = tick.ask;

        candle.closeBid = tick.bid;
        candle.closeMid = tick.mid;
        candle.closeAsk = tick.ask;

        chartist.candles[instrument]['S5'].push(candle); 

    }

};

module.exports = function() {
    return new chartist();
};