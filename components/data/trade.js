/**
 * HFTD data component for trades
 */
var trade = function() {
    trade.trades = {};
};

trade.prototype.create = function(strategy, params, result) {

};

trade.prototype.initialize = function(callback) {
    trade.refreshCacheFromDisk();
};

trade.prototype.get = function(params) {

};

trade.refreshCacheFromDisk = function() {
    var fs = hftd.data.fs;
};

trade.prototype.remove = function() {

};

module.exports = function() {
    return new trade();
};