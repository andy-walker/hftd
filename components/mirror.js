var mirror = function() {

    var mirror = this;

    mirror.start = function(callback) {
        var accounts = hftd.config.mirrorAccounts;
        for (var accountName in accounts) {
            var account = accounts[accountName];
        }
    };

    mirror.trade = function(strategy, params) {

    };

};

module.exports = function() {
    return new mirror();
};