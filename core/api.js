/**
 * API functions
 */

/**
 * Determine if aSeries has crossed over bSeries
 */
global.crossover = function(aSeries, bSeries) {
        
    var a = _.isArray(aSeries) ? aSeries.reverse().slice(-2) : [aSeries, aSeries];
    var b = _.isArray(bSeries) ? bSeries.reverse().slice(-2) : [bSeries, bSeries];

    if (a[0] < b[0] && a[1] >= b[1])
        return true;

    return false;

};

/**
 * Determine if aSeries has crossed under bSeries
 */
global.crossunder = function(aSeries, bSeries) {
    
    var a = _.isArray(aSeries) ? aSeries.reverse().slice(-2) : [aSeries, aSeries];
    var b = _.isArray(bSeries) ? bSeries.reverse().slice(-2) : [bSeries, bSeries];

    if (a[0] > b[0] && a[1] <= b[1])
        return true;

    return false;

};

global.ema = function(ohlc, length) {
    return hftd.indicators.ema(ohlc.reverse(), length).reverse();
};

/**
 * Convert standard ohlc data to heiken ashi ohlc data
 */
global.heikenashi = function(ohlc) {

    ohlc = ohlc.reverse();

    var ha = {
        
        'open':  [],
        'high':  [],
        'low':   [],
        'close': []

    };

    ha.close.push(ohlc.open[0] + ohlc.high[0] + ohlc.low[0] + ohlc.close[0]) / 4;
    ha.open.push((ha['close'][0] + ohlc.open[0]) / 2);
    ha.high.push(Math.max(ohlc.high[0], ha.close[0], ha.open[0]));
    ha.low.push(Math.min(ohlc.low[0], ha.close[0], ha.open[0]));

    for (var i=1; i<ohlc.open.length; i++) {
        ha.close[i] = (ohlc.open[i] + ohlc.high[i] + ohlc.low[i] + ohlc.close[i]) / 4;
        ha.open[i]  = (ha.close[i-1] + ha.open[i-1]) / 2;
        ha.high[i]  = Math.max(ohlc.high[i], ha.close[i], ha.open[i]);
        ha.low[i]   = Math.min(ohlc.low[i], ha.close[i], ha.open[i]);
    }

    return ha.reverse();

};

global.sar = function(ohlc, startAF, incAF, maxAF) {
    return hftd.indicators.sar(ohlc.reverse(), startAF, incAF, maxAF).reverse();
};