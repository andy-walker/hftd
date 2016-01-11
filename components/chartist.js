/**
 * Chartist component
 * Maintains a local cache of pricing data, for use by strategies
 */
var chartist = function() {

    var chartist = this;

    // objects to construct candlestick data into
    chartist.candles   = {};
    chartist.haCandles = {};
    chartist.tickData  = {};

    // store 360 candles (around half an hour's worth of S5 data)
    chartist.maxCacheSize = 360;

    // construct list of instruments to keep track of
    chartist.instrumentList = hftd.streamAPI.getInstrumentList();

    // initialize candlestick / tick data objects
    chartist.instrumentList.forEach(function(instrument) {
        // just collect S5 data for now ..
        chartist.candles[instrument]   = {"S5": []};
        chartist.haCandles[instrument] = {"S5": []};
        chartist.tickData[instrument]  = [];
    
    });

    /**
     * Convert bid/ask candles to midpoint
     */
    chartist.candlesToMidpoint = function(candlesIn) {
        
        var candlesOut = [];
        
        candlesIn.forEach(function(candleIn) {
            
            var candleOut = {
                time:     candleIn.time,
                volume:   candleIn.volume,
                complete: candleIn.complete
            };

            candleOut.openMid  = (candleIn.openBid + candleIn.openAsk) / 2;
            candleOut.highMid  = (candleIn.highBid + candleIn.highAsk) / 2;
            candleOut.lowMid   = (candleIn.lowBid + candleIn.lowAsk) / 2;
            candleOut.closeMid = (candleIn.closeBid + candleIn.closeAsk) / 2;

            candlesOut.push(candleOut);

        });

        return candlesOut;

    };

    /**
     * Convert candles to open/high/low/close arrays
     */
    chartist.candlesToOHLC = function(candles, onlyComplete) {
        
        onlyComplete = onlyComplete || false;

        var ohlc = {
            'open':  [],
            'high':  [],
            'low':   [],
            'close': []
        };

        candles.forEach(function(candle) {
            
            // when only_complete is true, only add completed candles
            // when only_complete is false, add all candles
            if ((onlyComplete && candle.complete) || onlyComplete == false) {
                ohlc.open.push(candle.openMid);
                ohlc.close.push(candle.closeMid);
                ohlc.high.push(candle.highMid);
                ohlc.low.push(candle.lowMid);
            }
                
        });

        return ohlc;

    };

    /**
     * Convert an amount
     */
    chartist.convert = function(amount, fromCurrency, toCurrency) {
        
        if (fromCurrency == toCurrency)
            return amount;

        var pair;

        if (_.contains(chartist.instrumentList, fromCurrency + '_' + toCurrency)) {
            pair = fromCurrency + '_' + toCurrency;
        } else if (_.contains(chartist.instrumentList, toCurrency + '_' + fromCurrency)) {
            pair = toCurrency + '_' + fromCurrency;
        }

        if (!pair) {
            // attempt to convert amounts for which there is no direct pair
            switch (true) {
                case fromCurrency == 'DE30' && toCurrency == 'USD':
                    return chartist.convert(chartist.convert(amount, 'DE30', 'EUR'), 'EUR', 'USD');
                case fromCurrency == 'USD' && toCurrency == 'DE30':
                    return chartist.convert(chartist.convert(amount, 'USD', 'EUR'), 'EUR', 'DE30');
                case fromCurrency == 'HK33' && toCurrency == 'USD':
                    return chartist.convert(chartist.convert(amount, 'HK33', 'HKD'), 'HKD', 'USD');
                case fromCurrency == 'USD' && toCurrency == 'HK33':
                    return chartist.convert(chartist.convert(amount, 'USD', 'HKD'), 'HKD', 'HK33');
                case fromCurrency == 'UK100' && toCurrency == 'USD':
                    return chartist.convert(chartist.convert(amount, 'UK100', 'GBP'), 'GBP', 'USD');
                case fromCurrency == 'USD' && toCurrency == 'UK100':
                    return chartist.convert(chartist.convert(amount, 'USD', 'GBP'), 'GBP', 'UK100');
                case fromCurrency == 'DE10YB' && toCurrency == 'USD':
                    return chartist.convert(chartist.convert(amount, 'DE10YB', 'EUR'), 'EUR', 'USD');
                case fromCurrency == 'USD' && toCurrency == 'DE10YB':
                    return chartist.convert(chartist.convert(amount, 'USD', 'EUR'), 'EUR', 'DE10YB');
                case fromCurrency == 'USD' && toCurrency == 'UK10YB':
                    return chartist.convert(chartist.convert(amount, 'USD', 'GBP'), 'GBP', 'UK10YB');
                case fromCurrency == 'UK10YB' && toCurrency == 'USD':
                    return chartist.convert(chartist.convert(amount, 'UK10YB', 'GBP'), 'GBP', 'USD');                   
            
            }
            // for pairs that include GBP, convert via USD
            if (fromCurrency == 'GBP') {
                return chartist.convert(chartist.convert(amount, 'GBP', 'USD'), 'USD', toCurrency);
            } else if (toCurrency == 'GBP') {
                return chartist.convert(chartist.convert(amount, fromCurrency, 'USD'), 'USD', 'GBP');
            }

            return hftd.warning(sprintf('Chartist: Unable to convert %s to %s [ %s ]',
                fromCurrency, toCurrency, color('FAIL', 'red')
            ));

        }
        
        // perform conversion
        var quote   = chartist.getQuote(pair);
        var reverse = pair.indexOf(fromCurrency) < pair.indexOf('_');

        return (reverse ? amount * quote.ask : amount / quote.ask);

    };

    /**
     * Delete expired entries from cache
     */
    chartist.deleteOldEntries = function(instrument) {
        for (var interval in chartist.candles[instrument])
            while (chartist.candles[instrument][interval].length > chartist.maxCacheSize)
                chartist.candles[instrument][interval].shift(); 
    };

    /**
     * Get the last candle from the cache for instrument / interval
     */
    chartist.getLastCandle = function(instrument, interval) {
        return _.last(chartist.candles[instrument][interval]);
    };

    /**
     * Get the start time for candle based on tick timestamp && interval
     */
    chartist.getNextCandleStart = function(tickTimestamp, interval) {
        // currently only supports S5
        switch (interval) {
            case "S5":
                return tickTimestamp - (tickTimestamp % 5);
        }
    };

    /**
     * Retrieve a set of candles from cache
     */
    chartist.getCandles = function(instrument, interval, numCandles, type) {
        
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
        //if (candles.length < numCandles)
        //    return false;

        return candles;

    }

    /**
     * Get bid/ask prices for the specified instrument
     */
    chartist.getQuote = function(instrument) {
        
        var quote;

        // if we have tick data for the requested instrument, 
        // get quote from last tick
        if (instrument in chartist.tickData && chartist.tickData[instrument].length) {
            quote = _.last(chartist.tickData[instrument]);
        // otherwise, fall back to executionist quotes list
        } else {
            quote = hftd.execution.quotes[instrument];
        }

        return {
            bid: quote.bid,
            ask: quote.ask
        };

    };

    /**
     * Helper function for alpha models - determine if aSeries has crossed over bSeries
     */
    chartist.isCrossover = function(aSeries, bSeries) {
        
        var a = _.isArray(aSeries) ? aSeries.slice(-2) : [aSeries, aSeries];
        var b = _.isArray(bSeries) ? bSeries.slice(-2) : [bSeries, bSeries];

        if (a[0] < b[0] && a[1] >= b[1])
            return true;

        return false;

    };

    /**
     * Helper function for alpha models - determine if aSeries has crossed under bSeries
     */
    chartist.isCrossunder = function(aSeries, bSeries) {
        
        var a = _.isArray(aSeries) ? aSeries.slice(-2) : [aSeries, aSeries];
        var b = _.isArray(bSeries) ? bSeries.slice(-2) : [bSeries, bSeries];

        if (a[0] > b[0] && a[1] <= b[1])
            return true;

        return false;

    };

    /**
     * When new tick received, update internal cache
     */
    chartist.onTick = function(tick) {
        
        var instrument    = tick.instrument;
        var tickTimestamp = getTimestamp(tick.time);
        var lastCandle    = chartist.getLastCandle(instrument, "S5");

        tick.mid = ((tick.bid + tick.ask) / 2).toFixed(5);

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

        // add tick to tick cache
        chartist.tickData[instrument].push({
            time: getTimestamp(tick.time),
            bid:  tick.bid,
            ask:  tick.ask
        });

        while (chartist.tickData[instrument].length > hftd.config.tickCacheSize)
            chartist.tickData[tick.instrument].shift();

    };

};

module.exports = function() {
    return new chartist();
};