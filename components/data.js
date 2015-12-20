/**
 * Component for persistent data storage
 */
var data = function() {
	data.fs    = require('fs');
};

data.prototype.trade = new require('./data/trade')();

data.prototype.initialize = function(callback) {
	hftd.log('Initializing data components ...');
	data.trade.initialize();
	callback();
};

module.exports = function() {
    return new data();
};