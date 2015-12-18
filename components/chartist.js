/**
 * Chartist component
 */
var chartist = function() {

	chartist.candles   = {};
	chartist.haCandles = {};
	hftd.streamAPI.getInstrumentList().forEach(function(instrument) {
		// just work with S5 data for now ..
		chartist.candles[instrument]   = {"S5": []};
		chartist.haCandles[instrument] = {"S5": []};
	});

	console.log(chartist);

};

chartist.prototype.onTick = function(tick) {
    hftd.log('chartist update');
};

module.exports = function() {
    return new chartist();
};