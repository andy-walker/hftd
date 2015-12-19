/**
 * HFTD data component
 */
var data = function() {
	data.fs    = require('fs');
	data.trade = new require('./data/trade')();
};

data.prototype.initialize = function(callback) {
	data.trade.initialize();
	callback();
};

module.exports = function() {
    return new data();
};